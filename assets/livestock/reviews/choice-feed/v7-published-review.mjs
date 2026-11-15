// Offline final V7 published-image contacts and immutable delivered snapshots.
import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const pieces = [];
for (let index = 0; index < 10; index += 1) {
  const id = `L${String(index + 1).padStart(2, '0')}`;
  const left = index % 5 * 208;
  const top = Math.floor(index / 5) * 128;
  pieces.push({ input: Buffer.from(`<svg width="208" height="20"><text x="3" y="15" font-family="sans-serif" font-size="12" fill="#fff8eb">${id} PNG / published WebP 96</text></svg>`), left, top });
  for (const [column, path] of [resolve(root, `assets/livestock/icons/${id}.png`), resolve(root, `public/ui-icons/livestock-${id}.webp`)].entries()) {
    pieces.push({ input: await sharp(path).flatten({ background: '#373b42' }).png().toBuffer(), left: left + column * 104 + 4, top: top + 22 });
  }
}
await sharp({ create: { width: 1040, height: 256, channels: 4, background: '#373b42' } }).composite(pieces).png().toFile(resolve(output, 'v7-png-webp-96-dark.png'));
for (const name of ['current-animation-new-portrait-published.png', 'selection-icons.png', 'selection-icons-32.png', 'selection-icons-32-enlarged.png']) {
  await copyFile(resolve(root, 'assets/livestock/choice-evidence/v7', name), resolve(output, `v7-${name}`));
}
