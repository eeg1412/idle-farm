// Static image evidence only. Does not start or validate the game.
// Run after the asset owner and integration owner have completed their outputs.
// Sources are current portraits and v3 CGs only; deleted draft modes are removed.
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadingLayout } from '../../src/view/loading-layout.js';
const root = 'assets/source/art/managers/orders/redesign-v2';
const out = `${root}/reviews`;
await mkdir(out, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const records = [];
async function save(name, pipeline, inputs, geometry = {}) {
  const file = `${out}/${name}.png`;
  const bytes = await pipeline.png().toBuffer();
  await writeFile(file, bytes);
  records.push({ path: file, sha256: hash(bytes), inputs, geometry, localOnly: true });
}
const canvas = (w, h, color = '#fcf2e2') => sharp({ create: { width: w, height: h, channels: 4, background: color } });
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const expressions = ['smile', 'happy', 'angry', 'sad'];
if (process.argv.includes('--base')) {
  const input = `${root}/male-smile.png`;
  await save('male-smile-normal', sharp(input).flatten({ background: '#eadcc2' }), [input]);
  await save('male-smile-pixels', sharp(input).extract({ left: 375, top: 20, width: 230, height: 230 })
    .resize(690, 690, { kernel: 'nearest' }).flatten({ background: '#eadcc2' }), [input], { crop: [375, 20, 230, 230], nearestScale: 3 });
} else if (process.argv.includes('--female-v3') || process.argv.includes('--male-v3')) {
  const male = process.argv.includes('--male-v3');
  const gender = male ? 'male' : 'female';
  const file = `assets/source/art/loading/solo/orders/redesign-v2/${gender}-scene-v3.png`;
  for (const [W,H] of [[320,568],[390,844],[414,896],[180,390]]) {
    const faceBounds = male ? {x:331,y:467,width:220,height:208} : {x:376,y:624,width:254,height:186};
    const g = loadingLayout({width:W,height:H},{scene:{width:1024,height:1536,faceBounds}});
    const scene = await sharp(file).resize(W,H,{fit:'cover',position:'centre',kernel:'nearest'}).png().toBuffer();
    const logo = await sharp('public/art/loading/logo.webp').resize(Math.round(g.logo.width),Math.round(g.logo.height)).png().toBuffer();
    const control = svg(W,H, `<rect x="${g.bar.x-3}" y="${g.bar.y-3}" width="${g.bar.width+6}" height="17" rx="8" fill="#263f29" stroke="#f6dfa2" stroke-width="2"/><rect x="${g.bar.x}" y="${g.bar.y}" width="${g.bar.width*.7}" height="11" rx="5" fill="#eacb64"/><rect x="${g.caption.x}" y="${g.caption.y}" width="${g.caption.width}" height="${g.caption.height}" rx="7" fill="#203b2a"/><text x="${W/2}" y="${g.label.y+15}" text-anchor="middle" font-size="${g.label.fontSize}" fill="#fff9ee">正在准备庄园</text>`);
    await save(`${gender}-v3-${W}x${H}`, sharp(scene).composite([{input:logo,left:Math.round(g.logo.x),top:Math.round(g.logo.y)},{input:control,left:0,top:0}]),[file,'public/art/loading/logo.webp','src/view/loading-layout.js'],{viewport:[W,H],layout:g,faceBounds,faceBoundsStatus:'measured current v3 source'});
  }
} else {
  for (const e of expressions) {
    const input = `${root}/male-${e}.png`;
    await save(`male-${e}-normal`, sharp(input).flatten({ background: '#eadcc2' }), [input]);
    const portrait = `public/art/managers/portraits/orders/male-${e}.webp`;
    await save(`male-${e}-portrait`, sharp(portrait).flatten({ background: '#eadcc2' }), [portrait]);
  }
  const anchors = JSON.parse(await readFile('src/content/manager-portraits.json', 'utf8'));
  for (const W of [180, 320, 390, 414]) {
    for (const role of ['orders', 'warehouse', 'tasks']) {
      const eList = role === 'orders' ? expressions : ['smile'];
      for (const e of eList) {
        const gender = role === 'tasks' ? 'female' : 'male';
        const portrait = `public/art/managers/portraits/${role}/${gender}-${e}.webp`;
        const bg = `public/art/managers/backgrounds/${role}.webp`;
        // build -> scrollArea -> layoutUI -> managerBanner, zero safe insets, UI zoom 1.
        const x = 10, width = W - 20, span = W;
        const H = Math.max(66, Math.min(205, Math.round(width * 0.45)));
        const tight = span < 275, gap = tight ? 3 : width < 350 ? 6 : 8;
        const actionWidth = tight ? Math.max(20, Math.min(48, Math.floor((span * .64 - 10 - 2 * gap) / 3))) : 48;
        const actionSpan = actionWidth * 3 + gap * 2;
        const dialogueX = Math.max(5, Math.min(Math.round(span * .39), W - actionSpan - 14));
        const a = anchors[role][gender];
        const formerWidth = Math.min(dialogueX + 3, (H - 3) * 255 / a.height);
        const factor = formerWidth / 255;
        const left = Math.round(dialogueX / 2 - a.faceX * factor);
        const meta = await sharp(portrait).metadata();
        const pw = Math.round(meta.width * factor), ph = Math.round(meta.height * factor);
        const scaled = await sharp(portrait).resize(pw, ph).png().toBuffer();
        // A padded intermediate permits the same off-viewport portrait positioning.
        const pad = 200;
        let strip = canvas(W + pad * 2, H + pad * 2, '#fcf2e2');
        const background = await sharp(bg).resize(W, H, { fit: 'cover' }).png().toBuffer();
        const bubbleY = tight ? 4 : 8, buttonsTop = H - actionWidth - 6;
        const bubbleH = Math.max(18, buttonsTop - bubbleY - (tight ? 3 : 6));
        const bubble = svg(W, H, `<rect x="${dialogueX}" y="${bubbleY}" width="${W-dialogueX-10}" height="${bubbleH}" rx="8" fill="#fff9ee" stroke="#c8aa7e"/><text x="${dialogueX+10}" y="${bubbleY+17}" font-size="${width<350?14:16}" fill="#172f1b">你好</text>`);
        const layers = [{ input: background, left: pad, top: pad }, { input: scaled, left: pad + left, top: pad + H - ph }, { input: bubble, left: pad, top: pad }];
        const actionLeft = dialogueX + (W - dialogueX - 10 - actionSpan) / 2;
        for (const [i, icon] of ['info', 'gift', 'switch'].entries()) {
          layers.push({ input: await sharp(`public/art/managers/icons/${icon}.webp`).resize(actionWidth, actionWidth).png().toBuffer(), left: pad + Math.round(actionLeft + i * (actionWidth + gap)), top: pad + buttonsTop });
        }
        strip = sharp(await strip.composite(layers).png().toBuffer()).extract({ left: pad, top: pad, width: W, height: H });
        await save(`banner-${W}-${role}-${e}`, strip, [portrait, bg, 'src/view/canvas-ui.js', 'src/content/manager-portraits.json'], { viewport: W, uiZoom: 1, x, width, height: H, dialogueX, portraitScale: factor, portraitLeft: left });
        if (role === 'orders') {
          // Profile and directory have cover=true; crop is centered and masks both sides.
          for (const [use, outer, ratio, aspect] of [['profile', W-58, .34, 1.13], ['directory', W-36, .32, 1.12]]) {
            const artWidth = outer < 210 ? Math.min(outer,135) : Math.floor(outer * ratio);
            const artHeight = Math.round(artWidth * aspect);
            await save(`${use}-${W}-${e}`, sharp(portrait).resize(artWidth-4,artHeight-4,{fit:'cover',position:'centre'}).flatten({background:'#fcf2e2'}), [portrait, 'src/view/canvas-ui.js', 'src/view/manager-page.js'], { artWidth, artHeight, cover:true, uiZoom:1, safeInsets:0 });
          }
        }
      }
    }
  }
  const manifest = JSON.parse(await readFile('src/content/loading-scenes.json', 'utf8'));
  const entries = Array.isArray(manifest) ? manifest : manifest.scenes;
  for (const gender of process.argv.includes('--portraits-only') ? [] : ['female', 'male']) {
    const a = entries.find(x => x.id === `orders-${gender}`);
    const file = `public/${a.path}`;
    for (const [W,H] of [[320,568],[390,844],[414,896],[180,390]]) {
      const g = loadingLayout({x:0,y:0,width:W,height:H}, {scene:a,labelHeight:20});
      const scene = await sharp(file).resize(W,H,{fit:'cover',position:'centre',kernel:'nearest'}).png().toBuffer();
      const logo = await sharp('public/art/loading/logo.webp').resize(Math.round(g.logo.width),Math.round(g.logo.height)).png().toBuffer();
      const control = svg(W,H, `<rect x="${g.bar.x-3}" y="${g.bar.y-3}" width="${g.bar.width+6}" height="17" rx="8" fill="#263f29" stroke="#f6dfa2" stroke-width="2"/><rect x="${g.bar.x}" y="${g.bar.y}" width="${g.bar.width*.7}" height="11" rx="5" fill="#eacb64"/><rect x="${g.caption.x}" y="${g.caption.y}" width="${g.caption.width}" height="${g.caption.height}" rx="7" fill="#203b2a"/><text x="${W/2}" y="${g.label.y+15}" text-anchor="middle" font-size="${g.label.fontSize}" fill="#fff9ee">正在准备庄园</text>`);
      await save(`loading-${gender}-${W}x${H}`, sharp(scene).composite([{input:logo,left:Math.round(g.logo.x),top:Math.round(g.logo.y)},{input:control,left:0,top:0}]),[file,'public/art/loading/logo.webp','src/content/loading-scenes.json','src/view/loading-layout.js'], {viewport:[W,H],safeInsets:0,layout:g,caption:'static sample text; geometry from loadingLayout'});
    }
  }
  const comparison = [...expressions.map(e=>`banner-390-orders-${e}`), 'banner-390-warehouse-smile', 'banner-390-tasks-smile'];
  const rowHeight = 197;
  const comparisonLayers = [];
  for (const [i,name] of comparison.entries()) {
    comparisonLayers.push({input:await readFile(`${out}/${name}.png`),left:0,top:i*rowHeight+23});
    comparisonLayers.push({input:svg(390,23,`<text x="4" y="16" font-size="14" fill="#172f1b">${name}</text>`),left:0,top:i*rowHeight});
  }
  await save('banner-390-comparison',canvas(390,rowHeight*comparison.length).composite(comparisonLayers),comparison.map(n=>`${out}/${n}.png`),{scale:1});
  const cardNames = expressions.flatMap(e=>[`profile-390-${e}`,`directory-390-${e}`]);
  const cardLayers = [];
  for(const[i,name]of cardNames.entries()){
    const col=i%2,row=Math.floor(i/2);
    cardLayers.push({input:svg(210,23,`<text x="4" y="16" font-size="13" fill="#172f1b">${name}</text>`),left:col*210,top:row*160});
    cardLayers.push({input:await readFile(`${out}/${name}.png`),left:col*210,top:row*160+24});
  }
  await save('cards-390-comparison',canvas(420,640).composite(cardLayers),cardNames.map(n=>`${out}/${n}.png`),{scale:1});
  const portraitLayers=[];
  for(const[i,e]of expressions.entries()){
    portraitLayers.push({input:await readFile(`${out}/male-${e}-portrait.png`),left:(i%2)*500,top:Math.floor(i/2)*315+26});
    portraitLayers.push({input:svg(500,26,`<text x="4" y="18" font-size="15" fill="#172f1b">male-${e}</text>`),left:(i%2)*500,top:Math.floor(i/2)*315});
  }
  await save('male-four-portraits',canvas(1000,630,'#eadcc2').composite(portraitLayers),expressions.map(e=>`public/art/managers/portraits/orders/male-${e}.webp`),{scale:1});
}
const suffix = process.argv.includes('--base') ? '-base' : process.argv.includes('--female-v3') ? '-female-v3' : process.argv.includes('--male-v3') ? '-male-v3' : process.argv.includes('--portraits-only') ? '-portraits' : '';
await writeFile(`${out}/evidence-manifest${suffix}.json`,JSON.stringify({method:'Static sharp image composition; no game preview',script:'docs/art-reviews/2026-11-22-order-art-redesign-v2-static.mjs',records},null,2)+'\n');
console.log(JSON.stringify({evidenceCount:records.length,manifest:`${out}/evidence-manifest${suffix}.json`}));
