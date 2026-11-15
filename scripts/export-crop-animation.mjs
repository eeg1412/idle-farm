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
const harvestPolicies = JSON.parse(await readFile(path.join(root, 'src/content/crop-harvest.json'), 'utf8'));
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

async function exportPlant(crop, phase, stage, sourcePath = `assets/plot/crops/${crop}/${phase}.png`, matureStage) {
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
  let anchorX = stage === 0 ? bounds.width / 2 : foot ? foot.left + foot.width / 2 : bounds.width / 2;
  let anchorY = stage === 0 ? bounds.height / 2 : bounds.height - 1;
  let baseScale = Math.min(capHeight / bounds.height, capWidth / bounds.width);
  let registration;
  if (phase === 'bare') {
    if (!matureStage) throw new Error(`Bare artwork requires its original mature body registration: ${crop}`);
    const sourceRegistration = layout.repeatBare?.[crop];
    if (sourceRegistration) {
      if (sourceRegistration.sourcePath !== sourcePath) throw new Error(`Bare source registration mismatch: ${crop}`);
      anchorX = sourceRegistration.anchorX - bounds.left;
      anchorY = sourceRegistration.anchorY - bounds.top;
      baseScale = matureStage.baseScale * sourceRegistration.scaleToMature;
      registration = { ...sourceRegistration, matureStagePath: matureStage.path };
    } else {
      // Reviewed existing adult originals share the mature source pixel scale.
      // Never independently fit the bare silhouette to a larger bounding box.
      baseScale = matureStage.baseScale;
      registration = { method: 'reviewed-adult-source-shared-mature-scale', scaleToMature: 1,
        anchorX: anchorX + bounds.left, anchorY: anchorY + bounds.top, matureStagePath: matureStage.path };
    }
  }
  return {
    phase, path: outputPath, width: bounds.width, height: bounds.height,
    anchorX, anchorY, baseScale,
    source: { path: sourcePath, bounds },
    ...(registration ? { registration } : {}),
  };
}

function canvas(width = size, height = size) {
  return sharp({ create: { width, height, channels: 4, background: '#00000000' } });
}

function plantScale(stage, point, matureStage) {
  if (stage.phase === 'bare' && matureStage) {
    return Math.min(matureStage.baseScale * point.scale, point.maxHeight / matureStage.height)
      * stage.registration.scaleToMature;
  }
  return Math.min(stage.baseScale * point.scale, point.maxHeight / stage.height);
}

async function positionedPlant(stage, point, matureStage) {
  const scale = plantScale(stage, point, matureStage);
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

async function exportReview(crop, visual, repeat = false) {
  const directory = repeat ? path.join(art, 'reviews/repeat-v1') : reviewsDirectory;
  const stages = repeat ? [visual.repeatBare, visual.stages[3]] : visual.stages;
  if (stages.some((stage) => !stage)) throw new Error(`No adult bare review state: ${crop}`);
  await mkdir(directory, { recursive: true });
  const sky = await readFile(path.join(root, 'public/art/plot/sky.webp'));
  const ground = await readFile(path.join(root, 'public/art/plot/ground.webp'));
  const base = await readFile(path.join(root, 'public/art/plot/sprinkler-base.webp'));
  const head = await readFile(path.join(root, 'public/art/plot/sprinkler-ne.webp'));
  const contact = [];
  const smallContact = [];
  for (const [index, stage] of stages.entries()) {
    const plants = [[], []];
    const shadows = [[], []];
    for (const point of visual.roots) {
      const depth = Number(point.y >= layout.foregroundRootY);
      const plant = await positionedPlant(stage, point, visual.stages[3]);
      if (plant) plants[depth].push(plant);
      const shadowStage = repeat ? visual.stages[3] : stage;
      const scale = plantScale(shadowStage, point, visual.stages[3]);
      const radius = Math.min(14, Math.max(2, Math.floor(shadowStage.width * scale / 5)));
      shadows[depth].push(`<ellipse cx="${point.x}" cy="${point.y + 0.5}" rx="${radius}" ry="1.5" />`);
    }
    const layers = [];
    for (let depth = 0; depth < plants.length; depth += 1) {
      const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">`
        + `<g fill="#3a1d0c" fill-opacity="${(45 + (repeat ? 3 : index) * 14) / 255}">${shadows[depth].join('')}</g></svg>`);
      layers.push({ input: await sharp(shadow).blur(0.55).png().toBuffer() }, ...plants[depth]);
      if (!depth) layers.push({ input: base, left: 128, top: 140 }, { input: head, left: 128, top: 140 });
    }
    const image = await canvas().composite([{ input: sky }, { input: ground }, ...layers]).png().toBuffer();
    const tile = await sharp(image).resize(138, 138, { kernel: 'nearest' })
      .extract({ left: 4, top: 0, width: 130, height: 138 }).png().toBuffer();
    await writeFile(path.join(directory, `${crop}-${stage.phase}-320.png`), image);
    await writeFile(path.join(directory, `${crop}-${stage.phase}-130x138.png`), tile);
    contact.push({ input: image, left: index * size, top: 0 });
    smallContact.push({ input: tile, left: index * 130, top: 0 });
  }
  const contactName = repeat ? 'repeat-states' : 'stages';
  await canvas(size * stages.length, size).composite(contact).png().toFile(path.join(directory, `${crop}-${contactName}.png`));
  await canvas(130 * stages.length, 138).composite(smallContact).png().toFile(path.join(directory, `${crop}-${contactName}-130x138.png`));
  if (repeat) {
    const registered = [];
    for (const [index, stage] of stages.entries()) {
      const plant = await positionedPlant(stage, { x: 160, y: 280, scale: 1, maxHeight: 260 }, visual.stages[3]);
      if (plant) registered.push({ ...plant, left: plant.left + index * size });
    }
    await canvas(size * stages.length, size).composite(registered).png().toFile(path.join(directory, `${crop}-adult-registration.png`));
  }
  const ridges = furrows.map((row) => `<polyline points="${row.map((point) => point.join(',')).join(' ')}" />`).join('');
  const rootPoints = visual.roots.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="2.5" />`).join('');
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">`
    + `<g stroke="#2de4ed" stroke-width="1" fill="none">${ridges}</g><g fill="#ff3838">${rootPoints}</g></svg>`);
  await canvas().composite([{ input: sky }, { input: ground }, { input: overlay }]).png()
    .toFile(path.join(directory, `${crop}-roots.png`));
  await writeFile(path.join(directory, `${crop}-planting.json`), JSON.stringify(visual.planting, null, 2) + '\n');
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
const repeatReviewIds = argumentValue('--review-repeat')?.split(',') ?? [];
const draftBare = process.argv.includes('--draft-bare');
if (category !== undefined && !Object.hasOwn(layout.sizes, category)) throw new Error(`Unknown crop size: ${category}`);
const selected = cropIds.filter((crop) => crop !== 'C01' && (!category || layout.crops[crop] === category)
  && (!onlyIds || onlyIds.includes(crop)));
let visuals = {};
try { visuals = JSON.parse(await readFile(metadataPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
visuals.C01 = { mode: 'fieldAtlas', size: 'small', harvestMode: harvestPolicies.C01.mode };
let draftVisuals = {};
try { draftVisuals = JSON.parse(await readFile(path.join(art, 'repeat-harvest/draft-visuals.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
let exportedTextures = 0;
for (const crop of selected) {
  const policy = harvestPolicies[crop];
  if (!policy || !['wholePlant', 'retainedPlant'].includes(policy.mode)) throw new Error(`Missing explicit crop harvest policy: ${crop}`);
  if (draftBare) {
    if (policy.mode !== 'retainedPlant') continue;
    const visual = { ...visuals[crop], harvestMode: policy.mode };
    visual.repeatBare = await exportPlant(crop, 'bare', 3, policy.repeatBare.sourcePath, visual.stages[3]);
    draftVisuals[crop] = visual;
    exportedTextures += 1;
    continue;
  }
  const stages = [];
  for (const [index, phase] of phases.entries()) stages.push(await exportPlant(crop, phase, index));
  exportedTextures += stages.length;
  const visual = { mode: 'individual', size: layout.crops[crop], harvestMode: policy.mode,
    ...cropPlanting(layout.crops[crop]), stages };
  if (policy.mode === 'retainedPlant') {
    if (!['reuseGrowing', 'approvedArtwork'].includes(policy.repeatBare?.status)) {
      throw new Error(`Adult bare crop artwork requires review before export: ${crop}`);
    }
    // Bare bodies inherit the mature source registration, not an independent
    // silhouette fit or the first-cycle growing stage's smaller display size.
    visual.repeatBare = await exportPlant(crop, 'bare', 3, policy.repeatBare.sourcePath, stages[3]);
    exportedTextures += 1;
  }
  visuals[crop] = visual;
}
if (draftBare) {
  await mkdir(path.join(art, 'repeat-harvest'), { recursive: true });
  await writeFile(path.join(art, 'repeat-harvest/draft-visuals.json'), JSON.stringify(draftVisuals, null, 2) + '\n');
} else await writeFile(metadataPath, JSON.stringify(Object.fromEntries(Object.entries(visuals).sort()), null, 2) + '\n');
for (const crop of reviewIds) {
  if (!visuals[crop] || visuals[crop].mode !== 'individual') throw new Error(`No individual plant metadata: ${crop}`);
  await exportReview(crop, visuals[crop]);
}
for (const crop of repeatReviewIds) await exportReview(crop, draftBare ? draftVisuals[crop] : visuals[crop], true);
console.log(`Exported ${exportedTextures} individual plant textures; ${draftBare ? 'draft review metadata only' : 'runtime metadata published'}; C01 field artwork unchanged.`);
if (reviewIds.length) console.log(`Static source-art composites saved under assets/plot/reviews/individual-v4/: ${reviewIds.join(', ')}`);
if (repeatReviewIds.length) console.log(`Adult bare/mature source-art composites saved under assets/plot/reviews/repeat-v1/: ${repeatReviewIds.join(', ')}`);
