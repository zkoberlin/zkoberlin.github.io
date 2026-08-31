(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=iso=>new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(iso)).replace(',',' ·')+' Uhr';
  const logo=team=>team?.logo?`<img src="${esc(team.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`:'<span></span>';
  const valid=d=>d?.schemaVersion===3&&d?.team?.id===80&&/^\d{4}\/\d{2}$/.test(d?.season?.label||'')&&Number.isInteger(d?.standing?.played)&&Array.isArray(d?.table)&&d.table.length===18&&!Number.isNaN(Date.parse(d?.generatedAt));
  const transferValid=d=>d?.schemaVersion===2&&Array.isArray(d?.windows)&&Array.isArray(d?.arrivals)&&Array.isArray(d?.departures)&&d.arrivals.length<=40&&d.departures.length<=40&&d.featuredArrivals?.length===4&&d.featuredDepartures?.length===4;
  const injuryValid=d=>d?.schemaVersion===1&&d?.teamId===80&&Array.isArray(d?.players)&&d.players.length<=20&&!Number.isNaN(Date.parse(d?.observedAt))&&/^https:\/\//.test(d?.source?.url||'');
  function transferItem(item){const match=String(item).match(/^(.*?)\s*(\(.*\))$/);return`<li><b>${esc(match?match[1]:item)}</b>${match?`<span>${esc(match[2].slice(1,-1))}</span>`:''}</li>`;}
  function transferPortrait(item){const initials=item.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('');return`<article class="uc-transfer-person"><div class="uc-transfer-photo"><span>${esc(initials)}</span><img src="${esc(item.photo)}" alt="${esc(item.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></div><div><b>${esc(item.name)}</b><span>${esc(item.detail)}</span></div></article>`;}
  async function transferSection(){
    try{
      const response=await fetch('data/transfers.json',{signal:AbortSignal.timeout(6000),cache:'no-cache'}); if(!response.ok)return'';
      const data=await response.json(); if(!transferValid(data))return'';
      const now=Date.now(),active=data.windows.find(window=>now>=Date.parse(window.startsAt)&&now<=Date.parse(window.endsAt));
      if(!active||active.id!==data.windowId)return'';
      const days=Math.max(0,Math.ceil((Date.parse(active.endsAt)-now)/86400000));
      return`<section class="uc-live-transfers"><div class="uc-transfer-header"><div><div class="uc-transfer-header-title">🔄 ${esc(active.label)} · Saison ${esc(data.season)}</div><div class="uc-transfer-header-sub">Noch ${days} Tag${days===1?'':'e'} geöffnet · automatisch ausgeblendet nach Fristende</div></div><a href="${esc(data.source.url)}" target="_blank" rel="noopener noreferrer">Quelle ↗</a></div><div class="uc-transfer-featured"><div><h4>🟢 Letzte Zugänge</h4>${data.featuredArrivals.map(transferPortrait).join('')}</div><div><h4>🔴 Letzte Abgänge</h4>${data.featuredDepartures.map(transferPortrait).join('')}</div></div><details class="uc-transfer-all"><summary>Alle Wechsel · ${data.arrivals.length} Zugänge / ${data.departures.length} Abgänge</summary><div class="uc-transfer-columns"><div><h4>🟢 Zugänge <span>${data.arrivals.length}</span></h4><ul>${data.arrivals.map(transferItem).join('')}</ul></div><div><h4>🔴 Abgänge <span>${data.departures.length}</span></h4><ul>${data.departures.map(transferItem).join('')}</ul></div></div></details></section>`;
    }catch(error){console.warn('Transfer data unavailable',error);return'';}
  }
  async function injurySection(){
    try{
      const response=await fetch('data/union-injuries.json',{signal:AbortSignal.timeout(6000),cache:'no-cache'}); if(!response.ok)return'';
      const data=await response.json(); if(!injuryValid(data)||!data.players.length)return'';
      const observed=new Date(data.observedAt),ageDays=Math.max(0,Math.floor((Date.now()-observed.getTime())/86400000));
      const freshness=ageDays===0?'heute geprüft':ageDays===1?'gestern geprüft':`vor ${ageDays} Tagen geprüft`;
      const rows=data.players.map(player=>`<article class="uc-injury-player"><div class="uc-injury-icon">✚</div><div><b>${esc(player.name)}</b><span>${esc(player.issue)}</span></div><div class="uc-injury-return">${player.return?esc(player.return):'Rückkehr offen'}</div></article>`).join('');
      return`<section class="uc-injuries"><div class="uc-injury-header"><div><div class="uc-injury-title">🩹 Gemeldete Ausfälle</div><div class="uc-injury-sub">${esc(data.validForMatch)} · ${freshness}</div></div><a href="${esc(data.source.url)}" target="_blank" rel="noopener noreferrer">Quelle ↗</a></div><div class="uc-injury-grid">${rows}</div><div class="uc-injury-note">${esc(data.source.quality)} · Rückkehrdaten werden nicht geschätzt.</div></section>`;
    }catch(error){console.warn('Injury data unavailable',error);return'';}
  }
  function matchCard(match,label){
    if(!match)return`<article class="uc-live-match"><div class="uc-live-kicker">${label}</div><p class="uc-live-empty">Noch kein Spiel verfügbar</p></article>`;
    const result=match.unionResult==='W'?'Sieg':match.unionResult==='D'?'Remis':match.unionResult==='L'?'Niederlage':'';
    return`<article class="uc-live-match"><div class="uc-live-kicker">${label} · ${match.matchday}. Spieltag ${result?`· <strong class="${match.unionResult.toLowerCase()}">${result}</strong>`:''}</div><div class="uc-live-teams"><div class="uc-live-team">${logo(match.home)}<b>${esc(match.home.shortName||match.home.name)}</b></div><div class="uc-live-score">${match.score?`${match.score.home}:${match.score.away}`:'vs.'}</div><div class="uc-live-team right">${logo(match.away)}<b>${esc(match.away.shortName||match.away.name)}</b></div></div><div class="uc-live-time">${fmt(match.date)}</div></article>`;
  }
  function headToHeadSection(opponent){
    if(!opponent||!Array.isArray(opponent.headToHead)||!opponent.headToHead.length)return'';
    const games=opponent.headToHead,wins=games.filter(match=>match.result==='W').length,draws=games.filter(match=>match.result==='D').length,losses=games.filter(match=>match.result==='L').length,goalsFor=games.reduce((sum,match)=>sum+match.goalsFor,0),goalsAgainst=games.reduce((sum,match)=>sum+match.goalsAgainst,0);
    const rows=games.slice().reverse().map(match=>`<article class="uc-h2h-row"><div class="uc-h2h-match-top"><span class="uc-opponent-result-state ${match.result.toLowerCase()}">${match.result==='W'?'S':match.result==='D'?'U':'N'}</span><span>${esc(match.isHome?'Heimspiel':'Auswärts')}</span><strong>${match.goalsFor}:${match.goalsAgainst}</strong></div><div class="uc-h2h-opponent">${logo(opponent)}<b>gegen ${esc(opponent.shortName||opponent.name)}</b></div><time>${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'long',year:'numeric',timeZone:'Europe/Berlin'}).format(new Date(match.date))}</time></article>`).join('');
    return`<section class="uc-h2h"><div class="uc-h2h-head"><div><div class="uc-h2h-title">Direkter Vergleich · letzte ${games.length} Duelle</div><div class="uc-h2h-sub">Union Berlin gegen ${esc(opponent.shortName||opponent.name)} · Ergebnisse aus Union-Sicht</div></div><div class="uc-h2h-summary"><span><b>${wins}</b> Siege</span><span><b>${draws}</b> Remis</span><span><b>${losses}</b> Niederlagen</span><span><b>${goalsFor}:${goalsAgainst}</b> Tore</span><span><b class="${goalsFor-goalsAgainst>0?'pos':goalsFor-goalsAgainst<0?'neg':''}">${goalsFor-goalsAgainst>0?'+':''}${goalsFor-goalsAgainst}</b> Differenz</span></div></div><div class="uc-h2h-matches">${rows}</div></section>`;
  }
  function formTeam(team){
    const dots=[...team.form].map(result=>`<span class="uc-fd ${result==='W'?'w':result==='D'?'d':'l'}">${result==='W'?'S':result==='D'?'U':'N'}</span>`).join('');
    const wins=[...team.form].filter(result=>result==='W').length,draws=[...team.form].filter(result=>result==='D').length,losses=[...team.form].filter(result=>result==='L').length;
    const matches=team.lastMatches.slice().reverse().map(match=>`<article class="uc-opponent-result"><span class="uc-opponent-result-state ${match.result.toLowerCase()}">${match.result==='W'?'S':match.result==='D'?'U':'N'}</span>${logo(match.opponent)}<div><b>${esc(match.isHome?'vs. ':'bei ')}${esc(match.opponent.shortName||match.opponent.name)}</b><span>${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(match.date))}</span></div><strong>${match.goalsFor}:${match.goalsAgainst}</strong></article>`).join('');
    return`<article class="uc-form-team"><div class="uc-opponent-head"><div class="uc-opponent-title">${logo(team)}<span>${esc(team.shortName||team.name)}</span></div><div class="uc-opponent-form"><div>${dots}</div><span>${wins}S · ${draws}U · ${losses}N</span></div></div><div class="uc-opponent-results"><div class="uc-box-lbl">Letzte 3 Bundesliga-Ergebnisse</div>${matches}</div></article>`;
  }
  function opponentSection(union,opponent){
    if(!union||!opponent||!Array.isArray(union.lastMatches)||!Array.isArray(opponent.lastMatches)||!union.lastMatches.length||!opponent.lastMatches.length)return'';
    return`<section class="uc-opponent"><div class="uc-opponent-kicker">Formvergleich · nächstes Spiel</div><div class="uc-form-compare">${formTeam(union)}${formTeam(opponent)}</div></section>`;
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
    const [injuries,transfers]=await Promise.all([injurySection(),transferSection()]);
    document.getElementById('ucBody').innerHTML=`<div class="uc-live-grid"><div class="uc-live-column">${matchCard(d.nextMatch,'Nächstes Spiel')}</div><div class="uc-live-column">${matchCard(d.lastMatch,'Letztes Spiel')}</div></div>${headToHeadSection(d.nextOpponent)}${opponentSection(d.team,d.nextOpponent)}<div class="uc-2col uc-live-overview"><section class="uc-box"><div class="uc-box-lbl">Form · letzte 5 Spiele</div><div class="uc-form">${form}</div></section><section class="uc-box"><div class="uc-box-lbl">Tabellenumfeld</div><div class="uc-live-table">${table}</div></section></div>${injuries}${transfers}<div class="uc-live-note"><span class="uc-live-dot"></span>${d.status==='preseason'?'Saisonstart · Tabelle nach dem ersten Spiel aussagekräftig':'Saison läuft'}<span>OpenLigaDB · automatisch aktualisiert</span></div>`;
    const u=new Date(d.generatedAt); document.getElementById('ucUpdated').textContent=`Stand: ${u.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} · ${u.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr`;
  }
  async function load(){try{const r=await fetch('data/union.json',{signal:AbortSignal.timeout(6000),cache:'no-cache'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const d=await r.json();if(!valid(d))throw new Error('invalid schema');await render(d);}catch(e){console.warn('Union data unavailable',e);document.getElementById('ucBody').innerHTML='<div class="uc-live-unavailable">⚽ Union-Daten sind gerade nicht verfügbar. Die letzte gültige Datei bleibt beim nächsten Datenlauf erhalten.</div>';document.getElementById('ucUpdated').textContent='Daten momentan nicht verfügbar';}if(window._lbDone)window._lbDone('union');}
  load();
})();
