// Shared by the browser and the scheduling tests. No personal defaults.
(() => {
  const dateOK = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
  const addDays = (d,n) => {const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
  function valid(p) {
    return !!p && typeof p.name==='string' && p.name.trim().length>0 && p.name.length<=160 && dateOK(p.startDate) && Number.isInteger(p.weeks) && p.weeks>=1 && p.weeks<=12 && Array.isArray(p.days) && p.days.length>=2 && p.days.length<=4 && new Set(p.days).size===p.days.length && p.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6) && typeof p.notes==='string' && p.notes.length<=2000 && Array.isArray(p.exercises) && p.exercises.length>=1 && p.exercises.length<=12 && p.exercises.every(e=>e && typeof e.name==='string'&&e.name.trim()&&e.name.length<=100&&Number.isInteger(e.sets)&&e.sets>=1&&e.sets<=6&&typeof e.reps==='string'&&e.reps.length>0&&e.reps.length<=30&&(e.weight===null||Number.isFinite(e.weight)&&e.weight>=0&&e.weight<=1000));
  }
  function next(plan,workouts,today) {
    if(!valid(plan?.data)||!dateOK(today))return null;
    const p=plan.data;
    const history=workouts.filter(r=>r.data.date>=p.startDate&&r.data.date<=today&&(!r.data.planRevision||r.data.planRevision===plan.revision)).sort((a,b)=>a.data.date.localeCompare(b.data.date)||a.updatedAt.localeCompare(b.updatedAt));
    const latest=history.at(-1),total=p.weeks*p.days.length,done=history.length;
    let date=[today,p.startDate,latest?addDays(latest.data.date,2):p.startDate].sort().at(-1);
    for(let i=0;i<14&&!p.days.includes(new Date(date+'T12:00:00Z').getUTCDay());i++)date=addDays(date,1);
    const recent=[...workouts].filter(r=>r.data.date<=today).sort((a,b)=>b.data.date.localeCompare(a.data.date)||b.updatedAt.localeCompare(a.updatedAt));
    const exercises=p.exercises.map(e=>{const previous=recent.flatMap(r=>r.data.exercises).find(x=>x.name===e.name);return {...e,weight:previous?.weight??e.weight};});
    return {date,done,total,finished:done>=total,week:Math.min(p.weeks,Math.floor(done/p.days.length)+1),exercises};
  }
  function shopping(recipes,selected,portions){
    const groups=new Map(),count=Math.max(1,Math.min(8,Number(portions)||1));
    for(const r of recipes.filter(r=>selected.includes(r.id)))for(const [amount,label] of r.ingredients){
      const match=label.match(/^(g|ml) (.+)$/),unit=match?.[1]||'',name=match?.[2]||label,key=unit+'|'+name.toLocaleLowerCase('de-DE');
      const old=groups.get(key)||{key,name,unit,amount:0};old.amount+=amount*count;groups.set(key,old);
    }
    for(const r of recipes.filter(r=>selected.includes(r.id)))for(const name of r.pantry||[]){const key='vorrat|'+name.toLocaleLowerCase('de-DE');if(!groups.has(key))groups.set(key,{key,name,unit:'',amount:null});}
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'de'));
  }
  globalThis.TrainingPlan=Object.freeze({valid,next,addDays,shopping});
})();
