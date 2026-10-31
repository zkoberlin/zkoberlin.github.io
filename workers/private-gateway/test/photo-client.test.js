import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../../assets/js/life-api.js',import.meta.url),'utf8');
for(const type of ['image/webp','image/png'])test('photo client sends actual encoder type '+type,async()=>{
 let sent,closed=false,draws=0;
 const context={window:{},HubAuth:{authorizedFetch:async(url,init)=>{sent=init;return{ok:true,json:async()=>({id:'saved'})};}},document:{createElement:()=>({getContext:()=>({drawImage:()=>draws++}),toBlob:cb=>cb({type,size:100})})},createImageBitmap:async()=>({width:2000,height:1000,close:()=>closed=true})};
 vm.runInNewContext(source,context);assert.equal(await context.window.LifeAPI.upload({size:1000}),'saved');assert.equal(sent.headers['Content-Type'],type);assert.equal(closed,true);assert.equal(draws,1);
});
test('oversized originals never reach the upload endpoint',async()=>{const c={window:{}};vm.runInNewContext(source,c);await assert.rejects(c.window.LifeAPI.upload({size:20000001}),/20 MB/);});
