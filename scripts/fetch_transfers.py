#!/usr/bin/env python3
"""
fetch_transfers.py — Holt Union Berlin Transfers von RapidAPI
Schreibt das Ergebnis nach data/transfers.json

Pipeline:
  1. GitHub Action ruft dieses Script täglich auf
  2. Script schreibt data/transfers.json
  3. index.html fetcht nur die lokale JSON (kein direkter API-Call im Browser)

Zeitfenster aktiv:
  - Offseason: kein next_match im union.json + last_match > 7 Tage alt
  - Neue Saison: next_match vorhanden + matchday <= 3
  → Das Script lauft immer, das HTML entscheidet ob es anzeigt
"""

import json
import os
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY", "bae1b274b8mshca821d4bf0f443ap1d55dajsn49af254f551d")
TEAM_ID = "8149"  # Union Berlin
BASE_URL = "https://free-api-live-football-data.p.rapidapi.com"
HEADERS = {
    "x-rapidapi-host": "free-api-live-football-data.p.rapidapi.com",
    "x-rapidapi-key": RAPIDAPI_KEY,
    "Content-Type": "application/json",
}
OUTPUT_PATH = "data/transfers.json"
RETRY_WAITS = [20, 40, 60]


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt, wait in enumerate(RETRY_WAITS, 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  429 Too Many Requests — warte {wait}s (Versuch {attempt})")
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"Alle Retry-Versuche für {url} fehlgeschlagen")


def normalize_transfer_type(raw_type: str) -> str:
    """Normalisiert API-Typen auf in / out / loan"""
    if not raw_type:
        return "in"
    rt = raw_type.lower()
    if "loan" in rt or "leihe" in rt:
        return "loan"
    if "out" in rt or "abgang" in rt or "sold" in rt or "left" in rt:
        return "out"
    return "in"


def build_transfers(raw_data: dict) -> list:
    """Extrahiert und normalisiert Transfers aus dem API-Response"""
    transfers = []

    # API gibt response.response.transfers oder response.transfers zurück
    items = (
        raw_data.get("response", {}).get("transfers")
        or raw_data.get("transfers")
        or raw_data.get("response", [])
        or []
    )

    # Fallback: manchmal ist response eine Liste von Spielern
    if isinstance(raw_data.get("response"), list):
        items = raw_data["response"]

    for item in items:
        try:
            # Spieler-Infos
            player = item.get("player", item)
            p_name = player.get("name", item.get("name", ""))
            p_id = player.get("id", item.get("id"))
            p_pos = player.get("position", "")

            # Transfer-Infos
            transfers_list = item.get("transfers", [item])
            for t in transfers_list:
                teams = t.get("teams", {})
                team_in = teams.get("in", {})
                team_out = teams.get("out", {})

                # Typ bestimmen
                raw_type = t.get("type", "")
                if not raw_type:
                    # Wenn Union der Zielverein (in): Zugang
                    if str(team_in.get("id", "")) == TEAM_ID or team_in.get("name", "").lower() in ["union berlin", "1. fc union berlin"]:
                        raw_type = "in"
                    else:
                        raw_type = "out"

                t_type = normalize_transfer_type(raw_type)

                # Anderer Verein
                if t_type == "in":
                    club = team_out
                elif t_type == "out":
                    club = team_in
                else:
                    club = team_in if str(team_out.get("id", "")) == TEAM_ID else team_out

                transfers.append({
                    "name": p_name,
                    "player_id": p_id,
                    "position": p_pos,
                    "type": t_type,
                    "club_name": club.get("name", ""),
                    "club_logo": club.get("logo", "") or club.get("photo", ""),
                    "fee": t.get("type", "") if t.get("type", "").lower() not in ["free", "loan", ""] else (
                        "Ablösefrei" if t.get("type", "").lower() == "free"
                        else ("Leihe" if t.get("type", "").lower() == "loan" else "")
                    ),
                    "date": t.get("date", ""),
                })
        except Exception as ex:
            print(f"  Warnung: Konnte Transfer nicht parsen: {ex}")
            continue

    return transfers


def main():
    os.makedirs("data", exist_ok=True)

    print(f"[{datetime.now().isoformat()}] Fetching Union Berlin transfers (teamid={TEAM_ID}) …")

    url = f"{BASE_URL}/football-get-team-players-in-transfers?teamid={TEAM_ID}"
    print(f"  GET {url}")
    raw = fetch_json(url)

    transfers = build_transfers(raw)
    print(f"  {len(transfers)} Transfers gefunden")

    # Sortierung: Zugänge zuerst, dann Abgänge, dann Leihen
    order = {"in": 0, "out": 1, "loan": 2}
    transfers.sort(key=lambda t: order.get(t["type"], 3))

    output = {
        "transfers": transfers,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "team_id": TEAM_ID,
        "source": "RapidAPI / free-api-live-football-data",
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  → {OUTPUT_PATH} geschrieben ({len(transfers)} Einträge)")


if __name__ == "__main__":
    main()
