#!/usr/bin/env python3
"""Erstellt eine vollständig validierte Berliner Schulferiendatei."""

import json
import os
import re
import tempfile
import time
import urllib.request
from datetime import date, datetime, timezone

OUTPUT = "data/schulferien_berlin.json"
BASE_URL = "https://openholidaysapi.org/SchoolHolidays"
SOURCE_URL = "https://www.openholidaysapi.org/en/"
EXPECTED_KINDS = {"Winterferien", "Osterferien", "Sommerferien", "Herbstferien", "Weihnachtsferien"}


def fetch_period(start_year, end_year, retries=3):
    url = (
        f"{BASE_URL}?countryIsoCode=DE&subdivisionCode=DE-BE&languageIsoCode=DE"
        f"&validFrom={start_year}-01-01&validTo={end_year}-12-31"
    )
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={
                "Accept": "application/json",
                "User-Agent": "Paul-Hub-Schulferien/1.0",
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
    name = localized_name(entry)
    start = str(entry.get("startDate", ""))[:10]
    end = str(entry.get("endDate", ""))[:10]
    if not name or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", start) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", end):
        raise ValueError(f"Ungültiger Ferieneintrag: {entry}")
    start_date, end_date = date.fromisoformat(start), date.fromisoformat(end)
    if start_date > end_date or not ({start_date.year, end_date.year} & years):
        raise ValueError(f"Unplausibler Ferienzeitraum: {entry}")
    return {"name": name, "start": start, "end": end, "quelleId": str(entry.get("id", ""))}


def validate(result, years):
    if result.get("schemaVersion") != 1 or result.get("region") != "DE-BE":
        raise ValueError("Ungültiges Schulferien-Schema oder Region")
    if result.get("jahre") != sorted(years):
        raise ValueError("Ungültiger Schulferien-Zeitraum")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", result.get("stand", "")):
        raise ValueError("Ungültiger Datenstand")
    source = result.get("quelle")
    if not isinstance(source, dict) or not str(source.get("url", "")).startswith("https://"):
        raise ValueError("Ungültige Quelle")
    holidays = result.get("ferien")
    if not isinstance(holidays, list) or len(holidays) < 12 or len(holidays) > 24:
        raise ValueError("Schulferiendatei ist unvollständig oder unplausibel")
    seen = set()
    for item in holidays:
        if set(item) != {"name", "start", "end", "quelleId"} or not item["quelleId"]:
            raise ValueError("Ungültiger Schulferieneintrag")
        key = (item["name"], item["start"], item["end"])
        if key in seen:
            raise ValueError("Doppelter Schulferieneintrag")
        seen.add(key)
    for year in years:
        year_start, year_end = date(year, 1, 1), date(year, 12, 31)
        annual = [
            item for item in holidays
            if date.fromisoformat(item["start"]) <= year_end
            and date.fromisoformat(item["end"]) >= year_start
        ]
        names = {item["name"] for item in annual}
        if len(annual) < 6 or not EXPECTED_KINDS.issubset(names):
            raise ValueError(f"Schulferienjahr {year} ist unvollständig")


def write_atomic(result):
    output_dir = os.path.dirname(os.path.abspath(OUTPUT))
    os.makedirs(output_dir, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="schulferien-", suffix=".json", dir=output_dir)
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
    entries = [parse_entry(item, years) for item in raw]
    entries.sort(key=lambda item: (item["start"], item["end"], item["name"]))
    result = {
        "schemaVersion": 1,
        "region": "DE-BE",
        "jahre": sorted(years),
        "stand": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "quelle": {"name": "OpenHolidays API", "url": SOURCE_URL},
        "ferien": entries,
    }
    validate(result, years)
    write_atomic(result)
    print(f"✅ {len(entries)} Berliner Schulferien für {min(years)}–{max(years)} validiert")


if __name__ == "__main__":
    main()
