import test from 'node:test';
import assert from 'node:assert/strict';
import { Assets, Container, DOMAdapter, EventBoundary, FederatedPointerEvent, FederatedWheelEvent, Texture, TextureSource } from 'pixi.js';
import 'pixi.js/events';
import { advanceWorld, arrangeStation, assignFacility, buyFacility, buyStation, catalog, newWorld } from '../src/game/world.js';
import { techDefinitions } from '../src/game/advancement.js';
import { createGameView } from '../src/view/canvas-ui.js';
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
  const draw = (width, height, timing) => {
    if (width !== viewportWidth || height !== viewportHeight) {
      layout = viewportLayout(width, height, zero);
      viewportWidth = width;
      viewportHeight = height;
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
  const center = node.toGlobal({ x: node.width / 2, y: node.height / 2 });
  game.point('pointerdown', center.x, center.y, pointerType);
  game.point('pointerup', center.x, center.y, pointerType);
  game.flush();
}

function tapControl(game, label) {
  const node = game.nodes().findLast((entry) => entry.label === label && entry.hitArea);
  assert.ok(node, label);
  const { x, y, width, height } = node.hitArea;
  const center = node.toGlobal({ x: x + width / 2, y: y + height / 2 });
  game.point('pointerdown', center.x, center.y);
  game.point('pointerup', center.x, center.y);
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

test('browser navigation restores game pages, research tabs, and nested dialogs in both directions', async () => {
  const browser = new EventTarget();
  const entries = [{ hash: '#/research?tab=quality', state: null }];
  let index = 0;
  browser.location = { get hash() { return entries[index].hash; } };
  browser.history = {
    get state() { return entries[index].state; },
    replaceState(state, _, hash) { entries[index] = { hash, state }; },
    pushState(state, _, hash) { entries.splice(++index, entries.length, { hash, state }); },
    back() { index -= 1; browser.dispatchEvent(new Event('popstate')); },
    forward() { index += 1; browser.dispatchEvent(new Event('popstate')); },
  };
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

test('Pixi mouse and touch activate bottom tabs through artwork and survive a mid-press redraw', () => {
  const game = setup();
  game.draw(390, 844);
  game.point('pointerdown', 121, 803);
  game.draw(390, 844);
  game.flush();
  game.point('pointerup', 121, 803);
  assert.deepEqual(game.pages, ['工坊']);
  game.point('pointerdown', 195, 815, 'touch');
  game.point('pointerup', 195, 815, 'touch');
  assert.deepEqual(game.pages, ['工坊', '仓库']);
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

  scaleControl('起点');
  assert.ok(find('research-map-edge:C01:C02'));
  assert.ok(game.nodes().filter(({ label }) => label?.startsWith('research-map-edge:')).length <= 8);
  const wheat = find('research-map-node:C01');
  assert.ok(wheat);
  const center = wheat.toGlobal({ x: wheat.width / 2, y: wheat.height / 2 });
  game.point('pointerdown', center.x, center.y, 'touch');
  game.point('pointerup', center.x, center.y, 'touch');
  await Promise.resolve();
  game.flush();
  assert.ok(find('关闭'));

  function scaleControl(label) {
    const button = find('research-map').children.find((node) => node.text === label);
    assert.ok(button);
    const center = button.toGlobal({ x: button.width / 2, y: button.height / 2 });
    game.point('pointerdown', center.x, center.y);
    game.point('pointerup', center.x, center.y);
  }
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

test('management and settings open from separate controls and landscape margins ignore clicks', () => {
  const game = setup();
  game.draw(1000, 844);
  game.point('pointerdown', 40, 100);
  game.point('pointerup', 40, 100);
  assert.deepEqual(game.pages, []);
  const tap = (label) => {
    const node = game.nodes().findLast((entry) => entry.text === label);
    assert.ok(node, label);
    const center = node.toGlobal({ x: node.width / 2, y: node.height / 2 });
    game.point('pointerdown', center.x, center.y);
    game.point('pointerup', center.x, center.y);
    game.flush();
  };
  assert.ok(game.nodes().every((node) => node.text !== '设置'));
  const settings = game.nodes().find((node) => node.label === 'settings-button');
  assert.ok(settings);
  const center = settings.toGlobal({ x: settings.hitArea.x + settings.hitArea.width / 2,
    y: settings.hitArea.y + settings.hitArea.height / 2 });
  game.point('pointerdown', center.x, center.y);
  game.point('pointerup', center.x, center.y);
  game.flush();
  assert.deepEqual(game.pages, ['设置']);
  tapControl(game, '返回');
  assert.deepEqual(game.pages, ['设置', '庄园']);
  tap('经营');
  assert.equal(game.pages.at(-1), '经营');
  tap('庄园');
  assert.equal(game.pages.at(-1), '庄园');
  tap('经营');
  tap('任务');
  assert.equal(game.pages.at(-1), '任务');
  tapControl(game, '返回');
  assert.equal(game.pages.at(-1), '经营');
  tap('图鉴');
  assert.equal(game.pages.at(-1), '图鉴');
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
    game.view.go(page);
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

test('replacement choice cards fit the viewport and icon mode omits labels and cycle text', () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: 'option-' + index, label: '可用品项 ' + index, duration: '37 秒', icon: 'C01',
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
    assert.equal(game.nodes().some((node) => node.text === '37 秒'), !iconsOnly);
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
    { id: 'C02', label: '甘蔗', duration: '16 秒', marketRate: 40 },
    { id: 'C01', label: '小麦', duration: '12 秒' },
    { id: 'PT50', label: '紫苏双鱼牛汁千层御膳礼盒', duration: '60 秒', marketRate: -90 },
    { id: 'C03', label: '稻谷', duration: '20 秒' },
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
  tapText(game, '稻谷', 'touch');
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

test('research atlas fits the complete catalogue and keeps direct prerequisites above all dependents', async () => {
  const game = setup();
  game.draw(390, 844);
  game.view.go('研究', { tab: '品种配方' });
  const find = (label) => game.nodes().find((entry) => entry.label === label);
  const tap = async (node) => {
    assert.ok(node);
    const center = node.toGlobal({ x: node.width / 2, y: node.height / 2 });
    game.point('pointerdown', center.x, center.y);
    game.point('pointerup', center.x, center.y);
    await Promise.resolve();
    game.flush();
  };
  const map = () => new Map(game.nodes().filter(({ label }) => label?.startsWith('research-map-node:'))
    .map((node) => [node.label.slice('research-map-node:'.length), node]));
  const control = (label) => find('research-map').children.find((node) => node.text === label);
  const start = map();
  await tap(control('全图'));
  const overview = map();
  assert.equal(overview.size, Object.keys(catalog.items).length);
  assert.equal(new Set(Array.from(overview.values(), ({ x, y }) => `${x}:${y}`)).size, overview.size);
  for (const [id, { requires }] of Object.entries(catalog.research)) {
    for (const before of requires) assert.ok(overview.get(before).y < overview.get(id).y, `${before} → ${id}`);
  }
  assert.equal(find('research-map-edges').children.length, 0);

  await tap(control('起点'));
  const restored = map();
  assert.deepEqual(Array.from(restored.keys()), Array.from(start.keys()));
  const target = restored.get('C02');
  const { x, y } = target.position;
  await tap(target);
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
  game.draw(320, 760);
  const tap = (label) => {
    const node = game.nodes().find((node) => node.text === label);
    assert.ok(node, label);
    const { x, y } = node.toGlobal({ x: node.width / 2, y: node.height / 2 });
    game.point('pointerdown', x, y, 'touch');
    game.point('pointerup', x, y, 'touch');
    game.flush();
  };
  tap('购地');
  tap('确认购买');
  await new Promise(setImmediate);
  assert.equal(game.world.facilities.C.length, 3);
  assert.equal(game.world.coins, 0n);
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
  tapText(game, '全图');
  const nodes = game.nodes();
  const groups = ['通用', '农业', '畜牧', '水产', '市场'];
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
