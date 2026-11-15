import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import livestockVisuals from '../src/content/livestock-visuals.json' with { type: 'json' };

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
sameIDs(crops, Object.keys(cropLayout.crops), '作物体型分类');
if (crops.some((id) => !Object.hasOwn(cropLayout.sizes, cropLayout.crops[id]))) {
  throw new Error('作物体型分类必须为已登记的大、中、小类型。');
}
const invalid = (await Promise.all(crops.map(async (id) => {
  try {
    const atlas = await readFile(new URL(`../public/art/plot/crops/${id}.webp`, import.meta.url));
    const extendedWebP = atlas.length >= 30 && atlas.toString('ascii', 0, 4) === 'RIFF' &&
      atlas.toString('ascii', 8, 16) === 'WEBPVP8X';
    const valid = extendedWebP && (atlas[20] & 0x10) !== 0 &&
      atlas.readUIntLE(24, 3) === 639 && atlas.readUIntLE(27, 3) === 639;
    return valid ? null : id;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return id;
  }
}))).filter(Boolean);
if (invalid.length) throw new Error(`缺少或无法读取 640×640 透明成长图集：${invalid.join('、')}`);
console.log(`已检查 ${crops.length} 张作物图集，共 ${crops.length * 4} 个成长阶段。`);
for (const id of crops) {
  await imageFile(`assets/plot/crop-frames/${id}.png`, 640, 640, true);
  await imageFile(`assets/plot/crop-frames/${id}-front.png`, 640, 640, true);
  const publishedCrop = await readFile(locate(`public/art/plot/crops/${id}.webp`));
  const publishedFront = await imageFile(`public/art/plot/crops/${id}-front.webp`, 640, 640, true);
  const frames = [];
  const frontFrames = [];
  for (const [index, phase] of ['sown', 'seedling', 'growing', 'mature'].entries()) {
    const source = id === 'C01' ? `assets/plot/wheat/wheat-${index}.png` : `assets/plot/crops/${id}/${phase}.png`;
    const metadata = await sharp(await readFile(locate(source))).metadata();
    if (!metadata.hasAlpha || !metadata.width || !metadata.height) throw new Error(`缺少作物透明阶段原图：${source}`);
    const pixels = await sharp(publishedCrop)
      .extract({ left: index % 2 * 320, top: Math.floor(index / 2) * 320, width: 320, height: 320 })
      .ensureAlpha().raw().toBuffer();
    if (opaqueBounds(pixels, 320, 320).right < 0) throw new Error(`作物阶段为空：${id}/${phase}`);
    frames.push(digest(pixels));
    const frontPixels = await sharp(publishedFront)
      .extract({ left: index % 2 * 320, top: Math.floor(index / 2) * 320, width: 320, height: 320 })
      .ensureAlpha().raw().toBuffer();
    if (opaqueBounds(frontPixels, 320, 320).right < 0) throw new Error(`作物前排阶段为空：${id}/${phase}`);
    frontFrames.push(digest(frontPixels));
  }
  if (new Set(frames).size !== 4) throw new Error(`作物必须有四个独立阶段：${id}`);
  if (new Set(frontFrames).size !== 4) throw new Error(`作物前排必须有四个独立阶段：${id}`);
}
for (const key of ['sky', 'ground', 'sprinkler-base', 'sprinkler-ne', 'sprinkler-se', 'sprinkler-sw', 'sprinkler-nw']) {
  const size = key.startsWith('sprinkler') ? 64 : 320;
  await imageFile(`public/art/plot/${key}.webp`, size, size);
}
await readFile(locate('assets/plot/furrows.json'));
console.log('已覆盖全部作物的物品图标、回退场景、显式体型、四期原图/前后排PNG和WebP图集及共用场景层。');

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
