// Source-art composition and targeted pixel/metadata reading only.
// Does not import Pixi, start the game/browser, or perform runtime checks.
import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { getEstateFoliageLayout } from '../../../../src/view/estate-foliage-layout.js';
import { estateBirdPose, estateBirdRoute, estateSunlightPose } from '../../../../src/view/estate-atmosphere-layout.js';

const dir='assets/source/art/map-foliage-review';
const source=await readFile('src/view/estate-map.js','utf8');
const geometry=s=>s.slice(s.indexOf('const sites = ['),s.indexOf('export function getEstateLayout'));
const sites=[...geometry(source).matchAll(/\{ id: '([^']+)', label: '([^']+)', center: \[([^\]]+)\], footprint: \[([^\]]+)\],([\s\S]*?)(?=\n  \{ id:|\n\];)/g)].map(m=>({
 id:m[1],label:m[2],center:m[3].split(',').map(Number),footprint:m[4].split(',').map(Number),
 widthRatio:Number(m[5].match(/widthRatio: ([\d.]+)/)[1]),prop:m[5].match(/prop: \[([^\]]+)\]/)[1].split(',').map(Number),
 pivot:m[5].match(/pivot: \[([^\]]+)\]/)?.[1].split(',').map(Number)??[.5,.5],signAnchorX:m[5].match(/signAnchorX: ([\d.]+)/)?.[1],
}));
const records=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
async function paste(path,box,w,h,{alpha=1,kernel='nearest',crop,mirror=false}={}){
 let s=sharp(path);if(crop)s=sharp(await s.extract(crop).png().toBuffer());if(mirror)s=s.flop();
 const rw=Math.max(1,Math.round(box.width)),rh=Math.max(1,Math.round(box.height));
 let {data,info}=await s.resize(rw,rh,{kernel}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(alpha!==1)for(let i=3;i<data.length;i+=4)data[i]=Math.round(data[i]*alpha);
 const x=Math.round(box.x),y=Math.round(box.y),l=Math.max(0,x),t=Math.max(0,y),r=Math.min(w,x+rw),b=Math.min(h,y+rh);
 if(r<=l||b<=t)return undefined;
 return{input:await sharp(data,{raw:info}).extract({left:l-x,top:t-y,width:r-l,height:b-t}).png().toBuffer(),left:l,top:t};
}
async function compose(w,viewH,top,time,samples,name){
 const h=Math.round(w*2.36),plants=[],buildings=[],signs=[];
 for(const p of getEstateFoliageLayout(w))plants.push(await paste(`public/art/estate/foliage/${p.asset}.webp`,{x:p.x-p.width*p.anchor[0],y:p.y-p.height*p.anchor[1],width:p.width,height:p.height},w,h));
 for(const s of sites){
  const [al,at,ar,ab]=s.footprint,u=w*s.widthRatio/(ar-al),x=Math.round(w*s.center[0]),y=Math.round(w*s.center[1]);
  buildings.push(await paste(`public/art/estate/${s.id}.webp`,{x:x-268*u,y:y-160*u,width:536*u,height:320*u},w,h));
  const propPath=`public/art/estate/${s.id}-motion.webp`,meta=await sharp(propPath).metadata(),scale=s.prop[2]*u/Math.max(meta.width,meta.height);
  buildings.push(await paste(propPath,{x:x+(s.prop[0]-268)*u-meta.width*scale*s.pivot[0],y:y+(s.prop[1]-160)*u-meta.height*scale*s.pivot[1],width:meta.width*scale,height:meta.height*scale},w,h));
  const sw=Math.round(w*.224),sh=sw*110/516,sy=y+(ab-160)*u+Math.max(2,Math.round(w*.009)),sx=Math.round(x-268*u+Number(s.signAnchorX??((al+ar)/2))*u);
  signs.push(await paste('public/art/estate/sign.webp',{x:sx-sw/2,y:sy,width:sw,height:sh},w,h));
  const label=await sharp({text:{text:s.label,font:`Noto Sans CJK SC Bold ${Math.max(13,Math.min(23,Math.round(sh*.76)))}`,rgba:true,dpi:72}}).tint('#412918').png().toBuffer({resolveWithObject:true});
  signs.push({input:label.data,left:Math.round(sx-label.info.width/2),top:Math.round(sy+sh/2-label.info.height/2)});
 }
 const base=await sharp('public/art/estate/background.webp').resize(w,h,{kernel:'nearest'}).composite([...plants,...buildings].filter(Boolean)).png().toBuffer();
 const sun=estateSunlightPose(time,w,top,viewH),route=estateBirdRoute(w,top,viewH,samples),birds=Array.from({length:3},(_,i)=>estateBirdPose(time,i,w,route));
 const overlays=[await paste('public/art/estate/atmosphere/sunlight.webp',sun,w,h,{alpha:sun.alpha,kernel:'linear'})];
 for(const p of birds)if(p.visible)overlays.push(await paste('public/art/estate/atmosphere/birds.webp',{x:p.x-p.size/2,y:p.y-p.size/2,width:p.size,height:p.size},w,h,{alpha:p.alpha,crop:{left:p.frame*128,top:0,width:128,height:128},mirror:p.direction<0}));
 const assembled=await sharp(base).composite([...overlays,...signs].filter(Boolean)).png().toBuffer();
 const output=await sharp(assembled).extract({left:0,top,width:w,height:viewH}).png().toBuffer();
 await writeFile(`${dir}/${name}.png`,output);
 records.push({path:`${dir}/${name}.png`,map:[w,h],viewport:[0,top,w,viewH],time,samples,sun,route,birds,plants:getEstateFoliageLayout(w)});
 return output;
}
await compose(816,1926,0,5500,[.70,.05,.80,.70,.20],'full-map');
for(const [w,vh]of [[320,568],[390,844]])for(const top of [0,Math.round(w*2.36)-vh])await compose(w,vh,top,5500,[.70,.05,.80,.70,.20],`phone-${w}-scroll-${top}`);
const flights=[];for(const [i,t]of [4900,5500,6200].entries())flights.push({input:await compose(390,844,0,t,[.15,.85,.10,.25,.60],`flight-${t}`),left:i*390,top:0});
await sharp({create:{width:1170,height:844,channels:3,background:'#e8e4cd'}}).composite(flights).png().toFile(`${dir}/flight-contact.png`);

const assets=[...new Set(getEstateFoliageLayout(390).map(p=>p.asset))];
const contacts=[],sizes=[];
for(const [i,id]of assets.entries()){
 const webp=`public/art/estate/foliage/${id}.webp`;
 const original=`assets/source/art/estate-foliage/${id}.png`;
 const meta=await sharp(webp).metadata(),p=getEstateFoliageLayout(390).find(p=>p.asset===id),p320=getEstateFoliageLayout(320).find(p=>p.asset===id);
 const rowY=i*300;
 const large=await sharp(webp).resize({width:220,height:250,fit:'inside',kernel:'nearest'}).png().toBuffer({resolveWithObject:true});
 contacts.push({input:large.data,left:10,top:rowY+35});
 for(const [j,pose]of [p320,p].entries()){
  const actual=await sharp(webp).resize(Math.round(pose.width),Math.round(pose.height),{kernel:'nearest'}).png().toBuffer({resolveWithObject:true});
  contacts.push({input:actual.data,left:260+j*130,top:rowY+275-actual.info.height});
 }
 const label=await sharp({text:{text:`${id} | WebP ${meta.width}x${meta.height} | 320 / 390 actual`,font:'DejaVu Sans 15',rgba:true}}).png().toBuffer();
 contacts.push({input:label,left:10,top:rowY+5});sizes.push({id,width:meta.width,height:meta.height,at320:[p320.width,p320.height],at390:[p.width,p.height],anchor:p.anchor,sourcePng:original});
}
await sharp({create:{width:600,height:1800,channels:3,background:'#bcc868'}}).composite(contacts).png().toFile(`${dir}/foliage-export-and-actual-size.png`);
const files=['src/view/estate-map.js','src/view/estate-foliage-layout.js','src/view/estate-foliage.js','src/view/estate-atmosphere.js','src/view/estate-atmosphere-layout.js','assets/source/art/estate-foliage/registration.json','assets/source/art/estate-foliage/foliage-atlas-original.png','assets/source/art/estate-foliage/prompt.txt','assets/source/art/estate-foliage/generation.json','public/art/estate/foliage/registration.json','public/art/estate/background.webp','public/art/estate/atmosphere/sunlight.webp','public/art/estate/atmosphere/birds.webp',...assets.flatMap(id=>[`public/art/estate/foliage/${id}.webp`,`assets/source/art/estate-foliage/${id}.png`]),...sites.flatMap(s=>[`public/art/estate/${s.id}.webp`,`public/art/estate/${s.id}-motion.webp`]),'public/art/estate/sign.webp'];
const evidence=[];for(const path of files){let b;try{b=await readFile(path);}catch{continue;}const rec={path,sha256:sha(b),bytes:b.length};if(/\.(png|webp)$/.test(path)){
 const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});const hist=Array(256).fill(0);let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let i=3;i<data.length;i+=4){const a=data[i];hist[a]++;if(a){const p=(i-3)/4,x=p%info.width,y=Math.floor(p/info.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 Object.assign(rec,{size:[info.width,info.height],alphaMin:hist.findIndex(n=>n>0),alphaMax:hist.findLastIndex(n=>n>0),transparentPixels:hist[0],nonzeroAlphaBounds:[left,top,right+1,bottom+1]});
 }evidence.push(rec);}
const baseline=execFileSync('git',['show','HEAD:src/view/estate-map.js'],{encoding:'utf8'});
await writeFile(`${dir}/evidence.json`,JSON.stringify({note:'Static art composition, pixel metadata, and source reading only; no game/Pixi/browser/test/runtime/syntax check/build. Neutral building motion; Pango substitute labels; integer raster approximation.',baselineGeometryUnchanged:geometry(source)===geometry(baseline),baselineGeometrySha256:sha(geometry(baseline)),currentGeometrySha256:sha(geometry(source)),sizes,records,files:evidence},null,2)+'\n');
