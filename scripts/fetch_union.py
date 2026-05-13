#!/usr/bin/env python3
"""
fetch_union.py — Free API Live Football Data (RapidAPI)
Endpoints:
  GET /football-get-standing-all?leagueid=54       → Bundesliga Tabelle
  GET /football-get-all-matches-by-league?leagueid=54 → alle Spiele
 
Struktur Standings:  response.standing[].{name, id, pts, wins, draws, losses, played, scoresStr, idx}
Struktur Matches:    response.matches[].{home.{id,name,score}, away.{id,name,score},
                       status.{utcTime, finished, notStarted}, reason.short}
"""
 
import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
 
API_KEY = os.environ.get("RAPIDAPI_KEY", "").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY nicht gesetzt", file=sys.stderr); sys.exit(1)
print(f"  Key: {API_KEY[:6]}…{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST    = "free-api-live-football-data.p.rapidapi.com"
BASE    = f"https://{HOST}"
LEAGUE  = 54   # Bundesliga
OUT     = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 
# Transfermarkt Logo-IDs für Bundesliga-Teams (name-Fragment → tmsl-ID)
# Logos: https://tmssl.akamaized.net/images/wappen/head/{ID}.png
LOGO_MAP = {
    "Bayern":       16,
    "Dortmund":     27,
    "Leverkusen":   15,
    "Stuttgart":    31,
    "Leipzig":      23,
    "Frankfurt":    40,
    "Freiburg":     33,
    "Hamburg":      23,
    "Heidenheim":   134,
    "Hoffenheim":   533,
    "Werder":       36,
    "Wolfsburg":    50,
    "Köln":         3,
    "Mainz":        39,
    "Bochum":       44,
    "Pauli":        52,
    "Gladbach":     18,
    "Mönchengladbach": 18,
    "Augsburg":     167,
    "Union":        89,
}
 
def logo_url(name):
    for key, tid in LOGO_MAP.items():
        if key.lower() in name.lower():
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
                d = json.loads(r.read())
            if d.get("status") != "success":
                raise ValueError(f"API status: {d.get('status')} — {d}")
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
 
def main():
    # ── 1. Standings ──
    print("Hole Standings …")
    resp = fetch(f"/football-get-standing-all?leagueid={LEAGUE}")
    table = resp["standing"]
    print(f"  {len(table)} Teams")
 
    # Union finden
    union_row = next((t for t in table if "union" in t["name"].lower()), None)
    if not union_row:
        print("ERROR: Union Berlin nicht gefunden. Teams:", file=sys.stderr)
        for t in table: print(f"  {t['idx']}. {t['name']} id={t['id']}", file=sys.stderr)
        sys.exit(1)
 
    UNION_ID = str(union_row["id"])
    rank     = union_row["idx"]
    pts      = union_row["pts"]
    wins     = union_row["wins"]
    draws    = union_row["draws"]
    losses   = union_row["losses"]
    played   = union_row["played"]
    scores   = union_row.get("scoresStr", "0-0")   # "40-58"
    gf, ga   = (int(x) for x in scores.split("-")) if "-" in scores else (0, 0)
 
    print(f"  Union ID={UNION_ID} · Platz {rank} · {pts} Pkt · {wins}S {draws}U {losses}N")
 
    # Tabellenumfeld ±2
    context = []
    for t in table:
        if abs(t["idx"] - rank) <= 2:
            context.append({
                "rank":     t["idx"],
                "name":     shorten(t["name"]),
                "logo":     logo_url(t["name"]),
                "points":   t["pts"],
                "is_union": str(t["id"]) == UNION_ID,
            })
    context.sort(key=lambda x: x["rank"])
 
    # ── 2. Matches ──
    print("Hole Matches …")
    resp2   = fetch(f"/football-get-all-matches-by-league?leagueid={LEAGUE}")
    matches = resp2["matches"]
    print(f"  {len(matches)} Spiele gesamt")
 
    # Union-Spiele filtern
    union_matches = [
        m for m in matches
        if str(m["home"]["id"]) == UNION_ID or str(m["away"]["id"]) == UNION_ID
    ]
    print(f"  {len(union_matches)} Union-Spiele")
 
    # Fertig / Ausstehend
    done   = [m for m in union_matches if m["status"].get("finished")]
    future = [m for m in union_matches if m["status"].get("notStarted")]
    done.sort(  key=lambda m: m["status"].get("utcTime",""))
    future.sort(key=lambda m: m["status"].get("utcTime",""))
 
    print(f"  {len(done)} beendet · {len(future)} ausstehend")
 
    def parse(m, finished=True):
        home    = m["home"]
        away    = m["away"]
        is_home = str(home["id"]) == UNION_ID
        # Spieltag aus reason.short oder tournament.stage
        mday = m.get("tournament", {}).get("stage", "") or m.get("reason", {}).get("short", "")
        obj = {
            "matchday":   mday,
            "date":       m["status"].get("utcTime",""),
            "home_name":  home["name"],
            "away_name":  away["name"],
            "home_logo":  logo_url(home["name"]),
            "away_logo":  logo_url(away["name"]),
            "goals_home": home.get("score"),
            "goals_away": away.get("score"),
            "is_home":    is_home,
        }
        if finished:
            ug = home.get("score",0) if is_home else away.get("score",0)
            og = away.get("score",0) if is_home else home.get("score",0)
            if ug is not None and og is not None:
                obj["result"] = "W" if ug > og else "L" if ug < og else "D"
        return obj
 
    last = parse(done[-1])   if done   else None
    nxt  = parse(future[0], finished=False) if future else None
 
    # Form: letzte 5
    form = ""
    for m in done[-5:]:
        home    = m["home"]
        away    = m["away"]
        is_home = str(home["id"]) == UNION_ID
        ug = home.get("score",0) if is_home else away.get("score",0)
        og = away.get("score",0) if is_home else home.get("score",0)
        if ug is not None and og is not None:
            form += "W" if ug > og else "L" if ug < og else "D"
 
    if last:
        print(f"  Letztes: {last['home_name']} {last['goals_home']}:{last['goals_away']} {last['away_name']} → {last.get('result','?')}")
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
    print("✅  data/union.json geschrieben")
 
if __name__ == "__main__":
    main()
 
