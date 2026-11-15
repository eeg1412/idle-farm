// Preserve a delivered offline review montage; does not execute game code.
import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const version = process.argv[2];
const source = resolve(root, 'assets/livestock/choice-feed-evidence', process.argv[3] ?? '');
const mature = resolve(source, 'feeding-130-four-frames.png');
const allStages = resolve(source, 'feeding-130-all-stages.png');
await copyFile(mature, resolve(output, `${version}-feeding-130-four-frames.png`));
await copyFile(allStages, resolve(output, `${version}-feeding-130-all-stages.png`));
for (const [id, row] of [['L01', 0], ['L02', 1], ['L03', 2], ['L04', 3], ['L07', 6], ['L10', 9]]) {
  await sharp(mature).extract({ left: 2, top: row * 149 + 2, width: 130, height: 130 }).resize(520, 520, { kernel: 'nearest' }).png().toFile(resolve(output, `${version}-${id}-card-nearest4x.png`));
}
for (const [name, input, rows] of [['small-adult-130', mature, [0, 2, 6]], ['rabbit-stages-130', allStages, [8, 9, 10]], ['large-adult-130', mature, [1, 3, 9]]]) {
  const pieces = [];
  for (const [index, row] of rows.entries()) {
    pieces.push({ input: await sharp(input).extract({ left: 2, top: row * 149 + 2, width: 130, height: 130 }).png().toBuffer(), left: index * 134, top: 0 });
  }
  await sharp({ create: { width: 398, height: 130, channels: 4, background: '#fff8eb' } }).composite(pieces).png().toFile(resolve(output, `${version}-${name}.png`));
}
