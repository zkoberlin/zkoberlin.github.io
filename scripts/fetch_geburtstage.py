"""
fetch_geburtstage.py  –  v2.0
Holt täglich 4 bekannte lebende Geburtstagskinder via Wikidata SPARQL.

FIX v2.0:
  - Garantierter Kategorie-Mix: je 1 Abfrage pro Gruppe (Sport / Musik / Schauspiel / Politik).
    Vorher: alle QIDs in einem VALUES-Block → ORDER BY sitelinks schnappte sich immer Sportler.
  - Reihenfolge der Kategorien täglich deterministisch-shuffled (reproduzierbar pro Tag).
  - Fallback auf Wikipedia REST API wenn Wikidata < 3 Ergebnisse liefert.
  - JSON-Struktur bleibt identisch mit v1.

Wird von GitHub Actions automatisch ausgeführt (täglich 06:00 UTC).
"""

import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
import re
import hashlib
import time
import random

# ── Kategorie-Gruppen mit QIDs ─────────────────────────────────────────────
# Pro Gruppe eigene SPARQL-Abfrage → garantierter Mix in der Ausgabe.

KATEGORIEN = {
    "sport": [
        "Q2066131",  # Sportler (allgemein)
        "Q937857",   # Fußballspieler
        "Q10873124", # Tennisspieler
        "Q10843402", # Schwimmer
        "Q11338576", # Leichtathlet
        "Q628099",   # Rennfahrer
        "Q10833314", # Skisportler
        "Q10843263", # Radfahrer
        "Q3665646",  # Basketballer
        "Q13141064", # Boxer
        "Q19204627", # Golfer
        "Q10871364", # Eishockeyspieler
        "Q4009406",  # Footballspieler
    ],
    "musik": [
        "Q177220",   # Sänger
        "Q639669",   # Musiker
        "Q753110",   # Songwriter
        "Q488205",   # Singer-Songwriter
        "Q183945",   # Rapper
        "Q855091",   # DJ
        "Q36834",    # Komponist
    ],
    "schauspiel": [
        "Q33999",    # Schauspieler
        "Q10798782", # Filmschauspieler
        "Q3282637",  # Fernsehschauspieler
        "Q2259451",  # Theaterschauspieler
    ],
    "politik": [
        "Q82955",    # Politiker
        "Q48352",    # Staatsoberhaupt
        "Q16533",    # Richter
    ],
}

# Deutsche Bezeichnungen
BERUF_DEUTSCH = {
    "Q33999":    "Schauspieler/in",
    "Q10798782": "Schauspieler/in",
    "Q2259451":  "Schauspieler/in",
    "Q3282637":  "Schauspieler/in",
    "Q177220":   "Sänger/in",
    "Q639669":   "Musiker/in",
    "Q753110":   "Songwriter/in",
    "Q488205":   "Singer-Songwriter",
    "Q36834":    "Komponist/in",
    "Q183945":   "Rapper/in",
    "Q855091":   "DJ",
    "Q2066131":  "Sportler/in",
    "Q937857":   "Fußballer/in",
    "Q3665646":  "Basketballer/in",
    "Q10873124": "Tennisspieler/in",
    "Q10843402": "Schwimmer/in",
    "Q11338576": "Leichtathlet/in",
    "Q628099":   "Rennfahrer/in",
    "Q13141064": "Boxer/in",
    "Q19204627": "Golfer/in",
    "Q10871364": "Eishockeyspieler/in",
    "Q4009406":  "Footballspieler/in",
    "Q10833314": "Skisportler/in",
    "Q10843263": "Radfahrer/in",
    "Q82955":    "Politiker/in",
    "Q48352":    "Staatsoberhaupt",
    "Q16533":    "Richter/in",
}

KATEGORIE_LABEL = {
    "sport":      "⚽ Sport",
    "musik":      "🎵 Musik",
    "schauspiel": "🎬 Schauspiel",
    "politik":    "🏛️  Politik",
}

# ── HTTP-Request mit Retry bei 429 ─────────────────────────────────────────
def get_json(url, headers=None, timeout=30, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers or {})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 20 * (attempt + 1)
                print(f"   ⏳ Rate-limit (429), warte {wait}s (Versuch {attempt+1}/{retries}) ...")
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            if attempt < retries - 1:
                print(f"   ⚠ Fehler: {e}, retry in 10s ...")
                time.sleep(10)
            else:
                raise
    raise Exception(f"Alle {retries} Versuche fehlgeschlagen für {url}")

# ── SPARQL-Abfrage für eine Kategorie ──────────────────────────────────────
def build_query_for_category(month, day, qid_list):
    qid_values = " ".join(f"wd:{qid}" for qid in qid_list)
    return f"""
    SELECT DISTINCT ?person ?birth_year ?occupation ?sitelinks WHERE {{
      VALUES ?occupation {{ {qid_values} }}
      ?person wdt:P569 ?dob ;
              wdt:P31  wd:Q5 ;
              wdt:P106 ?occupation ;
              wikibase:sitelinks ?sitelinks .
      FILTER(MONTH(?dob) = {month} && DAY(?dob) = {day})
      FILTER NOT EXISTS {{ ?person wdt:P570 [] }}
      FILTER(?sitelinks > 15)
    }}
    ORDER BY DESC(?sitelinks)
    LIMIT 5
    """

def fetch_category(month, day, year, kategorie_key, qid_list, seen_qids):
    """Führt SPARQL für eine Kategorie aus, gibt besten ungesehenen Treffer zurück."""
    label = KATEGORIE_LABEL.get(kategorie_key, kategorie_key)
    print(f"  {label} …")

    try:
        query = build_query_for_category(month, day, qid_list)
        sparql_url = (
            "https://query.wikidata.org/sparql?query="
            + urllib.parse.quote(query)
            + "&format=json"
        )
        raw = get_json(sparql_url, headers={
            "User-Agent": "PaulDashboard/2.0 (github.com/zkoberlin)",
            "Accept": "application/sparql-results+json"
        }, timeout=45, retries=3)

        results = raw.get("results", {}).get("bindings", [])
        print(f"     → {len(results)} Treffer in Wikidata")

        for row in results:
            qid = row["person"]["value"].split("/")[-1]
            if qid in seen_qids:
                continue
            occ_qid = row.get("occupation", {}).get("value", "").split("/")[-1]
            birth_yr = row.get("birth_year", {}).get("value", "")[:4]

            name, beruf, foto = get_entity_data(qid, occ_qid)
            if not name or re.match(r"^Q\d+$", name):
                continue

            alter = year - int(birth_yr) if birth_yr.isdigit() else None
            seen_qids.add(qid)
            print(f"     ✓ {name} ({alter}) – {beruf}")
            return {
                "name":        name,
                "alter":       alter,
                "geburtsjahr": int(birth_yr) if birth_yr.isdigit() else None,
                "beruf":       beruf,
                "foto":        foto,
                "wikidata":    f"https://www.wikidata.org/wiki/{qid}"
            }

        print(f"     – Kein verwertbarer Treffer")
        return None

    except Exception as e:
        print(f"     ❌ SPARQL fehlgeschlagen: {e}")
        return None

# ── Entity-Daten via Wikidata API ──────────────────────────────────────────
def get_entity_data(qid, occupation_qid=None):
    try:
        url = (
            f"https://www.wikidata.org/w/api.php"
            f"?action=wbgetentities&ids={qid}"
            f"&props=labels|claims"
            f"&languages=de|en"
            f"&format=json"
        )
        data = get_json(url, headers={"User-Agent": "PaulDashboard/2.0"}, timeout=20)
        entity = data["entities"][qid]

        labels = entity.get("labels", {})
        name = (
            labels.get("de", {}).get("value")
            or labels.get("en", {}).get("value")
            or qid
        )

        claims = entity.get("claims", {})

        beruf = "Persönlichkeit"
        if occupation_qid and occupation_qid in BERUF_DEUTSCH:
            beruf = BERUF_DEUTSCH[occupation_qid]
        elif "P106" in claims:
            beruf_qid = claims["P106"][0]["mainsnak"]["datavalue"]["value"]["id"]
            beruf = BERUF_DEUTSCH.get(beruf_qid, get_label(beruf_qid))

        foto = None
        if "P18" in claims:
            filename = claims["P18"][0]["mainsnak"]["datavalue"]["value"]
            foto = build_wikimedia_url(filename)

        return name, beruf, foto

    except Exception as e:
        print(f"   ⚠ Entity-Fetch fehlgeschlagen für {qid}: {e}")
        return None, None, None

def get_label(qid):
    try:
        url = (
            f"https://www.wikidata.org/w/api.php"
            f"?action=wbgetentities&ids={qid}"
            f"&props=labels&languages=de|en&format=json"
        )
        data = get_json(url, headers={"User-Agent": "PaulDashboard/2.0"}, timeout=10)
        labels = data["entities"][qid].get("labels", {})
        return (
            labels.get("de", {}).get("value")
            or labels.get("en", {}).get("value")
            or "Persönlichkeit"
        )
    except Exception:
        return "Persönlichkeit"

# ── Wikimedia Foto-URL ─────────────────────────────────────────────────────
def build_wikimedia_url(filename):
    filename_encoded = filename.replace(" ", "_")
    md5 = hashlib.md5(filename_encoded.encode()).hexdigest()
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
        f"{md5[0]}/{md5[0:2]}/{urllib.parse.quote(filename_encoded)}"
        f"/120px-{urllib.parse.quote(filename_encoded)}"
    )

# ── Fallback: Wikipedia REST API ───────────────────────────────────────────
def fetch_via_wikipedia(month, day, year, seen_names):
    print("  🔄 Fallback: Wikipedia REST API …")
    url = f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/{month:02d}/{day:02d}"
    data = get_json(url, headers={"User-Agent": "PaulDashboard/2.0"}, timeout=20)
    births = data.get("births", [])
    output = []

    ERLAUBTE_KEYWORDS = [
        "actor", "actress", "singer", "musician", "rapper", "songwriter",
        "footballer", "soccer", "basketball", "tennis", "athlete", "boxer",
        "swimmer", "racing driver", "golfer", "politician", "president",
        "chancellor", "minister", "director", "performer", "entertainer",
    ]

    for entry in births:
        if len(output) >= 2:
            break
        year_born = entry.get("year")
        pages = entry.get("pages", [])
        if not pages or not year_born:
            continue
        page = pages[0]
        title = page.get("titles", {}).get("normalized", "")
        if title in seen_names:
            continue
        description = page.get("description", "").lower()
        extract = page.get("extract", "").lower()

        if not any(kw.lower() in description or kw.lower() in extract for kw in ERLAUBTE_KEYWORDS):
            continue
        if "died" in extract or "death" in extract:
            continue

        thumbnail = page.get("thumbnail", {}).get("source", None)
        alter = year - int(year_born)

        output.append({
            "name":        title,
            "alter":       alter,
            "geburtsjahr": int(year_born),
            "beruf":       page.get("description", "Persönlichkeit").title(),
            "foto":        thumbnail,
            "wikidata":    page.get("content_urls", {}).get("desktop", {}).get("page", "")
        })
        seen_names.add(title)
        print(f"     ✓ {title} ({alter}) [Wikipedia-Fallback]")

    return output

# ── Hauptfunktion ──────────────────────────────────────────────────────────
def main():
    today = datetime.utcnow()
    month = today.month
    day   = today.day
    year  = today.year

    print(f"\n📅 Geburtstagskinder für {day:02d}.{month:02d}.{year}")
    print("─" * 50)

    output = []
    seen_qids = set()

    # Reihenfolge der Kategorien: täglich deterministisch-shuffled
    # (seed = Tag+Monat → reproduzierbar, aber wechselnd)
    kategorie_keys = list(KATEGORIEN.keys())
    random.seed(day * 100 + month)
    random.shuffle(kategorie_keys)
    print(f"  Reihenfolge: {' → '.join(KATEGORIE_LABEL.get(k, k) for k in kategorie_keys)}\n")

    for key in kategorie_keys:
        entry = fetch_category(month, day, year, key, KATEGORIEN[key], seen_qids)
        if entry:
            output.append(entry)
        time.sleep(2)  # Rate-limit-freundlich zwischen Anfragen

    print(f"\n  → {len(output)}/4 via Wikidata SPARQL")

    # Fallback wenn zu wenig Treffer
    if len(output) < 3:
        seen_names = {e["name"] for e in output}
        try:
            fb = fetch_via_wikipedia(month, day, year, seen_names)
            output.extend(fb)
        except Exception as e:
            print(f"   ❌ Wikipedia Fallback fehlgeschlagen: {e}")

    output = output[:4]

    result = {
        "datum":       f"{day:02d}.{month:02d}.{year}",
        "generiert":   today.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "geburtstage": output
    }

    with open("data/geburtstage.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    beruf_summary = ", ".join(e.get("beruf", "?") for e in output)
    print(f"\n✅ data/geburtstage.json – {len(output)} Einträge")
    print(f"   Mix: {beruf_summary}")

if __name__ == "__main__":
    main()
