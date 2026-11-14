"""FieldShift rotations: crop table, the two alternative rotations, ranking, card texts
and the full result file in the agreed format.

Rules (method spec, section 6):
  Soil-building: fill the longest unprotected window with the best-fitting cover crop.
                 For each cover crop, take the earliest month in the window where it can be sown,
                 gets enough warm days to establish, passes the early-frost check and can
                 establish on rain alone. Prefer a legume, otherwise the crop covering most months.
  Water-saving:  replace the main crop with the largest water gap by the crop with the smallest
                 gap that fits between its neighbours and gets enough warm days to mature,
                 preferring a different plant family from its neighbours.
                 Skipped if the current rotation needs < 50 mm extra a year.
  Both rules only use crops marked for the field's climate (temperate / mediterranean) or "any".
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd

import fieldshift_core as fs

WATER_SAVING_MIN_MM = 50           # DEFAULT: below this, the current rotation already fits rainfall
WATER_SAVING_MIN_GAIN = 0.2        # the replacement must cut that crop's water gap by >= 20%
COVER_MIN_MONTHS = 2               # a cover crop shorter than this is not worth sowing
ESTABLISH_MONTHS = 2               # warm days for establishment are counted over the first 2 months
COVER_MAX_ESTABLISH_GAP_MM = 30    # DEFAULT: a cover crop must establish on rain (water gap in its first 2 months)

PRIORITIES = ("save_water", "build_soil", "income_forage")


# --------------------------------------------------------------------------
# Crop table
# --------------------------------------------------------------------------
def load_crop_table(path: str | Path = Path(__file__).with_name("crops.csv")) -> pd.DataFrame:
    t = pd.read_csv(path)
    t["crop"] = t["crop"].str.strip().str.lower()
    for col in ("legume", "frost_sensitive", "sellable", "forage"):
        t[col] = t[col].astype(str).str.strip().str.lower().eq("yes")

    def months(v):
        if pd.isna(v) or str(v).strip() == "":
            return []
        return [int(x) for x in str(v).split(";")]

    t["sow_months"] = t["sow_months"].map(months)
    t["sensitive_months"] = t["sensitive_months"].map(months)
    return t.set_index("crop")


def kc_curve(row: pd.Series, n_months: int) -> list[float]:
    """Monthly Kc from the FAO-56 four-stage curve, evaluated at the middle of each month."""
    f1, f2, f3 = row.stage_ini, row.stage_dev, row.stage_mid
    out = []
    for i in range(n_months):
        t = (i + 0.5) / n_months
        if t <= f1:
            k = row.kc_ini
        elif t <= f1 + f2:
            k = row.kc_ini + (row.kc_mid - row.kc_ini) * (t - f1) / f2
        elif t <= f1 + f2 + f3:
            k = row.kc_mid
        else:
            k = row.kc_mid + (row.kc_end - row.kc_mid) * (t - f1 - f2 - f3) / max(1e-9, 1 - f1 - f2 - f3)
        out.append(round(float(k), 3))
    return out


def make_crop(table: pd.DataFrame, name: str, start: int, end: int) -> fs.Crop:
    """A Crop occupying cycle months start..end, with its traits from the table."""
    name_l = name.strip().lower()
    if name_l not in table.index:
        raise KeyError(f"'{name}' is not in the crop table. Known crops: {', '.join(table.index)}")
    row = table.loc[name_l]
    return fs.Crop(
        name=name_l, start=start, end=end, kc=kc_curve(row, end - start + 1), family=row.family,
        legume=bool(row.legume), frost_sensitive=bool(row.frost_sensitive),
        heat_limit_c=float(row.heat_limit_c), sellable=bool(row.sellable), forage=bool(row.forage),
        cover=row.type == "cover", sensitive_months=list(row.sensitive_months),
    )


def rotation_from_table(table: pd.DataFrame, crops: list[tuple[str, int, int]], length_months: int,
                        start_year: int, rid: str = "current", name: str = "Current rotation") -> fs.Rotation:
    """crops: (crop name, start cycle month, end cycle month), 0 = January of start_year."""
    return fs.Rotation(rid, name, length_months, start_year,
                       [make_crop(table, n, s, e) for n, s, e in crops])


# --------------------------------------------------------------------------
# Climate fit helpers
# --------------------------------------------------------------------------
def gdd_over(df: pd.DataFrame, t_base: float, first_cal_month: int, n_months: int) -> float:
    g = fs.gdd_by_month(df, t_base)
    return float(sum(g.loc[(first_cal_month - 1 + i) % 12 + 1] for i in range(n_months)))


def frost_after_sowing_years(df: pd.DataFrame, sow_cal_month: int, days: int = fs.LATE_FROST_DAYS) -> int:
    """Years in the 'now' window with frost within `days` after the 15th of the sowing month."""
    d, a = fs.now_data(df)
    n = 0
    for y in sorted(set(d.index.year)):
        s = pd.Timestamp(year=y, month=sow_cal_month, day=15)
        w = d.loc[s: s + pd.Timedelta(days=days)]
        if len(w) >= days // 2 and (w["tmin"] < 0).any():
            n += 1
    return n


def frost_ok(df: pd.DataFrame, row: pd.Series, sow_cal_month: int) -> bool:
    if not row.frost_sensitive:
        return True
    return frost_after_sowing_years(df, sow_cal_month) < math.ceil(fs.FLAG_YEARS_FRACTION * fs.WINDOW_YEARS)


def climate_zone(clim: pd.DataFrame, df: pd.DataFrame) -> str:
    """'mediterranean' (dry hot summer) or 'temperate'. Deliberately simple: July and August each
    get under 30 mm of rain and July is warmer than 20 C on average."""
    d, _ = fs.now_data(df)
    july_t = ((d["tmax"] + d["tmin"]) / 2)[d.index.month == 7].mean()
    if clim.loc[7, "rain"] < 30 and clim.loc[8, "rain"] < 30 and july_t > 20:
        return "mediterranean"
    return "temperate"


def candidates(table: pd.DataFrame, kind: str, zone: str) -> pd.DataFrame:
    return table[(table.type == kind) & table.climate.isin([zone, "any"])]


def establish_gap(clim: pd.DataFrame, row: pd.Series, first_cal_month: int) -> float:
    """Water gap (mm) over the first ESTABLISH_MONTHS of a crop, from its Kc curve."""
    kc = kc_curve(row, int(row.season_months))
    gap = 0.0
    for i in range(min(ESTABLISH_MONTHS, len(kc))):
        m = (first_cal_month - 1 + i) % 12 + 1
        gap += max(0.0, kc[i] * clim.loc[m, "et0"] - clim.loc[m, "rain"])
    return gap


# --------------------------------------------------------------------------
# Unprotected window
# --------------------------------------------------------------------------
def longest_open_window(rot: fs.Rotation, u: np.ndarray) -> tuple[int, int] | None:
    """(first, last) cycle month of the longest cyclic run of unprotected months; last may exceed T-1."""
    T = rot.length_months
    if u.sum() == 0:
        return None
    if u.sum() == T:
        return (0, T - 1)
    best, start = None, None
    doubled = np.concatenate([u, u])
    for i in range(2 * T):
        if doubled[i] == 1 and (i == 0 or doubled[i - 1] == 0):
            start = i
        if doubled[i] == 1 and (i == 2 * T - 1 or doubled[i + 1] == 0) and start is not None:
            if start < T and (best is None or i - start > best[1] - best[0]):
                best = (start, min(i, start + T - 1))
            start = None
    return best


def usable_window(rot: fs.Rotation, u: np.ndarray) -> tuple[int, int] | None:
    """The open window minus the next crop's sowing month (the cover crop must be gone by then)."""
    w = longest_open_window(rot, u)
    if w is None:
        return None
    s, e = w
    T = rot.length_months
    if any(c.start % T == e % T for c in rot.crops):   # the last open month is the next sowing month
        e -= 1
    return (s, e) if e >= s else None


# --------------------------------------------------------------------------
# Soil-building alternative
# --------------------------------------------------------------------------
def soil_building(table: pd.DataFrame, rot: fs.Rotation, u: np.ndarray, df: pd.DataFrame,
                  clim: pd.DataFrame, avoid_families: set[str] | None = None) -> tuple[fs.Rotation | None, dict]:
    win = usable_window(rot, u)
    info: dict = {"window": None, "candidates": []}
    if win is None or win[1] - win[0] + 1 < COVER_MIN_MONTHS:
        info["reason"] = "the soil is never unprotected long enough for a cover crop"
        return None, info
    s, e = win
    info["window"] = (s, e)
    zone = climate_zone(clim, df)
    options = []
    # General agronomy: in rotations with a brassica main crop (e.g. rapeseed), avoid brassica cover
    # crops (clubroot) and clover/vetch (Sclerotinia hosts).
    has_brassica = any(c.family == "brassicaceae" and not c.cover for c in rot.crops)
    excluded = {"brassicaceae", "fabaceae"} if has_brassica else set()
    # Field health: with past pests or diseases, no cereal cover crop between cereals
    excluded |= set(avoid_families or ())
    info["avoided_families"] = sorted(avoid_families or ())
    for name, row in candidates(table, "cover", zone).iterrows():
        if row.family in excluded:
            continue
        for start in range(s, e - COVER_MIN_MONTHS + 2):   # earliest workable sowing month
            cal = fs.Rotation.calendar_month(start)
            if cal not in row.sow_months:
                continue
            length = min(int(row.season_months), e - start + 1)
            gdd = gdd_over(df, row.t_base_c, cal, ESTABLISH_MONTHS)
            gap = establish_gap(clim, row, cal)
            ok = gdd >= row.gdd_establish and frost_ok(df, row, cal) and gap <= COVER_MAX_ESTABLISH_GAP_MM
            info["candidates"].append({"crop": name, "sow_month": cal, "months": length, "gdd_available": round(gdd),
                                       "gdd_needed": int(row.gdd_establish), "establish_gap_mm": round(gap),
                                       "fits": bool(ok)})
            if ok:
                crop = make_crop(table, name, start, start + length - 1)
                options.append((not row.legume, -length, crop, gdd, row))
                break
    if not options:
        info["reason"] = "no cover crop in the table fits the open window"
        return None, info
    options.sort(key=lambda o: (o[0], o[1]))
    _, _, crop, gdd, row = options[0]
    info.update({"chosen": crop.name, "gdd_available": round(gdd), "gdd_needed": int(row.gdd_establish)})
    alt = fs.Rotation("soil_building", "Soil-building rotation", rot.length_months, rot.start_year,
                      rot.crops + [crop])
    return alt, info


# --------------------------------------------------------------------------
# Water-saving alternative
# --------------------------------------------------------------------------
def water_saving(table: pd.DataFrame, rot: fs.Rotation, df: pd.DataFrame,
                 clim: pd.DataFrame, current_n3: float, strict_families: bool = False) -> tuple[fs.Rotation | None, dict]:
    """strict_families: with past pests or diseases, never put a crop next to one of its own family."""
    info: dict = {}
    if current_n3 < WATER_SAVING_MIN_MM:
        info["reason"] = f"your rotation already fits local rainfall (about {current_n3:.0f} mm extra water a year)"
        return None, info
    T = rot.length_months
    mains = sorted([c for c in rot.crops if not c.cover], key=lambda c: c.start)
    gaps = {c.name + str(c.start): fs.crop_water_gap(rot, c, clim) for c in mains}
    target = max(mains, key=lambda c: gaps[c.name + str(c.start)])
    old_gap = gaps[target.name + str(target.start)]
    i = mains.index(target)
    prev_c, next_c = mains[i - 1], mains[(i + 1) % len(mains)]
    prev_end = prev_c.end if prev_c.end < target.start else prev_c.end - T
    next_start = next_c.start if next_c.start > target.start else next_c.start + T

    zone = climate_zone(clim, df)
    options = []
    for name, row in candidates(table, "main", zone).iterrows():
        if name == target.name:
            continue
        for start in range(prev_end + 1, target.start + 2):   # earliest sowing that fits the slot
            cal = fs.Rotation.calendar_month(start)
            end = start + int(row.season_months) - 1
            if cal not in row.sow_months or start <= prev_end or end >= next_start:
                continue
            if pd.notna(row.gdd_season) and gdd_over(df, row.t_base_c, cal, int(row.season_months)) < row.gdd_season:
                continue
            if not frost_ok(df, row, cal):
                continue
            crop = make_crop(table, name, start, end)
            new_gap = fs.crop_water_gap(rot, crop, clim)
            same_family = row.family in {prev_c.family, next_c.family}
            if strict_families and same_family:
                break
            options.append((same_family, new_gap, crop))
            break
    options = [o for o in options if o[1] <= (1 - WATER_SAVING_MIN_GAIN) * old_gap]
    info.update({"replaced": target.name, "replaced_gap_mm": round(old_gap)})
    if not options:
        info["reason"] = f"no lower-water crop fits the season of {target.name}"
        return None, info
    options.sort(key=lambda o: (o[0], o[1]))
    _, new_gap, crop = options[0]
    info.update({"chosen": crop.name, "chosen_gap_mm": round(new_gap)})
    crops = [crop if c is target else c for c in rot.crops]
    return fs.Rotation("water_saving", "Water-saving rotation", T, rot.start_year, crops), info


# --------------------------------------------------------------------------
# Ranking
# --------------------------------------------------------------------------
def rank(entries: list[dict], priority: str) -> list[str]:
    offered = [e for e in entries if e.get("crops")]
    if priority == "save_water":
        key = lambda e: e["extra_water_mm_per_year"]  # noqa: E731
    elif priority == "build_soil":
        key = lambda e: (e["rain_on_open_soil_pct"], -e["months_covered_per_year"])  # noqa: E731
    elif priority == "income_forage":
        key = lambda e: -e["earning_months_per_year"]  # noqa: E731
    else:
        raise ValueError(f"priority must be one of {PRIORITIES}")
    return [e["id"] for e in sorted(offered, key=key)]


# --------------------------------------------------------------------------
# Card texts (plain-language templates; every sentence comes from a number)
# --------------------------------------------------------------------------
def month_list(cal_months: list[int]) -> str:
    """[11,12,1,2,3] -> 'Nov-Mar'; non-contiguous -> 'Jan, Apr, Sep'."""
    if not cal_months:
        return "no months"
    ms = sorted(set(cal_months))
    # find a cyclic start so contiguous runs read naturally
    for s in ms:
        seq = [(s - 1 + i) % 12 + 1 for i in range(len(ms))]
        if sorted(seq) == ms:
            return fs.MONTH_NAMES[seq[0] - 1] if len(seq) == 1 else f"{fs.MONTH_NAMES[seq[0] - 1]}–{fs.MONTH_NAMES[seq[-1] - 1]}"
    return ", ".join(fs.MONTH_NAMES[m - 1] for m in ms)


def _risk_lines(details: list[dict]) -> list[str]:
    n = fs.WINDOW_YEARS
    out = []
    for x in details:
        c = (x["crop"] or "").capitalize()
        if x["flag"] == "heat":
            out.append(f"{c}: {fs.HEAT_DAYS_FOR_FLAG}+ days above its heat limit in sensitive months, {x['years']} of the last {n} years.")
        elif x["flag"] == "late_frost":
            out.append(f"{c}: damaging frost in the 6 weeks after sowing, {x['years']} of the last {n} years.")
        elif x["flag"] == "dry_spell":
            out.append(f"{c}: {fs.DRY_SPELL_FLAG_DAYS}+ dry days in a row in a sensitive month, {x['years']} of the last {n} years.")
        else:
            out.append(f"Heavy rain (≥{fs.HEAVY_RAIN_MM:.0f} mm in a day) on unprotected soil: about {x['years']} times in {n} years.")
    return out


def card(entry: dict, current: dict | None, info: dict, source: dict) -> dict:
    n = entry
    evidence = (f"Weather: NASA POWER, {source['window']} (area estimate, about 50 km). "
                f"Water loss: {source['et0_method'].replace('_', '-').title()}. "
                f"Unprotected months: {'satellite (HLS, 30 m) checked with your crop months' if source['green'] == 'satellite' else 'your crop months'}.")
    unknowns = ["Soil type and water stored in the soil are not included.",
                "Local storms and frost pockets can differ from the area estimate."]
    if source["green"] == "satellite" and source.get("few_image_months"):
        unknowns.append(f"Few clear satellite images in {month_list(source['few_image_months'])}; those months use your crop months.")
    risks = _risk_lines(n["warning_details"])
    benefits = []
    if n["flags"]["adds_nitrogen"]:
        benefits.append("Adds nitrogen for the next crop (legume).")
    if n["flags"]["breaks_pest_cycles"]:
        benefits.append("Likely breaks pest cycles: no two main crops in a row from the same family.")

    if n["id"] == "current":
        why = "This is the rotation you grow now. It is the baseline the alternatives are compared with."
        questions = ["Which of these risks have you seen on this field?"]
    elif n["id"] == "soil_building":
        c = info["chosen"]
        why = (f"Your soil is unprotected for {12 - current['months_covered_per_year']:.1f} months a year, "
               f"when {current['rain_on_open_soil_pct']}% of the year's rain falls. {c.capitalize()} can grow in that gap: "
               f"about {info['gdd_available']} warm-day units are available after sowing, it needs about {info['gdd_needed']}.")
        benefits.insert(0, f"Soil covered {current['months_covered_per_year']} → {n['months_covered_per_year']} months a year; "
                           f"rain on unprotected soil {current['rain_on_open_soil_pct']}% → {n['rain_on_open_soil_pct']}%.")
        risks.append("Seed and sowing cost; the cover crop uses some water before the next crop.")
        questions = [f"Does {c} suit the crop that follows it (pests, nematodes, residue)?",
                     "Which variety or mix, and which sowing and termination dates?",
                     "Does this cover crop count toward your subsidy requirements?"]
    else:
        why = (f"{info['replaced'].capitalize()} needs the most extra water in your rotation "
               f"(about {info['replaced_gap_mm']} mm each time it is grown). {info['chosen'].capitalize()} fits the same "
               f"season with about {info['chosen_gap_mm']} mm.")
        benefits.insert(0, f"Extra water needed {current['extra_water_mm_per_year']} → {n['extra_water_mm_per_year']} mm a year.")
        risks.append(f"Market, price and machinery for {info['chosen']} are not checked.")
        questions = [f"Is there a buyer for {info['chosen']} nearby, and at what price?",
                     "Do you have the machinery, or can a contractor do it?",
                     f"Which {info['chosen']} variety suits this field?"]
    return {"why_suggested": why, "evidence": evidence, "benefits": benefits, "risks": risks,
            "unknowns": unknowns, "advisor_questions": questions}


# --------------------------------------------------------------------------
# Full result in the agreed format
# --------------------------------------------------------------------------
def _entry(rot: fs.Rotation, u: np.ndarray, clim: pd.DataFrame, df: pd.DataFrame, irrigated: bool) -> dict:
    fl, years, details, notes = fs.flags(rot, u, df, irrigated)
    e = {
        "id": rot.id, "name": rot.name,
        "crops": [{"crop": c.name, "sow_month": rot.calendar_month(c.start),
                   "harvest_month": rot.calendar_month(c.end), "cover_crop": c.cover,
                   "cycle_start": c.start, "cycle_end": c.end, "family": c.family, "legume": c.legume,
                   "sensitive_months": sorted(fs._sensitive_cal_months(rot, c))} for c in
                  sorted(rot.crops, key=lambda c: c.start)],
        "cycle_months": rot.length_months,
        "protected_by_month": [int(1 - x) for x in u],
        **fs.numbers(rot, u, clim),
        "flags": fl, "flag_years_out_of_20": years, "warning_details": details,
    }
    if notes:
        e["flag_notes"] = notes
    return e


def build_result(polygon_wgs84, df: pd.DataFrame, current: fs.Rotation, u: np.ndarray,
                 green_cover_source: str, irrigated: bool, priority: str,
                 table: pd.DataFrame, monthly: pd.DataFrame | None = None, field_health: dict | None = None) -> dict:
    import health as hl
    h = hl.defaults(field_health)
    if priority not in PRIORITIES:
        raise ValueError(f"priority must be one of {PRIORITIES}")
    lat = polygon_wgs84.centroid.y
    clim = fs.monthly_climatology(df, lat)
    a, b = fs.windows(df)["now"]
    T = current.length_months

    cur = _entry(current, u, clim, df, irrigated)
    avoid = hl.avoid_cover_families(h, hl.has_cereal(cur["crops"]))
    sb_rot, sb_info = soil_building(table, current, u, df, clim, avoid)
    ws_rot, ws_info = water_saving(table, current, df, clim, cur["extra_water_mm_per_year"],
                                   strict_families=bool(hl.problems(h)))

    rotations = [cur]
    for rid, name, alt, info in (("soil_building", "Soil-building rotation", sb_rot, sb_info),
                                 ("water_saving", "Water-saving rotation", ws_rot, ws_info)):
        if alt is None:
            rotations.append({"id": rid, "name": name, "crops": None, "reason": info["reason"]})
        else:
            e = _entry(alt, fs.apply_new_crops(alt, current, u), clim, df, irrigated)
            e["_info"] = info
            rotations.append(e)

    images = fs.images_per_calendar_month(monthly) if monthly is not None and green_cover_source == "satellite" else None
    source = {"window": f"{a:%b %Y}–{b:%b %Y}", "et0_method": clim.attrs["et0_method"], "green": green_cover_source,
              "few_image_months": [m for m, v in (images or {}).items() if v < fs.MIN_CLEAR_IMAGES]}
    for e in rotations:
        if e.get("crops"):
            info = e.pop("_info", {})
            e["card"] = card(e, cur, info, source)
            e["generation"] = {k: v for k, v in info.items()
                               if k in ("chosen", "replaced", "replaced_gap_mm", "chosen_gap_mm", "avoided_families")}
            e["health"] = hl.summary(e)
    ranking, demoted = hl.adjust_ranking(rank(rotations, priority), rotations, h)

    field_info = {"area_ha": round(fs.polygon_area_ha(polygon_wgs84), 1), "centre_lat": round(lat, 4),
                  "centre_lon": round(polygon_wgs84.centroid.x, 4), "green_cover_source": green_cover_source}
    if green_cover_source == "farmer":
        field_info["green_cover_reason"] = "outside demo region"
    else:
        field_info["clear_images_per_month"] = images

    return {
        "field": field_info,
        "weather": {"source": "wider_area", "period_then": f"{fs.windows(df)['then'][0]:%b %Y}–{fs.windows(df)['then'][1]:%b %Y}",
                    "period_now": source["window"], "et0_method": source["et0_method"], **fs.then_vs_now(df)},
        "unprotected_months": sorted({current.calendar_month(m) for m in range(T) if u[m] == 1}),
        "rotations": rotations,
        "ranking": ranking,
        "ranking_demoted": demoted,
        "priority": priority,
        "field_health": h,
    }
