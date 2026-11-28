import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { livestockFeedLayout } from '../../../src/view/livestock-layout.js';

const sourceRoot = 'assets/livestock/tiny';
const publicRoot = 'public/art/livestock/tiny';
const evidenceRoot = 'assets/livestock/reviews/tiny';
const { sceneSize, beeFlight, L29: { leafBed } } = JSON.parse(await readFile(sourceRoot + '/geometry.json', 'utf8'));
const { L13, L29 } = JSON.parse(await readFile('src/content/tiny-livestock.json', 'utf8'));
const visuals = JSON.parse(await readFile('src/content/livestock-visuals.json', 'utf8'));
const nearest = { kernel: 'nearest' };
const createCanvas = (width, height, alpha) => sharp({ create: {
  width, height, channels: 4, background: { r: 39, g: 32, b: 26, alpha },
} });
const png = (input) => sharp(input).png().toBuffer();
const round = Math.round;
const output = ['hive', 'silkworm-rack', 'bee-flight', 'scene-L13', 'scene-L29'];
await Promise.all([sourceRoot, publicRoot, evidenceRoot].map((path) => mkdir(path, { recursive: true })));

function publicFile(name) {
  return publicRoot + '/' + name + '.webp';
}
function publicAsset(path) {
  return 'public/' + path;
}
async function save(name, image) {
  await writeFile(sourceRoot + '/' + name + '.png', image);
  await sharp(image).webp({ lossless: true }).toFile(publicFile(name));
}

for (const background of ['hive', 'silkworm-rack']) {
  let image = await sharp(sourceRoot + '/' + background + '-imagegen.png')
    .resize(sceneSize, sceneSize, nearest).png().toBuffer();
  if (background === 'silkworm-rack') {
    const polygons = leafBed.polygons.map((points) => '<polygon points="'
      + points.map((point) => point.join(',')).join(' ') + '" fill="white"/>').join('');
    const mask = Buffer.from('<svg width="' + sceneSize + '" height="' + sceneSize + '">' + polygons + '</svg>');
    const leaves = await sharp(sourceRoot + '/' + leafBed.source)
      .resize(sceneSize, sceneSize, nearest).ensureAlpha()
      .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    image = await sharp(image).composite([{ input: leaves }]).png().toBuffer();
  }
  await save(background, image);
}

const { frameSize, sourceCropSize, sourcePivots } = beeFlight;
const rawSheet = sourceRoot + '/bee-flight-imagegen.png';
const beeFrames = await Promise.all(sourcePivots.map(([x, y]) => sharp(rawSheet).extract({
  left: x - sourceCropSize / 2, top: y - sourceCropSize / 2,
  width: sourceCropSize, height: sourceCropSize,
}).resize(frameSize, frameSize, nearest).png().toBuffer()));
const beeSheet = await createCanvas(frameSize * beeFrames.length, frameSize, 0)
  .composite(beeFrames.map((input, i) => ({ input, left: i * frameSize, top: 0 }))).png().toBuffer();
await save('bee-flight', beeSheet);

function shadow(x, y, rx, ry, opacity) {
  const input = Buffer.from('<svg width="' + sceneSize + '" height="' + sceneSize
    + '"><ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry
    + '" fill="#2b2118" opacity="' + opacity + '"/></svg>');
  return { input, left: 0, top: 0 };
}
async function beeScene(now, ready) {
  const layers = await Promise.all(L13.flights.map(async (flight, i) => {
    const phase = (now / flight.periodMs + i / L13.flights.length) * Math.PI * 2;
    const across = Math.cos(phase);
    const x = flight.x + Math.sin(phase) * flight.radiusX;
    const y = flight.y + across * flight.radiusY;
    const pose = Math.floor(now / 100 + i) % beeFrames.length;
    let image = sharp(beeFrames[pose]);
    if (across < 0) image = image.flop();
    const input = await image.resize(flight.size, flight.size, nearest).png().toBuffer();
    return { input, left: round(x - flight.size / 2), top: round(y - flight.size / 2) };
  }));
  if (ready) layers.push(...await productLayers('L13', L13.product));
  return sharp(publicAsset(L13.background)).composite(layers).png().toBuffer();
}

const silkworm = visuals.L29;
const feed = livestockFeedLayout(silkworm.feeding[0], silkworm.feedTexture, 0.48);
const feedPath = silkworm.feedTexture.path.replace(/^\./, 'public');
async function silkwormScene(now, ready) {
  const layers = [];
  for (const [index, { x, y, scale }] of L29.placements.entries()) {
    const left = x - 138 * scale;
    const top = y - 270 * scale;
    const feet = silkworm.grounding[0];
    layers.push(shadow(left + feet.x * scale, top + feet.y * scale, feet.radiusX * scale, feet.radiusY * scale, 0.22));
    layers.push({
      input: await sharp(feedPath).resize(round(feed.width * scale), round(feed.height * scale), nearest).png().toBuffer(),
      left: round(left + feed.x * scale), top: round(top + feed.y * scale),
    });
    const frame = Math.floor(now / 300 + index * 4 / L29.placements.length) % 4;
    layers.push({
      input: await sharp('public/art/livestock/animals/L29.webp')
        .extract({ left: frame * sceneSize, top: 0, width: sceneSize, height: sceneSize })
        .resize(round(sceneSize * scale), round(sceneSize * scale), nearest).png().toBuffer(),
      left: round(left), top: round(top),
    });
  }
  if (ready) layers.push(...await productLayers('L29', L29.product));
  return sharp(publicAsset(L29.background)).composite(layers).png().toBuffer();
}

async function productLayers(id, { x, y, size }) {
  const { icon, bounds } = visuals[id].product;
  const scale = size / Math.max(bounds.width, bounds.height);
  const visibleWidth = round(bounds.width * scale);
  const visibleHeight = round(bounds.height * scale);
  const input = await sharp('public/wiki/icons/' + icon + '.webp')
    .extract({ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height })
    .resize(visibleWidth, visibleHeight, nearest).png().toBuffer();
  return [
    shadow(x, y - 2, visibleWidth * 0.4, 3, 0.36),
    { input, left: round(x - visibleWidth / 2), top: y - visibleHeight },
  ];
}

const details = await Promise.all([beeScene(0, false), silkwormScene(0, false)]);
await save('scene-L13', details[0]);
await save('scene-L29', details[1]);

async function contactSheet(path, rows, tileSize) {
  const gap = 4;
  const cols = rows[0].length;
  const layers = [];
  for (const [row, items] of rows.entries()) {
    for (const [col, input] of items.entries()) {
      layers.push({
        input: await sharp(input).resize(tileSize, tileSize, nearest).png().toBuffer(),
        left: col * (tileSize + gap), top: row * (tileSize + gap),
      });
    }
  }
  await createCanvas(cols * (tileSize + gap) - gap, rows.length * (tileSize + gap) - gap, 1)
    .composite(layers).png().toFile(evidenceRoot + '/' + path + '.png');
}

const barn = await png('public/art/livestock/barn.webp');
const hive = await png(publicFile('hive'));
const rack = await png(publicFile('silkworm-rack'));
const beeReady = await beeScene(0, true);
const silkwormReady = await silkwormScene(0, true);
await contactSheet('backgrounds', [[barn, hive, rack]], sceneSize);
await contactSheet('scenes-320', [[hive, details[0], beeReady], [rack, details[1], silkwormReady]], sceneSize);
const sampleTimes = [0, 300, 600, 900];
const sampleScene = (render) => Promise.all(sampleTimes.map((now, index) => render(now, index === 3)));
await contactSheet('scenes-130', [await sampleScene(beeScene), await sampleScene(silkwormScene)], 130);
await contactSheet('bee-frames', [beeFrames], frameSize * 3);

const evidence = ['backgrounds', 'scenes-320', 'scenes-130', 'bee-frames'].map((name) => evidenceRoot + '/' + name + '.png');
const tracked = output.flatMap((name) => [sourceRoot + '/' + name + '.png', publicFile(name)]);
const sources = ['hive-imagegen.png', 'silkworm-rack-imagegen.png', leafBed.source, 'bee-flight-imagegen.png']
  .map((name) => sourceRoot + '/' + name);
for (const path of [...sources, ...tracked, ...evidence]) {
  console.log(createHash('sha256').update(await readFile(path)).digest('hex') + ' ' + path);
}

