// Only public search terms leave the gateway. Hub credentials and profiles stay here.
const cache=new Map();
async function publicJSON(url){const key=url.toString(),cacheable=!url.pathname.endsWith('/random.php'),old=cacheable?cache.get(key):null;if(old&&old.until>Date.now())return old.data;const r=await fetch(key,{headers:{Accept:'application/json','User-Agent':'PaulHub-personal-project/1.0'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Provider unavailable');const data=await r.json();if(cache.size>=40)cache.delete(cache.keys().next().value);if(cacheable)cache.set(key,{data,until:Date.now()+3600000});return data;}
const short=(x,n=200)=>String(x||'').slice(0,n);
export async function discover(request,respond){
 const url=new URL(request.url),q=(url.searchParams.get('q')||'').trim();if(request.method!=='GET')return respond({error:'Methode nicht erlaubt'},405);if(q.length>60)return respond({error:'Suchbegriff zu lang'},400);
 if(url.pathname==='/life/discover-recipes'){
  const translations={hähnchen:'chicken',huhn:'chicken',lachs:'salmon',fisch:'fish',linsen:'lentil',bohnen:'bean',reis:'rice',nudeln:'pasta',rind:'beef',kartoffeln:'potato',ei:'egg',tofu:'tofu'};
  const endpoint=new URL('https://www.themealdb.com/api/json/v1/1/'+(q?'search.php':'random.php'));if(q)endpoint.searchParams.set('s',translations[q.toLowerCase()]||q);
  const data=await publicJSON(endpoint);const recipes=(data.meals||[]).slice(0,18).map(m=>({id:'mealdb_'+m.idMeal,name:short(m.strMeal,160),image:/^https:\/\/www\.themealdb\.com\/images\/media\/meals\//.test(m.strMealThumb||'')?m.strMealThumb:'',category:short(m.strCategory,60),area:short(m.strArea,60),method:short(m.strInstructions,16000),ingredients:Array.from({length:20},(_,i)=>({name:short(m['strIngredient'+(i+1)],150).trim(),measure:short(m['strMeasure'+(i+1)],100).trim()})).filter(i=>i.name),source:'https://www.themealdb.com/meal/'+encodeURIComponent(m.idMeal)}));
  return respond({recipes,provider:'TheMealDB',language:'en'},200);
 }
 const data=await publicJSON(new URL('https://wger.de/api/v2/exercise-translation/?language=1&limit=1000'));
 return respond({exercises:(data.results||[]).filter(e=>!q||e.name.toLocaleLowerCase('de').includes(q.toLocaleLowerCase('de'))).slice(0,20).map(e=>({id:e.exercise,name:short(e.name,100),author:short(e.license_author,100)})),provider:'wger'},200);
}
