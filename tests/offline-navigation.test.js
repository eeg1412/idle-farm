import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const workerSource = await readFile(new URL('../src/platform/site-service-worker.js', import.meta.url), 'utf8');
const scope = 'https://game.example/workshop/';
const cacheName = 'idle-farm-current';
const oldCache = 'tianjian-workshop-previous';
const assets = ['./assets/game.js'];

function markResponse(response, metadata) {
  for (const [key, value] of Object.entries(metadata)) {
    Object.defineProperty(response, key, { value });
  }
  return response;
}

function cloneResponse(response) {
  return markResponse(response.clone(), {
    redirected: response.redirected,
    type: response.type,
    url: response.url,
  });
}

async function navigationResult({ request, response }) {
  const result = await response;
  if (request.redirect !== 'follow' && result.redirected) {
    throw new TypeError('A manual redirect request cannot use a redirected response');
  }
  return result;
}

function createWorker({ hashedAssets } = {}) {
  const listeners = new Map();
  const cacheKeys = new Set([oldCache, 'another-app']);
  const fetched = [];
  const lifecycle = [];
  const precached = [];
  const cacheKey = (request) => new URL(request.url ?? request, scope).href;
  const stored = new Map();
  const cache = {
    async addAll(requests) {
      precached.push(...Array.from(requests, cacheKey));
    },
    async match(request) {
      const entry = stored.get(cacheKey(request));
      return entry && cloneResponse(entry);
    },
    async put(request, response) {
      stored.set(cacheKey(request), cloneResponse(response));
    },
  };
  const worker = {
    fetch: async () => { throw new Error('offline'); },
    fetched,
    precached,
    lifecycle,
    cacheKeys,
    async dispatch(type) {
      let completed;
      listeners.get(type)({ waitUntil(promise) { completed = promise; } });
      assert.ok(completed, `${type} must wait for completion`);
      await completed;
    },
    request(url, mode = 'navigate', method = 'GET') {
      const request = { url, mode, method, redirect: mode === 'navigate' ? 'manual' : 'follow' };
      let response;
      listeners.get('fetch')({ request, respondWith(promise) { response = promise; } });
      return { request, response };
    },
  };
  // scripts/build-offline.mjs prepends these declarations to dist/sw.js. hashedAssets is optional
  // here so the form without it keeps working.
  const hashedDeclaration = hashedAssets ? `const hashedAssets = ${JSON.stringify(hashedAssets)};\n` : '';
  runInNewContext(`const cacheName = ${JSON.stringify(cacheName)};\nconst assets = ${JSON.stringify(assets)};\n${hashedDeclaration}${workerSource}`, {
    URL, Headers, Response,
    self: {
      location: new URL('sw.js', scope),
      registration: { scope },
      addEventListener(type, listener) { listeners.set(type, listener); },
      async skipWaiting() { lifecycle.push('skipWaiting'); },
      clients: { async claim() { lifecycle.push('claim'); } },
    },
    caches: {
      async open(name) { cacheKeys.add(name); return cache; },
      async keys() { return [...cacheKeys]; },
      async delete(name) { return cacheKeys.delete(name); },
    },
    fetch(request, options) {
      fetched.push({ request, options });
      return worker.fetch(request, options);
    },
  });
  return worker;
}

test('install prepares a redirect-free offline shell at the registration root', async () => {
  const worker = createWorker();
  const redirectedPage = markResponse(new Response('<canvas></canvas>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': 'gzip', 'Content-Length': '99', Vary: 'Accept' },
  }), { redirected: true, type: 'basic', url: `${scope}index.html` });
  worker.fetch = async () => redirectedPage;

  await assert.rejects(navigationResult({
    request: { redirect: 'manual' }, response: cloneResponse(redirectedPage),
  }), TypeError);

  await worker.dispatch('install');
  const { request, options } = worker.fetched[0];
  assert.equal(request.url ?? String(request), scope);
  assert.equal(options.cache, 'reload');
  assert.deepEqual(worker.precached, [`${scope}assets/game.js`]);
  assert.deepEqual(worker.lifecycle, ['skipWaiting']);
  await worker.dispatch('activate');
  assert.deepEqual(worker.lifecycle, ['skipWaiting', 'claim']);
  assert.deepEqual([...worker.cacheKeys].sort(), ['another-app', cacheName]);

  worker.fetch = async () => { throw new Error('offline'); };
  for (const url of [scope, `${scope}index.html`, `${scope}?from=shortcut`]) {
    const result = await navigationResult(worker.request(url));
    assert.equal(result.status, 200);
    assert.equal(result.redirected, false);
    assert.equal(result.url, '');
    assert.equal(result.headers.get('content-type'), 'text/html; charset=utf-8');
    for (const name of ['content-encoding', 'content-length', 'vary']) assert.equal(result.headers.has(name), false);
    assert.equal(await result.text(), '<canvas></canvas>');
  }
});

test('install rejects an opaque response, an HTTP error, or a redirected cross-origin page', async () => {
  for (const page of [
    markResponse(Response.error(), { type: 'opaque' }),
    new Response('Unavailable', { status: 503, headers: { 'Content-Type': 'text/html' } }),
    markResponse(new Response('<canvas></canvas>', { headers: { 'Content-Type': 'text/html' } }), {
      redirected: true, url: 'https://another.example/workshop/',
    }),
  ]) {
    const worker = createWorker();
    worker.fetch = async () => page;
    await assert.rejects(worker.dispatch('install'));
    assert.deepEqual(worker.lifecycle, []);
  }
});

test('online navigation preserves browser redirects and HTTP errors', async () => {
  const worker = createWorker();
  worker.fetch = async () => new Response('<canvas></canvas>', { headers: { 'Content-Type': 'text/html' } });
  await worker.dispatch('install');

  const redirect = markResponse(Response.error(), { type: 'opaqueredirect' });
  const unavailable = new Response('Unavailable', { status: 503 });
  for (const [url, response] of [[`${scope}index.html`, redirect], [scope, unavailable]]) {
    worker.fetch = async () => response;
    const navigation = worker.request(url);
    assert.strictEqual(await navigation.response, response);
    assert.strictEqual(worker.fetched.at(-1).request, navigation.request);
    assert.equal(worker.fetched.at(-1).request.redirect, 'manual');
  }
});

test('the worker bypasses unknown and cross-origin navigations', () => {
  const worker = createWorker();
  for (const url of [`${scope}missing`,
    'https://game.example/', 'https://another.example/workshop/']) {
    assert.equal(worker.request(url).response, undefined, url);
  }
  assert.equal(worker.request(scope, 'navigate', 'POST').response, undefined);
  assert.deepEqual(worker.fetched, []);
});

const hashedIcon = './wiki/icons/A01-1a2b3c4d.webp';
const hashedScene = './art/estate/background-5e6f7a8b.webp';

test('hashed public images are served from the network once, then cache-first', async () => {
  const worker = createWorker({ hashedAssets: [hashedIcon, hashedScene] });
  const url = new URL(hashedIcon, scope).href;
  worker.fetch = async () => markResponse(new Response('icon-bytes', {
    headers: { 'Content-Type': 'image/webp' },
  }), { redirected: false, type: 'basic', url });

  const first = await worker.request(url, 'no-cors').response;
  assert.equal(await first.text(), 'icon-bytes');
  assert.equal(worker.fetched.length, 1);

  // A hashed name always has the same content: later requests never reach the network.
  worker.fetch = async () => { throw new Error('offline'); };
  const second = await worker.request(url, 'no-cors').response;
  assert.equal(await second.text(), 'icon-bytes');
  assert.equal(worker.fetched.length, 1);
});

test('a failed hashed image response is returned but not retained', async () => {
  const worker = createWorker({ hashedAssets: [hashedIcon] });
  const url = new URL(hashedIcon, scope).href;
  worker.fetch = async () => new Response('Not found', { status: 404 });
  const missing = await worker.request(url, 'no-cors').response;
  assert.equal(missing.status, 404);

  worker.fetch = async () => new Response('icon-bytes', { headers: { 'Content-Type': 'image/webp' } });
  const retried = await worker.request(url, 'no-cors').response;
  assert.equal(await retried.text(), 'icon-bytes');
  assert.equal(worker.fetched.length, 2);
});

test('only injected hashed names are intercepted; source names and the old ?game=1 marker are not', async () => {
  const worker = createWorker({ hashedAssets: [hashedIcon] });
  for (const url of [
    `${scope}wiki/icons/A01.webp`,
    `${scope}wiki/icons/A01.webp?game=1`,
    `${scope}art/estate/background.webp?game=1&v=7`,
    `${scope}wiki/icons/A01-00000000.webp`,
    'https://another.example/workshop/wiki/icons/A01-1a2b3c4d.webp',
  ]) {
    assert.equal(worker.request(url, 'no-cors').response, undefined, url);
  }
  const hashedUrl = new URL(hashedIcon, scope).href;
  assert.equal(worker.request(hashedUrl, 'no-cors', 'POST').response, undefined);
  const intercepted = worker.request(hashedUrl, 'no-cors').response;
  assert.ok(intercepted);
  // The default worker fetch is offline; the uncached hashed image reports that failure.
  await assert.rejects(intercepted, /offline/);
});

test('injected hashed names are not precached unless listed in the shell assets', async () => {
  const worker = createWorker({ hashedAssets: [hashedIcon, hashedScene] });
  worker.fetch = async () => new Response('<canvas></canvas>', { headers: { 'Content-Type': 'text/html' } });
  await worker.dispatch('install');
  assert.deepEqual(worker.precached, [`${scope}assets/game.js`]);
});
