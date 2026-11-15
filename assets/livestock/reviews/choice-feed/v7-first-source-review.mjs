// Normal-background source review of the first four generated V7 candidates.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const generated = 'C:/Users/eeg14/.codex/generated_images/01a1df1c-95c5-7071-a4d3-b3ac29677033';
const originals = [
  ['L01', 'exec-3a9a9c5d-e512-4575-b23b-1233fa28ee2d.png'],
  ['L02', 'exec-22e7a2bb-8621-4462-beff-25dfe3e811a5.png'],
  ['L03', 'exec-d02a1f71-fd71-45d8-82fe-ced4f9821f31.png'],
  ['L04', 'exec-42a6ddfe-db4c-4e04-89c1-5c778d751911.png'],
];
const pieces = [];
for (const [row, [id, filename]] of originals.entries()) {
  const inputs = [resolve(root, `assets/livestock/animals/${id}/adult-0.png`), resolve(root, `assets/livestock/animals/${id}/adult-3.png`), resolve(generated, filename)];
  pieces.push({ input: Buffer.from(`<svg width="528" height="20"><text x="3" y="15" font-family="sans-serif" font-size="12" fill="#332a21">${id}: current 0 / current 3 / new source light / new source dark</text></svg>`), left: 0, top: row * 156 });
  for (const [column, path] of [...inputs, inputs.at(-1)].entries()) {
    const background = column === 3 ? '#373b42' : '#fff8eb';
    const sprite = await sharp(path).trim().resize(128, 128, { fit: 'contain', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } }).flatten({ background }).png().toBuffer();
    pieces.push({ input: sprite, left: column * 132, top: row * 156 + 22 });
  }
  await sharp(resolve(generated, filename)).resize(320, 320, { kernel: 'nearest' }).flatten({ background: '#373b42' }).png().toFile(resolve(output, `v7-${id}-first-raw-normal.png`));
}
await sharp({ create: { width: 528, height: 624, channels: 4, background: '#fff8eb' } }).composite(pieces).png().toFile(resolve(output, 'v7-first-four-source-comparison.png'));
