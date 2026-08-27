"""Migriert und validiert die statischen Tageshinweise auf Schema v2."""

import json
import re
from datetime import date
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "special-days.json"
UN_SOURCE = "https://www.un.org/en/observances/list-days-weeks"

UN_KEYS = {
    "02-04", "02-20", "02-21", "03-03", "03-08", "03-20", "03-21",
    "03-22", "03-23", "04-02", "04-07", "04-22", "04-23", "05-03",
    "05-15", "05-21", "05-22", "05-31", "06-05", "06-08", "06-20",
    "06-23", "06-25", "06-26", "07-11", "07-30", "08-09", "08-12",
    "08-19", "08-23", "09-05", "09-08", "09-15", "09-16", "09-21",
    "09-27", "09-30", "10-01", "10-02", "10-05", "10-10", "10-11",
    "10-15", "10-16", "10-17", "10-24", "11-14", "11-16", "11-19",
    "11-20", "11-25", "12-01", "12-03", "12-05", "12-10", "12-18",
}

USA_HINTS = (
    "nationaler ", "nationale ", "nationales ", "day", "fun at work",
    "no socks", "backward", "groundhog", "flag day", "juneteenth",
)


def split_display(value):
    match = re.match(r"^(\S+)\s+(.+)$", value.strip())
    return (match.group(1), match.group(2)) if match else ("📅", value.strip())


def migrate(raw):
    if raw.get("schemaVersion") == 2:
        result = raw
    else:
        days = {}
        for key, value in raw.items():
            emoji, title = split_display(value)
            lower = title.lower()
            if key in UN_KEYS:
                category, region, source = "offizieller Aktionstag", "International", UN_SOURCE
            elif any(hint in lower for hint in USA_HINTS):
                category, region, source = "Kalenderfundstück", "USA", None
            elif any(word in lower for word in ("welt", "international")):
                category, region, source = "Aktionstag", "International", None
            else:
                category, region, source = "Kalenderfundstück", "Verschiedene", None
            days[key] = {
                "emoji": emoji,
                "titel": title,
                "kategorie": category,
                "region": region,
                "quelle": source,
            }
        result = {
            "schemaVersion": 2,
            "stand": date.today().isoformat(),
            "tage": days,
        }

    corrections = {
        "02-22": {
            "emoji": "⚜️", "titel": "Thinking Day der Pfadfinderinnen",
            "kategorie": "Aktionstag", "region": "International", "quelle": None,
        },
        "03-25": {
            "emoji": "🧇", "titel": "Våffeldagen – schwedischer Waffeltag",
            "kategorie": "Kalenderfundstück", "region": "Schweden", "quelle": None,
        },
        "05-26": {
            "emoji": "✈️", "titel": "Papierflieger-Tag",
            "kategorie": "Kalenderfundstück", "region": "USA", "quelle": None,
        },
        "05-28": {
            "emoji": "🍔", "titel": "National Hamburger Day",
            "kategorie": "Kalenderfundstück", "region": "USA", "quelle": None,
        },
        "08-08": {
            "emoji": "🐱", "titel": "Internationaler Katzentag",
            "kategorie": "Aktionstag", "region": "International", "quelle": None,
        },
        "08-24": {
            "emoji": "🧇", "titel": "National Waffle Day",
            "kategorie": "Kalenderfundstück", "region": "USA", "quelle": None,
        },
        # Muttertag ist beweglich und wird im Frontend berechnet.
        "05-10": {
        "emoji": "🎗️",
        "titel": "Welt-Lupus-Tag",
        "kategorie": "Aktionstag",
        "region": "International",
        "quelle": "https://worldlupusday.org/",
        },
    }
    result["tage"].update(corrections)
    result["stand"] = date.today().isoformat()
    return result


def validate(data):
    if data.get("schemaVersion") != 2 or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", data.get("stand", "")):
        raise ValueError("Metadaten des Tageshinweis-Datensatzes sind ungültig")
    days = data.get("tage")
    if not isinstance(days, dict) or len(days) != 365:
        raise ValueError("Der Datensatz muss genau 365 feste Kalendertage enthalten")
    expected = {
        f"{month:02d}-{day:02d}"
        for month in range(1, 13)
        for day in range(1, 32)
        if not (month == 2 and day == 29)
        and _valid_day(month, day)
    }
    if set(days) != expected:
        raise ValueError("Kalendertage fehlen oder sind ungültig")
    for key, entry in days.items():
        if set(entry) != {"emoji", "titel", "kategorie", "region", "quelle"}:
            raise ValueError(f"Ungültiges Schema bei {key}")
        for field in ("emoji", "titel", "kategorie", "region"):
            if not isinstance(entry[field], str) or not entry[field].strip():
                raise ValueError(f"Leeres Feld {field} bei {key}")
        if entry["quelle"] is not None and not str(entry["quelle"]).startswith("https://"):
            raise ValueError(f"Ungültige Quelle bei {key}")


def _valid_day(month, day):
    try:
        date(2025, month, day)
        return True
    except ValueError:
        return False


def main():
    raw = json.loads(PATH.read_text(encoding="utf-8"))
    result = migrate(raw)
    validate(result)
    PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Tageshinweise Schema v2 validiert: {len(result['tage'])} Einträge")


if __name__ == "__main__":
    main()
