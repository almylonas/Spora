"""Field health: pests, diseases, nutrients and soil, from the farmer's answers.

Rules follow the agronomy text the team's agronomist supplied ("General Description of Winter Cereals",
sections 2.4.1 Crop rotation and 2.5 Pests and diseases), plus a few general rules marked as such:

- A cereal after a cereal is not a true rotation: same nutrient needs, same roots, almost the same pests and
  diseases, and shed grain comes up in the next crop (2.4.1).
- Legumes reduce pests, diseases and weeds, add nitrogen and make P, K and S easier to take up, but are
  themselves prone to fungal diseases (2.4.1). Oilseeds (rapeseed, sunflower, flax, safflower) are good breaks (2.4.1).
- Cereal ground beetle: worse on heavy clay soils and with grass weeds (2.5.1). Cereal leaf beetle and powdery
  mildew: favoured by heavy nitrogen (2.5.1, 2.5.2). Root and stem rots: wet soil and long winters (2.5.2).
- Soil-borne mosaic viruses (WSBMV, BaYMV): humid areas with heavy, water-retentive soil; resistant varieties
  are the main control (2.5.2). Barley yellow dwarf virus: aphids; sow winter cereals later in autumn, after the
  aphid flight (2.5.2). Bunts and smuts: certified, treated seed and resistant varieties (2.5.2).
- General agronomy (not from the text): a cereal cover crop between cereals keeps their pests and diseases
  going ("green bridge"); sandy soil holds little water and loses nitrogen; acidic soil hurts sugar beet,
  barley, rapeseed and clover; chalky soil locks up phosphorus.
"""
from __future__ import annotations

CEREAL = "poaceae"
BREAK_FAMILIES = {"fabaceae", "brassicaceae", "asteraceae"}       # legumes and oilseeds
ACID_SENSITIVE = {"sugar beet", "winter barley", "spring barley", "winter rapeseed", "crimson clover",
                  "faba bean", "field pea", "faba bean (winter-sown)", "field pea (winter-sown)"}
PROBLEMS = {"fungal", "viral", "pests"}


def defaults(h: dict | None) -> dict:
    h = dict(h or {})
    h.setdefault("issues", ["unknown"])
    h.setdefault("nutrients", ["unknown"])
    h.setdefault("soil_texture", "unknown")
    h.setdefault("soil_look", "unknown")
    h.setdefault("ph", None)
    h.setdefault("soil_source", "experience")
    return h


def problems(h: dict) -> set[str]:
    return set(h["issues"]) & PROBLEMS


def acidic(h: dict) -> bool:
    return (h["ph"] is not None and h["ph"] < 5.5) or (h["ph"] is None and h["soil_look"] == "dark")


def chalky(h: dict) -> bool:
    return (h["ph"] is not None and h["ph"] > 7.5) or (h["ph"] is None and h["soil_look"] == "light")


# --------------------------------------------------------------------------
# Rotation structure
# --------------------------------------------------------------------------
def _mains(crops: list[dict]) -> list[dict]:
    return sorted([c for c in crops if not c["cover_crop"]], key=lambda c: c["cycle_start"])


def cereal_repeats(crops: list[dict]) -> int:
    """How many times per cycle a cereal main crop directly follows a cereal main crop (cyclic)."""
    mains = _mains(crops)
    if not mains:
        return 0
    if len(mains) == 1:
        return 1 if mains[0]["family"] == CEREAL else 0          # the same cereal every year
    return sum(1 for i, c in enumerate(mains) if c["family"] == CEREAL and mains[i - 1]["family"] == CEREAL)


def green_bridge(crops: list[dict], T: int) -> str | None:
    """Name of a cereal cover crop that is followed by a cereal main crop, if any."""
    mains = _mains(crops)
    for c in crops:
        if c["cover_crop"] and c["family"] == CEREAL and mains:
            nxt = min(mains, key=lambda m: (m["cycle_start"] - c["cycle_end"] - 1) % T)
            if nxt["family"] == CEREAL:
                return c["crop"]
    return None


def has_cereal(crops: list[dict]) -> bool:
    return any(c["family"] == CEREAL and not c["cover_crop"] for c in crops)


def legumes(crops: list[dict]) -> list[dict]:
    return [c for c in crops if c.get("legume")]


def summary(entry: dict) -> dict:
    """Numbers added to each rotation entry."""
    crops = entry.get("crops") or []
    return {"cereal_repeats": cereal_repeats(crops),
            "green_bridge": green_bridge(crops, entry.get("cycle_months", 12)),
            "break_crops": sum(1 for c in _mains(crops) if c["family"] in BREAK_FAMILIES)}


# --------------------------------------------------------------------------
# Effects on how alternatives are built and ranked
# --------------------------------------------------------------------------
def avoid_cover_families(h: dict, crops_have_cereal: bool) -> set[str]:
    """With past pests or diseases, no cereal cover crop between cereals (it would bridge them)."""
    return {CEREAL} if problems(h) and crops_have_cereal else set()


def adjust_ranking(ranking: list[str], entries: list[dict], h: dict) -> tuple[list[str], list[str]]:
    """With past pests or diseases, an option with more cereals in a row than today, or with a cereal
    cover crop between cereals, cannot come first. Returns (new ranking, ids moved down)."""
    if not problems(h):
        return ranking, []
    by_id = {e["id"]: e for e in entries}
    cur = by_id["current"]["health"]["cereal_repeats"]
    worse = [i for i in ranking if i != "current" and
             (by_id[i]["health"]["cereal_repeats"] > cur or by_id[i]["health"]["green_bridge"])]
    return [i for i in ranking if i not in worse] + worse, worse
