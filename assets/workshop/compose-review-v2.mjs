import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Static material-use evidence only: generated bitmap crops + invisible masks.
// This is not the game, a browser preview, or a runtime verification.
const root = process.cwd();
const visuals = JSON.parse(await fs.readFile('src/content/workshop-visuals.json', 'utf8'));
const out = 'assets/workshop/reviews';
const S = 4;
const W = 320 * S;
const H = W;
// Use the final WebP bytes that the game will load, not only the lossless PNGs.
const pngPath = (asset) => path.join(root, 'public', asset.path.replace(/^\.\//, ''));
const transparent = (w, h) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const rectangle = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];
const horizontalPolys = [];
const verticalPolys = [];
const rails = [];
const assets = visuals.conveyor.assets;

function addRect(list, x0, y0, x1, y1) { list.push(rectangle(x0 * S, y0 * S, x1 * S, y1 * S)); }
async function railStrip(asset, x0, y0, x1, y1, vertical = false) {
  if (x1 <= x0 || y1 <= y0) return;
  const width = Math.round((x1 - x0) * S);
  const height = Math.round((y1 - y0) * S);
  const tile = await sharp(pngPath(asset)).resize(Math.round(asset.logicalSize[0] * S), Math.round(asset.logicalSize[1] * S), { kernel: 'nearest' }).png().toBuffer();
  const repeated = await transparent(width, height).composite([{ input: tile, tile: true, gravity: 'northwest' }]).png().toBuffer();
  rails.push({ input: repeated, left: Math.round(x0 * S), top: Math.round(y0 * S) });
  if (vertical) addRect(verticalPolys, x0 + 3, y0, x1 - 3, y1);
  else addRect(horizontalPolys, x0, y0 + 3, x1, y1 - 3);
}
function rotatePort(port, degrees) {
  const order = ['N', 'E', 'S', 'W'];
  return port === 'center' ? port : order[(order.indexOf(port) + degrees / 90) % 4];
}
async function module(asset, centerX, centerY, degrees, collectorDirection, centerEast = false) {
  const scaleX = asset.logicalSize[0] * S / asset.size[0];
  const scaleY = asset.logicalSize[1] * S / asset.size[1];
  const theta = degrees * Math.PI / 180;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  for (const region of asset.flowRegions) {
    const points = [];
    for (let i = 0; i < region.polygon.length; i += 2) {
      const dx = (region.polygon[i] - asset.center[0]) * scaleX;
      const dy = (region.polygon[i + 1] - asset.center[1]) * scaleY;
      points.push(centerX * S + dx * cos - dy * sin, centerY * S + dx * sin + dy * cos);
    }
    const port = rotatePort(region.port, degrees);
    const horizontal = port === 'W' || port === 'E' || port === 'center' && centerEast;
    (horizontal ? horizontalPolys : verticalPolys).push(points);
  }
  const image = await sharp(pngPath(asset)).resize(Math.round(asset.logicalSize[0] * S), Math.round(asset.logicalSize[1] * S), { kernel: 'nearest' }).rotate(degrees).png().toBuffer();
  rails.push({ input: image, left: Math.round((centerX - asset.logicalSize[0] / 2) * S), top: Math.round((centerY - asset.logicalSize[1] / 2) * S) });
}
function maskSvg(polygons) {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' + polygons.map(points => '<polygon fill="white" points="' + points.map((n, i) => (i % 2 === 0 ? '' : ',') + n.toFixed(3)).join(' ') + '"/>').join('') + '</svg>');
}
async function movingTexture(phase, vertical) {
  let tile = sharp(pngPath(visuals.conveyor.tread));
  if (vertical) tile = tile.rotate(90);
  const texture = await tile.png().toBuffer();
  const tiled = await transparent(W + 64, H + 64).composite([{ input: texture, tile: true, gravity: 'northwest' }]).png().toBuffer();
  return sharp(tiled).extract({ left: vertical ? 0 : phase * S, top: vertical ? phase * S : 0, width: W, height: H }).composite([{ input: await sharp(maskSvg(vertical ? verticalPolys : horizontalPolys)).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer();
}
async function make(kind, ids, product, label) {
  horizontalPolys.length = 0; verticalPolys.length = 0; rails.length = 0;
  const machine = visuals.machines[kind];
  const layout = visuals.conveyor.layout;
  const rows = ids.length === 1 ? [160] : layout.inputRows;
  if (ids.length === 1) {
    await railStrip(assets.straight, 20, 152, machine.input[0] + 4, 168);
  } else {
    for (const row of rows) await railStrip(assets.straight, 20, row - 8, 96, row + 8);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0) await module(assets.corner, 112, row, 0, 'S');
      else if (i === rows.length - 1) await module(assets.corner, 112, row, 90, 'N');
      else await module(row === 160 ? assets.cross : assets.junction, 112, row, 0, row < 160 ? 'S' : 'N', row === 160);
    }
    await railStrip(assets.straight, 128, 152, machine.input[0] + 4, 168);
  }
  await railStrip(assets.straight, machine.output[0] - 4, 152, 300, 168);
  const background = await sharp(pngPath(visuals.background)).resize(W, H, { kernel: 'nearest' }).png().toBuffer();
  const machineImage = await sharp(pngPath(machine)).resize(Math.round(machine.placement.width * S), Math.round(machine.placement.height * S), { kernel: 'nearest' }).png().toBuffer();
  const items = [];
  for (let i = 0; i < ids.length; i++) {
    const icon = await sharp(path.join('public/wiki/icons', ids[i] + '.webp')).resize(28 * S, 28 * S, { kernel: 'nearest' }).png().toBuffer();
    items.push({ input: icon, left: (42 - 14) * S, top: (rows[i] - 14) * S });
  }
  const productIcon = await sharp(path.join('public/wiki/icons', product + '.webp')).resize(30 * S, 30 * S, { kernel: 'nearest' }).png().toBuffer();
  items.push({ input: productIcon, left: 280 * S, top: 145 * S });
  for (const phase of [0, 4]) {
    const surfaceH = await movingTexture(phase, false);
    const surfaceV = await movingTexture(phase, true);
    const conveyor = await transparent(W, H).composite([{ input: surfaceH }, { input: surfaceV }, ...rails]).png().toBuffer();
    const belts320 = await sharp(conveyor).resize(320, 320, { kernel: 'nearest' }).png().toBuffer();
    await fs.writeFile(path.join(out, label + '-conveyor-phase' + phase + '.png'), belts320);
    const image = await sharp(background).composite([{ input: conveyor }, ...items, { input: machineImage, left: Math.round(machine.placement.x * S), top: Math.round(machine.placement.y * S) }]).png().toBuffer();
    await sharp(image).resize(320, 320, { kernel: 'nearest' }).png().toFile(path.join(out, label + '-phase' + phase + '-320.png'));
    await sharp(image).resize(130, 130, { kernel: 'nearest' }).png().toFile(path.join(out, label + '-phase' + phase + '-130.png'));
  }
}
await fs.mkdir(out, { recursive: true });
await make('processing', ['C01'], 'I01', 'processing-I01-single');
await make('refining', ['IF10', 'IL07', 'I84', 'I34', 'I24', 'IF08', 'IL03', 'I83', 'I74'], 'PT44', 'refining-PT44-nine');
for (const size of [130, 320]) {
  const files = ['processing-I01-single-phase0-', 'processing-I01-single-phase4-', 'refining-PT44-nine-phase0-', 'refining-PT44-nine-phase4-'];
  const inputs = await Promise.all(files.map(file => fs.readFile(path.join(out, file + size + '.png'))));
  await transparent(size * 2, size * 2).composite(inputs.map((input, i) => ({ input, left: (i % 2) * size, top: Math.floor(i / 2) * size }))).png().toFile(path.join(out, 'workshop-layered-v2-' + size + '.png'));
}
console.log('Saved static layered art composites at 320px and actual 130px for 1-input I01 and 9-input PT44, two tread phases. Game runtime was not executed.');
