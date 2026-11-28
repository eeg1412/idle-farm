import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import livestockVisuals from '../src/content/livestock-visuals.json' with { type: 'json' };
import cropVisuals from '../src/content/crop-visuals.json' with { type: 'json' };
import cropHarvest from '../src/content/crop-harvest.json' with { type: 'json' };
import fishVisuals from '../src/content/fish-visuals.json' with { type: 'json' };
import fishHabitats from '../src/content/fish-habitats.json' with { type: 'json' };
import miningVisuals from '../src/content/mining-visuals.json' with { type: 'json' };
import { fishRegistration, fishSizeLayouts } from '../src/view/fish-layout.js';

const locate = (file) => new URL('../' + file, import.meta.url);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function imageFile(file, width, height, alpha = false) {
  const bytes = await readFile(locate(file));
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== width || metadata.height !== height || (alpha && !metadata.hasAlpha)) {
    throw new Error(`图片规格或透明通道不符：${file}，需要 ${width}×${height}${alpha ? ' 透明图' : ''}`);
  }
  return bytes;
}
function opaqueBounds(pixels, width, height, alphaThreshold = 128) {
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (pixels[(y * width + x) * 4 + 3] < alphaThreshold) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}
function sameIDs(expected, actual, label) {
  if (JSON.stringify([...expected].sort()) !== JSON.stringify([...actual].sort())) {
    throw new Error(`${label}未与目录全部 ID 一一对应。`);
  }
}
function validGrounding(grounding) {
  return Number.isFinite(grounding?.x) && grounding.x >= 0 && grounding.x <= 320 &&
    Number.isFinite(grounding.y) && grounding.y >= 0 && grounding.y <= 320 &&
    Number.isFinite(grounding.radiusX) && grounding.radiusX > 0 &&
    Number.isFinite(grounding.radiusY) && grounding.radiusY > 0;
}
function sameGrounding(left, right) {
  return ['x', 'y', 'radiusX', 'radiusY'].every((key) => left[key] === right[key]);
}
function sameBounds(left, right) {
  return left && right && ['x', 'y', 'width', 'height'].every((key) => left[key] === right[key]);
}
function validRegion(bounds, width, height) {
  return bounds && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(bounds[key])) &&
    bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0 &&
    bounds.x + bounds.width <= width && bounds.y + bounds.height <= height;
}
function containsPoint(bounds, x, y) {
  return x >= bounds.x - 0.01 && x <= bounds.x + bounds.width + 0.01 &&
    y >= bounds.y - 0.01 && y <= bounds.y + bounds.height + 0.01;
}
function validWater(water) {
  if (!Number.isInteger(water?.color) || water.color < 0 || water.color > 0xffffff ||
      !Number.isFinite(water.alpha) || water.alpha <= 0 || water.alpha >= 1 ||
      !Array.isArray(water.polygon) || water.polygon.length < 3 || water.polygon.some((point) =>
        !Array.isArray(point) || point.length !== 2 || point.some((value) =>
          !Number.isFinite(value) || value < 0 || value > 320))) return false;
  if (new Set(water.polygon.map((point) => point.join(','))).size < 3) return false;
  const area = water.polygon.reduce((sum, point, index, points) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0);
  return Math.abs(area) > 0;
}
// Mirrors export-crop-animation.mjs: medium/large roots are nodes of the
// measured ground homography (rows = ridge crests toward the row vanishing
// point, columns parallel to the real field sides toward the column vanishing
// point), kept inside the measured soil outline.
function fieldPoint(geometry, u, v) {
  const depth = geometry.depthPerUnit;
  const w = depth * (u + v) + 1;
  return [
    (depth * (u * geometry.rowVanishingPoint[0] + v * geometry.columnVanishingPoint[0]) + geometry.origin[0]) / w,
    (depth * (u * geometry.rowVanishingPoint[1] + v * geometry.columnVanishingPoint[1]) + geometry.origin[1]) / w,
  ];
}
function fieldGrid(geometry, columnSpacingU, columnInsetU = geometry.inset.u) {
  const { field, inset, ridgeOffset } = geometry;
  const rows = [];
  for (let v = Math.ceil(field.v[0] + inset.v - ridgeOffset) + ridgeOffset; v <= field.v[1] - inset.v + 1e-9; v += 1) {
    rows.push({ index: rows.length, v });
  }
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
function onSoil(geometry, x, y) {
  const { top, bottom, marginPx } = geometry.soilOutline;
  return y >= outlineY(top, x) + marginPx && y <= outlineY(bottom, x) - marginPx;
}
function nearEdgeClear(geometry, u, v, x, y) {
  const { clearanceRowFraction, minClearancePx } = geometry.nearEdge;
  const [farX, farY] = fieldPoint(geometry, u, v - 1);
  const [nearX, nearY] = fieldPoint(geometry, u, v);
  const clearance = Math.max(minClearancePx, clearanceRowFraction * Math.hypot(nearX - farX, nearY - farY));
  return y <= outlineY(geometry.soilOutline.bottom, x) - clearance;
}
// Mirrors placeFieldRoots in export-crop-animation.mjs: grid nodes that land in
// the foreground grass or within the near-edge clearance are pulled back along
// their own column (never closer than minRowGapV to the previous root there).
function placeFieldRoots(geometry, rows, columns) {
  const { minRowGapV, searchStepV } = geometry.nearEdge;
  const candidate = (u, v) => {
    const [x, y] = fieldPoint(geometry, u, v);
    const rootX = Math.round(x);
    const rootY = Math.round(y);
    return { x: rootX, y: rootY, inFrame: rootX >= 0 && rootX <= 320 && rootY >= 0 && rootY <= 320,
      onSoil: onSoil(geometry, rootX, rootY), clear: nearEdgeClear(geometry, u, v, rootX, rootY) };
  };
  const roots = [];
  const dropped = [];
  for (const column of columns) {
    let previousV;
    for (const row of rows) {
      const grid = candidate(column.u, row.v);
      if (!grid.inFrame || grid.y < outlineY(geometry.soilOutline.top, grid.x) + geometry.soilOutline.marginPx) continue;
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
  // Side-edge fallback, mirrored: smallest pull-back plus shift along the ridge
  // (<= maxShiftColumnFraction of the column pitch), keeping minNeighborFraction
  // of the local column pitch from every placed root.
  const { maxShiftColumnFraction, frameOverhangPx, minNeighborFraction } = geometry.sideEdge;
  const maxShiftU = columns.length > 1 ? maxShiftColumnFraction * (columns[1].u - columns[0].u) : 0;
  for (const node of dropped) {
    const column = columns[node.column];
    const row = rows[node.row];
    const previous = roots.filter((root) => root.column === node.column && root.row < node.row).at(-1);
    const limit = (previous?.v ?? row.v - 1) + minRowGapV;
    const [gridX, gridY] = fieldPoint(geometry, column.u, row.v);
    const [pitchX, pitchY] = fieldPoint(geometry, column.u - (columns[1].u - columns[0].u), row.v);
    const minNeighbor = minNeighborFraction * Math.hypot(gridX - pitchX, gridY - pitchY);
    let best;
    for (let shiftStep = 0; shiftStep * searchStepV <= maxShiftU + 1e-9; shiftStep += 1) {
      const u = Math.round((column.u - shiftStep * searchStepV) * 1e6) / 1e6;
      for (let step = 0; row.v - step * searchStepV >= limit - 1e-9; step += 1) {
        const v = Math.round((row.v - step * searchStepV) * 1e6) / 1e6;
        const [x, y] = fieldPoint(geometry, u, v);
        const rootX = Math.round(x);
        const rootY = Math.round(y);
        if (rootX < 0 || rootX > 320 + frameOverhangPx || rootY < 0 || rootY > 320) continue;
        if (!onSoil(geometry, rootX, rootY) || !nearEdgeClear(geometry, u, v, rootX, rootY)) continue;
        if (roots.some((root) => Math.hypot(root.x - rootX, root.y - rootY) < minNeighbor)) continue;
        const distance = Math.hypot(x - gridX, y - gridY);
        if (!best || distance < best.distance - 1e-9) best = { x: rootX, y: rootY, u, v, distance };
        break;
      }
    }
    if (!best) continue;
    roots.push({ x: best.x, y: best.y, row: node.row, column: node.column, v: best.v,
      ...(best.u !== column.u ? { u: best.u } : {}), pulledBackFrom: { x: node.x, y: node.y } });
  }
  return roots;
}
function validColumnInset(value) {
  const valid = (inset) => Number.isFinite(inset) && inset >= 0;
  return value === undefined || valid(value) || (Array.isArray(value) && value.length === 2 && value.every(valid));
}
function validFieldGeometry(geometry) {
  const point = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
  const outline = (points) => Array.isArray(points) && points.length >= 2 && points.every(point) &&
    points.every((value, index) => !index || value[0] > points[index - 1][0]) &&
    points[0][0] <= 0 && points.at(-1)[0] >= 319;
  return geometry?.source === 'public/art/plot/ground.webp' && Array.isArray(geometry.method) && geometry.method.length > 0 &&
    point(geometry.rowVanishingPoint) && point(geometry.columnVanishingPoint) && point(geometry.origin) &&
    Number.isFinite(geometry.depthPerUnit) && geometry.depthPerUnit !== 0 &&
    point(geometry.field?.u) && point(geometry.field?.v) &&
    geometry.field.u[0] < geometry.field.u[1] && geometry.field.v[0] < geometry.field.v[1] &&
    Number.isFinite(geometry.ridgeOffset) && Number.isFinite(geometry.inset?.u) && Number.isFinite(geometry.inset?.v) &&
    geometry.inset.u >= 0 && geometry.inset.v >= 0 &&
    Number.isFinite(geometry.soilOutline?.marginPx) && geometry.soilOutline.marginPx >= 0 &&
    outline(geometry.soilOutline.top) && outline(geometry.soilOutline.bottom) &&
    Number.isFinite(geometry.nearEdge?.clearanceRowFraction) && geometry.nearEdge.clearanceRowFraction > 0 &&
    Number.isFinite(geometry.nearEdge.minClearancePx) && geometry.nearEdge.minClearancePx >= geometry.soilOutline.marginPx &&
    Number.isFinite(geometry.nearEdge.minRowGapV) && geometry.nearEdge.minRowGapV > 0 && geometry.nearEdge.minRowGapV < 1 &&
    Number.isFinite(geometry.nearEdge.searchStepV) && geometry.nearEdge.searchStepV > 0 &&
    typeof geometry.nearEdge.reason === 'string' && geometry.nearEdge.reason.trim().length > 0 &&
    Number.isFinite(geometry.sideEdge?.maxShiftColumnFraction) && geometry.sideEdge.maxShiftColumnFraction >= 0 &&
    geometry.sideEdge.maxShiftColumnFraction <= 0.5 &&
    Number.isFinite(geometry.sideEdge.frameOverhangPx) && geometry.sideEdge.frameOverhangPx >= 0 &&
    Number.isFinite(geometry.sideEdge.minNeighborFraction) && geometry.sideEdge.minNeighborFraction > 0 &&
    typeof geometry.sideEdge.reason === 'string' && geometry.sideEdge.reason.trim().length > 0;
}
async function cropPlantFile(id, stage, phase, sourcePath) {
  if (stage?.phase !== phase || stage.path !== `art/plot/plants/${id}/${phase}.webp` ||
      stage.source?.path !== sourcePath ||
      !Number.isInteger(stage.width) || stage.width <= 0 || !Number.isInteger(stage.height) || stage.height <= 0 ||
      !Number.isFinite(stage.anchorX) || stage.anchorX < 0 || stage.anchorX > stage.width ||
      !Number.isFinite(stage.anchorY) || stage.anchorY < 0 || stage.anchorY > stage.height ||
      !Number.isFinite(stage.baseScale) || stage.baseScale <= 0) {
    throw new Error(`作物阶段必须使用同ID透明单株、固定根点与正数尺度：${id}/${phase}`);
  }
  const sourceMetadata = await sharp(await readFile(locate(sourcePath))).metadata();
  const bounds = stage.source.bounds;
  if (!sourceMetadata.hasAlpha || !bounds || !Number.isInteger(bounds.left) || !Number.isInteger(bounds.top) ||
      !Number.isInteger(bounds.width) || !Number.isInteger(bounds.height) ||
      bounds.left < 0 || bounds.top < 0 || bounds.width !== stage.width || bounds.height !== stage.height ||
      bounds.left + bounds.width > sourceMetadata.width || bounds.top + bounds.height > sourceMetadata.height) {
    throw new Error(`作物单株原图与透明裁切来源登记缺失或越界：${id}/${phase}`);
  }
  await imageFile(`assets/plot/plants/${id}/${phase}.png`, stage.width, stage.height, true);
  const published = await imageFile('public/' + stage.path, stage.width, stage.height, true);
  const pixels = await sharp(published).ensureAlpha().raw().toBuffer();
  if (opaqueBounds(pixels, stage.width, stage.height).right < 0) throw new Error(`作物单株发布阶段为空：${id}/${phase}`);
  return digest(pixels);
}
function noBakedGroundShadow(pixels, width, height, groundY, label, mouthBounds) {
  // Leave two rows for the pixel outline and ignore very faint source alpha noise.
  // This only flags a visible area below the foot line, not the artistic quality of a sprite.
  let belowCount = 0; let widestRow = 0;
  for (let y = Math.floor(groundY) + 3; y < height; y += 1) {
    let rowCount = 0;
    for (let x = 0; x < width; x += 1) {
      // Only the registered local low mouth is exempt; keep scanning all other columns and ground.
      if (mouthBounds && x >= mouthBounds.x && x < mouthBounds.x + mouthBounds.width &&
          y >= mouthBounds.y && y < mouthBounds.y + mouthBounds.height) continue;
      if (pixels[(y * width + x) * 4 + 3] >= 32) rowCount += 1;
    }
    belowCount += rowCount;
    widestRow = Math.max(widestRow, rowCount);
  }
  if (widestRow >= 8 && belowCount >= 16) {
    throw new Error(`畜牧脚线下疑似烘焙地面投影：${label}，请查看原画，不要将程序椭圆画进动物图片。`);
  }
}

const rawKinds = new Set(['C', 'L', 'F', 'M']);
const ids = Object.entries(catalog.items).filter(([, item]) => rawKinds.has(item.kind)).map(([id]) => id);
const results = await Promise.all(ids.map(async (id) => {
  try {
    const file = await stat(new URL(`../public/art/scene-${id}.webp`, import.meta.url));
    return file.isFile() && file.size > 0 ? null : id;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return id;
  }
}));
const missing = results.filter(Boolean);
if (missing.length) throw new Error(`缺少设施场景图：${missing.map((id) => `scene-${id}.webp`).join('、')}`);
await Promise.all(ids.map(async (id) => {
  await imageFile(`public/art/scene-${id}.webp`, 320, 320);
  await imageFile(`public/wiki/icons/${id}.webp`, 96, 96, true);
}));
console.log(`已检查 ${ids.length} 个独立设施场景图。`);

const crops = ids.filter((id) => catalog.items[id].kind === 'C');
const cropLayout = JSON.parse(await readFile(locate('assets/plot/crop-layout.json'), 'utf8'));
const furrows = JSON.parse(await readFile(locate('assets/plot/furrows.json'), 'utf8'));
const cropPhases = ['sown', 'seedling', 'growing', 'mature'];
sameIDs(crops, Object.keys(cropLayout.crops), '作物体型分类');
sameIDs(crops, Object.keys(cropVisuals), '作物运行视觉登记');
sameIDs(crops, Object.keys(cropHarvest), '作物采收分类与原画审阅登记');
if (crops.some((id) => !Object.hasOwn(cropLayout.sizes, cropLayout.crops[id]))) {
  throw new Error('作物体型分类必须为已登记的大、中、小类型。');
}
for (const id of crops) {
  const definition = cropVisuals[id];
  const policy = cropHarvest[id];
  if (definition.size !== cropLayout.crops[id]) throw new Error(`作物运行体型与原画布局不一致：${id}`);
  if (!['wholePlant', 'retainedPlant'].includes(policy.mode) || definition.harvestMode !== policy.mode ||
      typeof policy.harvestedPart !== 'string' || !policy.harvestedPart.trim() ||
      policy.review?.growingSource !== (id === 'C01' ? 'assets/plot/wheat/wheat-2.png' : `assets/plot/crops/${id}/growing.png`) ||
      policy.review?.matureSource !== (id === 'C01' ? 'assets/plot/wheat/wheat-3.png' : `assets/plot/crops/${id}/mature.png`)) {
    throw new Error(`作物必须有同源的整株/保留植株采收分类与真实阶段审阅来源：${id}`);
  }
  if (policy.mode === 'wholePlant' && (policy.repeatBare?.status !== 'notApplicable' || definition.repeatBare)) {
    throw new Error(`整株采收作物不得误用保留植株裸株资源：${id}`);
  }
  if (id === 'C01') {
    if (definition.mode !== 'fieldAtlas' || definition.size !== 'small' || policy.mode !== 'wholePlant') {
      throw new Error('C01 必须保留已认可的小麦整幅前景与整株采收例外。');
    }
    await imageFile('assets/plot/crop-frames/C01.png', 640, 640, true);
    await imageFile('assets/plot/crop-frames/C01-front.png', 640, 640, true);
    const background = await imageFile('public/art/plot/crops/C01.webp', 640, 640, true);
    const foreground = await imageFile('public/art/plot/crops/C01-front.webp', 640, 640, true);
    for (const [label, atlas] of [['后排', background], ['前排', foreground]]) {
      const frames = [];
      for (let phase = 0; phase < cropPhases.length; phase += 1) {
        await imageFile(`assets/plot/wheat/wheat-${phase}.png`, 320, 320, true);
        const pixels = await sharp(atlas)
          .extract({ left: phase % 2 * 320, top: Math.floor(phase / 2) * 320, width: 320, height: 320 })
          .ensureAlpha().raw().toBuffer();
        if (opaqueBounds(pixels, 320, 320).right < 0) throw new Error(`小麦${label}阶段为空：${cropPhases[phase]}`);
        frames.push(digest(pixels));
      }
      if (new Set(frames).size !== 4) throw new Error(`小麦${label}必须保留四个独立阶段。`);
    }
    continue;
  }
  const originalRoots = definition.size === 'small';
  const geometry = cropLayout.fieldGeometry;
  const columnSpacingU = cropLayout.sizes[definition.size]?.columnSpacingU;
  const columnInsetU = cropLayout.sizes[definition.size]?.columnInsetU;
  const expectedGrid = originalRoots ? undefined :
    validFieldGeometry(geometry) && Number.isFinite(columnSpacingU) && columnSpacingU > 0 &&
      validColumnInset(columnInsetU)
      ? fieldGrid(geometry, columnSpacingU, columnInsetU ?? geometry.inset.u) : { rows: [], columns: [] };
  if (definition.mode !== 'individual' || !Array.isArray(definition.roots) || !definition.roots.length ||
      definition.planting?.source !== (originalRoots ? 'assets/plot/furrows.json' : 'assets/plot/crop-layout.json#fieldGeometry') ||
      definition.planting.rows !== (originalRoots ? furrows.length : expectedGrid.rows.length) ||
      !definition.planting.projection || typeof definition.planting.projection !== 'object' ||
      !Array.isArray(definition.stages) || definition.stages.length !== cropPhases.length) {
    throw new Error(`非小麦作物必须登记逐株资源、完整田垄根位和四个阶段：${id}`);
  }
  const projection = definition.planting.projection;
  if (originalRoots ? projection.mode !== 'original-roots' :
      projection.mode !== 'field-homography' || !validFieldGeometry(geometry) ||
      !Number.isFinite(columnSpacingU) || columnSpacingU <= 0 || projection.columnSpacingU !== columnSpacingU ||
      JSON.stringify(projection.columnInsetU) !== JSON.stringify(columnInsetU) ||
      JSON.stringify(projection.rowVanishingPoint) !== JSON.stringify(geometry.rowVanishingPoint) ||
      JSON.stringify(projection.columnVanishingPoint) !== JSON.stringify(geometry.columnVanishingPoint) ||
      JSON.stringify(projection.origin) !== JSON.stringify(geometry.origin) ||
      projection.depthPerUnit !== geometry.depthPerUnit ||
      JSON.stringify(projection.rows) !== JSON.stringify(expectedGrid.rows) ||
      JSON.stringify(projection.columns) !== JSON.stringify(expectedGrid.columns)) {
    throw new Error(`作物列族必须按实测田地侧边与田垄透视登记完整投影参数：${id}`);
  }
  const rowCount = originalRoots ? furrows.length : expectedGrid.rows.length;
  for (const root of definition.roots) {
    const overhang = originalRoots ? 0 : geometry?.sideEdge?.frameOverhangPx ?? 0;
    if (!Number.isFinite(root.x) || root.x < 0 || root.x > 320 + overhang ||
        !Number.isFinite(root.y) || root.y < 0 || root.y > 320 ||
        !Number.isFinite(root.scale) || root.scale <= 0 ||
        !Number.isFinite(root.maxHeight) || root.maxHeight <= 0 ||
        !Number.isInteger(root.row) || root.row < 0 || root.row >= rowCount ||
        !Number.isInteger(root.column) || root.column < 0) {
      throw new Error(`作物逐株根位、投影比例或行列登记无效：${id}`);
    }
    if (originalRoots) {
      const point = furrows[root.row][root.column];
      if (!point || root.x !== point[0] || root.y !== point[1]) throw new Error(`小型作物必须沿用原田垄根位：${id}`);
    } else {
      const column = expectedGrid.columns[root.column];
      const row = expectedGrid.rows[root.row];
      // u differs from the column only for a registered side-edge shift.
      const u = root.u ?? column?.u;
      const maxShiftU = geometry.sideEdge.maxShiftColumnFraction * (expectedGrid.columns[1]?.u - expectedGrid.columns[0]?.u);
      const [x, y] = column && Number.isFinite(root.v) && Number.isFinite(u) ? fieldPoint(geometry, u, root.v) : [NaN, NaN];
      // Same column; v is the ridge crest or a near-edge pull-back toward the far side.
      if (root.x !== Math.round(x) || root.y !== Math.round(y) || root.v > row.v || root.v <= row.v - 1 ||
          (root.u !== undefined && (root.u >= column.u || column.u - root.u > maxShiftU + 1e-9))) {
        throw new Error(`作物根位未落在实测田垄与侧边透视列上：${id}`);
      }
      if (!onSoil(geometry, root.x, root.y)) throw new Error(`作物根脚越出实测田面进入草地或栅栏：${id}`);
      if (!nearEdgeClear(geometry, u, root.v, root.x, root.y)) {
        throw new Error(`作物近端根脚须离土面下沿保持登记的距离：${id}`);
      }
    }
  }
  if (new Set(definition.roots.map(({ row, column }) => row + ':' + column)).size !== definition.roots.length) {
    throw new Error(`作物同一田垄和列族不能重复登记根位：${id}`);
  }
  if (new Set(definition.roots.map(({ row }) => row)).size !== rowCount) {
    throw new Error(`作物逐株布局必须覆盖每一条已登记田垄：${id}`);
  }
  if (originalRoots && definition.roots.length !== furrows.reduce((sum, row) => sum + row.length, 0)) {
    throw new Error(`小型作物不得遗漏原田垄根位：${id}`);
  }
  if (!originalRoots) {
    // Full coverage: every in-frame grid node is planted at its ridge or pulled
    // back along its column; edges are not left empty to avoid frame cropping.
    const key = ({ x, y, row, column, u, v, pulledBackFrom }) => JSON.stringify([row, column, x, y, u ?? null, v, pulledBackFrom ?? null]);
    const expectedRoots = placeFieldRoots(geometry, expectedGrid.rows, expectedGrid.columns).map(key).sort();
    if (JSON.stringify(definition.roots.map(key).sort()) !== JSON.stringify(expectedRoots)) {
      throw new Error(`中、大型作物必须铺满实测可种田面并按近端规则后收：${id}`);
    }
  }
  const frames = [];
  for (const [index, phase] of cropPhases.entries()) {
    frames.push(await cropPlantFile(id, definition.stages[index], phase, `assets/plot/crops/${id}/${phase}.png`));
  }
  if (new Set(frames).size !== 4) throw new Error(`作物必须有四个独立阶段：${id}`);
  if (policy.mode === 'retainedPlant') {
    const bare = policy.repeatBare;
    if (!['reuseGrowing', 'approvedArtwork'].includes(bare?.status) ||
        typeof bare.sourcePath !== 'string' || !bare.sourcePath.trim() ||
        (bare.status === 'reuseGrowing' && (bare.reusePhase !== 'growing' || bare.sourcePath !== policy.review.growingSource)) ||
        bare.sourcePath === `assets/plot/crops/${id}/sown.png` || bare.sourcePath === `assets/plot/crops/${id}/seedling.png`) {
      throw new Error(`保留植株作物必须使用已审阅可复用或已批准的成年裸株来源，不能发布待补画/待审素材：${id}`);
    }
    const bareFrame = await cropPlantFile(id, definition.repeatBare, 'bare', bare.sourcePath);
    const bareVisual = definition.repeatBare;
    const registration = bareVisual.registration;
    const mature = definition.stages[3];
    if (!registration || registration.matureStagePath !== mature.path ||
        !Number.isFinite(registration.scaleToMature) || registration.scaleToMature <= 0 ||
        !Number.isFinite(registration.anchorX) || !Number.isFinite(registration.anchorY) ||
        Math.abs(bareVisual.baseScale - mature.baseScale * registration.scaleToMature) > 1e-9 ||
        Math.abs(bareVisual.anchorX + bareVisual.source.bounds.left - registration.anchorX) > 1e-9 ||
        Math.abs(bareVisual.anchorY + bareVisual.source.bounds.top - registration.anchorY) > 1e-9) {
      throw new Error(`成年裸株必须沿用成熟株的共同尺度与原图固定根点，不能逐图按包围框放大：${id}`);
    }
    if (bare.status === 'reuseGrowing') {
      if (registration.method !== 'reviewed-adult-source-shared-mature-scale' || registration.scaleToMature !== 1) {
        throw new Error(`复用成年原画必须使用已审阅的共享成熟像素尺度：${id}`);
      }
    } else {
      const sourceRegistration = cropLayout.repeatBare?.[id];
      if (registration.method !== 'shared-mature-source-placement' ||
          !sourceRegistration || sourceRegistration.method !== registration.method ||
          registration.sourcePath !== bare.sourcePath || sourceRegistration.sourcePath !== bare.sourcePath ||
          sourceRegistration.scaleToMature !== registration.scaleToMature ||
          sourceRegistration.anchorX !== registration.anchorX || sourceRegistration.anchorY !== registration.anchorY ||
          typeof registration.sourceSheet !== 'string' || !registration.sourceSheet.trim() ||
          typeof registration.editedSheet !== 'string' || !registration.editedSheet.trim() ||
          registration.sourceSheet !== sourceRegistration.sourceSheet || registration.editedSheet !== sourceRegistration.editedSheet ||
          typeof registration.normalizedSheet !== 'string' || !registration.normalizedSheet.trim() ||
          registration.normalizedSheet !== sourceRegistration.normalizedSheet ||
          registration.cellSpace !== 'normalizedSheet' || sourceRegistration.cellSpace !== registration.cellSpace ||
          typeof registration.anchorMethod !== 'string' || !registration.anchorMethod.trim() ||
          sourceRegistration.anchorMethod !== registration.anchorMethod ||
          JSON.stringify(registration.cell) !== JSON.stringify(sourceRegistration.cell) ||
          JSON.stringify(registration.expectedRoot) !== JSON.stringify(sourceRegistration.expectedRoot) ||
          JSON.stringify(registration.normalization) !== JSON.stringify(sourceRegistration.normalization)) {
        throw new Error(`新绘成年裸株必须登记原成熟株位置、编辑原稿与共同根点来源：${id}`);
      }
      const normalization = registration.normalization;
      const cell = registration.cell;
      if (!normalization || ['sourceWidth', 'sourceHeight', 'width', 'height'].some((key) =>
        !Number.isInteger(normalization[key]) || normalization[key] <= 0) ||
          !cell || ['left', 'top', 'width', 'height'].some((key) => !Number.isInteger(cell[key])) ||
          cell.left < 0 || cell.top < 0 || cell.width <= 0 || cell.height <= 0 ||
          cell.left + cell.width > normalization.width || cell.top + cell.height > normalization.height ||
          !Number.isFinite(registration.expectedRoot?.x) || !Number.isFinite(registration.expectedRoot?.y) ||
          registration.expectedRoot.x < 0 || registration.expectedRoot.x > cell.width ||
          registration.expectedRoot.y < 0 || registration.expectedRoot.y > cell.height) {
        throw new Error(`裸株编辑格与成熟根点必须使用明确、有效的归一图坐标：${id}`);
      }
      const sourceSheet = await sharp(await readFile(locate(registration.sourceSheet))).metadata();
      if (!sourceSheet.width || !sourceSheet.height) throw new Error(`成熟株编辑输入无法读取：${id}`);
      const editedSheet = await sharp(await readFile(locate(registration.editedSheet))).metadata();
      if (editedSheet.width !== normalization.sourceWidth || editedSheet.height !== normalization.sourceHeight) {
        throw new Error(`裸株imagegen原稿尺寸与真实归一变换登记不一致：${id}`);
      }
      await imageFile(registration.normalizedSheet, normalization.width, normalization.height, true);
      await imageFile(bare.sourcePath, cell.width, cell.height, true);
    }
    if (bareFrame === frames[3]) throw new Error(`连续采收的成年裸株不能与有收获部位的成熟阶段完全相同：${id}`);
  }
}
for (const key of ['sky', 'ground', 'sprinkler-base', 'sprinkler-ne', 'sprinkler-se', 'sprinkler-sw', 'sprinkler-nw']) {
  const size = key.startsWith('sprinkler') ? 64 : 320;
  await imageFile(`public/art/plot/${key}.webp`, size, size);
}
console.log('已覆盖全部作物的物品图标、回退场景、体型与逐株根位、四期独立透明单株、显式采收分类及保留植株的成年裸株来源；C01 保留整幅例外，素材画风与连续采收体验仍需实际审阅。');

const livestockLayout = JSON.parse(await readFile(new URL('../assets/livestock/layout.json', import.meta.url), 'utf8'));
const livestockManifest = JSON.parse(await readFile(new URL('../assets/livestock/atlas.json', import.meta.url), 'utf8'));
if (livestockLayout.animation !== 'feeding' || livestockManifest.animation !== 'feeding' ||
    typeof livestockManifest.feedingRegistration !== 'string' || !livestockManifest.feedingRegistration.trim()) {
  throw new Error('畜牧运行与裁切登记必须消费明确的进食原画来源。');
}
const feedingRegistration = JSON.parse(await readFile(locate(livestockManifest.feedingRegistration), 'utf8'));
if (typeof livestockManifest.choiceRegistration !== 'string' ||
    livestockManifest.choiceRegistration !== livestockLayout.choiceRegistration ||
    typeof livestockManifest.feedRegistration !== 'string' ||
    livestockManifest.feedRegistration !== livestockLayout.feedRegistration) {
  throw new Error('畜牧抬头选择来源与复合饲料必须有独立且一致的生产登记。');
}
const livestockChoices = JSON.parse(await readFile(locate(livestockManifest.choiceRegistration), 'utf8'));
const compoundFeed = JSON.parse(await readFile(locate(livestockManifest.feedRegistration), 'utf8'));
const compoundTexture = compoundFeed.texture;
if (typeof compoundTexture?.path !== 'string' || !/^\.\/art\/livestock\/feed(?:-v\d+)?\.webp$/.test(compoundTexture.path) ||
    typeof compoundFeed.png !== 'string' || !/^feed(?:-v\d+)?\.png$/.test(compoundFeed.png) ||
    JSON.stringify(compoundTexture.size) !== '[128,64]' ||
    !validRegion(compoundTexture.bounds, 128, 64) ||
    !Array.isArray(compoundTexture.anchor) || compoundTexture.anchor.length !== 2 ||
    !containsPoint(compoundTexture.bounds, ...compoundTexture.anchor) ||
    JSON.stringify(livestockLayout.feedTexture) !== JSON.stringify(compoundTexture)) {
  throw new Error('复合饲料纹理必须有实际内容bounds、地面anchor和128x64透明画布。');
}
const compoundFeedOriginal = await readFile(locate('assets/livestock/' + compoundFeed.source));
await imageFile('assets/livestock/' + compoundFeed.source, ...compoundFeed.sourceSize, true);
await imageFile('assets/livestock/' + compoundFeed.png, 128, 64, true);
const compoundFeedPublished = await imageFile('public/' + compoundTexture.path.slice(2), 128, 64, true);
if (livestockManifest.feedTexture?.source !== compoundFeed.source ||
    livestockManifest.feedTexture.png !== compoundFeed.png ||
    livestockManifest.feedTexture.sourceSha256 !== digest(compoundFeedOriginal) ||
    livestockManifest.feedTexture.sha256 !== digest(compoundFeedPublished)) {
  throw new Error('复合饲料原稿与发布图的来源登记过期。');
}
await imageFile('public/art/livestock/barn.webp', 320, 320);
await imageFile('assets/livestock/barn.png', 320, 320);
await readFile(locate('assets/livestock/' + livestockLayout.sources.barn));
const livestock = ids.filter((id) => catalog.items[id].kind === 'L');
sameIDs(livestock, Object.keys(livestockLayout.species), '畜牧原画登记');
sameIDs(livestock, Object.keys(livestockManifest.species), '畜牧裁切登记');
sameIDs(livestock, Object.keys(livestockVisuals), '畜牧运行登记');
sameIDs(livestock, Object.keys(feedingRegistration.species), '畜牧进食口部与固定脚点来源');
sameIDs(livestock, Object.keys(livestockChoices.species), '畜牧独立抬头选择来源');
sameIDs(Object.keys(livestockLayout.sources.sheets), Object.keys(livestockManifest.sources), '畜牧多源原画');
sameIDs(Object.keys(livestockLayout.sources.sheets), Object.keys(feedingRegistration.sources), '畜牧进食原画来源');
if (feedingRegistration.version !== livestockLayout.version || feedingRegistration.version !== livestockManifest.version) {
  throw new Error('畜牧进食原画登记版本与实际导出不一致。');
}
const livestockSourceSizes = new Map();
for (const [key, file] of Object.entries(livestockLayout.sources.sheets)) {
  const source = livestockManifest.sources[key];
  const bytes = await readFile(locate('assets/livestock/' + file));
  if (source.file !== file || source.sha256 !== digest(bytes) || feedingRegistration.sources[key] !== file) {
    throw new Error(`畜牧原画登记过期：${key}，请重新导出。`);
  }
  const metadata = await sharp(bytes).metadata();
  if (JSON.stringify(source.originalSize) !== JSON.stringify([metadata.width, metadata.height])) {
    throw new Error(`畜牧原画真实尺寸与来源登记不一致：${key}`);
  }
  livestockSourceSizes.set(key, metadata);
  await imageFile('assets/livestock/' + source.normalized,
    livestockLayout.sceneSize * livestockLayout.grid.columns, livestockLayout.sceneSize * livestockLayout.grid.rows, true);
}

const specialFeedKinds = { L13: 'nectar', L29: 'mulberry' };
sameIDs(livestock.filter((id) => Object.hasOwn(specialFeedKinds, id)),
  Object.keys(compoundFeed.species ?? {}), '畜牧专用饲料登记');

let livestockFrameCount = 0;
for (const id of livestock) {
  const definition = livestockLayout.species[id];
  const record = livestockManifest.species[id];
  const feedDefinition = feedingRegistration.species[id];
  const specialFeed = compoundFeed.species?.[id];
  const expectedFeedTexture = specialFeed?.texture ?? compoundTexture;
  const allowedFeedKinds = specialFeed ? [specialFeedKinds[id]] : ['grain', 'hay', 'greens'];
  if (specialFeed) {
    const { texture, source, png, sourceSize, sourceRectangle, promptFile } = specialFeed;
    const region = { x: sourceRectangle?.left, y: sourceRectangle?.top,
      width: sourceRectangle?.width, height: sourceRectangle?.height };
    if (specialFeed.kind !== specialFeedKinds[id] || specialFeed.generatedWith !== 'built-in image_gen' ||
        typeof source !== 'string' || typeof png !== 'string' || typeof promptFile !== 'string' ||
        !Array.isArray(sourceSize) || sourceSize.length !== 2 || !sourceSize.every(Number.isInteger) ||
        !validRegion(region, ...sourceSize) ||
        texture?.path !== './art/livestock/feed-' + id + '.webp' ||
        JSON.stringify(texture.size) !== '[128,64]' || !validRegion(texture.bounds, 128, 64) ||
        ![texture.anchor, texture.mouthAnchor].every((point) =>
          Array.isArray(point) && point.length === 2 && containsPoint(texture.bounds, ...point)) ||
        !Number.isFinite(texture.sceneWidth) || texture.sceneWidth <= 0) {
      throw new Error(`畜牧专用饲料来源、范围或锚点无效：${id}`);
    }
    const original = await imageFile('assets/livestock/' + source, ...sourceSize, true);
    await imageFile('assets/livestock/' + png, ...texture.size, true);
    const published = await imageFile('public/' + texture.path.slice(2), ...texture.size, true);
    await readFile(locate(promptFile));
    const feedAsset = record.feedAsset;
    if (specialFeed.sourceSha256 !== digest(original) || feedAsset?.source !== source ||
        feedAsset.png !== png || feedAsset.sourceSha256 !== specialFeed.sourceSha256 ||
        feedAsset.sha256 !== digest(published) ||
        JSON.stringify(feedAsset.sourceRectangle) !== JSON.stringify(sourceRectangle)) {
      throw new Error(`畜牧专用饲料的原稿与发布图登记不一致：${id}`);
    }
  }
  if (JSON.stringify(livestockVisuals[id].feedTexture) !== JSON.stringify(expectedFeedTexture)) {
    throw new Error(`畜牧运行饲料与生产登记不一致：${id}`);
  }
  const expectedStages = definition.slaughter ? 3 : 1;
  const expectedNames = definition.slaughter ? ['young', 'growing', 'mature'] : ['adult'];
  if (typeof definition.slaughter !== 'boolean' || definition.subject !== catalog.items[id].subject ||
      definition.product !== catalog.items[id].name || record.slaughter !== definition.slaughter ||
      livestockVisuals[id].slaughter !== definition.slaughter || livestockVisuals[id].stages !== expectedStages ||
      definition.stages.length !== expectedStages || record.frames.length !== expectedStages * 4 ||
      JSON.stringify(definition.stages.map(({ name }) => name)) !== JSON.stringify(expectedNames) ||
      JSON.stringify(record.stages) !== JSON.stringify(expectedNames) || record.animation !== 'feeding' ||
      feedDefinition.key !== definition.source || !allowedFeedKinds.includes(feedDefinition.kind) ||
      !Array.isArray(feedDefinition.stages) || feedDefinition.stages.length !== expectedStages) {
    throw new Error(`畜牧阶段或裁切登记不完整：${id}`);
  }
  const groundings = livestockVisuals[id].grounding;
  if (!Array.isArray(groundings) || groundings.length !== expectedStages ||
      groundings.some((grounding, stage) => !validGrounding(grounding) ||
        !validGrounding(definition.stages[stage].grounding) ||
        !sameGrounding(grounding, definition.stages[stage].grounding))) {
    throw new Error(`畜牧阶段 grounding 缺失、无效或与原画登记不一致：${id}`);
  }
  const feeding = livestockVisuals[id].feeding;
  if (!Array.isArray(feeding) || feeding.length !== expectedStages ||
      !Array.isArray(record.feeding) || record.feeding.length !== expectedStages ||
      !Array.isArray(record.feedingSources) || record.feedingSources.length !== expectedStages ||
      feeding.some((entry, stage) => !validGrounding(entry) || !allowedFeedKinds.includes(entry.kind) ||
        !validGrounding(definition.stages[stage].feeding) ||
        !sameGrounding(entry, definition.stages[stage].feeding) || entry.kind !== definition.stages[stage].feeding.kind ||
        !validGrounding(record.feeding[stage]) || !sameGrounding(entry, record.feeding[stage]) ||
        entry.kind !== record.feeding[stage].kind || entry.kind !== feedDefinition.kind)) {
    throw new Error(`畜牧各阶段必须有同源的进食饲料位置、范围与显式种类：${id}`);
  }
  await imageFile(`assets/livestock/atlases/${id}.png`, 1280, expectedStages * 320, true);
  const bytes = await readFile(new URL(`../public/art/livestock/animals/${id}.webp`, import.meta.url));
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== 1280 || metadata.height !== expectedStages * 320 || !metadata.hasAlpha) {
    throw new Error(`畜牧透明动画图集规格不符：${id}`);
  }
  for (let stage = 0; stage < expectedStages; stage += 1) {
    const frameName = expectedNames[stage];
    const registrations = Array.from({ length: 4 }, (_, frame) =>
      record.frames.find((entry) => entry.stage === frameName && entry.frame === frame));
    const stageScale = registrations[0]?.stageScale;
    const supportDefinition = definition.stages[stage];
    const feedStage = feedDefinition.stages[stage];
    const footprint = definition.stages[stage].footprint;
    const supportRange = supportDefinition.supportXRange;
    if (!Array.isArray(supportRange) || supportRange.length !== 2 ||
        supportRange.some((value) => !Number.isFinite(value) || value < 0 || value > 320) ||
        supportRange[0] >= supportRange[1] ||
        JSON.stringify(footprint?.supportXRange) !== JSON.stringify(supportRange) ||
        groundings[stage].x < supportRange[0] || groundings[stage].x > supportRange[1]) {
      throw new Error(`畜牧支撑脚横向范围必须显式登记并与实际脚印来源一致：${id}/${frameName}`);
    }
    if (!Number.isInteger(supportDefinition.supportBandHeight) || supportDefinition.supportBandHeight <= 0 ||
        !['golden-feet', 'opaque-feet'].includes(supportDefinition.supportMaterial) ||
        footprint?.supportMaterial !== supportDefinition.supportMaterial ||
        footprint.referenceFrame !== 0 ||
        footprint.framePath !== `assets/livestock/animals/${id}/${frameName}-0.png` ||
        !footprint.region || !footprint.bounds || !Array.isArray(footprint.contacts) || !footprint.contacts.length ||
        typeof footprint.method !== 'string' || !footprint.method.trim()) {
      throw new Error(`畜牧首帧支撑脚区域登记缺失：${id}/${frameName}`);
    }
    if (!Number.isFinite(stageScale) || stageScale <= 0 || registrations.some((entry) =>
      !entry || entry.stageScale !== stageScale || !livestockManifest.sources[entry.source] ||
      !Array.isArray(entry.fixedGround) || entry.fixedGround.length !== 2 ||
      entry.fixedGround[0] !== 138 || entry.fixedGround[1] !== 270 ||
      entry.fixedGround[0] !== livestockLayout.animalRoot.x ||
      entry.fixedGround[1] !== livestockLayout.animalRoot.y ||
      !Array.isArray(entry.sourceAnchor) || entry.sourceAnchor.length !== 2 ||
      entry.sourceAnchor.some((coordinate) => !Number.isFinite(coordinate) || coordinate < 0) ||
      typeof entry.anchorMethod !== 'string' || entry.anchorMethod.trim().length === 0 ||
      JSON.stringify(entry.sourceAnchor) !== JSON.stringify(supportDefinition.sourceAnchors?.[entry.frame]) ||
      !validGrounding(entry.grounding) || !sameGrounding(entry.grounding, groundings[stage]))) {
      throw new Error(`畜牧阶段共享尺度、固定解剖脚点或对齐方法登记缺失：${id}/${frameName}`);
    }
    const feedingSource = supportDefinition.feedingSource;
    const recordedFeedingSource = record.feedingSources[stage];
    const mouth = feedingSource?.sourceMouth;
    const sourceSize = livestockSourceSizes.get(feedingSource?.source);
    const sourceRectangle = registrations[0].sourceRectangle;
    if (!feedingSource || feedingSource.referenceFrame !== 0 || !sourceSize ||
        feedingSource.source !== registrations[0].source ||
        feedingSource.source !== (supportDefinition.source ?? definition.source) ||
        JSON.stringify(feedStage.anchors) !== JSON.stringify(supportDefinition.sourceAnchors) ||
        JSON.stringify(feedStage.canvas) !== JSON.stringify([
          supportDefinition.sourceCanvas?.left, supportDefinition.sourceCanvas?.top,
          supportDefinition.sourceCanvas?.width, supportDefinition.sourceCanvas?.height,
        ]) || JSON.stringify(feedStage.mouth) !== JSON.stringify(mouth) ||
        !Array.isArray(mouth) || mouth.length !== 2 || mouth.some((value) => !Number.isFinite(value) || value < 0) ||
        mouth[0] >= sourceSize.width || mouth[1] >= sourceSize.height ||
        !sourceRectangle || mouth[0] < sourceRectangle.left || mouth[0] >= sourceRectangle.left + sourceRectangle.width ||
        mouth[1] < sourceRectangle.top || mouth[1] >= sourceRectangle.top + sourceRectangle.height ||
        typeof feedingSource.method !== 'string' || !feedingSource.method.trim() ||
        recordedFeedingSource?.source !== feedingSource.source || recordedFeedingSource.referenceFrame !== 0 ||
        JSON.stringify(recordedFeedingSource.sourceMouth) !== JSON.stringify(mouth) ||
        recordedFeedingSource.method !== feedingSource.method) {
      throw new Error(`畜牧进食点必须追溯到同阶段首帧原稿的真实口部登记：${id}/${frameName}`);
    }
    const mouthBounds = feedingSource.mouthBounds;
    const sourceMouthBounds = feedingSource.sourceMouthBounds;
    const sceneMouth = {
      x: livestockLayout.animalRoot.x + (mouth[0] - registrations[0].sourceAnchor[0]) * stageScale,
      y: livestockLayout.animalRoot.y + (mouth[1] - registrations[0].sourceAnchor[1]) * stageScale,
    };
    if (!validRegion(mouthBounds, 320, 320) || mouthBounds.height >= 320 ||
        !(mouthBounds.x > supportRange[1] || mouthBounds.x + mouthBounds.width <= supportRange[0]) ||
        !validRegion(sourceMouthBounds, sourceSize.width, sourceSize.height) ||
        sourceMouthBounds.width >= sourceRectangle.width || sourceMouthBounds.height >= sourceRectangle.height ||
        !containsPoint(sourceMouthBounds, mouth[0], mouth[1]) || !containsPoint(mouthBounds, sceneMouth.x, sceneMouth.y) ||
        Math.abs(mouthBounds.x - (livestockLayout.animalRoot.x +
          (sourceMouthBounds.x - registrations[0].sourceAnchor[0]) * stageScale)) > 0.01 ||
        Math.abs(mouthBounds.y - (livestockLayout.animalRoot.y +
          (sourceMouthBounds.y - registrations[0].sourceAnchor[1]) * stageScale)) > 0.01 ||
        Math.abs(mouthBounds.width - sourceMouthBounds.width * stageScale) > 0.01 ||
        Math.abs(mouthBounds.height - sourceMouthBounds.height * stageScale) > 0.01 ||
        !sameBounds(recordedFeedingSource.mouthBounds, mouthBounds) ||
        !sameBounds(recordedFeedingSource.sourceMouthBounds, sourceMouthBounds) ||
        typeof feedingSource.mouthBoundsMethod !== 'string' || !feedingSource.mouthBoundsMethod.trim() ||
        recordedFeedingSource.mouthBoundsMethod !== feedingSource.mouthBoundsMethod) {
      throw new Error(`畜牧低嘴豁免必须是来源映射一致、包含登记嘴点且不触支撑脚区的局部区域：${id}/${frameName}`);
    }
    const frames = await Promise.all(Array.from({ length: 4 }, async (_, frame) => {
      const sourcePath = `assets/livestock/animals/${id}/${frameName}-${frame}.png`;
      const sourceBytes = await imageFile(sourcePath, 320, 320, true);
      const sourcePixels = await sharp(sourceBytes).ensureAlpha().raw().toBuffer();
      // The true support-foot plane stays fixed. Low mouths use only their separately registered local exception.
      noBakedGroundShadow(sourcePixels, 320, 320, livestockLayout.animalRoot.y, sourcePath, mouthBounds);
      const pixels = await sharp(bytes).extract({ left: frame * 320, top: stage * 320, width: 320, height: 320 })
        .ensureAlpha().raw().toBuffer();
      noBakedGroundShadow(pixels, 320, 320, livestockLayout.animalRoot.y, `${id}/${frameName}/${frame} 发布帧`, mouthBounds);
      let bottom = -1;
      for (let pixel = 3; pixel < pixels.length; pixel += 4) {
        const x = ((pixel - 3) / 4) % 320;
        if (pixels[pixel] >= 128 && x >= supportRange[0] && x <= supportRange[1]) {
          bottom = Math.floor((pixel - 3) / 4 / 320);
        }
      }
      if (bottom < 268 || bottom > 272) throw new Error(`畜牧帧为空或脚位偏移：${id} ${stage}/${frame}`);
      return digest(pixels);
    }));
    if (new Set(frames).size !== 4) throw new Error(`畜牧阶段缺少独立 idle 原画：${id} ${stage}`);
  }
  livestockFrameCount += expectedStages * 4;
  const canonicalPath = `public/wiki/icons/${id}.webp`;
  const product = await imageFile(canonicalPath, 96, 96, true);
  const productPixels = await sharp(product).ensureAlpha().raw().toBuffer();
  const content = opaqueBounds(productPixels, 96, 96, 64);
  const expectedProductBounds = { x: content.left, y: content.top, width: content.width, height: content.height };
  const productVisual = livestockVisuals[id].product;
  const productAsset = record.productAsset;
  if (content.right < 0 || productVisual?.icon !== id || productAsset?.icon !== id ||
      productAsset.canonicalPath !== canonicalPath || productAsset.sha256 !== digest(product) ||
      productAsset.boundsAlphaThreshold !== 64 || JSON.stringify(productAsset.sourceSize) !== '[96,96]' ||
      !sameBounds(productVisual.bounds, expectedProductBounds) ||
      !sameBounds(productAsset.bounds, expectedProductBounds) ||
      definition.productVisual?.canonicalPath !== canonicalPath ||
      definition.productVisual.sha256 !== productAsset.sha256 ||
      !sameBounds(definition.productVisual.bounds, expectedProductBounds)) {
    throw new Error(`畜牧产物必须复用同ID仓库图且内容bounds/来源登记不能过期：${id}`);
  }
  await imageFile(`assets/livestock/icons/${id}.png`, 96, 96, true);
  const portrait = await imageFile(`public/ui-icons/livestock-${id}.webp`, 96, 96, true);
  const portraitPixels = await sharp(portrait).ensureAlpha().raw().toBuffer();
  const bounds = opaqueBounds(portraitPixels, 96, 96);
  if (Math.max(bounds.width, bounds.height) < 72 || bounds.left < 2 || bounds.top < 2 || bounds.right > 93 || bounds.bottom > 93) {
    throw new Error(`牲畜选择图主体过小或边缘裁断：${id}`);
  }
  if (!record.animalIcon || record.animalIcon.path !== `public/ui-icons/livestock-${id}.webp` ||
      record.itemIcon?.path !== `public/wiki/icons/${id}.webp` || record.facilityScene?.path !== `public/art/scene-${id}.webp`) {
    throw new Error(`牲畜图、产出图或静态场景登记缺失：${id}`);
  }
  const feedingFallback = record.facilityScene;
  const feedingFallbackOriginal = await imageFile(`assets/source/art/scene-${id}.png`, 320, 320);
  const feedingFallbackPublished = await imageFile(`public/art/scene-${id}.webp`, 320, 320);
  if (feedingFallback.source !== `assets/source/art/scene-${id}.png` ||
      feedingFallback.sourceSha256 !== digest(feedingFallbackOriginal) ||
      feedingFallback.sha256 !== digest(feedingFallbackPublished) ||
      JSON.stringify(feedingFallback.feedTexture) !== JSON.stringify(expectedFeedTexture)) {
    throw new Error(`畜牧详情场景必须复用已登记的饲料及原图：${id}`);
  }
  const headUp = livestockChoices.species[id];
  const headUpBytes = await readFile(locate('assets/livestock/' + headUp.source));
  const headUpSize = await sharp(headUpBytes).metadata();
  const headUpRect = headUp.rectangle;
  if (record.animalIcon.pose !== 'head-up' || record.animalIcon.registration !== livestockManifest.choiceRegistration ||
      record.animalIcon.source !== headUp.source || record.animalIcon.sourceSha256 !== digest(headUpBytes) ||
      headUp.sourceSha256 !== digest(headUpBytes) || headUp.generatedWith !== 'built-in image_gen' ||
      record.animalIcon.stage !== headUp.stage || !['adult', 'mature'].includes(headUp.stage) || headUp.frame !== 0 ||
      JSON.stringify(record.animalIcon.sourceCell) !== JSON.stringify(headUp.sourceCell) ||
      JSON.stringify(record.animalIcon.sourceRectangle) !== JSON.stringify(headUpRect) ||
      !validRegion({ x: headUpRect?.left, y: headUpRect?.top, width: headUpRect?.width, height: headUpRect?.height }, headUpSize.width, headUpSize.height) ||
      Object.values(feedingRegistration.sources).includes(headUp.source)) {
    throw new Error(`畜牧抬头选择来源缺失、过期或错误消费低头进食来源：${id}`);
  }
  const choicePrompt = headUp.promptFile ?? livestockChoices.promptFile;
  // The approved L08 R9 artwork keeps its original input archive beside its source.
  const archiveDirectory = id === 'L08' && headUp.source === 'raw/l08-small-tailed-han-v1/choice-r9.png'
    ? 'assets/livestock/raw/l08-small-tailed-han-v1/choice-inputs-r9'
    : `assets/livestock/choice-input-archive/v7/${id}`;
  if (!Array.isArray(headUp.referenceFrames) || headUp.referenceFrames.length !== 2 ||
      JSON.stringify(record.animalIcon.referenceFrames) !== JSON.stringify(headUp.referenceFrames) ||
      record.animalIcon.generatedWith !== 'built-in image_gen' ||
      record.animalIcon.promptFile !== choicePrompt ||
      headUp.referenceFrames.some((reference, index) => {
        const frame = `${expectedNames.at(-1)}-${[0, 3][index]}.png`;
        const originalPath = `assets/livestock/animals/${id}/${frame}`;
        if (reference.path === originalPath) {
          return reference.archiveOf !== undefined || reference.originalInputPath !== undefined;
        }
        return reference.path !== `${archiveDirectory}/${frame}` ||
          reference.archiveOf !== originalPath || reference.originalInputPath !== originalPath ||
          reference.inputHash !== reference.sha256;
      })) {
    throw new Error(`畜牧普通选择图必须由同ID当前成熟动画0/3帧输入新生成，并保留实际提示词：${id}`);
  }
  await readFile(locate(choicePrompt));
  for (const reference of headUp.referenceFrames) {
    if (reference.sha256 !== digest(await readFile(locate(reference.path)))) {
      throw new Error(`畜牧普通选择图的当前动画输入登记过期：${id}`);
    }
  }
}
console.log(`已覆盖 ${livestock.length} 种牲畜、${livestockFrameCount} 张独立 idle 帧、首帧脚印 grounding/显式支撑脚横向范围、进食口部来源与每阶段饲料登记、共享尺度/固定脚点、脚线下疑似投影、透明牲畜选择图、同ID仓库产物来源/内容bounds、回退及原画来源；真实进食动作、画风与动画稳定性仍需实际审阅。`);

const fish = ids.filter((id) => catalog.items[id].kind === 'F');
const fishLayout = JSON.parse(await readFile(locate('assets/fish/layout.json'), 'utf8'));
const fishManifest = JSON.parse(await readFile(locate('assets/fish/atlas.json'), 'utf8'));
const fishStageNames = ['fry', 'growing', 'mature'];
const fishCounts = { small: 3, medium: 2, large: 1 };
const habitatNames = ['river', 'sea'];
sameIDs(fish, Object.keys(fishVisuals), '鱼类运行登记');
sameIDs(fish, Object.keys(fishLayout.species), '鱼类原画登记');
sameIDs(fish, Object.keys(fishManifest.species), '鱼类导出登记');
sameIDs(Object.keys(fishLayout.sources.sheets), Object.keys(fishManifest.sources), '鱼类原画来源');
sameIDs(Object.keys(fishCounts), Object.keys(fishSizeLayouts), '鱼类体型布局');
sameIDs(habitatNames, Object.keys(fishHabitats), '河海运行水域');
sameIDs(habitatNames, Object.keys(fishLayout.sources.ponds), '河海背景来源');
sameIDs(habitatNames, Object.keys(fishManifest.ponds), '河海背景导出');
if (fishRegistration.x !== 160 || fishRegistration.y !== 210 ||
    fishLayout.sceneSize !== 320 || fishManifest.sceneSize !== 320 ||
    fishLayout.fishRoot?.x !== fishRegistration.x || fishLayout.fishRoot?.y !== fishRegistration.y ||
    fishManifest.fishRoot?.x !== fishRegistration.x || fishManifest.fishRoot?.y !== fishRegistration.y) {
  throw new Error('鱼类运行注册点必须与三期图集的固定身体锚点 (160,210) 一致。');
}
if (!Number.isInteger(fishLayout.grid?.columns) || fishLayout.grid.columns <= 0 ||
    !Number.isInteger(fishLayout.grid?.rows) || fishLayout.grid.rows <= 0) {
  throw new Error('鱼类原画必须登记有效的透明网格规格。');
}
const fishPrompts = await readFile(locate('assets/fish/prompts.md'), 'utf8');
if (!fishPrompts.trim()) throw new Error('鱼类原画提示词与修订来源记录为空。');
for (const habitat of habitatNames) {
  const definition = fishLayout.sources.ponds[habitat];
  const record = fishManifest.ponds[habitat];
  const runtime = fishHabitats[habitat];
  const source = await readFile(locate(definition.source));
  await imageFile(definition.png, 320, 320);
  const published = await imageFile(definition.path, 320, 320);
  if (definition.png !== `assets/fish/ponds/${habitat}.png` ||
      definition.path !== `public/art/fish/${habitat}-pond.webp` ||
      record.source !== definition.source || record.sourceSha256 !== digest(source) ||
      record.png !== definition.png || record.path !== definition.path || record.sha256 !== digest(published) ||
      runtime.pond !== definition.path || !validWater(definition.water) ||
      JSON.stringify(record.water) !== JSON.stringify(definition.water) ||
      JSON.stringify(runtime.water) !== JSON.stringify(definition.water)) {
    throw new Error(`河海背景或半透明水域来源登记不完整或已过期：${habitat}`);
  }
}
for (const [key, file] of Object.entries(fishLayout.sources.sheets)) {
  const path = 'assets/fish/' + file;
  const record = fishManifest.sources[key];
  const source = await imageFile(path, record.width, record.height, true);
  if (record.path !== path || record.sha256 !== digest(source)) {
    throw new Error(`鱼类原画来源登记过期：${key}，请重新导出。`);
  }
  await imageFile(record.normalized, 320 * fishLayout.grid.columns, 320 * fishLayout.grid.rows, true);
}
for (const [size, count] of Object.entries(fishCounts)) {
  const layout = fishSizeLayouts[size];
  if (!Number.isFinite(layout.scale) || layout.scale <= 0 || !Array.isArray(layout.placements) ||
      layout.placements.length !== count || layout.placements.some((position, index, positions) =>
        !Number.isFinite(position.x) || !Number.isFinite(position.y) ||
        position.x < 0 || position.x > 320 || position.y < 0 || position.y > 320 ||
        !Number.isFinite(position.depth) || position.depth <= 0 ||
        (index > 0 && (position.y < positions[index - 1].y || position.depth < positions[index - 1].depth)))) {
    throw new Error(`鱼类体型布局须使用对应只数及近大远小的有序站位：${size}`);
  }
}
let fishFrameCount = 0;
for (const id of fish) {
  const definition = fishLayout.species[id];
  const record = fishManifest.species[id];
  if (fishVisuals[id].stages !== 3 || !Object.hasOwn(fishCounts, fishVisuals[id].size) ||
      definition.size !== fishVisuals[id].size || record.size !== definition.size ||
      !Object.hasOwn(fishHabitats, definition.habitat) ||
      fishVisuals[id].habitat !== definition.habitat || record.habitat !== definition.habitat ||
      definition.subject !== (catalog.items[id].subject ?? catalog.items[id].name) ||
      record.subject !== definition.subject || !fishManifest.sources[definition.source] ||
      !Array.isArray(definition.stages) || definition.stages.length !== 3 ||
      !Array.isArray(record.stages) || record.stages.length !== 3 ||
      JSON.stringify(definition.stages.map(({ name }) => name)) !== JSON.stringify(fishStageNames) ||
      JSON.stringify(record.stages.map(({ name }) => name)) !== JSON.stringify(fishStageNames)) {
    throw new Error(`鱼类必须登记三个阶段及一致的大中小体型：${id}`);
  }
  const stageCells = definition.stages.flatMap(({ cells }) => cells ?? []);
  if (stageCells.length !== 12 || new Set(stageCells).size !== 12 || stageCells.some((cell) =>
    !Number.isInteger(cell) || cell < 0 || cell >= fishLayout.grid.columns * fishLayout.grid.rows)) {
    throw new Error(`鱼类三期必须分别登记四个独立原画格：${id}`);
  }
  await imageFile(`assets/fish/atlases/${id}.png`, 1280, 960, true);
  const published = await imageFile(`public/art/fish/animals/${id}.webp`, 1280, 960, true);
  if (record.atlas?.path !== `public/art/fish/animals/${id}.webp` || record.atlas.width !== 1280 ||
      record.atlas.height !== 960 || record.atlas.sha256 !== digest(published)) {
    throw new Error(`鱼类发布图集与本轮来源登记不一致：${id}`);
  }
  for (const [stage, name] of fishStageNames.entries()) {
    const stageDefinition = definition.stages[stage];
    const stageRecord = record.stages[stage];
    const stageSource = fishManifest.sources[definition.source];
    const canvas = stageDefinition.sourceCanvas;
    if (!Number.isFinite(stageDefinition.stageScale) || stageDefinition.stageScale <= 0 ||
        stageRecord.stageScale !== stageDefinition.stageScale ||
        !canvas || !Number.isFinite(canvas.left) || !Number.isFinite(canvas.top) ||
        !Number.isFinite(canvas.width) || canvas.width <= 0 || !Number.isFinite(canvas.height) || canvas.height <= 0 ||
        JSON.stringify(stageRecord.sourceCanvas) !== JSON.stringify(canvas) ||
        !Number.isFinite(stageDefinition.anchor?.x) || !Number.isFinite(stageDefinition.anchor?.y) ||
        stageDefinition.anchor.x !== -canvas.left || stageDefinition.anchor.y !== -canvas.top ||
        JSON.stringify(stageRecord.anchor) !== JSON.stringify(stageDefinition.anchor) ||
        !Array.isArray(stageDefinition.sourceAnchors) || stageDefinition.sourceAnchors.length !== 4 ||
        !Array.isArray(stageDefinition.cellRects) || stageDefinition.cellRects.length !== 4 ||
        !Array.isArray(stageDefinition.cells) || stageDefinition.cells.length !== 4 ||
        !Array.isArray(stageRecord.frames) || stageRecord.frames.length !== 4) {
      throw new Error(`鱼类阶段共享画布、尺度或身体锚点登记不完整：${id}/${name}`);
    }
    const sourceFrames = [];
    const publishedFrames = [];
    for (let frame = 0; frame < 4; frame += 1) {
      const sourcePath = `assets/fish/animals/${id}/${name}-${frame}.png`;
      const registration = stageRecord.frames[frame];
      const cell = stageDefinition.cellRects[frame];
      if (!registration || registration.source !== definition.source ||
          registration.cell !== stageDefinition.cells[frame] || registration.path !== sourcePath ||
          !Array.isArray(registration.sourceAnchor) || registration.sourceAnchor.length !== 2 ||
          !Number.isFinite(registration.sourceAnchor[0]) || !Number.isFinite(registration.sourceAnchor[1]) ||
          registration.sourceAnchor[0] < 0 || registration.sourceAnchor[0] >= stageSource.width ||
          registration.sourceAnchor[1] < 0 || registration.sourceAnchor[1] >= stageSource.height ||
          JSON.stringify(registration.sourceAnchor) !== JSON.stringify(stageDefinition.sourceAnchors[frame]) ||
          !cell || !Number.isInteger(cell.left) || !Number.isInteger(cell.top) ||
          !Number.isInteger(cell.width) || !Number.isInteger(cell.height) ||
          cell.left < 0 || cell.top < 0 || cell.width <= 0 || cell.height <= 0 ||
          cell.left + cell.width > stageSource.width || cell.top + cell.height > stageSource.height ||
          registration.sourceAnchor[0] < cell.left || registration.sourceAnchor[0] >= cell.left + cell.width ||
          registration.sourceAnchor[1] < cell.top || registration.sourceAnchor[1] >= cell.top + cell.height ||
          typeof registration.anchorMethod !== 'string' || !registration.anchorMethod.trim() ||
          registration.anchorMethod !== stageDefinition.anchor.definition ||
          JSON.stringify(registration.fixedAnchor) !== '[160,210]') {
        throw new Error(`鱼类原画格、固定身体注册点或真实来源坐标登记缺失：${id}/${name}/${frame}`);
      }
      const source = await imageFile(sourcePath, 320, 320, true);
      if (registration.sha256 !== digest(source)) throw new Error(`鱼类逐帧 PNG 与本轮来源登记不一致：${sourcePath}`);
      const sourcePixels = await sharp(source).ensureAlpha().raw().toBuffer();
      const sourceBounds = opaqueBounds(sourcePixels, 320, 320);
      if (sourceBounds.right < 0 || sourceBounds.left < 1 || sourceBounds.top < 1 ||
          sourceBounds.right > 318 || sourceBounds.bottom > 318) {
        throw new Error(`鱼类独立帧为空或主体触及画布裁切边缘：${sourcePath}`);
      }
      sourceFrames.push(digest(sourcePixels));
      const pixels = await sharp(published)
        .extract({ left: frame * 320, top: stage * 320, width: 320, height: 320 })
        .ensureAlpha().raw().toBuffer();
      if (opaqueBounds(pixels, 320, 320).right < 0) throw new Error(`鱼类发布阶段为空：${id}/${name}/${frame}`);
      publishedFrames.push(digest(pixels));
    }
    if (new Set(sourceFrames).size !== 4 || new Set(publishedFrames).size !== 4) {
      throw new Error(`鱼类阶段必须有四张独立 idle 原画与发布帧：${id}/${name}`);
    }
    fishFrameCount += 4;
  }
  await imageFile(`assets/fish/icons/${id}.png`, 96, 96, true);
  const portrait = await imageFile(`public/ui-icons/fish-${id}.webp`, 96, 96, true);
  const portraitPixels = await sharp(portrait).ensureAlpha().raw().toBuffer();
  const portraitBounds = opaqueBounds(portraitPixels, 96, 96);
  if (portraitBounds.right < 0 || portraitBounds.left < 1 || portraitBounds.top < 1 ||
      portraitBounds.right > 94 || portraitBounds.bottom > 94) {
    throw new Error(`鱼类活体选择图为空或主体触及裁切边缘：${id}`);
  }
  const fallbackSource = await imageFile(`assets/source/art/scene-${id}.png`, 320, 320);
  const fallback = await imageFile(`public/art/scene-${id}.webp`, 320, 320);
  if (record.animalIcon?.path !== `public/ui-icons/fish-${id}.webp` ||
      record.animalIcon.sourceStage !== 'mature' || record.animalIcon.sourceFrame !== 0 ||
      record.animalIcon.sha256 !== digest(portrait) ||
      record.fallback?.source !== `assets/source/art/scene-${id}.png` ||
      record.fallback.path !== `public/art/scene-${id}.webp` ||
      record.fallback.sourceStage !== 'mature' || record.fallback.sourceFrame !== 0 ||
      record.fallback.layout !== definition.size || record.fallback.sha256 !== digest(fallback) ||
      record.fallback.sourceSha256 !== digest(fallbackSource) ||
      record.fallback.habitat !== definition.habitat ||
      JSON.stringify(record.fallback.layers) !== '["habitat-background","mature-fish","water-tint"]') {
    throw new Error(`鱼类活体选择图或同ID回退的成熟原画来源登记缺失：${id}`);
  }
}
console.log(`已覆盖 ${fish.length} 种鱼类、${fishFrameCount} 张独立 idle 帧、三期完整图集、显式体型及只数、河海分类/背景来源与半透明水域、固定身体注册点/共享尺度画布、透明活鱼选择图、同ID回退及原画来源；画风、水面站位与真实循环仍需实际审阅。`);
// Mining selection scenes do not authorize runtime fallbacks.
const mining = ids.filter((id) => catalog.items[id].kind === 'M');
const miningManifest = JSON.parse(await readFile(locate('assets/mining/registration.json'), 'utf8'));
const miningItems = Object.entries(catalog.items).filter(([,item]) => ['M','IM','PM'].includes(item.kind)).map(([id])=>id);
sameIDs(mining, Object.keys(miningVisuals.items), '矿业设施运行登记');
sameIDs(miningItems, Object.keys(miningManifest.items), '矿业物品原画登记');
if (miningVisuals.sceneSize !== 320 || miningManifest.generatedWith !== 'built-in image_gen' ||
    miningManifest.promptFile !== 'assets/mining/prompts.md') throw new Error('矿业必须保留内置生成原画及提示词来源。');
await readFile(locate(miningManifest.promptFile));
for (const source of Object.values(miningManifest.sources)) {
  if (source.generatedWith !== 'built-in image_gen' || digest(await readFile(locate(source.path))) !== source.sha256) {
    throw new Error('矿业原画来源登记过期：' + source.path);
  }
}
for (const id of miningItems) {
  const record = miningManifest.items[id];
  const source = await imageFile(record.png, 96, 96, true);
  const published = await imageFile('public/wiki/icons/' + id + '.webp', 96, 96, true);
  if (record.name !== catalog.items[id].name || record.path !== 'public/wiki/icons/' + id + '.webp' ||
      digest(source) !== record.pngSha256 || digest(published) !== record.sha256 ||
      !miningManifest.sources[record.source]) throw new Error('矿业物品身份或源图登记不符：' + id);
}
for (const key of ['background','foreground','cart']) {
  const definition = miningVisuals[key], record = miningManifest.scene[key];
  const width = key === 'cart' ? definition.width : 320, height = key === 'cart' ? definition.height : 320;
  const source = await imageFile(record.png, width, height, key !== 'background');
  const published = await imageFile('public/' + definition.path, width, height, key !== 'background');
  if (record.path !== 'public/' + definition.path || digest(source) !== record.pngSha256 ||
      digest(published) !== record.sha256) throw new Error('矿洞分层原画登记过期：' + key);
}
const expectedMiningUI = ['mining-tab','facility-empty-mine','mining-buy','mining-upgrade','mining-yield','mining-research','mining-processing','mining-cycle','mining-refining'];
sameIDs(expectedMiningUI, Object.keys(miningManifest.ui), '矿业界面图标');
for (const name of expectedMiningUI) {
  const record = miningManifest.ui[name];
  const source = await imageFile(record.png, 96, 96, true);
  const published = await imageFile('public/ui-icons/' + name + '.webp', 96, 96, true);
  if (digest(source) !== record.pngSha256 || digest(published) !== record.sha256) throw new Error('矿业界面图标登记过期：' + name);
}
for (const id of mining) {
  const record = miningManifest.scene[id];
  const source = await imageFile(record.png, 320, 320);
  const published = await imageFile('public/art/scene-' + id + '.webp', 320, 320);
  if (miningVisuals.items[id].scene !== 'art/scene-' + id + '.webp' ||
      miningVisuals.items[id].icon !== 'wiki/icons/' + id + '.webp' ||
      digest(source) !== record.pngSha256 || digest(published) !== record.sha256 ||
      record.icon !== 'public/wiki/icons/' + id + '.webp') throw new Error('矿业选择场景未复用同ID物品：' + id);
}
console.log(`已覆盖矿业全目录物品、9界面图标、${mining.length} 张选择场景和矿洞/矿车/洞口分层来源。`);
