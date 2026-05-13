#!/usr/bin/env python3
"""
Holt Berliner Schulferien von openholidaysapi.org und schreibt
das Ergebnis als /data/schulferien_berlin.json ins Repo.

API-Doku: https://openholidaysapi.org/swagger/index.html
Endpunkt:  GET /SchoolHolidays
Parameter: countryIsoCode=DE, subdivisionCode=DE-BE, languageIsoCode=DE
"""

import json
import time
import urllib.request
import urllib.error
from datetime import date, timedelta

OUTPUT_PATH = "data/schulferien_berlin.json"
BASE_URL = "https://openholidaysapi.org/SchoolHolidays"

def fetch_year(year: int, retries: int = 3) -> list:
    """Holt Schulferien für ein Kalenderjahr. Retry bei 429."""
    url = (
        f"{BASE_URL}"
        f"?countryIsoCode=DE"
        f"&subdivisionCode=DE-BE"
        f"&languageIsoCode=DE"
        f"&validFrom={year}-01-01"
        f"&validTo={year}-12-31"
    )
    wait_times = [20, 40, 60]
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                wait = wait_times[attempt]
                print(f"  429 – warte {wait}s …")
                time.sleep(wait)
            else:
                print(f"  HTTP-Fehler {e.code} für Jahr {year}: {e}")
                return []
        except Exception as e:
            print(f"  Fehler für Jahr {year}: {e}")
            return []
    return []

def parse_entry(entry: dict) -> dict | None:
    """Wandelt einen API-Eintrag in ein schlankes Dict um."""
    try:
        name_list = entry.get("name", [])
        name = next(
            (n["text"] for n in name_list if n.get("language") == "DE"),
            name_list[0]["text"] if name_list else "Schulferien"
        )
        start = entry["startDate"][:10]   # "YYYY-MM-DD"
        end   = entry["endDate"][:10]
        return {"name": name, "start": start, "end": end}
    except (KeyError, IndexError, TypeError) as e:
        print(f"  Parse-Fehler: {e} — {entry}")
        return None

def main():
    today = date.today()
    years = [today.year, today.year + 1]
    print(f"Hole Schulferien Berlin für: {years}")

    raw = []
    for y in years:
        print(f"  Jahr {y} …")
        raw.extend(fetch_year(y))
        time.sleep(1)   # höfliche Pause

    entries = []
    seen = set()
    for item in raw:
        parsed = parse_entry(item)
        if parsed:
            key = (parsed["name"], parsed["start"])
            if key not in seen:
                seen.add(key)
                entries.append(parsed)

    # Chronologisch sortieren
    entries.sort(key=lambda x: x["start"])

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"✅  {len(entries)} Einträge → {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
