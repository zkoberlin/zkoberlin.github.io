"""
fetch_geburtstage.py  –  v3.1
Holt täglich 4 bekannte Geburtstagskinder via Wikidata SPARQL.
 
NEU v3.0:
  - Deutsche Personen (P27 = Q183) werden PRIORISIERT (bis zu 2 Slots).
  - Restliche Slots mit internationalem Kategorie-Mix auffüllen (wie v2).
  - Deutsche Treffer erscheinen immer zuerst in der Ausgabe.
  - Neues Feld "nationalitaet" im JSON ("🇩🇪 Deutsch" oder None).
 
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
KATEGORIEN = {
    "sport": [
        "Q2066131",  "Q937857",   "Q10873124", "Q10843402", "Q11338576",
        "Q628099",   "Q10833314", "Q10843263", "Q3665646",  "Q13141064",
        "Q19204627", "Q10871364", "Q4009406",
    ],
    "musik": [
        "Q177220",   "Q639669",   "Q753110",   "Q488205",
        "Q183945",   "Q855091",   "Q36834",
    ],
    "schauspiel": [
        "Q33999",    "Q10798782", "Q3282637",  "Q2259451",
    ],
    "politik": [
        "Q82955",    "Q48352",    "Q16533",
    ],
}
 
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
 
# QIDs aller deutschen Berufsgruppen für die DE-Abfrage
ALL_OCCUPATION_QIDS = list({qid for qids in KATEGORIEN.values() for qid in qids})
 
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
 
# ── NEU: SPARQL nur für Deutsche (P27 = Q183) ─────────────────────────────
def fetch_deutsche(month, day, year, seen_qids, max_results=2):
    """
    Priorisierungs-Abfrage: Nur Personen mit deutscher Staatsangehörigkeit.
    Liefert bis zu max_results Einträge.
    """
    print(f"  🇩🇪 Deutsche Personen …")
 
    # Kein Occupation-Filter – P27=Q183 reicht als Kriterium.
    # Sitelinks > 5 filtert Obskures raus, lässt aber Kretschmann/Steinbach durch.
    query = f"""
    SELECT DISTINCT ?person ?birth_year ?occupation ?sitelinks WHERE {{
      ?person wdt:P569 ?dob ;
              wdt:P31  wd:Q5 ;
              wdt:P27  wd:Q183 ;
              wikibase:sitelinks ?sitelinks .
      OPTIONAL {{ ?person wdt:P106 ?occupation . }}
      FILTER(MONTH(?dob) = {month} && DAY(?dob) = {day})
      FILTER NOT EXISTS {{ ?person wdt:P570 [] }}
      FILTER(?sitelinks > 5)
    }}
    ORDER BY DESC(?sitelinks)
    LIMIT 15
    """
 
    try:
        sparql_url = (
            "https://query.wikidata.org/sparql?query="
            + urllib.parse.quote(query)
            + "&format=json"
        )
        raw = get_json(sparql_url, headers={
            "User-Agent": "PaulDashboard/3.1 (github.com/zkoberlin)",
            "Accept": "application/sparql-results+json"
        }, timeout=45, retries=3)
 
        results = raw.get("results", {}).get("bindings", [])
        print(f"     → {len(results)} deutsche Treffer in Wikidata")
 
        output = []
        for row in results:
            if len(output) >= max_results:
                break
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
            print(f"     ✓ {name} ({alter}) – {beruf} 🇩🇪")
            output.append({
                "name":          name,
                "alter":         alter,
                "geburtsjahr":   int(birth_yr) if birth_yr.isdigit() else None,
                "beruf":         beruf,
                "foto":          foto,
                "wikidata":      f"https://www.wikidata.org/wiki/{qid}",
                "nationalitaet": "🇩🇪 Deutsch",
            })
 
        return output
 
    except Exception as e:
        print(f"     ❌ DE-SPARQL fehlgeschlagen: {e}")
        return []
 
# ── SPARQL-Abfrage für eine internationale Kategorie ──────────────────────
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
    """Führt SPARQL für eine internationale Kategorie aus."""
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
            "User-Agent": "PaulDashboard/3.1 (github.com/zkoberlin)",
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
                "name":          name,
                "alter":         alter,
                "geburtsjahr":   int(birth_yr) if birth_yr.isdigit() else None,
                "beruf":         beruf,
                "foto":          foto,
                "wikidata":      f"https://www.wikidata.org/wiki/{qid}",
                "nationalitaet": None,
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
        data = get_json(url, headers={"User-Agent": "PaulDashboard/3.1"}, timeout=20)
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
        data = get_json(url, headers={"User-Agent": "PaulDashboard/3.1"}, timeout=10)
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
def fetch_via_wikipedia(month, day, year, seen_names, needed=4):
    print(f"  🔄 Fallback: Wikipedia REST API (benötigt {needed}) …")
    url = f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/{month:02d}/{day:02d}"
    data = get_json(url, headers={"User-Agent": "PaulDashboard/3.1"}, timeout=20)
    births = data.get("births", [])
    output = []
 
    ERLAUBTE_KEYWORDS = [
        "actor", "actress", "singer", "musician", "rapper", "songwriter",
        "footballer", "soccer", "basketball", "tennis", "athlete", "boxer",
        "swimmer", "racing driver", "golfer", "politician", "president",
        "chancellor", "minister", "director", "performer", "entertainer",
    ]
 
    for entry in births:
        if len(output) >= needed:
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
            "name":          title,
            "alter":         alter,
            "geburtsjahr":   int(year_born),
            "beruf":         page.get("description", "Persönlichkeit").title(),
            "foto":          thumbnail,
            "wikidata":      page.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "nationalitaet": None,
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
 
    # ── Schritt 1: Deutsche Personen priorisieren (bis zu 2 Slots) ──────────
    print("\n[1/2] Priorisierung: Deutsche Personen")
    deutsche = fetch_deutsche(month, day, year, seen_qids, max_results=2)
    output.extend(deutsche)
    time.sleep(2)
 
    # ── Schritt 2: Restliche Slots mit internationalem Mix füllen ───────────
    remaining = 4 - len(output)
    print(f"\n[2/2] Internationaler Mix ({remaining} Slots verbleibend)")
 
    kategorie_keys = list(KATEGORIEN.keys())
    random.seed(day * 100 + month)
    random.shuffle(kategorie_keys)
    print(f"  Reihenfolge: {' → '.join(KATEGORIE_LABEL.get(k, k) for k in kategorie_keys)}\n")
 
    for key in kategorie_keys:
        if len(output) >= 4:
            break
        entry = fetch_category(month, day, year, key, KATEGORIEN[key], seen_qids)
        if entry:
            output.append(entry)
        time.sleep(2)
 
    print(f"\n  → {len(output)}/4 via Wikidata SPARQL")
 
    # ── Fallback wenn zu wenig Treffer ──────────────────────────────────────
    if len(output) < 4:
        needed = 4 - len(output)
        seen_names = {e["name"] for e in output}
        try:
            fb = fetch_via_wikipedia(month, day, year, seen_names, needed)
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
 
    de_count = sum(1 for e in output if e.get("nationalitaet"))
    beruf_summary = ", ".join(e.get("beruf", "?") for e in output)
    print(f"\n✅ data/geburtstage.json – {len(output)} Einträge ({de_count}x 🇩🇪)")
    print(f"   Mix: {beruf_summary}")
 
if __name__ == "__main__":
    main()
 
