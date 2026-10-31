window.LifeAPI = (() => {
  const base='https://paul-gateway-v2.paul-bendzko.workers.dev';
  async function request(path,init={}) { const r=await HubAuth.authorizedFetch(base+path,init); if(!r.ok) {let p;try{p=await r.json();}catch{} throw new Error(p?.error || (r.status===401?'Bitte erneut anmelden.':'Verbindung fehlgeschlagen. Bitte erneut versuchen.'));} return r; }
  const json=(method,p)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  return {base, request, list:async kind=>(await(await request('/life/'+kind)).json()).records,
    save:async(kind,id,data,revision=0)=>(await(await request('/life/'+kind+'/'+id,json('PUT',{data,revision}))).json()),
    remove:async(kind,r)=>(await request('/life/'+kind+'/'+r.id,json('DELETE',{revision:r.revision}))),
    photo:async id=>URL.createObjectURL(await(await request('/life-photo/'+id)).blob()),
    deletePhoto:async id=>request('/life-photo/'+id,{method:'DELETE'}),
    async upload(file){if(file.size>20000000)throw new Error('Das Originalbild darf höchstens 20 MB groß sein.');const bitmap=await createImageBitmap(file); const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));if(!blob||blob.type!=='image/webp')throw new Error('Dieses Gerät unterstützt die Bildaufbereitung nicht.');return(await(await request('/life-photo',{method:'POST',headers:{'Content-Type':'image/webp'},body:blob})).json()).id;},
    async export(){const r=await(await request('/life/export')).json();const photos=[];for(const p of r.photos){const blob=await(await request('/life-photo/'+p.id)).blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});photos.push({id:p.id,data});}const url=URL.createObjectURL(new Blob([JSON.stringify({...r,photos},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='paul-private-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    today:()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date()),
    date:d=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00')),
    el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  };
})();
