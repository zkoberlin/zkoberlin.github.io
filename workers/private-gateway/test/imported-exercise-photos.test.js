import test from 'node:test';
import assert from 'node:assert/strict';
import '../../../assets/js/training-plan.js';
import {validRecord} from '../src/life.js';
const exercise={name:'Testbewegung',sets:2,reps:'10',weight:null,photoId:'demo',hint:'Gerät kann abweichen.'};
const pair={images:[{src:'https://example.org/start.jpg',caption:'Startposition'},{src:'https://example.org/end.jpg',caption:'Endposition'}],source:'https://example.org/exercise',author:'Testquelle',license:'Unlicense'};
const makePlan=()=>({name:'Fototest',startDate:'2026-11-01',weeks:4,days:[1,4,6],notes:'',exercises:[structuredClone(exercise)],sessions:[{id:'A',name:'Test A',exercises:[structuredClone(exercise)]}],photoCatalog:{demo:structuredClone(pair)}});
test('catalog photos survive import, serialization and next-session calculation',()=>{
 const input=makePlan(),copy=structuredClone(input),imported=TrainingPlan.fromJSON(input,{cycleId:'existing'});
 assert.deepEqual(input,copy);assert.ok(TrainingPlan.valid(imported));assert.ok(validRecord('plan',imported));
 const stored=JSON.parse(JSON.stringify(imported));
 const next=TrainingPlan.next({data:stored,revision:2},[],'2026-11-02');
 const photos=TrainingPlan.photosFor(next.exercises[0],stored);
 assert.deepEqual(photos.images,pair.images);assert.equal(photos.license,'https://unlicense.org/');assert.match(photos.note,/Gerät/);
 assert.ok(TrainingPlan.photosFor({name:'Gespeichert',photos},null));
});
test('inline photos work without a catalog; missing credits remain optional',()=>{
 const p=makePlan();delete p.photoCatalog;for(const e of [p.exercises[0],p.sessions[0].exercises[0]]){delete e.photoId;e.photos={images:[{src:'/assets/images/exercises/Example-0.jpg'}]};}
 assert.ok(TrainingPlan.valid(p));const photo=TrainingPlan.photosFor(p.exercises[0],p);
 assert.equal(photo.images[0].caption,'Startposition');assert.equal(photo.source,'');assert.equal(photo.license,'');
});
test('unsafe image or attribution URLs cannot reach the renderer, including stored records',()=>{
 for(const src of ['javascript:alert(1)','data:image/svg+xml,test','http://example.org/photo.jpg','//example.org/photo.jpg','https://user:password@example.org/a.jpg','/assets/images/exercises/../../other.jpg','https:\\example.org/a.jpg']){
  const p=makePlan();p.photoCatalog.demo.images[0].src=src;
  assert.equal(TrainingPlan.valid(p),false,src);assert.throws(()=>TrainingPlan.fromJSON(p),/Übungsfotos/);assert.equal(TrainingPlan.photosFor(p.exercises[0],p),null);
 }
 const p=makePlan();p.photoCatalog.demo.source='javascript:alert(1)';assert.equal(TrainingPlan.photosFor(p.exercises[0],p),null);
 p.photoCatalog.demo=structuredClone(pair);p.photoCatalog.demo.license='javascript:alert(1)';assert.equal(TrainingPlan.photosFor(p.exercises[0],p).license,'');
});
test('broken references, excessive galleries and invalid labels reject import',()=>{
 for(const modify of [p=>{p.exercises[0].photoId='missing';},p=>{p.photoCatalog.demo.images=Array(5).fill(pair.images[0]);},p=>{p.photoCatalog.demo.images[0].caption=42;},p=>{p.photoCatalog=[];},p=>{p.photoCatalog.demo.images=[];}]){
  const p=makePlan();modify(p);assert.throws(()=>TrainingPlan.fromJSON(p),/Übungsfotos/);
 }
});
test('legacy plans remain valid and a static hold needs only one photo',()=>{
 const legacy=makePlan();delete legacy.photoCatalog;delete legacy.exercises[0].photoId;delete legacy.sessions[0].exercises[0].photoId;
 assert.ok(TrainingPlan.valid(legacy));assert.equal(TrainingPlan.photosFor(legacy.exercises[0],legacy),null);
 const p=makePlan();p.photoCatalog.demo.images=[{src:pair.images[0].src,caption:'Halteposition'}];assert.ok(TrainingPlan.valid(p));assert.equal(TrainingPlan.photosFor(p.exercises[0],p).images.length,1);
});
