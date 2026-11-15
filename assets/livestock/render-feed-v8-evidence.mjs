import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
const root = 'assets/livestock';
const registration = JSON.parse(await readFile(root + '/feed-registration-v8.json', 'utf8'));
const layout = JSON.parse(await readFile(root + '/layout.json', 'utf8'));
const evidence = root + '/feed-evidence/' + registration.presentationRevision;
const ids = Object.keys(layout.species);
const layers = [], labels = [];
for (const [index, id] of ids.entries()) {
  const left = index % 5 * 134 + 2, top = Math.floor(index / 5) * 149 + 2;
  layers.push({ input: await sharp('public/art/scene-' + id + '.webp').resize(130, 130, { kernel: 'nearest' }).png().toBuffer(), left, top });
  labels.push(`<text x="${left + 65}" y="${top + 143}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#263b2a">${id} fallback WebP</text>`);
}
const rows = Math.ceil(ids.length / 5);
const labelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="670" height="${rows * 149}">${labels.join('')}</svg>`);
await sharp({ create: { width: 670, height: rows * 149, channels: 4, background: '#f5ead8' } })
  .composite([...layers, { input: labelSvg }]).png().toFile(evidence + '/fallback-published-130.png');
const original = await readFile(root + '/' + registration.source);
for (const [name, background] of [['raw-deep-normal', '#31404b'], ['raw-light-normal', '#f5ead8']]) {
  await sharp({ create: { width: registration.sourceSize[0], height: registration.sourceSize[1], channels: 4, background } })
    .composite([{ input: original }]).png().toFile(evidence + '/' + name + '.png');
}
console.log('Produced ordinary image review evidence from the frozen V8 original and published fallbacks.');
