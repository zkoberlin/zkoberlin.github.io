import test from 'node:test';
import assert from 'node:assert/strict';
import '../../../assets/js/training-plan.js';
import {validRecord} from '../src/life.js';
const data={name:'Start',startDate:'2026-10-31',weeks:4,days:[1,3,5],notes:'',exercises:[{name:'Rudern',sets:2,reps:'12–15',weight:20}]};
const plan={data,revision:1};
const workout=(date,weight=30,revision)=>({data:{date,exercises:[{name:'Rudern',sets:2,reps:'12',weight}],...(revision?{planRevision:revision}:{})},updatedAt:date});
test('first session follows selected weekdays',()=>{assert.equal(TrainingPlan.next(plan,[],'2026-10-31').date,'2026-11-02');});
test('rest day and last weights are respected',()=>{const n=TrainingPlan.next(plan,[workout('2026-10-31',40)],'2026-11-01');assert.equal(n.date,'2026-11-02');assert.equal(n.exercises[0].weight,40);assert.equal(n.done,1);assert.equal(n.total,12);});
test('missed days do not accumulate catch-up workouts',()=>{assert.equal(TrainingPlan.next(plan,[workout('2026-10-31')],'2026-11-10').date,'2026-11-11');});
test('new plan excludes old plan completions but retains weight reference',()=>{const n=TrainingPlan.next({...plan,revision:2},[workout('2026-11-02',45,1)],'2026-11-04');assert.equal(n.done,0);assert.equal(n.exercises[0].weight,45);});
test('plan completes after planned sessions',()=>{const n=TrainingPlan.next({...plan,data:{...data,weeks:1,days:[1,3]}},[workout('2026-11-02'),workout('2026-11-04')],'2026-11-05');assert.equal(n.finished,true);});
test('frontend and server reject malformed plans',()=>{for(const p of [{...data,days:[1,1]},{...data,startDate:'2026-02-30'},{...data,exercises:[]},{...data,weeks:0}]){assert.equal(Boolean(TrainingPlan.valid(p)),false);assert.equal(Boolean(validRecord('plan',p)),false);}assert.equal(Boolean(validRecord('plan',data)),true);});
test('shopping list scales and combines identical ingredients',()=>{const recipes=[{id:'a',ingredients:[[100,'g Tomaten'],[5,'g Öl']]},{id:'b',ingredients:[[50,'g Tomaten'],[10,'ml Sojasauce']]}];const list=TrainingPlan.shopping(recipes,['a','b'],3);assert.equal(list.find(i=>i.name==='Tomaten').amount,450);assert.equal(list.find(i=>i.name==='Öl').amount,15);assert.equal(list.find(i=>i.name==='Sojasauce').amount,30);assert.equal(TrainingPlan.shopping(recipes,[],3).length,0);});
test('each recipe has its own serving count',()=>{const list=TrainingPlan.shopping([{id:'a',ingredients:[[100,'g Reis']]},{id:'b',ingredients:[[50,'g Reis']]}],['a','b'],{a:2,b:4});assert.equal(list[0].amount,400);});
test('meal import scales numeric amounts but retains ambiguous original quantities',()=>{const r=TrainingPlan.fromMeal({id:'mealdb_1',name:'Meal',image:'',source:'https://www.themealdb.com/meal/1',method:'Cook',ingredients:[{name:'Rice',measure:'1/2 kg'},{name:'Oil',measure:'2 tbsp'},{name:'Pepper',measure:'to taste'}]},4);assert.deepEqual(r.ingredients,[[125,'g Rice'],[.5,'EL Oil']]);assert.equal(r.unscaled[0],'Pepper · to taste');assert.equal(Boolean(validRecord('recipe',r)),true);});
test('A/B/C sessions rotate and main sets progress without automatic weight increases',()=>{const p={...plan,data:{...data,sessions:[{id:'A',name:'A',exercises:data.exercises},{id:'B',name:'B',exercises:[{name:'Latzug',sets:2,reps:'12',weight:30}]}],progressionEnabled:true}};const n=TrainingPlan.next(p,[workout('2026-10-31'),workout('2026-11-02'),workout('2026-11-04')],'2026-11-05');assert.equal(n.sessionId,'B');assert.equal(n.week,2);assert.equal(n.exercises[0].sets,3);assert.equal(n.exercises[0].weight,30);});
test('editing the same cycle does not reset training progress',()=>{const p={...plan,revision:3,data:{...data,cycleId:'same-cycle'}};const w={...workout('2026-11-02',35,2),data:{...workout('2026-11-02',35,2).data,planCycle:'same-cycle'}};assert.equal(TrainingPlan.next(p,[w],'2026-11-04').done,1);});
test('completed A always leads to B in the A/B/C rotation',()=>{const p={...plan,data:{...data,cycleId:'cycle',sessions:['A','B','C'].map(id=>({id,name:id,exercises:data.exercises}))}};const first=workout('2026-10-31');first.data.sessionId='A';first.data.planCycle='cycle';assert.equal(TrainingPlan.next(p,[first],'2026-10-31').sessionId,'B');});
test('actual per-set performance is validated without breaking old workouts',()=>{const e={name:'Rudern',sets:2,reps:'12',weight:40,setDetails:[{weight:40,reps:'12',done:true},{weight:35,reps:'15',done:true}]};assert.equal(Boolean(validRecord('workout',{date:'2026-10-31',notes:'',exercises:[e]})),true);assert.equal(Boolean(validRecord('workout',{date:'2026-10-31',notes:'',exercises:[{...e,setDetails:[{weight:-1,reps:'12',done:true}]}]})),false);});

test('additional activities validate duration and optional tracker data',()=>{
 const activity={date:'2026-10-31',type:'Radfahren',durationMinutes:35,distanceKm:8.2,activeKcal:null,notes:'Arbeitsweg'};
 assert.equal(Boolean(validRecord('activity',activity)),true);
 for(const patch of [{durationMinutes:0},{durationMinutes:Infinity},{distanceKm:-2},{activeKcal:-1},{type:'unknown'},{date:'2026-02-30'}])assert.equal(Boolean(validRecord('activity',{...activity,...patch})),false);
 assert.equal(Boolean(validRecord('activity',{...activity,distanceKm:null,activeKcal:250})),true);
 assert.equal(Boolean(validRecord('workout',activity)),false);
});
test('JSON import supports canonical and original chat schemas without invented weights',()=>{
 const original={plan:{name:'Chatplan',duration_weeks:4,schedule:{monday:'A',wednesday:'B',friday:'C'},workouts:[{id:'A',name:'Kraft',exercises:[{name:'Plank',sets:2,duration_seconds:45},{name:'Rudern',sets:2,reps:12,weight_kg:40}]},{id:'B',name:'Stabilität',exercises:[{name:'Step-ups',sets:2,reps:10,per_leg:true,weight_kg:null}]}]}};
 const imported=TrainingPlan.fromJSON(original,{startDate:'2026-11-02',cycleId:'new-cycle'});assert.deepEqual(imported.days,[1,3,5]);assert.equal(imported.sessions[0].exercises[0].reps,'45 Sekunden');assert.equal(imported.sessions[0].exercises[0].weight,null);assert.equal(imported.sessions[1].exercises[0].reps,'10 je Bein');assert.equal(imported.sessions[0].exercises[1].weight,40);assert.equal(Boolean(validRecord('plan',imported)),true);assert.equal(TrainingPlan.fromJSON(data,{startDate:'2026-11-04',cycleId:'x'}).startDate,'2026-11-04');
 for(const input of [null,[],{plan:{name:'Broken',workouts:[]}}, {...data,days:[1,1]}, {...data,sessions:[{id:'',name:'Empty ID',exercises:data.exercises}] }])assert.throws(()=>TrainingPlan.fromJSON(input,{startDate:'2026-11-02'}));
});
test('new JSON cycle excludes old untagged records; updating retains the current cycle',()=>{const p={...plan,data:{...data,strictCycle:true,cycleId:'new'}};assert.equal(TrainingPlan.next(p,[workout('2026-10-31')],'2026-10-31').done,0);const old={...workout('2026-10-31'),data:{...workout('2026-10-31').data,planCycle:'keep',sessionId:'A'}};const imported=TrainingPlan.fromJSON({...data,cycleId:'keep',sessions:['A','B','C'].map(id=>({id,name:id,exercises:data.exercises}))},{cycleId:'keep',startDate:'2026-10-31'});assert.equal(TrainingPlan.next({data:imported,revision:2},[old],'2026-10-31').sessionId,'B');});

test('one-off date can move outside regular days without advancing the workout',()=>{
 const p={...plan,data:{...data,cycleId:'cycle'}};
 const done={...workout('2026-11-02'),id:'last'};done.data.planCycle='cycle';
 const rescheduled=TrainingPlan.withNextDate(p,[done],'2026-11-03','2026-11-06');
 const next=TrainingPlan.next({data:rescheduled,revision:2},[done],'2026-11-03');
 assert.equal(next.date,'2026-11-06');assert.equal(next.done,1);assert.equal(next.dateOverridden,true);
 assert.ok(validRecord('plan',rescheduled));
 assert.throws(()=>TrainingPlan.withNextDate(p,[done],'2026-11-03','2026-11-03'),/04\.11\.2026/);
 const later={...workout('2026-11-04'),id:'later'};later.data.planCycle='cycle';
 assert.equal(TrainingPlan.next({data:rescheduled,revision:2},[done,later],'2026-11-04').dateOverridden,false);
 assert.equal(TrainingPlan.next({data:rescheduled,revision:2},[done],'2026-11-07').dateOverridden,false);
});
test('saving and resetting a date retains progress of plans predating cycle IDs',()=>{
 const log=[{...workout('2026-11-02',30,1),id:'legacy'}];
 const data=TrainingPlan.withNextDate(plan,log,'2026-11-03','2026-11-07');
 const updated={data,revision:2};
 assert.equal(TrainingPlan.next(updated,log,'2026-11-03').done,1);
 const reset=TrainingPlan.withNextDate(updated,log,'2026-11-03',null);
 assert.equal(TrainingPlan.next({data:reset,revision:3},log,'2026-11-03').done,1);
 assert.equal(TrainingPlan.next({data:reset,revision:3},log,'2026-11-03').date,'2026-11-04');
});
