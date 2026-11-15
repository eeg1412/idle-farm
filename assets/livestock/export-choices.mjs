import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

export const livestockChoiceRegistrationPath = 'assets/livestock/choice-registration-v7.json';
const root = 'assets/livestock';
const transparent = (width, height) => sharp({ create: { width, height, channels: 4,
  background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function portrait(input, size = 96) {
  const content = await sharp(input).trim().resize(size - 8, size - 8, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
  const metadata = await sharp(content).metadata();
  return transparent(size, size).composite([{ input: content,
    left: Math.floor((size - metadata.width) / 2), top: Math.floor((size - metadata.height) / 2) }]).png().toBuffer();
}

// Production-only image conversion. This module never updates animation,
// feed, fallback scenes, products or game state.
export async function exportLivestockChoices() {
  const registration = JSON.parse(await readFile(livestockChoiceRegistrationPath, 'utf8'));
  const evidenceRoot = root + '/choice-evidence/v7';
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(root + '/icons', { recursive: true });
  const records = {};
  const chooser96 = [], chooser32 = [], comparison = [], labels = [];
  const entries = Object.entries(registration.species);
  for (const [index, [id, source]] of entries.entries()) {
    const original = await readFile(root + '/' + source.source);
    const pixels = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      if (pixels.data[offset + 3] < registration.alphaIsolation.threshold) pixels.data.fill(0, offset, offset + 4);
      else pixels.data[offset + 3] = 255;
    }
    const isolated = await sharp(pixels.data, { raw: pixels.info }).extract(source.rectangle).png().toBuffer();
    const icon = await portrait(isolated);
    await writeFile(root + '/icons/' + id + '.png', icon);
    const publishedPath = 'public/ui-icons/livestock-' + id + '.webp';
    await sharp(icon).webp({ quality: 70, alphaQuality: 100 }).toFile(publishedPath);
    const published = await readFile(publishedPath);
    const publishedPng = await sharp(published).png().toBuffer();
    const small = await sharp(published).resize(32, 32, { kernel: 'nearest' }).png().toBuffer();
    records[id] = { path: publishedPath, source: source.source, sourceSha256: hash(original),
      registration: livestockChoiceRegistrationPath, pose: 'head-up', stage: source.stage,
      sourceCell: source.sourceCell, sourceRectangle: source.rectangle,
      generatedWith: source.generatedWith, referenceFrames: source.referenceFrames,
      promptFile: registration.promptFile,
      crop: { method: 'New image_gen neutral portrait from this ID current V5 adult/mature frames 0 and 3; alpha isolation, transparent trim and nearest inside 88px. Rejected V4 portraits are not consumed.' } };
    chooser96.push({ input: icon, left: index % 5 * 112 + 8, top: Math.floor(index / 5) * 112 + 8 });
    chooser32.push({ input: small, left: index % 5 * 48 + 8, top: Math.floor(index / 5) * 48 + 8 });
    for (const [column, reference] of source.referenceFrames.entries()) comparison.push({
      input: await portrait(await readFile(reference.path)), left: column * 128 + 16, top: index * 144 + 8 });
    comparison.push({ input: icon, left: 2 * 128 + 16, top: index * 144 + 8 });
    comparison.push({ input: publishedPng, left: 3 * 128 + 16, top: index * 144 + 8 });
    comparison.push({ input: small, left: 4 * 128 + 48, top: index * 144 + 40 });
    labels.push(`<text x="320" y="${index * 144 + 128}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#263b2a">${id}: V5 frame 0 / V5 frame 3 / new PNG / WebP 96 / WebP 32</text>`);
  }
  const rows = Math.ceil(entries.length / 5);
  await sharp({ create: { width: 560, height: rows * 112, channels: 4, background: '#fff9ee' } })
    .composite(chooser96).png().toFile(evidenceRoot + '/selection-icons.png');
  const smallChooser = await sharp({ create: { width: 240, height: rows * 48, channels: 4, background: '#fff9ee' } })
    .composite(chooser32).png().toBuffer();
  await writeFile(evidenceRoot + '/selection-icons-32.png', smallChooser);
  await sharp(smallChooser).resize(960, rows * 192, { kernel: 'nearest' }).png().toFile(evidenceRoot + '/selection-icons-32-enlarged.png');
  const labelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${entries.length * 144}">${labels.join('')}</svg>`);
  await sharp({ create: { width: 640, height: entries.length * 144, channels: 4, background: '#f5ead8' } })
    .composite([...comparison, { input: labelSvg }]).png().toFile(evidenceRoot + '/current-animation-new-portrait-published.png');
  for (const file of ['selection-icons.png', 'selection-icons-32.png', 'selection-icons-32-enlarged.png']) {
    await writeFile(root + '/' + file, await readFile(evidenceRoot + '/' + file));
  }
  const layoutPath = root + '/layout.json';
  const layout = JSON.parse(await readFile(layoutPath, 'utf8'));
  layout.choiceRegistration = livestockChoiceRegistrationPath;
  await writeFile(layoutPath, JSON.stringify(layout, null, 2) + '\n');
  const manifestPath = root + '/atlas.json';
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.choiceRegistration = livestockChoiceRegistrationPath;
  for (const [id, record] of Object.entries(records)) manifest.species[id].animalIcon = record;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { registration, records };
}
