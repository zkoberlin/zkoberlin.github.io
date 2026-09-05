const today = new Date();

const MN = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DN = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const WD = ["Mo","Di","Mi","Do","Fr","Sa","So"];

// ── ALLE TERMINE APRIL – DEZEMBER 2026 ──────────────────────────────
const SE = {};


// ── HELPERS ──────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2,'0'); }
function dk(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function kw(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-ys)/86400000)+1)/7);
}
function fmtDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  const dow = new Date(y,m-1,d).getDay();
  const di = dow===0?6:dow-1;
  return `${DN[di]}, ${d}. ${MN[m-1]} ${y}`;
}

// ── RENDER ───────────────────────────────────────────────────────────
function buildMonth(year, month) {
  const fl = new Date(year,month,1), ll = new Date(year,month+1,0);
  let dow = fl.getDay(); if(dow===0) dow=7; dow--;

  const card = document.createElement('div');
  card.className = 'mc';
  card.id = `m-${year}-${month}`;

  // Sticky bar with month name + weekdays
  const stickyBar = document.createElement('div');
  stickyBar.className = 'sticky-bar';
  const stickyMonth = document.createElement('div');
  stickyMonth.className = 'sticky-bar-month';
  stickyMonth.textContent = `${MN[month]} ${year}`;
  const stickyDays = document.createElement('div');
  stickyDays.className = 'sticky-bar-days';
  stickyDays.innerHTML = '<span></span>' + WD.map((d,i)=>`<span class="${i>=5?'we':''}">${d}</span>`).join('');
  stickyBar.appendChild(stickyMonth);
  stickyBar.appendChild(stickyDays);
  card.appendChild(stickyBar);

  const grid = document.createElement('div');
  grid.className = 'cg';
  // Only show days from start of current week onwards
  const now2 = new Date();
  const nowDow = now2.getDay() === 0 ? 6 : now2.getDay() - 1;
  const weekMon = new Date(now2);
  weekMon.setDate(now2.getDate() - nowDow);
  weekMon.setHours(0,0,0,0);

  let day=1, wk=0;

  while(day <= ll.getDate()) {
    // Calculate the last day of this grid row
    let lastDayInRow;
    if(wk === 0) {
      // First row: starts at day 1, ends at day (7 - dow)
      lastDayInRow = 7 - dow;
    } else {
      lastDayInRow = day + 6;
    }
    const rowEndDate = new Date(year, month, Math.min(lastDayInRow, ll.getDate()));
    
    if(rowEndDate < weekMon) {
      // Entire row is in the past — skip
      if(wk === 0) {
        day = 7 - dow + 1;
      } else {
        day += 7;
      }
      wk++;
      continue;
    }

    const row = document.createElement('div');
    row.className = 'wr';
    const cur = new Date(year, month, day);
    const kwDiv = document.createElement('div');
    kwDiv.className = 'kw';
    kwDiv.textContent = kw(cur);
    row.appendChild(kwDiv);

    for(let col=0; col<7; col++) {
      const cell = document.createElement('div');
      if((wk===0 && col<dow) || day>ll.getDate()) {
        cell.className = 'day empty';
        row.appendChild(cell);
        continue;
      }
      const key = dk(year, month, day);
      const cd = new Date(year, month, day);
      const isPast = cd < weekMon;
      const isToday = year===today.getFullYear() && month===today.getMonth() && day===today.getDate();
      const isWE = col >= 5;

      cell.className = 'day' + (isToday?' today':'') + (isWE?' weekend':'') + (isPast?' past':'');
      cell.dataset.key = key;

      const num = document.createElement('span');
      num.className = 'dn';
      num.textContent = day;
      cell.appendChild(num);

      const evs = sortEvents(SE[key] || []);
      evs.slice(0,3).forEach(ev => {
        const e = document.createElement('span');
        e.className = `evt ${ev.c}`;
        const timePrefix = ev.startTime ? ev.startTime + ' ' : '';
        const cleanTitle = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '');
        e.textContent = timePrefix + cleanTitle;
        e.title = ev.t;
        e.onclick = (evt) => { evt.stopPropagation(); openEvtModal(ev, key); };
        e.style.cursor = 'pointer';
        cell.appendChild(e);
      });
      if(evs.length > 3) {
        const m = document.createElement('span');
        m.className = 'evt e-bday';
        m.textContent = `+${evs.length-3} mehr`;
        cell.appendChild(m);
      }

      cell.onclick = (e) => {
        if(expandedDay) collapseDay();
        openDp(key, cell);
      };
      row.appendChild(cell);
      day++;
    }
    grid.appendChild(row);
    wk++;
  }
  card.appendChild(grid);
  return card;
}

let selectedCell = null;
let activePopupEl = null;

function closeInlinePopup() {
  if(activePopupEl) { activePopupEl.remove(); activePopupEl = null; }
  if(selectedCell) { selectedCell.style.outline = ''; selectedCell.style.outlineOffset = ''; selectedCell = null; }
}

function openDp(key, cellEl) {
  closeInlinePopup();
  const clickedCell = cellEl || document.querySelector(`.day[data-key="${key}"]`);
  if(clickedCell) {
    document.querySelectorAll('.day').forEach(d => { d.style.outline = ''; d.style.outlineOffset = ''; });
    clickedCell.style.outline = '2.5px solid var(--blue)';
    clickedCell.style.outlineOffset = '2px';
    selectedCell = clickedCell;
  }

  const colorMap = {
    'e-kids':'#1a56db','e-dani':'#6b7280','e-schwerin':'#f97316',
    'e-maja':'#db2777','e-trip':'#059669',
    'e-hellomed':'#8099E8','e-kidev':'#dc2626','e-bday':'#9ca3af','e-sport':'#0ea5e9',
    'e-feier':'#713f12','e-union':'#b91c1c','e-sport':'#0ea5e9','e-konzert':'#16a34a','e-haus':'#00a0e3'
  };
  const evs = sortEvents(SE[key] || []);
  const visible = evs.filter(ev => !ev.c?.includes('hidden'));

  let evHtml = visible.length ? '' : '<div style="font-size:12px;color:var(--text3);padding:4px 0">Keine Termine.</div>';
  visible.forEach((ev, i) => {
    const color = colorMap[ev.c] || '#aeaeb2';
    const time = ev.startTime || (ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
    const title = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim();
    const timeRange = time ? (ev.endTime && ev.endTime !== time ? time + ' – ' + ev.endTime + ' Uhr' : time + ' Uhr') : null;
    const timeHtml = timeRange ? `<div class="et">${timeRange}${ev.location ? ' · '+ev.location : ''}</div>` : (ev.location ? `<div class="et">${ev.location}</div>` : '');
    const badges = [];
    if(ev.fromIcal) badges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
    if(ev.fromSheet) badges.push('<span class="src-badge" style="color:#a78bfa">● Kids Sheet</span>');
    if(ev.fromApi) badges.push('<span class="src-badge" style="color:#f59e0b">● API</span>');
    evHtml += `<div class="eli dp-eli" data-i="${i}" style="cursor:pointer">
      <div class="eli-dot" style="background:${color}"></div>
      <div class="evt-info"><div class="en">${title}${badges.join('')}</div>${timeHtml}</div>
    </div>`;
  });

  const popup = document.createElement('div');
  popup.className = 'dp-popup';
  popup.innerHTML = `
    <div class="dp-popup-head">
      <span class="dp-popup-title">${fmtDate(key)}</span>
      <button class="dp-popup-close" onclick="closeInlinePopup()">✕</button>
    </div>
    <div class="dp-popup-body">${evHtml}</div>`;

  // Insert after the clicked cell's row
  const row = clickedCell?.closest('.wr');
  if(row) {
    row.insertAdjacentElement('afterend', popup);
  } else {
    document.getElementById('cal').prepend(popup);
  }
  activePopupEl = popup;

  // Attach click handlers
  visible.forEach((ev, i) => {
    popup.querySelector(`.dp-eli[data-i="${i}"]`)?.addEventListener('click', () => openEvtModal(ev, key));
  });

  // Scroll: bring the popup fully into view just below the header
  setTimeout(() => {
    const headerH = document.querySelector('.header')?.offsetHeight || 120;
    const popupTop = popup.getBoundingClientRect().top + window.pageYOffset;
    const targetY = popupTop - headerH - 8;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  }, 30);
}

function closeDp() {
  closeInlinePopup();
  document.getElementById('dp').classList.remove('on');
}

function scrollToToday() {
  closeInlinePopup();
  resetFilter();
  viewOffset = 0;
  renderView();
  // After render, scroll to today cell if in monat view
  if(currentView === 'monat' || currentView === 'woche' || currentView === 'alle') {
    setTimeout(() => {
      const cell = document.querySelector('.day.today');
      if(cell) {
        const headerH = document.querySelector('.header')?.offsetHeight || 120;
        const top = cell.getBoundingClientRect().top + window.scrollY - headerH - 20;
        window.scrollTo({ top: Math.max(0,top), behavior: 'smooth' });
        setTimeout(() => { cell.classList.add('wobble'); setTimeout(()=>cell.classList.remove('wobble'),600); }, 200);
      }
    }, 80);
  }
}

// Render months from current week onwards
function renderAll() {
  const now = new Date();
  const hdEl = document.getElementById('headerDate');
  if(hdEl) hdEl.innerHTML = `${DN[(now.getDay()||7)-1]}, ${now.getDate()}. ${MN[now.getMonth()]} ${now.getFullYear()} <span class="version-badge version-badge-mobile" data-app-version>v${window.PAUL_APP_VERSION||'6.36.3'}</span>`;
  initViewUI();
  updateViewBtns();
  renderView();
}

// Init: show mobile btn row on small screens, desktop view switcher on large
function initViewUI() {
  const isMobile = window.innerWidth <= 600;
  const mobileRow = document.getElementById('mobileBtnRow');
  const desktopSwitcher = document.getElementById('viewSwitcher');
  const headerRight = document.querySelector('.header-right');
  if(isMobile) {
    if(mobileRow) mobileRow.style.display = 'flex';
    if(desktopSwitcher) desktopSwitcher.style.display = 'none';
    headerRight?.querySelectorAll('.today-btn').forEach(b => b.style.display = 'none');
  } else {
    if(mobileRow) mobileRow.style.display = 'none';
    if(desktopSwitcher) desktopSwitcher.style.display = 'inline-flex';
    headerRight?.querySelectorAll('.today-btn').forEach(b => b.style.display = '');
  }
}
window.addEventListener('resize', initViewUI, {passive:true});

// ── VIEW SWITCHER ────────────────────────────────────────────────────
let currentView = 'tag';
// Navigation offsets (days offset for tag, weeks for woche, months for monat)
let viewOffset = 0;

const colorMap = {
  'e-kids':'#1a56db','e-dani':'#6b7280','e-schwerin':'#f97316',
  'e-maja':'#db2777','e-trip':'#059669',
  'e-hellomed':'#8099E8','e-kidev':'#dc2626','e-bday':'#9ca3af','e-sport':'#0ea5e9',
  'e-feier':'#713f12','e-union':'#b91c1c','e-konzert':'#16a34a','e-haus':'#00a0e3'
};

function resetFilter() {
  activeFilter = null;
  document.querySelectorAll('.fgi-tile').forEach(t => t.classList.remove('active'));
  document.getElementById('filterSheetBtn')?.classList.remove('filter-active');
  clearFilterResults();
}

function setView(v) {
  currentView = v;
  viewOffset = 0;
  updateViewBtns();
  closeInlinePopup();
  resetFilter();
  renderView();
}

function navView(dir) {
  viewOffset += dir;
  closeInlinePopup();
  renderView();
}

function updateViewBtns() {
  ['Tag','Woche','Monat','Alle'].forEach(n => {
    ['vb'+n, 'vb'+n+'M'].forEach(id => {
      const btn = document.getElementById(id);
      if(btn) btn.classList.toggle('active', n.toLowerCase() === currentView);
    });
  });
}


// ── AKTIVE + VERGANGENE TERMINE MARKIEREN ────────────────────────────
function markActiveEvent() {
  const now = new Date();
  const todayKey = dk(now.getFullYear(), now.getMonth(), now.getDate());
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Reset all state
  document.querySelectorAll('#cal .eli').forEach(el => {
    el.classList.remove('evt-active', 'evt-past', 'evt-past-hidden');
  });
  document.querySelectorAll('#cal .woche-day-card').forEach(card => {
    card.classList.remove('day-all-past');
  });

  // Helper: parse endMin for an event
  function getEndMin(ev) {
    const timeStr = ev.startTime || (ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const startMin = h * 60 + m;
    if (ev.endTime) {
      return parseInt(ev.endTime.split(':')[0]) * 60 + parseInt(ev.endTime.split(':')[1]);
    }
    return startMin + 60;
  }

  // Helper: ist ein Termin ganztägig (kein startTime, keine Uhrzeit im Titel)?
  function isAllDay(ev) {
    return !ev.startTime && !ev.t.match(/\d{1,2}:\d{2}/);
  }

  // ── TAG-ANSICHT ──────────────────────────────────────────────────
  if (currentView === 'tag') {
    // Only act on today (viewOffset === 0)
    if (viewOffset !== 0) return;

    const allEvs = SE[todayKey] || [];
    // Nur getimte Termine für die past-Prüfung
    const timedEvs = allEvs.filter(ev => !isAllDay(ev));

    // Check: sind ALLE getimten Termine vorbei?
    const allDone = timedEvs.length > 0 && timedEvs.every(ev => {
      const endMin = getEndMin(ev);
      return endMin !== null && nowMin >= endMin;
    });

    document.querySelectorAll('#cal .eli').forEach(el => {
      // Ganztägige Termine: immer sichtbar, nie markieren
      const enText = el.querySelector('.en')?.textContent || '';
      const matchedAllDay = allEvs.find(ev => {
        if (!isAllDay(ev)) return false;
        const title = ev.t.trim().substring(0, 20);
        return enText.includes(title);
      });
      if (matchedAllDay) return; // ganztägig → unberührt lassen

      if (allDone) {
        el.classList.add('evt-past-hidden');
        return;
      }
      // Getimte Termine: active/past markieren
      for (const ev of timedEvs) {
        const [h, m] = (ev.startTime || ev.t.match(/(\d{1,2}:\d{2})/)[1]).split(':').map(Number);
        const startMin = h * 60 + m;
        const endMin = getEndMin(ev);
        const title = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim().substring(0, 20);
        if (!enText.includes(title)) continue;
        if (nowMin >= startMin && nowMin < endMin) {
          el.classList.add('evt-active');
        } else if (nowMin >= endMin) {
          el.classList.add('evt-past');
        }
        break;
      }
    });

  // ── WOCHE-ANSICHT ────────────────────────────────────────────────
  } else if (currentView === 'woche') {
    // Only act on the current week
    if (viewOffset !== 0) return;

    document.querySelectorAll('#cal .woche-day-card').forEach(card => {
      const key = card.dataset.key;
      if (!key) return;
      if (key !== todayKey) return; // nur heute markieren

      const allEvs = SE[key] || [];
      const timedEvs = allEvs.filter(ev => !isAllDay(ev));
      const elis = card.querySelectorAll('.eli');

      // Sind alle getimten Termine vorbei?
      const allDone = timedEvs.length > 0 && timedEvs.every(ev => {
        const endMin = getEndMin(ev);
        return endMin !== null && nowMin >= endMin;
      });

      elis.forEach(el => {
        const enText = el.querySelector('.en')?.textContent || '';

        // Ganztägige Termine immer sichtbar lassen
        const matchedAllDay = allEvs.find(ev => {
          if (!isAllDay(ev)) return false;
          return enText.includes(ev.t.trim().substring(0, 20));
        });
        if (matchedAllDay) return;

        if (allDone) {
          el.classList.add('evt-past-hidden');
          return;
        }
        // Getimte Termine: active/past
        for (const ev of timedEvs) {
          const timeStr = ev.startTime || (ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
          if (!timeStr) continue;
          const [h, m] = timeStr.split(':').map(Number);
          const startMin = h * 60 + m;
          const endMin = getEndMin(ev);
          const title = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim().substring(0, 20);
          if (!enText.includes(title)) continue;
          if (nowMin >= startMin && nowMin < endMin) {
            el.classList.add('evt-active');
          } else if (nowMin >= endMin) {
            el.classList.add('evt-past');
          }
          break;
        }
      });

      // Card nur verstecken wenn alle getimten Termine vorbei UND keine ganztägigen da
      const hasAllDay = allEvs.some(ev => isAllDay(ev));
      if (allDone && !hasAllDay) {
        card.classList.add('day-all-past');
      }
    });
  }
}
// Alle 60s aktualisieren
setInterval(() => {
  if (currentView === 'tag' || currentView === 'woche') markActiveEvent();
}, 60000);

function renderView() {
  const cal = document.getElementById('cal');
  cal.innerHTML = '';
  const base = new Date();

  if(currentView === 'tag') {
    renderTagView(cal, base);
  } else if(currentView === 'woche') {
    renderWocheView(cal, base);
  } else if(currentView === 'monat') {
    renderMonatView(cal, base);
  } else {
    renderAlleView(cal, base);
  }
  // Re-measure header after render (mobile btn-row may change height)
  setTimeout(updateHeaderVar, 0);
  if (currentView === 'tag' || currentView === 'woche') requestAnimationFrame(markActiveEvent);
}

// ── TAG-ANSICHT ──────────────────────────────────────────────────────
function renderTagView(cal, base) {
  const d = new Date(base);
  d.setDate(d.getDate() + viewOffset);
  const key = dk(d.getFullYear(), d.getMonth(), d.getDate());
  const isToday = viewOffset === 0;

  // Nav bar
  const nav = document.createElement('div');
  nav.className = 'view-nav';
  nav.innerHTML = `
    <button class="view-nav-btn" onclick="navView(-1)">‹</button>
    <div class="view-nav-title">${isToday ? 'Heute · ' : ''}${DN[(d.getDay()||7)-1]}, ${d.getDate()}. ${MN[d.getMonth()]} ${d.getFullYear()}</div>
    <button class="view-nav-btn" onclick="navView(1)">›</button>`;
  cal.appendChild(nav);

  // Events container
  const popup = document.createElement('div');
  popup.className = 'dp-popup';
  popup.style.margin = '0 0 6px';

  const head = document.createElement('div');
  head.className = 'dp-popup-head';
  head.innerHTML = `<span class="dp-popup-title">${fmtDate(key)}</span>`;
  popup.appendChild(head);

  const body = document.createElement('div');
  body.className = 'dp-popup-body';

  let evs = [];
  try { evs = sortEvents(SE[key] || []).filter(ev => !ev.c?.includes('hidden')); } catch(e) { evs = []; }

  if(!evs.length) {
    body.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:6px 0">Keine Termine für diesen Tag.</div>';
  } else {
    evs.forEach(ev => {
      try {
        const color = colorMap[ev.c] || '#aeaeb2';
        const time = ev.startTime || (ev.t && ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
        const title = ev.t ? ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim() : '—';
        const timeRange = time ? (ev.endTime && ev.endTime !== time ? time + ' – ' + ev.endTime + ' Uhr' : time + ' Uhr') : null;
        const locStr = ev.location ? ev.location.replace(/\\/g,'') : '';
        const timeHtml = timeRange
          ? `<div class="et">${timeRange}${locStr ? ' · ' + locStr : ''}</div>`
          : (locStr ? `<div class="et">${locStr}</div>` : '');
        const badges = [];
        if(ev.fromIcal)  badges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
        if(ev.fromSheet) badges.push('<span class="src-badge" style="color:#a78bfa">● Kids Sheet</span>');
        if(ev.fromApi)   badges.push('<span class="src-badge" style="color:#f59e0b">● API</span>');
        const el = document.createElement('div');
        el.className = 'eli';
        el.style.cursor = 'pointer';
        el.innerHTML = `<div class="eli-dot" style="background:${color}"></div>
          <div class="evt-info">
            <div class="en">${title}${badges.join('')}</div>
            ${timeHtml}
          </div>
          ${makeCatLabel(ev.c)}`;
        el.addEventListener('click', () => openEvtModal(ev, key));
        body.appendChild(el);
      } catch(err) {
        console.warn('renderTagView event error:', err, ev);
      }
    });
  }

  popup.appendChild(body);
  cal.appendChild(popup);
}


// ── WOCHE-ANSICHT ────────────────────────────────────────────────────
function renderWocheView(cal, base) {
  const now = new Date(base);
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekMon = new Date(now);
  weekMon.setDate(now.getDate() - dow + viewOffset * 7);
  weekMon.setHours(0,0,0,0);

  const weekSun = new Date(weekMon); weekSun.setDate(weekMon.getDate() + 6);
  const isCurrentWeek = viewOffset === 0;

  // Nav bar
  const nav = document.createElement('div');
  nav.className = 'view-nav';
  const monStr = `${weekMon.getDate()}. ${MN[weekMon.getMonth()]}`;
  const sunStr = `${weekSun.getDate()}. ${MN[weekSun.getMonth()]}`;
  nav.innerHTML = `
    <button class="view-nav-btn" onclick="navView(-1)">‹</button>
    <div class="view-nav-title">${isCurrentWeek?'Diese Woche · ':''}KW ${kw(weekMon)} · ${monStr} – ${sunStr}</div>
    <button class="view-nav-btn" onclick="navView(1)">›</button>`;
  cal.appendChild(nav);

  const colorMapW = {
    'e-kids':'#1a56db','e-dani':'#6b7280','e-schwerin':'#f97316',
    'e-maja':'#db2777','e-trip':'#059669','e-hellomed':'#8099E8',
    'e-kidev':'#dc2626','e-bday':'#9ca3af','e-sport':'#0ea5e9','e-feier':'#713f12',
    'e-union':'#b91c1c','e-konzert':'#16a34a','e-haus':'#00a0e3'
  };

  // Vertical list of day cards
  const list = document.createElement('div');
  list.className = 'woche-list';

  for(let i = 0; i < 7; i++) {
    const d = new Date(weekMon); d.setDate(weekMon.getDate() + i);
    const key = dk(d.getFullYear(), d.getMonth(), d.getDate());
    const isToday = d.toDateString() === base.toDateString();
    const isWE = i >= 5;
    const today0 = new Date(base); today0.setHours(0,0,0,0);
    const isPast = d < today0;

    // In der aktuellen Woche: vergangene Tage ohne Termine ausblenden
    if(isPast && isCurrentWeek) continue;
    const evs = sortEvents(SE[key] || []).filter(ev => !ev.c?.includes('hidden'));

    // Day card
    const card = document.createElement('div');
    card.className = 'woche-day-card' + (isToday ? ' woche-today' : '') + (isWE ? ' woche-weekend' : '');
    card.dataset.key = key;

    // Header: "Heute · Sonntag, 10. Mai 2026"
    const dayName = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'][i];
    const dateStr = `${d.getDate()}. ${MN[d.getMonth()]} ${d.getFullYear()}`;
    const prefix = isToday ? 'Heute · ' : '';

    const head = document.createElement('div');
    head.className = 'woche-day-head';
    head.innerHTML = `<span class="woche-day-title">${prefix}${dayName}, ${dateStr}</span>`;
    card.appendChild(head);

    // Events — identisch zur Tag-Ansicht (eli/en/et/eli-dot)
    const body = document.createElement('div');
    body.className = 'woche-day-body';

    if(!evs.length) {
      body.innerHTML = '<div class="woche-empty">Keine Termine.</div>';
    } else {
      evs.forEach(ev => {
        const color = colorMapW[ev.c] || '#aeaeb2';
        const time = ev.startTime || (ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
        const title = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim();
        const badges = [];
        if(ev.fromIcal) badges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
        if(ev.fromSheet) badges.push('<span class="src-badge" style="color:#a78bfa">● Kids Sheet</span>');
        if(ev.fromApi) badges.push('<span class="src-badge" style="color:#f59e0b">● API</span>');
        const timeRange = time ? (ev.endTime && ev.endTime !== time ? time + ' – ' + ev.endTime + ' Uhr' : time + ' Uhr') : null;
        const timeHtml = timeRange
          ? `<div class="et">${timeRange}${ev.location ? ' · '+ev.location.replace(/\\/g,'') : ''}</div>`
          : (ev.location ? `<div class="et">${ev.location.replace(/\\/g,'')}</div>` : '');

        const item = document.createElement('div');
        item.className = 'eli';
        item.style.cursor = 'pointer';
        item.style.marginBottom = '0';
        item.style.borderRadius = '0';
        item.innerHTML = `
          <div class="eli-dot" style="background:${color}"></div>
          <div class="evt-info">
            <div class="en">${title}${badges.join('')}</div>
            ${timeHtml}
          </div>
          ${makeCatLabel(ev.c)}`;
        item.addEventListener('click', () => openEvtModal(ev, key));
        body.appendChild(item);
      });
    }
    card.appendChild(body);
    list.appendChild(card);
  }

  cal.appendChild(list);
}

// Opens the day popup after the week grid element
function openDpBelowGrid(key, gridEl) {
  // Remove existing popup after grid
  const existing = gridEl.nextElementSibling;
  if(existing && existing.classList.contains('dp-popup')) existing.remove();

  const colorMap2 = {
    'e-kids':'#1a56db','e-dani':'#6b7280','e-schwerin':'#f97316',
    'e-maja':'#db2777','e-trip':'#059669',
    'e-hellomed':'#8099E8','e-kidev':'#dc2626','e-bday':'#9ca3af','e-sport':'#0ea5e9',
    'e-feier':'#713f12','e-union':'#b91c1c','e-konzert':'#16a34a','e-haus':'#00a0e3'
  };
  const evs = sortEvents(SE[key] || []).filter(ev => !ev.c?.includes('hidden'));

  let evHtml = evs.length ? '' : '<div style="font-size:12px;color:var(--text3);padding:4px 0">Keine Termine.</div>';
  evs.forEach((ev, i) => {
    const color = colorMap2[ev.c] || '#aeaeb2';
    const time = ev.startTime || (ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
      const timeRange = time ? (ev.endTime && ev.endTime !== time ? time + ' – ' + ev.endTime + ' Uhr' : time + ' Uhr') : null;
    const title = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim();
    const timeHtml = timeRange ? `<div class="et">${timeRange}${ev.location ? ' · '+ev.location.replace(/\\/g,'') : ''}</div>` : (ev.location ? `<div class="et">${ev.location.replace(/\\/g,'')}</div>` : '');
    const badges = [];
    if(ev.fromIcal) badges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
    if(ev.fromSheet) badges.push('<span class="src-badge" style="color:#a78bfa">● Kids Sheet</span>');
    if(ev.fromApi) badges.push('<span class="src-badge" style="color:#f59e0b">● API</span>');
    evHtml += `<div class="eli dp-eli" data-i="${i}" style="cursor:pointer">
      <div class="eli-dot" style="background:${color}"></div>
      <div class="evt-info"><div class="en">${title}${badges.join('')}</div>${timeHtml}</div>
    </div>`;
  });

  const popup = document.createElement('div');
  popup.className = 'dp-popup';
  popup.style.margin = '4px 0 6px';
  popup.innerHTML = `
    <div class="dp-popup-head">
      <span class="dp-popup-title">${fmtDate(key)}</span>
      <button class="dp-popup-close" onclick="this.closest('.dp-popup').remove();document.querySelectorAll('.week-header-day').forEach(h=>h.style.background='')">✕</button>
    </div>
    <div class="dp-popup-body">${evHtml}</div>`;

  gridEl.insertAdjacentElement('afterend', popup);
  activePopupEl = popup;

  evs.forEach((ev, i) => {
    popup.querySelector(`.dp-eli[data-i="${i}"]`)?.addEventListener('click', () => openEvtModal(ev, key));
  });

  setTimeout(() => {
    const headerH = document.querySelector('.header')?.offsetHeight || 120;
    const top = popup.getBoundingClientRect().top + window.pageYOffset - headerH - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, 30);
}

// ── MONAT-ANSICHT ────────────────────────────────────────────────────
function renderMonatView(cal, base) {
  const targetMonth = base.getMonth() + viewOffset;
  const year = base.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const isCurrentMonth = viewOffset === 0;

  // Nav bar
  const nav = document.createElement('div');
  nav.className = 'view-nav';
  nav.innerHTML = `
    <button class="view-nav-btn" onclick="navView(-1)">‹</button>
    <div class="view-nav-title">${isCurrentMonth?'Aktueller Monat · ':''}${MN[month]} ${year}</div>
    <button class="view-nav-btn" onclick="navView(1)">›</button>`;
  cal.appendChild(nav);

  // Build single month (all weeks, no skipping past)
  cal.appendChild(buildMonthFull(year, month, base));
}

// buildMonth variant that shows ALL weeks (not just from current week)
function buildMonthFull(year, month, baseDate) {
  const fl = new Date(year,month,1), ll = new Date(year,month+1,0);
  let dow = fl.getDay(); if(dow===0) dow=7; dow--;

  const card = document.createElement('div');
  card.className = 'mc';

  const stickyBar = document.createElement('div');
  stickyBar.className = 'sticky-bar';
  const stickyMonth = document.createElement('div');
  stickyMonth.className = 'sticky-bar-month';
  stickyMonth.textContent = `${MN[month]} ${year}`;
  const stickyDays = document.createElement('div');
  stickyDays.className = 'sticky-bar-days';
  stickyDays.innerHTML = '<span></span>' + WD.map((d,i)=>`<span class="${i>=5?'we':''}">${d}</span>`).join('');
  stickyBar.appendChild(stickyMonth);
  stickyBar.appendChild(stickyDays);
  card.appendChild(stickyBar);

  const grid = document.createElement('div');
  grid.className = 'cg';

  let day=1, wk=0;
  while(day <= ll.getDate()) {
    const row = document.createElement('div');
    row.className = 'wr';
    const cur = new Date(year, month, day);
    const kwDiv = document.createElement('div');
    kwDiv.className = 'kw';
    kwDiv.textContent = kw(cur);
    row.appendChild(kwDiv);

    for(let col=0; col<7; col++) {
      const cell = document.createElement('div');
      if((wk===0 && col<dow) || day>ll.getDate()) {
        cell.className = 'day empty'; row.appendChild(cell); continue;
      }
      const key = dk(year, month, day);
      const cd = new Date(year, month, day);
      const isToday = cd.toDateString() === baseDate.toDateString();
      const isWE = col >= 5;
      const isPast = cd < new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

      cell.className = 'day' + (isToday?' today':'') + (isWE?' weekend':'') + (isPast?' past':'');
      cell.dataset.key = key;

      const num = document.createElement('span');
      num.className = 'dn'; num.textContent = day;
      cell.appendChild(num);

      sortEvents(SE[key]||[]).slice(0,3).forEach(ev => {
        const e = document.createElement('span');
        e.className = `evt ${ev.c}`;
        e.textContent = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '');
        e.onclick = (evt) => { evt.stopPropagation(); openEvtModal(ev, key); };
        cell.appendChild(e);
      });
      if((SE[key]||[]).length > 3) {
        const m = document.createElement('span');
        m.className = 'evt e-bday';
        m.textContent = `+${SE[key].length-3} mehr`;
        cell.appendChild(m);
      }
      cell.onclick = (e) => { if(expandedDay) collapseDay(); openDp(key, cell); };
      row.appendChild(cell);
      day++;
    }
    grid.appendChild(row);
    wk++;
  }
  card.appendChild(grid);
  return card;
}

// ── ALLE-ANSICHT (original: alle Monate ab heute) ────────────────────
function renderAlleView(cal, base) {
  const dow = base.getDay() === 0 ? 6 : base.getDay() - 1;
  const weekStart = new Date(base);
  weekStart.setDate(base.getDate() - dow);
  weekStart.setHours(0,0,0,0);
  let startMonth = weekStart.getMonth();
  const startYear = weekStart.getFullYear();
  const lastDayOfStartMonth = new Date(startYear, startMonth + 1, 0);
  if(lastDayOfStartMonth < weekStart) startMonth++;
  for(let m = startMonth; m <= 11; m++) cal.appendChild(buildMonth(startYear, m));
  setTimeout(() => {
    const cell = document.querySelector('.day.today');
    if(cell) {
      const headerH = document.querySelector('.header')?.offsetHeight || 120;
      const top = cell.getBoundingClientRect().top + window.scrollY - headerH - 20;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }
  }, 50);
}
let expandedDay = null;
let expandedRect = null;

function expandDay(cell, e) {
  e.stopPropagation();
  if(cell.classList.contains('expanded')) {
    collapseDay();
    return;
  }
  if(expandedDay) collapseDay();

  // Save original rect for collapse animation
  expandedRect = cell.getBoundingClientRect();
  expandedDay = cell;

  // Position expanded cell centered on screen
  const w = Math.min(280, window.innerWidth - 32);
  const h = 'auto';
  const left = Math.max(16, (window.innerWidth - w) / 2);
  const top = Math.max(80, (window.innerHeight - 300) / 2);

  cell.style.width = w + 'px';
  cell.style.left = left + 'px';
  cell.style.top = top + 'px';
  cell.classList.add('expanded');
  document.getElementById('dayOverlay').classList.add('on');
}

// ── EVENT DETAIL MODAL ───────────────────────────────────────────────
const catColorMap = {
  'e-kids':'#1a56db','e-dani':'#9ca3af','e-schwerin':'#f97316',
  'e-maja':'#db2777','e-trip':'#059669','e-hellomed':'#8099E8',
  'e-kidev':'#dc2626','e-bday':'#9ca3af','e-sport':'#0ea5e9','e-feier':'#713f12',
  'e-union':'#b91c1c','e-konzert':'#16a34a','e-haus':'#00a0e3'
};
const catNameMap = {
  'e-kids':'Kids bei Paul','e-dani':'Kids bei Dani','e-schwerin':'Schwerin',
  'e-maja':'Maja','e-trip':'Ausflug/Urlaub','e-hellomed':'Hellomed',
  'e-kidev':'Schule/Kids-Event','e-bday':'Geburtstag','e-feier':'Feiertag/Ferien',
  'e-union':'1. FC Union Berlin','e-konzert':'Konzert/Event','e-haus':'Besichtigung'
};

let currentEvtId = null;
let currentEvtData = null;

function openEvtModal(ev, dateKey) {
  const overlay = document.getElementById('evtModalOverlay');
  const content = document.getElementById('evtModalContent');
  currentEvtId = ev.googleId || null;
  currentEvtData = ev;
  console.log('Event clicked:', ev.t, '| googleId:', ev.googleId, '| fromIcal:', ev.fromIcal, '| fromHellomed:', ev.fromHellomed);
  // Show edit/delete only for own Gmail events that have a googleId
  const actions = document.getElementById('evtModalActions');
  if(actions) {
    const canEdit = ev.fromIcal && !ev.fromHellomed && ev.googleId;
    actions.style.display = canEdit ? 'flex' : 'none';
    console.log('canEdit:', canEdit, '| googleId:', ev.googleId, '| fromIcal:', ev.fromIcal);
  }
  const color = catColorMap[ev.c] || '#9ca3af';
  const catName = catNameMap[ev.c] || '';
  const dateStr = fmtDate(dateKey);

  // Uhrzeit: erst startTime, dann aus Titel regex, dann aus ev.t, sonst Ganztägig
  const timeMatch = ev.t.match(/(\d{1,2}:\d{2})/);
  const rawTime = ev.startTime || (timeMatch ? timeMatch[1] : null);
  const timeEnd = ev.endTime && ev.endTime !== rawTime ? ev.endTime : null;
  const time = rawTime ? (timeEnd ? rawTime + ' – ' + timeEnd + ' Uhr' : rawTime + ' Uhr') : (ev.allDay === false ? '' : 'Ganztägig');
  const showTimeRow = rawTime || ev.allDay === false;
  const cleanTitle = ev.t.replace(/^\S+\s/, '').replace(/\s*\d{1,2}:\d{2}$/, '').trim();

  content.innerHTML = `
    <div class="evt-modal-cat" style="background:${color}22;color:${color}">
      ${catName}
    </div>
    <div class="evt-modal-title">${ev.t.replace(/^\S+\s/, '')}</div>
    <div class="evt-modal-row">
      <span class="evt-modal-icon">📅</span>
      <span>${dateStr}</span>
    </div>
    <div class="evt-modal-row">
      <span class="evt-modal-icon">🕐</span>
      <span>${time || 'Ganztägig'}</span>
    </div>
    ${ev.location ? `<div class="evt-modal-row"><span class="evt-modal-icon">📍</span><span>${ev.location}</span></div>` : ''}
    ${ev.description ? `<div class="evt-modal-row"><span class="evt-modal-icon">📝</span><span>${ev.description.substring(0,200)}</span></div>` : ''}
  `;
  overlay.classList.add('on');
}

function closeEvtModal() {
  document.getElementById('evtModalOverlay').classList.remove('on');
  currentEvtId = null;
  currentEvtData = null;
}

async function deleteCurrentEvent() {
  if(!currentEvtId) {
    alert('Diese Funktion ist nur für Termine aus deinem Google Kalender verfügbar, die über iCal geladen wurden. Öffne den Termin direkt in Google Calendar um ihn zu löschen.');
    return;
  }
  if(!confirm('Termin wirklich löschen?')) return;
  
  const doDelete = async () => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/paul.bendzko%40gmail.com/events/${currentEvtId}`,
        { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + gAccessToken } }
      );
      if(res.status === 204 || res.ok) {
        const idToRemove = currentEvtId;
        Object.keys(SE).forEach(d => {
          SE[d] = (SE[d] || []).filter(e => e.googleId !== idToRemove);
        });
        closeEvtModal();
        renderAll();
                alert('✅ Termin gelöscht!');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('❌ ' + (errData.error?.message || 'Fehler ' + res.status));
      }
    } catch(err) {
      alert('❌ ' + err.message);
    }
  };
  if(isTokenValid()) doDelete();
  else requestToken(doDelete);
}

function editCurrentEvent() {
  if(!currentEvtId) {
    // Fall back to opening Google Calendar
    window.open('https://calendar.google.com', '_blank');
    return;
  }
  // Try to open in Google Calendar
  window.open(`https://calendar.google.com/calendar/r/eventedit?eid=${btoa(currentEvtId + ' paul.bendzko@gmail.com')}`, '_blank');
}

function collapseDay() {
  if(!expandedDay) return;
  expandedDay.classList.remove('expanded');
  expandedDay.style.width = '';
  expandedDay.style.left = '';
  expandedDay.style.top = '';
  expandedDay = null;
  document.getElementById('dayOverlay').classList.remove('on');
}

// ── TODAY PANEL ──────────────────────────────────────────────────────


// ── FILTER ───────────────────────────────────────────────────────────
const catLabels = {
  'e-kids':'Kids bei Paul','e-dani':'Kids bei Dani','e-schwerin':'Schwerin',
  'e-maja':'Maja','e-trip':'Ausflug/Urlaub',
  'e-hellomed':'Hellomed','e-kidev':'Schule/Kids-Event','e-sport':'Sport','e-haus':'Besichtigungen',
  'e-feier':'Feiertage & Schulferien Berlin','e-union':'1. FC Union Berlin',
  'e-konzert':'Konzerte & Events','e-bday':'Geburtstage'
};
const catColors = {
  'e-kids':'#1a56db','e-dani':'#9ca3af','e-schwerin':'#f97316',
  'e-maja':'#db2777','e-trip':'#059669',
  'e-hellomed':'#8099E8','e-kidev':'#dc2626','e-haus':'#00a0e3',
  'e-feier':'#713f12','e-union':'#b91c1c',
  'e-konzert':'#16a34a','e-bday':'#9ca3af','e-sport':'#0ea5e9'
};

let activeFilter = null;

function filterBy(cat) {
  // Toggle off
  if(activeFilter === cat) {
    activeFilter = null;
    document.querySelectorAll('.fgi-tile').forEach(t => t.classList.remove('active'));
    document.getElementById('filterSheetBtn')?.classList.remove('filter-active');
    closeFilterSheet();
    clearFilterResults();
    renderView();
    return;
  }
  activeFilter = cat;
  document.querySelectorAll('.fgi-tile').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === cat);
  });
  document.getElementById('filterSheetBtn')?.classList.add('filter-active');
  closeFilterSheet();

  // Collect matches
  const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
  const matches = [];
  Object.keys(SE).sort().filter(d => d >= todayKey).forEach(d => {
    const _sk=['sport','beat81','radtour','tour','lauf','rennen','wettkampf'];
    const evs=(SE[d]||[]).filter(ev => {
      const evCats = ev.cats || [ev.c]; // Fallback für ältere Einträge (API, Sheet)
      if(cat === 'e-sport') return evCats.includes('e-sport') || _sk.some(kw=>(ev.t||'').toLowerCase().includes(kw));
      return evCats.some(c => c === cat || c === cat+'-hidden');
    });
    if(evs.length) matches.push({key:d,evs});
  });

  showFilterResults(cat, matches);
}

function clearFilterResults() {
  const el = document.getElementById('filterResults');
  if(el) el.remove();
}

function showFilterResults(cat, matches) {
  clearFilterResults();

  const color = (typeof catColors !== 'undefined' && catColors[cat]) || '#0071E3';
  const _lm={'e-kids':'Kids Paul','e-dani':'Kids Dani','e-maja':'Maja','e-schwerin':'Schwerin','e-union':'Union Berlin','e-trip':'Ausflug/Urlaub','e-feier':'Feiertage','e-kidev':'Schule/Kids','e-hellomed':'Hellomed','e-konzert':'Konzert/Event','e-haus':'Besichtigung','e-bday':'Geburtstag','e-sport':'Sport'};
  const label = (typeof catLabels !== 'undefined' && catLabels[cat]) || _lm[cat] || cat;

  const wrap = document.createElement('div');
  wrap.id = 'filterResults';

  // ── Mehrtägige Termine zusammenfassen ────────────────────────────────
  // Gruppiere aufeinanderfolgende Tage mit identischem Terminname zu einem Eintrag
  const groups = []; // [{title, cat, startKey, endKey, ev, allDay}]
  matches.forEach(({key, evs}) => {
    evs.forEach(ev => {
      const title = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim();
      const isAllDay = !ev.startTime && !(ev.t.match(/\d{1,2}:\d{2}/));
      const last = groups[groups.length - 1];
      const prevDay = last ? new Date(new Date(last.endKey+'T12:00:00').getTime() + 86400000).toISOString().substring(0,10) : null;
      if(last && last.title === title && last.cat === ev.c && prevDay === key) {
        last.endKey = key; // Zeitraum verlängern
      } else {
        groups.push({title, cat: ev.c, startKey: key, endKey: key, ev, allDay: isAllDay});
      }
    });
  });

  // Header (nach Gruppen-Berechnung, damit Zahl korrekt ist)
  const hd = document.createElement('div');
  hd.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 0 8px;';
  const totalRaw = matches.reduce((n,m)=>n+m.evs.length,0);
  const countLabel = groups.length < totalRaw
    ? `${groups.length} Termine` // komprimiert
    : `${totalRaw} Treffer`;
  hd.innerHTML = `
    <span style="font-family:var(--font-head);font-size:14px;font-weight:600;color:var(--text);-webkit-font-smoothing:antialiased">
      <span style="color:${color}">●</span> ${label}
      <span style="font-size:11px;font-weight:500;color:var(--text3);margin-left:4px">${countLabel}</span>
    </span>
    <button onclick="closeFilter()" style="font-size:11px;color:var(--text3);background:none;border:none;cursor:pointer;font-family:var(--font-head);font-weight:500;padding:4px 8px;border-radius:6px;border:1px solid var(--border)">✕ Filter</button>
  `;
  wrap.appendChild(hd);

  if(!matches.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:13px;color:var(--text3);padding:12px 0;font-style:italic;';
    empty.textContent = 'Keine Treffer gefunden.';
    wrap.appendChild(empty);
  } else {
    groups.forEach(({title, cat, startKey, endKey, ev, allDay}) => {
      const item = document.createElement('div');
      item.className = 'eli';
      item.style.cursor = 'pointer';
      const c = colorMap[cat] || '#aeaeb2';
      const badges = [];
      if(ev.fromIcal) badges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
      if(ev.fromSheet) badges.push('<span class="src-badge" style="color:#a78bfa">● Kids Sheet</span>');
      if(ev.fromApi) badges.push('<span class="src-badge" style="color:#f59e0b">● API</span>');

      // Datumsanzeige
      let dateStr;
      if(startKey === endKey) {
        // Eintägig: Datum + Uhrzeit
        const time = ev.startTime || (ev.t.match(/(\d{1,2}:\d{2})/) ? ev.t.match(/(\d{1,2}:\d{2})/)[1] : null);
        dateStr = fmtDate(startKey) + (time ? ' · ' + time + ' Uhr' : '');
      } else {
        // Mehrtägig: komprimierte Datumsspanne  z.B. "13. Jul – 19. Jul. 2026 · Ganztägig"
        const [sy,sm,sd] = startKey.split('-').map(Number);
        const [ey,em,ed] = endKey.split('-').map(Number);
        const startFmt = `${sd}. ${MN[sm-1].substring(0,3)}.${sy !== ey ? ' '+sy : ''}`;
        const endFmt   = `${ed}. ${MN[em-1].substring(0,3)}. ${ey}`;
        dateStr = `${startFmt} – ${endFmt}` + (allDay ? ' · Ganztägig' : '');
      }

      item.innerHTML = `
        <div class="eli-dot" style="background:${c}"></div>
        <div class="evt-info" style="flex:1;min-width:0">
          <div class="en">${title}${badges.join('')}</div>
          <div class="et">${dateStr}</div>
        </div>
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style="flex-shrink:0;margin-left:6px;opacity:.35">
          <path d="M1 1l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      item.addEventListener('click', () => jumpToEvent(startKey, ev));
      wrap.appendChild(item);
    });
  }

  // Insert als erstes Element in #main
  const main = document.getElementById('main');
  main.insertAdjacentElement('afterbegin', wrap);
  wrap.style.cssText = 'width:100%;box-sizing:border-box;padding-bottom:16px;';
}

function jumpToEvent(key, ev) {
  // Tage-Offset vom heutigen Tag berechnen
  const base = new Date(); base.setHours(0,0,0,0);
  const target = new Date(key + 'T00:00:00'); target.setHours(0,0,0,0);
  const diff = Math.round((target - base) / 86400000);

  // Filter-Liste ausblenden (desktop + mobile)
  clearFilterResults();

  // In Tag-Ansicht wechseln, direkt zu diesem Tag
  currentView = 'tag';
  viewOffset = diff;
  updateViewBtns();
  closeInlinePopup();
  renderView();
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Nach Render: das spezifische Event-Element in der Liste hervorheben
  setTimeout(() => {
    const titleSnippet = ev.t.replace(/^\d{1,2}:\d{2}\s*/, '').trim().substring(0, 30);
    let highlighted = false;
    document.querySelectorAll('#cal .eli').forEach(el => {
      const enText = el.querySelector('.en')?.textContent || '';
      if(!highlighted && enText.includes(titleSnippet)) {
        el.classList.add('filter-jump-eli');
        highlighted = true;
        setTimeout(() => el.classList.remove('filter-jump-eli'), 2800);
      }
    });
  }, 120);
}

function closeFilter() {
  activeFilter = null;
  document.querySelectorAll('.fgi-tile').forEach(t => t.classList.remove('active'));
  document.getElementById('filterSheetBtn')?.classList.remove('filter-active');
  clearFilterResults();
  renderView();
}


function toggleFilterPanel() {} // legacy

function openFilterSheet() {
  const sheet = document.getElementById('filterSheet');
  const backdrop = document.getElementById('filterBackdrop');
  // Toggle: bereits offen → schließen
  if(sheet.classList.contains('on')) { closeFilterSheet(); return; }
  // Sync counts in both grids (desktop + sheet) via zentraler Funktion
  hideEmptyFilters();
  // Sync active tiles in sheet
  sheet.querySelectorAll('.fgi-tile').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === activeFilter);
  });
  sheet.classList.add('on');
  backdrop.classList.add('on');
  document.body.style.overflow = 'hidden';

  // Swipe-down to close
  const handle = document.getElementById('filterSheetHandle');
  let startY = 0, curY = 0;
  const onStart = e => { startY = (e.touches?.[0] || e).clientY; curY = 0; };
  const onMove = e => {
    curY = (e.touches?.[0] || e).clientY - startY;
    if(curY > 0) { sheet.style.transform = `translateY(${curY}px)`; e.preventDefault(); }
  };
  const onEnd = () => {
    sheet.style.transform = '';
    if(curY > 80) closeFilterSheet();
    sheet.removeEventListener('touchstart', onStart);
    sheet.removeEventListener('touchmove', onMove);
    sheet.removeEventListener('touchend', onEnd);
  };
  sheet.addEventListener('touchstart', onStart, {passive:true});
  sheet.addEventListener('touchmove', onMove, {passive:false});
  sheet.addEventListener('touchend', onEnd);
}

function closeFilterSheet() {
  document.getElementById('filterSheet').classList.remove('on');
  document.getElementById('filterBackdrop').classList.remove('on');
  document.body.style.overflow = '';
}

function countUniqueEvents(cat) {
  const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
  const futureDates = Object.keys(SE).filter(d => d >= todayKey).sort();
  const _sk = ['sport','beat81','radtour','tour','lauf','rennen','wettkampf'];
  // Zähle Tage (nicht unique Titel) – ein Tag mit mind. 1 passendem Event = 1
  let dayCount = 0;
  for(const d of futureDates) {
    const evs = SE[d] || [];
    const hasMatch = evs.some(ev => {
      const evCats = ev.cats || [ev.c];
      if(cat === 'e-sport') {
        const tt = (ev.t||'').toLowerCase();
        return evCats.includes('e-sport') || _sk.some(kw => tt.includes(kw));
      }
      return evCats.some(c => c === cat || c === cat+'-hidden');
    });
    if(hasMatch) dayCount++;
  }
  return dayCount;
}

function hideEmptyFilters() {
  // Counts in inline grid aktualisieren + leere ausblenden
  document.querySelectorAll('.fgi-tile[data-cat]').forEach(tile => {
    const cat = tile.dataset.cat;
    const count = countUniqueEvents(cat);
    const countEl = tile.querySelector('.fgi-count');
    if(countEl) countEl.textContent = count > 0 ? count : '';
    tile.style.display = count > 0 ? '' : 'none';
  });
}

function searchCalendar(query) {
  document.querySelectorAll('.day.search-match').forEach(d => d.classList.remove('search-match'));
  const clearBtn = document.getElementById('searchClear');
  const countEl = document.getElementById('searchCount');

  if(!query || query.trim().length < 2) {
    clearBtn.style.display = 'none';
    countEl.textContent = '';
    return;
  }

  clearBtn.style.display = 'block';
  
  // Support multi-word search (all words must match)
  const words = query.toLowerCase().trim().split(' ').filter(w => w.length > 0);
  const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
  let matches = 0;
  let firstMatch = null;
  
  Object.keys(SE).sort().forEach(key => {
    if(key < todayKey) return; // skip past
    const evs = SE[key] || [];
    const text = evs.map(ev => ev.t).join(' ').toLowerCase();
    const matched = words.every(w => text.includes(w));
    if(matched) {
      const cell = document.querySelector(`.day[data-key="${key}"]`);
      if(cell) {
        cell.classList.add('search-match');
        matches++;
        if(!firstMatch) firstMatch = cell;
      }
    }
  });
  
  countEl.textContent = matches > 0 ? `${matches} Treffer` : 'Kein Treffer';
  countEl.style.color = matches > 0 ? 'var(--blue)' : 'var(--red)';
  
  if(firstMatch) {
    const header = document.querySelector('.header');
    const headerH = header ? header.offsetHeight : 160;
    const cellTop = firstMatch.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: cellTop - headerH - 16, behavior: 'smooth' });
  }
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  document.getElementById('searchCount').textContent = '';
  document.querySelectorAll('.day.search-match').forEach(d => d.classList.remove('search-match'));
}

// ── iCAL CONFIGURATION ───────────────────────────────────────────────
const ICAL_SOURCES = [
  {
    endpoint: 'https://paul-gateway-v2.paul-bendzko.workers.dev/feeds/gmail',
    source: 'gmail',
  },
  {
    endpoint: 'https://paul-gateway-v2.paul-bendzko.workers.dev/feeds/hellomed',
    source: 'hellomed',
  },
];

// ── iCAL PARSER ──────────────────────────────────────────────────────
function extractTime(title) {
  // Extract HH:MM from title like "Meeting 09:30" or "09:30 Meeting"
  const m = title.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}

// ── KATEGORIE-LABEL HELPER ───────────────────────────────────────────
const _catLabelShort = {
  'e-kids':'Kids Paul','e-dani':'Kids Dani','e-schwerin':'Schwerin',
  'e-maja':'Maja','e-trip':'Urlaub','e-hellomed':'Hellomed',
  'e-kidev':'Schule','e-sport':'Sport','e-haus':'Haus',
  'e-feier':'Feiertag','e-union':'Union','e-konzert':'Konzert',
  'e-bday':'Bday'
};
const _catLabelColor = {
  'e-kids':'#1a56db','e-dani':'#6b7280','e-schwerin':'#f97316',
  'e-maja':'#db2777','e-trip':'#059669','e-hellomed':'#8099E8',
  'e-kidev':'#dc2626','e-sport':'#0ea5e9','e-haus':'#00a0e3',
  'e-feier':'#713f12','e-union':'#b91c1c','e-konzert':'#16a34a',
  'e-bday':'#9ca3af'
};
function makeCatLabel(cat) {
  const label = _catLabelShort[cat];
  if(!label) return '';
  const color = _catLabelColor[cat] || '#aeaeb2';
  return `<span class="eli-cat-label" style="background:${color}1a;color:${color}">${label}</span>`;
}

function sortEvents(evs) {
  // Separate all-day (no time) from timed events
  const allDay = evs.filter(ev => !extractTime(ev.t) && !ev.startTime);
  const timed  = evs.filter(ev =>  extractTime(ev.t) ||  ev.startTime);
  
  // Sort timed by time
  timed.sort((a, b) => {
    const ta = a.startTime || extractTime(a.t) || '99:99';
    const tb = b.startTime || extractTime(b.t) || '99:99';
    return ta.localeCompare(tb);
  });
  
  return [...allDay, ...timed];
}

function parseICS(text) {
  const events = [];
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\r|\n/);
  let current = null;
  let uidCount = 0;

  for(const line of lines) {
    if(line === 'BEGIN:VEVENT') {
      current = {};
    } else if(line === 'END:VEVENT' && current) {
      events.push(current);
      current = null;
    } else if(current) {
      const sep = line.indexOf(':');
      if(sep === -1) continue;
      // Key korrekt extrahieren: auch bei EXDATE;TZID=Europe/Berlin:20260520T...
      // → split am ersten ';' oder ':', dann [0] = reiner Key
      const key = line.substring(0, sep).split(';')[0].toUpperCase();
      // Val: bei TZID-Params (z.B. EXDATE;TZID=...:Wert) ist der echte Wert
      // NACH dem letzten ':', damit TZID nicht mit in val landet
      const val = line.includes(';TZID=')
        ? line.substring(line.lastIndexOf(':') + 1)
        : line.substring(sep + 1);

      if(key === 'SUMMARY')      current.title = val;
      if(key === 'DESCRIPTION')  current.description = val;
      if(key === 'LOCATION')     current.location = val;
      if(key === 'UID') { current.uid = val.trim(); uidCount++; }
      if(key === 'RRULE')        current.rrule = val; // ← wiederkehrende Termine
      if(key === 'RECURRENCE-ID') {
        // Verschobener/geänderter Einzeltermin einer Serie → merken welches Datum ersetzt wird
        const d = parseICSDate(val);
        if(d) current.recurrenceId = d;
      }
      if(key === 'EXDATE') {
        // Ausnahmen (gelöschte Einzeltermine einer Serie)
        if(!current.exdates) current.exdates = [];
        val.split(',').forEach(v => {
          const d = parseICSDate(v.trim());
          if(d) current.exdates.push(d);
        });
      }
      if(key === 'DTSTART') {
        current.startRaw = val;
        current.start = parseICSDate(val);
        current.allDay = !val.includes('T');
        if(val.includes('T')) {
          // Extract HH:MM from time component
          const clean = val.replace('Z','').replace(/TZID=[^:]+:/,'');
          const h = clean.substring(9,11);
          const m2 = clean.substring(11,13);
          // Convert UTC to local if Z suffix
          if(val.endsWith('Z')) {
            const d = new Date(Date.UTC(+clean.substring(0,4),+clean.substring(4,6)-1,+clean.substring(6,8),+h,+m2));
            current.startTime = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
          } else {
            current.startTime = h + ':' + m2;
          }
        }
      }
      if(key === 'DTEND') {
        current.endRaw = val;
        current.end = parseICSDate(val);
        if(val.includes('T')) {
          const clean = val.replace('Z','').replace(/TZID=[^:]+:/,'');
          const h = clean.substring(9,11);
          const m2 = clean.substring(11,13);
          if(val.endsWith('Z')) {
            const d = new Date(Date.UTC(+clean.substring(0,4),+clean.substring(4,6)-1,+clean.substring(6,8),+h,+m2));
            current.endTime = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
          } else {
            current.endTime = h + ':' + m2;
          }
        }
      }
    }
  }
  console.log('parseICS: found', events.length, 'events,', uidCount, 'with UIDs');
  if(uidCount === 0) console.warn('NO UIDs found! First 3 lines:', lines.slice(0,3));
  return events;
}

// ── RRULE EXPANDER ────────────────────────────────────────────────────
// Expandiert ein wiederkehrendes VEVENT in Einzel-Vorkommen für die
// nächsten RRULE_HORIZON_DAYS Tage ab heute.
const RRULE_HORIZON_DAYS = 365;

function expandRecurring(ev) {
  if(!ev.rrule || !ev.start) return [ev];

  const parts = {};
  ev.rrule.split(';').forEach(p => {
    const [k, v] = p.split('=');
    parts[k] = v;
  });

  const freq   = parts['FREQ']     || '';
  const count  = parts['COUNT']    ? parseInt(parts['COUNT']) : null;
  const until  = parts['UNTIL']    ? parseICSDate(parts['UNTIL']) : null;
  const byday  = parts['BYDAY']    ? parts['BYDAY'].split(',') : null; // z.B. MO,TU,WE
  const interval = parts['INTERVAL'] ? parseInt(parts['INTERVAL']) : 1;

  // Horizont: heute bis heute + RRULE_HORIZON_DAYS
  const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
  const horizonDate = new Date(today.getTime() + RRULE_HORIZON_DAYS * 86400000);
  const horizonKey  = horizonDate.getFullYear() + '-' +
                      String(horizonDate.getMonth()+1).padStart(2,'0') + '-' +
                      String(horizonDate.getDate()).padStart(2,'0');

  const exdates = new Set(ev.exdates || []);
  const occurrences = [];
  let cur = new Date(ev.start + 'T12:00:00');
  let n = 0;
  let totalCount = 0; // Zählt ALLE Vorkommen ab DTSTART (für COUNT-Kompatibilität)
  const MAX = 1000; // Sicherheitslimit

  const DOW = ['SU','MO','TU','WE','TH','FR','SA'];

  while(n < MAX) {
    const key = cur.getFullYear() + '-' +
                String(cur.getMonth()+1).padStart(2,'0') + '-' +
                String(cur.getDate()).padStart(2,'0');

    // Abbruchbedingungen
    if(key > horizonKey) break;
    if(until && key > until) break;
    if(count !== null && totalCount >= count) break; // COUNT = alle Vorkommen ab DTSTART

    // Nur Vorkommen ab heute injizieren; aber Zähler läuft weiter (COUNT-Kompatibilität)
    const inWindow = key >= todayKey;
    const notExcluded = !exdates.has(key);

    // BYDAY-Filter (z.B. MO,WE,FR bei wöchentlicher Wiederholung)
    const dowOk = !byday || byday.includes(DOW[cur.getDay()]);

    if(dowOk && notExcluded) totalCount++; // immer zählen, auch Vergangenheit

    if(inWindow && notExcluded && dowOk) {
      occurrences.push({
        ...ev,
        start: key,
        end: ev.end ? shiftDateByDays(ev.end, daysDiff(ev.start, key)) : key,
        rrule: undefined // nicht nochmal expandieren
      });
    }

    // Nächstes Vorkommen berechnen
    if(freq === 'DAILY') {
      cur.setDate(cur.getDate() + interval);
    } else if(freq === 'WEEKLY') {
      if(byday && byday.length > 1) {
        // Mehrere Wochentage: tageweise vorwärtsgehen
        cur.setDate(cur.getDate() + 1);
      } else {
        cur.setDate(cur.getDate() + 7 * interval);
      }
    } else if(freq === 'MONTHLY') {
      cur.setMonth(cur.getMonth() + interval);
    } else if(freq === 'YEARLY') {
      cur.setFullYear(cur.getFullYear() + interval);
    } else {
      break; // unbekannte Frequenz → nicht expandieren
    }
    n++;
  }

  return occurrences.length > 0 ? occurrences : [];
}

function daysDiff(startKey, endKey) {
  return Math.round((new Date(endKey+'T12:00:00') - new Date(startKey+'T12:00:00')) / 86400000);
}
function shiftDateByDays(dateKey, days) {
  const d = new Date(dateKey+'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function parseICSDate(val) {
  // Format: 20260515 (all-day) or 20260515T180000Z (UTC) or 20260515T180000 (local)
  const isAllDay = !val.includes('T');
  const clean = val.replace(/TZID=[^:]+:/,'');
  
  if(isAllDay) {
    // All-day: take date as-is, no timezone conversion
    const d = clean.replace('Z','');
    return `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`;
  }
  
  // Timed event
  const isUTC = clean.endsWith('Z');
  const base = clean.replace('Z','');
  const y = base.substring(0,4);
  const mo = base.substring(4,6);
  const d = base.substring(6,8);
  
  if(isUTC) {
    // Convert UTC to local date
    const utcDate = new Date(Date.UTC(+y, +mo-1, +d, +base.substring(9,11), +base.substring(11,13)));
    // Use Berlin timezone offset (CET=+1, CEST=+2) for display
    const berlinOffset = utcDate.getTimezoneOffset(); // negative of local offset
    const localDate = new Date(utcDate.getTime() - berlinOffset * 60000);
    return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth()+1).padStart(2,'0')}-${String(localDate.getUTCDate()).padStart(2,'0')}`;
  }
  
  return `${y}-${mo}-${d}`;
}

// Gibt ALLE passenden Kategorien zurück (Multi-Tag-System)
// Reihenfolge = Priorität für die primäre Farbe (ev.c)
function catsFromTitle(title) {
  const t = (title||'').toLowerCase();
  const cats = [];

  if(t.includes('schwerin'))           cats.push('e-schwerin');
  if(t.includes('bodensee')||t.includes('leba')||t.includes('łeba')||t.includes('urlaub')||t.includes('parchim')||t.includes('reise')||t.includes('ferien')||t.includes('trip')||t.includes('ausflug')||t.includes('wochenende')||t.includes('ostsee')||t.includes('nordsee')||t.includes('strand')) cats.push('e-trip');
  if(t.includes('kids bei dani'))      cats.push('e-dani');
  else if(t.includes('kids'))          cats.push('e-kids');
  if(t.includes('sport')||t.includes('beat81')||t.includes('radtour')||/\btour\b/.test(t)||/lauf/.test(t)||/rennen/.test(t)||/wettkampf/.test(t)) cats.push('e-sport');
  if(t.includes('maja')||t.includes('kawi')||t.includes('sing dela')||t.includes('finch')||t.includes('olivia')||t.includes('geburtstagsdrinks')) cats.push('e-maja');
  if(t.includes('konzert')||t.includes('bierwalker')||t.includes('markus krebs')||t.includes('6k united')) cats.push('e-konzert');
  if(t.includes('alma')||t.includes('spendenlauf')||t.includes('schule')||t.includes('rosa')||t.includes('emil')||t.includes('kiefer')||t.includes('prophylaxe')||t.includes('eltern')) cats.push('e-kidev');
  if(t.includes('besichtigung')||t.includes('berlinovo')) cats.push('e-haus');
  if(t.includes('hellomed')||t.includes('paul & sina')||t.includes('paul und sina')||t.includes('firmenlauf')||t.includes('etiketten')||t.includes('klientenliste')||t.includes('prolog')||t.includes('polog')||t.includes('pharma')) cats.push('e-hellomed');

  return cats.length > 0 ? cats : ['e-event-ical'];
}

// Kompatibilitäts-Wrapper (gibt primäre Kategorie zurück)
function catFromTitle(title) {
  return catsFromTitle(title)[0];
}

// Inject iCal events into SE object
function injectICalEvents(events, url='') {
  const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());

  // Wiederkehrende Termine expandieren bevor wir injizieren
  // Erst: alle RECURRENCE-IDs pro UID sammeln (= Dates die durch Ausnahme-VEVENTs ersetzt werden)
  const recurrenceOverrides = {}; // uid → Set of date strings
  for(const ev of events) {
    if(ev.recurrenceId && ev.uid) {
      const uid = ev.uid.trim();
      if(!recurrenceOverrides[uid]) recurrenceOverrides[uid] = new Set();
      recurrenceOverrides[uid].add(ev.recurrenceId);
    }
  }

  const expanded = [];
  for(const ev of events) {
    if(ev.rrule) {
      // RECURRENCE-ID-Dates zur EXDATE-Liste hinzufügen, damit verschobene Termine nicht doppelt erscheinen
      const uid = ev.uid ? ev.uid.trim() : null;
      const overrides = uid && recurrenceOverrides[uid] ? [...recurrenceOverrides[uid]] : [];
      const evWithOverrides = overrides.length > 0
        ? { ...ev, exdates: [...(ev.exdates || []), ...overrides] }
        : ev;
      expanded.push(...expandRecurring(evWithOverrides));
    } else if(!ev.recurrenceId) {
      // Normale Einzel-VEVENTs ohne RECURRENCE-ID direkt übernehmen
      expanded.push(ev);
    } else {
      // VEVENTs mit RECURRENCE-ID: das ist der verschobene/geänderte Termin → DTSTART ist das neue Datum
      expanded.push(ev);
    }
  }

  for(const ev of expanded) {
    if(!ev.start || !ev.title) continue;
    // Skip past events
    if(ev.start < todayKey) continue;
    // Skip events already covered by static data
    const title = ev.title.trim();

    const isHellomed = url.includes('hellomed');
    const allCats = isHellomed ? ['e-hellomed'] : catsFromTitle(title);
    const cat = allCats[0]; // primäre Kategorie → Farbe
    const display = title;

    // For multi-day events, add to each day
    if(ev.end && ev.end > ev.start) {
      let cur = new Date(ev.start + 'T12:00:00'); // noon to avoid DST issues
      // iCal DTEND is exclusive for all-day events
      const endD = new Date(ev.end + 'T12:00:00');
      while(cur < endD) {
        const key = cur.getFullYear() + '-' + 
                    String(cur.getMonth()+1).padStart(2,'0') + '-' + 
                    String(cur.getDate()).padStart(2,'0');
        if(!SE[key]) SE[key] = [];
        // Duplicate check: exact title match on same day, same source (hellomed vs gmail)
        const isHelmomedUrl = url.includes('hellomed');
        if(!SE[key].some(e => e.t === display && e.fromIcal && !!e.fromHellomed === isHelmomedUrl)) {
          const entry = {t: display, c: cat, cats: allCats, fromIcal: true};
          if(isHelmomedUrl) entry.fromHellomed = true;
          if(ev.startTime && key === ev.start) entry.startTime = ev.startTime;
          if(ev.endTime && key === ev.start) entry.endTime = ev.endTime;
          if(ev.location) entry.location = ev.location;
          if(ev.description) entry.description = ev.description;
          SE[key].push(entry);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      if(!SE[ev.start]) SE[ev.start] = [];
      const isHelmomedUrl = url.includes('hellomed');
      if(!SE[ev.start].some(e => e.t === display && e.fromIcal && !!e.fromHellomed === isHelmomedUrl)) {
        const entry = {t: display, c: cat, cats: allCats, fromIcal: true};
        if(ev.startTime) entry.startTime = ev.startTime;
        if(ev.endTime) entry.endTime = ev.endTime;
        if(ev.location) entry.location = ev.location;
        if(ev.description) entry.description = ev.description;
        if(ev.uid) {
          const uid = ev.uid.trim();
          entry.googleId = uid.includes('@') ? uid.split('@')[0] : uid;
        }
        if(url.includes('hellomed')) entry.fromHellomed = true;
        SE[ev.start].push(entry);
      }
    }
  }
}

async function loadICalEvents() {
  if(!ICAL_SOURCES || !ICAL_SOURCES.length) return;
  if(!window.HubAuth?.isSignedIn()) return;

  const statusEl = document.getElementById('ical-status');
  if(statusEl) statusEl.textContent = '🔄 Kalender wird geladen…';

  let totalEvents = 0;
  let errors = 0;

  await Promise.all(ICAL_SOURCES.map(async (source, idx) => {
    const statusId = idx === 0 ? 'ls-ical1' : 'ls-ical2';
    const label = idx === 0 ? 'Gmail iCal' : 'Hellomed iCal';
    setLoadStatus(statusId, 'loading', label + ' …');
    try {
      const res = await HubAuth.authorizedFetch(source.endpoint);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const events = parseICS(text);
      injectICalEvents(events, source.source);
      totalEvents += events.length;
      setLoadStatus(statusId, 'ok', `✓ ${label} (${events.length})`);
    } catch(err) {
      errors++;
      setLoadStatus(statusId, 'err', `✗ ${label}`);
      console.warn('iCal load error for', source.source, ':', err.message);
    }
  }));

  if(statusEl) {
    statusEl.textContent = errors > 0
      ? `⚠️ ${totalEvents} Termine geladen (${errors} Fehler)`
      : `✅ ${totalEvents} Termine geladen`;
    setTimeout(() => { if(statusEl) statusEl.textContent = ''; }, 3000);
  }

  renderAll();
    hideEmptyFilters();
}

// ── DYNAMIC DATA LOADERS ─────────────────────────────────────────────
// ── LADEFORTSCHRITT ──────────────────────────────────────────────────
let _loadTotal = 6;
let _loadDone = 0;

function progressStep() {
  _loadDone++;
  const pct = Math.round((_loadDone / _loadTotal) * 100);
  const fill = document.getElementById('loadProgressFill');
  if(!fill) return;
  fill.style.width = pct + '%';
  if(pct >= 100) {
    setTimeout(() => {
      fill.style.opacity = '0';
      setTimeout(() => {
        const bar = document.getElementById('loadProgressBar');
        if(bar) bar.style.display = 'none';
      }, 450);
    }, 300);
  }
}

function setLoadStatus(id, state, text) {
  // Load status display removed — no-op stub to prevent errors
  if(state === 'ok' || state === 'err') progressStep();
}



async function loadFeiertage() {
  const year = new Date().getFullYear();
  const nextYear = year + 1;
  setLoadStatus('ls-feier', 'loading', 'Feiertage …');
  try {
    // OpenHolidays API - Feiertage Berlin
    const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&subdivisionCode=DE-BE&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${nextYear}-12-31`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    const emoji = { 'Neujahr':'🎆','Karfreitag':'✝️','Ostersonntag':'🐣','Ostermontag':'🐣',
      'Tag der Arbeit':'🎉','Christi Himmelfahrt':'⛪','Pfingstsonntag':'⛪','Pfingstmontag':'⛪',
      'Tag der Deutschen Einheit':'🎉','Internationaler Frauentag':'💐','Tag der Befreiung':'🕊️',
      '1. Weihnachtstag':'🎄','2. Weihnachtstag':'🎄' };
    
    for(const h of data) {
      const date = h.startDate.substring(0,10);
      const name = h.name.find(n => n.language === 'DE')?.text || h.name[0]?.text || 'Feiertag';
      const icon = emoji[name] || '🗓️';
      if(!SE[date]) SE[date] = [];
      if(!SE[date].some(e => e.c === 'e-feier' && e.t.includes(name))) {
        SE[date].push({t: `${icon} ${name}`, c: 'e-feier', fromApi: true});
      }
    }
    console.log(`✅ ${data.length} Feiertage geladen`);
    setLoadStatus('ls-feier', 'ok', `✓ Feiertage (${data.length})`);
  } catch(err) {
    console.warn('Feiertage API error:', err.message);
    setLoadStatus('ls-feier', 'err', '✗ Feiertage');
  }
}

async function loadSchulferien() {
  const year = new Date().getFullYear();
  const nextYear = year + 1;
  setLoadStatus('ls-ferien', 'loading', 'Schulferien …');
  try {
    // OpenHolidays API - Schulferien Berlin
    const url = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-BE&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${nextYear}-12-31`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    const emoji = { 'Winterferien':'❄️','Osterferien':'🐣','Pfingstferien':'🌸',
      'Sommerferien':'☀️','Herbstferien':'🍂','Weihnachtsferien':'🎄' };
    
    for(const f of data) {
      const name = f.name.find(n => n.language === 'DE')?.text || 'Schulferien';
      const icon = Object.entries(emoji).find(([k]) => name.includes(k))?.[1] || '🏫';
      const label = `${icon} ${name} Berlin`;
      
      let cur = new Date(f.startDate);
      const end = new Date(f.endDate);
      while(cur <= end) {
        const key = cur.toISOString().substring(0,10);
        if(!SE[key]) SE[key] = [];
        if(!SE[key].some(e => e.c === 'e-feier' && e.t.includes(name))) {
          SE[key].push({t: label, c: 'e-feier', fromApi: true});
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    console.log(`✅ Schulferien geladen`);
    setLoadStatus('ls-ferien', 'ok', '✓ Schulferien');
  } catch(err) {
    console.warn('Schulferien API error:', err.message);
    setLoadStatus('ls-ferien', 'err', '✗ Schulferien');
  }
}

async function loadUnionGames() {
  setLoadStatus('ls-union', 'loading', 'Union Berlin …');
  try {
    // Use a CORS proxy for sports data - openligadb.de (free, no key needed)
    const currentSeason = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const url = `https://api.openligadb.de/getmatchdata/bl1/${currentSeason}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const matches = await res.json();
    
    const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
    
    for(const m of matches) {
      // Check if Union Berlin is playing
      const isUnion = m.team1?.teamName?.includes('Union Berlin') || m.team2?.teamName?.includes('Union Berlin');
      if(!isUnion) continue;
      
      const matchDate = m.matchDateTime?.substring(0,10);
      if(!matchDate || matchDate < todayKey) continue;
      
      const isHome = m.team1?.teamName?.includes('Union Berlin');
      const opponent = isHome ? m.team2?.teamName : m.team1?.teamName;
      const time = m.matchDateTime?.substring(11,16) || '';
      const label = isHome ? `⚽ Union – ${opponent} ${time}` : `⚽ ${opponent} – Union ${time}`;
      
      if(!SE[matchDate]) SE[matchDate] = [];
      if(!SE[matchDate].some(e => e.c === 'e-union' && e.t.includes('Union'))) {
        SE[matchDate].push({t: label, c: 'e-union', fromApi: true});
      }
    }
    console.log('✅ Union Spiele geladen');
    setLoadStatus('ls-union', 'ok', '✓ Union Berlin');
  } catch(err) {
    console.warn('Union API error:', err.message);
    setLoadStatus('ls-union', 'err', '✗ Union Berlin');
    // Fallback: keep static entries
  }
}

async function loadKidsSheet() {
  if(!window.HubAuth?.isSignedIn()) return;
  setLoadStatus('ls-sheet', 'loading', 'Kids Sheet …');
  try {
    const res = await HubAuth.authorizedFetch('https://paul-gateway-v2.paul-bendzko.workers.dev/feeds/kids');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const csv = await res.text();
    
    const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
    const lines = csv.split('\n').slice(1); // skip header
    
    let kidsAdded = 0, infosAdded = 0;
    
    for(const line of lines) {
      if(!line.trim()) continue;
      // Parse CSV - handle quoted fields
      const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
      const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
      
      const rawDate = clean[0]; // DD/MM/YYYY
      const who = clean[2];     // Paul or Dani
      const info = clean[4];    // Infos column E
      
      if(!rawDate || !who) continue;
      
      // Parse date DD/MM/YYYY → YYYY-MM-DD
      const parts = rawDate.split('/');
      if(parts.length !== 3) continue;
      const dateKey = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      
      // Skip past dates
      if(dateKey < todayKey) continue;
      
      if(!SE[dateKey]) SE[dateKey] = [];
      
      // Add Kids bei Paul / Kids bei Dani if not already from iCal
      const cat = who.toLowerCase().includes('paul') ? 'e-kids' : 'e-dani';
      const label = who.toLowerCase().includes('paul') ? '👨‍👧‍👦 Kids bei Paul' : 'Kids bei Dani';
      
      if(!SE[dateKey].some(e => e.c === cat)) {
        SE[dateKey].push({t: label, c: cat, fromSheet: true});
        kidsAdded++;
      }
      
      // Add info as Schule/Kids event if present
      if(info && info.length > 2) {
        if(!SE[dateKey].some(e => e.t.includes(info.substring(0,20)))) {
          SE[dateKey].push({t: '📋 ' + info, c: 'e-kidev', fromSheet: true});
          infosAdded++;
        }
      }
    }
    console.log(`✅ Kids Sheet: ${kidsAdded} Tage, ${infosAdded} Infos geladen`);
    setLoadStatus('ls-sheet', 'ok', `✓ Kids Sheet (${kidsAdded} Tage)`);
  } catch(err) {
    console.warn('Google Sheets error:', err.message);
    setLoadStatus('ls-sheet', 'err', '✗ Kids Sheet');
  }
}

async function loadAllDynamicData() {
  await Promise.all([loadFeiertage(), loadSchulferien(), loadUnionGames(), loadKidsSheet()]);
}

renderAll();
hideEmptyFilters();

// ── THEME (3-State: light → dark → auto → light) ──────────────────────
// '☀️' light  = manuell hell
// '🌙' dark   = manuell dunkel
// '🌓' auto   = folgt Systemeinstellung (kein localStorage-Eintrag)
function applyTheme(theme) {
  const sysDark = window.matchMedia('(prefers-color-scheme:dark)').matches;
  const isDark = theme === 'dark' || (theme === 'auto' && sysDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('themeBtn');
  if(theme === 'auto')       { btn.textContent = '🌓'; btn.title = 'Auto (System) – klicken für Hell'; }
  else if(theme === 'light') { btn.textContent = '☀️'; btn.title = 'Hell – klicken für Dunkel'; }
  else                       { btn.textContent = '🌙'; btn.title = 'Dunkel – klicken für Auto'; }
  window.__themeState = theme;
}
function toggleTheme() {
  const cur = window.__themeState || 'auto';
  // Zyklus: light → dark → auto → light
  const next = cur === 'light' ? 'dark' : cur === 'dark' ? 'auto' : 'light';
  if(next === 'auto') localStorage.removeItem('theme');
  else localStorage.setItem('theme', next);
  applyTheme(next);
}
(function() {
  const saved = localStorage.getItem('theme'); // 'dark' | 'light' | null
  applyTheme(saved || 'auto');
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => {
    if(!localStorage.getItem('theme')) applyTheme('auto');
  });
})();

// ── GOOGLE OAUTH + EVENT CREATION ─────────────────────────────────────
let gAccessToken = null;
let tokenExpiry = 0;

function isTokenValid() {
  return gAccessToken && Date.now() < tokenExpiry;
}

function requestToken(callback) {
  window.HubAuth.signIn({ calendar: true })
    .then((session) => {
      gAccessToken = session.accessToken;
      tokenExpiry = session.expiresAt;
      if(callback) callback();
    })
    .catch((error) => {
      const status = document.getElementById('addStatus');
      if(status) status.textContent = '❌ Anmeldung fehlgeschlagen: ' + error.message;
      console.error('OAuth error:', error);
    });
}

function openAppleCal() {
  // calshow:// öffnet Apple Kalender auf iPhone/iPad direkt
  // Fallback für Desktop: calendar.apple.com
  const ua = navigator.userAgent;
  if(/iPhone|iPad|iPod/.test(ua)) {
    window.location.href = 'calshow://';
  } else {
    window.open('https://calendar.apple.com', '_blank');
  }
}

// Load dynamic data and re-render
const _dynPromise = loadAllDynamicData().then(() => {
  renderAll();
  setTimeout(updateHeaderVar, 0);
});

// Load iCal events after initial render
const _icalPromise = loadICalEvents();

// Nach BEIDEN Ladevorgängen: finaler Filter-Count-Refresh + Neue Termine Check
// → wird unten zusammen mit checkNeueTermine() aufgerufen

// Set header height – called immediately and after every render
function updateHeaderVar() {
  const h = document.querySelector('.header');
  if(h) {
    const hh = h.getBoundingClientRect().height;
    if(hh > 0) {
      document.documentElement.style.setProperty('--header-h', Math.round(hh) + 'px');
      document.documentElement.style.setProperty('--header-h-min', Math.round(hh) + 'px');
    }
  }
}
// Run immediately (sync, before first paint)
updateHeaderVar();
// Run after fonts/layout settle
window.addEventListener('load', updateHeaderVar);
window.addEventListener('resize', updateHeaderVar, {passive: true});
setTimeout(updateHeaderVar, 0);
setTimeout(updateHeaderVar, 100);
setTimeout(updateHeaderVar, 500);
// Also update after scroll state changes (today panel transition)
// No transitionend needed since we removed transitions

// Fade today strip on scroll
let lastScrolled = false;

function updateTodayPanel() {} // removed

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 40;
  if(scrolled === lastScrolled) return;
  lastScrolled = scrolled;
  updateTodayPanel();
}, {passive: true});;

// Update header title on scroll to show current visible month

// ── NEUE TERMINE SEIT LETZTEM BESUCH ────────────────────────────────
// Fingerprint: "titel|datum" für alle iCal-Events (fromIcal:true)
// Snapshot wird nach BEIDEN Ladezyklen gespeichert (dyn + ical)
// Vergleich mit gespeichertem Snapshot → Badge anzeigen

const SNAPSHOT_URL  = 'https://paul-gateway-v2.paul-bendzko.workers.dev/snapshot';
const NEUE_SEEN_KEY = 'kalender_snapshot_seen_v1'; // bleibt lokal (gerätespezifisch)

let _neueTermineList    = [];
let _geaendertTermineList = [];

function buildEventFingerprints() {
  const fps = {};
  const todayKey = dk(today.getFullYear(), today.getMonth(), today.getDate());
  Object.keys(SE).forEach(dateKey => {
    if(dateKey < todayKey) return;
    (SE[dateKey] || []).forEach(ev => {
      if(!ev.fromIcal) return;
      const fp = (ev.t || '').trim() + '|' + dateKey;
      fps[fp] = {
        t: ev.t, c: ev.c, dateKey,
        startTime: ev.startTime  || null,
        endTime:   ev.endTime    || null,
        location:  ev.location   || null,
        fromIcal:  true,
        fromSheet: ev.fromSheet  || false,
        fromApi:   ev.fromApi    || false
      };
    });
  });
  return fps;
}

// Welche Felder haben sich geändert? Gibt lesbares Label zurück.
function diffFields(oldEv, newEv) {
  const changes = [];
  const fmtTime = (s, e) => s ? (e && e !== s ? s + '–' + e : s + ' Uhr') : null;
  const oldTime = fmtTime(oldEv.startTime, oldEv.endTime);
  const newTime = fmtTime(newEv.startTime, newEv.endTime);
  if(oldTime !== newTime) {
    changes.push(oldTime
      ? `⏱ ${oldTime} → ${newTime || 'ganztägig'}`
      : `⏱ ganztägig → ${newTime}`);
  }
  if((oldEv.location || '') !== (newEv.location || '')) {
    changes.push(oldEv.location
      ? `📍 ${oldEv.location} → ${newEv.location || '—'}`
      : `📍 Ort hinzugefügt: ${newEv.location}`);
  }
  return changes;
}

let _snapshotTime = null; // wird in checkNeueTermine gesetzt

async function checkNeueTermine() {
  if(!window.HubAuth?.isSignedIn()) return;
  const current = buildEventFingerprints();
  const seenRaw = localStorage.getItem(NEUE_SEEN_KEY);
  const seenFps = seenRaw ? JSON.parse(seenRaw) : {};

  // Snapshot vom Worker laden
  let saved = null;
  try {
    const res = await HubAuth.authorizedFetch(SNAPSHOT_URL, { cache: 'no-store' });
    if(res.ok) {
      const json = await res.json();
      saved = json;
    }
  } catch(err) {
    console.warn('Snapshot GET fehlgeschlagen:', err.message);
  }

  if(!saved) {
    saveSnapshot(current);
    return;
  }

  _snapshotTime = saved.time || null;
  const savedFps = saved.fps || {};

  const newItems     = [];
  const changedItems = [];

  Object.keys(current).forEach(fp => {
    if(savedFps[fp]) {
      const changes = diffFields(savedFps[fp], current[fp]);
      if(changes.length > 0 && !seenFps['chg|' + fp]) {
        changedItems.push({ ...current[fp], changes });
      }
    } else if(!seenFps[fp]) {
      newItems.push(current[fp]);
    }
  });

  newItems.sort((a,b)     => a.dateKey.localeCompare(b.dateKey));
  changedItems.sort((a,b) => a.dateKey.localeCompare(b.dateKey));

  _neueTermineList      = newItems;
  _geaendertTermineList = changedItems;

  const total = newItems.length + changedItems.length;
  if(total > 0) {
    const btn = document.getElementById('neueTermineBtn');
    const cnt = document.getElementById('neueTermineCount');
    if(btn) btn.style.display = 'inline-flex';
    if(cnt) cnt.textContent = total;
  }

  // Neuen Snapshot speichern (aktueller Stand)
  saveSnapshot(current);
}

function saveSnapshot(fps) {
  if(!window.HubAuth?.isSignedIn()) return;
  const payload = JSON.stringify({ fps, time: Date.now() });
  HubAuth.authorizedFetch(SNAPSHOT_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  }).catch(err => console.warn('Snapshot PUT fehlgeschlagen:', err.message));
}

// ── Gemeinsamer Renderer für ein eli-Item ────────────────────────────
function renderNeueEli(ev, colorMap2, mode) {
  // mode: 'new' | 'changed'
  const color    = colorMap2[ev.c] || '#aeaeb2';
  const title    = (ev.t || '').replace(/^\d{1,2}:\d{2}\s*/, '').trim();
  const timeRange = ev.startTime
    ? (ev.endTime && ev.endTime !== ev.startTime
        ? ev.startTime + ' – ' + ev.endTime + ' Uhr'
        : ev.startTime + ' Uhr')
    : null;
  const locStr   = ev.location ? ' · ' + ev.location : '';
  const timeHtml = timeRange ? `<div class="et">${timeRange}${locStr}</div>` : '';
  const dateStr  = fmtDate(ev.dateKey);

  const srcBadges = [];
  if(mode === 'new') {
    srcBadges.push('<span class="src-badge" style="color:#f59e0b;background:rgba(245,158,11,.10)">✦ Neu</span>');
    if(ev.fromIcal)  srcBadges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
    if(ev.fromSheet) srcBadges.push('<span class="src-badge" style="color:#a78bfa">● Kids Sheet</span>');
    if(ev.fromApi)   srcBadges.push('<span class="src-badge" style="color:#f59e0b">● API</span>');
  } else {
    srcBadges.push('<span class="src-badge" style="color:#818cf8;background:rgba(129,140,248,.10)">✎ Geändert</span>');
    if(ev.fromIcal) srcBadges.push('<span class="src-badge" style="color:#34d399">● iCal</span>');
  }

  const changesHtml = (ev.changes || []).map(c =>
    `<div class="et" style="margin-top:2px;color:var(--text2);">${c}</div>`
  ).join('');

  return `<div class="eli neue-eli" data-datekey="${ev.dateKey}" style="cursor:pointer;margin-bottom:6px;">
    <div class="eli-dot" style="background:${color}"></div>
    <div class="evt-info">
      <div class="en">${title} ${srcBadges.join('')}</div>
      ${timeHtml}
      ${changesHtml}
      <div class="et" style="margin-top:3px;color:var(--blue);font-weight:600;">${dateStr}</div>
    </div>
  </div>`;
}

function openNeueTermineSheet() {
  const sheet    = document.getElementById('neueTermineSheet');
  const backdrop = document.getElementById('neueTermineBackdrop');
  const list     = document.getElementById('neueTermineList');
  const sub      = document.getElementById('neueTermineSubtitle');

  const colorMap2 = {
    'e-kids':'#1a56db','e-dani':'#6b7280','e-schwerin':'#f97316',
    'e-maja':'#db2777','e-trip':'#059669','e-hellomed':'#8099E8',
    'e-kidev':'#dc2626','e-bday':'#9ca3af','e-sport':'#0ea5e9',
    'e-feier':'#713f12','e-union':'#b91c1c','e-konzert':'#16a34a','e-haus':'#00a0e3'
  };

  const hasNew     = _neueTermineList.length > 0;
  const hasChanged = _geaendertTermineList.length > 0;

  if(!hasNew && !hasChanged) {
    list.innerHTML = '<div style="padding:16px 4px;font-size:13px;color:var(--text3);text-align:center;">Keine Änderungen gefunden.</div>';
  } else {
    if(_snapshotTime) {
      const d = new Date(_snapshotTime);
      sub.textContent = `Seit ${d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})} · ${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr`;
    }

    let html = '';

    if(hasNew) {
      html += `<div style="font-family:var(--font-head);font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:4px 2px 8px;">✦ Neue Termine (${_neueTermineList.length})</div>`;
      html += _neueTermineList.map(ev => renderNeueEli(ev, colorMap2, 'new')).join('');
    }

    if(hasChanged) {
      if(hasNew) html += `<div style="height:1px;background:var(--border);margin:10px 0 12px;"></div>`;
      html += `<div style="font-family:var(--font-head);font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;padding:4px 2px 8px;">✎ Geänderte Termine (${_geaendertTermineList.length})</div>`;
      html += _geaendertTermineList.map(ev => renderNeueEli(ev, colorMap2, 'changed')).join('');
    }

    list.innerHTML = html;

    // Click → Tag-Ansicht
    list.querySelectorAll('.neue-eli').forEach(el => {
      el.addEventListener('click', () => {
        const dateKey = el.dataset.datekey;
        closeNeueTermineSheet();
        const d    = new Date(dateKey + 'T12:00:00');
        const base = new Date();
        const diffDays = Math.round((d - base) / 86400000);
        setView('tag');
        viewOffset = diffDays;
        renderView();
      });
    });
  }

  sheet.classList.add('on');
  backdrop.classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeNeueTermineSheet() {
  document.getElementById('neueTermineSheet').classList.remove('on');
  document.getElementById('neueTermineBackdrop').classList.remove('on');
  document.body.style.overflow = '';
}

function markNeueTermineGesehen() {
  const seen = {};
  _neueTermineList.forEach(ev => {
    seen[(ev.t || '').trim() + '|' + ev.dateKey] = true;
  });
  _geaendertTermineList.forEach(ev => {
    seen['chg|' + (ev.t || '').trim() + '|' + ev.dateKey] = true;
  });
  localStorage.setItem(NEUE_SEEN_KEY, JSON.stringify(seen));
  _neueTermineList      = [];
  _geaendertTermineList = [];
  const btn = document.getElementById('neueTermineBtn');
  if(btn) btn.style.display = 'none';
  closeNeueTermineSheet();
}

// Aufruf nach beiden Ladezyklen
Promise.allSettled([_dynPromise, _icalPromise]).then(() => {
  hideEmptyFilters();
  checkNeueTermine();
});

window.addEventListener('hub-auth-change', async () => {
  await Promise.allSettled([loadICalEvents(), loadKidsSheet()]);
  renderAll();
  hideEmptyFilters();
  checkNeueTermine();
});
