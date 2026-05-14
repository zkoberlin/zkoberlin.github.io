#!/usr/bin/env python3
"""
fetch_union.py v5.2.0 — Free API Live Football Data (RapidAPI)
 
BUGFIX v5.2.0:
- LOGO_MAP verwendete Transfermarkt-IDs statt RapidAPI-Team-IDs → falsche Logos
  FIX: Logo-URL direkt aus den Standings-Daten ziehen (t["id"] = RapidAPI-ID)
       via football-team-logo?teamid={t["id"]} — kein hardcodiertes Mapping mehr
 
Endpoints (~7 Requests/Tag):
  1. football-get-standing-all?leagueid=54
  2. football-team-logo?teamid=8149          (Union)
  3. football-get-all-matches-by-league?leagueid=54
  4. football-get-match-event-all-stats?eventid={last_event_id}
  5. football-get-list-player?teamid=8149
  6. football-get-top-players-by-goals?leagueid=54
  7. football-get-top-players-by-assists?leagueid=54
"""
 
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
 
API_KEY = os.environ.get("RAPIDAPI_KEY","").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY nicht gesetzt", file=sys.stderr); sys.exit(1)
print(f"Key: {API_KEY[:6]}…{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST   = "free-api-live-football-data.p.rapidapi.com"
BASE   = f"https://{HOST}"
LEAGUE = 54
UID    = 8149
UID_S  = str(UID)
OUT    = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
# ── Logo-Cache: RapidAPI-Team-ID → Logo-URL (wird während Standings befüllt)
_logo_cache = {}
 
def get_logo(team_id, team_name=""):
    """Logo-URL per RapidAPI-Team-ID holen (gecacht)."""
    tid = str(team_id)
    if tid in _logo_cache:
        return _logo_cache[tid]
    try:
        lr = fetch(f"/football-team-logo?teamid={tid}")
        url = lr.get("logo","") if isinstance(lr, dict) else ""
        _logo_cache[tid] = url
        return url
    except Exception as e:
        print(f"   WARN Logo {tid} ({team_name}): {e}", file=sys.stderr)
        _logo_cache[tid] = ""
        return ""
 
def short(name):
    for p,r in [("Borussia ","B. "),("1. FC ",""),("FC ",""),
                ("VfB ",""),("VfL ",""),("TSG ",""),("SV ","")]:
        if name.startswith(p): return r+name[len(p):]
    return name
 
def fetch(path, retries=3):
    delays=[20,40,60]
    url=f"{BASE}{path}"
    hdrs={"x-rapidapi-key":API_KEY,"x-rapidapi-host":HOST,"Accept":"application/json"}
    print(f"  → {path[:72]}")
    for attempt in range(retries):
        try:
            req=urllib.request.Request(url,headers=hdrs)
            with urllib.request.urlopen(req,timeout=15) as r:
                d=json.loads(r.read())
            if d.get("status")!="success":
                raise ValueError(f"API status={d.get('status')}: {str(d)[:150]}")
            return d["response"]
        except urllib.error.HTTPError as e:
            body=e.read().decode("utf-8",errors="replace")[:150]
            print(f"  HTTP {e.code}: {body}",file=sys.stderr)
            if e.code==429 and attempt<retries-1:
                print(f"  Rate limit – warte {delays[attempt]}s …")
                time.sleep(delays[attempt])
            else: raise
        except Exception as e:
            print(f"  Fehler (attempt {attempt+1}): {e}",file=sys.stderr)
            if attempt<retries-1: time.sleep(delays[attempt])
            else: raise
 
 
def parse_match_stats(sr, is_home_union):
    ui,oi=(0,1) if is_home_union else (1,0)
    result,seen={},set()
    wanted={
        "BallPossesion":"possession","expected_goals":"xg",
        "total_shots":"shots","ShotsOnTarget":"shots_on_target",
        "big_chance":"big_chance","corners":"corners",
        "touches_opp_box":"touches_box","keeper_saves":"saves",
        "yellow_cards":"yellow_cards","fouls":"fouls",
    }
    for section in sr.get("stats",[]):
        for s in section.get("stats",[]):
            k=s.get("key")
            if k in wanted and k not in seen:
                seen.add(k)
                vals=s.get("stats",[None,None])
                result[wanted[k]]={
                    "union": vals[ui] if ui<len(vals) else None,
                    "opp":   vals[oi] if oi<len(vals) else None,
                }
    return result
 
 
def result_char(m):
    is_h = m["home"]["id"] == UID_S
    ug = m["home"]["score"] if is_h else m["away"]["score"]
    og = m["away"]["score"] if is_h else m["home"]["score"]
    if ug is None or og is None: return None
    return "W" if ug > og else "L" if ug < og else "D"
 
 
def parse_match(m, matchday_num, finished=True):
    h,a = m["home"], m["away"]
    is_home = h["id"] == UID_S
    # Logo direkt per RapidAPI-ID aus dem Match-Objekt holen
    home_logo = get_logo(h["id"], h["name"])
    away_logo = get_logo(a["id"], a["name"])
    obj = {
        "event_id":   m.get("id"),
        "matchday":   matchday_num,
        "date":       m["status"].get("utcTime",""),
        "home_name":  h["name"], "away_name":  a["name"],
        "home_logo":  home_logo, "away_logo":  away_logo,
        "goals_home": h.get("score"), "goals_away": a.get("score"),
        "is_home":    is_home,
    }
    if finished:
        c = result_char(m)
        if c: obj["result"] = c
    return obj
 
 
def main():
    now = datetime.now(timezone.utc)
 
    # ── 1. Standings ──
    print("1. Standings …")
    resp  = fetch(f"/football-get-standing-all?leagueid={LEAGUE}")
    table = resp["standing"]
 
    union_row = next((t for t in table if t["id"] == UID or "union" in t["name"].lower()), None)
    if not union_row:
        print("ERROR: Union nicht gefunden", file=sys.stderr); sys.exit(1)
 
    rank   = union_row["idx"]
    pts    = union_row["pts"]
    wins   = union_row["wins"]
    draws  = union_row["draws"]
    losses = union_row["losses"]
    played = union_row["played"]
    sc     = union_row.get("scoresStr","0-0")
    gf,ga  = (int(x) for x in sc.split("-")) if "-" in sc else (0,0)
    form   = union_row.get("form","")
    print(f"   Platz {rank} · {pts} Pkt · {wins}S {draws}U {losses}N · Form: {form[-5:]}")
 
    # Tabellen-Kontext: Logo per RapidAPI-ID aus Standings holen
    # Nur die relevanten Nachbarn (±2 Plätze) — Logo-Requests werden gecacht
    context_raw = [t for t in sorted(table, key=lambda x: x["idx"])
                   if abs(t["idx"] - rank) <= 2]
    print(f"   Hole Logos für {len(context_raw)} Tabellen-Teams …")
    context = []
    for t in context_raw:
        logo = get_logo(t["id"], t["name"])
        context.append({
            "rank":       t["idx"],
            "name":       short(t["name"]),
            "logo":       logo,
            "points":     t["pts"],
            "is_union":   t["id"] == UID,
            "qual_color": t.get("qualColor"),
        })
 
    # ── 2. Union Team Logo ──
    print("2. Union Team Logo …")
    team_logo = get_logo(UID, "Union Berlin")  # aus Cache wenn schon geholt
    if not team_logo:
        try:
            lr = fetch(f"/football-team-logo?teamid={UID}")
            team_logo = lr.get("logo","") if isinstance(lr,dict) else ""
        except Exception as e:
            print(f"   WARN: {e}", file=sys.stderr)
    print(f"   {team_logo[:60]}")
 
    # ── 3. Alle Spiele ──
    print("3. Matches …")
    resp2 = fetch(f"/football-get-all-matches-by-league?leagueid={LEAGUE}")
    all_m = resp2["matches"]
 
    union_m = [m for m in all_m
               if m["home"]["id"] == UID_S or m["away"]["id"] == UID_S]
 
    done   = sorted([m for m in union_m if m["status"].get("finished") == True],
                    key=lambda m: m["status"].get("utcTime",""))
    future = sorted([m for m in union_m if m.get("notStarted") == True],
                    key=lambda m: m["status"].get("utcTime",""))
 
    print(f"   {len(union_m)} Union-Spiele · {len(done)} fertig · {len(future)} ausstehend")
 
    last_m = parse_match(done[-1],   len(done),   True)  if done   else None
    next_m = parse_match(future[0],  len(done)+1, False) if future else None
 
    if last_m: print(f"   Letztes:  {last_m['home_name']} {last_m['goals_home']}:{last_m['goals_away']} {last_m['away_name']} → {last_m.get('result','?')}")
    if next_m: print(f"   Nächstes: {next_m['home_name']} vs {next_m['away_name']} · {next_m['date'][:10]}")
    if not next_m: print("   ⚠️  Kein nächstes Spiel — Saisonende?")
 
    form_calc = "".join(filter(None, [result_char(m) for m in done[-5:]]))
    print(f"   Form (berechnet): {form_calc}")
 
    # ── 4. Match Stats letztes Spiel ──
    match_stats = {}
    if last_m and last_m.get("event_id"):
        print(f"4. Match Stats (event={last_m['event_id']}) …")
        try:
            sr = fetch(f"/football-get-match-event-all-stats?eventid={last_m['event_id']}")
            match_stats = parse_match_stats(sr, last_m["is_home"])
            print(f"   Keys: {list(match_stats.keys())}")
        except Exception as e:
            print(f"   WARN: {e}", file=sys.stderr)
 
    # ── 5. Union Squad → Scorer ──
    print("5. Union Squad …")
    union_scorers = []
    try:
        qr = fetch(f"/football-get-list-player?teamid={UID}")
        groups = qr.get("list",{}).get("squad",[])
        members = []
        for g in groups:
            if g.get("title") == "coach": continue
            members.extend(g.get("members",[]))
        print(f"   {len(members)} Spieler im Kader")
        scorers = [{
            "id":      p["id"],
            "name":    p["name"],
            "pos":     p.get("positionIdsDesc",""),
            "shirt":   p.get("shirtNumber"),
            "goals":   p.get("goals",0) or 0,
            "assists": p.get("assists",0) or 0,
            "injured": bool(p.get("injured")),
        } for p in members if (p.get("goals") or 0) > 0]
        scorers.sort(key=lambda x: (-x["goals"], -x["assists"]))
        union_scorers = scorers[:6]
        print(f"   Scorer: {[p['name']+'('+str(p['goals'])+'G)' for p in union_scorers]}")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # ── 6. Liga Top Torschützen ──
    print("6. Top Scorers Liga …")
    top_scorers = []
    try:
        sr = fetch(f"/football-get-top-players-by-goals?leagueid={LEAGUE}")
        for p in sr.get("players",[])[:5]:
            top_scorers.append({"id":p["id"],"name":p["name"],
                "teamName":p.get("teamName",""),"goals":p.get("goals",p.get("value",0))})
        print(f"   {[p['name']+'('+str(p['goals'])+'G)' for p in top_scorers]}")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # ── 7. Liga Top Vorlagen ──
    print("7. Top Assisters Liga …")
    top_assisters = []
    try:
        ar = fetch(f"/football-get-top-players-by-assists?leagueid={LEAGUE}")
        for p in ar.get("players",[])[:5]:
            top_assisters.append({"id":p["id"],"name":p["name"],
                "teamName":p.get("teamName",""),"assists":p.get("assists",p.get("value",0))})
        print(f"   {[p['name']+'('+str(p['assists'])+'A)' for p in top_assisters]}")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # ── Output ──
    result = {
        "updated_at":       now.isoformat(),
        "league":           "Bundesliga",
        "season":           "2025/26",
        "matchday":         played,
        "rank":             rank,
        "points":           pts,
        "matches_played":   played,
        "wins":             wins,
        "draws":            draws,
        "losses":           losses,
        "goals_for":        gf,
        "goals_against":    ga,
        "form":             form_calc or form[-5:],
        "team_logo":        team_logo,
        "table_context":    context,
        "last_match":       last_m,
        "next_match":       next_m,
        "last_match_stats": match_stats,
        "union_scorers":    union_scorers,
        "top_scorers":      top_scorers,
        "top_assisters":    top_assisters,
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    print("✅  data/union.json geschrieben")
 
 
if __name__ == "__main__":
    main()
