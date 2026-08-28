#!/usr/bin/env python3
"""Atomically extract Union transfers from the official Bundesliga overview."""
from __future__ import annotations
import html, json, os, re, tempfile, urllib.request
from datetime import datetime, timezone

SOURCE_URL="https://www.bundesliga.com/de/bundesliga/news/offizieller-transfermarkt-alle-wechsel-transfers-ubersicht-11850/"
OUT=os.path.join(os.path.dirname(__file__),"..","data","transfers.json")

def split_entries(value):
    entries=[]; start=0; depth=0
    for index,char in enumerate(value):
        if char=="(": depth+=1
        elif char==")": depth=max(0,depth-1)
        elif char=="," and depth==0:
            item=value[start:index].strip()
            if item: entries.append(item)
            start=index+1
    item=value[start:].strip()
    if item: entries.append(item)
    return entries

def main():
    now_dt=datetime.now(timezone.utc)
    if datetime(2026,6,30,22,tzinfo=timezone.utc)<=now_dt<=datetime(2026,8,31,21,59,59,tzinfo=timezone.utc):
        window_id="summer-2026"; source_marker=r"Sommerwechsel 2026"
    elif datetime(2026,12,31,23,tzinfo=timezone.utc)<=now_dt<=datetime(2027,2,1,19,tzinfo=timezone.utc):
        window_id="winter-2027"; source_marker=r"(?:Winterwechsel|Wintertransfermarkt|Januar) 2027"
    else:
        print("OK: no configured transfer window is active; keeping existing snapshot")
        return
    request=urllib.request.Request(SOURCE_URL,headers={"User-Agent":"Mozilla/5.0 Paul-Hub transfers/6.19"})
    with urllib.request.urlopen(request,timeout=30) as response: page=response.read().decode("utf-8")
    page=html.unescape(page).replace("\\u0026","&")
    if not re.search(source_marker,page,re.IGNORECASE): raise RuntimeError("official page does not match active transfer window; keeping existing transfers.json")
    pattern=r"\\n1\. FC Union Berlin\\nZugänge: (.*?)\\nAbgänge: (.*?)\\nBorussia Mönchengladbach\\n"
    match=re.search(pattern,page,re.DOTALL)
    if not match: raise RuntimeError("Union section not found; keeping existing transfers.json")
    arrivals=split_entries(match.group(1)); departures=split_entries(match.group(2))
    if len(arrivals)<5 or len(departures)<5: raise RuntimeError("Union transfer list incomplete; keeping existing transfers.json")
    now=now_dt.replace(microsecond=0).isoformat().replace("+00:00","Z")
    output={"schemaVersion":2,"generatedAt":now,"season":"2026/27","windowId":window_id,"source":{"name":"Bundesliga","url":SOURCE_URL},"windows":[{"id":"summer-2026","label":"Sommertransferfenster","startsAt":"2026-07-01T00:00:00+02:00","endsAt":"2026-08-31T23:59:59+02:00"},{"id":"winter-2027","label":"Wintertransferfenster","startsAt":"2027-01-01T00:00:00+01:00","endsAt":"2027-02-01T20:00:00+01:00"}],"arrivals":arrivals,"departures":departures}
    os.makedirs(os.path.dirname(OUT),exist_ok=True); fd,tmp=tempfile.mkstemp(prefix="transfers-",suffix=".json",dir=os.path.dirname(OUT))
    try:
        with os.fdopen(fd,"w",encoding="utf-8") as handle: json.dump(output,handle,ensure_ascii=False,indent=2); handle.write("\n")
        os.replace(tmp,OUT)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    print(f"OK: {len(arrivals)} arrivals and {len(departures)} departures")

if __name__=="__main__": main()
