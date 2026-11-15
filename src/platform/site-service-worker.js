const scope = new URL(self.registration.scope);
const home = new URL('./', scope);
const indexPath = new URL('./index.html', scope).pathname;
const staticAssets = assets.map((asset) => new URL(asset, scope).href);
const staticURLs = new Set(staticAssets);
const imageDirectories = ['./art/', './ui-icons/', './wiki/icons/']
  .map((path) => new URL(path, scope).pathname);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const page = await fetch(home.href, { cache: 'reload' });
    if (!page.ok || (page.url && new URL(page.url).origin !== home.origin) ||
        !page.headers.get('content-type')?.includes('text/html')) {
      throw new Error('Cannot cache the game page');
    }
    // A navigation uses manual redirects. Store a fresh response without the fetch redirect history.
    const headers = new Headers(page.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    headers.delete('vary');
    const shell = new Response(await page.arrayBuffer(), { headers });
    const cache = await caches.open(cacheName);
    await cache.addAll(staticAssets);
    await cache.put(home.href, shell);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.allSettled(keys.filter((key) =>
      (key.startsWith('idle-farm-') || key.startsWith('tianjian-workshop-')) && key !== cacheName)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigate(request) {
  try {
    return await fetch(request);
  } catch {
    const shell = await caches.open(cacheName).then((cache) => cache.match(home.href)).catch(() => undefined);
    return shell ?? new Response('暂时无法打开放置农场，请联网后重试。', {
      status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

async function loadAsset(request, retain) {
  const cache = await caches.open(cacheName).catch(() => undefined);
  const cached = await cache?.match(request).catch(() => undefined);
  if (cached) return cached;
  const response = await fetch(request);
  if (retain && cache && response.ok && !response.redirected) {
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  if (request.mode === 'navigate') {
    if (url.pathname === home.pathname || url.pathname === indexPath) event.respondWith(navigate(request));
    return;
  }
  const gameImage = url.searchParams.get('game') === '1' && url.pathname.endsWith('.webp') &&
    imageDirectories.some((directory) => url.pathname.startsWith(directory));
  if (gameImage || staticURLs.has(url.href)) event.respondWith(loadAsset(request, gameImage));
});
