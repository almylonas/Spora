"""Turns the numeric result into plain words: what has changed, when the soil is unprotected,
warnings and decisions. The app shows these sentences; the numbers stay available behind them."""
from __future__ import annotations

import fieldshift_core as fs

from i18n import cap, crop, month, t
import i18n

PRIORITY_KEYS = {"save_water": "p_save_water", "build_soil": "p_build_soil", "income_forage": "p_income_forage"}


# --------------------------------------------------------------------------
# Small word helpers
# --------------------------------------------------------------------------
def how_often(years: int, of: int = fs.WINDOW_YEARS) -> str:
    share = years / of
    for limit, key in ((0.1, "f_rarely"), (0.2, "f_now_then"), (0.3, "f_one_in_four"), (0.42, "f_one_in_three"),
                       (0.6, "f_every_other"), (0.85, "f_most_years")):
        if share < limit:
            return t(key)
    return t("f_almost_every")


def share_words(pct: float) -> str:
    for limit, key in ((8, "sh_very_little"), (18, "sh_small"), (28, "sh_quarter"), (40, "sh_third"),
                       (60, "sh_half")):
        if pct < limit:
            return t(key)
    return t("sh_most")


def cover_words(months: float) -> str:
    for limit, key in ((11, "cv_almost_all"), (9, "cv_most"), (7, "cv_two_thirds"), (5, "cv_half")):
        if months >= limit:
            return t(key)
    return t("cv_less_half")


def month_ranges(cal_months: list[int]) -> str:
    """[8,9,10,3,4] -> 'March to April and August to October' (in the request language)."""
    and_, to, all_year = i18n.RANGE_WORDS[i18n.lang()]
    ms = sorted(set(cal_months))
    if not ms:
        return ""
    if len(ms) == 12:
        return all_year
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
            return month(r[0])
        if len(r) == 2:
            return f"{month(r[0])}{and_}{month(r[1])}"
        return f"{month(r[0])}{to}{month(r[-1])}"

    parts = [fmt(r) for r in sorted(runs, key=lambda r: r[0])]
    return parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + and_ + parts[-1]


def crop_label(name: str) -> str:
    return cap(crop(name))


# --------------------------------------------------------------------------
# Slide 1: the field
# --------------------------------------------------------------------------
WEATHER_TOPICS = [   # (result key, label key, up, much up, down, much down, same)
    ("warm_days_per_year", "w_warm", "t_more", "t_much_more", "t_less", "t_much_less", "t_same"),
    ("hot_days_per_year", "w_hot", "t_more", "t_much_more", "t_less", "t_much_less", "t_same"),
    ("frost_days_per_year", "w_frost", "t_more", "t_much_more", "t_less", "t_much_less", "t_same"),
    ("heavy_rain_days_per_year", "w_heavy", "t_more", "t_much_more", "t_less", "t_much_less", "t_same"),
    ("dry_spells_per_year", "w_dry", "t_more", "t_much_more", "t_less", "t_much_less", "t_same"),
    ("rain_mm_per_year", "w_rain", "t_higher", "t_higher", "t_lower", "t_lower", "t_same_amount"),
]


def weather_lines(weather: dict) -> list[dict]:
    out = []
    for key, label_key, up, much_up, down, much_down, same in WEATHER_TOPICS:
        if key not in weather:
            continue
        then, now = weather[key]["then"], weather[key]["now"]
        diff = now - then
        rel = diff / then if then else (1.0 if diff > 0 else 0.0)
        small_counts = key != "rain_mm_per_year" and abs(diff) < 1
        label = t(label_key)
        if small_counts or abs(rel) < 0.1:
            trend, text = "same", t(same)
        else:
            trend = "up" if diff > 0 else "down"
            strong = abs(rel) >= 0.5 and (then >= 3 or key == "rain_mm_per_year")
            text = t((much_up if strong else up) if diff > 0 else (much_down if strong else down))
        out.append({"topic": key, "trend": trend, "text": t("weather_line", label=label, text=text)})
    return out


def water_line(extra_mm: float, irrigated: bool) -> str:
    s = t("water_ok") if extra_mm < 50 else t("water_some") if extra_mm < 150 else t("water_often")
    if irrigated and extra_mm >= 50:
        s += t("water_irrigate")
    return s


# --------------------------------------------------------------------------
# Slide 2: rotations
# --------------------------------------------------------------------------
def warning_lines(entry: dict, crop_months: dict[str, list[int]]) -> list[str]:
    out = []
    for x in entry.get("warning_details", []):
        freq = how_often(x["years"])
        if x["flag"] == "heavy_rain_on_open_soil":
            out.append(t("warn_heavy", freq=freq, tail=t("tail_default")))
            continue
        c = crop_label(x["crop"])
        months_ = month_ranges(crop_months.get(x["crop"], []))
        when = t("in_when", when=months_) if months_ else ""
        if x["flag"] == "heat":
            out.append(t("warn_heat", crop=c, when=when, freq=freq))
        elif x["flag"] == "late_frost":
            out.append(t("warn_frost", crop=c, freq=freq))
        elif x["flag"] == "dry_spell":
            out.append(t("warn_dry", crop=c, when=when, freq=freq))
    out = list(dict.fromkeys(out))   # a crop grown twice gives the same sentence twice
    return out


def compare_lines(cur: dict, alt: dict) -> tuple[list[str], list[str]]:
    """(what gets better, what gets worse) compared with the current rotation."""
    out, worse = [], []
    d1 = alt["months_covered_per_year"] - cur["months_covered_per_year"]
    if d1 >= 1.5:
        out.append(t("b_cover_much"))
    elif d1 >= 0.5:
        out.append(t("b_cover"))
    elif d1 <= -0.5:
        worse.append(t("w_cover_worse"))
    c2, a2 = cur["rain_on_open_soil_pct"], alt["rain_on_open_soil_pct"]
    if a2 <= c2 * 0.6:
        out.append(t("b_rain_much"))
    elif a2 < c2 * 0.9:
        out.append(t("b_rain"))
    elif a2 > c2 * 1.1:
        worse.append(t("w_rain_worse"))
    c3, a3 = cur["extra_water_mm_per_year"], alt["extra_water_mm_per_year"]
    if c3 >= 30 and a3 <= c3 * 0.7:
        out.append(t("b_water_much"))
    elif c3 >= 30 and a3 < c3 * 0.9:
        out.append(t("b_water"))
    elif a3 > c3 * 1.1 and a3 - c3 >= 20:
        worse.append(t("w_water_worse"))
    if alt["flags"]["adds_nitrogen"] and not cur["flags"]["adds_nitrogen"]:
        out.append(t("b_nitrogen"))
    if alt["flags"]["breaks_pest_cycles"] and not cur["flags"]["breaks_pest_cycles"]:
        out.append(t("b_pests"))
    nw_cur = {(x["flag"], x["crop"]) for x in cur.get("warning_details", [])}
    nw_alt = {(x["flag"], x["crop"]) for x in alt.get("warning_details", [])}
    if len(nw_alt) < len(nw_cur):
        out.append(t("b_fewer_warn"))
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
            text = t("na_fits")
        elif "cover crop" in reason:
            text = t("na_cover")
        elif "lower-water crop" in reason:
            text = t("na_water")
        else:
            text = t("na_other")
        return {"id": rid, "available": False, "decision": None, "reason": text}

    warnings = warning_lines(entry, _crop_months(entry))
    if rid == "current":
        decision = t("keep")
        changes, better = [], []
        advisor = [t("q_risks_seen")]
    elif rid == "soil_building":
        cover = [c for c in entry["crops"] if c.get("cover_crop")][0]
        name = crop(cover["crop"])
        name_obj = crop(cover["crop"], accusative=True)
        before = t("before_next", next=crop(cover_next)) if cover_next else ""
        decision = t("sow_cover", cover=name_obj, m1=month(cover["sow_month"], True),
                     m2=month(cover["harvest_month"], True), before=before)
        changes = [cap(t("add_cover", cover=name_obj))]
        better, worse = compare_lines(cur, entry)
        warnings = worse + warnings
        warnings.append(t("cover_cost"))
        advisor = [t("q_cover_suits", c=name), t("q_cover_mix"), t("q_cover_subsidy")]
        if cover.get("legume"):
            advisor.append(t("q_legume_rules"))
        if cover.get("family") == "brassicaceae" and cover_next == "sugar beet":
            advisor.append(t("q_nematode"))
    else:
        new = crop(info.get("chosen", ""), accusative=True)
        old = crop(info.get("replaced", ""), accusative=True)
        decision = t("grow_instead", new=new, old=old)
        changes = [cap(t("replace", old=old, new=new))]
        better, worse = compare_lines(cur, entry)
        warnings = worse + warnings
        warnings.append(t("market", new=new))
        advisor = [t("q_buyer", c=new), t("q_machinery"), t("q_variety", c=crop(info.get("chosen", "")))]
    return {"id": rid, "available": True, "decision": decision, "changes": changes,
            "better": better, "warnings": warnings, "ask_advisor": advisor}


def summary(rotations_text: list[dict], ranking: list[str], priority: str, names: dict[str, str]) -> str:
    if not ranking:
        return t("sum_none")
    best = ranking[0]
    prio = t(PRIORITY_KEYS[priority])
    if best == "current":
        return t("sum_current", prio=prio)
    d = next(r for r in rotations_text if r["id"] == best)["decision"]
    if i18n.lang() == "en":
        d = d[0].lower() + d[1:]
    return t("sum_best", prio=prio, name=t("n_" + best), decision=d)


# --------------------------------------------------------------------------
# Field health (pests, diseases, nutrients, soil): rules in health.py
# --------------------------------------------------------------------------
def _times(n: int) -> str:
    return t("times_1") if n == 1 else t("times_2") if n == 2 else t("times_n", n=n)


def add_health(result: dict, rtexts: list[dict]) -> list[str]:
    """Adds pest, disease and soil lines to each option; returns the lines for the field page."""
    import health as hl
    h = result.get("field_health") or hl.defaults(None)
    probs = hl.problems(h)
    nutrients = set(h["nutrients"])
    texture = h["soil_texture"]
    entries = {e["id"]: e for e in result["rotations"]}
    cur = entries["current"]
    cur_rep = cur.get("health", {}).get("cereal_repeats", 0)

    for r in rtexts:
        if not r.get("available"):
            continue
        e = entries[r["id"]]
        crops = e["crops"]
        hs = e.get("health", {})
        cereals = hl.has_cereal(crops)
        names = {c["crop"] for c in crops}
        legs = hl.legumes(crops)
        warn, better, ask = [], [], []
        if r["id"] in result.get("ranking_demoted", []):
            warn.append(t("hw_demoted"))
        if hs.get("cereal_repeats"):
            warn.append(t("hw_repeat", times=_times(hs["cereal_repeats"])) + (t("hw_repeat_issue") if probs else ""))
        if hs.get("green_bridge"):
            warn.append(t("hw_bridge", cover=cap(crop(hs["green_bridge"]))))
        if texture == "clay" and cereals:
            warn.append(t("hw_clay"))
        if "high_n" in nutrients and cereals:
            warn.append(t("hw_high_n"))
        if r["id"] != "current":
            if hs.get("cereal_repeats", 0) < cur_rep:
                better.append(t("hb_fewer_repeats"))
            if r["id"] == "soil_building" and "poaceae" in (e.get("generation", {}).get("avoided_families") or []):
                better.append(t("hb_no_grass"))
            new_legume = any(c.get("legume") for c in crops if c["crop"] not in {x["crop"] for x in cur["crops"]})
            if "low_n" in nutrients and new_legume:
                better.append(t("hb_legume_n"))
            if nutrients & {"low_p", "low_k"} and new_legume:
                better.append(t("hb_legume_pk"))
            if texture == "sandy" and r["id"] == "soil_building":
                better.append(t("hb_sandy_cover"))
            cover = next((c for c in crops if c.get("cover_crop")), None)
            if r["id"] == "soil_building" and cover and "low_n" in nutrients and not cover.get("legume"):
                ask.append(t("hq_legume_instead"))
            if "high_n" in nutrients and new_legume:
                ask.append(t("hq_cut_n"))
        if "fungal" in probs and legs:
            ask.append(t("hq_legume_fungal"))
        if "fungal" in probs and cereals:
            ask.append(t("hq_seed"))
        if "viral" in probs and any(c["family"] == hl.CEREAL and not c["cover_crop"] and c["sow_month"] in (9, 10, 11)
                                    for c in crops):
            ask.append(t("hq_late_sowing"))
        if texture == "clay" and names & {"winter wheat", "durum wheat", "winter barley", "spring barley"}:
            ask.append(t("hq_mosaic"))
        if nutrients & {"low_p", "low_k"}:
            ask.append(t("hq_test_pk"))
        r["warnings"] = warn + r.get("warnings", [])
        r["better"] = r.get("better", []) + [b for b in better if b not in r.get("better", [])]
        r["ask_advisor"] = r.get("ask_advisor", []) + ask

    # The field page
    lines = []
    if probs:
        lines.append(t("fh_reported", list=", ".join(t("fh_" + k) for k in ("fungal", "viral", "pests") if k in probs)))
        lines.append(t("fh_effect"))
    elif "none" in h["issues"]:
        lines.append(t("fh_none"))
    else:
        lines.append(t("fh_unknown"))
    if cur_rep:
        lines.append(t("hw_repeat", times=_times(cur_rep)) + (t("hw_repeat_issue") if probs else ""))
    if texture == "sandy":
        lines.append(t("fh_sandy"))
    if texture == "clay" and hl.has_cereal(cur["crops"]):
        lines.append(t("hw_clay"))
    sure = h["soil_source"] == "analysis"
    ph = t("fh_ph", ph=f"{h['ph']:.1f}".replace(".", "," if i18n.lang() == "de" else ".")) if h["ph"] is not None else ""
    if hl.acidic(h):
        lines.append(t("fh_acid_sure" if sure else "fh_acid", ph=ph))
    if hl.chalky(h):
        lines.append(t("fh_chalky_sure" if sure else "fh_chalky", ph=ph))
    if texture != "unknown" or h["soil_look"] != "unknown" or h["ph"] is not None:
        lines.append(t("fh_from_analysis" if sure else "fh_from_experience"))
    return lines


def build(result: dict, info_by_id: dict, irrigated: bool, cover_next: str | None) -> dict:
    rotations = result["rotations"]
    cur = rotations[0]
    names = {r["id"]: r["name"] for r in rotations}
    rtexts = [rotation_text(r, cur, info_by_id.get(r["id"], {}), irrigated, cover_next) for r in rotations]
    health_box = add_health(result, rtexts)
    open_months = result["unprotected_months"]
    source_green = result["field"]["green_cover_source"]
    # Warnings that appear on every available rotation are shown once, above the cards
    avail = [r for r in rtexts if r.get("available")]
    shared = [w for w in (avail[0]["warnings"] if avail else []) if all(w in r["warnings"] for r in avail)] if len(avail) > 1 else []
    for r in avail:
        r["warnings"] = [w for w in r["warnings"] if w not in shared]
    # Advisor questions about the field itself (asked on every card) move to the field page
    shared_ask = ([q for q in avail[0]["ask_advisor"] if all(q in r["ask_advisor"] for r in avail)]
                  if len(avail) > 1 else [])
    for r in avail:
        r["ask_advisor"] = [q for q in r["ask_advisor"] if q not in shared_ask]
    return {
        "shared_warnings": shared,
        "weather": weather_lines(result["weather"]),
        "weather_period": t("period", then=i18n.localise_period(result['weather']['period_then']),
                            now=i18n.localise_period(result['weather']['period_now'])),
        "soil": {
            "open_months": open_months,
            "text": (t("soil_bare", ranges=month_ranges(open_months)) if open_months else t("soil_all_covered")),
            "covered": t("soil_covered", cover=cover_words(cur['months_covered_per_year'])),
            "rain": t("soil_rain", share=share_words(cur['rain_on_open_soil_pct'])),
        },
        "water": water_line(cur["extra_water_mm_per_year"], irrigated),
        "sources": [
            t("src_weather"),
            t("src_bare_sat") if source_green == "satellite" else t("src_bare_farmer"),
            t("src_health"),
        ],
        "rotations": rtexts,
        "health": {"lines": health_box, "ask": shared_ask},
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
            agree = t("sat_match")
        elif agreement >= 0.65:
            agree = t("sat_mostly")
        else:
            agree = t("sat_differ")
        notes = []
        if blind:
            notes.append(t("sat_clouds", ranges=month_ranges(blind)))
        if len(outside_years) == 1:
            notes.append(t("sat_out_one", y=outside_years[0]))
        elif outside_years:
            notes.append(t("sat_out_many", ys=", ".join(map(str, outside_years[:-1])), y=outside_years[-1]))
        words["satellite"] = {"agreement": agree, "blind": " ".join(notes) or None}
        words["sources"][1] = t("src_bare_checked")
    words["soil"]["slope"] = sat.slope_words(slope)
    if slope:
        words["sources"].append(t("src_slope"))
        flat = slope["mean_pct"] < 2 and slope["share_steep"] < 0.05
        steep = slope["share_steep"] >= 0.3

        default_tail = t("tail_default")

        def adjust(w: str) -> str:
            if default_tail not in w:
                return w
            if flat:
                return w.replace(default_tail, t("tail_flat"))
            if steep:
                return w.replace(default_tail, t("tail_steep"))
            return w

        words["shared_warnings"] = [adjust(w) for w in words["shared_warnings"]]
        for r in words["rotations"]:
            if r.get("warnings"):
                r["warnings"] = [adjust(w) for w in r["warnings"]]
