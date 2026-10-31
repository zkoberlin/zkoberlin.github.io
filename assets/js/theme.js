// One appearance preference for Hub, JournalPaul and FitPaul.
(() => {
 const key='hub_theme',modes=['light','dark','auto'],icons={light:'☀️',dark:'🌙',auto:'🌓'},labels={light:'Hell – wechseln zu Dunkel',dark:'Dunkel – wechseln zu Automatik',auto:'Automatik – wechseln zu Hell'};
 const media=window.matchMedia?.('(prefers-color-scheme:dark)');
 let mode='auto';try{const saved=localStorage.getItem(key);if(modes.includes(saved))mode=saved;}catch{}
 function render(){document.documentElement.setAttribute('data-theme',mode==='auto'?(media?.matches?'dark':'light'):mode);document.documentElement.dataset.themeMode=mode;const button=document.getElementById('themeBtn');if(button){button.textContent=icons[mode];button.title=labels[mode];button.setAttribute('aria-label',labels[mode]);}}
 function set(next){mode=modes.includes(next)?next:'auto';try{if(mode==='auto')localStorage.removeItem(key);else localStorage.setItem(key,mode);}catch{}render();}
 function toggle(){set(modes[(modes.indexOf(mode)+1)%modes.length]);}
 render();
 function bind(){document.getElementById('themeBtn')?.addEventListener('click',toggle);render();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 media?.addEventListener?.('change',()=>{if(mode==='auto')render();});
 window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;mode=modes.includes(event.newValue)?event.newValue:'auto';render();});
 window.HubTheme=Object.freeze({set,toggle,getMode:()=>mode});
})();
