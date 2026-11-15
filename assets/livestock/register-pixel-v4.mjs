// Production art registration. Reads new image_gen sources; writes the explicit
// fixed anatomical anchors/canvases consumed by art:livestock. No game simulation.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = 'assets/livestock';
const regions = JSON.parse(await readFile(`${root}/pixel-v4-source-regions.json`, 'utf8'));
const layout = JSON.parse(await readFile(`${root}/layout.json`, 'utf8'));
// Reference-frame coordinates hand registered from the planted support feet:
// the ground projection of the middle of the stance, not the moving bbox center.
const registrations = {
  L01: { source: 'accessories', row: 0, anchors: [[182, 230]], radii: [[35, 9]] },
  L02: { source: 'accessories', row: 1, anchors: [[128, 488]], radii: [[72, 15]] },
  L03: { source: 'accessories', row: 2, anchors: [[143, 725]], radii: [[39, 10]] },
  L04: { source: 'accessories', row: 3, anchors: [[123, 972]], radii: [[53, 12]] },
  L05: { source: 'accessories', row: 4, anchors: [[172, 1213]], radii: [[37, 10]] },
  L06: { source: 'pig', anchors: [[147, 232], [144, 473], [138, 715]], radii: [[37, 9], [54, 12], [65, 15]] },
  L07: { source: 'rabbit', anchors: [[142, 225], [144, 466], [142, 727]], radii: [[30, 8], [40, 10], [48, 12]] },
  L08: { source: 'sheep', anchors: [[144, 228], [148, 466], [141, 721]], radii: [[34, 8], [46, 10], [59, 13]] },
  L09: { source: 'muscovy', anchors: [[153, 236], [155, 483], [160, 750]], radii: [[29, 8], [39, 10], [46, 12]] },
  L10: { source: 'cattle', anchors: [[145, 246], [140, 493], [133, 725]], radii: [[39, 9], [53, 12], [65, 15]] },
};
const sourceData = {};
for (const key of Object.keys(regions)) sourceData[key] = await sharp(`${root}/raw/pixel-v4-${key}-isolated.png`)
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function lowerFootTranslation(source, reference, frame) {
  // Match the stationary sole/hoof pattern in a fixed 22px-high anatomical ROI.
  // Only integer translation is searched; never rescale or fit each frame.
  const { data, info } = source;
  const expectedX = frame.left - reference.left;
  const expectedY = frame.top + frame.height - reference.top - reference.height;
  const left = reference.left;
  const right = reference.left + reference.width;
  const top = reference.top + reference.height - 22;
  const bottom = reference.top + reference.height;
  let best = { error: Infinity, dx: expectedX, dy: expectedY };
  for (let dy = expectedY - 3; dy <= expectedY + 3; dy++) {
    for (let dx = expectedX - 14; dx <= expectedX + 14; dx++) {
      let error = 0;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const first = (y * info.width + x) * 4;
        const second = ((y + dy) * info.width + x + dx) * 4;
        const alphaA = data[first + 3], alphaB = data[second + 3];
        error += Math.abs(alphaA - alphaB) * 3;
        if (alphaA && alphaB) for (let channel = 0; channel < 3; channel++) error += Math.abs(data[first + channel] - data[second + channel]);
      }
      // Ties prefer the same ground baseline, never a noisy contour centroid.
      error += Math.abs(dy - expectedY) * 0.01 + Math.abs(dx - expectedX) * 0.001;
      if (error < best.error) best = { error, dx, dy };
    }
  }
  return best;
}

layout.version = 4;
layout.sources.sheets = Object.fromEntries(Object.keys(regions).map((key) => [key, regions[key].file ?? `raw/pixel-v4-${key}.png`]));
layout.alphaIsolation = { threshold: 200, method: 'Remove generated transparency matting below alpha 200; keep original RGB and make the retained sprite opaque. Original PNGs are retained unchanged.' };
layout.styleReference = 'raw/pixel-v4-black-pig-style.png';
layout.anchorMethod = 'Reference stance-center ground point hand registered from the anatomical planted feet in source frame 0; the same stationary sole/hoof pattern is registered by integer translation in a fixed 22px lower-foot ROI. All four frames use one shared source canvas relative to that anatomical anchor and one stageScale. No per-frame bbox centering, weighted foot centroid or resizing.';
const registrationReport = {};
for (const [id, registration] of Object.entries(registrations)) {
  const species = layout.species[id];
  species.source = registration.source;
  const components = regions[registration.source].components;
  registrationReport[id] = [];
  for (const [index, stage] of species.stages.entries()) {
    const row = registration.row ?? index;
    const selected = components.slice(row * (registration.source === 'accessories' ? 5 : 4), row * (registration.source === 'accessories' ? 5 : 4) + 4);
    const anchor = registration.anchors[index];
    const translations = selected.map((frame, frameIndex) => frameIndex ? lowerFootTranslation(sourceData[registration.source], selected[0], frame) : { dx: 0, dy: 0, error: 0 });
    const anchors = translations.map(({ dx, dy }) => [anchor[0] + dx, anchor[1] + dy]);
    const left = Math.min(...selected.map((frame, frameIndex) => frame.left - anchors[frameIndex][0])) - 2;
    const top = Math.min(...selected.map((frame, frameIndex) => frame.top - anchors[frameIndex][1])) - 2;
    const right = Math.max(...selected.map((frame, frameIndex) => frame.left + frame.width - anchors[frameIndex][0])) + 2;
    const bottom = Math.max(...selected.map((frame, frameIndex) => frame.top + frame.height - anchors[frameIndex][1])) + 2;
    for (const field of ['expandTop', 'expandBottom', 'expandLeft', 'expandRight', 'source']) delete stage[field];
    stage.row = row;
    stage.sourceAnchors = anchors;
    stage.sourceCanvas = { left, top, width: right - left, height: bottom - top };
    stage.anchorMethod = layout.anchorMethod;
    stage.footRegistration = { referenceFrame: 0, template: { left: selected[0].left, top: selected[0].top + selected[0].height - 22, width: selected[0].width, height: 22 }, translations };
    const [radiusX, radiusY] = registration.radii[index];
    stage.grounding = { x: 138, y: 270, radiusX, radiusY };
    registrationReport[id].push({ stage: stage.name, sourceAnchors: anchors, sourceCanvas: stage.sourceCanvas, sourceRegions: selected, footRegistration: stage.footRegistration });
  }
  const product = components[registration.source === 'accessories' ? registration.row * 5 + 4 : 12];
  species.productCell = { column: registration.source === 'accessories' ? 4 : 1, row: registration.source === 'accessories' ? registration.row : 4,
    rectangle: { left: product.left - 2, top: product.top - 2, width: product.width + 4, height: product.height + 4 } };
}
await writeFile(`${root}/layout.json`, JSON.stringify(layout, null, 2) + '\n');
await writeFile(`${root}/pixel-v4-registration.json`, JSON.stringify(registrationReport, null, 2) + '\n');
console.log('Registered new pixel-v4 source anchors, stationary foot templates and shared stage canvases.');
