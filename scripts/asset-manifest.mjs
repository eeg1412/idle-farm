import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

// Shared rules for the content-hashed public/ manifest. Paths are relative to public/ (and dist/)
// and always use forward slashes, so the same rules hold on Windows and POSIX.
export const manifestFile = 'src/content/asset-manifest.json';

export async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = prefix + entry.name;
    return entry.isDirectory() ? listFiles(`${dir}/${entry.name}`, path + '/') : [path];
  }))).flat();
}

// Pages, the browser and the installed PWA request these by their exact names.
const fixedFiles = new Set(['index.html', 'sw.js', 'manifest.webmanifest', 'favicon.ico',
  // Cloudflare Pages configuration files; never served as game assets.
  '_headers', '_redirects', '_routes.json']);
const fixedDirectories = ['icons/'];
export const platformFiles = new Set(['_headers', '_redirects', '_routes.json']);

function localReference(reference) {
  if (typeof reference !== 'string' || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return undefined;
  return reference.split(/[?#]/, 1)[0].replace(/^(?:\.\/|\/)+/, '');
}

// index.html and manifest.webmanifest reference their files by fixed URLs.
async function fixedReferences() {
  const references = new Set();
  const html = await readFile('index.html', 'utf8');
  for (const [, reference] of html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/g)) {
    const path = localReference(reference);
    if (path) references.add(path);
  }
  const webManifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
  const icons = [...(webManifest.icons ?? []), ...(webManifest.screenshots ?? []),
    ...(webManifest.shortcuts ?? []).flatMap((shortcut) => shortcut.icons ?? [])];
  for (const icon of icons) {
    const path = localReference(icon?.src);
    if (path) references.add(path);
  }
  return references;
}

// Public files the runtime never requests. They are excluded from the manifest and removed from dist.
async function unpublishedRule() {
  // Legacy field atlases are only loaded for C01 while it is not an individual-plant crop
  // (see loadPlotTextures in src/view/canvas-ui.js).
  const cropVisuals = JSON.parse(await readFile('src/content/crop-visuals.json', 'utf8'));
  const cropAtlasPattern = /^art\/plot\/crops\/(C\d+)(?:-front)?\.webp$/;
  const loadsCropAtlas = (id) => id === 'C01' && cropVisuals[id]?.mode !== 'individual';
  // The opening requests one complete scene and the original logo; the superseded
  // three-layer art stays in public/ only as source history.
  const retiredLoadingArt = new Set(['art/loading/background.webp', 'art/loading/managers.webp']);
  return (path) => {
    if (retiredLoadingArt.has(path)) return true;
    const id = cropAtlasPattern.exec(path)?.[1];
    return Boolean(id && Object.hasOwn(cropVisuals, id) && !loadsCropAtlas(id));
  };
}

function publishedName(path, hash) {
  const slash = path.lastIndexOf('/');
  const dot = path.lastIndexOf('.');
  return dot > slash + 1 ? `${path.slice(0, dot)}-${hash}${path.slice(dot)}` : `${path}-${hash}`;
}

// Returns { manifest, isFixed, isUnpublished }. The manifest maps each published public/ file to
// `name-<first 8 hex of sha256(content)>.ext`, in sorted source order. Run from the project root.
export async function createAssetManifest() {
  const references = await fixedReferences();
  const isFixed = (path) => fixedFiles.has(path) || references.has(path) ||
    fixedDirectories.some((directory) => path.startsWith(directory));
  const isUnpublished = await unpublishedRule();
  const files = (await listFiles('public')).sort();
  const manifest = {};
  for (const path of files) {
    if (isFixed(path) || isUnpublished(path)) continue;
    const hash = createHash('sha256').update(await readFile(`public/${path}`)).digest('hex').slice(0, 8);
    manifest[path] = publishedName(path, hash);
  }
  const sources = new Set(files);
  const outputs = new Set();
  for (const published of Object.values(manifest)) {
    if (outputs.has(published) || sources.has(published)) {
      throw new Error(`静态资源发布名冲突：${published}`);
    }
    outputs.add(published);
  }
  return { manifest, isFixed, isUnpublished };
}
