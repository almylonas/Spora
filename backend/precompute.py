"""Pre-compute the satellite layers for a demo field (run once, before the demo).

    python precompute.py --name jülich_field1 --geojson field.geojson --start 2023-01-01 --end 2025-12-31

field.geojson: the field outline (a GeoJSON Polygon, Feature or FeatureCollection with one polygon,
longitude/latitude). Needs a free NASA Earthdata account; the first run asks for the login.
Writes backend/demo_fields/<name>.json, which the web API reads. Downloads are cached in backend/cache/.
"""
import argparse
import json
import time
from pathlib import Path

from shapely.geometry import shape

import fieldshift_core as fs
import satellite as sat

HERE = Path(__file__).parent


def read_polygon(path):
    g = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    if g.get("type") == "FeatureCollection":
        g = g["features"][0]
    if g.get("type") == "Feature":
        g = g["geometry"]
    poly = shape(g)
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda p: p.area)
    return poly


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--geojson", required=True)
    ap.add_argument("--start", default="2023-01-01")
    ap.add_argument("--end", default="2025-12-31")
    ap.add_argument("--skip-hls", action="store_true")
    ap.add_argument("--skip-elevation", action="store_true")
    a = ap.parse_args()

    import earthaccess
    earthaccess.login(persist=True)

    poly = read_polygon(a.geojson)
    print(f"field: {fs.polygon_area_ha(poly):.1f} ha around {poly.centroid.y:.4f}, {poly.centroid.x:.4f}")
    notes, monthly, slope = {}, None, None

    if not a.skip_hls:
        t0 = time.time()
        scenes = fs.fetch_hls_ndvi(poly, a.start, a.end, cache_dir=HERE / "cache", name=a.name)
        monthly = fs.monthly_ndvi(scenes)
        notes["hls"] = f"{len(scenes)} clear scenes {a.start} to {a.end}, {time.time() - t0:.0f} s"
        print("green cover:", notes["hls"])
        print(monthly.round(2).to_string())

    if not a.skip_elevation:
        dem = sat.download_elevation(poly, HERE / "cache" / "elevation")
        slope = sat.slope_stats(dem, poly)
        notes["elevation"] = f"from {dem}"
        print("slope:", slope, "|", sat.slope_words(slope))

    out = sat.save_demo_field(a.name, poly, monthly, slope, notes)
    print("saved", out)


if __name__ == "__main__":
    main()
