#!/usr/bin/env python3
"""
fetch_union.py v4.8.3 — Free API Live Football Data (RapidAPI)
Endpoints (7 total, ~7 req/Tag — Free: 100/Tag):
  1. /football-get-standing-all?leagueid=54
  2. /football-team-logo?teamid={union_id}
  3. /football-get-all-matches-by-league?leagueid=54
  4. /football-get-match-all-stats?eventid={last_event_id}
  5. /football-get-top-players-by-goals?leagueid=54
  6. /football-get-top-players-by-assists?leagueid=54
  7. /football-get-list-player?teamid={union_id}
"""
 
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
 
API_KEY = os.environ.get("RAPIDAPI_KEY","").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY nicht gesetzt", file=sys.stderr); sys.exit(1)
print(f"  Key: {API_KEY[:6]}…{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST   = "free-api-live-football-data.p.rapidapi.com"
BASE   = f"https://{HOST}"
LEAGUE = 54
OUT    = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
LOGO_MAP = {
    "Bayern":16,"Dortmund":27,"Leverkusen":15,"Stuttgart":31,
    "Leipzig":23,"Frankfurt":40,"Freiburg":33,"Hamburg":23,
    "Heidenheim":134,"Hoffenheim":533,"Werder":36,"Wolfsburg":50,
    "Köln":3,"Mainz":39,"Bochum":44,"Pauli":52,
    "Gladbach":18,"Mönchengladbach":18,"Augsburg":167,"Union":89,
}
 
def tmsl(name):
    for k,tid in LOGO_MAP.items():
        if k.lower() in name.lower():
            return f"https://tmssl.akamaized.net/images/wappen/head/{tid}.png"
    return ""
 
def shorten(name):
    for p,r in [("Borussia ","B. "),("1. FC ",""),("FC ",""),
                ("VfB ",""),("VfL ",""),("TSG ",""),("SV ","")]:
        if name.startswith(p): return r+name[len(p):]
    return name
 
def fetch(path, retries=3):
    delays=[20,40,60]
    url=f"{BASE}{path}"
    hdrs={"x-rapidapi-key":API_KEY,"x-rapidapi-host":HOST,"Accept":"application/json"}
    print(f"  GET …{path[:70]}")
    for attempt in range(retries):
        try:
            req=urllib.request.Request(url,headers=hdrs)
            with urllib.request.urlopen(req,timeout=15) as r:
                d=json.loads(r.read())
            if d.get("status")!="success":
                raise ValueError(f"status={d.get('status')}: {str(d)[:200]}")
            return d["response"]
        except urllib.error.HTTPError as e:
            body=e.read().decode("utf-8",errors="replace")[:200]
            print(f"  HTTP {e.code}: {body}",file=sys.stderr)
            if e.code==429 and attempt<retries-1:
                print(f"  Rate limit – warte {delays[attempt]}s …")
                time.sleep(delays[attempt])
            else: raise
        except Exception as e:
            print(f"  Attempt {attempt+1}: {e}",file=sys.stderr)
            if attempt<retries-1: time.sleep(delays[attempt])
            else: raise
 
def parse_stats(sr, is_home_union):
    ui,oi=(0,1) if is_home_union else (1,0)
    result,seen={},set()
    wanted={"BallPossesion":"possession","expected_goals":"xg",
            "total_shots":"shots","ShotsOnTarget":"shots_on_target"}
    for section in sr.get("stats",[]):
        for s in section.get("stats",[]):
            k=s.get("key")
            if k in wanted and k not in seen:
                seen.add(k)
                vals=s.get("stats",[None,None])
                result[wanted[k]]={"union":vals[ui] if ui<len(vals) else None,
                                   "opp":  vals[oi] if oi<len(vals) else None}
    return result
 
def main():
    # 1. Standings
    print("1. Standings …")
    resp=fetch(f"/football-get-standing-all?leagueid={LEAGUE}")
    table=resp["standing"]
    union_row=next((t for t in table if "union" in t["name"].lower()),None)
    if not union_row:
        print("ERROR: Union nicht gefunden",file=sys.stderr)
        for t in table: print(f"  {t['idx']}. {t['name']} id={t['id']}",file=sys.stderr)
        sys.exit(1)
 
    UID   = union_row["id"]
    rank  = union_row["idx"];  pts    = union_row["pts"]
    wins  = union_row["wins"]; draws  = union_row["draws"]; losses = union_row["losses"]
    played= union_row["played"]
    sc    = union_row.get("scoresStr","0-0")
    gf,ga = (int(x) for x in sc.split("-")) if "-" in sc else (0,0)
    print(f"   id={UID} · Platz {rank} · {pts} Pkt · {wins}S {draws}U {losses}N")
 
    context=[]
    for t in sorted(table,key=lambda x:x["idx"]):
        if abs(t["idx"]-rank)<=2:
            context.append({"rank":t["idx"],"name":shorten(t["name"]),
                            "logo":tmsl(t["name"]),"points":t["pts"],
                            "is_union":t["id"]==UID})
 
    # 2. Team Logo
    print("2. Logo …")
    team_logo=""
    try:
        lr=fetch(f"/football-team-logo?teamid={UID}")
        team_logo=lr.get("logo","") if isinstance(lr,dict) else ""
        print(f"   {team_logo[:70]}")
    except Exception as e:
        print(f"   WARN: {e}",file=sys.stderr)
 
    # 3. Alle Spiele
    print("3. Matches …")
    resp2=fetch(f"/football-get-all-matches-by-league?leagueid={LEAGUE}")
    matches=resp2["matches"]
    union_m=[m for m in matches
             if m["home"]["id"]==UID or m["away"]["id"]==UID]
    done  =sorted([m for m in union_m if m["status"].get("finished")],
                  key=lambda m:m["status"].get("utcTime",""))
    future=sorted([m for m in union_m if m["status"].get("notStarted")],
                  key=lambda m:m["status"].get("utcTime",""))
    print(f"   {len(done)} fertig · {len(future)} ausstehend")
 
    def result_char(m):
        is_h=m["home"]["id"]==UID
        ug=m["home"]["score"] if is_h else m["away"]["score"]
        og=m["away"]["score"] if is_h else m["home"]["score"]
        if ug is None or og is None: return None
        return "W" if ug>og else "L" if ug<og else "D"
 
    form="".join(filter(None,[result_char(m) for m in done[-5:]]))
 
    def parse(m,finished=True):
        h,a=m["home"],m["away"]
        is_home=h["id"]==UID
        rnd=m.get("tournament",{}).get("stage","") or str(played)
        obj={"event_id":m.get("id"),"matchday":rnd,"date":m["status"].get("utcTime",""),
             "home_name":h["name"],"away_name":a["name"],
             "home_logo":tmsl(h["name"]),"away_logo":tmsl(a["name"]),
             "goals_home":h.get("score"),"goals_away":a.get("score"),"is_home":is_home}
        if finished:
            c=result_char(m)
            if c: obj["result"]=c
        return obj
 
    last=parse(done[-1])        if done   else None
    nxt =parse(future[0],False) if future else None
    recent=[parse(m) for m in done[-5:]]
 
    if last: print(f"   Letztes: {last['home_name']} {last['goals_home']}:{last['goals_away']} {last['away_name']} → {last.get('result','?')} (id={last['event_id']})")
    if nxt:  print(f"   Nächstes: {nxt['home_name']} vs {nxt['away_name']} · {nxt['date'][:10]}")
 
    # 4. Match Stats
    match_stats={}
    if last and last.get("event_id"):
        print(f"4. Match Stats (event={last['event_id']}) …")
        try:
            sr=fetch(f"/football-get-match-all-stats?eventid={last['event_id']}")
            match_stats=parse_stats(sr,last["is_home"])
            print(f"   Keys: {list(match_stats.keys())}")
        except Exception as e:
            print(f"   WARN: {e}",file=sys.stderr)
 
    # 5. Top Torschützen Liga
    print("5. Top Scorers …")
    top_scorers=[]
    try:
        sr=fetch(f"/football-get-top-players-by-goals?leagueid={LEAGUE}")
        for p in sr.get("players",[])[:3]:
            top_scorers.append({"id":p["id"],"name":p["name"],
                                "teamName":p.get("teamName",""),
                                "goals":p.get("goals",p.get("value",0))})
        print(f"   {[p['name'] for p in top_scorers]}")
    except Exception as e:
        print(f"   WARN: {e}",file=sys.stderr)
 
    # 6. Top Vorlagen Liga
    print("6. Top Assisters …")
    top_assisters=[]
    try:
        ar=fetch(f"/football-get-top-players-by-assists?leagueid={LEAGUE}")
        for p in ar.get("players",[])[:3]:
            top_assisters.append({"id":p["id"],"name":p["name"],
                                  "teamName":p.get("teamName",""),
                                  "assists":p.get("assists",p.get("value",0))})
        print(f"   {[p['name'] for p in top_assisters]}")
    except Exception as e:
        print(f"   WARN: {e}",file=sys.stderr)
 
    # 7. Union Squad → Scorer filtern
    # Struktur: response.list.squad[].members[] mit goals/assists direkt
    print("7. Union Squad …")
    union_scorers=[]
    try:
        qr=fetch(f"/football-get-list-player?teamid={UID}")
        # Echte Struktur: response = { list: { squad: [ {title, members:[]}, ... ] } }
        squad_groups=qr.get("list",{}).get("squad",[])
        print(f"   {len(squad_groups)} Positionsgruppen")
 
        all_members=[]
        for group in squad_groups:
            if group.get("title")=="coach":
                continue  # Trainer überspringen
            for m in group.get("members",[]):
                all_members.append(m)
        print(f"   {len(all_members)} Spieler gesamt")
 
        with_goals=[]
        for p in all_members:
            goals   = p.get("goals",0) or 0
            assists = p.get("assists",0) or 0
            if goals > 0:
                with_goals.append({
                    "id":      p.get("id"),
                    "name":    p.get("name","?"),
                    "shirt":   p.get("shirtNumber"),
                    "pos":     p.get("positionIdsDesc",""),
                    "goals":   int(goals),
                    "assists": int(assists),
                    "injured": p.get("injured",False),
                })
        with_goals.sort(key=lambda x: (-x["goals"], -x["assists"]))
        union_scorers=with_goals[:6]
        print(f"   {len(union_scorers)} Scorer: {[f'{p[\"name\"]} ({p[\"goals\"]}G)' for p in union_scorers]}")
    except Exception as e:
        print(f"   WARN Squad: {e}",file=sys.stderr)
 
    result={
        "updated_at":    datetime.now(timezone.utc).isoformat(),
        "league":"Bundesliga","season":"2025/26",
        "matchday":played,"rank":rank,"points":pts,
        "matches_played":played,"wins":wins,"draws":draws,"losses":losses,
        "goals_for":gf,"goals_against":ga,
        "form":form,"team_logo":team_logo,
        "table_context":context,
        "recent_matches":recent,
        "last_match":last,"next_match":nxt,
        "last_match_stats":match_stats,
        "top_scorers":top_scorers,"top_assisters":top_assisters,
        "union_scorers":union_scorers,
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUT)),exist_ok=True)
    with open(OUT,"w",encoding="utf-8") as fh:
        json.dump(result,fh,ensure_ascii=False,indent=2)
    print("✅  data/union.json geschrieben")
 
if __name__=="__main__":
    main()
