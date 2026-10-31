import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../../assets/js/journal-dictation.js',import.meta.url),'utf8');
function fixture(supported=true){
 const handlers=new Map(),engines=[],nodes=new Map();let focused;
 const node=()=>({value:'',disabled:false,readOnly:false,dataset:{},isConnected:true,maxLength:2000,listeners:{},setAttribute(){},append(){},replaceWith(){},addEventListener(name,fn){this.listeners[name]=fn;},focus(){focused=this;},dispatchEvent(e){this.inputEvent=e;}});
 const label={firstChild:{textContent:'Dein Eintrag'},replaceWith(){}};
 const field=node();field.value='Vorhandener Text';field.closest=()=>label;
 const form={elements:{body:field},addEventListener:(name,fn)=>handlers.set('form:'+name,fn)};
 const dialog=node();dialog.querySelector=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};dialog.showModal=()=>dialog.open=true;dialog.close=()=>dialog.open=false;
 const document={hidden:false,getElementById:()=>form,createElement:tag=>tag==='dialog'?dialog:node(),querySelector:()=>({append(){}}),addEventListener:(name,fn)=>handlers.set('document:'+name,fn)};
 function Recognition(){engines.push(this);this.start=()=>this.started=true;this.stop=()=>this.stopped=true;this.abort=()=>this.aborted=true;}
 const window={JournalModel:{prompts:[]},addEventListener:(name,fn)=>handlers.set('window:'+name,fn),...(supported?{SpeechRecognition:Recognition}:{})};
 const buttons=[];const original=document.createElement;document.createElement=tag=>{const n=original(tag);if(tag==='button')buttons.push(n);return n;};
 vm.runInNewContext(source,{window,document,Event});
 const get=id=>nodes.get('#dictation'+id),open=()=>buttons[0].onclick(),results=(engine,values)=>engine.onresult({results:values.map(s=>[{transcript:s}])});
 return{field,dialog,document,handlers,engines,get,open,results};
}
test('dictation starts only on explicit click; unsupported browsers get an explanation',()=>{const f=fixture(false);f.open();assert.equal(f.get('Start').disabled,true);assert.match(f.get('Status').textContent,/Gerätetastatur/);assert.equal(f.engines.length,0);});
test('recognized speech is reviewed first and appended without duplicate interim text',()=>{const f=fixture();f.open();assert.equal(f.engines.length,0);f.get('Start').onclick();const e=f.engines[0];assert.equal(e.lang,'de-DE');assert.equal(f.get('Insert').disabled,true);f.results(e,['Heute']);f.results(e,['Heute war es schön.']);assert.equal(f.get('Text').value,'Heute war es schön.');assert.equal(f.field.value,'Vorhandener Text');f.get('Stop').onclick();assert.equal(e.stopped,true);e.onend();f.get('Insert').onclick();assert.equal(f.field.value,'Vorhandener Text\nHeute war es schön.');assert.equal(f.dialog.open,false);assert.equal(f.field.inputEvent.type,'input');});
test('closing aborts microphone and ignores late speech results',()=>{const f=fixture();f.open();f.get('Start').onclick();const e=f.engines[0];f.get('Cancel').onclick();f.results(e,['Late text']);assert.equal(e.aborted,true);assert.equal(f.get('Text').value,'');assert.equal(f.field.value,'Vorhandener Text');});
test('permission errors are actionable and existing transcript survives',()=>{const f=fixture();f.open();f.get('Start').onclick();const e=f.engines[0];f.results(e,['Behalten']);e.onerror({error:'not-allowed'});e.onend();assert.match(f.get('Status').textContent,/Mikrofonfreigabe/);assert.equal(f.get('Text').value,'Behalten');assert.equal(f.get('Insert').disabled,false);});
test('continuing dictation preserves the reviewed text',()=>{const f=fixture();f.open();f.get('Text').value='Korrigierter Anfang.';f.get('Start').onclick();f.results(f.engines[0],['Nächster Satz.']);f.engines[0].onend();assert.equal(f.get('Text').value,'Korrigierter Anfang.\nNächster Satz.');});
test('field limits never silently truncate or replace existing text',()=>{const f=fixture();f.open();f.field.maxLength=5;f.get('Text').value='Neuer Text';f.get('Text').oninput();f.get('Insert').onclick();assert.equal(f.field.value,'Vorhandener Text');assert.match(f.get('Status').textContent,/nichts abgeschnitten/);assert.equal(f.dialog.open,true);});
test('logout and hidden pages stop dictation',()=>{for(const name of ['window:hub-auth-change','form:reset','document:visibilitychange']){const f=fixture();f.open();f.get('Start').onclick();f.document.hidden=true;f.handlers.get(name)();assert.equal(f.engines[0].aborted,true);assert.equal(f.get('Start').disabled,false);assert.equal(f.field.value,'Vorhandener Text');}});
