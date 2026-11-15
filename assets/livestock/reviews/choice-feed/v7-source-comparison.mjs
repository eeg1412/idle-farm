// Review only: compare current V5 input pairs against each actual new V7 source.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const registration = JSON.parse(await readFile(resolve(root, 'assets/livestock/choice-registration-v7.json'), 'utf8'));
const pieces = [];
for (const [row, [id, species]] of Object.entries(registration.species).entries()) {
  const inputs = species.referenceFrames.map(({ path }) => resolve(root, path));
  const rawSource = resolve(root, 'assets/livestock', species.source);
  inputs.push(rawSource, rawSource);
  pieces.push({ input: Buffer.from(`<svg width="528" height="20"><text x="3" y="15" font-family="sans-serif" font-size="12" fill="#332a21">${id}: current 0 / current 3 / V7 source light / V7 source dark</text></svg>`), left: 0, top: row * 156 });
  for (const [column, path] of inputs.entries()) {
    const background = column === 3 ? '#373b42' : '#fff8eb';
    const sprite = await sharp(path).trim().resize(128, 128, { fit: 'contain', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } }).flatten({ background }).png().toBuffer();
    pieces.push({ input: sprite, left: column * 132, top: row * 156 + 22 });
  }
  await sharp(rawSource).resize(320, 320, { fit: 'contain', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } }).flatten({ background: '#373b42' }).png().toFile(resolve(output, `v7-${id}-raw-normal.png`));
}
await sharp({ create: { width: 528, height: Object.keys(registration.species).length * 156, channels: 4, background: '#fff8eb' } }).composite(pieces).png().toFile(resolve(output, 'v7-current-to-new-source.png'));
