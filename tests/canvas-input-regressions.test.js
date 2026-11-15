import test from 'node:test';
import assert from 'node:assert/strict';
import { Assets, Container, DOMAdapter, EventBoundary, FederatedPointerEvent, FederatedWheelEvent, Texture, TextureSource } from 'pixi.js';
import 'pixi.js/events';
import { advanceWorld, arrangeStation, buyFacility, catalog, newWorld } from '../src/game/world.js';
import { createGameView } from '../src/view/canvas-ui.js';
import { viewportLayout } from '../src/platform/layout.js';
import { livestockSpecies, minLivestockAnimationMs } from '../src/view/livestock-animation.js';

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
  const app = { stage, canvas, ticker: { add(fn) { ticks.push(fn); } } };
  const view = createGameView(app, async (name, ...args) => dispatch?.(world, name, ...args) ?? { ok: true },
    () => {}, () => {}, (page) => pages.push(page), browser);
  const zero = { left: 0, right: 0, top: 0, bottom: 0 };
  const draw = (width, height, timing) => view.render(viewportLayout(width, height, zero), world, undefined, timing);
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

function livestockAssetFixture(t, rejectAnimation = false) {
  const requested = [];
  t.mock.method(Assets, 'load', (url) => {
    requested.push(url);
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith('/art/livestock/')) return new Promise(() => {});
    if (rejectAnimation) return Promise.reject(new Error('animation art unavailable'));
    const id = pathname.match(/\/animals\/(L\d+)\.webp$/)?.[1];
    const rows = livestockSpecies[id]?.stages ?? 1;
    const width = pathname.includes('/animals/') ? 1280 : pathname.includes('/products/') ? 128 : 320;
    const height = pathname.includes('/animals/') ? 320 * rows : width;
    return Promise.resolve(new Texture({ source: new TextureSource({ width, height }) }));
  });
  return requested;
}

const livestockFacility = (id, start = 0, duration = catalog.items[id].durationMs) => ({
  level: '1', recipe: id, batch: { id, start, end: start + duration, amount: catalog.items[id].output },
});

test('every livestock species mounts its own atlas and uses the correct adult or mature row', async (t) => {
  for (const [id, species] of Object.entries(livestockSpecies)) {
    const game = setup();
    const requested = livestockAssetFixture(t);
    game.world.facilities.L = [livestockFacility(id)];
    game.view.go('牧场', { tab: '畜牧' });
    game.draw(390, 844);
    await new Promise(setImmediate);
    game.flush();
    assert.ok(game.nodes().some((node) => node.label === 'livestock-animation'), id);
    assert.ok(requested.some((url) => url.includes(`/art/livestock/animals/${id}.webp`)), id);
    assert.ok(requested.some((url) => url.includes(`/art/livestock/products/${id}.webp`)), id);
    game.world.clockMs = Math.ceil(game.world.facilities.L[0].batch.end * 2 / 3);
    game.draw(390, 844);
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
  game.view.go('牧场', { tab: '畜牧' });
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
  game.view.go('仓库');
  const warehouseRequests = requested.slice(beforeWarehouse);
  assert.ok(warehouseRequests.some((url) => url.includes('/wiki/icons/L02.webp')));
  assert.ok(warehouseRequests.every((url) => !url.includes('/ui-icons/livestock-')));
});

test('livestock animation loads only visible species and keeps Pixi hits and lifecycle boundaries', async (t) => {
  const game = setup();
  const requested = livestockAssetFixture(t);
  game.world.facilities.L = Array.from({ length: 6 }, (_, index) => livestockFacility(index === 5 ? 'L06' : 'L01'));
  game.view.go('牧场', { tab: '畜牧' });
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
  assert.ok(game.nodes().some((node) => node.text === '畜牧场详情'));
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
  game.view.go('牧场', { tab: '畜牧' });
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  const product = () => game.nodes().find((node) => node.label === 'livestock-product');
  assert.equal(product().alpha, 0);
  const start = minLivestockAnimationMs - 3000;
  game.world.facilities.L[0] = livestockFacility('L06', start, realDuration);
  game.world.clockMs = start + 150;
  game.draw(390, 844);
  assert.equal(product().alpha, 0.5);
  assert.equal(game.nodes().find((node) => node.label === 'livestock-animal').alpha, 0.5);

  game.world.facilities.L[0] = livestockFacility('L01', game.world.clockMs, realDuration);
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  assert.equal(product().alpha, 0);
  assert.equal(game.nodes().find((node) => node.label === 'livestock-animal').alpha, 1);
});

test('livestock failure keeps the static facility while reduced motion freezes idle frames', async (t) => {
  const failed = setup();
  livestockAssetFixture(t, true);
  failed.world.facilities.L = [livestockFacility('L06')];
  failed.view.go('牧场', { tab: '畜牧' });
  failed.draw(390, 844);
  await new Promise(setImmediate);
  failed.flush();
  assert.ok(failed.nodes().some((node) => node.text === '黑猪'));
  assert.ok(failed.nodes().every((node) => node.label !== 'livestock-animation'));

  const game = setup();
  livestockAssetFixture(t);
  game.world.settings.reducedMotion = true;
  game.world.facilities.L = [livestockFacility('L01')];
  game.view.go('牧场', { tab: '畜牧' });
  game.draw(390, 844);
  await new Promise(setImmediate);
  game.flush();
  const animal = game.nodes().find((node) => node.label === 'livestock-animal');
  assert.ok(animal);
  const initial = animal.texture;
  game.tick();
  assert.equal(animal.texture, initial);
  game.world.clockMs = game.world.facilities.L[0].batch.end - 3000;
  game.draw(390, 844);
  assert.equal(game.nodes().find((node) => node.label === 'livestock-product').alpha, 1);
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
      game.view.go('牧场');
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
  assert.ok(game.nodes().some((node) => node.text === '查找节点'));
  assert.ok(game.nodes().every((node) => node.text !== '高级研发点'));
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
  browser.history.back();
  assert.ok(game.nodes().some((node) => node.text === '查找节点'));
  assert.ok(game.nodes().every((node) => node.text !== '高级研发点'));
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
  assert.ok(arrangeStation(game.world, 'I', 0, 'I01'));
  const crop = game.world.facilities.C[0].batch;
  const duration = crop.end - crop.start;
  const draw = () => game.draw(390, 844, { anchor: now, maxElapsed: 1000 });
  const get = (label) => game.nodes().find((node) => node.label === label);
  const fraction = () => get('batch-progress-fill').width / get('batch-progress-track').width;
  const expectFraction = (expected) => assert.ok(Math.abs(fraction() - expected) < 0.001);

  draw();
  const fill = get('batch-progress-fill');
  for (const elapsed of [100, 200]) {
    now = 1000 + elapsed;
    game.tick();
    assert.equal(get('batch-progress-fill'), fill);
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
  expectFraction(1300 / duration);

  game.world.settings.reducedMotion = true;
  advanceWorld(game.world, 1600);
  draw();
  now += 250;
  game.tick();
  expectFraction(1600 / duration);

  game.world.settings.reducedMotion = false;
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
  assert.equal(get('batch-progress-fill'), workshopFill);
});

test('research map pans on both axes and pinches without opening a node', async () => {
  const game = setup();
  game.draw(390, 844);
  game.view.go('研究', { tab: '品种与配方' });
  const find = (label) => game.nodes().find((node) => node.label === label);
  const initial = find('research-map-content');
  assert.ok(initial);
  const { x, y } = initial.position;
  game.point('pointerdown', 210, 430, 'touch');
  game.point('pointermove', 134, 390, 'touch');
  game.draw(390, 844);
  assert.equal(find('research-map-content'), initial);
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
  assert.ok(game.nodes().every((node) => node.text !== '关闭'));

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
  assert.ok(game.nodes().some((node) => node.text === '关闭'));

  function scaleControl(label) {
    const button = find('research-map').children.find((node) => node.text === label);
    assert.ok(button);
    const center = button.toGlobal({ x: button.width / 2, y: button.height / 2 });
    game.point('pointerdown', center.x, center.y);
    game.point('pointerup', center.x, center.y);
  }
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
  assert.equal(match('batch-progress-fill'), undefined);
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
  tap('‹ 返回');
  assert.deepEqual(game.pages, ['设置', '牧场']);
  tap('经营');
  assert.equal(game.pages.at(-1), '经营');
  tap('任务');
  assert.equal(game.pages.at(-1), '任务');
  tap('‹ 返回');
  assert.equal(game.pages.at(-1), '经营');
  tap('图鉴');
  assert.equal(game.pages.at(-1), '图鉴');
});

test('catalog tiles in a row grow together for longer copy', () => {
  const game = setup();
  game.draw(390, 844);
  game.view.dialog('图鉴', (ui) => {
    ui.grid([
      { id: 'C01', title: '小麦' },
      { id: 'PT50', title: '紫苏双鱼牛汁千层御膳礼盒', description: '尚未研发' },
    ], (cell, item) => cell.tile(item.id, item.title, () => {}, { description: item.description }),
    { equalHeight: true });
  });
  const tiles = game.nodes().filter((node) => node.label === 'catalog-tile');
  assert.equal(tiles.length, 2);
  assert.equal(tiles[0].hitArea.y, tiles[1].hitArea.y);
  assert.equal(tiles[0].hitArea.height, tiles[1].hitArea.height);
});

test('replacement choice cards fit the viewport and icon mode omits labels and cycle text', () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: 'option-' + index, label: '可用品项 ' + index, duration: '37 秒', icon: 'C01',
  }));
  for (const [width, textScale, iconsOnly, expectedColumns] of [
    [320, 1, false, 2], [390, 1, false, 3], [480, 1, false, 4], [390, 2, false, 2], [390, 1, true, 6],
  ]) {
    const game = setup();
    game.world.settings.textScale = textScale;
    game.draw(width, 844);
    game.view.dialog('选择作物', (ui) => ui.choiceGrid(items, () => {}, { iconsOnly }));
    const tiles = game.nodes().filter((node) => node.label?.startsWith('picker-choice:'));
    const top = tiles[0].getLocalBounds().minY;
    assert.equal(tiles.filter((tile) => tile.getLocalBounds().minY === top).length, expectedColumns);
    assert.equal(game.nodes().some((node) => node.text === '37 秒'), !iconsOnly);
  }
});

test('research atlas fits the complete catalogue and keeps direct prerequisites above all dependents', async () => {
  const game = setup();
  game.draw(390, 844);
  game.view.go('研究', { tab: '品种与配方' });
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
  assert.ok(game.nodes().some((node) => node.text === '关闭'));
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

test('320 px and 200% text leave space for the research point value', () => {
  const game = setup();
  game.world.settings.textScale = 2;
  game.world.researchPoints = 123n * 10n ** 118n;
  game.draw(320, 760);
  game.view.go('研究', { tab: '经营改良' });
  const summary = game.nodes().find((node) => node.text === '1.23BJ');
  assert.ok(summary);
  assert.ok(summary.style.wordWrapWidth >= 288);
  assert.ok(summary.x + summary.width <= 320);
  assert.ok(game.nodes().some((node) => node.text === '查看完整数值'));
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
