import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const sourceRoot = resolve('assets/livestock');
const publicRoot = resolve('public/art/livestock');
const layout = JSON.parse(await readFile(resolve(sourceRoot, 'layout.json'), 'utf8'));
const refreshScenes = process.argv.includes('--refresh-scenes');
const size = layout.sceneSize;
const { columns, rows } = layout.grid;
const sources = new Map(await Promise.all(Object.entries(layout.sources.sheets).map(async ([key, file]) => {
  const bytes = await readFile(resolve(sourceRoot, file));
  const pixels = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (layout.alphaIsolation) {
    // Generated near-transparent RGB/matte is not part of a pixel silhouette.
    // Keep all original interior RGB; do not reduce colors or redraw details.
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      if (pixels.data[offset + 3] < layout.alphaIsolation.threshold) pixels.data.fill(0, offset, offset + 4);
      else pixels.data[offset + 3] = 255;
    }
  }
  const isolated = await sharp(pixels.data, { raw: pixels.info }).png().toBuffer();
  return [key, { file, originalBytes: bytes, bytes: isolated, ...pixels }];
})));

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
  return { rectangle, crop: { left: 0, top: 0, width: canvas.width, height: canvas.height },
    rootX: -canvas.left, rootY: -canvas.top, sourceAnchor, source: sourceKey,
    buffer: await sharp(source.bytes).extract(rectangle).png().toBuffer() };
}

await mkdir(sourceRoot, { recursive: true });
const sourceGrids = new Map(Array.from(sources.keys(), (key) => [key, []]));
const barn = await sharp(resolve(sourceRoot, layout.sources.barn)).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
const manifest = {
  version: layout.version, generatedWith: 'built-in image_gen using approved pixel-v4 style; sharp alpha isolation, fixed anatomical registration and nearest-neighbor packing',
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

async function standaloneIcon(input, targetSize = 96) {
  const scaled = await sharp(input).resize(targetSize - 8, targetSize - 8, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
  const info = await sharp(scaled).metadata();
  return transparent(targetSize, targetSize).composite([{ input: scaled,
    left: Math.floor((targetSize - info.width) / 2), top: Math.floor((targetSize - info.height) / 2),
  }]).png().toBuffer();
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
    supportMaterial: stage.supportMaterial,
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

for (const [id, species] of Object.entries(layout.species)) {
  const productAsset = await canonicalProduct(id);
  species.productVisual = { ...productAsset };
  const atlasLayers = [];
  const records = [];
  for (const [stageIndex, stage] of species.stages.entries()) {
    const frames = await Promise.all(Array.from({ length: layout.idleFrames }, (_, frame) => registeredFrame(frame, stage, species)));
    const alignmentLayers = [];
    // The same source canvas, anatomical origin and scale are used in all four
    // transforms. A blink or tail change cannot recenter the whole animal.
    const scale = Math.min(stage.maxWidth / Math.max(...frames.map((frame) => frame.crop.width)),
      stage.maxHeight / Math.max(...frames.map((frame) => frame.crop.height)));
    for (const [frameIndex, frame] of frames.entries()) {
      const width = Math.max(1, Math.round(frame.crop.width * scale));
      const height = Math.max(1, Math.round(frame.crop.height * scale));
      const left = Math.round(layout.animalRoot.x - frame.rootX * scale);
      const top = Math.round(layout.animalRoot.y - frame.rootY * scale);
      if (left < 0 || top < 0 || left + width > size || top + height > size) {
        throw new Error(`Sprite exceeds scene: ${id} ${stage.name} ${frameIndex}`);
      }
      const sprite = await sharp(frame.buffer).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
      const scene = await transparent(size, size).composite([{ input: sprite, left, top }]).png().toBuffer();
      if (frameIndex === 0) Object.assign(stage, await deriveGrounding(scene, id, stage));
      const frameFolder = resolve(sourceRoot, 'animals', id);
      await mkdir(frameFolder, { recursive: true });
      await writeFile(resolve(frameFolder, `${stage.name}-${frameIndex}.png`), scene);
      atlasLayers.push({ input: scene, left: frameIndex * size, top: stageIndex * size });
      sourceGrids.get(frame.source).push({ input: scene, left: frameIndex * size, top: stage.row * size });
      records.push({ stage: stage.name, frame: frameIndex, source: frame.source, sourceCell: [frameIndex, stage.row],
        sourceRectangle: frame.rectangle, crop: frame.crop, root: [frame.rootX, frame.rootY],
        sourceAnchor: frame.sourceAnchor, stageScale: scale, anchorMethod: stage.anchorMethod,
        sourceCanvas: stage.sourceCanvas, grounding: stage.grounding, footprint: stage.footprint,
        scenePlacement: [left, top, width, height], fixedGround: [layout.animalRoot.x, layout.animalRoot.y] });
      const guideY = Math.round(layout.animalRoot.y - height * 0.52);
      const ground = stage.grounding;
      const guide = Buffer.from(`<svg width="320" height="320" xmlns="http://www.w3.org/2000/svg"><path d="M0 270H320 M138 70V295" stroke="#259b6b" stroke-width="1" opacity="0.8"/><path d="M128 ${guideY}H148 M138 ${guideY - 10}V${guideY + 10}" stroke="#8a42b5" stroke-width="1"/><ellipse cx="${ground.x}" cy="${ground.y}" rx="${ground.radiusX}" ry="${ground.radiusY}" fill="none" stroke="#225c9a" stroke-width="1"/><text x="8" y="18" font-size="12" fill="#2d2430">${id} ${stage.name} frame ${frameIndex}</text><text x="8" y="291" font-size="10" fill="#225c9a">footprint ${ground.x},${ground.y} r ${ground.radiusX},${ground.radiusY}</text><text x="8" y="306" font-size="10" fill="#2d2430">anchor ${frame.sourceAnchor.join(',')} / scale ${scale.toFixed(5)}</text></svg>`);
      const panel = await sharp({ create: { width: size, height: size, channels: 4, background: '#f5ead8' } })
        .composite([{ input: scene, left: 0, top: 0 }, { input: guide, left: 0, top: 0 }]).png().toBuffer();
      alignmentLayers.push({ input: panel, left: frameIndex * size, top: 0 });
    }
    await mkdir(resolve(sourceRoot, 'alignment'), { recursive: true });
    await transparent(size * layout.idleFrames, size).composite(alignmentLayers).png()
      .toFile(resolve(sourceRoot, 'alignment', `${id}-${stage.name}.png`));
  }
  const atlas = await transparent(size * layout.idleFrames, size * species.stages.length)
    .composite(atlasLayers).png().toBuffer();
  await saveVersions(atlas, resolve(sourceRoot, 'atlases', `${id}.png`), resolve(publicRoot, 'animals', `${id}.webp`));

  // The chooser gets a tightly framed live animal, separate from the sellable product icon.
  const adult = species.stages.at(-1);
  const portraitSource = await registeredFrame(0, adult, species);
  await saveVersions(await standaloneIcon(portraitSource.buffer), resolve(sourceRoot, 'icons', `${id}.png`),
    resolve('public/ui-icons', `livestock-${id}.webp`));

  // Inventory is the canonical animation product. Never invent a missing one
  // from the historical productCell or overwrite the existing catalogue icon.
  const itemIcon = resolve('public/wiki/icons', `${id}.webp`);
  const retainedItemIcon = await exists(itemIcon);
  const facilityScene = resolve('public/art', `scene-${id}.webp`);
  const retainedFacilityScene = await exists(facilityScene);
  if (!retainedFacilityScene || refreshScenes) {
    const scene = await sharp(barn).composite([{ input: await readFile(resolve(sourceRoot, 'animals', id, `${adult.name}-0.png`)), left: 0, top: 0 }]).png().toBuffer();
    await saveVersions(scene, resolve('assets/source/art', `scene-${id}.png`), facilityScene);
  }
  manifest.species[id] = { subject: species.subject, product: species.product, slaughter: species.slaughter,
    stages: species.stages.map(({ name }) => name), atlasSize: [size * layout.idleFrames, size * species.stages.length],
    frames: records, productAsset,
    ...(species.productCell ? { historicalProductCell: { source: species.productCell.source ?? species.source, ...species.productCell, consumed: false } } : {}),
    animalIcon: { path: `public/ui-icons/livestock-${id}.webp`, source: portraitSource.source,
      sourceCell: [0, adult.row], crop: portraitSource.crop },
    grounding: species.stages.map((stage) => stage.grounding),
    footprints: species.stages.map((stage) => stage.footprint),
    itemIcon: { path: `public/wiki/icons/${id}.webp`, retained: retainedItemIcon },
    facilityScene: { path: `public/art/scene-${id}.webp`, retained: retainedFacilityScene && !refreshScenes,
      refreshed: retainedFacilityScene && refreshScenes } };
  console.log(JSON.stringify({ id, canonicalProduct: productAsset.canonicalPath, productBounds: productAsset.bounds,
    grounding: species.stages.map(({ name, grounding }) => ({ stage: name, ...grounding })) }));
}

await mkdir(resolve(sourceRoot, 'normalized'), { recursive: true });
for (const [key, grid] of sourceGrids) {
  await transparent(size * columns, size * rows).composite(grid).png({ compressionLevel: 9 })
    .toFile(resolve(sourceRoot, 'normalized', `${key}.png`));
}
await saveVersions(barn, resolve(sourceRoot, 'barn.png'), resolve(publicRoot, 'barn.webp'));
layout.productContract = { source: 'canonical inventory icons only', canonicalPath: 'public/wiki/icons/<ID>.webp',
  sourceSize: [96, 96], boundsAlphaThreshold: productAlphaThreshold, historicalProductCellsConsumed: false };
manifest.productContract = layout.productContract;
await writeFile(resolve(sourceRoot, 'layout.json'), JSON.stringify(layout, null, 2) + '\n');
await writeFile(resolve(sourceRoot, 'atlas.json'), JSON.stringify(manifest, null, 2) + '\n');
const visuals = Object.fromEntries(Object.entries(layout.species).map(([id, species]) => [id,
  { stages: species.stages.length, slaughter: species.slaughter,
    grounding: species.stages.map((stage) => stage.grounding),
    product: { icon: id, bounds: species.productVisual.bounds } }]));
await writeFile(resolve('src/content/livestock-visuals.json'), JSON.stringify(visuals, null, 2) + '\n');
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
  const scene = await sharp(barn).composite([{ input: await readFile(resolve(sourceRoot, 'animals', id, `${adult.name}-0.png`)), left: 0, top: 0 }]).png().toBuffer();
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
console.log(`已导出 ${Object.keys(layout.species).length} 种牲畜动画/选择图，复用96px仓库产出图并登记首帧脚印及内容bounds；未生成独立动画产品。`);
