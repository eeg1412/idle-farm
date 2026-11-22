import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Single-item source conversion only: transparent crop, nearest resize,
// centered transparent padding and WebP encoding. No pixel painting or filters.
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDir = path.join(root, 'assets/source/items/time-capsule');
const sourcePath = path.join(sourceDir, 'raw-v1.png');
const pngPath = path.join(sourceDir, 'time-capsule-96.png');
const webpPath = path.join(root, 'public/wiki/icons/time-capsule.webp');
const sourceBytes = await readFile(sourcePath);
const { data, info } = await sharp(sourceBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    // Ignore extremely faint generated outer fringe when locating the subject;
    // retain the original alpha values inside the chosen crop.
    if (data[(y * info.width + x) * 4 + 3] < 128) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error('Source image has no visible pixels');
// Keep two original pixels around the visible subject to preserve the outline's
// low-alpha edge without including the source's distant almost-clear fringe.
left = Math.max(0, left - 2); top = Math.max(0, top - 2);
right = Math.min(info.width - 1, right + 2);
bottom = Math.min(info.height - 1, bottom + 2);
const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
const maxVisibleSize = 64;
const scale = maxVisibleSize / Math.max(bounds.width, bounds.height);
const targetWidth = Math.round(bounds.width * scale);
const targetHeight = Math.round(bounds.height * scale);
const padLeft = Math.floor((96 - targetWidth) / 2);
const padTop = Math.floor((96 - targetHeight) / 2);
const png = await sharp(sourceBytes).extract(bounds)
  .resize(targetWidth, targetHeight, { kernel: 'nearest' })
  .extend({ left: padLeft, right: 96 - targetWidth - padLeft,
    top: padTop, bottom: 96 - targetHeight - padTop,
    background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png().toBuffer();
const webp = await sharp(png).webp({ quality: 70, alphaQuality: 100 }).toBuffer();
await mkdir(path.dirname(webpPath), { recursive: true });
await writeFile(pngPath, png);
await writeFile(webpPath, webp);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewPath = path.join(sourceDir, 'reviews/96-beige.png');
const review = await sharp({ create: { width: 96, height: 96, channels: 4,
  background: { r: 245, g: 237, b: 220, alpha: 1 } } })
  .composite([{ input: png, left: 0, top: 0 }]).png().toBuffer();
await mkdir(path.dirname(reviewPath), { recursive: true });
await writeFile(reviewPath, review);
const prompt = await readFile(path.join(sourceDir, 'prompt.txt'), 'utf8');
await writeFile(path.join(sourceDir, 'source-manifest.json'), JSON.stringify({
  asset: 'time-capsule', status: 'asset-only; no catalog or runtime integration',
  generatedAt: '2026-11-22', tool: 'image_gen.imagegen (built-in)',
  originalToolPath: 'C:/Users/eeg14/.codex/generated_images/01a2037d-9e46-7e50-b08a-84bcb6026c15/exec-662e98c9-07fb-4318-a223-968674bb3e8f.png',
  transparentBackground: true,
  referenceRole: 'P01.webp and PM01.webp viewed for inventory pixel-art style; not edit targets',
  references: ['public/wiki/icons/P01.webp', 'public/wiki/icons/PM01.webp'],
  promptFile: 'assets/source/items/time-capsule/prompt.txt',
  fullPrompt: prompt,
  source: { path: 'assets/source/items/time-capsule/raw-v1.png', width: info.width, height: info.height, sha256: sha256(sourceBytes) },
  conversion: { script: 'scripts/export-time-capsule-icon.mjs', crop: bounds,
    boundsAlphaThreshold: 128, originalPixelPadding: 2, alphaInsideCrop: 'preserved from source',
    kernel: 'nearest', targetContentSize: [targetWidth, targetHeight],
    contentPlacement: [padLeft, padTop], canvas: [96, 96], webpQuality: 70, alphaQuality: 100,
    operations: ['crop transparent outer margin', 'nearest-neighbor resize', 'center with transparent padding', 'PNG/WebP encoding'],
    redrawingOrPixelFilter: false },
  outputs: [
    { path: 'assets/source/items/time-capsule/time-capsule-96.png', sha256: sha256(png) },
    { path: 'public/wiki/icons/time-capsule.webp', sha256: sha256(webp) }
  ],
  localReviewEvidence: [{ path: 'assets/source/items/time-capsule/reviews/96-beige.png',
    sha256: sha256(review), note: '证据图仅本地保存；96px PNG composited on beige #f5eddc; no game preview.' }],
  verification: 'No tests, game preview, art checks or builds run; ordinary source conversion only. Visual review recorded separately by PM.'
}, null, 2) + '\n');
console.log('Exported time-capsule-96.png and public/wiki/icons/time-capsule.webp');
