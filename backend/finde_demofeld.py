"""
finde_demofeld.py - findet geeignete Demo-Felder fuer FieldShift (Aufgabe 3).

Sucht in den offenen NRW-Teilschlagdaten nach Feldbloecken (DENWLI...), die
in JEDEM der gewuenschten Jahre genau EINEN Ackerschlag (kein Dauergruenland)
mit mindestens MIN_HA Hektar haben, und listet sie mit ihren Kulturen auf.

Benutzung (Anaconda PowerShell Prompt, Umgebung fieldshift aktiv):

  1) Suchen:
       python finde_demofeld.py
     Optionen:
       --bbox 6.30,50.88,6.45,50.97   Suchgebiet (West,Sued,Ost,Nord)
       --jahre 2023,2024,2025         Jahre, die vorhanden sein muessen
       --min-ha 5                     Mindestflaeche pro Jahr

  2) Umriss eines gefundenen Feldes speichern:
       python finde_demofeld.py --speichern DENWLI0550012345
     -> schreibt juelich_field1.geojson (Umriss aus dem letzten Jahr)
     Andere Ausgabedatei: --datei pfad\\name.geojson

  Falls die Feldnamen nicht erkannt werden:
       python finde_demofeld.py --inspect
     zeigt die Eigenschaften der ersten Flaeche.
"""

import argparse
import json
import re
import sys
import time

import requests

BASE = ("https://ogc-api.nrw.de/inspire-lu-tshist/v1/collections/"
        "existinglanduseobject/items")
CRS84 = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"


# ---------------------------------------------------------------- Download
def lade_alle(bbox, limit=1000):
    """Laedt alle Flaechen im Rechteck, Seite fuer Seite."""
    url = BASE
    params = {"bbox": bbox, "limit": limit, "f": "json", "crs": CRS84}
    features = []
    seite = 0
    while url:
        seite += 1
        for versuch in range(3):
            try:
                r = requests.get(url, params=params, timeout=120,
                                 headers={"Accept": "application/geo+json"})
                r.raise_for_status()
                break
            except requests.RequestException as e:
                if versuch == 2:
                    raise
                print(f"  Seite {seite}: Fehler ({e}), neuer Versuch ...")
                time.sleep(3)
        data = r.json()
        neu = data.get("features", [])
        features.extend(neu)
        print(f"  Seite {seite}: {len(neu)} Flaechen (gesamt {len(features)})")
        url = None
        params = None  # der next-Link enthaelt schon alle Parameter
        for link in data.get("links", []):
            if link.get("rel") == "next":
                url = link.get("href")
                break
        if not neu:
            break
    return features


# ---------------------------------------------- Eigenschaften auswerten
def flach(d, prefix=""):
    """Verschachtelte Eigenschaften zu {'a.b': wert} machen."""
    out = {}
    for k, v in (d or {}).items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flach(v, key + "."))
        elif isinstance(v, list):
            for i, x in enumerate(v):
                if isinstance(x, dict):
                    out.update(flach(x, f"{key}[{i}]."))
                else:
                    out[f"{key}[{i}]"] = x
        else:
            out[key] = v
    return out


def norm(s):
    return (s.lower().replace("ä", "ae").replace("ö", "oe")
            .replace("ü", "ue").replace("ß", "ss"))


def als_zahl(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace(",", "."))
        except ValueError:
            return None
    return None


def als_jahr(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, int) and 2000 <= v <= 2100:
        return v
    if isinstance(v, str):
        m = re.fullmatch(r"\s*(20\d\d)\s*", v)
        if m:
            return int(m.group(1))
    return None


def finde_schluessel(beispiele):
    """Erkennt anhand mehrerer Flaechen, welcher Schluessel was ist."""
    props = [flach(f.get("properties")) for f in beispiele]
    keys = set().union(*[p.keys() for p in props]) if props else set()

    def passend(key, test):
        werte = [p.get(key) for p in props if p.get(key) is not None]
        return werte and sum(1 for w in werte if test(w)) >= 0.8 * len(werte)

    def waehle(kandidaten, bevorzugt):
        for wort in bevorzugt:
            for k in sorted(kandidaten):
                if wort in norm(k):
                    return k
        return sorted(kandidaten)[0] if kandidaten else None

    block = [k for k in keys if passend(
        k, lambda w: isinstance(w, str) and w.upper().startswith("DENWLI"))]
    jahr = [k for k in keys if passend(k, lambda w: als_jahr(w) is not None)]
    flaeche = [k for k in keys
               if any(w in norm(k) for w in ("flaeche", "hektar", "area", "_ha"))
               and passend(k, lambda w: als_zahl(w) is not None)]
    gruen = [k for k in keys if "gruenland" in norm(k) or "grassland" in norm(k)]
    gruen = [k for k in gruen if "nutz" not in norm(k)] or gruen
    # Kultur am Inhalt erkennen: Schluessel, dessen Texte am haeufigsten
    # Kulturnamen enthalten (Weizen, Mais, Rueben, Gruenland ...)
    def kultur_treffer(key):
        n = 0
        for p in props:
            w = p.get(key)
            if isinstance(w, str) and any(c in norm(w) for c in KULTUR_WOERTER):
                n += 1
        return n
    bewertet = sorted(((kultur_treffer(k), k) for k in keys), reverse=True)
    kultur = [k for n, k in bewertet if n > 0 and n >= bewertet[0][0] * 0.8]
    if not kultur:
        kultur = [k for k in keys if "beschreib" in norm(k)
                  or "description" in norm(k) or "nutzart" in norm(k)]

    return {
        "block": waehle(block, ["bezeichnung", "feldblock", "flik"]),
        "jahr": waehle(jahr, ["fach", "jahr", "year", "gueltig"]),
        "flaeche": waehle(flaeche, ["hektar", "_ha", "flaeche", "area"]),
        "gruenland": waehle(gruen, ["dauergruenland"]),
        "kultur": waehle(kultur, ["nutzartbeschreib", "beschreib", "description"]),
    }


KULTUR_WOERTER = ("weizen", "gerste", "roggen", "triticale", "hafer", "mais",
                  "rueben", "ruebe", "kartoffel", "raps", "gruenland", "wiese",
                  "weide", "erbse", "bohne", "gemuese", "brache", "getreide")
GRUEN_WOERTER = ("gruenland", "wiese", "weide", "gras", "brache")


def ist_gruenland(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return norm(v).strip() in ("ja", "true", "1", "yes")
    if isinstance(v, (int, float)):
        return v == 1
    return False


# ------------------------------------------------------------------ Suche
def auswerten(features, k, jahre, min_ha):
    bloecke = {}  # block -> jahr -> [features]
    for f in features:
        p = flach(f.get("properties"))
        b, j = p.get(k["block"]), als_jahr(p.get(k["jahr"]))
        if not b or j is None:
            continue
        bloecke.setdefault(b, {}).setdefault(j, []).append((f, p))

    treffer = []
    for b, nach_jahr in bloecke.items():
        zeile, ok = {}, True
        for j in jahre:
            eintraege = nach_jahr.get(j, [])
            if len(eintraege) != 1:          # fehlt oder Block geteilt
                ok = False
                break
            _, p = eintraege[0]
            ha = als_zahl(p.get(k["flaeche"])) or 0.0
            if k["gruenland"] and ist_gruenland(p.get(k["gruenland"])):
                ok = False
                break
            kultur_txt = norm(str(p.get(k["kultur"], "")))
            if any(w in kultur_txt for w in GRUEN_WOERTER):
                ok = False
                break
            if ha < min_ha:
                ok = False
                break
            zeile[j] = (str(p.get(k["kultur"], "?")), ha)
        if not ok:
            continue
        flaechen = [ha for _, ha in zeile.values()]
        stabil = max(flaechen) / min(flaechen) <= 1.15
        kulturen = " ".join(norm(c) for c, _ in zeile.values())
        story = ("ruebe" in kulturen) and any(
            w in kulturen for w in ("weizen", "gerste", "roggen", "triticale"))
        treffer.append((b, zeile, stabil, story))

    # Beste zuerst: Rueben+Getreide, stabile Flaeche, groesser
    treffer.sort(key=lambda t: (not t[3], not t[2],
                                -min(ha for _, ha in t[1].values())))
    return treffer


def zeige(treffer, jahre):
    if not treffer:
        print("\nKeine passenden Feldbloecke gefunden.")
        print("Tipp: --bbox vergroessern oder --min-ha kleiner setzen (z. B. 3).")
        return
    print(f"\n{len(treffer)} passende Feldbloecke (beste zuerst):\n")
    print("  * = Zuckerruebe + Getreide (beste Geschichte)   "
          "~ = Flaeche schwankt um mehr als 15 %\n")
    for b, zeile, stabil, story in treffer[:30]:
        mark = ("*" if story else " ") + (" " if stabil else "~")
        print(f"{mark} {b}")
        for j in jahre:
            kultur, ha = zeile[j]
            print(f"       {j}: {kultur:<35} {ha:6.2f} ha")
    if len(treffer) > 30:
        print(f"\n... und {len(treffer) - 30} weitere.")
    print("\nUmriss speichern mit:  python finde_demofeld.py --speichern DENWLI...")


def speichern(features, k, block, jahre, datei):
    passend = []
    for f in features:
        p = flach(f.get("properties"))
        if p.get(k["block"]) == block:
            passend.append((als_jahr(p.get(k["jahr"])) or 0, f))
    if not passend:
        sys.exit(f"Feldblock {block} nicht im Suchgebiet gefunden.")
    passend.sort(key=lambda t: t[0])
    letztes_jahr = max(j for j, _ in passend)
    auswahl = [f for j, f in passend if j == letztes_jahr]
    if len(auswahl) > 1:
        print(f"Achtung: {len(auswahl)} Teilschlaege in {letztes_jahr}, "
              "nehme den groessten.")
        auswahl.sort(key=lambda f: -(als_zahl(
            flach(f.get("properties")).get(k["flaeche"])) or 0))
    f = auswahl[0]
    fc = {"type": "FeatureCollection",
          "features": [{"type": "Feature",
                        "properties": {"feldblock": block,
                                       "jahr": letztes_jahr},
                        "geometry": f["geometry"]}]}
    with open(datei, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False, indent=1)
    xy = json.dumps(f["geometry"]["coordinates"])[:80]
    print(f"Gespeichert: {datei}  (Umriss aus {letztes_jahr})")
    print(f"Erste Koordinaten: {xy} ...")
    print("Diese sollten ungefaehr bei 6.3x, 50.9x liegen (Laenge, Breite).")


# ------------------------------------------------------------------- Main
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bbox", default="6.30,50.88,6.45,50.97")
    ap.add_argument("--jahre", default="2023,2024,2025")
    ap.add_argument("--min-ha", type=float, default=5.0)
    ap.add_argument("--speichern", metavar="DENWLI...")
    ap.add_argument("--datei", default="juelich_field1.geojson")
    ap.add_argument("--inspect", action="store_true")
    a = ap.parse_args()
    jahre = [int(x) for x in a.jahre.split(",")]

    print(f"Lade Flaechen im Gebiet {a.bbox} ...")
    features = lade_erste(a.bbox) if a.inspect else lade_alle(a.bbox)
    if not features:
        sys.exit("Keine Flaechen geladen. Stimmt das Gebiet (--bbox)?")

    if a.inspect:
        print(json.dumps(flach(features[0].get("properties")),
                         ensure_ascii=False, indent=1))
        return

    k = finde_schluessel(features[:300])
    print("\nErkannte Felder:")
    for name, key in k.items():
        print(f"  {name:<10} -> {key}")
    if not k["kultur"]:
        print("WARNUNG: Kultur nicht erkannt. Bitte 'python finde_demofeld.py "
              "--inspect' ausfuehren und die Ausgabe weitergeben.")
    if not k["gruenland"]:
        print("WARNUNG: Dauergruenland-Feld nicht erkannt, Gruenland wird nur "
              "ueber den Kulturnamen aussortiert.")
    if not k["block"] or not k["jahr"]:
        sys.exit("Feldblock oder Jahr nicht erkannt. Bitte mit --inspect "
                 "pruefen und die Ausgabe weitergeben.")

    if a.speichern:
        speichern(features, k, a.speichern.strip(), jahre, a.datei)
    else:
        zeige(auswerten(features, k, jahre, a.min_ha), jahre)


def lade_erste(bbox):
    r = requests.get(BASE, params={"bbox": bbox, "limit": 1, "f": "json",
                                   "crs": CRS84}, timeout=60)
    r.raise_for_status()
    return r.json().get("features", [])


if __name__ == "__main__":
    main()
