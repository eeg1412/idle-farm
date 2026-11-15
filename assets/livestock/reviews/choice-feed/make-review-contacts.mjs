// Offline image-review contacts only. Does not execute the game or check assets.
import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const label = (text) => Buffer.from(`<svg width="108" height="16"><text x="0" y="12" font-family="sans-serif" font-size="12" fill="#332a21">${text}</text></svg>`);
const source = (path) => resolve(root, path);

const choices = [];
for (let index = 0; index < 10; index += 1) {
  const id = `L${String(index + 1).padStart(2, '0')}`;
  const x = index * 112 + 8;
  for (const [row, path] of [[0, `assets/livestock/icons/${id}.png`], [1, `public/ui-icons/livestock-${id}.webp`]]) {
    choices.push({ input: label(`${id} ${row ? 'WebP' : 'PNG'}`), left: x, top: row * 118 });
    choices.push({ input: await sharp(source(path)).png().toBuffer(), left: x, top: row * 118 + 18 });
  }
}
await sharp({ create: { width: 1120, height: 236, channels: 4, background: '#fff8eb' } }).composite(choices).png().toFile(resolve(output, 'choices-png-webp-96.png'));
for (const basename of ['selection-icons-32.png', 'selection-icons-32-enlarged.png']) {
  await copyFile(source(`assets/livestock/${basename}`), resolve(output, basename));
}

const feedPairs = [];
for (const [index, entry] of [['PNG', 'assets/livestock/feed.png'], ['WebP', 'public/art/livestock/feed.webp']].entries()) {
  feedPairs.push({ input: label(`${entry[0]} 128x64`), left: 8, top: index * 100 });
  for (const [col, background] of ['#e6d9be', '#373b42'].entries()) {
    feedPairs.push({ input: await sharp(source(entry[1])).flatten({ background }).png().toBuffer(), left: 8 + col * 160, top: index * 100 + 22 });
  }
}
await sharp({ create: { width: 340, height: 200, channels: 4, background: '#fff8eb' } }).composite(feedPairs).png().toFile(resolve(output, 'feed-png-webp-normal-backgrounds.png'));
for (const [index, background] of ['#e6d9be', '#373b42'].entries()) {
  await sharp(source('assets/livestock/raw/compound-feed-v6.png')).resize(460, 214, { kernel: 'nearest' }).flatten({ background }).png().toFile(resolve(output, `feed-source-${index}.png`));
}

// R01/R02 are immutable delivered snapshots. Use snapshot-revision.mjs for a
// new explicitly named revision instead of replacing historical evidence.
