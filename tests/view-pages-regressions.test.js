import assert from 'node:assert/strict';
import test from 'node:test';
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import {
  advanceWorld, arrangeStation, assignFacility, catalog, farmSaleOffer, newWorld, productionDurationMs, reserve, sell, sellFarm,
  upgradeStation,
} from '../src/game/world.js';
import { upgradeTech } from '../src/game/advancement.js';
import { qualityDrawOffer } from '../src/game/quality.js';
import { hoursLabel, renderTasks, renderWarehouse } from '../src/view/management-pages.js';
import { renderProduction, renderWorkshop } from '../src/view/production-pages.js';
import { renderResearch, researchReadyTabs } from '../src/view/research-page.js';
import { compact } from '../src/view/numbers.js';

const coinScale = BigInt(economyScale.coinScale);

function pageFixture(w, local = {}) {
  const calls = [];
  const ui = new Proxy({ w, local, width: 390 }, {
    get(target, method) {
      if (method in target) return target[method];
      return (...args) => {
        calls.push([method, args]);
        if (method === 'card') args[0](ui);
        if (method === 'feature') args[1](ui);
        if (method === 'scrollList') {
          const [items, draw] = args;
          items.forEach((item, index) => draw(ui, item, index));
        }
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
  const dialog = (title, local) => {
    const call = find('dialog', (name) => name === title);
    assert.ok(call, title);
    const body = pageFixture(w, local);
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

test('warehouse keeps sold-out items until the next run starts', () => {
  const world = newWorld(0);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  advanceWorld(world, productionDurationMs(world, 'C01'));
  assert.ok(sell(world, 'C01', 100));

  const soldOut = pageFixture(world);
  renderWarehouse(soldOut.ui);
  assert.ok(soldOut.find('feature', (id) => id === 'C01'));
  assert.ok(soldOut.find('row', (label, value) => label === '库存' && value === 0n));
  assert.ok(soldOut.find('buttons', (items) => items.some((item) => item.label === '出售' && item.disabled)));

  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.ok(world.stats.produced.C01 > 0n);
  const nextRun = pageFixture(world);
  renderWarehouse(nextRun.ui);
  assert.equal(nextRun.find('feature', (id) => id === 'C01'), undefined);
});

test('warehouse hourly chart truncates all rates and abbreviates from a thousand', () => {
  const view = pageFixture(newWorld(0));
  renderWarehouse(view.ui);
  view.click('查看产出／支出图表');
  const chart = view.dialog('每小时产出与支出', { sampledValue: [
    { id: 'C01', produced: 100_099n, consumed: 99n, net: 100_000n },
    { id: 'C02', produced: 150_000_099n, consumed: 200_000_099n, net: -50_000_000n },
    { id: 'C03', produced: 0n, consumed: 99n, net: -99n },
    { id: 'C04', produced: 99n, consumed: 0n, net: 99n },
    { id: 'C05', produced: 99_999n, consumed: 199n, net: 99_800n },
  ] });
  const rates = chart.calls.filter(([name]) => name === 'stats')
    .map(([, [columns]]) => columns.map(({ value }) => value));
  assert.deepEqual(rates, [
    ['1K', '0', '+1K'],
    ['1M', '2M', '−500K'],
    ['0', '0', '0'],
    ['0', '0', '0'],
    ['999', '1', '+998'],
  ]);
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
});

test('linked sources in the workshop identify the item and open its research conditions', () => {
  const world = newWorld(0);
  for (const [tab, id, station] of [['加工', 'I03', '加工位'], ['精制', 'P01', '精制位']]) {
    const view = pageFixture(world, { tab, id });
    renderWorkshop(view.ui);
    assert.deepEqual(view.find('item', (key) => key === id), [id, catalog.items[id].name, '在' + station + '中选择对应配方']);
    view.click('查看研发条件');
    assert.deepEqual(view.find('go', () => true), ['研究', { tab: '品种配方', id }]);
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
  assert.ok(chooser.find('text', (label) => label.includes('改用其他配方会中止本批')));
  assert.deepEqual(chooser.find('choiceGrid', () => true)[0], [
    { id: 'I01', icon: 'I01', label: '面粉', duration: '14 秒', selected: false },
    { id: 'I03', icon: 'I03', label: '草莓果酱', duration: '39 秒', selected: true },
  ]);

  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const waiting = pageFixture(world);
  renderWorkshop(waiting.ui);
  assert.ok(waiting.find('heading', (label) => label === '面粉'));
  assert.ok(waiting.find('badges', (badges) => badges.some(({ label, tone }) => label === '等待材料' && tone === 'blocked')));
  const reference = { type: 'station', kind: 'I', index: 0 };
  const countdown = waiting.find('countdown', (label) => label === '剩余');
  assert.ok(countdown);
  assert.deepEqual(countdown[1], reference);
  assert.equal(countdown[2].inactiveText, '暂停');
  assert.equal(countdown[2].inactiveTone, 'danger');
  assert.deepEqual(waiting.find('batchProgress', () => true), [null, reference]);
  assert.equal(waiting.find('heading', (label) => label === '草莓果酱'), undefined);
});

test('the expansion guide sends a player who needs more coins to sell stock', () => {
  const world = newWorld(0);
  world.stats.produced = { C01: 1n, I01: 1n, P01: 1n };
  world.stats.sold = 1n;
  world.unlocked.push('P01');
  world.coins -= 1n;

  const production = pageFixture(world);
  renderProduction(production.ui);
  production.click('扩建田地 · 前往出货');
  assert.ok(production.find('go', (target) => target === '仓库'));

  const tasks = pageFixture(world);
  renderTasks(tasks.ui);
  tasks.click('前往出货');
  assert.ok(tasks.find('go', (target) => target === '仓库'));
  world.coins += 1n;
  renderTasks(tasks.ui);
  tasks.click('前往田地');
  assert.ok(tasks.find('go', (target, { tab }) => target === '牧场' && tab === '田地'));
});

test('a claimed full-technology card shows completion and receipt without a revised reward', () => {
  const world = newWorld(0);
  world.unlocked = Object.keys(catalog.items);
  world.stats.produced = { C01: 1n, I01: 1n, P01: 1n };
  world.stats.sold = 1n;
  world.stats.plots = 1n;
  world.facilities.C[0].recipe = 'C02';
  world.facilities.C[0].level = '10';
  world.reserves.C01 = 1n;
  world.stations.I[0].level = '2';
  world.stations.I.push({ level: '1' });
  world.stations.P.push({ level: '1' });
  world.taskRewards = ['techLevel1200', 'qualityCollection'];

  const view = pageFixture(world);
  renderTasks(view.ui);
  const start = view.calls.findIndex(([kind, args]) => kind === 'heading' && args[0] === '科技全满');
  assert.ok(start >= 0);
  const end = view.calls.findIndex(([kind], index) => kind === 'card' && index > start);
  assert.deepEqual(view.calls.slice(start + 1, end), [['row', ['完成', '已到账']]]);
  assert.ok(view.find('text', (value) => value.startsWith('奖励 ') && value.includes('已到账')));
  assert.ok(view.find('titleBar', (_, label) => label === '已完成'));
});

test('each crop, livestock and fish facility requests its own art', () => {
  const world = newWorld(0);
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

test('all active livestock main cards request animation while details remain static', () => {
  const world = newWorld(0);
  const ids = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'L');
  world.unlocked.push(...ids);
  for (const id of ids) {
    world.facilities.L = [{ level: '1', recipe: null, batch: null }];
    assert.ok(assignFacility(world, 'L', 0, id));
    const { batch } = world.facilities.L[0];
    const view = pageFixture(world, { tab: '畜牧' });
    renderProduction(view.ui);
    const [, , options] = view.find('feature', (_, __, settings) => settings.style === 'facility');
    assert.equal(options.plotAnimation, undefined);
    assert.deepEqual(options.livestockAnimation, { batch, index: 0 }, id);
    options.onClick();
    const details = view.dialog('畜牧场详情');
    assert.equal(details.find('feature', () => true)[2].livestockAnimation, undefined);

    world.facilities.L[0].batch = null;
    const idle = pageFixture(world, { tab: '畜牧' });
    renderProduction(idle.ui);
    assert.equal(idle.find('feature', (_, __, settings) => settings.style === 'facility')[2].livestockAnimation, undefined);
  }
});

test('livestock choices identify the animal while details and upgrades show their facility scenes', () => {
  const world = newWorld(0);
  world.unlocked = ['L01', 'L10'];
  world.facilities.L = [{ level: '1', recipe: null, batch: null }];
  assert.ok(assignFacility(world, 'L', 0, 'L01'));
  world.facilities.L[0].recipe = 'L10';
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
    ['livestock-L01', catalog.items.L01.subject], ['livestock-L10', catalog.items.L10.subject],
  ]);

  view.click('升级');
  const upgrade = view.dialog('升级畜牧场');
  assert.ok(upgrade.find('feature', (art) => art === 'scene-L10'));
  assert.ok(upgrade.find('row', (label, _, settings) => label.startsWith('本批') && settings.icon === 'L01'));
  assert.ok(upgrade.find('row', (label, _, settings) => label === '下批产出' && settings.icon === 'L10'));
});

test('all livestock choices use separate animal icons while warehouse art keeps the output items', () => {
  const world = newWorld(0);
  const ids = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'L');
  world.unlocked.push(...ids);
  world.facilities.L = [{ level: '1', recipe: 'L01', batch: null }];
  const farm = pageFixture(world, { tab: '畜牧' });
  renderProduction(farm.ui);
  farm.click('更换');
  const choices = farm.dialog('选择牲畜').find('choiceGrid', () => true)[0];
  assert.deepEqual(choices.map(({ id, icon, label }) => [id, icon, label]),
    ids.map((id) => [id, 'livestock-' + id, catalog.items[id].subject]));

  world.inventory = Object.fromEntries(ids.map((id) => [id, 3n]));
  const warehouse = pageFixture(world);
  renderWarehouse(warehouse.ui);
  const art = warehouse.calls.filter(([name]) => name === 'feature').map(([, args]) => args[0]);
  assert.deepEqual(art.sort(), [...ids].sort());
  assert.ok(art.every((id) => !id.startsWith('livestock-') && !id.startsWith('scene-')));
});

test('crop selection uses individual icons for all unlocked choices in one grid', () => {
  const world = newWorld(0);
  const ids = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C51'];
  world.unlocked.push(...ids.slice(1));
  const view = pageFixture(world, { tab: '田地' });
  renderProduction(view.ui);
  view.click('播种');
  const chooser = view.dialog('选择作物');
  assert.deepEqual(chooser.find('choiceGrid', () => true)[0].map(({ id, icon }) => [id, icon]), ids.map((id) => [id, id]));
});

test('research keeps the recipe and tech camera state and separates both point balances', () => {
  const world = newWorld(0);
  world.coins = 100_000n * coinScale;
  world.researchPoints = 10n ** 120n + 9n;
  world.basicResearchPoints = 101n;
  for (const [id, amount] of Object.entries(catalog.research.C02.costs)) world.inventory[id] = BigInt(amount);
  const local = { scroll: 0 };
  const view = pageFixture(world, local);
  const redraw = (tab) => {
    local.tab = tab;
    view.calls.length = 0;
    renderResearch(view.ui);
    return view.find('tree', () => true)?.[0];
  };
  const points = () => view.find('balance', (label) => label === '高级研发点');
  const recipes = redraw('品种配方');
  const [tabs, , , options] = view.find('tabs', () => true);
  assert.deepEqual(tabs, ['品种配方', '品质', '经营改良']);
  assert.deepEqual(options.indicatorTabs, new Set(tabs));
  assert.equal(recipes.nodes.length, Object.keys(catalog.items).length);
  assert.deepEqual(recipes.nodes.find(({ id }) => id === 'P151').requires, catalog.research.P151.requires);
  assert.equal(points(), undefined);
  recipes.view.zoom = 0.72;
  assert.equal(redraw('品质'), undefined);
  assert.ok(view.find('researchProgress', () => true));
  assert.deepEqual(view.find('indexRows', () => true)[0].map(({ icon }) => icon).sort(), [...world.unlocked].sort());
  assert.deepEqual(view.find('stats', () => true)[0], [
    { label: '普通研发点', value: 101n, icon: 'research-point-basic' },
  ]);
  const improvement = redraw('经营改良');
  assert.notEqual(improvement.view, recipes.view);
  assert.deepEqual(improvement.nodes.find(({ id }) => id === 'fishCycle').requires, ['fishYield']);
  assert.deepEqual(improvement.groups, ['通用', '农业', '畜牧', '水产', '市场']);
  assert.equal(improvement.nodes.length, 26);
  assert.ok(improvement.nodes.every(({ group }) => improvement.groups.includes(group)));
  assert.deepEqual(points(), ['高级研发点', world.researchPoints, { variant: 'efficiency', icon: 'research-point' }]);
  assert.equal(redraw('品种配方').view.zoom, 0.72);
});

test('research exposes the same market nodes in the full tree and finder filter', () => {
  const view = pageFixture(newWorld(0), { tab: '经营改良' });
  renderResearch(view.ui);
  const [tree] = view.find('tree', () => true);
  const market = tree.nodes.filter(({ group }) => group === '市场');
  assert.deepEqual(market.map(({ id }) => id).sort(), ['marketForecast', 'marketManipulation', 'marketPromotion', 'premiumSales']);
  tree.onFind();
  const [, draw] = view.find('dialog', (title) => title === '查找节点');
  const finder = pageFixture(view.ui.w);
  draw(finder.ui);
  finder.find('tabs', (tabs) => tabs.includes('市场'))[2]('市场');
  draw(finder.ui);
  const [matches, select] = finder.find('indexRows', () => true);
  assert.deepEqual(matches, market);
  select(matches.find(({ id }) => id === 'premiumSales'));
  assert.equal(tree.view.focus, 'premiumSales');
});

test('technology details use dedicated art, short effects and only unmet requirements', () => {
  const view = pageFixture(newWorld(0), { tab: '经营改良' });
  renderResearch(view.ui);
  const [tree] = view.find('tree', () => true);
  const open = (id) => {
    tree.onSelect(id);
    return view.dialog(tree.nodes.find((node) => node.id === id).label);
  };
  for (const [id, icon, label, from, to] of [
    ['marketForecast', 'tech-market-forecast', '明日首次行情', '未解锁', '可查看'],
    ['marketManipulation', 'tech-market-manipulation', '每日重置次数', '0 次', '1 次'],
    ['marketPromotion', 'tech-market-promotion', '上涨方向概率', '50%', '51%'],
    ['premiumSales', 'tech-premium-sales', '最高售价倍率', '1.90 倍', '2.01 倍'],
    ['basicResearchRate', 'tech-basic-research-rate', '每小时普通研发点', '100 点', '104 点'],
  ]) {
    const details = open(id);
    assert.equal(tree.nodes.find((node) => node.id === id).icon, icon);
    assert.ok(details.find('feature', (art) => art === icon));
    assert.deepEqual(details.find('detailRows', () => true)[0], [{ label, value: { from, to } }]);
    assert.equal(details.find('text', () => true), undefined);
  }
  const delegation = open('delegation');
  assert.deepEqual(delegation.find('detailRows', () => true)[0], [
    { label: '离线结算上限', value: { from: '6小时', to: '6小时36分钟' } },
  ]);
  assert.equal(delegation.find('text', () => true), undefined);
  view.ui.w.tech.fishYield = 20;
  const fishCycle = open('fishCycle');
  assert.deepEqual(fishCycle.find('detailRows', () => true)[0].map(({ label, value }) => [label, value]), [
    ['已研发' + catalog.items.F05.subject, '未达成'],
  ]);
});

test('quality offers single and all draws without a target, and only ordinary points activate it', async () => {
  const world = newWorld(0);
  world.coins = 0n;
  world.researchPoints = 0n;
  world.basicResearchPoints = 650n;
  assert.ok(researchReadyTabs(world).has('品质'));
  const view = pageFixture(world, { tab: '品质' });
  view.ui.action = (...args) => {
    view.calls.push(['action', args]);
    return { count: 6n, gains: { C01: 4n, I01: 2n } };
  };
  renderResearch(view.ui);
  assert.equal(view.find('indexRows', () => true)[1], undefined);
  await view.click('全部抽取（6 次）');
  assert.deepEqual(view.find('action', () => true), ['drawQuality', 'all', qualityDrawOffer(world, 'all')]);
  const results = view.dialog('品质抽取结果');
  assert.ok(results.find('row', (label, value) => label === '小麦' && value === '+4 级'));
  assert.ok(results.find('row', (label, value) => label === '面粉' && value === '+2 级'));
  world.basicResearchPoints = 99n;
  renderResearch(view.ui);
  assert.ok(!researchReadyTabs(world).has('品质'));
  assert.ok(view.find('buttons', (buttons) => buttons.every(({ disabled }) => disabled)));
});

test('market entry, pricing and item marks follow the run gate and all three selection surfaces', () => {
  const world = newWorld(0);
  world.productionValue = 99_999n;
  world.market = { day: '2026-11-17', sequence: 0, used: 0, rates: { C01: 200, I01: -90 } };
  world.inventory = { C01: 10n, I01: 10n };
  const warehouse = pageFixture(world);
  renderWarehouse(warehouse.ui);
  assert.equal(warehouse.find('buttons', (buttons) => buttons.some(({ label }) => label === '市场行情')), undefined);
  world.productionValue += 1n;
  renderWarehouse(warehouse.ui);
  warehouse.click('市场行情');
  const market = warehouse.dialog('市场行情');
  assert.ok(market.find('row', (label, value, options) =>
    label === '小麦' && value === '450 金币' && options.marketRate === 200));
  assert.ok(market.find('row', (label, value, options) =>
    label === '面粉' && value.endsWith(' 金币') && options.marketRate === -90));
  assert.ok(warehouse.find('heading', (label, options) => label === '小麦' && options.marketRate === 200));
  const farm = pageFixture(world, { tab: '田地' });
  renderProduction(farm.ui);
  farm.click('播种');
  const fields = farm.dialog('选择作物');
  assert.ok(fields.find('choiceGrid', (items) => items.some(({ id, marketRate }) => id === 'C01' && marketRate === 200)));
  const workshop = pageFixture(world, { tab: '加工' });
  renderWorkshop(workshop.ui);
  workshop.click('选择配方');
  const recipes = workshop.dialog('选择配方');
  assert.ok(recipes.find('choiceGrid', (items) => items.some(({ id, marketRate }) => id === 'I01' && marketRate === -90)));
});

test('production details show facility yield technology and station upgrades starting with the next batch', () => {
  const world = newWorld(0);
  world.coins = 10_000n * coinScale;
  world.researchPoints = 150n;
  world.inventory.C01 = 2n;
  world.facilities.C[0].level = '20';
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.ok(upgradeTech(world, 'cropYield'));
  assert.ok(upgradeStation(world, 'I', 0, 1n));
  const farm = pageFixture(world, { tab: '田地' });
  renderProduction(farm.ui);
  farm.find('feature', (id, _, options) => id === 'scene-C01' && options.plotAnimation)[2].onClick();
  const field = farm.dialog('田地详情');
  assert.ok(field.find('row', (label, value) => label === '本批产出' && value === '50 份'));
  assert.ok(field.find('row', (label, value) => label === '下批产出' && value === '51 份'));
  const workshop = pageFixture(world);
  renderWorkshop(workshop.ui);
  workshop.find('feature', (_, __, options) => options.workshopAnimation?.id === 'I01')[2].onClick();
  const mill = workshop.dialog('加工位详情');
  assert.ok(mill.find('row', (label, value) => label === '本批产出' && value === '12 件'));
  assert.ok(mill.find('row', (label, value) => label === '下批产出' && value === '24 件'));
  assert.ok(mill.find('materialTable', (rows) => rows.some(({ id, needed }) => id === 'C01' && needed === 4n)));
});

test('research finder locates the new brewing gift box without opening its details', () => {
  const view = pageFixture(newWorld(0), { tab: '品种配方' });
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

test('durations of an hour or more read as hours and whole minutes rounded up', () => {
  assert.equal(hoursLabel(3600), '1 小时');
  assert.equal(hoursLabel(3601), '1 小时 1 分');
  assert.equal(hoursLabel(5400), '1 小时 30 分');
  assert.equal(hoursLabel(14_400), '4 小时');
  assert.equal(hoursLabel(86_399), '24 小时');
});
