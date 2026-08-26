// ── COLLAPSIBLE SECTIONS ──
// State: all closed on mobile by default; desktop always open via CSS
const _csState={er:false,alma:false,apps:false};
function toggleSection(id){
  const body=document.getElementById('csBody'+id.charAt(0).toUpperCase()+id.slice(1));
  const chev=document.getElementById('csChevron'+id.charAt(0).toUpperCase()+id.slice(1));
  if(!body)return;
  _csState[id]=!_csState[id];
  body.classList.toggle('open',_csState[id]);
  if(chev)chev.classList.toggle('open',_csState[id]);
}
// Preview updaters — called by data loaders after data arrives
function updateCsPreview(id,text){
  const el=document.getElementById('csPreview'+id.charAt(0).toUpperCase()+id.slice(1));
  if(el)el.textContent=text;
}

const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MK=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MON_SHORT=['JAN','FEB','MÄR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DEZ'];
const WD=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const WK=['So','Mo','Di','Mi','Do','Fr','Sa'];
function pad(n){return String(n).padStart(2,'0');}
function fmt(v){return v.toLocaleString('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:0});}
function diff(a,b){return Math.round((b-a)/86400000);}
function st(d){const n=new Date(d);n.setHours(0,0,0,0);return n;}
function getKW(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=dt.getUTCDay()||7;dt.setUTCDate(dt.getUTCDate()+4-day);const y0=new Date(Date.UTC(dt.getUTCFullYear(),0,1));return Math.ceil((((dt-y0)/86400000)+1)/7);}

// ── THEME (3-state: light → dark → auto) ──
const THEME_KEY='hub_theme';
const THEME_ICONS={light:'☀️',dark:'🌙',auto:'🌓'};
function applyTheme(t){
  const stored=t||localStorage.getItem(THEME_KEY)||'auto';
  const isDark=stored==='dark'||(stored==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.setAttribute('data-theme',isDark?'dark':'light');
  document.getElementById('themeBtn').textContent=THEME_ICONS[stored]||'🌓';
  const themeLabel=stored==='light'?'Hell – wechseln zu Dunkel':stored==='dark'?'Dunkel – wechseln zu Automatik':'Automatik – wechseln zu Hell';
  document.getElementById('themeBtn').title=themeLabel;
  document.getElementById('themeBtn').setAttribute('aria-label',themeLabel);
  if(stored!=='auto')localStorage.setItem(THEME_KEY,stored);
  else localStorage.removeItem(THEME_KEY);
}
function toggleTheme(){
  const cur=localStorage.getItem(THEME_KEY)||'auto';
  const next=cur==='light'?'dark':cur==='dark'?'auto':'light';
  applyTheme(next);
}
applyTheme(localStorage.getItem(THEME_KEY)||'auto');
window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{
  if(!localStorage.getItem(THEME_KEY))applyTheme('auto');
});

// ── CLOCK & GREETING ──
const now=new Date();
const GREETINGS={
  night:['Noch wach, Paul? 🌙','Nachtschicht, Paul? 🦉','Ganz schön spät, Paul ✨'],
  morning:['Guten Morgen, Paul ☕','Moin Paul – auf geht’s! 🌤️','Früh dran, Paul! 🚀','Morgen, Paul – erst Kaffee? ☕'],
  noon:['Mahlzeit, Paul! 🍽️','Hallo Paul – Halbzeit! ☀️','Mittagsmodus an, Paul 😎'],
  afternoon:['Guten Tag, Paul 👋','Na Paul, läuft der Laden? ⚡','Weiter geht’s, Paul 💪','Schönen Nachmittag, Paul 🌤️'],
  evening:['Guten Abend, Paul 🌆','Feierabend in Sicht, Paul? 😌','Abendmodus an, Paul 🌙','Na Paul, noch eine Runde? ✨'],
};
function greetingPeriod(hour){
  if(hour<5)return'night';
  if(hour<11)return'morning';
  if(hour<14)return'noon';
  if(hour<18)return'afternoon';
  return'evening';
}
function updateHeaderTime(){
  const current=new Date();
  const greetings=GREETINGS[greetingPeriod(current.getHours())];
  const dayKey=current.getFullYear()*372+(current.getMonth()+1)*31+current.getDate();
  document.getElementById('clock').textContent=`${pad(current.getHours())}:${pad(current.getMinutes())}`;
  document.getElementById('greet').textContent=greetings[dayKey%greetings.length];
  document.getElementById('hdate').textContent=`${WD[current.getDay()]}, ${current.getDate()}. ${MK[current.getMonth()]} ${current.getFullYear()}`;
  updateCalendarDate(current);
}
function updateCalendarDate(current){
  document.getElementById('todayStr').textContent=`${current.getDate()}. ${MON[current.getMonth()]}`;
  const calendarWeek=getKW(current);
  document.getElementById('kwStr').textContent=`KW ${calendarWeek} · ${current.getFullYear()}`;
  document.getElementById('calIconDay').textContent=current.getDate();
  document.getElementById('calIconMonth').textContent=MON_SHORT[current.getMonth()];
  const kwEl=document.getElementById('kw');if(kwEl)kwEl.textContent=calendarWeek;
  const finMonthEl=document.getElementById('finMonth');if(finMonthEl)finMonthEl.textContent=`${MON[current.getMonth()]} ${current.getFullYear()}`;
  const kwRangeEl=document.getElementById('kwR');if(kwRangeEl)kwRangeEl.textContent=kwRange(current);
}
updateHeaderTime();
setInterval(updateHeaderTime,30000);
function kwRange(d){const day=d.getDay()||7;const m=new Date(d);m.setDate(d.getDate()-day+1);const s=new Date(m);s.setDate(m.getDate()+6);return`${m.getDate()}. ${MK[m.getMonth()]} – ${s.getDate()}. ${MK[s.getMonth()]}`;}

// ── TAGESIMPULS ──
const DAILY_IMPULSES={
  morning:[
    'Erst ankommen, dann loslegen. Der Tag rennt auch ohne Vorsprung.',
    'Ein klarer erster Schritt schlägt fünf heldenhafte Vorhaben.',
    'Kaffee ist kein Plan – aber ein ziemlich guter Anfang.',
    'Heute muss nicht spektakulär werden. Stimmig reicht völlig.',
    'Mach zuerst das, worüber du heute Abend froh sein wirst.',
    'Der Morgen gehört noch dir. Gib ihn nicht sofort dem Posteingang.',
    'Kleine Richtungskorrektur, große Wirkung. Wie beim Navi – nur ohne Gemecker.',
    'Beginne freundlich mit dir. Der Rest darf sich einreihen.',
  ],
  daytime:[
    'Nicht alles gleichzeitig ist auch eine ziemlich gute Strategie.',
    'Wenn alles wichtig ist, darfst du trotzdem eins zuerst machen.',
    'Kurz durchatmen zählt als produktive Zwischenstation.',
    'Fortschritt darf unspektakulär aussehen. Hauptsache, er bewegt sich.',
    'Eine gute Entscheidung spart mehr Energie als zehn offene Schleifen.',
    'Du musst den ganzen Weg nicht sehen. Die nächsten zehn Meter reichen.',
    'Heute ruhig sauber arbeiten – Drama ist kein Qualitätsmerkmal.',
    'Manchmal ist „fertig“ die eleganteste Form von Perfektion.',
    'Der Kopf darf sortieren, bevor die Hände beschleunigen.',
    'Ein Nein an der richtigen Stelle ist ein Ja zu deinem Tag.',
  ],
  evening:[
    'Was heute nicht fertig wurde, darf morgen mit ausgeschlafenem Personal weitermachen.',
    'Feierabend ist kein Systemfehler.',
    'Der Tag muss nicht perfekt enden, nur irgendwann.',
    'Haken dran, Schultern runter, Abend rein.',
    'Du darfst stolz auf Dinge sein, die niemand außer dir bemerkt hat.',
    'Jetzt ist eine gute Zeit, den inneren Projektleiter nach Hause zu schicken.',
    'Nicht jeder offene Punkt braucht heute noch eine Pointe.',
    'Ruhe ist kein Leerlauf. Sie lädt nur ohne Fortschrittsbalken.',
  ],
  weekend:[
    'Wochenende: Heute darf der Plan auch einfach „mal sehen“ heißen.',
    'Freie Zeit muss nichts beweisen.',
    'Ein langsamer Tag kommt manchmal erstaunlich weit.',
    'Heute ist Platz für Dinge, die in keiner Statistik auftauchen.',
    'Mach etwas, das keinen Nutzen hat – außer dass es gut tut.',
    'Der Kalender darf heute gern ein bisschen Luft enthalten.',
    'Nichtstun mit guter Haltung ist immer noch Nichtstun. Zum Glück.',
    'Heute zählt auch Umweg als Ausflug.',
  ],
  monday:[
    'Montag ist nur ein Wochentag mit etwas zu guter PR-Abteilung.',
    'Neue Woche, gleiche Schwerkraft – Schritt für Schritt reicht.',
    'Montage werden besser, wenn man sie nicht persönlich nimmt.',
    'Ein ruhiger Start ist immer noch ein Start.',
  ],
  friday:[
    'Freitag: Noch sauber landen, dann darf das Wochenende übernehmen.',
    'Heute lieber gut abschließen als hektisch neu anfangen.',
    'Der Freitag sieht die Ziellinie. Kein Grund, jetzt zu sprinten.',
    'Fast Wochenende – bitte den Tag trotzdem vollständig abspeichern.',
  ],
};
let quoteDateKey='';
let quoteOffset=0;
function localDateKey(date){
  return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}
function quotePool(date){
  const day=date.getDay();
  if(day===0||day===6)return DAILY_IMPULSES.weekend;
  if(day===1)return[...DAILY_IMPULSES.monday,...DAILY_IMPULSES.morning,...DAILY_IMPULSES.daytime];
  if(day===5)return[...DAILY_IMPULSES.friday,...DAILY_IMPULSES.daytime,...DAILY_IMPULSES.evening];
  const hour=date.getHours();
  return hour<11?DAILY_IMPULSES.morning:hour<18?DAILY_IMPULSES.daytime:DAILY_IMPULSES.evening;
}
function renderDailyImpulse(forceNext=false){
  const date=new Date();
  const dateKey=localDateKey(date);
  if(dateKey!==quoteDateKey){quoteDateKey=dateKey;quoteOffset=0;}
  if(forceNext)quoteOffset++;
  const pool=quotePool(date);
  const ordinal=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  document.getElementById('quote').textContent=pool[(ordinal+quoteOffset)%pool.length];
}
document.getElementById('quoteNext').addEventListener('click',()=>renderDailyImpulse(true));
renderDailyImpulse();
setInterval(()=>renderDailyImpulse(false),30000);

// ── TAG-INFO (Feiertage, Geburtstage, Skurrile Tage) ──
async function loadDayInfo(){
  const d=now.getDate(), m=now.getMonth()+1;
  const key=`${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const sprueche=[
    ['☀️ Sonntag – Auszeit!'],['☕ Guten Montag!'],['💪 Dienstag!'],
    ['🐪 Humpday!'],['🎉 Donnerstag!'],['🥳 Freitag! TGIF!'],['😴 Samstag!']
  ];

  // Berlin Feiertage 2026
  const feiertage={
    '01-01':'🎆 Neujahr','03-08':'♀️ Internationaler Frauentag','04-03':'✝️ Karfreitag',
    '04-06':'🐣 Ostermontag','05-01':'✊ Tag der Arbeit',
    '05-14':'⛪ Christi Himmelfahrt','05-25':'🙏 Pfingstmontag','10-03':'🇩🇪 Tag der Deutschen Einheit',
    '12-25':'🎄 1. Weihnachtstag','12-26':'🎄 2. Weihnachtstag'
  };

  const feiertagHeute = feiertage[key] || null;
  if(feiertagHeute){
    document.getElementById('feiertagSection').style.display='block';
    document.getElementById('feiertagVal').textContent=feiertagHeute+' · frei!';
    document.getElementById('specialSection').style.borderTop='1px solid var(--border)';
    document.getElementById('specialSection').style.paddingTop='8px';
  }

  // ── "Heute ist" – aus data/special-days.json ──
  try {
    const res = await fetch('data/special-days.json',{signal:AbortSignal.timeout(4000)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const special = await res.json();
    document.getElementById('specialVal').textContent = special[key] || sprueche[now.getDay()][0];
  } catch(e) {
    document.getElementById('specialVal').textContent = sprueche[now.getDay()][0];
  }

  // ── Namenstag – lokale JSON (via GitHub Actions) + API-Fallbacks ──
  try {
    const key2=`${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let found = false;

    // 1. Primär: lokale JSON
    try {
      const res2 = await fetch('data/namenstage.json', {signal: AbortSignal.timeout(3000)});
      if(res2.ok){
        const map = await res2.json();
        const name = map[key2];
        if(name){ document.getElementById('namenstagVal').textContent = name; found = true; }
      }
    } catch(e2) {}

    // 2. Fallback A: nameday.abalin.net (via allorigins CORS-Proxy)
    if(!found){
      try {
        const apiUrl=`https://nameday.abalin.net/api/V1/today?country=de`;
        const proxyUrl=`https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
        const res = await fetch(proxyUrl, {signal: AbortSignal.timeout(5000)});
        if(res.ok){
          const json = await res.json();
          const names = json?.data?.de;
          if(names){ document.getElementById('namenstagVal').textContent = Array.isArray(names)?names.join(', '):names; found = true; }
        }
      } catch(e3) {}
    }

    // 3. Fallback B: nameday.info (direkt – oft CORS-offen)
    if(!found){
      try {
        const res = await fetch(`https://api.nameday.info/nameday/DE/${m}/${d}`, {signal: AbortSignal.timeout(4000)});
        if(res.ok){
          const json = await res.json();
          const names = json?.data || json?.namedays || [];
          if(names && names.length){ document.getElementById('namenstagVal').textContent = Array.isArray(names)?names.join(', '):names; found = true; }
        }
      } catch(e4) {}
    }

    if(!found){
      document.getElementById('namenstagSection').style.display='none';
      document.getElementById('namenstagSection').previousElementSibling.style.display='none';
    }
  } catch(e) {
    document.getElementById('namenstagSection').style.display='none';
    document.getElementById('namenstagSection').previousElementSibling.style.display='none';
  }

  // ── Heute in der Geschichte – Wikipedia On This Day API ──
  try {
    const res = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/de/onthisday/events/${m}/${d}`);
    const json = await res.json();
    const events = json?.events;
    if(events && events.length){
      // Pick a random event with a year
      const ev = events[Math.floor(Math.random() * Math.min(events.length, 5))];
      const year = ev.year;
      const desc = ev.text || (ev.pages?.[0]?.description) || '';
      document.getElementById('histVal').innerHTML = `<span style="font-weight:700;color:var(--t);">${year}:</span> ${desc}`;
      // Expand on desktop, collapsed on mobile
      const histBody=document.getElementById('histBody');
      if(window.innerWidth>600){
        histBody.style.maxHeight='200px';
        const icon=document.getElementById('histToggleIcon');
        if(icon)icon.style.transform='rotate(180deg)';
      }
    } else {
      document.getElementById('histSection').style.display='none';
      document.getElementById('histSection').previousElementSibling.style.display='none';
    }
  } catch(e) {
    document.getElementById('histSection').style.display='none';
    document.getElementById('histSection').previousElementSibling.style.display='none';
  }
}

loadDayInfo();

function toggleHist(){
  const body=document.getElementById('histBody');
  const icon=document.getElementById('histToggleIcon');
  if(!body)return;
  const isOpen=body.style.maxHeight&&body.style.maxHeight!=='0px';
  body.style.maxHeight=isOpen?'0':'200px';
  if(icon)icon.style.transform=isOpen?'':'rotate(180deg)';
}

// ── PROMI GEBURTSTAGE ──
function renderPromis(list, el){
  if(!list.length){
    el.innerHTML='<div style="font-size:10px;color:var(--t3);">Heute keine Daten</div>';
    return;
  }
  el.innerHTML=list.map(p=>{
    const fotoHtml=p.foto
      ?`<img class="promi-foto" src="${p.foto}" alt="${p.name}" onerror="this.outerHTML='<div class=\\'promi-foto-placeholder\\'>🎂</div>'">`
      :`<div class="promi-foto-placeholder">🎂</div>`;
    const alter=p.alter?`· ${p.alter}`:'';
    const beruf=(p.beruf||'').replace(/\s*\(Born\s+\d{4}\)/gi,'').trim();
    const flagHtml=p.nationalitaet?`<span class="promi-flag" title="${p.nationalitaet}">🇩🇪</span>`:'';
    return`<div class="promi-chip">
      ${fotoHtml}
      <div class="promi-info">
        <div class="promi-name"><span style="overflow:hidden;text-overflow:ellipsis;">${p.name}</span>${flagHtml}</div>
        <div class="promi-meta">${beruf} ${alter}</div>
      </div>
    </div>`;
  }).join('<div style="height:1px;background:var(--border);margin:1px 0;"></div>');
}

async function fetchPromiWikipedia(el){
  // Direkter Wikipedia-Fallback wenn JSON veraltet oder nicht verfügbar
  try{
    const now=new Date();
    const m=String(now.getMonth()+1).padStart(2,'0');
    const d=String(now.getDate()).padStart(2,'0');
    const res=await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/births/${m}/${d}`,
      {signal:AbortSignal.timeout(8000)});
    if(!res.ok) throw new Error('Wikipedia '+res.status);
    const data=await res.json();
    const births=data.births||[];
    const KEYWORDS=['actor','actress','singer','musician','rapper','songwriter',
      'footballer','soccer','basketball','tennis','athlete','boxer','swimmer',
      'racing driver','golfer','politician','president','chancellor','minister',
      'director','performer','entertainer'];
    const list=[];
    for(const entry of births){
      if(list.length>=3) break;
      const yr=entry.year;
      const pages=entry.pages||[];
      if(!pages.length||!yr) continue;
      const page=pages[0];
      const desc=(page.description||'').toLowerCase();
      const ext=(page.extract||'').toLowerCase();
      if(!KEYWORDS.some(k=>desc.includes(k)||ext.includes(k))) continue;
      if(ext.includes('died')||ext.includes('death')) continue;
      list.push({
        name:page.titles?.normalized||'',
        alter:now.getFullYear()-parseInt(yr),
        beruf:(page.description||'Persönlichkeit'),
        foto:page.thumbnail?.source||null
      });
    }
    renderPromis(list,el);
  }catch(e){
    console.warn('Wikipedia Fallback fehlgeschlagen:',e);
    el.innerHTML='<div style="font-size:10px;color:var(--t3);">–</div>';
  }
}

async function loadPromiGeburtstage(){
  const el=document.getElementById('bdayVal');
  try{
    // Cache-Busting: täglich neue JSON (Querystring = heutiges Datum)
    const now=new Date();
    const cb=`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    const res=await fetch(`data/geburtstage.json?v=${cb}`,{signal:AbortSignal.timeout(6000)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data=await res.json();

    // ── Datum-Prüfung: JSON von heute? ──
    // Format im JSON: "16.05.2025" → parsen und vergleichen
    const jsonDatum=data.datum||'';
    const [jd,jm,jy]=jsonDatum.split('.').map(Number);
    const isToday=(jd===now.getDate()&&jm===(now.getMonth()+1)&&jy===now.getFullYear());

    if(!isToday){
      // GitHub Action noch nicht gelaufen → direkt Wikipedia abfragen
      console.info('geburtstage.json ist veraltet ('+jsonDatum+') → Wikipedia-Fallback');
      await fetchPromiWikipedia(el);
      return;
    }

    renderPromis(data.geburtstage||[], el);

  }catch(e){
    console.warn('Promi-Geburtstage Fehler:',e,'→ Wikipedia-Fallback');
    await fetchPromiWikipedia(el);
  }
}
loadPromiGeburtstage();

// ── HOROSKOP Zwillinge – via Cloudflare Worker, 1× täglich gecached ──
async function loadHoroskop(){
  const el=document.getElementById('horoVal');
  const metaEl=document.getElementById('horoMeta');
  if(!el) return;

  const today=new Date();
  const dateKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const cacheKey=`horo_zwillinge_${dateKey}`;

  // localStorage-Cache prüfen — kein Worker-Call nötig wenn schon da
  try{
    const cached=localStorage.getItem(cacheKey);
    if(cached){
      const obj=JSON.parse(cached);
      if(obj.text){
        el.innerHTML=`<span style="font-style:italic;">${obj.text}</span>`;
        if(metaEl){metaEl.textContent='✦ KI-generiert · heute';metaEl.style.display='block';}
        return;
      }
    }
  }catch(e){}

  // Worker aufrufen — generiert + cached serverseitig in KV
  try{
    const resp=await fetch('https://paul-gateway-v2.paul-bendzko.workers.dev/horoscope',{
      signal:AbortSignal.timeout(12000)
    });
    if(!resp.ok) throw new Error('Worker '+resp.status);
    const data=await resp.json();
    const text=data.text||'';
    if(!text) throw new Error('Kein Text');

    el.innerHTML=`<span style="font-style:italic;">${text}</span>`;
    if(metaEl){metaEl.textContent='✦ KI-generiert · heute';metaEl.style.display='block';}

    // Auch lokal cachen — alte Keys aufräumen
    try{
      Object.keys(localStorage).filter(k=>k.startsWith('horo_zwillinge_')&&k!==cacheKey).forEach(k=>localStorage.removeItem(k));
      localStorage.setItem(cacheKey,JSON.stringify({text,date:dateKey}));
    }catch(e){}

  }catch(e){
    console.warn('Horoskop Fehler:',e);
    el.innerHTML='<span style="color:var(--t3);font-size:10px;">Horoskop momentan nicht verfügbar</span>';
  }
}
loadHoroskop();

(function(){
  const now2=new Date();
  const today=new Date(now2.getFullYear(),now2.getMonth(),now2.getDate());

  function nextBday(month,day){
    let y=now2.getFullYear();
    const d=new Date(y,month-1,day);
    if(d<today) d.setFullYear(y+1);
    return d;
  }
  function daysUntil(d){return Math.round((d-today)/86400000);}
  function age(birthYear,month,day){
    const next=nextBday(month,day);
    return next.getFullYear()-birthYear;
  }

  // Emil: 30.03.2011
  const emilNext=nextBday(3,30);
  const emilDays=daysUntil(emilNext);
  const emilNextAge=age(2011,3,30);
  document.getElementById('emilBday').textContent=emilDays===0?'🎉 Heute!':emilDays===1?'Morgen!':emilDays+' Tage';
  document.getElementById('emilAge').textContent='wird '+emilNextAge+' Jahre alt';

  // Rosa: 29.04.2016
  const rosaNext=nextBday(4,29);
  const rosaDays=daysUntil(rosaNext);
  const rosaNextAge=age(2016,4,29);
  document.getElementById('rosaBday').textContent=rosaDays===0?'🎉 Heute!':rosaDays===1?'Morgen!':rosaDays+' Tage';
  document.getElementById('rosaAge').textContent='wird '+rosaNextAge+' Jahre alt';
})();

// ── SCHULFERIEN BERLIN ──
// Daten kommen aus data/schulferien_berlin.json (täglich via GitHub Actions aktualisiert)
// Fallback: openholidaysapi.org direkt
async function loadSchulferien(){
  const now2=new Date();
  const today=new Date(now2.getFullYear(),now2.getMonth(),now2.getDate());
  const iconEl=document.getElementById('ferienIcon');

  let ferien=[];

  // 1. Primär: lokale JSON
  try{
    const r=await fetch('data/schulferien_berlin.json',{signal:AbortSignal.timeout(5000)});
    if(!r.ok) throw new Error('JSON nicht erreichbar');
    const raw=await r.json();
    ferien=raw.map(f=>({
      name:f.name,
      start:new Date(f.start),
      end:new Date(f.end)
    }));
  }catch(e){
    // 2. Fallback: openholidaysapi.org live
    try{
      const yr=now2.getFullYear();
      const url=`https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-BE&languageIsoCode=DE&validFrom=${yr}-01-01&validTo=${yr+1}-12-31`;
      const r2=await fetch(url,{signal:AbortSignal.timeout(7000)});
      if(!r2.ok) throw new Error('API '+r2.status);
      const raw2=await r2.json();
      ferien=raw2.map(f=>({
        name:(f.name&&f.name[0]&&f.name[0].text)||f.id||'Ferien',
        start:new Date(f.startDate),
        end:new Date(f.endDate)
      }));
      console.log('Schulferien: Fallback openholidaysapi.org OK');
    }catch(e2){
      document.getElementById('ferienName').textContent='Daten nicht verfügbar';
      document.getElementById('ferienCountdown').textContent='–';
      document.getElementById('ferienDates').textContent='–';
      return;
    }
  }

  ferien.sort((a,b)=>a.start-b.start);

  // Check if currently IN Ferien
  const current=ferien.find(f=>today>=f.start&&today<=f.end);

  if(current){
    const daysLeft=Math.round((current.end-today)/86400000);
    const countdownEl=document.getElementById('ferienCountdown');
    if(daysLeft===0){
      countdownEl.textContent='Heute letzter Tag 🎉';
    } else if(daysLeft===1){
      countdownEl.textContent='noch 1 Tag';
    } else {
      countdownEl.textContent='noch '+daysLeft+' Tage';
    }
    countdownEl.style.color='var(--green)';
    document.getElementById('ferienName').textContent='🎉 '+fmtFerienName(current.name)+' – laufen gerade!';
    document.getElementById('ferienDates').textContent=fmtFerienRange(current.start,current.end);
    iconEl.innerHTML='<span style="font-size:20px;">🎉</span>';
    iconEl.style.background='var(--green-l)';
    iconEl.style.borderColor='var(--green-b)';
  } else {
    const next=ferien.find(f=>f.start>today);
    if(!next){
      document.getElementById('ferienName').textContent='Keine weiteren Ferien gefunden';
      document.getElementById('ferienCountdown').textContent='–';
      document.getElementById('ferienDates').textContent='–';
      return;
    }
    const daysUntilF=Math.round((next.start-today)/86400000);
    const cdText=daysUntilF<=0?'Heute 🎉':daysUntilF===1?'Morgen gehts los!':'in '+daysUntilF+' Tagen';
    document.getElementById('ferienCountdown').textContent=cdText;
    document.getElementById('ferienCountdown').style.color=daysUntilF<=0?'var(--green)':'var(--blue)';
    document.getElementById('ferienName').textContent=fmtFerienName(next.name);
    document.getElementById('ferienDates').textContent=fmtFerienRange(next.start,next.end);
    const MKF=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const fDay=next.start.getDate();
    const fMon=MKF[next.start.getMonth()].toUpperCase();
    iconEl.style.cssText='width:44px;height:44px;flex-shrink:0;overflow:hidden;border-radius:9px;border:none;background:transparent;padding:0;display:block;';
    iconEl.innerHTML=`<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="9" fill="white"/><rect y="0" width="44" height="16" fill="#e8001c"/><rect y="7" width="44" height="9" fill="#e8001c"/><text x="22" y="12" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="7" font-weight="700" fill="white" letter-spacing=".4">${fMon}</text><text x="22" y="35" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="20" font-weight="300" fill="#1D1D1F">${fDay}</text></svg>`;
  }
}
function fmtFerienName(n){
  const map={
    'winterferien':'Winterferien','osterferien':'Osterferien','pfingstferien':'Pfingstferien',
    'sommerferien':'Sommerferien','herbstferien':'Herbstferien','weihnachtsferien':'Weihnachtsferien',
    'unterrichtsfreier':'Schulfreier Tag','schulfreier':'Schulfreier Tag',
    'beweglicher ferientag':'Beweglicher Ferientag','ferientag':'Ferientag'
  };
  const low=n.toLowerCase();
  for(const k of Object.keys(map)){if(low.includes(k))return map[k];}
  return n.charAt(0).toUpperCase()+n.slice(1);
}
function fmtFerienRange(start,end){
  const opts={day:'numeric',month:'numeric'};
  const s=start.toLocaleDateString('de-DE',opts);
  const e=end.toLocaleDateString('de-DE',opts);
  const dur=Math.round((end-start)/86400000)+1;
  return`${s} – ${e} · ${dur} Tage`;
}
loadSchulferien();
const ic={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',96:'⛈️',99:'⛈️'};
const dc={0:'Klar',1:'Überwiegend klar',2:'Teils bewölkt',3:'Bedeckt',45:'Nebel',48:'Nebel',51:'Nieselregen',53:'Nieselregen',55:'Starker Nieselregen',61:'Leichter Regen',63:'Regen',65:'Starker Regen',71:'Leichter Schnee',73:'Schnee',75:'Starker Schnee',80:'Regenschauer',81:'Starke Schauer',82:'Gewitter',95:'Gewitter',96:'Gewitter',99:'Schweres Gewitter'};

const WEATHER_CACHE_MS=15*60*1000;
const LOCATION_API='https://paul-gateway-v2.paul-bendzko.workers.dev/location/reverse';
const WEATHER_BERLIN={lat:52.52,lon:13.41,city:'Berlin',personal:false};
let activeWeatherLocation=WEATHER_BERLIN;
let weatherInitialLoad=true;
function roundedCoordinate(value){return Math.round(value*100)/100;}
function weatherCacheKey({lat,lon}){return`hub_weather_${lat}_${lon}`;}
function readWeatherCache(location,allowExpired=false){
  try{
    const cached=JSON.parse(sessionStorage.getItem(weatherCacheKey(location))||'null');
    return cached?.savedAt&&(allowExpired||Date.now()-cached.savedAt<WEATHER_CACHE_MS)?cached:null;
  }catch(e){return null;}
}
function saveWeatherCache(location,data,savedAt){
  try{sessionStorage.setItem(weatherCacheKey(location),JSON.stringify({data,savedAt}));}catch(e){}
}
function setWeatherActiveLocation(location){
  activeWeatherLocation=location;
  try{sessionStorage.setItem('hub_weather_active_location',JSON.stringify(location));}catch(e){}
}
function validateWeatherData(d){
  return d?.current&&Number.isFinite(d.current.temperature_2m)&&Array.isArray(d?.daily?.time)&&d.daily.time.length>=4;
}
function renderWeather(d,location,savedAt,fromCache){
    // Current
    document.getElementById('wIcon').textContent=ic[d.current.weathercode]||'🌡️';
    document.getElementById('wTemp').textContent=`${Math.round(d.current.temperature_2m)}°C`;
    document.getElementById('wDesc').textContent=dc[d.current.weathercode]||location.city;
    document.getElementById('wCity').textContent=location.city;
    document.getElementById('wFeels').textContent=`Gefühlt ${Math.round(d.current.apparent_temperature)}°C`;
    // ── Detail Grid ──
    const todayMax=Math.round(d.daily.temperature_2m_max[0]);
    const todayMin=Math.round(d.daily.temperature_2m_min[0]);
    const wind=Math.round(d.current.wind_speed_10m||0);
    const uvIdx=d.daily.uv_index_max?.[0]??null;
    const precipProb=d.daily.precipitation_probability_max?.[0]??null;
    const detailEl=document.getElementById('wDetails');
    if(detailEl){
      // UV
      if(uvIdx!==null){
        document.getElementById('wdUVVal').textContent=uvIdx.toFixed(1);
        document.getElementById('wdUVBar').style.width=Math.min(100,uvIdx/11*100)+'%';
      }
      // Niederschlagswahrscheinlichkeit
      if(precipProb!==null){
        document.getElementById('wdPrecVal').textContent=precipProb+'%';
        document.getElementById('wdPrecBar').style.width=precipProb+'%';
      }
      // Temp range
      document.getElementById('wdTRange')&&(document.getElementById('wdTRange').textContent=`${todayMin}°–${todayMax}°`);
      // Inline temp range next to big temp
      const trInline=document.getElementById('wTRangeInline');
      if(trInline){document.getElementById('wTRangeVal').textContent=`${todayMin}°–${todayMax}°`;trInline.style.display='flex';}
      // Wind
      document.getElementById('wdWind').textContent=wind;
      document.getElementById('wdWindBar').style.width=Math.min(100,wind/100*100)+'%';
      detailEl.style.display='grid';
    }
    // ── Sonnenauf-/untergang ──
    const sunriseStr=d.daily.sunrise?.[0]||null;
    const sunsetStr=d.daily.sunset?.[0]||null;
    const sunRowEl=document.getElementById('wSunRow');
    if(sunRowEl&&sunriseStr&&sunsetStr){
      const fmtSun=s=>{const dt=new Date(s);return`${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;};
      document.getElementById('wSunrise').textContent=fmtSun(sunriseStr);
      document.getElementById('wSunset').textContent=fmtSun(sunsetStr);
      sunRowEl.style.display='flex';
    }
    // Forecast: next 3 days (skip today = index 0)
    const days=d.daily;
    const fEl=document.getElementById('wForecast');
    const names=['So','Mo','Di','Mi','Do','Fr','Sa'];
    fEl.innerHTML=[1,2,3].map(i=>{
      const date=new Date(`${days.time[i]}T12:00:00`);
      const name=names[date.getDay()];
      const max=Math.round(days.temperature_2m_max[i]);
      const min=Math.round(days.temperature_2m_min[i]);
      const icon=ic[days.weathercode[i]]||'🌡️';
      return `<div class="weather-day">
        <div class="weather-day-name">${name}</div>
        <div class="weather-day-icon">${icon}</div>
        <div class="weather-day-temp">${max}°</div>
        <div class="weather-day-range">${min}° – ${max}°</div>
      </div>`;
    }).join('');

  const time=new Date(savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('weatherStatus').textContent=`Stand ${time} Uhr${fromCache?' · Cache':''}`;
  document.getElementById('weatherRetry').hidden=true;
  const locationButton=document.getElementById('weatherLocationBtn');
  locationButton.textContent=location.personal?'✓ Mein Standort':'⌖ Standort';
  locationButton.disabled=false;
  const query=location.personal?`${location.lat},${location.lon}`:location.city;
  document.getElementById('weatherMoreLink').href=`https://www.google.com/search?q=${encodeURIComponent(`Wetter ${query}`)}`;
}

async function fetchWetter(location,{force=false}={}){
  try{
    const cached=!force&&readWeatherCache(location);
    if(cached){
      renderWeather(cached.data,location,cached.savedAt,true);
      return;
    }
    document.getElementById('weatherStatus').textContent='Wird aktualisiert …';
    const params=new URLSearchParams({
      latitude:String(location.lat),longitude:String(location.lon),
      current:'temperature_2m,apparent_temperature,weathercode,wind_speed_10m',
      daily:'weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset',
      forecast_days:'4',timezone:'auto',
    });
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    if(!validateWeatherData(d))throw new Error('Ungültige Wetterdaten');
    const savedAt=Date.now();
    saveWeatherCache(location,d,savedAt);
    renderWeather(d,location,savedAt,false);
  }catch(e){
    const stale=readWeatherCache(location,true);
    if(stale){
      renderWeather(stale.data,location,stale.savedAt,true);
      document.getElementById('weatherStatus').textContent=`Stand ${new Date(stale.savedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr · veraltet`;
      document.getElementById('weatherRetry').hidden=false;
      return;
    }
    document.getElementById('wTemp').textContent='--°';
    document.getElementById('wDesc').textContent='Wetter nicht verfügbar';
    document.getElementById('wFeels').textContent='';
    document.getElementById('weatherStatus').textContent='Aktualisierung fehlgeschlagen';
    document.getElementById('weatherRetry').hidden=false;
    document.getElementById('weatherLocationBtn').disabled=false;
  }finally{
    if(weatherInitialLoad&&window._lbTick)window._lbTick();
    weatherInitialLoad=false;
  }
}

function useCurrentWeatherLocation(){
  const button=document.getElementById('weatherLocationBtn');
  if(!navigator.geolocation){
    document.getElementById('weatherStatus').textContent='Standort wird nicht unterstützt';
    return;
  }
  button.disabled=true;
  button.textContent='Standort …';
  navigator.geolocation.getCurrentPosition(async pos=>{
    const location={
      lat:roundedCoordinate(pos.coords.latitude),
      lon:roundedCoordinate(pos.coords.longitude),
      city:'Standort wird ermittelt …',personal:true,
    };
    try{
      const params=new URLSearchParams({lat:String(location.lat),lon:String(location.lon)});
      const response=await fetch(`${LOCATION_API}?${params}`,{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(data?.name)location.city=String(data.name);
    }catch(e){location.city='Mein Standort';}
    setWeatherActiveLocation(location);
    fetchWetter(location,{force:true});
  },()=>{
    button.disabled=false;
    button.textContent=activeWeatherLocation.personal?'✓ Mein Standort':'⌖ Standort';
    document.getElementById('weatherStatus').textContent='Standort nicht freigegeben · bisherige Auswahl bleibt aktiv';
  },{enableHighAccuracy:false,timeout:7000,maximumAge:15*60*1000});
}

try{
  const storedLocation=JSON.parse(sessionStorage.getItem('hub_weather_active_location')||'null');
  if(storedLocation?.personal&&Number.isFinite(storedLocation.lat)&&Number.isFinite(storedLocation.lon))activeWeatherLocation=storedLocation;
}catch(e){}
document.getElementById('weatherLocationBtn').addEventListener('click',useCurrentWeatherLocation);
document.getElementById('weatherRetry').addEventListener('click',()=>fetchWetter(activeWeatherLocation,{force:true}));
fetchWetter(activeWeatherLocation);
setInterval(()=>{
  if(document.visibilityState==='visible')fetchWetter(activeWeatherLocation,{force:true});
},WEATHER_CACHE_MS);

// ── FINANZEN BLUR ──
let _finBlurred=true;
function toggleFinBlur(e){
  if(e)e.preventDefault();
  _finBlurred=!_finBlurred;
  const wrap=document.getElementById('finRowWrap');
  const btn=document.getElementById('finBlurBtn');
  if(wrap)wrap.classList.toggle('fin-blurred',_finBlurred);
  if(btn)btn.textContent=_finBlurred?'👁 Zeigen':'👁 Blenden';
}
// Blur sofort beim Laden aktivieren
(function initBlur(){
  const wrap=document.getElementById('finRowWrap');
  const btn=document.getElementById('finBlurBtn');
  if(wrap)wrap.classList.add('fin-blurred');
  if(btn)btn.textContent='👁 Zeigen';
})();

// ── FINANZEN ──
async function loadFin(){
  try{
    const jbKey=localStorage.getItem('fp3_jb_key')||'';
    const jbBin=localStorage.getItem('fp3_jb_bin')||'';
    let S=null;
    if(jbKey&&jbBin){
      try{const r=await fetch('https://api.jsonbin.io/v3/b/'+jbBin+'/latest',{headers:{'X-Master-Key':jbKey},signal:AbortSignal.timeout(6000)});
      if(r.ok){const j=await r.json();S=j.record?.s||j.record||null;}}catch(e){}
    }
    if(!S){const raw=localStorage.getItem('fp3');if(!raw){
      document.getElementById('pufSub').textContent='Finanzen-App einmal öffnen';
      document.getElementById('sparQuote').textContent='–';
      document.getElementById('sparAbs').textContent='Noch keine Daten';
      if(window._lbTick)window._lbTick();
      return;
    }S=JSON.parse(raw);}
    const g=S.gehalt?.v||0,z=(S.zusatz?.on&&S.zusatz?.v)?S.zusatz.v:0,ein=g+z;
    let total=0;
    ['miete','strom','internet','lebensmittel','schufa','ing','haftpflicht','rechtsschutz','kredit','gez','unterhalt','kids','handyemil','handyrosa','ukv','sparta','bling','unionemil','handypaul','icloud','spotify','finanzguru','claude','unionmitgl','amazon','parqet','futbology','fotmob','bvg','dauerkarte','garmin'].forEach(k=>{
      if(S[k]?.on){const v=S[k].v||0,f=S[k].freq||'monthly';total+=f==='quarterly'?v/3:f==='annual'?v/12:v;}
    });
    const ci=JSON.parse(localStorage.getItem('fp3c')||'[]');
    ci.forEach(it=>{if(S[it.k]?.on)total+=S[it.k].v||0;});
    const inv=S.invest?.v||0,notg=S.notgr?.v||0,url=S.urlaub?.v||0,sond=S.sonder?.v||0;
    const puf=ein-total-inv-notg-url-sond;
    const pct=Math.min(100,Math.max(0,ein>0?Math.round((puf/ein)*100):0));
    const el=document.getElementById('puffer');
    el.textContent=fmt(puf);el.className='fin-row-val '+(puf>=0?'g':'r');
    document.getElementById('finBar').style.width=pct+'%';
    document.getElementById('finBar').className='fin-row-bar-fill'+(puf>=0?'':' r');
    document.getElementById('pufSub').textContent=puf>=0?'Im Plan ✓':'Überbudget!';
    document.getElementById('finPct').textContent=pct+'% frei';
    // (ein/aus werden nur in der Finanz-App angezeigt, nicht im Hub)
    const spar=inv+notg;
    const sparPct=ein>0?Math.round((spar/ein)*100):0;
    document.getElementById('sparQuote').textContent=sparPct+'%';
    document.getElementById('sparAbs').textContent=fmt(spar)+' / Monat';
    document.getElementById('sparRing').style.strokeDashoffset=101-(101*sparPct/100);
    const syncLbl=document.getElementById('syncLbl');
    syncLbl.textContent=(jbKey&&jbBin?'JSONBin Live':'localStorage')+' · Monatlich';
    document.getElementById('finUpdated').textContent='Stand: '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
    const cats={};
    const catMap={miete:'Wohnen',strom:'Wohnen',internet:'Wohnen',lebensmittel:'Wohnen',schufa:'Wohnen',ing:'Wohnen',haftpflicht:'Versicherung',rechtsschutz:'Versicherung',kredit:'Versicherung',gez:'Versicherung',unterhalt:'Familie',kids:'Familie',handyemil:'Familie',handyrosa:'Familie',ukv:'Familie',sparta:'Familie',bling:'Familie',unionemil:'Familie',handypaul:'Abos',icloud:'Abos',spotify:'Abos',finanzguru:'Abos',claude:'Abos',unionmitgl:'Abos',amazon:'Abos',parqet:'Abos',futbology:'Abos',fotmob:'Abos',bvg:'Freizeit',dauerkarte:'Freizeit',garmin:'Freizeit'};
    const catColors={'Wohnen':'#0071e3','Familie':'#34c759','Versicherung':'#ff9500','Abos':'#af52de','Freizeit':'#ff3b30'};
    ['miete','strom','internet','lebensmittel','schufa','ing','haftpflicht','rechtsschutz','kredit','gez','unterhalt','kids','handyemil','handyrosa','ukv','sparta','bling','unionemil','handypaul','icloud','spotify','finanzguru','claude','unionmitgl','amazon','parqet','futbology','fotmob','bvg','dauerkarte','garmin'].forEach(k=>{
      if(S[k]?.on){const c=catMap[k]||'Sonstiges';cats[c]=(cats[c]||0)+(S[k].v||0);}
    });
  }catch(e){}
  if(window._lbTick)window._lbTick();
}
loadFin();

// ── BITCOIN LIVE ──
async function loadBtc(){
  try{
    const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true',{signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw new Error();
    const d=await r.json();
    const price=d?.bitcoin?.eur;
    const change=d?.bitcoin?.eur_24h_change;
    if(price==null)throw new Error();

    const fmtEur=v=>v.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:0})+' €';
    const fmtPct=v=>(v>=0?'↑ +':'↓ ')+Math.abs(v).toFixed(2).replace('.',',')+' %';

    document.getElementById('btcPrice').textContent=fmtEur(price);
    const chEl=document.getElementById('btcChange');
    chEl.textContent=fmtPct(change);
    chEl.className='btc-change '+(change>=0?'g':'r');

    const now=new Date();
    document.getElementById('btcTime').textContent=now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
  }catch(e){
    const f=document.getElementById('btcFooter');
    if(f)f.style.display='none';
  }
}
loadBtc();

// ── AKTIEN LIVE (Finnhub via Worker + Yahoo Finance EU) ──
const MARKET_API='https://paul-gateway-v2.paul-bendzko.workers.dev/market';

// Vollständiges Parqet-Portfolio – 22 Positionen
// fhSym  = Finnhub-Symbol (US-Listing oder ADR)
// yfSym  = Yahoo Finance Symbol (EU-Listing, CORS-Proxy-Fallback)
// fbEur  = Parqet-Fallback-Preis in EUR (falls beide APIs fehlschlagen)
// fbPct  = letzter bekannter Tages-%  (Platzhalter, greift nur bei totalem API-Ausfall)
const STOCKS=[
  {name:'Microsoft',         fhSym:'MSFT',   yfSym:null,      logo:'microsoft.com',       cur:'USD', fbEur:null,    fbPct:null},
  {name:'Alphabet',          fhSym:'GOOGL',  yfSym:null,      logo:'google.com',           cur:'USD', fbEur:null,    fbPct:null},
  {name:'ASML',              fhSym:'ASML',   yfSym:null,      logo:'asml.com',             cur:'USD', fbEur:null,    fbPct:null},
  {name:'Novo Nordisk',      fhSym:'NVO',    yfSym:null,      logo:'novonordisk.com',      cur:'USD', fbEur:null,    fbPct:null},
  {name:'Deutsche Börse',    fhSym:null,     yfSym:'DB1.DE',  logo:'deutsche-boerse.com',  cur:'EUR', fbEur:244.15,  fbPct:0},
  {name:'Procter & Gamble',  fhSym:'PG',     yfSym:null,      logo:'pg.com',               cur:'USD', fbEur:null,    fbPct:null},
  {name:'Lotus Bakeries',    fhSym:null,     yfSym:'LOTB.BR', logo:'lotusbakeries.com',    cur:'EUR', fbEur:10530,   fbPct:0},
  {name:'Wolters Kluwer',    fhSym:'WTKWY',  yfSym:'WKL.AS',  logo:'wolterskluwer.com',    cur:'USD', fbEur:61.38,   fbPct:0},
  {name:'Mercado Libre',     fhSym:'MELI',   yfSym:null,      logo:'mercadolibre.com',     cur:'USD', fbEur:null,    fbPct:null},
  {name:'Siemens',           fhSym:'SIEGY',  yfSym:'SIE.DE',  logo:'siemens.com',          cur:'USD', fbEur:258.67,  fbPct:0},
  {name:'Hannover Rück',     fhSym:'HVRRF',  yfSym:'HNR1.DE', logo:'hannover-re.com',      cur:'USD', fbEur:236.70,  fbPct:0},
  {name:'Ferrari',           fhSym:'RACE',   yfSym:null,      logo:'ferrari.com',          cur:'USD', fbEur:null,    fbPct:null},
  {name:'Tesla',             fhSym:'TSLA',   yfSym:null,      logo:'tesla.com',            cur:'USD', fbEur:null,    fbPct:null},
  {name:'Nubank',            fhSym:'NU',     yfSym:null,      logo:'nu.com.br',            cur:'USD', fbEur:null,    fbPct:null},
  {name:'Cintas',            fhSym:'CTAS',   yfSym:null,      logo:'cintas.com',           cur:'USD', fbEur:null,    fbPct:null},
  {name:'American Express',  fhSym:'AXP',    yfSym:null,      logo:'americanexpress.com',  cur:'USD', fbEur:null,    fbPct:null},
  {name:'Hermès',            fhSym:'HESAY',  yfSym:'RMS.PA',  logo:'hermes.com',           cur:'USD', fbEur:1576.50, fbPct:0},
  {name:'Netflix',           fhSym:'NFLX',   yfSym:null,      logo:'netflix.com',          cur:'USD', fbEur:null,    fbPct:null},
  {name:'BKW',               fhSym:null,     yfSym:'BKW.SW',  logo:'bkw.ch',              cur:'EUR', fbEur:163.10,  fbPct:0},
  {name:'Zoetis',            fhSym:'ZTS',    yfSym:null,      logo:'zoetis.com',           cur:'USD', fbEur:null,    fbPct:null},
  {name:'Richtech Robotics', fhSym:'RR',     yfSym:null,      logo:'richtechrobotics.com', cur:'USD', fbEur:null,    fbPct:null},
  {name:'Clover Health',     fhSym:'CLOV',   yfSym:null,      logo:'cloverhealth.com',     cur:'USD', fbEur:null,    fbPct:null},
];

function toggleStocksAll(){
  const el=document.getElementById('stocksAll');
  const arr=document.getElementById('stocksArrow');
  const open=el.classList.toggle('open');
  if(arr)arr.classList.toggle('open',open);
}

// Logos: Google Favicons (kostenlos, kein Auth, zuverlässig)
function logoUrl(domain){
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

// Finnhub Quote (US-Aktien + ADRs)
async function fetchFinnhubQuote(sym){
  const url=`${MARKET_API}/quote?symbol=${encodeURIComponent(sym)}`;
  const r=await fetch(url,{signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const d=await r.json();
  if(!d||!d.c||d.c===0)return null;
  return{price:d.c,prevClose:d.pc,pct:d.dp??((d.c-d.pc)/d.pc*100),high52:null,low52:null,dataState:r.headers.get('X-Market-Data')||'unknown',storedAt:Number(r.headers.get('X-Market-Stored-At'))||null};
}

// Finnhub 52W Metric (kostenlos, separater Call)
async function fetchFinnhub52W(sym){
  try{
    const url=`${MARKET_API}/metric?symbol=${encodeURIComponent(sym)}`;
    const r=await fetch(url,{signal:AbortSignal.timeout(6000)});
    if(!r.ok)return null;
    const d=await r.json();
    const m=d?.metric;
    if(!m)return null;
    return{high52:m['52WeekHigh']??null,low52:m['52WeekLow']??null};
  }catch(e){return null;}
}

// Yahoo Finance wird serverseitig über den eigenen Worker geladen.
async function fetchYahooQuote(yfSym){
  const url=`${MARKET_API}/yahoo?symbol=${encodeURIComponent(yfSym)}`;
  const r=await fetch(url,{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const d=await r.json();
  if(!d||!Number.isFinite(d.price)||d.price<=0)return null;
  return{price:d.price,pct:d.changePercent,high52:d.high52,low52:d.low52,currency:d.currency||'EUR',marketTime:d.marketTime,dataState:r.headers.get('X-Market-Data')||'unknown',storedAt:Number(r.headers.get('X-Market-Stored-At'))||null};
}

async function getEurRates(){
  try{
    const r=await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',{signal:AbortSignal.timeout(5000)});
    const txt=await r.text();
    const rates={EUR:1};
    const re=/currency='([A-Z]+)'\s+rate='([\d.]+)'/g;
    let m;while((m=re.exec(txt))!==null)rates[m[1]]=parseFloat(m[2]);
    return rates;
  }catch(e){
    // ECB-Format: 1 EUR = X Fremdwährung (nicht invertiert!)
    return{EUR:1,USD:1.12,CHF:0.93,DKK:7.46,GBP:0.85,SEK:11.6,NOK:11.8};
  }
}

let stocksLoading=false;
let stocksHaveData=false;
let stocksInitialLoad=true;
async function loadStocks(){
  if(stocksLoading)return;
  stocksLoading=true;
  const hlEl=document.getElementById('stocksHighlights');
  const allEl=document.getElementById('stocksAll');
  const metaEl=document.getElementById('stocksMeta');

  try{
    const ratesPromise=getEurRates();

    // Finnhub parallel laden; Yahoo-Fallbacks danach bewusst nacheinander,
    // damit der Anbieter nicht durch einen Request-Burst gedrosselt wird.
    const results=await Promise.all(STOCKS.map(async(s)=>{
      if(s.fhSym){
        try{
          const q=await fetchFinnhubQuote(s.fhSym);
          if(q&&q.price>0)return{...s,sym:s.fhSym,price:q.price,pct:q.pct,high52:q.high52,low52:q.low52,dataState:q.dataState,storedAt:q.storedAt};
        }catch(e){}
      }
      return null;
    }));

    for(let i=0;i<STOCKS.length;i++){
      if(results[i])continue;
      const s=STOCKS[i];
      const yahooSymbol=s.yfSym||s.fhSym;
      if(yahooSymbol){
        try{
          const q=await fetchYahooQuote(yahooSymbol);
          if(q&&q.price>0){
            results[i]={...s,sym:yahooSymbol.split('.')[0],price:q.price,pct:q.pct,high52:q.high52,low52:q.low52,cur:q.currency||'EUR',dataState:q.dataState,storedAt:q.storedAt,marketTime:q.marketTime};
            continue;
          }
        }catch(e){}
      }
      if(s.fbEur!=null){
        results[i]={...s,sym:(s.fhSym||s.yfSym?.split('.')[0]||s.name),price:s.fbEur,pct:s.fbPct??0,high52:null,low52:null,cur:'EUR',isFallback:true};
      }
    }
    const rawRows=results.filter(Boolean);

    if(!rawRows.length)throw new Error('Keine Daten');

    const rates=await ratesPromise;
    const toEur=(v,cur)=>{
      if(cur==='EUR')return v;
      const rate=rates[cur];
      if(!rate||rate===0)return v;
      return v/rate;
    };

    const rows=rawRows.map(s=>({...s,priceEur:toEur(s.price,s.cur)}));
    rows.sort((a,b)=>b.pct-a.pct);

    const fmtEur=v=>v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
    const fmtPct=v=>(v>=0?'▲ +':'▼ ')+Math.abs(v).toFixed(2).replace('.',',')+' %';
    const shortSym=sym=>{
      const s=String(sym??'');
      return s.includes('.')?s.split('.')[0]:s.includes(':')?s.split(':')[1]:s;
    };

    renderStocksRows(rows,fmtEur,fmtPct,shortSym);

    const fallbackCount=rows.filter(r=>r.isFallback).length;
    const staleCount=rows.filter(r=>r.dataState==='stale').length;
    const newestStoredAt=Math.max(0,...rows.map(r=>r.storedAt||0));
    const ts=new Date(newestStoredAt||Date.now()).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr';
    const dataLabel=staleCount?'teils verzögert':'gecacht, max. 5 Min.';
    if(metaEl){
      metaEl.style.display='flex';
      const hint=fallbackCount?` · ${fallbackCount}× statisch`:'';
      metaEl.innerHTML=`<div class="stocks-meta-dot"></div><span style="font-size:8.5px;color:var(--t3);">Finnhub + Yahoo${hint} · ${dataLabel} · Stand ${ts} · ${rows.length} Positionen · alle in EUR</span>`;
    }

    renderTicker(rows,fmtEur,fmtPct,{timestamp:ts,stale:staleCount>0});
    stocksHaveData=true;

    // 52W nachladen (non-blocking)
    (async()=>{
      const fhRows=rows.filter(r=>r.fhSym&&!r.isFallback&&(!r.high52||!r.low52));
      await Promise.all(fhRows.map(async r=>{
        const m=await fetchFinnhub52W(r.fhSym);
        if(m){r.high52=m.high52;r.low52=m.low52;}
      }));
      renderStocksRows(rows,fmtEur,fmtPct,shortSym);
    })();

  }catch(e){
    if(hlEl)hlEl.innerHTML=`<div style="font-size:10px;color:var(--t3);padding:6px 2px;">Kurse konnten nicht geladen werden.</div>`;
    if(!stocksHaveData){
      const strip=document.getElementById('stockTicker');
      if(strip)strip.style.display='none';
    }
  }
  stocksLoading=false;
  if(stocksInitialLoad&&window._lbTick)window._lbTick();
  stocksInitialLoad=false;
}

function renderStocksRows(rows,fmtEur,fmtPct,shortSym){
  const hlEl=document.getElementById('stocksHighlights');
  const allEl=document.getElementById('stocksAll');

  const w52Html=(r,compact)=>{
    if(!r.high52||!r.low52||r.high52<=r.low52)return '';
    const pct=Math.max(0,Math.min(100,((r.price-r.low52)/(r.high52-r.low52))*100));
    const fmtN=v=>v>=1000?v.toLocaleString('de-DE',{maximumFractionDigits:0}):v.toFixed(2).replace('.',',');
    if(compact){
      return `<div class="stock-row-52w">
        <span class="stock-row-52w-lbl">${fmtN(r.low52)}</span>
        <div class="stock-52w-bar" style="height:2px;flex:1;overflow:visible;">
          <div class="stock-52w-dot" style="left:${pct}%;width:5px;height:5px;top:-1.5px;"></div>
        </div>
        <span class="stock-row-52w-lbl">${fmtN(r.high52)}</span>
      </div>`;
    }
    return `<div class="stock-52w">
      <span class="stock-52w-lbl">${fmtN(r.low52)}</span>
      <div class="stock-52w-bar" style="overflow:visible;">
        <div class="stock-52w-dot" style="left:${pct}%"></div>
      </div>
      <span class="stock-52w-lbl">${fmtN(r.high52)}</span>
    </div>`;
  };

  const top3=rows.slice(0,3);
  if(hlEl)hlEl.innerHTML=top3.map((r,i)=>`
    <div class="stock-highlight${i===0?' top1':''}">
      <div class="stock-highlight-rank">${i+1}</div>
      <img class="stock-highlight-logo" src="${logoUrl(r.logo)}" alt="${r.name}" onerror="this.style.display='none'">
      <div class="stock-highlight-name" style="min-width:0;flex:1;">
        <span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}<span class="stock-highlight-sym"> ${shortSym(r.sym||r.fhSym||r.yfSym)}</span></span>
        ${w52Html(r,false)}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="stock-highlight-price">${fmtEur(r.priceEur)}</div>
        <div class="stock-highlight-pct ${r.pct>=0?'g':'r'}" style="margin-top:2px;">${fmtPct(r.pct)}${r.isFallback?' · statisch':''}</div>
      </div>
    </div>`).join('');

  const rest=rows.slice(3);
  if(allEl)allEl.innerHTML=rest.map(r=>`
    <div class="stock-row">
      <img class="stock-row-logo" src="${logoUrl(r.logo)}" alt="${r.name}" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:4px;">
          <div class="stock-row-name">${r.name}</div>
          <span style="font-size:8.5px;font-weight:600;color:var(--t3);flex-shrink:0;">${shortSym(r.sym||r.fhSym||r.yfSym)}</span>
        </div>
        ${w52Html(r,true)}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="stock-row-price">${fmtEur(r.priceEur)}</div>
        <div class="stock-row-pct ${r.pct>=0?'g':'r'}" style="font-size:8.5px;">${fmtPct(r.pct)}${r.isFallback?' · statisch':''}</div>
      </div>
    </div>`).join('');
}

loadStocks();
setInterval(()=>{
  if(document.visibilityState==='visible')loadStocks();
},300000);

// ── TICKER STRIP ──
function renderTicker(rows,fmtEur,fmtPct,meta={}){
  const track=document.getElementById('tickerTrack');
  const strip=document.getElementById('stockTicker');
  if(!track||!rows||!rows.length)return;

  const _fmtEur=fmtEur||(v=>v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €');
  const _fmtPct=fmtPct||(v=>(v>=0?'▲ +':'▼ ')+Math.abs(v).toFixed(2).replace('.',',')+' %');

  // Kürzel ohne Exchange-Prefix
  const tickerSym=r=>{
    const s=String(r.sym||r.fhSym||r.yfSym||'');
    return s.includes('.')?s.split('.')[0]:s.includes(':')?s.split(':')[1]:s;
  };

  // Sortierung: alphabetisch für TV-Ticker
  const sorted=rows.filter(r=>!r.isFallback).sort((a,b)=>tickerSym(a).localeCompare(tickerSym(b)));
  if(!sorted.length){
    if(strip)strip.style.display='none';
    return;
  }

  const html=sorted.map(r=>`
    <div class="ticker-item">
      <span class="ticker-item-name">${tickerSym(r)}</span>
      <span class="ticker-item-price">${_fmtEur(r.priceEur??r.price)}</span>
      <span class="ticker-item-pct ${r.pct>=0?'g':'r'}">${r.pct>=0?'▲':'▼'} ${Math.abs(r.pct).toFixed(2).replace('.',',')}%</span>
    </div>`).join('');
  const status=`<div class="ticker-item ticker-item-status">Stand ${meta.timestamp||'–'}${meta.stale?' · teils verzögert':' · max. 5 Min.'}</div>`;
  track.innerHTML=`<div class="ticker-sequence">${status}${html}</div><div class="ticker-sequence ticker-copy" aria-hidden="true">${status}${html}</div>`;
  if(strip){strip.style.display='';strip.classList.remove('loading');}
}
async function loadKids(){
  try{
    const ID='1272WyGImvHjWNlSCK1f0oPs5pgJBbmLEtsfvT3q44dE';
    const r=await fetch(`https://docs.google.com/spreadsheets/d/${ID}/gviz/tq?tqx=out:csv`);
    const csv=await r.text();
    const rows=csv.trim().split('\n').slice(1).map(l=>l.split(',').map(c=>c.replace(/^"|"$/g,'')));
    const today=st(new Date());
    const entries=rows.map(r=>{
      const p=r[0]?.trim().split('/');if(!p||p.length<3)return null;
      const d=st(new Date(`${p[2]}-${p[1]}-${p[0]}`));
      return isNaN(d)?null:{date:d,who:r[2]?.trim()};
    }).filter(Boolean).sort((a,b)=>a.date-b.date);

    // Build 14-day timeline
    const track=document.getElementById('erTrack');track.innerHTML='';
    const datesRow=document.getElementById('erDates');datesRow.innerHTML='';
    // Collect who each day + detect block transitions for date labels
    const dayData=[];
    for(let i=0;i<14;i++){
      const d=new Date(today);d.setDate(today.getDate()+i);
      const e=entries.find(e=>diff(d,e.date)===0);
      const isPaul=e?.who==='Paul';
      dayData.push({d,isPaul});
      const div=document.createElement('div');
      div.className='er-day '+(isPaul?'paul':'dani')+(i===0?' today':'');
      div.title=`${WK[d.getDay()]} ${d.getDate()}.${d.getMonth()+1} – ${isPaul?'Bei Paul':'Bei Dani'}`;
      div.innerHTML=`<span class="er-dl">${WK[d.getDay()][0]}</span>`;
      track.appendChild(div);
    }
    // Date labels: show dd.M. at start of each block (transition or index 0)
    for(let i=0;i<14;i++){
      const isStart=i===0||(dayData[i].isPaul!==dayData[i-1].isPaul);
      const isEnd=i===13||(dayData[i].isPaul!==dayData[i+1].isPaul);
      const slot=document.createElement('div');
      const d=dayData[i].d;
      const lbl=(isStart||isEnd)?`${d.getDate()}.${d.getMonth()+1}`:'';
      slot.className='er-date-slot'+(lbl?' show':'');
      slot.textContent=lbl;
      datesRow.appendChild(slot);
    }

    const todayWho=entries.find(e=>diff(today,e.date)===0)?.who||'?';
    // Update badge: show who has the kids RIGHT NOW
    const badge=document.getElementById('erBadge');
    badge.textContent=todayWho==='Paul'?'Bei Paul 🏠':'Bei Dani 🏡';
    badge.className='er-badge '+(todayWho==='Paul'?'paul':'dani');

    const fut=entries.filter(e=>e.date>=today);

    if(todayWho==='Paul'){
      // Kids are HERE → show remaining days + when next Paul-block starts after Dani
      let cnt=0;for(const e of fut){if(e.who==='Paul')cnt++;else break;}
      document.getElementById('c1lbl').textContent='Noch bei Paul';
      document.getElementById('c1n').textContent=cnt;
      document.getElementById('c1n').className='er-n g';
      document.getElementById('c1s').textContent=cnt===1?'Heute letzter Tag':'inkl. heute';

      // Next Paul block: how many days in a row?
      const nd=fut.find(e=>e.who==='Dani');
      const np=nd?fut.find(e=>e.date>nd.date&&e.who==='Paul'):null;
      if(np){
        // Count consecutive Paul days in that block
        let npCnt=0;const npStart=np.date;
        for(const e of fut.filter(e=>e.date>=npStart)){if(e.who==='Paul')npCnt++;else break;}
        document.getElementById('c2lbl').textContent='Nächster Besuch';
        document.getElementById('c2n').textContent=npCnt;
        document.getElementById('c2n').className='er-n b';
        document.getElementById('c2s').textContent=`${npCnt} Tage · ab ${WK[np.date.getDay()]}. ${np.date.getDate()}. ${MK[np.date.getMonth()]}`;
      }
      if(nd){document.getElementById('erNext').innerHTML=`<span>🔄</span><span>Wechsel zu Dani: <strong>${WK[nd.date.getDay()]}. ${nd.date.getDate()}. ${MK[nd.date.getMonth()]}</strong></span>`;}
      updateCsPreview('er', `Bei Paul 🏠 · noch ${cnt} ${cnt===1?'Tag':'Tage'}`);

    } else {
      // Kids at Dani → show remaining days there + how many days at Paul in next block
      let cnt=0;for(const e of fut){if(e.who==='Dani')cnt++;else break;}
      document.getElementById('c1lbl').textContent='Noch bei Dani';
      document.getElementById('c1n').textContent=cnt;
      document.getElementById('c1n').className='er-n gr';
      document.getElementById('c1s').textContent='inkl. heute';

      // Next Paul block: how many consecutive days?
      const np=fut.find(e=>e.who==='Paul');
      if(np){
        let npCnt=0;const npStart=np.date;
        for(const e of fut.filter(e=>e.date>=npStart)){if(e.who==='Paul')npCnt++;else break;}
        document.getElementById('c2lbl').textContent='Tage bei Paul danach';
        document.getElementById('c2n').textContent=npCnt;
        document.getElementById('c2n').className='er-n b';
        document.getElementById('c2s').textContent=`ab ${WK[np.date.getDay()]}. ${np.date.getDate()}. ${MK[np.date.getMonth()]}`;
        document.getElementById('erNext').innerHTML=`<span>🏠</span><span>Emil & Rosa kommen: <strong>${WK[np.date.getDay()]}. ${np.date.getDate()}. ${MK[np.date.getMonth()]}</strong></span>`;
      }
      updateCsPreview('er', `Bei Dani · noch ${cnt} Tage · kommen ${np?WK[np.date.getDay()]+'. '+np.date.getDate()+'. '+MK[np.date.getMonth()]:'–'}`);
    }
  }catch(e){
    console.warn('Kids-Sheet Fehler:',e);
    const track=document.getElementById('erTrack');
    if(track)track.innerHTML='<div style="font-size:10px;color:var(--t3);padding:4px 0;grid-column:1/-1;">⚠️ Tabelle nicht erreichbar</div>';
  }
}
loadKids();

// ── iCAL ──
function parseICS(txt){
  const evs=[];const blocks=txt.split('BEGIN:VEVENT');
  for(let i=1;i<blocks.length;i++){
    const b=blocks[i];
    const get=k=>{const m=b.match(new RegExp(k+'(?:;[^:]*)?:([^\\r\\n]+)'));return m?m[1].trim():''};
    const dtraw=get('DTSTART'),dtendraw=get('DTEND'),sum=get('SUMMARY').replace(/\\n/g,' ').replace(/\\,/g,',');
    if(!dtraw||!sum)continue;
    let date,hasTime=false;
    if(/^\d{8}$/.test(dtraw)){
      // All-day event – no time
      date=new Date(`${dtraw.slice(0,4)}-${dtraw.slice(4,6)}-${dtraw.slice(6,8)}T00:00:00`);
    } else if(dtraw.endsWith('Z')){
      // Explicit UTC
      date=new Date(dtraw.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,'$1-$2-$3T$4:$5:$6Z'));
      hasTime=true;
    } else {
      // Local time with TZID (e.g. Europe/Berlin) or floating
      // Parse digits and treat as Europe/Berlin
      const m=dtraw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
      if(m){
        const iso=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
        // Determine Berlin offset at this moment (CET=+1 or CEST=+2)
        const probe=new Date(iso+'Z');
        const berlinStr=probe.toLocaleString('en-US',{timeZone:'Europe/Berlin',hour12:false,hour:'2-digit'});
        const utcHour=probe.getUTCHours();
        const berlinHour=parseInt(berlinStr);
        const offsetH=(berlinHour-utcHour+24)%24;
        date=new Date(iso+'Z');
        date=new Date(date.getTime()-offsetH*3600000);
      } else {
        date=new Date(dtraw);
      }
      hasTime=true;
    }
    if(isNaN(date))continue;
    let col='#6e6e73';const s=sum.toLowerCase();
    if(s.includes('maja'))col='#db2777';
    else if(['köln','augsburg','mainz','bochum','wolfsburg','leverkusen','dortmund','münchen','stuttgart','freiburg','heidenheim','hoffenheim','frankfurt','werder','pauli','fcunion','union berlin'].some(x=>s.includes(x)))col='#e8001c';
    else if(s.includes('konzert')||s.includes('olivia')||s.includes('🎵')||s.includes('🎶')||s.includes('🎤')||s.includes('🎭'))col='#16a34a';
    else if(s.includes('kids')||s.includes('rosa')||s.includes('emil'))col='#1a56db';
    else if(s.includes('geburtstag')||s.includes('birthday')||s.includes('bday')||s.includes('🎂')||s.includes('🎁')||s.includes('geburts'))col='#af52de';
    else if(s.includes('schwerin')||s.includes('alma'))col='#f97316';
    // Parse dtend
    let dateEnd=null;
    if(dtendraw){
      if(/^\d{8}$/.test(dtendraw)){
        dateEnd=new Date(`${dtendraw.slice(0,4)}-${dtendraw.slice(4,6)}-${dtendraw.slice(6,8)}T00:00:00`);
        dateEnd.setDate(dateEnd.getDate()-1); // DTEND is exclusive, so subtract 1
      } else {
        const m2=dtendraw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
        if(m2) dateEnd=new Date(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}`);
      }
    }
    evs.push({date,dateEnd,sum,col,hasTime});
  }
  return evs;
}

function fmtW(d){const t=st(new Date());const df=diff(t,st(d));if(df===0)return'Heute';if(df===1)return'Morgen';if(df===2)return'Übermorgen';return`${WK[d.getDay()]}. ${d.getDate()}. ${MK[d.getMonth()]}`;}
function fmtFull(d){return`${WD[d.getDay()]}, ${d.getDate()}. ${MK[d.getMonth()]}`+(d.getHours()>0?` · ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`:'');}

async function loadICAL(){
  if(!window.HubAuth?.isSignedIn()){
    document.getElementById('kalEvList').innerHTML='<div class="kal-ev" style="margin:0 11px 6px;"><div class="kal-ev-info"><div class="kal-ev-title" style="color:var(--t3)">🔒 Anmeldung erforderlich</div><div class="kal-ev-date" style="color:var(--t3)">Private Termine mit Google freischalten</div></div></div>';
    document.getElementById('almaTitle').textContent='🔒 Private Kalenderdaten';
    document.getElementById('almaDate').textContent='Bitte mit Google anmelden';
    return;
  }
  try{
    const ICAL_ENDPOINTS=[
      'https://paul-gateway-v2.paul-bendzko.workers.dev/feeds/gmail',
      'https://paul-gateway-v2.paul-bendzko.workers.dev/feeds/hellomed',
    ];

    let evs=[];
    let okCount=0;
    for(const endpoint of ICAL_ENDPOINTS){
      try{
        const r=await HubAuth.authorizedFetch(endpoint,{signal:AbortSignal.timeout(10000)});
        if(!r.ok)continue;
        const t=await r.text();
        if(t.includes('BEGIN:VCALENDAR')){evs=evs.concat(parseICS(t));okCount++;}
      }catch(e){continue;}
    }

    if(okCount===0)throw new Error('iCal nicht erreichbar');
    const today=st(new Date());

    // ── Alma ──
    loadAlma(evs);

    // ── Kalender Kachel ──
    const now3 = new Date();
    const nowMin = now3.getHours() * 60 + now3.getMinutes();
    const isOverToday = (e) => {
      const eDay = st(e.date);
      if(eDay > today) return false;   // Zukunft → nicht vorbei
      if(eDay < today) return true;    // Vergangenheit → vorbei
      // Heute: Ganztags-Events nie ausblenden
      if(!e.hasTime) return false;
      const evMin = e.date.getHours() * 60 + e.date.getMinutes();
      return nowMin > evMin + 30; // 30 Min Puffer nach Startzeit
    };
    const isFiltered=s=>{
      const l=s.toLowerCase();
      return l.includes('kids bei')||l.includes('bei dani')||l.includes('bei paul')||l.includes('wechsel')||l.includes('kids')||l.includes('schwerin')||l.includes('alma')||l.includes('geburts')||l.includes('birthday')||l.includes('bday');
    };
    const maja=evs.filter(e=>!isOverToday(e)&&e.col==='#db2777').sort((a,b)=>a.date-b.date)[0];
    const union2=evs.filter(e=>!isOverToday(e)&&e.col==='#e8001c').sort((a,b)=>a.date-b.date)[0];
    const bday=evs.filter(e=>!isOverToday(e)&&e.col==='#af52de').sort((a,b)=>a.date-b.date)[0];
    const others2=evs.filter(e=>!isOverToday(e)&&!['#db2777','#e8001c','#af52de'].includes(e.col)&&!isFiltered(e.sum)&&e.col!=='#af52de').sort((a,b)=>a.date-b.date);

    // 1. Maja always first
    // 2-6. Next 5 events (no maja, no union, no bday, no filtered)
    // 7. Next bday if NOT this month
    const displayEvs=[];
    if(maja)displayEvs.push({...maja,_type:'maja'});
    const reserved=new Set([maja?.sum].filter(Boolean));
    const fillOthers=others2.filter(e=>!reserved.has(e.sum)&&e.col!=='#af52de');
    fillOthers.slice(0,5).forEach(e=>displayEvs.push({...e,_type:'other'}));
    // Bday: only if not this month
    if(bday){
      const bdayMonth=st(bday.date).getMonth();
      const curMonth=new Date().getMonth();
      if(bdayMonth!==curMonth)displayEvs.push({...bday,_type:'bday'});
    }

    const kalList=document.getElementById('kalEvList');
    if(displayEvs.length===0){
      kalList.innerHTML='<div class="kal-ev" style="margin:0 11px 6px;"><div class="kal-ev-info"><div class="kal-ev-title" style="color:var(--t3)">Keine Termine geplant</div></div></div>';
    } else {
      kalList.innerHTML=displayEvs.map(e=>{
        const when=fmtW(e.date);const isToday=when==='Heute';
        let cls='kal-ev';
        if(isToday)cls+=' today';
        if(e._type==='union')cls+=' union-ev';
        if(e._type==='maja')cls+=' maja-ev';
        if(e._type==='bday')cls+=' bday-ev';
        const lbl=e._type==='union'?'⚽ 1. FC Union Berlin':e._type==='maja'?'💗 Mit Maja':e._type==='bday'?'🎂 Geburtstag':'';
        return`<div class="${cls}">
          <div class="kal-ev-dot" style="background:${e.col}"></div>
          <div class="kal-ev-info">
            ${lbl?`<div class="kal-ev-lbl">${lbl}</div>`:''}
            <div class="kal-ev-title">${e.sum}</div>
            <div class="kal-ev-date">${fmtFull(e.date)}</div>
          </div>
          <div class="kal-ev-when">${when}</div>
        </div>`;
      }).join('');
    }

    // ── Apps preview ──
    if(displayEvs.length>0){
      const first=displayEvs[0];
      const when2=fmtW(first.date);
      updateCsPreview('apps',`Kalender: ${first.sum} · ${when2}`);
    } else {
      updateCsPreview('apps','Kalender · Finanzen · Aktien');
    }

    // ── Union card footer ──
    const unionCard=evs.filter(e=>st(e.date)>=today&&e.col==='#e8001c').sort((a,b)=>a.date-b.date)[0];

  }catch(e){
    console.warn('iCal load error:',e);
    document.getElementById('kalEvList').innerHTML='<div class="kal-ev" style="margin:0 11px 6px;"><div class="kal-ev-info"><div class="kal-ev-title" style="color:var(--t3)">⚠️ Kalender nicht erreichbar</div><div class="kal-ev-date" style="color:var(--t3)">Bitte Kalender-App direkt öffnen</div></div></div>';
    document.getElementById('almaTitle').textContent='⚠️ iCal nicht erreichbar';
    document.getElementById('almaDate').textContent='Kalender prüfen';
  }
  if(window._lbTick)window._lbTick();
}

// ── ALMA ──
function loadAlma(evs){
  try{
    const today=st(new Date());
    const now2=new Date();
    const all=evs.filter(e=>e.sum.toLowerCase().includes('schwerin')).sort((a,b)=>a.date-b.date);
    const future=all.filter(e=>st(e.date)>=today);

    // Alma birthday countdown (always shown)
    const almaYear=now2.getMonth()>=9&&(now2.getMonth()>9||now2.getDate()>24)?2027:2026;
    const almaBday=new Date(almaYear,9,24);
    const bdayMs=almaBday-now2;
    const bdayDays=Math.floor(bdayMs/86400000);
    const bdayH=Math.floor((bdayMs%86400000)/3600000);
    const bdayMin=Math.floor((bdayMs%3600000)/60000);
    document.getElementById('almaBdayVal').textContent=`${bdayDays} Tage · ${bdayH} Std · ${bdayMin} Min`;

    // Check if currently in Schwerin
    const todayEv=all.find(e=>{
      const start=st(e.date);
      const end=e.dateEnd?st(e.dateEnd):start;
      return today>=start&&today<=end;
    });

    let tripEnd=null;
    if(todayEv){
      if(todayEv.dateEnd){tripEnd=new Date(todayEv.dateEnd);}
      else{
        let checkDay=new Date(today);tripEnd=new Date(today);
        while(true){
          const next=new Date(checkDay);next.setDate(checkDay.getDate()+1);
          const hasNext=all.find(e=>diff(next,st(e.date))===0);
          if(hasNext){tripEnd=new Date(next);checkDay=new Date(next);}else break;
        }
      }
    }

    if(todayEv&&tripEnd){
      // CURRENTLY IN SCHWERIN
      const daysLeft=diff(today,tripEnd);
      const msLeft=tripEnd.getTime()+86400000-now2.getTime();
      const hoursLeft=Math.floor(msLeft/3600000);
      const minsLeft=Math.floor((msLeft%3600000)/60000);

      document.getElementById('almaMain').querySelector('.alma-section-left').style.background='linear-gradient(135deg,#f97316,#fb923c)';
      document.getElementById('almaMain').querySelector('.alma-section-emoji').textContent='🧡';
      document.getElementById('almaN').textContent=daysLeft===0?'🥹':daysLeft;
      document.getElementById('almaN').style.fontSize=daysLeft>9?'32px':'40px';
      document.getElementById('almaUnit').textContent=daysLeft===0?'Letzter Tag':daysLeft===1?'Tag noch':'Tage noch';
      document.getElementById('almaLbl').textContent='Du bist aktuell bei Alma 🧡';
      document.getElementById('almaTitle').textContent=todayEv.sum;
      document.getElementById('almaDate').textContent=`Bis ${WD[tripEnd.getDay()]}, ${tripEnd.getDate()}. ${MK[tripEnd.getMonth()]}`;
      document.getElementById('almaRange').textContent=`${hoursLeft} Std · ${minsLeft} Min verbleibend`;
      updateCsPreview('alma', `Gerade in Schwerin 🧡 · noch ${daysLeft===0?'heute':daysLeft+' Tage'}`);

      // Show next trip in almaNext row
      const next=future.find(e=>st(e.date)>tripEnd);
      if(next){
        const d=diff(today,st(next.date));
        document.getElementById('almaNext').style.display='flex';
        document.getElementById('almaNextLbl').textContent='Nächster Besuch';
        document.getElementById('almaNextTitle').textContent=next.sum;
        document.getElementById('almaNextDate').textContent=fmtFull(next.date);
        document.getElementById('almaNextCounter').textContent=`in ${d} Tagen`;
      }

    } else {
      // NOT in Schwerin
      const next=future[0];
      const overNext=future[1];

      if(!next){
        document.getElementById('almaN').textContent='?';
        document.getElementById('almaLbl').textContent='Nächster Besuch';
        document.getElementById('almaTitle').textContent='Kein Termin geplant';
        document.getElementById('almaDate').textContent='–';
        return;
      }

      const nextMs=st(next.date).getTime()-now2.getTime();
      const nextDays=Math.floor(nextMs/86400000);
      const nextH=Math.floor((nextMs%86400000)/3600000);
      const nextMin=Math.floor((nextMs%3600000)/60000);
      const nextWk=Math.floor(nextDays/7);
      const nextRemDays=nextDays%7;
      let countdownStr='';
      if(nextWk>0)countdownStr+=nextWk+'W ';
      countdownStr+=nextRemDays+'T · '+nextH+'Std · '+nextMin+'Min';

      document.getElementById('almaN').textContent=nextDays;
      document.getElementById('almaN').style.fontSize=nextDays>99?'28px':nextDays>9?'36px':'40px';
      document.getElementById('almaUnit').textContent='Tage';
      document.getElementById('almaLbl').textContent='Nächster Besuch · Schwerin';
      document.getElementById('almaTitle').textContent=next.sum;
      document.getElementById('almaDate').textContent=fmtFull(next.date);
      document.getElementById('almaRange').textContent=countdownStr;
      updateCsPreview('alma', `Nächster Besuch in ${nextDays} Tagen · ${next.sum}`);

      if(overNext){
        const d2=diff(today,st(overNext.date));
        document.getElementById('almaNext').style.display='flex';
        document.getElementById('almaNextLbl').textContent='Übernächster Besuch';
        document.getElementById('almaNextTitle').textContent=overNext.sum;
        document.getElementById('almaNextDate').textContent=fmtFull(overNext.date);
        document.getElementById('almaNextCounter').textContent=`in ${d2} Tagen`;
      }
    }
  }catch(e){console.log('Alma error:',e);}
}

// ── UNION BERLIN v5.2.0 — via data/union.json ──
async function loadUnion(){
  const WDU=['So','Mo','Di','Mi','Do','Fr','Sa'];
  const MNU=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  function fmtDt(iso){
    if(!iso)return'–';
    const d=new Date(iso);
    return`${WDU[d.getDay()]}. ${d.getDate()}. ${MNU[d.getMonth()]} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} Uhr`;
  }
  function img(url,sz,rd=''){
    if(!url)return`<span style="display:inline-block;width:${sz}px;"></span>`;
    return`<img src="${url}" width="${sz}" height="${sz}" style="object-fit:contain;flex-shrink:0;${rd?'border-radius:'+rd+';':''}" alt="" onerror="this.style.visibility='hidden'">`;
  }
  function playerImg(id){
    return`https://images.fotmob.com/image_resources/playerimages/${id}.png`;
  }
  function bar(uRaw,oRaw,uLabel,oLabel){
    // Comparison bar: Union (red) vs opponent (grey)
    const uv=parseFloat(String(uRaw).replace(/[^0-9.]/g,''))||0;
    const ov=parseFloat(String(oRaw).replace(/[^0-9.]/g,''))||0;
    const tot=uv+ov||1;
    const uPct=Math.round((uv/tot)*100);
    const uWin=uv>=ov;
    return`<div class="uc-bar-row">
      <span class="uc-bar-val" style="color:${uWin?'var(--union)':'var(--t2)'};">${uLabel||uRaw}</span>
      <div>
        <div class="uc-bar-track">
          <div class="uc-bar-fill" style="width:${uPct}%;"></div>
          <div class="uc-bar-fill2" style="width:${100-uPct}%;"></div>
        </div>
      </div>
      <span class="uc-bar-val r" style="color:${!uWin?'var(--t)':'var(--t2)'};">${oLabel||oRaw}</span>
    </div>`;
  }

  try{
    const r=await fetch('data/union.json',{signal:AbortSignal.timeout(6000)});
    if(!r.ok){
      const hint=r.status===404?'data/union.json fehlt – GitHub Action einrichten':'JSON nicht erreichbar ('+r.status+')';
      throw new Error(hint);
    }
    const d=await r.json();
    if(!d.rank)throw new Error('Keine Daten — GitHub Action noch nicht gelaufen?');

    // Header
    if(d.team_logo){const el=document.getElementById('ucLogo');if(el)el.src=d.team_logo;}
    document.getElementById('ucLeague').textContent=`Bundesliga 2025/26 · ${d.matchday||'?'}. Spieltag`;
    document.getElementById('ucRank').textContent=d.rank+'.';

    // ── Punkte-Strip ──
    const gdiff=(d.goals_for||0)-(d.goals_against||0);
    const maxPts=(d.matches_played||0)*3;
    const strip=document.getElementById('ucPtsStrip');
    if(strip){
      document.getElementById('ucPtsNum').textContent=d.points;
      document.getElementById('ucBilanz').textContent=`${d.wins}/${d.draws}/${d.losses}`;
      document.getElementById('ucTore').textContent=`${d.goals_for}:${d.goals_against}`;
      const gdiffVal=(d.goals_for||0)-(d.goals_against||0);
      const gdiffEl=document.getElementById('ucToreDiff');
      if(gdiffEl){
        gdiffEl.textContent=(gdiffVal>0?'+':'')+gdiffVal;
        gdiffEl.style.color=gdiffVal>0?'var(--green)':gdiffVal<0?'var(--red)':'var(--t3)';
      }
      document.getElementById('ucQuote').textContent=`${maxPts>0?Math.round((d.points/maxPts)*100):0}%`;
      strip.style.display='flex';
    }

    // ── Stats row — leer, da Punkte-Strip übernimmt ──
    const statsHtml=``;

    // ── Form / Serie ──
    const formStr=(d.form||'').slice(-9);
    const formPts=[...formStr].reduce((s,c)=>s+(c==='W'?3:c==='D'?1:0),0);
    const formDots=[...formStr].map(c=>`<div class="uc-fd ${c==='W'?'w':c==='D'?'d':'l'}">${c==='W'?'S':c==='D'?'U':'N'}</div>`).join('');

    // ── Tabelle ──
    const tbl=(d.table_context||[]);
    // Wikipedia Commons SVGs — kein Referer-Schutz, laden zuverlässig
    const LOGOS={
      'Union Berlin':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/1_FC_Union_Berlin_Logo.svg/180px-1_FC_Union_Berlin_Logo.svg.png',
      'Bayern München':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg/180px-FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg.png',
      'Borussia Dortmund':'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/240px-Borussia_Dortmund_logo.svg.png',
      'Bayer 04 Leverkusen':'https://upload.wikimedia.org/wikipedia/de/thumb/f/f7/Bayer_Leverkusen_Logo.svg/180px-Bayer_Leverkusen_Logo.svg.png',
      'RB Leipzig':'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/RB_Leipzig_2014_logo.svg/180px-RB_Leipzig_2014_logo.svg.png',
      'Eintracht Frankfurt':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Eintracht_Frankfurt_Logo.svg/180px-Eintracht_Frankfurt_Logo.svg.png',
      'VfB Stuttgart':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/VfB_Stuttgart_1893_Logo.svg/180px-VfB_Stuttgart_1893_Logo.svg.png',
      'SC Freiburg':'https://upload.wikimedia.org/wikipedia/de/thumb/f/f1/SC-Freiburg_Logo-neu.svg/180px-SC-Freiburg_Logo-neu.svg.png',
      'Werder Bremen':'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/SV-Werder-Bremen-Logo.svg/180px-SV-Werder-Bremen-Logo.svg.png',
      'Borussia Mönchengladbach':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Borussia_M%C3%B6nchengladbach_logo.svg/180px-Borussia_M%C3%B6nchengladbach_logo.svg.png',
      'B. Mönchengladbach':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Borussia_M%C3%B6nchengladbach_logo.svg/180px-Borussia_M%C3%B6nchengladbach_logo.svg.png',
      'TSG Hoffenheim':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/TSG_Logo-Standard_4c.svg/180px-TSG_Logo-Standard_4c.svg.png',
      'FC Augsburg':'https://upload.wikimedia.org/wikipedia/de/thumb/b/b5/Logo_FC_Augsburg.svg/180px-Logo_FC_Augsburg.svg.png',
      'VfL Wolfsburg':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Logo-VfL-Wolfsburg.svg/180px-Logo-VfL-Wolfsburg.svg.png',
      '1. FC Heidenheim':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/1._FC_Heidenheim_1846_Logo.svg/180px-1._FC_Heidenheim_1846_Logo.svg.png',
      'VfL Bochum':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/VfL_Bochum_logo.svg/180px-VfL_Bochum_logo.svg.png',
      '1. FC Köln':'https://upload.wikimedia.org/wikipedia/de/thumb/d/d6/Logo_1._FC_Koeln.svg/180px-Logo_1._FC_Koeln.svg.png',
      'FC Köln':'https://upload.wikimedia.org/wikipedia/de/thumb/d/d6/Logo_1._FC_Koeln.svg/180px-Logo_1._FC_Koeln.svg.png',
      'Köln':'https://upload.wikimedia.org/wikipedia/de/thumb/d/d6/Logo_1._FC_Koeln.svg/180px-Logo_1._FC_Koeln.svg.png',
      '1.FC Köln':'https://upload.wikimedia.org/wikipedia/de/thumb/d/d6/Logo_1._FC_Koeln.svg/180px-Logo_1._FC_Koeln.svg.png',
      'Hamburger SV':'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/HSV-Logo.svg/180px-HSV-Logo.svg.png',
      'Fortuna Düsseldorf':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Fortuna_D%C3%BCsseldorf.svg/180px-Fortuna_D%C3%BCsseldorf.svg.png',
      'Hannover 96':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Hannover_96_Logo.svg/180px-Hannover_96_Logo.svg.png',
      'Karlsruher SC':'https://upload.wikimedia.org/wikipedia/de/thumb/c/c7/Logo_Karlsruher_SC.svg/180px-Logo_Karlsruher_SC.svg.png',
      '1. FC Nürnberg':'https://upload.wikimedia.org/wikipedia/de/thumb/c/c9/1._FC_N%C3%BCrnberg.svg/180px-1._FC_N%C3%BCrnberg.svg.png',
      'Schalke 04':'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/FC_Schalke_04_Logo.svg/180px-FC_Schalke_04_Logo.svg.png',
      'FC Schalke 04':'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/FC_Schalke_04_Logo.svg/180px-FC_Schalke_04_Logo.svg.png',
      'Hertha BSC':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Hertha_BSC_Logo_2012.svg/180px-Hertha_BSC_Logo_2012.svg.png',
      'Mainz 05':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Logo_Mainz_05.svg/180px-Logo_Mainz_05.svg.png',
      'FSV Mainz 05':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Logo_Mainz_05.svg/180px-Logo_Mainz_05.svg.png',
      'Greuther Fürth':'https://upload.wikimedia.org/wikipedia/de/thumb/9/96/SpVgg_Greuther_F%C3%BCrth.svg/180px-SpVgg_Greuther_F%C3%BCrth.svg.png',
      'SpVgg Greuther Fürth':'https://upload.wikimedia.org/wikipedia/de/thumb/9/96/SpVgg_Greuther_F%C3%BCrth.svg/180px-SpVgg_Greuther_F%C3%BCrth.svg.png',
      '1. FC Kaiserslautern':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/1._FC_Kaiserslautern_Logo_2018.svg/180px-1._FC_Kaiserslautern_Logo_2018.svg.png',
      'SV 07 Elversberg':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/SV_07_Elversberg.svg/180px-SV_07_Elversberg.svg.png',
      'Elversberg':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/SV_07_Elversberg.svg/180px-SV_07_Elversberg.svg.png',
      'Magdeburg':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/1._FC_Magdeburg.svg/180px-1._FC_Magdeburg.svg.png',
      '1. FC Magdeburg':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/1._FC_Magdeburg.svg/180px-1._FC_Magdeburg.svg.png',
      'FC St. Pauli':'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Logo-FC-St-Pauli.svg/180px-Logo-FC-St-Pauli.svg.png',
      'Holstein Kiel':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Holstein_Kiel_Logo.svg/180px-Holstein_Kiel_Logo.svg.png',
      'SSV Ulm 1846':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/SSV_Ulm_1846_logo.svg/180px-SSV_Ulm_1846_logo.svg.png',
      'Preußen Münster':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Preu%C3%9Fen_M%C3%BCnster_logo.svg/180px-Preu%C3%9Fen_M%C3%BCnster_logo.svg.png',
      'SC Paderborn 07':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/SC_Paderborn_07_logo.svg/180px-SC_Paderborn_07_logo.svg.png',
      'SV Darmstadt 98':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/SV_Darmstadt_98_logo.svg/180px-SV_Darmstadt_98_logo.svg.png',
      'Eintracht Braunschweig':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Eintracht_Braunschweig_Logo.svg/180px-Eintracht_Braunschweig_Logo.svg.png',
    };
    const FOTMOB_IDS={'Köln':8722,'1. FC Köln':8722,'FC Köln':8722,'SC Freiburg':8358,'Freiburg':8358};
    const getLogoSrc=t=>{
      const fid=FOTMOB_IDS[t.name]||FOTMOB_IDS[t.short_name];
      if(fid)return`https://images.fotmob.com/image_resources/logo/teamlogo/${fid}.png`;
      if(t.logo&&!t.logo.includes('wikipedia'))return t.logo;
      return LOGOS[t.name]||LOGOS[t.short_name]||null;
    };
    const tblHtml=tbl.map(t=>{
      const src=getLogoSrc(t);
      const logoHtml=src
        ?`<img src="${src}" width="14" height="14" style="object-fit:contain;flex-shrink:0;border-radius:2px;" alt="" onerror="this.style.visibility='hidden'">`
        :'<span style="width:14px;flex-shrink:0;display:inline-block;"></span>';
      // Rang-Pfeil: rank_change > 0 = besser (grün ▲), < 0 = schlechter (rot ▼), 0/null = gleich (grau –)
      const rc = Number(t.rank_change ?? 0);
      const arrowHtml =
        rc > 0 ? `<span style="font-size:8px;color:var(--green);flex-shrink:0;line-height:1;" title="▲${rc}">▲</span>` :
        rc < 0 ? `<span style="font-size:8px;color:var(--red);flex-shrink:0;line-height:1;" title="▼${Math.abs(rc)}">▼</span>` :
                 `<span style="font-size:8px;color:var(--t3);flex-shrink:0;line-height:1;">–</span>`;
      return`
      <div class="uc-tbl-row${t.is_union?' me':''}">
        <span style="font-size:9px;color:${t.is_union?'var(--union)':'var(--t3)'};min-width:14px;flex-shrink:0;font-weight:${t.is_union?700:400}">${t.rank}.</span>
        ${logoHtml}
        <span class="tbl-name" style="${t.is_union?'color:var(--union);font-weight:700;':'color:var(--t2);'}">${t.name}</span>
        ${arrowHtml}
        <span class="tbl-pts" style="${t.is_union?'color:var(--union);':''}">${t.points}</span>
      </div>`;}).join('');

    // ── Letztes Spiel — minimalistisch ──
    const last=d.last_match;
    let lastHtml='<div style="color:var(--t3);font-size:11px;text-align:center;">–</div>';
    if(last){
      const cls=last.result==='W'?'w':last.result==='L'?'l':'d';
      const outc=last.result==='W'?'Sieg':last.result==='L'?'Niederlage':'Unentschieden';
      const hA=last.is_home?'Heim':'Auswärts';
      const ms=d.last_match_stats||{};
      // Stat-Bars: Screenshot-Stil — symmetrische Chips + Toggle
      const statRows=[];
      if(ms.shots)           statRows.push(['Gesamtschüsse',ms.shots.union,ms.shots.opp,Number(ms.shots.union),Number(ms.shots.opp)]);
      if(ms.shots_on_target) statRows.push(['Torschüsse',ms.shots_on_target.union,ms.shots_on_target.opp,Number(ms.shots_on_target.union),Number(ms.shots_on_target.opp)]);
      if(ms.xg)              statRows.push(['Erwartete Tore (xG)',ms.xg.union,ms.xg.opp,parseFloat(ms.xg.union),parseFloat(ms.xg.opp)]);
      if(ms.corners)         statRows.push(['Ecken',ms.corners.union,ms.corners.opp,Number(ms.corners.union),Number(ms.corners.opp)]);
      if(ms.touches_box)     statRows.push(['Ballber. Strafraum',ms.touches_box.union,ms.touches_box.opp,Number(ms.touches_box.union),Number(ms.touches_box.opp)]);

      const hasStats=ms.possession||statRows.length>0;

      const possHtml=(()=>{
        if(!ms.possession) return '';
        const pu=Number(ms.possession.union), po=Number(ms.possession.opp);
        const uHigher=pu>=po;
        // Der groessere Wert bekommt width, der kleinere bekommt flex:1 (Rest)
        const leftStyle=`width:${pu}%`;
        const leftCls=uHigher?'higher':'lower';
        const rightCls=!uHigher?'higher':'lower';
        return `
        <div class="uc-poss-preview">
          <div class="uc-poss-lbl">Ballbesitz</div>
          <div class="uc-poss-bar-wrap">
            <div class="uc-poss-bar-left ${leftCls}" style="${leftStyle}">${pu}%</div>
            <div class="uc-poss-bar-right ${rightCls}">${po}%</div>
          </div>
        </div>`;
      })();

      const rowsHtml=statRows.map(([lbl,uv,ov,un,on])=>{
        const uWins=un>on, oWins=on>un;
        const uCls=uWins?'win-union':'neutral';
        const oCls=oWins?'win-opp':'neutral';
        return`<div class="uc-stat-row">
          <span class="uc-stat-chip ${uCls}">${uv}</span>
          <span class="uc-stat-row-lbl">${lbl}</span>
          <span class="uc-stat-chip ${oCls}">${ov}</span>
        </div>`;}).join('');

      const statsBlockId='ucStats_'+Date.now();
      const toggleHtml=hasStats?`
        <div class="uc-stat-bars-wrap">
          ${possHtml}
          ${rowsHtml?`
            <button class="uc-stats-toggle" onclick="
              var b=this,p=document.getElementById('${statsBlockId}');
              p.classList.toggle('open');b.classList.toggle('open');
            ">Details <span class="uc-stats-toggle-arrow">▼</span></button>
            <div class="uc-stat-rows" id="${statsBlockId}">
              ${rowsHtml}
            </div>`:''}
        </div>`:'';

      const unionLogoLast=d.team_logo||'https://tmssl.akamaized.net/images/wappen/head/89.png';
      const homeLogo=last.home_logo||LOGOS[last.home_name]||(last.is_home?unionLogoLast:'');
      const awayLogo=last.away_logo||LOGOS[last.away_name]||(!last.is_home?unionLogoLast:'');
      lastHtml=`
        <div class="uc-match-lbl">Letztes Spiel · ${hA} · Spieltag ${last.matchday}<svg class="uc-match-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg></div>
        <div class="uc-match-preview">
          <div class="uc-last-scoreline">
            <div class="uc-last-team">
              <img class="uc-last-team-logo" src="${homeLogo}" onerror="this.style.visibility='hidden'" alt="">
              <div class="uc-last-team-name">${last.home_name}</div>
            </div>
            <div class="uc-last-score-box ${cls}">${last.goals_home}:${last.goals_away}</div>
            <div class="uc-last-team">
              <img class="uc-last-team-logo" src="${awayLogo}" onerror="this.style.visibility='hidden'" alt="">
              <div class="uc-last-team-name">${last.away_name}</div>
            </div>
          </div>
          <div class="uc-last-meta">
            <span class="uc-last-result-badge ${cls}">${outc}</span>
            <span>·</span>
            <span>${fmtDt(last.date)}</span>
          </div>
        </div>
        <div class="uc-match-body">
          ${toggleHtml||'<div style="color:var(--t3);font-size:11px;text-align:center;padding:4px 0;">Keine Statistiken verfügbar</div>'}
        </div>`;
    }

    // ── Nächstes Spiel ──
    const next=d.next_match;

    // ── Saisonzusammenfassung (erscheint nur wenn kein next_match vorhanden) ──
    function buildSeasonSummary(d){
      const mp=d.matches_played||0;
      const w=d.wins||0,dr=d.draws||0,l=d.losses||0;
      const gf=d.goals_for||0,ga=d.goals_against||0;
      const pts=d.points||0;
      const rank=d.rank||'–';
      const cs=d.clean_sheets||0;
      const form=d.form||'';

      // Form-Dots
      const formDots=[...form].map(c=>{
        const cls=c==='W'?'w':c==='L'?'l':'d';
        return`<span class="uc-fd ${cls}">${c==='W'?'S':c==='L'?'N':'U'}</span>`;
      }).join('');

      // Punkte-Prognose (Ø Pkt × 34 Spieltage)
      const avgPts=mp>0?(pts/mp).toFixed(2):'–';

      // Beste / schlechteste Phase aus form (längste W-Serie / L-Serie)
      let bestStreak=0,cur=0;
      for(const c of form){if(c==='W'){cur++;bestStreak=Math.max(bestStreak,cur);}else cur=0;}
      let worstStreak=0,curL=0;
      for(const c of form){if(c==='L'){curL++;worstStreak=Math.max(worstStreak,curL);}else curL=0;}

      const teamLogo=d.team_logo||'';

      // ── Saisondurchschnitt-Stats ──
      const avg=d.season_avg_stats||null;
      function statBar(lbl, uVal, oVal, higherBetter=true, unit=''){
        if(uVal==null) return '';
        const uN=parseFloat(uVal), oN=oVal!=null?parseFloat(oVal):null;
        const total=(oN!=null)?(uN+oN)||1:uN||1;
        const uFlex=Math.round((uN/total)*100);
        const oFlex=100-uFlex;
        const uBetter=oN!=null?(higherBetter?(uN>oN):(uN<oN)):null;
        const uColor=uBetter===true?'var(--green)':uBetter===false?'var(--red)':'var(--union)';
        const uValStr=Number.isInteger(uN)?uN:uN.toFixed(2);
        const oValStr=oN!=null?(Number.isInteger(oN)?oN:oN.toFixed(2)):null;
        return`<div class="uc-ss-statbar-row">
          <div class="uc-ss-statbar-labels">
            <span class="uc-ss-statbar-lbl">${lbl}</span>
            <div class="uc-ss-statbar-vals">
              <span class="uc-ss-statbar-val" style="color:${uColor}">${uValStr}${unit}</span>
              ${oValStr!=null?`<span class="uc-ss-statbar-sep">·</span><span class="uc-ss-statbar-val opp">${oValStr}${unit} Geg.</span>`:''}
            </div>
          </div>
          <div class="uc-ss-bar-wrap">
            <div class="uc-ss-bar-u" style="flex:${uFlex};background:${uColor}"></div>
            ${oValStr!=null?`<div class="uc-ss-bar-o" style="flex:${oFlex}"></div>`:''}
          </div>
        </div>`;
      }
      const avgStatsHtml=avg?`
        <div>
          <div class="uc-ss-statbars-title">Ø pro Spiel · ${avg.games_processed} Spiele ausgewertet</div>
          <div class="uc-ss-statbars">
            ${statBar('Ballbesitz',        avg.possession?.union,      avg.possession?.opp,      true,  '%')}
            ${statBar('Expected Goals xG', avg.xg?.union,              avg.xg?.opp,              true,  '')}
            ${statBar('Schüsse',           avg.shots?.union,           avg.shots?.opp,           true,  '')}
            ${statBar('Schüsse aufs Tor',  avg.shots_on_target?.union, avg.shots_on_target?.opp, true,  '')}
            ${statBar('Big Chances',       avg.big_chance?.union,      avg.big_chance?.opp,      true,  '')}
            ${statBar('Ecken',             avg.corners?.union,         avg.corners?.opp,         true,  '')}
            ${statBar('Ballaktionen Box',  avg.touches_box?.union,     avg.touches_box?.opp,     true,  '')}
            ${statBar('Paraden Keeper',    avg.saves?.union,           avg.saves?.opp,           false, '')}
            ${statBar('Fouls',             avg.fouls?.union,           avg.fouls?.opp,           false, '')}
            ${statBar('Gelbe Karten',      avg.yellow_cards?.union,    avg.yellow_cards?.opp,    false, '')}
          </div>
        </div>`:'';

      return`
      <div class="uc-season-summary">
        <div class="uc-season-summary-header">
          ${teamLogo?`<img src="${teamLogo}" class="uc-ss-logo" onerror="this.style.visibility='hidden'" alt="">`:''}
          <div>
            <div class="uc-ss-title">Saison 2025/26 · Abschluss</div>
            <div class="uc-ss-sub">Bundesliga · ${mp} Spieltage · Platz ${rank}</div>
          </div>
        </div>
        <div class="uc-ss-grid">
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${pts}</div>
            <div class="uc-ss-lbl">Punkte</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${rank}.</div>
            <div class="uc-ss-lbl">Platz</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${w}</div>
            <div class="uc-ss-lbl">Siege</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${dr}</div>
            <div class="uc-ss-lbl">Remis</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${l}</div>
            <div class="uc-ss-lbl">Niederlagen</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${gf}:${ga}</div>
            <div class="uc-ss-lbl">Tore</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${cs}</div>
            <div class="uc-ss-lbl">Clean Sheets</div>
          </div>
          <div class="uc-ss-stat">
            <div class="uc-ss-val">${avgPts}</div>
            <div class="uc-ss-lbl">Ø Pkt./Spiel</div>
          </div>
        </div>
        ${bestStreak>1||worstStreak>1?`
        <div class="uc-ss-streaks">
          ${bestStreak>1?`<div class="uc-ss-streak w">🔥 Längste Siegesserie: ${bestStreak} Spiele</div>`:''}
          ${worstStreak>1?`<div class="uc-ss-streak l">📉 Längste Niederlagenserie: ${worstStreak} Spiele</div>`:''}
        </div>`:''}
        ${form?`
        <div class="uc-ss-form-wrap">
          <div class="uc-box-lbl" style="margin-bottom:6px;">Letzte Form (9 Spiele)</div>
          <div class="uc-form" style="flex-wrap:wrap;">${formDots}</div>
        </div>`:''}
        ${avgStatsHtml}
        <div class="uc-ss-footer">Nächste Saison startet voraussichtlich August 2026 · Die Daten aktualisieren sich automatisch 🔄</div>
        <div class="uc-ss-transition-hint">
          <span class="uc-ss-th-icon">⏱</span>
          Noch ${Math.max(0,7-daysSinceLastMatch)} Tag${Math.max(0,7-daysSinceLastMatch)===1?'':'e'} sichtbar · danach: Transferfenster 🔄
        </div>
      </div>`;
    }

    let nextHtml='';
    // ── Saison-Zustand ermitteln ──
    // Zustand 1 — showSeasonSummary:  kein next_match + letztes Spiel ≤ 7 Tage
    //             → Formkurve, Tabelle, letztes Spiel + Stats sichtbar
    // Zustand 2 — showOffseasonClean: kein next_match + > 7 Tage + > 14 Tage vor season_start_date
    //             → nur Header + Transfers (Formkurve/Tabelle/letztes Spiel ausgeblendet)
    // Zustand 3 — showPreseason:      kein next_match + ≤ 14 Tage vor season_start_date
    //             → Transfers + Countdown-Banner (Formkurve/Tabelle/letztes Spiel ausgeblendet)
    // Zustand 4 — Normalbetrieb:      next_match vorhanden + Spieltag > 3
    const now=new Date();
    const lastMatchDate=d.last_match?new Date(d.last_match.date):null;
    const daysSinceLastMatch=lastMatchDate?Math.round((now-lastMatchDate)/86400000):999;
    const currentMatchday=d.matchday||0;

    // season_start_date aus JSON (Python schreibt z.B. "2026-08-21")
    const seasonStartDate=d.season_start_date?new Date(d.season_start_date):null;
    const daysUntilSeasonStart=seasonStartDate?Math.round((seasonStartDate-now)/86400000):999;

    const showSeasonSummary  = !next && daysSinceLastMatch<=7;
    const showOffseasonClean = !next && daysSinceLastMatch>7 && (daysUntilSeasonStart>14 || !seasonStartDate);
    const showPreseason      = !next && daysSinceLastMatch>7 && seasonStartDate && daysUntilSeasonStart<=14 && daysUntilSeasonStart>=0;
    const showTransferWindow = showOffseasonClean || showPreseason || (next && currentMatchday<=3);
    // Torschützen/Scorer ausblenden bis Saisonbeginn (ab Spieltag 4 wieder sichtbar)
    const hideScorers = showOffseasonClean || showPreseason || showSeasonSummary || (next && currentMatchday<=3);

    let seasonSummaryHtml='';
    if(showSeasonSummary){
      seasonSummaryHtml=buildSeasonSummary(d);
    } else if(showPreseason){
      nextHtml=`
        <div class="uc-offseason-banner" style="background:rgba(232,0,28,.06);border:1.5px solid rgba(232,0,28,.15);">
          <div class="uc-offseason-icon">🏁</div>
          <div class="uc-offseason-title">Neue Saison in ${daysUntilSeasonStart} Tag${daysUntilSeasonStart===1?'':'en'}</div>
          <div class="uc-offseason-sub">Bundesliga startet ${seasonStartDate.getDate()}.${seasonStartDate.getMonth()+1}.${seasonStartDate.getFullYear()} · Transferfenster läuft</div>
        </div>`;
    } else if(!next){
      nextHtml='';
    }

    if(next && next.date){
      const days=Math.round((new Date(next.date)-new Date())/86400000);
      const dStr=days<=0?'Heute ⚡':days===1?'Morgen ⚡':`in ${days} Tagen`;
      const opp=next.is_home?next.away_name:next.home_name;
      const oppLogo=next.is_home?next.away_logo:next.home_logo;
      const hA=next.is_home?'Heimspiel 🏠':'Auswärtsspiel ✈️';
      const unionLogo=d.team_logo||'https://tmssl.akamaized.net/images/wappen/head/89.png';
      nextHtml=`
        <div class="uc-match-lbl">Nächstes Spiel · ${hA} · Spieltag ${next.matchday}<svg class="uc-match-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg></div>
        <div class="uc-match-preview">
          <div class="uc-match-teams">
            <div class="uc-match-team">${img(unionLogo,34,'4px')}<span class="uc-match-name">Union Berlin</span></div>
            <div class="uc-next-vs">${dStr}</div>
            <div class="uc-match-team r">${img(oppLogo||LOGOS[opp]||'',34,'4px')}<span class="uc-match-name" style="text-align:right;">${opp}</span></div>
          </div>
          <div class="uc-match-meta">${fmtDt(next.date)}</div>
        </div>
        <div class="uc-match-body">
        ${(()=>{
          const h=d.h2h;
          if(!h||h.wins===undefined) return '';
          const hw=h.wins||0,hd=h.draws||0,hl=h.losses||0;
          const tot=hw+hd+hl;
          if(tot<1) return '';
          const wP=Math.round((hw/tot)*100);
          const dP=Math.round((hd/tot)*100);
          const lP=100-wP-dP;
          const opp=next.is_home?next.away_name:next.home_name;
          return `<div class="uc-prob">
            <div class="uc-prob-bar">
              <div class="uc-prob-seg home" style="flex:${wP}"></div>
              <div class="uc-prob-seg draw" style="flex:${dP}"></div>
              <div class="uc-prob-seg away" style="flex:${lP}"></div>
            </div>
            <div class="uc-prob-labels">
              <div class="uc-prob-lbl home"><span class="pval">${wP}%</span>Union Sieg</div>
              <div class="uc-prob-lbl"><span class="pval">${dP}%</span>Unentsch.</div>
              <div class="uc-prob-lbl away"><span class="pval">${lP}%</span>${opp} Sieg</div>
            </div>
            <div class="uc-prob-src">Basierend auf ${tot} Direktvergleichen</div>
          </div>`;
        })()}
        </div>`;
    }

    // ── H2H Block (Direktvergleich mit dem nächsten Gegner) ──
    let h2hHtml='';
    const h2h=d.h2h;
    const nextOppName=next?(next.is_home?next.away_name:next.home_name):'';
    if(h2h && (h2h.wins!==undefined||h2h.matches)){
      const hw=h2h.wins||0,hd=h2h.draws||0,hl=h2h.losses||0;
      const htot=hw+hd+hl||1;
      const wPct=Math.round((hw/htot)*100);
      const dPct=Math.round((hd/htot)*100);
      const lPct=100-wPct-dPct;
      const avgGf=htot>0?((h2h.goals_for||0)/htot).toFixed(1):'–';
      const avgGa=htot>0?((h2h.goals_against||0)/htot).toFixed(1):'–';
      const homeWinPct=h2h.home_wins&&htot>0?Math.round((h2h.home_wins/htot)*100):null;

      // Letzte Duelle
      const prevMatches=(h2h.matches||[]).slice(0,5);
      const prevHtml=prevMatches.length?prevMatches.map(m=>{
        const dt=m.date?new Date(m.date):null;
        const dateStr=dt?`${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getFullYear()).slice(-2)}`:'??';
        const cls=m.union_result==='W'?'w':m.union_result==='L'?'l':'d';
        const scoreStr=`${m.home_goals}:${m.away_goals}`;
        const homeTeam=m.home_name||'Union';
        const awayTeam=m.away_name||nextOppName;
        return`<div class="uc-h2h-match">
          <span class="uc-h2h-match-date">${dateStr}</span>
          <span class="uc-h2h-match-teams">${homeTeam} – ${awayTeam}</span>
          <span class="uc-h2h-match-score ${cls}">${scoreStr}</span>
        </div>`;
      }).join(''):`<div class="uc-h2h-empty">Keine Spieldaten verfügbar</div>`;

      h2hHtml=`
      <div class="uc-h2h" onclick="this.classList.toggle('open')">
        <div class="uc-h2h-header">
          <div class="uc-h2h-lbl">Direktvergleich · Union vs. ${nextOppName||'Gegner'}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-size:9px;color:var(--t3);">${htot} Spiele</div>
            <svg class="uc-h2h-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>
          </div>
        </div>
        <div class="uc-h2h-preview">
          <div class="uc-h2h-bar-wrap">
            <div class="uc-h2h-bar">
              <div class="uc-h2h-bar-w" style="flex:${hw}"></div>
              <div class="uc-h2h-bar-d" style="flex:${hd}"></div>
              <div class="uc-h2h-bar-l" style="flex:${hl}"></div>
            </div>
            <div class="uc-h2h-bar-labels">
              <span class="lw">${hw} Siege</span>
              <span class="ld">${hd} Unentsch.</span>
              <span class="ll">${hl} Niederlagen</span>
            </div>
          </div>
        </div>
        <div class="uc-h2h-details">
          <div class="uc-h2h-stats">
            <div class="uc-h2h-stat">
              <div class="uc-h2h-stat-val">${wPct}%</div>
              <div class="uc-h2h-stat-lbl">Siegquote</div>
            </div>
            <div class="uc-h2h-stat">
              <div class="uc-h2h-stat-val">${avgGf}</div>
              <div class="uc-h2h-stat-lbl">⚽ Ø Tore</div>
            </div>
            <div class="uc-h2h-stat">
              <div class="uc-h2h-stat-val">${avgGa}</div>
              <div class="uc-h2h-stat-lbl">🥅 Ø Gegent.</div>
            </div>
          </div>
          <div class="uc-h2h-lbl" style="margin-bottom:7px;">Letzte Duelle</div>
          <div class="uc-h2h-matches">${prevHtml}</div>
        </div>
      </div>`;
    } else if(nextOppName){
      // Placeholder wenn h2h fehlt in JSON — weist auf Python-Script hin
      h2hHtml=`
      <div class="uc-h2h">
        <div class="uc-h2h-lbl">Direktvergleich · Union vs. ${nextOppName}</div>
        <div class="uc-h2h-empty" style="margin-top:8px;">H2H-Daten fehlen — <code style="font-size:8px;">h2h</code> ins union.json ergänzen</div>
      </div>`;
    }

    // ── Saison-Vergleich mit dem nächsten Gegner ──
    let seasonCompareHtml='';
    const opp_stats=d.opponent_season_stats;
    const oppName=nextOppName||'Gegner';
    const oppLogoSrc=next?(next.is_home?next.away_logo:next.home_logo):null;
    const unionLogoSrc=d.team_logo||'https://tmssl.akamaized.net/images/wappen/head/89.png';

    if(opp_stats && opp_stats.matches_played){
      const uMp=d.matches_played||0;
      const oMp=opp_stats.matches_played||1;

      // chip(val, other, higherIsBetter):
      // zeigt immer 'val', vergleicht mit 'other' zur Farbgebung
      // higherIsBetter=true  → val > other = grün (z.B. Siege, Tore)
      // higherIsBetter=false → val < other = grün (z.B. Gegentore, Niederlagen, Rang)
      function chip(val, other, higherIsBetter){
        const v=parseFloat(String(val));
        const o=parseFloat(String(other));
        let cls='neutral';
        if(!isNaN(v)&&!isNaN(o)&&v!==o){
          cls=(higherIsBetter?(v>o):(v<o))?'better':'worse';
        }
        return`<div class="uc-season-val ${cls}">${val}</div>`;
      }

      // Tore pro Spiel
      const uGpg=uMp>0?((d.goals_for||0)/uMp).toFixed(2):'–';
      const oGpg=oMp>0?((opp_stats.goals_for||0)/oMp).toFixed(2):'–';
      // Gegentore pro Spiel
      const uGapg=uMp>0?((d.goals_against||0)/uMp).toFixed(2):'–';
      const oGapg=oMp>0?((opp_stats.goals_against||0)/oMp).toFixed(2):'–';

      // Logos
      const uLogoHtml=unionLogoSrc?`<img class="uc-season-team-logo" src="${unionLogoSrc}" onerror="this.style.visibility='hidden'" alt="">`:'';
      const oLogoHtml=oppLogoSrc||LOGOS[oppName]?`<img class="uc-season-team-logo" src="${oppLogoSrc||LOGOS[oppName]}" onerror="this.style.visibility='hidden'" alt="">`:'';

      // Höchster Sieg: best_win = {home, home_goals, away, away_goals}
      const uBw=d.best_win||null;
      const oBw=opp_stats.best_win||null;
      function matchRow(lbl, uBm, oBm){
        function logoSrc(bm, side){
          const directLogo = side==='home' ? (bm.home_logo||'') : (bm.away_logo||'');
          if(directLogo) return directLogo;
          const name = side==='home' ? (bm.home||'') : (bm.away||'');
          if(LOGOS[name]) return LOGOS[name];
          // Fuzzy-Fallback: Teilstring-Match für API-Namensabweichungen
          const nameLower = name.toLowerCase();
          const fuzzyKey = Object.keys(LOGOS).find(k =>
            k.toLowerCase().includes(nameLower) || nameLower.includes(k.toLowerCase())
          );
          return fuzzyKey ? LOGOS[fuzzyKey] : '';
        }
        function logoImg(bm, side){
          const src = logoSrc(bm, side);
          if(src) return `<img class="uc-season-match-logo" src="${src}" onerror="this.style.display='none'" alt="" title="${side==='home'?bm.home:bm.away}">`;
          // Kein Logo-src gefunden: leerer Platzhalter
          return `<span class="uc-season-match-logo" style="display:inline-block;width:18px;height:18px;"></span>`;
        }
        const uHtml=uBm?`
          <div class="uc-season-match left">
            ${logoImg(uBm,'home')}
            <span class="uc-season-match-score">${uBm.home_goals}:${uBm.away_goals}</span>
            ${logoImg(uBm,'away')}
          </div>`:`<div class="uc-season-match left" style="color:var(--t3);font-size:9px;">–</div>`;
        const oHtml=oBm?`
          <div class="uc-season-match right">
            ${logoImg(oBm,'home')}
            <span class="uc-season-match-score" style="background:var(--card2);color:var(--t);border-color:var(--border);">${oBm.home_goals}:${oBm.away_goals}</span>
            ${logoImg(oBm,'away')}
          </div>`:`<div class="uc-season-match right" style="color:var(--t3);font-size:9px;">–</div>`;
        return`<div class="uc-season-row match-row">
          ${uHtml}
          <div class="uc-season-row-lbl">${lbl}</div>
          ${oHtml}
        </div>`;
      }

      const uCs=d.clean_sheets!==undefined&&d.clean_sheets!==null?d.clean_sheets:'–';
      const oCs=opp_stats.clean_sheets!==undefined?opp_stats.clean_sheets:'–';
      const uRk=d.rank||'–';
      const oRk=opp_stats.rank||'–';
      const uW=d.wins||0, uD=d.draws||0, uL=d.losses||0;
      const oW=opp_stats.wins||0, oD=opp_stats.draws||0, oL=opp_stats.losses||0;

      seasonCompareHtml=`
      <div class="uc-season" onclick="this.classList.toggle('open')">
        <div class="uc-season-header">
          <div class="uc-season-lbl">Bisherige Saison · Union vs. ${oppName}</div>
          <svg class="uc-season-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>
        </div>
        <div class="uc-season-teams">
          <div class="uc-season-team">
            ${uLogoHtml}
            <div class="uc-season-team-name">Union Berlin</div>
          </div>
          <div style="font-size:8px;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">vs.</div>
          <div class="uc-season-team">
            ${oLogoHtml}
            <div class="uc-season-team-name">${oppName}</div>
          </div>
        </div>
        <div class="uc-season-details">
          <div class="uc-season-row">
            ${chip(uRk, oRk, false)}
            <div class="uc-season-row-lbl">Tabellenplatz</div>
            ${chip(oRk, uRk, false)}
          </div>
          <div class="uc-season-row">
            ${chip(uW, oW, true)}
            <div class="uc-season-row-lbl">Gewonnen</div>
            ${chip(oW, uW, true)}
          </div>
          <div class="uc-season-row">
            ${chip(uD, oD, false)}
            <div class="uc-season-row-lbl">Remis</div>
            ${chip(oD, uD, false)}
          </div>
          <div class="uc-season-row">
            ${chip(uL, oL, false)}
            <div class="uc-season-row-lbl">Verloren</div>
            ${chip(oL, uL, false)}
          </div>
          <div class="uc-season-row">
            ${chip(uGpg, oGpg, true)}
            <div class="uc-season-row-lbl">Tore pro Spiel</div>
            ${chip(oGpg, uGpg, true)}
          </div>
          <div class="uc-season-row">
            ${chip(uGapg, oGapg, false)}
            <div class="uc-season-row-lbl">Gegnerische Tore pro Spiel</div>
            ${chip(oGapg, uGapg, false)}
          </div>
          <div class="uc-season-row">
            ${chip(uCs, oCs, true)}
            <div class="uc-season-row-lbl">Ohne Gegentor</div>
            ${chip(oCs, uCs, true)}
          </div>
          ${matchRow('Höchster Sieg', uBw, oBw)}
          ${matchRow('Höchste Niederlage', d.worst_loss||null, opp_stats.worst_loss||null)}
        </div>
      </div>`;
    } else if(nextOppName){
      seasonCompareHtml=`
      <div class="uc-season">
        <div class="uc-season-lbl">Bisherige Saison · Union vs. ${oppName}</div>
        <div class="uc-h2h-empty" style="margin-top:8px;">Gegner-Saisondaten fehlen — <code style="font-size:8px;">opponent_season_stats</code> ins union.json ergänzen</div>
      </div>`;
    }

    // ── Top 3 Torschützen (Karten-Grid) ──
    const allScorers=(d.union_scorers||[]);
    const top3Goals=allScorers.slice(0,3);
    const top3GoalsHtml=top3Goals.length?`
      <div class="uc-top3">
        ${top3Goals.map((p,i)=>`
          <div class="uc-top3-card${i===0?' first':''}">
            <div class="uc-top3-rank">${i+1}.</div>
            <img class="uc-top3-photo" src="${playerImg(p.id)}" onerror="this.src=''" alt="">
            <div class="uc-top3-name">${p.name.split(' ').pop()}</div>
            <div class="uc-top3-val">${p.goals}<span style="font-size:10px;font-weight:600;color:var(--t3);margin-left:2px;">⚽</span></div>
          </div>`).join('')}
      </div>`:'<div style="color:var(--t3);font-size:10px;">Keine Daten</div>';

    // ── Top 3 Scorer (Tore + Assists + Gesamt) ──
    const top3Scorer=allScorers
      .map(p=>({...p,total:(p.goals||0)+(p.assists||0)}))
      .sort((a,b)=>b.total-a.total)
      .slice(0,3);
    const top3ScorerHtml=top3Scorer.length?
      top3Scorer.map((p,i)=>`
        <div class="uc-scorer-row">
          <div class="uc-scorer-rank">${i+1}.</div>
          <img class="uc-scorer-photo" src="${playerImg(p.id)}" onerror="this.src=''" alt="">
          <div class="uc-scorer-name">${p.name}${p.injured?' 🤕':''}</div>
          <div class="uc-scorer-stats">
            <div class="uc-scorer-detail">
              <div class="uc-scorer-chip goals">${p.goals} ⚽ Tore</div>
              <div class="uc-scorer-chip assists">${p.assists||0} 🎯 Assists</div>
            </div>
            <div class="uc-scorer-total">
              <div class="uc-scorer-total-num">${p.total}</div>
              <div class="uc-scorer-total-lbl">Gesamt</div>
            </div>
          </div>
        </div>`).join(''):'<div style="color:var(--t3);font-size:10px;">Keine Daten</div>';

    // ── Render ──
    // Formkurve, Tabelle, letztes Spiel: nur in Zustand 1 (Saisonabschluss ≤7 Tage) und Normalbetrieb
    const showSeasonContent = showSeasonSummary || !!next;

    document.getElementById('ucBody').innerHTML=`
      ${statsHtml}
      ${showSeasonContent?`
      <div class="uc-2col">
        <div class="uc-box">
          <div class="uc-box-lbl">Letzte 9 Spiele</div>
          <div class="uc-form" style="flex-wrap:wrap;">${formDots||'<span style="font-size:10px;color:var(--t3);">Keine Daten (field: form)</span>'}</div>
          ${formStr.length?`<div style="font-size:9px;color:var(--t2);margin-top:7px;">${formPts} Pkt. aus ${formStr.length} Spielen · Ø ${(formPts/formStr.length).toFixed(1)} Pkt./Spiel</div>`:''}
        </div>
        <div class="uc-box">
          <div class="uc-box-lbl">Tabelle</div>
          ${tblHtml}
        </div>
      </div>
      <div class="uc-match last-match">${lastHtml}</div>`:''}
      ${showTransferWindow?'<div id="ucTransferSection"><div class="uc-offseason-banner"><div class="uc-offseason-icon">⏳</div><div class="uc-offseason-title">Transfers werden geladen …</div></div></div>':''}
      ${showSeasonSummary&&seasonSummaryHtml?`<div>${seasonSummaryHtml}</div>`:''}
      ${!showTransferWindow&&next?`<div class="uc-match next-match">${nextHtml}</div>`:''}
      ${!showTransferWindow&&!next&&!showSeasonSummary&&nextHtml?`<div>${nextHtml}</div>`:''}
      ${h2hHtml || seasonCompareHtml ? `
      <div class="uc-analysis-wrap" id="ucAnalysisWrap">
        <div class="uc-analysis-toggle" onclick="(function(el){el.classList.toggle('open');})(document.getElementById('ucAnalysisWrap'))">
          <div class="uc-analysis-toggle-left">
            <div class="uc-analysis-toggle-lbl">Analyse · ${nextOppName||'Gegner'}</div>
            <div class="uc-analysis-preview">${(()=>{
              if(!h2h||h2h.wins===undefined) return 'Direktvergleich · Bisherige Saison';
              const hw=h2h.wins||0,hd=h2h.draws||0,hl=h2h.losses||0;
              return `${hw}S ${hd}U ${hl}N · ${nextOppName||'Gegner'}`;
            })()}</div>
          </div>
          <svg class="uc-analysis-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>
        </div>
        <div class="uc-analysis-body">
          ${h2hHtml}
          ${seasonCompareHtml}
        </div>
      </div>`:''}
      ${!hideScorers?`
      <div class="uc-box">
        <div class="uc-box-lbl">⚽ Top 3 Torschützen</div>
        ${top3GoalsHtml}
      </div>
      <div class="uc-box">
        <div class="uc-box-lbl">🎯 Top 3 Scorer (Tore + Assists)</div>
        ${top3ScorerHtml}
      </div>`:''}
    `;

    // Transfer-Fenster async laden (nach DOM-Render)
    if(showTransferWindow) setTimeout(()=>loadTransfers(d,next),0);

    const upd=d.updated_at?new Date(d.updated_at):new Date();
    document.getElementById('ucUpdated').textContent=
      `Stand: ${upd.getDate()}.${upd.getMonth()+1}. · ${String(upd.getHours()).padStart(2,'0')}:${String(upd.getMinutes()).padStart(2,'0')} Uhr`;

  }catch(e){
    console.warn('Union v5 error:',e);
    document.getElementById('ucBody').innerHTML=
      `<div style="padding:16px;text-align:center;font-size:12px;color:var(--t3);">⚠️ ${e.message}</div>`;
  }
  if(window._lbTick)window._lbTick();
}
loadUnion();

// ── TRANSFER WINDOW — lädt data/transfers.json ──
async function loadTransfers(unionData, nextMatch){
  const el=document.getElementById('ucTransferSection');
  if(!el) return;

  const currentMatchday=unionData.matchday||0;
  const isNewSeason=!!nextMatch; // true = neue Saison läuft bereits
  const seasonLabel=isNewSeason?`Neue Saison · bis Spieltag 3`:`Offseason ${new Date().getFullYear()}`;

  // Nächstes-Spiel-HTML (bei Transfer-Fenster in neuer Saison zusätzlich anzeigen)
  let nextMatchHtml='';
  if(nextMatch && nextMatch.date){
    const now2=new Date();
    const days=Math.round((new Date(nextMatch.date)-now2)/86400000);
    const dStr=days<=0?'Heute ⚡':days===1?'Morgen ⚡':`in ${days} Tagen`;
    const oppN=nextMatch.is_home?nextMatch.away_name:nextMatch.home_name;
    const oppL=nextMatch.is_home?nextMatch.away_logo:nextMatch.home_logo;
    const hA=nextMatch.is_home?'Heimspiel 🏠':'Auswärtsspiel ✈️';
    const unionLogo=unionData.team_logo||'https://tmssl.akamaized.net/images/wappen/head/89.png';
    const WDU2=['So','Mo','Di','Mi','Do','Fr','Sa'],MNU2=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const nd=new Date(nextMatch.date);
    const fmtDt2=`${WDU2[nd.getDay()]}. ${nd.getDate()}. ${MNU2[nd.getMonth()]} · ${String(nd.getHours()).padStart(2,'0')}:${String(nd.getMinutes()).padStart(2,'0')} Uhr`;
    function img2(url,sz,rd=''){
      if(!url)return`<span style="display:inline-block;width:${sz}px;"></span>`;
      return`<img src="${url}" width="${sz}" height="${sz}" style="object-fit:contain;flex-shrink:0;${rd?'border-radius:'+rd+';':''}" alt="" onerror="this.style.visibility='hidden'">`;
    }
    nextMatchHtml=`<div class="uc-match next-match" style="margin-bottom:0;">
      <div class="uc-match-lbl">Nächstes Spiel · ${hA} · Spieltag ${nextMatch.matchday}</div>
      <div class="uc-match-preview">
        <div class="uc-match-teams">
          <div class="uc-match-team">${img2(unionLogo,34,'4px')}<span class="uc-match-name">Union Berlin</span></div>
          <div class="uc-next-vs">${dStr}</div>
          <div class="uc-match-team r">${img2(oppL||'',34,'4px')}<span class="uc-match-name" style="text-align:right;">${oppN}</span></div>
        </div>
        <div class="uc-match-meta">${fmtDt2}</div>
      </div>
    </div>`;
  }

  try{
    const r=await fetch('data/transfers.json',{signal:AbortSignal.timeout(6000)});
    if(!r.ok) throw new Error('transfers.json nicht erreichbar ('+r.status+')');
    const td=await r.json();

    const transfers=td.transfers||[];
    const updatedAt=td.updated_at||null;

    if(!transfers.length){
      el.innerHTML=`
        ${nextMatchHtml}
        <div class="uc-box">
          <div class="uc-box-lbl">🔄 Transferfenster · ${seasonLabel}</div>
          <div class="uc-tr-empty">Noch keine Transfers bestätigt</div>
        </div>`;
      return;
    }

    // Gruppen: Zugänge / Abgänge / Leihen
    const ins=transfers.filter(t=>t.type==='in');
    const outs=transfers.filter(t=>t.type==='out');
    const loans=transfers.filter(t=>t.type==='loan');

    function trCard(t){
      const typeCls=t.type==='in'?'in':t.type==='out'?'out':'loan';
      const typeLbl=t.type==='in'?'Zugang':t.type==='out'?'Abgang':'Leihe';
      // photo_url kommt direkt aus JSON (Fotmob-URL mit playerId)
      const photoUrl=t.photo_url||'';
      const photoHtml=photoUrl
        ?`<img class="uc-tr-photo" src="${photoUrl}" onerror="this.outerHTML='<div class=\\'uc-tr-photo-fallback\\'>👤</div>'" alt="">`
        :`<div class="uc-tr-photo-fallback">👤</div>`;

      const clubLogoHtml=t.club_logo
        ?`<img class="uc-tr-club-logo" src="${t.club_logo}" onerror="this.style.display='none'" alt="">`:'';
      const clubName=t.club_name||'–';
      const arrowHtml=t.type==='in'?'←':t.type==='out'?'→':'⇄';
      const feeHtml=t.fee?`<span class="uc-tr-fee">${t.fee}</span>`:'';
      const mvHtml=t.market_value?`<span class="uc-tr-mv">MW ${t.market_value}</span>`:'';

      return`<div class="uc-tr-card ${typeCls}">
        ${photoHtml}
        <div class="uc-tr-info">
          <div class="uc-tr-name">${t.name||'Unbekannt'}</div>
          <div class="uc-tr-pos">${t.position||'–'}</div>
          <div class="uc-tr-club-row">
            ${clubLogoHtml}
            <span class="uc-tr-arrow">${arrowHtml}</span>
            <span class="uc-tr-club-name">${clubName}</span>
          </div>
          ${feeHtml||mvHtml?`<div class="uc-tr-fee-row">${feeHtml}${mvHtml}</div>`:''}
        </div>
        <div class="uc-tr-badge ${typeCls}">${typeLbl}</div>
      </div>`;
    }

    function section(list,title){
      if(!list.length) return '';
      return`<div>
        <div class="uc-box-lbl" style="margin-bottom:6px;">${title}</div>
        <div class="uc-transfer-list">${list.map(trCard).join('')}</div>
      </div>`;
    }

    const updStr=updatedAt
      ?`Stand: ${new Date(updatedAt).getDate()}.${new Date(updatedAt).getMonth()+1}.`
      :'';

    // Hinweis wie lange das Transfer-Fenster noch sichtbar ist
    const transitionHint=isNewSeason
      ?`<div class="uc-ss-transition-hint"><span class="uc-ss-th-icon">⏱</span>Sichtbar bis Spieltag 4 · danach: Nächstes Spiel</div>`
      :`<div class="uc-ss-transition-hint"><span class="uc-ss-th-icon">⏱</span>Sichtbar bis Saisonstart · danach: Spielplan &amp; Analyse</div>`;

    el.innerHTML=`
      ${nextMatchHtml}
      <div class="uc-box">
        <div class="uc-box-lbl">🔄 Transfers · ${seasonLabel}</div>
        <div class="uc-transfer-wrap">
          ${section(ins,'✅ Zugänge')}
          ${section(outs,'❌ Abgänge')}
          ${section(loans,'🔁 Leihen')}
          ${updStr?`<div class="uc-transfer-footer">${updStr} · Daten via RapidAPI 🔄</div>`:''}
          ${transitionHint}
        </div>
      </div>`;

  }catch(e){
    console.warn('Transfers error:',e);
    const transitionHintErr=isNewSeason
      ?`<div class="uc-ss-transition-hint" style="margin-top:8px;"><span class="uc-ss-th-icon">⏱</span>Sichtbar bis Spieltag 4 · danach: Nächstes Spiel</div>`
      :`<div class="uc-ss-transition-hint" style="margin-top:8px;"><span class="uc-ss-th-icon">⏱</span>Sichtbar bis Saisonstart · danach: Spielplan &amp; Analyse</div>`;
    el.innerHTML=`
      ${nextMatchHtml}
      <div class="uc-offseason-banner">
        <div class="uc-offseason-icon">🔄</div>
        <div class="uc-offseason-title">Transferfenster · ${seasonLabel}</div>
        <div class="uc-offseason-sub">Daten noch nicht verfügbar · GitHub Action einrichten<br><code style="font-size:8px;opacity:.6;">data/transfers.json</code></div>
        ${transitionHintErr}
      </div>`;
  }
}


// ── LOAD BAR ──
(function(){
  const bar=document.getElementById('loadBarFill');
  const wrap=document.getElementById('loadBar');
  let done=0,total=5;
  bar.style.width='8%';
  window._lbTick=function(){
    done++;
    const pct=8+Math.round((done/total)*92);
    bar.style.width=pct+'%';
    if(done>=total)setTimeout(()=>wrap.classList.add('done'),380);
  };
})();

loadICAL();
window.addEventListener('hub-auth-change', loadICAL);
