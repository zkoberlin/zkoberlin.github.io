#!/usr/bin/env python3
"""
Holt die Reisedaten vom Reiselogger-Worker (Cloud-Sync-Backend von WELTLOG,
https://zkoberlin.github.io/reiselogger/) und aggregiert sie zu den Kennzahlen
fuer die Dashboard-Kachel. Schreibt das Ergebnis nach data/reiselog.json.

Die Aggregation spiegelt exakt die aggregate()-Funktion in reiselogger/index.html:
- totalKm  = Summe aus outDistanceKm + (returnDistanceKm falls direction=='roundtrip')
- countries/cities = eindeutige Werte ueber alle Reisen
- yearStart = Jahr der fruehesten dateFrom, yearEnd = aktuelles Jahr ("bisher")

Benoetigte Umgebungsvariablen (siehe .github/workflows/reiselog.yml):
  REISELOG_WORKER_URL  - Basis-URL des Cloudflare Workers, z.B. https://weltlog-sync.xxx.workers.dev
  REISELOG_TOKEN        - Bearer-Token (als GitHub Actions Secret hinterlegen, NIE im Klartext committen)
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

WORKER_URL = os.environ.get("REISELOG_WORKER_URL", "").rstrip("/")
TOKEN = os.environ.get("REISELOG_TOKEN", "")
OUT_PATH = "data/reiselog.json"
EARTH_CIRCUMFERENCE_KM = 40075  # Erdumfang am Aequator, wie in reiselogger/index.html


def fetch_trips():
    if not WORKER_URL or not TOKEN:
        raise RuntimeError(
            "REISELOG_WORKER_URL oder REISELOG_TOKEN fehlt (GitHub Secrets pruefen)."
        )
    req = urllib.request.Request(
        WORKER_URL + "/api/trips",
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    delays = [0, 20, 40, 60]  # Retry-Logik bei 429, wie im Pipeline-Standardpattern
    last_err = None
    for delay in delays:
        if delay:
            print(f"429 erhalten, warte {delay}s …")
            time.sleep(delay)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code != 429:
                raise
        except urllib.error.URLError as e:
            last_err = e
            raise
    raise last_err


def trip_out(t):
    return t.get("outDistanceKm") or 0


def trip_return(t):
    return (t.get("returnDistanceKm") or 0) if t.get("direction") == "roundtrip" else 0


def aggregate(trips):
    total_km = 0
    countries = set()
    cities = set()
    date_froms = []

    for t in trips:
        total_km += trip_out(t) + trip_return(t)
        country = (t.get("country") or "").strip()
        city = (t.get("city") or "").strip()
        if country:
            countries.add(country)
        if city:
            cities.add((city, country))
        if t.get("dateFrom"):
            date_froms.append(t["dateFrom"])

    year_start = min(d[:4] for d in date_froms) if date_froms else None
    year_end = str(datetime.now(timezone.utc).year)  # "bisher" = bis heute

    return {
        "totalKm": round(total_km),
        "countries": len(countries),
        "cities": len(cities),
        "trips": len(trips),
        "earthLaps": round(total_km / EARTH_CIRCUMFERENCE_KM, 2),
        "yearStart": year_start,
        "yearEnd": year_end,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    try:
        trips = fetch_trips()
    except Exception as e:
        print(f"Fehler beim Abrufen der Reisedaten: {e}", file=sys.stderr)
        # Bei Fehler: bestehende JSON NICHT ueberschreiben, Kachel bleibt beim letzten Stand
        if os.path.exists(OUT_PATH):
            print("Bestehende data/reiselog.json bleibt unveraendert.")
            sys.exit(0)
        sys.exit(1)

    stats = aggregate(trips)
    os.makedirs("data", exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print("Geschrieben:", stats)


if __name__ == "__main__":
    main()
