// All records and image keys are scoped to the authenticated account.
const KINDS = new Set(['journal', 'profile', 'workout', 'measurement', 'favorite', 'plan', 'shopping', 'recipe', 'activity']);
const ID = /^[a-zA-Z0-9_-]{1,80}$/;
const dateOK = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
const text = (s, max) => typeof s === 'string' && s.length <= max;
const num = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
export function validRecord(kind, p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  if (kind === 'activity') return dateOK(p.date) && ['Radfahren','E-Bike','Spazieren','Laufen','Schwimmen','Sonstiges'].includes(p.type) && num(p.durationMinutes,1,1440) && (p.distanceKm===null || num(p.distanceKm,0,2000)) && (p.activeKcal===null || num(p.activeKcal,0,20000)) && text(p.notes,2000);
  if (kind === 'journal') return dateOK(p.date) && text(p.title, 160) && text(p.body, 20000) && (p.title.trim() || p.body.trim() || p.photos?.length) && ['','gut','gemischt','schwierig'].includes(p.mood) && text(p.tags, 300) && Array.isArray(p.photos) && p.photos.length <= 6 && p.photos.every(id => ID.test(id));
  if (kind === 'recipe') return ID.test(p.id) && text(p.name,160) && p.name.trim() && text(p.method,16000) && (p.image==='' || typeof p.image==='string' && /^https:\/\/(?:www\.themealdb\.com\/images\/media\/meals\/|(?:upload|thumb)\.wikimedia\.org\/)/.test(p.image)) && text(p.source,300) && (p.source.startsWith('https://www.themealdb.com/meal/') || p.source.startsWith('https://de.wikibooks.org/wiki/')) && Array.isArray(p.ingredients) && p.ingredients.length<=30 && p.ingredients.every(i=>Array.isArray(i)&&i.length===2&&num(i[0],0,100000)&&text(i[1],200)) && Array.isArray(p.unscaled) && p.unscaled.length<=30 && p.unscaled.every(i=>text(i,250)) && Number.isInteger(p.baseServings) && num(p.baseServings,1,12);
  if (kind === 'shopping') return Array.isArray(p.selected) && p.selected.length<=100 && p.selected.every(id=>typeof id==='string'&&ID.test(id)) && (p.portions===undefined || Number.isInteger(p.portions) && num(p.portions,1,12)) && (p.portionsByRecipe===undefined || p.portionsByRecipe && typeof p.portionsByRecipe==='object' && !Array.isArray(p.portionsByRecipe) && Object.keys(p.portionsByRecipe).length<=100 && Object.entries(p.portionsByRecipe).every(([id,n])=>ID.test(id)&&Number.isInteger(n)&&num(n,1,12))) && Array.isArray(p.checked) && p.checked.length<=150 && p.checked.every(key=>text(key,250));
  if (kind === 'plan') return (p.cycleId===undefined || typeof p.cycleId==='string'&&ID.test(p.cycleId)) && (p.sessions===undefined || Array.isArray(p.sessions)&&p.sessions.length>=1&&p.sessions.length<=7&&p.sessions.every(s=>text(s.id,20)&&text(s.name,160)&&Array.isArray(s.exercises)&&s.exercises.length>=1&&s.exercises.length<=12&&s.exercises.every(e=>text(e.name,100)&&e.name.trim()&&Number.isInteger(e.sets)&&num(e.sets,1,6)&&text(e.reps,30)&&e.reps.length>0&&(e.weight===null||num(e.weight,0,1000))))) && (p.progressionEnabled===undefined || typeof p.progressionEnabled==='boolean') && text(p.name,160) && p.name.trim() && dateOK(p.startDate) && Number.isInteger(p.weeks) && num(p.weeks,1,12) && Array.isArray(p.days) && num(p.days.length,2,4) && new Set(p.days).size===p.days.length && p.days.every(d=>Number.isInteger(d)&&num(d,0,6)) && text(p.notes,2000) && Array.isArray(p.exercises) && num(p.exercises.length,1,12) && p.exercises.every(e=>text(e.name,100)&&e.name.trim()&&Number.isInteger(e.sets)&&num(e.sets,1,6)&&text(e.reps,30)&&e.reps.length>0&&(e.weight===null||num(e.weight,0,1000)));
  if (kind === 'profile') return num(p.height,100,250) && num(p.target,35,350) && num(p.sessions,2,4) && text(p.notes,2000);
  if (kind === 'measurement') return dateOK(p.date) && num(p.weight,35,350) && (p.waist === null || num(p.waist,30,250));
  if (kind === 'favorite') return ID.test(p.recipeId);
  if (kind === 'workout' && Array.isArray(p.exercises) && !p.exercises.every(e=>e && (e.setDetails===undefined || Array.isArray(e.setDetails) && e.setDetails.length>=1 && e.setDetails.length<=20 && e.setDetails.every(s=>s && (s.weight===null || num(s.weight,0,1000)) && text(s.reps,30) && s.reps.trim() && typeof s.done==='boolean')))) return false;
  if (kind === 'workout') return (p.planCycle===undefined || typeof p.planCycle==='string'&&ID.test(p.planCycle)) && (p.planRevision === undefined || Number.isInteger(p.planRevision) && p.planRevision > 0) && dateOK(p.date) && text(p.notes,2000) && Array.isArray(p.exercises) && p.exercises.length > 0 && p.exercises.length <= 20 && p.exercises.every(e => text(e.name,100) && e.name.trim() && num(e.sets,1,20) && text(e.reps,30) && (e.weight === null || num(e.weight,0,1000)));
  return false;
}
export async function lifeResponse(request, env, user, respond) {
  const url = new URL(request.url), parts = url.pathname.split('/').filter(Boolean), owner = user.email.toLowerCase();
  const db = env.HUB_DB.withSession('first-primary');
  const [root, kind, id] = parts;
  if (root === 'life-photo') {
    if (!env.LIFE_PHOTOS) return respond({error:'Bildspeicher nicht verfügbar'},503);
    if (request.method === 'POST' && parts.length === 1) {
      if (request.headers.get('Content-Type') !== 'image/webp') return respond({error:'Nur WebP-Bilder erlaubt'},400);
      const bytes = await limitedBody(request, 2000000);
      if (!bytes) return respond({error:'Bild zu groß (max. 2 MB)'},413);
      if (!safeWebp(bytes)) return respond({error:'Ungültiges Bild oder enthaltene Metadaten'},400);
      const photoId = crypto.randomUUID(), key = `${await ownerHash(owner)}/${photoId}`;
      await env.LIFE_PHOTOS.put(key, bytes, {httpMetadata:{contentType:'image/webp'}});
      try { await db.prepare('INSERT INTO life_photos (owner, id, object_key) VALUES (?, ?, ?)').bind(owner,photoId,key).run(); }
      catch (e) { await env.LIFE_PHOTOS.delete(key); throw e; }
      return respond({id:photoId},201);
    }
    if (!ID.test(kind || '') || parts.length !== 2) return respond({error:'Ungültiges Bild'},400);
    const row = await db.prepare('SELECT object_key FROM life_photos WHERE owner = ? AND id = ?').bind(owner,kind).first();
    if (!row) return respond({error:'Bild nicht gefunden'},404);
    if (request.method === 'GET') {
      const object = await env.LIFE_PHOTOS.get(row.object_key);
      if (!object) return respond({error:'Bild nicht gefunden'},404);
      const h = new Headers(respond({},200).headers); h.set('Content-Type','image/webp');
      return new Response(object.body,{headers:h});
    }
    if (request.method === 'DELETE') {
      const used = await db.prepare("SELECT id FROM life_records WHERE owner = ? AND kind = 'journal' AND EXISTS (SELECT 1 FROM json_each(payload_json, '$.photos') WHERE value = ?)").bind(owner,kind).first();
      if (used) return respond({error:'Bild wird noch in einem Eintrag verwendet'},409);
      await env.LIFE_PHOTOS.delete(row.object_key);
      await db.prepare('DELETE FROM life_photos WHERE owner = ? AND id = ?').bind(owner,kind).run();
      return respond({deleted:true},200);
    }
    return respond({error:'Methode nicht erlaubt'},405);
  }
  if (kind === 'export' && request.method === 'GET') {
    const r = await db.prepare('SELECT kind, id, payload_json, revision, updated_at FROM life_records WHERE owner = ? ORDER BY kind, id').bind(owner).all();
    const photos = await db.prepare('SELECT id FROM life_photos WHERE owner = ?').bind(owner).all();
    return respond({schemaVersion:1,exportedAt:new Date().toISOString(),records:(r.results||[]).map(decode),photos:photos.results||[]},200);
  }
  if (!KINDS.has(kind) || parts.length > 3 || (id && !ID.test(id))) return respond({error:'Nicht gefunden'},404);
  if (request.method === 'GET' && !id) {
    const r = await db.prepare('SELECT id, kind, payload_json, revision, updated_at FROM life_records WHERE owner = ? AND kind = ? ORDER BY updated_at DESC').bind(owner,kind).all();
    return respond({records:(r.results||[]).map(decode)},200);
  }
  if (!id) return respond({error:'Datensatz-ID fehlt'},400);
  if (!['PUT','DELETE'].includes(request.method)) return respond({error:'Methode nicht erlaubt'},405);
  const bytes = await limitedBody(request, 50000);
  if (!bytes) return respond({error:'Eintrag zu groß'},413);
  let p; try { p=JSON.parse(new TextDecoder().decode(bytes)); } catch { return respond({error:'Ungültige Eingabe'},400); }
  if (!Number.isInteger(p.revision) || p.revision < 0) return respond({error:'Versionsnummer fehlt'},400);
  if (request.method === 'DELETE') {
    const result = await db.prepare('DELETE FROM life_records WHERE owner = ? AND kind = ? AND id = ? AND revision = ?').bind(owner,kind,id,p.revision).run();
    return result.meta?.changes ? respond({deleted:true},200) : respond({error:'Eintrag wurde zwischenzeitlich geändert. Bitte neu laden.'},409);
  }
  if (!validRecord(kind,p.data)) return respond({error:'Bitte Eingaben prüfen'},400);
  if (kind === 'journal') for (const photo of p.data.photos) {
    const owned = await db.prepare('SELECT id FROM life_photos WHERE owner = ? AND id = ?').bind(owner,photo).first();
    if (!owned) return respond({error:'Bild nicht verfügbar'},400);
  }
  const now=new Date().toISOString();
  const result = p.revision === 0
    ? await db.prepare('INSERT INTO life_records (owner,kind,id,payload_json,revision,updated_at) VALUES (?,?,?,?,1,?) ON CONFLICT(owner,kind,id) DO NOTHING').bind(owner,kind,id,JSON.stringify(p.data),now).run()
    : await db.prepare('UPDATE life_records SET payload_json = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND kind = ? AND id = ? AND revision = ?').bind(JSON.stringify(p.data),now,owner,kind,id,p.revision).run();
  return result.meta?.changes ? respond({id, data:p.data, revision:p.revision+1, updatedAt:now},200) : respond({error:'Eintrag wurde zwischenzeitlich geändert. Bitte neu laden; dein Entwurf bleibt erhalten.'},409);
}
function decode(r) { return {id:r.id,kind:r.kind,data:JSON.parse(r.payload_json),revision:r.revision,updatedAt:r.updated_at}; }
async function ownerHash(s) { const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function limitedBody(request,max) {
  if (Number(request.headers.get('Content-Length')) > max) return null;
  const reader=request.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks=[]; let n=0;
  for (;;) { const {done,value}=await reader.read(); if(done) break; n+=value.length; if(n>max) { await reader.cancel(); return null; } chunks.push(value); }
  const result=new Uint8Array(n); let i=0; for(const c of chunks) {result.set(c,i);i+=c.length;} return result;
}
export function safeWebp(bytes) {
  if(bytes.length<20) return false;
  const s=(a,b)=>String.fromCharCode(...bytes.slice(a,b)), view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(s(0,4)!=='RIFF'||s(8,12)!=='WEBP'||view.getUint32(4,true)+8!==bytes.length) return false;
  let image=false, offset=12;
  while(offset+8<=bytes.length) {
    const type=s(offset,offset+4), size=view.getUint32(offset+4,true);
    if(!['VP8 ','VP8L','VP8X','ALPH'].includes(type)||offset+8+size>bytes.length) return false;
    if(type==='VP8 '||type==='VP8L') image=true;
    offset+=8+size+(size%2);
  }
  return image && offset===bytes.length;
}
