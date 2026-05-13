#!/usr/bin/env python3
"""
fetch_union.py — API-Football via RapidAPI
Union Berlin: team=173, Bundesliga: league=78, season=2025
"""
 
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
 
# Key aus Env (GitHub Secret: RAPIDAPI_KEY)
API_KEY = os.environ.get("RAPIDAPI_KEY", "").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY ist leer oder nicht gesetzt", file=sys.stderr)
    print("  → Repo Settings → Secrets → RAPIDAPI_KEY anlegen", file=sys.stderr)
    sys.exit(1)
 
print(f"  Key geladen: {API_KEY[:6]}…{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST     = "api-football-v1.p.rapidapi.com"
BASE     = f"https://{HOST}/v3"
LEAGUE   = 78
SEASON   = 2025
UNION_ID = 173
OUT      = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
 
def fetch(path, retries=3):
    delays = [20, 40, 60]
    url = f"{BASE}{path}"
    headers = {
        "x-rapidapi-key":  API_KEY,
        "x-rapidapi-host": HOST,
        "Accept":          "application/json",
    }
    print(f"  GET {url}")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r:
                raw = r.read()
            d = json.loads(raw)
            if d.get("errors") and d["errors"]:
                raise ValueError(f"API errors: {d['errors']}")
            print(f"  → {len(d.get('response', []))} Einträge")
            return d["response"]
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:300]
            print(f"  HTTP {e.code}: {body}", file=sys.stderr)
            if e.code == 429 and attempt < retries - 1:
                print(f"  Rate limit – warte {delays[attempt]}s …")
                time.sleep(delays[attempt])
            else:
                raise
        except Exception as e:
            print(f"  Fehler: {e}", file=sys.stderr)
            if attempt < retries - 1:
                time.sleep(delays[attempt])
            else:
                raise
 
 
def shorten(name):
    for prefix, repl in [("Borussia ", "B. "), ("1. FC ", ""), ("FC ", ""),
                          ("VfB ", ""), ("VfL ", ""), ("TSG ", "")]:
        if name.startswith(prefix):
            return repl + name[len(prefix):]
    return name
 
 
def main():
    # ── Standings ──
    print("Hole Standings …")
    standings = fetch(f"/standings?league={LEAGUE}&season={SEASON}")
    if not standings:
        print("ERROR: Leere Standings-Response", file=sys.stderr); sys.exit(1)
 
    table = standings[0]["league"]["standings"][0]
    print(f"  {len(table)} Teams in Tabelle")
 
    union_row = next((r for r in table if r["team"]["id"] == UNION_ID), None)
    if not union_row:
        print(f"ERROR: Union (ID {UNION_ID}) nicht in Tabelle. Alle IDs:")
        for r in table:
            print(f"  {r['rank']}. {r['team']['name']}  id={r['team']['id']}")
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
 
    print(f"  Union: Platz {rank} · {pts} Pkt · {wins}S {draws}U {losses}N · Form: {form[-5:]}")
 
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
 
    # ── Fixtures ──
    print("Hole Fixtures …")
    fixtures = fetch(f"/fixtures?league={LEAGUE}&season={SEASON}&team={UNION_ID}")
    if not fixtures:
        print("WARN: Keine Fixtures", file=sys.stderr)
 
    done = sorted(
        [f for f in fixtures if f["fixture"]["status"]["short"] in ("FT","AET","PEN")],
        key=lambda f: f["fixture"]["date"]
    )
    todo = sorted(
        [f for f in fixtures if f["fixture"]["status"]["short"] in ("NS","TBD","PST")],
        key=lambda f: f["fixture"]["date"]
    )
    print(f"  {len(done)} beendet · {len(todo)} ausstehend")
 
    def parse(f, finished=True):
        home    = f["teams"]["home"]
        away    = f["teams"]["away"]
        gs      = f["goals"]
        is_home = home["id"] == UNION_ID
        # Spieltag-Nummer aus Round-String "Regular Season - 33"
        rnd = f["league"]["round"]
        mday = rnd.split(" - ")[-1] if " - " in rnd else rnd
        obj = {
            "matchday":   mday,
            "date":       f["fixture"]["date"],
            "home_name":  home["name"],
            "away_name":  away["name"],
            "home_logo":  home["logo"],
            "away_logo":  away["logo"],
            "goals_home": gs["home"],
            "goals_away": gs["away"],
            "is_home":    is_home,
        }
        if finished and gs["home"] is not None and gs["away"] is not None:
            ug = gs["home"] if is_home else gs["away"]
            og = gs["away"] if is_home else gs["home"]
            obj["result"] = "W" if ug > og else "L" if ug < og else "D"
        return obj
 
    last = parse(done[-1]) if done else None
    nxt  = parse(todo[0], finished=False) if todo else None
 
    if last:
        print(f"  Letztes: {last['home_name']} {last['goals_home']}:{last['goals_away']} {last['away_name']} ({last.get('result','')})")
    if nxt:
        print(f"  Nächstes: {nxt['home_name']} vs {nxt['away_name']} am {nxt['date'][:10]}")
 
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
        "last_match":     last,
        "next_match":     nxt,
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    print(f"✅  data/union.json geschrieben")
 
 
if __name__ == "__main__":
    main()
