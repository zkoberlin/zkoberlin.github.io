(() => {
 let epoch=0;
 async function load(){
  const current=++epoch,j=document.getElementById('journalPreview'),f=document.getElementById('fitnessPreview');
  j.textContent='Nach Anmeldung verfügbar';f.textContent='Nach Anmeldung verfügbar';if(!HubAuth.isSignedIn())return;
  try{
   const [journal,workouts,measurements,plans]=await Promise.all(['journal','workout','measurement','plan'].map(LifeAPI.list));if(current!==epoch)return;
   const last=journal.sort((a,b)=>b.data.date.localeCompare(a.data.date))[0],weight=measurements.sort((a,b)=>b.data.date.localeCompare(a.data.date))[0],plan=plans.find(r=>r.id==='active'),next=TrainingPlan.next(plan,workouts,LifeAPI.today());
   j.textContent=last?'Letzter Eintrag: '+LifeAPI.date(last.data.date):'Platz für deinen ersten Eintrag';
   const date=next?new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Berlin'}).format(new Date(next.date+'T12:00:00Z')):null;
   f.textContent=next&&!next.finished?'Nächstes Training: '+date+(next.sessionId?' · '+next.sessionId:''):next?.finished?'Trainingsplan abgeschlossen':'Noch kein Trainingsplan gespeichert';
   if(weight)f.textContent+=' · '+weight.data.weight.toLocaleString('de-DE')+' kg';
  }catch{if(current===epoch){j.textContent='Vorschau momentan nicht verfügbar';f.textContent='Vorschau momentan nicht verfügbar';}}
 }
 window.addEventListener('hub-auth-change',load);load();
})();
