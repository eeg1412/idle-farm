// Static art-review evidence only. Does not import or execute game modules.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'assets/source/art/estate-weather/reviews';
// Historical cancelled opening/white-animal reproductions are opt-in only.
// The current review invokes this script without this flag: shadows only.
const includeHistorical = process.argv.includes('--historical');
const files = {
  source: 'assets/source/art/estate-weather/clouds-v1.png',
  webp: 'assets/source/art/estate-weather/shapes-v2/clouds-v1-export.webp',
  reference: 'public/art/estate/background.webp',
  sourceV2: 'assets/source/art/estate-weather/shapes-v2/cloud-shapes-v2-r3.png',
  pngV2: 'assets/source/art/estate-weather/shapes-v2/cloud-shapes-v2.png',
  webpV2: 'public/art/estate/atmosphere/cloud-shapes-v2.webp',
  animalSource: 'assets/source/art/estate-weather/animals-v1/animal-clouds-r1.png',
  animalPng: 'assets/source/art/estate-weather/animals-v1/history-r1/animal-clouds-v1.png',
  animalWebp: 'assets/source/art/estate-weather/animals-v1/history-r1/animal-clouds-v1.webp',
  animalSourceR2: 'assets/source/art/estate-weather/animals-v1/animal-clouds-r2.png',
  animalPngR2: 'assets/source/art/estate-weather/animals-v1/animal-clouds-v1.png',
  animalWebpR2: 'public/art/estate/atmosphere/animal-clouds-v1.webp',
};
const bytes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(resolve(root, path))])));
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const records = [];
await mkdir(resolve(root, out), { recursive: true });
async function save(name, data, purpose) {
  const path = `${out}/${name}`;
  await writeFile(resolve(root, path), data);
  records.push({ path, sha256: sha256(data), purpose, retention: '证据图仅本地保存' });
}
async function sprite(input, width, height, alpha = 1, tint = [255, 255, 255]) {
  const { data, info } = await sharp(input).resize(Math.round(width), Math.round(height), { kernel: 'nearest', fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let p = 0; p < data.length; p += 4) {
    for (let c = 0; c < 3; c++) data[p + c] = Math.round(data[p + c] * tint[c] / 255);
    data[p + 3] = Math.round(data[p + 3] * alpha);
  }
  return { data, width: info.width, height: info.height };
}
async function overlay(canvas, image, centerX, centerY, width, height) {
  let left = Math.round(centerX - image.width / 2);
  let top = Math.round(centerY - image.height / 2);
  const cutX = Math.max(0, -left), cutY = Math.max(0, -top);
  const cutWidth = Math.min(image.width - cutX, width - Math.max(0, left));
  const cutHeight = Math.min(image.height - cutY, height - Math.max(0, top));
  if (cutWidth <= 0 || cutHeight <= 0) return canvas;
  const input = image.png && cutX === 0 && cutY === 0 && cutWidth === image.width && cutHeight === image.height ? image.png
    : await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } }).extract({ left: cutX, top: cutY, width: cutWidth, height: cutHeight }).png().toBuffer();
  return sharp(canvas).composite([{ input, left: Math.max(0, left), top: Math.max(0, top) }]).png().toBuffer();
}
async function base(width, height) {
  const mapHeight = Math.round(width * 1926 / 816);
  return sharp(bytes.reference).resize(width, mapHeight, { kernel: 'nearest' }).extract({ left: 0, top: 0, width, height }).png().toBuffer();
}
async function opening(width, height, elapsed) {
  let canvas = await base(width, height);
  const fogAlpha = Math.max(0, 1 - elapsed / 450);
  if (fogAlpha) {
    const fog = await sharp({ create: { width, height, channels: 4, background: { r: 244, g: 247, b: 250, alpha: fogAlpha } } }).png().toBuffer();
    canvas = await sharp(canvas).composite([{ input: fog }]).png().toBuffer();
  }
  const progress = Math.min(1, elapsed / 1700);
  const eased = progress * progress * (3 - 2 * progress);
  for (let index = 0; index < 24; index++) {
    const span = Math.max(width * (0.9 + index % 3 * 0.08), height * 0.39);
    const image = await sprite(bytes.webp, span, span / 2, Math.min(1, (1 - progress) * 2.5));
    canvas = await overlay(canvas, image,
      width * (0.5 + ((index % 4 - 1.5) / 3) * (1 + eased * 2.5)),
      height * (0.5 + ((Math.floor(index / 4) - 2.5) / 5) * (1 + eased * 1.8)), width, height);
  }
  return canvas;
}
async function sunny(width, height, time) {
  let canvas = await base(width, height);
  const mapHeight = Math.round(width * 1926 / 816);
  for (let index = 0; index < 6; index++) {
    const span = width * (0.6 + index % 3 * 0.13);
    const image = await sprite(bytes.webp, span, span * 0.24, 0.13, [33, 62, 76]);
    const fraction = (n) => n - Math.floor(n);
    canvas = await overlay(canvas, image,
      (fraction(index * 0.381 + time / (145000 + index * 11000)) * 1.9 - 0.45) * width,
      mapHeight * (0.06 + index * 0.178), width, height);
  }
  return canvas;
}
if (includeHistorical) for (const key of ['source', 'webp']) {
  const meta = await sharp(bytes[key]).metadata();
  const normal = await sharp(bytes[key]).flatten({ background: '#a1b73d' }).png().toBuffer();
  await save(`${key}-grass.png`, normal, `${key} whole-canvas native-size alpha composite over normal grass color`);
  if (key === 'webp') {
    const edge = await sharp(normal).extract({ left: 52, top: 42, width: 120, height: 100 }).resize(720, 600, { kernel: 'nearest' }).png().toBuffer();
    await save('webp-edge-6x.png', edge, 'normal grass alpha composite; upper/left silhouette nearest-neighbor 6x');
  }
}
if (includeHistorical) for (const [width, height] of [[320, 693], [390, 844]]) {
  const frames = [];
  for (const elapsed of [0, 300, 850, 1400]) frames.push(await opening(width, height, elapsed));
  await save(`opening-${width}x${height}.png`, await sharp({ create: { width: width * 4, height, channels: 4, background: '#ffffff' } }).composite(frames.map((input, index) => ({ input, left: index * width, top: 0 }))).png().toBuffer(), 'left to right: 0/300/850/1400 ms; static formula reproduction, original terrain only, no UI/buildings');
  const shadows = await Promise.all([0, 60000].map((time) => sunny(width, height, time)));
  await save(`sunny-${width}x${height}.png`, await sharp({ create: { width: width * 2, height, channels: 4, background: '#ffffff' } }).composite(shadows.map((input, index) => ({ input, left: index * width, top: 0 }))).png().toBuffer(), 'left/right motionMs 0/60000; six tinted cloud shadows on original terrain; no buildings/UI');
  const canvas = await base(width, height);
  const span = Math.max(width * 0.9, height * 0.39);
  await save(`single-cloud-${width}x${height}.png`, await overlay(canvas, await sprite(bytes.webp, span, span / 2), width / 2, height / 2, width, height), 'single whole texture at actual opening minimum span over unmodified terrain');
}
// Final ten-shape version. Deterministic example sampling, not a running game.
const finalSeed = 20261122;
const shapeFrames = await Promise.all(Array.from({ length: 10 }, (_, id) => sharp(bytes.webpV2).extract({ left: id % 5 * 256, top: Math.floor(id / 5) * 128, width: 256, height: 128 }).png().toBuffer()));
function sample(index, stream, seed = finalSeed) {
  let value = seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(stream + 1, 0x85ebca6b);
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return ((value ^ value >>> 16) >>> 0) / 0x100000000;
}
async function clippedLayer(image, centerX, centerY, width, height) {
  const left = Math.round(centerX - image.width / 2), top = Math.round(centerY - image.height / 2);
  const cutX = Math.max(0, -left), cutY = Math.max(0, -top);
  const cutWidth = Math.min(image.width - cutX, width - Math.max(0, left));
  const cutHeight = Math.min(image.height - cutY, height - Math.max(0, top));
  if (cutWidth <= 0 || cutHeight <= 0) return undefined;
  const input = image.png && cutX === 0 && cutY === 0 && cutWidth === image.width && cutHeight === image.height ? image.png
    : await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } }).extract({ left: cutX, top: cutY, width: cutWidth, height: cutHeight }).png().toBuffer();
  return { input, left: Math.max(0, left), top: Math.max(0, top) };
}
async function rotatedSprite(frame, span, angle) {
  const image = await sprite(frame, span, span / 2);
  const c = Math.cos(angle), s = Math.sin(angle);
  const result = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } }).affine([c, -s, s, c], { interpolator: 'nearest', background: '#00000000' }).raw().toBuffer({ resolveWithObject: true });
  return { data: result.data, width: result.info.width, height: result.info.height };
}
async function bakeField(width, height) {
  const rows = Math.ceil((height / width + 0.32) / 0.042) + 1;
  const layers = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < 12; column++) {
      const index = row * 12 + column;
      const image = await rotatedSprite(shapeFrames[Math.floor(sample(index, 0) * 10)], width * (0.36 + sample(index, 1) * 0.22), (sample(index, 2) - 0.5) * 0.09);
      const layer = await clippedLayer(image,
        width * (-0.16 + column * 0.12 + row % 2 * 0.06 + (sample(index, 3) - 0.5) * 0.028),
        width * (-0.16 + row * 0.042 + (sample(index, 4) - 0.5) * 0.016), width, height);
      if (layer) layers.push(layer);
    }
  }
  const data = await sharp({ create: { width, height, channels: 4, background: '#00000000' } }).composite(layers).png().toBuffer();
  const raw = await sharp(data).ensureAlpha().raw().toBuffer();
  let minimumAlpha = 255, zeroAlphaPixels = 0, below128Pixels = 0, below255Pixels = 0;
  for (let p = 3; p < raw.length; p += 4) {
    minimumAlpha = Math.min(minimumAlpha, raw[p]);
    if (raw[p] === 0) zeroAlphaPixels++;
    if (raw[p] < 128) below128Pixels++;
    if (raw[p] < 255) below255Pixels++;
  }
  return { data, rows, cloudCount: rows * 12, minimumAlpha, zeroAlphaPixels, below128Pixels, below255Pixels };
}
async function finalOpening(width, height, field, elapsed) {
  const middle = Math.floor(width / 2);
  const progress = Math.min(1, elapsed / 1700), eased = progress * progress * (3 - 2 * progress);
  const displacement = width * 0.53 * eased;
  const layers = [];
  for (const [left, halfWidth, x] of [[0, middle, -displacement], [middle, width - middle, middle + displacement]]) {
    const raw = await sharp(field).extract({ left, top: 0, width: halfWidth, height }).raw().toBuffer();
    const layer = await clippedLayer({ data: raw, width: halfWidth, height }, x + halfWidth / 2, height / 2, width, height);
    if (layer) layers.push(layer);
  }
  return sharp(await base(width, height)).composite(layers).png().toBuffer();
}
if (includeHistorical) for (const key of ['sourceV2', 'pngV2', 'webpV2']) await save(`${key}-grass.png`, await sharp(bytes[key]).flatten({ background: '#a1b73d' }).png().toBuffer(), `${key} normal grass alpha composite; native complete image`);
if (includeHistorical) for (const key of ['animalSource', 'animalPng', 'animalWebp']) await save(`${key}-grass.png`, await sharp(bytes[key]).flatten({ background: '#a1b73d' }).png().toBuffer(), `${key} normal grass alpha composite; native complete image; raw source head directions 0/1/2 left, 3 right`);
if (includeHistorical) for (const key of ['animalSourceR2', 'animalPngR2', 'animalWebpR2']) await save(`${key}-grass.png`, await sharp(bytes[key]).flatten({ background: '#a1b73d' }).png().toBuffer(), `${key} normal grass alpha composite; native complete image; all four heads face right`);
if (includeHistorical) await save('v2-atlas-edge-6x.png', await sharp(bytes.webpV2).extract({ left: 515, top: 0, width: 250, height: 128 }).flatten({ background: '#a1b73d' }).resize(1500, 768, { kernel: 'nearest' }).png().toBuffer(), 'variant 2 cell near-right fringe in normal grass; nearest-neighbor 6x');
const fieldRecords = [];
const finalPreview = [];
if (includeHistorical) for (const [width, height] of [[320, 693], [390, 844]]) {
  const actualShapes = [];
  for (const [row, span] of [[0, width * 0.36], [2, width * 0.58]]) for (let id = 0; id < 10; id++) {
    const image = await sprite(shapeFrames[id], span, span / 2);
    const layer = await clippedLayer(image, (id % 5 + 0.5) * 240, (row + Math.floor(id / 5) + 0.5) * 128, 1200, 512);
    if (layer) actualShapes.push(layer);
  }
  await save(`v2-actual-shapes-${width}.png`, await sharp({ create: { width: 1200, height: 512, channels: 4, background: '#a1b73d' } }).composite(actualShapes).png().toBuffer(), `ten variant frames at entrance min/max spans ${width * 0.36}/${width * 0.58}; rows 0-1 minimum, 2-3 maximum, row-major IDs 0-9`);
  const field = await bakeField(width, height);
  const { data: ignored, ...measurement } = field;
  fieldRecords.push({ width, height, seed: finalSeed, ...measurement });
  await save(`v2-field-${width}x${height}.png`, field.data, `transparent dense cloud field, seed ${finalSeed}, ${field.cloudCount} sampled clouds; no backing, no fog`);
  const times = [0, 300, 850, 1400];
  const frames = await Promise.all(times.map((time) => finalOpening(width, height, field.data, time)));
  await save(`v2-opening-${width}x${height}.png`, await sharp({ create: { width: width * 4, height, channels: 4, background: '#00000000' } }).composite(frames.map((input, index) => ({ input, left: index * width, top: 0 }))).png().toBuffer(), `final 10-shape horizontal split, seed ${finalSeed}; left to right 0/300/850/1400ms; original map beneath cloud halves solely for review; not a game screenshot`);
  if (width === 390) {
    const rawFrames = [];
    const delays = [];
    for (let time = 0; time <= 1700; time += 50) {
      rawFrames.push(await sharp(await finalOpening(width, height, field.data, time)).ensureAlpha().raw().toBuffer());
      delays.push(time === 0 ? 450 : time === 1700 ? 900 : 50);
    }
    const animated = await sharp(Buffer.concat(rawFrames), { raw: { width, height: height * rawFrames.length, channels: 4, pageHeight: height } }).webp({ quality: 80, effort: 3, loop: 0, delay: delays }).toBuffer();
    await save('v2-opening-preview-390x844.webp', animated, 'user-authorized synthetic animation, seed20261122, 50ms samples of 1700ms effect; 450ms first-frame and 900ms final-frame viewing holds; original terrain only, no UI/audio; not actual browser rendering');
    finalPreview.push({ path: `${out}/v2-opening-preview-390x844.webp`, frames: rawFrames.length, frameStepMs: 50, effectDurationMs: 1700, firstHoldMs: 450, lastHoldMs: 900 });
  }
  for (const count of [3, 10]) {
    const layers = [];
    for (let id = 0; id < count; id++) {
      const x = -0.45 + sample(id, 0, finalSeed + count) * 1.9;
      const y = 0.06 + sample(id, 1, finalSeed + count) * 0.89;
      const span = width * (0.6 + sample(id, 2, finalSeed + count) * 0.26);
      const speed = 1.9 / (145000 + sample(id, 3, finalSeed + count) * 55000);
      const variant = Math.floor(sample(id, 4, finalSeed + count) * 10);
      const image = await sprite(shapeFrames[variant], span, span * 0.24, 0.13, [33, 62, 76]);
      const layer = await clippedLayer(image, (x + 2000 * speed) * width, Math.round(width * 2.36) * y, width, height);
      if (layer) layers.push(layer);
    }
    await save(`v2-sunny-${count}-${width}x${height}.png`, await sharp(await base(width, height)).composite(layers).png().toBuffer(), `final atlas ground-shadow batch count ${count}, fully faded-in at 2000ms; deterministic in-range example values from hash seed ${finalSeed + count}, not game's Math.random sequence; count includes currently offscreen clouds`);
  }
}
async function independentClouds(width, height) {
  const rows = Math.ceil((height / width + 0.32) / 0.042) + 1;
  const clouds = [];
  for (let index = 0; index < rows * 12; index++) {
    const row = Math.floor(index / 12), column = index % 12;
    const span = width * (0.36 + sample(index, 1) * 0.22), rotation = (sample(index, 2) - 0.5) * 0.09;
    const image = await rotatedSprite(shapeFrames[Math.floor(sample(index, 0) * 10)], span, rotation);
    image.png = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } }).png().toBuffer();
    const startX = width * (-0.16 + column * 0.12 + row % 2 * 0.06 + (sample(index, 3) - 0.5) * 0.028);
    const y = width * (-0.16 + row * 0.042 + (sample(index, 4) - 0.5) * 0.016);
    const side = sample(index, 5) < 0.5 ? -1 : 1;
    const delay = sample(index, 6) * 360;
    const duration = Math.min(1020 + sample(index, 7) * 400, 1640 - delay);
    const extent = span / 2 * Math.abs(Math.cos(rotation)) + span / 4 * Math.abs(Math.sin(rotation));
    const margin = width * (0.02 + sample(index, 8) * 0.08);
    const endX = side < 0 ? Math.min(startX - width * 0.12, -extent - margin) : Math.max(startX + width * 0.12, width + extent + margin);
    clouds.push({ image, startX, y, side, delay, duration, endX });
  }
  return clouds;
}
async function individualOpening(width, height, clouds, time) {
  const layers = [];
  for (const cloud of clouds) {
    const p = Math.min(1, Math.max(0, (time - cloud.delay) / cloud.duration));
    if (p === 1) continue;
    const eased = p * p * (3 - 2 * p);
    const layer = await clippedLayer(cloud.image, cloud.startX + (cloud.endX - cloud.startX) * eased, cloud.y, width, height);
    if (layer) layers.push(layer);
  }
  return sharp(await base(width, height)).composite(layers).png().toBuffer();
}
const individualRecords = [];
if (includeHistorical) for (const [width, height] of [[320, 693], [390, 844]]) {
  const clouds = await independentClouds(width, height);
  const times = [0, 300, 850, 1400, 1640];
  const frames = await Promise.all(times.map((time) => individualOpening(width, height, clouds, time)));
  await save(`v4-opening-${width}x${height}.png`, await sharp({ create: { width: width * times.length, height, channels: 4, background: '#00000000' } }).composite(frames.map((input, index) => ({ input, left: index * width, top: 0 }))).png().toBuffer(), `independent individual left/right clouds, seed ${finalSeed}, 0/300/850/1400/1640ms; no bank or backing; no game screenshot`);
  individualRecords.push({ width, height, seed: finalSeed, cloudCount: clouds.length, leftCount: clouds.filter((cloud) => cloud.side < 0).length, rightCount: clouds.filter((cloud) => cloud.side > 0).length, maxFinishedAtMs: Math.max(...clouds.map((cloud) => cloud.delay + cloud.duration)) });
  if (width === 390) {
    const rawFrames = [], delays = [];
    for (let time = 0; time <= 1700; time += 50) {
      rawFrames.push(await sharp(await individualOpening(width, height, clouds, time)).ensureAlpha().raw().toBuffer());
      delays.push(time === 0 ? 450 : time === 1700 ? 900 : 50);
    }
    const animated = await sharp(Buffer.concat(rawFrames), { raw: { width, height: height * rawFrames.length, channels: 4, pageHeight: height } }).webp({ quality: 80, effort: 3, loop: 0, delay: delays }).toBuffer();
    await save('v4-opening-preview-390x844.webp', animated, 'user-authorized independent-cloud synthetic preview; seed20261122, 50ms samples, 1700ms effect, 450ms/900ms viewing holds; no browser, banks, backing, UI or audio');
  }
}
const animalFrames = await Promise.all(Array.from({ length: 4 }, (_, id) => sharp(bytes.animalWebpR2).extract({ left: id % 2 * 256, top: Math.floor(id / 2) * 128, width: 256, height: 128 }).png().toBuffer()));
if (includeHistorical) for (const [width, height] of [[320, 693], [390, 844]]) {
  const layers = [];
  const combinations = [[0.22, 0.28], [0.22, 0.38], [0.36, 0.28], [0.36, 0.38]];
  for (let row = 0; row < combinations.length; row++) for (let id = 0; id < 4; id++) {
    const [ratio, alpha] = combinations[row];
    const rendered = await overlay(await base(width, height), await sprite(animalFrames[id], width * ratio, width * ratio / 2, alpha), width / 2, height / 2, width, height);
    const input = await sharp(rendered).extract({ left: Math.round(width / 2 - 100), top: Math.round(height / 2 - 60), width: 200, height: 120 }).png().toBuffer();
    layers.push({ input, left: id * 200, top: row * 120 });
  }
  await save(`animal-r2-actual-${width}.png`, await sharp({ create: { width: 800, height: 480, channels: 4, background: '#00000000' } }).composite(layers).png().toBuffer(), `right-facing animal clouds at real pixel sizes; columns rabbit/cat/whale/turtle; rows widthRatio/alpha .22/.28, .22/.38, .36/.28, .36/.38; midpoint passage over original terrain, 200x120 crop, no magnification; not a game screenshot`);
}
if (includeHistorical) await save('animal-r2-edge-6x.png', await sharp(bytes.animalWebpR2).extract({ left: 256, top: 0, width: 256, height: 128 }).flatten({ background: '#a1b73d' }).resize(1536, 768, { kernel: 'nearest' }).png().toBuffer(), 'right-facing cat cloud and curl tail normal grass, nearest-neighbor 6x');
// Current use: ordinary 0..9 and animal 10..13 share one shadow pool.
// These are static size/count examples, not a simulated runtime/random stream.
const mixedFrames = [...shapeFrames, ...animalFrames];
const unifiedShadowCases = [];
function shadowBandCost(mask) {
  let previous = -1, cost = 0;
  for (let band = 0; band < 10; band++) {
    if (!(mask & 1 << band)) continue;
    cost += previous < 0 ? 2 * (band + 0.5) ** 2 : (band - previous) ** 2;
    previous = band;
  }
  return cost + 2 * (10 - previous - 0.5) ** 2;
}
function dispersedBands(count) {
  const bits = (value) => { let n = 0; for (; value; value &= value - 1) n++; return n; };
  let best = Infinity;
  for (let mask = 1; mask <= 1023; mask++) if (bits(mask) === count) best = Math.min(best, shadowBandCost(mask));
  let selected = 0, candidates = 0;
  for (let mask = 1; mask <= 1023; mask++) {
    if (bits(mask) !== count || shadowBandCost(mask) > best + 1.25) continue;
    candidates++;
    if (sample(candidates, 17, finalSeed + count) < 1 / candidates) selected = mask;
  }
  return Array.from({ length: 10 }, (_, band) => band).filter((band) => selected & 1 << band);
}
for (const [width, height] of [[320, 693], [390, 844]]) {
  for (const ratio of [0.6, 0.86]) {
    const layers = [];
    for (let shape = 0; shape < mixedFrames.length; shape++) {
      const image = await sprite(mixedFrames[shape], width * ratio, width * ratio * 0.24, 0.13, [33, 62, 76]);
      const rendered = await overlay(await base(width, height), image, width / 2, height / 2, width, height);
      const input = await sharp(rendered).extract({ left: 0, top: Math.round(height / 2 - 70), width, height: 140 }).png().toBuffer();
      layers.push({ input, left: shape % 4 * width, top: Math.floor(shape / 4) * 140 });
    }
    await save(`unified-shadow-14-${width}-${Math.round(ratio * 100)}.png`, await sharp({ create: { width: width * 4, height: 560, channels: 4, background: '#a1b73d' } }).composite(layers).png().toBuffer(), `current 14 shadow shapes in row-major order: ordinary 0-9, rabbit10/cat11/whale12/turtle13; final two cells empty; W=${width}, span=${width * ratio}, height=${width * ratio * 0.24}, tint213e4c alpha.13; original map crop at actual pixels, no magnification; not a game screenshot`);
  }
  if (includeHistorical) for (const count of [3, 10]) {
    const shapes = count === 3 ? [0, 10, 13] : [0, 10, 2, 11, 4, 12, 6, 13, 8, 9];
    const caseRecord = { count, width, height, staticSampleTimeMs: 2000, seed: finalSeed + count, shapes: [] };
    let canvas = await base(width, height);
    for (let index = 0; index < count; index++) {
      const shape = shapes[index];
      const ratio = 0.6 + 0.26 * sample(index, 0, finalSeed + count);
      const x = sample(index, 1, finalSeed + count);
      const y = 0.06 + 0.89 * sample(index, 2, finalSeed + count);
      const speed = 1.9 / (145000 + 55000 * sample(index, 3, finalSeed + count));
      const image = await sprite(mixedFrames[shape], width * ratio, width * ratio * 0.24, 0.13, [33, 62, 76]);
      canvas = await overlay(canvas, image, (x + 2000 * speed) * width, Math.round(width * 2.36) * y, width, height);
      caseRecord.shapes.push({ shape, ratio, initialX: x, y, speed });
    }
    unifiedShadowCases.push(caseRecord);
    await save(`unified-shadow-count${count}-${width}x${height}.png`, canvas, `current shared ${count}-slot static shadow example including ordinary and animal shapes; manually selected in-range shape IDs, other values fixed hash seed ${finalSeed + count}; initial fade fully reached after2000ms; count includes offscreen slots; not game's Math.random sequence or runtime screenshot`);
  }
  for (const count of [3, 10]) {
    const shapes = count === 3 ? [0, 10, 13] : [0, 10, 2, 11, 4, 12, 6, 13, 8, 9];
    const bands = dispersedBands(count);
    const caseRecord = { count, width, height, layout: 'nonoverlapping-complete-frame-random-bands', bands, staticSampleTimeMs: 2000, seed: finalSeed + count, shapes: [] };
    let canvas = await base(width, height);
    for (let index = 0; index < count; index++) {
      const shape = shapes[index], band = bands[index];
      const ratio = 0.6 + 0.26 * sample(index, 0, finalSeed + count);
      const x = sample(index, 1, finalSeed + count);
      const reservedHalfHeight = ratio * 0.24 / (2 * 2.1);
      const laneTop = band / 10 + 0.001 / 2 + reservedHalfHeight;
      const laneBottom = (band + 1) / 10 - 0.001 / 2 - reservedHalfHeight;
      const y = laneTop + sample(index, 2, finalSeed + count) * (laneBottom - laneTop);
      const speed = 1.9 / (145000 + 55000 * sample(index, 3, finalSeed + count));
      const image = await sprite(mixedFrames[shape], width * ratio, width * ratio * 0.24, 0.13, [33, 62, 76]);
      canvas = await overlay(canvas, image, (x + 2000 * speed) * width, Math.round(width * 2.36) * y, width, height);
      caseRecord.shapes.push({ shape, band, ratio, initialX: x, y, speed, laneTop, laneBottom });
    }
    unifiedShadowCases.push(caseRecord);
    await save(`unified-dispersed-count${count}-${width}x${height}.png`, canvas, `current nonoverlapping ${count}-slot shadow sample, runtime cost/band formulas copied, fixed example hash seed ${finalSeed + count}, bands ${bands.join(',')}; shape IDs chosen in range to show ordinary and animals, no game Math.random or runtime; after initial2000ms fade; offscreen slots included`);
  }
}
// Opening was cancelled by the user. Its formulas/preview files above are
// historical reproduction only and do not depend on a remaining runtime file.
const codePaths = ['src/view/estate-clouds.js', 'src/view/estate-weather.js'];
const codeInputs = await Promise.all(codePaths.map(async (path) => ({ path, sha256: sha256(await readFile(resolve(root, path))) })));
let previous = {};
try { previous = JSON.parse(await readFile(resolve(root, `${out}/evidence-manifest.json`), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const combinedEvidence = [...new Map([...(previous.evidence ?? []), ...records].map((record) => [record.path, record])).values()];
await writeFile(resolve(root, `${out}/evidence-manifest.json`), `${JSON.stringify({ inputs: Object.fromEntries(Object.entries(files).map(([key, path]) => [key, { path, sha256: sha256(bytes[key]) }])), codeInputs, openingStatus: 'Cancelled by user; every opening preview is superseded historical evidence, not a current feature or acceptance', animalForegroundStatus: 'Superseded by user requirement: animal shapes are shadows in the shared 3-10 pool', historicalV2OpeningCodeSha256: 'c77f1b364c6f8dc00641c4d81080680ba5ed8745527e4c30f8e6600a9b21707f', historicalV4OpeningCodeSha256: 'e2c05046f96d90b8db4b614459e59af3015cbf2ab67cb91b23659c78bdf4fe45', finalSeed, fieldRecords: includeHistorical ? fieldRecords : previous.fieldRecords, finalPreview: includeHistorical ? finalPreview : previous.finalPreview, individualRecords: includeHistorical ? individualRecords : previous.individualRecords, unifiedShadowCases, evidence: combinedEvidence }, null, 2)}\n`);
console.log(JSON.stringify({ generatedEvidenceCount: records.length, manifest: `${out}/evidence-manifest.json`, use: 'shared14-shape-shadow-pool', historicalGenerated: includeHistorical }, null, 2));
