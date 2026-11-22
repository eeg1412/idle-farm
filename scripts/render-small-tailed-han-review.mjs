// Ordinary static art evidence only. Does not load the game, run checks, or build.
// Run from repository root; add --include-delivery after the L08 owner hands over.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { livestockLayout, livestockFeedLayout } from '../src/view/livestock-layout.js';

const directory = 'assets/livestock/reviews/l08-small-tailed-han-v1';
const script = 'scripts/render-small-tailed-han-review.mjs';
const referenceCommit = 'bc3d286d050af84abf34b61ae66a4e69942ec1bc';
const revision = 'r9';
const previous = JSON.parse(await readFile('docs/art-reviews/2026-11-22-small-tailed-han.json', 'utf8'));
const history = previous.revision === revision ? previous.history : [...(previous.history ?? []), { revision: `${previous.revision ?? 'previous'}-rejected`, status: previous.status, userRejection: previous.userRejection, userRejectionHistory: previous.userRejectionHistory, inputs: previous.inputs, images: previous.images, registration: previous.registration }];
const manifest = { date: '2026-11-23', id: 'L08', revision, status: '未完成；r8用户原始色温拒稿，r9须与冻结原始参考同中性底审阅，脚本不自动宣布通过', userRejection: { id: 'HAN-R06', quote: '妈的 颜色还是不对！你能不能参考原来的色温！重画', reference: 'assets/livestock/raw/l08-small-tailed-han-v1/style-reference-mature-0.png', referenceOrigin: '用户贴图无单独本地路径；PM冻结同款原始源，独审已实开', required: '精确原图实际输入imagegen作色温/像素风参考；新成年/成熟帧/96选择均与老原图同一中性底并排，看暖奶油浅金亮面/赭棕暖棕阴影/棕轮廓，不只新资产互比', preserve: '干净连续毛层、像素风、协调全身色调和品种/动作；不恢复鼓包/碎点/短腿、不额外白脸白袜、不代码修色/平滑', userAcceptance: '未验证', gameRuntime: '未验证' }, note: '证据图仅本地保存；静态合成不证明游戏运行或真实循环通过。', script, referenceCommit, history, inputs: [], images: [] };
await mkdir(directory, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const textSvg = (width, height, labels) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.map(({ x, y, text }) => `<text x="${x}" y="${y}" font-family="sans-serif" font-size="12" fill="#222">${text}</text>`).join('')}</svg>`);
async function input(path, bytes = null, extra = {}) {
  bytes ??= await readFile(path);
  const metadata = await sharp(bytes).metadata();
  const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let min = 255, max = 0, transparent = 0, semi = 0;
  for (let i = 3; i < data.length; i += 4) { const a = data[i]; min = Math.min(min, a); max = Math.max(max, a); if (!a) transparent++; else if (a < 255) semi++; }
  manifest.inputs.push({ path, sha256: hash(bytes), width: metadata.width, height: metadata.height, alpha: { min, max, transparent, semi }, ...extra });
  return bytes;
}
async function save(name, pipeline, purpose, sources) {
  if (name.startsWith('delivery-') || name.startsWith('choice-normal-')) name = `${revision}-${name}`;
  const bytes = await pipeline.png().toBuffer();
  const path = `${directory}/${name}.png`;
  await writeFile(path, bytes);
  const status = name.startsWith(`${revision}-`) ? (name.endsWith('normal-light') ? '已生成，按实际查看记录复查状态' : '当前静态证据；结论按实际审阅记录，非用户认可或运行验证') : '历史证据；不构成当前交付通过';
  manifest.images.push({ path, sha256: hash(bytes), purpose, sources, reproduction: `node ${script}${process.argv.slice(2).length ? ` ${process.argv.slice(2).join(' ')}` : ''}`, status, localOnly: true });
}
const warmReferencePath = 'assets/livestock/raw/l08-small-tailed-han-v1/style-reference-mature-0.png';
const warmReference = await input(warmReferencePath, null, { use: '用户同款原始色温/像素风参考；不恢复大鼓包、碎点或短腿' });

const adultBasePath = 'assets/livestock/raw/l08-small-tailed-han-v1/adult-wool-r4.png';
const adultBase = await input(adultBasePath);
await save('r4-base-overview-600', sharp(adultBase).resize(600, 600, { kernel: 'nearest' }).flatten({ background: '#37474f' }), '用户毛层根因返工后的单张成年基础图；非用户认可', [adultBasePath]);
const feedingR4Path = 'assets/livestock/raw/l08-small-tailed-han-v1/feeding-r4.png';
const feedingR4 = await input(feedingR4Path);
await save('r4-feeding-overview-600', sharp(feedingR4).resize(600, 600, { kernel: 'nearest' }).flatten({ background: '#37474f' }), '连续毛层三期四帧新源，专审未恢复鼓包及真实头口变化', [feedingR4Path]);
const feedingR5Path = 'assets/livestock/raw/l08-small-tailed-han-v1/feeding-r5.png';
const feedingR5 = await input(feedingR5Path);
await save('r5-feeding-overview-600', sharp(feedingR5).resize(600, 600, { kernel: 'nearest' }).flatten({ background: '#37474f' }), 'r5去碎点/C纹并改低亮暖米灰的新源；保持原身份姿态，非用户认可', [feedingR5Path]);
const adultR6Path = 'assets/livestock/raw/l08-small-tailed-han-v1/adult-r6.png';
const adultR6 = await input(adultR6Path);
await save('r6-adult-overview-600', sharp(adultR6).resize(600, 600, { kernel: 'nearest' }).flatten({ background: '#37474f' }), 'r6无旧图输入从零成年基础，按实际像素轮廓/主色审阅', [adultR6Path]);
const feedingR6Path = 'assets/livestock/raw/l08-small-tailed-han-v1/feeding-r6.png';
const feedingR6 = await input(feedingR6Path);
await save('r6-feeding-overview-600', sharp(feedingR6).resize({ width: 600, kernel: 'nearest' }).flatten({ background: '#37474f' }), '已停止r6三期源历史，保留实际非方图尺寸；不构成当前通过', [feedingR6Path]);
const adultR8Path = 'assets/livestock/raw/l08-small-tailed-han-v1/adult-r8.png';
const adultR8 = await input(adultR8Path);
await save('r8-adult-overview-600', sharp(adultR8).resize({ width: 600, kernel: 'nearest' }).flatten({ background: '#37474f' }), 'r8从零白毛成年基础；柔和米白是PM画法，官方事实为毛被白色', [adultR8Path]);
const feedingR8Path = 'assets/livestock/raw/l08-small-tailed-han-v1/feeding-r8.png';
const feedingR8 = await input(feedingR8Path);
await save('r8-feeding-overview-600', sharp(feedingR8).resize({ width: 600, kernel: 'nearest' }).flatten({ background: '#37474f' }), 'r8同一米白基调三期四帧实际源；同图核身体/脸颈/腿无分区双色', [feedingR8Path]);
const adultR9Path = 'assets/livestock/raw/l08-small-tailed-han-v1/adult-r9.png';
const adultR9 = await input(adultR9Path);
await save('r9-adult-overview-600', sharp(adultR9).resize({ width: 600, kernel: 'nearest' }).flatten({ background: '#777777' }), 'r9实际以精确老图为色温/像素风参考的新成年，正常中性灰底', [adultR9Path, warmReferencePath]);
const adultWarmthLabels = textSvg(600, 320, [{ x: 10, y: 18, text: 'Original: temperature/style only' }, { x: 310, y: 18, text: 'R9 new adult: original warmth' }]);
await save('r9-adult-vs-original-600', sharp({ create: { width: 600, height: 320, channels: 3, background: '#777777' } }).composite([{ input: await referenceDisplay(warmReference, 280), left: 10, top: 30 }, { input: await referenceDisplay(adultR9, 280), left: 310, top: 30 }, { input: adultWarmthLabels, left: 0, top: 0 }]), '新成年与精确老原图同中性灰底比较色温，只有证据裁切/最近邻缩放，不调色', [warmReferencePath, adultR9Path]);
const feedingR9Path = 'assets/livestock/raw/l08-small-tailed-han-v1/feeding-r9.png';
const feedingR9 = await input(feedingR9Path);
await save('r9-feeding-overview-600', sharp(feedingR9).resize({ width: 600, kernel: 'nearest' }).flatten({ background: '#777777' }), 'r9双参考三期四帧实际非方源，中性灰底；不造假为平方，不改色', [feedingR9Path, adultR9Path, warmReferencePath]);

if (process.argv.includes('--rejected-png-only')) {
  const layers = [], labels = [];
  for (const [si, stage] of ['young', 'growing', 'mature'].entries()) for (let frame = 0; frame < 4; frame++) {
    const path = `assets/livestock/animals/L08/${stage}-${frame}.png`;
    const bytes = await input(path);
    const left = frame * 145 + 5, top = si * 154 + 20;
    layers.push({ input: await sharp(bytes).flatten({ background: '#d0d9d5' }).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(), left, top });
    labels.push(`<text x="${left}" y="${top - 5}" font-family="sans-serif" font-size="12">${stage} ${frame}</text>`);
  }
  layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="580" height="462">${labels.join('')}</svg>`) });
  await save('early-png-frames-130', sharp({ create: { width: 580, height: 462, channels: 3, background: '#eee9df' } }).composite(layers), '用户已拒r3十二PNG的历史静态分镜，不构成通过', ['assets/livestock/animals/L08/']);
}
// This crop is for a review image only. It never replaces a registered frame,
// changes a source color, or feeds back into production registration.
async function referenceDisplay(bytes, side = 192) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, right = -1, top = info.height, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] >= 200) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return sharp(bytes).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).resize(side, side, { fit: 'contain', background: '#00000000', kernel: 'nearest' }).png().toBuffer();
}
const oldMaturePath = 'assets/livestock/animals/L08/mature-0.png';
const oldChoicePath = 'assets/livestock/icons/L08.png';
const reference = await input(oldMaturePath, execFileSync('git', ['show', `${referenceCommit}:${oldMaturePath}`]), { gitCommit: referenceCommit, use: '画风参考，不采用旧短腿形体' });
await input(oldChoicePath, execFileSync('git', ['show', `${referenceCommit}:${oldChoicePath}`]), { gitCommit: referenceCommit, use: '旧选择图画风参考' });
for (const [revision, filename] of [['r1', 'feeding.png'], ['r2', 'feeding-r2.png'], ['r3', 'feeding-r3.png']]) {
  const path = `assets/livestock/raw/l08-small-tailed-han-v1/${filename}`;
  const source = await input(path);
  await save(`${revision}-overview-600`, sharp(source).resize(600, 600, { kernel: 'nearest' }).flatten({ background: '#37474f' }), '全源正常深底，600px宽', [path]);
  const a = await sharp(reference).extract({ left: 50, top: 90, width: 200, height: 200 }).flatten({ background: '#b8d0cf' }).resize(290, 290, { kernel: 'nearest' }).png().toBuffer();
  const b = await sharp(source).extract({ left: 0, top: 501, width: 260, height: 250 }).flatten({ background: '#b8d0cf' }).resize(290, 290, { fit: 'contain', background: '#b8d0cf', kernel: 'nearest' }).png().toBuffer();
  await save(`${revision}-style-comparison-600`, sharp({ create: { width: 600, height: 320, channels: 3, background: '#ddd' } }).composite([{ input: a, left: 5, top: 25 }, { input: b, left: 305, top: 25 }, { input: textSvg(600, 24, [{ x: 8, y: 17, text: 'Existing L08: style only' }, { x: 308, y: 17, text: `${revision}: new mature 0` }]), left: 0, top: 0 }]), '同尺寸正常底最近邻画风比较；左参考只用于画风', [`${referenceCommit}:${oldMaturePath}`, path]);
}

if (process.argv.includes('--include-delivery')) {
  const registration = JSON.parse(await readFile('assets/livestock/feeding-registration-v5.json', 'utf8'));
  const species = JSON.parse(await readFile('src/content/livestock-visuals.json', 'utf8')).L08;
  const sourceRegistration = registration.species.L08;
  const atlasTrace = JSON.parse(await readFile('assets/livestock/atlas.json', 'utf8')).species.L08;
  const choiceTrace = JSON.parse(await readFile('assets/livestock/choice-registration-v7.json', 'utf8')).species.L08;
  manifest.registration = { source: sourceRegistration, runtime: species, frames: atlasTrace.frames.map(({ stage, frame, source, sourceSha256, frameAsset, sourceRectangle, sourceAnchor, stageScale, sourceCanvas, fixedGround, scenePlacement, anchorMethod }) => ({ stage, frame, source, sourceSha256, frameAsset, sourceRectangle, sourceAnchor, stageScale, sourceCanvas, fixedGround, scenePlacement, anchorMethod })), choice: choiceTrace };
  const barn = await input('public/art/livestock/barn.webp');
  const feed = await input('public/art/livestock/feed-v8.webp');
  const atlasPath = 'public/art/livestock/animals/L08.webp';
  const atlas = await input(atlasPath);
  const layout = livestockLayout('L08');
  const pngLayers = [], webpLayers = [], sceneLayers = [], labels = [], loopLayers = [];
  for (const [stageIndex, stage] of ['young', 'growing', 'mature'].entries()) {
    const grounding = species.grounding[stageIndex];
    const feeding = species.feeding[stageIndex];
    const geometry = livestockFeedLayout(feeding, species.feedTexture, layout.animalScale);
    for (let frame = 0; frame < 4; frame++) {
      const path = `assets/livestock/animals/L08/${stage}-${frame}.png`;
      const animal = await input(path);
      const published = await sharp(atlas).extract({ left: frame * 320, top: stageIndex * 320, width: 320, height: 320 }).png().toBuffer();
      const left = frame * 145 + 5, top = stageIndex * 154 + 20;
      pngLayers.push({ input: await sharp(animal).flatten({ background: '#d0d9d5' }).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(), left, top });
      webpLayers.push({ input: await sharp(published).flatten({ background: '#d0d9d5' }).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(), left, top });
      labels.push({ x: left, y: top - 5, text: `${stage} ${frame}` });
      const placement = layout.placements[0];
      const animalScale = layout.animalScale * placement.depth;
      const dx = placement.x - 138 * animalScale, dy = placement.y - 270 * animalScale;
      const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><ellipse cx="${dx + grounding.x * animalScale}" cy="${dy + grounding.y * animalScale}" rx="${grounding.radiusX * animalScale}" ry="${grounding.radiusY * animalScale}" fill="#2b2118" opacity="0.45"/><ellipse cx="${dx + geometry.shadow.x * animalScale}" cy="${dy + geometry.shadow.y * animalScale}" rx="${geometry.shadow.radiusX * animalScale}" ry="${geometry.shadow.radiusY * animalScale}" fill="#2b2118" opacity="${geometry.shadow.alpha}"/></svg>`);
      const resizedFeed = await sharp(feed).resize(Math.round(geometry.width * animalScale), Math.round(geometry.height * animalScale), { kernel: 'nearest' }).png().toBuffer();
      const resizedAnimal = await sharp(published).resize(Math.round(320 * animalScale), Math.round(320 * animalScale), { kernel: 'nearest' }).png().toBuffer();
      // Composite the offset transparent sprite on an overscan canvas, then
      // apply the actual 320px scene clip. No animal source pixels are edited.
      const fullScene = await sharp({ create: { width: 384, height: 384, channels: 4, background: '#00000000' } }).composite([{ input: barn, left: 0, top: 0 }, { input: svg, left: 0, top: 0 }, { input: resizedFeed, left: Math.round(dx + geometry.x * animalScale), top: Math.round(dy + geometry.y * animalScale) }, { input: resizedAnimal, left: Math.round(dx), top: Math.round(dy) }]).png().toBuffer();
      const composition = await sharp(fullScene).extract({ left: 0, top: 0, width: 320, height: 320 }).resize(130, 130, { kernel: 'nearest' }).png().toBuffer();
      sceneLayers.push({ input: composition, left, top });
      if (frame === 0 || frame === 3) loopLayers.push({ input: composition, left: (frame === 3 ? 0 : 145) + 5, top });
    }
  }
  const label = { input: textSvg(580, 462, labels), left: 0, top: 0 };
  const board = layers => sharp({ create: { width: 580, height: 462, channels: 3, background: '#eee9df' } }).composite([...layers, label]);
  await save('delivery-png-frames-130', board(pngLayers), '十二张PNG固定坐标130px静态分镜；无重新居中', ['assets/livestock/animals/L08/']);
  await save('delivery-webp-frames-130', board(webpLayers), '发布WebP十二帧130px分镜', [atlasPath]);
  await save('delivery-scenes-130', board(sceneLayers), '按现有站位与喂食几何合成的三期四帧130px静态棚舍，非游戏截图', [atlasPath, 'public/art/livestock/barn.webp', 'public/art/livestock/feed-v8.webp', 'src/content/livestock-visuals.json', 'src/view/livestock-layout.js', 'src/view/livestock-animation.js']);
  const loopLabel = textSvg(290, 462, [0, 1, 2].flatMap(i => [{ x: 5, y: i * 154 + 15, text: 'Frame 3' }, { x: 150, y: i * 154 + 15, text: 'Frame 0' }]));
  await save('delivery-loop-seams-130', sharp({ create: { width: 290, height: 462, channels: 3, background: '#eee9df' } }).composite([...loopLayers, { input: loopLabel }]), '三期3→0首尾接缝静态对照，未播放真实循环', [atlasPath]);
  const choicePng = await input('assets/livestock/icons/L08.png');
  const choiceWebp = await input('public/ui-icons/livestock-L08.webp');
  const choiceSourcePath = `assets/livestock/${choiceTrace.source}`;
  const choiceSource = await input(choiceSourcePath);
  await save('delivery-choice-source-600', sharp(choiceSource).resize(600, 600, { kernel: 'nearest' }).flatten({ background: '#37474f' }), '当前独立抬头选择原画正常深底；未从低头帧截取', [choiceSourcePath]);
  const choiceLabels = textSvg(400, 130, [{ x: 5, y: 15, text: 'PNG 96px' }, { x: 110, y: 15, text: 'WebP 96px' }, { x: 215, y: 15, text: 'WebP nearest 2x' }]);
  await save('delivery-choice-96', sharp({ create: { width: 410, height: 220, channels: 3, background: '#d0d9d5' } }).composite([{ input: choicePng, left: 5, top: 25 }, { input: choiceWebp, left: 110, top: 25 }, { input: await sharp(choiceWebp).resize(192, 192, { kernel: 'nearest' }).png().toBuffer(), left: 215, top: 25 }, { input: choiceLabels, left: 0, top: 0 }]), '96pxPNG/WebP与最近邻放大选择图，非游戏截图', ['assets/livestock/icons/L08.png', 'public/ui-icons/livestock-L08.webp']);
  const mature0 = await readFile('assets/livestock/animals/L08/mature-0.png');
  const mature3 = await readFile('assets/livestock/animals/L08/mature-3.png');
  const [matureLeft, matureTop, matureWidth, matureHeight] = atlasTrace.frames.find(frame => frame.stage === 'mature').scenePlacement;
  const fixedMatureCanvas = { left: matureLeft, top: matureTop, width: matureWidth, height: matureHeight };
  const colorLabels = textSvg(600, 230, [{ x: 5, y: 17, text: 'Mature 0: shared canvas' }, { x: 205, y: 17, text: 'Mature 3: shared canvas' }, { x: 405, y: 17, text: 'Choice 96px: nearest 2x' }]);
  await save('delivery-cross-use-color-600', sharp({ create: { width: 600, height: 230, channels: 3, background: '#d0d9d5' } }).composite([{ input: await sharp(mature0).extract(fixedMatureCanvas).resize(192, 192, { fit: 'contain', background: '#00000000', kernel: 'nearest' }).png().toBuffer(), left: 4, top: 30 }, { input: await sharp(mature3).extract(fixedMatureCanvas).resize(192, 192, { fit: 'contain', background: '#00000000', kernel: 'nearest' }).png().toBuffer(), left: 204, top: 30 }, { input: await sharp(choiceWebp).resize(192, 192, { kernel: 'nearest' }).png().toBuffer(), left: 404, top: 30 }, { input: colorLabels, left: 0, top: 0 }]), '成熟0/3共用同一已登记画布窗口，与96选择同底并排；仅证据裁切/正常合成/最近邻缩放，不改原帧、不调色；用于跨用途毛面主色审阅', ['assets/livestock/animals/L08/mature-0.png', 'assets/livestock/animals/L08/mature-3.png', 'public/ui-icons/livestock-L08.webp']);
  const warmLabels = textSvg(600, 480, [{ x: 10, y: 18, text: 'Original: temperature/style only' }, { x: 310, y: 18, text: 'Current mature 0' }, { x: 10, y: 258, text: 'Current mature 3' }, { x: 310, y: 258, text: 'Current choice 96px: nearest 2x' }]);
  await save('delivery-original-warmth-600', sharp({ create: { width: 600, height: 480, channels: 3, background: '#777777' } }).composite([{ input: await referenceDisplay(warmReference), left: 54, top: 32 }, { input: await sharp(mature0).extract(fixedMatureCanvas).resize(192, 192, { fit: 'contain', background: '#00000000', kernel: 'nearest' }).png().toBuffer(), left: 354, top: 32 }, { input: await sharp(mature3).extract(fixedMatureCanvas).resize(192, 192, { fit: 'contain', background: '#00000000', kernel: 'nearest' }).png().toBuffer(), left: 54, top: 272 }, { input: await sharp(choiceWebp).resize(192, 192, { kernel: 'nearest' }).png().toBuffer(), left: 354, top: 272 }, { input: warmLabels, left: 0, top: 0 }]), '精确原始老羊与当前成熟0/3和96选择同中性底比较暖亮面、暖棕阴影/轮廓；不调色、不以新资产彼此接近代替原色温要求', [warmReferencePath, 'assets/livestock/animals/L08/mature-0.png', 'assets/livestock/animals/L08/mature-3.png', 'public/ui-icons/livestock-L08.webp']);
  for (const [name, background] of [['choice-normal-deep', '#15212b'], ['choice-normal-light', '#f4eadc']]) {
    await save(name, sharp(choiceWebp).flatten({ background }).resize(576, 576, { kernel: 'nearest' }), '实际96px发布选择图正常深／浅底最近邻合成，排除全透明RGB误显', ['public/ui-icons/livestock-L08.webp']);
  }
  const scene = await input('public/art/scene-L08.webp');
  await save('delivery-static-facility-130', sharp(scene).resize(130, 130, { kernel: 'nearest' }), '同ID静态设施资料交付，非运行回退授权', ['public/art/scene-L08.webp']);
}
await writeFile('docs/art-reviews/2026-11-22-small-tailed-han.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Produced ${manifest.images.length} local static review images and the evidence manifest.`);
