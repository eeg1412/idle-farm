import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}
const published = (await files('dist')).filter((path) => path !== 'dist/sw.js').sort();
const paths = published.filter((path) => !path.startsWith('dist/wiki/') && !path.endsWith('.webp'));
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
