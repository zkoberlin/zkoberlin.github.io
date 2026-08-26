"""
fetch_geburtstage.py  –  v4.0
Holt täglich vier bekannte, lebende Geburtstagskinder über Wikipedia.

Wikidata gehört bewusst nicht mehr zum kritischen Pfad, weil längere Ausfälle
und aggressive Rate-Limits sonst die tägliche Aktualisierung blockieren.

Wird von GitHub Actions automatisch ausgeführt (täglich 01:00 UTC).
"""

import json
import urllib.request
import urllib.error
from datetime import datetime
import re
import time
import os
import tempfile

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

# ── Kontrollierte Wikipedia REST API ───────────────────────────────────────
def fetch_via_wikipedia(month, day, year, seen_names, needed=4):
    print(f"  Wikipedia REST API (benötigt {needed}) …")
    url = f"https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/{month:02d}/{day:02d}"
    data = get_json(url, headers={"User-Agent": "PaulDashboard/3.3"}, timeout=20)
    births = data.get("births", [])
    alle = []  # Erst ALLE sammeln, dann sortieren

    ERLAUBTE_KEYWORDS = [
        "actor", "actress", "singer", "musician", "rapper", "songwriter",
        "footballer", "soccer", "basketball", "tennis", "athlete", "boxer",
        "swimmer", "racing driver", "golfer", "politician", "president",
        "chancellor", "minister", "director", "performer", "entertainer",
    ]
    for entry in births:
        year_born = entry.get("year")
        pages = entry.get("pages", [])
        if not pages or not year_born:
            continue
        page = pages[0]
        raw_title = page.get("titles", {}).get("normalized", "")
        title = re.sub(r"\s+\([^()]+\)$", "", raw_title).strip()
        if title in seen_names:
            continue
        description = page.get("description", "").lower()
        extract = page.get("extract", "").lower()

        if not any(kw in description or kw in extract for kw in ERLAUBTE_KEYWORDS):
            continue
        if "died" in extract or "death" in extract:
            continue

        # Wikipedia kennzeichnet lebende Personen in diesen Kurzbeschreibungen
        # mit "(born JJJJ)". Ohne diese positive Kennzeichnung wird der Eintrag
        # nicht als lebend angenommen.
        if not re.search(rf"\(born\s+{int(year_born)}\)", description, re.IGNORECASE):
            continue
        thumbnail = page.get("thumbnail", {}).get("source", None)
        alter = year - int(year_born)
        beruf = translate_occupation(description)
        is_german = description.startswith("german ") or " german " in f" {description} "
        alle.append({
            "name":          title,
            "alter":         alter,
            "geburtsjahr":   int(year_born),
            "beruf":         beruf,
            "foto":          thumbnail,
            "wikidata":      page.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "nationalitaet": "🇩🇪 Deutsch" if is_german else None,
            "quelle":        "Wikipedia",
        })

    # Deutsche zuerst, dann nach Originalreihenfolge (API sortiert nach Relevanz)
    alle.sort(key=lambda x: 0 if x.get("nationalitaet") else 1)

    output = alle[:needed]
    for p in output:
        flag = "🇩🇪 " if p.get("nationalitaet") else ""
        print(f"     ✓ {flag}{p['name']} ({p['alter']}) [Wikipedia]")
        seen_names.add(p["name"])
    return output


def translate_occupation(description):
    text = description.lower()
    translations = [
        (("association football", "footballer", "soccer"), "Fußballer/in"),
        (("basketball",), "Basketballer/in"),
        (("tennis",), "Tennisspieler/in"),
        (("boxer", "boxing"), "Boxer/in"),
        (("racing driver",), "Rennfahrer/in"),
        (("athlete",), "Sportler/in"),
        (("rapper",), "Rapper/in"),
        (("singer-songwriter", "songwriter"), "Singer-Songwriter/in"),
        (("singer",), "Sänger/in"),
        (("musician",), "Musiker/in"),
        (("actor", "actress"), "Schauspieler/in"),
        (("film director", "director"), "Regisseur/in"),
        (("politician", "minister", "president", "chancellor"), "Politiker/in"),
    ]
    for keywords, label in translations:
        if any(keyword in text for keyword in keywords):
            return label
    return "Persönlichkeit"

# ── Hauptfunktion ──────────────────────────────────────────────────────────
def validate_output(result, year):
    entries = result.get("geburtstage")
    if not isinstance(entries, list) or len(entries) != 4:
        raise ValueError("Es müssen genau vier gültige Einträge vorliegen")
    names = set()
    for entry in entries:
        name = entry.get("name")
        birth_year = entry.get("geburtsjahr")
        age = entry.get("alter")
        if not isinstance(name, str) or not name.strip() or name in names:
            raise ValueError("Name fehlt oder ist doppelt")
        names.add(name)
        if not isinstance(birth_year, int) or birth_year < 1900 or birth_year > year:
            raise ValueError(f"Ungültiges Geburtsjahr bei {name}")
        if age != year - birth_year or age < 0 or age > 120:
            raise ValueError(f"Unplausibles Alter bei {name}")
        if not isinstance(entry.get("beruf"), str) or not entry["beruf"].strip():
            raise ValueError(f"Beruf fehlt bei {name}")
        if not str(entry.get("wikidata", "")).startswith("https://"):
            raise ValueError(f"Quellenlink fehlt bei {name}")
        if entry.get("foto") is not None and not str(entry["foto"]).startswith("https://"):
            raise ValueError(f"Ungültige Foto-URL bei {name}")


def main():
    today = datetime.utcnow()
    month = today.month
    day   = today.day
    year  = today.year

    print(f"\n📅 Geburtstagskinder für {day:02d}.{month:02d}.{year}")
    print("─" * 50)

    print("\n[1/1] Kontrollierte Wikipedia-Kandidaten")
    output = fetch_via_wikipedia(month, day, year, set(), needed=4)

    result = {
        "datum":       f"{day:02d}.{month:02d}.{year}",
        "generiert":   today.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "geburtstage": output
    }

    validate_output(result, year)
    os.makedirs("data", exist_ok=True)
    fd, temp_path = tempfile.mkstemp(prefix="geburtstage-", suffix=".json", dir="data")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(temp_path, "data/geburtstage.json")
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    de_count = sum(1 for e in output if e.get("nationalitaet"))
    beruf_summary = ", ".join(e.get("beruf", "?") for e in output)
    print(f"\n✅ data/geburtstage.json – {len(output)} Einträge ({de_count}x 🇩🇪)")
    print(f"   Mix: {beruf_summary}")

if __name__ == "__main__":
    main()
