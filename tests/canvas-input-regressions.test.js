import test from 'node:test';
import assert from 'node:assert/strict';
import { Assets, CanvasTextMetrics, Container, DOMAdapter, EventBoundary, FederatedPointerEvent, FederatedWheelEvent, Sprite, Texture, TextureSource } from 'pixi.js';
import 'pixi.js/events';
import { advanceWorld, arrangeStation, assignFacility, buyFacility, buyStation, catalog, newWorld } from '../src/game/world.js';
import { techDefinitions } from '../src/game/advancement.js';
import { buyMerchant, merchantTradeOffer, reserveMerchantSale, sellMerchant } from '../src/game/merchant.js';
import { createGameView } from '../src/view/canvas-ui.js';
import { compact } from '../src/view/numbers.js';
import { viewportLayout } from '../src/platform/layout.js';
import { livestockSpecies, minLivestockAnimationMs } from '../src/view/livestock-animation.js';
import { workshopTextureSources } from '../src/view/workshop-animation.js';

function setup(dispatch, browser) {
  const canvas = new EventTarget();
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { baseURI: 'https://game.example/', hidden: false });
  const frames = [];
  const ticks = [];
  globalThis.requestAnimationFrame = (fn) => frames.push(fn);
  const context = {
    font: '16px sans-serif',
    measureText(text) {
      const size = Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 16);
      return {
        width: [...text].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? size : size * 0.56), 0),
        actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2,
      };
    },
  };
  DOMAdapter.set({ ...DOMAdapter.get(), createCanvas: () => ({ getContext: () => context }),
    getCanvasRenderingContext2D: () => class CanvasRenderingContext2D {} });
  Assets.load = () => new Promise(() => {});
  const stage = new Container();
  stage.eventMode = 'static';
  const boundary = new EventBoundary(stage);
  const pages = [];
  const world = newWorld();
  const app = { stage, canvas, renderer: { resolution: 1 }, ticker: { add(fn) { ticks.push(fn); } } };
  const view = createGameView(app, async (name, ...args) => dispatch?.(world, name, ...args) ?? { ok: true },
    () => {}, () => {}, (page) => pages.push(page), browser);
  const zero = { left: 0, right: 0, top: 0, bottom: 0 };
  let layout;
  let viewportWidth;
  let viewportHeight;
  let viewportInset;
  const draw = (width, height, timing, inset = zero) => {
    if (width !== viewportWidth || height !== viewportHeight || inset !== viewportInset) {
      layout = viewportLayout(width, height, inset);
      viewportWidth = width;
      viewportHeight = height;
      viewportInset = inset;
    }
    view.render(layout, structuredClone(world), undefined, timing);
  };
  const flush = () => frames.splice(0).forEach((fn) => fn());
  function point(type, x, y, pointerType = 'mouse', pointerId = 1) {
    function updateTransform(node) {
      node.getGlobalTransform(node.worldTransform);
      for (const child of node.children) updateTransform(child);
    }
    updateTransform(stage);
    const e = new FederatedPointerEvent(boundary);
    const isPrimary = pointerId === 1;
    Object.assign(e, { type, pointerType, pointerId, button: 0, isPrimary, timeStamp: performance.now() });
    e.global.set(x, y);
    if (type === 'pointerdown') {
      canvas.dispatchEvent(Object.assign(new Event(type), { isPrimary, button: 0, pointerId }));
    }
    boundary.mapEvent(e);
    if (type === 'pointerup' || type === 'pointercancel') {
      window.dispatchEvent(Object.assign(new Event(type), { pointerId }));
    }
  }
  function key(value) {
    canvas.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: value }));
  }
  function wheel(x, y, deltaY) {
    const event = new FederatedWheelEvent(boundary);
    const nativeEvent = new Event('wheel', { cancelable: true });
    Object.assign(event, { type: 'wheel', deltaY, deltaMode: 0, nativeEvent });
    event.global.set(x, y);
    boundary.mapEvent(event);
    canvas.dispatchEvent(nativeEvent);
    window.dispatchEvent(nativeEvent);
    return nativeEvent.defaultPrevented;
  }
  const nodes = () => {
    const collect = (node) => [node, ...node.children.flatMap(collect)];
    return collect(stage);
  };
  return { view, world, pages, point, key, wheel, stage, draw, flush, nodes, tick: () => ticks.forEach((fn) => fn()) };
}

function setupWithDevelopmentMode(enabled, dispatch, browser) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, '__DEV_TEST_MODE__');
  if (enabled === undefined) delete globalThis.__DEV_TEST_MODE__;
  else Object.defineProperty(globalThis, '__DEV_TEST_MODE__', { value: enabled, configurable: true, writable: true });
  try {
    return setup(dispatch, browser);
  } finally {
    if (previous) Object.defineProperty(globalThis, '__DEV_TEST_MODE__', previous);
    else delete globalThis.__DEV_TEST_MODE__;
  }
}

function settingsBrowser() {
  const browser = new EventTarget();
  let hash = '#/settings';
  let state = null;
  browser.location = { get hash() { return hash; }, set hash(next) { hash = next; } };
  const write = (nextState, _title, nextHash) => { state = nextState; hash = nextHash; };
  browser.history = { get state() { return state; }, replaceState: write, pushState: write };
  return browser;
}

function tapText(game, label, pointerType = 'mouse') {
  const node = game.nodes().find((entry) => entry.text === label);
  assert.ok(node, label);
  tapNode(game, node, pointerType);
  game.flush();
}

function tapNode(game, node, pointerType = 'mouse') {
  const center = node.toGlobal({ x: node.width / 2, y: node.height / 2 });
  game.point('pointerdown', center.x, center.y, pointerType);
  game.point('pointerup', center.x, center.y, pointerType);
}

function controlCenter(game, label) {
  const node = game.nodes().findLast((entry) => entry.label === label && entry.hitArea);
  assert.ok(node, label);
  const { x, y, width, height } = node.hitArea;
  return node.toGlobal({ x: x + width / 2, y: y + height / 2 });
}

function tapControl(game, label, pointerType = 'mouse') {
  const { x, y } = controlCenter(game, label);
  game.point('pointerdown', x, y, pointerType);
  game.point('pointerup', x, y, pointerType);
  game.flush();
}

function livestockAssetFixture(t, rejectAnimation = false) {
  const requested = [];
  const productIds = new Set(Object.values(livestockSpecies).map(({ product }) => product.icon));
  const { path: feedPath, size: feedSize } = livestockSpecies.L01.feedTexture;
  t.mock.method(Assets, 'load', (url) => {
    requested.push(url);
    const pathname = new URL(url).pathname;
    const animal = pathname.match(/^\/art\/livestock\/animals\/(L\d+)\.webp$/)?.[1];
    const product = pathname.match(/^\/wiki\/icons\/(L\d+)\.webp$/)?.[1];
    const feed = pathname === new URL(feedPath, 'https://game.example/').pathname;
    if (!animal && !productIds.has(product) && !feed && pathname !== '/art/livestock/barn.webp') {
      return new Promise(() => {});
    }
    if (rejectAnimation && animal) return Promise.reject(new Error('animation art unavailable'));
    const [width, height] = animal ? [1280, 320 * livestockSpecies[animal].stages]
      : feed ? feedSize : product ? [96, 96] : [320, 320];
    return Promise.resolve(new Texture({ source: new TextureSource({ width, height }) }));
  });
  return requested;
}

const livestockFacility = (id, start = 0, duration = catalog.items[id].durationMs) => ({
  level: '1', recipe: id, batch: {
    id, start, end: start + duration, amount: catalog.items[id].output,
    yieldBase: catalog.items[id].output, facilityYieldBasis: 10000,
  },
});

test('every livestock species mounts its own atlas and uses the correct adult or mature row', async (t) => {
  for (const [id, species] of Object.entries(livestockSpecies)) {
    const game = setup();
    const requested = livestockAssetFixture(t);
    game.world.facilities.L = [livestockFacility(id)];
    game.view.go('庄园', { tab: '畜牧' });
    game.draw(390, 844);
    await new Promise(setImmediate);
    game.flush();
    assert.ok(game.nodes().some((node) => node.label === 'livestock-animation'), id);
    assert.ok(requested.some((url) => url.includes(`/art/livestock/animals/${id}.webp`)), id);
    assert.ok(requested.some((url) => url.includes(`/wiki/icons/${species.product.icon}.webp`)), id);
    game.world.clockMs = Math.ceil(game.world.facilities.L[0].batch.end * 2 / 3);
    game.draw(390, 844);
    game.tick();
    const animal = game.nodes().find((node) => node.label === 'livestock-animal');
    assert.equal(animal.texture.frame.y, species.slaughter ? 640 : 0, id);
    assert.equal(animal.texture.frame.width, 320, id);
    assert.equal(animal.texture.frame.height, 320, id);
  }
});

test('livestock choice icons load as contained animals while warehouse output keeps its item path', async (t) => {
  const game = setup();
  const requested = [];
  const iconTexture = new Texture({ source: new TextureSource({ width: 96, height: 48 }) });
  t.mock.method(Assets, 'load', (url) => {
    requested.push(url);
    return url.includes('/ui-icons/livestock-L06.webp') ? Promise.resolve(iconTexture) : new Promise(() => {});
  });
  game.world.unlocked.push('L06');
  game.world.facilities.L = [livestockFacility('L06')];
  game.view.go('庄园', { tab: '畜牧' });
  game.draw(390, 844);
  tapText(game, '更换');
  await new Promise(setImmediate);
  game.flush();
  const icon = game.nodes().find((node) => node.texture === iconTexture);
  assert.ok(icon);
  assert.equal(icon.width, 32);
  assert.equal(icon.height, 16);
  assert.equal(Boolean(icon.mask), false);
  assert.equal(icon.eventMode, 'none');
  assert.ok(requested.some((url) => url.includes('/ui-icons/livestock-L06.webp')));

  game.view.dismiss();
  const beforeWarehouse = requested.length;
  game.world.inventory.L02 = 3n;
  game.draw(390, 844);
  game.view.go('仓库');
  const warehouseRequests = requested.slice(beforeWarehouse);
  assert.ok(warehouseRequests.some((url) => url.includes('/wiki/icons/L02.webp')));
  assert.ok(warehouseRequests.every((url) => !url.includes('/ui-icons/livestock-')));
});

test('livestock animation loads only visible species and keeps Pixi hits and lifecycle boundaries', async (t) => {
  const game = setup();
  const requested = livestockAssetFixture(t);
  game.world.facilities.L = Array.from({ length: 6 }, (_, index) => livestockFacility(index === 5 ? 'L06' : 'L01'));
  game.view.go('庄园', { tab: '畜牧' });
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  const animations = () => game.nodes().filter((node) => node.label === 'livestock-animation');
  assert.ok(animations().length > 0);
  assert.ok(requested.some((url) => url.includes('/art/livestock/animals/L01.webp')));
  assert.ok(requested.every((url) => !url.includes('/art/livestock/animals/L06.webp')));
  assert.equal(requested.filter((url) => url.includes('/art/livestock/barn.webp')).length, 1);

  const first = animations()[0];
  const bounds = first.getBounds();
  const point = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  game.point('pointerdown', point.x, point.y, 'touch');
  game.point('pointerup', point.x, point.y, 'touch');
  game.flush();
  assert.ok(game.nodes().some((node) => node.text === '养殖场详情'));
  assert.equal(animations().length, 0);
  assert.equal(first.destroyed, true);
  game.view.dismiss();
  assert.ok(animations().length > 0);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(animations().length, 0);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.ok(animations().length > 0);

  const beforeScroll = animations();
  assert.ok(game.wheel(190, 500, 10_000));
  await new Promise(setImmediate);
  game.flush();
  assert.ok(requested.some((url) => url.includes('/art/livestock/animals/L06.webp')));
  assert.ok(beforeScroll.every((animation) => animation.destroyed));
  assert.ok(animations().length > 0);
  game.view.go('仓库');
  assert.equal(animations().length, 0);
});

test('short livestock batches keep their display phase and switching species starts without phantom products', async (t) => {
  const game = setup();
  livestockAssetFixture(t);
  const realDuration = minLivestockAnimationMs / 9;
  game.world.facilities.L = [livestockFacility('L06', 0, realDuration)];
  game.view.go('庄园', { tab: '畜牧' });
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  const product = () => game.nodes().find((node) => node.label === 'livestock-product');
  assert.equal(product().alpha, 0);
  const start = minLivestockAnimationMs - 3000;
  game.world.facilities.L[0] = livestockFacility('L06', start, realDuration);
  game.world.clockMs = start + 150;
  game.draw(390, 844);
  game.tick();
  assert.equal(product().alpha, 0.5);
  assert.equal(game.nodes().find((node) => node.label === 'livestock-animal').alpha, 0.5);

  game.world.facilities.L[0] = livestockFacility('L01', game.world.clockMs, realDuration);
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  assert.equal(product().alpha, 0);
  assert.equal(game.nodes().find((node) => node.label === 'livestock-animal').alpha, 1);
});

test('livestock asset failure leaves the active animation region empty without a static fallback', async (t) => {
  const failed = setup();
  const requested = livestockAssetFixture(t, true);
  failed.world.facilities.L = [livestockFacility('L06')];
  failed.view.go('庄园', { tab: '畜牧' });
  failed.draw(390, 844);
  await new Promise(setImmediate);
  failed.flush();
  assert.ok(failed.nodes().some((node) => node.text === '黑猪'));
  assert.ok(failed.nodes().every((node) => node.label !== 'livestock-animation'));
  assert.ok(requested.some((url) => url.includes('/art/livestock/animals/L06.webp')));
  assert.ok(requested.every((url) => !url.includes('/art/scene-L06.webp')));
});

test('development settings title grants only on the eleventh real mouse or touch tap', async () => {
  for (const pointerType of ['mouse', 'touch']) {
    const calls = [];
    const game = setupWithDevelopmentMode(true, (_world, name) => {
      calls.push(name);
      return { ok: true };
    }, settingsBrowser());
    game.draw(390, 844);
    for (let index = 0; index < 10; index += 1) tapText(game, '设置', pointerType);
    assert.deepEqual(calls, [], pointerType + ': first ten taps must not grant');
    tapText(game, '设置', pointerType);
    await new Promise(setImmediate);
    game.flush();
    assert.deepEqual(calls, ['grantDevelopmentTools'], pointerType + ': eleventh tap grants exactly once');
    tapText(game, '设置', pointerType);
    assert.deepEqual(calls, ['grantDevelopmentTools'], pointerType + ': a new sequence must start at zero');
  }
});

test('development title sequence resets after another setting control or page navigation', async () => {
  for (const interruption of ['setting control', 'page navigation', 'browser route']) {
    const calls = [];
    const browser = settingsBrowser();
    const game = setupWithDevelopmentMode(true, (_world, name) => {
      calls.push(name);
      return { ok: true };
    }, browser);
    game.draw(390, 844);
    for (let index = 0; index < 10; index += 1) tapText(game, '设置');
    if (interruption === 'setting control') {
      tapText(game, '静音');
      await new Promise(setImmediate);
      game.flush();
      assert.deepEqual(calls, ['updateSettings']);
    } else if (interruption === 'page navigation') {
      game.view.go('庄园');
      game.view.go('设置');
    } else {
      browser.location.hash = '#/farm';
      browser.dispatchEvent(new Event('hashchange'));
      browser.location.hash = '#/settings';
      browser.dispatchEvent(new Event('hashchange'));
    }
    for (let index = 0; index < 10; index += 1) tapText(game, '设置');
    assert.equal(calls.filter((name) => name === 'grantDevelopmentTools').length, 0, interruption);
    tapText(game, '设置');
    await new Promise(setImmediate);
    game.flush();
    assert.equal(calls.filter((name) => name === 'grantDevelopmentTools').length, 1, interruption);
  }
});

test('settings title has no development entry when the compile flag is absent or false', () => {
  for (const enabled of [undefined, false]) {
    const calls = [];
    const game = setupWithDevelopmentMode(enabled, (_world, name) => {
      calls.push(name);
      return { ok: true };
    }, settingsBrowser());
    game.draw(390, 844);
    assert.ok(game.nodes().every((node) => node.label !== 'development-settings-title'));
    for (let index = 0; index < 22; index += 1) tapText(game, '设置', index % 2 ? 'touch' : 'mouse');
    assert.deepEqual(calls, []);
  }
});

function historyBrowser(initialHash) {
  const browser = new EventTarget();
  const entries = [{ hash: initialHash, state: null }];
  let index = 0;
  browser.location = { get hash() { return entries[index].hash; } };
  browser.history = {
    get state() { return entries[index].state; },
    replaceState(state, _, hash) { entries[index] = { hash, state }; },
    pushState(state, _, hash) { entries.splice(++index, entries.length, { hash, state }); },
    back() { index -= 1; browser.dispatchEvent(new Event('popstate')); },
    forward() { index += 1; browser.dispatchEvent(new Event('popstate')); },
  };
  return browser;
}

test('browser navigation restores game pages, research tabs, and nested dialogs in both directions', async () => {
  const browser = historyBrowser('#/research?tab=quality');
  const game = setup(undefined, browser);
  game.draw(390, 844);
  assert.ok(game.nodes().some((node) => node.text === '普通研发点'));
  assert.ok(game.nodes().every((node) => node.text !== '高级研发点'));
  assert.ok(game.nodes().some((node) => node.text === '已研发品项品质'));
  game.view.go('研究', { tab: '经营改良' });
  assert.equal(browser.location.hash, '#/research?tab=efficiency');
  game.view.go('仓库');
  const amount = { value: 37 };
  game.view.dialog('出售小麦', (ui) => ui.text('比例 ' + amount.value));
  assert.match(browser.location.hash, /^#\/warehouse\?dialog=/);
  game.view.dialog('完整库存', (ui) => ui.text('完整数字'));
  assert.ok(game.nodes().some((node) => node.text === '完整数字'));
  browser.history.back();
  assert.ok(game.nodes().some((node) => node.text === '比例 37'));
  browser.history.back();
  assert.equal(browser.location.hash, '#/warehouse');
  browser.history.back();
  assert.equal(browser.location.hash, '#/research?tab=efficiency');
  assert.ok(game.nodes().some((node) => node.text === '高级研发点'));
  browser.history.back();
  assert.equal(browser.location.hash, '#/research?tab=quality');
  assert.ok(game.nodes().some((node) => node.text === '普通研发点'));
  assert.ok(game.nodes().every((node) => node.text !== '高级研发点'));
  assert.ok(game.nodes().some((node) => node.text === '已研发品项品质'));
  browser.history.forward();
  browser.history.forward();
  browser.history.forward();
  browser.history.forward();
  assert.ok(game.nodes().some((node) => node.text === '完整数字'));
  await game.view.close();
  assert.ok(game.nodes().some((node) => node.text === '比例 37'));
});

test('Pixi estate hotspots open all ten destinations and return to the same map position', () => {
  const browser = historyBrowser('');
  const game = setup(undefined, browser);
  const destinations = [
    ['field', '#/farm?tab=fields'], ['livestock', '#/farm?tab=livestock'],
    ['fish', '#/farm?tab=fish'], ['mine', '#/farm?tab=mining'],
    ['processing', '#/workshop?tab=processing'], ['refining', '#/workshop?tab=refining'],
    ['warehouse', '#/warehouse'], ['research', '#/research'],
    ['operations', '#/management'], ['tasks', '#/tasks'],
  ];
  const narrowWidth = 320;
  const narrowHeight = 568;
  game.draw(narrowWidth, narrowHeight, undefined, { left: 0, right: 0, top: 47, bottom: 0 });
  const map = game.nodes().find(({ label }) => label === 'estate-map');
  const hotspots = game.nodes().filter(({ label }) => label?.startsWith('estate-entry-'));
  assert.equal(hotspots.length, destinations.length);
  const narrowGuide = game.nodes().find(({ label }) => label === 'estate-guide-task');
  const narrowMenu = game.nodes().find(({ label }) => label === 'navigation-menu-button');
  assert.ok(narrowGuide.getBounds().minY > narrowMenu.hitArea.bottom);
  assert.ok(game.wheel(narrowWidth / 2, narrowHeight / 2, 10_000));
  game.flush();
  assert.ok(map.y < 0);
  for (const [index, { label, hitArea }] of hotspots.entries()) {
    assert.ok(hitArea.left >= 0 && hitArea.right <= narrowWidth, label);
    assert.ok(hitArea.top >= 0 && hitArea.bottom + map.y <= narrowHeight, label);
    for (const other of hotspots.slice(index + 1)) {
      assert.ok(!hitArea.intersects(other.hitArea), `${label} overlaps ${other.label}`);
    }
  }
  assert.ok(game.wheel(narrowWidth / 2, narrowHeight / 2, -10_000));
  game.flush();
  game.draw(390, 844);
  const balance = game.nodes().find(({ label }) => label === 'estate-coin-balance');
  assert.ok(balance);
  const balanceBounds = balance.getBounds();
  const balanceX = balanceBounds.x + balanceBounds.width / 2;
  const balanceY = balanceBounds.y + balanceBounds.height / 2;
  game.point('pointerdown', balanceX, balanceY, 'touch');
  game.point('pointerup', balanceX, balanceY, 'touch');
  game.flush();
  assert.equal(browser.location.hash, '#/farm');
  assert.ok(game.nodes().every(({ text }) => text !== '复制数值'));
  const guide = game.nodes().find(({ text }) => text === '任务 · 第一次收成');
  assert.ok(guide);
  const { minX, minY, maxX, maxY } = guide.getBounds();
  const guideX = (minX + maxX) / 2;
  const guideY = (minY + maxY) / 2;
  const taskCenter = controlCenter(game, 'estate-entry-tasks');
  const guideBounds = guide.parent.getBounds();
  const menuBounds = game.nodes().find(({ label }) => label === 'navigation-menu-button').getBounds();
  assert.ok(Math.abs(guideX - taskCenter.x) < 1 && guideBounds.maxY < taskCenter.y);
  assert.ok(guideBounds.minX >= 0 && guideBounds.maxX <= 390 && guideBounds.maxY <= 844);
  assert.ok(guideBounds.minY > Math.max(balanceBounds.maxY, menuBounds.maxY));
  game.point('pointerdown', guideX, guideY, 'touch');
  game.point('pointerup', guideX, guideY, 'touch');
  game.flush();
  assert.equal(browser.location.hash, '#/tasks');
  tapControl(game, '返回');
  assert.equal(browser.location.hash, '#/farm');
  for (const [index, [id, hash]] of destinations.entries()) {
    const label = `estate-entry-${id}`;
    const centerY = controlCenter(game, label).y;
    if (centerY < 60 || centerY > 740) {
      assert.ok(game.wheel(195, 450, centerY - 450), id);
      game.flush();
    }
    const { x, y } = controlCenter(game, label);
    assert.ok(y > 59 && y < 844, id);
    const pointer = index % 2 === 0 ? 'mouse' : 'touch';
    game.point('pointerdown', x, y, pointer);
    if (index === 0) {
      game.draw(390, 844);
      game.flush();
    }
    game.point('pointerup', x, y, pointer);
    game.flush();
    assert.equal(browser.location.hash, hash, id);
    tapControl(game, '返回', pointer);
    assert.equal(browser.location.hash, '#/farm', id);
    assert.equal(controlCenter(game, label).y, y, id);
  }
});

test('estate art stays visible in the frame that updates the balance', async (t) => {
  const game = setup();
  const art = new Map([
    ['background', 'estate-landscape', 800, 2100],
    ['field', 'estate-building-field', 536, 320],
    ['sign', 'estate-sign-field', 516, 110],
    ['field-motion', 'estate-motion-field', 120, 120],
  ].map(([id, label, width, height]) => [id, { label, texture: new Texture({ source: new TextureSource({ width, height }) }) }]));
  t.mock.method(Assets, 'load', (url) => {
    const id = new URL(url).pathname.match(/^\/art\/estate\/(.+)\.webp$/)?.[1];
    return art.has(id) ? Promise.resolve(art.get(id).texture) : new Promise(() => {});
  });
  const node = (label) => game.nodes().find((entry) => entry.label === label);
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.tick();
  for (const { label, texture } of art.values()) assert.equal(node(label)?.texture, texture, label);

  game.world.coins = 1_234n;
  game.draw(390, 844);

  assert.ok(game.nodes().some(({ text }) => text === '1,234'));
  // The render listener in Pixi's ticker can run before queued texture callbacks.
  for (const { label, texture } of art.values()) {
    assert.equal(node(label)?.texture, texture, label);
    assert.equal(node(label)?.visible, true, label);
  }
});

test('a mine deep link opens the facility directly and its return opens the estate map', () => {
  const browser = historyBrowser('#/farm?tab=mining');
  const game = setup(undefined, browser);
  game.draw(390, 844);
  assert.ok(game.nodes().some(({ text }) => text === '矿洞'));
  assert.ok(game.nodes().every(({ label }) => label !== 'estate-entry-mine'));
  tapControl(game, '返回');
  assert.equal(browser.location.hash, '#/farm');
  assert.ok(game.nodes().some(({ label }) => label === 'estate-entry-mine'));
});

test('production batch fills advance between snapshots and stop at their display limits', (t) => {
  let now = 1000;
  t.mock.method(performance, 'now', () => now);
  const game = setup();
  game.world.inventory.C01 = 100n;
  assert.ok(assignFacility(game.world, 'C', 0, 'C01'));
  assert.ok(arrangeStation(game.world, 'I', 0, 'I01'));
  const crop = game.world.facilities.C[0].batch;
  const duration = crop.end - crop.start;
  game.view.go('庄园', { tab: '田地' });
  const draw = () => game.draw(390, 844, { anchor: now });
  const get = (label) => game.nodes().find((node) => node.label === label);
  const fraction = () => get('batch-progress-fill').width / get('batch-progress-track').width;
  const expectFraction = (expected) => assert.ok(Math.abs(fraction() - expected) <= 1 / get('batch-progress-track').width);

  draw();
  const fill = get('batch-progress-fill');
  for (const elapsed of [100, 200]) {
    now = 1000 + elapsed;
    game.tick();
    assert.ok(get('batch-progress-fill') === fill, 'ticker should update the original progress fill');
    expectFraction(elapsed / duration);
  }
  game.view.pauseProgress();
  now = 1300;
  game.tick();
  expectFraction(200 / duration);

  advanceWorld(game.world, 300);
  draw();
  now += 1500;
  game.tick();
  expectFraction(1800 / duration);

  advanceWorld(game.world, crop.end - 200);
  draw();
  now += 250;
  game.tick();
  expectFraction(1);
  assert.equal(game.world.facilities.C[0].batch, crop);
  advanceWorld(game.world, crop.end + 100);
  draw();
  expectFraction(100 / duration);

  game.view.go('工坊');
  const workshopFill = get('batch-progress-fill');
  const initial = fraction();
  now += 100;
  game.tick();
  assert.ok(fraction() > initial);
  assert.ok(get('batch-progress-fill') === workshopFill, 'ticker should update the original workshop fill');
});

test('research map pans on both axes and pinches without opening a node', async () => {
  const game = setup();
  game.draw(390, 844);
  game.view.go('研究', { tab: '品种配方' });
  const find = (label) => game.nodes().find((node) => node.label === label);
  const initial = find('research-map-content');
  assert.ok(initial);
  assert.ok(find('research-map-edge:C01:C02'));
  assert.ok(game.nodes().filter(({ label }) => label?.startsWith('research-map-edge:')).length <= 8);
  const { x, y } = initial.position;
  game.point('pointerdown', 210, 430, 'touch');
  game.point('pointermove', 134, 390, 'touch');
  game.draw(390, 844);
  assert.ok(find('research-map-content') === initial, 'a pan should move the original map');
  assert.ok(initial.x < x && initial.y < y, 'pan should move horizontally and vertically');
  game.point('pointerup', 134, 390, 'touch');
  game.flush();

  const beforePinch = find('research-map-content').scale.x;
  game.point('pointerdown', 150, 400, 'touch');
  game.point('pointerdown', 230, 400, 'touch', 2);
  game.point('pointermove', 280, 400, 'touch', 2);
  assert.ok(find('research-map-content').scale.x > beforePinch);
  game.point('pointerup', 280, 400, 'touch', 2);
  game.point('pointerup', 150, 400, 'touch');
  await Promise.resolve();
  game.flush();
  assert.ok(!find('关闭'));

  const beforeWheel = find('research-map-content').scale.x;
  assert.ok(game.wheel(190, 420, 80));
  assert.ok(find('research-map-content').scale.x < beforeWheel);

  const beforeButtons = find('research-map-content').scale.x;
  tapText(game, '＋', 'touch');
  assert.ok(find('research-map-content').scale.x > beforeButtons);
  tapText(game, '－', 'touch');
  assert.ok(Math.abs(find('research-map-content').scale.x - beforeButtons) < 1e-9);

  findResearchNode(game, 'C01');
  await Promise.resolve();
  game.flush();
  assert.ok(!find('关闭'));
  const wheat = find('research-map-node:C01');
  assert.ok(wheat);
  tapNode(game, wheat, 'touch');
  await Promise.resolve();
  game.flush();
  assert.ok(find('关闭'));
});

test('workshop art fills the card width with rounded top corners and leaves the clear action clickable', async (t) => {
  const actions = [];
  const game = setup((_world, ...args) => {
    actions.push(args);
    return { ok: true };
  });
  const sizes = new Map(workshopTextureSources('I').map(({ path, size }) => [new URL(path, 'https://game.example/').pathname, size]));
  t.mock.method(Assets, 'load', async (url) => {
    const [width, height] = sizes.get(new URL(url).pathname) ?? [96, 96];
    return new Texture({ source: new TextureSource({ width, height }) });
  });
  game.world.inventory.C01 = 2n;
  assert.ok(arrangeStation(game.world, 'I', 0, 'I01'));
  game.view.go('工坊');
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  const scene = game.nodes().find((node) => node.label === 'workshop-front');
  assert.ok(scene);
  assert.ok(scene.mask);
  const top = scene.toGlobal({ x: 0, y: 0 });
  const bottom = scene.toGlobal({ x: 400, y: 144 });
  const width = bottom.x - top.x;
  const height = bottom.y - top.y;
  const cardOutline = game.nodes().find((node) => node.label === 'workshop-card-outline');
  const card = cardOutline.getBounds();
  const roundedMask = scene.parent.parent.mask;
  const clear = game.nodes().find((node) => node.label === '清空加工位');
  const cross = clear.parent.getChildAt(clear.parent.getChildIndex(clear) + 1);
  const title = game.nodes().find((node) => node.text === '面粉').getBounds();
  assert.ok(width > 320 && Math.abs(height / width - 144 / 400) < 0.01);
  assert.ok(Math.abs(top.x - card.minX) < 1 && Math.abs(top.y - card.minY) < 1);
  assert.ok(Math.abs(bottom.x - card.maxX) < 1);
  assert.ok(roundedMask.containsPoint({ x: width / 2, y: 0.5 }));
  assert.ok(!roundedMask.containsPoint({ x: 0.5, y: 0.5 }));
  assert.ok(bottom.y < title.minY);
  assert.ok(scene.children.some((node) => node.label === 'workshop-conveyor-layer'));
  assert.equal(cross.context.instructions.find(({ action }) => action === 'stroke')?.data.style.color, 0xffffff);
  tapControl(game, '清空加工位');
  await Promise.resolve();
  assert.deepEqual(actions, [['clearStation', 'I', 0]]);
});

test('workshop keeps the same progress track and card height after running out of materials', () => {
  const game = setup();
  game.world.inventory.C01 = 2n;
  assert.ok(arrangeStation(game.world, 'I', 0, 'I01'));
  game.draw(390, 844);
  game.view.go('工坊');
  const match = (label) => game.nodes().find((node) => node.label === label);
  const measure = () => {
    const track = match('batch-progress-track');
    return { y: track.getLocalBounds().minY, height: track.parent.getLocalBounds().height };
  };
  const active = measure();
  assert.ok(match('batch-progress-fill'));
  advanceWorld(game.world, game.world.stations.I[0].batch.end);
  game.draw(390, 844);
  assert.deepEqual(measure(), active);
  assert.equal(match('batch-progress-fill').width, 0);
  assert.ok(game.nodes().some((node) => node.text === '暂停'));
});

test('settings opens from the navigation menu and landscape margins ignore clicks', () => {
  const browser = historyBrowser('#/farm');
  const game = setup(undefined, browser);
  game.draw(1000, 844);
  game.point('pointerdown', 40, 100);
  game.point('pointerup', 40, 100);
  assert.equal(browser.location.hash, '#/farm');
  assert.ok(game.nodes().every((node) => node.text !== '设置'));
  tapControl(game, 'navigation-menu-button');
  assert.equal(browser.location.hash, '#/farm');
  tapText(game, '设置');
  assert.equal(browser.location.hash, '#/settings');
  tapControl(game, '返回');
  assert.equal(browser.location.hash, '#/farm');
  assert.equal(game.wheel(40, 500, 10_000), false);
  assert.ok(game.wheel(500, 500, 10_000));
  game.flush();
  tapControl(game, 'estate-entry-operations');
  assert.equal(browser.location.hash, '#/management');
  assert.ok(game.nodes().every(({ text }) => text !== '任务'));
  assert.equal(game.nodes().filter(({ text }) => text === '经营').length, 1);
  tapText(game, '图鉴');
  assert.equal(browser.location.hash, '#/catalog');
});

test('the navigation menu loads icons above every destination and opens the corresponding game pages', async (t) => {
  const browser = historyBrowser('#/settings');
  const actions = [];
  const game = setup((_world, action) => { actions.push(action); return { ok: true }; }, browser);
  const menuTextures = new Map();
  t.mock.method(Assets, 'load', (url) => {
    const key = new URL(url).pathname.match(/^\/ui-icons\/(menu-[a-z-]+)\.webp$/)?.[1];
    if (!key) return new Promise(() => {});
    const texture = new Texture({ source: new TextureSource({ width: 96, height: 96 }) });
    menuTextures.set(key, texture);
    return Promise.resolve(texture);
  });
  game.draw(320, 568, undefined, { left: 0, right: 0, top: 47, bottom: 0 });
  assert.equal(menuTextures.size, 0);
  const destinations = [
    ['大地图', 'menu-map', '#/farm'],
    ['田地', 'menu-field', '#/farm?tab=fields'],
    ['畜牧', 'menu-livestock', '#/farm?tab=livestock'],
    ['鱼池', 'menu-fish', '#/farm?tab=fish'],
    ['矿洞', 'menu-mine', '#/farm?tab=mining'],
    ['加工', 'menu-processing', '#/workshop?tab=processing'],
    ['精制', 'menu-refining', '#/workshop?tab=refining'],
    ['仓库', 'menu-warehouse', '#/warehouse'],
    ['行脚商', 'menu-merchant', '#/merchant'],
    ['研究', 'menu-research', '#/research'],
    ['经营', 'menu-operations', '#/management'],
    ['图鉴', 'menu-catalog', '#/catalog'],
    ['任务', 'menu-tasks', '#/tasks'],
    ['出售庄园', 'menu-farm-sale', '#/farm-sale'],
    ['设置', 'menu-settings', '#/settings'],
  ];
  const menu = () => game.nodes().find(({ label }) => label === 'navigation-menu');
  const captions = (node) => node.children.flatMap((child) =>
    typeof child.text === 'string' ? [child.text] : captions(child));
  tapControl(game, 'navigation-menu-button', 'touch');
  await new Promise(setImmediate);
  game.flush();
  assert.deepEqual([...menuTextures.keys()], destinations.map(([, key]) => key));
  for (const [label, key] of destinations) {
    const tile = game.nodes().find((node) => node.label === key);
    const artwork = tile.children.find((node) => node instanceof Sprite);
    const caption = tile.children.find((node) => node.text === label);
    assert.equal(artwork?.texture, menuTextures.get(key), label);
    assert.equal(artwork.height, 32, label);
    assert.ok(artwork.y + artwork.height <= caption.y, label);
    assert.equal(caption.style.fontSize, 14, label);
  }
  tapControl(game, 'navigation-menu-button');

  for (const [label, , hash] of destinations) {
    const history = browser.history.state;
    tapControl(game, 'navigation-menu-button', 'touch');
    assert.equal(browser.history.state, history);
    assert.deepEqual(captions(menu()), destinations.map(([label]) => label));
    const caption = game.nodes().findLast((node) => node.text === label);
    tapNode(game, caption, 'touch');
    game.flush();
    assert.equal(browser.location.hash, hash, label);
    assert.equal(menu(), undefined, label);
  }
  assert.deepEqual(actions, []);

  tapControl(game, 'navigation-menu-button');
  const history = browser.history.state;
  tapControl(game, '返回');
  assert.equal(menu(), undefined);
  assert.equal(browser.history.state, history);
  tapControl(game, 'navigation-menu-button');
  game.key('Escape');
  assert.equal(menu(), undefined);
  assert.equal(browser.history.state, history);
  tapControl(game, 'navigation-menu-button');
  tapControl(game, 'navigation-menu-button');
  assert.equal(menu(), undefined);
  tapControl(game, 'navigation-menu-button');
  browser.history.back();
  assert.equal(browser.location.hash, '#/farm-sale');
  assert.equal(menu(), undefined);
});

test('the navigation menu handles short screens without scrolling or activating the estate map', () => {
  const browser = historyBrowser('#/farm');
  const game = setup(undefined, browser);
  game.draw(260, 310, undefined, { left: 0, right: 0, top: 20, bottom: 12 });
  tapControl(game, 'navigation-menu-button', 'touch');
  const map = game.nodes().find(({ label }) => label === 'estate-map');
  assert.ok(game.wheel(7, 180, 10_000));
  assert.equal(map.y, 0);
  assert.ok(game.wheel(180, 140, 10_000));
  assert.equal(map.y, 0);
  tapText(game, '设置', 'touch');
  assert.equal(browser.location.hash, '#/settings');

  tapControl(game, 'navigation-menu-button');
  game.key('Tab');
  game.key('Enter');
  assert.equal(browser.location.hash, '#/farm');
});

test('catalog tiles in a row grow together for longer copy', () => {
  const game = setup();
  game.draw(390, 844);
  game.view.dialog('图鉴', (ui) => {
    ui.scrollList([
      { id: 'C01', title: '小麦' },
      { id: 'PT50', title: '紫苏双鱼牛汁千层御膳礼盒', description: '尚未研发' },
    ], (cell, item) => cell.tile(item.id, item.title, () => {}, { description: item.description }),
    { columns: 'auto' });
  });
  const tiles = game.nodes().filter((node) => node.label === 'catalog-tile');
  assert.equal(tiles.length, 2);
  assert.equal(tiles[0].hitArea.y, tiles[1].hitArea.y);
  assert.equal(tiles[0].hitArea.height, tiles[1].hitArea.height);
});

test('compact card edges and bottom actions align by row in the farm, workshop and warehouse', async () => {
  const game = setup();
  game.world.coins = 10_000n;
  assert.ok(assignFacility(game.world, 'C', 0, 'C01'));
  assert.ok(buyStation(game.world, 'I'));
  game.world.inventory = { C01: 40n, P169: 6n };
  assert.ok(arrangeStation(game.world, 'I', 0, 'I01'));
  game.world.productionValue = 100_000n;
  game.world.market = { day: '2026-11-17', sequence: 0, used: 0, rates: { P169: 200 } };
  game.draw(390, 844);
  for (const page of ['庄园', '工坊', '仓库']) {
    game.view.go(page, page === '庄园' ? { tab: '田地' } : undefined);
    game.flush();
    tapText(game, '缩小');
    const cards = game.nodes().filter((node) => node.label === 'scroll-list-card')
      .map((node) => node.getLocalBounds());
    assert.equal(cards.length, 2, page);
    assert.equal(cards[0].minY, cards[1].minY, page);
    assert.equal(cards[0].maxY, cards[1].maxY, page);
    assert.ok(cards[0].maxX < cards[1].minX, page);
    const footers = game.nodes().filter((node) => node.label === 'scroll-list-card-footer')
      .map((node) => node.getBounds());
    assert.equal(footers.length, 2, page);
    assert.equal(footers[0].maxY, footers[1].maxY, page);
    if (page === '工坊') {
      tapText(game, '选择配方', 'touch');
      assert.ok(game.nodes().some((node) => node.label === '关闭'));
      assert.ok(game.nodes().some((node) => node.text === '已安排 1 条'));
      await game.view.close();
      game.flush();
    }
  }
});

test('compact workshop colors only the existing stopped statuses red', () => {
  const game = setup();
  const world = game.world;
  world.coins = 1_000_000_000n;
  for (let i = 0; i < 3; i += 1) assert.ok(buyStation(world, 'I'));
  world.unlocked.push('I03');
  world.inventory.C01 = 2n;
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  world.inventory.C01 = 2n;
  world.reserves.C01 = 2n;
  assert.ok(arrangeStation(world, 'I', 1, 'I01'));
  assert.ok(arrangeStation(world, 'I', 2, 'I03'));
  game.draw(390, 844);
  game.view.go('工坊');
  game.flush();
  tapText(game, '缩小');
  const label = (value) => game.nodes().find((node) => node.text === value);
  for (const reason of ['材料已预留', '等待材料', '等待安排']) {
    assert.equal(label(reason)?.style.fill, 0xa03221, reason);
  }
  assert.equal(label('1 级 · 生产中')?.style.fill, 0x625d4c);
  assert.equal(label('1 级 · ')?.style.fill, 0x625d4c);
});

test('farm sale retention background grows to contain wrapped text', () => {
  const game = setup();
  game.draw(320, 760);
  game.view.go('出售庄园');
  game.flush();
  const label = game.nodes().find((node) => node.text === '已研发品项、品质、普通研发点、经营改良、任务进度');
  assert.ok(label);
  const background = label.parent.children.find((node) => node.label === 'detail-row-background');
  assert.ok(background);
  const textBounds = label.getBounds();
  const rowBounds = background.getBounds();
  assert.ok(rowBounds.height > 34);
  assert.ok(rowBounds.minY <= textBounds.minY && rowBounds.maxY >= textBounds.maxY);
});

test('replacement choice cards fit the viewport and icon mode omits all choice text', () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: 'option-' + index, label: '可用品项 ' + index, duration: '37 秒', icon: 'C01', assignmentSummary: '已安排 48 条',
  }));
  for (const [width, iconsOnly, expectedColumns] of [
    [320, false, 2], [390, false, 3], [480, false, 4], [390, true, 6],
  ]) {
    const game = setup();
    game.draw(width, 844);
    game.view.dialog('选择作物', (ui) => ui.choiceGrid(items, () => {}, { iconsOnly }));
    const tiles = game.nodes().filter((node) => node.label?.startsWith('picker-choice:'));
    const top = tiles[0].getLocalBounds().minY;
    assert.equal(tiles.filter((tile) => tile.getLocalBounds().minY === top).length, expectedColumns);
    for (const label of ['可用品项 0', '37 秒', '已安排 48 条']) {
      assert.equal(game.nodes().some((node) => node.text === label), !iconsOnly, label);
    }
  }
});

test('replacement choices keep duration close below the name and wrapped market mark', () => {
  const game = setup();
  game.draw(320, 760);
  game.view.dialog('选择作物', (ui) => ui.choiceGrid([
    { id: 'C02', label: '甘蔗', duration: '16 秒', marketRate: 40 },
    { id: 'C01', label: '小麦', duration: '12 秒' },
    { id: 'PT50', label: '紫苏双鱼牛汁千层御膳礼盒', duration: '60 秒', marketRate: -90 },
  ], () => {}));
  const bounds = (value) => game.nodes().find((node) => node.text === value).getBounds();
  for (const [mark, duration] of [['×1.4', '16 秒'], ['×0.1', '60 秒']]) {
    const gap = bounds(duration).minY - bounds(mark).maxY;
    assert.ok(gap >= 0 && gap <= 8, `${duration}: ${gap}`);
  }
});

test('replacement rows fit their own content, center the cards, and retain pointer targeting', async (t) => {
  const game = setup();
  const texture = new Texture({ source: new TextureSource({ width: 96, height: 96 }) });
  t.mock.method(Assets, 'load', async () => texture);
  const selected = [];
  game.draw(320, 760);
  game.view.dialog('选择作物', (ui) => ui.choiceGrid([
    { id: 'C02', label: '甘蔗', duration: '16 秒', marketRate: 40, assignmentSummary: '已安排 0 条' },
    { id: 'C01', label: '小麦', duration: '12 秒', assignmentSummary: '已安排 2 条' },
    { id: 'PT50', label: '紫苏双鱼牛汁千层御膳礼盒', duration: '60 秒', marketRate: -90, assignmentSummary: '已安排 48 条' },
    { id: 'C03', label: '稻谷', duration: '20 秒', assignmentSummary: '已安排 1 条' },
  ], ({ id }) => selected.push(id)));
  await new Promise(setImmediate);
  game.flush();
  const bounds = (label) => {
    const node = game.nodes().find((entry) => entry.label === label);
    assert.ok(node, label);
    return node.getBounds();
  };
  const first = bounds('picker-choice:C02');
  const second = bounds('picker-choice:PT50');
  assert.ok(first.height < second.height);
  assert.equal(first.height, bounds('picker-choice:C01').height);
  assert.equal(second.height, bounds('picker-choice:C03').height);
  for (const id of ['C02', 'C01', 'PT50', 'C03']) {
    const card = bounds('picker-choice:' + id);
    const content = bounds('picker-content:' + id);
    assert.ok(Math.abs((content.minY - card.minY) - (card.maxY - content.maxY)) <= 2, id);
  }
  const summary = game.nodes().find((node) => node.text === '已安排 48 条').getBounds();
  const duration = game.nodes().find((node) => node.text === '60 秒').getBounds();
  assert.ok(summary.minY >= duration.maxY && summary.maxY < second.maxY);
  assert.ok(summary.minX >= second.minX && summary.maxX <= second.maxX);
  tapText(game, '已安排 1 条', 'touch');
  assert.deepEqual(selected, ['C03']);
});

test('batch tiles toggle by touch and put market rates beside names or below long names', () => {
  const game = setup();
  game.draw(320, 760);
  const items = [
    { id: 'C01', label: '小麦', detail: '单价 150', marketRate: 10, selected: false },
    { id: 'PT50', label: '紫苏双鱼牛汁千层御膳礼盒', detail: '总价 200', marketRate: -90, selected: false },
  ];
  const toggled = [];
  game.view.dialog('批量管理', (ui) => ui.selectionGrid(items, (item) => {
    item.selected = !item.selected;
    toggled.push(item.selected);
    ui.refresh();
  }));
  const text = (label) => {
    const node = game.nodes().find((entry) => entry.text === label);
    assert.ok(node, label);
    return node;
  };
  const bounds = (label) => text(label).getBounds();
  assert.ok(bounds('×1.1').minX > bounds('小麦').maxX);
  assert.ok(bounds('×1.1').minY < bounds('小麦').maxY);
  assert.ok(bounds('×0.1').minY >= bounds(items[1].label).maxY);
  assert.ok(bounds('总价 200').minY > bounds('×0.1').maxY);
  tapText(game, '小麦', 'touch');
  tapText(game, '小麦', 'touch');
  assert.deepEqual(toggled, [true, false]);
});

function findResearchNode(game, id) {
  tapText(game, '查找节点', 'touch');
  const item = catalog.items[id];
  const result = game.nodes().findLast((node) => node.text === (item.subject ?? item.name));
  assert.ok(result, id);
  tapNode(game, result, 'touch');
}

function zoomResearchOut(game) {
  const scale = () => game.nodes().find(({ label }) => label === 'research-map-content').scale.x;
  for (let step = 0; step < 20; step += 1) {
    const previous = scale();
    tapText(game, '－', 'touch');
    if (scale() === previous) return;
  }
  assert.fail('research map never reached its minimum zoom');
}

test('research atlas filters ready nodes and preserves the complete dependency layout', async () => {
  const game = setup();
  const offer = catalog.research.C02;
  game.world.coins = BigInt(offer.coins);
  for (const [id, amount] of Object.entries(offer.costs)) game.world.inventory[id] = BigInt(amount);
  game.draw(390, 844);
  game.view.go('研究', { tab: '品种配方' });
  const find = (label) => game.nodes().find((entry) => entry.label === label);
  const viewport = () => {
    const { x, y, scale } = find('research-map-content');
    return { x, y, scale: scale.x };
  };
  const map = () => new Map(game.nodes().filter(({ label }) => label?.startsWith('research-map-node:'))
    .map((node) => [node.label.slice('research-map-node:'.length), node]));
  const tapStatusControl = (label) => {
    const control = find('research-map').children.find((node) => node.text === label);
    assert.ok(control, label);
    tapNode(game, control, 'touch');
    game.flush();
  };
  const start = map();
  const startViewport = viewport();
  tapStatusControl('可研发');
  const ready = map();
  assert.ok(ready.has('C02'));
  assert.ok(!ready.has('C01'));
  assert.ok(!ready.has('C03'));
  tapStatusControl('全部状态');
  assert.deepEqual(Array.from(map().keys()), Array.from(start.keys()));
  assert.deepEqual(viewport(), startViewport);

  zoomResearchOut(game);
  const overview = map();
  assert.equal(overview.size, Object.keys(catalog.items).length);
  assert.equal(new Set(Array.from(overview.values(), ({ x, y }) => `${x}:${y}`)).size, overview.size);
  for (const [id, { requires }] of Object.entries(catalog.research)) {
    for (const before of requires) assert.ok(overview.get(before).y < overview.get(id).y, `${before} → ${id}`);
  }
  assert.equal(find('research-map-edges').children.length, 0);

  findResearchNode(game, 'C02');
  await Promise.resolve();
  game.flush();
  assert.ok(!find('关闭'));
  const target = map().get('C02');
  assert.ok(target);
  const { x, y } = target.position;
  tapNode(game, target, 'touch');
  await Promise.resolve();
  game.flush();
  assert.ok(find('关闭'));
  await game.view.close();
  game.flush();
  assert.deepEqual({ x: map().get('C02').x, y: map().get('C02').y }, { x, y });
  const lines = find('research-map-edges').children.map(({ label }) => label);
  assert.equal(lines.filter((label) => label === 'research-map-bus:C02:before').length, 1);
  const expected = [
    ...catalog.research.C02.requires.map((id) => `research-map-edge:${id}:C02`),
    ...Object.entries(catalog.research).filter(([, node]) => node.requires.includes('C02'))
      .map(([id]) => `research-map-edge:C02:${id}`),
  ];
  assert.deepEqual(lines.filter((label) => label.startsWith('research-map-edge:')).sort(), expected.sort());
});

test('slider keyboard supports arrows and exact endpoints', () => {
  const game = setup();
  game.draw(320, 760);
  const values = [];
  let current = 20;
  game.view.dialog('出售', (ui) => {
    ui.slider(current, (next) => { current = next; ui.refresh(); }, { bubble: true });
  }, { variant: 'warehouse-sale' });
  game.key('Tab'); // The fixed sheet header's close control comes first.
  game.key('Tab');
  for (const key of ['ArrowRight', 'End', 'ArrowLeft', 'Home']) {
    game.key(key);
    values.push(current);
  }
  assert.deepEqual(values, [21, 100, 99, 0]);
});

test('narrow portrait purchase uses Pixi taps and applies exactly one real purchase', async () => {
  const game = setup((world, name, kind) => ({ ok: name === 'buyFacility' && buyFacility(world, kind) }));
  game.view.go('庄园', { tab: '田地' });
  game.draw(320, 760);
  const tap = (label) => {
    const node = game.nodes().find((node) => node.text === label);
    assert.ok(node, label);
    const { x, y } = node.toGlobal({ x: node.width / 2, y: node.height / 2 });
    game.point('pointerdown', x, y, 'touch');
    game.point('pointerup', x, y, 'touch');
    game.flush();
  };
  assert.ok(game.wheel(160, 500, 10_000));
  tap('购地');
  tap('确认购买');
  await new Promise(setImmediate);
  assert.equal(game.world.facilities.C.length, 3);
  assert.equal(game.world.coins, 0n);
});

// Use the screen position of visible Pixi text. Lists remain mounted behind their
// scroll masks, so looking up a label alone does not mean a player can tap it.
function merchantScreen(game, width, height) {
  const centre = (node) => {
    const bounds = node.getBounds();
    const x = (bounds.minX + bounds.maxX) / 2;
    const y = (bounds.minY + bounds.maxY) / 2;
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    for (let layer = node; layer; layer = layer.parent) {
      if (!layer.visible || (layer.mask && !layer.mask.containsPoint(layer.mask.toLocal({ x, y })))) return;
    }
    return { x, y };
  };
  const locate = (label, item) => {
    const nodes = game.nodes();
    const pool = item ? nodes.find((node) => node.text === item)?.parent.children ?? [] : nodes;
    for (const node of pool) {
      if (typeof label === 'string' ? node.text !== label : !label.test(node.text ?? '')) continue;
      const position = centre(node);
      if (position) return position;
    }
  };
  const find = (label, item) => {
    let position = locate(label, item);
    if (position) return position;
    game.wheel(width / 2, height / 2, -3000);
    for (let step = 0; step < 12; step++) {
      position = locate(label, item);
      if (position) return position;
      game.wheel(width / 2, height / 2, 110);
    }
    assert.fail('No visible ' + label + (item ? ' for ' + item : ''));
  };
  const touch = ({ x, y }) => {
    game.point('pointerdown', x, y, 'touch');
    game.point('pointerup', x, y, 'touch');
    game.flush();
  };
  return { find, locate, touch, tap: (label, item) => touch(find(label, item)) };
}

function populateMerchant(world, sales = 1_000_001n) {
  world.coins = 100_000n;
  Object.assign(world.merchant, {
    day: '2026-11-18', freeUsed: true, sequence: 1n, version: 1n, directSales: 0n,
    produced: Object.fromEntries(Array.from({ length: 10 }, (_, index) =>
      ['C' + String(index + 1).padStart(2, '0'), 1])),
    sales: { 1: sales, 2: 0n, 3: 0n },
    batch: {
      id: 1n, trades: 0n, stock: { C01: 8n, C04: 4n },
      wanted: { id: 'C02', capacity: 10n, remaining: 10n, multiplier: 125 },
      baseline: sales, initialCost: 1_000n, spent: 0n, pending: [],
    },
  });
}

test('320 px merchant buys once with live pricing and no confirmation dialog', async () => {
  const submits = [];
  const game = setup((world, name, offer) => {
    assert.equal(name, 'buyMerchant');
    submits.push(offer);
    if (submits.length === 1) world.quality.C01 = '2';
    const ok = buyMerchant(world, offer);
    game.draw(320, 760);
    return { ok };
  });
  const { find, locate, tap, touch } = merchantScreen(game, 320, 760);
  populateMerchant(game.world, 1_000_000n);
  game.view.go('仓库');
  game.draw(320, 760);
  tap('行脚商');
  assert.equal(game.pages.at(-1), '行脚商');
  find('开摊条件');
  find('商人未到');
  for (const [description, progress] of [
    [['庄园、工坊加工共出产 10 种物品'], '已生产 10 / 10 种 ✓'],
    [['在仓库卖出庄园产物和工坊加工品', '累计得款超过 1M 金币'], '已得款 1M 金币'],
  ]) {
    const label = description.join('\n');
    const labelPosition = find(label);
    const node = game.nodes().find((entry) => entry.text === label);
    assert.deepEqual(CanvasTextMetrics.measureText(node.text, node.style).lines, description);
    assert.ok(find(progress).y > labelPosition.y, progress);
  }
  assert.ok(!locate('金币余额'));
  assert.ok(!locate('买入'));
  assert.ok(!locate('卖出'));
  assert.ok(!locate('小麦'));
  const tenthTier = game.world.merchant.produced.C10;
  delete game.world.merchant.produced.C10;
  game.world.merchant.sales[1] += 1n;
  game.draw(320, 760);
  find('开摊条件');
  find('已生产 9 / 10 种');
  find('已得款 1.000001M 金币 ✓');
  game.world.merchant.produced.C10 = tenthTier;
  game.draw(320, 760);
  assert.ok(!locate('开摊条件'));
  assert.ok(!locate('商人未到'));
  find('金币余额');
  find(/金币\/件 · 剩余 8 件/);
  assert.ok(!locate('甘蔗'));

  tap('小麦');
  tap('50%');
  find('已选 4 件');
  find('买入 4 件');
  assert.ok(locate(/金币充足/));
  const first = find('确认买入');
  touch(first);
  touch(first);
  await new Promise(setImmediate);
  game.flush();
  assert.equal(submits.length, 1);
  assert.equal(game.world.inventory.C01 ?? 0n, 0n);
  find(/^报价已更新。单价现为/);
  assert.ok(!locate('行脚商已换货'));
  tap('按新报价确认');
  await new Promise(setImmediate);
  game.flush();
  assert.equal(submits.length, 2);
  assert.notEqual(submits[0].unitPrice, submits[1].unitPrice);
  assert.equal(game.world.inventory.C01, 4n);
  assert.equal(game.world.merchant.batch.stock.C01, 4n);
  assert.equal(game.world.coins, 100_000n - submits[1].total);
});

test('320 px merchant sale freezes the percentage, reserves stock, and releases on history navigation', async () => {
  const browser = historyBrowser('#/warehouse');
  const submissions = [];
  const holds = [];
  const game = setup((world, name, offer) => {
    if (name === 'reserveMerchantSale') {
      holds.push(offer?.count ?? null);
      const ok = reserveMerchantSale(world, offer);
      game.draw(320, 760);
      return { ok };
    }
    assert.equal(name, 'sellMerchant');
    submissions.push(offer);
    const ok = sellMerchant(world, offer);
    game.draw(320, 760);
    return { ok };
  }, browser);
  populateMerchant(game.world);
  game.world.inventory.C02 = 6n;
  game.world.inventory.C03 = 4n;
  game.world.reserves.C02 = 5n;
  game.draw(320, 760);
  const { find, locate, tap } = merchantScreen(game, 320, 760);
  const slide = (type, percent) => {
    const track = game.nodes().find(({ label, hitArea }) => label === 'ratio-slider' && hitArea);
    assert.ok(track);
    const { x, y, width } = track.hitArea;
    const point = track.toGlobal({ x: x + 12 + (width - 24) * percent / 100, y: y + 35 });
    game.point(type, point.x, point.y, 'touch');
    game.flush();
  };
  tap('行脚商');
  tap('卖出');
  assert.equal(browser.location.hash, '#/merchant?tab=sell');
  find('甘蔗');
  find(/^收购 1\.25 倍/);
  find('剩余可收');
  find('当前可卖');
  assert.ok(!locate('草莓'));
  assert.ok(!locate('小麦'));
  tap('选择数量');
  await new Promise(setImmediate);
  slide('pointerdown', 25);
  slide('pointermove', 75);
  find('已选 4 件');
  find(compact(merchantTradeOffer(game.world, 'sell', 'C02', 4n).total) + ' 金币');
  find('松手确定数量');
  slide('pointermove', 50);
  assert.deepEqual(holds, [1n]);
  assert.equal(game.world.merchantHold.count, 1n);
  slide('pointerup', 50);
  await new Promise(setImmediate);
  game.flush();
  find('已选 3 件');
  assert.equal(game.world.merchantHold.count, 3n);
  assert.deepEqual(holds, [1n, 3n]);
  slide('pointerdown', 0);
  find('请选择至少 1 件。');
  assert.equal(game.world.merchantHold.count, 3n);
  slide('pointercancel', 0);
  find('已选 3 件');
  assert.deepEqual(holds, [1n, 3n]);
  find('本次最多动用 2 件常驻保留库存。');
  game.world.inventory.C02 += 2n;
  game.draw(320, 760);
  find('已选 3 件');
  find('本次最多动用 2 件常驻保留库存。');
  assert.ok(!locate(/^报价已更新/));
  assert.ok(!locate('行脚商已换货'));

  tap('确认卖出');
  await new Promise(setImmediate);
  game.flush();
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].count, 3n);
  assert.equal(game.world.inventory.C02, 5n);
  assert.equal(game.world.merchantHold, undefined);
  assert.equal(game.world.merchant.batch.wanted.remaining, 7n);
  assert.equal(game.world.coins, 100_000n + submissions[0].total);

  tap('选择数量');
  await new Promise(setImmediate);
  assert.equal(game.world.merchantHold.count, 1n);
  tap('100%');
  await new Promise(setImmediate);
  assert.equal(game.world.merchantHold.count, 5n);
  browser.history.back();
  await new Promise(setImmediate);
  game.flush();
  assert.equal(browser.location.hash, '#/merchant');
  assert.equal(game.world.merchantHold, undefined);
  browser.history.forward();
  find('选择数量');
  assert.ok(!locate(/^确认卖出$/));
});

test('320 px merchant supports the legacy sale link and shows one notice after a committed batch', async () => {
  const browser = historyBrowser('#/merchant?tab=give');
  const game = setup(undefined, browser);
  populateMerchant(game.world);
  game.world.inventory.C02 = 6n;
  game.draw(320, 760);
  const { find, locate, tap } = merchantScreen(game, 320, 760);
  find('甘蔗');
  assert.equal(browser.location.hash, '#/merchant?tab=sell');
  assert.ok(!locate('行脚商已换货'));
  tap('选择数量');
  await new Promise(setImmediate);
  game.view.dialog('原换货确认', (ui) => ui.text('旧弹层'));
  game.view.dialog('离开期间收获', (ui) => ui.text('原汇总'), { flow: 'offline-report' });

  game.world.merchant.batch = { ...game.world.merchant.batch, id: 2n, wanted: null };
  assert.equal(game.view.merchantBatchChanged(() =>
    game.view.dialog('离开期间收获', (ui) => ui.button('关闭汇总', ui.close), { flow: 'offline-report' })), true);
  game.draw(320, 760);
  find('行脚商已换货');
  assert.ok(!locate('原汇总'));
  assert.equal(game.view.hasMerchantRefreshNotice(), true);
  tap('知道了');
  await new Promise(setImmediate);
  game.flush();
  find('离开期间收获');
  tap('关闭汇总');
  game.draw(320, 760);
  find('小麦');
  assert.ok(!locate('已选 1 件'));
  assert.ok(!locate('旧弹层'));
  assert.ok(!locate('行脚商已换货'));
  assert.equal(game.view.hasMerchantRefreshNotice(), false);
});

test('320 px shows the research point value and opens its exact balance', () => {
  const game = setup();
  game.world.researchPoints = 123n * 10n ** 118n;
  game.draw(320, 760);
  game.view.go('研究', { tab: '经营改良' });
  const summary = game.nodes().find((node) => node.text === '1.23BJ');
  assert.ok(summary);
  assert.ok(summary.style.wordWrapWidth >= 288);
  assert.ok(summary.x + summary.width <= 320);
  tapText(game, '1.23BJ');
  assert.ok(game.nodes().some((node) => node.label === '关闭'));
});

test('narrow portrait puts every improvement category on a new row and wraps its cards inside the map', () => {
  const game = setup();
  game.draw(320, 760);
  game.view.go('研究', { tab: '经营改良' });
  zoomResearchOut(game);
  const nodes = game.nodes();
  const groups = ['通用', '农业', '畜牧', '水产', '矿业', '市场'];
  const headings = groups.map((label) => nodes.find((node) => node.label === `research-map-group:${label}`));
  assert.deepEqual(headings.map((node) => node.text), groups);
  for (const [index, group] of groups.entries()) {
    const cards = techDefinitions.filter(({ source }) => source === group)
      .map(({ key }) => nodes.find((node) => node.label === `research-map-node:${key}`));
    assert.ok(cards.every(({ y }) => y > headings[index].y && y < (headings[index + 1]?.y ?? Infinity)));
    assert.equal(cards[0].x, 0);
    assert.ok(new Set(cards.map(({ y }) => y)).size > 1, group);
  }
});

test('content scroll coasts after release and the draggable thumb stays against the right edge', (t) => {
  let now = 100;
  t.mock.method(performance, 'now', () => now);
  const game = setup();
  game.draw(390, 700);
  let actions = 0;
  game.view.dialog('滚动', (ui) => {
    ui.button('首个按钮', () => { actions += 1; });
    for (let i = 0; i < 30; i += 1) ui.heading('库存 ' + i);
  });
  const bar = () => game.nodes().findLast((node) => node.cursor === 'ns-resize');
  const thumb = bar();
  const edge = thumb.getBounds().right;
  assert.equal(edge, 382);
  assert.ok(thumb.alpha > 0 && thumb.alpha < 1);
  const first = game.nodes().find((node) => node.text === '首个按钮');
  const { x, y } = first.toGlobal({ x: first.width / 2, y: first.height / 2 });
  game.point('pointerdown', x, y + 35, 'touch');
  now += 35;
  game.point('pointermove', x, y - 15, 'touch');
  now += 30;
  game.point('pointermove', x, y - 80, 'touch');
  game.point('pointerup', x, y - 80, 'touch');
  game.flush();
  const releasedAt = bar().y;
  now += 33;
  game.tick();
  assert.ok(bar().y > releasedAt, 'touch fling should keep moving after release');
  assert.equal(actions, 0);
  const movedTo = bar().y;
  const startY = movedTo + 12;
  game.point('pointerdown', edge - 2, startY);
  now += 30;
  game.point('pointermove', edge - 2, startY + 55);
  game.point('pointerup', edge - 2, startY + 55);
  game.flush();
  assert.ok(bar().y > movedTo);
  const thumbRelease = bar().y;
  now += 33;
  game.tick();
  assert.equal(bar().y, thumbRelease, 'the thumb follows the pointer and stops on release');
  assert.equal(bar().getBounds().right, edge);
});
