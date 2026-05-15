#!/usr/bin/env python3
"""
fetch_union.py v5.2.4 — Free API Live Football Data (RapidAPI)
 
FIXES:
- v5.2.0: LOGO_MAP verwendete Transfermarkt-IDs statt RapidAPI-IDs → falsche Logos
          FIX: Logo-URL per get_logo(t["id"]) direkt aus RapidAPI holen
- v5.2.1: rank_change pro Tabellen-Team hinzugefügt (grün/rot/orange Pfeile im Frontend)
          Wert positiv = verbessert, negativ = verschlechtert, 0 = gleich
- v5.2.2: form_calc auf done[-9:] erweitert → 9 statt 5 letzte Spiele in Bilanz
- v5.2.3: FOTMOB_LOGOS als zuverlässiger Fallback für alle Bundesliga-Teams
          Wenn RapidAPI-Logo leer → Fotmob CDN (images.fotmob.com) wird genutzt
          Gilt für Tabellen-Teams, last_match und next_match
- v5.2.4: H2H (Direktvergleich) gegen nächsten Gegner ergänzt
          Wird aus all_m (alle Ligaspiele, bereits geladen) berechnet — kein Extra-Request
          Schreibt data["h2h"] mit: wins/draws/losses, goals_for/against, letzte 8 Duelle
 
Endpoints (~7-12 Requests/Tag je nach Tabellengröße):
  1. football-get-standing-all?leagueid=54
  2. football-team-logo?teamid={id}   (pro Tabellen-Team, gecacht)
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
print(f"Key: {API_KEY[:6]}...{API_KEY[-4:]} (len={len(API_KEY)})")
 
HOST   = "free-api-live-football-data.p.rapidapi.com"
BASE   = f"https://{HOST}"
LEAGUE = 54
UID    = 8149
UID_S  = str(UID)
OUT    = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")
 

# ── Fotmob-IDs — ausschließlich aus fotmob.com-URLs verifiziert ──
# URL-Muster: https://www.fotmob.com/teams/{id}/overview/{slug}
# Logos: https://images.fotmob.com/image_resources/logo/teamlogo/{id}.png
FOTMOB_IDS = {
    # Bundesliga 2025/26 — verifiziert
    "1. FC Union Berlin":         8149,   # /teams/8149 (auch UID im Script)
    "Union Berlin":               8149,
    "Bayer 04 Leverkusen":        8178,   # /teams/8178
    "Leverkusen":                 8178,
    "TSG Hoffenheim":             8226,   # /teams/8226
    "Hoffenheim":                 8226,
    "FC Augsburg":                8406,   # /teams/8406
    "Augsburg":                   8406,
    "SV Werder Bremen":           8697,   # /teams/8697
    "Werder Bremen":              8697,
    "Bremen":                     8697,
    "VfL Wolfsburg":              8721,   # /teams/8721
    "Wolfsburg":                  8721,
    "FC St. Pauli":               8152,   # /teams/8152
    "St. Pauli":                  8152,
    "Borussia Mönchengladbach":   9788,   # /teams/9788
    "B. Mönchengladbach":         9788,
    "Mönchengladbach":            9788,
    "Borussia Dortmund":          9789,   # /teams/9789
    "Dortmund":                   9789,
    "Hamburger SV":               9790,   # /teams/9790
    "HSV":                        9790,
    "Eintracht Frankfurt":        9810,   # /teams/9810
    "Frankfurt":                  9810,
    "FC Bayern München":          9823,   # /teams/9823
    "Bayern München":             9823,
    "Bayern":                     9823,
    "1. FSV Mainz 05":            9905,   # /teams/9905
    "FSV Mainz 05":               9905,
    "Mainz 05":                   9905,
    "Mainz":                      9905,
    "VfL Bochum":                 9911,   # /teams/9911
    "Bochum":                     9911,
    "VfB Stuttgart":              10269,  # /teams/10269
    "Stuttgart":                  10269,
    "RB Leipzig":                 178475, # /teams/178475
    "Leipzig":                    178475,
}

# Wikipedia-Logos als Fallback (für Teams ohne verifizierten Fotmob-ID)
WIKI_LOGOS = {
    "SC Freiburg":        "https://upload.wikimedia.org/wikipedia/de/thumb/f/f1/SC-Freiburg_Logo-neu.svg/120px-SC-Freiburg_Logo-neu.svg.png",
    "Freiburg":           "https://upload.wikimedia.org/wikipedia/de/thumb/f/f1/SC-Freiburg_Logo-neu.svg/120px-SC-Freiburg_Logo-neu.svg.png",
    "1. FC Köln":         "https://upload.wikimedia.org/wikipedia/de/thumb/d/d6/Logo_1._FC_Koeln.svg/120px-Logo_1._FC_Koeln.svg.png",
    "Köln":               "https://upload.wikimedia.org/wikipedia/de/thumb/d/d6/Logo_1._FC_Koeln.svg/120px-Logo_1._FC_Koeln.svg.png",
    "1. FC Heidenheim":   "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/1._FC_Heidenheim_1846_Logo.svg/120px-1._FC_Heidenheim_1846_Logo.svg.png",
    "Heidenheim":         "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/1._FC_Heidenheim_1846_Logo.svg/120px-1._FC_Heidenheim_1846_Logo.svg.png",
    "Holstein Kiel":      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Holstein_Kiel_Logo.svg/120px-Holstein_Kiel_Logo.svg.png",
    "Kiel":               "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Holstein_Kiel_Logo.svg/120px-Holstein_Kiel_Logo.svg.png",
    "Hannover 96":        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Hannover_96_Logo.svg/120px-Hannover_96_Logo.svg.png",
    "Hannover":           "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Hannover_96_Logo.svg/120px-Hannover_96_Logo.svg.png",
    "Fortuna Düsseldorf": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Fortuna_D%C3%BCsseldorf.svg/120px-Fortuna_D%C3%BCsseldorf.svg.png",
    "Düsseldorf":         "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Fortuna_D%C3%BCsseldorf.svg/120px-Fortuna_D%C3%BCsseldorf.svg.png",
    "Hertha BSC":         "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Hertha_BSC_Logo_2012.svg/120px-Hertha_BSC_Logo_2012.svg.png",
    "Hertha":             "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Hertha_BSC_Logo_2012.svg/120px-Hertha_BSC_Logo_2012.svg.png",
    "FC Schalke 04":      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/FC_Schalke_04_Logo.svg/120px-FC_Schalke_04_Logo.svg.png",
    "Schalke 04":         "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/FC_Schalke_04_Logo.svg/120px-FC_Schalke_04_Logo.svg.png",
    "Schalke":            "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/FC_Schalke_04_Logo.svg/120px-FC_Schalke_04_Logo.svg.png",
    "1. FC Nürnberg":     "https://upload.wikimedia.org/wikipedia/de/thumb/c/c9/1._FC_N%C3%BCrnberg.svg/120px-1._FC_N%C3%BCrnberg.svg.png",
    "Nürnberg":           "https://upload.wikimedia.org/wikipedia/de/thumb/c/c9/1._FC_N%C3%BCrnberg.svg/120px-1._FC_N%C3%BCrnberg.svg.png",
    "SpVgg Greuther Fürth":"https://upload.wikimedia.org/wikipedia/de/thumb/9/96/SpVgg_Greuther_F%C3%BCrth.svg/120px-SpVgg_Greuther_F%C3%BCrth.svg.png",
    "Greuther Fürth":     "https://upload.wikimedia.org/wikipedia/de/thumb/9/96/SpVgg_Greuther_F%C3%BCrth.svg/120px-SpVgg_Greuther_F%C3%BCrth.svg.png",
    "1. FC Kaiserslautern":"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/1._FC_Kaiserslautern_Logo_2018.svg/120px-1._FC_Kaiserslautern_Logo_2018.svg.png",
    "Kaiserslautern":     "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/1._FC_Kaiserslautern_Logo_2018.svg/120px-1._FC_Kaiserslautern_Logo_2018.svg.png",
    "1. FC Magdeburg":    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/1._FC_Magdeburg.svg/120px-1._FC_Magdeburg.svg.png",
    "Magdeburg":          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/1._FC_Magdeburg.svg/120px-1._FC_Magdeburg.svg.png",
    "Karlsruher SC":      "https://upload.wikimedia.org/wikipedia/de/thumb/c/c7/Logo_Karlsruher_SC.svg/120px-Logo_Karlsruher_SC.svg.png",
    "Karlsruhe":          "https://upload.wikimedia.org/wikipedia/de/thumb/c/c7/Logo_Karlsruher_SC.svg/120px-Logo_Karlsruher_SC.svg.png",
    "SC Paderborn 07":    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/SC_Paderborn_07_logo.svg/120px-SC_Paderborn_07_logo.svg.png",
    "Paderborn":          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/SC_Paderborn_07_logo.svg/120px-SC_Paderborn_07_logo.svg.png",
    "SV Darmstadt 98":    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/SV_Darmstadt_98_logo.svg/120px-SV_Darmstadt_98_logo.svg.png",
    "Darmstadt":          "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/SV_Darmstadt_98_logo.svg/120px-SV_Darmstadt_98_logo.svg.png",
    "SV 07 Elversberg":   "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/SV_07_Elversberg.svg/120px-SV_07_Elversberg.svg.png",
    "Elversberg":         "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/SV_07_Elversberg.svg/120px-SV_07_Elversberg.svg.png",
    "SSV Ulm 1846":       "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/SSV_Ulm_1846_logo.svg/120px-SSV_Ulm_1846_logo.svg.png",
    "Ulm":                "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/SSV_Ulm_1846_logo.svg/120px-SSV_Ulm_1846_logo.svg.png",
    "Preußen Münster":    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Preu%C3%9Fen_M%C3%BCnster_logo.svg/120px-Preu%C3%9Fen_M%C3%BCnster_logo.svg.png",
    "Münster":            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Preu%C3%9Fen_M%C3%BCnster_logo.svg/120px-Preu%C3%9Fen_M%C3%BCnster_logo.svg.png",
}

def fotmob_fallback(name):
    """Fotmob CDN wenn verifizierte ID vorhanden, sonst Wikipedia."""
    # Exakter Name
    if name in FOTMOB_IDS:
        fid = FOTMOB_IDS[name]
        return f"https://images.fotmob.com/image_resources/logo/teamlogo/{fid}.png"
    # Wikipedia-Fallback
    if name in WIKI_LOGOS:
        return WIKI_LOGOS[name]
    # Teilstring-Suche Fotmob
    nl = name.lower()
    for k, fid in FOTMOB_IDS.items():
        if nl in k.lower() or k.lower() in nl:
            return f"https://images.fotmob.com/image_resources/logo/teamlogo/{fid}.png"
    # Teilstring-Suche Wikipedia
    for k, url in WIKI_LOGOS.items():
        if nl in k.lower() or k.lower() in nl:
            return url
    return ""

# Logo-Cache: RapidAPI-Team-ID -> Logo-URL
_logo_cache = {}
 
def get_logo(team_id, team_name=""):
    tid = str(team_id)
    if tid in _logo_cache:
        return _logo_cache[tid]
    url = ""
    try:
        lr = fetch(f"/football-team-logo?teamid={tid}")
        url = lr.get("logo","") if isinstance(lr, dict) else ""
    except Exception as e:
        print(f"   WARN Logo {tid} ({team_name}): {e}", file=sys.stderr)
    # Fotmob CDN als Fallback wenn RapidAPI leer
    if not url and team_name:
        url = fotmob_fallback(team_name)
        if url:
            print(f"   Fotmob-Fallback fuer {team_name}: {url[-40:]}")
    _logo_cache[tid] = url
    return url
 
def short(name):
    for p,r in [("Borussia ","B. "),("1. FC ",""),("FC ",""),
                ("VfB ",""),("VfL ",""),("TSG ",""),("SV ","")]:
        if name.startswith(p): return r+name[len(p):]
    return name
 
def fetch(path, retries=3):
    delays=[20,40,60]
    url=f"{BASE}{path}"
    hdrs={"x-rapidapi-key":API_KEY,"x-rapidapi-host":HOST,"Accept":"application/json"}
    print(f"  -> {path[:72]}")
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
                print(f"  Rate limit - warte {delays[attempt]}s ...")
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
 
 
def load_previous_ranks():
    """Vorherige Raenge aus bestehender union.json lesen (fuer rank_change)."""
    try:
        with open(OUT, "r", encoding="utf-8") as f:
            old = json.load(f)
        return {t["name"]: t["rank"] for t in old.get("table_context", [])}
    except Exception:
        return {}


def build_h2h(all_m, next_m):
    """
    Berechnet den Direktvergleich Union vs. nächster Gegner
    aus den bereits geladenen Ligaspielen (all_m) — kein Extra-API-Request.

    Liefert ein dict mit:
      opponent, wins, draws, losses, goals_for, goals_against, matches (max 8, neueste zuerst)
    """
    if not next_m:
        return {}

    # Gegner-ID aus dem nächsten Spiel ermitteln
    if next_m["is_home"]:
        opp_name = next_m["away_name"]
        # away_logo enthält immer die Fotmob-URL → ID extrahieren oder Name-Matching
        opp_id_candidates = [next_m.get("away_logo","")]
    else:
        opp_name = next_m["home_name"]
        opp_id_candidates = [next_m.get("home_logo","")]

    # Gegner-ID aus dem Logo-URL extrahieren (Fotmob-Muster: .../teamlogo/{id}.png)
    opp_fotmob_id = None
    for logo_url in opp_id_candidates:
        if logo_url and "teamlogo/" in logo_url:
            try:
                opp_fotmob_id = logo_url.split("teamlogo/")[-1].replace(".png","").strip()
            except Exception:
                pass

    print(f"H2H: Suche Spiele Union vs. {opp_name} (Fotmob-ID: {opp_fotmob_id})")

    wins = draws = losses = goals_for = goals_against = 0
    matches = []

    for m in all_m:
        h = m["home"]
        a = m["away"]
        h_id = str(h["id"])
        a_id = str(a["id"])

        # Ist Union in diesem Spiel?
        union_is_home  = (h_id == UID_S)
        union_is_away  = (a_id == UID_S)
        if not union_is_home and not union_is_away:
            continue

        # Ist der Gegner in diesem Spiel? Matching per ID (Fotmob) oder Name
        opp_side = a if union_is_home else h
        opp_match = False
        if opp_fotmob_id and str(opp_side["id"]) == opp_fotmob_id:
            opp_match = True
        else:
            # Name-Fallback: case-insensitive Teilstring
            opp_name_lower = opp_name.lower()
            side_name_lower = opp_side["name"].lower()
            if opp_name_lower in side_name_lower or side_name_lower in opp_name_lower:
                opp_match = True

        if not opp_match:
            continue

        # Spiel nur auswerten wenn abgeschlossen
        gf_raw = h["score"] if union_is_home else a["score"]
        ga_raw = a["score"] if union_is_home else h["score"]
        if gf_raw is None or ga_raw is None:
            continue

        gf_int = int(gf_raw)
        ga_int = int(ga_raw)
        goals_for     += gf_int
        goals_against += ga_int

        if gf_int > ga_int:
            res = "W"; wins  += 1
        elif gf_int < ga_int:
            res = "L"; losses += 1
        else:
            res = "D"; draws += 1

        matches.append({
            "date":        m["status"].get("utcTime",""),
            "home_name":   h["name"],
            "away_name":   a["name"],
            "home_goals":  int(h["score"]),
            "away_goals":  int(a["score"]),
            "union_result": res,
        })

    # Neueste zuerst
    matches.sort(key=lambda x: x["date"], reverse=True)
    total = wins + draws + losses
    print(f"H2H: {total} Spiele gefunden — {wins}S {draws}U {losses}N")

    if total == 0:
        # Kein Spiel in aktueller Saison gefunden (z.B. Aufsteiger)
        # Gibt leeres Dict zurück → Frontend zeigt Hinweis
        return {}

    return {
        "opponent":      opp_name,
        "wins":          wins,
        "draws":         draws,
        "losses":        losses,
        "goals_for":     goals_for,
        "goals_against": goals_against,
        "matches":       matches[:8],
    }

 
def main():
    now = datetime.now(timezone.utc)
 
    # Vorherige Raenge laden
    prev_ranks = load_previous_ranks()
    print(f"Vorherige Raenge: {len(prev_ranks)} Teams bekannt")
 
    # 1. Standings
    print("1. Standings ...")
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
    print(f"   Platz {rank} - {pts} Pkt - {wins}S {draws}U {losses}N - Form: {form[-5:]}")
 
    context_raw = [t for t in sorted(table, key=lambda x: x["idx"])
                   if abs(t["idx"] - rank) <= 2]
    print(f"   Hole Logos fuer {len(context_raw)} Tabellen-Teams ...")
    context = []
    for t in context_raw:
        logo = get_logo(t["id"], t["name"])
        team_short = short(t["name"])
        prev = prev_ranks.get(team_short)
        # rank_change: positiv = verbessert (Platz war hoeher, jetzt niedriger Zahl)
        rank_change = (prev - t["idx"]) if prev is not None else None
        context.append({
            "rank":        t["idx"],
            "name":        team_short,
            "logo":        logo,
            "points":      t["pts"],
            "is_union":    t["id"] == UID,
            "qual_color":  t.get("qualColor"),
            "rank_change": rank_change,
        })
        print(f"   {t['idx']}. {team_short} | {t['pts']} Pkt | change={rank_change}")
 
    # 2. Union Team Logo
    print("2. Union Team Logo ...")
    team_logo = get_logo(UID, "Union Berlin")
    print(f"   {team_logo[:60]}")
 
    # 3. Alle Spiele
    print("3. Matches ...")
    resp2 = fetch(f"/football-get-all-matches-by-league?leagueid={LEAGUE}")
    all_m = resp2["matches"]
 
    union_m = [m for m in all_m
               if m["home"]["id"] == UID_S or m["away"]["id"] == UID_S]
 
    done   = sorted([m for m in union_m if m["status"].get("finished") == True],
                    key=lambda m: m["status"].get("utcTime",""))
    future = sorted([m for m in union_m if m.get("notStarted") == True],
                    key=lambda m: m["status"].get("utcTime",""))
 
    print(f"   {len(union_m)} Union-Spiele - {len(done)} fertig - {len(future)} ausstehend")
 
    last_m = parse_match(done[-1],   len(done),   True)  if done   else None
    next_m = parse_match(future[0],  len(done)+1, False) if future else None
 
    if last_m: print(f"   Letztes:  {last_m['home_name']} {last_m['goals_home']}:{last_m['goals_away']} {last_m['away_name']} -> {last_m.get('result','?')}")
    if next_m: print(f"   Naechstes: {next_m['home_name']} vs {next_m['away_name']} - {next_m['date'][:10]}")
    if not next_m: print("   Kein naechstes Spiel - Saisonende?")
 
    form_calc = "".join(filter(None, [result_char(m) for m in done[-9:]]))
    print(f"   Form (berechnet): {form_calc}")

    # 3b. H2H — aus all_m berechnen, kein Extra-Request
    print("3b. H2H (Direktvergleich) ...")
    h2h = build_h2h(all_m, next_m)
 
    # 4. Match Stats
    match_stats = {}
    if last_m and last_m.get("event_id"):
        print(f"4. Match Stats (event={last_m['event_id']}) ...")
        try:
            sr = fetch(f"/football-get-match-event-all-stats?eventid={last_m['event_id']}")
            match_stats = parse_match_stats(sr, last_m["is_home"])
            print(f"   Keys: {list(match_stats.keys())}")
        except Exception as e:
            print(f"   WARN: {e}", file=sys.stderr)
 
    # 5. Union Squad
    print("5. Union Squad ...")
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
 
    # 6. Top Torschuetzen
    print("6. Top Scorers Liga ...")
    top_scorers = []
    try:
        sr = fetch(f"/football-get-top-players-by-goals?leagueid={LEAGUE}")
        for p in sr.get("players",[])[:5]:
            top_scorers.append({"id":p["id"],"name":p["name"],
                "teamName":p.get("teamName",""),"goals":p.get("goals",p.get("value",0))})
        print(f"   {[p['name']+'('+str(p['goals'])+'G)' for p in top_scorers]}")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
    # 7. Top Assisters
    print("7. Top Assisters Liga ...")
    top_assisters = []
    try:
        ar = fetch(f"/football-get-top-players-by-assists?leagueid={LEAGUE}")
        for p in ar.get("players",[])[:5]:
            top_assisters.append({"id":p["id"],"name":p["name"],
                "teamName":p.get("teamName",""),"assists":p.get("assists",p.get("value",0))})
        print(f"   {[p['name']+'('+str(p['assists'])+'A)' for p in top_assisters]}")
    except Exception as e:
        print(f"   WARN: {e}", file=sys.stderr)
 
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
        "form":             form_calc or form[-9:],
        "team_logo":        team_logo,
        "table_context":    context,
        "last_match":       last_m,
        "next_match":       next_m,
        "last_match_stats": match_stats,
        "union_scorers":    union_scorers,
        "top_scorers":      top_scorers,
        "top_assisters":    top_assisters,
        "h2h":              h2h,   # ← NEU v5.2.4
    }
 
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    print("OK  data/union.json geschrieben")
 
 
if __name__ == "__main__":
    main()
