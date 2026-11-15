import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { workshopSceneLayout, workshopMotionFrame } from '../../src/view/workshop-layout.js';

// Static bitmap composition using the exact runtime layout/motion source.
// It is not a browser/game preview, test suite, or runtime fidelity claim.
const config = JSON.parse(await fs.readFile('assets/workshop/workshop-visuals-portless-v5-candidate.json', 'utf8'));
const output = 'assets/workshop/reviews/portless-v5';
const S = 4, W = 320 * S, H = W;
const imagePath = (asset) => path.join('public', asset.path.replace(/^\.\//, ''));
const blank = (width, height) => sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
function maskSvg(regions) {
  const polygons = regions.map(({ polygon }) => '<polygon fill="white" points="' + Array.from({ length: polygon.length / 2 }, (_, i) => (polygon[i * 2] * S).toFixed(4) + ',' + (polygon[i * 2 + 1] * S).toFixed(4)).join(' ') + '"/>').join('');
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' + polygons + '</svg>');
}
async function textureFrame(layout, frame) {
  const tread = config.conveyor.tread;
  const surfaces = [];
  for (const [index, region] of layout.surfaceRegions.entries()) {
    const tileWidth = Math.round(tread.logicalSize[0] * S);
    const tileHeight = Math.max(1, Math.round(region.bounds.height * S));
    const tile = await sharp(imagePath(tread)).resize(tileWidth, tileHeight, { kernel: 'nearest' }).png().toBuffer();
    const offset = frame.surfaceOffsets[index];
    const worldShiftX = offset[0] + region.bounds.x;
    const worldShiftY = offset[1] + region.bounds.y;
    const phaseX = ((Math.round(-worldShiftX * S) % tileWidth) + tileWidth) % tileWidth;
    const phaseY = ((Math.round(-worldShiftY * S) % tileHeight) + tileHeight) % tileHeight;
    const pattern = await blank(W + tileWidth, H + tileHeight).composite([{ input: tile, tile: true, gravity: 'northwest' }]).png().toBuffer();
    const surface = await sharp(pattern).extract({ left: phaseX, top: phaseY, width: W, height: H })
      .composite([{ input: await sharp(maskSvg([region])).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
    surfaces.push({ input: surface });
  }
  return blank(W, H).composite(surfaces).png().toBuffer();
}
async function icon(id, size, alpha = 1) {
  const pixels = Math.round(size * S);
  let buffer = await sharp(path.join('public/wiki/icons', id + '.webp')).resize(pixels, pixels, { kernel: 'nearest' }).png().toBuffer();
  if (alpha < 1) {
    const opacity = await sharp({ create: { width: pixels, height: pixels, channels: 4, background: { r: 255, g: 255, b: 255, alpha: Math.max(0, alpha) } } }).png().toBuffer();
    buffer = await sharp(buffer).composite([{ input: opacity, blend: 'dest-in' }]).png().toBuffer();
  }
  return buffer;
}
async function clippedIcon(id, size, position, mask, alpha = 1) {
  const pixels = Math.round(size * S);
  const left = Math.round((position[0] - size / 2) * S);
  const top = Math.round((position[1] - size / 2) * S);
  const x = Math.max(0, left, Math.round(mask.x * S));
  const y = Math.max(0, top, Math.round(mask.y * S));
  const right = Math.min(W, left + pixels, Math.round((mask.x + mask.width) * S));
  const bottom = Math.min(H, top + pixels, Math.round((mask.y + mask.height) * S));
  if (right <= x || bottom <= y) return undefined;
  const buffer = await icon(id, size, alpha);
  return { input: await sharp(buffer).extract({ left: x - left, top: y - top,
    width: right - x, height: bottom - y }).png().toBuffer(), left: x, top: y };
}
async function clippedMachine(buffer, width, height, left, top) {
  const x = Math.max(0, left), y = Math.max(0, top);
  const right = Math.min(W, left + width), bottom = Math.min(H, top + height);
  return { input: await sharp(buffer).extract({ left: x - left, top: y - top,
    width: right - x, height: bottom - y }).png().toBuffer(), left: x, top: y };
}
async function render(id, kind, label) {
  const layout = workshopSceneLayout(id, kind, config);
  const machine = layout.machine;
  const machineWidth = Math.round(machine.placement.width * S);
  const machineHeight = Math.round(machine.placement.height * S);
  const machineImage = await sharp(imagePath(machine)).resize(machineWidth, machineHeight, { kernel: 'nearest' }).png().toBuffer();
  const evidence = { config: 'assets/workshop/workshop-visuals-portless-v5-candidate.json', layoutSource: 'src/view/workshop-layout.js#workshopSceneLayout', frameSource: 'src/view/workshop-layout.js#workshopMotionFrame', recipe: id, layout, frames: {} };
  const states = [
    { name: 'waiting', clock: 0, options: { started: false, running: false } },
    { name: 'phase0', clock: 6000, options: { started: true, running: true } },
    { name: 'phaseHalf', clock: 6000 + config.conveyor.tread.period / config.conveyor.speed / 2,
      options: { started: true, running: true } },
  ];
  for (const state of states) {
    const frame = workshopMotionFrame(layout, state.clock, state.options);
    evidence.frames[state.name] = { clock: state.clock, options: state.options, frame };
    const surface = await textureFrame(layout, frame);
    const items = [];
    for (const packet of frame.inputs) {
      if (!packet.visible) continue;
      const image = await clippedIcon(packet.id, layout.inputStream.size, packet.position, layout.itemMasks.input);
      if (image) items.push(image);
    }
    if (frame.output.visible) {
      const image = await clippedIcon(id, layout.output.size, frame.output.position,
        layout.itemMasks.output, frame.output.alpha);
      if (image) items.push(image);
    }
    const machineLayer = await clippedMachine(machineImage, machineWidth, machineHeight,
      Math.round((machine.placement.x + frame.machineOffset[0]) * S),
      Math.round((machine.placement.y + frame.machineOffset[1]) * S));
    const rendered = await blank(W, H).composite([{ input: surface }, ...items, machineLayer]).png().toBuffer();
    for (const size of [320, 130]) await sharp(rendered).resize(size, size, { kernel: 'nearest' }).png().toFile(path.join(output, label + '-' + state.name + '-' + size + '.png'));
    await sharp(surface).resize(320, 320, { kernel: 'nearest' }).png().toFile(path.join(output, label + '-' + state.name + '-surface-only.png'));
  }
  await fs.writeFile(path.join(output, label + '-source-layout-and-frames.json'), JSON.stringify(evidence, null, 2) + '\n');
}
await fs.mkdir(output, { recursive: true });
await render('I01', 'I', 'processing-I01');
await render('PT44', 'P', 'refining-PT44');
for (const size of [130, 320]) {
  const inputs = await Promise.all(['processing-I01-phase0-', 'processing-I01-phaseHalf-', 'refining-PT44-phase0-', 'refining-PT44-phaseHalf-'].map(file => fs.readFile(path.join(output, file + size + '.png'))));
  await blank(size * 2, size * 2).composite(inputs.map((input, i) => ({ input, left: i % 2 * size, top: Math.floor(i / 2) * size }))).png().toFile(path.join(output, 'portless-runtime-layout-two-phases-' + size + '.png'));
  const waiting = await Promise.all(['processing-I01-waiting-', 'refining-PT44-waiting-'].map(file => fs.readFile(path.join(output, file + size + '.png'))));
  await blank(size * 2, size).composite(waiting.map((input, i) => ({ input, left: i * size, top: 0 }))).png().toFile(path.join(output, 'portless-runtime-layout-waiting-' + size + '.png'));
}
const tileWidth = Math.round(config.conveyor.tread.logicalSize[0]);
const stripWidth = tileWidth * 8;
const texture = await sharp(imagePath(config.conveyor.tread)).resize(tileWidth, 80, { kernel: 'nearest' }).png().toBuffer();
const tiled = await blank(stripWidth + tileWidth, 80).composite([{ input: texture, tile: true, gravity: 'northwest' }]).png().toBuffer();
const phase0 = await sharp(tiled).extract({ left: 0, top: 0, width: stripWidth, height: 80 }).png().toBuffer();
const phaseHalf = await sharp(tiled).extract({ left: Math.round(tileWidth / 2), top: 0, width: stripWidth, height: 80 }).png().toBuffer();
const strip = await blank(stripWidth, 160).composite([{ input: phase0, left: 0, top: 0 }, { input: phaseHalf, left: 0, top: 80 }]).png().toBuffer();
await fs.writeFile(path.join(output, 'surface-eight-periods-two-phases.png'), strip);
await sharp(strip).resize(stripWidth * 4, 640, { kernel: 'nearest' }).png().toFile(path.join(output, 'surface-eight-periods-two-phases-nearest4x.png'));
console.log('Saved final portless / borderless static bitmap evidence using the runtime layout and motion helpers, with final WebP assets. No browser, game, test or build was run.');
