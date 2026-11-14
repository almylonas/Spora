"""Turns the numeric result into plain words: what has changed, when the soil is unprotected,
warnings and decisions. The app shows these sentences; the numbers stay available behind them."""
from __future__ import annotations

import fieldshift_core as fs

MONTHS = fs.MONTH_NAMES
MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]
PRIORITY_WORDS = {"save_water": "saving water", "build_soil": "building healthier soil",
                  "income_forage": "earning more or feeding animals"}


# --------------------------------------------------------------------------
# Small word helpers
# --------------------------------------------------------------------------
def how_often(years: int, of: int = fs.WINDOW_YEARS) -> str:
    share = years / of
    if share < 0.1:
        return "rarely"
    if share < 0.2:
        return "now and then"
    if share < 0.3:
        return "about one year in four"
    if share < 0.42:
        return "about one year in three"
    if share < 0.6:
        return "about every other year"
    if share < 0.85:
        return "in most years"
    return "almost every year"


def share_words(pct: float) -> str:
    if pct < 8:
        return "very little"
    if pct < 18:
        return "a small part"
    if pct < 28:
        return "about a quarter"
    if pct < 40:
        return "about a third"
    if pct < 60:
        return "about half"
    return "most"


def cover_words(months: float) -> str:
    if months >= 11:
        return "almost all year"
    if months >= 9:
        return "most of the year"
    if months >= 7:
        return "about two thirds of the year"
    if months >= 5:
        return "about half the year"
    return "less than half the year"


def month_ranges(cal_months: list[int]) -> str:
    """[8,9,10,3,4] -> 'March to April and August to October'."""
    ms = sorted(set(cal_months))
    if not ms:
        return ""
    if len(ms) == 12:
        return "all year"
    # build cyclic runs
    runs, run = [], [ms[0]]
    for m in ms[1:]:
        if m == run[-1] + 1:
            run.append(m)
        else:
            runs.append(run)
            run = [m]
    runs.append(run)
    if len(runs) > 1 and runs[0][0] == 1 and runs[-1][-1] == 12:   # join Dec-Jan
        runs[0] = runs.pop() + runs[0]

    def fmt(r):
        if len(r) == 1:
            return MONTHS_LONG[r[0] - 1]
        if len(r) == 2:
            return f"{MONTHS_LONG[r[0] - 1]} and {MONTHS_LONG[r[1] - 1]}"
        return f"{MONTHS_LONG[r[0] - 1]} to {MONTHS_LONG[r[-1] - 1]}"

    parts = [fmt(r) for r in sorted(runs, key=lambda r: r[0])]
    return parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " and " + parts[-1]


def crop_label(name: str) -> str:
    return name[0].upper() + name[1:]


# --------------------------------------------------------------------------
# Slide 1: the field
# --------------------------------------------------------------------------
WEATHER_TOPICS = [
    ("warm_days_per_year", "Warm days (25 °C and above)", "more common", "less common", "about as common as before"),
    ("hot_days_per_year", "Hot days (30 °C and above)", "more common", "less common", "about as common as before"),
    ("frost_days_per_year", "Frost days", "more common", "less common", "about as common as before"),
    ("heavy_rain_days_per_year", "Heavy downpours", "more common", "less common", "about as common as before"),
    ("dry_spells_per_year", "Dry spells in the growing season", "more common", "less common", "about as common as before"),
    ("rain_mm_per_year", "Yearly rain", "higher", "lower", "about the same as before"),
]


def weather_lines(weather: dict) -> list[dict]:
    out = []
    for key, label, up, down, same in WEATHER_TOPICS:
        if key not in weather:
            continue
        then, now = weather[key]["then"], weather[key]["now"]
        diff = now - then
        rel = diff / then if then else (1.0 if diff > 0 else 0.0)
        small_counts = key != "rain_mm_per_year" and abs(diff) < 1
        if small_counts or abs(rel) < 0.1:
            trend, text = "same", same
        else:
            trend = "up" if diff > 0 else "down"
            word = up if diff > 0 else down
            strong = abs(rel) >= 0.5 and (then >= 3 or key == "rain_mm_per_year")
            text = ("much " + word) if strong and word.endswith("common") else word
        out.append({"topic": label, "trend": trend, "text": f"{label}: {text}."})
    return out


def water_line(extra_mm: float, irrigated: bool) -> str:
    if extra_mm < 50:
        s = "Rain covers what your crops need in most years."
    elif extra_mm < 150:
        s = "In summer your crops sometimes need more water than the rain gives."
    else:
        s = "In summer your crops regularly need more water than the rain gives."
    if irrigated and extra_mm >= 50:
        s += " You can irrigate, so this mainly affects your water use and costs."
    return s


# --------------------------------------------------------------------------
# Slide 2: rotations
# --------------------------------------------------------------------------
def warning_lines(entry: dict, crop_months: dict[str, list[int]]) -> list[str]:
    out = []
    for x in entry.get("warning_details", []):
        freq = how_often(x["years"])
        if x["flag"] == "heavy_rain_on_open_soil":
            out.append(f"Heavy rain falls on bare soil {freq}, which can wash soil away.")
            continue
        c = crop_label(x["crop"])
        when = month_ranges(crop_months.get(x["crop"], []))
        if x["flag"] == "heat":
            out.append(f"{c}: heat stress {('in ' + when) if when else ''} {freq}.".replace("  ", " "))
        elif x["flag"] == "late_frost":
            out.append(f"{c}: damaging frost after sowing {freq}.")
        elif x["flag"] == "dry_spell":
            out.append(f"{c}: two weeks or more without rain {('in ' + when) if when else ''} {freq}.".replace("  ", " "))
    return out


def compare_lines(cur: dict, alt: dict) -> tuple[list[str], list[str]]:
    """(what gets better, what gets worse) compared with the current rotation."""
    out, worse = [], []
    d1 = alt["months_covered_per_year"] - cur["months_covered_per_year"]
    if d1 >= 1.5:
        out.append("Your soil is protected for much longer each year.")
    elif d1 >= 0.5:
        out.append("Your soil is protected a little longer each year.")
    elif d1 <= -0.5:
        worse.append("Trade-off: your soil is bare for longer each year.")
    c2, a2 = cur["rain_on_open_soil_pct"], alt["rain_on_open_soil_pct"]
    if a2 <= c2 * 0.6:
        out.append("Much less rain falls on bare soil, so less soil is washed away.")
    elif a2 < c2 * 0.9:
        out.append("Less rain falls on bare soil.")
    elif a2 > c2 * 1.1:
        worse.append("Trade-off: more rain falls on bare soil.")
    c3, a3 = cur["extra_water_mm_per_year"], alt["extra_water_mm_per_year"]
    if c3 >= 30 and a3 <= c3 * 0.7:
        out.append("Your crops need much less extra water.")
    elif c3 >= 30 and a3 < c3 * 0.9:
        out.append("Your crops need a little less extra water.")
    elif a3 > c3 * 1.1 and a3 - c3 >= 20:
        worse.append("Trade-off: your crops need more extra water.")
    if alt["flags"]["adds_nitrogen"] and not cur["flags"]["adds_nitrogen"]:
        out.append("A legume adds nitrogen, so the next crop needs less fertiliser.")
    if alt["flags"]["breaks_pest_cycles"] and not cur["flags"]["breaks_pest_cycles"]:
        out.append("Crop families alternate, which helps break pest and disease cycles.")
    nw_cur = {(x["flag"], x["crop"]) for x in cur.get("warning_details", [])}
    nw_alt = {(x["flag"], x["crop"]) for x in alt.get("warning_details", [])}
    if len(nw_alt) < len(nw_cur):
        out.append("Fewer weather warnings than your current rotation.")
    return out, worse


def _crop_months(entry: dict) -> dict[str, list[int]]:
    """Calendar months each crop is in the ground (for warning wording: its sensitive months)."""
    out = {}
    for c in entry.get("crops") or []:
        out[c["crop"]] = c.get("sensitive_months") or []
    return out


def rotation_text(entry: dict, cur: dict, info: dict, irrigated: bool, cover_next: str | None) -> dict:
    rid = entry["id"]
    if not entry.get("crops"):
        reason = entry.get("reason", "")
        if "already fits" in reason:
            text = "Your rotation already fits the rain here, so there is no need to change crops to save water."
        elif "cover crop" in reason:
            text = "No cover crop fits the gap in your rotation: the gap is too short, too cold or too dry."
        elif "lower-water crop" in reason:
            text = "No crop that needs less water fits the same season on this field."
        else:
            text = reason[0].upper() + reason[1:] + "." if reason else "This option is not available for your field."
        return {"id": rid, "available": False, "decision": None, "reason": text}

    warnings = warning_lines(entry, _crop_months(entry))
    advisor = list(entry["card"]["advisor_questions"])
    if rid == "current":
        decision = "Keep your current rotation."
        changes = []
        better = []
    elif rid == "soil_building":
        cover = [c for c in entry["crops"] if c.get("cover_crop")][0]
        name = cover["crop"]
        decision = (f"Sow {name} in {MONTHS_LONG[cover['sow_month'] - 1]} and end it in "
                    f"{MONTHS_LONG[cover['harvest_month'] - 1]}"
                    + (f", before the {cover_next} is sown." if cover_next else "."))
        changes = [f"Add {name} as a cover crop in the gap where your soil is bare."]
        better, worse = compare_lines(cur, entry)
        warnings = worse + warnings
        warnings.append("A cover crop costs seed and work, and uses some water before the next crop.")
        if cover.get("legume"):
            advisor.append("Are legume cover crops allowed on this field under local water-protection rules?")
        if cover.get("family") == "brassicaceae" and cover_next == "sugar beet":
            advisor.append("Before sugar beet, use a nematode-resistant variety. Which one suits this field?")
    else:
        new, old = info.get("chosen"), info.get("replaced")
        decision = f"Grow {new} instead of {old}."
        changes = [f"Replace {old} with {new}, which needs less water in the same season."]
        better, worse = compare_lines(cur, entry)
        warnings = worse + warnings
        warnings.append(f"Market, price and machinery for {new} are not checked.")
    return {"id": rid, "available": True, "decision": decision, "changes": changes,
            "better": better, "warnings": warnings, "ask_advisor": advisor}


def summary(rotations_text: list[dict], ranking: list[str], priority: str, names: dict[str, str]) -> str:
    if not ranking:
        return "No rotation could be compared for this field."
    best = ranking[0]
    t = next(r for r in rotations_text if r["id"] == best)
    if best == "current":
        return (f"For {PRIORITY_WORDS[priority]}, your current rotation is already the best of the three. "
                "Check the warnings below with your advisor.")
    return f"For {PRIORITY_WORDS[priority]}, the best option is the {names[best].lower()}: {t['decision'][0].lower() + t['decision'][1:]}"


def build(result: dict, info_by_id: dict, irrigated: bool, cover_next: str | None) -> dict:
    rotations = result["rotations"]
    cur = rotations[0]
    names = {r["id"]: r["name"] for r in rotations}
    rtexts = [rotation_text(r, cur, info_by_id.get(r["id"], {}), irrigated, cover_next) for r in rotations]
    open_months = result["unprotected_months"]
    source_green = result["field"]["green_cover_source"]
    # Warnings that appear on every available rotation are shown once, above the cards
    avail = [r for r in rtexts if r.get("available")]
    shared = [w for w in (avail[0]["warnings"] if avail else []) if all(w in r["warnings"] for r in avail)] if len(avail) > 1 else []
    for r in avail:
        r["warnings"] = [w for w in r["warnings"] if w not in shared]
    return {
        "shared_warnings": shared,
        "weather": weather_lines(result["weather"]),
        "weather_period": f"{result['weather']['period_then']} compared with {result['weather']['period_now']}",
        "soil": {
            "open_months": open_months,
            "text": (f"In your rotation the soil is bare in {month_ranges(open_months)} in at least one year."
                     if open_months else "Your soil is covered all year."),
            "covered": f"Something is growing on your field {cover_words(cur['months_covered_per_year'])}.",
            "rain": f"{share_words(cur['rain_on_open_soil_pct']).capitalize()} of the year's rain falls while the soil is bare.",
        },
        "water": water_line(cur["extra_water_mm_per_year"], irrigated),
        "sources": [
            "Weather: NASA POWER, for your wider area (about 50 km).",
            "Bare months: " + ("satellite images of your field (Landsat and Sentinel-2)." if source_green == "satellite"
                               else "the sowing and harvest months you entered."),
        ],
        "rotations": rtexts,
        "summary": summary(rtexts, result["ranking"], result["priority"], names),
    }


# --------------------------------------------------------------------------
# Satellite and slope (demo fields only)
# --------------------------------------------------------------------------
def add_satellite_and_slope(words: dict, seen: list[str] | None, rot, agreement: float | None,
                            slope: dict | None, in_record: list[bool] | None = None) -> None:
    """in_record[m]: cycle month m falls inside the satellite record (months outside it are not 'cloudy')."""
    import satellite as sat

    words["satellite"] = None
    if seen:
        inside = in_record or [True] * len(seen)
        blind = sorted({rot.calendar_month(m) for m, s in enumerate(seen) if s == "no_image" and inside[m]})
        outside_years = sorted({m // 12 + 1 for m in range(len(seen)) if not inside[m]})
        if agreement is None:
            agree = ""
        elif agreement >= 0.85:
            agree = "Satellite images of your field match the crop months you entered."
        elif agreement >= 0.65:
            agree = "Satellite images mostly match the crop months you entered; the months that differ are marked."
        else:
            agree = ("Satellite images often differ from the crop months you entered. Check the months marked, "
                     "or whether the crops are in the right order.")
        words["satellite"] = {
            "agreement": agree,
            "blind": " ".join(x for x in [
                (f"Clouds hid your field in {month_ranges(blind)} in some years; those months use the crop months you entered."
                 if blind else ""),
                ((f"The satellite record does not cover year {outside_years[0]} of your rotation, so that year uses "
                  "the crop months you entered." if len(outside_years) == 1 else
                  f"The satellite record does not cover years {', '.join(map(str, outside_years[:-1]))} and "
                  f"{outside_years[-1]} of your rotation, so those years use the crop months you entered.")
                 if outside_years else ""),
            ] if x) or None,
        }
        words["sources"][1] = "Bare months: satellite images of your field (NASA HLS, Landsat and Sentinel-2), checked with your crop months."
    words["soil"]["slope"] = sat.slope_words(slope)
    if slope:
        words["sources"].append("Slope: NASA elevation data (NASADEM / SRTM, 30 m).")
        flat = slope["mean_pct"] < 2 and slope["share_steep"] < 0.05
        steep = slope["share_steep"] >= 0.3

        def adjust(w: str) -> str:
            if not w.startswith("Heavy rain falls on bare soil"):
                return w
            if flat:
                return w.replace("which can wash soil away", "but your field is flat, so little soil is washed away")
            if steep:
                return w.replace("which can wash soil away", "and much of your field is on a slope, so soil washes away easily")
            return w

        words["shared_warnings"] = [adjust(w) for w in words["shared_warnings"]]
        for r in words["rotations"]:
            if r.get("warnings"):
                r["warnings"] = [adjust(w) for w in r["warnings"]]
