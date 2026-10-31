// Public catalogue queries only. Never forward Hub credentials or fitness profiles.
const cache=new Map(),pending=new Map();
async function publicJSON(url){
 const key=url.toString(),old=cache.get(key);if(old&&old.until>Date.now())return old.data;if(pending.has(key))return pending.get(key);
 const result=(async()=>{const r=await fetch(key,{headers:{Accept:'application/json','User-Agent':'PaulHub/1.0 personal cookbook and exercise reference'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Provider unavailable');const data=await r.json();if(cache.size>=60)cache.delete(cache.keys().next().value);cache.set(key,{data,until:Date.now()+3600000});return data;})();
 pending.set(key,result);try{return await result;}finally{pending.delete(key);}
}
const safeLicense=value=>{const url=String(value||'').replace(/^http:/,'https:').replace(/^\/\//,'https:');return /^https:\/\/creativecommons\.org\//.test(url)?url:'https://commons.wikimedia.org/';};
const short=(v,n=200)=>String(v||'').slice(0,n);
export function wikiText(text){return String(text||'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi,'').replace(/<!--[^]*?-->/g,'').replace(/\{\{[^]*?\}\}/g,'').replace(/\[\[(?:Datei|File|Bild|Kategorie):[^\]]*\]\]/gi,'').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g,'$1').replace(/<[^>]*>/g,'').replace(/'{2,5}/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();}
async function commonsExercise(q){const files={'Latzug':'File:PulldownMachineExercise.JPG','Rudern':'File:Cable-seated-rows-1.png','Rudermaschine':'File:Cable-seated-rows-1.png','Seitstütz':'File:Side Plank.jpg'};if(!files[q])return null;const data=await publicJSON(new URL('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'400',titles:files[q]}))),i=Object.values(data.query?.pages||{})[0]?.imageinfo?.[0],m=i?.extmetadata;if(!i||!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(i.thumburl||i.url||'')||!/^CC/.test(m?.LicenseShortName?.value||''))return null;return{image:i.thumburl||i.url,name:q,author:short(wikiText(m.Artist?.value||'Wikimedia-Mitwirkende'),200),license:safeLicense(m.LicenseUrl?.value),licenseName:m.LicenseShortName.value,source:i.descriptionurl,provider:'Wikimedia Commons'};}
async function media(q){
 const aliases={'Beinbeuger-Maschine':'Beinbeuger','Wadenheben':'Beidbeiniges Wadenheben'};
 const catalogue=await publicJSON(new URL('https://wger.de/api/v2/exercise-translation/?language=1&limit=1000'));
 const target=aliases[q]||q;let match=(catalogue.results||[]).find(e=>e.name.toLocaleLowerCase('de')===target.toLocaleLowerCase('de'));
 const verifiedIds={'Seitstütz':580,'Glute Bridge':265,'Glute Bridge einbeinig':1740,'Step-ups':981};if(!match&&verifiedIds[q])match={exercise:verifiedIds[q],name:q};
 if(!match){const fallback=await commonsExercise(q);if(fallback)return fallback;}
 if(!match)return{image:null,provider:'wger',reason:'Kein eindeutig passendes Übungsbild verfügbar.'};
 const exercise=await publicJSON(new URL('https://wger.de/api/v2/exerciseinfo/'+match.exercise+'/'));
 const images=(exercise.images||[]).filter(i=>!i.is_ai_generated&&/^https:\/\/wger\.de\/media\//.test(i.image||''));
 const licences=await publicJSON(new URL('https://wger.de/api/v2/license/?limit=100'));
 const pick=images.find(i=>(licences.results||[]).some(l=>l.id===i.license&&/creativecommons.org/.test(l.url||'')));if(!pick){const fallback=await commonsExercise(q);if(fallback)return fallback;}if(!pick)return{image:null,provider:'wger',reason:'Kein passendes frei nutzbares Bild vorhanden.'};
 const license=(licences.results||[]).find(l=>l.id===pick.license);
 return{image:pick.thumbnails?.medium||pick.image,name:match.name,author:short(pick.license_author||exercise.license_author,150),license:safeLicense(license.url),licenseName:license.short_name,source:'https://wger.de/de/exercise/'+match.exercise+'/view/',provider:'wger'};
}
export async function discover(request,respond){const url=new URL(request.url),q=(url.searchParams.get('q')||'').trim();if(request.method!=='GET')return respond({error:'Methode nicht erlaubt'},405);if(q.length>60)return respond({error:'Suchbegriff zu lang'},400);
 if(url.pathname==='/life/exercise-media')return respond(await media(q),200);
 const data=await publicJSON(new URL('https://wger.de/api/v2/exercise-translation/?language=1&limit=1000'));
 return respond({exercises:(data.results||[]).filter(e=>!q||e.name.toLocaleLowerCase('de').includes(q.toLocaleLowerCase('de'))).slice(0,20).map(e=>({id:e.exercise,name:short(e.name,100),author:short(e.license_author,100)})),provider:'wger'},200);
}
