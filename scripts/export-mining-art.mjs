import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const file = (path) => fileURLToPath(new URL(path, root));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const quality = { quality: 70, alphaQuality: 100, effort: 6 };
const idsA = [...Array.from({length:10},(_,i)=>'M'+String(i+1).padStart(2,'0')), ...Array.from({length:15},(_,i)=>'IM'+String(i+1).padStart(2,'0'))];
const idsB = ['IM16', ...Array.from({length:14},(_,i)=>'PM'+String(i+1).padStart(2,'0'))];
const idsC = ['PM15','PM16','PM17','PM18','PM19','PM20','PM21','PM22','PM23'];
const expansionSource = 'items-C-v2';
const expansionSources = {
 'items-C-v1': {
  promptFile:'assets/mining/prompts-items-C-v1.md',
  references:['PM09','PM10','PM11','PM13'].map(id=>'assets/source/items/overrides/'+id+'.png'),
  status:'superseded',
 },
 'items-C-v2-draft': {
  promptFile:'assets/mining/prompts-items-C-v2.md',
  references:['assets/source/items/overrides/PM09.png'],
  status:'draft',
 },
 [expansionSource]: {
  promptFile:'assets/mining/prompts-items-C-v2.md',
  references:['assets/mining/raw/items-C-v2-draft.png'],
 },
};
const oreSource = 'item-M10-v2';
const oreSourceMetadata = {
 promptFile:'assets/mining/prompts-item-M10-v2.md',
 references:['assets/mining/raw/items-A-v1.png'],
};
const expansionOnly = process.argv.includes('--pm-expansion-only');
const oreOnly = process.argv.includes('--m10-only');
const contentExpansionFlag = process.argv.indexOf('--content-expansion');
const contentExpansion = contentExpansionFlag !== -1;
const registrationStageFlag = process.argv.indexOf('--stage-registration');
const registrationStage = registrationStageFlag === -1 ? undefined : process.argv[registrationStageFlag+1];
if (registrationStageFlag !== -1 && (!contentExpansion || !registrationStage || registrationStage.startsWith('--'))) {
 throw new Error('Use --stage-registration <directory> with --content-expansion.');
}
const idsInRange = (prefix, first, last) =>
 Array.from({length:last-first+1}, (_,index) => prefix+String(first+index).padStart(2,'0'));
const expandedOres = idsInRange('M',11,30);
const expandedItems = [...expandedOres, ...idsInRange('IM',17,36), ...idsInRange('PM',24,83)];
const uiNames = ['mining-tab','facility-empty-mine','mining-buy','mining-upgrade','mining-yield','mining-research','mining-processing','mining-cycle','mining-refining'];
const registryPath = file('assets/mining/registration.json');
const visualsPath = file('src/content/mining-visuals.json');
const batchRegistryPath = registrationStage ? resolve(registrationStage,'assets/mining/registration.json') : registryPath;
const batchVisualsPath = registrationStage ? resolve(registrationStage,'src/content/mining-visuals.json') : visualsPath;
const partialExport = expansionOnly || oreOnly || contentExpansion;
async function readPrevious(path, required) {
 try {
  return JSON.parse(await readFile(path,'utf8'));
 } catch (error) {
  if (required || error.code !== 'ENOENT') throw error;
  return undefined;
 }
}
const previousRegistry = (registrationStage && await readPrevious(batchRegistryPath,false)) ??
 await readPrevious(registryPath,partialExport) ?? {};
const registry = partialExport
 ? previousRegistry
 : {version:1, generatedWith:'built-in image_gen', promptFile:'assets/mining/prompts.md', conversion:'isolated alpha crop; nearest-neighbor resize; WebP quality70 alpha100', sources:{}, items:{}, ui:{}, scene:{}};
if (contentExpansion) {
 if (expansionOnly || oreOnly) throw new Error('Use --content-expansion separately from historical export options.');
 const manifestPath = process.argv[contentExpansionFlag+1];
 if (!manifestPath || manifestPath.startsWith('--')) throw new Error('Supply the icon source manifest path after --content-expansion.');
 await exportContentExpansion(JSON.parse(await readFile(manifestPath,'utf8')));
 process.exit(0);
}
const catalog = JSON.parse(await readFile(file('src/content/game-data.json'),'utf8'));
const expansionIds = Object.keys(catalog.items).filter(id=>idsC.includes(id));
if (expansionIds.join() !== idsC.join()) throw new Error('PM15–PM23 must match the generated catalogue order.');
for (const dir of ['assets/mining/png','assets/mining/source-icons','assets/source/items/overrides','public/wiki/icons','public/ui-icons','public/art/mining']) await mkdir(file(dir),{recursive:true});
const sources = oreOnly ? [oreSource] : expansionOnly ? Object.keys(expansionSources) : [
 'items-A-v1','items-B-v1','background-v1','cart-v1','ui-v1',...Object.keys(expansionSources),oreSource,
];
for (const key of sources) {
 const path='assets/mining/raw/'+key+'.png'; const bytes=await readFile(file(path)); const m=await sharp(bytes).metadata();
 const metadata = key === oreSource ? oreSourceMetadata : expansionSources[key];
 registry.sources[key]={path,sha256:hash(bytes),width:m.width,height:m.height,generatedWith:'built-in image_gen',...metadata};
}
async function writeImage(pngPath,webpPath,png) {
 await writeFile(file(pngPath),png);
 const published=await sharp(png).webp(quality).toBuffer(); await writeFile(file(webpPath),published);
 return {png:pngPath,path:webpPath,pngSha256:hash(png),sha256:hash(published)};
}
async function writeMineScene(id, background, cart, foreground) {
 const icon = registry.items[id].path;
 const cargo = await sharp(file(icon)).resize(58,48,{fit:'contain',background:'#00000000',kernel:'nearest'}).png().toBuffer();
 const scene = await sharp(background).composite([{input:cart,left:201,top:177},{input:cargo,left:220,top:144},{input:foreground,left:0,top:0}]).png().toBuffer();
 registry.scene[id] = {
  ...await writeImage('assets/mining/png/scene-'+id+'.png','public/art/scene-'+id+'.webp',scene),
  layers:['background','empty-cart','canonical-item-icon','cave-foreground'],icon,
 };
}
async function exportContentExpansion(manifest) {
 const visuals = (registrationStage && await readPrevious(batchVisualsPath,false)) ??
  await readPrevious(visualsPath,true);
 const [background, cart, foreground] = await Promise.all(
  ['background','cart','foreground'].map(layer => readFile(file(registry.scene[layer].png))),
 );
 const toRect = ([left,top,right,bottom]) => ({left,top,width:right-left,height:bottom-top});
 const items = expandedItems.filter(id => Object.hasOwn(manifest.items,id));
 for (const id of items) {
  const item = manifest.items[id];
  const atlas = manifest.atlases[item.atlas];
  registry.sources[item.atlas] = atlas;
  const content = toRect(item.contentBounds);
  registry.items[id] = {
   name:item.name,source:item.atlas,cell:toRect(item.cellBounds),index:atlas.ids.indexOf(id),
   sourceBounds:toRect(item.sourceBounds),
   contentBounds:{x:content.left,y:content.top,width:content.width,height:content.height},
   png:item.source,path:item.webp,pngSha256:item.sourceSha256,sha256:item.webpSha256,
  };
  if (expandedOres.includes(id)) {
   await writeMineScene(id, background, cart, foreground);
   visuals.items[id] = {icon:item.webp.slice('public/'.length),scene:registry.scene[id].path.slice('public/'.length)};
  }
 }
 await mkdir(dirname(batchVisualsPath),{recursive:true});
 await mkdir(dirname(batchRegistryPath),{recursive:true});
 await writeFile(batchVisualsPath,JSON.stringify(visuals,null,2)+'\n');
 await writeFile(batchRegistryPath,JSON.stringify(registry,null,2)+'\n');
 console.log(`Registered ${items.length} expanded mining icons and exported ${items.filter(id => expandedOres.includes(id)).length} selection scenes.`);
}
async function isolated(source,cell,target=82,canvas=96) {
 const {data,info}=await sharp(file(source)).extract(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Isolate the subject rather than exporting a neighboring cell's stray corner.
 // These alpha components only delimit source crops; they never draw replacement pixels.
 const visited=new Uint8Array(info.width*info.height),components=[];
 for(let p=0;p<visited.length;p++){
  if(visited[p]||data[p*4+3]<32)continue;
  const stack=[p];visited[p]=1;let left=info.width,top=info.height,right=-1,bottom=-1,count=0;
  while(stack.length){const q=stack.pop(),x=q%info.width,y=Math.floor(q/info.width);count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   for(const next of [x>0?q-1:-1,x<info.width-1?q+1:-1,y>0?q-info.width:-1,y<info.height-1?q+info.width:-1])if(next>=0&&!visited[next]&&data[next*4+3]>=32){visited[next]=1;stack.push(next);}
  }components.push({left,top,right,bottom,count});
 }
 components.sort((a,b)=>b.count-a.count); const main=components[0];
 let x0=main?.left??info.width,y0=main?.top??info.height,x1=main?.right??-1,y1=main?.bottom??-1;
 for(const part of components.slice(1))if(part.count>=8&&part.left<=main.right+12&&part.right>=main.left-12&&part.top<=main.bottom+12&&part.bottom>=main.top-12){x0=Math.min(x0,part.left);x1=Math.max(x1,part.right);y0=Math.min(y0,part.top);y1=Math.max(y1,part.bottom);}
 if(x1<0)throw new Error('Empty sprite '+source);
 const trim={left:Math.max(0,x0-2),top:Math.max(0,y0-2),width:Math.min(info.width-1,x1+2)-Math.max(0,x0-2)+1,height:Math.min(info.height-1,y1+2)-Math.max(0,y0-2)+1};
 // Preserve alpha; remove only negligible generation noise, matching the established item exporter.
 for(let i=3;i<data.length;i+=4)if(data[i]<12)data[i]=0;
 const cut=await sharp(data,{raw:info}).extract(trim).resize({width:target,height:target,fit:'inside',kernel:'nearest'}).png().toBuffer();
 const m=await sharp(cut).metadata();
 const png=await sharp({create:{width:canvas,height:canvas,channels:4,background:'#00000000'}}).composite([{input:cut,left:Math.floor((canvas-m.width)/2),top:Math.floor((canvas-m.height)/2)}]).png().toBuffer();
 return {png,sourceBounds:{left:cell.left+trim.left,top:cell.top+trim.top,width:trim.width,height:trim.height},contentBounds:{x:Math.floor((canvas-m.width)/2),y:Math.floor((canvas-m.height)/2),width:m.width,height:m.height}};
}
const legacyXCuts = [0,251,502,752,1003,1254];
const expansionSheet = [expansionSource,expansionIds,[0,408,818,1254],[0,418,828,1254]];
const itemSheets = oreOnly ? [[oreSource,['M10'],[0,registry.sources[oreSource].width],[0,registry.sources[oreSource].height]]] : expansionOnly ? [expansionSheet] : [
 ['items-A-v1',idsA,legacyXCuts,[0,251,502,752,1003,1254]],
 ['items-B-v1',idsB,legacyXCuts,[0,265,530,815]],
 expansionSheet,
];
for(const [sheet,ids,xCuts,yCuts] of itemSheets) {
 const columns=xCuts.length-1;
 for(const [index,id] of ids.entries()){
  if(!catalog.items[id])throw new Error('Wait for formal catalogue '+id);
  const row=Math.floor(index/columns),col=index%columns;
  const right = (sheet === 'items-B-v1' && row === 2 && col === 3) || (sheet === 'items-A-v1' && row === 4 && col === 3) ? 990 : xCuts[col+1];
  const key = id === 'M10' ? oreSource : sheet;
  const cell = id === 'M10'
   ? {left:0,top:0,width:registry.sources[oreSource].width,height:registry.sources[oreSource].height}
   : {left:xCuts[col],top:yCuts[row],width:right-xCuts[col],height:yCuts[row+1]-yCuts[row]};
  const sprite=await isolated(registry.sources[key].path,cell);
  const output=await writeImage('assets/source/items/overrides/'+id+'.png','public/wiki/icons/'+id+'.webp',sprite.png);
  registry.items[id]={name:catalog.items[id].name,source:key,cell,index:id === 'M10' ? 0 : index,sourceBounds:sprite.sourceBounds,contentBounds:sprite.contentBounds,...output};
 }
}
const exportedIds = itemSheets.flatMap(([,ids])=>ids);
if (!oreOnly) {
 const overrides=JSON.parse(await readFile(file('assets/source/items/overrides.json'),'utf8'));
 for(const id of exportedIds)overrides[id]='overrides/'+id+'.png';
 await writeFile(file('assets/source/items/overrides.json'),JSON.stringify(overrides,null,2)+'\n');
}
// Recompute grounding only for the item IDs exported by this invocation.
const bottomsPath='src/content/workshop-item-bottoms.json';
const bottoms=JSON.parse(await readFile(file(bottomsPath),'utf8'));
for(const id of exportedIds) {
 const {data,info}=await sharp(file(registry.items[id].png)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128)bottom=Math.max(bottom,y+1);
 bottoms[id]=bottom;
}
await writeFile(file(bottomsPath),JSON.stringify(bottoms,null,2)+'\n');
if (oreOnly) {
 registry.items.IM10.name = catalog.items.IM10.name;
 const [background, cart, foreground] = await Promise.all(
  ['background','cart','foreground'].map(layer => readFile(file(registry.scene[layer].png))),
 );
 await writeMineScene('M10', background, cart, foreground);
 await writeFile(registryPath,JSON.stringify(registry,null,2)+'\n');
 console.log('Converted the M10 item icon and mine scene.');
 process.exit(0);
}
const expansionReview = expansionIds.map((id,index)=>({
 input:file(registry.items[id].path),
 left:(index%3)*110+7,
 top:Math.floor(index/3)*110+7,
}));
await sharp({create:{width:330,height:330,channels:4,background:'#344343'}})
 .composite(expansionReview).png().toFile(file(`assets/mining/png/${expansionSource}-review.png`));
if(expansionOnly){
 await writeFile(registryPath,JSON.stringify(registry,null,2)+'\n');
 console.log('Converted PM15–PM23 item icons and updated mining and conveyor registration.');
 process.exit(0);
}
const uiX=[0,421,842,1263],uiY=[0,415,831,1246];
for(const [index,name]of uiNames.entries()){
 const row=Math.floor(index/3),col=index%3,cell={left:uiX[col],top:uiY[row],width:uiX[col+1]-uiX[col],height:uiY[row+1]-uiY[row]};
 const sprite=await isolated(registry.sources['ui-v1'].path,cell);
 const output=await writeImage('assets/mining/source-icons/'+name+'.png','public/ui-icons/'+name+'.webp',sprite.png);
 registry.ui[name]={source:'ui-v1',cell,sourceBounds:sprite.sourceBounds,contentBounds:sprite.contentBounds,...output};
}
const background=await sharp(file(registry.sources['background-v1'].path)).resize(320,320,{kernel:'nearest'}).png().toBuffer();
registry.scene.background=await writeImage('assets/mining/png/background.png','public/art/mining/background.webp',background);
// Keep the original cave interior and near post as a separate layer below the moving cart.
// This alpha mask only selects untouched original background pixels.
const pixels=await sharp(background).ensureAlpha().raw().toBuffer();
for(let y=0;y<320;y++)for(let x=0;x<320;x++){
 const edge=y<104?135:y<124?137:y<229?134:y<245?133:0;
 if(x>=edge)pixels[(y*320+x)*4+3]=0;
}
const foreground=await sharp(pixels,{raw:{width:320,height:320,channels:4}}).png().toBuffer();
registry.scene.foreground={...await writeImage('assets/mining/png/foreground.png','public/art/mining/foreground.webp',foreground),source:'background-v1',sourceSelection:'left cave/near post silhouette; alpha boundary only',rect:{x:0,y:0,width:320,height:320}};
const cartSprite=await isolated(registry.sources['cart-v1'].path,{left:0,top:0,width:1492,height:1054},88,96);
const cartCut=await sharp(cartSprite.png).extract({left:cartSprite.contentBounds.x,top:cartSprite.contentBounds.y,width:cartSprite.contentBounds.width,height:cartSprite.contentBounds.height}).png().toBuffer();
const cartM=await sharp(cartCut).metadata(); const cartTop=60-cartM.height;
const cart=await sharp({create:{width:96,height:64,channels:4,background:'#00000000'}}).composite([{input:cartCut,left:4,top:cartTop}]).png().toBuffer();
const cartGeometry = { width: 96, height: 64, anchorX: 48, anchorY: 60 };
const cargoGeometry = { x: 48, y: 15, width: 58, height: 48, anchorX: 0.5, anchorY: 1 };
registry.scene.cart = {
  ...await writeImage('assets/mining/png/cart.png', 'public/art/mining/cart.webp', cart),
  source: 'cart-v1', sourceBounds: cartSprite.sourceBounds, ...cartGeometry, cargo: cargoGeometry,
};
const previousVisuals = await readPrevious(visualsPath,false);
const visuals = {
  version: 1,
  sceneSize: 320,
  background: { path: 'art/mining/background.webp', width: 320, height: 320 },
  foreground: { path: 'art/mining/foreground.webp', rect: { x: 0, y: 0, width: 320, height: 320 } },
  cart: { path: 'art/mining/cart.webp', ...cartGeometry, visibleLeftX: 5, cargo: cargoGeometry },
  // The opening's inside edges are measured at the height of the cart, below the arch.
  opening: { left: 28, right: 108 },
  sparks: previousVisuals?.sparks,
  track: { inside: { x: 70, y: 237 }, station: { x: 249, y: 237 } },
  items: {},
};
for(const id of idsA.slice(0,10)){
 await writeMineScene(id, background, cart, foreground);
 visuals.items[id]={icon:'wiki/icons/'+id+'.webp',scene:'art/scene-'+id+'.webp'};
}
for (const id of expandedItems) {
 const item = previousRegistry.items?.[id];
 if (!item) continue;
 registry.sources[item.source] = previousRegistry.sources[item.source];
 registry.items[id] = item;
 if (expandedOres.includes(id)) {
  await writeMineScene(id, background, cart, foreground);
  visuals.items[id] = {icon:item.path.slice('public/'.length),scene:registry.scene[id].path.slice('public/'.length)};
 }
}
await writeFile(visualsPath,JSON.stringify(visuals,null,2)+'\n');
await writeFile(registryPath,JSON.stringify(registry,null,2)+'\n');
// Contact sheets are composed only from the deliverable images, for visual inspection.
for(let start=0;start<40;start+=10){
 const ids=[...idsA,...idsB].slice(start,start+10),inputs=[];
 for(const [i,id]of ids.entries())inputs.push({input:await readFile(file('public/wiki/icons/'+id+'.webp')),left:(i%5)*110+7,top:Math.floor(i/5)*110+7});
 await sharp({create:{width:550,height:220,channels:4,background:'#344343'}}).composite(inputs).png().toFile(file('assets/mining/png/items-'+(start/10+1)+'-review.png'));
}
const uiInputs=[];for(const [i,name]of uiNames.entries())uiInputs.push({input:await readFile(file('public/ui-icons/'+name+'.webp')),left:(i%3)*110+7,top:Math.floor(i/3)*110+7});
await sharp({create:{width:330,height:330,channels:4,background:'#344343'}}).composite(uiInputs).png().toFile(file('assets/mining/png/ui-review.png'));
const sceneInputs=[];
for(const [i,id]of idsA.slice(0,10).entries())sceneInputs.push({input:await sharp(file('public/art/scene-'+id+'.webp')).resize(130,130,{kernel:'nearest'}).png().toBuffer(),left:(i%5)*130,top:Math.floor(i/5)*130});
await sharp({create:{width:650,height:260,channels:4,background:'#344343'}}).composite(sceneInputs).png().toFile(file('assets/mining/png/scenes-130-review.png'));
console.log(`Converted ${exportedIds.length} canonical item icons, 9 UI icons, layered mine art, ${Object.keys(visuals.items).length} selection scenes and source registration. No checks, tests or build invoked.`);
