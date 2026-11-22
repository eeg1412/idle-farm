import { writeFile } from 'node:fs/promises';
import { createAssetManifest, manifestFile } from './asset-manifest.mjs';

// Runs before `vite build`: the manifest is bundled into the game JS (src/view/asset-url.js).
const { manifest } = await createAssetManifest();

// Every path the runtime can build from catalog and visual data must be a hashed published file.
// A missing entry would otherwise only surface as a failed image request in production.
const { runtimeAssetPaths } = await import('../src/view/canvas-ui.js');
const missing = [...runtimeAssetPaths()].filter((path) => !Object.hasOwn(manifest, path)).sort();
if (missing.length) {
  throw new Error(`运行时资源不在发布清单中（${missing.length} 项）：\n${missing.join('\n')}`);
}

await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`asset manifest: ${Object.keys(manifest).length} files -> ${manifestFile}`);
