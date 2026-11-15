// Production export: one transparent plant per stage, never a baked field of
// repeated plants. Static review composites are explicitly separate artifacts.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const art = path.join(root, 'assets/plot');
const size = 320;
const phases = ['sown', 'seedling', 'growing', 'mature'];
const layout = JSON.parse(await readFile(path.join(art, 'crop-layout.json'), 'utf8'));
const furrows = JSON.parse(await readFile(path.join(art, 'furrows.json'), 'utf8'));
const catalog = JSON.parse(await readFile(path.join(root, 'src/content/game-data.json'), 'utf8'));
const cropIds = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'C').sort();
const profiles = Object.fromEntries(Object.values(layout.families).flatMap((family) =>
  family.numbers.map((number) => ['C' + String(number).padStart(2, '0'), family])));
const metadataPath = path.join(root, 'src/content/crop-visuals.json');
const reviewsDirectory = path.join(art, 'reviews/individual-v4');

function alphaBounds(pixels, width, height, threshold = 1, minY = 0) {
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = minY; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (pixels[(y * width + x) * 4 + 3] < threshold) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return right < left ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function columnLine({ from, to }) {
  const slope = (to[0] - from[0]) / (to[1] - from[1]);
  return { slope, intercept: from[0] - slope * from[1] };
}

const boundaryLines = layout.columnProjection.sourceBoundaryColumns.map(columnLine);
const vanishingY = (boundaryLines[1].intercept - boundaryLines[0].intercept)
  / (boundaryLines[0].slope - boundaryLines[1].slope);
const vanishingPoint = {
  x: boundaryLines[0].slope * vanishingY + boundaryLines[0].intercept,
  y: vanishingY,
};

function plantingRoots(category) {
  if (category === 'small') return {
    projection: { mode: 'original-roots' },
    roots: furrows.flatMap((row, rowIndex) => row.map(([x, y], column) => ({ x, y, row: rowIndex, column }))),
  };
  const profile = layout.sizes[category];
  const projection = {
    vanishingPoint,
    referenceY: layout.columnProjection.referenceY,
    sourceBoundaryColumns: layout.columnProjection.sourceBoundaryColumns,
    columns: [],
  };
  const roots = [];
  for (let index = layout.columnProjection.firstColumn; index <= layout.columnProjection.lastColumn; index += 1) {
    const column = projection.columns.length;
    const referenceX = index * profile.columnSpacing;
    projection.columns.push({ index: column, x: referenceX });
    const slope = (referenceX - vanishingPoint.x) / (projection.referenceY - vanishingPoint.y);
    const intercept = vanishingPoint.x - slope * vanishingPoint.y;
    for (const [rowIndex, row] of furrows.entries()) {
      for (let segment = 0; segment < row.length - 1; segment += 1) {
        const [leftX, leftY] = row[segment];
        const [rightX, rightY] = row[segment + 1];
        const rowSlope = (rightY - leftY) / (rightX - leftX);
        const rowIntercept = leftY - rowSlope * leftX;
        const x = (intercept + slope * rowIntercept) / (1 - slope * rowSlope);
        if (x < leftX - 1e-8 || x > rightX + 1e-8) continue;
        roots.push({ x: Math.round(x), y: Math.round(rowSlope * x + rowIntercept), row: rowIndex, column });
        break;
      }
      // Columns enter or leave at the real field edges; no grass/sky roots.
    }
  }
  return { projection, roots };
}

function cropPlanting(category) {
  const profile = layout.sizes[category];
  const { projection, roots } = plantingRoots(category);
  return {
    planting: { source: 'assets/plot/furrows.json', rows: furrows.length, projection },
    roots: roots.map((point) => {
      let scale = 0.72 + (point.y - 65) * (0.38 / 225);
      let maxHeight = Math.max(2, point.y - 8);
      if (profile.perspective) {
        const perspective = profile.perspective;
        scale = perspective.farScale + (point.y - perspective.farY) * (perspective.nearScale - perspective.farScale)
          / (perspective.nearY - perspective.farY);
        maxHeight *= perspective.availableHeightFraction;
      }
      return { ...point, scale, maxHeight };
    }).sort((left, right) => left.y - right.y || left.x - right.x),
  };
}

async function exportPlant(crop, phase, stage) {
  const sourcePath = `assets/plot/crops/${crop}/${phase}.png`;
  const original = await readFile(path.join(root, sourcePath));
  const { data: raw, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(raw, info.width, info.height);
  if (!bounds) throw new Error(`Empty crop original: ${crop}/${phase}`);
  const plant = await sharp(original).extract(bounds).png().toBuffer();
  const pixels = await sharp(plant).ensureAlpha().raw().toBuffer();
  const foot = alphaBounds(pixels, bounds.width, bounds.height, 150,
    Math.max(0, bounds.height - Math.max(2, Math.floor(bounds.height / 24))));
  const profile = layout.sizes[layout.crops[crop]];
  const family = profiles[crop];
  const matureHeight = profile.height ?? family.height;
  const matureWidth = profile.width ?? family.width;
  const capHeight = [8, 18, matureHeight * 0.71, matureHeight][stage];
  const capWidth = [11, 18, matureWidth * 0.78, matureWidth][stage];
  const outputPath = `art/plot/plants/${crop}/${phase}.webp`;
  const sourceDirectory = path.join(art, 'plants', crop);
  const publicDirectory = path.join(root, 'public/art/plot/plants', crop);
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });
  await writeFile(path.join(sourceDirectory, phase + '.png'), plant);
  await sharp(plant).webp({ quality: 70, effort: 5 }).toFile(path.join(root, 'public', outputPath));
  return {
    phase, path: outputPath, width: bounds.width, height: bounds.height,
    anchorX: stage === 0 ? bounds.width / 2 : foot ? foot.left + foot.width / 2 : bounds.width / 2,
    anchorY: stage === 0 ? bounds.height / 2 : bounds.height - 1,
    baseScale: Math.min(capHeight / bounds.height, capWidth / bounds.width),
    source: { path: sourcePath, bounds },
  };
}

function canvas(width = size, height = size) {
  return sharp({ create: { width, height, channels: 4, background: '#00000000' } });
}

async function positionedPlant(stage, point) {
  const scale = Math.min(stage.baseScale * point.scale, point.maxHeight / stage.height);
  const width = Math.max(1, Math.round(stage.width * scale));
  const height = Math.max(1, Math.round(stage.height * scale));
  const left = Math.round(point.x - stage.anchorX * scale);
  const top = Math.round(point.y - stage.anchorY * scale);
  let sprite = sharp(path.join(root, 'public', stage.path)).resize(width, height, { kernel: 'nearest', fit: 'fill' });
  const clippedLeft = Math.max(0, -left);
  const clippedTop = Math.max(0, -top);
  const visibleWidth = Math.min(width, size - left) - clippedLeft;
  const visibleHeight = Math.min(height, size - top) - clippedTop;
  if (visibleWidth <= 0 || visibleHeight <= 0) return null;
  if (clippedLeft || clippedTop || visibleWidth !== width || visibleHeight !== height) {
    sprite = sharp(await sprite.png().toBuffer()).extract({
      left: clippedLeft, top: clippedTop, width: visibleWidth, height: visibleHeight,
    });
  }
  return { input: await sprite.png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) };
}

async function exportReview(crop, visual) {
  await mkdir(reviewsDirectory, { recursive: true });
  const sky = await readFile(path.join(root, 'public/art/plot/sky.webp'));
  const ground = await readFile(path.join(root, 'public/art/plot/ground.webp'));
  const base = await readFile(path.join(root, 'public/art/plot/sprinkler-base.webp'));
  const head = await readFile(path.join(root, 'public/art/plot/sprinkler-ne.webp'));
  const contact = [];
  const smallContact = [];
  for (const [index, stage] of visual.stages.entries()) {
    const plants = [[], []];
    const shadows = [[], []];
    for (const point of visual.roots) {
      const depth = Number(point.y >= layout.foregroundRootY);
      const plant = await positionedPlant(stage, point);
      if (plant) plants[depth].push(plant);
      const scale = Math.min(stage.baseScale * point.scale, point.maxHeight / stage.height);
      const radius = Math.min(14, Math.max(2, Math.floor(stage.width * scale / 5)));
      shadows[depth].push(`<ellipse cx="${point.x}" cy="${point.y + 0.5}" rx="${radius}" ry="1.5" />`);
    }
    const layers = [];
    for (let depth = 0; depth < plants.length; depth += 1) {
      const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">`
        + `<g fill="#3a1d0c" fill-opacity="${(45 + index * 14) / 255}">${shadows[depth].join('')}</g></svg>`);
      layers.push({ input: await sharp(shadow).blur(0.55).png().toBuffer() }, ...plants[depth]);
      if (!depth) layers.push({ input: base, left: 128, top: 140 }, { input: head, left: 128, top: 140 });
    }
    const image = await canvas().composite([{ input: sky }, { input: ground }, ...layers]).png().toBuffer();
    const tile = await sharp(image).resize(138, 138, { kernel: 'nearest' })
      .extract({ left: 4, top: 0, width: 130, height: 138 }).png().toBuffer();
    await writeFile(path.join(reviewsDirectory, `${crop}-${stage.phase}-320.png`), image);
    await writeFile(path.join(reviewsDirectory, `${crop}-${stage.phase}-130x138.png`), tile);
    contact.push({ input: image, left: index * size, top: 0 });
    smallContact.push({ input: tile, left: index * 130, top: 0 });
  }
  await canvas(size * 4, size).composite(contact).png().toFile(path.join(reviewsDirectory, `${crop}-stages.png`));
  await canvas(130 * 4, 138).composite(smallContact).png().toFile(path.join(reviewsDirectory, `${crop}-stages-130x138.png`));
  const ridges = furrows.map((row) => `<polyline points="${row.map((point) => point.join(',')).join(' ')}" />`).join('');
  const rootPoints = visual.roots.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="2.5" />`).join('');
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">`
    + `<g stroke="#2de4ed" stroke-width="1" fill="none">${ridges}</g><g fill="#ff3838">${rootPoints}</g></svg>`);
  await canvas().composite([{ input: sky }, { input: ground }, { input: overlay }]).png()
    .toFile(path.join(reviewsDirectory, `${crop}-roots.png`));
  await writeFile(path.join(reviewsDirectory, `${crop}-planting.json`), JSON.stringify(visual.planting, null, 2) + '\n');
}

function argumentValue(name) {
  const argumentsList = process.argv.slice(2);
  const inline = argumentsList.find((argument) => argument.startsWith(name + '='));
  if (inline) return inline.slice(name.length + 1);
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] : undefined;
}

if (JSON.stringify(cropIds) !== JSON.stringify(Object.keys(layout.crops).sort()) ||
    cropIds.some((crop) => !layout.sizes[layout.crops[crop]] || (crop !== 'C01' && !profiles[crop]))) {
  throw new Error('Every crop requires an explicit animation size and source family');
}
const category = argumentValue('--size');
const onlyIds = argumentValue('--ids')?.split(',');
const reviewIds = argumentValue('--review')?.split(',') ?? [];
if (category !== undefined && !Object.hasOwn(layout.sizes, category)) throw new Error(`Unknown crop size: ${category}`);
const selected = cropIds.filter((crop) => crop !== 'C01' && (!category || layout.crops[crop] === category)
  && (!onlyIds || onlyIds.includes(crop)));
let visuals = {};
try { visuals = JSON.parse(await readFile(metadataPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
visuals.C01 = { mode: 'fieldAtlas', size: 'small' };
for (const crop of selected) {
  const stages = [];
  for (const [index, phase] of phases.entries()) stages.push(await exportPlant(crop, phase, index));
  visuals[crop] = { mode: 'individual', size: layout.crops[crop], ...cropPlanting(layout.crops[crop]), stages };
}
await writeFile(metadataPath, JSON.stringify(Object.fromEntries(Object.entries(visuals).sort()), null, 2) + '\n');
for (const crop of reviewIds) {
  if (!visuals[crop] || visuals[crop].mode !== 'individual') throw new Error(`No individual plant metadata: ${crop}`);
  await exportReview(crop, visuals[crop]);
}
console.log(`Exported ${selected.length * phases.length} individual plant textures for ${selected.length} crops; C01 field artwork unchanged.`);
if (reviewIds.length) console.log(`Static source-art composites saved under assets/plot/reviews/individual-v4/: ${reviewIds.join(', ')}`);
