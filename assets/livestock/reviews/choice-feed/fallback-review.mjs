// Pair source and published fallback images at the requested offline 130px size.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const label = (id) => Buffer.from(`<svg width="130" height="16"><text x="3" y="12" font-family="sans-serif" font-size="12" fill="#332a21">${id}</text></svg>`);
for (const [name, folder, extension] of [['source', 'assets/source/art', 'png'], ['published', 'public/art', 'webp']]) {
  const pieces = [];
  for (let index = 0; index < 10; index += 1) {
    const id = `L${String(index + 1).padStart(2, '0')}`;
    const x = index % 5 * 134;
    const y = Math.floor(index / 5) * 150;
    pieces.push({ input: label(id), left: x, top: y });
    pieces.push({ input: await sharp(resolve(root, folder, `scene-${id}.${extension}`)).resize(130, 130, { kernel: 'nearest' }).png().toBuffer(), left: x, top: y + 16 });
  }
  await sharp({ create: { width: 666, height: 296, channels: 4, background: '#fff8eb' } }).composite(pieces).png().toFile(resolve(output, `r03-fallback-${name}-130.png`));
}
