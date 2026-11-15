import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { livestockFeedLayout, livestockLayout } from '../src/view/livestock-layout.js';
import { exportLivestockChoices, livestockChoiceRegistrationPath } from '../assets/livestock/export-choices.mjs';
import { exportLivestockFeed, livestockFeedRegistrationPath } from '../assets/livestock/export-feed.mjs';

const selectedOptions = process.argv.filter((argument) => argument.startsWith('--species='));
const selectedId = selectedOptions[0]?.slice('--species='.length);
const selective = selectedOptions.length > 0;
if (selectedOptions.length > 1 || (selective && (!selectedId ||
  ['--feed-only', '--choices-only', '--choices-feed-only'].some((argument) => process.argv.includes(argument))))) {
  throw new Error('Use one --species=<ID> alone with optional --refresh-scenes.');
}
if (process.argv.includes('--feed-only')) {
  await exportLivestockFeed();
  process.exit(0);
}

let choiceExport;
if (!selective) choiceExport = await exportLivestockChoices();
if (process.argv.includes('--choices-only')) {
  console.log('Exported new current-V5-referenced neutral portraits only; feeding frames, feed and fallbacks are untouched.');
  process.exit(0);
}

const sourceRoot = resolve('assets/livestock');
const publicRoot = resolve('public/art/livestock');
const layout = JSON.parse(await readFile(resolve(sourceRoot, 'layout.json'), 'utf8'));
const feedingRegistration = JSON.parse(await readFile(resolve(sourceRoot, 'feeding-registration-v5.json'), 'utf8'));
const feedRegistration = JSON.parse(await readFile(resolve(livestockFeedRegistrationPath), 'utf8'));
const evidenceRoot = resolve(sourceRoot, 'choice-feed-evidence', feedRegistration.presentationRevision);
const choicesFeedOnly = process.argv.includes('--choices-feed-only');
const previousManifest = choicesFeedOnly || selective ? JSON.parse(await readFile(resolve(sourceRoot, 'atlas.json'), 'utf8')) : null;
if (selective) {
  if (!layout.species[selectedId] || !feedingRegistration.species[selectedId] || !previousManifest.species[selectedId]) {
    throw new Error(`Unknown registered livestock species: ${selectedId}`);
  }
  const choices = JSON.parse(await readFile(resolve(livestockChoiceRegistrationPath), 'utf8'));
  choiceExport = { records: Object.fromEntries(Object.entries(previousManifest.species)
    .map(([id, record]) => [id, { ...record.animalIcon, referenceFrames: choices.species[id].referenceFrames }])) };
}
function stageScale(stage, width, height) {
  if (stage.sourceScale !== undefined) {
    if (!Number.isFinite(stage.sourceScale) || stage.sourceScale <= 0) {
      throw new Error('Explicit registered sourceScale must be finite and positive.');
    }
    return stage.sourceScale;
  }
  return Math.min(stage.maxWidth / width, stage.maxHeight / height);
}
layout.version = feedingRegistration.version;
layout.animation = 'feeding';
layout.choiceRegistration = livestockChoiceRegistrationPath;
layout.feedRegistration = livestockFeedRegistrationPath;
layout.feedTexture = feedRegistration.texture;
layout.historicalSources ??= { ...layout.sources.sheets };
for (const [id, registration] of Object.entries(feedingRegistration.species)) {
  if (selective && id !== selectedId) continue;
  const species = layout.species[id];
  if (species.productCell && !species.productCell.source) species.productCell.source = layout.historicalSources[species.source];
  species.source = registration.key;
  for (const [index, points] of registration.stages.entries()) {
    const stage = species.stages[index];
    const [left, top, width, height] = points.canvas;
    stage.sourceAnchors = points.anchors;
    stage.sourceCanvas = { left, top, width, height };
    if (points.cellRects) stage.cellRects = points.cellRects;
    if (points.scale !== undefined) stage.sourceScale = points.scale;
    else delete stage.sourceScale;
    if (points.samplingCanvas) stage.sourceSamplingCanvas = points.samplingCanvas;
    else delete stage.sourceSamplingCanvas;
    if (points.cropRevision) {
      stage.cropRevision = points.cropRevision;
      stage.cropMethod = points.cropMethod;
    }
    stage.anchorMethod = points.anchorMethod ?? 'V5 feeding artwork: manually registered stance-center x and foreground supporting toe/hoof sole y from the anatomical planted feet; every idle frame shares one sourceCanvas and stageScale, without per-frame bbox fitting or whole-animal rotation. Mouth/head movement remains drawn in the source.';
    delete stage.footRegistration;
    const scale = stageScale(stage, width, height);
    const [anchorX, anchorY] = points.anchors[0];
    const mouthX = layout.animalRoot.x + (points.mouth[0] - anchorX) * scale;
    const mouthY = layout.animalRoot.y + (points.mouth[1] - anchorY) * scale;
    const radiusX = Math.max(10, Math.min(25, Math.round(stage.maxWidth * 0.12)));
    stage.feeding = { x: Math.round(mouthX), y: Math.round(mouthY + 3), radiusX,
      radiusY: Math.max(4, Math.round(radiusX * 0.23)), kind: registration.kind };
    stage.feedingSource = { source: registration.key, referenceFrame: 0, sourceMouth: points.mouth,
      method: 'Manual reference-frame mouth/beak ground-contact point in original source coordinates, transformed by the shared anatomical foot registration and stageScale. The independent compound-feed image ground anchor is 3 scene pixels below the contact point; food is absent from animal pixels.' };
    stage.supportXRange = [0, Math.floor(mouthX - radiusX * 1.05)];
    const mouthBounds = {
      x: stage.supportXRange[1] + 1,
      y: Math.floor(Math.min(266, mouthY - 8)),
      width: Math.ceil(mouthX + Math.max(10, radiusX * 0.8)) - stage.supportXRange[1] - 1,
      height: 0,
    };
    mouthBounds.height = Math.max(274, Math.ceil(mouthY + 5)) - mouthBounds.y;
    stage.feedingSource.mouthBounds = mouthBounds;
    stage.feedingSource.sourceMouthBounds = {
      x: Number((anchorX + (mouthBounds.x - layout.animalRoot.x) / scale).toFixed(3)),
      y: Number((anchorY + (mouthBounds.y - layout.animalRoot.y) / scale).toFixed(3)),
      width: Number((mouthBounds.width / scale).toFixed(3)), height: Number((mouthBounds.height / scale).toFixed(3)),
    };
    stage.feedingSource.mouthBoundsMethod = 'A compact common local region of the low mouth/beak near/below the foot plane across the four drawn feeding poses; raised head areas above the foot plane are not exempt. Bounds are kept strictly in front of the explicit foot supportXRange, with a small lower-lip margin, and inverse-mapped to reference source frame 0 for static review.';
  }
}
layout.sources.sheets = { ...feedingRegistration.sources };
const refreshScenes = process.argv.includes('--refresh-scenes');
const size = layout.sceneSize;
const { columns, rows } = layout.grid;
async function loadSource(file, isolation = layout.alphaIsolation) {
  const bytes = await readFile(resolve(sourceRoot, file));
  const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (isolation) {
    // Generated near-transparent RGB/matte is not part of a pixel silhouette.
    // Keep all original interior RGB; do not reduce colors or redraw details.
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      if (pixels.data[offset + 3] < isolation.threshold) pixels.data.fill(0, offset, offset + 4);
      else pixels.data[offset + 3] = 255;
    }
  }
  const isolated = await sharp(pixels.data, { raw: pixels.info }).png().toBuffer();
  return { file, originalBytes: bytes, bytes: isolated, ...pixels };
}
const selectedSources = selective ? new Set(layout.species[selectedId].stages
  .map((stage) => stage.source ?? layout.species[selectedId].source)) : null;
const sources = new Map(await Promise.all(Object.entries(layout.sources.sheets)
  .filter(([key]) => !selective || selectedSources.has(key)).map(async ([key, file]) =>
  [key, await loadSource(file)])));

const transparent = (width, height) => sharp({ create: {
  width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 },
} });
const png = (input) => sharp(input).png({ compressionLevel: 9 }).toBuffer();
async function saveVersions(input, original, published) {
  await mkdir(resolve(original, '..'), { recursive: true });
  await mkdir(resolve(published, '..'), { recursive: true });
  await writeFile(original, await png(input));
  await sharp(input).webp({ quality: 70, alphaQuality: 100 }).toFile(published);
}

async function registeredFrame(frameIndex, stage, species) {
  const sourceKey = stage.source ?? species.source;
  const source = sources.get(sourceKey);
  const sourceAnchor = stage.sourceAnchors[frameIndex];
  const canvas = stage.sourceCanvas;
  // All four source windows have the same origin relative to the anatomical
  // foot anchor and identical dimensions. No per-frame tight fitting occurs.
  const rectangle = { left: sourceAnchor[0] + canvas.left, top: sourceAnchor[1] + canvas.top,
    width: canvas.width, height: canvas.height };
  let buffer;
  let sourceIsolation;
  if (stage.cellRects) {
    const cell = stage.cellRects[frameIndex];
    const left = Math.max(rectangle.left, cell.left), top = Math.max(rectangle.top, cell.top);
    const right = Math.min(rectangle.left + rectangle.width, cell.left + cell.width);
    const bottom = Math.min(rectangle.top + rectangle.height, cell.top + cell.height);
    sourceIsolation = { left, top, width: right - left, height: bottom - top };
    const isolated = await sharp(source.bytes).extract(sourceIsolation).png().toBuffer();
    buffer = await transparent(canvas.width, canvas.height).composite([{ input: isolated,
      left: left - rectangle.left, top: top - rectangle.top }]).png().toBuffer();
  } else buffer = await sharp(source.bytes).extract(rectangle).png().toBuffer();
  return { rectangle, crop: { left: 0, top: 0, width: canvas.width, height: canvas.height },
    rootX: -canvas.left, rootY: -canvas.top, sourceAnchor, source: sourceKey,
    sourceIsolation, buffer };
}

async function resizeRegisteredFrame(frame, stage, scale, width, height) {
  if (!stage.sourceSamplingCanvas) {
    return sharp(frame.buffer).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
  }
  const [baseWidth, baseHeight] = stage.sourceSamplingCanvas;
  if (![baseWidth, baseHeight].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error('Registered sampling canvas requires positive integer dimensions.');
  }
  // A wider source canvas must not change the established nearest-neighbor
  // sample grid. Pad to whole multiples of the original sampling canvas,
  // resize by the same integer ratio, then crop away only transparent padding.
  const columns = Math.ceil(frame.crop.width / baseWidth), rows = Math.ceil(frame.crop.height / baseHeight);
  const paddedWidth = columns * baseWidth, paddedHeight = rows * baseHeight;
  const padded = await sharp(frame.buffer).extend({ top: 0, left: 0,
    right: paddedWidth - frame.crop.width, bottom: paddedHeight - frame.crop.height,
    background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const resized = await sharp(padded)
    .resize(columns * Math.round(baseWidth * scale), rows * Math.round(baseHeight * scale),
      { kernel: 'nearest' }).png().toBuffer();
  return sharp(resized).extract({ left: 0, top: 0, width, height }).png().toBuffer();
}

await mkdir(sourceRoot, { recursive: true });
const sourceGrids = new Map(Array.from(sources.keys(), (key) => [key, []]));
const barn = await sharp(resolve(sourceRoot, layout.sources.barn)).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
const feedOriginal = await readFile(resolve(sourceRoot, feedRegistration.source));
const { texture: feedTexture } = feedRegistration;
const feedCrop = await sharp(feedOriginal).extract(feedRegistration.sourceRectangle)
  .resize(feedTexture.bounds.width, feedTexture.bounds.height, { kernel: 'nearest', fit: 'fill' }).png().toBuffer();
const feed = await transparent(...feedTexture.size).composite([{ input: feedCrop,
  left: feedTexture.bounds.x, top: feedTexture.bounds.y }]).png().toBuffer();
const feedPublishedPath = resolve('public', feedTexture.path.replace(/^\.\//, ''));
if (!selective) await saveVersions(feed, resolve(sourceRoot, feedRegistration.png), feedPublishedPath);
// Static evidence consumes the actual published texture, just as the live loader does.
const publishedFeed = await readFile(feedPublishedPath);
const manifest = selective ? structuredClone(previousManifest) : {
  version: layout.version, generatedWith: 'built-in image_gen using approved pixel-v4 style; sharp alpha isolation, fixed anatomical registration and nearest-neighbor packing',
  animation: 'feeding', feedingRegistration: 'assets/livestock/feeding-registration-v5.json',
  choiceRegistration: layout.choiceRegistration,
  feedRegistration: layout.feedRegistration,
  feedPresentationRevision: feedRegistration.presentationRevision,
  feedTexture: { ...feedTexture, source: feedRegistration.source,
    png: feedRegistration.png,
    sourceSha256: createHash('sha256').update(feedOriginal).digest('hex'),
    sha256: createHash('sha256').update(publishedFeed).digest('hex'),
    sourceRectangle: feedRegistration.sourceRectangle },
  styleReference: layout.styleReference, alphaIsolation: layout.alphaIsolation,
  sources: Object.fromEntries(Array.from(sources, ([key, source]) => [key, {
    file: source.file, sha256: createHash('sha256').update(source.originalBytes).digest('hex'),
    originalSize: [source.info.width, source.info.height], normalized: `normalized/${key}.png`,
  }])), grid: layout.grid,
  sceneSize: size, idleFrames: layout.idleFrames, animalRoot: layout.animalRoot,
  species: {},
};

async function exists(file) {
  try { return (await stat(file)).isFile(); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

const canonicalProducts = new Map();
const productAlphaThreshold = 64;
async function canonicalProduct(id) {
  const canonicalPath = `public/wiki/icons/${id}.webp`;
  const bytes = await readFile(resolve(canonicalPath));
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 96 || info.height !== 96) throw new Error(`Canonical livestock product must be 96px: ${id}`);
  let left = 96, top = 96, right = -1, bottom = -1;
  for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
    if (data[(y * 96 + x) * 4 + 3] < productAlphaThreshold) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error(`Empty canonical livestock product: ${id}`);
  const bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  const record = { icon: id, bounds, canonicalPath, sha256: createHash('sha256').update(bytes).digest('hex'),
    sourceSize: [96, 96], boundsAlphaThreshold: productAlphaThreshold };
  canonicalProducts.set(id, { bytes, record });
  return record;
}

async function deriveGrounding(scene, id, stage) {
  // This is production placement data from ONE reference frame per stage,
  // never an independent per-frame quality scan or a reason to move the sprite.
  const band = stage.supportBandHeight;
  if (!Number.isInteger(band) || band <= 0 || band > layout.animalRoot.y) {
    throw new Error(`Missing/invalid delivery registration: ${id}/${stage.name} requires a positive integer supportBandHeight within the scene foot plane.`);
  }
  if (!['golden-feet', 'opaque-feet'].includes(stage.supportMaterial)) {
    throw new Error(`Missing/invalid delivery registration: ${id}/${stage.name} requires supportMaterial golden-feet or opaque-feet.`);
  }
  const region = { x: 0, y: layout.animalRoot.y - band, width: size, height: band + 4 };
  const { data, info } = await sharp(scene).extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (x < stage.supportXRange[0] || x > stage.supportXRange[1]) data[(y * info.width + x) * 4 + 3] = 0;
  }
  // The sitting hen/goose feather hem reaches the foot band. Register their
  // actual golden toes/webbing rather than treating low belly feathers as feet.
  const goldenFeet = stage.supportMaterial === 'golden-feet';
  if (goldenFeet) for (let offset = 0; offset < data.length; offset += 4) {
    const [red, green, blue] = data.subarray(offset, offset + 3);
    if (!(red >= 100 && green >= 45 && red > green && blue <= green * 0.7)) data[offset + 3] = 0;
  }
  const seen = new Uint8Array(info.width * info.height), queue = new Int32Array(seen.length), feet = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 128) continue;
    let head = 0, tail = 1, left = size, top = region.height, right = -1, bottom = -1;
    queue[0] = start; seen[start] = 1;
    while (head < tail) {
      const pixel = queue[head++], x = pixel % info.width, y = Math.floor(pixel / info.width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * info.width + nx;
        if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height || seen[next] || data[next * 4 + 3] < 128) continue;
        seen[next] = 1; queue[tail++] = next;
      }
    }
    if (tail >= 3) {
      const outline = goldenFeet ? 1 : 0;
      feet.push({ x: (left + right + 1) / 2, y: region.y + bottom + 1 + outline,
        bounds: { x: left - outline, y: region.y + top - outline,
          width: right - left + 1 + outline * 2, height: bottom - top + 1 + outline * 2 } });
    }
  }
  if (!feet.length) throw new Error(`Missing support feet in production reference region: ${id}/${stage.name}`);
  const left = Math.min(...feet.map((foot) => foot.bounds.x));
  const right = Math.max(...feet.map((foot) => foot.bounds.x + foot.bounds.width));
  const top = Math.min(...feet.map((foot) => foot.bounds.y));
  const backY = Math.min(...feet.map((foot) => foot.y)), frontY = Math.max(...feet.map((foot) => foot.y));
  const grounding = { x: (left + right) / 2, y: (backY + frontY) / 2,
    radiusX: (right - left) / 2 + 2,
    radiusY: Math.max(5, Math.round((right - left) * 0.085), Math.ceil((frontY - backY) / 2) + 3) };
  return { grounding, footprint: { referenceFrame: 0,
    framePath: `assets/livestock/animals/${id}/${stage.name}-0.png`, alphaThreshold: 128, region,
    supportMaterial: stage.supportMaterial, supportXRange: stage.supportXRange,
    supportSelection: goldenFeet ? 'Golden toes/webbing RGB r>=100,g>=45,r>g,b<=0.7g, plus one-pixel outline; excludes low feather hem.' : 'Opaque supporting hooves/paws in the registered lower-foot region.',
    bounds: { x: left, y: top, width: right - left, height: frontY - top }, contacts: feet,
    method: 'Reference frame 0 only: connected support feet in the registered lower-foot region; ellipse center spans the stance extrema and rear/front toe-bottom ground contacts. Same geometry for all idle frames; animal registration and transforms are unchanged.' } };
}

async function overviewProduct(id, species) {
  const { bytes, record: { bounds } } = canonicalProducts.get(id);
  const scale = 72 / Math.max(bounds.width, bounds.height);
  const visibleWidth = bounds.width * scale;
  const ground = species.stages.at(-1).grounding;
  const x = species.slaughter ? ground.x : Math.min(ground.x + ground.radiusX + 42, size - 16 - visibleWidth / 2);
  const width = Math.round(96 * scale), height = width;
  return { input: await sharp(bytes).resize(width, height, { kernel: 'nearest' }).png().toBuffer(),
    left: Math.round(x - (bounds.x + bounds.width / 2) * scale), top: Math.round(ground.y - (bounds.y + bounds.height) * scale) };
}

async function feedingScene(id, species, animal, stageIndex = species.stages.length - 1) {
  const positions = livestockLayout(id);
  const layers = [];
  for (const placement of positions.placements) {
    const factor = positions.animalScale * placement.depth;
    const left = placement.x - layout.animalRoot.x * factor, top = placement.y - layout.animalRoot.y * factor;
    const geometry = livestockFeedLayout(species.stages[stageIndex].feeding, feedTexture, positions.animalScale);
    const { shadow } = geometry;
    const shadowImage = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><g transform="translate(${left} ${top}) scale(${factor})"><ellipse cx="${shadow.x}" cy="${shadow.y}" rx="${shadow.radiusX}" ry="${shadow.radiusY}" fill="#2b2118" opacity="${shadow.alpha}"/></g></svg>`);
    layers.push({ input: shadowImage, left: 0, top: 0 });
    layers.push({ input: await sharp(publishedFeed)
      .resize(Math.max(1, Math.round(geometry.width * factor)), Math.max(1, Math.round(geometry.height * factor)), { kernel: 'nearest' })
      .png().toBuffer(), left: Math.round(left + geometry.x * factor), top: Math.round(top + geometry.y * factor) });
    layers.push({ input: await sharp(animal).resize(Math.round(size * factor), Math.round(size * factor), { kernel: 'nearest' }).png().toBuffer(),
      left: Math.round(left), top: Math.round(top) });
  }
  return sharp(barn).composite(layers).png().toBuffer();
}

for (const [id, species] of Object.entries(layout.species)) {
  if (selective && id !== selectedId) continue;
  const productAsset = await canonicalProduct(id);
  species.productVisual = { ...productAsset };
  const atlasLayers = [];
  const records = choicesFeedOnly ? previousManifest.species[id].frames : [];
  for (const [stageIndex, stage] of (choicesFeedOnly ? [] : species.stages).entries()) {
    const frames = await Promise.all(Array.from({ length: layout.idleFrames }, (_, frame) => registeredFrame(frame, stage, species)));
    const alignmentLayers = [];
    // The same source canvas, anatomical origin and scale are used in all four
    // transforms. A blink or tail change cannot recenter the whole animal.
    const scale = stageScale(stage, Math.max(...frames.map((frame) => frame.crop.width)),
      Math.max(...frames.map((frame) => frame.crop.height)));
    for (const [frameIndex, frame] of frames.entries()) {
      const width = Math.max(1, Math.round(frame.crop.width * scale));
      const height = Math.max(1, Math.round(frame.crop.height * scale));
      const left = Math.round(layout.animalRoot.x - frame.rootX * scale);
      const top = Math.round(layout.animalRoot.y - frame.rootY * scale);
      if (left < 0 || top < 0 || left + width > size || top + height > size) {
        throw new Error(`Sprite exceeds scene: ${id} ${stage.name} ${frameIndex}`);
      }
      const sprite = await resizeRegisteredFrame(frame, stage, scale, width, height);
      const scene = await transparent(size, size).composite([{ input: sprite, left, top }]).png().toBuffer();
      if (frameIndex === 0) Object.assign(stage, await deriveGrounding(scene, id, stage));
      const frameFolder = resolve(sourceRoot, 'animals', id);
      await mkdir(frameFolder, { recursive: true });
      await writeFile(resolve(frameFolder, `${stage.name}-${frameIndex}.png`), scene);
      atlasLayers.push({ input: scene, left: frameIndex * size, top: stageIndex * size });
      sourceGrids.get(frame.source).push({ input: scene, left: frameIndex * size, top: stage.row * size });
      records.push({ stage: stage.name, frame: frameIndex, source: frame.source, sourceCell: [frameIndex, stage.row],
        sourceSha256: createHash('sha256').update(sources.get(frame.source).originalBytes).digest('hex'),
        frameAsset: { path: `assets/livestock/animals/${id}/${stage.name}-${frameIndex}.png`,
          sha256: createHash('sha256').update(scene).digest('hex') },
        sourceRectangle: frame.rectangle, sourceIsolation: frame.sourceIsolation, crop: frame.crop, root: [frame.rootX, frame.rootY],
        sourceAnchor: frame.sourceAnchor, stageScale: scale, anchorMethod: stage.anchorMethod,
        ...(stage.cropRevision ? { cropRevision: stage.cropRevision, cropMethod: stage.cropMethod } : {}),
        ...(stage.sourceSamplingCanvas ? { sourceSamplingCanvas: stage.sourceSamplingCanvas } : {}),
        sourceCanvas: stage.sourceCanvas, grounding: stage.grounding, footprint: stage.footprint,
        scenePlacement: [left, top, width, height], fixedGround: [layout.animalRoot.x, layout.animalRoot.y] });
      const guideY = Math.round(layout.animalRoot.y - height * 0.52);
      const ground = stage.grounding;
      const mouth = stage.feedingSource.mouthBounds;
      const guide = Buffer.from(`<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg"><path d="M0 270H320 M138 70V295" stroke="#259b6b" stroke-width="1" opacity="0.8"/><path d="M128 ${guideY}H148 M138 ${guideY - 10}V${guideY + 10}" stroke="#8a42b5" stroke-width="1"/><ellipse cx="${ground.x}" cy="${ground.y}" rx="${ground.radiusX}" ry="${ground.radiusY}" fill="none" stroke="#225c9a" stroke-width="1"/><rect x="${mouth.x}" y="${mouth.y}" width="${mouth.width}" height="${mouth.height}" fill="none" stroke="#b94345" stroke-width="1"/><text x="8" y="18" font-size="12" fill="#2d2430">${id} ${stage.name} frame ${frameIndex}</text><text x="8" y="291" font-size="10" fill="#225c9a">footprint ${ground.x},${ground.y} r ${ground.radiusX},${ground.radiusY}</text><text x="8" y="306" font-size="10" fill="#2d2430">anchor ${frame.sourceAnchor.join(',')} / scale ${scale.toFixed(5)}</text></svg>`);
      const panel = await sharp({ create: { width: size, height: size, channels: 4, background: '#f5ead8' } })
        .composite([{ input: scene, left: 0, top: 0 }, { input: guide, left: 0, top: 0 }]).png().toBuffer();
      alignmentLayers.push({ input: panel, left: frameIndex * size, top: 0 });
    }
    await mkdir(resolve(sourceRoot, 'alignment'), { recursive: true });
    await transparent(size * layout.idleFrames, size).composite(alignmentLayers).png()
      .toFile(resolve(sourceRoot, 'alignment', `${id}-${stage.name}.png`));
  }
  if (!choicesFeedOnly) {
    const atlas = await transparent(size * layout.idleFrames, size * species.stages.length)
      .composite(atlasLayers).png().toBuffer();
    await saveVersions(atlas, resolve(sourceRoot, 'atlases', `${id}.png`), resolve(publicRoot, 'animals', `${id}.webp`));
  }

  // The chooser gets a tightly framed live animal, separate from the sellable product icon.
  const adult = species.stages.at(-1);

  // Inventory is the canonical animation product. Never invent a missing one
  // from the historical productCell or overwrite the existing catalogue icon.
  const itemIcon = resolve('public/wiki/icons', `${id}.webp`);
  const retainedItemIcon = await exists(itemIcon);
  const facilityScene = resolve('public/art', `scene-${id}.webp`);
  const retainedFacilityScene = await exists(facilityScene);
  if (!retainedFacilityScene || refreshScenes) {
    const scene = await feedingScene(id, species, await readFile(resolve(sourceRoot, 'animals', id, `${adult.name}-0.png`)));
    await saveVersions(scene, resolve('assets/source/art', `scene-${id}.png`), facilityScene);
  }
  const facilityOriginal = await readFile(resolve('assets/source/art', `scene-${id}.png`));
  const facilityPublished = await readFile(facilityScene);
  manifest.species[id] = { subject: species.subject, product: species.product, slaughter: species.slaughter,
    animation: 'feeding', feeding: species.stages.map((stage) => stage.feeding),
    feedingSources: species.stages.map((stage) => stage.feedingSource),
    stages: species.stages.map(({ name }) => name), atlasSize: [size * layout.idleFrames, size * species.stages.length],
    frames: records, productAsset,
    atlasAsset: { source: `assets/livestock/atlases/${id}.png`,
      sourceSha256: createHash('sha256').update(await readFile(resolve(sourceRoot, 'atlases', `${id}.png`))).digest('hex'),
      path: `public/art/livestock/animals/${id}.webp`,
      sha256: createHash('sha256').update(await readFile(resolve(publicRoot, 'animals', `${id}.webp`))).digest('hex') },
    ...(species.productCell ? { historicalProductCell: { source: species.productCell.source ?? species.source, ...species.productCell, consumed: false } } : {}),
    animalIcon: choiceExport.records[id],
    grounding: species.stages.map((stage) => stage.grounding),
    footprints: species.stages.map((stage) => stage.footprint),
    itemIcon: { path: `public/wiki/icons/${id}.webp`, retained: retainedItemIcon },
    facilityScene: { path: `public/art/scene-${id}.webp`, source: `assets/source/art/scene-${id}.png`, animation: 'feeding',
      sourceSha256: createHash('sha256').update(facilityOriginal).digest('hex'),
      sha256: createHash('sha256').update(facilityPublished).digest('hex'), feedTexture,
      feedLayers: 'shared compound-feed image and independent light shadow composed under each animal using livestockFeedLayout; never inside animal textures', retained: retainedFacilityScene && !refreshScenes,
      refreshed: retainedFacilityScene && refreshScenes } };
  console.log(JSON.stringify({ id, canonicalProduct: productAsset.canonicalPath, productBounds: productAsset.bounds,
    grounding: species.stages.map(({ name, grounding }) => ({ stage: name, ...grounding })) }));
}

await mkdir(resolve(sourceRoot, 'normalized'), { recursive: true });
for (const [key, grid] of (choicesFeedOnly ? [] : sourceGrids)) {
  const existing = selective ? await readFile(resolve(sourceRoot, 'normalized', `${key}.png`)) : null;
  let normalized = existing ? sharp(existing) : transparent(size * columns, size * rows);
  if (selective) {
    const stageRows = new Set(layout.species[selectedId].stages
      .filter((stage) => (stage.source ?? layout.species[selectedId].source) === key).map((stage) => stage.row));
    const eraseRow = await sharp({ create: { width: size * columns, height: size, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
    normalized = normalized.composite(Array.from(stageRows, (row) => ({ input: eraseRow, left: 0, top: row * size, blend: 'dest-out' })));
    normalized = sharp(await normalized.png().toBuffer());
  }
  await normalized.composite(grid).png({ compressionLevel: 9 })
    .toFile(resolve(sourceRoot, 'normalized', `${key}.png`));
}
if (!choicesFeedOnly && !selective) await saveVersions(barn, resolve(sourceRoot, 'barn.png'), resolve(publicRoot, 'barn.webp'));
layout.productContract = { source: 'canonical inventory icons only', canonicalPath: 'public/wiki/icons/<ID>.webp',
  sourceSize: [96, 96], boundsAlphaThreshold: productAlphaThreshold, historicalProductCellsConsumed: false };
manifest.productContract = layout.productContract;
await writeFile(resolve(sourceRoot, 'layout.json'), JSON.stringify(layout, null, 2) + '\n');
await writeFile(resolve(sourceRoot, 'atlas.json'), JSON.stringify(manifest, null, 2) + '\n');
const visuals = Object.fromEntries(Object.entries(layout.species).map(([id, species]) => [id,
  { stages: species.stages.length, slaughter: species.slaughter,
    feedTexture,
    feeding: species.stages.map((stage) => stage.feeding),
    grounding: species.stages.map((stage) => stage.grounding),
    product: { icon: id, bounds: species.productVisual.bounds } }]));
await writeFile(resolve('src/content/livestock-visuals.json'), JSON.stringify(visuals, null, 2) + '\n');
if (selective) {
  console.log(`Exported registered source-cell repair for ${selectedId}; choices, feed, other species and shared barn retained.`);
  process.exit(0);
}
// A source-art contact sheet for reviewing the requested two-species prototype; it is not a game screenshot.
const reviewPanels = [
  { id: 'L01', stage: 'adult', frame: 0 }, { id: 'L01', stage: 'adult', frame: 1 },
  { id: 'L01', stage: 'adult', frame: 2, product: true }, { id: 'L01', stage: 'adult', frame: 3 },
  { id: 'L06', stage: 'young', frame: 0 }, { id: 'L06', stage: 'growing', frame: 1 },
  { id: 'L06', stage: 'mature', frame: 0 }, { id: 'L06', product: true },
];
const reviewLayers = [];
for (const [index, review] of reviewPanels.entries()) {
  const layers = [];
  if (review.stage) layers.push({ input: await readFile(resolve(sourceRoot, 'animals', review.id, `${review.stage}-${review.frame}.png`)), left: 0, top: 0 });
  if (review.product) layers.push(await overviewProduct(review.id, layout.species[review.id]));
  const panel = await sharp(barn).composite(layers).png().toBuffer();
  reviewLayers.push({ input: panel, left: index % 4 * size, top: Math.floor(index / 4) * size });
}
await transparent(size * 4, size * 2).composite(reviewLayers).png({ compressionLevel: 9 }).toFile(resolve(sourceRoot, 'overview.png'));
const fullOverview = [];
const chooserOverview = [];
const chooserAt32 = [];
const productOverview = [];
for (const [index, [id, species]] of Object.entries(layout.species).entries()) {
  const adult = species.stages.at(-1);
  const scene = await feedingScene(id, species, await readFile(resolve(sourceRoot, 'animals', id, `${adult.name}-0.png`)));
  fullOverview.push({ input: scene, left: index % 5 * size, top: Math.floor(index / 5) * size });
  chooserOverview.push({ input: await readFile(resolve(sourceRoot, 'icons', `${id}.png`)),
    left: index % 5 * 112 + 8, top: Math.floor(index / 5) * 112 + 8 });
  // Read the actual published WebP, then show the chooser's real 32px image slot.
  chooserAt32.push({ input: await sharp(resolve('public/ui-icons', `livestock-${id}.webp`))
    .resize(32, 32, { kernel: 'nearest' }).png().toBuffer(),
  left: index % 5 * 48 + 8, top: Math.floor(index / 5) * 48 + 8 });
  productOverview.push({ input: canonicalProducts.get(id).bytes,
    left: index % 5 * 144 + 24, top: Math.floor(index / 5) * 144 + 24 });
}
const overviewRows = Math.ceil(Object.keys(layout.species).length / 5);
await transparent(size * 5, size * overviewRows).composite(fullOverview).png().toFile(resolve(sourceRoot, 'all-species.png'));
await sharp({ create: { width: 112 * 5, height: 112 * overviewRows, channels: 4,
  background: { r: 255, g: 249, b: 238, alpha: 1 } } }).composite(chooserOverview).png().toFile(resolve(sourceRoot, 'selection-icons.png'));
const smallChooser = await sharp({ create: { width: 48 * 5, height: 48 * overviewRows, channels: 4,
  background: { r: 255, g: 249, b: 238, alpha: 1 } } }).composite(chooserAt32).png().toBuffer();
await writeFile(resolve(sourceRoot, 'selection-icons-32.png'), smallChooser);
await sharp(smallChooser).resize(48 * 5 * 4, 48 * overviewRows * 4, { kernel: 'nearest' }).png()
  .toFile(resolve(sourceRoot, 'selection-icons-32-enlarged.png'));
await sharp({ create: { width: 144 * 5, height: 144 * overviewRows, channels: 4,
  background: { r: 255, g: 249, b: 238, alpha: 1 } } }).composite(productOverview).png().toFile(resolve(sourceRoot, 'product-icons.png'));
// Requested phone-size static handoff: all four mature feeding frames at 130px.
const feedingContact = [];
for (const [row, [id, species]] of Object.entries(layout.species).entries()) {
  const mature = species.stages.at(-1);
  for (let frame = 0; frame < 4; frame++) {
    const scene = await feedingScene(id, species, await readFile(resolve(sourceRoot, 'animals', id, `${mature.name}-${frame}.png`)));
    feedingContact.push({ input: await sharp(scene).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(),
      left: frame * 134 + 2, top: row * 149 + 2 });
  }
}
const matureContactHeight = Object.keys(layout.species).length * 149;
const feedingLabels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="536" height="${matureContactHeight}">`
  + Object.keys(layout.species).map((id, row) => `<text x="268" y="${row * 149 + 145}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#263b2a">${id} feeding frames 0 / 1 / 2 / 3</text>`).join('') + '</svg>');
await mkdir(evidenceRoot, { recursive: true });
await sharp({ create: { width: 536, height: matureContactHeight, channels: 4, background: '#f5ead8' } })
  .composite([...feedingContact, { input: feedingLabels }]).png().toFile(resolve(evidenceRoot, 'feeding-130-four-frames.png'));
// All twenty registered feeding stages, including young and growing animals.
const stageContact = [];
const stageLabels = [];
let contactRow = 0;
for (const [id, species] of Object.entries(layout.species)) {
  const atlas = await readFile(resolve(publicRoot, 'animals', `${id}.webp`));
  for (const [stageIndex, stage] of species.stages.entries()) {
    for (let frame = 0; frame < 4; frame++) {
      const animal = await sharp(atlas).extract({ left: frame * size, top: stageIndex * size,
        width: size, height: size }).png().toBuffer();
      const scene = await feedingScene(id, species, animal, stageIndex);
      stageContact.push({ input: await sharp(scene).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(),
        left: frame * 134 + 2, top: contactRow * 149 + 2 });
    }
    stageLabels.push(`<text x="268" y="${contactRow * 149 + 145}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#263b2a">${id} ${stage.name} feeding 0 / 1 / 2 / 3</text>`);
    contactRow++;
  }
}
const stageLabelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="536" height="${contactRow * 149}">${stageLabels.join('')}</svg>`);
await sharp({ create: { width: 536, height: contactRow * 149, channels: 4, background: '#f5ead8' } })
  .composite([...stageContact, { input: stageLabelSvg }]).png()
  .toFile(resolve(evidenceRoot, 'feeding-130-all-stages.png'));
await sharp({ create: { width: feedTexture.size[0], height: feedTexture.size[1], channels: 4, background: '#f5ead8' } })
  .composite([{ input: publishedFeed }]).png()
  .toFile(resolve(evidenceRoot, 'feed-normal.png'));
await sharp(resolve(evidenceRoot, 'feed-normal.png')).resize(512, 256, { kernel: 'nearest' })
  .png().toFile(resolve(evidenceRoot, 'feed-normal-enlarged.png'));
for (const file of ['selection-icons.png', 'selection-icons-32.png', 'selection-icons-32-enlarged.png']) {
  await writeFile(resolve(evidenceRoot, file), await readFile(resolve(sourceRoot, file)));
}
console.log(`已导出 ${Object.keys(layout.species).length} 种独立抬头选择图、共用复合饲料和回退；${choicesFeedOnly ? '保留既有进食80帧与图集' : '同步导出真实进食帧'}，canonical仓库产物未改。`);
