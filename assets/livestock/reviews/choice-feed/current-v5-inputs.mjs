// Offline reference contact of the exact current animal PNG inputs for V7.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const layout = JSON.parse(await readFile(resolve(root, 'assets/livestock/layout.json'), 'utf8'));
const pieces = [];
for (const [index, [id, species]] of Object.entries(layout.species).entries()) {
  const stage = species.stages.at(-1).name;
  const left = index % 5 * 208;
  const top = Math.floor(index / 5) * 128;
  const caption = `${id} ${stage} 0 / 3`;
  pieces.push({ input: Buffer.from(`<svg width="208" height="20"><text x="4" y="15" font-family="sans-serif" font-size="12" fill="#332a21">${caption}</text></svg>`), left, top });
  for (const [column, frame] of [0, 3].entries()) {
    const sprite = await sharp(resolve(root, 'assets/livestock/animals', id, `${stage}-${frame}.png`)).trim().resize(96, 96, { fit: 'contain', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    pieces.push({ input: sprite, left: left + column * 104 + 4, top: top + 22 });
  }
}
await sharp({ create: { width: 1040, height: Math.ceil(Object.keys(layout.species).length / 5) * 128, channels: 4, background: '#fff8eb' } }).composite(pieces).png().toFile(resolve(output, 'v7-current-v5-input-pairs.png'));
