import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { miningCargoRect, miningFrame, sampleMiningAnimation } from '../src/view/mining-layout.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const visuals = JSON.parse(await fs.readFile(path.join(root, 'src/content/mining-visuals.json'), 'utf8'));
const output = path.join(root, 'assets/mining/keyframes');
await fs.mkdir(output, { recursive: true });
const source = (relative) => path.join(root, 'public', relative.replace(/^public\//, ''));
const background = await fs.readFile(source(visuals.background.path));
const foreground = await fs.readFile(source(visuals.foreground.path));
const cart = await fs.readFile(source(visuals.cart.path));
const duration = 9000;
const session = { id: 'M01', startedAt: 0, durationMs: duration };
const batch = { id: 'M01', start: 0, end: duration };
// Sample the travel poses while the cart is crossing the opening's fade range.
const times = [
  ['first-entry-start', 0], ['first-entry-middle', 1400], ['fully-inside', 2000],
  ['inside-wait', 4500], ['outbound-start', 7000], ['outbound-middle', 7600],
  ['loaded-station', 9000], ['cargo-half-150ms', 9150], ['empty-cart-300ms', 9300],
  ['return-start-1300ms', 10300], ['return-middle', 11700], ['return-inside', 12300],
  ['next-outbound', 17000], ['cross-cycle-loaded', 18000],
];

async function layer(input, rect, alpha = 1) {
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const resized = await sharp(input).resize(width, height, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer();
  if (alpha !== 1) for (let index = 3; index < resized.length; index += 4) resized[index] = Math.round(resized[index] * alpha);
  // Crop negative scene-edge coordinates before handing them to sharp.composite.
  const left = Math.round(rect.x), top = Math.round(rect.y);
  const x = Math.max(0, left), y = Math.max(0, top);
  const clippedWidth = Math.min(visuals.sceneSize, left + width) - x;
  const clippedHeight = Math.min(visuals.sceneSize, top + height) - y;
  if (clippedWidth <= 0 || clippedHeight <= 0) return null;
  const clipped = await sharp(resized, { raw: { width, height, channels: 4 } })
    .extract({ left: x - left, top: y - top, width: clippedWidth, height: clippedHeight }).png().toBuffer();
  return { input: clipped, left: x, top: y };
}

const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const evidence = { sceneSize: visuals.sceneSize, duration, algorithm: 'src/view/mining-layout.js',
  sha256: { background: hash(background), foreground: hash(foreground), cart: hash(cart),
    visuals: hash(await fs.readFile(path.join(root, 'src/content/mining-visuals.json'))),
    algorithm: hash(await fs.readFile(path.join(root, 'src/view/mining-layout.js'))) }, rows: [] };
const scenarios = Object.entries(visuals.items).map(([id, item]) => ({ id, item, prefix: id,
  times, actualDuration: duration, getBatch: (clock) => {
    const start = Math.floor(clock / duration) * duration;
    return { id, start, end: start + duration };
  } }));
scenarios.push({ id: 'M01', item: visuals.items.M01, prefix: 'M01-fast', actualDuration: 1000,
  times: [0, 1400, 2000, 2650, 3300, 3900, 5300, 5450, 5600, 6600, 8000, 8600, 9600, 10600]
    .map((clock, index) => [times[index][0], clock]),
  getBatch: (clock) => { const start = Math.floor(clock / 1000) * 1000; return { id: 'M01', start, end: start + 1000 }; } });
scenarios.push({ id: 'M01', item: visuals.items.M01, prefix: 'M01-speed-change', actualDuration: 9000,
  times: [9000, 9150, 9300, 10300, 11700, 12300, 13000, 13600, 15000, 15150, 15300, 16300, 17700, 18300]
    .map((clock, index) => [`speed-${index + 1}`, clock]),
  getBatch: (clock) => { const start = 9000 + Math.floor((clock - 9000) / 6000) * 6000;
    return { id: 'M01', start, end: start + 6000 }; } });
for (const { id, item, prefix, times: scenarioTimes, actualDuration, getBatch } of scenarios) {
  const icon = await fs.readFile(source(item.icon));
  const metadata = await sharp(icon).metadata();
  const frames = [];
  evidence.sha256[prefix + '-icon'] = hash(icon);
  for (const [name, clock] of scenarioTimes) {
    const activeBatch = getBatch(clock);
    const sample = sampleMiningAnimation({ session: { ...session, id, durationMs: actualDuration }, batch: activeBatch, clock });
    const frame = miningFrame(visuals, sample);
    const layers = [await layer(foreground, frame.foreground)];
    if (frame.cart.alpha > 0) layers.push(await layer(cart, frame.cart, frame.cart.alpha));
    if (frame.cargo.alpha > 0) layers.push(await layer(icon,
      miningCargoRect(frame.cargo, metadata.width, metadata.height), frame.cargo.alpha));
    const png = await sharp(background).composite(layers.filter(Boolean)).png().toBuffer();
    for (const size of [320, 130]) {
      await sharp(png).resize(size, size, { kernel: 'nearest' }).png()
        .toFile(path.join(output, `${prefix}-${name}-${size}.png`));
    }
    frames.push(png);
    evidence.rows.push({ id, scenario: prefix, name, clock, batch: activeBatch, sample, frame });
  }
  for (const size of [320, 130]) {
    const tiles = await Promise.all(frames.map(async (input, index) => ({
      input: await sharp(input).resize(size, size, { kernel: 'nearest' }).png().toBuffer(),
      left: (index % 7) * size, top: Math.floor(index / 7) * size,
    })));
    await sharp({ create: { width: size * 7, height: size * 2, channels: 4, background: '#18201c' } })
      .composite(tiles).png().toFile(path.join(output, `${prefix}-contact-${size}.png`));
  }
}
await fs.writeFile(path.join(output, 'keyframes.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(`Mining keyframes: ${Object.keys(visuals.items).length} minerals × ${times.length} poses × 320/130 px → assets/mining/keyframes`);
