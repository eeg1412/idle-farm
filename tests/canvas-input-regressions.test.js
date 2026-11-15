import test from 'node:test';
import assert from 'node:assert/strict';
import { Assets, Container, DOMAdapter, EventBoundary, FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import 'pixi.js/events';
import { advanceWorld, arrangeStation, buyFacility, catalog, newWorld } from '../src/game/world.js';
import { createGameView } from '../src/view/canvas-ui.js';
import { viewportLayout } from '../src/platform/layout.js';

function setup(dispatch, browser) {
  const canvas = new EventTarget();
  globalThis.window = new EventTarget();
  globalThis.document = { baseURI: 'https://game.example/' };
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
