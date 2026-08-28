#!/usr/bin/env python3
"""Create an atomic Union Berlin snapshot from the public OpenLigaDB API."""
from __future__ import annotations
import json, os, tempfile, urllib.request
from datetime import datetime, timezone

API="https://api.openligadb.de"; LEAGUE="bl1"; UNION_ID=80
OUT=os.path.join(os.path.dirname(__file__),"..","data","union.json")

def fetch(path):
    req=urllib.request.Request(f"{API}/{path}",headers={"User-Agent":"Paul-Hub Union snapshot/6.18"})
    with urllib.request.urlopen(req,timeout=30) as response: return json.load(response)

def score(match):
    results=match.get("matchResults") or []
    final=next((r for r in results if r.get("resultTypeID")==2),results[-1] if match.get("matchIsFinished") and results else None)
    return (int(final["pointsTeam1"]),int(final["pointsTeam2"])) if final else None

def match_view(match,final=None):
    def team(item): return {"id":item["teamId"],"name":item["teamName"],"shortName":item.get("shortName"),"logo":item.get("teamIconUrl")}
    view={"id":match["matchID"],"matchday":match["group"]["groupOrderID"],"date":match["matchDateTimeUTC"],"home":team(match["team1"]),"away":team(match["team2"])}
    if final:
        view["score"]={"home":final[0],"away":final[1]}
        goals=final if match["team1"]["teamId"]==UNION_ID else final[::-1]
        view["unionResult"]="W" if goals[0]>goals[1] else "D" if goals[0]==goals[1] else "L"
    return view

def opponent_match_view(match, team_id, final):
    home=match["team1"]; away=match["team2"]
    is_home=home["teamId"]==team_id
    goals=final if is_home else final[::-1]
    rival=away if is_home else home
    return {
        "id":match["matchID"], "date":match["matchDateTimeUTC"],
        "competition":"Bundesliga", "isHome":is_home,
        "opponent":{"id":rival["teamId"],"name":rival["teamName"],"shortName":rival.get("shortName"),"logo":rival.get("teamIconUrl")},
        "goalsFor":goals[0], "goalsAgainst":goals[1],
        "result":"W" if goals[0]>goals[1] else "D" if goals[0]==goals[1] else "L"
    }

def main():
    now=datetime.now(timezone.utc); season=now.year if now.month>=7 else now.year-1
    matches=fetch(f"getmatchdata/{LEAGUE}/{season}"); table=fetch(f"getbltable/{LEAGUE}/{season}"); group=fetch(f"getcurrentgroup/{LEAGUE}")
    if len(matches)!=306 or len(table)!=18: raise RuntimeError("incomplete OpenLigaDB response; keeping existing file")
    union_matches=[m for m in matches if UNION_ID in (m["team1"]["teamId"],m["team2"]["teamId"])]
    row=next((r for r in table if r["teamInfoId"]==UNION_ID),None)
    if len(union_matches)!=34 or not row: raise RuntimeError("Union missing from current season; keeping existing file")
    completed=[(m,score(m)) for m in union_matches if m.get("matchIsFinished")]
    completed=sorted([(m,s) for m,s in completed if s],key=lambda x:x[0]["matchDateTimeUTC"])
    upcoming=sorted([m for m in union_matches if not m.get("matchIsFinished") and datetime.fromisoformat(m["matchDateTimeUTC"].replace("Z","+00:00"))>=now],key=lambda m:m["matchDateTimeUTC"])
    ranked=sorted(table,key=lambda r:(-r["points"],-r["goalDiff"],-r["goals"],r["teamName"])); started=any(r["matches"] for r in table)
    table_view=[{"rank":i if started else None,"teamId":r["teamInfoId"],"name":r["teamName"],"shortName":r.get("shortName"),"logo":r.get("teamIconUrl"),"played":r["matches"],"goalsFor":r["goals"],"goalsAgainst":r["opponentGoals"],"goalDifference":r["goalDiff"],"points":r["points"],"isUnion":r["teamInfoId"]==UNION_ID} for i,r in enumerate(ranked,1)]
    form="".join(match_view(m,s)["unionResult"] for m,s in completed[-5:])
    previous_matches=None
    def recent_view(team_id):
        nonlocal previous_matches
        items=[(m,score(m)) for m in matches if team_id in (m["team1"]["teamId"],m["team2"]["teamId"]) and m.get("matchIsFinished")]
        items=[(m,s) for m,s in items if s]
        if len(items)<5:
            if previous_matches is None: previous_matches=fetch(f"getmatchdata/{LEAGUE}/{season-1}")
            items=[(m,score(m)) for m in previous_matches if team_id in (m["team1"]["teamId"],m["team2"]["teamId"]) and m.get("matchIsFinished")]+items
            items=[(m,s) for m,s in items if s]
        items=sorted(items,key=lambda x:x[0]["matchDateTimeUTC"])[-5:]
        recent=[opponent_match_view(m,team_id,s) for m,s in items]
        return {"form":"".join(m["result"] for m in recent),"lastMatches":recent[-3:]}
    union_recent=recent_view(UNION_ID)
    next_match=upcoming[0] if upcoming else None
    opponent_view=None
    if next_match:
        opponent_team=next_match["team2"] if next_match["team1"]["teamId"]==UNION_ID else next_match["team1"]
        opponent_id=opponent_team["teamId"]
        recent=recent_view(opponent_id)
        opponent_row=next((r for r in table_view if r["teamId"]==opponent_id),None)
        opponent_view={"id":opponent_id,"name":opponent_team["teamName"],"shortName":opponent_team.get("shortName"),"logo":opponent_team.get("teamIconUrl"),"standing":opponent_row,**recent}
    output={"schemaVersion":3,"generatedAt":now.replace(microsecond=0).isoformat().replace("+00:00","Z"),"source":{"name":"OpenLigaDB","url":"https://openligadb.de/","leagueShortcut":LEAGUE},"season":{"startYear":season,"label":f"{season}/{str(season+1)[-2:]}","currentMatchday":group.get("groupOrderID")},"team":{"id":UNION_ID,"name":row["teamName"],"shortName":row.get("shortName"),"logo":row.get("teamIconUrl"),**union_recent},"status":"active" if started else "preseason","standing":{"rank":next((i for i,r in enumerate(ranked,1) if r["teamInfoId"]==UNION_ID),None) if started else None,"played":row["matches"],"won":row["won"],"drawn":row["draw"],"lost":row["lost"],"goalsFor":row["goals"],"goalsAgainst":row["opponentGoals"],"goalDifference":row["goalDiff"],"points":row["points"],"form":form},"lastMatch":match_view(*completed[-1]) if completed else None,"nextMatch":match_view(next_match) if next_match else None,"nextOpponent":opponent_view,"table":table_view}
    os.makedirs(os.path.dirname(OUT),exist_ok=True); fd,tmp=tempfile.mkstemp(prefix="union-",suffix=".json",dir=os.path.dirname(OUT))
    try:
        with os.fdopen(fd,"w",encoding="utf-8") as handle: json.dump(output,handle,ensure_ascii=False,indent=2); handle.write("\n")
        os.replace(tmp,OUT)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    print(f"OK: data/union.json updated for Bundesliga {output['season']['label']}")

if __name__=="__main__": main()
