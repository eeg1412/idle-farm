import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';

// All paths use forward slashes so filters and the service-worker asset list behave the same on Windows.
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}

// Legacy field atlases are only loaded for C01 while it is not an individual-plant crop (see loadPlotTextures).
// Remove the unused copies from the build output before hashing; public/ sources stay untouched.
const cropVisuals = JSON.parse(await readFile(new URL('../src/content/crop-visuals.json', import.meta.url), 'utf8'));
const cropAtlasDir = 'dist/art/plot/crops';
const cropAtlasPattern = /^(C\d+)(?:-front)?\.webp$/;
const loadsCropAtlas = (id) => id === 'C01' && cropVisuals[id]?.mode !== 'individual';
const cropAtlasFiles = await readdir(cropAtlasDir).catch(() => []);
await Promise.all(cropAtlasFiles.map((name) => {
  const id = cropAtlasPattern.exec(name)?.[1];
  if (!id || !(id in cropVisuals) || loadsCropAtlas(id)) return null;
  return rm(`${cropAtlasDir}/${name}`);
}));

// PixiJS chunks only fetched on demand (no WebGL, or accessibility enabled) stay in dist but are not precached.
const onDemandChunk = /^dist\/assets\/(?:WebGPURenderer|CanvasRenderer|AccessibilitySystem)-[\w-]+\.js$/;

const published = (await files('dist')).filter((path) => path !== 'dist/sw.js').sort();
const paths = published.filter((path) => !path.endsWith('.webp') &&
  !onDemandChunk.test(path));
const imagePaths = published.filter((path) => path.endsWith('.webp') &&
  ['dist/art/', 'dist/ui-icons/', 'dist/wiki/icons/'].some((directory) => path.startsWith(directory)));
const worker = await readFile(new URL('../src/platform/site-service-worker.js', import.meta.url), 'utf8');
const hash = createHash('sha256');
hash.update(worker);
for (const path of [...paths, ...imagePaths]) {
  hash.update(path + '\0');
  hash.update(await readFile(path));
}
const cache = 'idle-farm-' + hash.digest('hex').slice(0, 16);
const assets = paths.filter((path) => path !== 'dist/index.html').map((path) => './' + path.slice(5));
await writeFile('dist/sw.js',
  `const cacheName = ${JSON.stringify(cache)};\nconst assets = ${JSON.stringify(assets)};\n` + worker);
