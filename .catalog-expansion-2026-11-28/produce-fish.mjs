import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import sharp from 'sharp';

const staging = '.catalog-expansion-2026-11-28';
const producer = path.join(staging, 'fish-producer');
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const writeJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
};
async function copy(src, dst) {
  await mkdir(path.dirname(dst), { recursive: true });
  await copyFile(src, dst);
}

const configuration = {
  F11: ['large', 'river'], F12: ['large', 'river'], F13: ['large', 'river'],
  F14: ['medium', 'river'], F15: ['small', 'river'], F16: ['large', 'river'],
  F17: ['large', 'river'], F18: ['small', 'river'], F19: ['medium', 'river'],
  F20: ['small', 'river'], F21: ['medium', 'sea'], F22: ['large', 'sea'],
  F23: ['medium', 'sea'], F24: ['medium', 'sea'], F25: ['small', 'sea'],
  F26: ['large', 'sea'], F27: ['large', 'sea'], F28: ['large', 'sea'],
  F29: ['large', 'sea'], F30: ['large', 'sea'],
};
const version = { F13: 2 };
const stages = ['fry', 'growing', 'mature'];
const oldLayout = await readJson('assets/fish/layout.json');
const oldAtlas = await readJson('assets/fish/atlas.json');
const oldVisuals = await readJson('src/content/fish-visuals.json');
const { items } = await readJson(path.join(staging, 'src/content/game-data.json'));
const owner = await readJson(path.join(staging, 'fish-coordinate-evidence/owner-anchors.json'));
const external = {};
try {
  for (const name of await readdir(path.join(staging, 'anchors'))) {
    if (name.startsWith('fish-') && name.endsWith('.json')) {
      Object.assign(external, await readJson(path.join(staging, 'anchors', name)));
    }
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const layout = structuredClone(oldLayout);
layout.species = {};
layout.sources.sheets = {};

function ownerStage(registration, stageIndex, geometry) {
  const { height, width, placements } = geometry;
  const stage = placements[stageIndex];
  const half = (a, b) => Math.round((a + b) / 2);
  const top = stageIndex ? half(placements[stageIndex - 1].y[1], stage.y[0]) : 0;
  const bottom = stageIndex + 1 < placements.length
    ? half(stage.y[1], placements[stageIndex + 1].y[0]) : Math.min(height, stage.y[1] + 80);
  const cellRects = stage.x.map(([leftBound, rightBound], index) => {
    const left = index ? half(stage.x[index - 1][1], leftBound) : 0;
    const right = index === stage.x.length - 1 ? Math.min(width, rightBound + 64)
      : half(rightBound, stage.x[index + 1][0]);
    return { left, top, width: right - left, height: bottom - top };
  });
  return { sourceAnchors: registration, cellRects };
}

const suppliedIDs = process.argv.slice(2);
for (const id of suppliedIDs) {
  const [size, habitat] = configuration[id];
  const externalRow = external[id];
  const sourceName = `raw/${id}-idle-v${version[id] ?? externalRow?.version ?? 1}.png`;
  const sourcePath = `assets/fish/${sourceName}`;
  const source = await readFile(sourcePath);
  const { data, info: { width } } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const geometry = owner[id] && await readJson(path.join(staging, 'fish-coordinate-evidence', `${id}-spans.json`));
  const partial = stages.map((name, index) => owner[id] ? ownerStage(owner[id][index], index, geometry) : externalRow.stages[name]);
  // Fit a common crop and scale around the recorded anatomical anchors.
  // Bounds size the shared canvas. They never position an individual frame.
  const extent = { left: 0, top: 0, right: 0, bottom: 0 };
  for (const { sourceAnchors, cellRects } of partial) {
    for (const [frame, { left, top, width: cellWidth, height: cellHeight }] of cellRects.entries()) {
      const [anchorX, anchorY] = sourceAnchors[frame];
      for (let y = top; y < top + cellHeight; y++) for (let x = left; x < left + cellWidth; x++) {
        if (data[(y * width + x) * 4 + 3] < 32) continue;
        extent.left = Math.max(extent.left, anchorX - x);
        extent.top = Math.max(extent.top, anchorY - y);
        extent.right = Math.max(extent.right, x - anchorX);
        extent.bottom = Math.max(extent.bottom, y - anchorY);
      }
    }
  }
  const cropPadding = 8;
  const sourceCanvas = {
    left: -extent.left - cropPadding, top: -extent.top - cropPadding,
    width: extent.left + extent.right + cropPadding * 2, height: extent.top + extent.bottom + cropPadding * 2,
  };
  const sourceScale = id === 'F22' ? 1 : 0.76;
  const stageScale = Math.min(sourceScale, 150 / -sourceCanvas.left, 200 / -sourceCanvas.top,
    150 / (sourceCanvas.width + sourceCanvas.left), 100 / (sourceCanvas.height + sourceCanvas.top));
  const definition = externalRow?.anchorDefinition ?? externalRow?.anchor ??
    'Manually registered fixed rigid anterior torso behind gill cover at longitudinal body axis across all four idle frames.';
  layout.species[id] = {
    subject: items[id].subject, size, source: id,
    stages: stages.map((name, index) => ({
      name, cells: [0, 1, 2, 3].map(col => index * 5 + col), stageScale, sourceCanvas,
      anchor: { x: -sourceCanvas.left, y: -sourceCanvas.top, definition },
      ...partial[index],
    })),
    habitat,
  };
  layout.sources.sheets[id] = sourceName;
  await copy(sourcePath, path.join(producer, sourcePath));
}

await copy('scripts/export-fish-animation.mjs', path.join(producer, 'scripts/export-fish-animation.mjs'));
await copy('src/view/fish-layout.js', path.join(producer, 'src/view/fish-layout.js'));
await copy(layout.sources.pond, path.join(producer, layout.sources.pond));
for (const { source } of Object.values(layout.sources.ponds)) await copy(source, path.join(producer, source));
await writeJson(path.join(producer, 'assets/fish/layout.json'), layout);
const run = promisify(execFile);
try {
  const result = await run(process.execPath, [path.join(producer, 'scripts/export-fish-animation.mjs')]);
  console.log(result.stdout.trim());
} catch (error) {
  console.error(error.stderr);
  throw error;
}

const atlas = await readJson(path.join(producer, 'assets/fish/atlas.json'));
const visuals = await readJson(path.join(producer, 'src/content/fish-visuals.json'));
const combinedLayout = await readJson(path.join(staging, 'assets/fish/layout.json')).catch(() => oldLayout);
const combinedAtlas = await readJson(path.join(staging, 'assets/fish/atlas.json')).catch(() => oldAtlas);
const combinedVisuals = await readJson(path.join(staging, 'src/content/fish-visuals.json')).catch(() => oldVisuals);
const ascending = definition => Object.fromEntries(Object.entries(definition).sort(([a], [b]) => a.localeCompare(b)));
combinedLayout.species = ascending({ ...combinedLayout.species, ...layout.species });
combinedLayout.sources.sheets = ascending({ ...combinedLayout.sources.sheets, ...layout.sources.sheets });
combinedAtlas.species = ascending({ ...combinedAtlas.species, ...atlas.species });
combinedAtlas.sources = ascending({ ...combinedAtlas.sources, ...atlas.sources });
await writeJson(path.join(staging, 'assets/fish/layout.json'), combinedLayout);
await writeJson(path.join(staging, 'assets/fish/atlas.json'), combinedAtlas);
await writeJson(path.join(staging, 'src/content/fish-visuals.json'), ascending({ ...combinedVisuals, ...visuals }));
for (const id of suppliedIDs) {
  const files = [
    `assets/fish/normalized/${id}.png`, `assets/fish/atlases/${id}.png`,
    `assets/fish/icons/${id}.png`, `assets/fish/reviews/${id}-stages.png`,
    `assets/source/art/scene-${id}.png`, `public/art/scene-${id}.webp`,
    `public/art/fish/animals/${id}.webp`, `public/ui-icons/fish-${id}.webp`,
    ...stages.flatMap(stage => [0, 1, 2, 3].map(frame => `assets/fish/animals/${id}/${stage}-${frame}.png`)),
  ];
  for (const file of files) await copy(path.join(producer, file), file);
}
const evidenceFolder = `assets/fish/reviews/fish-expansion-${suppliedIDs.join('-')}`;
for (const name of ['selection-32.png', 'fallback-habitats-130.png']) {
  await copy(path.join(producer, 'assets/fish/reviews', name), path.join(evidenceFolder, name));
}
