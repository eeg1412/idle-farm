import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const file = (path) => fileURLToPath(new URL(path, root));
const sourceDir = 'assets/source/art/estate-atmosphere/';
const publicDir = 'public/art/estate/atmosphere/';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const quality = { quality: 70, alphaQuality: 100, effort: 6 };
// All four native drawings retain their pixels: only equal-sized crops,
// translation to a common torso anchor, and nearest downsampling are used.
const frames = [
  { pose: 'wings-raised', crop: { left: 45, top: 72, width: 576, height: 576 }, sourceTorso: { x: 333, y: 360 } },
  { pose: 'wings-middle-downstroke', crop: { left: 651, top: 72, width: 576, height: 576 }, sourceTorso: { x: 939, y: 360 } },
  { pose: 'wings-down', crop: { left: 45, top: 676, width: 576, height: 576 }, sourceTorso: { x: 333, y: 964 } },
  { pose: 'wings-recovering', crop: { left: 651, top: 676, width: 576, height: 576 }, sourceTorso: { x: 939, y: 964 } },
];

async function describe(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = (threshold) => {
    let left = info.width, top = info.height, right = -1, bottom = -1, count = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] < threshold) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
    }
    return { left, top, width: right - left + 1, height: bottom - top + 1, count };
  };
  let min = 255, max = 0, zero = 0, low = 0, opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i]; min = Math.min(min, alpha); max = Math.max(max, alpha);
    zero += alpha === 0; low += alpha > 0 && alpha < 128; opaque += alpha === 255;
  }
  return { width: info.width, height: info.height, channels: info.channels,
    alpha: { min, max, zero, low, opaque }, visibleBoundsAlpha1: bounds(1), visibleBoundsAlpha64: bounds(64) };
}

await mkdir(file(publicDir), { recursive: true });
const birdsSource = await readFile(file(sourceDir + 'birds-native.png'));
const entries = [];
for (const [index, frame] of frames.entries()) {
  const png = await sharp(birdsSource).extract(frame.crop).resize(128, 128, { kernel: 'nearest' }).ensureAlpha().png().toBuffer();
  const pngPath = sourceDir + `birds-frame-${index + 1}.png`;
  await writeFile(file(pngPath), png);
  entries.push({ ...frame, index, pngPath, outputFrame: { x: index * 128, y: 0, width: 128, height: 128 },
    outputTorso: { x: 64, y: 64 }, ...await describe(png), sha256: hash(png) });
}
const birds = await sharp({ create: { width: 512, height: 128, channels: 4, background: '#00000000' } })
  .composite(await Promise.all(entries.map(async (entry) => ({ input: await readFile(file(entry.pngPath)), left: entry.index * 128, top: 0 }))))
  .webp(quality).toBuffer();
await writeFile(file(publicDir + 'birds.webp'), birds);
const generation = JSON.parse(await readFile(file(sourceDir + 'generation.json'), 'utf8'));
const registration = {
  version: 1, generatedWith: 'built-in image_gen', generation: sourceDir + 'generation.json',
  sources: {
    birds: { path: sourceDir + 'birds-native.png', sha256: hash(birdsSource), ...await describe(birdsSource) },
  },
  birds: { path: publicDir + 'birds.webp', sha256: hash(birds), ...await describe(birds),
    conversion: 'Four distinct native drawings; equal 576x576 crops registered on torso, nearest resize 128x128, horizontal packing; no rotation, reshaping, recoloring, masking, or generated pixels.',
    anchor: { x: 64, y: 64 }, quality, frames: entries },
  prompts: generation.requests.map((request) => request.promptFile),
};
await writeFile(file(sourceDir + 'registration.json'), JSON.stringify(registration, null, 2) + '\n');
console.log(JSON.stringify({ birds: registration.birds }, null, 2));
