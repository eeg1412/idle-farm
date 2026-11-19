import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Format conversion only. All visible artwork is independently drawn by imagegen.
// Keep original generated PNGs and alpha; never synthesize characters or lettering.
const sourceRoot = 'assets/source/art/loading';
const outputRoot = 'public/art/loading';
const definitions = [
  { name: 'background', width: 768, height: 1366, artWidth: 768, artHeight: 1366, transparent: false },
  { name: 'managers', width: 1024, height: 1344, artWidth: 976, artHeight: 1296, transparent: true },
  { name: 'logo', width: 1024, height: 400, artWidth: 940, artHeight: 376, transparent: true },
];
await mkdir(outputRoot, { recursive: true });
const records = [];
const only = process.argv.find((value) => value.startsWith('--only='))?.slice(7);
const previous = JSON.parse(await readFile(`${sourceRoot}/export-manifest.json`, 'utf8'));
for (const definition of definitions) {
  const { name, width, height, artWidth, artHeight, transparent } = definition;
  if (only && only !== name) { records.push(previous.layers.find((layer) => layer.name === name)); continue; }
  const source = `${sourceRoot}/${name}.png`;
  const output = `${outputRoot}/${name}.webp`;
  const sourceBytes = await readFile(source);
  const metadata = await sharp(sourceBytes).metadata();
  const scale = transparent ? Math.min(artWidth / metadata.width, artHeight / metadata.height)
    : Math.max(width / metadata.width, height / metadata.height);
  const resizedWidth = Math.round(metadata.width * scale);
  const resizedHeight = Math.round(metadata.height * scale);
  // Supply one axis only: sharp derives the other from the source aspect ratio.
  let image = sharp(sourceBytes).resize({ width: resizedWidth, kernel: sharp.kernel.nearest });
  if (transparent) {
    image = image.ensureAlpha().extend({
      left: Math.floor((width - resizedWidth) / 2),
      right: Math.ceil((width - resizedWidth) / 2),
      top: Math.floor((height - resizedHeight) / 2),
      bottom: Math.ceil((height - resizedHeight) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  } else {
    image = image.extract({ left: Math.floor((resizedWidth - width) / 2), top: Math.floor((resizedHeight - height) / 2), width, height });
  }
  const { data, info } = await image.webp({ quality: 70, alphaQuality: 100, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  await writeFile(output, data);
  records.push({
    name, source, output,
    sourceSize: [metadata.width, metadata.height], outputSize: [info.width, info.height],
    sourceHasAlpha: metadata.hasAlpha, alphaPreserved: transparent,
    artSize: [resizedWidth, resizedHeight],
    padding: transparent ? [Math.floor((width - resizedWidth) / 2), Math.floor((height - resizedHeight) / 2)] : [0, 0],
    sampling: 'nearest', fit: transparent ? 'contain' : 'cover', quality: 70, alphaQuality: 100,
    sourceSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    outputSha256: createHash('sha256').update(data).digest('hex'),
    bytes: info.size,
    prompt: `${sourceRoot}/${name}.prompt.txt`,
  });
}
await writeFile(`${sourceRoot}/export-manifest.json`, `${JSON.stringify({
  generator: 'built-in image_gen.imagegen',
  command: `node scripts/export-loading-art.mjs${only ? ` --only=${only}` : ''}`,
  generationRecord: `${sourceRoot}/generation.json`,
  referenceRecord: `${sourceRoot}/references.json`,
  layers: records,
}, null, 2)}\n`);
console.log(JSON.stringify(records.map(({ output, outputSize, bytes }) => ({ output, outputSize, bytes })), null, 2));
