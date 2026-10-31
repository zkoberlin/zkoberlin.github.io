// Shared by the browser and the scheduling tests. No personal defaults.
(() => {
  const dateOK = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
  const addDays = (d,n) => {const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
  const exercisesOK=list=>Array.isArray(list)&&list.length>=1&&list.length<=12&&list.every(e=>e&&typeof e.name==='string'&&e.name.trim()&&e.name.length<=100&&Number.isInteger(e.sets)&&e.sets>=1&&e.sets<=6&&typeof e.reps==='string'&&e.reps.length>0&&e.reps.length<=30&&(e.weight===null||Number.isFinite(e.weight)&&e.weight>=0&&e.weight<=1000));
  function valid(p) {
    return !!p && (p.sessions===undefined || Array.isArray(p.sessions)&&p.sessions.length>=1&&p.sessions.length<=7&&p.sessions.every(s=>typeof s.id==='string'&&s.id.length<=20&&typeof s.name==='string'&&s.name.length<=160&&exercisesOK(s.exercises))) && typeof p.name==='string' && p.name.trim().length>0 && p.name.length<=160 && dateOK(p.startDate) && Number.isInteger(p.weeks) && p.weeks>=1 && p.weeks<=12 && Array.isArray(p.days) && p.days.length>=2 && p.days.length<=4 && new Set(p.days).size===p.days.length && p.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6) && typeof p.notes==='string' && p.notes.length<=2000 && Array.isArray(p.exercises) && p.exercises.length>=1 && p.exercises.length<=12 && p.exercises.every(e=>e && typeof e.name==='string'&&e.name.trim()&&e.name.length<=100&&Number.isInteger(e.sets)&&e.sets>=1&&e.sets<=6&&typeof e.reps==='string'&&e.reps.length>0&&e.reps.length<=30&&(e.weight===null||Number.isFinite(e.weight)&&e.weight>=0&&e.weight<=1000));
  }
  function next(plan,workouts,today) {
    if(!valid(plan?.data)||!dateOK(today))return null;
    const p=plan.data;
    const history=workouts.filter(r=>r.data.date>=p.startDate&&r.data.date<=today&&(p.cycleId?(p.strictCycle?r.data.planCycle===p.cycleId:(!r.data.planCycle||r.data.planCycle===p.cycleId)):(!r.data.planRevision||r.data.planRevision===plan.revision))).sort((a,b)=>a.data.date.localeCompare(b.data.date)||a.updatedAt.localeCompare(b.updatedAt));
    const latest=history.at(-1),total=p.weeks*p.days.length,done=history.length;
    let date=[today,p.startDate,latest?addDays(latest.data.date,2):p.startDate].sort().at(-1);
    for(let i=0;i<14&&!p.days.includes(new Date(date+'T12:00:00Z').getUTCDay());i++)date=addDays(date,1);
    const recent=[...workouts].filter(r=>r.data.date<=today).sort((a,b)=>b.data.date.localeCompare(a.data.date)||b.updatedAt.localeCompare(a.updatedAt));
    const previousIndex=p.sessions?.findIndex(s=>s.id===latest?.data.sessionId)??-1;
    const session=p.sessions?.[previousIndex>=0?(previousIndex+1)%p.sessions.length:done%p.sessions.length];
    const week=Math.min(p.weeks,Math.floor(done/p.days.length)+1);
    const exercises=(session?.exercises||p.exercises).map(e=>{const previous=recent.flatMap(r=>r.data.exercises).find(x=>x.name===e.name);const main=['Beinpresse','Brustpresse','Latzug','Rudern','Rudermaschine'].includes(e.name);return {...e,sets:p.progressionEnabled&&week>=2&&main?3:e.sets,weight:previous?.weight??e.weight};});
    return {date,done,total,finished:done>=total,week,sessionId:session?.id||null,sessionName:session?.name||'Ganzkörper',exercises};
  }
  function fromJSON(input,{startDate,cycleId}={}) {
    const p=input?.plan||input;
    if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Die Datei enthält keinen Trainingsplan.');
    let result;
    if(Array.isArray(p.exercises)&&p.weeks!==undefined){result=JSON.parse(JSON.stringify(p));if(startDate)result.startDate=startDate;}
    else if(Array.isArray(p.workouts)){
      const weekdays={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
      const days=Object.keys(weekdays).filter(k=>typeof p.schedule?.[k]==='string'&&p.schedule[k].trim()).map(k=>weekdays[k]);
      const sessions=p.workouts.map(s=>({id:String(s.id||''),name:String(s.name||''),exercises:(s.exercises||[]).map(e=>{
        const duration=e.duration_seconds;
        if(e.reps===undefined&&duration===undefined)throw Error('Wiederholungen oder Dauer fehlen bei '+String(e.name||'einer Übung')+'.');
        if(duration!==undefined&&(!Number.isFinite(duration)||duration<=0))throw Error('Die Übungsdauer muss positiv sein.');
        if(typeof e.reps==='number'&&(!Number.isFinite(e.reps)||e.reps<=0))throw Error('Wiederholungen müssen positiv sein.');
        const reps=duration!==undefined?String(duration)+' Sekunden':String(e.reps);
        return {name:String(e.name||''),sets:e.sets,reps:reps+(e.per_leg?' je Bein':e.per_side?' je Seite':''),weight:e.weight_kg??null,hint:[e.note,e.intensity==='light'?'Leicht beginnen':'',e.requires_pain_free_movement?'Nur schmerzfrei ausführen':''].filter(Boolean).join(' · ')};
      })}));
      result={name:p.name,startDate:startDate||p.startDate,weeks:p.duration_weeks,days,notes:typeof p.notes==='string'?p.notes:(Array.isArray(p.goals)?p.goals.join(' · '):''),sessions,exercises:sessions[0]?.exercises||[],progressionEnabled:false};
      if(p.progression?.length)result.notes+=(result.notes?'\n':'')+'Wochenhinweise: '+p.progression.map(w=>'Woche '+w.week+': '+[w.focus,w.note].filter(Boolean).join(' · ')).join('; ')+'. Satz- und Gewichtsänderungen bitte als aktualisierte JSON übernehmen.';
    }else throw Error('Unbekanntes Format. Bitte die JSON-Vorlage verwenden oder deinen bisherigen Plan mit „workouts“ hochladen.');
    if(cycleId)result.cycleId=cycleId;
    if(!valid(result))throw Error('Bitte Planname, Startdatum, 2–4 verschiedene Trainingstage, 1–12 Übungen pro Einheit sowie Sätze, Wiederholungen und Gewichte prüfen.');
    if(result.sessions?.some(s=>!s.id.trim()))throw Error('Jede Einheit braucht eine ID, zum Beispiel A oder B.');
    if(result.sessions&&new Set(result.sessions.map(s=>s.id)).size!==result.sessions.length)throw Error('Die Einheiten müssen unterschiedliche IDs haben.');
    if(JSON.stringify(result).length>45000)throw Error('Der Plan ist zu umfangreich. Bitte Hinweise kürzen.');
    return result;
  }

  function shopping(recipes,selected,portions){
    const groups=new Map();
    const countFor=id=>Math.max(1,Math.min(12,Number(typeof portions==='object'?portions[id]:portions)||1));
    for(const r of recipes.filter(r=>selected.includes(r.id)))for(const [amount,label] of r.ingredients){
      const match=label.match(/^(g|ml|kg|l|TL|EL|Tasse|Stück) (.+)$/),unit=match?.[1]||'',name=match?.[2]||label,key=unit+'|'+name.toLocaleLowerCase('de-DE');
      const old=groups.get(key)||{key,name,unit,amount:0};old.amount+=amount*countFor(r.id);groups.set(key,old);
    }
    for(const r of recipes.filter(r=>selected.includes(r.id)))for(const name of r.pantry||[]){const key='vorrat|'+name.toLocaleLowerCase('de-DE');if(!groups.has(key))groups.set(key,{key,name,unit:'',amount:null});}
    for(const r of recipes.filter(r=>selected.includes(r.id)))for(const name of r.unscaled||[]){const key='unskaliert|'+name.toLocaleLowerCase('de-DE');if(!groups.has(key))groups.set(key,{key,name:r.name+': '+name,unit:'',amount:null,unscaled:true});}
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'de'));
  }
  function fromMeal(recipe,baseServings){
    const ingredients=[],unscaled=[];
    for(const item of recipe.ingredients){
      const measure=item.measure.replace(/½/g,'1/2').replace(/¼/g,'1/4').replace(/¾/g,'3/4').replace(/⅓/g,'1/3').replace(/⅔/g,'2/3').replace(/(\d),(\d)/g,'$1.$2').trim();
      const m=measure.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/);
      if(!m){unscaled.push(item.name+(item.measure?' · '+item.measure:''));continue;}
      const pieces=m[1].split(/\s+/),fraction=x=>x.includes('/')?Number(x.split('/')[0])/Number(x.split('/')[1]):Number(x);let n=pieces.reduce((a,x)=>a+fraction(x),0);
      if(!Number.isFinite(n)||n<=0){unscaled.push(item.name+' · '+item.measure);continue;}
      let unit=m[2].trim();const unitMap={grams:'g',gram:'g',g:'g',kg:'kg',ml:'ml',litre:'l',litres:'l',l:'l',tsp:'TL',teaspoon:'TL',teaspoons:'TL',tbsp:'EL',tablespoon:'EL',tablespoons:'EL',cup:'Tasse',cups:'Tasse'};unit=unitMap[unit.toLowerCase()]||unit;
      if(unit==='kg'){unit='g';n*=1000;}if(unit==='l'){unit='ml';n*=1000;}
      ingredients.push([n/baseServings,(unit?unit+' ':'')+item.name]);
    }
    return {id:recipe.id,name:recipe.name,image:recipe.image,imageAttribution:recipe.imageAttribution||'',imageLicense:recipe.imageLicense||'',source:recipe.source,attribution:recipe.attribution||'',license:recipe.license||'',language:recipe.language||'en',method:recipe.method,baseServings,ingredients,unscaled,pantry:[],minutes:null,kcal:null,protein:null,veggie:recipe.category==='Vegetarian'||recipe.category==='Vegan',storage:'Aufbewahrung für dieses externe Rezept nicht geprüft.'};
  }
  globalThis.TrainingPlan=Object.freeze({valid,next,addDays,shopping,fromMeal,fromJSON});
})();
