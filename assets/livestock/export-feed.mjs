import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { livestockFeedLayout, livestockLayout } from '../../src/view/livestock-layout.js';

const root = 'assets/livestock';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const transparent = (width, height) => sharp({ create: { width, height, channels: 4,
  background: { r: 0, g: 0, b: 0, alpha: 0 } } });
export const livestockFeedRegistrationPath = root + '/feed-registration-v8.json';

// This is the feed-only production path. V7 portraits, 80 animal frames,
// atlases, canonical products and economic data are read-only inputs.
export async function exportLivestockFeed() {
  const registration = JSON.parse(await readFile(livestockFeedRegistrationPath, 'utf8'));
  const texture = registration.texture;
  const original = await readFile(root + '/' + registration.source);
  const content = await sharp(original).extract(registration.sourceRectangle)
    .resize(texture.bounds.width, texture.bounds.height, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
  const png = await transparent(...texture.size).composite([{ input: content,
    left: texture.bounds.x, top: texture.bounds.y }]).png().toBuffer();
  const publishedPath = 'public/' + texture.path.replace(/^\.\//, '');
  await writeFile(root + '/' + registration.png, png);
  await sharp(png).webp({ quality: 70, alphaQuality: 100 }).toFile(publishedPath);
  const published = await readFile(publishedPath);
  const layout = JSON.parse(await readFile(root + '/layout.json', 'utf8'));
  const manifest = JSON.parse(await readFile(root + '/atlas.json', 'utf8'));
  const visuals = JSON.parse(await readFile('src/content/livestock-visuals.json', 'utf8'));
  const barn = await readFile('public/art/livestock/barn.webp');
  const size = layout.sceneSize;
  const evidenceRoot = root + '/feed-evidence/' + registration.presentationRevision;
  await mkdir(evidenceRoot, { recursive: true });

  async function scene(id, stageIndex, animal) {
    const group = livestockLayout(id);
    const layers = [];
    for (const placement of group.placements) {
      const factor = group.animalScale * placement.depth;
      const left = placement.x - layout.animalRoot.x * factor;
      const top = placement.y - layout.animalRoot.y * factor;
      const geometry = livestockFeedLayout(layout.species[id].stages[stageIndex].feeding, texture, group.animalScale);
      const { shadow } = geometry;
      const shadowSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><g transform="translate(${left} ${top}) scale(${factor})"><ellipse cx="${shadow.x}" cy="${shadow.y}" rx="${shadow.radiusX}" ry="${shadow.radiusY}" fill="#2b2118" opacity="${shadow.alpha}"/></g></svg>`);
      layers.push({ input: shadowSvg, left: 0, top: 0 });
      layers.push({ input: await sharp(published).resize(Math.round(geometry.width * factor), Math.round(geometry.height * factor),
        { kernel: 'nearest' }).png().toBuffer(), left: Math.round(left + geometry.x * factor), top: Math.round(top + geometry.y * factor) });
      layers.push({ input: await sharp(animal).resize(Math.round(size * factor), Math.round(size * factor),
        { kernel: 'nearest' }).png().toBuffer(), left: Math.round(left), top: Math.round(top) });
    }
    return sharp(barn).composite(layers).png().toBuffer();
  }

  const panels = [], labels = [], maturePanels = [], matureLabels = [];
  let row = 0, matureRow = 0;
  for (const [id, species] of Object.entries(layout.species)) {
    if (registration.species?.[id]) continue;
    const atlas = await readFile('public/art/livestock/animals/' + id + '.webp');
    for (const [stageIndex, stage] of species.stages.entries()) {
      for (let frame = 0; frame < layout.idleFrames; frame++) {
        const animal = await sharp(atlas).extract({ left: frame * size, top: stageIndex * size, width: size, height: size }).png().toBuffer();
        const card = await scene(id, stageIndex, animal);
        const small = await sharp(card).resize(130, 130, { kernel: 'nearest' }).png().toBuffer();
        panels.push({ input: small, left: frame * 134 + 2, top: row * 149 + 2 });
        if (stageIndex === species.stages.length - 1) {
          maturePanels.push({ input: small, left: frame * 134 + 2, top: matureRow * 149 + 2 });
          if (frame === 0) {
            const sourcePath = 'assets/source/art/scene-' + id + '.png';
            const targetPath = 'public/art/scene-' + id + '.webp';
            await writeFile(sourcePath, card);
            await sharp(card).webp({ quality: 70, alphaQuality: 100 }).toFile(targetPath);
            manifest.species[id].facilityScene = { ...manifest.species[id].facilityScene,
              source: sourcePath, path: targetPath, sourceSha256: digest(card),
              sha256: digest(await readFile(targetPath)), feedTexture: texture,
              feedLayers: 'V8 shallow cool-rim mixed feed tray and separate light shadow; shared livestockFeedLayout; no feed in animal textures',
              retained: false, refreshed: true };
          }
        }
      }
      labels.push(`<text x="268" y="${row * 149 + 145}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#263b2a">${id} ${stage.name}: new tray feed 0 / 1 / 2 / 3</text>`);
      row++;
      if (stageIndex === species.stages.length - 1) {
        matureLabels.push(`<text x="268" y="${matureRow * 149 + 145}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#263b2a">${id} ${stage.name}: new tray feed 0 / 1 / 2 / 3</text>`);
        matureRow++;
      }
    }
    visuals[id].feedTexture = texture;
  }
  async function contact(file, contactPanels, contactLabels, rows) {
    const labelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="536" height="${rows * 149}">${contactLabels.join('')}</svg>`);
    await sharp({ create: { width: 536, height: rows * 149, channels: 4, background: '#f5ead8' } })
      .composite([...contactPanels, { input: labelSvg }]).png().toFile(evidenceRoot + '/' + file);
  }
  await contact('feeding-130-all-stages.png', panels, labels, row);
  await contact('feeding-130-mature.png', maturePanels, matureLabels, matureRow);
  await sharp({ create: { width: 128, height: 64, channels: 4, background: '#f5ead8' } })
    .composite([{ input: published }]).png().toFile(evidenceRoot + '/feed-normal.png');
  await sharp(evidenceRoot + '/feed-normal.png').resize(512, 256, { kernel: 'nearest' }).png()
    .toFile(evidenceRoot + '/feed-normal-enlarged.png');
  layout.feedRegistration = livestockFeedRegistrationPath;
  layout.feedTexture = texture;
  manifest.feedRegistration = livestockFeedRegistrationPath;
  manifest.feedPresentationRevision = registration.presentationRevision;
  manifest.feedTexture = { ...texture, source: registration.source, png: registration.png,
    sourceSha256: digest(original), sha256: digest(published), sourceRectangle: registration.sourceRectangle };
  await writeFile(root + '/layout.json', JSON.stringify(layout, null, 2) + '\n');
  await writeFile(root + '/atlas.json', JSON.stringify(manifest, null, 2) + '\n');
  await writeFile('src/content/livestock-visuals.json', JSON.stringify(visuals, null, 2) + '\n');
  console.log('Produced V8 feed texture, ten persistent fallbacks and all twenty feeding stages at 130px; animal and choice art untouched.');
}
