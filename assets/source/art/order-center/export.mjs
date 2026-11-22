import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const fromSource = name => fileURLToPath(new URL(name, import.meta.url));
const fromPublic = name => fromSource('../../../../public/' + name);

// Source rectangles exclude the near-transparent fringe outside the illustrated silhouettes.
async function alphaBounds(image, region, threshold) {
  const { data, info } = await image.clone().extract(region).extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < threshold) continue;
      left = Math.min(x, left);
      top = Math.min(y, top);
      right = Math.max(x, right);
      bottom = Math.max(y, bottom);
    }
  }
  return { left: left + region.left, top: top + region.top, width: right - left + 1, height: bottom - top + 1 };
}

async function exportSprite(source, target, region, widthLimit, heightLimit, canvasWidth, canvasHeight, centerY, quality) {
  const image = sharp(fromSource(source));
  const bounds = await alphaBounds(image, region, 12);
  const { data, info } = await image.extract(bounds)
    .resize(widthLimit, heightLimit, { fit: 'inside', kernel: 'nearest' }).png().toBuffer({ resolveWithObject: true });
  await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: '#00000000' } })
    .composite([{ input: data, left: Math.floor((canvasWidth - info.width) / 2), top: Math.floor(centerY - info.height / 2) }])
    .webp({ quality, alphaQuality: 100 }).toFile(fromPublic(target));
  console.log(target, bounds, [info.width, info.height]);
}

const full = { left: 0, top: 0, width: 1536, height: 1024 };
await exportSprite('building.png', 'art/estate/orders.webp', full, 470, 282, 536, 320, 168, 90);
await exportSprite('pendant.png', 'art/estate/orders-motion.webp', full, 92, 84, 92, 84, 42, 90);
const iconKeys = ['menu-orders', 'tech-order-expansion', 'tech-order-negotiation', 'tech-order-premium'];
for (const [index, key] of iconKeys.entries()) {
  const cell = { left: index % 2 * 627, top: Math.floor(index / 2) * 627, width: 627, height: 627 };
  await exportSprite('icon-grid.png', 'ui-icons/' + key + '.webp', cell, 80, 80, 96, 96, 48, 70);
}
