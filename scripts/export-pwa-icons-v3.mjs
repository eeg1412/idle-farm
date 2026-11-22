import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// The independently drawn foreground remains transparent and unchanged.
// All icon backgrounds come from export-config.json, never from the artwork.
const project = new URL('../', import.meta.url);
const sourceDirectory = new URL('assets/source/art/pwa-icon-v3/', project);
const sourceUrl = new URL('foreground.png', sourceDirectory);
const configUrl = new URL('export-config.json', sourceDirectory);
const source = await readFile(sourceUrl);
const configBytes = await readFile(configUrl);
const config = JSON.parse(configBytes.toString('utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (!/^#[\da-f]{6}$/i.test(config.backgroundColor)) {
  throw new Error('backgroundColor must be an opaque six-digit hexadecimal color.');
}
if (!Number.isInteger(config.layoutAlphaThreshold) || config.layoutAlphaThreshold < 1 || config.layoutAlphaThreshold > 255
    || !Number.isInteger(config.layoutPaddingPixels) || config.layoutPaddingPixels < 0) {
  throw new Error('Layout requires an alpha threshold from 1 to 255 and nonnegative integer pixel padding.');
}
for (const [name, value] of [
  ['regular.maximumExtentFraction', config.regular.maximumExtentFraction],
  ['maskable.safeZoneDiameterFraction', config.maskable.safeZoneDiameterFraction],
  ['maskable.radiusMarginFraction', config.maskable.radiusMarginFraction],
]) {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    throw new Error(`${name} must be greater than zero and less than one.`);
  }
}

// Faint exterior pixels do not determine layout. This threshold only measures
// the artwork; it never changes alpha in the original or cropped image.
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width;
let top = info.height;
let right = -1;
let bottom = -1;
const alphaBounds = { left: info.width, top: info.height, right: -1, bottom: -1 };
let transparentPixels = 0;
let translucentPixels = 0;
for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
    if (alpha === 0) {
      transparentPixels += 1;
      continue;
    }
    if (alpha < 255) translucentPixels += 1;
    alphaBounds.left = Math.min(alphaBounds.left, x);
    alphaBounds.top = Math.min(alphaBounds.top, y);
    alphaBounds.right = Math.max(alphaBounds.right, x);
    alphaBounds.bottom = Math.max(alphaBounds.bottom, y);
    if (alpha < config.layoutAlphaThreshold) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
}
if (right < left || transparentPixels === 0) {
  throw new Error('foreground.png must contain visible artwork and fully transparent background pixels.');
}
const padding = config.layoutPaddingPixels;
left = Math.max(0, left - padding);
top = Math.max(0, top - padding);
right = Math.min(info.width - 1, right + padding);
bottom = Math.min(info.height - 1, bottom + padding);
const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
const center = { x: left + bounds.width / 2, y: top + bounds.height / 2 };
let visibleRadius = 0;
for (let y = top; y <= bottom; y += 1) {
  for (let x = left; x <= right; x += 1) {
    if (data[(y * info.width + x) * info.channels + info.channels - 1] < config.layoutAlphaThreshold) continue;
    // Include pixel corners and the source-pixel contour margin.
    const dx = Math.max(Math.abs(x - padding - center.x), Math.abs(x + 1 + padding - center.x));
    const dy = Math.max(Math.abs(y - padding - center.y), Math.abs(y + 1 + padding - center.y));
    visibleRadius = Math.max(visibleRadius, Math.hypot(dx, dy));
  }
}

const icons = new URL('public/icons/', project);
await mkdir(icons, { recursive: true });
const outputs = [];
const regularBuffers = new Map();
async function exportPng(size, maskable = false) {
  const regularScale = size * config.regular.maximumExtentFraction / Math.max(bounds.width, bounds.height);
  const safeRadius = size * config.maskable.safeZoneDiameterFraction / 2;
  const maskableScale = safeRadius * (1 - config.maskable.radiusMarginFraction) / visibleRadius;
  const scale = maskable ? Math.min(regularScale, maskableScale) : regularScale;
  const targetWidth = Math.max(1, Math.floor(bounds.width * scale));
  const targetHeight = Math.max(1, Math.floor(bounds.height * scale));
  const resized = await sharp(source).extract(bounds)
    .resize(targetWidth, targetHeight, { fit: 'inside', kernel: 'lanczos3' })
    .png().toBuffer({ resolveWithObject: true });
  const position = {
    left: Math.floor((size - resized.info.width) / 2),
    top: Math.floor((size - resized.info.height) / 2),
  };
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: config.backgroundColor },
  }).composite([{ input: resized.data, ...position, blend: 'over' }])
    .removeAlpha().png().toBuffer();
  const path = `public/icons/manor-v3-${maskable ? 'maskable-' : ''}${size}.png`;
  await writeFile(new URL(path, project), png);
  outputs.push({
    path, width: size, height: size, alpha: false,
    bytes: png.length, sha256: sha256(png),
    composition: {
      sourceBounds: bounds, requestedScale: scale,
      resizedWidth: resized.info.width, resizedHeight: resized.info.height,
      ...position,
      ...(maskable ? { safeRadius, radiusMarginFraction: config.maskable.radiusMarginFraction } : {}),
    },
  });
  return png;
}

for (const size of [32, 48, 180, 192, 512]) {
  regularBuffers.set(size, await exportPng(size));
}
await exportPng(512, true);

// ICO stores the exact same 32px and 48px PNG buffers as the standalone files.
const icoSizes = [32, 48];
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
  const png = regularBuffers.get(size);
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}
const ico = Buffer.concat([header, ...icoSizes.map((size) => regularBuffers.get(size))]);
await writeFile(new URL('public/favicon.ico', project), ico);
outputs.push({ path: 'public/favicon.ico', sizes: icoSizes, bytes: ico.length, sha256: sha256(ico) });
const manifest = {
  source: {
    path: 'assets/source/art/pwa-icon-v3/foreground.png',
    bytes: source.length, sha256: sha256(source),
    width: info.width, height: info.height,
    transparentPixels, translucentPixels, alphaBounds,
    layoutAlphaThreshold: config.layoutAlphaThreshold, layoutPaddingPixels: padding,
    layoutBounds: bounds, layoutCenter: center, layoutVisibleRadius: visibleRadius,
  },
  config: {
    path: 'assets/source/art/pwa-icon-v3/export-config.json',
    sha256: sha256(configBytes), ...config,
  },
  conversion: {
    command: 'node scripts/export-pwa-icons-v3.mjs',
    sharpVersion: sharp.versions.sharp,
    kernel: 'lanczos3', blend: 'source-over', background: 'opaque solid fill',
    sourceModified: false,
  },
  outputs,
};
await writeFile(new URL('export-manifest.json', sourceDirectory), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Exported ${outputs.length} PWA files from the transparent foreground.`);
