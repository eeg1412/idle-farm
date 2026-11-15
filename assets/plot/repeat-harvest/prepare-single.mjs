// Extract an unchanged mature target cell for a targeted image_gen correction.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const directory = fileURLToPath(new URL('./', import.meta.url));
const [sheetName, id, name] = process.argv.slice(2);
const sheet = JSON.parse(await readFile(path.join(directory, sheetName + '.json'), 'utf8'));
const original = sheet.cells.find((cell) => cell.id === id);
if (!original) throw new Error('The original mature cell is missing: ' + id);
const image = await sharp(path.join(directory, sheetName + '.png')).extract(original.cell).png().toBuffer();
await writeFile(path.join(directory, name + '.png'), image);
const cell = {
  ...original,
  row: 0, column: 0,
  cell: { left: 0, top: 0, width: sheet.cellSize, height: sheet.cellSize },
  sourcePlacement: {
    ...original.sourcePlacement,
    left: original.sourcePlacement.left - original.cell.left,
    top: original.sourcePlacement.top - original.cell.top,
    rootX: original.sourcePlacement.rootX - original.cell.left,
    rootY: original.sourcePlacement.rootY - original.cell.top,
  },
};
await writeFile(path.join(directory, name + '.json'), JSON.stringify({
  purpose: 'Targeted exact mature-body correction; remove harvested parts only',
  columns: 1, rows: 1, cellSize: sheet.cellSize,
  image: 'assets/plot/repeat-harvest/' + name + '.png', cells: [cell],
}, null, 2) + '\n');
console.log('Prepared independent original mature edit target: ' + id);
