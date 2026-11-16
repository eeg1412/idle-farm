// Compiles the runtime subset of src/content/crop-visuals.json. The full file
// keeps export/review metadata for export-crop-animation and art:check; the
// game bundle only needs the fields read by canvas-ui.js (loadPlotTextures)
// and plot-animation.js (mountIndividualPlants). Keys stay crop IDs, values
// and shapes stay unchanged; only unread fields are dropped.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const sourcePath = path.join(root, 'src/content/crop-visuals.json');
export const runtimePath = path.join(root, 'src/content/crop-visuals.runtime.json');

// true keeps the value as-is; an object recurses; an array spec ([spec])
// applies spec to every element.
const stageSpec = { path: true, width: true, height: true, anchorX: true, anchorY: true, baseScale: true };
export const runtimeWhitelist = {
  mode: true,
  harvestMode: true,
  stages: [stageSpec],
  roots: [{ x: true, y: true, row: true, column: true, scale: true, maxHeight: true }],
  repeatBare: {
    path: true, width: true, height: true, anchorX: true, anchorY: true,
    registration: { scaleToMature: true },
  },
};

function pick(value, spec) {
  if (spec === true) return value;
  if (Array.isArray(spec)) return Array.isArray(value) ? value.map((item) => pick(item, spec[0])) : value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const result = {};
  for (const key of Object.keys(value)) {
    if (Object.hasOwn(spec, key)) result[key] = pick(value[key], spec[key]);
  }
  return result;
}

export function compileCropVisuals(visuals) {
  return Object.fromEntries(Object.entries(visuals).map(([id, visual]) => [id, pick(visual, runtimeWhitelist)]));
}

export async function writeRuntimeCropVisuals({ from = sourcePath, to = runtimePath } = {}) {
  const visuals = JSON.parse(await readFile(from, 'utf8'));
  const compiled = JSON.stringify(compileCropVisuals(visuals));
  await writeFile(to, compiled);
  return compiled.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bytes = await writeRuntimeCropVisuals();
  console.log(`Wrote ${path.relative(root, runtimePath)} (${bytes} bytes).`);
}
