// Offline artwork composition only: no Pixi, DOM, game startup or test runner.
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadingLayout} from '../../../../../src/view/loading-layout.js';
const root='assets/source/art/loading/review-all22';
const revision=process.argv[2]||'round1';
const dir=`${root}/${revision}`;
await mkdir(dir,{recursive:true});
const paths={background:'public/art/loading/background.webp',managers:'public/art/loading/managers.webp',logo:'public/art/loading/logo.webp'};
const measurements=[];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
async function textArt(text,fontSize,bold=true,color='#fff4d6',width){
 const input={text:`<span foreground="${color}">${esc(text)}</span>`,font:`Noto Sans CJK SC ${bold?'Bold':''} ${fontSize}`,rgba:true,dpi:72,align:'centre'};
 const natural=await sharp({text:input}).png().toBuffer({resolveWithObject:true});
 return width&&natural.info.width>width?sharp({text:{...input,width:Math.round(width)}}).png().toBuffer({resolveWithObject:true}):natural;
}
async function sprite(path,box,w,h){
 const x=Math.round(box.x),y=Math.round(box.y),rw=Math.round(box.width),rh=Math.round(box.height);
 const left=Math.max(0,x),top=Math.max(0,y),right=Math.min(w,x+rw),bottom=Math.min(h,y+rh);
 if(right<=left||bottom<=top)return null;
 const input=await sharp(path).resize(rw,rh,{kernel:'nearest'}).extract({left:left-x,top:top-y,width:right-left,height:bottom-top}).png().toBuffer();
 return {input,left,top};
}
async function compose(w,h,state,inset,customViewport){
 const viewport=customViewport??{width:w,height:h,inset};
 const failed=state!=='normal',problem=state==='problem';
 const caption=problem?'这份经营记录无法读取':failed?'部分资源未能载入，请重试':'正在加载 60 / 100';
 let g=loadingLayout(viewport,{failed,problem});
 const label=await textArt(caption,g.label.fontSize,true,'#fff4d6',g.label.width);
 g=loadingLayout(viewport,{failed,problem,labelHeight:label.info.height,labelWidth:label.info.width});
 const layers=[];
 layers.push(await sprite(paths.managers,g.managers,w,h));
 layers.push(await sprite(paths.logo,g.logo,w,h));
 const b=g.bar;
 const svg=Buffer.from(`<svg width="${w}" height="${h}"><rect x="${b.x-3}" y="${b.y-3}" width="${b.width+6}" height="17" rx="8" fill="#263f29" stroke="#f6dfa2" stroke-width="2"/><rect x="${b.x}" y="${b.y}" width="${b.width*.6}" height="11" rx="5" fill="#eacb64"/>${`<rect x="${g.caption.x}" y="${g.caption.y}" width="${g.caption.width}" height="${g.caption.height}" rx="7" fill="#203b2a"/>`}${failed?`<rect x="${g.retry.x}" y="${g.retry.y}" width="130" height="38" rx="9" fill="#f6dfa2"/>`:''}${problem?`<rect x="${g.problem.x-70}" y="${g.problem.y-17}" width="140" height="34" rx="8" fill="#203b2a"/>`:''}</svg>`);
 layers.push({input:svg},{input:label.data,left:Math.round(g.label.x-label.info.width/2),top:Math.round(g.label.y)});
 if(failed){
   const retry=await textArt('重试加载',16,true,'#243d27');
   layers.push({input:retry.data,left:Math.round(g.retry.x+65-retry.info.width/2),top:Math.round(g.retry.y+19-retry.info.height/2)});
 }
 if(problem){
   const more=await textArt('查看存档问题',14,false,'#fff4d6');
   layers.push({input:more.data,left:Math.round(g.problem.x-more.info.width/2),top:Math.round(g.problem.y-more.info.height/2)});
 }
 const output=`${dir}/${customViewport?'landscape-':''}${state}-${w}x${h}${inset?'-safe':''}.png`;
 const background=customViewport?await sharp({create:{width:w,height:h,channels:3,background:'#000000'}}).composite([{input:await sharp(paths.background).resize(Math.round(viewport.width),Math.round(viewport.height),{fit:'cover',position:'centre',kernel:'nearest'}).png().toBuffer(),left:Math.round(viewport.x),top:Math.round(viewport.y)}]).png().toBuffer():await sharp(paths.background).resize(w,h,{fit:'cover',position:'centre',kernel:'nearest'}).png().toBuffer();
 await sharp(background).composite(layers.filter(Boolean)).png().toFile(output);
 measurements.push({output,state,size:[w,h],viewport,inset,caption,labelRaster:[label.info.width,label.info.height],geometry:g,note:'Offline Sharp/Pango composition; Noto Sans CJK SC substitute for system font. Supplied label raster height feeds pure layout; image layers rounded to raster pixels, fractional landscape viewport background rounded; no runtime or Pixi evidence.'});
 return output;
}
for(const state of ['normal','failed','problem']){
 const output=await compose(390,844,state,{top:44,bottom:34});
 const marks=Buffer.from('<svg width="390" height="844"><rect x="0" y="0" width="390" height="44" fill="#990033" opacity=".4"/><rect x="0" y="810" width="390" height="34" fill="#990033" opacity=".4"/><path d="M0 44H390 M0 810H390" stroke="#ff66aa" stroke-dasharray="5 4"/></svg>');
 await sharp(output).composite([{input:marks}]).png().toFile(output.replace('.png','-marked.png'));
}
for(const [w,h] of [[320,568],[320,640],[390,844],[414,896]]){
 for(const state of ['normal','failed','problem'])await compose(w,h,state);
}
for(const state of ['normal','failed','problem'])await compose(844,390,state,undefined,{x:(844-390*390/844)/2,y:0,width:390*390/844,height:390});
for(const [name,path] of Object.entries({source:'assets/source/art/loading/managers.png',webp:paths.managers})){
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const count={zero:0,low1to5:0,partial6to254:0,opaque:0};const bounds=[info.width,info.height,-1,-1];
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===0)count.zero++;else if(a<=5)count.low1to5++;else if(a<255)count.partial6to254++;else count.opaque++;if(a>5){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}}
 measurements.push({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex'),size:[info.width,info.height],alpha:count,visibleBoundsAlphaOver5:bounds});
 for(const [tone,color] of [['cream','#f7f0d9'],['green','#172b20']])await sharp({create:{width:info.width,height:info.height,channels:3,background:color}}).composite([{input:path}]).png().toFile(`${dir}/managers-${name}-${tone}.png`);
}
for(const path of ['src/view/loading-layout.js','src/view/loading-screen.js'])measurements.push({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
await writeFile(`${dir}/measurements.json`,JSON.stringify(measurements,null,2)+'\n');
