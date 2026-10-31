/* Browser speech recognition. Audio is never uploaded to or stored by the Hub. */
(() => {
 const form=document.getElementById('journalForm');if(!form)return;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const dialog=document.createElement('dialog');dialog.className='journal-dictation';dialog.setAttribute('aria-labelledby','dictationTitle');
 dialog.innerHTML='<h2 id="dictationTitle">Text einsprechen</h2><p id="dictationPrivacy" class="life-muted">Die Spracherkennung deines Browsers kann Audio an den Dienst des Browseranbieters senden. Starte nur, wenn das für dich passt. Der Hub speichert keine Tonaufnahme. Erkannten Text übernimmst und speicherst du selbst.</p><p id="dictationStatus" class="life-status" role="status" aria-live="polite"></p><label>Erkannter Text<textarea id="dictationText" rows="7" placeholder="Dein erkannter Text erscheint hier …"></textarea></label><p class="life-muted">Deutsch · Text wird am Ende des gewählten Feldes ergänzt. Vorhandener Text bleibt erhalten.</p><div class="life-actions"><button type="button" id="dictationStart">🎙 Mikrofon starten</button><button type="button" id="dictationStop" disabled>■ Stoppen</button><button type="button" id="dictationInsert" class="primary" disabled>Text übernehmen</button><button type="button" id="dictationCancel">Schließen</button></div>';
 document.querySelector('main').append(dialog);
 const $=id=>dialog.querySelector('#'+id),preview=$('dictationText'),start=$('dictationStart'),stop=$('dictationStop'),insert=$('dictationInsert'),status=$('dictationStatus');
 let target=null,recognition=null,session=0,listening=false,base='',hadError=false;
 const message=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
 function controls(){preview.readOnly=listening;start.disabled=listening||!Recognition;stop.disabled=!listening;insert.disabled=listening||!preview.value.trim();start.textContent=preview.value.trim()?'🎙 Weiter diktieren':'🎙 Mikrofon starten';}
 function abort(){session++;const old=recognition;recognition=null;listening=false;try{old?.abort();}catch{}controls();}
 function close(){abort();if(dialog.open)dialog.close();target=null;preview.value='';}
 function open(field,label){abort();target=field;preview.value='';$('dictationTitle').textContent='Einsprechen: '+label;message(Recognition?'Bereit. Das Mikrofon startet erst per Klick.':'Dieser Browser bietet hier keine Spracherkennung an. Du kannst die Diktierfunktion deiner Gerätetastatur im Textfeld verwenden.');controls();dialog.showModal();$('dictationCancel').focus();}
 start.onclick=()=>{
   if(listening||!target||!Recognition)return;
   const current=++session;let engine;
   try{engine=new Recognition();recognition=engine;engine.lang='de-DE';engine.continuous=true;engine.interimResults=true;base=preview.value.trim();hadError=false;listening=true;controls();message('Mikrofon wird gestartet …');
     engine.onstart=()=>{if(current===session)message('Ich höre zu … Stoppe, wenn du fertig bist.');};
     engine.onresult=e=>{if(current!==session||!target)return;const parts=[];for(let i=0;i<e.results.length;i++)parts.push(e.results[i][0].transcript);preview.value=[base,parts.join(' ').trim()].filter(Boolean).join('\n');controls();};
     engine.onerror=e=>{if(current!==session)return;hadError=true;const messages={'not-allowed':'Mikrofonzugriff wurde nicht erlaubt. Bitte die Mikrofonfreigabe in deinem Browser prüfen.','service-not-allowed':'Der Spracherkennungsdienst ist hier nicht verfügbar. Nutze bei Bedarf die Diktierfunktion deiner Gerätetastatur.','audio-capture':'Kein verfügbares Mikrofon gefunden. Bitte Mikrofon und Geräteeinstellungen prüfen.','no-speech':'Keine Sprache erkannt. Du kannst es erneut versuchen.','network':'Der Spracherkennungsdienst ist nicht erreichbar. Bitte die Verbindung prüfen oder später erneut versuchen.','language-not-supported':'Deutsch wird von diesem Spracherkennungsdienst nicht unterstützt.','aborted':'Diktieren beendet.'};message(messages[e.error]||'Die Spracherkennung wurde unterbrochen. Vorhandener Text bleibt erhalten.',true);};
     engine.onend=()=>{if(current!==session)return;recognition=null;listening=false;controls();if(!hadError)message(preview.value.trim()?'Fertig. Prüfe den Text und übernimm ihn bei Bedarf.':'Keine Sprache erkannt. Du kannst erneut starten.');};
     engine.start();
   }catch{abort();message('Das Mikrofon konnte nicht gestartet werden. Bitte die Freigabe prüfen oder die Gerätediktierfunktion verwenden.',true);}
 };
 stop.onclick=()=>{if(!recognition)return;stop.disabled=true;message('Diktieren wird beendet …');try{recognition.stop();}catch{abort();message('Diktieren beendet. Du kannst den erkannten Text prüfen.');}};
 preview.oninput=controls;
 insert.onclick=()=>{if(listening||!target||!target.isConnected||!preview.value.trim())return;const text=preview.value.trim(),separator=target.value.trim()?'\n':'';if(target.maxLength>=0&&target.value.length+separator.length+text.length>target.maxLength){message('Der Text passt nicht vollständig in dieses Feld. Bitte kürzen; es wird nichts abgeschnitten.',true);return;}const field=target;field.value+=separator+text;field.dispatchEvent(new Event('input',{bubbles:true}));close();field.focus();};
 $('dictationCancel').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 form.addEventListener('reset',close);form.addEventListener('submit',close,{capture:true});window.addEventListener('hub-auth-change',close);window.addEventListener('pagehide',close);window.addEventListener('beforeunload',e=>{if(dialog.open&&preview.value.trim()){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&listening){abort();message('Diktieren pausiert, weil die Seite verlassen wurde. Erkannter Text bleibt zur Prüfung erhalten.');}});
 for(const name of ['body',...window.JournalModel.prompts.map(p=>p[0]),'title']){const field=form.elements[name];if(!field)continue;const label=field.closest('label'),text=label.firstChild.textContent.trim();const button=document.createElement('button');button.type='button';button.className='journal-dictate-button';button.textContent='🎙 Einsprechen';button.setAttribute('aria-label',text+' einsprechen');button.onclick=()=>open(field,text);const wrapper=document.createElement('div');wrapper.className='journal-dictate-field';label.replaceWith(wrapper);wrapper.append(label,button);}
})();
