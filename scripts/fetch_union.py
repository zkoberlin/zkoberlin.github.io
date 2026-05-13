#!/usr/bin/env python3
"""
fetch_union.py
Holt 1. FC Union Berlin Daten von OpenLiga DB API (kostenlos, keine Auth)
und schreibt das Ergebnis nach data/union.json

API Docs: https://www.openligadb.de
Union Berlin Team-ID: 89 (OpenLiga)
Bundesliga ShortName: "bl1"
Aktuelle Saison: "2024" (= Saison 2024/25)
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE = "https://api.openligadb.de"
LEAGUE = "bl1"
SEASON = "2024"   # OpenLiga nutzt Startjahr der Saison
UNION_TEAM_ID = 89  # Union Berlin OpenLiga-ID
UNION_LOGO_ID = 89  # Transfermarkt-ID für Logo (tmssl.akamaized.net)
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")

# Transfermarkt Logo-IDs für Bundesliga-Teams (OpenLiga team_id → tmsl ID)
LOGO_MAP = {
    9:   16,    # Bayern München
    7:   27,    # Dortmund
    14:  15,    # Leverkusen
    16:  31,    # Stuttart VfB
    22:  11,    # RB Leipzig
    13:  18,    # Mönchengladbach
    6:   40,    # Frankfurt
    131: 33,    # Freiburg
    100: 23,    # Hamburger SV
    85:  134,   # Heidenheim
    54:  533,   # Hoffenheim
    65:  36,    # Werder Bremen
    91:  50,    # Wolfsburg
    40:  26,    # Augsburg
    1:   3,     # Köln
    39:  39,    # Mainz
    55:  44,    # Bochum
    43:  52,    # St. Pauli
    167: 167,   # Augsburg (alt)
    89:  89,    # Union Berlin
}


def fetch(url, retries=3):
    """HTTP GET mit Retry-Logik bei 429."""
    delays = [20, 40, 60]
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "union-dashboard/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                wait = delays[attempt]
                print(f"  429 Rate limit – warte {wait}s …", file=sys.stderr)
                time.sleep(wait)
            else:
                raise
    return None


def main():
    print("Hole Tabelle …")
    table = fetch(f"{BASE}/getbltable/{LEAGUE}/{SEASON}")

    union_row = next((t for t in table if t["TeamInfoId"] == UNION_TEAM_ID), None)
    if not union_row:
        print("ERROR: Union Berlin nicht in Tabelle gefunden", file=sys.stderr)
        sys.exit(1)

    rank = next((i + 1 for i, t in enumerate(table) if t["TeamInfoId"] == UNION_TEAM_ID), None)

    # Tabellenumfeld: 2 Teams above + Union + 2 below (max)
    context = []
    for i, t in enumerate(table):
        pos = i + 1
        if abs(pos - rank) <= 2:
            tid = t["TeamInfoId"]
            context.append({
                "rank": pos,
                "name": t["TeamName"],
                "shortname": t.get("ShortName", ""),
                "points": t["Points"],
                "team_id": tid,
                "logo_id": LOGO_MAP.get(tid, tid),
            })

    print("Hole Spielplan …")
    matches = fetch(f"{BASE}/getmatchdata/{LEAGUE}/{SEASON}")

    now = datetime.now(timezone.utc)
    finished = [m for m in matches if m.get("MatchIsFinished")]
    upcoming = [m for m in matches if not m.get("MatchIsFinished")]

    # Last match involving Union
    union_finished = [
        m for m in finished
        if m["Team1"]["TeamId"] == UNION_TEAM_ID or m["Team2"]["TeamId"] == UNION_TEAM_ID
    ]
    union_finished.sort(key=lambda m: m.get("MatchDateTimeUTC", ""), reverse=True)
    last = union_finished[0] if union_finished else None

    # Next match involving Union
    union_upcoming = [
        m for m in upcoming
        if m["Team1"]["TeamId"] == UNION_TEAM_ID or m["Team2"]["TeamId"] == UNION_TEAM_ID
    ]
    union_upcoming.sort(key=lambda m: m.get("MatchDateTimeUTC", ""))
    nxt = union_upcoming[0] if union_upcoming else None

    def parse_match(m):
        if not m:
            return None
        t1id = m["Team1"]["TeamId"]
        t2id = m["Team2"]["TeamId"]
        g = m.get("Goals", [])
        score = m.get("MatchResults", [])
        # Use final result if available
        final = next((r for r in score if r.get("ResultTypeID") == 2), None)
        g_home = final["PointsTeam1"] if final else None
        g_away = final["PointsTeam2"] if final else None
        return {
            "home_id": t1id,
            "away_id": t2id,
            "home_name": m["Team1"]["TeamName"],
            "away_name": m["Team2"]["TeamName"],
            "home_logo_id": LOGO_MAP.get(t1id, t1id),
            "away_logo_id": LOGO_MAP.get(t2id, t2id),
            "goals_home": g_home,
            "goals_away": g_away,
            "date": m.get("MatchDateTimeUTC"),
            "matchday": m.get("Group", {}).get("GroupOrderID"),
        }

    # Form: last 5 Union matches (W/D/L)
    form = []
    for m in union_finished[-5:]:
        t1 = m["Team1"]["TeamId"] == UNION_TEAM_ID
        score = m.get("MatchResults", [])
        final = next((r for r in score if r.get("ResultTypeID") == 2), None)
        if final:
            gh = final["PointsTeam1"]
            ga = final["PointsTeam2"]
            union_goals = gh if t1 else ga
            opp_goals = ga if t1 else gh
            form.append("W" if union_goals > opp_goals else "D" if union_goals == opp_goals else "L")

    matchday = union_row.get("Won", 0) + union_row.get("Draw", 0) + union_row.get("Lost", 0)

    result = {
        "updated_at": now.isoformat(),
        "league": "Bundesliga",
        "season": "2024/25",
        "matchday": matchday,
        "rank": rank,
        "points": union_row["Points"],
        "matches_played": matchday,
        "wins": union_row.get("Won", 0),
        "draws": union_row.get("Draw", 0),
        "losses": union_row.get("Lost", 0),
        "goals_for": union_row.get("Goals", 0),
        "goals_against": union_row.get("OpponentGoals", 0),
        "form": form,
        "table_context": context,
        "last_match": parse_match(last),
        "next_match": parse_match(nxt),
    }

    os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_PATH)), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅  data/union.json geschrieben · Platz {rank} · {union_row['Points']} Punkte")


if __name__ == "__main__":
    main()
