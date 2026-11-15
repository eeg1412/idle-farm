import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Asset production only: crop/nearest-neighbor resize/WebP conversion of the
// three actual built-in image_gen outputs. No game/layout import or validation.
const base = 'assets/workshop';
const release = 'public/art/workshop';
const current = JSON.parse(await fs.readFile('src/content/workshop-visuals.json', 'utf8'));
const generationRoot = 'C:/Users/eeg14/.codex/generated_images/01a1df5a-7dd5-78a0-a8fe-56db3bbc33ba/';
const commonStyleReference = 'public/art/livestock/barn.webp';
const definitions = {
  processing: {
    key: 'processing-machine-wood-v6',
    generated: generationRoot + 'exec-4daa445c-79ce-474a-8f63-767cf1529057.png',
    inputs: [
      { path: 'assets/workshop/raw/processing-machine-portless-v5.png', role: 'tall geometry and 90-degree camera only; metal construction replaced' },
      { path: commonStyleReference, role: 'warm timber palette and pixel clusters only; no camera inheritance' },
    ],
    sourceBounds: { left: 450, right: 768, top: 20, bottom: 1271 },
    crop: { left: 444, top: 14, width: 330, height: 1264 },
    size: [165, 632],
  },
  refining: {
    key: 'refining-machine-wood-v6',
    generated: generationRoot + 'exec-22fe7d4b-7f0f-481b-a605-07e982b6a3fb.png',
    inputs: [
      { path: 'assets/workshop/raw/refining-machine-portless-v5.png', role: 'tall geometry and 90-degree camera only; industrial construction replaced' },
      { path: commonStyleReference, role: 'warm timber palette and pixel clusters only; no camera inheritance' },
    ],
    sourceBounds: { left: 459, right: 760, top: 16, bottom: 1271 },
    crop: { left: 452, top: 10, width: 316, height: 1268 },
    size: [158, 634],
  },
};
const machines = {};
const entries = {};
await fs.mkdir(path.join(base, 'png'), { recursive: true });
await fs.mkdir(release, { recursive: true });

for (const [kind, definition] of Object.entries(definitions)) {
  const source = path.join(base, 'raw', definition.key + '.png');
  const pngPath = path.join(base, 'png', definition.key + '.png');
  const webpPath = path.join(release, definition.key + '.webp');
  const png = await sharp(source).extract(definition.crop).resize(...definition.size, { kernel: 'nearest' }).png().toBuffer();
  await fs.writeFile(pngPath, png);
  await sharp(png).webp({ quality: 70, alphaQuality: 100, effort: 6 }).toFile(webpPath);

  const bounds = definition.sourceBounds;
  const scale = 400 / (bounds.bottom - bounds.top);
  const center = (bounds.left + bounds.right) / 2;
  const width = (bounds.right - bounds.left) * scale;
  const bodyEdges = { left: 160 - width / 2, right: 160 + width / 2, top: -40, bottom: 360 };
  const logicalSize = [definition.crop.width * scale, definition.crop.height * scale];
  const placement = {
    x: 160 + (definition.crop.left - center) * scale,
    y: -40 + (definition.crop.top - bounds.top) * scale,
    width: logicalSize[0], height: logicalSize[1],
  };
  const coverInsetInput = current.conveyor.layout.inputSize / 2 + 2;
  const coverInsetOutput = current.conveyor.layout.outputSize / 2 + 2;
  const occlusionCover = { inputX: bodyEdges.left + coverInsetInput, outputX: bodyEdges.right - coverInsetOutput };
  machines[kind] = {
    path: './art/workshop/' + definition.key + '.webp',
    size: definition.size, logicalSize, placement, bodyEdges, occlusionCover,
    sourceBounds: bounds, sourceRotationDegrees: 0,
  };
  entries[kind] = {
    ...machines[kind], source: source.replaceAll('\\', '/'), sourceSize: [1219, 1290],
    generated: definition.generated, inputImages: definition.inputs,
    crop: definition.crop, uniformWorldScale: scale,
    sourceOcclusionCover: { inputX: bounds.left + coverInsetInput / scale, outputX: bounds.right - coverInsetOutput / scale },
    sourceBoundsMethod: 'direct source inspection and focused alpha>128 bounds reading; exclusive right/bottom edges',
    png: pngPath.replaceAll('\\', '/'), webp: webpPath.replaceAll('\\', '/'),
    conversion: 'uniform 1/2 nearest-neighbor source crop; uniform world scale to true body height 400; no rotation or material recoloring; WebP quality70 alpha100',
    prompt: 'assets/workshop/prompts-wood-v6.md#' + (kind === 'processing' ? 'processing-machine' : 'refining-machine'),
  };
}

// Actual adjacent source joint centers are x314 and x418: exactly 104 pixels.
// Crop one real period, including complementary halves of both thin seams.
// A 104x52 source crop has the same 2:1 ratio as the 32x16 logical period.
const treadCrop = { left: 314, top: 256, width: 104, height: 52 };
const treadSource = path.join(base, 'raw/belt-surface-wood-v6.png');
const treadPng = path.join(base, 'png/belt-surface-wood-v6.png');
const treadWebp = path.join(release, 'belt-surface-wood-v6.webp');
const tread = await sharp(treadSource).extract(treadCrop).png().toBuffer();
await fs.writeFile(treadPng, tread);
await sharp(tread).webp({ quality: 70, alphaQuality: 100, effort: 6 }).toFile(treadWebp);
const treadAsset = {
  ...current.conveyor.tread,
  path: './art/workshop/belt-surface-wood-v6.webp',
  size: [104, 52], logicalSize: [32, 16], period: 32, direction: 'E',
};
entries.tread = {
  ...treadAsset, source: treadSource.replaceAll('\\', '/'), sourceSize: [1254, 1254],
  generated: generationRoot + 'exec-90df4a0d-6cda-49f4-bdf9-f0b95cf98313.png', inputImages: [],
  crop: treadCrop, png: treadPng.replaceAll('\\', '/'), webp: treadWebp.replaceAll('\\', '/'),
  sourceJointColumnRuns: [[308, 320], [412, 424]], sourcePeriodCenters: [314, 418], sourcePeriodPixels: 104,
  conversion: 'one real vertical-plank period cropped from built-in image_gen source; no repainting or synthetic pattern; uniform logical scale 32/104; WebP quality70 alpha100',
  prompt: 'assets/workshop/prompts-wood-v6.md#wooden-tread-surface',
};

const candidate = {
  ...current, version: 6, machines,
  conveyor: { ...current.conveyor, speed: 0.04, tread: treadAsset },
};
await fs.writeFile(path.join(base, 'workshop-visuals-wood-v6-candidate.json'), JSON.stringify(candidate, null, 2) + '\n');
await fs.writeFile(path.join(base, 'registration-wood-v6.json'), JSON.stringify({
  version: 6, date: '2026-11-16', generator: 'built-in image_gen, three independent drawing calls',
  promptFile: 'assets/workshop/prompts-wood-v6.md',
  intent: 'new wooden construction, true overhead, solid straight cabinet sides without ports; separate opaque borderless wooden tread; no background',
  entries,
  preserved: { stage: current.stage, conveyorLayout: current.conveyor.layout, layerOrder: current.conveyor.layerOrder, speed: 0.04, period: 32 },
  status: 'producer writes candidate only and never writes active metadata; separately authorized activation is recorded in HANDOFF-wood-v6.md; direct image review only, no running or static composition',
}, null, 2) + '\n');
console.log('Produced three wood-v6 PNG/WebP assets, source registration, and candidate metadata. Active metadata untouched. No game, tests, preview, composite or build run.');
