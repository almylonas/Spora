"""FieldShift web API.

Run (development):  uvicorn api:app --reload --port 8000
The built front end (frontend/dist) is served from the same server when present.
"""
from __future__ import annotations

import datetime as dt
import os
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from shapely.geometry import shape

import fieldshift_core as fs
import fieldshift_rotations as fr
import satellite as sat
import verbal

HERE = Path(__file__).parent
CACHE = Path(os.environ.get("FIELDSHIFT_CACHE", HERE / "cache"))
# Saved weather used when NASA POWER cannot be reached (e.g. no internet during a demo).
FALLBACK_WEATHER = Path(os.environ.get("FIELDSHIFT_FALLBACK_WEATHER", HERE / "demo_weather_aachen.csv"))

app = FastAPI(title="FieldShift API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
TABLE = fr.load_crop_table(HERE / "crops.csv")


def demo_fields():
    """Pre-computed satellite layers (backend/demo_fields/*.json); re-read so new files appear without a restart."""
    return sat.load_demo_fields()


# --------------------------------------------------------------------------
# Request models
# --------------------------------------------------------------------------
class CropIn(BaseModel):
    crop: str
    sow_month: int = Field(ge=1, le=12)
    harvest_month: int = Field(ge=1, le=12)


class AnalyseIn(BaseModel):
    field: dict                                  # GeoJSON Polygon geometry, lon/lat
    crops: list[CropIn] = Field(min_length=1, max_length=6)
    irrigated: bool = False
    priority: Literal["save_water", "build_soil", "income_forage"] = "build_soil"
    soil_answer: Literal["bare", "stubble", "other"] = "bare"


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def build_cycle(crops: list[CropIn]) -> tuple[list[tuple[str, int, int]], int]:
    """Turn crops in growing order (sow month, harvest month) into cycle month indices.
    Each crop is sown at the first matching month after the previous harvest; the cycle length is
    the smallest whole number of years after which the first crop can be sown again."""
    out, prev_end = [], None
    for c in crops:
        if prev_end is None:
            start = c.sow_month - 1
        else:
            start = prev_end + 1
            while start % 12 != c.sow_month - 1:
                start += 1
        end = start
        while end % 12 != c.harvest_month - 1 or end == start and c.harvest_month != c.sow_month:
            end += 1
        out.append((c.crop, start, end))
        prev_end = end
    first = out[0][1]
    T = 12
    while first + T <= prev_end:
        T += 12
    return out, T


def load_weather(lat: float, lon: float) -> tuple:
    try:
        return fs.fetch_power_daily(lat, lon, cache_dir=CACHE), None
    except Exception as e:  # network down or API error
        if FALLBACK_WEATHER.exists():
            df = fs.read_power_csv(FALLBACK_WEATHER)
            return df, (f"NASA POWER could not be reached ({type(e).__name__}); "
                        f"saved demo weather from {FALLBACK_WEATHER.stem} is shown instead.")
        raise HTTPException(503, "The weather service could not be reached. Try again in a minute.")


def apply_soil_answer(rot, u: np.ndarray, answer: str) -> np.ndarray:
    """'stubble': the first two bare months after each cereal harvest count as protected."""
    if answer != "stubble":
        return u
    u = u.copy()
    T = rot.length_months
    for c in rot.crops:
        if c.family == "poaceae" and not c.cover:
            for m in (c.end + 1, c.end + 2):
                if u[m % T] == 1 and not any(o.start % T == m % T for o in rot.crops):
                    u[m % T] = 0
    return u


def align_to_satellite(rot, monthly):
    """Line the rotation up with the satellite years: try each starting year and keep the one where
    the crop months and the satellite agree most. Returns (rotation, agreement share)."""
    T = rot.length_months
    best, best_score = rot, -1.0
    for k in range(T // 12):
        crops = [fr.make_crop(TABLE, c.name, c.start + 12 * k, c.end + 12 * k) for c in rot.crops]
        r = fs.Rotation(rot.id, rot.name, T, rot.start_year, crops)
        seen = sat.seen_from_space(r, monthly)
        u_f = fs.u_from_farmer(r)
        both = [(s_, u) for s_, u in zip(seen, u_f) if s_ != "no_image"]
        score = sum((s_ == "bare") == bool(u) for s_, u in both) / len(both) if both else 0.0
        if score > best_score:
            best, best_score = r, score
    return best, best_score


def timeline(entry: dict) -> list[dict]:
    """One item per month of the cycle: which crop is in the ground and whether the soil is protected."""
    if not entry.get("crops"):
        return []
    T = entry["cycle_months"]
    items = []
    for m in range(T):
        crop = None
        for c in entry["crops"]:
            if m in {x % T for x in range(c["cycle_start"], c["cycle_end"] + 1)}:
                crop = c
        items.append({"year": m // 12 + 1, "month": m % 12 + 1,
                      "crop": crop["crop"] if crop else None,
                      "cover_crop": bool(crop and crop["cover_crop"]),
                      "protected": bool(entry["protected_by_month"][m])})
    return items


def next_crop_after_cover(entry: dict) -> str | None:
    covers = [c for c in entry.get("crops") or [] if c["cover_crop"]]
    if not covers:
        return None
    T = entry["cycle_months"]
    end = covers[0]["cycle_end"]
    mains = [c for c in entry["crops"] if not c["cover_crop"]]
    return min(mains, key=lambda c: (c["cycle_start"] - end - 1) % T)["crop"] if mains else None


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@app.get("/api/crops")
def crops():
    """Crops a farmer can enter, with default sowing and harvest months."""
    out = []
    for name, row in TABLE.iterrows():
        if row.type != "main":
            continue
        sow = row.sow_months[0]
        out.append({"crop": name, "label": verbal.crop_label(name), "climate": row.climate,
                    "sow_month": sow, "harvest_month": (sow - 1 + int(row.season_months) - 1) % 12 + 1})
    return sorted(out, key=lambda c: c["label"])


@app.post("/api/analyse")
def analyse(req: AnalyseIn):
    try:
        poly = shape(req.field)
    except Exception:
        raise HTTPException(422, "The field outline could not be read. Draw it again.")
    if poly.geom_type != "Polygon" or not poly.is_valid:
        raise HTTPException(422, "The field outline crosses itself. Draw it again, corner by corner.")
    area = fs.polygon_area_ha(poly)
    if area < 1:
        raise HTTPException(422, "The field is smaller than 1 hectare. Draw a larger area.")
    if area > 500:
        raise HTTPException(422, "The field is larger than 500 hectares. Draw a single field.")
    unknown = [c.crop for c in req.crops if c.crop.lower() not in TABLE.index]
    if unknown:
        raise HTTPException(422, f"Unknown crop: {', '.join(unknown)}.")

    cycle, T = build_cycle(req.crops)
    start_year = dt.date.today().year - T // 12
    current = fr.rotation_from_table(TABLE, cycle, T, start_year)
    weather, note = load_weather(poly.centroid.y, poly.centroid.x)

    # Satellite layers, when the drawn field is one of the pre-computed demo fields
    demo = sat.match_demo_field(poly, demo_fields())
    monthly = sat.monthly_from_demo(demo) if demo else None
    slope = demo.get("slope") if demo else None
    seen, agreement = None, None
    if monthly is not None:
        current, agreement = align_to_satellite(current, monthly)
        u, _ = fs.u_from_satellite(current, monthly)
        seen = sat.seen_from_space(current, monthly)
        source = "satellite"
    else:
        u, source = fs.u_from_farmer(current), "farmer"
    u = apply_soil_answer(current, u, req.soil_answer)

    result = fr.build_result(poly, weather, current, u, source, req.irrigated, req.priority, TABLE, monthly)
    if demo:
        result["field"]["demo_field"] = demo["name"]
        result["field"]["slope"] = slope
    info = {r["id"]: r.get("generation", {}) for r in result["rotations"]}
    sb = next(r for r in result["rotations"] if r["id"] == "soil_building")
    words = verbal.build(result, info, req.irrigated, next_crop_after_cover(sb))
    in_record = None
    if monthly is not None:
        sat_years = set(monthly.index.year)   # whole calendar years seen by the satellite
        in_record = [current.start_year + m // 12 in sat_years for m in range(current.length_months)]
    verbal.add_satellite_and_slope(words, seen, current, agreement, slope, in_record)
    for r in result["rotations"]:
        r["timeline"] = timeline(r)
        if seen and r["timeline"] and r["id"] == "current":
            farmer_u = fs.u_from_farmer(current)
            for item, s_, fu in zip(r["timeline"], seen, farmer_u):
                item["seen_from_space"] = s_
                item["crop_months_say_bare"] = bool(fu)
    return {"result": result, "words": words, "weather_note": note,
            "climate_zone": fr.climate_zone(fs.monthly_climatology(weather, poly.centroid.y), weather)}


@app.get("/api/health")
def health():
    return {"ok": True}


DIST = HERE.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="app")
