import test from 'node:test';
import assert from 'node:assert/strict';
import {discover,wikiText} from '../src/life-discovery.js';
import worker from '../src/index.js';
test('exercise credits are rendered as plain text',()=>{assert.equal(wikiText('<b>Autor</b> [[Link|Name]]'),'Autor Name');});
test('exercise catalogue routes remain private and never forward Hub credentials',async()=>{for(const path of ['/life/discover-exercises','/life/exercise-media'])assert.equal((await worker.fetch(new Request('https://test'+path),{})).status,401);const old=globalThis.fetch;globalThis.fetch=async(url,init)=>{assert.ok(url.startsWith('https://wger.de/'));assert.equal(init.headers.Authorization,undefined);return Response.json({results:[{exercise:1,name:'Rudern',license_author:'Test'}]});};try{const r=await discover(new Request('https://test/life/discover-exercises?q=Rudern'),(d,s)=>Response.json(d,{status:s}));const p=await r.json();assert.equal(p.exercises[0].name,'Rudern');}finally{globalThis.fetch=old;}});
