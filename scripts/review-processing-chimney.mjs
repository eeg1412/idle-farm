// Static image composition only; this script does not import or run the game.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = 'assets/source/art/estate-weather/reviews';
const paths = {
  processing: 'public/art/estate/processing.webp',
  refining: 'public/art/estate/refining.webp',
  smoke: 'public/art/estate/refining-motion.webp',
  wheel: 'public/art/estate/processing-motion.webp',
};
const images = {};
for (const [name, path] of Object.entries(paths)) images[name] = await readFile(path);
const smokeSource = await sharp(images.smoke).metadata();
const wheelSource = await sharp(images.wheel).metadata();
const sites = [
  { id: 'processing', origin: [330, 32], phaseOffset: 0, widthRatio: 0.37, footprintWidth: 472 },
  { id: 'refining', origin: [403, 37], phaseOffset: 1.1, widthRatio: 0.34, footprintWidth: 478 },
];
const style = { size: 88, rise: 20, drift: 12, period: 4.4, puffCount: 3, peakAlpha: 0.62 };
const mapWidth = 390 * 3;
const smokeUnit = mapWidth * 0.37 / 472;
const times = [0, 0.55, 1.1, 1.65];
const panelWidth = 536;
const panelHeight = 460;
const topPadding = 140;
const panels = [];
const labels = [];

for (const [row, time] of times.entries()) {
  for (const [column, site] of sites.entries()) {
    const unit = mapWidth * site.widthRatio / site.footprintWidth;
    const buildingWidth = Math.round(536 * unit);
    const buildingHeight = Math.round(320 * unit);
    const left = Math.round((panelWidth - buildingWidth) / 2);
    const layers = [{
      input: await sharp(images[site.id]).resize(buildingWidth, buildingHeight).png().toBuffer(),
      left, top: topPadding,
    }];
    if (site.id === 'processing') {
      const wheelScale = 152 * unit / Math.max(wheelSource.width, wheelSource.height);
      const width = Math.round(wheelSource.width * wheelScale);
      const height = Math.round(wheelSource.height * wheelScale);
      layers.push({
        input: await sharp(images.wheel).resize(width, height).png().toBuffer(),
        left: Math.round(left + 348 * unit - width / 2),
        top: Math.round(topPadding + 223 * unit - height / 2),
      });
    }
    for (let part = 0; part < style.puffCount; part += 1) {
      const phase = ((time + site.phaseOffset + part * style.period / style.puffCount) % style.period) / style.period;
      const scale = style.size * smokeUnit / Math.max(smokeSource.width, smokeSource.height) * (0.53 + phase * 0.47);
      const width = Math.round(smokeSource.width * scale);
      const height = Math.round(smokeSource.height * scale);
      const pixels = await sharp(images.smoke).resize(width, height).ensureAlpha().raw().toBuffer();
      const alpha = style.peakAlpha * Math.sin(Math.PI * phase);
      for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = Math.round(pixels[offset] * alpha);
      layers.push({
        input: await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer(),
        left: Math.round(left + site.origin[0] * unit + phase * style.drift * smokeUnit - width * 0.28),
        top: Math.round(topPadding + site.origin[1] * unit - phase * style.rise * smokeUnit - height * 0.93),
      });
    }
    panels.push(await sharp({ create: {
      width: panelWidth, height: panelHeight, channels: 4, background: '#d5e0c5',
    } }).composite(layers).png().toBuffer());
    labels.push(`<text x="${column * panelWidth + 12}" y="${row * panelHeight + 24}">t=${time.toFixed(2)}s ${site.id}; offset ${site.phaseOffset.toFixed(1)}s; 3 puffs</text>`);
  }
}

const annotations = Buffer.from(`<svg width="${panelWidth * 2}" height="${panelHeight * times.length}" xmlns="http://www.w3.org/2000/svg">
  <g fill="#24362a" font-family="sans-serif" font-size="17">${labels.join('')}</g>
</svg>`);
const proof = await sharp({ create: {
  width: panelWidth * 2, height: panelHeight * times.length, channels: 4, background: '#d5e0c5',
} }).composite([
  ...panels.map((input, index) => ({ input, left: index % 2 * panelWidth, top: Math.floor(index / 2) * panelHeight })),
  { input: annotations, left: 0, top: 0 },
]).png().toBuffer();

// Dividing the image scale by three restores both buildings' 390px-map dimensions.
const smallWidth = Math.round(panelWidth / 3);
const smallHeight = Math.round(panelHeight / 3);
const reduced = [];
for (const panel of panels) reduced.push(await sharp(panel).resize(smallWidth, smallHeight).png().toBuffer());
const actualSize = await sharp({ create: {
  width: smallWidth * 2, height: smallHeight * times.length, channels: 4, background: '#d5e0c5',
} }).composite(reduced.map((input, index) => ({ input, left: index % 2 * smallWidth, top: Math.floor(index / 2) * smallHeight }))).png().toBuffer();

await mkdir(directory, { recursive: true });
for (const [name, bytes] of [['processing-refining-continuous-phases.png', proof], ['processing-refining-390px-size.png', actualSize]]) {
  const path = `${directory}/${name}`;
  await writeFile(path, bytes);
  console.log(`${path} sha256=${createHash('sha256').update(bytes).digest('hex')}`);
}
for (const [name, path] of Object.entries(paths)) {
  console.log(`${path} sha256=${createHash('sha256').update(images[name]).digest('hex')}`);
}
