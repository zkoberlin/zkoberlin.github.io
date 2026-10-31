/* Curated photographs: exact movement matches, locally hosted, with source credits. */
window.ExercisePhotos=(()=>{
 const root='/assets/images/exercises/',sha='f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
 const pairs=(id,label)=>[0,1].map((n)=>({src:root+id+'-'+n+'.jpg',caption:label+' · Position '+(n+1)}));
 const entry=(id,label,note='')=>({images:pairs(id,label),author:'Free Exercise DB · Yuhonas und Mitwirkende',source:'https://github.com/yuhonas/free-exercise-db/tree/'+sha+'/exercises/'+id,license:'https://unlicense.org/',licenseName:'Public Domain / Unlicense',note});
 const photos={
  legpress:entry('Leg_Press','Beinpresse','Beispiel einer schrägen Beinpresse. Gerätebauart und Einstellung können im Studio abweichen.'),
  chest:entry('Leverage_Chest_Press','Brustpresse'),
  lat:entry('Wide-Grip_Lat_Pulldown','Latzug vor dem Körper'),
  calf:entry('Standing_Calf_Raises','Wadenheben','Gezeigt ist die stehende Gerätevariante. Dein Plan legt keine bestimmte Wadenmaschine fest.'),
  pallof:entry('Pallof_Press','Pallof Press'),
  step:entry('Dumbbell_Step_Ups','Step-up','Das Foto zeigt die Variante mit Hanteln und höherer Bank. Für deinen niedrigen Step-up eine niedrige stabile Stufe verwenden; die Hanteln im Foto sind keine Gewichtsvorgabe.'),
  row:entry('Leverage_Iso_Row','Sitzendes Rudern am Gerät','Beispiel einer brustgestützten Rudermaschine. Griff und Gerätebauart können abweichen.'),
  side:entry('Side_Bridge','Seitstütz'),
  deadbug:entry('Dead_Bug','Dead Bug'),
  balance:{images:[{src:root+'Single_Leg_Balance.png',caption:'Einbeinstand · Beispielhaltung'}],author:'Augustine11 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:SCAT_Balance_Testing_One_Leg_Stance.png',license:'https://creativecommons.org/licenses/by-sa/3.0/',licenseName:'CC BY-SA 3.0 · unverändert',note:'Die Aufnahme stammt aus einer Balanceprüfung. Für dein Training mit offenen Augen und erreichbarem Halt üben; keine Testanweisung übernehmen.'}
 };
 photos.incline=entry('Leverage_Incline_Chest_Press','Schräg-Brustpresse');
 photos.chestchoice={...photos.incline,images:[...pairs('Leverage_Incline_Chest_Press','Schräg-Brustpresse'),...pairs('Leverage_Chest_Press','Brustpresse als Alternative')],source:'https://github.com/yuhonas/free-exercise-db/tree/'+sha+'/exercises',note:'Dein Plan erlaubt Schräg-Brustpresse oder Brustpresse. Die Fotos zeigen beide Varianten; sie sind keine zwei zusätzlich auszuführenden Übungen.'};
 const aliases={'beinpresse':'legpress','brustpresse':'chest','latzug':'lat','wadenheben':'calf','pallof press':'pallof','niedriger step up':'step','step ups':'step','step up':'step','rudern am gerät':'row','rudern':'row','rudermaschine':'row','sitzendes rudern':'row','schräg brustpresse oder brustpresse':'chestchoice','schrägbank brustpresse':'incline','schräg brustpresse':'incline','seitstütz':'side','side plank':'side','einbeinstand':'balance','dead bug':'deadbug'};
 const key=name=>String(name||'').normalize('NFC').toLocaleLowerCase('de').replace(/[–—_-]/g,' ').replace(/\s+/g,' ').trim().replace(/ je seite$/,'');
 return Object.freeze({get:name=>photos[aliases[key(name)]]||null});
})();
