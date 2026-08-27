// ── ALKOHOL TRACKER v5.12.3 ──

var _atkCharts = {};
var _atkCurrentPeriod = {a:'today'};

var TAGE   = ['So','Mo','Di','Mi','Do','Fr','Sa'];
var MONATE = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var ATK_LIMIT  = 8;
var ATK_API = 'https://paul-gateway-v2.paul-bendzko.workers.dev/alcohol';
var _atkSyncing = false;
var _atkSyncTimer = null;
var _atkData = {};
var _atkRecords = {};

/* ── NUR SITZUNGSSPEICHER: sensible Historie bleibt nicht im Browser ── */
function atkLoadData() {
  return _atkData;
}
function atkSaveData(d) {
  _atkData = d;
}

/* ── SHEET HELPERS ── */
function atkDateKey(d)  { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function atkToday()     { return atkDateKey(new Date()); }
function atkFmt(u)      { return u.toFixed(1).replace('.', ','); }

function atkSetSyncStatus(txt, color) {
  var el = document.getElementById('atkSyncStatus');
  if (el) { el.textContent = txt; el.style.color = color || 'var(--t3)'; }
}

/* ── PULL AUS GESCHÜTZTEM CLOUDFLARE-GATEWAY ── */
function atkPullCloud(callback) {
  if (!window.HubAuth || !window.HubAuth.isSignedIn()) {
    atkSaveData({});
    atkSetSyncStatus('Anmeldung erforderlich', 'var(--t3)');
    if (callback) callback();
    return;
  }
  atkSetSyncStatus('↻ Sync…', 'var(--blue)');
  window.HubAuth.authorizedFetch(ATK_API, { signal: AbortSignal.timeout(7000) })
    .then(function(r){ return r.json(); })
    .then(function(json) {
      if (json.schemaVersion !== 1 || !Array.isArray(json.entries)) throw new Error('Ungültiges Schema');
      var data = {};
      for (var i = 0; i < json.entries.length; i++) {
        var row = json.entries[i];
        var dk = String(row.date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) throw new Error('Ungültiges Datum');
        if (!data[dk]) data[dk] = { entries: [] };
        data[dk].entries.push({
          entryId: row.entryId || '',
          id:    row.drinkCode || '',
          units: Number(row.units) || 0,
          label: row.label || '',
          time:  row.time || '00:00'
        });
      }
      atkSaveData(data);
      atkSetSyncStatus('✓ ' + json.entries.length + ' Einträge synchronisiert', '#3a9e5f');
      setTimeout(function(){ atkSetSyncStatus(''); }, 3000);
      if (callback) callback();
    })
    .catch(function(err) {
      console.warn('atk cloud pull:', err);
      atkSetSyncStatus('Nicht verfügbar', '#e24b4a');
      if (callback) callback();
    });
}

/* ── EINTRAG SERVERSEITIG SPEICHERN ── */
function atkPushEntry(drinkCode, occurredOn) {
  return window.HubAuth.authorizedFetch(ATK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drinkCode: drinkCode, occurredOn: occurredOn })
  })
    .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}

function atkPushDelete(entryId) {
  return window.HubAuth.authorizedFetch(ATK_API, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryId: entryId })
  });
}

/* ── LOG ENTRY ── */
function atkLog(id, units, label, design) {
  if (!window.HubAuth || !window.HubAuth.isSignedIn()) { atkSetSyncStatus('Bitte zuerst anmelden', '#e24b4a'); return; }
  var dateInput = document.getElementById('atkEntryDate');
  var occurredOn = dateInput && dateInput.value ? dateInput.value : atkToday();
  atkSetSyncStatus('↻ Speichern…', 'var(--blue)');
  atkPushEntry(id, occurredOn).then(function(json){
    var entry = json.entry;
    var data = atkLoadData();
    if (!data[entry.date]) data[entry.date] = { entries: [] };
    data[entry.date].entries.push({ entryId:entry.entryId, id:entry.drinkCode, units:entry.units, label:entry.label, time:entry.time });
    atkSaveData(data);
    atkRenderAll();
    var savedDate = new Date(entry.date + 'T12:00:00').toLocaleDateString('de-DE');
    atkSetSyncStatus('✓ Für ' + savedDate + ' gespeichert', '#3a9e5f');
  }).catch(function(){ atkSetSyncStatus('⚠ Speichern fehlgeschlagen', '#e24b4a'); });
}

function atkResetEntryDate() {
  var input = document.getElementById('atkEntryDate');
  if (input) input.value = atkToday();
}

function atkUndo(idx) {
  var data = atkLoadData();
  var tk   = atkToday();
  if (data[tk] && data[tk].entries && data[tk].entries[idx] != null) {
    var entry = data[tk].entries[idx];
    atkSetSyncStatus('↻ Löschen…', 'var(--blue)');
    atkPushDelete(entry.entryId).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      data[tk].entries.splice(idx, 1);
      atkSaveData(data);
      atkRenderAll();
      atkSetSyncStatus('✓ Gelöscht', '#3a9e5f');
    }).catch(function(){ atkSetSyncStatus('⚠ Löschen fehlgeschlagen', '#e24b4a'); });
  }
}

/* ── GET ENTRIES / UNITS ── */
function atkGetEntries(data, dk) {
  return (data[dk] && data[dk].entries) ? data[dk].entries : [];
}
function atkGetUnits(data, dk) {
  return atkGetEntries(data, dk).reduce(function(s,e){ return s + e.units; }, 0);
}

/* ── WEEK HELPERS ── */
function atkWeekKeys(offset) {
  offset = offset || 0;
  var keys   = [];
  var now    = new Date();
  var monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - (offset * 7));
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(atkDateKey(d));
  }
  return keys;
}

/* ══════════════════════════════════════════
   STREAK ENGINE
══════════════════════════════════════════ */
function atkLoadRecords() {
  return _atkRecords;
}
function atkSaveRecords(r) {
  _atkRecords = r;
}

function atkComputeStreaks(data) {
  // Build sorted list of all date-keys that exist in data
  var allKeys = Object.keys(data).sort();
  if (!allKeys.length) return { soberCur:0, drinkCur:0, soberBest:0, drinkBest:0 };

  // Walk backwards from today to compute current streaks
  var td = atkToday();
  var soberCur = 0, drinkCur = 0;
  var soberDone = false, drinkDone = false;
  var d = new Date(td);

  for (var i = 0; i < 1000; i++) {
    var dk = atkDateKey(d);
    var u  = atkGetUnits(data, dk);
    if (!soberDone) {
      if (u === 0) { soberCur++; }
      else { soberDone = true; }
    }
    if (!drinkDone) {
      if (u > 0) { drinkCur++; }
      else if (i > 0) { drinkDone = true; } // allow gap on "today" if nothing logged yet
    }
    if (soberDone && drinkDone) break;
    // only go back as far as earliest data key
    if (dk <= allKeys[0] && i > 0) break;
    d.setDate(d.getDate() - 1);
  }

  // Walk ALL data to find best ever streaks
  // Build a dense calendar from first to last data key
  var first = new Date(allKeys[0]);
  var last  = new Date(td);
  var soberBest = 0, drinkBest = 0;
  var sc = 0, dc = 0;
  var cur = new Date(first);
  while (cur <= last) {
    var k = atkDateKey(cur);
    var u = atkGetUnits(data, k);
    if (u === 0) { sc++; dc = 0; }
    else         { dc++; sc = 0; }
    if (sc > soberBest) soberBest = sc;
    if (dc > drinkBest) drinkBest = dc;
    cur.setDate(cur.getDate() + 1);
  }

  return { soberCur: soberCur, drinkCur: drinkCur, soberBest: soberBest, drinkBest: drinkBest };
}

function atkComputeTotals(data) {
  // Total days ever recorded as sober (units===0) vs. drinking (units>0),
  // across the entire range from the first tracked day until today.
  var allKeys = Object.keys(data).sort();
  if (!allKeys.length) return { soberTotal:0, drinkTotal:0 };

  var first = new Date(allKeys[0]);
  var last  = new Date(atkToday());
  var soberTotal = 0, drinkTotal = 0;
  var cur = new Date(first);
  while (cur <= last) {
    var k = atkDateKey(cur);
    var u = atkGetUnits(data, k);
    if (u === 0) soberTotal++; else drinkTotal++;
    cur.setDate(cur.getDate() + 1);
  }
  return { soberTotal: soberTotal, drinkTotal: drinkTotal };
}

function atkFmtDate(isoStr) {
  if (!isoStr) return '';
  var d = new Date(isoStr);
  return d.getDate() + '. ' + MONATE[d.getMonth()] + ' ' + d.getFullYear();
}

function atkRenderStreaks() {
  var el = document.getElementById('atkStreaks');
  if (!el) return;

  var data    = atkLoadData();
  var records = atkLoadRecords();
  var s       = atkComputeStreaks(data);
  var totals  = atkComputeTotals(data);

  // Check and update records
  var recordBroken = { sober: false, drink: false };
  if (s.soberBest > (records.soberBest || 0)) {
    records.soberBest     = s.soberBest;
    records.soberBestDate = atkToday();
    recordBroken.sober    = true;
  }
  if (s.drinkBest > (records.drinkBest || 0)) {
    records.drinkBest     = s.drinkBest;
    records.drinkBestDate = atkToday();
    recordBroken.drink    = true;
  }
  atkSaveRecords(records);

  var soberIsRecord  = s.soberCur > 0 && s.soberCur >= (records.soberBest || 0);
  var drinkIsRecord  = s.drinkCur > 0 && s.drinkCur >= (records.drinkBest || 0);

  function chipHtml(opts) {
    // opts: { num, numColor, label, sub, recordVal, recordDate, recordColor, isRecord, trophy }
    var chipClass = 'atk-streak-chip';
    if (opts.isRecord && opts.recordColor === 'green') chipClass += ' record-sober';
    else if (opts.isRecord && opts.recordColor === 'drink') chipClass += ' record-drinking';
    var recordHtml = '';
    if (opts.recordVal > 1) {
      var breakTxt = opts.isRecord && recordBroken[opts.recordColor === 'green' ? 'sober' : 'drink']
        ? '🏆 Neuer Rekord!'
        : ('Rekord: ' + opts.recordVal + ' Tage' + (opts.recordDate ? ' · ' + atkFmtDate(opts.recordDate) : ''));
      recordHtml = '<div class="atk-streak-record' + (opts.recordColor !== 'green' ? ' drink' : '') + '">' + breakTxt + '</div>';
    }
    var trophyHtml = opts.isRecord ? '<div class="atk-streak-trophy">🏆</div>' : '';
    var totalHtml = (opts.total != null) ? '<div class="atk-streak-total">Insgesamt ' + opts.total + (opts.total === 1 ? ' Tag' : ' Tage') + '</div>' : '';
    return '<div class="' + chipClass + '">' + trophyHtml +
      '<div class="atk-streak-lbl">' + opts.label + '</div>' +
      '<div class="atk-streak-num ' + opts.numColor + '">' + opts.num + (opts.num === 1 ? ' Tag' : ' Tage') + '</div>' +
      '<div class="atk-streak-sub">' + opts.sub + '</div>' +
      recordHtml +
      totalHtml +
      '</div>';
  }

  var html = '';

  // Sober streak chip
  var soberSub = s.soberCur === 0 ? 'Heute getrunken' : (s.soberCur === 1 ? 'Gestern oder heute nüchtern' : 'am Stück nüchtern');
  html += chipHtml({
    num: s.soberCur,
    numColor: s.soberCur >= 3 ? 'green' : 'grey',
    label: '🫗 Nüchtern-Serie',
    sub: soberSub,
    recordVal: records.soberBest || 0,
    recordDate: records.soberBestDate,
    recordColor: 'green',
    isRecord: soberIsRecord,
    total: totals.soberTotal
  });

  // Drinking streak chip
  var drinkSub = s.drinkCur === 0 ? 'Aktuell nüchtern' : (s.drinkCur === 1 ? 'Tag getrunken' : 'Tage am Stück getrunken');
  html += chipHtml({
    num: s.drinkCur,
    numColor: s.drinkCur >= 3 ? 'orange' : (s.drinkCur > 0 ? 'orange' : 'grey'),
    label: '🍺 Trink-Serie',
    sub: drinkSub,
    recordVal: records.drinkBest || 0,
    recordDate: records.drinkBestDate,
    recordColor: 'drink',
    isRecord: drinkIsRecord,
    total: totals.drinkTotal
  });

  el.innerHTML = html;
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
function atkRenderAll() {
  var data  = atkLoadData();
  var td    = atkToday();
  var yd    = atkDateKey(new Date(Date.now() - 86400000));
  var wk    = atkWeekKeys(0);
  var pwk   = atkWeekKeys(1);
  var todayU = atkGetUnits(data, td);
  var yestU  = atkGetUnits(data, yd);
  var weekU  = wk.reduce(function(s,k){ return s + atkGetUnits(data,k); }, 0);
  var entries = atkGetEntries(data, td);



  // Date label
  var el = document.getElementById('atkA-date');
  if (el) {
    var now = new Date();
    el.textContent = 'Heute · ' + TAGE[now.getDay()] + ', ' + now.getDate() + '. ' + MONATE[now.getMonth()];
  }

  // Stats
  el = document.getElementById('atkA-today'); if (el) el.textContent = atkFmt(todayU);
  el = document.getElementById('atkA-week');  if (el) el.textContent = atkFmt(weekU);

  // Week bars
  var wbarsEl = document.getElementById('atkA-weekBars');
  var maxW    = Math.max.apply(null, wk.map(function(k){ return atkGetUnits(data,k); }).concat([ATK_LIMIT]));
  if (wbarsEl) {
    var fills = wbarsEl.querySelectorAll('.atk-week-bar-fill');
    for (var i = 0; i < 7; i++) {
      var u = atkGetUnits(data, wk[i]);
      if (fills[i]) fills[i].style.width = Math.min(100, (u / maxW) * 100) + '%';
    }
  }
  var wdaysEl = document.getElementById('atkA-weekDays');
  if (wdaysEl) {
    wdaysEl.innerHTML = '';
    for (var i = 0; i < 7; i++) {
      var d   = new Date(wk[i]);
      var div = document.createElement('div');
      div.className   = 'atk-week-day' + (wk[i] === td ? ' today' : '');
      div.textContent = TAGE[d.getDay()];
      wdaysEl.appendChild(div);
    }
  }

  // Log
  var logA = document.getElementById('atkA-log');
  if (logA) {
    if (!entries.length) {
      logA.innerHTML = '<div class="atk-log-empty">Noch nichts eingetragen</div>';
    } else {
      var html  = '';
      var shown = entries.slice().reverse().slice(0, 5);
      for (var i = 0; i < shown.length; i++) {
        var e        = shown[i];
        var realIdx  = entries.length - 1 - i;
        html += '<div class="atk-log-row">' +
          '<div class="atk-log-left"><div class="atk-log-dot"></div>' + e.label + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="color:var(--t3)">' + e.time + ' · ' + atkFmt(e.units) + ' Einh.</span>' +
          '<span class="atk-log-undo" onclick="atkUndo(' + realIdx + ')">↩</span>' +
          '</div></div>';
      }
      logA.innerHTML = html;
    }
  }

  // Streaks
  atkRenderStreaks();
}

/* ── DESIGN SWITCH (kept for compat) ── */
function atkToggleMobile() {
  var detail = document.getElementById('atkDetail');
  var lbl    = document.getElementById('atkExpandLabel');
  var chev   = document.getElementById('atkExpandChev');
  if (!detail) return;
  var isOpen = detail.classList.toggle('open');
  if (lbl)  lbl.textContent  = isOpen ? '− Schließen' : '+ Eintragen & Verlauf';
  if (chev) chev.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  // Render graph when opening
  if (isOpen) {
    atkRenderGraph('a', _atkCurrentPeriod['a'] || 'today');
  }
}

function atkSwitchDesign(d, tabEl) {
  var panels = document.querySelectorAll('.atk-panel');
  for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
  var tabs = document.querySelectorAll('.atk-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  var target = document.getElementById('atkPanel' + d.toUpperCase());
  if (target) target.classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  atkRenderAll();
}

/* ── GRAPH TOGGLE (mobile) ── */
function atkToggleGraph(d) {
  // kept for compat — graph is now inline in atk-detail
  atkRenderGraph(d, _atkCurrentPeriod[d] || 'today');
}

/* ── PERIOD ROW ── */
function atkSetPeriod(design, periodId, el) {
  _atkCurrentPeriod[design] = periodId;
  var row = document.getElementById('atk' + design.toUpperCase() + '-periods');
  if (row) {
    var btns = row.querySelectorAll('.atk-period-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  }
  if (el) el.classList.add('active');
  atkRenderGraph(design, periodId);
}

function atkBuildPeriodRow(design, activePeriod) {
  var periods = [
    {id:'today',   label:'Heute'},
    {id:'gestern', label:'Gestern'},
    {id:'woche',   label:'Woche'},
    {id:'letzt_w', label:'Letzte Wo.'},
    {id:'monat',   label:'Monat'},
    {id:'ytd',     label:'YTD'},
    {id:'start',   label:'Seit Beginn'}
  ];
  var row = document.getElementById('atk' + design.toUpperCase() + '-periods');
  if (!row) return;
  row.innerHTML = '';
  for (var i = 0; i < periods.length; i++) {
    var p   = periods[i];
    var btn = document.createElement('div');
    btn.className   = 'atk-period-btn' + (p.id === activePeriod ? ' active' : '');
    btn.textContent = p.label;
    btn.setAttribute('onclick', 'atkSetPeriod("' + design + '","' + p.id + '",this)');
    row.appendChild(btn);
  }
}

/* ── GRAPH RENDER ── */
var _atkCharts        = {};

function atkRenderGraph(design, periodId) {
  atkBuildPeriodRow(design, periodId);

  var data    = atkLoadData();
  var td      = atkToday();
  var yd      = atkDateKey(new Date(Date.now() - 86400000));
  var labels  = [], curVals = [], prevVals = [];

  if (periodId === 'today' || periodId === 'gestern') {
    var dk      = periodId === 'today' ? td : yd;
    var entries = atkGetEntries(data, dk);
    for (var h = 0; h < 24; h++) {
      labels.push(h + 'h');
      var sum = 0;
      for (var e = 0; e < entries.length; e++) {
        if (parseInt(entries[e].time) === h) sum += entries[e].units;
      }
      curVals.push(parseFloat(sum.toFixed(1)));
    }
  } else if (periodId === 'woche' || periodId === 'letzt_w') {
    var off  = periodId === 'woche' ? 0 : 1;
    var wk   = atkWeekKeys(off);
    var pwk  = atkWeekKeys(off + 1);
    for (var i = 0; i < 7; i++) {
      var d = new Date(wk[i]);
      labels.push(TAGE[d.getDay()]);
      curVals.push(parseFloat(atkGetUnits(data, wk[i]).toFixed(1)));
      prevVals.push(parseFloat(atkGetUnits(data, pwk[i]).toFixed(1)));
    }
  } else if (periodId === 'monat') {
    var now        = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var daysInPrev  = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    for (var i = 1; i <= daysInMonth; i++) {
      labels.push(i + '.');
      curVals.push(parseFloat(atkGetUnits(data, atkDateKey(new Date(now.getFullYear(), now.getMonth(), i))).toFixed(1)));
      if (i <= daysInPrev)
        prevVals.push(parseFloat(atkGetUnits(data, atkDateKey(new Date(now.getFullYear(), now.getMonth() - 1, i))).toFixed(1)));
    }
  } else if (periodId === 'ytd') {
    var now = new Date();
    for (var m = 0; m <= now.getMonth(); m++) {
      labels.push(MONATE[m]);
      var dim = new Date(now.getFullYear(), m + 1, 0).getDate();
      var s = 0, ps = 0;
      for (var d = 1; d <= dim; d++) {
        s  += atkGetUnits(data, atkDateKey(new Date(now.getFullYear(), m, d)));
        ps += atkGetUnits(data, atkDateKey(new Date(now.getFullYear() - 1, m, d)));
      }
      curVals.push(parseFloat(s.toFixed(1)));
      prevVals.push(parseFloat(ps.toFixed(1)));
    }
  } else { // start
    var allKeys = Object.keys(data).sort();
    if (!allKeys.length) { labels = ['–']; curVals = [0]; }
    else {
      var mm = {};
      for (var i = 0; i < allKeys.length; i++) {
        var mk = allKeys[i].slice(0,7);
        mm[mk] = (mm[mk] || 0) + atkGetUnits(data, allKeys[i]);
      }
      var months = Object.keys(mm).sort();
      for (var i = 0; i < months.length; i++) {
        var parts = months[i].split('-');
        labels.push(MONATE[parseInt(parts[1])-1] + ' ' + parts[0].slice(2));
        curVals.push(parseFloat(mm[months[i]].toFixed(1)));
      }
    }
  }

  // Compare summary
  var compareEl = document.getElementById('atk' + design.toUpperCase() + '-compare');
  if (compareEl) {
    var curSum  = parseFloat(curVals.reduce(function(s,v){ return s+v; }, 0).toFixed(1));
    var prevSum = parseFloat(prevVals.reduce(function(s,v){ return s+v; }, 0).toFixed(1));
    var diff    = parseFloat((curSum - prevSum).toFixed(1));
    var html    = '<span><span class="atk-cmp-dot"></span> Aktuell: ' + atkFmt(curSum) + ' Einh.</span>';
    if (prevSum > 0) {
      html += '<span><span class="atk-cmp-dot prev"></span> Vorperiode: ' + atkFmt(prevSum) + ' Einh.</span>';
      html += '<span style="font-weight:700;color:' + (diff <= 0 ? '#3a9e5f' : '#e24b4a') + '">' +
        (diff === 0 ? '±0' : (diff > 0 ? '+' : '') + atkFmt(diff)) + ' Einh.</span>';
    }
    if (showTrend && trendVals.length > 1) {
      var tSlope = trendVals[trendVals.length-1] - trendVals[0];
      html += '<span><span class="atk-cmp-dot trend"></span> Trend: ' + (tSlope > 0.05 ? '↗ steigend' : tSlope < -0.05 ? '↘ fallend' : '→ stabil') + '</span>';
    }
    compareEl.innerHTML = html;
  }

  // Draw chart
  var ctx = document.getElementById('atk' + design.toUpperCase() + '-chart');
  if (!ctx) return;
  if (typeof Chart === 'undefined') {
    ctx.parentElement.innerHTML = '<div style="font-size:11px;color:var(--t3);text-align:center;padding:20px 0">Chart.js lädt…</div>';
    return;
  }
  if (_atkCharts[design]) { try { _atkCharts[design].destroy(); } catch(e){} }

  var isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  var gridColor = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)';
  var tickColor = isDark ? '#8e8e93' : '#6e6e73';
  var blue      = '#0071E3';
  var gray      = isDark ? '#636366' : '#c7c7cc';
  var chartType = labels.length > 14 ? 'line' : 'bar';

  // Trendlinie berechnen (lineare Regression) für Monat, letzt_w, ytd, start
  var showTrend = (periodId === 'monat' || periodId === 'letzt_w' || periodId === 'ytd' || periodId === 'start');
  var trendVals = [];
  if (showTrend && curVals.length > 1) {
    var n = curVals.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (var ti = 0; ti < n; ti++) { sumX += ti; sumY += curVals[ti]; sumXY += ti * curVals[ti]; sumXX += ti * ti; }
    var slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
    var intercept = (sumY - slope * sumX) / n;
    for (var ti = 0; ti < n; ti++) {
      trendVals.push(parseFloat(Math.max(0, slope * ti + intercept).toFixed(1)));
    }
  }

  var datasets = [{
    label: 'Aktuell',
    data:  curVals,
    backgroundColor: blue + '33',
    borderColor:     blue,
    borderWidth: 2,
    borderRadius: chartType === 'bar' ? 4 : 0,
    pointRadius:  chartType === 'line' ? 3 : 0,
    pointBackgroundColor: blue,
    fill:    chartType === 'line',
    tension: 0.3,
    order: 2
  }];
  if (prevVals.length) {
    datasets.push({
      label: 'Vorperiode',
      data:  prevVals.slice(0, labels.length),
      backgroundColor: gray + '33',
      borderColor:     gray,
      borderWidth: 1.5,
      borderRadius: chartType === 'bar' ? 3 : 0,
      pointRadius:  chartType === 'line' ? 2 : 0,
      fill:    false,
      tension: 0.3,
      order: 3
    });
  }
  if (trendVals.length) {
    datasets.push({
      label: 'Trend',
      data:  trendVals,
      type:  'line',
      borderColor:  '#f59e0b',
      borderWidth:  1.5,
      borderDash:   [4, 3],
      pointRadius:  0,
      fill:         false,
      tension:      0,
      order:        1
    });
  }

  _atkCharts[design] = new Chart(ctx, {
    type: chartType,
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(c){ return atkFmt(c.parsed.y || 0) + ' Einh.'; } } }
      },
      scales: {
        x: {
          ticks: { color: tickColor, font: { size: 10, family: 'Montserrat' }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
          grid:   { display: false },
          border: { display: false }
        },
        y: {
          ticks:  { color: tickColor, font: { size: 10, family: 'Montserrat' }, callback: function(v){ return atkFmt(v) + ' Einh.'; } },
          grid:   { color: gridColor },
          border: { display: false },
          min: 0
        }
      }
    }
  });
}

/* ── INIT ── */
function atkInit() {
  localStorage.removeItem('atkData_v1');
  localStorage.removeItem('atkRecords_v1');
  var entryDate = document.getElementById('atkEntryDate');
  if (entryDate) { entryDate.value = atkToday(); entryDate.max = atkToday(); }
  atkRenderAll();
  // Desktop: render graph inline immediately
  if (window.innerWidth > 600) {
    atkRenderGraph('a', _atkCurrentPeriod['a'] || 'today');
  }
  atkPullCloud(function() {
    atkRenderAll();
    if (window.innerWidth > 600) {
      atkRenderGraph('a', _atkCurrentPeriod['a'] || 'today');
    }
  });
}

window.addEventListener('hub-auth-change', function(){
  atkPullCloud(function(){ atkRenderAll(); });
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', atkInit);
} else {
  setTimeout(atkInit, 0);
}
