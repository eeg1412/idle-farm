import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'assets/source/art/estate-weather/shapes-v2';
const layout = JSON.parse(await readFile(resolve(root, `${base}/layout.json`), 'utf8'));
const source = await readFile(resolve(root, layout.source));
const sourceMetadata = await sharp(source).metadata();
const outputPath = 'public/art/estate/atmosphere/cloud-shapes-v2.webp';
const pngPath = `${base}/cloud-shapes-v2.png`;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const encoder = { quality: 70, alphaQuality: 100, effort: 6 };

// Alpha measurements are source/export registration for art review. They do
// not modify alpha or repair any pixels in the native drawing.
async function alphaRegistration(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (threshold) => {
    let left = info.width;
    let top = info.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * info.channels + info.channels - 1] < threshold) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return null;
    return {
      bounds: { left, top, width: right - left + 1, height: bottom - top + 1 },
      padding: { left, top, right: info.width - right - 1, bottom: info.height - bottom - 1 },
    };
  };
  return { alpha1: at(1), alpha128: at(128) };
}

await mkdir(resolve(root, `${base}/png`), { recursive: true });
await mkdir(dirname(resolve(root, outputPath)), { recursive: true });
const layers = [];
const frames = [];
for (const cloud of layout.clouds) {
  const crop = await sharp(source).extract(cloud.crop).png().toBuffer();
  const { data: sampled, info } = await sharp(crop)
    .resize({
      width: layout.atlas.innerBox.width,
      height: layout.atlas.innerBox.height,
      fit: 'inside',
      kernel: 'nearest',
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  const offset = {
    left: Math.floor((layout.atlas.cellWidth - info.width) / 2),
    top: Math.floor((layout.atlas.cellHeight - info.height) / 2),
  };
  const cell = await sharp({ create: { width: 256, height: 128, channels: 4, background: transparent } })
    .composite([{ input: sampled, ...offset }])
    .png()
    .toBuffer();
  const cellPath = `${base}/png/${String(cloud.id).padStart(2, '0')}.png`;
  await writeFile(resolve(root, cellPath), cell);
  const frame = {
    x: (cloud.id % 5) * 256,
    y: Math.floor(cloud.id / 5) * 128,
    width: 256,
    height: 128,
  };
  layers.push({ input: cell, left: frame.x, top: frame.y });
  frames.push({
    id: cloud.id,
    shape: cloud.shape,
    sourceCrop: cloud.crop,
    cropSha256: sha256(crop),
    cropRegistration: await alphaRegistration(crop),
    fit: { kernel: 'nearest', mode: 'inside', maxWidth: 244, maxHeight: 116, actualWidth: info.width, actualHeight: info.height, offset },
    frame,
    png: { path: cellPath, sha256: sha256(cell), registration: await alphaRegistration(cell) },
  });
}
const atlas = await sharp({ create: { width: 1280, height: 256, channels: 4, background: transparent } })
  .composite(layers)
  .png()
  .toBuffer();
await writeFile(resolve(root, pngPath), atlas);
const { data: webp, info: exported } = await sharp(atlas).webp(encoder).toBuffer({ resolveWithObject: true });
await writeFile(resolve(root, outputPath), webp);
const record = {
  version: 2,
  source: { path: layout.source, sha256: sha256(source), width: sourceMetadata.width, height: sourceMetadata.height, channels: sourceMetadata.channels, hasAlpha: sourceMetadata.hasAlpha },
  sourceGeneration: `${base}/generation.json`,
  layout: `${base}/layout.json`,
  transformation: 'Manual per-cloud rectangular crop; nearest proportional inside 244×116; transparent centering in 256×128 cells; 5×2 row-major compositing. No drawing, retouching, recoloring, alpha thresholding, mirroring or distortion.',
  atlas: layout.atlas,
  frames,
  png: { path: pngPath, sha256: sha256(atlas) },
  output: { path: outputPath, sha256: sha256(webp), width: exported.width, height: exported.height, channels: exported.channels, bytes: exported.size, encoder: { format: 'webp', ...encoder } },
  status: 'Source and export ready for independent image review; runtime not verified.',
};
await writeFile(resolve(root, `${base}/conversion.json`), `${JSON.stringify(record, null, 2)}\n`);
console.log(`Converted ten native cloud shapes to ${outputPath} (1280×256, 5×2 cells)`);
