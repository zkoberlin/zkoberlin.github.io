#!/usr/bin/env python3
"""
fetch_union.py
Holt 1. FC Union Berlin Daten von OpenLiga DB API (kostenlos, keine Auth)
und schreibt das Ergebnis nach data/union.json
 
API: https://api.openligadb.de
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
SEASON = "2025"
UNION_TEAM_ID = 89
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
LOGO_MAP = {
    9: 16, 7: 27, 14: 15, 16: 31, 22: 11, 13: 18, 6: 40, 131: 33,
    100: 23, 85: 134, 54: 533, 65: 36, 91: 50, 40: 26, 1: 3,
    39: 39, 55: 44, 43: 52, 89: 89,
}
 
 
def fetch(url, retries=3):
    delays = [20, 40, 60]
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "union-dashboard/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                print(f"  429 – warte {delays[attempt]}s …", file=sys.stderr)
                time.sleep(delays[attempt])
            else:
                raise
    return None
 
 
def gk(obj, *keys):
    """Holt Wert robust über camelCase und PascalCase."""
    for k in keys:
        if k in obj:
            return obj[k]
    return None
 
 
def team_id(t):
    return gk(t, "teamInfoId", "TeamInfoId", "teamId", "TeamId") or 0
 
 
def team_name(t):
    return gk(t, "teamName", "TeamName") or gk(t, "shortName", "ShortName") or "?"
 
 
def main():
    print("Hole Tabelle …")
    table = fetch(f"{BASE}/getbltable/{LEAGUE}/{SEASON}")
    if not table:
        print("ERROR: Keine Tabellendaten", file=sys.stderr); sys.exit(1)
 
    print(f"  Keys: {list(table[0].keys())}")
 
    union_row = next((t for t in table if team_id(t) == UNION_TEAM_ID), None)
    if not union_row:
        union_row = next((t for t in table if "union" in team_name(t).lower()), None)
    if not union_row:
        print("ERROR: Union Berlin nicht in Tabelle gefunden", file=sys.stderr)
        for t in table: print(f"  id={team_id(t)} name={team_name(t)}", file=sys.stderr)
        sys.exit(1)
 
    rank = next((i + 1 for i, t in enumerate(table) if team_id(t) == team_id(union_row)), None)
 
    context = []
    for i, t in enumerate(table):
        pos = i + 1
        if abs(pos - rank) <= 2:
            tid = team_id(t)
            context.append({
                "rank": pos,
                "name": team_name(t),
                "shortname": gk(t, "shortName", "ShortName") or "",
                "points": gk(t, "points", "Points") or 0,
                "team_id": tid,
                "logo_id": LOGO_MAP.get(tid, tid),
            })
 
    print("Hole Spielplan …")
    matches = fetch(f"{BASE}/getmatchdata/{LEAGUE}/{SEASON}")
    if not matches:
        print("ERROR: Keine Spieldaten", file=sys.stderr); sys.exit(1)
 
    print(f"  Match-Keys: {list(matches[0].keys())}")
 
    def finished(m): return gk(m, "matchIsFinished", "MatchIsFinished") or False
    def t1id(m): return team_id(gk(m, "team1", "Team1") or {})
    def t2id(m): return team_id(gk(m, "team2", "Team2") or {})
    def t1name(m): return team_name(gk(m, "team1", "Team1") or {})
    def t2name(m): return team_name(gk(m, "team2", "Team2") or {})
    def mdate(m): return gk(m, "matchDateTimeUTC", "MatchDateTimeUTC", "matchDateTime", "MatchDateTime") or ""
    def mday(m):
        g = gk(m, "group", "Group") or {}
        return gk(g, "groupOrderID", "GroupOrderID") or 0
    def involves_u(m): return t1id(m) == UNION_TEAM_ID or t2id(m) == UNION_TEAM_ID
 
    fin = sorted([m for m in matches if finished(m) and involves_u(m)], key=mdate)
    upc = sorted([m for m in matches if not finished(m) and involves_u(m)], key=mdate)
 
    def parse_match(m):
        if not m: return None
        results = gk(m, "matchResults", "MatchResults") or []
        final = next((r for r in results if gk(r, "resultTypeID", "ResultTypeID") == 2), None)
        return {
            "home_id": t1id(m), "away_id": t2id(m),
            "home_name": t1name(m), "away_name": t2name(m),
            "home_logo_id": LOGO_MAP.get(t1id(m), t1id(m)),
            "away_logo_id": LOGO_MAP.get(t2id(m), t2id(m)),
            "goals_home": gk(final, "pointsTeam1", "PointsTeam1") if final else None,
            "goals_away": gk(final, "pointsTeam2", "PointsTeam2") if final else None,
            "date": mdate(m),
            "matchday": mday(m),
        }
 
    form = []
    for m in fin[-5:]:
        is_t1 = t1id(m) == UNION_TEAM_ID
        results = gk(m, "matchResults", "MatchResults") or []
        final = next((r for r in results if gk(r, "resultTypeID", "ResultTypeID") == 2), None)
        if final:
            gh = gk(final, "pointsTeam1", "PointsTeam1") or 0
            ga = gk(final, "pointsTeam2", "PointsTeam2") or 0
            ug, og = (gh, ga) if is_t1 else (ga, gh)
            form.append("W" if ug > og else "D" if ug == og else "L")
 
    wins   = gk(union_row, "won", "Won") or 0
    draws  = gk(union_row, "draw", "Draw") or 0
    losses = gk(union_row, "lost", "Lost") or 0
    played = wins + draws + losses
 
    result = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "league": "Bundesliga",
        "season": "2025/26",
        "matchday": played,
        "rank": rank,
        "points": gk(union_row, "points", "Points") or 0,
        "matches_played": played,
        "wins": wins, "draws": draws, "losses": losses,
        "goals_for": gk(union_row, "goals", "Goals") or 0,
        "goals_against": gk(union_row, "opponentGoals", "OpponentGoals") or 0,
        "form": form,
        "table_context": context,
        "last_match": parse_match(fin[-1] if fin else None),
        "next_match": parse_match(upc[0] if upc else None),
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUTPUT_PATH)), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
 
    print(f"✅  Platz {rank} · {result['points']} Punkte · Form: {form}")
 
 
if __name__ == "__main__":
    main()
