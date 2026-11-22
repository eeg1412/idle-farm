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

// The opening now requests one complete scene and the original logo. Keep the
// superseded three-layer art in public/source only, outside the published build.
await Promise.all(['background', 'managers'].map((name) => rm(`dist/art/loading/${name}.webp`, { force: true })));

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
// The default map can load before the worker claims its first client. Match estate-map.js's request URL.
const estateAssetVersions = { background: 7, fish: 2, field: 2, 'field-motion': 2, research: 2, 'research-motion': 3, operations: 2, 'atmosphere/animal-clouds-v1': 2 };
for (const path of imagePaths) {
  if (!path.startsWith('dist/art/estate/')) continue;
  const asset = path.slice('dist/art/estate/'.length, -'.webp'.length);
  const version = estateAssetVersions[asset] ?? 1;
  assets.push(`./${path.slice(5)}?game=1&v=${version}`);
}
await writeFile('dist/sw.js',
  `const cacheName = ${JSON.stringify(cache)};\nconst assets = ${JSON.stringify(assets)};\n` + worker);
