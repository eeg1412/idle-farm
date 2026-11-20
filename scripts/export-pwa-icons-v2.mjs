import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Format conversion and proportional resampling of the independently drawn source.
// Do not reconstruct building or wheat artwork in this exporter.
const project = new URL('../', import.meta.url);
const source = fileURLToPath(new URL('assets/source/art/pwa-icon-v2/original.png', project));
const icons = new URL('public/icons/', project);
await mkdir(icons, { recursive: true });

const sizes = [32, 48, 180, 192, 512];
const buffers = new Map();
for (const size of sizes) {
  const png = await sharp(source).resize(size, size, { kernel: 'lanczos3' }).removeAlpha().png().toBuffer();
  buffers.set(size, png);
  await writeFile(new URL(`manor-v2-${size}.png`, icons), png);
}

// The maskable composition and naturally extended green background are drawn
// in a separate built-in image_gen edit, not assembled or painted by code.
const maskableSource = fileURLToPath(new URL('assets/source/art/pwa-icon-v2/maskable-original.png', project));
await sharp(maskableSource).resize(512, 512, { kernel: 'lanczos3' }).removeAlpha()
  .png().toFile(fileURLToPath(new URL('manor-v2-maskable-512.png', icons)));

// ICO directory containing the exact exported PNG images at 32 and 48 pixels.
const icoSizes = [32, 48];
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
  const png = buffers.get(size);
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}
await writeFile(new URL('public/favicon.ico', project), Buffer.concat([header, ...icoSizes.map((size) => buffers.get(size))]));
