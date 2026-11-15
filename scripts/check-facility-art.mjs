import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import livestockVisuals from '../src/content/livestock-visuals.json' with { type: 'json' };
import cropVisuals from '../src/content/crop-visuals.json' with { type: 'json' };
import fishVisuals from '../src/content/fish-visuals.json' with { type: 'json' };
import fishHabitats from '../src/content/fish-habitats.json' with { type: 'json' };
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
function onProjectedFurrow(root, projection, points) {
  const origin = projection.vanishingPoint;
  const ray = { x: projection.columns[root.column].x - origin.x, y: projection.referenceY - origin.y };
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  return points.slice(1).some((end, index) => {
    const start = points[index];
    const segment = { x: end[0] - start[0], y: end[1] - start[1] };
    const denominator = cross(ray, segment);
    if (Math.abs(denominator) < 1e-8) return false;
    const offset = { x: start[0] - origin.x, y: start[1] - origin.y };
    const alongRay = cross(offset, segment) / denominator;
    const alongSegment = cross(offset, ray) / denominator;
    return alongRay >= 0 && alongSegment >= -1e-8 && alongSegment <= 1 + 1e-8 &&
      Math.abs(root.x - (origin.x + alongRay * ray.x)) <= 1 &&
      Math.abs(root.y - (origin.y + alongRay * ray.y)) <= 1;
  });
}
function noBakedGroundShadow(pixels, width, height, groundY, label) {
  // Leave two rows for the pixel outline and ignore very faint source alpha noise.
  // This only flags a visible area below the foot line, not the artistic quality of a sprite.
  let belowCount = 0; let widestRow = 0;
  for (let y = Math.floor(groundY) + 3; y < height; y += 1) {
    let rowCount = 0;
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] >= 32) rowCount += 1;
    }
    belowCount += rowCount;
    widestRow = Math.max(widestRow, rowCount);
  }
  if (widestRow >= 8 && belowCount >= 16) {
    throw new Error(`畜牧脚线下疑似烘焙地面投影：${label}，请查看原画，不要将程序椭圆画进动物图片。`);
  }
}

const rawKinds = new Set(['C', 'L', 'F']);
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
if (crops.some((id) => !Object.hasOwn(cropLayout.sizes, cropLayout.crops[id]))) {
  throw new Error('作物体型分类必须为已登记的大、中、小类型。');
}
for (const id of crops) {
  const definition = cropVisuals[id];
  if (definition.size !== cropLayout.crops[id]) throw new Error(`作物运行体型与原画布局不一致：${id}`);
  if (id === 'C01') {
    if (definition.mode !== 'fieldAtlas' || definition.size !== 'small') throw new Error('C01 必须保留已认可的小麦整幅前景例外。');
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
  if (definition.mode !== 'individual' || !Array.isArray(definition.roots) || !definition.roots.length ||
      definition.planting?.source !== 'assets/plot/furrows.json' || definition.planting.rows !== furrows.length ||
      !definition.planting.projection || typeof definition.planting.projection !== 'object' ||
      !Array.isArray(definition.stages) || definition.stages.length !== cropPhases.length) {
    throw new Error(`非小麦作物必须登记逐株资源、完整田垄根位和四个阶段：${id}`);
  }
  const projection = definition.planting.projection;
  const originalRoots = definition.size === 'small';
  const boundaryColumns = [
    { from: furrows[0][0], to: furrows.at(-1)[0] },
    { from: furrows[0].at(-1), to: furrows.at(-1).at(-1) },
  ];
  if (originalRoots ? projection.mode !== 'original-roots' :
      !Number.isFinite(projection.vanishingPoint?.x) || !Number.isFinite(projection.vanishingPoint?.y) ||
      !Number.isFinite(projection.referenceY) || projection.referenceY === projection.vanishingPoint.y ||
      !Array.isArray(projection.columns) || !projection.columns.length ||
      projection.columns.some((column, index) => column.index !== index || !Number.isFinite(column.x)) ||
      JSON.stringify(projection.sourceBoundaryColumns) !== JSON.stringify(boundaryColumns)) {
    throw new Error(`作物列族必须登记真实田界、消失点及完整投影参数：${id}`);
  }
  for (const root of definition.roots) {
    if (!Number.isFinite(root.x) || root.x < 0 || root.x > 320 ||
        !Number.isFinite(root.y) || root.y < 0 || root.y > 320 ||
        !Number.isFinite(root.scale) || root.scale <= 0 ||
        !Number.isFinite(root.maxHeight) || root.maxHeight <= 0 ||
        !Number.isInteger(root.row) || root.row < 0 || root.row >= furrows.length ||
        !Number.isInteger(root.column) || root.column < 0) {
      throw new Error(`作物逐株根位、投影比例或行列登记无效：${id}`);
    }
    if (originalRoots) {
      const point = furrows[root.row][root.column];
      if (!point || root.x !== point[0] || root.y !== point[1]) throw new Error(`小型作物必须沿用原田垄根位：${id}`);
    } else if (root.column >= projection.columns.length || !onProjectedFurrow(root, projection, furrows[root.row])) {
      throw new Error(`作物根位未落在对应列射线与真实田垄的交点：${id}`);
    }
  }
  if (new Set(definition.roots.map(({ row, column }) => row + ':' + column)).size !== definition.roots.length) {
    throw new Error(`作物同一田垄和列族不能重复登记根位：${id}`);
  }
  if (new Set(definition.roots.map(({ row }) => row)).size !== furrows.length) {
    throw new Error(`作物逐株布局必须覆盖每一条已登记田垄：${id}`);
  }
  if (originalRoots && definition.roots.length !== furrows.reduce((sum, row) => sum + row.length, 0)) {
    throw new Error(`小型作物不得遗漏原田垄根位：${id}`);
  }
  const frames = [];
  for (const [index, phase] of cropPhases.entries()) {
    const stage = definition.stages[index];
    const expectedSource = `assets/plot/crops/${id}/${phase}.png`;
    if (stage.phase !== phase || stage.path !== `art/plot/plants/${id}/${phase}.webp` ||
        stage.source?.path !== expectedSource ||
        !Number.isInteger(stage.width) || stage.width <= 0 || !Number.isInteger(stage.height) || stage.height <= 0 ||
        !Number.isFinite(stage.anchorX) || stage.anchorX < 0 || stage.anchorX > stage.width ||
        !Number.isFinite(stage.anchorY) || stage.anchorY < 0 || stage.anchorY > stage.height ||
        !Number.isFinite(stage.baseScale) || stage.baseScale <= 0) {
      throw new Error(`作物阶段必须使用同ID透明单株、固定根点与正数尺度：${id}/${phase}`);
    }
    const sourceMetadata = await sharp(await readFile(locate(expectedSource))).metadata();
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
    frames.push(digest(pixels));
  }
  if (new Set(frames).size !== 4) throw new Error(`作物必须有四个独立阶段：${id}`);
}
for (const key of ['sky', 'ground', 'sprinkler-base', 'sprinkler-ne', 'sprinkler-se', 'sprinkler-sw', 'sprinkler-nw']) {
  const size = key.startsWith('sprinkler') ? 64 : 320;
  await imageFile(`public/art/plot/${key}.webp`, size, size);
}
console.log('已覆盖全部作物的物品图标、回退场景、体型与逐株根位、四期原图及独立透明单株；C01 保留已认可的整幅前后排例外。');

const livestockLayout = JSON.parse(await readFile(new URL('../assets/livestock/layout.json', import.meta.url), 'utf8'));
const livestockManifest = JSON.parse(await readFile(new URL('../assets/livestock/atlas.json', import.meta.url), 'utf8'));
await imageFile('public/art/livestock/barn.webp', 320, 320);
await imageFile('assets/livestock/barn.png', 320, 320);
await readFile(locate('assets/livestock/' + livestockLayout.sources.barn));
const livestock = ids.filter((id) => catalog.items[id].kind === 'L');
sameIDs(livestock, Object.keys(livestockLayout.species), '畜牧原画登记');
sameIDs(livestock, Object.keys(livestockManifest.species), '畜牧裁切登记');
sameIDs(livestock, Object.keys(livestockVisuals), '畜牧运行登记');
sameIDs(Object.keys(livestockLayout.sources.sheets), Object.keys(livestockManifest.sources), '畜牧多源原画');
for (const [key, file] of Object.entries(livestockLayout.sources.sheets)) {
  const source = livestockManifest.sources[key];
  const bytes = await readFile(locate('assets/livestock/' + file));
  if (source.file !== file || source.sha256 !== digest(bytes)) throw new Error(`畜牧原画登记过期：${key}，请重新导出。`);
  await imageFile('assets/livestock/' + source.normalized,
    livestockLayout.sceneSize * livestockLayout.grid.columns, livestockLayout.sceneSize * livestockLayout.grid.rows, true);
}

let livestockFrameCount = 0;
for (const id of livestock) {
  const definition = livestockLayout.species[id];
  const record = livestockManifest.species[id];
  const expectedStages = definition.slaughter ? 3 : 1;
  const expectedNames = definition.slaughter ? ['young', 'growing', 'mature'] : ['adult'];
  if (typeof definition.slaughter !== 'boolean' || definition.subject !== catalog.items[id].subject ||
      definition.product !== catalog.items[id].name || record.slaughter !== definition.slaughter ||
      livestockVisuals[id].slaughter !== definition.slaughter || livestockVisuals[id].stages !== expectedStages ||
      definition.stages.length !== expectedStages || record.frames.length !== expectedStages * 4 ||
      JSON.stringify(definition.stages.map(({ name }) => name)) !== JSON.stringify(expectedNames) ||
      JSON.stringify(record.stages) !== JSON.stringify(expectedNames)) {
    throw new Error(`畜牧阶段或裁切登记不完整：${id}`);
  }
  const groundings = livestockVisuals[id].grounding;
  if (!Array.isArray(groundings) || groundings.length !== expectedStages ||
      groundings.some((grounding, stage) => !validGrounding(grounding) ||
        !validGrounding(definition.stages[stage].grounding) ||
        !sameGrounding(grounding, definition.stages[stage].grounding))) {
    throw new Error(`畜牧阶段 grounding 缺失、无效或与原画登记不一致：${id}`);
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
    const footprint = definition.stages[stage].footprint;
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
      !validGrounding(entry.grounding) || !sameGrounding(entry.grounding, groundings[stage]))) {
      throw new Error(`畜牧阶段共享尺度、固定解剖脚点或对齐方法登记缺失：${id}/${frameName}`);
    }
    const frames = await Promise.all(Array.from({ length: 4 }, async (_, frame) => {
      const sourcePath = `assets/livestock/animals/${id}/${frameName}-${frame}.png`;
      const sourceBytes = await imageFile(sourcePath, 320, 320, true);
      const sourcePixels = await sharp(sourceBytes).ensureAlpha().raw().toBuffer();
      // The silhouette foot line remains the fixed animal registration plane;
      // an ellipse center can sit between the front and rear support feet.
      noBakedGroundShadow(sourcePixels, 320, 320, livestockLayout.animalRoot.y, sourcePath);
      const pixels = await sharp(bytes).extract({ left: frame * 320, top: stage * 320, width: 320, height: 320 })
        .ensureAlpha().raw().toBuffer();
      noBakedGroundShadow(pixels, 320, 320, livestockLayout.animalRoot.y, `${id}/${frameName}/${frame} 发布帧`);
      let bottom = -1;
      for (let pixel = 3; pixel < pixels.length; pixel += 4) {
        if (pixels[pixel] >= 128) bottom = Math.floor((pixel - 3) / 4 / 320);
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
}
console.log(`已覆盖 ${livestock.length} 种牲畜、${livestockFrameCount} 张独立 idle 帧、首帧脚印 grounding、共享尺度/固定脚点登记、脚线下疑似投影、透明牲畜选择图、同ID仓库产物来源/内容bounds、回退及原画来源；画风与动画稳定性仍需实际审阅。`);

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
