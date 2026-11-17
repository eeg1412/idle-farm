import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=new URL('../../../',import.meta.url), out=new URL('./',import.meta.url);
const reg=JSON.parse(await readFile(new URL('assets/mining/registration.json',root),'utf8'));
const evidence={note:'Direct image metadata and SHA256 reading for visual review; no tests or checks.',files:[]};
for(const [key,record]of [...Object.entries(reg.items),...Object.entries(reg.ui)])for(const kind of ['png','path']){
 const bytes=await readFile(new URL(record[kind],root));const meta=await sharp(bytes).metadata();
 evidence.files.push({key,path:record[kind],width:meta.width,height:meta.height,format:meta.format,hasAlpha:meta.hasAlpha,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(new URL('reviewer-file-evidence.json',out),JSON.stringify(evidence,null,2)+'\n');
const label=(text,w,h)=>Buffer.from(`<svg width="${w}" height="${h}"><text x="4" y="14" font-family="sans-serif" font-size="12" fill="#182121">${text}</text></svg>`);
for(const [group,entries]of [['items',Object.entries(reg.items)],['ui',Object.entries(reg.ui)]]){
 for(let start=0;start<entries.length;start+=10){
  const inputs=[];
  for(const [i,[key,record]]of entries.slice(start,start+10).entries()){
   const x=i%5*216,y=Math.floor(i/5)*230;
   inputs.push({input:await sharp(await readFile(new URL(record.path,root))).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:x+8,top:y+25});
   inputs.push({input:label(key,216,20),left:x,top:y});
  }
  await sharp({create:{width:1080,height:460,channels:3,background:'#d8d0b7'}}).composite(inputs).png().toFile(fileURLToPath(new URL(`reviewer-${group}-${start/10+1}-2x.png`,out)));
 }
 const inputs=[];const unit=group==='items'?110:110;const width=group==='items'?1100:990,height=group==='items'?480:110;
 for(const [i,[key,record]]of entries.entries()){
  const x=group==='items'?i%10*110:i*110,y=group==='items'?Math.floor(i/10)*120:0;
  const bytes=await readFile(new URL(record.path,root));
  inputs.push({input:label(key.replace('mining-',''),110,20),left:x,top:y});
  if(group==='items')inputs.push({input:bytes,left:x+7,top:y+18});
  else for(const [size,top]of [[48,23],[24,78]])inputs.push({input:await sharp(bytes).resize(size,size,{kernel:'nearest'}).png().toBuffer(),left:x+5,top:y+top});
 }
 await sharp({create:{width,height,channels:3,background:'#d8d0b7'}}).composite(inputs).png().toFile(fileURLToPath(new URL(`reviewer-${group}-${group==='items'?'96':'actual'}.png`,out)));
}
const pngInputs=[];
for(const [i,[key,record]]of Object.entries(reg.items).entries()){
 const x=i%10*110,y=Math.floor(i/10)*120;
 pngInputs.push({input:await readFile(new URL(record.png,root)),left:x+7,top:y+18},{input:label(key,110,18),left:x,top:y});
}
await sharp({create:{width:1100,height:480,channels:3,background:'#344343'}}).composite(pngInputs).png().toFile(fileURLToPath(new URL('reviewer-items-png-96.png',out)));
const inputs=[];
for(let i=0;i<10;i++){
 const id='M'+String(i+1).padStart(2,'0'),x=i%5*330,y=Math.floor(i/5)*480;
 const bytes=await readFile(new URL(`public/art/scene-${id}.webp`,root));
 inputs.push({input:label(id,330,20),left:x,top:y});
 inputs.push({input:bytes,left:x,top:y+20});
 inputs.push({input:await sharp(bytes).resize(130,130,{kernel:'nearest'}).png().toBuffer(),left:x,top:y+340});
}
await sharp({create:{width:1650,height:960,channels:3,background:'#d8d0b7'}}).composite(inputs).png().toFile(fileURLToPath(new URL('reviewer-scenes-320-130.png',out)));
const uiPng=[];
for(const [i,[key,record]]of Object.entries(reg.ui).entries()){
 const x=i*110,bytes=await readFile(new URL(record.png,root));
 uiPng.push({input:label(key.replace('mining-',''),110,20),left:x,top:0});
 for(const [size,top]of [[48,23],[24,78]])uiPng.push({input:await sharp(bytes).resize(size,size,{kernel:'nearest'}).png().toBuffer(),left:x+5,top});
}
await sharp({create:{width:990,height:110,channels:3,background:'#344343'}}).composite(uiPng).png().toFile(fileURLToPath(new URL('reviewer-ui-png-actual.png',out)));
console.log('Composed deliverable WebP for normal-background visual review only.');
