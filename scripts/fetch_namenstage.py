#!/usr/bin/env python3
"""
fetch_namenstage.py
Holt alle deutschen Namenstage für das ganze Jahr und schreibt data/namenstage.json.
Eine bestehende vollständige Datei wird erst nach 366 erfolgreichen und
validierten V2-Antworten atomar ersetzt.

Quelle: nameday.abalin.net API (V2)
Fallback: Die letzte vollständig validierte lokale Datei bleibt erhalten.

GitHub Actions: monatlich und manuell
"""

import argparse
import calendar
import json
import os
import re
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'namenstage.json')

API_URL = "https://nameday.abalin.net/api/V2/date"


def normalize_names(value):
    if isinstance(value, str):
        raw = re.split(r"\s*,\s*", value)
    elif isinstance(value, list):
        raw = value
    else:
        return []
    names = []
    for item in raw:
        name = re.sub(r"[\x00-\x1f\x7f<>]", "", str(item)).strip().strip(".")
        if name and len(name) <= 80 and name not in names:
            names.append(name)
    return names[:20]


def parse_v2(payload):
    data = payload.get("data")
    candidates = []
    if isinstance(data, dict):
        candidates.extend([
            data.get("de"), data.get("name_de"),
            data.get("namedays", {}).get("de") if isinstance(data.get("namedays"), dict) else None,
        ])
    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            if str(item.get("country") or item.get("countryCode") or "").lower() == "de":
                candidates.extend([item.get("names"), item.get("name"), item.get("namedays")])
            namedays = item.get("namedays")
            if isinstance(namedays, dict):
                candidates.append(namedays.get("de"))
    namedays = payload.get("namedays")
    if isinstance(namedays, dict):
        candidates.append(namedays.get("de"))
    for candidate in candidates:
        names = normalize_names(candidate)
        if names:
            return names
    return []


def fetch_nameday_api(month, day, retries=2):
    url = f"{API_URL}?day={day}&month={month}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Paul-Hub-Namenstage/2.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}")
                names = parse_v2(json.loads(response.read().decode("utf-8")))
                if not names:
                    raise ValueError("keine deutschen Namen im V2-Schema")
                return names
        except Exception as error:
            if attempt == retries - 1:
                raise RuntimeError(f"API-Fehler {month:02d}-{day:02d}: {error}") from error
            time.sleep(2)


def expected_keys():
    return {
        f"{month:02d}-{day:02d}"
        for month in range(1, 13)
        for day in range(1, calendar.monthrange(2024, month)[1] + 1)
    }


def validate(result):
    if result.get("schemaVersion") != 2:
        raise ValueError("Ungültige Schema-Version")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", result.get("stand", "")):
        raise ValueError("Ungültiger Datenstand")
    source = result.get("quelle")
    if not isinstance(source, dict) or not str(source.get("url", "")).startswith("https://"):
        raise ValueError("Ungültige Quellenangabe")
    days = result.get("tage")
    if not isinstance(days, dict) or set(days) != expected_keys():
        raise ValueError("Es müssen genau 366 gültige Kalendertage vorliegen")
    for key, entry in days.items():
        if set(entry) != {"namen", "quelle"} or not normalize_names(entry["namen"]):
            raise ValueError(f"Ungültiger Eintrag bei {key}")
        if not isinstance(entry["quelle"], str) or not entry["quelle"].strip():
            raise ValueError(f"Quelle fehlt bei {key}")


def migrate_existing():
    with open(OUTPUT, encoding="utf-8") as file:
        current = json.load(file)
    if current.get("schemaVersion") == 2:
        validate(current)
        return current
    if set(current) != expected_keys():
        raise ValueError("Legacy-Datei ist nicht vollständig")
    result = {
        "schemaVersion": 2,
        "stand": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "quelle": {"name": "Redaktioneller Grundbestand", "url": "https://github.com/zkoberlin/zkoberlin.github.io/blob/main/data/namenstage.json", "version": "Bestand"},
        "tage": {
            key: {"namen": normalize_names(value), "quelle": "Redaktioneller Grundbestand"}
            for key, value in current.items()
        },
    }
    validate(result)
    return result


def fetch_complete_year():
    # Früher Verfügbarkeitscheck verhindert hunderte Timeouts bei einem Ausfall.
    probe = fetch_nameday_api(8, 27)
    days = {}
    for index, key in enumerate(sorted(expected_keys()), start=1):
        month, day = map(int, key.split("-"))
        names = probe if key == "08-27" else fetch_nameday_api(month, day)
        days[key] = {"namen": names, "quelle": "Abalin V2"}
        if index % 25 == 0:
            print(f"  {index}/366 validiert")
        time.sleep(0.1)
    result = {
        "schemaVersion": 2,
        "stand": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "quelle": {"name": "Nameday API", "url": "https://nameday.abalin.net/", "version": "V2"},
        "tage": days,
    }
    validate(result)
    return result


def write_atomic(result):
    output_dir = os.path.dirname(os.path.abspath(OUTPUT))
    os.makedirs(output_dir, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(prefix="namenstage-", suffix=".json", dir=output_dir)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(result, file, ensure_ascii=False, indent=2, sort_keys=True)
            file.write("\n")
        os.replace(temp_path, OUTPUT)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrate-only", action="store_true")
    args = parser.parse_args()
    result = migrate_existing() if args.migrate_only else fetch_complete_year()
    write_atomic(result)
    print(f"✅ {OUTPUT} geschrieben und vollständig validiert (366 Einträge)")


if __name__ == "__main__":
    main()
