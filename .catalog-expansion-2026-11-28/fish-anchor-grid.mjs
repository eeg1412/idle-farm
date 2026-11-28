import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const destination = '.catalog-expansion-2026-11-28/fish-coordinate-evidence';
await mkdir(destination, { recursive: true });

for (const requested of process.argv.slice(2)) {
  const [id, version = '1'] = requested.split('v');
  const source = await readFile(`assets/fish/raw/${id}-idle-v${version}.png`);
  const { data, info: { width, height } } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const image = await sharp(source).flatten({ background: '#eeeee6' }).png().toBuffer();
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] >= 128) rows[y]++;
  }
  const groups = counts => {
    const spans = [];
    for (const [index, count] of counts.entries()) {
      if (count < 2) continue;
      const previous = spans.at(-1);
      if (previous && index - previous[1] < 7) previous[1] = index;
      else spans.push([index, index]);
    }
    return spans.filter(([start, end]) => end - start > 20);
  };
  const stages = groups(rows);
  const placements = stages.map(([top, bottom]) => {
    const cols = new Array(width).fill(0);
    for (let y = top; y <= bottom; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= 128) cols[x]++;
    }
    return { y: [top, bottom], x: groups(cols) };
  });
  const grid = [];
  const coordinates = [];
  for (let x = 0; x < width; x += 10) {
    const major = x % 50 === 0;
    grid.push(`<path d="M ${x} 0 V 820" stroke-opacity="${major ? 0.52 : 0.19}"/>`);
    if (major) for (let y = 20; y < 820; y += 80) coordinates.push(`<text x="${x + 1}" y="${y}" fill="#5e255a">${x}</text>`);
  }
  for (let y = 0; y < 820; y += 10) {
    const major = y % 50 === 0;
    grid.push(`<path d="M 0 ${y} H ${width}" stroke-opacity="${major ? 0.52 : 0.19}"/>`);
    if (major) for (let x = 5; x < width; x += 100) coordinates.push(`<text x="${x}" y="${y - 1}" fill="#265e45">${y}</text>`);
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.min(820, height)}">
    <g stroke="#9f4a94" stroke-width="1">${grid.join('')}</g>
    <g font-size="11" font-family="monospace" stroke="#fff" stroke-width="2" paint-order="stroke">${coordinates.join('')}</g>
  </svg>`);
  const cropped = await sharp(image).extract({ left: 0, top: 0, width, height: Math.min(820, height) }).png().toBuffer();
  await sharp(cropped).composite([{ input: svg }]).png().toFile(path.join(destination, `${id}.png`));
  await writeFile(path.join(destination, `${id}-spans.json`), JSON.stringify({ width, height, placements }, null, 2) + '\n');
  console.log(id, JSON.stringify({ width, height, placements }));
}
