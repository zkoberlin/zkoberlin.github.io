import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {normalizePhoto} from '../src/photo-format.js';
const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
function pngChunk(name,data){const b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length);b.write(name,4);b.set(data,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b;}
function webp(chunks){const b=Buffer.concat([Buffer.from('RIFF0000WEBP'),...chunks.map(([n,d])=>{const b=Buffer.alloc(8+d.length+d.length%2);b.write(n);b.writeUInt32LE(d.length,4);b.set(d,8);return b;})]);b.writeUInt32LE(b.length-8,4);return b;}
test('WebP strips EXIF, XMP and ICC metadata and repairs the container',()=>{
 const image=Buffer.from([47,0,0,0,0]),x=Buffer.alloc(10);x[0]=0x2c;
 const raw=webp([['VP8X',x],['ICCP',Buffer.from('profile')],['VP8L',image],['EXIF',Buffer.from('location')],['XMP ',Buffer.from('private')]]);
 const clean=normalizePhoto(raw,'image/webp');assert.ok(clean);assert.equal(Buffer.from(clean).includes(Buffer.from('private')),false);assert.equal(clean[20],0);assert.deepEqual(normalizePhoto(clean,'image/webp'),clean);
 assert.equal(normalizePhoto(raw.subarray(0,-1),'image/webp'),null);assert.equal(normalizePhoto(webp([['ANIM',image],['VP8L',image]]),'image/webp'),null);
});
test('PNG fallback preserves valid pixels, strips text and rejects corruption',()=>{
 const h=Buffer.alloc(13);h.writeUInt32BE(1);h.writeUInt32BE(1,4);h[8]=8;h[9]=6;
 const raw=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',h),pngChunk('tEXt',Buffer.from('private location')),pngChunk('IDAT',deflateSync(Buffer.from([0,255,0,0,255]))),pngChunk('IEND',Buffer.alloc(0))]);
 const clean=normalizePhoto(raw,'image/png');assert.ok(clean);assert.equal(Buffer.from(clean).includes(Buffer.from('private')),false);assert.deepEqual(normalizePhoto(clean,'image/png'),clean);const bad=Buffer.from(raw);bad[45]^=1;assert.equal(normalizePhoto(bad,'image/png'),null);assert.equal(normalizePhoto(Buffer.from('<svg/>'),'image/png'),null);
});
