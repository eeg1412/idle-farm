import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Ordinary crop/format conversion of built-in-imagegen art; no source erasing,
// port fabrication, machine stretching, rail generation, tests or game startup.
const previous = JSON.parse(await fs.readFile('src/content/workshop-visuals.json', 'utf8'));
const base = 'assets/workshop';
const output = 'public/art/workshop';
const sources = {
  processing: {
    crop: { left: 468, top: 24, width: 280, height: 1240 },
    size: [140, 620], bounds: { left: 471, right: 746, top: 29, bottom: 1261 },
    generated: 'C:/Users/eeg14/.codex/generated_images/01a1df5a-7dd5-78a0-a8fe-56db3bbc33ba/exec-376c5d3e-990a-4947-9375-f22732ec1f16.png',
    input: 'assets/workshop/raw/processing-machine-long-v4.png',
  },
  refining: {
    crop: { left: 460, top: 16, width: 296, height: 1256 },
    size: [148, 628], bounds: { left: 465, right: 751, top: 21, bottom: 1265 },
    generated: 'C:/Users/eeg14/.codex/generated_images/01a1df5a-7dd5-78a0-a8fe-56db3bbc33ba/exec-ff00486d-d0c7-450c-8b5b-30fd2ecca5bc.png',
    input: 'assets/workshop/raw/refining-machine-long-v4.png',
  },
};
const machines = {};
const registration = {};
await fs.mkdir(path.join(base, 'png'), { recursive: true });
await fs.mkdir(output, { recursive: true });
for (const [kind, source] of Object.entries(sources)) {
  const key = kind + '-machine-portless-v5';
  const rawPath = path.join(base, 'raw', key + '.png');
  const pngPath = path.join(base, 'png', key + '.png');
  const finalPath = path.join(output, key + '.webp');
  const png = await sharp(rawPath).extract(source.crop).resize(source.size[0], source.size[1], { kernel: 'nearest' }).png().toBuffer();
  await fs.writeFile(pngPath, png);
  await sharp(png).webp({ quality: 70, alphaQuality: 100, effort: 6 }).toFile(finalPath);
  const scale = 288 / (source.bounds.bottom - source.bounds.top);
  const centerX = (source.bounds.left + source.bounds.right) / 2;
  const width = (source.bounds.right - source.bounds.left) * scale;
  const bodyEdges = { left: 160 - width / 2, right: 160 + width / 2, top: 16, bottom: 304 };
  const logicalSize = [source.crop.width * scale, source.crop.height * scale];
  const placement = { x: 160 + (source.crop.left - centerX) * scale, y: 16 + (source.crop.top - source.bounds.top) * scale, width: logicalSize[0], height: logicalSize[1] };
  const occlusionCover = { inputX: bodyEdges.left + 20, outputX: bodyEdges.right - 20 };
  machines[kind] = { path: './art/workshop/' + key + '.webp', size: source.size, logicalSize, placement, bodyEdges, occlusionCover, sourceBounds: source.bounds, sourceRotationDegrees: 0 };
  registration[kind] = { ...machines[kind], source: rawPath.replaceAll('\\', '/'), sourceGenerated: source.generated, editInput: source.input, prompt: 'assets/workshop/prompts-portless-v5.md', crop: source.crop, png: pngPath.replaceAll('\\', '/'), webp: finalPath.replaceAll('\\', '/'), bodyScale: scale, sourceOcclusionCover: { inputX: source.bounds.left + 20 / scale, outputX: source.bounds.right - 20 / scale }, conversion: 'uniform nearest-neighbor crop resize only; WebP quality 70, alpha quality 100, generated alpha preserved', visualIntent: 'solid uninterrupted overhead cabinet; no fixed openings or protruding connections; display attachment Y is recipe-driven' };
}
const candidate = {
  version: 5,
  stage: previous.stage,
  background: previous.background,
  machines,
  conveyor: {
    speed: 0.04,
    tread: { ...previous.conveyor.tread, logicalSize: [32, previous.conveyor.tread.logicalSize[1]], period: 32 },
    layout: { inputX: 0, outputX: 320, inputSize: 64, outputSize: 72, inputSpacing: 96, surfaceUnderlap: 3 },
    layerOrder: ['background', 'movingBorderlessSurface', 'canonicalItems', 'solidMachineBody'],
  },
};
await fs.writeFile(path.join(base, 'workshop-visuals-portless-v5-candidate.json'), JSON.stringify(candidate, null, 2) + '\n');
await fs.writeFile(path.join(base, 'registration-portless-v5.json'), JSON.stringify({ version: 5, generator: 'built-in image_gen edit', prompt: 'assets/workshop/prompts-portless-v5.md', entries: registration, reused: { background: previous.background, movingSurface: previous.conveyor.tread }, inactiveHistory: ['all horizontal machines', 'vertical rotated v3 machines', 'long-v4 machines with ports', 'all rail/port/corner/junction/cross graphics'], status: 'candidate metadata; activate only together with matching final layout helper' }, null, 2) + '\n');
console.log('Saved real-imagegen portless machines and candidate JSON; active runtime metadata left unchanged.');
