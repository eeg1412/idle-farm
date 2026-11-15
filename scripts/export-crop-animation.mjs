// Production compositor for the existing four-stage transparent crop originals.
// It uses the project's installed sharp dependency, so regenerating layout does
// not require Python/Pillow. The Python exporter also creates the early original
// sheets; both exporters share size, family, spacing and layer configuration.
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const art = path.join(root, 'assets/plot');
const published = path.join(root, 'public/art/plot/crops');
const size = 320;
const phases = ['sown', 'seedling', 'growing', 'mature'];
const layout = JSON.parse(await readFile(path.join(art, 'crop-layout.json'), 'utf8'));
const roots = JSON.parse(await readFile(path.join(art, 'furrows.json'), 'utf8')).flat()
  .sort((left, right) => left[1] - right[1]);
const catalog = JSON.parse(await readFile(path.join(root, 'src/content/game-data.json'), 'utf8'));
const crops = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'C').sort();
const profiles = Object.fromEntries(Object.values(layout.families).flatMap((family) =>
  family.numbers.map((number) => ['C' + String(number).padStart(2, '0'), family])));

function cropRoots(crop) {
  const category = layout.crops[crop];
  if (category === 'small') return roots;
  const profile = layout.sizes[category];
  const selected = [];
  for (const [x, y] of roots) {
    if (y < profile.minRootY || x < profile.edgeInset || x > size - profile.edgeInset) continue;
    const depthScale = 0.72 + (y - 65) * (0.38 / 225);
    const spacingX = profile.spacingX * depthScale;
    const spacingY = profile.spacingY * depthScale;
    if (selected.every(([otherX, otherY]) =>
      ((x - otherX) / spacingX) ** 2 + ((y - otherY) / spacingY) ** 2 >= 1)) selected.push([x, y]);
  }
  return selected;
}

function alphaBounds(pixels, width, height, threshold = 1, minY = 0) {
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = minY; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (pixels[(y * width + x) * 4 + 3] < threshold) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < left ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function canvas(width = size, height = size) {
  return sharp({ create: { width, height, channels: 4, background: '#00000000' } });
}

async function stampStage(crop, stage) {
  const original = await readFile(path.join(art, 'crops', crop, phases[stage] + '.png'));
  const { data: raw, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(raw, info.width, info.height);
  if (!bounds) throw new Error(`Empty crop original: ${crop}/${phases[stage]}`);
  const source = await sharp(original).extract(bounds).png().toBuffer();
  const pixels = await sharp(source).ensureAlpha().raw().toBuffer();
  const foot = alphaBounds(pixels, bounds.width, bounds.height, 150,
    Math.max(0, bounds.height - Math.max(2, Math.floor(bounds.height / 24))));
  const stemX = foot ? foot.left + foot.width / 2 : bounds.width / 2;
  const profile = layout.sizes[layout.crops[crop]];
  const family = profiles[crop];
  const height = profile.height ?? family.height;
  const width = profile.width ?? family.width;
  const capHeight = [8, 18, height * 0.71, height][stage];
  const capWidth = [11, 18, width * 0.78, width][stage];
  const plants = [[], []];
  const shadows = [[], []];
  for (const [x, y] of cropRoots(crop)) {
    const depth = Number(y >= layout.foregroundRootY);
    const depthScale = 0.72 + (y - 65) * (0.38 / 225);
    const factor = Math.min(capHeight * depthScale / bounds.height, capWidth * depthScale / bounds.width,
      Math.max(2, y - 8) / bounds.height);
    const w = Math.max(2, Math.round(bounds.width * factor));
    const h = Math.max(2, Math.round(bounds.height * factor));
    const left = x - Math.round((stage === 0 ? bounds.width / 2 : stemX) * w / bounds.width);
    const top = y - (stage === 0 ? Math.floor(h / 2) : h - 1);
    let plant = sharp(source).resize(w, h, { kernel: 'lanczos3', fit: 'fill' });
    const clippedLeft = Math.max(0, -left);
    const clippedTop = Math.max(0, -top);
    const visibleWidth = Math.min(w, size - left) - clippedLeft;
    const visibleHeight = Math.min(h, size - top) - clippedTop;
    if (visibleWidth <= 0 || visibleHeight <= 0) continue;
    if (clippedLeft || clippedTop || visibleWidth !== w || visibleHeight !== h) {
      plant = sharp(await plant.png().toBuffer()).extract({
        left: clippedLeft, top: clippedTop, width: visibleWidth, height: visibleHeight,
      });
    }
    plants[depth].push({ input: await plant.png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) });
    const radius = Math.min(14, Math.max(2, Math.floor(w / 5)));
    shadows[depth].push(`<ellipse cx="${x}" cy="${y + 0.5}" rx="${radius}" ry="1.5" />`);
  }
  return Promise.all(plants.map(async (layer, depth) => {
    const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">`
      + `<g fill="#3a1d0c" fill-opacity="${(45 + stage * 14) / 255}">${shadows[depth].join('')}</g></svg>`);
    const shadowLayer = await sharp(shadow).blur(0.55).png().toBuffer();
    return canvas().composite([{ input: shadowLayer }, ...layer]).png().toBuffer();
  }));
}

async function exportAtlas(crop) {
  const layers = [[], []];
  for (const [stage, phase] of phases.entries()) {
    let frames;
    if (crop === 'C01') {
      // The approved wheat foreground has no single-plant registration. Keep it
      // whole; the runtime hides the canonical back copy and draws it once over
      // the spray. No horizontal cuts or invented stalk placements are involved.
      const original = await readFile(path.join(art, 'wheat', `wheat-${stage}.png`));
      frames = [original, original];
    } else frames = await stampStage(crop, stage);
    for (let depth = 0; depth < layers.length; depth += 1) {
      layers[depth].push({ input: frames[depth], left: stage % 2 * size, top: Math.floor(stage / 2) * size });
    }
  }
  for (const [depth, suffix] of ['', '-front'].entries()) {
    const png = await canvas(size * 2, size * 2).composite(layers[depth]).png({ compressionLevel: 9 }).toBuffer();
    await sharp(png).toFile(path.join(art, 'crop-frames', crop + suffix + '.png'));
    await sharp(png).webp({ quality: 70, effort: 5 }).toFile(path.join(published, crop + suffix + '.webp'));
  }
}

if (JSON.stringify(crops) !== JSON.stringify(Object.keys(layout.crops).sort()) ||
    crops.some((crop) => !layout.sizes[layout.crops[crop]] || (crop !== 'C01' && !profiles[crop]))) {
  throw new Error('Every crop requires an explicit animation size and source family');
}
await mkdir(published, { recursive: true });
await mkdir(path.join(art, 'crop-frames'), { recursive: true });
for (let first = 0; first < crops.length; first += 4) {
  await Promise.all(crops.slice(first, first + 4).map(exportAtlas));
}
console.log(`Exported ${crops.length} crop atlases and ${crops.length} complete foreground atlases from existing originals.`);
