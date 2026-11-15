// Convert independently drawn fish sprites into registered stage/idle atlases.
// This producer crops and composes artwork; it never synthesizes a fish or idle frame.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { fishRegistration, fishSizeLayouts } from '../src/view/fish-layout.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const at = (name) => path.join(root, name);
const layout = JSON.parse(await readFile(at('assets/fish/layout.json'), 'utf8'));
const size = layout.sceneSize;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const transparent = (width, height) => sharp({
  create: { width, height, channels: 4, background: '#00000000' },
});
const save = async (name, bytes) => {
  await mkdir(path.dirname(at(name)), { recursive: true });
  await writeFile(at(name), bytes);
};

function intersection(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

function alphaBounds(bytes, width, height) {
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (bytes[(y * width + x) * 4 + 3] < 16) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error('Cannot export an empty mature fish icon');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

// Explicitly registered cell isolation prevents neighboring sprites entering a
// shared anatomical crop; it does not remeasure or recenter each idle silhouette.
async function registeredFrame(source, metadata, stage, frame) {
  const [anchorX, anchorY] = stage.sourceAnchors[frame];
  const box = stage.sourceCanvas;
  const sourceBox = { left: anchorX + box.left, top: anchorY + box.top, width: box.width, height: box.height };
  const crop = intersection(intersection(sourceBox, stage.cellRects[frame]),
    { left: 0, top: 0, width: metadata.width, height: metadata.height });
  if (crop.width <= 0 || crop.height <= 0) throw new Error('Invalid registered source cell');
  const isolated = await sharp(source).extract(crop).png().toBuffer();
  const sharedCanvas = await transparent(box.width, box.height).composite([{
    input: isolated, left: crop.left - sourceBox.left, top: crop.top - sourceBox.top,
  }]).png().toBuffer();
  const scaled = await sharp(sharedCanvas)
    .resize(Math.round(box.width * stage.stageScale), Math.round(box.height * stage.stageScale),
      { kernel: 'nearest', fit: 'fill' }).png().toBuffer();
  return transparent(size, size).composite([{
    input: scaled,
    left: fishRegistration.x + Math.round(box.left * stage.stageScale),
    top: fishRegistration.y + Math.round(box.top * stage.stageScale),
  }]).png().toBuffer();
}

async function exportHabitats(manifest) {
  const ponds = {};
  const habitats = {};
  manifest.ponds = {};
  if (manifest.pond) manifest.pond.consumed = false;
  for (const [habitat, definition] of Object.entries(layout.sources.ponds)) {
    const source = await readFile(at(definition.source));
    const png = await sharp(source).resize(size, size, { kernel: 'nearest', fit: 'cover' }).png().toBuffer();
    const webp = await sharp(png).webp({ quality: 70, effort: 5 }).toBuffer();
    await save(definition.png, png);
    await save(definition.path, webp);
    ponds[habitat] = png;
    habitats[habitat] = { pond: definition.path, water: definition.water };
    manifest.ponds[habitat] = {
      source: definition.source, sourceSha256: hash(source), png: definition.png,
      path: definition.path, sha256: hash(webp), water: definition.water,
    };
  }
  const visuals = {};
  const contact = [];
  const ids = Object.keys(layout.species);
  for (const [index, id] of ids.entries()) {
    const definition = layout.species[id];
    const habitat = habitats[definition.habitat];
    const mature = await readFile(at(`assets/fish/animals/${id}/mature-0.png`));
    const group = fishSizeLayouts[definition.size];
    const layers = [];
    for (const placement of group.placements) {
      const scale = group.scale * placement.depth;
      layers.push({
        input: await sharp(mature).resize(Math.round(size * scale), Math.round(size * scale), { kernel: 'nearest' }).png().toBuffer(),
        left: Math.round(placement.x - fishRegistration.x * scale), top: Math.round(placement.y - fishRegistration.y * scale),
      });
    }
    const water = habitat.water;
    const tint = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">`
      + `<polygon points="${water.polygon.map((point) => point.join(',')).join(' ')}" fill="#${water.color.toString(16).padStart(6, '0')}" fill-opacity="${water.alpha}"/></svg>`);
    const fallback = await sharp(ponds[definition.habitat]).composite([...layers, { input: tint }]).png().toBuffer();
    const published = await sharp(fallback).webp({ quality: 70, effort: 5 }).toBuffer();
    await save(`assets/source/art/scene-${id}.png`, fallback);
    await save(`public/art/scene-${id}.webp`, published);
    manifest.species[id].habitat = definition.habitat;
    manifest.species[id].fallback = {
      source: `assets/source/art/scene-${id}.png`, sourceSha256: hash(fallback),
      sourceStage: 'mature', sourceFrame: 0, path: `public/art/scene-${id}.webp`,
      sha256: hash(published), layout: definition.size, habitat: definition.habitat,
      layers: ['habitat-background', 'mature-fish', 'water-tint'],
    };
    visuals[id] = { stages: 3, size: definition.size, habitat: definition.habitat };
    contact.push({ input: await sharp(fallback).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(),
      left: index % 5 * 138 + 4, top: Math.floor(index / 5) * 152 + 4 });
  }
  const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="690" height="304">`
    + ids.map((id, index) => `<text x="${index % 5 * 138 + 69}" y="${Math.floor(index / 5) * 152 + 148}" text-anchor="middle" fill="#263b2a" font-family="sans-serif" font-size="12">${id} ${layout.species[id].habitat}</text>`).join('') + '</svg>');
  await save('assets/fish/reviews/fallback-habitats-130.png', await sharp({ create: {
    width: 690, height: 304, channels: 4, background: '#f5edd9',
  } }).composite([...contact, { input: labels }]).png().toBuffer());
  await save('assets/fish/reviews/habitats-320.png', await transparent(size * 2, size)
    .composite([{ input: ponds.river, left: 0, top: 0 }, { input: ponds.sea, left: size, top: 0 }]).png().toBuffer());
  await save('assets/fish/atlas.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  await save('src/content/fish-visuals.json', Buffer.from(JSON.stringify(visuals, null, 2) + '\n'));
  await save('src/content/fish-habitats.json', Buffer.from(JSON.stringify(habitats, null, 2) + '\n'));
}

if (process.argv.includes('--habitats-only')) {
  await exportHabitats(JSON.parse(await readFile(at('assets/fish/atlas.json'), 'utf8')));
  console.log('Exported river/sea backgrounds, water regions and habitat fallback scenes; existing fish frames and selection icons were retained.');
  process.exit(0);
}

const pondSource = await readFile(at(layout.sources.pond));
const pond = await sharp(pondSource).resize(size, size, { kernel: 'nearest', fit: 'cover' }).png().toBuffer();
const pondWebP = await sharp(pond).webp({ quality: 70, effort: 5 }).toBuffer();
await save('assets/fish/pond.png', pond);
await save('public/art/fish/pond.webp', pondWebP);
const manifest = {
  sceneSize: size, fishRoot: layout.fishRoot,
  pond: { source: layout.sources.pond, sourceSha256: hash(pondSource), path: 'public/art/fish/pond.webp', sha256: hash(pondWebP) },
  sources: {}, species: {},
};
const visuals = {};
const contactFallbacks = [];
const contactIcons = [];
const ids = Object.keys(layout.species);

for (const [index, id] of ids.entries()) {
  const definition = layout.species[id];
  const sourcePath = 'assets/fish/' + layout.sources.sheets[definition.source];
  const source = await readFile(at(sourcePath));
  const metadata = await sharp(source).metadata();
  manifest.sources[definition.source] = {
    path: sourcePath, sha256: hash(source), width: metadata.width, height: metadata.height,
    normalized: `assets/fish/normalized/${id}.png`,
  };
  const atlasLayers = [];
  const normalizedLayers = [];
  const stages = [];
  const frames = [];
  for (const [stageIndex, stage] of definition.stages.entries()) {
    const recorded = { name: stage.name, stageScale: stage.stageScale, sourceCanvas: stage.sourceCanvas, anchor: stage.anchor, frames: [] };
    for (let frame = 0; frame < 4; frame += 1) {
      const png = await registeredFrame(source, metadata, stage, frame);
      const framePath = `assets/fish/animals/${id}/${stage.name}-${frame}.png`;
      await save(framePath, png);
      frames.push(png);
      atlasLayers.push({ input: png, left: frame * size, top: stageIndex * size });
      normalizedLayers.push({ input: png, left: frame * size, top: stageIndex * size });
      recorded.frames.push({
        source: definition.source, cell: stage.cells[frame], sourceAnchor: stage.sourceAnchors[frame],
        anchorMethod: stage.anchor.definition, fixedAnchor: [fishRegistration.x, fishRegistration.y],
        path: framePath, sha256: hash(png),
      });
    }
    stages.push(recorded);
  }
  const atlas = await transparent(size * 4, size * 3).composite(atlasLayers).png().toBuffer();
  const atlasWebP = await sharp(atlas).webp({ quality: 70, effort: 5 }).toBuffer();
  await save(`assets/fish/atlases/${id}.png`, atlas);
  await save(`public/art/fish/animals/${id}.webp`, atlasWebP);
  await save(`assets/fish/normalized/${id}.png`, await transparent(size * 5, size * 5)
    .composite(normalizedLayers).png().toBuffer());

  // Alpha bounds are used only to fill the separate mature selection icon.
  // Animation registration above never depends on silhouette bounds.
  const mature = frames[8];
  const raw = await sharp(mature).ensureAlpha().raw().toBuffer();
  const bounds = alphaBounds(raw, size, size);
  const cut = await sharp(mature).extract(bounds).png().toBuffer();
  const ratio = 84 / Math.max(bounds.width, bounds.height);
  const iconFish = await sharp(cut).resize(Math.max(1, Math.round(bounds.width * ratio)),
    Math.max(1, Math.round(bounds.height * ratio)), { kernel: 'nearest', fit: 'fill' }).png().toBuffer();
  const iconMeta = await sharp(iconFish).metadata();
  const icon = await transparent(96, 96).composite([{
    input: iconFish, left: Math.floor((96 - iconMeta.width) / 2), top: Math.floor((96 - iconMeta.height) / 2),
  }]).png().toBuffer();
  const iconWebP = await sharp(icon).webp({ quality: 70, effort: 5 }).toBuffer();
  await save(`assets/fish/icons/${id}.png`, icon);
  await save(`public/ui-icons/fish-${id}.webp`, iconWebP);

  const group = fishSizeLayouts[definition.size];
  const animals = [];
  for (const placement of group.placements) {
    const scale = group.scale * placement.depth;
    animals.push({
      input: await sharp(mature).resize(Math.round(size * scale), Math.round(size * scale), { kernel: 'nearest' }).png().toBuffer(),
      left: Math.round(placement.x - fishRegistration.x * scale), top: Math.round(placement.y - fishRegistration.y * scale),
    });
  }
  const fallback = await sharp(pond).composite(animals).png().toBuffer();
  const fallbackWebP = await sharp(fallback).webp({ quality: 70, effort: 5 }).toBuffer();
  await save(`assets/source/art/scene-${id}.png`, fallback);
  await save(`public/art/scene-${id}.webp`, fallbackWebP);
  manifest.species[id] = {
    subject: definition.subject, size: definition.size, stages,
    atlas: { path: `public/art/fish/animals/${id}.webp`, sha256: hash(atlasWebP), width: size * 4, height: size * 3 },
    animalIcon: { path: `public/ui-icons/fish-${id}.webp`, sourceStage: 'mature', sourceFrame: 0, sha256: hash(iconWebP) },
    fallback: { source: `assets/source/art/scene-${id}.png`, sourceSha256: hash(fallback), sourceStage: 'mature', sourceFrame: 0,
      path: `public/art/scene-${id}.webp`, sha256: hash(fallbackWebP), layout: definition.size },
  };
  visuals[id] = { stages: 3, size: definition.size };

  // Static source/asset handoff sheets, never a running-game preview.
  const guide = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="960">`
    + Array.from({ length: 3 }, (_, row) => Array.from({ length: 4 }, (_, col) =>
      `<path d="M${col * size} ${row * size + fishRegistration.y}h320" stroke="#b9c7b4" stroke-width="1"/>`
      + `<circle cx="${col * size + fishRegistration.x}" cy="${row * size + fishRegistration.y}" r="2" fill="#af694f"/>`).join('')).join('')
    + '</svg>');
  const guided = await sharp(atlas).flatten({ background: '#f5edd9' }).composite([{ input: guide }]).png().toBuffer();
  const stageSheet = await sharp(guided).resize(640, 480, { kernel: 'nearest' }).png().toBuffer();
  await save(`assets/fish/reviews/${id}-stages.png`, stageSheet);
  contactFallbacks.push({ input: await sharp(fallback).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(),
    left: index % 5 * 138 + 4, top: Math.floor(index / 5) * 152 + 4 });
  contactIcons.push({ input: await sharp(icon).resize(32, 32, { kernel: 'nearest' }).png().toBuffer(),
    left: index % 5 * 64 + 16, top: Math.floor(index / 5) * 58 + 4 });
}

const labels = (width, height, stepX, stepY, yOffset) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
  + ids.map((id, index) => `<text x="${index % 5 * stepX + stepX / 2}" y="${Math.floor(index / 5) * stepY + yOffset}" text-anchor="middle" fill="#263b2a" font-family="sans-serif" font-size="12">${id}</text>`).join('') + '</svg>');
await save('assets/fish/reviews/fallback-130.png', await sharp({ create: {
  width: 690, height: 304, channels: 4, background: '#f5edd9',
} }).composite([...contactFallbacks, { input: labels(690, 304, 138, 152, 148) }]).png().toBuffer());
await save('assets/fish/reviews/selection-32.png', await sharp({ create: {
  width: 320, height: 116, channels: 4, background: '#f5edd9',
} }).composite([...contactIcons, { input: labels(320, 116, 64, 58, 51) }]).png().toBuffer());
await save('assets/fish/atlas.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
await save('src/content/fish-visuals.json', Buffer.from(JSON.stringify(visuals, null, 2) + '\n'));
await exportHabitats(manifest);
console.log(`Exported ${ids.length} fish species: three stages, four drawn idle frames per stage, shared pond, live selection icons and matching fallback scenes.`);
