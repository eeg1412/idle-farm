// Production export: one transparent plant per stage, never a baked field of
// repeated plants. Static review composites are explicitly separate artifacts.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { writeRuntimeCropVisuals } from '../scripts/compile-crop-visuals.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const art = path.join(root, 'assets/plot');
const size = 320;
const phases = ['sown', 'seedling', 'growing', 'mature'];
const layout = JSON.parse(await readFile(path.join(root, '.catalog-expansion-2026-11-28/assets/plot/crop-layout.json'), 'utf8'));
const furrows = JSON.parse(await readFile(path.join(art, 'furrows.json'), 'utf8'));
const catalog = JSON.parse(await readFile(path.join(root, '.catalog-expansion-2026-11-28/src/content/game-data.json'), 'utf8'));
const harvestPolicies = JSON.parse(await readFile(path.join(root, '.catalog-expansion-2026-11-28/src/content/crop-harvest.json'), 'utf8'));
const cropIds = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'C').sort();
const profiles = Object.fromEntries(Object.values(layout.families).flatMap((family) =>
  family.numbers.map((number) => ['C' + String(number).padStart(2, '0'), family])));
const metadataPath = path.join(root, '.catalog-expansion-2026-11-28/src/content/crop-visuals.json');
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

// Medium/large planting grid. `fieldGeometry` holds the ground measured once
// from public/art/plot/ground.webp (method recorded beside the numbers): a
// plane homography whose rows follow the measured furrows toward
// rowVanishingPoint and whose columns follow the real left/right field sides
// toward columnVanishingPoint. Equal (u, v) steps therefore give smoothly
// growing on-screen spacing with no jumps between hand-marked furrows.
const geometry = layout.fieldGeometry;

function fieldPoint(fieldGeometry, u, v) {
  const [rowX, rowY] = fieldGeometry.rowVanishingPoint;
  const [columnX, columnY] = fieldGeometry.columnVanishingPoint;
  const [originX, originY] = fieldGeometry.origin;
  const depth = fieldGeometry.depthPerUnit;
  const w = depth * (u + v) + 1;
  return [(depth * (u * rowX + v * columnX) + originX) / w, (depth * (u * rowY + v * columnY) + originY) / w];
}

function fieldGrid(fieldGeometry, columnSpacingU, columnInsetU = fieldGeometry.inset.u) {
  const { field, inset, ridgeOffset } = fieldGeometry;
  const rows = [];
  // Every ridge crest (trough + 0.5) inside the measured far/near edges.
  for (let v = Math.ceil(field.v[0] + inset.v - ridgeOffset) + ridgeOffset; v <= field.v[1] - inset.v + 1e-9; v += 1) {
    rows.push({ index: rows.length, v });
  }
  // Columns span both measured field sides: the first and last columns sit
  // `columnInsetU` (a size may override `inset.u`) inside the left/right
  // sides, and the target spacing is rounded so no strip at either side is
  // left unplanted.
  const [leftInsetU, rightInsetU] = Array.isArray(columnInsetU) ? columnInsetU : [columnInsetU, columnInsetU];
  const first = field.u[0] + leftInsetU;
  const span = field.u[1] - rightInsetU - first;
  const steps = Math.max(1, Math.round(span / columnSpacingU));
  const columns = [];
  for (let index = 0; index <= steps; index += 1) {
    columns.push({ index, u: Math.round((first + span * index / steps) * 1e6) / 1e6 });
  }
  return { rows, columns };
}

function outlineY(points, x) {
  for (let index = 1; index < points.length; index += 1) {
    const [rightX, rightY] = points[index];
    const [leftX, leftY] = points[index - 1];
    if (x <= rightX) return leftY + (rightY - leftY) * (x - leftX) / (rightX - leftX);
  }
  return points.at(-1)[1];
}

// The measured soil outline keeps roots off the grass fringe and fence; only
// its top/bottom curves count, the x=0/x=320 frame sides are not field edges.
function onSoil(fieldGeometry, x, y) {
  const { top, bottom, marginPx } = fieldGeometry.soilOutline;
  return y >= outlineY(top, x) + marginPx && y <= outlineY(bottom, x) - marginPx;
}

// Near-edge rule: a root must keep `clearanceRowFraction` of the local row
// pitch (measured along its own column) above the bottom soil outline, so the
// front row does not sit on the soil/grass seam. A node that would land in
// the foreground grass or too close to it is pulled back along its column
// toward the far side in `searchStepV` steps, but never closer than
// `minRowGapV` to the previous root of that column; only then is it dropped.
function nearEdgeClear(fieldGeometry, u, v, x, y) {
  const { clearanceRowFraction, minClearancePx } = fieldGeometry.nearEdge;
  const [farX, farY] = fieldPoint(fieldGeometry, u, v - 1);
  const [nearX, nearY] = fieldPoint(fieldGeometry, u, v);
  const clearance = Math.max(minClearancePx, clearanceRowFraction * Math.hypot(nearX - farX, nearY - farY));
  return y <= outlineY(fieldGeometry.soilOutline.bottom, x) - clearance;
}

function placeFieldRoots(fieldGeometry, rows, columns) {
  const { minRowGapV, searchStepV } = fieldGeometry.nearEdge;
  const candidate = (u, v) => {
    const [x, y] = fieldPoint(fieldGeometry, u, v);
    const rootX = Math.round(x);
    const rootY = Math.round(y);
    return { x: rootX, y: rootY, inFrame: rootX >= 0 && rootX <= size && rootY >= 0 && rootY <= size,
      onSoil: onSoil(fieldGeometry, rootX, rootY), clear: nearEdgeClear(fieldGeometry, u, v, rootX, rootY) };
  };
  const roots = [];
  const dropped = [];
  for (const column of columns) {
    let previousV;
    for (const row of rows) {
      const grid = candidate(column.u, row.v);
      // Off-frame or far-edge nodes keep the original rule: skipped, not moved.
      if (!grid.inFrame || grid.y < outlineY(fieldGeometry.soilOutline.top, grid.x) + fieldGeometry.soilOutline.marginPx) continue;
      let placed;
      if (grid.onSoil && grid.clear) placed = { ...grid, v: row.v };
      else {
        const limit = (previousV ?? row.v - 1) + minRowGapV;
        for (let step = 1; row.v - step * searchStepV >= limit - 1e-9; step += 1) {
          const v = Math.round((row.v - step * searchStepV) * 1e6) / 1e6;
          const moved = candidate(column.u, v);
          if (moved.inFrame && moved.onSoil && moved.clear) { placed = { ...moved, v }; break; }
        }
      }
      if (!placed) { dropped.push({ row: row.index, column: column.index, x: grid.x, y: grid.y }); continue; }
      roots.push({ x: placed.x, y: placed.y, row: row.index, column: column.index, v: placed.v,
        ...(placed.v !== row.v ? { pulledBackFrom: { x: grid.x, y: grid.y } } : {}) });
      previousV = placed.v;
    }
  }
  // Side-edge fallback (CG-3 r4): a few nodes of the outermost column run along
  // the lower-right grass side or the 320 frame, so pulling back along the
  // column never clears the near edge. Instead of insetting the whole column,
  // only those nodes get the smallest in-field move: back along the column
  // (>= minRowGapV behind the previous root) combined with a shift along the
  // ridge toward the field (<= maxShiftColumnFraction of the column pitch), and the root may sit up to
  // frameOverhangPx outside the right frame so the plant is cropped by it.
  // A moved root must keep minNeighborFraction of the local column pitch from
  // every placed root, so straightened columns never bunch up.
  const { maxShiftColumnFraction, frameOverhangPx, minNeighborFraction } = fieldGeometry.sideEdge;
  const maxShiftU = columns.length > 1 ? maxShiftColumnFraction * (columns[1].u - columns[0].u) : 0;
  const stillDropped = [];
  for (const node of dropped) {
    const column = columns[node.column];
    const row = rows[node.row];
    const previous = roots.filter((root) => root.column === node.column && root.row < node.row).at(-1);
    const limit = (previous?.v ?? row.v - 1) + minRowGapV;
    const [gridX, gridY] = fieldPoint(fieldGeometry, column.u, row.v);
    const [pitchX, pitchY] = fieldPoint(fieldGeometry, column.u - (columns[1].u - columns[0].u), row.v);
    const minNeighbor = minNeighborFraction * Math.hypot(gridX - pitchX, gridY - pitchY);
    let best;
    for (let shiftStep = 0; shiftStep * searchStepV <= maxShiftU + 1e-9; shiftStep += 1) {
      const u = Math.round((column.u - shiftStep * searchStepV) * 1e6) / 1e6;
      for (let step = 0; row.v - step * searchStepV >= limit - 1e-9; step += 1) {
        const v = Math.round((row.v - step * searchStepV) * 1e6) / 1e6;
        const [x, y] = fieldPoint(fieldGeometry, u, v);
        const rootX = Math.round(x);
        const rootY = Math.round(y);
        if (rootX < 0 || rootX > size + frameOverhangPx || rootY < 0 || rootY > size) continue;
        if (!onSoil(fieldGeometry, rootX, rootY) || !nearEdgeClear(fieldGeometry, u, v, rootX, rootY)) continue;
        if (roots.some((root) => Math.hypot(root.x - rootX, root.y - rootY) < minNeighbor)) continue;
        const distance = Math.hypot(x - gridX, y - gridY);
        if (!best || distance < best.distance - 1e-9) best = { x: rootX, y: rootY, u, v, distance };
        break; // larger pull-back at this u only moves farther away
      }
    }
    if (!best) { stillDropped.push(node); continue; }
    roots.push({ x: best.x, y: best.y, row: node.row, column: node.column, v: best.v,
      ...(best.u !== column.u ? { u: best.u } : {}), pulledBackFrom: { x: node.x, y: node.y } });
  }
  return { roots, dropped: stillDropped };
}

function plantingRoots(category) {
  if (category === 'small') return {
    planting: { source: 'assets/plot/furrows.json', rows: furrows.length, projection: { mode: 'original-roots' } },
    roots: furrows.flatMap((row, rowIndex) => row.map(([x, y], column) => ({ x, y, row: rowIndex, column }))),
  };
  const profile = layout.sizes[category];
  const columnInsetU = profile.columnInsetU ?? geometry.inset.u;
  const { rows, columns } = fieldGrid(geometry, profile.columnSpacingU, columnInsetU);
  const projection = {
    mode: 'field-homography',
    rowVanishingPoint: geometry.rowVanishingPoint,
    columnVanishingPoint: geometry.columnVanishingPoint,
    origin: geometry.origin,
    depthPerUnit: geometry.depthPerUnit,
    columnSpacingU: profile.columnSpacingU,
    // Recorded only when a size overrides the shared inset (medium phase).
    ...(profile.columnInsetU !== undefined ? { columnInsetU } : {}),
    rows,
    columns,
  };
  const { roots, dropped } = placeFieldRoots(geometry, rows, columns);
  if (dropped.length) console.log(`${category}: dropped near-edge nodes ${JSON.stringify(dropped)}`);
  return { planting: { source: 'assets/plot/crop-layout.json#fieldGeometry', rows: rows.length, projection }, roots };
}

function cropPlanting(category) {
  const profile = layout.sizes[category];
  const { planting, roots } = plantingRoots(category);
  return {
    planting,
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
  const projection = visual.planting.projection;
  const line = (from, to) => `<polyline points="${from.join(',')} ${to.join(',')}" />`;
  // Medium/large overlays show the measured ridge rows and side-parallel
  // columns actually used; small crops keep the hand-marked furrow points.
  const ridges = projection.mode === 'field-homography'
    ? [...projection.rows.map(({ v }) => line(fieldPoint(geometry, -2, v), fieldPoint(geometry, 8, v))),
      ...projection.columns.map(({ u }) => line(fieldPoint(geometry, u, -2), fieldPoint(geometry, u, 9)))].join('')
    : furrows.map((row) => `<polyline points="${row.map((point) => point.join(',')).join(' ')}" />`).join('');
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
} else {
  await writeFile(metadataPath, JSON.stringify(Object.fromEntries(Object.entries(visuals).sort()), null, 2) + '\n');
  // The game bundle imports only the runtime subset; regenerate it from the
  // metadata just written so both files never drift.
  await writeRuntimeCropVisuals({ from: metadataPath, to: path.join(root, '.catalog-expansion-2026-11-28/src/content/crop-visuals.runtime.json') });
}
for (const crop of reviewIds) {
  if (!visuals[crop] || visuals[crop].mode !== 'individual') throw new Error(`No individual plant metadata: ${crop}`);
  await exportReview(crop, visuals[crop]);
}
for (const crop of repeatReviewIds) await exportReview(crop, draftBare ? draftVisuals[crop] : visuals[crop], true);
console.log(`Exported ${exportedTextures} individual plant textures; ${draftBare ? 'draft review metadata only' : 'runtime metadata published'}; C01 field artwork unchanged.`);
if (reviewIds.length) console.log(`Static source-art composites saved under assets/plot/reviews/individual-v4/: ${reviewIds.join(', ')}`);
if (repeatReviewIds.length) console.log(`Adult bare/mature source-art composites saved under assets/plot/reviews/repeat-v1/: ${repeatReviewIds.join(', ')}`);
