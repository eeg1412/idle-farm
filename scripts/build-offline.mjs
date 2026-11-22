import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createAssetManifest, listFiles, manifestFile, platformFiles } from './asset-manifest.mjs';

// All paths are relative to dist/ and use forward slashes, so filters and the service-worker
// asset list behave the same on Windows.

// The bundled manifest must describe exactly the public/ files this build publishes.
const bundled = JSON.parse(await readFile(manifestFile, 'utf8'));
const { manifest, isUnpublished } = await createAssetManifest();
const entries = Object.entries(manifest);
if (Object.keys(bundled).length !== entries.length ||
    entries.some(([source, published]) => bundled[source] !== published)) {
  throw new Error(`${manifestFile} 与 public/ 不一致，请重新运行 npm run build。`);
}

// Vite copies public/ into dist/ under the original names. Remove the files the runtime never
// requests (legacy crop atlases, superseded loading layers; see scripts/asset-manifest.mjs) and
// give every other non-fixed public file its content-hashed name. public/ sources stay untouched.
await Promise.all((await listFiles('dist')).filter(isUnpublished).map((path) => rm(`dist/${path}`)));
for (const [source, published] of entries) await rename(`dist/${source}`, `dist/${published}`);

// PixiJS chunks only fetched on demand (no WebGL, or accessibility enabled) stay in dist but are not precached.
const onDemandChunk = /^assets\/(?:WebGPURenderer|CanvasRenderer|AccessibilitySystem)-[\w-]+\.js$/;

const hashed = new Set(entries.map(([, published]) => published));
const published = (await listFiles('dist')).filter((path) => path !== 'sw.js').sort();
// The shell and its dependencies are precached; hashed public images load on demand, except the
// estate map art, which the default page can request before the worker claims its first client.
const assets = published.filter((path) => path !== 'index.html' && !platformFiles.has(path) &&
  !onDemandChunk.test(path) && (!hashed.has(path) || path.startsWith('art/estate/')))
  .map((path) => './' + path);
const hashedAssets = [...hashed].sort().map((path) => './' + path);

// One cache name per published content: worker source plus every published file except index.html.
const worker = await readFile(new URL('../src/platform/site-service-worker.js', import.meta.url), 'utf8');
const hash = createHash('sha256');
hash.update(worker);
for (const path of published) {
  if (path === 'index.html') continue;
  hash.update(path + '\0');
  hash.update(await readFile(`dist/${path}`));
}
const cache = 'idle-farm-' + hash.digest('hex').slice(0, 16);
await writeFile('dist/sw.js', `const cacheName = ${JSON.stringify(cache)};\n` +
  `const assets = ${JSON.stringify(assets)};\nconst hashedAssets = ${JSON.stringify(hashedAssets)};\n` + worker);

// src/main.js registers ./sw.js?v=<cache> from this tag.
const html = await readFile('dist/index.html', 'utf8');
if (!html.includes('</head>')) throw new Error('dist/index.html 缺少 </head>，无法写入构建版本。');
await writeFile('dist/index.html',
  html.replace('</head>', `  <meta name="idle-farm-build" content="${cache}">\n  </head>`));
