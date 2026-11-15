import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// HISTORICAL v2/v3 crop conversion only. Never activates canceled runtime metadata.
// Final portless conversion is export-portless-v5.mjs.
// The only generated geometry is an invisible clipping mask for static evidence.
const root = process.cwd();
const dir = path.join(root, 'assets/workshop');
const out = path.join(root, 'public/art/workshop');
const raw = (name) => path.join(dir, 'raw', name + '.png');
await fs.mkdir(path.join(dir, 'png'), { recursive: true });
await fs.mkdir(out, { recursive: true });

async function cropPadded(source, crop) {
  const meta = await sharp(source).metadata();
  const left = Math.max(0, -crop.left);
  const top = Math.max(0, -crop.top);
  const right = Math.max(0, crop.left + crop.width - meta.width);
  const bottom = Math.max(0, crop.top + crop.height - meta.height);
  const padded = await sharp(source).ensureAlpha().extend({ left, top, right, bottom, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(padded).extract({ left: crop.left + left, top: crop.top + top, width: crop.width, height: crop.height }).png().toBuffer();
}

const entries = {};
async function asset(key, source, crop, size, logicalSize, extra = {}) {
  const input = crop ? await cropPadded(raw(source), crop) : raw(source);
  const rotation = extra.sourceRotationDegrees ?? 0;
  const beforeSize = rotation % 180 ? [size[1], size[0]] : size;
  const png = await sharp(input).resize(beforeSize[0], beforeSize[1], { kernel: 'nearest', fit: 'fill' }).rotate(rotation).png().toBuffer();
  await fs.writeFile(path.join(dir, 'png', key + '.png'), png);
  await sharp(png).webp({ quality: 70, alphaQuality: 100, effort: 6 }).toFile(path.join(out, key + '.webp'));
  const result = { path: './art/workshop/' + key + '.webp', size, logicalSize, ...extra };
  entries[key] = { ...result, source: 'assets/workshop/raw/' + source + '.png', crop, png: 'assets/workshop/png/' + key + '.png', conversion: 'nearest-neighbor; WebP quality 70 / alpha quality 100; generated alpha preserved' };
  return result;
}

const background = await asset('background-v1', 'background-v1', null, [320, 320], [320, 320]);
const processing = await asset('processing-machine-v1', 'processing-machine-v1', { left: 24, top: 133, width: 1728, height: 648 }, [432, 162], [128, 48], {
  placement: { x: 148, y: 134, width: 128, height: 48 },
  input: [157.333333, 160], inputCover: [187.703704, 160], output: [266.592593, 160], outputCover: [239.555556, 160],
  sourcePorts: { input: [150, 484], inputCover: [560, 484], output: [1625, 484], outputCover: [1260, 484] },
});
const refiningHeight = 752 * 128 / 1808;
const refiningY = 160 - (418 - 40) * 128 / 1808;
const refining = await asset('refining-machine-v1', 'refining-machine-v1', { left: 56, top: 40, width: 1808, height: 752 }, [452, 188], [128, refiningHeight], {
  placement: { x: 148, y: refiningY, width: 128, height: refiningHeight },
  input: [148 + (140 - 56) * 128 / 1808, 160], inputCover: [148 + (620 - 56) * 128 / 1808, 160], output: [148 + (1780 - 56) * 128 / 1808, 160], outputCover: [148 + (1350 - 56) * 128 / 1808, 160],
  sourcePorts: { input: [140, 418], inputCover: [620, 418], output: [1780, 418], outputCover: [1350, 418] },
});

// User-requested in-plane rotation of the accepted overhead machine artwork.
// Preserve source art/crop and raw source point evidence; this is not new drawing.
async function verticalMachine(sourceKey, horizontal, crop) {
  const oldCenter = [horizontal.placement.x + horizontal.placement.width / 2, horizontal.placement.y + horizontal.placement.height / 2];
  const rotateWorld = (point) => [212 + point[1] - oldCenter[1], 160 - (point[0] - oldCenter[0])];
  const width = horizontal.logicalSize[1];
  return asset(sourceKey + '-vertical-v3', sourceKey + '-v1', crop,
    [horizontal.size[1], horizontal.size[0]], [width, 128], {
      sourceRotationDegrees: 270,
      rotationSource: 'user explicitly requested the overhead machine be placed vertically; in-plane rotation only',
      placement: { x: 212 - width / 2, y: 96, width, height: 128 },
      input: rotateWorld(horizontal.input), inputCover: rotateWorld(horizontal.inputCover),
      output: rotateWorld(horizontal.output), outputCover: rotateWorld(horizontal.outputCover),
      inputSide: 'S', outputSide: 'N',
      sourcePorts: horizontal.sourcePorts,
      sourceHorizontalPlacement: horizontal.placement,
    });
}
const processingVertical = await verticalMachine('processing-machine', processing, { left: 24, top: 133, width: 1728, height: 648 });
const refiningVertical = await verticalMachine('refining-machine', refining, { left: 56, top: 40, width: 1808, height: 752 });

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];
const flow = (port, polygon) => ({ port, polygon });
const railSource = 'conveyor-rails-v2';
const straight = await asset('belt-straight-v2', railSource, { left: 90, top: 144, width: 320, height: 200 }, [128, 80], [25.6, 16], {
  center: [64, 40], ports: { W: [0, 40], E: [128, 40] }, portWidth: 16, coreWidth: 8,
  flowRegions: [flow('W', rect(0, 20, 128, 60))],
});
const vertical = await asset('belt-vertical-v2', railSource, { left: 643, top: 80, width: 204, height: 320 }, [102, 160], [16, 320 * 16 / 204], {
  center: [51, 80], ports: { N: [51, 0], S: [51, 160] }, portWidth: 16, coreWidth: 8,
  flowRegions: [flow('N', rect(26, 0, 76, 160))],
});
const common = { center: [64, 64], portWidth: 16, coreWidth: 10 };
const corner = await asset('belt-corner-v2', railSource, { left: 1150, top: -26, width: 384, height: 384 }, [128, 128], [32, 32], {
  ...common, ports: { W: [0, 64], S: [64, 128] },
  flowRegions: [flow('W', rect(0, 44, 44, 84)), flow('S', rect(44, 84, 84, 128)), flow('center', rect(44, 44, 84, 84))],
});
const junction = await asset('belt-junction-v2', railSource, { left: 116, top: 577, width: 366, height: 366 }, [128, 128], [32, 32], {
  ...common, ports: { N: [64, 0], S: [64, 128], W: [0, 64] },
  flowRegions: [flow('W', rect(0, 44, 44, 84)), flow('N', rect(44, 0, 84, 44)), flow('S', rect(44, 84, 84, 128)), flow('center', rect(44, 44, 84, 84))],
});
const cross = await asset('belt-cross-v2', railSource, { left: 563, top: 577, width: 366, height: 366 }, [128, 128], [32, 32], {
  ...common, ports: { N: [64, 0], E: [128, 64], S: [64, 128], W: [0, 64] },
  flowRegions: [flow('W', rect(0, 44, 44, 84)), flow('E', rect(84, 44, 128, 84)), flow('N', rect(44, 0, 84, 44)), flow('S', rect(44, 84, 84, 128)), flow('center', rect(44, 44, 84, 84))],
});
const port = await asset('belt-port-v2', railSource, { left: 1120, top: 651, width: 280, height: 234 }, [140, 117], [280 * 16 / 234, 16], {
  center: [70, 58.5], ports: { W: [0, 58.5], E: [140, 58.5] }, portWidth: 16, coreWidth: 8,
  flowRegions: [flow('W', rect(0, 29.25, 140, 87.75))],
});
const tread = await asset('belt-surface-v2', 'belt-surface-v2', { left: 89, top: 100, width: 78, height: 156 }, [32, 64], [8, 16], { period: 8, direction: 'E' });

const visuals = {
  version: 3,
  stage: { width: 320, height: 320 },
  background,
  machines: { processing: processingVertical, refining: refiningVertical },
  conveyor: {
    width: 16,
    assets: { straight, vertical, corner, junction, cross, port },
    tread,
    layout: { inputX: 20, inputRows: [32, 64, 96, 128, 160, 192, 224, 256, 288], collectorX: 112, machineInput: processingVertical.input, machineOutput: processingVertical.output, outputX: 300, intakeHubY: 288, topOutletY: 64, inputSize: 28, outputSize: 30 },
    flowCoordinateSpace: 'native asset pixels; polygons are disjoint; visible rubber is clipped below opaque rail overlay',
    layerOrder: ['background', 'movingSurface', 'fixedRailOverlay', 'canonicalItems', 'machine'],
  },
};
await fs.writeFile(path.join(dir, 'workshop-visuals-vertical-v3-history.json'), JSON.stringify(visuals, null, 2) + '\n');
const generationRoot = 'C:/Users/eeg14/.codex/generated_images/01a1df5a-7dd5-78a0-a8fe-56db3bbc33ba/';
const generationSources = {
  'background-v1': { generated: generationRoot + 'exec-19b11c1a-a8c1-4d98-9246-d97841798a67.png', workspace: 'assets/workshop/raw/background-v1.png', prompt: 'assets/workshop/prompts-v1.md#background', transparent: false },
  'processing-machine-v1': { generated: generationRoot + 'exec-d1871c67-a16d-46e9-a300-cc7fb070ba4a.png', workspace: 'assets/workshop/raw/processing-machine-v1.png', prompt: 'assets/workshop/prompts-v1.md#processing-machine', transparent: true },
  'refining-machine-v1': { generated: generationRoot + 'exec-282dec61-5ac5-47b6-b60e-806cfd47a095.png', workspace: 'assets/workshop/raw/refining-machine-v1.png', prompt: 'assets/workshop/prompts-v1.md#refining-machine', transparent: true },
  'conveyor-components-v1': { generated: generationRoot + 'exec-95b84920-04ee-4666-9179-deb104cf3556.png', workspace: 'assets/workshop/raw/conveyor-components-v1.png', prompt: 'assets/workshop/prompts-v1.md#conveyor-components', transparent: true, status: 'style/edit input only; baked tread version is not consumed' },
  'conveyor-rails-v2': { generated: generationRoot + 'exec-84cfb8c5-0528-4336-9921-ada5e77b8b56.png', workspace: 'assets/workshop/raw/conveyor-rails-v2.png', prompt: 'assets/workshop/prompts-v2.md#rail-only-overlay', transparent: true, editInput: 'assets/workshop/raw/conveyor-components-v1.png' },
  'belt-surface-v2': { generated: generationRoot + 'exec-9b1001fc-b83d-48a1-bae6-9a427528f330.png', workspace: 'assets/workshop/raw/belt-surface-v2.png', prompt: 'assets/workshop/prompts-v2.md#independent-belt-surface', transparent: false },
};
await fs.writeFile(path.join(dir, 'registration-v3.json'), JSON.stringify({ version: 3, generator: 'built-in image_gen', promptFiles: ['assets/workshop/prompts-v1.md', 'assets/workshop/prompts-v2.md'], generationSources, sourceReference: 'assets/workshop/raw/conveyor-components-v1.png was edited by built-in image_gen to remove treads; it is not an active conveyor source', camera: '90-degree straight-down orthographic; machine artwork rotated 270 degrees only in the image plane at explicit user request', entries }, null, 2) + '\n');
console.log('Converted generated artwork to independent PNG/WebP layers and wrote exact registration. No tests, preview or build executed.');
