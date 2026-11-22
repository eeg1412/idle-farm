import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Only crop, proportional nearest resampling, WebP conversion, and source registration.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = 'assets/source/art/managers/orders/redesign-v2';
const scenes = 'assets/source/art/loading/solo/orders/redesign-v2';
const raw = 'C:/Users/eeg14/.codex/generated_images/01a2030b-a5e9-74d3-b743-9a743111abce/';
const origins = {
  'male-smile': 'exec-efe79e2d-7de3-4207-9b65-0245554771d8.png',
  'male-happy': 'exec-ecfd2078-d765-4994-9da9-ea0e5b926d10.png',
  'male-angry': 'exec-3de6537b-c4af-4aad-99c9-f424f4f54c19.png',
  'male-sad': 'exec-dafc5da4-99d4-4c66-b663-2b4f272f02e1.png',
  'female-scene-v3': 'exec-ab767e23-7ee0-4fe5-b29e-740b7b32e840.png',
  'male-scene-v3': 'exec-2db61edd-c100-4427-bcab-7d4c2da22111.png',
};
const at = relative => path.join(root, relative);
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function describe(relative) {
  const bytes = await fs.readFile(at(relative));
  const metadata = await sharp(bytes).metadata();
  return { path: relative, width: metadata.width, height: metadata.height,
    hasAlpha: metadata.hasAlpha, sha256: sha(bytes) };
}
const scenesOnly = !process.argv.includes('--all');
const existingManifest = JSON.parse(await fs.readFile(at(source + '/source-manifest.json'), 'utf8'));
const crop = { left: 95, top: 0, width: 834, height: 472 };
const portraits = scenesOnly ? existingManifest.portraits : [];
const bounds = [];
for (const expression of scenesOnly ? [] : ['smile', 'happy', 'angry', 'sad']) {
  const id = 'male-' + expression;
  const input = source + '/' + id + '.png';
  const output = 'public/art/managers/portraits/orders/' + id + '.webp';
  const frame = await sharp(at(input)).extract(crop).resize(500, 283, { kernel: 'nearest', fit: 'fill' })
    .extend({ top: 6, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  const { data, info } = await sharp(frame).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let right = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] >= 8) { left = Math.min(left, x); right = Math.max(right, x + 1); }
    }
  }
  bounds.push({ left, right });
  await sharp(frame).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(at(output));
  portraits.push({ id, source: await describe(input), generator: 'built-in image_gen',
    generatedOriginal: raw + origins[id], prompt: source + '/' + id + '.prompt.txt',
    identityReference: expression === 'smile' ? null : source + '/male-smile.png',
    output: await describe(output) });
}
const maleAnchor = scenesOnly ? existingManifest.maleAnchor : { width: 500, height: 289, faceX: (500 - crop.left) * 500 / crop.width,
  inkLeft: Math.min(...bounds.map(box => box.left)), inkRight: Math.max(...bounds.map(box => box.right)) };
if (!scenesOnly) {
const anchorsPath = 'assets/source/art/managers/orders/anchors.json';
const anchors = JSON.parse((await fs.readFile(at(anchorsPath), 'utf8')).replace(/^\uFEFF/, ''));
anchors.male = maleAnchor;
await fs.writeFile(at(anchorsPath), JSON.stringify(anchors, null, 2) + '\n');
}
const faceBounds = {
  female: { x: 376, y: 624, width: 254, height: 186 },
  male: { x: 331, y: 467, width: 220, height: 208 },
};
const sceneRecords = [];
for (const gender of ['female', 'male']) {
  const name = gender + '-scene-v3';
  const input = scenes + '/' + name + '.png';
  const output = 'public/art/loading/scenes/orders-' + gender + '.webp';
  await sharp(at(input)).removeAlpha().webp({ quality: 90, effort: 6 }).toFile(at(output));
  sceneRecords.push({ id: 'orders-' + gender, source: await describe(input), generator: 'built-in image_gen',
    generatedOriginal: raw + origins[name], prompt: scenes + '/' + name + '.prompt.txt',
    identityReference: gender === 'female' ? 'assets/source/art/managers/orders/anime/female-smile.png' : source + '/male-smile.png',
    inputImages: [gender === 'female' ? 'assets/source/art/managers/orders/anime/female-smile.png' : source + '/male-smile.png'],
    generationMode: 'new scene from identity only; no rejected CG input',
    faceBounds: faceBounds[gender], output: await describe(output) });
}
// Deleted drafts survive only as historical metadata; exporting never reads them.
const rejectedScenes = existingManifest.rejectedScenes ?? [];
const manifest = {
  task: 'OR-ART redesign-v2 portraits + CG v3', generator: 'built-in image_gen; no CLI',
  exportScript: 'scripts/export-order-redesign-v2.mjs',
  portraits, portraitTransform: { sourceCrop: [95, 0, 929, 472], resized: [500, 283],
    paddingTop: 6, sampling: 'nearest', webpQuality: 88, alphaQuality: 100 }, maleAnchor,
  scenes: sceneRecords, sceneTransform: { resampling: 'none', webpQuality: 90 }, rejectedScenes,
  rejectedRevision: existingManifest.rejectedRevision,
  cleanup: existingManifest.cleanup,
  referencePolicy: 'Current v3 CGs each use only the matching female-smile or new male-smile identity image. Neither rejected indoor CG is a generation input. Historical v2 source chains remain in rejectedScenes and rejectedRevision.',
  reviewScope: 'Sources and static outputs reviewed separately by order_art_review; game runtime unverified.',
  finalBuild: 'PM responsibility. No tests, preview, runtime checks or build executed by asset owner.',
};
await fs.writeFile(at(source + '/source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(JSON.stringify({ maleAnchor, faceBounds }) + '\n');
