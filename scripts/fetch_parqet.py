#!/usr/bin/env python3
"""
fetch_parqet.py
Holt Portfolio-Performance von der Parqet API (YTD) und schreibt /data/parqet.json.
Wird täglich via GitHub Actions ausgeführt.
Benötigt: PARQET_API_KEY als GitHub Secret (Bearer Token).
"""

import json
import os
import time
from datetime import date
from pathlib import Path

import requests

API_BASE = "https://api.parqet.com/v1"
API_KEY = os.environ.get("PARQET_API_KEY", "")

# Alle drei Portfolio-IDs
PORTFOLIO_IDS = [
    "661ec3e7cad561c43a2a7975",  # Langfrist-Depot
    "67c892721674cd9038500ba4",  # Krypto-Depot
    "67e11e70bc7df3db1df3d210",  # Trade-Depot
]

OUTPUT_PATH = Path(__file__).parent.parent / "data" / "parqet.json"


def fetch_with_retry(url: str, headers: dict, params: dict, max_retries: int = 3) -> dict:
    """Fetch mit Retry-Logik bei 429-Fehlern (20s / 40s / 60s)."""
    wait_times = [20, 40, 60]
    for attempt, wait in enumerate(wait_times[:max_retries], 1):
        r = requests.get(url, headers=headers, params=params, timeout=30)
        if r.status_code == 200:
            return r.json()
        if r.status_code == 429:
            print(f"[{attempt}/{max_retries}] Rate limit – warte {wait}s …")
            time.sleep(wait)
        else:
            r.raise_for_status()
    raise RuntimeError(f"API nach {max_retries} Versuchen nicht erreichbar.")


def main():
    if not API_KEY:
        raise EnvironmentError("PARQET_API_KEY ist nicht gesetzt.")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    # Aggregierte Performance aller Portfolios, YTD
    params = {
        "portfolioIds": ",".join(PORTFOLIO_IDS),
        "intervalType": "relative",
        "intervalValue": "ytd",
    }

    print("Hole Parqet Performance (YTD) …")
    data = fetch_with_retry(f"{API_BASE}/portfolios/performance", headers, params)

    perf = data.get("performance", {})

    result = {
        "updated": date.today().isoformat(),
        "gesamtwert": round(perf.get("valuation", {}).get("atIntervalEnd", 0), 2),
        "jahresstart": round(perf.get("valuation", {}).get("atIntervalStart", 0), 2),
        "ttwror_ytd": round(
            perf.get("kpis", {}).get("inInterval", {}).get("ttwror", 0), 2
        ),
        "dividenden_netto_ytd": round(
            perf.get("dividends", {}).get("inInterval", {}).get("gainNet", 0), 2
        ),
        "dividenden_brutto_ytd": round(
            perf.get("dividends", {}).get("inInterval", {}).get("gainGross", 0), 2
        ),
        "realisiert_ytd": round(
            perf.get("realizedGains", {}).get("inInterval", {}).get("gainGross", 0), 2
        ),
        "unrealisiert_ytd": round(
            perf.get("unrealizedGains", {}).get("inInterval", {}).get("gainGross", 0), 2
        ),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"✓ parqet.json geschrieben: {result}")


if __name__ == "__main__":
    main()
