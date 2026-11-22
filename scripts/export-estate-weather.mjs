import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = 'assets/source/art/estate-weather/clouds-v1.png';
const outputPath = 'public/art/estate/atmosphere/clouds-v1.webp';
const registrationPath = 'assets/source/art/estate-weather/conversion-v1.json';
const source = await readFile(resolve(root, sourcePath));
const metadata = await sharp(source).metadata();
await mkdir(dirname(resolve(root, outputPath)), { recursive: true });

// Only format conversion and proportional sampling: retain the native alpha,
// complete source canvas and its padding; do not paint or repair the cloud.
const { data, info } = await sharp(source)
  .resize(512, 256, {
    fit: 'contain',
    position: 'centre',
    kernel: 'nearest',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 70, alphaQuality: 100, effort: 6 })
  .toBuffer({ resolveWithObject: true });
await writeFile(resolve(root, outputPath), data);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function alphaRegistration(bytes) {
  const { data: pixels, info: raw } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const boundsAt = (threshold) => {
    let left = raw.width;
    let top = raw.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < raw.height; y += 1) {
      for (let x = 0; x < raw.width; x += 1) {
        if (pixels[(y * raw.width + x) * raw.channels + raw.channels - 1] < threshold) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < 0) return null;
    return {
      bounds: { left, top, width: right - left + 1, height: bottom - top + 1 },
      padding: { left, top, right: raw.width - right - 1, bottom: raw.height - bottom - 1 },
    };
  };
  return { alpha1: boundsAt(1), alpha128: boundsAt(128) };
}
const record = {
  version: 1,
  source: {
    path: sourcePath,
    sha256: sha256(source),
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    registration: await alphaRegistration(source),
    generator: 'built-in image_gen.imagegen',
    generationRecord: 'assets/source/art/estate-weather/generation-v1.json',
  },
  transform: {
    crop: null,
    width: 512,
    height: 256,
    fit: 'contain',
    position: 'centre',
    kernel: 'nearest',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    drawingOrRetouching: false,
  },
  encoder: { format: 'webp', quality: 70, alphaQuality: 100, effort: 6 },
  output: {
    path: outputPath,
    sha256: sha256(data),
    width: info.width,
    height: info.height,
    channels: info.channels,
    bytes: info.size,
    registration: await alphaRegistration(data),
  },
  reviewStatus: '独立审阅待完成；未执行运行验证',
};
await writeFile(resolve(root, registrationPath), `${JSON.stringify(record, null, 2)}\n`);
console.log(`Converted ${sourcePath} → ${outputPath} (${info.width}×${info.height})`);
