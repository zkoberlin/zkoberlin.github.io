"""
fetch_geburtstage.py
Holt täglich 3 bekannte lebende Geburtstagskinder via Wikidata SPARQL.
Wird von GitHub Actions automatisch ausgeführt.
Enthält Retry-Logik für 429-Fehler und Fallback auf Wikipedia REST API.
"""
 
import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
import re
import hashlib
import time
 
# ── Hilfsfunktion: HTTP-Request mit Retry bei 429 ─────────────────────────
def get_json(url, headers=None, timeout=30, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers or {})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 20 * (attempt + 1)  # 20s, 40s, 60s
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
def build_query(month, day):
    return f"""
    SELECT DISTINCT ?person ?birth_year ?sitelinks WHERE {{
      ?person wdt:P569 ?dob ;
              wdt:P31  wd:Q5 ;
              wdt:P106 [] ;
              wikibase:sitelinks ?sitelinks .
      FILTER(MONTH(?dob) = {month} && DAY(?dob) = {day})
      FILTER NOT EXISTS {{ ?person wdt:P570 [] }}
      FILTER(?sitelinks > 20)
    }}
    ORDER BY DESC(?sitelinks)
    LIMIT 15
    """
 
# ── 2. FALLBACK: Wikipedia REST API ───────────────────────────────────────
# Falls Wikidata komplett down ist, nutzen wir die Wikipedia "On This Day" API.
# Diese gibt Geburtstage ohne Lebend/Tot-Filter — wir filtern manuell nach.
 
def fetch_via_wikipedia(month, day, year):
    print("   🔄 Fallback: Wikipedia REST API ...")
    url = f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/{month:02d}/{day:02d}"
    data = get_json(url, headers={"User-Agent": "PaulDashboard/1.0"}, timeout=20)
 
    births = data.get("births", [])
    output = []
 
    for entry in births:
        if len(output) >= 3:
            break
 
        year_born = entry.get("year")
        if not year_born:
            continue
 
        pages = entry.get("pages", [])
        if not pages:
            continue
 
        page = pages[0]
        title = page.get("titles", {}).get("normalized", "")
        description = page.get("description", "Persönlichkeit")
        thumbnail = page.get("thumbnail", {}).get("source", None)
 
        # Grobe Lebend-Prüfung: Wikipedia-Beschreibung enthält oft "born YYYY" ohne Sterbejahr
        # Wir nehmen nur Personen deren Beschreibung kein "died" enthält
        extract = page.get("extract", "").lower()
        if "died" in extract or "death" in extract:
            continue
 
        alter = year - int(year_born) if year_born else None
 
        output.append({
            "name":        title,
            "alter":       alter,
            "geburtsjahr": int(year_born),
            "beruf":       description.title() if description else "Persönlichkeit",
            "foto":        thumbnail,
            "wikidata":    page.get("content_urls", {}).get("desktop", {}).get("page", "")
        })
        print(f"   ✓ {title} ({alter}) – {description}")
 
    return output
 
# ── 3. LABELS + BERUF VIA WIKIDATA API HOLEN ──────────────────────────────
def get_entity_data(qid):
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
 
        beruf = "Persönlichkeit"
        if "P106" in claims:
            beruf_qid = claims["P106"][0]["mainsnak"]["datavalue"]["value"]["id"]
            beruf = get_label(beruf_qid)
 
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
 
# ── 4. WIKIMEDIA FOTO-URL BERECHNEN ───────────────────────────────────────
def build_wikimedia_url(filename):
    filename_encoded = filename.replace(" ", "_")
    md5 = hashlib.md5(filename_encoded.encode()).hexdigest()
    return (
        f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
        f"{md5[0]}/{md5[0:2]}/{urllib.parse.quote(filename_encoded)}"
        f"/120px-{urllib.parse.quote(filename_encoded)}"
    )
 
# ── 5. HAUPTFUNKTION ───────────────────────────────────────────────────────
def main():
    today = datetime.utcnow()
    month = today.month
    day   = today.day
    year  = today.year
 
    print(f"📅 Suche Geburtstagskinder für {day}.{month}.{year} ...")
 
    output = []
 
    # Versuch 1: Wikidata SPARQL
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
        print(f"   → {len(results)} Ergebnisse von Wikidata SPARQL")
 
        seen = set()
        unique = []
        for row in results:
            qid = row["person"]["value"].split("/")[-1]
            if qid not in seen:
                seen.add(qid)
                unique.append((qid, row))
 
        for qid, row in unique:
            if len(output) >= 3:
                break
 
            birth_yr = row.get("birth_year", {}).get("value", "")[:4]
            name, beruf, foto = get_entity_data(qid)
 
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
        print("   → Wechsle zu Wikipedia REST Fallback ...")
 
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
