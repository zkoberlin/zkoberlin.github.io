(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=iso=>new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(iso)).replace(',',' ·')+' Uhr';
  const logo=team=>team?.logo?`<img src="${esc(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`:'<span></span>';
  const valid=d=>d?.schemaVersion===2&&d?.team?.id===80&&/^\d{4}\/\d{2}$/.test(d?.season?.label||'')&&Number.isInteger(d?.standing?.played)&&Array.isArray(d?.table)&&d.table.length===18&&!Number.isNaN(Date.parse(d?.generatedAt));
  const transferValid=d=>d?.schemaVersion===2&&Array.isArray(d?.windows)&&Array.isArray(d?.arrivals)&&Array.isArray(d?.departures)&&d.arrivals.length<=40&&d.departures.length<=40;
  function transferItem(item){const match=String(item).match(/^(.*?)\s*(\(.*\))$/);return`<li><b>${esc(match?match[1]:item)}</b>${match?`<span>${esc(match[2].slice(1,-1))}</span>`:''}</li>`;}
  async function transferSection(){
    try{
      const response=await fetch('data/transfers.json',{signal:AbortSignal.timeout(6000),cache:'no-cache'}); if(!response.ok)return'';
      const data=await response.json(); if(!transferValid(data))return'';
      const now=Date.now(),active=data.windows.find(window=>now>=Date.parse(window.startsAt)&&now<=Date.parse(window.endsAt));
      if(!active||active.id!==data.windowId)return'';
      const days=Math.max(0,Math.ceil((Date.parse(active.endsAt)-now)/86400000));
      return`<section class="uc-live-transfers"><div class="uc-transfer-header"><div><div class="uc-transfer-header-title">🔄 ${esc(active.label)} · Saison ${esc(data.season)}</div><div class="uc-transfer-header-sub">Noch ${days} Tag${days===1?'':'e'} geöffnet · automatisch ausgeblendet nach Fristende</div></div><a href="${esc(data.source.url)}" target="_blank" rel="noopener noreferrer">Quelle ↗</a></div><div class="uc-transfer-columns"><div><h4>🟢 Zugänge <span>${data.arrivals.length}</span></h4><ul>${data.arrivals.map(transferItem).join('')}</ul></div><div><h4>🔴 Abgänge <span>${data.departures.length}</span></h4><ul>${data.departures.map(transferItem).join('')}</ul></div></div></section>`;
    }catch(error){console.warn('Transfer data unavailable',error);return'';}
  }
  function matchCard(match,label){
    if(!match)return`<article class="uc-live-match"><div class="uc-live-kicker">${label}</div><p class="uc-live-empty">Noch kein Spiel verfügbar</p></article>`;
    const result=match.unionResult==='W'?'Sieg':match.unionResult==='D'?'Remis':match.unionResult==='L'?'Niederlage':'';
    return`<article class="uc-live-match"><div class="uc-live-kicker">${label} · ${match.matchday}. Spieltag ${result?`· <strong class="${match.unionResult.toLowerCase()}">${result}</strong>`:''}</div><div class="uc-live-teams"><div class="uc-live-team">${logo(match.home)}<b>${esc(match.home.shortName||match.home.name)}</b></div><div class="uc-live-score">${match.score?`${match.score.home}:${match.score.away}`:'vs.'}</div><div class="uc-live-team right">${logo(match.away)}<b>${esc(match.away.shortName||match.away.name)}</b></div></div><div class="uc-live-time">${fmt(match.date)}</div></article>`;
  }
  async function render(d){
    const s=d.standing;
    document.getElementById('ucLogo').src=d.team.logo; document.getElementById('ucSeasonBadge').textContent=`🏆 Saison ${d.season.label}`;
    document.getElementById('ucLeague').textContent=`Bundesliga · ${d.season.currentMatchday||1}. Spieltag`; document.getElementById('ucRank').textContent=s.rank?`${s.rank}.`:'–';
    document.querySelector('.uc-rank-lbl').textContent=s.rank?'Platz':'Noch ohne Tabelle'; document.getElementById('ucPtsNum').textContent=s.points;
    document.getElementById('ucBilanz').textContent=`${s.won}/${s.drawn}/${s.lost}`; document.getElementById('ucTore').textContent=`${s.goalsFor}:${s.goalsAgainst}`;
    const diff=document.getElementById('ucToreDiff'); diff.textContent=`${s.goalDifference>0?'+':''}${s.goalDifference}`; diff.style.color=s.goalDifference>0?'var(--green)':s.goalDifference<0?'var(--red)':'var(--t3)';
    document.getElementById('ucQuote').textContent=s.played?(s.points/s.played).toFixed(1):'–'; document.querySelector('#ucPtsStrip .uc-pts-stat:last-child .uc-pts-stat-lbl').textContent='Pkt. / Spiel'; document.getElementById('ucPtsStrip').style.display='flex';
    const form=s.form?[...s.form].map(v=>`<span class="uc-fd ${v==='W'?'w':v==='D'?'d':'l'}">${v==='W'?'S':v==='D'?'U':'N'}</span>`).join(''):'<span class="uc-live-empty">Beginnt nach dem ersten Spiel</span>';
    const i=d.table.findIndex(r=>r.isUnion), rows=s.played?d.table.slice(Math.max(0,i-2),Math.min(18,i+3)):d.table.slice(0,5);
    const table=rows.map(r=>`<div class="uc-tbl-row${r.isUnion?' me':''}"><span>${r.rank?`${r.rank}.`:'–'}</span>${logo({logo:r.logo})}<span class="tbl-name">${esc(r.shortName||r.name)}</span><b>${r.points}</b></div>`).join('');
    const transfers=await transferSection();
    document.getElementById('ucBody').innerHTML=`<div class="uc-live-grid">${matchCard(d.nextMatch,'Nächstes Spiel')}${matchCard(d.lastMatch,'Letztes Spiel')}</div><div class="uc-2col uc-live-overview"><section class="uc-box"><div class="uc-box-lbl">Form · letzte 5 Spiele</div><div class="uc-form">${form}</div></section><section class="uc-box"><div class="uc-box-lbl">Tabellenumfeld</div><div class="uc-live-table">${table}</div></section></div>${transfers}<div class="uc-live-note"><span class="uc-live-dot"></span>${d.status==='preseason'?'Saisonstart · Tabelle nach dem ersten Spiel aussagekräftig':'Saison läuft'}<span>OpenLigaDB · automatisch aktualisiert</span></div>`;
    const u=new Date(d.generatedAt); document.getElementById('ucUpdated').textContent=`Stand: ${u.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} · ${u.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr`;
  }
  async function load(){try{const r=await fetch('data/union.json',{signal:AbortSignal.timeout(6000),cache:'no-cache'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();if(!valid(d))throw new Error('invalid schema');await render(d);}catch(e){console.warn('Union data unavailable',e);document.getElementById('ucBody').innerHTML='<div class="uc-live-unavailable">⚽ Union-Daten sind gerade nicht verfügbar. Die letzte gültige Datei bleibt beim nächsten Datenlauf erhalten.</div>';document.getElementById('ucUpdated').textContent='Daten momentan nicht verfügbar';}if(window._lbTick)window._lbTick();}
  load();
})();
