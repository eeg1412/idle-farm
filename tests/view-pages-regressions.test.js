import assert from 'node:assert/strict';
import test from 'node:test';
import { arrangeStation, catalog, newWorld, reserve } from '../src/game/world.js';
import { renderTasks, renderWarehouse } from '../src/view/management-pages.js';
import { renderProduction, renderWorkshop } from '../src/view/production-pages.js';
import { renderResearch } from '../src/view/research-page.js';

function pageFixture(w, local = {}) {
  const calls = [];
  const ui = new Proxy({ w, local, width: 390 }, {
    get(target, method) {
      if (method in target) return target[method];
      return (...args) => {
        calls.push([method, args]);
        if (method === 'card') args[0](ui);
        if (method === 'feature') args[1](ui);
      };
    },
  });
  const find = (method, match) => calls.findLast(([name, args]) => name === method && match(...args))?.[1];
  const click = (label) => {
    const button = find('button', (caption) => caption === label);
    if (button) return button[1]();
    const bar = find('titleBar', (_, caption) => caption === label);
    if (bar) return bar[2]();
    const group = find('buttons', (items) => items.some((item) => item.label === label));
    assert.ok(group, label);
    return group[0].find((item) => item.label === label).onClick();
  };
  const dialog = (title) => {
    const call = find('dialog', (name) => name === title);
    assert.ok(call, title);
    const body = pageFixture(w);
    call[1](body.ui);
    return { ...body, options: call[2] };
  };
  return { ui, calls, find, click, dialog };
}

test('warehouse shows permanent filters, current quality and price, and exact stock', () => {
  const world = newWorld(0);
  const amount = 10n ** 120n + 9n;
  const view = pageFixture(world);
  renderWarehouse(view.ui);
  assert.ok(view.find('tabs', (tabs) => tabs.includes('中间产物')));

  world.inventory.C01 = amount;
  world.quality.C01 = '17';
  renderWarehouse(view.ui);
  assert.ok(view.find('row', (label, value) => label === '品质' && value === '17 级'));
  assert.ok(view.find('row', (label, value) => label === '单价' && value.endsWith(' 金币')));
  view.click('详情');
  const details = view.dialog('小麦');
  assert.ok(details.find('fullNumber', (value) => value === amount));
  assert.ok(details.find('fullNumber', (value) => value === 17n));
});

test('workshop shows usable stock and reserve controls without listing deducted inputs', () => {
  const world = newWorld(0);
  world.unlocked.push('I03');
  world.inventory = { C03: 4n, I02: 1n };
  assert.ok(reserve(world, 'C03', 2n));
  assert.ok(arrangeStation(world, 'I', 0, 'I03'));

  const view = pageFixture(world);
  renderWorkshop(view.ui);
  assert.equal(view.find('row', (_, amount, options) => options?.icon === 'C03' && amount === 2n), undefined);
  assert.equal(view.find('text', (label) => label === '本批已扣材料'), undefined);
  assert.ok(view.find('materialTable', (rows) => rows.some(({ id, owned, needed }) => id === 'C03' && owned === 0n && needed === 2n)));
  view.click('调整保留量');
  const reserveDialog = view.dialog('加工保留量');
  assert.ok(reserveDialog.find('item', (id) => id === 'C03'));
  assert.equal(view.find('go', () => true), undefined);
  assert.ok(reserveDialog.options.onPaste({ clipboardData: { getData: () => '１２３' } }));
  assert.ok(reserveDialog.options.onKeyDown({ key: '４' }));
  assert.ok(reserveDialog.options.onKeyDown({ key: 'Backspace' }));
  assert.ok(reserveDialog.options.onPaste({ clipboardData: { getData: () => '9e4' } }));
  assert.ok(view.dialog('加工保留量').find('fullNumber', (value) => value === 123n));

  world.stations.I[0].batch.inputs = null;
  renderWorkshop(view.ui);
  assert.equal(view.find('text', (label) => label === '早期记录未保留本批材料'), undefined);
});

test('linked sources in the workshop identify the item and open its research conditions', () => {
  const world = newWorld(0);
  for (const [tab, id, station] of [['加工', 'I03', '加工位'], ['精制', 'P01', '精制位']]) {
    const view = pageFixture(world, { tab, id });
    renderWorkshop(view.ui);
    assert.deepEqual(view.find('item', (key) => key === id), [id, catalog.items[id].name, '在' + station + '中选择对应配方']);
    view.click('查看研发条件');
    assert.deepEqual(view.find('go', () => true), ['研究', { tab: '品种与配方', id }]);
  }
  for (const id of ['I999', 'C01', 'P01']) {
    const view = pageFixture(world, { tab: '加工', id });
    renderWorkshop(view.ui);
    assert.equal(view.find('item', () => true), undefined);
    assert.equal(view.find('button', (label) => label === '查看研发条件'), undefined);
  }
  const unlocked = pageFixture(world, { tab: '加工', id: 'I01' });
  renderWorkshop(unlocked.ui);
  assert.ok(unlocked.find('item', (id) => id === 'I01'));
  assert.equal(unlocked.find('button', (label) => label === '查看研发条件'), undefined);
});

test('workshop replacement explains immediate changes and shows the new recipe waiting for materials', () => {
  const world = newWorld(0);
  world.unlocked.push('I03');
  world.inventory = { C03: 2n, I02: 1n };
  assert.ok(arrangeStation(world, 'I', 0, 'I03'));
  world.tech.workshopSpeed = 1;
  const active = pageFixture(world);
  renderWorkshop(active.ui);
  active.click('更换配方');
  const chooser = active.dialog('选择配方');
  assert.ok(chooser.find('text', (label) => label.includes('已扣材料退回仓库')));
  assert.ok(chooser.find('text', (label) => label.includes('新配方立即生效')));
  assert.deepEqual(chooser.find('choiceGrid', () => true)[0], [
    { id: 'I01', icon: 'I01', label: '面粉', duration: '8 秒', selected: false },
    { id: 'I03', icon: 'I03', label: '草莓果酱', duration: '13 秒', selected: true },
  ]);

  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const waiting = pageFixture(world);
  renderWorkshop(waiting.ui);
  assert.ok(waiting.find('heading', (label) => label === '面粉'));
  assert.ok(waiting.find('badges', (badges) => badges.some(({ label, tone }) => label === '等待材料' && tone === 'blocked')));
  assert.ok(waiting.find('row', (label, value, options) => label === '剩余' && value === '暂停' && options.tone === 'danger'));
  assert.deepEqual(waiting.find('batchProgress', () => true), [null]);
  assert.equal(waiting.find('heading', (label) => label === '草莓果酱'), undefined);
});

test('the expansion guide sends a player who needs more coins to sell stock', () => {
  const world = newWorld(0);
  world.stats.produced = { C01: 1n, I01: 1n, P01: 1n };
  world.stats.sold = 1n;
  world.unlocked.push('P01');
  world.coins = 59n;

  const production = pageFixture(world);
  renderProduction(production.ui);
  production.click('扩建田地 · 前往出货');
  assert.ok(production.find('go', (target) => target === '仓库'));

  const tasks = pageFixture(world);
  renderTasks(tasks.ui);
  tasks.click('前往出货');
  assert.ok(tasks.find('go', (target) => target === '仓库'));
  world.coins = 60n;
  renderTasks(tasks.ui);
  tasks.click('前往田地');
  assert.ok(tasks.find('go', (target, { tab }) => target === '牧场' && tab === '田地'));
});

test('each crop, livestock and fish facility requests its own art', () => {
  const world = newWorld(0);
  world.guideSkipped = true;
  const groups = [
    ['C', '田地', 'scene-empty-field'],
    ['L', '畜牧', 'scene-empty-barn'],
    ['F', '鱼池', 'scene-empty-pond'],
  ];
  for (const [kind, tab, emptyArt] of groups) {
    const ids = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === kind);
    for (const id of [...ids, null]) {
      world.facilities[kind] = [{ level: '1', recipe: id, batch: null }];
      const view = pageFixture(world, { tab });
      renderProduction(view.ui);
      const card = view.find('feature', (_, __, options) => options.style === 'facility');
      const art = id ? 'scene-' + id : emptyArt;
      assert.equal(card?.[0], art);
    }
  }
});

test('livestock choices identify the animal while details and upgrades show their facility scenes', () => {
  const world = newWorld(0);
  world.guideSkipped = true;
  world.unlocked = ['L01', 'L10'];
  world.facilities.L = [{ level: '1', recipe: 'L10', batch: { id: 'L01', amount: '1', end: 6000 } }];
  const view = pageFixture(world, { tab: '畜牧' });
  renderProduction(view.ui);

  const [scene, , options] = view.find('feature', (_, __, settings) => settings.style === 'facility');
  assert.equal(scene, 'scene-L01');
  options.onClick();
  const details = view.dialog('畜牧场详情');
  assert.ok(details.find('feature', (art) => art === 'scene-L01'));
  assert.ok(details.find('row', (label, value) => label === '产出品项' && value === catalog.items.L01.name));

  view.click('更换');
  const choices = view.dialog('选择牲畜');
  assert.ok(choices.find('text', (label) => label.includes('立即开始新一批')));
  assert.deepEqual(choices.find('choiceGrid', () => true)[0].map(({ icon, label }) => [icon, label]), [
    ['scene-L01', catalog.items.L01.subject], ['scene-L10', catalog.items.L10.subject],
  ]);

  view.click('升级');
  const upgrade = view.dialog('升级畜牧场');
  assert.ok(upgrade.find('feature', (art) => art === 'scene-L10'));
  assert.ok(upgrade.find('row', (label, _, settings) => label.startsWith('每批') && settings.icon === 'L10'));
});

test('crop selection uses individual icons for all unlocked choices in one grid', () => {
  const world = newWorld(0);
  const ids = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C51'];
  world.unlocked.push(...ids.slice(1));
  const view = pageFixture(world, { tab: '田地' });
  renderProduction(view.ui);
  view.click('换种');
  const chooser = view.dialog('选择作物');
  assert.deepEqual(chooser.find('choiceGrid', () => true)[0].map(({ id, icon }) => [id, icon]), ids.map((id) => [id, id]));
});

test('research keeps separate cameras, connects real dependencies, and only shows points in efficiency', () => {
  const world = newWorld(0);
  world.researchPoints = 10n ** 120n + 9n;
  const local = { scroll: 0 };
  const view = pageFixture(world, local);
  const redraw = (tab) => {
    local.tab = tab;
    view.calls.length = 0;
    renderResearch(view.ui);
    return view.find('tree', () => true)?.[0];
  };
  const points = () => view.find('balance', (label) => label === '高级研发点');
  const recipes = redraw('品种与配方');
  assert.equal(recipes.nodes.length, Object.keys(catalog.items).length);
  assert.deepEqual(recipes.nodes.find(({ id }) => id === 'P151').requires, catalog.research.P151.requires);
  assert.equal(points(), undefined);
  recipes.view.zoom = 0.72;
  const quality = redraw('品质');
  assert.notEqual(quality.view, recipes.view);
  assert.deepEqual(quality.nodes.map(({ id }) => id).sort(), [...world.unlocked].sort());
  assert.ok(quality.nodes.every(({ requires }) => requires.length === 0));
  assert.equal(points(), undefined);
  const improvement = redraw('经营改良');
  assert.deepEqual(improvement.nodes.find(({ id }) => id === 'fishCycle').requires, ['fishYield']);
  assert.deepEqual(points(), ['高级研发点', world.researchPoints, { variant: 'efficiency' }]);
  assert.equal(redraw('品种与配方').view.zoom, 0.72);
});

test('research finder locates the new brewing gift box without opening its details', () => {
  const view = pageFixture(newWorld(0), { tab: '品种与配方' });
  renderResearch(view.ui);
  const [tree] = view.find('tree', () => true);
  tree.onFind();
  const [, draw] = view.find('dialog', (title) => title === '查找节点');
  const finder = pageFixture(view.ui.w);
  const filter = (value) => {
    finder.find('tabs', (tabs) => tabs.includes(value))[2](value);
    finder.calls.length = 0;
    draw(finder.ui);
  };
  draw(finder.ui);
  filter('酿造');
  filter('商品');
  const [nodes, select] = finder.find('indexRows', () => true);
  assert.equal(nodes.length, 10);
  select(nodes.find(({ id }) => id === 'P180'));
  assert.equal(tree.view.focus, 'P180');
  assert.ok(finder.find('close', () => true));
  assert.equal(finder.find('dialog', () => true), undefined);
});
