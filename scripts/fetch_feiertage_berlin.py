#!/usr/bin/env python3
"""Erstellt eine vollständig validierte Berliner Feiertagsdatei."""

import json
import os
import re
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone

OUTPUT = "data/feiertage_berlin.json"
BASE_URL = "https://openholidaysapi.org/PublicHolidays"
SOURCE_URL = "https://www.openholidaysapi.org/en/"
REQUIRED_NAMES = {
    "Neujahr", "Internationaler Frauentag", "Karfreitag", "Ostermontag",
    "Tag der Arbeit", "Christi Himmelfahrt", "Pfingstmontag",
    "Tag der Deutschen Einheit", "1. Weihnachtsfeiertag",
    "2. Weihnachtsfeiertag",
}


def fetch_period(start_year, end_year, retries=3):
    url = (
        f"{BASE_URL}?countryIsoCode=DE&subdivisionCode=DE-BE&languageIsoCode=DE"
        f"&validFrom={start_year}-01-01&validTo={end_year}-12-31"
    )
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "Paul-Hub-Feiertage/1.0",
            })
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}")
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:
            if attempt == retries - 1:
                raise RuntimeError(f"OpenHolidays nicht erreichbar: {error}") from error
            time.sleep(3 * (attempt + 1))


def localized_name(entry):
    names = entry.get("name")
    if not isinstance(names, list):
        return ""
    value = next((item.get("text") for item in names if item.get("language") == "DE"), None)
    value = value or next((item.get("text") for item in names if item.get("text")), "")
    return re.sub(r"[\x00-\x1f\x7f<>]", "", str(value)).strip()[:100]


def parse_entry(entry, years):
    day = str(entry.get("startDate", ""))[:10]
    end = str(entry.get("endDate", ""))[:10]
    name = localized_name(entry)
    subdivisions = {
        str(item.get("code")) for item in entry.get("subdivisions", []) if isinstance(item, dict)
    }
    nationwide = entry.get("nationwide") is True
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day) or day != end:
        raise ValueError(f"Ungültiges Feiertagsdatum: {entry}")
    parsed_day = date.fromisoformat(day)
    if parsed_day.year not in years or not name:
        raise ValueError(f"Ungültiger Feiertag: {entry}")
    if entry.get("type") != "Public" or entry.get("temporalScope") != "FullDay":
        raise ValueError(f"Kein ganztägiger gesetzlicher Feiertag: {name}")
    if not nationwide and "DE-BE" not in subdivisions:
        raise ValueError(f"Feiertag gilt nicht in Berlin: {name}")
    return {
        "datum": day,
        "name": name,
        "bundesweit": nationwide,
        "quelleId": str(entry.get("id", "")),
    }


def validate(result, years):
    if result.get("schemaVersion") != 1:
        raise ValueError("Ungültige Schema-Version")
    if result.get("region") != "DE-BE" or result.get("jahre") != sorted(years):
        raise ValueError("Ungültiger Zeitraum oder Region")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", result.get("stand", "")):
        raise ValueError("Ungültiger Datenstand")
    source = result.get("quelle")
    if not isinstance(source, dict) or not str(source.get("url", "")).startswith("https://"):
        raise ValueError("Ungültige Quelle")
    holidays = result.get("feiertage")
    if not isinstance(holidays, list):
        raise ValueError("Feiertage fehlen")
    dates = [item.get("datum") for item in holidays]
    if len(dates) != len(set(dates)):
        raise ValueError("Feiertagsdaten sind doppelt")
    for year in years:
        annual = [item for item in holidays if item["datum"].startswith(f"{year}-")]
        names = {item["name"] for item in annual}
        if len(annual) < 10 or len(annual) > 15 or not REQUIRED_NAMES.issubset(names):
            raise ValueError(f"Feiertagsjahr {year} ist unvollständig oder unplausibel")
    for item in holidays:
        if set(item) != {"datum", "name", "bundesweit", "quelleId"}:
            raise ValueError("Ungültiges Feiertagsschema")
        if not isinstance(item["bundesweit"], bool) or not item["quelleId"]:
            raise ValueError(f"Ungültige Metadaten bei {item.get('name')}")


def write_atomic(result):
    output_dir = os.path.dirname(os.path.abspath(OUTPUT))
    os.makedirs(output_dir, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="feiertage-", suffix=".json", dir=output_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(result, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(temporary, OUTPUT)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    current_year = date.today().year
    years = {current_year, current_year + 1}
    raw = fetch_period(min(years), max(years))
    if not isinstance(raw, list):
        raise ValueError("OpenHolidays-Antwort ist keine Liste")
    holidays = [parse_entry(item, years) for item in raw]
    holidays.sort(key=lambda item: item["datum"])
    result = {
        "schemaVersion": 1,
        "region": "DE-BE",
        "jahre": sorted(years),
        "stand": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "quelle": {"name": "OpenHolidays API", "url": SOURCE_URL},
        "feiertage": holidays,
    }
    validate(result, years)
    write_atomic(result)
    print(f"✅ {len(holidays)} Berliner Feiertage für {min(years)}–{max(years)} validiert")


if __name__ == "__main__":
    main()
