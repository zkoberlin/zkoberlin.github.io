const F=v=>(Math.round(v*100)/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const FI=v=>Math.round(v).toLocaleString('de-DE')+' €';
const R2=v=>Math.round(v*100)/100;

const ITEMS=[{k:"miete",cat:"Wohnen",def:1808},{k:"strom",cat:"Wohnen",def:43},{k:"internet",cat:"Wohnen",def:45},{k:"lebensmittel",cat:"Wohnen",def:450},{k:"schufa",cat:"Wohnen",def:4.95},{k:"ing",cat:"Wohnen",def:1.49},{k:"haftpflicht",cat:"Versicherungen",def:9.08},{k:"rechtsschutz",cat:"Versicherungen",def:31.42},{k:"kredit",cat:"Versicherungen",def:320},{k:"gez",cat:"Versicherungen",def:18.33},{k:"unterhalt",cat:"Familie",def:360},{k:"kids",cat:"Familie",def:150},{k:"handyemil",cat:"Familie",def:7.99},{k:"handyrosa",cat:"Familie",def:7.99},{k:"ukv",cat:"Familie",def:9.89},{k:"sparta",cat:"Familie",def:15},{k:"bling",cat:"Familie",def:2.67},{k:"unionemil",cat:"Familie",def:3.5},{k:"handypaul",cat:"Abos",def:11},{k:"icloud",cat:"Abos",def:9.99},{k:"spotify",cat:"Abos",def:21.99},{k:"finanzguru",cat:"Abos",def:2.99},{k:"claude",cat:"Abos",def:22},{k:"unionmitgl",cat:"Abos",def:10},{k:"amazon",cat:"Abos",def:7.42},{k:"parqet",cat:"Abos",def:4.5},{k:"futbology",cat:"Abos",def:0.83},{k:"fotmob",cat:"Abos",def:0.71},{k:"bvg",cat:"Freizeit",def:63},{k:"dauerkarte",cat:"Freizeit",def:21.67},{k:"garmin",cat:"Freizeit",def:7.42}];

const CC={'Wohnen':'#2563EB','Versicherungen':'#D97706','Kredite & Finanzen':'#DC2626','Familie':'#DB2777','Abos':'#7C3AED','Freizeit':'#059669'};

// STATE
const S={};
ITEMS.forEach(x=>{S[x.k]={v:x.def,on:true,cat:x.cat};});
S.gehalt={v:3887}; S.zusatz={v:0,on:false};
S.invest={v:0}; S.notgr={v:100}; S.urlaub={v:100}; S.sonder={v:0};
let CI=[]; // custom items
let PC=null,MC_=null; // pie charts
let mFreq='monthly',mCat=null;

// LOAD
function LOAD(){
  try{
    const sv=JSON.parse(localStorage.getItem('fp3')||'{}');
    Object.keys(sv).forEach(k=>{if(S[k]){S[k].v=sv[k].v;if(sv[k].on!==undefined)S[k].on=sv[k].on;}  });
    const ci=JSON.parse(localStorage.getItem('fp3c')||'[]');
    ci.forEach(it=>{CI.push(it);S[it.k]={v:it.monthly,on:true,cat:it.cat};renderCR(it);});
  }catch(e){}
  // Apply to DOM
  ITEMS.forEach(x=>{
    setSlider(x.k,S[x.k].v,S[x.k].on);
    setVal(x.k,S[x.k].v);
    setTog(x.k,S[x.k].on);
  });
  bootstrapFinanceSync();
  ['invest','notgr','urlaub','sonder'].forEach(k=>{
    const v=S[k].v;
    const de=document.getElementById('dsl-'+k); if(de) de.value=v;
    const me=document.getElementById('msl-'+k); if(me) me.value=v;
    updateDistVal(k,v);
  });
  // zusatz
  const zt=S.zusatz; const don=document.getElementById('dtog-zusatz'); const mon=document.getElementById('mtog-zusatz');
  if(don){if(zt.on)don.classList.add('on'); else don.classList.remove('on');}
  if(mon){if(zt.on)mon.classList.add('on'); else mon.classList.remove('on');}
  const dsl=document.getElementById('dsl-zusatz'); if(dsl){dsl.value=zt.v;dsl.disabled=!zt.on;}
  const msl=document.getElementById('msl-zusatz'); if(msl){msl.value=zt.v;msl.disabled=!zt.on;}
  document.getElementById('d-zusatz-val').textContent=FI(zt.v);
  document.getElementById('m-zusatz-val').textContent=FI(zt.v);
  // gehalt
  document.getElementById('dsl-gehalt').value=S.gehalt.v;
  document.getElementById('msl-gehalt').value=S.gehalt.v;
  document.getElementById('d-gh-val').textContent=FI(S.gehalt.v);
  document.getElementById('m-gh-val').textContent=FI(S.gehalt.v);
  // zusatz display
  document.getElementById('d-zusatz-val').textContent=FI(S.zusatz.v);
  document.getElementById('m-zusatz-val').textContent=FI(S.zusatz.v);
}

// ══ GESCHÜTZTER CLOUDFLARE-SYNC ══
const FINANCE_API='https://paul-gateway-v2.paul-bendzko.workers.dev/finance';
const JB_KEY_STORE = 'fp3_jb_key';
const JB_BIN_STORE = 'fp3_jb_bin';
let syncTimer = null;
let financeBootstrapped = false;

function setSync(status, msg) {
  const icons = {idle:'🔒', saving:'⏳', saved:'✅', error:'❌', offline:'📴', nokey:'🔐'};
  const msgs = {idle:'Cloudflare D1', saving:'Speichern…', saved:'Sicher gespeichert', error:'Sync-Fehler', offline:'Offline', nokey:'Anmelden für Cloud-Sync'};
  ['d-sync-ico','m-sync-ico'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=icons[status]||'☁️';});
  ['d-sync-lbl','m-sync-lbl'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=msg||msgs[status]||'';});
}

function financePayload(){
  return {v:3,ts:new Date().toISOString(),s:JSON.parse(localStorage.getItem('fp3')||'{}'),c:JSON.parse(localStorage.getItem('fp3c')||'[]')};
}

async function cloudSave(data) {
  if(!window.HubAuth?.isSignedIn()) { setSync('nokey'); return false; }
  setSync('saving');
  try {
    const r=await HubAuth.authorizedFetch(FINANCE_API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    setSync('saved');
    setTimeout(()=>setSync('idle'),2000);
    return true;
  } catch(e) {
    setSync(navigator.onLine?'error':'offline');
    return false;
  }
}

async function legacyJsonBinLoad() {
  const jbKey=localStorage.getItem(JB_KEY_STORE)||'';
  const jbBin=localStorage.getItem(JB_BIN_STORE)||'';
  if(!jbKey || !jbBin) return null;
  try {
    const r = await fetch('https://api.jsonbin.io/v3/b/'+jbBin+'/latest', {
      headers:{'X-Master-Key':jbKey}
    });
    if(!r.ok) return null;
    const j = await r.json();
    return j.record;
  } catch(e) { return null; }
}

function applyCloudPayload(data){
  if(!data?.s)return;
  localStorage.setItem('fp3',JSON.stringify(data.s));
  localStorage.setItem('fp3c',JSON.stringify(Array.isArray(data.c)?data.c:[]));
  Object.keys(data.s).forEach(k=>{if(S[k]){S[k].v=data.s[k].v;if(data.s[k].on!==undefined)S[k].on=data.s[k].on;}});
  (data.c||[]).forEach(it=>{if(!CI.find(x=>x.k===it.k)){CI.push(it);S[it.k]={v:it.monthly,on:data.s[it.k]?.on!==false,cat:it.cat};renderCR(it);}});
  ITEMS.forEach(x=>{setSlider(x.k,S[x.k].v,S[x.k].on);setVal(x.k,S[x.k].v);setTog(x.k,S[x.k].on);});
  ['gehalt','invest','notgr','urlaub','sonder'].forEach(k=>{
    ['dsl-','msl-'].forEach(p=>{const e=document.getElementById(p+k);if(e)e.value=S[k].v;});
    if(k!=='gehalt')updateDistVal(k,S[k].v);
  });
  document.getElementById('d-gh-val').textContent=FI(S.gehalt.v);
  document.getElementById('m-gh-val').textContent=FI(S.gehalt.v);
  RC();
}

async function bootstrapFinanceSync(){
  if(!window.HubAuth?.isSignedIn()){setSync('nokey');return;}
  setSync('saving','Sicher laden…');
  try{
    const response=await HubAuth.authorizedFetch(FINANCE_API,{signal:AbortSignal.timeout(8000)});
    if(response.ok){applyCloudPayload(await response.json());financeBootstrapped=true;setSync('saved','Sicher geladen ✓');setTimeout(()=>setSync('idle'),2000);return;}
    if(response.status!==404)throw new Error('HTTP '+response.status);
    // Einmalige, verlustfreie Migration: erst JSONBin, sonst vorhandener lokaler Stand.
    const legacy=await legacyJsonBinLoad();
    const source=legacy?.s?legacy:financePayload();
    applyCloudPayload(source);
    if(await cloudSave({...source,v:3,ts:new Date().toISOString()})){financeBootstrapped=true;setSync('saved','Sicher migriert ✓');}
  }catch(e){setSync(navigator.onLine?'error':'offline');}
}

function scheduleSave() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(()=>{
    cloudSave(financePayload());
  }, 1500); // debounce 1.5s
}

window.addEventListener('hub-auth-change',()=>bootstrapFinanceSync());

function SAVE(){
  const sv={};
  Object.keys(S).forEach(k=>{sv[k]={v:S[k].v,on:S[k].on};});
  try{localStorage.setItem('fp3',JSON.stringify(sv));localStorage.setItem('fp3c',JSON.stringify(CI));}catch(e){}
  scheduleSave();
}

function setSlider(k,v,on){
  ['dsl-','msl-'].forEach(p=>{const e=document.getElementById(p+k);if(e){e.value=v;e.disabled=!on;}});
}
function setVal(k,v){
  ['dval-','mrval-'].forEach(p=>{const e=document.getElementById(p+k);if(e)e.textContent=F(v);});
}
function setTog(k,on){
  ['dtog-','mtog-'].forEach(p=>{const e=document.getElementById(p+k);if(e){if(on)e.classList.add('on');else e.classList.remove('on');}});
  ['dlbl-','mrlbl-'].forEach(p=>{const e=document.getElementById(p+k);if(e){if(on)e.classList.remove('dim');else e.classList.add('dim');}});
}
function updateDistVal(k,v){
  ['d-'+k+'-val','m-'+k+'-val'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=FI(v);});
}

// TOGGLE
function DT(el,k){
  el.classList.toggle('on');
  const on=el.classList.contains('on');
  if(!S[k])return;
  S[k].on=on;
  // Update emoji toggle if it's a mr-tog
  if(el.classList.contains('mr-tog')){
    el.textContent=on?'✓':'○';
    el.classList.toggle('off',!on);
    // sync desktop toggle
    const dtog=document.getElementById('dtog-'+k);
    if(dtog){if(on)dtog.classList.add('on');else dtog.classList.remove('on');}
  }
  if(k==='zusatz'){
    ['dtog-zusatz','mtog-zusatz'].forEach(id=>{const e=document.getElementById(id);if(e&&e!==el){if(on)e.classList.add('on');else e.classList.remove('on');}});
    ['dsl-zusatz','msl-zusatz'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=!on;});
  } else {
    setTog(k,on);
    setSlider(k,S[k].v,on);
  }
  SAVE();RC();
}

// ITEM SLIDER
function DI(k,v,e){if(e)e.stopPropagation();S[k].v=R2(parseFloat(v));setVal(k,S[k].v);SAVE();RC();}
function MI(k,v,e){if(e)e.stopPropagation();S[k].v=R2(parseFloat(v));setVal(k,S[k].v);const dsl=document.getElementById('dsl-'+k);if(dsl)dsl.value=S[k].v;SAVE();RC();}

// GEHALT
function GI(v,e){if(e)e.stopPropagation();
  S.gehalt.v=parseInt(v);
  const gv=FI(S.gehalt.v);
  document.getElementById('d-gh-val').textContent=gv;
  document.getElementById('m-gh-val').textContent=gv;
  ['dsl-gehalt','msl-gehalt'].forEach(id=>{const e=document.getElementById(id);if(e&&e.value!=v)e.value=v;});
  SAVE();RC();
}

// ZUSATZ
function ZI(v,side,e){if(e)e.stopPropagation();
  S.zusatz.v=parseInt(v);
  document.getElementById('d-zusatz-val').textContent=FI(S.zusatz.v);
  document.getElementById('m-zusatz-val').textContent=FI(S.zusatz.v);
  const other=side==='d'?'msl-zusatz':'dsl-zusatz';
  const oe=document.getElementById(other);if(oe)oe.value=v;
  SAVE();RC();
}

// REST SLIDERS
function RI(k,v,side,e){if(e)e.stopPropagation();
  S[k].v=parseInt(v);
  updateDistVal(k,S[k].v);
  const other=side==='d'?'msl-'+k:'dsl-'+k;
  const oe=document.getElementById(other);if(oe)oe.value=v;
  SAVE();RC();
}

// RECALC
function RC(){
  const g=S.gehalt.v, z=S.zusatz.on?S.zusatz.v:0, ein=g+z;
  let total=0; const ct={};
  ITEMS.forEach(x=>{if(S[x.k].on){total+=S[x.k].v;ct[x.cat]=(ct[x.cat]||0)+S[x.k].v;}});
  CI.forEach(it=>{if(S[it.k]&&S[it.k].on){total+=S[it.k].v;ct[it.cat]=(ct[it.cat]||0)+S[it.k].v;}});
  total=R2(total);
  const rest=R2(ein-total);
  const inv=S.invest.v,notg=S.notgr.v,url=S.urlaub.v,sond=S.sonder.v;
  const puf=R2(rest-inv-notg-url-sond);
  const quote=ein>0?Math.round((inv+notg)/ein*100):0;

  // fmt helpers
  const fp=R2(Math.max(0,puf));
  set('dm-ein',FI(ein)); set('dm-aus',F(total));
  set('dm-rest',F(rest)); set('dm-puf',F(fp));
  set('dsb-ein',FI(ein)); set('dsb-aus',F(total)); set('dsb-rest',F(rest));
  set('d-puf-val',F(fp));
  set('d-restlbl','von '+F(rest));
  set('mh-puf',F(fp)); set('mh-ein',FI(ein)); set('mh-aus',F(total));
  set('mh-rest',F(rest)); set('mh-quote',quote+'%');
  set('m-restlbl','von '+F(rest));

  cls('dm-rest',rest>=0?'d-mv g':'d-mv r');
  cls('dm-puf',puf>=0?'d-mv g':'d-mv r');

  // alert
  let ac='ok',at=F(fp)+' Puffer — im Plan';
  if(rest<0){ac='danger';at='Ausgaben übersteigen Einnahmen um '+F(Math.abs(rest));}
  else if(puf<0){ac='warn';at='Zuteilung übersteigt Rest um '+F(Math.abs(puf));}
  setAlert('d-alert','d-alert-txt',ac,at);
  setAlert('m-alert','m-alert-txt',ac,at);

  // section totals
  const SECS={wohnen:['miete','strom','internet','lebensmittel'],
    versicherungen:['haftpflicht','rechtsschutz','gez'],
    kredite:['kredit','schufa','ing'],
    familie:['unterhalt','kids','handyemil','handyrosa','ukv','sparta','bling','unionemil'],
    abos:['handypaul','icloud','spotify','finanzguru','claude','unionmitgl','amazon','parqet','futbology','fotmob'],
    freizeit:['bvg','dauerkarte','garmin']};
  const catSums={};
  Object.entries(SECS).forEach(([sec,keys])=>{
    let sum=keys.reduce((s,k)=>s+(S[k]&&S[k].on?S[k].v:0),0);
    CI.filter(i=>i.cat.toLowerCase()===sec||i.cat===sec).forEach(i=>{if(S[i.k]&&S[i.k].on)sum+=S[i.k].v;});
    sum=R2(sum);
    catSums[sec]=sum;
    set('dtot-'+sec,F(sum)); set('dnav-'+sec,F(sum)); set('mtot-'+sec,F(sum));
  });
  // Sort desktop sidebar nav by value descending
  sortSidebarNav(catSums);

  RWF(ein,total,rest,inv,notg,url,sond,puf);
  RPIE(ct);
}

function sortSidebarNav(catSums) {
  const sidebar = document.querySelector('.d-sidebar');
  if(!sidebar) return;
  const navItems = Array.from(sidebar.querySelectorAll('.d-nav'));
  if(navItems.length === 0) return;
  // Sort by category sum descending
  navItems.sort((a,b)=>{
    const aKey = a.querySelector('[id^="dnav-"]')?.id?.replace('dnav-','');
    const bKey = b.querySelector('[id^="dnav-"]')?.id?.replace('dnav-','');
    return (catSums[bKey]||0) - (catSums[aKey]||0);
  });
  // Find insertion point - after first navlbl
  const firstLbl = sidebar.querySelector('.d-navlbl');
  const secondLbl = Array.from(sidebar.querySelectorAll('.d-navlbl'))[1];
  navItems.forEach(el=>{
    if(secondLbl) sidebar.insertBefore(el, secondLbl);
    else sidebar.appendChild(el);
  });
}

function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function cls(id,c){const e=document.getElementById(id);if(e)e.className=c;}
function setAlert(aid,tid,type,txt){
  const ae=document.getElementById(aid); const te=document.getElementById(tid);
  if(!ae||!te)return;
  const base=aid.startsWith('d-')?'d-alert':'m-alert';
  const cols={ok:'var(--grn)',warn:'var(--amb)',danger:'var(--red)'};
  const bgs={ok:'rgba(52,199,89,0.12)',warn:'rgba(255,149,0,0.12)',danger:'rgba(255,59,48,0.12)'};
  ae.style.background=bgs[type]; ae.style.color=cols[type];
  te.textContent=txt;
  const dot=ae.querySelector('.d-alert-dot,.m-alert-dot'); if(dot)dot.style.background=cols[type];
}

function RWF(ein,total,rest,inv,notg,url,sond,puf){
  const rows=[
    {l:'Einnahmen',v:ein,c:'#34C759'},{l:'Ausgaben',v:-total,c:'#FF3B30'},
    {l:'Investieren',v:-inv,c:'#007AFF'},{l:'Notgroschen',v:-notg,c:'#5856D6'},
    {l:'Urlaub',v:-url,c:'#FF9500'},{l:'Sonder',v:-sond,c:'#AF52DE'},
    {l:'Puffer',v:Math.max(0,puf),c:'#30D158'},
  ].filter(r=>Math.abs(r.v)>0.005);
  ['d-wf','m-wf'].forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    const pfx=id.startsWith('d')?'wf':'m-wf';
    el.innerHTML=rows.map(r=>{
      const pct=Math.min(100,Math.abs(r.v)/ein*100).toFixed(1);
      const sign=r.v>=0?'+ ':'− ';
      return `<div class="${pfx}r"><span class="${pfx}l">${r.l}</span><div class="${pfx}bw"><div class="${pfx}b" style="width:${pct}%;background:${r.c};"></div></div><span class="${pfx}v">${sign}${F(Math.abs(r.v))}</span><span class="${pfx}pct">${pct}%</span></div>`;
    }).join('');
  });
}

function RPIE(ct){
  const labels=Object.keys(ct).filter(k=>ct[k]>0);
  const data=labels.map(l=>R2(ct[l]));
  const colors=labels.map(l=>CC[l]||'#888');
  const tot=data.reduce((a,b)=>a+b,0);
  const pcts=data.map(v=>tot>0?Math.round(v/tot*100):0);
  ['d-pie','m-pie'].forEach((id,i)=>{
    const canvas=document.getElementById(id); if(!canvas)return;
    const ref=i===0?PC:MC_;
    const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{
      label:ctx=>{const p=tot>0?Math.round(ctx.parsed/tot*100):0;return ' '+F(ctx.parsed)+' ('+p+'%)';}
    }}}};
    if(ref){ref.data.labels=labels;ref.data.datasets[0].data=data;ref.data.datasets[0].backgroundColor=colors;ref.update();}
    else{
      const ch=new Chart(canvas,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:2,borderColor:'transparent'}]},options:opts});
      if(i===0)PC=ch; else MC_=ch;
    }
  });
  ['d-pleg','m-pleg'].forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    const pfx=id.startsWith('d')?'':'m-';
    el.innerHTML=labels.map((l,i)=>`<span class="${pfx}pli"><span class="${pfx}pld" style="background:${colors[i]}"></span><span>${l}</span>&nbsp;<span style="font-weight:600;color:var(--t1);">${FI(data[i])}</span>&nbsp;<span style="color:var(--t3);font-size:10px;">${pcts[i]}%</span></span>`).join('');
  });
}

function NC(el,id){
  document.querySelectorAll('.d-nav').forEach(n=>n.classList.remove('on'));
  el.classList.add('on');
  document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
}
function MP(el,id){
  document.querySelectorAll('.m-page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.m-tabitem').forEach(b=>b.classList.remove('on'));
  document.getElementById(id).classList.add('on'); el.classList.add('on');
}
function MC(el,id){
  document.querySelectorAll('.m-ctab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.m-cpanel').forEach(p=>p.classList.remove('on'));
  el.classList.add('on'); document.getElementById(id).classList.add('on');
  if(id==='m-cp-pie'&&MC_)MC_.resize();
}
function DC(el,id){
  document.querySelectorAll('.d-ctab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.d-cpanel').forEach(p=>p.classList.remove('on'));
  el.classList.add('on'); document.getElementById(id).classList.add('on');
  if(id==='d-cp-pie'&&PC)PC.resize();
}

// MODAL
function OM(){
  document.getElementById('inp-name').value='';
  document.getElementById('inp-amt').value='';
  mFreq='monthly'; mCat=null;
  document.querySelectorAll('.fbtn').forEach(b=>{b.classList.toggle('on',b.dataset.freq==='monthly');});
  document.querySelectorAll('.cbtn').forEach(b=>b.classList.remove('on'));
  UP();
  document.getElementById('modal').classList.add('on');
  setTimeout(()=>document.getElementById('inp-name').focus(),100);
}
function CM(){document.getElementById('modal').classList.remove('on');}
function SF(btn){document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');mFreq=btn.dataset.freq;UP();}
function SC(btn){document.querySelectorAll('.cbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');mCat=btn.dataset.cat;UP();}

function UP(){
  const name=document.getElementById('inp-name').value.trim();
  const raw=document.getElementById('inp-amt').value.trim().replace(',','.');
  const amt=parseFloat(raw);
  const ok=name.length>0&&raw.length>0&&!isNaN(amt)&&amt>0&&mCat!==null;
  document.getElementById('btn-confirm').disabled=!ok;
  const prev=document.getElementById('mprev');
  // Clear
  while(prev.firstChild)prev.removeChild(prev.firstChild);
  if(!ok){
    prev.textContent='Bitte alle Felder ausfüllen …';
    prev.style.color='';
    return;
  }
  let monthly=amt;
  let ftxt='';
  let scol=null;
  if(mFreq==='yearly'){monthly=R2(amt/12);ftxt=F(amt)+' / Jahr';scol='#FF3B30';}
  else if(mFreq==='quarterly'){monthly=R2(amt/3);ftxt=F(amt)+' / Quartal';scol='#FF9500';}
  else{ftxt=F(amt)+' / Monat';}
  // Build spans
  const mk=(t,bold,col)=>{const s=document.createElement('span');s.textContent=t;if(bold)s.style.fontWeight='700';if(col)s.style.color=col;else s.style.color='var(--t1)';return s;};
  const dim='var(--t3)';
  prev.appendChild(mk(name,true,null));
  prev.appendChild(mk(' · '+ftxt+' → ',false,dim));
  prev.appendChild(mk(F(monthly)+' / Mo',true,null));
  if(scol)prev.appendChild(mk(' *',true,scol));
  prev.appendChild(mk(' · '+mCat,false,dim));
}

// Listen for inputs WITHOUT oninput on the elements (to avoid iOS issues)
document.getElementById('inp-name').addEventListener('input',UP);
document.getElementById('inp-amt').addEventListener('input',UP);

function AP(){
  const name=document.getElementById('inp-name').value.trim();
  const amt=parseFloat(document.getElementById('inp-amt').value.trim().replace(',','.'));
  let monthly=amt;
  if(mFreq==='yearly')monthly=R2(amt/12);
  if(mFreq==='quarterly')monthly=R2(amt/3);
  const k='c'+Date.now();
  const it={k,name,amt,freq:mFreq,monthly,cat:mCat};
  CI.push(it); S[k]={v:monthly,on:true,cat:mCat};
  SAVE(); renderCR(it); CM(); RC();
}

const BODY_MAP={Wohnen:'wohnen',Versicherungen:'versicherungen',Familie:'familie',Abos:'abos',Freizeit:'freizeit'};
function renderCR(it){
  const cat=BODY_MAP[it.cat]||'abos';
  const star=it.freq==='yearly'?' <span style="color:#FF3B30;font-size:10px;font-weight:700;">*</span>':it.freq==='quarterly'?' <span style="color:#FF9500;font-size:10px;font-weight:700;">*</span>':'';
  const max=Math.max(it.monthly*5,50);

  // Desktop row
  const db=document.getElementById('dbody-'+cat);
  if(db){
    const d=document.createElement('div');d.className='dr';d.id='dr-'+it.k;
    d.style.cursor='pointer';
    d.onclick=(e)=>{if(e.target.tagName!=='INPUT')OE(it.k);};
    d.innerHTML=`<span class="dico">✏️</span><span class="dlbl" id="dlbl-${it.k}">${it.name}${star}</span><input type="range" class="dsl" min="0" max="${max}" step="0.01" value="${it.monthly}" id="dsl-${it.k}" oninput="DI('${it.k}',this.value,event)"><span class="dval" id="dval-${it.k}">${F(it.monthly)}</span>`;
    db.appendChild(d);
  }
  // Mobile row
  const mb=document.getElementById('mbody-'+cat);
  if(mb){
    const m=document.createElement('div');m.className='mr';m.id='mr-'+it.k;
    m.style.cursor='pointer';
    m.onclick=(e)=>{if(e.target.tagName!=='INPUT'&&e.target.tagName!=='BUTTON')OE(it.k);};
    m.innerHTML=`<span class="mico">✏️</span><div class="mrm"><div class="mr-top"><div class="mrlbl" id="mrlbl-${it.k}">${it.name}${star}</div><span class="mrval" id="mrval-${it.k}">${F(it.monthly)}</span></div><input type="range" class="msl" min="0" max="${max}" step="0.01" value="${it.monthly}" id="msl-${it.k}" oninput="MI('${it.k}',this.value,event)"></div>`;
    mb.appendChild(m);
  }
}
const BUILTIN=['miete', 'strom', 'internet', 'lebensmittel', 'schufa', 'ing', 'haftpflicht', 'rechtsschutz', 'kredit', 'gez', 'unterhalt', 'kids', 'handyemil', 'handyrosa', 'ukv', 'sparta', 'bling', 'unionemil', 'handypaul', 'icloud', 'spotify', 'finanzguru', 'claude', 'unionmitgl', 'amazon', 'parqet', 'futbology', 'fotmob', 'bvg', 'dauerkarte', 'garmin'];

function confirmDel(k, label) {
  const isBuiltin = BUILTIN.includes(k);
  const msg = isBuiltin
    ? `"${label}" deaktivieren?\nDu kannst ihn über + wieder hinzufügen.`
    : `"${label}" löschen?`;
  if(!confirm(msg)) return;
  if(isBuiltin) {
    // Disable built-in: toggle off and hide row
    S[k].on = false;
    const mrow = document.getElementById('mr-'+k);
    if(mrow) mrow.style.display='none';
    const drow = document.getElementById('dr-'+k);
    if(drow) drow.style.opacity='0.35';
    // Also update desktop toggle
    const dtog = document.getElementById('dtog-'+k);
    if(dtog) dtog.classList.remove('on');
    setSlider(k, S[k].v, false);
  } else {
    CI=CI.filter(i=>i.k!==k); delete S[k];
    ['dr-','mr-'].forEach(p=>{const e=document.getElementById(p+k);if(e)e.remove();});
  }
  SAVE(); RC();
}

function DC2(k){
  confirmDel(k, k);
}

// ESC
// ── THEME TOGGLE ──
(function initTheme() {
  const saved = localStorage.getItem('fp_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.add(isDark ? 'theme-dark' : 'theme-light');
  updateThemeBtn(isDark);
  // Set meta theme-color immediately so browser chrome matches
  const manualMeta = document.getElementById('meta-theme-color-manual');
  if(manualMeta) manualMeta.setAttribute('content', isDark ? '#000000' : '#F2F2F7');
  // Remove media-conditional metas if we have a saved preference
  if(saved) {
    const lm = document.getElementById('meta-theme-color');
    const dm = document.getElementById('meta-theme-color-dark');
    if(lm) lm.removeAttribute('media');
    if(dm) dm.remove();
    if(lm) lm.content = isDark ? '#000000' : '#F2F2F7';
  }
})();

function updateThemeBtn(isDark) {
  ['d-theme-btn','m-theme-btn'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.textContent = isDark ? '☀️' : '🌙';
  });
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('theme-dark');
  html.classList.remove('theme-dark','theme-light');
  const newDark = !isDark;
  html.classList.add(newDark ? 'theme-dark' : 'theme-light');
  localStorage.setItem('fp_theme', newDark ? 'dark' : 'light');
  updateThemeBtn(newDark);
  // Update meta theme-color for browser chrome
  const manualMeta = document.getElementById('meta-theme-color-manual');
  if(manualMeta) manualMeta.content = newDark ? '#000000' : '#F2F2F7';
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'){CM();closeSM();CE();closeGehaltEdit();}});

function editGehalt(side) {
  const id = side==='d' ? 'd-gh-val' : 'm-gh-val';
  const inputCls = side==='d' ? 'gh-edit-input' : 'm-gh-edit-input';
  const el = document.getElementById(id);
  if(!el) return;

  // Replace div content with inline input
  const cur = S.gehalt.v;
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.inputMode = 'numeric';
  inp.className = inputCls;
  inp.value = cur;
  inp.setAttribute('data-side', side);

  el.textContent = '';
  el.appendChild(inp);
  el.onclick = null; // disable re-opening while editing

  inp.focus();
  inp.select();

  function commit() {
    const raw = parseInt(inp.value.replace(/[^0-9]/g,''));
    const val = isNaN(raw) ? cur : Math.max(500, Math.min(20000, raw));
    S.gehalt.v = val;
    // Update both sliders and displays
    ['dsl-gehalt','msl-gehalt'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=val;});
    const fmt = FI(val);
    document.getElementById('d-gh-val').textContent = fmt;
    document.getElementById('m-gh-val').textContent = fmt;
    // Re-enable click
    document.getElementById('d-gh-val').onclick = ()=>editGehalt('d');
    document.getElementById('m-gh-val').onclick = ()=>editGehalt('m');
    SAVE(); RC();
  }

  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e=>{
    if(e.key==='Enter') { inp.blur(); }
    if(e.key==='Escape') { inp.value=cur; inp.blur(); }
  });
}

function closeGehaltEdit() {
  ['d-gh-val','m-gh-val'].forEach(id=>{
    const el=document.getElementById(id);
    if(el && el.querySelector('input')) {
      el.querySelector('input').blur();
    }
  });
}

// ── EDIT MODAL ──
let editKey = null;
let editIsCustom = false;

const ITEM_META = {
  'miete': {label:'Miete',defVal:1808,min:500,max:2500,step:10,freq:'monthly'},
  'strom': {label:'Strom',defVal:43,min:10,max:120,step:1,freq:'monthly'},
  'internet': {label:'Telekom Internet',defVal:45,min:10,max:80,step:1,freq:'monthly'},
  'lebensmittel': {label:'Lebensmittel',defVal:450,min:100,max:900,step:10,freq:'monthly'},
  'schufa': {label:'Schufa',defVal:4.95,min:0,max:15,step:0.5,freq:'monthly'},
  'ing': {label:'ING Gebühren',defVal:1.49,min:0,max:10,step:0.5,freq:'monthly'},
  'haftpflicht': {label:'Haftpflicht/Hausrat',defVal:109,min:0,max:500,step:1,freq:'yearly'},
  'rechtsschutz': {label:'Rechtsschutz',defVal:377,min:0,max:1000,step:1,freq:'yearly'},
  'kredit': {label:'Kredit Rate',defVal:320,min:0,max:800,step:10,freq:'monthly'},
  'gez': {label:'GEZ',defVal:55,min:0,max:200,step:1,freq:'quarterly'},
  'unterhalt': {label:'Unterhalt',defVal:360,min:0,max:600,step:10,freq:'monthly'},
  'kids': {label:'Sparen Kids',defVal:150,min:0,max:300,step:10,freq:'monthly'},
  'handyemil': {label:'Handy Emil',defVal:7.99,min:0,max:20,step:0.5,freq:'monthly'},
  'handyrosa': {label:'Handy Rosa',defVal:7.99,min:0,max:20,step:0.5,freq:'monthly'},
  'ukv': {label:'UKV Emil',defVal:9.89,min:0,max:20,step:0.5,freq:'monthly'},
  'sparta': {label:'Sparta Emil',defVal:15,min:0,max:30,step:1,freq:'monthly'},
  'bling': {label:'Bling Emil',defVal:32,min:0,max:200,step:1,freq:'yearly'},
  'unionemil': {label:'Union Beitrag Emil',defVal:42,min:0,max:200,step:1,freq:'yearly'},
  'handypaul': {label:'Handy Paul',defVal:11,min:0,max:30,step:1,freq:'monthly'},
  'icloud': {label:'iCloud',defVal:9.99,min:0,max:15,step:0.5,freq:'monthly'},
  'spotify': {label:'Spotify',defVal:21.99,min:0,max:30,step:0.5,freq:'monthly'},
  'finanzguru': {label:'Finanzguru',defVal:2.99,min:0,max:10,step:0.5,freq:'monthly'},
  'claude': {label:'Claude',defVal:22,min:0,max:40,step:1,freq:'monthly'},
  'unionmitgl': {label:'Union Mitgliedschaft',defVal:10,min:0,max:20,step:1,freq:'monthly'},
  'amazon': {label:'Amazon Prime',defVal:89,min:0,max:300,step:1,freq:'yearly'},
  'parqet': {label:'Parqet',defVal:54,min:0,max:200,step:1,freq:'yearly'},
  'futbology': {label:'Futbology',defVal:9.99,min:0,max:100,step:0.01,freq:'yearly'},
  'fotmob': {label:'FotMob',defVal:8.49,min:0,max:100,step:0.01,freq:'yearly'},
  'bvg': {label:'BVG Ticket',defVal:63,min:0,max:120,step:1,freq:'monthly'},
  'dauerkarte': {label:'Dauerkarte Union',defVal:260,min:0,max:1000,step:1,freq:'yearly'},
  'garmin': {label:'Garmin',defVal:89,min:0,max:300,step:1,freq:'yearly'},
};

function OE(k) {
  // Don't open if clicking on slider/button inside row
  if(event.target.tagName==='INPUT'||event.target.tagName==='BUTTON') return;
  editKey = k;
  const isCustom = !BUILTIN.includes(k);
  editIsCustom = isCustom;

  let label, val, freq, cat, mn, mx, step;
  if(isCustom) {
    const ci = CI.find(i=>i.k===k);
    if(!ci) return;
    label = ci.name;
    // reverse-calculate original amount
    if(ci.freq==='yearly') val = R2(ci.monthly*12);
    else if(ci.freq==='quarterly') val = R2(ci.monthly*3);
    else val = ci.monthly;
    freq = ci.freq;
    cat = ci.cat;
    mn = 0; mx = Math.max(val*5,100); step = 0.01;
  } else {
    const meta = ITEM_META[k];
    if(!meta) return;
    label = meta.label;
    const sv = S[k].v;
    if(meta.freq==='yearly') val = R2(sv*12);
    else if(meta.freq==='quarterly') val = R2(sv*3);
    else val = sv;
    freq = meta.freq;
    cat = S[k].cat||'Abos';
    mn = meta.min; mx = meta.max; step = meta.step;
  }

  // Populate edit modal
  document.getElementById('em-title').textContent = label;
  document.getElementById('em-name').value = label;
  document.getElementById('em-name').disabled = !isCustom; // can't rename builtin
  document.getElementById('em-name').style.opacity = isCustom ? '1' : '0.5';
  document.getElementById('em-amt').value = val;
  document.getElementById('em-del').style.display = 'flex';

  // Set freq buttons
  document.querySelectorAll('.efbtn').forEach(b=>{
    b.classList.toggle('on', b.dataset.freq===freq);
  });
  // Set cat buttons
  document.querySelectorAll('.ecbtn').forEach(b=>{
    b.classList.toggle('on', b.dataset.cat===cat);
  });
  // Hide cat selector for builtins
  document.getElementById('em-cat-section').style.display = isCustom ? 'block' : 'none';

  mFreq = freq;
  mCat = cat;
  EU();
  document.getElementById('edit-modal').classList.add('on');
  setTimeout(()=>document.getElementById('em-amt').focus(),80);
}


const REST_META = {
  invest: {label:'Investieren', icon:'📈', min:0, max:1500, step:10},
  notgr:  {label:'Notgroschen', icon:'🐷', min:0, max:1500, step:10},
  urlaub: {label:'Urlaub',      icon:'✈️', min:0, max:1500, step:10},
  sonder: {label:'Sonderausgaben', icon:'🎯', min:0, max:1500, step:10},
};

function OR(k) {
  if(event.target.tagName==='INPUT') return;
  const meta = REST_META[k];
  if(!meta) return;
  editKey = k;
  editIsCustom = false;

  document.getElementById('em-title').textContent = meta.label+' bearbeiten';
  document.getElementById('em-name').value = meta.label;
  document.getElementById('em-name').disabled = true;
  document.getElementById('em-name').style.opacity = '0.5';
  document.getElementById('em-amt').value = S[k].v;

  // Hide freq and cat — rest items are always monthly
  document.getElementById('em-freq-section').style.display = 'none';
  document.getElementById('em-cat-section').style.display = 'none';
  document.getElementById('em-del').style.display = 'none';

  // Show a note
  const noteEl = document.getElementById('em-note');
  if(noteEl) noteEl.textContent = 'Maximaler Wert: 1.500 €/Monat';

  mFreq = 'monthly';
  EU();
  document.getElementById('edit-modal').classList.add('on');
  setTimeout(()=>document.getElementById('em-amt').focus(),80);
}
function CE() {
  document.getElementById('edit-modal').classList.remove('on');
  editKey=null;
  // Reset hidden sections
  const fs=document.getElementById('em-freq-section');if(fs)fs.style.display='';
  const cs=document.getElementById('em-cat-section');if(cs)cs.style.display='';
  const del=document.getElementById('em-del');if(del)del.style.display='flex';
  const note=document.getElementById('em-note');if(note)note.textContent='';
}

function EF(btn) {
  document.querySelectorAll('.efbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); mFreq=btn.dataset.freq; EU();
}
function EC(btn) {
  document.querySelectorAll('.ecbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); mCat=btn.dataset.cat; EU();
}

function EU() {
  const raw = document.getElementById('em-amt').value.trim().replace(',','.');
  const amt = parseFloat(raw);
  const prev = document.getElementById('em-prev');
  while(prev.firstChild) prev.removeChild(prev.firstChild);
  if(!raw || isNaN(amt) || amt<0) { prev.textContent='Betrag eingeben…'; return; }
  let monthly=amt, ftxt='', scol=null;
  if(mFreq==='yearly') { monthly=R2(amt/12); ftxt=F(amt)+' / Jahr'; scol='#FF3B30'; }
  else if(mFreq==='quarterly') { monthly=R2(amt/3); ftxt=F(amt)+' / Quartal'; scol='#FF9500'; }
  else { ftxt=F(amt)+' / Monat'; }
  const t1='var(--t1)', t3='var(--t3)';
  const mk=(t,bold,col)=>{const s=document.createElement('span');s.textContent=t;if(bold)s.style.fontWeight='700';s.style.color=col||t1;return s;};
  prev.appendChild(mk(document.getElementById('em-name').value||editKey,true,null));
  prev.appendChild(mk(' · '+ftxt+' → ',false,t3));
  prev.appendChild(mk(F(monthly)+' / Mo',true,null));
  if(scol) prev.appendChild(mk(' *',true,scol));
}

function SE() {
  const raw = document.getElementById('em-amt').value.trim().replace(',','.');
  const amt = parseFloat(raw);
  if(isNaN(amt)||amt<0) return;
  let monthly=amt;
  if(mFreq==='yearly') monthly=R2(amt/12);
  else if(mFreq==='quarterly') monthly=R2(amt/3);
  const k=editKey;

  // Check if it's a rest item
  if(REST_META[k]) {
    S[k].v = Math.min(1500, Math.round(monthly));
    // Update both sliders
    ['dsl-','msl-'].forEach(p=>{const e=document.getElementById(p+k);if(e)e.value=S[k].v;});
    // Update values
    ['d-'+k+'-val','m-'+k+'-val'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=FI(S[k].v);});
    // Show freq/cat again for next open
    const fs=document.getElementById('em-freq-section');if(fs)fs.style.display='';
    SAVE(); RC(); CE();
    return;
  }

  if(editIsCustom) {
    const ci=CI.find(i=>i.k===k); if(!ci) return;
    ci.name=document.getElementById('em-name').value.trim()||ci.name;
    ci.amt=amt; ci.freq=mFreq; ci.monthly=monthly; ci.cat=mCat;
    S[k].v=monthly; S[k].cat=mCat;
    ['dlbl-','mrlbl-'].forEach(p=>{const e=document.getElementById(p+k);if(e){const star=mFreq==='yearly'?' <span style="color:#FF3B30;font-size:10px;font-weight:700;">*</span>':mFreq==='quarterly'?' <span style="color:#FF9500;font-size:10px;font-weight:700;">*</span>':'';e.innerHTML=ci.name+star;}});
  } else {
    S[k].v=monthly;
  }
  setSlider(k,monthly,S[k].on!==false);
  setVal(k,monthly);
  // Show freq/cat again for next open
  const fs=document.getElementById('em-freq-section');if(fs)fs.style.display='';
  SAVE(); RC(); CE();
}

function DEL_EDIT() {
  const k=editKey;
  const label=editIsCustom?(CI.find(i=>i.k===k)?.name||k):(ITEM_META[k]?.label||k);
  CE();
  setTimeout(()=>confirmDel(k,label),100);
}

// SETTINGS
function openSM() {
  updateSMDisplay();
  document.getElementById('settings-modal').style.display='flex';
}
function closeSM() { document.getElementById('settings-modal').style.display='none'; }

function updateSMDisplay() {
  const signedIn=Boolean(window.HubAuth?.isSignedIn());
  document.getElementById('cloud-sync-state').textContent=signedIn?(financeBootstrapped?'✅ Sicher verbunden':'⏳ Verbindung wird aufgebaut'):'🔐 Anmeldung erforderlich';
}

// EXPORT/IMPORT
function EX(){
  const p={v:3,ts:new Date().toISOString(),s:JSON.parse(localStorage.getItem('fp3')||'{}'),c:JSON.parse(localStorage.getItem('fp3c')||'[]')};
  const b=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});
  const u=URL.createObjectURL(b);
  const a=document.createElement('a');a.href=u;a.download='finanzplanung_paul_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(u);
}
function IM(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    try{const p=JSON.parse(ev.target.result);
      if(p.s)localStorage.setItem('fp3',JSON.stringify(p.s));
      if(p.c)localStorage.setItem('fp3c',JSON.stringify(p.c));
      location.reload();
    }catch(err){alert('Fehler: '+err.message);}
  };
  r.readAsText(f);e.target.value='';
}

LOAD();RC();
