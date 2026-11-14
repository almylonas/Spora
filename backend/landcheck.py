"""Is a drawn outline on land? Two checks:

1. Sea: Natural Earth 1:10m land polygons (public domain; TopoJSON from the world-atlas package, ISC licence),
   kept in backend/data/land-10m.json. Coastlines are accurate to a few hundred metres, so only outlines that
   are mostly at sea are refused.
2. Lakes, rivers, reservoirs and ponds: OpenStreetMap water areas around the field, from the public Overpass API.
   If Overpass cannot be reached in time, this check is skipped rather than blocking the farmer.
"""
from __future__ import annotations

import json
import time
from functools import lru_cache
from pathlib import Path

import requests
from shapely.geometry import LineString, Polygon, box, shape
from shapely.ops import polygonize, unary_union
from shapely.strtree import STRtree

LAND_FILE = Path(__file__).parent / "data" / "land-10m.json"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
MAX_WATER_SHARE = 0.3     # refuse when more than this share of the outline is water
OVERPASS_TIMEOUT_S = 8


# --------------------------------------------------------------------------
# Sea: Natural Earth land polygons
# --------------------------------------------------------------------------
def _decode_topojson(topo: dict) -> list[Polygon]:
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:                      # delta-encoded, quantised coordinates
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(indices):
        pts = []
        for i in indices:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a if not pts else a[1:])
        return pts

    polys = []
    for geom in topo["objects"]["land"]["geometries"]:
        parts = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
        for part in parts:
            rings = [ring(r) for r in part]
            if len(rings[0]) >= 4:
                p = Polygon(rings[0], [r for r in rings[1:] if len(r) >= 4])
                polys.append(p if p.is_valid else p.buffer(0))
    return polys


@lru_cache(maxsize=1)
def _land():
    polys = _decode_topojson(json.loads(LAND_FILE.read_text()))
    return STRtree(polys), polys


def land_share(poly) -> float:
    """Share of the outline's area that lies on land (0–1), from Natural Earth."""
    tree, polys = _land()
    hits = [polys[i] for i in tree.query(poly)]
    if not hits:
        return 0.0
    return unary_union([h.intersection(poly) for h in hits]).area / poly.area


# --------------------------------------------------------------------------
# Lakes and rivers: OpenStreetMap
# --------------------------------------------------------------------------
_cache: dict[tuple, tuple[float, float]] = {}


def _overpass_water(poly) -> list:
    minx, miny, maxx, maxy = poly.bounds
    bb = f"{miny},{minx},{maxy},{maxx}"
    q = (f"[out:json][timeout:{OVERPASS_TIMEOUT_S}];("
         f'way["natural"="water"]({bb});relation["natural"="water"]({bb});'
         f'way["waterway"="riverbank"]({bb});way["landuse"~"reservoir|basin"]({bb});'
         f'relation["landuse"~"reservoir|basin"]({bb});'
         f");out geom;")
    r = requests.post(OVERPASS_URL, data={"data": q}, timeout=OVERPASS_TIMEOUT_S + 2,
                      headers={"User-Agent": "Spora field check (NASA Space Apps 2026)"})
    r.raise_for_status()
    shapes = []
    for el in r.json().get("elements", []):
        if el["type"] == "way" and len(el.get("geometry", [])) >= 4:
            pts = [(g["lon"], g["lat"]) for g in el["geometry"]]
            if pts[0] == pts[-1]:
                shapes.append(Polygon(pts).buffer(0))
        elif el["type"] == "relation":
            outer = [LineString([(g["lon"], g["lat"]) for g in m["geometry"]])
                     for m in el.get("members", []) if m.get("role") == "outer" and len(m.get("geometry", [])) >= 2]
            inner = [LineString([(g["lon"], g["lat"]) for g in m["geometry"]])
                     for m in el.get("members", []) if m.get("role") == "inner" and len(m.get("geometry", [])) >= 2]
            if outer:
                area = unary_union(list(polygonize(unary_union(outer))))
                if inner:
                    area = area.difference(unary_union(list(polygonize(unary_union(inner)))))
                shapes.append(area)
    return shapes


def water_share(poly) -> float | None:
    """Share of the outline covered by mapped lakes, rivers or reservoirs; None if OSM could not be reached."""
    key = tuple(round(v, 5) for v in poly.bounds)
    if key in _cache and time.time() - _cache[key][1] < 3600:
        return _cache[key][0]
    try:
        shapes = _overpass_water(poly)
    except Exception:
        return None
    share = unary_union([s.intersection(poly) for s in shapes]).area / poly.area if shapes else 0.0
    _cache[key] = (share, time.time())
    return share


def check(poly) -> dict:
    """{'ok': bool, 'problem': None | 'sea' | 'water', 'land_share': float, 'water_share': float | None}"""
    land = land_share(poly)
    if land < 1 - MAX_WATER_SHARE:
        return {"ok": False, "problem": "sea", "land_share": round(land, 2), "water_share": None}
    water = water_share(poly)
    if water is not None and water > MAX_WATER_SHARE:
        return {"ok": False, "problem": "water", "land_share": round(land, 2), "water_share": round(water, 2)}
    return {"ok": True, "problem": None, "land_share": round(land, 2), "water_share": water}
