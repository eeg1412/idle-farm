// Static source-art composition only. No Pixi, DOM, game startup or test runner.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { estateBirdPose, estateSunlightPose } from '../../../../src/view/estate-atmosphere-layout.js';
const dir='assets/source/art/approved-atmosphere-review/estate';
await mkdir(dir,{recursive:true});
const source=await readFile('src/view/estate-map.js','utf8');
const siteSource=source.slice(source.indexOf('const sites = ['),source.indexOf('export function getEstateLayout'));
const sites=[...siteSource.matchAll(/\{ id: '([^']+)', label: '([^']+)', center: \[([^\]]+)\], footprint: \[([^\]]+)\],([\s\S]*?)(?=\n  \{ id:|\n\];)/g)].map(m=>({
 id:m[1],label:m[2],center:m[3].split(',').map(Number),footprint:m[4].split(',').map(Number),
 widthRatio:Number(m[5].match(/widthRatio: ([\d.]+)/)[1]),prop:m[5].match(/prop: \[([^\]]+)\]/)[1].split(',').map(Number),
 pivot:m[5].match(/pivot: \[([^\]]+)\]/)?.[1].split(',').map(Number)??[.5,.5],
 signAnchorX:m[5].match(/signAnchorX: ([\d.]+)/)?.[1],
}));
const w=390,h=Math.round(w*2.36),viewH=844,records=[];
async function paste(path,box,alpha=1,kernel='nearest',crop){
 let s=sharp(path);if(crop)s=s.extract(crop);
 const rw=Math.max(1,Math.round(box.width)),rh=Math.max(1,Math.round(box.height));
 let {data,info}=await s.resize(rw,rh,{kernel}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(alpha!==1)for(let i=3;i<data.length;i+=4)data[i]=Math.round(data[i]*alpha);
 let x=Math.round(box.x),y=Math.round(box.y),l=Math.max(0,x),t=Math.max(0,y),r=Math.min(w,x+rw),b=Math.min(h,y+rh);
 if(r<=l||b<=t)return undefined;
 const input=await sharp(data,{raw:info}).extract({left:l-x,top:t-y,width:r-l,height:b-t}).png().toBuffer();
 return{input,left:l,top:t};
}
const buildings=[],signs=[];
for(const s of sites){
 const [al,at,ar,ab]=s.footprint,u=w*s.widthRatio/(ar-al),x=Math.round(w*s.center[0]),y=Math.round(w*s.center[1]);
 buildings.push(await paste(`public/art/estate/${s.id}.webp`,{x:x-536*u/2,y:y-320*u/2,width:536*u,height:320*u}));
 const propPath=`public/art/estate/${s.id}-motion.webp`,meta=await sharp(propPath).metadata(),scale=s.prop[2]*u/Math.max(meta.width,meta.height);
 buildings.push(await paste(propPath,{x:x+(s.prop[0]-268)*u-meta.width*scale*s.pivot[0],y:y+(s.prop[1]-160)*u-meta.height*scale*s.pivot[1],width:meta.width*scale,height:meta.height*scale}));
 const sw=Math.round(w*.224),sh=sw*110/516,sy=y+(ab-160)*u+Math.max(2,Math.round(w*.009)),sx=Math.round(x-536*u/2+Number(s.signAnchorX??((al+ar)/2))*u);
 signs.push(await paste('public/art/estate/sign.webp',{x:sx-sw/2,y:sy,width:sw,height:sh}));
 const label=await sharp({text:{text:s.label,font:`Noto Sans CJK SC Bold ${Math.max(13,Math.min(23,Math.round(sh*.76)))}`,rgba:true,dpi:72}}).tint('#412918').png().toBuffer({resolveWithObject:true});
 signs.push({input:label.data,left:Math.round(sx-label.info.width/2),top:Math.round(sy+sh/2-label.info.height/2)});
}
const base=await sharp('public/art/estate/background.webp').resize(w,h,{kernel:'nearest'}).composite(buildings.filter(Boolean)).png().toBuffer();
await sharp(base).composite(signs.filter(Boolean)).png().toFile(`${dir}/base-buildings-signs.png`);
for(const top of [0,h-viewH])for(const time of [4400,4900,5500,6200,40392]){
 const sun=estateSunlightPose(time,w,top),birds=Array.from({length:3},(_,i)=>estateBirdPose(time,i,w,top,viewH));
 const overlays=[await paste('public/art/estate/atmosphere/sunlight.webp',sun,sun.alpha,'linear')];
 for(const pose of birds)if(pose.visible)overlays.push(await paste('public/art/estate/atmosphere/birds.webp',{x:pose.x-pose.size/2,y:pose.y-pose.size/2,width:pose.size,height:pose.size},pose.alpha,'nearest',{left:pose.frame*128,top:0,width:128,height:128}));
 const result=await sharp(base).composite([...overlays,...signs].filter(Boolean)).png().toBuffer();
 const path=`${dir}/pose-${time}-scroll-${top}.png`;
 await sharp(result).extract({left:0,top,width:w,height:viewH}).png().toFile(path);
 records.push({path,time,viewportTop:top,viewportHeight:viewH,sun,birds});
}
await writeFile(`${dir}/poses.json`,JSON.stringify({note:'Pure pose and source-art approximation, no Pixi/GPU or actual animation evidence. Original building/prop geometry; props placed at neutral source registration; sign labels use Noto Sans CJK SC substitute.',sites,records},null,2)+'\n');
