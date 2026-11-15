// Production crop/registration of an edited source grid; no plant is repainted.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = fileURLToPath(new URL('./', import.meta.url));
const [sourceName, editedName, onlyList] = process.argv.slice(2);
if (!sourceName || !editedName) throw new Error('Provide source-grid and edited-grid names without extensions');
const source = JSON.parse(await readFile(path.join(directory, sourceName + '.json'), 'utf8'));
const only = onlyList?.split(',');
const layoutPath = path.join(root, 'assets/plot/crop-layout.json');
const layout = JSON.parse(await readFile(layoutPath, 'utf8'));
layout.repeatBare ??= {};
const editedMetadata = await sharp(path.join(directory, editedName + '.png')).metadata();
const normalized = await sharp(path.join(directory, editedName + '.png'))
  .resize(source.columns * source.cellSize, source.rows * source.cellSize, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
await writeFile(path.join(directory, editedName + '-normalized.png'), normalized);
for (const cell of source.cells) {
  if (only && !only.includes(cell.id)) continue;
  const image = await sharp(normalized).extract(cell.cell).png().toBuffer();
  const { data: pixels, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (pixels[(y * info.width + x) * 4 + 3] >= 150) bottom = y;
  }
  if (bottom < 0) throw new Error('The edited source cell contains no plant: ' + cell.id);
  let leftSupport = info.width; let rightSupport = -1;
  for (let y = Math.max(0, bottom - 4); y <= bottom; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (pixels[(y * info.width + x) * 4 + 3] < 150) continue;
    leftSupport = Math.min(leftSupport, x); rightSupport = Math.max(rightSupport, x);
  }
  const sourcePath = 'assets/plot/crops/' + cell.id + '/bare.png';
  await mkdir(path.dirname(path.join(root, sourcePath)), { recursive: true });
  await writeFile(path.join(root, sourcePath), image);
  await writeFile(path.join(directory, cell.id + '-' + editedName + '.png'), image);
  layout.repeatBare[cell.id] = {
    sourcePath,
    anchorX: (leftSupport + rightSupport + 1) / 2,
    anchorY: bottom,
    expectedRoot: { x: cell.sourcePlacement.rootX - cell.cell.left, y: cell.sourcePlacement.rootY - cell.cell.top },
    anchorMethod: 'One-time opaque anatomical base registration in the edited independent source, never a runtime bbox measurement',
    scaleToMature: 1 / cell.sourcePlacement.scale,
    method: 'shared-mature-source-placement',
    sourceSheet: source.image,
    editedSheet: 'assets/plot/repeat-harvest/' + editedName + '.png',
    normalizedSheet: 'assets/plot/repeat-harvest/' + editedName + '-normalized.png',
    cellSpace: 'normalizedSheet',
    normalization: { sourceWidth: editedMetadata.width, sourceHeight: editedMetadata.height,
      width: source.columns * source.cellSize, height: source.rows * source.cellSize },
    cell: cell.cell,
  };
}
await writeFile(layoutPath, JSON.stringify(layout, null, 2) + '\n');
console.log('Cropped ' + source.cells.filter((cell) => !only || only.includes(cell.id)).length
  + ' adult bare plants; preserved source-cell anchors and mature relative scale.');
