#!/usr/bin/env python3
"""
fetch_union.py v4.8.1 — Free API Live Football Data (RapidAPI)
Endpoints:
  /football-get-standing-all?leagueid=54
  /football-get-all-matches-by-league?leagueid=54
  /football-team-logo?teamid={union_id}
  /football-get-top-players-by-goals?leagueid=54
  /football-get-top-players-by-assists?leagueid=54
  /football-get-match-all-stats?eventid={last_event_id}
"""
 
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
 
API_KEY = os.environ.get("RAPIDAPI_KEY", "").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY nicht gesetzt", file=sys.stderr); sys.exit(1)
print(f"  Key: {API_KEY[:6]}…{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST   = "free-api-live-football-data.p.rapidapi.com"
BASE   = f"https://{HOST}"
LEAGUE = 54
OUT    = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
LOGO_MAP = {
    "Bayern": 16, "Dortmund": 27, "Leverkusen": 15, "Stuttgart": 31,
    "Leipzig": 23, "Frankfurt": 40, "Freiburg": 33, "Hamburg": 23,
    "Heidenheim": 134, "Hoffenheim": 533, "Werder": 36, "Wolfsburg": 50,
    "Köln": 3, "Mainz": 39, "Bochum": 44, "Pauli": 52,
    "Gladbach": 18, "Mönchengladbach": 18, "Augsburg": 167, "Union": 89,
}
 
def tmsl(name):
    for k, tid in LOGO_MAP.items():
        if k.lower() in name.lower():
            return f"https://tmssl.akamaized.net/images/wappen/head/{tid}.png"
    return ""
 
def shorten(name):
    for prefix, repl in [("Borussia ", "B. "), ("1. FC ", ""), ("FC ", ""),
                          ("VfB ", ""), ("VfL ", ""), ("TSG ", ""), ("SV ", "")]:
        if name.startswith(prefix):
            return repl + name[len(prefix):]
    return name
 
def fetch(path, retries=3):
    delays = [20, 40, 60]
    url  = f"{BASE}{path}"
    hdrs = {"x-rapidapi-key": API_KEY, "x-rapidapi-host": HOST, "Accept": "application/json"}
    print(f"  GET …{path[:70]}")
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=15) as r:
                d = json.loads(r.read())
            if d.get("status") != "success":
                raise ValueError(f"status={d.get('status')}: {str(d)[:200]}")
            return d["response"]
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")[:200]
            print(f"  HTTP {e.code}: {body}", file=sys.stderr)
            if e.code == 429 and attempt < retries - 1:
                print(f"  Rate limit – warte {delays[attempt]}s …")
                time.sleep(delays[attempt])
            else:
                raise
        except Exception as e:
            print(f"  Attempt {attempt+1} Fehler: {e}", file=sys.stderr)
            if attempt < retries - 1:
                time.sleep(delays[attempt])
            else:
                raise
 
 
def parse_match_stats(stats_resp, is_home_union):
    """Extrahiert relevante Kennzahlen aus dem Match-Stats Response.
    stats[0] = home, stats[1] = away → Index 0=home, 1=away
    union_idx = 0 wenn Heimspiel, 1 wenn Auswärtsspiel
    """
    result = {}
    ui = 0 if is_home_union else 1
    oi = 1 - ui
    flat = []
    for section in stats_resp.get("stats", []):
        for s in section.get("stats", []):
            flat.append(s)
    keys_wanted = {
        "BallPossesion":  "possession",
        "expected_goals": "xg",
        "total_shots":    "shots",
        "ShotsOnTarget":  "shots_on_target",
        "yellow_cards":   "yellow_cards",
        "corners":        "corners",
    }
    seen = set()
    for s in flat:
        k = s.get("key")
        if k in keys_wanted and k not in seen:
            seen.add(k)
            vals = s.get("stats", [None, None])
            result[keys_wanted[k]] = {
                "union": vals[ui] if ui < len(vals) else None,
                "opp":   vals[oi] if oi < len(vals) else None,
            }
    return result
 
 
def main():
    # 1. Standings
    print("1. Standings …")
    resp  = fetch(f"/football-get-standing-all?leagueid={LEAGUE}")
    table = resp["standing"]
    print(f"   {len(table)} Teams")
 
    union_row = next((t for t in table if "union" in t["name"].lower()), None)
    if not union_row:
        print("ERROR: Union nicht gefunden:", file=sys.stderr)
        for t in table: print(f"  idx={t['idx']} id={t['id']} {t['name']}", file=sys.stderr)
        sys.exit(1)
 
    UNION_ID = union_row["id"]
    rank     = union_row["idx"]
    pts      = union_row["pts"]
    wins     = union_row["wins"]
    draws    = union_row["draws"]
    losses   = union_row["losses"]
    played   = union_row["played"]
    sc       = union_row.get("scoresStr", "0-0")
    gf, ga   = (int(x) for x in sc.split("-")) if "-" in sc else (0, 0)
    print(f"   Union id={UNION_ID} · Platz {rank} · {pts} Pkt · {wins}S {draws}U {losses}N")
 
    context = []
    for t in sorted(table, key=lambda x: x["idx"]):
        if abs(t["idx"] - rank) <= 2:
            context.append({
                "rank": t["idx"], "name": shorten(t["name"]),
                "logo": tmsl(t["name"]), "points": t["pts"],
                "is_union": t["id"] == UNION_ID,
            })
 
    # 2. Team Logo
    print("2. Team Logo …")
    team_logo = ""
    try:
        lr = fetch(f"/football-team-logo?teamid={UNION_ID}")
        team_logo = lr.get("logo","") if isinstance(lr, dict) else ""
        print(f"   {team_logo[:80]}")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # 3. Alle Spiele
    print("3. Matches …")
    resp2   = fetch(f"/football-get-all-matches-by-league?leagueid={LEAGUE}")
    matches = resp2["matches"]
    union_m = [m for m in matches
               if m["home"]["id"] == UNION_ID or m["away"]["id"] == UNION_ID]
    done    = sorted([m for m in union_m if m["status"].get("finished")],
                     key=lambda m: m["status"].get("utcTime",""))
    future  = sorted([m for m in union_m if m["status"].get("notStarted")],
                     key=lambda m: m["status"].get("utcTime",""))
    print(f"   {len(done)} fertig · {len(future)} ausstehend")
 
    # Form letzte 5
    form = ""
    for m in done[-5:]:
        is_h = m["home"]["id"] == UNION_ID
        ug   = m["home"]["score"] if is_h else m["away"]["score"]
        og   = m["away"]["score"] if is_h else m["home"]["score"]
        if ug is not None and og is not None:
            form += "W" if ug > og else "L" if ug < og else "D"
 
    def parse(m, finished=True):
        h, a    = m["home"], m["away"]
        is_home = h["id"] == UNION_ID
        rnd     = m.get("tournament", {}).get("stage", "") or ""
        obj = {
            "event_id":   m.get("id"),
            "matchday":   rnd or played,
            "date":       m["status"].get("utcTime",""),
            "home_name":  h["name"], "away_name":  a["name"],
            "home_logo":  tmsl(h["name"]), "away_logo": tmsl(a["name"]),
            "goals_home": h.get("score"), "goals_away": a.get("score"),
            "is_home":    is_home,
        }
        if finished and h.get("score") is not None:
            ug = h["score"] if is_home else a["score"]
            og = a["score"] if is_home else h["score"]
            obj["result"] = "W" if ug > og else "L" if ug < og else "D"
        return obj
 
    last = parse(done[-1])         if done   else None
    nxt  = parse(future[0], False) if future else None
    if last: print(f"   Letztes: {last['home_name']} {last['goals_home']}:{last['goals_away']} {last['away_name']} → {last.get('result','?')} (id={last['event_id']})")
    if nxt:  print(f"   Nächstes: {nxt['home_name']} vs {nxt['away_name']} · {nxt['date'][:10]}")
 
    # 4. Match Stats letztes Spiel
    match_stats = {}
    if last and last.get("event_id"):
        print(f"4. Match Stats (event {last['event_id']}) …")
        try:
            sr = fetch(f"/football-get-match-all-stats?eventid={last['event_id']}")
            match_stats = parse_match_stats(sr, last["is_home"])
            print(f"   Stats: {list(match_stats.keys())}")
        except Exception as e:
            print(f"   WARN: {e}", file=sys.stderr)
 
    # 5. Top Torschützen
    print("5. Top Scorers …")
    top_scorers = []
    try:
        sr = fetch(f"/football-get-top-players-by-goals?leagueid={LEAGUE}")
        for p in sr.get("players", [])[:5]:
            top_scorers.append({
                "id": p["id"], "name": p["name"],
                "teamName": p.get("teamName",""),
                "goals": p.get("goals", p.get("value", 0))
            })
        print(f"   {len(top_scorers)} Spieler")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # 6. Top Vorlagengeber
    print("6. Top Assisters …")
    top_assisters = []
    try:
        ar = fetch(f"/football-get-top-players-by-assists?leagueid={LEAGUE}")
        for p in ar.get("players", [])[:5]:
            top_assisters.append({
                "id": p["id"], "name": p["name"],
                "teamName": p.get("teamName",""),
                "assists": p.get("assists", p.get("value", 0))
            })
        print(f"   {len(top_assisters)} Spieler")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # Output
    result = {
        "updated_at":     datetime.now(timezone.utc).isoformat(),
        "league":         "Bundesliga", "season": "2025/26",
        "matchday":       played, "rank": rank, "points": pts,
        "matches_played": played, "wins": wins, "draws": draws, "losses": losses,
        "goals_for":      gf, "goals_against": ga,
        "form":           form, "team_logo": team_logo,
        "table_context":  context,
        "last_match":     last, "next_match": nxt,
        "last_match_stats": match_stats,
        "top_scorers":    top_scorers, "top_assisters": top_assisters,
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    print("✅  data/union.json geschrieben")
 
 
if __name__ == "__main__":
    main()
