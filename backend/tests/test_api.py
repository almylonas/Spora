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

    # Field health: unit rules, then a full request in German with pests and diseases reported
    import health as hl
    wheat = {"crop": "winter wheat", "family": "poaceae", "cover_crop": False, "cycle_start": 0, "cycle_end": 9}
    barley = {"crop": "winter barley", "family": "poaceae", "cover_crop": False, "cycle_start": 20, "cycle_end": 30}
    beet = {"crop": "sugar beet", "family": "amaranthaceae", "cover_crop": False, "cycle_start": 15, "cycle_end": 18}
    rye = {"crop": "winter rye", "family": "poaceae", "cover_crop": True, "cycle_start": 10, "cycle_end": 14}
    assert hl.cereal_repeats([wheat, barley]) == 2          # wheat -> barley -> (back to) wheat
    assert hl.cereal_repeats([wheat, beet, barley]) == 1    # beet -> barley -> wheat
    assert hl.green_bridge([wheat, rye, barley], 36) == "winter rye"
    ranking, demoted = hl.adjust_ranking(
        ["soil_building", "current"],
        [{"id": "current", "health": {"cereal_repeats": 1, "green_bridge": None}},
         {"id": "soil_building", "health": {"cereal_repeats": 1, "green_bridge": "winter rye"}}],
        hl.defaults({"issues": ["fungal"]}))
    assert ranking == ["current", "soil_building"] and demoted == ["soil_building"]
    d = c.post("/api/analyse", json={"field": FIELD, "crops": CROPS, "priority": "build_soil", "lang": "de",
                                     "health": {"issues": ["fungal", "pests"], "nutrients": ["low_n"],
                                                "soil_texture": "clay", "ph": 5.2, "soil_source": "analysis"}}).json()
    lines = d["words"]["health"]["lines"]
    assert lines[0].startswith("Sie haben angegeben") and any("pH 5,2" in x for x in lines), lines
    sb = next(r for r in d["result"]["rotations"] if r["id"] == "soil_building")
    if sb.get("crops"):
        assert not any(c["cover_crop"] and c["family"] == "poaceae" for c in sb["crops"]), "no cereal cover with diseases"

    # Land check: an outline in the North Sea is refused, in the chosen language
    sea = {"type": "Polygon", "coordinates": [[[7.0, 54.0], [7.006, 54.0], [7.006, 54.004], [7.0, 54.004], [7.0, 54.0]]]}
    r = c.post("/api/check_field", json={"field": sea, "lang": "de"})
    assert r.status_code == 422 and "Meer" in r.json()["detail"], r.json()
    assert c.post("/api/analyse", json={"field": sea, "crops": CROPS}).status_code == 422

    # Input checks
    tiny = {"type": "Polygon", "coordinates": [[[6.355, 50.92], [6.3551, 50.92], [6.3551, 50.9201], [6.355, 50.92]]]}
    assert c.post("/api/analyse", json={"field": tiny, "crops": CROPS}).status_code == 422
    print("all API tests passed")


if __name__ == "__main__":
    run()
