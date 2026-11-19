import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const root='assets/source/art/loading/review';
const paths={background:'public/art/loading/background.webp',managers:'public/art/loading/managers.webp',logo:'public/art/loading/logo.webp'};
const measurements=[];
for(const base of ['assets/source/art/loading','public/art/loading']) for(const name of ['background','managers','logo']) {
 const path=`${base}/${name}.${base.startsWith('public')?'webp':'png'}`;
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const counts={zero:0,low1to5:0,partial6to254:0,opaque:0}; let bounds=[info.width,info.height,-1,-1]; let vividLow=0,vividStrong=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){let p=(y*info.width+x)*4,a=data[p+3];if(a===0)counts.zero++;else if(a<=5)counts.low1to5++;else if(a<255)counts.partial6to254++;else counts.opaque++;if(a>5){bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];}if(data[p]>230 && data[p+2]<35 && (data[p+1]<35 || data[p+1]>220)){if(a<=5&&a>0)vividLow++;if(a>5)vividStrong++;}}
 measurements.push({path,width:info.width,height:info.height,counts,visibleBoundsAlphaOver5:bounds,vividRedYellowLowAlpha:vividLow,vividRedYellowAlphaOver5:vividStrong});
}
for(const name of ['managers','logo']) for(const [tone,color] of [['cream','#f7f0d9'],['green','#172b20']]) {
 const md=await sharp(paths[name]).metadata();
 await sharp({create:{width:md.width,height:md.height,channels:3,background:color}}).composite([{input:paths[name]}]).png().toFile(`${root}/${name}-${tone}.png`);
}
for(const [w,h] of [[320,640],[390,844]]) {
 const bg=await sharp(paths.background).resize(w,h,{fit:'cover',position:'centre',kernel:'nearest'}).png().toBuffer();
 const ms=Math.min(w*1.04/1024,h*.47/1024),ls=Math.min(w*.88/1024,h*.18/400);
 const mw=Math.round(1024*ms),mh=mw,lw=Math.round(1024*ls),lh=Math.round(400*ls);
 const mx=Math.round((w-mw)/2),my=Math.round(h*.785-mh),lx=Math.round((w-lw)/2),ly=Math.round(h*.15);
 let manager=await sharp(paths.managers).resize(mw,mh,{kernel:'nearest'}).png().toBuffer();
 if(mw>w) manager=await sharp(manager).extract({left:Math.max(0,-mx),top:0,width:w,height:mh}).png().toBuffer();
 const logo=await sharp(paths.logo).resize(lw,lh,{kernel:'nearest'}).png().toBuffer();
 const bx=w*.13,by=h*.85,bw=w*.74;
 const bar=Buffer.from(`<svg width="${w}" height="${h}"><rect x="${bx-3}" y="${by-3}" width="${bw+6}" height="17" rx="8" fill="#263f29" stroke="#f6dfa2" stroke-width="2"/><rect x="${bx}" y="${by}" width="${bw*.6}" height="11" rx="5" fill="#eacb64"/></svg>`);
 await sharp(bg).composite([{input:manager,left:Math.max(0,mx),top:my},{input:logo,left:lx,top:ly},{input:bar}]).png().toFile(`${root}/static-${w}x${h}.png`);
 measurements.push({static:[w,h],managers:{x:mx,y:my,width:mw,height:mh},logo:{x:lx,y:ly,width:lw,height:lh},bar:{x:bx,y:by,width:bw},note:'Static layer composition; illustrative 60% bar, no runtime/loading behavior evidence.'});
}
await sharp(`${root}/managers-cream.png`).extract({left:680,top:40,width:280,height:180}).resize(1120,720,{kernel:'nearest'}).png().toFile(`${root}/managers-edge-4x.png`);
await sharp(`${root}/logo-cream.png`).extract({left:130,top:80,width:220,height:180}).resize(880,720,{kernel:'nearest'}).png().toFile(`${root}/logo-edge-4x.png`);
await writeFile(`${root}/measurements.json`,JSON.stringify(measurements,null,2)+'\n');
console.log(JSON.stringify(measurements,null,2));
