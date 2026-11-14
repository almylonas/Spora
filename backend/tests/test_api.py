"""Offline tests for the web API, including a stand-in demo field (no network, no Earthdata).
Run from backend/:  python tests/test_api.py"""
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from fastapi.testclient import TestClient  # noqa: E402
import api  # noqa: E402
import satellite as sat  # noqa: E402

FIELD = {"type": "Polygon", "coordinates": [[[6.355, 50.92], [6.362, 50.92], [6.362, 50.925], [6.355, 50.925], [6.355, 50.92]]]}
CROPS = [{"crop": "winter wheat", "sow_month": 11, "harvest_month": 8},
         {"crop": "winter barley", "sow_month": 9, "harvest_month": 7},
         {"crop": "sugar beet", "sow_month": 4, "harvest_month": 10}]


def run():
    c = TestClient(api.app)
    assert any(x["crop"] == "sugar beet" for x in c.get("/api/crops").json())

    # Without a demo field: crop months only
    d = c.post("/api/analyse", json={"field": FIELD, "crops": CROPS, "priority": "build_soil"}).json()
    assert d["result"]["field"]["green_cover_source"] == "farmer" and d["words"]["satellite"] is None
    assert len(d["result"]["rotations"]) == 3 and d["words"]["summary"]

    # With the stand-in demo field: satellite cover, slope, alignment to the satellite years
    fixture = HERE / "demo_field_fixture.json"
    target = sat.DEMO_DIR / "zz_test_fixture.json"
    shutil.copy(fixture, target)
    try:
        d = c.post("/api/analyse", json={"field": FIELD, "crops": CROPS, "priority": "build_soil"}).json()
    finally:
        target.unlink()
    r, w = d["result"], d["words"]
    assert r["field"]["green_cover_source"] == "satellite"
    assert r["field"]["slope"]["mean_pct"] == 4.0 and w["soil"]["slope"]
    tl = r["rotations"][0]["timeline"]
    assert tl[3]["crop"] == "sugar beet", "rotation should be aligned so beet falls in the first satellite year"
    assert any(t.get("seen_from_space") == "no_image" for t in tl)
    differs = [t for t in tl if t.get("seen_from_space") not in (None, "no_image")
               and (t["seen_from_space"] == "bare") != t["crop_months_say_bare"]]
    assert len(differs) == 1, differs   # the weedy September in the fixture

    # Input checks
    tiny = {"type": "Polygon", "coordinates": [[[6.355, 50.92], [6.3551, 50.92], [6.3551, 50.9201], [6.355, 50.92]]]}
    assert c.post("/api/analyse", json={"field": tiny, "crops": CROPS}).status_code == 422
    print("all API tests passed")


if __name__ == "__main__":
    run()
