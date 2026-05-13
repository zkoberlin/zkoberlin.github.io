#!/usr/bin/env python3
"""
fetch_union.py
Holt 1. FC Union Berlin Daten von API-Football (via RapidAPI)
und schreibt data/union.json

API: https://api-football-v1.p.rapidapi.com/v3/
Union Berlin: team=173, Bundesliga: league=78, Saison: season=2025
Requests: 2 pro Tag (standings + fixtures) — Free Tier: 100/Tag
"""

import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone

API_KEY  = os.environ["RAPIDAPI_KEY"]   # GitHub Secret
HOST     = "api-football-v1.p.rapidapi.com"
BASE     = f"https://{HOST}/v3"
LEAGUE   = 78    # Bundesliga
SEASON   = 2025  # Saison 2025/26
UNION_ID = 173   # 1. FC Union Berlin
OUT      = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")

HEADERS = {
    "x-rapidapi-key":  API_KEY,
    "x-rapidapi-host": HOST,
}


def fetch(path, retries=3):
    delays = [20, 40, 60]
    for attempt in range(retries):
        try:
            req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as r:
                d = json.loads(r.read())
            if d.get("errors"):
                raise ValueError(f"API error: {d['errors']}")
            return d["response"]
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                print(f"  429 – warte {delays[attempt]}s …", file=sys.stderr)
                time.sleep(delays[attempt])
            else:
                raise


def shorten(name):
    for prefix in ["1. FC ", "FC ", "Borussia ", "VfB ", "VfL ", "TSG "]:
        if name.startswith(prefix):
            short = name[len(prefix):]
            return ("B. " if prefix == "Borussia " else "") + short
    return name


def main():
    # 1. Standings
    print("Hole Standings …")
    standings = fetch(f"/standings?league={LEAGUE}&season={SEASON}")
    if not standings:
        print("ERROR: Keine Standings", file=sys.stderr); sys.exit(1)

    table = standings[0]["league"]["standings"][0]
    print(f"  {len(table)} Teams")

    union_row = next((r for r in table if r["team"]["id"] == UNION_ID), None)
    if not union_row:
        print(f"ERROR: Union (ID {UNION_ID}) nicht gefunden. Teams:", file=sys.stderr)
        for r in table:
            print(f"  {r['rank']}. {r['team']['name']} id={r['team']['id']}", file=sys.stderr)
        sys.exit(1)

    rank   = union_row["rank"]
    pts    = union_row["points"]
    wins   = union_row["all"]["win"]
    draws  = union_row["all"]["draw"]
    losses = union_row["all"]["lose"]
    played = union_row["all"]["played"]
    gf     = union_row["all"]["goals"]["for"]
    ga     = union_row["all"]["goals"]["against"]
    form   = union_row.get("form", "")

    print(f"  Platz {rank} · {pts} Pkt · Form: {form[-5:]}")

    # Tabellenumfeld ±2
    context = []
    for r in table:
        if abs(r["rank"] - rank) <= 2:
            context.append({
                "rank":     r["rank"],
                "name":     shorten(r["team"]["name"]),
                "logo":     r["team"]["logo"],
                "points":   r["points"],
                "is_union": r["team"]["id"] == UNION_ID,
            })

    # 2. Fixtures
    print("Hole Fixtures …")
    fixtures = fetch(f"/fixtures?league={LEAGUE}&season={SEASON}&team={UNION_ID}")
    print(f"  {len(fixtures)} Spiele")

    done = [f for f in fixtures if f["fixture"]["status"]["short"] in ("FT","AET","PEN")]
    todo = [f for f in fixtures if f["fixture"]["status"]["short"] in ("NS","TBD","PST")]
    done.sort(key=lambda f: f["fixture"]["date"])
    todo.sort(key=lambda f: f["fixture"]["date"])

    def parse(f, finished=True):
        home = f["teams"]["home"]
        away = f["teams"]["away"]
        gs   = f["goals"]
        is_home = home["id"] == UNION_ID
        obj = {
            "matchday":   f["league"]["round"].split(" - ")[-1],
            "date":       f["fixture"]["date"],
            "home_name":  home["name"],
            "away_name":  away["name"],
            "home_logo":  home["logo"],
            "away_logo":  away["logo"],
            "goals_home": gs["home"],
            "goals_away": gs["away"],
            "is_home":    is_home,
        }
        if finished:
            ug = gs["home"] if is_home else gs["away"]
            og = gs["away"] if is_home else gs["home"]
            obj["result"] = "W" if ug > og else "L" if ug < og else "D"
        return obj

    result = {
        "updated_at":     datetime.now(timezone.utc).isoformat(),
        "league":         "Bundesliga",
        "season":         "2025/26",
        "matchday":       played,
        "rank":           rank,
        "points":         pts,
        "matches_played": played,
        "wins":           wins,
        "draws":          draws,
        "losses":         losses,
        "goals_for":      gf,
        "goals_against":  ga,
        "form":           form,
        "table_context":  context,
        "last_match":     parse(done[-1]) if done else None,
        "next_match":     parse(todo[0], finished=False) if todo else None,
    }

    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)

    lm = result["last_match"]
    print(f"✅  Geschrieben · letztes Spiel: {lm and lm['home_name']} {lm and lm['goals_home']}:{lm and lm['goals_away']} {lm and lm['away_name']}")


if __name__ == "__main__":
    main()
