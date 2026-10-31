// Keep pixel data only. Browser-generated metadata must never block a photo or be stored.
export function normalizePhoto(bytes,type){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const str=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
  if(type==='image/webp'){
    if(bytes.length<20||str(0,4)!=='RIFF'||str(8,12)!=='WEBP'||view.getUint32(4,true)+8!==bytes.length)return null;
    const chunks=[];let offset=12,images=0;
    while(offset+8<=bytes.length){
      const name=str(offset,offset+4),size=view.getUint32(offset+4,true),end=offset+8+size+(size%2);
      if(end>bytes.length)return null;
      if(['ICCP','EXIF','XMP '].includes(name)){offset=end;continue;}
      if(!['VP8 ','VP8L','VP8X','ALPH'].includes(name))return null;
      const chunk=bytes.slice(offset,end);
      if(name==='VP8X'){if(size!==10 || chunk[8]&0xc3)return null;chunk[8]&=~0x2c;}
      if(name==='VP8 '||name==='VP8L'){
        let width,height;
        if(name==='VP8L'){if(size<5||chunk[8]!==0x2f)return null;const bits=new DataView(chunk.buffer,chunk.byteOffset).getUint32(9,true);if(bits>>>29)return null;width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
        else {if(size<10||chunk[8]&1||chunk[11]!==0x9d||chunk[12]!==1||chunk[13]!==0x2a)return null;const v=new DataView(chunk.buffer,chunk.byteOffset);width=v.getUint16(14,true)&0x3fff;height=v.getUint16(16,true)&0x3fff;}
        if(!width||!height||width>1600||height>1600)return null;images++;
      }
      chunks.push(chunk);offset=end;
    }
    if(offset!==bytes.length||images!==1)return null;
    const out=new Uint8Array(12+chunks.reduce((n,c)=>n+c.length,0));out.set(bytes.slice(0,12));new DataView(out.buffer).setUint32(4,out.length-8,true);offset=12;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;
  }
  if(type!=='image/png'||bytes.length<45||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return null;
  let offset=8,header=false,data=false,ended=false;const chunks=[bytes.slice(0,8)];
  while(offset+12<=bytes.length){
    const size=view.getUint32(offset),name=str(offset+4,offset+8),end=offset+12+size;if(end>bytes.length)return null;
    if(crc32(bytes.subarray(offset+4,end-4))!==view.getUint32(end-4))return null;
    if(!header){if(name!=='IHDR'||size!==13||!view.getUint32(offset+8)||!view.getUint32(offset+12)||view.getUint32(offset+8)>1600||view.getUint32(offset+12)>1600)return null;header=true;}
    else if(name==='IHDR')return null;
    if(['acTL','fcTL','fdAT'].includes(name))return null;
    if(['IHDR','PLTE','IDAT','tRNS','IEND'].includes(name))chunks.push(bytes.slice(offset,end));
    else if((bytes[offset+4]&32)===0)return null;
    if(name==='IDAT')data=true;
    offset=end;if(name==='IEND'){if(size!==0||offset!==bytes.length)return null;ended=true;break;}
  }
  if(!data||!ended)return null;const out=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;
}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
