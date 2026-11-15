// Source-art preparation only. One approved mature plant per isolated 5x5 cell;
// this input/edit grid is never a runtime field layer.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = fileURLToPath(new URL('./', import.meta.url));
const [name, idList] = process.argv.slice(2);
if (!name || !idList) throw new Error('Provide a source batch name and comma-separated stable crop IDs');
const ids = idList.split(',');
if (ids.length > 25) throw new Error('A source batch contains at most 25 single plants');
const visuals = JSON.parse(await readFile(path.join(root, 'src/content/crop-visuals.json'), 'utf8'));
const cellSize = 320;
const columns = 5;
const rows = 5;
const composites = [];
const cells = [];
for (const [index, id] of ids.entries()) {
  const stage = visuals[id].stages[3];
  const x = index % columns * cellSize;
  const y = Math.floor(index / columns) * cellSize;
  const scale = Math.min(1, 136 / Math.max(stage.anchorX, stage.width - stage.anchorX), 264 / stage.anchorY);
  const width = Math.max(1, Math.round(stage.width * scale));
  const height = Math.max(1, Math.round(stage.height * scale));
  const left = Math.round(x + 160 - stage.anchorX * scale);
  const top = Math.round(y + 296 - stage.anchorY * scale);
  const input = await sharp(path.join(root, 'assets/plot/plants', id, 'mature.png'))
    .resize(width, height, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
  composites.push({ input, left, top });
  cells.push({ id, row: Math.floor(index / columns), column: index % columns,
    cell: { left: x, top: y, width: cellSize, height: cellSize },
    source: stage.source, originalStage: stage,
    sourcePlacement: { left, top, width, height, scale, rootX: x + 160, rootY: y + 296 } });
}
await mkdir(directory, { recursive: true });
const imagePath = path.join(directory, name + '.png');
await sharp({ create: { width: columns * cellSize, height: rows * cellSize, channels: 4, background: '#00000000' } })
  .composite(composites).png().toFile(imagePath);
await writeFile(path.join(directory, name + '.json'), JSON.stringify({
  purpose: 'Precision editing source: remove only harvested parts; preserve every adult plant and registered cell/root',
  columns, rows, cellSize, image: 'assets/plot/repeat-harvest/' + name + '.png', cells,
}, null, 2) + '\n');
console.log('Prepared mature editing source ' + imagePath + ': ' + ids.join(', '));
