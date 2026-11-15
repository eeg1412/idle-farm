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

function createWorker() {
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
  runInNewContext(`const cacheName = ${JSON.stringify(cacheName)};\nconst assets = ${JSON.stringify(assets)};\n${workerSource}`, {
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

test('the worker bypasses Wiki, unknown, and cross-origin navigations', () => {
  const worker = createWorker();
  for (const url of [`${scope}wiki/`, `${scope}wiki/index.html`, `${scope}missing`,
    'https://game.example/', 'https://another.example/workshop/']) {
    assert.equal(worker.request(url).response, undefined, url);
  }
  assert.equal(worker.request(scope, 'navigate', 'POST').response, undefined);
  assert.deepEqual(worker.fetched, []);
});
