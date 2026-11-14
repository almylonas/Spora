"""Satellite layers for demo fields: green cover (HLS) and slope (NASADEM / SRTM).

Downloads need a NASA Earthdata login, so they run once, before the demo, with precompute.py.
The web API only reads the small JSON files this produces (backend/demo_fields/*.json).
"""
from __future__ import annotations

import json
import math
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

import fieldshift_core as fs

DEMO_DIR = Path(__file__).parent / "demo_fields"
STEEP_PCT = 5.0       # DEFAULT: slope above which bare soil erodes noticeably faster
MATCH_OVERLAP = 0.7   # a drawn field counts as a demo field when the outlines overlap this much


# --------------------------------------------------------------------------
# Elevation and slope
# --------------------------------------------------------------------------
def download_elevation(polygon, cache_dir: Path) -> Path:
    """Download the NASADEM (or SRTM) 1-arc-second tile covering the field. Returns a path rasterio can open."""
    import earthaccess

    cache_dir.mkdir(parents=True, exist_ok=True)
    for short_name in ("NASADEM_HGT", "SRTMGL1"):
        found = earthaccess.search_data(short_name=short_name, bounding_box=tuple(polygon.bounds), count=4)
        if not found:
            continue
        files = earthaccess.download(found[:1], local_path=str(cache_dir))
        path = Path(files[0])
        if path.suffix == ".zip":
            # Unpack the .hgt tile next to the zip: a plain file path works the same on Windows and Linux.
            with zipfile.ZipFile(path) as zf:
                inner = next(n for n in zf.namelist() if n.lower().endswith(".hgt"))
                out = cache_dir / Path(inner).name
                if not out.exists():
                    out.write_bytes(zf.read(inner))
            return out
        return path
    raise RuntimeError("no NASADEM or SRTM tile found for this field")


def slope_stats(dem_path: str | Path, polygon) -> dict:
    """Slope over the field (percent). Works on any elevation raster in lon/lat (NASADEM, SRTM)."""
    import rasterio
    from rasterio.mask import mask
    from shapely.geometry import mapping

    with rasterio.open(str(dem_path)) as src:
        pad = 0.002  # read a margin so slopes at the field edge use real neighbours
        window_geom = polygon.buffer(pad)
        z, transform = mask(src, [mapping(window_geom)], crop=True, filled=False)
    z = np.ma.filled(z[0].astype(float), np.nan)
    lat = polygon.centroid.y
    dx = abs(transform.a) * 111_320 * math.cos(math.radians(lat))   # metres per pixel east-west
    dy = abs(transform.e) * 110_540                                   # metres per pixel north-south
    gy, gx = np.gradient(z, dy, dx)
    slope = 100 * np.hypot(gx, gy)
    # pixels inside the field: re-mask the padded grid with the field outline
    from rasterio.features import geometry_mask
    field_mask = ~geometry_mask([mapping(polygon)], out_shape=z.shape, transform=transform, all_touched=True)
    vals = slope[field_mask & np.isfinite(slope)]
    if vals.size == 0:
        raise ValueError("no elevation pixels inside the field")
    return {
        "mean_pct": round(float(np.mean(vals)), 1),
        "max_pct": round(float(np.percentile(vals, 95)), 1),
        "share_steep": round(float(np.mean(vals > STEEP_PCT)), 2),
        "pixels": int(vals.size),
    }


def slope_words(slope: dict | None) -> str | None:
    if not slope:
        return None
    from i18n import t
    if slope["mean_pct"] < 2 and slope["share_steep"] < 0.05:
        return t("slope_flat")
    if slope["share_steep"] >= 0.3:
        return t("slope_much")
    if slope["share_steep"] >= 0.05:
        return t("slope_part")
    return t("slope_gentle")


# --------------------------------------------------------------------------
# Demo field files
# --------------------------------------------------------------------------
def save_demo_field(name: str, polygon, monthly: pd.DataFrame | None, slope: dict | None,
                    notes: dict | None = None, out_dir: Path = DEMO_DIR) -> Path:
    from shapely.geometry import mapping

    out_dir.mkdir(parents=True, exist_ok=True)
    data = {
        "name": name,
        "polygon": mapping(polygon),
        "green_cover": None if monthly is None else [
            {"month": ts.strftime("%Y-%m"), "ndvi": None if pd.isna(r.ndvi) else round(float(r.ndvi), 3),
             "images": int(r.images)} for ts, r in monthly.iterrows()],
        "slope": slope,
        "notes": notes or {},
    }
    path = out_dir / f"{name}.json"
    path.write_text(json.dumps(data, indent=1))
    return path


def load_demo_fields(folder: Path = DEMO_DIR) -> list[dict]:
    from shapely.geometry import shape

    out = []
    for p in sorted(folder.glob("*.json")):
        d = json.loads(p.read_text())
        d["_shape"] = shape(d["polygon"])
        out.append(d)
    return out


def match_demo_field(polygon, demo_fields: list[dict]) -> dict | None:
    """The demo field whose outline overlaps the drawn one by MATCH_OVERLAP or more (both ways)."""
    best, best_score = None, 0.0
    for d in demo_fields:
        inter = polygon.intersection(d["_shape"]).area
        if inter == 0:
            continue
        score = min(inter / polygon.area, inter / d["_shape"].area)
        if score > best_score:
            best, best_score = d, score
    return best if best_score >= MATCH_OVERLAP else None


def monthly_from_demo(d: dict) -> pd.DataFrame | None:
    if not d.get("green_cover"):
        return None
    rows = d["green_cover"]
    idx = pd.to_datetime([r["month"] + "-01" for r in rows])
    return pd.DataFrame({"ndvi": [np.nan if r["ndvi"] is None else r["ndvi"] for r in rows],
                         "images": [r["images"] for r in rows]}, index=idx)


def seen_from_space(rot: fs.Rotation, monthly: pd.DataFrame) -> list[str]:
    """Per cycle month: 'covered', 'bare' or 'no_image', from the satellite only."""
    out = []
    for m in range(rot.length_months):
        ts = pd.Timestamp(year=rot.start_year + m // 12, month=m % 12 + 1, day=1)
        if ts in monthly.index and monthly.loc[ts, "images"] >= fs.MIN_CLEAR_IMAGES and not pd.isna(monthly.loc[ts, "ndvi"]):
            out.append("bare" if monthly.loc[ts, "ndvi"] < fs.NDVI_BARE else "covered")
        else:
            out.append("no_image")
    return out
