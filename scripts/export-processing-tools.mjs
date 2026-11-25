import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = process.cwd();
const base = path.join(root, 'assets/source/art/managers/processing-tools-2026-11-25');
const reviews = path.join(base, 'reviews');
const candidates = path.join(base, 'candidates');
const staticOnly = process.argv.includes('--static-only');
const expressions = ['smile', 'happy', 'angry', 'sad'];
const originalRelativePath = 'docs/Pixel-Characters-Complete-Pack/立绘/07_加工管理/加工管理_女_微笑.png';
const oldPublishedRelativePath = 'public/art/managers/portraits/processing/female-smile.webp';
const originalReferencePath = path.join(base, 'original-reference.json');
let originalReference;
try { originalReference = JSON.parse(await fs.readFile(originalReferencePath, 'utf8')); } catch {
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const references = [originalRelativePath, oldPublishedRelativePath].map(relativePath => {
    const bytes = execFileSync('git', ['show', `${revision}:${relativePath}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
    return { revision, path: relativePath, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  originalReference = { references, method: 'git show fixed-revision:path read directly into memory; no old-image backup file is written' };
  await fs.writeFile(originalReferencePath, JSON.stringify(originalReference, null, 2) + '\n');
}
const pinnedOriginal = originalReference.references.find(item => item.path === originalRelativePath);
const originalBytes = execFileSync('git', ['show', `${pinnedOriginal.revision}:${pinnedOriginal.path}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const activeSources = JSON.parse(await fs.readFile(path.join(base, 'active-sources.json'), 'utf8'));
const files = expressions.map(expression => ({ expression, source: path.join(base, activeSources[expression]) }));
await fs.mkdir(reviews, { recursive: true });
await fs.mkdir(candidates, { recursive: true });
const decoded = [];
for (const file of files) {
  const { data, info } = await sharp(file.source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 1024 || info.height !== 1536) throw new Error(`Source dimensions differ: ${file.source}`);
  let left = info.width, right = 0;
  for (let y = 0; y < 566; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 0) { left = Math.min(left, x); right = Math.max(right, x + 1); }
  }
  decoded.push({ ...file, left, right });
}
const left = Math.floor(Math.min(...decoded.map(file => file.left)) / 2) * 2;
const right = Math.ceil(Math.max(...decoded.map(file => file.right)) / 2) * 2;
const width = (right - left) / 2;
const oldFaceAnchor = 466;
const portraitScale = 164 / 289;
const background = path.join(root, 'public/art/managers/backgrounds/processing.webp');
const bg = '#e9dfd0';
const evidence = staticOnly ? JSON.parse(await fs.readFile(path.join(base, 'anchors-and-evidence.json'), 'utf8')).evidence.filter(item => !item.path.endsWith('-390-static.png')) : [];
const inkBounds = [];
async function saveEvidence(name, data) {
  const destination = path.join(reviews, name);
  await fs.writeFile(destination, data);
  evidence.push({ path: path.relative(root, destination).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(data).digest('hex'), note: '证据图仅本地保存' });
}
async function normal(file) { return sharp(file).flatten({ background: bg }).png().toBuffer(); }
for (const file of decoded) {
  const version = path.basename(file.source).match(/-(v\d+)-source\.png$/)?.[1];
  const evidenceStem = `female-${file.expression}${version ? `-${version}` : ''}`;
  const pngPath = path.join(candidates, `female-${file.expression}.png`);
  const webpPath = path.join(candidates, `female-${file.expression}.webp`);
  if (!staticOnly) {
  await fs.copyFile(file.source, pngPath);
  const bust = await sharp(file.source).extract({ left, top: 0, width: right - left, height: 566 })
    .resize(width, 283, { kernel: 'nearest' }).extend({ top: 6, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(bust).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(webpPath);
  const oldNormal = await normal(originalBytes);
  const newNormal = await normal(file.source);
  await saveEvidence(`${evidenceStem}-full-comparison.png`, await sharp({ create: { width: 2048, height: 1536, channels: 3, background: bg } })
    .composite([{ input: oldNormal, left: 0, top: 0 }, { input: newNormal, left: 1024, top: 0 }]).png().toBuffer());
  for (const [name, rect] of Object.entries({
    'left-hand': { left: 170, top: 145, width: 200, height: 300 },
    'right-hand-plan': { left: 610, top: 290, width: 240, height: 320 },
    'face': { left: 425, top: 150, width: 220, height: 180 },
    'cloth': { left: 330, top: 325, width: 220, height: 220 },
  })) {
    const oldCrop = await sharp(originalBytes).extract(rect).resize(rect.width * 4, rect.height * 4, { kernel: 'nearest' }).flatten({ background: bg }).png().toBuffer();
    const newCrop = await sharp(file.source).extract(rect).resize(rect.width * 4, rect.height * 4, { kernel: 'nearest' }).flatten({ background: bg }).png().toBuffer();
    await saveEvidence(`${evidenceStem}-${name}-4x.png`, await sharp({ create: { width: rect.width * 8, height: rect.height * 4, channels: 3, background: bg } })
      .composite([{ input: oldCrop, left: 0, top: 0 }, { input: newCrop, left: rect.width * 4, top: 0 }]).png().toBuffer());
  }
  }
  const bannerWidth = 390, bannerHeight = 167;
  const bannerBg = await sharp(background).resize(bannerWidth, bannerHeight, { fit: 'cover' }).png().toBuffer();
  const scaled = await sharp(webpPath).resize(Math.round(width * portraitScale), Math.round(289 * portraitScale), { kernel: 'nearest' }).png().toBuffer();
  const portraitX = Math.round(76 - ((oldFaceAnchor - left) / 2) * portraitScale);
  const portraitY = 3;
  const scaledMeta = await sharp(scaled).metadata();
  const visible = await sharp(scaled).extract({ left: Math.max(0, -portraitX), top: 0, width: Math.min(scaledMeta.width, bannerWidth - portraitX) - Math.max(0, -portraitX), height: scaledMeta.height }).png().toBuffer();
  const banner = await sharp(bannerBg).composite([{ input: visible, left: Math.max(0, portraitX), top: portraitY }]).png().toBuffer();
  await saveEvidence(`${evidenceStem}-390-static.png`, banner);
  if (!staticOnly) await saveEvidence(`${evidenceStem}-published-normal.png`, await sharp(webpPath).flatten({ background: bg }).png().toBuffer());
  const { data: pixels, info: pixelInfo } = await sharp(webpPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let inkLeft = pixelInfo.width, inkRight = 0;
  for (let y = 0; y < pixelInfo.height; y++) for (let x = 0; x < pixelInfo.width; x++) {
    if (pixels[(y * pixelInfo.width + x) * 4 + 3] >= 8) { inkLeft = Math.min(inkLeft, x); inkRight = Math.max(inkRight, x + 1); }
  }
  inkBounds.push({ expression: file.expression, inkLeft, inkRight });
}
const anchors = { crop: { left, top: 0, right, bottom: 566 }, width, height: 289, faceX: (oldFaceAnchor - left) / 2, sourceAnchorX: oldFaceAnchor,
  inkLeft: Math.min(...inkBounds.map(item => item.inkLeft)), inkRight: Math.max(...inkBounds.map(item => item.inkRight)), inkBounds,
  faceAnchorNote: 'Existing semantic alignment anchor retained for PM comparison; visual face center is separately reviewed, not inferred from held props.',
  staticComposition: { frameWidth: 390, contentWidth: 370, bannerSpan: 390, bannerHeight: 167, fullBleed: 10, dialogueX: 152, portraitScale, portraitY: 3, faceCanvasX: 76 },
  expressions: decoded.map(file => file.expression), evidence };
anchors.sources = decoded.map(file => ({ expression: file.expression, path: path.relative(root, file.source).replaceAll('\\', '/') }));
anchors.originalReferences = originalReference.references;
await fs.writeFile(path.join(base, 'anchors-and-evidence.json'), JSON.stringify(anchors, null, 2) + '\n');
for (const name of decoded.map(file => path.basename(file.source).replace('-source.png', '-generation.json'))) {
  const generationPath = path.join(base, name);
  const generation = JSON.parse(await fs.readFile(generationPath, 'utf8'));
  generation.originalStyleReferences = originalReference.references;
  await fs.writeFile(generationPath, JSON.stringify(generation, null, 2) + '\n');
}
const chineseExpressions = { smile: '微笑', happy: '高兴', angry: '生气', sad: '不高兴' };
const delivery = { activeSources: path.relative(root, path.join(base, 'active-sources.json')).replaceAll('\\', '/'),
  cropAndAnchors: anchors, entries: decoded.map(file => ({ expression: file.expression,
    source: path.relative(root, file.source).replaceAll('\\', '/'), generation: path.relative(root, file.source.replace('-source.png', '-generation.json')).replaceAll('\\', '/'),
    candidatePng: path.relative(root, path.join(candidates, `female-${file.expression}.png`)).replaceAll('\\', '/'), candidateWebp: path.relative(root, path.join(candidates, `female-${file.expression}.webp`)).replaceAll('\\', '/'),
    canonicalPng: `docs/Pixel-Characters-Complete-Pack/立绘/07_加工管理/加工管理_女_${chineseExpressions[file.expression]}.png`,
    publicWebp: `public/art/managers/portraits/processing/female-${file.expression}.webp` })), status: 'local candidates; formal replacement pending PM integration gate' };
await fs.writeFile(path.join(base, 'delivery.json'), JSON.stringify(delivery, null, 2) + '\n');
console.log(JSON.stringify({ expressions: anchors.expressions, crop: anchors.crop, width, height: 289, faceX: anchors.faceX, evidence: evidence.length }));
