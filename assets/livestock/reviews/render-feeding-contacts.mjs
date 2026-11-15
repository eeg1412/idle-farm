// Static review deliverables from the actual published WebP; never runs a game.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const layout = JSON.parse(await fs.readFile('assets/livestock/layout.json', 'utf8'));
const rows = [];
for (const [id, species] of Object.entries(layout.species)) {
  const bytes = await fs.readFile(`public/art/livestock/animals/${id}.webp`);
  for (const [index, stage] of species.stages.entries()) {
    const normal = await sharp(bytes).extract({ left: 0, top: index * 320, width: 1280, height: 320 })
      .flatten({ background: '#f5ead8' }).png().toBuffer();
    rows.push({ id, stage: stage.name, mature: index === species.stages.length - 1,
      input: await sharp(normal).resize(640, 160, { kernel: 'nearest' }).png().toBuffer() });
  }
}
for (const [filename, selected] of [
  ['feeding-webp-opaque-all-stages.png', rows],
  ['feeding-webp-opaque-mature.png', rows.filter((row) => row.mature)],
]) {
  const height = 174 * selected.length;
  const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}">`
    + selected.map((row, index) => `<text x="320" y="${index * 174 + 172}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#263b2a">${row.id} ${row.stage} actual published WebP</text>`).join('') + '</svg>');
  await sharp({ create: { width: 640, height, channels: 4, background: '#f5ead8' } })
    .composite([...selected.map((row, index) => ({ input: row.input, left: 0, top: index * 174 })), { input: labels }])
    .png().toFile(`assets/livestock/reviews/feeding-v5/${filename}`);
}
