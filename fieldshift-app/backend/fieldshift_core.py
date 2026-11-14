"""FieldShift core calculations.

Implements the method spec (v1.1):
weather from NASA POWER, then-vs-now indicators, reference evapotranspiration
(FAO-56 Penman-Monteith, Hargreaves as fallback), HLS NDVI green cover,
unprotected months u(m), the numbers N1-N4 and the warning/benefit flags.

Rotation generation, ranking, card texts and the result file are in fieldshift_rotations.py.
Values marked DEFAULT are the spec's asterisked defaults: confirm them in the dry run.
"""
from __future__ import annotations

import json
import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
import requests

# --------------------------------------------------------------------------
# Defaults (DEFAULT = confirm in the dry run)
# --------------------------------------------------------------------------
HOT_DAY_C = 30.0              # hot day: Tmax >= 30 C (DWD "Heisser Tag")
HEAT_DAYS_FOR_FLAG = 5        # DEFAULT: days above the crop's heat limit in its sensitive months
DRY_DAY_MM = 1.0              # a dry day has < 1 mm
DRY_SPELL_DAYS = 10           # weather screen: consecutive dry days counted as a dry spell
DRY_SPELL_FLAG_DAYS = 14      # DEFAULT: warning flag needs a longer spell inside a sensitive month
LATE_FROST_C = -1.0           # DEFAULT: damaging frost after sowing (2 m air temperature)
HEAVY_RAIN_MM = 20.0          # DEFAULT: heavy rain day
NDVI_BARE = 0.3               # DEFAULT: below this a month counts as unprotected
MIN_CLEAR_IMAGES = 1          # DEFAULT: fewer clear images -> fall back to the farmer's crop months
FLAG_YEARS_FRACTION = 0.2     # DEFAULT: flag if it happens in >= 1 year in 5
LATE_FROST_DAYS = 42          # 6 weeks after sowing
WINDOW_YEARS = 20             # length of "then" and "now"
WEATHER_SCREEN_MONTHS = range(4, 10)  # Apr-Sep for the dry-spell count on the weather screen

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
POWER_FILL = -999.0
POWER_PARAMS = {             # POWER name -> our column
    "T2M_MAX": "tmax", "T2M_MIN": "tmin", "PRECTOTCORR": "rain",
    "ALLSKY_SFC_SW_DWN": "rs", "RH2M": "rh", "WS2M": "wind",
}
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# --------------------------------------------------------------------------
# Rotation description
# --------------------------------------------------------------------------
@dataclass
class Crop:
    """One crop of the rotation.

    start/end are month indices within the cycle (0 = January of cycle year 1). They may run past
    the cycle length; they wrap around. The crop is in the ground from `start` (sowing month)
    to `end` (harvest or termination month), inclusive.
    """
    name: str
    start: int
    end: int
    kc: list[float]                         # one crop coefficient per month in the ground
    family: str
    legume: bool = False
    frost_sensitive: bool = False
    heat_limit_c: float = HOT_DAY_C
    sellable: bool = True
    forage: bool = False
    cover: bool = False
    sensitive_months: list[int] = field(default_factory=list)  # calendar months 1-12; empty = whole season

    def months(self) -> list[int]:
        return list(range(self.start, self.end + 1))


@dataclass
class Rotation:
    id: str
    name: str
    length_months: int              # T
    start_year: int                 # calendar year of cycle month 0 (for matching satellite data)
    crops: list[Crop] = field(default_factory=list)

    @staticmethod
    def calendar_month(m: int) -> int:
        """1-12 calendar month of cycle month m."""
        return m % 12 + 1

    def crop_at(self, m: int) -> Crop | None:
        T = self.length_months
        for c in self.crops:
            if m % T in {x % T for x in c.months()}:
                return c
        return None


# --------------------------------------------------------------------------
# 1. Weather from NASA POWER
# --------------------------------------------------------------------------
def fetch_power_daily(lat: float, lon: float, start: str = "19810101", end: str | None = None,
                      cache_dir: str | Path = "cache") -> pd.DataFrame:
    """Daily weather at a point: tmax, tmin (C), rain (mm), rs (MJ/m2/day), rh (%), wind (m/s at 2 m).
    The site elevation is stored in df.attrs["elevation_m"]. Cached to CSV after the first call."""
    end = end or pd.Timestamp.today().strftime("%Y%m%d")
    cache = Path(cache_dir) / f"power6_{lat:.4f}_{lon:.4f}_{start}_{end}.csv"
    if cache.exists():
        df = pd.read_csv(cache, index_col=0, parse_dates=True)
        meta = cache.with_suffix(".json")
        df.attrs["elevation_m"] = json.loads(meta.read_text())["elevation_m"] if meta.exists() else None
        return df

    params = {"parameters": ",".join(POWER_PARAMS), "community": "AG", "latitude": lat, "longitude": lon,
              "start": start, "end": end, "format": "JSON"}
    t0 = time.time()
    r = requests.get(POWER_URL, params=params, timeout=180)
    r.raise_for_status()
    js = r.json()
    p = js["properties"]["parameter"]
    df = pd.DataFrame({col: pd.Series(p[name]) for name, col in POWER_PARAMS.items() if name in p})
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df = _clean(df)
    coords = js.get("geometry", {}).get("coordinates", [])
    df.attrs["elevation_m"] = float(coords[2]) if len(coords) > 2 else None
    print(f"POWER: {len(df)} days in {time.time() - t0:.1f} s, last valid day {df.index.max().date()}, "
          f"elevation {df.attrs['elevation_m']} m")
    cache.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(cache)
    cache.with_suffix(".json").write_text(json.dumps({"elevation_m": df.attrs["elevation_m"]}))
    return df


def read_power_csv(path: str | Path) -> pd.DataFrame:
    """Read a CSV downloaded from the POWER Data Access Viewer (YEAR, DOY columns).
    Works with 3 variables (Hargreaves only) or all 6 (Penman-Monteith)."""
    lines = Path(path).read_text().splitlines()
    end_hdr = next(i for i, line in enumerate(lines) if line.startswith("-END HEADER-"))
    elevation = None
    for line in lines[:end_hdr]:
        if "elevation" in line.lower() and "=" in line:
            try:
                elevation = float(line.split("=")[1].split()[0])
            except ValueError:
                pass
    raw = pd.read_csv(path, skiprows=end_hdr + 1)
    idx = pd.to_datetime(raw["YEAR"].astype(str) + raw["DOY"].astype(str).str.zfill(3), format="%Y%j")
    df = pd.DataFrame({col: raw[name].to_numpy() for name, col in POWER_PARAMS.items() if name in raw},
                      index=idx)
    df = _clean(df)
    df.attrs["elevation_m"] = elevation
    return df


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.replace(POWER_FILL, np.nan)
    df = df.dropna(subset=["tmax", "tmin", "rain"])
    if "rs" in df and df["rs"].notna().any():
        # The AG community returns MJ/m2/day. Guard against kWh/m2/day (summer values below 10).
        summer = df.loc[df.index.month.isin([6, 7]), "rs"].median()
        if summer < 10:
            print("note: radiation looks like kWh/m2/day, converting to MJ/m2/day")
            df["rs"] = df["rs"] * 3.6
    return df


def windows(df: pd.DataFrame, years: int = WINDOW_YEARS) -> dict[str, tuple[pd.Timestamp, pd.Timestamp]]:
    """Rolling windows: 'now' = last `years` years ending with the last complete month;
    'then' = the `years` years before that."""
    last_day = df.index.max()
    month_end = last_day + pd.offsets.MonthEnd(0)
    last_complete = month_end if last_day == month_end else last_day - pd.offsets.MonthEnd(1)
    now_end = last_complete
    now_start = (now_end - pd.DateOffset(years=years)) + pd.Timedelta(days=1)
    then_end = now_start - pd.Timedelta(days=1)
    then_start = (then_end - pd.DateOffset(years=years)) + pd.Timedelta(days=1)
    if then_start < df.index.min():
        print(f"warning: data starts {df.index.min().date()}, 'then' window is shorter than {years} years")
    return {"then": (then_start, then_end), "now": (now_start, now_end)}


def now_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Timestamp]:
    a, b = windows(df)["now"]
    return df.loc[a:b], a


def split_years(d: pd.DataFrame, start: pd.Timestamp) -> pd.Series:
    """Label each day with its 12-month block number (0..years-1) counted from `start`."""
    months = (d.index.year - start.year) * 12 + (d.index.month - start.month)
    return pd.Series(months // 12, index=d.index)


def count_spells(dry: pd.Series, min_len: int) -> int:
    """Number of runs of True with length >= min_len. A gap in the dates ends a run,
    so spells never join across months that were filtered out."""
    runs, n, prev = 0, 0, None
    for day, v in zip(dry.index, dry.to_numpy()):
        if prev is not None and (day - prev).days > 1:
            runs += n >= min_len
            n = 0
        if v:
            n += 1
        else:
            runs += n >= min_len
            n = 0
        prev = day
    runs += n >= min_len
    return int(runs)


# --------------------------------------------------------------------------
# 2. Reference evapotranspiration ET0 (water lost to the air)
# --------------------------------------------------------------------------
def extraterrestrial_radiation_mj(lat_deg: float, doy: np.ndarray) -> np.ndarray:
    """Ra in MJ/m2/day (FAO-56 eq. 21)."""
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * np.cos(2 * np.pi * doy / 365)
    delta = 0.409 * np.sin(2 * np.pi * doy / 365 - 1.39)
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(delta), -1, 1))
    return (24 * 60 / np.pi) * 0.0820 * dr * (
        ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws))


def extraterrestrial_radiation_mm(lat_deg: float, doy: np.ndarray) -> np.ndarray:
    """Ra in mm/day of evaporation equivalent."""
    return 0.408 * extraterrestrial_radiation_mj(lat_deg, doy)


def hargreaves_et0(df: pd.DataFrame, lat: float) -> pd.Series:
    """Daily ET0 (mm/day), Hargreaves. Fallback only: it overestimates in humid climates."""
    ra = extraterrestrial_radiation_mm(lat, df.index.dayofyear.to_numpy())
    tmean = (df["tmax"] + df["tmin"]) / 2
    trange = (df["tmax"] - df["tmin"]).clip(lower=0)
    return pd.Series(0.0023 * ra * (tmean + 17.8) * np.sqrt(trange), index=df.index).clip(lower=0)


def penman_monteith_et0(df: pd.DataFrame, lat: float, elevation_m: float | None) -> pd.Series:
    """Daily ET0 (mm/day), FAO-56 Penman-Monteith (eq. 6) from POWER daily data.
    Uses mean relative humidity for actual vapour pressure (FAO-56 eq. 19) and G = 0."""
    z = elevation_m if elevation_m is not None else 100.0
    tmax, tmin = df["tmax"], df["tmin"]
    tmean = (tmax + tmin) / 2

    def e0(t):
        return 0.6108 * np.exp(17.27 * t / (t + 237.3))

    es = (e0(tmax) + e0(tmin)) / 2
    ea = df["rh"].clip(0, 100) / 100 * es
    delta = 4098 * e0(tmean) / (tmean + 237.3) ** 2
    pressure = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26
    gamma = 0.000665 * pressure

    ra = extraterrestrial_radiation_mj(lat, df.index.dayofyear.to_numpy())
    rs = df["rs"].clip(lower=0)
    rso = (0.75 + 2e-5 * z) * ra
    rns = 0.77 * rs
    sigma = 4.903e-9
    ratio = np.clip(rs / np.where(rso > 0, rso, np.nan), 0.25, 1.0)
    rnl = sigma * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (0.34 - 0.14 * np.sqrt(ea)) * (1.35 * ratio - 0.35)
    rn = rns - rnl
    u2 = df["wind"].clip(lower=0)

    et0 = (0.408 * delta * rn + gamma * 900 / (tmean + 273) * u2 * (es - ea)) / (delta + gamma * (1 + 0.34 * u2))
    return pd.Series(et0, index=df.index).clip(lower=0)


def et0_series(df: pd.DataFrame, lat: float) -> tuple[pd.Series, str]:
    """ET0 with the best available method. Returns (series, method name)."""
    if all(c in df for c in ("rs", "rh", "wind")) and df[["rs", "rh", "wind"]].notna().all(axis=1).mean() > 0.9:
        d = df.dropna(subset=["rs", "rh", "wind"])
        return penman_monteith_et0(d, lat, df.attrs.get("elevation_m")), "penman_monteith"
    print("note: radiation, humidity or wind missing: using Hargreaves (overestimates in humid climates)")
    return hargreaves_et0(df, lat), "hargreaves"


# --------------------------------------------------------------------------
# 3. Then-vs-now weather indicators (weather screen)
# --------------------------------------------------------------------------
def indicators(d: pd.DataFrame, start: pd.Timestamp, years: int = WINDOW_YEARS) -> dict[str, float]:
    yr = split_years(d, start)
    out = {
        "hot_days_per_year": (d["tmax"] >= HOT_DAY_C).sum() / years,
        "warm_days_per_year": (d["tmax"] >= 25).sum() / years,
        "frost_days_per_year": (d["tmin"] < 0).sum() / years,
        "heavy_rain_days_per_year": (d["rain"] >= HEAVY_RAIN_MM).sum() / years,
        "rain_mm_per_year": d["rain"].sum() / years,
    }
    spells = 0
    for _, g in d.groupby(yr):
        season = g[g.index.month.isin(WEATHER_SCREEN_MONTHS)]
        spells += count_spells(season["rain"] < DRY_DAY_MM, DRY_SPELL_DAYS)
    out["dry_spells_per_year"] = spells / years
    return out


def then_vs_now(df: pd.DataFrame) -> dict:
    w = windows(df)
    res = {k: indicators(df.loc[a:b], a) for k, (a, b) in w.items()}
    rounding = {"rain_mm_per_year": 0, "dry_spells_per_year": 1}
    return {key: {"then": round(float(res["then"][key]), rounding.get(key, 0)),
                  "now": round(float(res["now"][key]), rounding.get(key, 0))}
            for key in res["now"]}


def monthly_climatology(df: pd.DataFrame, lat: float) -> pd.DataFrame:
    """Mean monthly rain and ET0 (mm/month) over the 'now' window, by calendar month 1-12.
    The ET0 method used is stored in clim.attrs["et0_method"]."""
    d, _ = now_data(df)
    d = d.copy()
    et0, method = et0_series(d, lat)
    d["et0"] = et0
    monthly = d[["rain", "et0"]].resample("MS").sum()
    clim = monthly.groupby(monthly.index.month).mean()
    clim.index.name = "month"
    clim.attrs["et0_method"] = method
    return clim


def gdd_by_month(df: pd.DataFrame, t_base: float) -> pd.Series:
    """Mean growing degree days per calendar month (1-12) over the 'now' window."""
    d, _ = now_data(df)
    gdd = ((d["tmax"] + d["tmin"]) / 2 - t_base).clip(lower=0)
    monthly = gdd.resample("MS").sum()
    return monthly.groupby(monthly.index.month).mean()


# --------------------------------------------------------------------------
# 4. Satellite green cover (HLS NDVI) over the polygon
# --------------------------------------------------------------------------
FMASK_BAD_BITS = (1, 2, 3, 4, 5)  # cloud, adjacent cloud/shadow, cloud shadow, snow/ice, water


def _gdal_env():
    import rasterio
    return rasterio.Env(
        GDAL_HTTP_COOKIEFILE=str(Path.home() / "cookies.txt"),
        GDAL_HTTP_COOKIEJAR=str(Path.home() / "cookies.txt"),
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS="TIF",
        GDAL_HTTP_MAX_RETRY="5",
        GDAL_HTTP_RETRY_DELAY="2",
    )


def _granule_ndvi(granule, polygon_wgs84, min_clear_fraction: float = 0.5):
    """Median NDVI over the polygon for one HLS granule, or None if the field itself is too cloudy."""
    import rasterio
    from rasterio.mask import mask
    from shapely.geometry import mapping
    from shapely.ops import transform
    from pyproj import Transformer

    gid = granule["meta"]["native-id"]
    nir_band = "B05" if ".L30." in gid else "B8A"
    links = {u.split(".")[-2]: u for u in granule.data_links() if u.endswith(".tif")}
    if not all(k in links for k in ("B04", nir_band, "Fmask")):
        return None

    with _gdal_env():
        with rasterio.open(links["Fmask"]) as src:
            to_utm = Transformer.from_crs("EPSG:4326", src.crs, always_xy=True).transform
            geom = transform(to_utm, polygon_wgs84).buffer(-30)  # shrink 30 m inward
            if geom.is_empty:
                raise ValueError("polygon is too small after the 30 m inward buffer")
            shapes = [mapping(geom)]
            fmask, _ = mask(src, shapes, crop=True, filled=False)
            fm = np.ma.filled(fmask[0], 255).astype(np.uint8)
            inside = ~np.ma.getmaskarray(fmask[0])
            bad = np.zeros(fm.shape, bool)
            for bit in FMASK_BAD_BITS:
                bad |= (fm >> bit) & 1 == 1
            # Skip reading the bands when the field itself is too cloudy (saves time)
            if inside.sum() == 0 or (inside & ~bad).sum() / inside.sum() < min_clear_fraction:
                return None
        with rasterio.open(links["B04"]) as src:
            red, _ = mask(src, shapes, crop=True, filled=False)
        with rasterio.open(links[nir_band]) as src:
            nir, _ = mask(src, shapes, crop=True, filled=False)

    r = np.ma.filled(red[0], -9999).astype(float)
    n = np.ma.filled(nir[0], -9999).astype(float)
    good = inside & ~bad & (r > 0) & (n > 0)
    if good.sum() / inside.sum() < min_clear_fraction:
        return None
    ndvi = (n[good] - r[good]) / (n[good] + r[good])
    date = pd.to_datetime(granule["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"],
                          utc=True).tz_convert(None)
    return {"date": date.normalize(), "sensor": "L30" if nir_band == "B05" else "S30",
            "ndvi": float(np.median(ndvi)), "clear_fraction": float(good.sum() / inside.sum())}


def fetch_hls_ndvi(polygon_wgs84, start: str, end: str, max_cloud: int = 100,
                   workers: int = 8, cache_dir: str | Path = "cache", name: str = "field") -> pd.DataFrame:
    """One NDVI value per scene where the field itself is clear. Needs earthaccess.login() first.

    max_cloud filters on whole-scene cloud cover (~110 km). Keep it at 100: a small field is often
    clear under a mostly cloudy scene; clouds are judged over the field with the Fmask layer instead.
    Results are cached, so a rerun does not download again."""
    import earthaccess

    cache = Path(cache_dir) / f"hls_ndvi_{name}_{start}_{end}_c{max_cloud}.csv"
    if cache.exists():
        return pd.read_csv(cache, parse_dates=["date"])

    t0 = time.time()
    granules = earthaccess.search_data(short_name=["HLSL30", "HLSS30"], bounding_box=tuple(polygon_wgs84.bounds),
                                       temporal=(start, end), cloud_hosted=True, count=-1)

    def cloud(g):
        for a in g["umm"].get("AdditionalAttributes", []):
            if a["Name"] == "CLOUD_COVERAGE":
                return float(a["Values"][0])
        return 0.0

    granules = [g for g in granules if cloud(g) <= max_cloud]
    print(f"HLS: {len(granules)} scenes to read (scene cloud <= {max_cloud}%, search {time.time() - t0:.0f} s)")

    rows, failed = [], 0
    t1 = time.time()
    with ThreadPoolExecutor(workers) as pool:
        futures = [pool.submit(_granule_ndvi, g, polygon_wgs84) for g in granules]
        for i, f in enumerate(as_completed(futures), 1):
            try:
                res = f.result()
                if res:
                    rows.append(res)
            except Exception as e:  # keep going; report at the end
                failed += 1
                if failed <= 3:
                    print("  scene failed:", repr(e)[:150])
            if i % 100 == 0:
                print(f"  {i}/{len(granules)} scenes read, {len(rows)} clear over the field, {time.time() - t1:.0f} s")

    out = pd.DataFrame(rows, columns=["date", "sensor", "ndvi", "clear_fraction"]).sort_values("date")
    n_raw = len(out)
    out = out.drop_duplicates(["date", "sensor"])  # same scene from two overlapping tiles
    print(f"HLS: {n_raw} clear readings, {n_raw - len(out)} duplicates from overlapping tiles removed, "
          f"{len(out)} clear scenes; {failed} failed; read time {time.time() - t1:.0f} s")
    cache.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(cache, index=False)
    return out


def monthly_ndvi(scenes: pd.DataFrame) -> pd.DataFrame:
    """Median NDVI and number of clear images for each year-month."""
    s = scenes.set_index("date")
    g = s["ndvi"].resample("MS")
    return pd.DataFrame({"ndvi": g.median(), "images": g.count()})


def images_per_calendar_month(monthly: pd.DataFrame) -> dict[int, float]:
    m = monthly.groupby(monthly.index.month)["images"].mean()
    return {int(k): round(float(m.get(k, 0.0)), 1) for k in range(1, 13)}


# --------------------------------------------------------------------------
# 5. Unprotected months u(m)
# --------------------------------------------------------------------------
def u_from_farmer(rot: Rotation) -> np.ndarray:
    """u(m)=1 if no crop is in the ground; the sowing month itself counts as unprotected."""
    T = rot.length_months
    u = np.ones(T, dtype=int)
    for c in rot.crops:
        for m in c.months()[1:]:              # protects from its second month
            u[m % T] = 0
    return u


def u_from_satellite(rot: Rotation, monthly: pd.DataFrame,
                     stubble_months: set[int] | None = None) -> tuple[np.ndarray, list[int]]:
    """u(m) from monthly NDVI for the cycle aligned to rot.start_year.
    Months with too few clear images fall back to the farmer's crop months.
    Returns u and the list of cycle months that used the fallback."""
    u = u_from_farmer(rot)
    fallback = []
    for m in range(rot.length_months):
        ts = pd.Timestamp(year=rot.start_year + m // 12, month=m % 12 + 1, day=1)
        if ts in monthly.index and monthly.loc[ts, "images"] >= MIN_CLEAR_IMAGES and not pd.isna(monthly.loc[ts, "ndvi"]):
            u[m] = int(monthly.loc[ts, "ndvi"] < NDVI_BARE)
        else:
            fallback.append(m)
    for m in stubble_months or set():        # the farmer's one-tap "stubble left"
        u[m] = 0
    return u, fallback


def apply_new_crops(rot_new: Rotation, rot_base: Rotation, u_base: np.ndarray) -> np.ndarray:
    """u(m) for an alternative: start from the current rotation's observed u(m), then apply the
    crops that changed. Months occupied by a new crop follow its sowing rule; months a removed
    crop occupied, and that no crop now occupies, become unprotected."""
    T = rot_base.length_months
    key = lambda c: (c.name, c.start, c.end)  # noqa: E731
    base_ids = {key(c) for c in rot_base.crops}
    new_ids = {key(c) for c in rot_new.crops}
    u = u_base.copy()
    occupied_new = {m % T for c in rot_new.crops for m in c.months()}
    for c in rot_base.crops:                 # removed crops leave their months open
        if key(c) not in new_ids:
            for m in c.months():
                if m % T not in occupied_new:
                    u[m % T] = 1
    for c in rot_new.crops:                  # added crops protect from their second month
        if key(c) not in base_ids:
            for m in c.months()[1:]:
                u[m % T] = 0
    return u


def compare_u(rot: Rotation, monthly: pd.DataFrame) -> pd.DataFrame:
    """Side-by-side table for the dry run: farmer months vs satellite, month by month."""
    u_f = u_from_farmer(rot)
    u_s, fallback = u_from_satellite(rot, monthly)
    rows = []
    for m in range(rot.length_months):
        ts = pd.Timestamp(year=rot.start_year + m // 12, month=m % 12 + 1, day=1)
        crop = rot.crop_at(m)
        has = ts in monthly.index and not pd.isna(monthly.loc[ts, "ndvi"])
        rows.append({
            "month": ts.strftime("%Y-%m"), "crop": crop.name if crop else "-",
            "ndvi": round(float(monthly.loc[ts, "ndvi"]), 2) if has else None,
            "images": int(monthly.loc[ts, "images"]) if ts in monthly.index else 0,
            "u_farmer": int(u_f[m]), "u_satellite": None if m in fallback else int(u_s[m]),
        })
    t = pd.DataFrame(rows)
    t["agree"] = np.where(t["u_satellite"].isna(), "", np.where(t["u_farmer"] == t["u_satellite"], "yes", "NO"))
    return t


# --------------------------------------------------------------------------
# 6. The numbers N1-N4
# --------------------------------------------------------------------------
def kc_by_cycle_month(rot: Rotation) -> np.ndarray:
    kc = np.zeros(rot.length_months)
    for c in rot.crops:
        for i, m in enumerate(c.months()):
            kc[m % rot.length_months] = c.kc[min(i, len(c.kc) - 1)]
    return kc


def water_gap_by_cycle_month(rot: Rotation, clim: pd.DataFrame) -> np.ndarray:
    T = rot.length_months
    cal = np.array([rot.calendar_month(m) for m in range(T)])
    P = clim.loc[cal, "rain"].to_numpy()
    et0 = clim.loc[cal, "et0"].to_numpy()
    return np.maximum(0, kc_by_cycle_month(rot) * et0 - P)


def crop_water_gap(rot: Rotation, crop: Crop, clim: pd.DataFrame) -> float:
    """Extra water (mm per occurrence) one crop needs beyond rain."""
    T = rot.length_months
    gap = 0.0
    for i, m in enumerate(crop.months()):
        cm = rot.calendar_month(m)
        gap += max(0.0, crop.kc[min(i, len(crop.kc) - 1)] * clim.loc[cm, "et0"] - clim.loc[cm, "rain"])
    return gap


def numbers(rot: Rotation, u: np.ndarray, clim: pd.DataFrame) -> dict[str, float]:
    T = rot.length_months
    cal = np.array([rot.calendar_month(m) for m in range(T)])
    P = clim.loc[cal, "rain"].to_numpy()

    n1 = 12 - 12 / T * u.sum()
    n2 = 100 * (u * P).sum() / P.sum()
    n3 = 12 / T * water_gap_by_cycle_month(rot, clim).sum()
    earning = np.zeros(T, dtype=int)
    for c in rot.crops:
        if c.sellable or c.forage:
            for m in c.months():
                earning[m % T] = 1
    n4 = 12 / T * earning.sum()
    return {
        "months_covered_per_year": round(float(n1), 1),
        "rain_on_open_soil_pct": round(float(n2)),
        "extra_water_mm_per_year": round(float(n3)),
        "earning_months_per_year": round(float(n4), 1),
    }


# --------------------------------------------------------------------------
# 7. Flags
# --------------------------------------------------------------------------
def _sensitive_cal_months(rot: Rotation, c: Crop) -> set[int]:
    season = {rot.calendar_month(m) for m in c.months()}
    return (set(c.sensitive_months) & season) or season


def flag_details(rot: Rotation, u: np.ndarray, df: pd.DataFrame) -> list[dict]:
    """How often each warning event happened in the 'now' window (years out of WINDOW_YEARS).

    Crop warnings are per main crop, read as "in a year when you grow this crop":
      heat: >= HEAT_DAYS_FOR_FLAG days above the crop's heat limit in its sensitive months
      late_frost: Tmin < LATE_FROST_C within 6 weeks after sowing a frost-sensitive crop
      dry_spell: >= DRY_SPELL_FLAG_DAYS dry days in a row inside a sensitive month
    Soil warning, for the whole rotation:
      heavy_rain_on_open_soil: expected number of unprotected months with a heavy-rain day,
      scaled to "times in 20 years". It follows the cycle, so a month that is bare only one
      year in three counts one third.
    """
    d, a = now_data(df)
    yr = split_years(d, a)
    years_list = [g for _, g in d.groupby(yr)]
    out = []
    for c in sorted(rot.crops, key=lambda c: c.start):
        if c.cover:
            continue
        sens_months = _sensitive_cal_months(rot, c)
        heat = frost = dry = 0
        for g in years_list:
            sens = g[g.index.month.isin(sens_months)]
            heat += (sens["tmax"] > c.heat_limit_c).sum() >= HEAT_DAYS_FOR_FLAG
            dry += count_spells(sens["rain"] < DRY_DAY_MM, DRY_SPELL_FLAG_DAYS) > 0
            if c.frost_sensitive:
                hit = False
                for y in sorted(set(g.index.year)):
                    s = pd.Timestamp(year=y, month=rot.calendar_month(c.start), day=15)
                    w = g.loc[s: s + pd.Timedelta(days=LATE_FROST_DAYS)]
                    if len(w) >= LATE_FROST_DAYS // 2 and (w["tmin"] < LATE_FROST_C).any():
                        hit = True
                frost += hit
        out += [{"flag": "heat", "crop": c.name, "years": int(heat)},
                {"flag": "dry_spell", "crop": c.name, "years": int(dry)}]
        if c.frost_sensitive:
            out.append({"flag": "late_frost", "crop": c.name, "years": int(frost)})

    T = rot.length_months
    p_heavy = {m: np.mean([(g[g.index.month == m]["rain"] >= HEAVY_RAIN_MM).any() for g in years_list])
               for m in range(1, 13)}
    expected = 12 / T * sum(p_heavy[rot.calendar_month(m)] for m in range(T) if u[m] == 1)
    out.append({"flag": "heavy_rain_on_open_soil", "crop": None,
                "years": int(min(WINDOW_YEARS, round(expected * WINDOW_YEARS)))})
    return out


def flags(rot: Rotation, u: np.ndarray, df: pd.DataFrame, irrigated: bool,
          season_fit: bool = True) -> tuple[dict[str, bool], dict[str, int], list[dict], dict[str, str]]:
    """Returns (flags, worst years out of 20 per warning, per-crop details, notes)."""
    details = flag_details(rot, u, df)
    threshold = math.ceil(FLAG_YEARS_FRACTION * WINDOW_YEARS)
    worst = {k: max([x["years"] for x in details if x["flag"] == k], default=0)
             for k in ("heat", "late_frost", "dry_spell", "heavy_rain_on_open_soil")}
    main = [c for c in sorted(rot.crops, key=lambda c: c.start) if not c.cover]
    fams = [c.family for c in main]
    pairs = list(zip(fams, fams[1:] + fams[:1])) if len(fams) > 1 else [(fams[0], fams[0])] if fams else []
    fl = {k: v >= threshold for k, v in worst.items()}
    fl.update({
        "adds_nitrogen": any(c.legume for c in rot.crops),
        "breaks_pest_cycles": all(x != y for x, y in pairs),
        "season_fit": season_fit,
    })
    notes = {"dry_spell": "irrigation needed"} if irrigated and fl["dry_spell"] else {}
    return fl, worst, [x for x in details if x["years"] >= threshold], notes


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def polygon_area_ha(polygon_wgs84) -> float:
    from pyproj import Geod
    area, _ = Geod(ellps="WGS84").geometry_area_perimeter(polygon_wgs84)
    return abs(area) / 10_000


def save_json(obj: dict, path: str | Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(obj, indent=2, ensure_ascii=False,
                                     default=lambda x: x.item() if hasattr(x, "item") else str(x)))
