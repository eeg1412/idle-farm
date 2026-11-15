import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { livestockFeedLayout, livestockLayout } from '../../../src/view/livestock-layout.js';

// Static art composition only. Before 0/3 are the exact archived V7 inputs;
// before 1/2 are reconstructed from the unchanged original and old registration.
const output = 'assets/livestock/reviews/goat-pixel-cleanup-r1';
await mkdir(output, { recursive: true });
const layout = JSON.parse(await readFile('assets/livestock/layout.json', 'utf8'));
const atlas = JSON.parse(await readFile('assets/livestock/atlas.json', 'utf8'));
const stage = layout.species.L04.stages[0];
const raw = await sharp('assets/livestock/raw/pixel-v5-feeding-accessories.png')
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < raw.data.length; i += 4) {
  if (raw.data[i + 3] < 200) raw.data.fill(0, i, i + 4);
  else raw.data[i + 3] = 255;
}
const source = await sharp(raw.data, { raw: raw.info }).png().toBuffer();
const transparent = (width, height) => sharp({ create: { width, height, channels: 4,
  background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const background = (width, height) => sharp({ create: { width, height, channels: 4,
  background: '#f5ead8' } });
const before = [], after = [], published = [], rawCells = [];
for (let frame = 0; frame < 4; frame++) {
  if (frame === 0 || frame === 3) {
    before.push(await readFile(`assets/livestock/choice-input-archive/v7/L04/adult-${frame}.png`));
  } else {
    const [x, y] = stage.sourceAnchors[frame];
    const crop = await sharp(source).extract({ left: x - 108, top: y - 192, width: 251, height: 218 })
      .resize(174, 151, { kernel: 'nearest' }).png().toBuffer();
    before.push(await transparent(320, 320).composite([{ input: crop, left: 63, top: 137 }]).png().toBuffer());
  }
  after.push(await readFile(`assets/livestock/animals/L04/adult-${frame}.png`));
  published.push(await sharp('public/art/livestock/animals/L04.webp')
    .extract({ left: frame * 320, top: 0, width: 320, height: 320 }).png().toBuffer());
  const cell = stage.cellRects[frame];
  rawCells.push(await transparent(260, 218).composite([{ input: await sharp(source).extract(cell).png().toBuffer(),
    left: 0, top: 0 }]).png().toBuffer());
}
const labels = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="680">'
  + '<g fill="#352b26" font-family="sans-serif" font-size="15"><text x="10" y="20">BEFORE: exact archived 0/3; original-crop reconstruction 1/2</text>'
  + '<text x="10" y="360">AFTER: source-cell isolation r1, same original body samples and restored complete ears</text></g></svg>');
await background(1280, 680).composite([
  ...before.map((input, frame) => ({ input, left: frame * 320, top: 20 })),
  ...after.map((input, frame) => ({ input, left: frame * 320, top: 360 })),
  { input: labels, left: 0, top: 0 },
]).png().toFile(`${output}/four-frames-before-after.png`);
const enlarged = [];
for (const [row, frames] of [before, after].entries()) for (const [frame, input] of frames.entries()) {
  enlarged.push({ input: await sharp(input).extract({ left: 55, top: 135, width: 195, height: 150 })
    .resize(780, 600, { kernel: 'nearest' }).png().toBuffer(), left: frame * 780, top: row * 600 });
}
await background(3120, 1200).composite(enlarged).png().toFile(`${output}/four-frames-before-after-nearest4x.png`);
await background(1280, 320).composite(published.map((input, frame) => ({ input, left: frame * 320, top: 0 })))
  .png().toFile(`${output}/published-webp-normal.png`);
await background(1040, 218).composite(rawCells.map((input, frame) => ({ input, left: frame * 260, top: 0 })))
  .png().toFile(`${output}/source-cells-normal.png`);
await sharp(`${output}/source-cells-normal.png`).resize(4160, 872, { kernel: 'nearest' })
  .png().toFile(`${output}/source-cells-nearest4x.png`);

const barn = await readFile('public/art/livestock/barn.webp');
const feedTexture = layout.feedTexture;
const feed = await readFile(`public/${feedTexture.path.replace(/^\.\//, '')}`);
const positions = livestockLayout('L04');
async function scene(animal) {
  const layers = [];
  for (const placement of positions.placements) {
    const factor = positions.animalScale * placement.depth;
    const left = placement.x - 138 * factor, top = placement.y - 270 * factor;
    const geometry = livestockFeedLayout(stage.feeding, feedTexture, positions.animalScale);
    const { shadow } = geometry;
    const feedShadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><g transform="translate(${left} ${top}) scale(${factor})"><ellipse cx="${shadow.x}" cy="${shadow.y}" rx="${shadow.radiusX}" ry="${shadow.radiusY}" fill="#2b2118" opacity="${shadow.alpha}"/></g></svg>`);
    layers.push({ input: feedShadow, left: 0, top: 0 });
    layers.push({ input: await sharp(feed).resize(Math.round(geometry.width * factor), Math.round(geometry.height * factor),
      { kernel: 'nearest' }).png().toBuffer(), left: Math.round(left + geometry.x * factor), top: Math.round(top + geometry.y * factor) });
    layers.push({ input: await sharp(animal).resize(Math.round(320 * factor), Math.round(320 * factor),
      { kernel: 'nearest' }).png().toBuffer(), left: Math.round(left), top: Math.round(top) });
  }
  const composed = await sharp(barn).composite(layers).png().toBuffer();
  return sharp(composed).resize(130, 130, { kernel: 'nearest' }).png().toBuffer();
}
const cards = [];
for (const [row, frames] of [before, published].entries()) for (const [frame, animal] of frames.entries()) {
  cards.push({ input: await scene(animal), left: frame * 134 + 2, top: row * 134 + 2 });
}
await background(536, 268).composite(cards).png().toFile(`${output}/before-after-130.png`);
const fallback = await sharp('public/art/scene-L04.webp').resize(130, 130, { kernel: 'nearest' }).png().toBuffer();
await background(536, 134).composite([
  ...cards.filter((_, index) => index >= 4).map((card) => ({ ...card, top: 2 })),
]).png().toFile(`${output}/published-four-frames-130.png`);
await writeFile(`${output}/fallback-130.png`, fallback);
const hash = (data) => createHash('sha256').update(data).digest('hex');
await writeFile(`${output}/provenance.json`, JSON.stringify({
  revision: 'l04-cell-isolation-r1', source: atlas.sources.accessories,
  originalCanvas: [-108, -192, 251, 218], repairedCanvas: stage.sourceCanvas,
  sourceSamplingCanvas: stage.sourceSamplingCanvas, stageScale: stage.sourceScale,
  before: before.map((data, frame) => ({ frame, sha256: hash(data), provenance: frame === 0 || frame === 3
    ? 'Exact archived original V7 image_gen input' : 'Unchanged original artwork through original 251x218 crop and 174x151 resize' })),
  after: atlas.species.L04.frames.map(({ frame, sourceAnchor, sourceIsolation, frameAsset }) =>
    ({ frame, sourceAnchor, sourceIsolation, frameAsset })),
  atlas: atlas.species.L04.atlasAsset, fallback: atlas.species.L04.facilityScene,
  scope: 'Static artwork composition only; game runtime and animation loop not verified.',
}, null, 2) + '\n');
