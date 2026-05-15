#!/usr/bin/env python3
"""
fetch_union.py v5.3.1 — Free API Live Football Data (RapidAPI) + football-data.org H2H

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
- v5.3.0: H2H jetzt primär via football-data.org — saisonübergreifend
          build_h2h() bleibt als Fallback
- v5.3.1: football-data.org H2H-Strategie auf Free-Tier-kompatible Endpoints umgestellt
          Schritt 1: /v4/competitions/BL1/matches?matchday={md} → Match-ID des nächsten Spiels
          Schritt 2: /v4/matches/{matchId}/head2head?limit=10 → historische Duelle
          Beide Endpoints im Free Tier verfügbar — kein paid Plan nötig

Endpoints RapidAPI (~7-12 Requests/Tag):
  1. football-get-standing-all?leagueid=54
  2. football-team-logo?teamid={id}   (pro Tabellen-Team, gecacht)
  3. football-get-all-matches-by-league?leagueid=54
  4. football-get-match-event-all-stats?eventid={last_event_id}
  5. football-get-list-player?teamid=8149
  6. football-get-top-players-by-goals?leagueid=54
  7. football-get-top-players-by-assists?leagueid=54

Endpoints football-data.org (2 Requests/Tag, Free Tier):
  8. /v4/competitions/BL1/matches?matchday={md}  → Match-ID holen
  9. /v4/matches/{matchId}/head2head?limit=10    → historische H2H-Duelle
"""

import json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone

# ── RapidAPI ──
API_KEY = os.environ.get("RAPIDAPI_KEY","").strip()
if not API_KEY:
    print("ERROR: RAPIDAPI_KEY nicht gesetzt", file=sys.stderr); sys.exit(1)
print(f"RapidAPI Key: {API_KEY[:6]}...{API_KEY[-4:]} (len={len(API_KEY)})")

# ── football-data.org ──
FD_KEY = os.environ.get("FOOTBALLDATA_KEY","").strip()
if FD_KEY:
    print(f"football-data.org Key: {FD_KEY[:6]}...{FD_KEY[-4:]} (len={len(FD_KEY)})")
else:
    print("WARN: FOOTBALLDATA_KEY nicht gesetzt — H2H nur aus aktueller Saison", file=sys.stderr)

HOST   = "free-api-live-football-data.p.rapidapi.com"
BASE   = f"https://{HOST}"
LEAGUE = 54
UID    = 8149   # Union Berlin bei RapidAPI / FotMob
UID_S  = str(UID)
FD_UID = 399    # Union Berlin bei football-data.org
OUT    = os.path.join(os.path.dirname(__file__), "..", "data", "union.json")


# ── football-data.org Team-IDs für Bundesliga-Teams ──
# Quelle: https://api.football-data.org/v4/competitions/BL1/teams
FD_TEAM_IDS = {
    "Union Berlin":               399,
    "1. FC Union Berlin":         399,
    "FC Bayern München":          5,
    "Bayern München":             5,
    "Bayern":                     5,
    "Borussia Dortmund":          4,
    "Dortmund":                   4,
    "Bayer 04 Leverkusen":        3,
    "Leverkusen":                 3,
    "RB Leipzig":                 721,
    "Leipzig":                    721,
    "Eintracht Frankfurt":        19,
    "Frankfurt":                  19,
    "VfB Stuttgart":              10,
    "Stuttgart":                  10,
    "SC Freiburg":                17,
    "Freiburg":                   17,
    "Borussia Mönchengladbach":   18,
    "B. Mönchengladbach":         18,
    "Mönchengladbach":            18,
    "TSG Hoffenheim":             2,
    "Hoffenheim":                 2,
    "SV Werder Bremen":           12,
    "Werder Bremen":              12,
    "Bremen":                     12,
    "FC Augsburg":                16,
    "Augsburg":                   16,
    "VfL Wolfsburg":              11,
    "Wolfsburg":                  11,
    "VfL Bochum":                 36,
    "Bochum":                     36,
    "1. FC Köln":                 1,
    "FC Köln":                    1,
    "Köln":                       1,
    "1. FC Heidenheim":           44,
    "Heidenheim":                 44,
    "Hamburger SV":               968,
    "HSV":                        968,
    "FC St. Pauli":               65,
    "St. Pauli":                  65,
    "1. FSV Mainz 05":            15,
    "FSV Mainz 05":               15,
    "Mainz 05":                   15,
    "Mainz":                      15,
    "Hertha BSC":                 9,
    "Hertha":                     9,
    "Fortuna Düsseldorf":         21,
    "Düsseldorf":                 21,
    "Holstein Kiel":              720,
    "Kiel":                       720,
    "FC Schalke 04":              6,
    "Schalke 04":                 6,
    "Schalke":                    6,
    "Hannover 96":                22,
    "Hannover":                   22,
    "1. FC Nürnberg":             20,
    "Nürnberg":                   20,
    "SpVgg Greuther Fürth":       95,
    "Greuther Fürth":             95,
    "1. FC Kaiserslautern":       733,
    "Kaiserslautern":             733,
    "SV Darmstadt 98":            29,
    "Darmstadt":                  29,
    "SC Paderborn 07":            79,
    "Paderborn":                  79,
}


# ── Fotmob-IDs — ausschließlich aus fotmob.com-URLs verifiziert ──
FOTMOB_IDS = {
    "1. FC Union Berlin":         8149,
    "Union Berlin":               8149,
    "Bayer 04 Leverkusen":        8178,
    "Leverkusen":                 8178,
    "TSG Hoffenheim":             8226,
    "Hoffenheim":                 8226,
    "FC Augsburg":                8406,
    "Augsburg":                   8406,
    "SV Werder Bremen":           8697,
    "Werder Bremen":              8697,
    "Bremen":                     8697,
    "VfL Wolfsburg":              8721,
    "Wolfsburg":                  8721,
    "FC St. Pauli":               8152,
    "St. Pauli":                  8152,
    "Borussia Mönchengladbach":   9788,
    "B. Mönchengladbach":         9788,
    "Mönchengladbach":            9788,
    "Borussia Dortmund":          9789,
    "Dortmund":                   9789,
    "Hamburger SV":               9790,
    "HSV":                        9790,
    "Eintracht Frankfurt":        9810,
    "Frankfurt":                  9810,
    "FC Bayern München":          9823,
    "Bayern München":             9823,
    "Bayern":                     9823,
    "1. FSV Mainz 05":            9905,
    "FSV Mainz 05":               9905,
    "Mainz 05":                   9905,
    "Mainz":                      9905,
    "VfL Bochum":                 9911,
    "Bochum":                     9911,
    "VfB Stuttgart":              10269,
    "Stuttgart":                  10269,
    "RB Leipzig":                 178475,
    "Leipzig":                    178475,
}

# Wikipedia-Logos als Fallback
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
    if name in FOTMOB_IDS:
        fid = FOTMOB_IDS[name]
        return f"https://images.fotmob.com/image_resources/logo/teamlogo/{fid}.png"
    if name in WIKI_LOGOS:
        return WIKI_LOGOS[name]
    nl = name.lower()
    for k, fid in FOTMOB_IDS.items():
        if nl in k.lower() or k.lower() in nl:
            return f"https://images.fotmob.com/image_resources/logo/teamlogo/{fid}.png"
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
    """RapidAPI fetch mit Retry-Logik."""
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


def fd_fetch(path, retries=3):
    """football-data.org fetch mit Retry-Logik."""
    delays=[15,30,60]
    url=f"https://api.football-data.org{path}"
    hdrs={"X-Auth-Token": FD_KEY, "Accept": "application/json"}
    print(f"  -> [fd.org] {path[:72]}")
    for attempt in range(retries):
        try:
            req=urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            body=e.read().decode("utf-8",errors="replace")[:150]
            print(f"  HTTP {e.code}: {body}", file=sys.stderr)
            if e.code==429 and attempt<retries-1:
                print(f"  Rate limit fd.org - warte {delays[attempt]}s ...")
                time.sleep(delays[attempt])
            else: raise
        except Exception as e:
            print(f"  Fehler fd.org (attempt {attempt+1}): {e}", file=sys.stderr)
            if attempt<retries-1: time.sleep(delays[attempt])
            else: raise


def get_fd_team_id(name):
    """football-data.org Team-ID per Name-Lookup."""
    if name in FD_TEAM_IDS:
        return FD_TEAM_IDS[name]
    nl = name.lower()
    for k, tid in FD_TEAM_IDS.items():
        if nl in k.lower() or k.lower() in nl:
            return tid
    return None


def build_h2h_historical(next_m):
    """
    Primäre H2H-Quelle: football-data.org — saisonübergreifend, Free Tier.

    Schritt 1: /v4/competitions/BL1/matches?matchday={md}
               → Alle Spiele des nächsten Spieltags → Match-ID des Union-Spiels
    Schritt 2: /v4/matches/{matchId}/head2head?limit=10
               → Letzte 10 Duelle zwischen Union und Gegner (saisonübergreifend)

    Beide Endpoints sind im kostenlosen Free Tier verfügbar.
    """
    if not FD_KEY or not next_m:
        return None

    opp_name = next_m["away_name"] if next_m["is_home"] else next_m["home_name"]
    matchday  = next_m.get("matchday")

    if not matchday:
        print(f"   WARN H2H: Kein Spieltag in next_m — Fallback", file=sys.stderr)
        return None

    print(f"3b-hist. H2H via football-data.org (Free Tier): Union vs. {opp_name} ...")

    try:
        # Schritt 1: Match-ID des nächsten Union-Spiels bei football-data.org holen
        print(f"   Schritt 1: Spieltag {matchday} Matches holen ...")
        data = fd_fetch(f"/v4/competitions/BL1/matches?matchday={matchday}")
        md_matches = data.get("matches", [])
        print(f"   {len(md_matches)} Spiele auf Spieltag {matchday}")

        fd_match_id = None
        for m in md_matches:
            h = m.get("homeTeam", {})
            a = m.get("awayTeam", {})
            h_id = h.get("id")
            a_id = a.get("id")
            # Debug: alle Teams auf Spieltag ausgeben
            print(f"   Spiel: {h.get('shortName','?')} vs {a.get('shortName','?')} (ids: {h_id} / {a_id})")
            # Vergleich als int UND string absichern
            if str(h_id) == str(FD_UID) or str(a_id) == str(FD_UID):
                fd_match_id = m.get("id")
                print(f"   Union-Spiel gefunden: fd_match_id={fd_match_id}")
                break

        if not fd_match_id:
            print(f"   WARN: Union-Spiel auf Spieltag {matchday} nicht gefunden — Fallback", file=sys.stderr)
            return None

        # Schritt 2: H2H-Duelle via Match-ID
        print(f"   Schritt 2: H2H für match {fd_match_id} holen ...")
        h2h_data = fd_fetch(f"/v4/matches/{fd_match_id}/head2head?limit=10")
        h2h_matches = h2h_data.get("matches", [])
        agg         = h2h_data.get("aggregates", {})
        print(f"   {len(h2h_matches)} H2H-Duelle gefunden")

        wins = draws = losses = goals_for = goals_against = 0
        matches = []

        for m in h2h_matches:
            if m.get("status") != "FINISHED":
                continue

            h = m.get("homeTeam", {})
            a = m.get("awayTeam", {})
            score = m.get("score", {})
            full  = score.get("fullTime", {})
            gh = full.get("home")
            ga = full.get("away")
            if gh is None or ga is None:
                continue

            union_is_home = (h.get("id") == FD_UID)
            gf_int = gh if union_is_home else ga
            ga_int = ga if union_is_home else gh
            goals_for     += gf_int
            goals_against += ga_int

            if gf_int > ga_int:
                res = "W"; wins   += 1
            elif gf_int < ga_int:
                res = "L"; losses += 1
            else:
                res = "D"; draws  += 1

            matches.append({
                "date":         m.get("utcDate", ""),
                "home_name":    h.get("shortName", h.get("name", "")),
                "away_name":    a.get("shortName", a.get("name", "")),
                "home_goals":   gh,
                "away_goals":   ga,
                "union_result": res,
                "season":       m.get("season", {}).get("startDate", "")[:4],
            })

        # Neueste zuerst
        matches.sort(key=lambda x: x["date"], reverse=True)
        total = wins + draws + losses
        print(f"   H2H (historisch): {total} Duelle — {wins}S {draws}U {losses}N")

        if total == 0:
            print(f"   WARN: Keine abgeschlossenen Duelle — Aufsteiger?", file=sys.stderr)
            return None

        return {
            "opponent":      opp_name,
            "source":        "football-data.org",
            "wins":          wins,
            "draws":         draws,
            "losses":        losses,
            "goals_for":     goals_for,
            "goals_against": goals_against,
            "matches":       matches[:10],
        }

    except Exception as e:
        print(f"   WARN H2H historical: {e}", file=sys.stderr)
        return None


def build_h2h(all_m, next_m):
    """
    Fallback H2H-Quelle: RapidAPI (nur aktuelle Saison).
    Wird verwendet wenn football-data.org nicht erreichbar oder kein Key gesetzt.
    """
    if not next_m:
        return {}

    if next_m["is_home"]:
        opp_name = next_m["away_name"]
        opp_id_candidates = [next_m.get("away_logo","")]
    else:
        opp_name = next_m["home_name"]
        opp_id_candidates = [next_m.get("home_logo","")]

    opp_fotmob_id = None
    for logo_url in opp_id_candidates:
        if logo_url and "teamlogo/" in logo_url:
            try:
                opp_fotmob_id = logo_url.split("teamlogo/")[-1].replace(".png","").strip()
            except Exception:
                pass

    print(f"   H2H Fallback: Union vs. {opp_name} (Fotmob-ID: {opp_fotmob_id})")

    wins = draws = losses = goals_for = goals_against = 0
    matches = []

    for m in all_m:
        h = m["home"]
        a = m["away"]
        h_id = str(h["id"])
        a_id = str(a["id"])
        union_is_home = (h_id == UID_S)
        union_is_away = (a_id == UID_S)
        if not union_is_home and not union_is_away:
            continue

        opp_side = a if union_is_home else h
        opp_match = False
        if opp_fotmob_id and str(opp_side["id"]) == opp_fotmob_id:
            opp_match = True
        else:
            opp_name_lower = opp_name.lower()
            side_name_lower = opp_side["name"].lower()
            if opp_name_lower in side_name_lower or side_name_lower in opp_name_lower:
                opp_match = True

        if not opp_match:
            continue

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
            "date":         m["status"].get("utcTime",""),
            "home_name":    h["name"],
            "away_name":    a["name"],
            "home_goals":   int(h["score"]),
            "away_goals":   int(a["score"]),
            "union_result": res,
        })

    matches.sort(key=lambda x: x["date"], reverse=True)
    total = wins + draws + losses
    print(f"   H2H Fallback: {total} Spiele — {wins}S {draws}U {losses}N")

    if total == 0:
        return {}

    return {
        "opponent":      opp_name,
        "source":        "rapidapi-current-season",
        "wins":          wins,
        "draws":         draws,
        "losses":        losses,
        "goals_for":     goals_for,
        "goals_against": goals_against,
        "matches":       matches[:8],
    }


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
    """Vorherige Ränge aus bestehender union.json lesen (für rank_change)."""
    try:
        with open(OUT, "r", encoding="utf-8") as f:
            old = json.load(f)
        return {t["name"]: t["rank"] for t in old.get("table_context", [])}
    except Exception:
        return {}


def main():
    now = datetime.now(timezone.utc)

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

    # 3b. H2H — primär football-data.org (historisch), Fallback RapidAPI (aktuelle Saison)
    print("3b. H2H (Direktvergleich) ...")
    h2h = build_h2h_historical(next_m)
    if not h2h:
        print("   → Fallback auf RapidAPI H2H (nur aktuelle Saison) ...")
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

    # 6. Top Torschützen
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
        "h2h":              h2h,
    }

    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    print("OK  data/union.json geschrieben")


if __name__ == "__main__":
    main()
