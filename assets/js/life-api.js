window.LifeAPI = (() => {
  const base='https://paul-gateway-v2.paul-bendzko.workers.dev';
  async function request(path,init={}) { const r=await HubAuth.authorizedFetch(base+path,init); if(!r.ok) {let p;try{p=await r.json();}catch{} throw new Error(p?.error || (r.status===401?'Bitte erneut anmelden.':'Verbindung fehlgeschlagen. Bitte erneut versuchen.'));} return r; }
  const json=(method,p)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  return {base, request, list:async kind=>(await(await request('/life/'+kind)).json()).records,
    save:async(kind,id,data,revision=0)=>(await(await request('/life/'+kind+'/'+id,json('PUT',{data,revision}))).json()),
    remove:async(kind,r)=>(await request('/life/'+kind+'/'+r.id,json('DELETE',{revision:r.revision}))),
    photo:async id=>URL.createObjectURL(await(await request('/life-photo/'+id)).blob()),
    deletePhoto:async id=>request('/life-photo/'+id,{method:'DELETE'}),
    async upload(file){
      if(!file.size || file.size>20000000)throw new Error('Bitte ein Bild mit höchstens 20 MB wählen.');
      let image,release=()=>{};
      try {
        try {image=await createImageBitmap(file);release=()=>image.close();}
        catch {const url=URL.createObjectURL(file);release=()=>URL.revokeObjectURL(url);image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Dieses Bildformat kann hier nicht geöffnet werden. Bitte JPEG oder PNG wählen.'));img.src=url;});}
        const canvas=document.createElement('canvas');let edge=1600;
        for(let attempt=0;attempt<7;attempt++){
          const scale=Math.min(1,edge/Math.max(image.width,image.height));
          canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
          const context=canvas.getContext('2d',{colorSpace:'srgb'});if(!context)throw new Error('Die Bildaufbereitung ist hier nicht verfügbar.');
          context.drawImage(image,0,0,canvas.width,canvas.height);
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
          if(!blob || !['image/webp','image/png'].includes(blob.type))throw new Error('Die Bildaufbereitung ist hier nicht verfügbar.');
          if(blob.size<=2000000)return(await(await request('/life-photo',{method:'POST',headers:{'Content-Type':blob.type},body:blob})).json()).id;
          edge=Math.round(edge*.7);
        }
        throw new Error('Das Bild ist zu groß. Bitte ein kleineres Bild auswählen.');
      }finally{release();}
    },
    async export(){const r=await(await request('/life/export')).json();const photos=[];for(const p of r.photos){const blob=await(await request('/life-photo/'+p.id)).blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});photos.push({id:p.id,data});}const url=URL.createObjectURL(new Blob([JSON.stringify({...r,photos},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='paul-private-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    today:()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date()),
    date:d=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00')),
    el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  };
})();
