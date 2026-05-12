"""
fetch_geburtstage.py
Holt täglich 3 bekannte lebende Geburtstagskinder via Wikidata SPARQL.
Wird von GitHub Actions automatisch ausgeführt.
"""

import json
import urllib.request
import urllib.parse
from datetime import datetime
import re

# ── Hilfsfunktion: HTTP-Request mit Headers ────────────────────────────────
def get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.loads(response.read().decode())

# ── 1. WIKIDATA SPARQL ABFRAGE ─────────────────────────────────────────────
# Wir fragen: Personen mit Geburtstag heute + kein Sterbedatum + Beruf bekannt
# Sortiert nach Anzahl der Sitelinks (= Wikipedia-Artikel in vielen Sprachen)
# → ein guter Proxy für "Bekanntheit"

def build_query(month, day):
    return f"""
    SELECT DISTINCT ?person ?personLabel ?birth_year ?occupationLabel ?sitelinks WHERE {{
      ?person wdt:P569 ?dob .
      FILTER(MONTH(?dob) = {month} && DAY(?dob) = {day})
      
      # Nur lebende Personen (kein Sterbedatum)
      FILTER NOT EXISTS {{ ?person wdt:P570 ?dod }}
      
      # Muss ein Mensch sein (kein Tier, keine fiktive Figur)
      ?person wdt:P31 wd:Q5 .
      
      # Muss einen Beruf haben
      ?person wdt:P106 ?occupation .
      
      # Anzahl Sitelinks als Bekanntheits-Proxy
      ?person wikibase:sitelinks ?sitelinks .
      
      # Labels auf Deutsch holen, Fallback Englisch
      SERVICE wikibase:label {{
        bd:serviceParam wikibase:language "de,en" .
      }}
    }}
    ORDER BY DESC(?sitelinks)
    LIMIT 30
    """

# ── 2. BERUF AUF DEUTSCH FORMATIEREN ──────────────────────────────────────
# Wikidata gibt manchmal englische Begriffe zurück, wir übersetzen die gängigsten

BERUF_MAP = {
    "association football player": "Fußballer",
    "footballer": "Fußballer",
    "soccer player": "Fußballer",
    "actor": "Schauspieler",
    "actress": "Schauspielerin",
    "film actor": "Schauspieler",
    "television actor": "Schauspieler",
    "politician": "Politiker",
    "singer": "Sänger/in",
    "singer-songwriter": "Sänger/in",
    "musician": "Musiker/in",
    "rapper": "Rapper/in",
    "basketball player": "Basketballer",
    "tennis player": "Tennisspieler/in",
    "athlete": "Sportler/in",
    "writer": "Autor/in",
    "author": "Autor/in",
    "director": "Regisseur/in",
    "film director": "Regisseur/in",
    "model": "Model",
    "comedian": "Comedian",
    "television presenter": "Moderator/in",
    "journalist": "Journalist/in",
    "businessperson": "Unternehmer/in",
    "entrepreneur": "Unternehmer/in",
    "scientist": "Wissenschaftler/in",
    "researcher": "Forscher/in",
    "racing driver": "Rennfahrer/in",
    "boxer": "Boxer/in",
    "swimmer": "Schwimmer/in",
    "gymnast": "Sportler/in",
    "golfer": "Golfer/in",
    "baseball player": "Baseballspieler",
    "american football player": "Footballspieler",
    "ice hockey player": "Eishockeyspieler",
}

def format_beruf(beruf_raw):
    if not beruf_raw:
        return "Persönlichkeit"
    b = beruf_raw.lower().strip()
    return BERUF_MAP.get(b, beruf_raw.title())

# ── 3. FOTO VON WIKIMEDIA HOLEN ────────────────────────────────────────────
def get_foto(wikidata_id):
    """Holt das Hauptfoto einer Person von Wikimedia Commons."""
    try:
        url = (
            f"https://www.wikidata.org/w/api.php"
            f"?action=wbgetentities&ids={wikidata_id}"
            f"&props=claims&format=json"
        )
        data = get_json(url, headers={"User-Agent": "PaulDashboard/1.0"})
        claims = data["entities"][wikidata_id]["claims"]
        
        # P18 = Bild-Property in Wikidata
        if "P18" not in claims:
            return None
        
        filename = claims["P18"][0]["mainsnak"]["datavalue"]["value"]
        # Wikimedia Commons URL berechnen (MD5-basiertes Verzeichnisschema)
        filename_encoded = filename.replace(" ", "_")
        import hashlib
        md5 = hashlib.md5(filename_encoded.encode()).hexdigest()
        return (
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
            f"{md5[0]}/{md5[0:2]}/{urllib.parse.quote(filename_encoded)}"
            f"/120px-{urllib.parse.quote(filename_encoded)}"
        )
    except Exception:
        return None

# ── 4. DUPLIKATE FILTERN ───────────────────────────────────────────────────
# Wikidata gibt pro Person mehrere Zeilen zurück (ein Eintrag pro Beruf)
# Wir nehmen pro Person nur den ersten (prominentesten) Beruf

def deduplicate(results):
    seen = set()
    unique = []
    for row in results:
        person_id = row["person"]["value"].split("/")[-1]  # z.B. "Q12345"
        if person_id not in seen:
            seen.add(person_id)
            unique.append((person_id, row))
    return unique

# ── 5. HAUPTFUNKTION ───────────────────────────────────────────────────────
def main():
    today = datetime.utcnow()
    month = today.month
    day   = today.day
    year  = today.year

    print(f"📅 Suche Geburtstagskinder für {day}.{month}.{year} ...")

    # SPARQL-Abfrage senden
    query = build_query(month, day)
    sparql_url = (
        "https://query.wikidata.org/sparql?query="
        + urllib.parse.quote(query)
        + "&format=json"
    )
    
    raw = get_json(sparql_url, headers={
        "User-Agent": "PaulDashboard/1.0 (github.com/zkoberlin)",
        "Accept": "application/sparql-results+json"
    })
    
    results = raw.get("results", {}).get("bindings", [])
    print(f"   → {len(results)} Rohergebnisse von Wikidata")

    # Deduplizieren
    unique = deduplicate(results)
    print(f"   → {len(unique)} eindeutige Personen")

    # Top 3 aufbereiten
    output = []
    for person_id, row in unique[:10]:  # max 10 versuchen um auf 3 zu kommen
        if len(output) >= 3:
            break
        
        name      = row.get("personLabel", {}).get("value", "Unbekannt")
        birth_yr  = row.get("birth_year",  {}).get("value", "")[:4]  # nur Jahr
        beruf_raw = row.get("occupationLabel", {}).get("value", "")
        
        # Wikidata-interne IDs überspringen (kein deutsches Label vorhanden)
        if re.match(r"^Q\d+$", name):
            continue
        
        alter = year - int(birth_yr) if birth_yr.isdigit() else None
        foto  = get_foto(person_id)
        
        entry = {
            "name":      name,
            "alter":     alter,
            "geburtsjahr": int(birth_yr) if birth_yr.isdigit() else None,
            "beruf":     format_beruf(beruf_raw),
            "foto":      foto,
            "wikidata":  f"https://www.wikidata.org/wiki/{person_id}"
        }
        output.append(entry)
        print(f"   ✓ {name} ({alter}) – {format_beruf(beruf_raw)}")

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
