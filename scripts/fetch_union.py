#!/usr/bin/env python3
"""
fetch_union.py v5.0.0 — Free API Live Football Data (RapidAPI)
 
Endpoints (6 Requests/Tag — Free Tier: 100/Tag):
  1. football-get-standing-all?leagueid=54
  2. football-team-logo?teamid={uid}
  3. football-get-all-matches-by-league?leagueid=54
  4. football-get-match-event-all-stats?eventid={last_event_id}
  5. football-get-list-player?teamid={uid}
  6. (Spielerfotos via fotmob CDN — kein API-Request nötig)
 
Struktur union.json:
  rank, points, matches_played, wins, draws, losses,
  goals_for, goals_against, form, team_logo,
  table_context[], last_match{}, next_match{},
  last_match_stats{}, union_scorers[]
"""
 
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
 
API_KEY = os.environ.get("RAPIDAPI_KEY","").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY nicht gesetzt", file=sys.stderr); sys.exit(1)
print(f"Key: {API_KEY[:6]}…{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST   = "free-api-live-football-data.p.rapidapi.com"
BASE   = f"https://{HOST}"
LEAGUE = 54    # Bundesliga
UID    = 8149  # 1. FC Union Berlin
OUT    = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
# Transfermarkt-Logos (tmssl.akamaized.net) für Tabellenumfeld
LOGO = {
    "Bayern":16,"Dortmund":27,"Leverkusen":15,"Stuttgart":31,
    "Leipzig":23,"Frankfurt":40,"Freiburg":33,"Hamburg":23,
    "Heidenheim":134,"Hoffenheim":533,"Werder":36,"Wolfsburg":50,
    "Köln":3,"Mainz":39,"Bochum":44,"Pauli":52,
    "Gladbach":18,"Mönchengladbach":18,"Augsburg":167,"Union":89,
}
 
def tmsl(name):
    for k,tid in LOGO.items():
        if k.lower() in name.lower():
            return f"https://tmssl.akamaized.net/images/wappen/head/{tid}.png"
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
    """Extrahiert Schlüsselkennzahlen aus Match-Stats Response.
    stats[0]=home, stats[1]=away. ui=Union-Index."""
    ui,oi=(0,1) if is_home_union else (1,0)
    result,seen={},set()
    wanted={
        "BallPossesion":    "possession",
        "expected_goals":   "xg",
        "total_shots":      "shots",
        "ShotsOnTarget":    "shots_on_target",
        "corners":          "corners",
        "big_chance":       "big_chance",
        "yellow_cards":     "yellow_cards",
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
 
 
def result_char(m, uid):
    is_h=m["home"]["id"]==uid
    ug=m["home"]["score"] if is_h else m["away"]["score"]
    og=m["away"]["score"] if is_h else m["home"]["score"]
    if ug is None or og is None: return None
    return "W" if ug>og else "L" if ug<og else "D"
 
 
def parse_match(m, uid, finished=True):
    h,a=m["home"],m["away"]
    is_home=h["id"]==uid
    rnd=m.get("tournament",{}).get("stage","")
    obj={
        "event_id": m.get("id"),
        "matchday": rnd or "–",
        "date":     m["status"].get("utcTime",""),
        "home_name":h["name"], "away_name":a["name"],
        "home_logo":tmsl(h["name"]), "away_logo":tmsl(a["name"]),
        "goals_home":h.get("score"), "goals_away":a.get("score"),
        "is_home":  is_home,
    }
    if finished:
        c=result_char(m,uid)
        if c: obj["result"]=c
    return obj
 
 
def main():
    now=datetime.now(timezone.utc)
 
    # ── 1. Standings ──
    print("1. Standings …")
    resp=fetch(f"/football-get-standing-all?leagueid={LEAGUE}")
    table=resp["standing"]
    union_row=next((t for t in table if t["id"]==UID or "union" in t["name"].lower()),None)
    if not union_row:
        print("ERROR: Union nicht gefunden:",file=sys.stderr)
        for t in table: print(f"  {t['idx']}. {t['name']} id={t['id']}",file=sys.stderr)
        sys.exit(1)
 
    rank  =union_row["idx"];  pts   =union_row["pts"]
    wins  =union_row["wins"]; draws =union_row["draws"]; losses=union_row["losses"]
    played=union_row["played"]
    sc    =union_row.get("scoresStr","0-0")
    gf,ga =(int(x) for x in sc.split("-")) if "-" in sc else (0,0)
    form  =union_row.get("form","")
    print(f"   Platz {rank} · {pts} Pkt · Form: {form[-5:]}")
 
    # Tabellenumfeld ±2
    context=[]
    for t in sorted(table,key=lambda x:x["idx"]):
        if abs(t["idx"]-rank)<=2:
            context.append({
                "rank":t["idx"],"name":short(t["name"]),
                "logo":tmsl(t["name"]),"points":t["pts"],
                "is_union":t["id"]==UID,
            })
 
    # ── 2. Team Logo ──
    print("2. Team Logo …")
    team_logo=""
    try:
        lr=fetch(f"/football-team-logo?teamid={UID}")
        team_logo=lr.get("logo","") if isinstance(lr,dict) else ""
        print(f"   {team_logo[:60]}")
    except Exception as e:
        print(f"   WARN: {e}",file=sys.stderr)
 
    # ── 3. Alle Spiele ──
    print("3. Matches …")
    resp2=fetch(f"/football-get-all-matches-by-league?leagueid={LEAGUE}")
    all_m=resp2["matches"]
    union_m=[m for m in all_m
             if m["home"]["id"]==UID or m["away"]["id"]==UID]
    done  =sorted([m for m in union_m if m["status"].get("finished")],
                  key=lambda m:m["status"].get("utcTime",""))
    future=sorted([m for m in union_m if m["status"].get("notStarted")],
                  key=lambda m:m["status"].get("utcTime",""))
    print(f"   {len(done)} fertig · {len(future)} ausstehend")
 
    last_m =parse_match(done[-1],UID)    if done   else None
    next_m =parse_match(future[0],UID,False) if future else None
    if last_m: print(f"   Letztes: {last_m['home_name']} {last_m['goals_home']}:{last_m['goals_away']} {last_m['away_name']} → {last_m.get('result','?')} (id={last_m['event_id']})")
    if next_m: print(f"   Nächstes: {next_m['home_name']} vs {next_m['away_name']} · {next_m['date'][:10]}")
 
    # ── 4. Match Stats letztes Spiel ──
    match_stats={}
    if last_m and last_m.get("event_id"):
        print(f"4. Match Stats (event={last_m['event_id']}) …")
        try:
            sr=fetch(f"/football-get-match-event-all-stats?eventid={last_m['event_id']}")
            match_stats=parse_match_stats(sr,last_m["is_home"])
            print(f"   Keys: {list(match_stats.keys())}")
        except Exception as e:
            print(f"   WARN: {e}",file=sys.stderr)
 
    # ── 5. Union Squad → Scorer ──
    print("5. Union Squad …")
    union_scorers=[]
    try:
        qr=fetch(f"/football-get-list-player?teamid={UID}")
        # Struktur: response.list.squad[{title, members:[]}]
        groups=qr.get("list",{}).get("squad",[])
        members=[]
        for g in groups:
            if g.get("title")=="coach": continue
            members.extend(g.get("members",[]))
        print(f"   {len(members)} Spieler im Kader")
        scorers=[{
            "id":     p["id"],
            "name":   p["name"],
            "pos":    p.get("positionIdsDesc",""),
            "shirt":  p.get("shirtNumber"),
            "goals":  p.get("goals",0) or 0,
            "assists":p.get("assists",0) or 0,
            "injured":bool(p.get("injured")),
        } for p in members if (p.get("goals") or 0)>0]
        scorers.sort(key=lambda x:(-x["goals"],-x["assists"]))
        union_scorers=scorers[:6]
        names=[p["name"]+" ("+str(p["goals"])+"G)" for p in union_scorers]
        print(f"   Scorer: {names}")
    except Exception as e:
        print(f"   WARN: {e}",file=sys.stderr)
 
    # ── Output ──
    result={
        "updated_at":     now.isoformat(),
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
        "form":           form[-5:],
        "team_logo":      team_logo,
        "table_context":  context,
        "last_match":     last_m,
        "next_match":     next_m,
        "last_match_stats": match_stats,
        "union_scorers":  union_scorers,
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUT)),exist_ok=True)
    with open(OUT,"w",encoding="utf-8") as fh:
        json.dump(result,fh,ensure_ascii=False,indent=2)
    print(f"✅  data/union.json geschrieben ({len(json.dumps(result))} bytes)")
 
 
if __name__=="__main__":
    main()
