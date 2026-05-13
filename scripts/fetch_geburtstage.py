"""
fetch_geburtstage.py
Holt täglich 3 bekannte lebende Geburtstagskinder via Wikidata SPARQL.
Gefiltert auf: Schauspieler, Sportler, Musiker, Politiker.
Wird von GitHub Actions automatisch ausgeführt.
"""

import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
import re
import hashlib
import time

# ── Berufsgruppen-Filter ───────────────────────────────────────────────────
# Wikidata QIDs für erlaubte Berufsgruppen (und ihre Unterklassen)
ERLAUBTE_BERUFE_QID = {
    # Schauspieler
    "Q33999",    # Schauspieler
    "Q10798782", # Filmschauspieler
    "Q2259451",  # Theaterschauspieler
    "Q3282637",  # Fernsehschauspieler
    # Musiker / Sänger
    "Q177220",   # Sänger
    "Q639669",   # Musiker
    "Q753110",   # Songwriter
    "Q488205",   # Singer-Songwriter
    "Q36834",    # Komponist
    "Q183945",   # Rapper
    "Q855091",   # DJ
    # Sportler
    "Q2066131",  # Sportler (allgemein)
    "Q937857",   # Fußballspieler
    "Q3665646",  # Basketballspieler
    "Q10873124", # Tennisspieler
    "Q10843402", # Schwimmer
    "Q11338576", # Leichtathlet
    "Q628099",   # Rennfahrer
    "Q13141064", # Boxer
    "Q10873124", # Tennisspieler
    "Q19204627", # Golfer
    "Q10871364", # Eishockeyspieler
    "Q10871364", # Eishockeyspieler
    "Q4009406",  # American-Football-Spieler
    "Q10833314", # Skisportler
    "Q10843263", # Radfahrer
    "Q11774891", # Ringer
    # Politiker
    "Q82955",    # Politiker
    "Q48352",    # Staatsoberhaupt
    "Q16533",    # Richter (Verfassungsgericht etc.)
}

# Deutsche Bezeichnungen für die Berufsgruppen
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
    "Q11774891": "Ringer/in",
    "Q82955":    "Politiker/in",
    "Q48352":    "Staatsoberhaupt",
    "Q16533":    "Richter/in",
}

# ── Hilfsfunktion: HTTP-Request mit Retry bei 429 ─────────────────────────
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

# ── 1. WIKIDATA SPARQL ABFRAGE ─────────────────────────────────────────────
# Wir filtern direkt in SPARQL auf die erlaubten Berufs-QIDs (VALUES-Block)
def build_query(month, day):
    # VALUES-Liste aus den QIDs bauen
    qid_values = " ".join(f"wd:{qid}" for qid in ERLAUBTE_BERUFE_QID)
    return f"""
    SELECT DISTINCT ?person ?birth_year ?occupation ?sitelinks WHERE {{
      VALUES ?occupation {{ {qid_values} }}
      ?person wdt:P569 ?dob ;
              wdt:P31  wd:Q5 ;
              wdt:P106 ?occupation ;
              wikibase:sitelinks ?sitelinks .
      FILTER(MONTH(?dob) = {month} && DAY(?dob) = {day})
      FILTER NOT EXISTS {{ ?person wdt:P570 [] }}
      FILTER(?sitelinks > 20)
    }}
    ORDER BY DESC(?sitelinks)
    LIMIT 15
    """

# ── 2. ENTITY-DATEN VIA WIKIDATA API ──────────────────────────────────────
def get_entity_data(qid, occupation_qid=None):
    try:
        url = (
            f"https://www.wikidata.org/w/api.php"
            f"?action=wbgetentities&ids={qid}"
            f"&props=labels|claims"
            f"&languages=de|en"
            f"&format=json"
        )
        data = get_json(url, headers={"User-Agent": "PaulDashboard/1.0"}, timeout=20)
        entity = data["entities"][qid]

        labels = entity.get("labels", {})
        name = (
            labels.get("de", {}).get("value")
            or labels.get("en", {}).get("value")
            or qid
        )

        claims = entity.get("claims", {})

        # Beruf: erst aus SPARQL-Ergebnis (occupation_qid), sonst aus Claims
        beruf = "Persönlichkeit"
        if occupation_qid and occupation_qid in BERUF_DEUTSCH:
            beruf = BERUF_DEUTSCH[occupation_qid]
        elif "P106" in claims:
            beruf_qid = claims["P106"][0]["mainsnak"]["datavalue"]["value"]["id"]
            beruf = BERUF_DEUTSCH.get(beruf_qid, get_label(beruf_qid))

        # Foto
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
        data = get_json(url, headers={"User-Agent": "PaulDashboard/1.0"}, timeout=10)
        labels = data["entities"][qid].get("labels", {})
        return (
            labels.get("de", {}).get("value")
            or labels.get("en", {}).get("value")
            or "Persönlichkeit"
        )
    except Exception:
        return "Persönlichkeit"

# ── 3. WIKIMEDIA FOTO-URL ──────────────────────────────────────────────────
def build_wikimedia_url(filename):
    filename_encoded = filename.replace(" ", "_")
    md5 = hashlib.md5(filename_encoded.encode()).hexdigest()
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
        f"{md5[0]}/{md5[0:2]}/{urllib.parse.quote(filename_encoded)}"
        f"/120px-{urllib.parse.quote(filename_encoded)}"
    )

# ── 4. FALLBACK: Wikipedia REST API ───────────────────────────────────────
def fetch_via_wikipedia(month, day, year):
    print("   🔄 Fallback: Wikipedia REST API ...")
    url = f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/{month:02d}/{day:02d}"
    data = get_json(url, headers={"User-Agent": "PaulDashboard/1.0"}, timeout=20)
    births = data.get("births", [])
    output = []

    # Schlagwörter für erlaubte Berufe im Beschreibungstext
    ERLAUBTE_KEYWORDS = [
        "actor", "actress", "singer", "musician", "rapper", "songwriter",
        "footballer", "soccer", "basketball", "tennis", "athlete", "boxer",
        "swimmer", "racing driver", "golfer", "politician", "president",
        "chancellor", "minister", "director", "performer", "entertainer",
        "Schauspieler", "Sänger", "Musiker", "Sportler", "Politiker",
        "Fußballer", "Basketballer"
    ]

    for entry in births:
        if len(output) >= 3:
            break
        year_born = entry.get("year")
        pages = entry.get("pages", [])
        if not pages or not year_born:
            continue
        page = pages[0]
        description = page.get("description", "").lower()
        extract = page.get("extract", "").lower()

        # Nur erlaubte Berufsgruppen
        if not any(kw.lower() in description or kw.lower() in extract
                   for kw in ERLAUBTE_KEYWORDS):
            continue

        # Grobe Lebend-Prüfung
        if "died" in extract or "death" in extract:
            continue

        title = page.get("titles", {}).get("normalized", "")
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
        print(f"   ✓ {title} ({alter})")

    return output

# ── 5. HAUPTFUNKTION ───────────────────────────────────────────────────────
def main():
    today = datetime.utcnow()
    month = today.month
    day   = today.day
    year  = today.year

    print(f"📅 Suche Geburtstagskinder für {day}.{month}.{year} ...")

    output = []

    # Versuch 1: Wikidata SPARQL mit Berufsfilter
    try:
        query = build_query(month, day)
        sparql_url = (
            "https://query.wikidata.org/sparql?query="
            + urllib.parse.quote(query)
            + "&format=json"
        )
        raw = get_json(sparql_url, headers={
            "User-Agent": "PaulDashboard/1.0 (github.com/zkoberlin)",
            "Accept": "application/sparql-results+json"
        }, timeout=45, retries=3)

        results = raw.get("results", {}).get("bindings", [])
        print(f"   → {len(results)} Ergebnisse (gefiltert auf Schauspieler/Sportler/Musiker/Politiker)")

        seen = set()
        unique = []
        for row in results:
            qid = row["person"]["value"].split("/")[-1]
            if qid not in seen:
                seen.add(qid)
                occ_qid = row.get("occupation", {}).get("value", "").split("/")[-1]
                unique.append((qid, row, occ_qid))

        for qid, row, occ_qid in unique:
            if len(output) >= 3:
                break
            birth_yr = row.get("birth_year", {}).get("value", "")[:4]
            name, beruf, foto = get_entity_data(qid, occ_qid)
            if not name or re.match(r"^Q\d+$", name):
                continue
            alter = year - int(birth_yr) if birth_yr.isdigit() else None
            output.append({
                "name":        name,
                "alter":       alter,
                "geburtsjahr": int(birth_yr) if birth_yr.isdigit() else None,
                "beruf":       beruf,
                "foto":        foto,
                "wikidata":    f"https://www.wikidata.org/wiki/{qid}"
            })
            print(f"   ✓ {name} ({alter}) – {beruf}")

    except Exception as e:
        print(f"   ❌ Wikidata SPARQL fehlgeschlagen: {e}")

    # Fallback: Wikipedia REST API
    if len(output) < 3:
        try:
            output = fetch_via_wikipedia(month, day, year)
        except Exception as e:
            print(f"   ❌ Auch Wikipedia Fallback fehlgeschlagen: {e}")

    # JSON schreiben
    result = {
        "datum":       f"{day:02d}.{month:02d}.{year}",
        "generiert":   today.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "geburtstage": output
    }

    with open("data/geburtstage.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ data/geburtstage.json geschrieben ({len(output)} Einträge)")

if __name__ == "__main__":
    main()
