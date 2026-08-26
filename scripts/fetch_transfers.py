#!/usr/bin/env python3
"""
fetch_transfers.py — Holt Union Berlin Transfers von RapidAPI
Schreibt das Ergebnis nach data/transfers.json

API-Response-Struktur (verifiziert):
  response.transfers[] mit Feldern:
    - name, playerId (camelCase!), position.label
    - toClubId / fromClubId → bestimmt Zugang (in) oder Abgang (out)
    - onLoan: true → Typ = loan
    - fee.value (in €), fee.feeText
    - transferDate
"""

import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from functools import cmp_to_key

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "").strip()
if not RAPIDAPI_KEY:
    raise SystemExit("RAPIDAPI_KEY ist nicht gesetzt")
TEAM_ID      = "8149"
TEAM_ID_INT  = 8149
BASE_URL     = "https://free-api-live-football-data.p.rapidapi.com"
HEADERS      = {
    "x-rapidapi-host": "free-api-live-football-data.p.rapidapi.com",
    "x-rapidapi-key":  RAPIDAPI_KEY,
    "Content-Type":    "application/json",
}
OUTPUT_PATH  = "data/transfers.json"
RETRY_WAITS  = [20, 40, 60]


def fotmob_club_logo(club_id):
    if not club_id:
        return ""
    return f"https://images.fotmob.com/image_resources/logo/teamlogo/{club_id}.png"

def fotmob_player_photo(player_id):
    if not player_id:
        return ""
    return f"https://images.fotmob.com/image_resources/playerimages/{player_id}.png"


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt, wait in enumerate(RETRY_WAITS, 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  429 — warte {wait}s (Versuch {attempt})")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"Alle Retries fehlgeschlagen: {url}")


def format_fee(fee):
    if not fee:
        return ""
    text  = fee.get("feeText", "").lower()
    value = fee.get("value")
    if "free" in text:
        return "Ablösefrei"
    if "loan" in text:
        return "Leihe"
    if "undisclosed" in text:
        return "Unbekannt"
    if value:
        m = value / 1_000_000
        if m >= 1:
            s = f"{m:.1f}".replace(".", ",")
            return f"{s} Mio. €"
        return f"{int(value/1000)} Tsd. €"
    return ""


def parse_transfers(raw):
    items = raw.get("response", {}).get("transfers", [])
    transfers = []
    for t in items:
        try:
            to_id   = t.get("toClubId")
            from_id = t.get("fromClubId")
            on_loan = t.get("onLoan", False)

            if on_loan:
                tr_type = "loan"
            elif to_id == TEAM_ID_INT:
                tr_type = "in"
            elif from_id == TEAM_ID_INT:
                tr_type = "out"
            else:
                print(f"  Skip: {t.get('name')} (kein Union-Transfer)")
                continue

            other_club    = t.get("fromClub", "") if tr_type in ("in", "loan") else t.get("toClub", "")
            other_club_id = from_id               if tr_type in ("in", "loan") else to_id

            pos = t.get("position")
            position_str = pos.get("label", "") if isinstance(pos, dict) else (pos or "")

            player_id = t.get("playerId")

            mv = t.get("marketValue")
            if mv and mv >= 1_000_000:
                mv_str = f"{mv/1_000_000:.1f}".replace(".", ",") + " Mio. €"
            elif mv:
                mv_str = f"{int(mv/1000)} Tsd. €"
            else:
                mv_str = ""

            transfers.append({
                "name":         t.get("name", ""),
                "player_id":    player_id,
                "photo_url":    fotmob_player_photo(player_id),
                "position":     position_str,
                "type":         tr_type,
                "club_name":    other_club,
                "club_logo":    fotmob_club_logo(other_club_id),
                "club_id":      other_club_id,
                "fee":          format_fee(t.get("fee")),
                "market_value": mv_str,
                "date":         t.get("transferDate", ""),
            })
        except Exception as ex:
            print(f"  Warnung ({t.get('name','?')}): {ex}")

    # Sortierung: in → loan → out, innerhalb nach Datum absteigend
    order = {"in": 0, "loan": 1, "out": 2}
    def cmp(a, b):
        if order[a["type"]] != order[b["type"]]:
            return order[a["type"]] - order[b["type"]]
        return (b["date"] > a["date"]) - (b["date"] < a["date"])
    transfers.sort(key=cmp_to_key(cmp))
    return transfers


def main():
    os.makedirs("data", exist_ok=True)
    print(f"[{datetime.now().isoformat()}] Fetching transfers (teamid={TEAM_ID}) …")
    url = f"{BASE_URL}/football-get-team-players-in-transfers?teamid={TEAM_ID}"
    raw = fetch_json(url)
    transfers = parse_transfers(raw)
    print(f"  {len(transfers)} Transfers geparst")

    output = {
        "transfers":  transfers,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "team_id":    TEAM_ID,
        "source":     "RapidAPI / free-api-live-football-data",
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  → {OUTPUT_PATH} geschrieben")
    for t in transfers:
        print(f"     [{t['type']:4}] {t['name']:25} | {t['club_name']:20} | {t['fee']}")


if __name__ == "__main__":
    main()
