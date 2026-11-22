import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog, facilityOffer, newWorld, sell, stationUpgradeOffer } from '../src/game/world.js';
import { giftManager, switchManagerAppearance } from '../src/game/managers.js';
import { managerTutorial, managerUpgradeHelp } from '../src/view/manager-help.js';
import { managerInfo, managerPages, renderManager, renderManagerDirectory } from '../src/view/manager-page.js';

function establishedWorld() {
  const w = newWorld(0);
  w.coins = 10n ** 30n;
  w.unlocked = Object.keys(catalog.items);
  w.stats.produced = Object.fromEntries(Object.keys(catalog.items).map((id) => [id, 1n]));
  Object.assign(w.stats, { sold: 1n, plots: 1n, boughtL: 1n, boughtF: 1n, boughtM: 1n });
  for (const kind of ['C', 'L', 'F', 'M']) w.facilities[kind] = [{ level: 10n, recipe: kind + '01', batch: null }];
  w.facilities.C[0].recipe = 'C02';
  for (const kind of ['I', 'P']) w.stations[kind] = [
    { level: 2n, recipe: kind + '01', batch: null }, { level: 2n, recipe: kind + '01', batch: null },
  ];
  w.reserves = { C01: 1n };
  w.completedRuns = 1;
  w.lifetimeProductionValue = 10n ** 30n;
  w.tech.delegation = 1;
  return w;
}

function pageFixture(w, width = 390) {
  const calls = [];
  let ui;
  ui = new Proxy({ w, local: {}, width,
    currentWorld: () => w,
    managerExpression: () => 'smile',
    closeManagerGift: (afterReturn) => { calls.push(['returned']); afterReturn(); },
    action: async (name, ...args) => {
      calls.push(['action', [name, ...args]]);
      if (name === 'giftManager') return giftManager(w, args[0]);
      if (name === 'switchManagerAppearance') return switchManagerAppearance(w, args[0]);
      return true;
    },
  }, { get(target, method) {
    if (method in target) return target[method];
    return (...args) => {
      calls.push([method, args]);
      if (method === 'card') args[0](ui);
      if (method === 'feature') args[1](ui);
      if (method === 'scrollList') args[0].forEach((entry, index) => args[1](ui, entry, index));
    };
  } });
  const find = (method, match = () => true) => calls.findLast(([name, args]) => name === method && match(...args))?.[1];
  const click = (label) => {
    const buttons = find('buttons', (entries) => entries.some((entry) => entry.label === label));
    assert.ok(buttons, label);
    return buttons[0].find((entry) => entry.label === label).onClick();
  };
  const dialog = (title) => {
    const definition = find('dialog', (name) => name === title);
    assert.ok(definition, title);
    const panel = pageFixture(w, width);
    definition[1](panel.ui);
    return panel;
  };
  return { ui, calls, find, click, dialog };
}

test('new guidance follows the active main task and does not offer future-page tutorials', () => {
  const w = newWorld(0);
  w.facilities.C[0].recipe = null;
  w.facilities.C[0].batch = null;
  const first = managerTutorial(w, '田地');
  assert.equal(first.taskId, 'firstHarvest');
  assert.equal(first.priority, 2);
  assert.match(first.text, /「播种」.*「小麦」/);
  assert.equal(managerTutorial(w, '加工'), null);
  assert.equal(managerTutorial(w, '精制'), null);
  assert.match(managerTutorial(w, '任务').text, /先去「田地」/);
  const completed = structuredClone(w);
  completed.stats.produced.C01 = 1n;
  assert.equal(managerTutorial(completed, '田地'), null);
  assert.equal(managerTutorial(completed, '加工').taskId, 'firstFlour');
});

test('branch tutorials appear after first sale and preserve each branch order', () => {
  const beforeSale = newWorld(0);
  assert.equal(managerTutorial(beforeSale, '畜牧'), null);
  const w = structuredClone(beforeSale);
  w.stats.sold = 1n;
  assert.equal(managerTutorial(w, '畜牧').taskId, 'livestockIntro');
  assert.match(managerTutorial(w, '畜牧').text, /「购买养殖场」/);
  assert.equal(managerTutorial(w, '加工'), null);
  const built = structuredClone(w);
  built.stats.boughtL = 1n;
  built.facilities.L.push({ level: 1n, recipe: null, batch: null });
  assert.equal(managerTutorial(built, '畜牧').taskId, 'collectLivestock');
  assert.equal(managerTutorial(built, '加工'), null);
});

test('station upgrade tutorial supports either real workshop page', () => {
  const w = establishedWorld();
  for (const slots of Object.values(w.stations)) for (const slot of slots) slot.level = 1n;
  for (const page of ['加工', '精制']) {
    const message = managerTutorial(w, page);
    assert.equal(message.taskId, 'stationUpgrade');
    assert.match(message.text, new RegExp(page + '位'));
    assert.match(message.text, /「确认升级」/);
  }
});

test('all six production upgrade hints use exact existing affordability quotes', () => {
  for (const [page, kind] of Object.entries({ 田地: 'C', 畜牧: 'L', 鱼塘: 'F', 矿洞: 'M', 加工: 'I', 精制: 'P' })) {
    const w = establishedWorld();
    const quote = Object.hasOwn(w.facilities, kind) ? facilityOffer : stationUpgradeOffer;
    const cost = quote(w, kind, 0, 1n).cost;
    w.coins = cost;
    assert.equal(managerUpgradeHelp(w, page).priority, 1, page);
    assert.match(managerUpgradeHelp(w, page).text, /「升级」.*「确认升级」/, page);
    const poor = structuredClone(w);
    poor.coins = cost - 1n;
    assert.equal(managerUpgradeHelp(poor, page), null, page);
  }
});

test('active tutorials and blocked production take precedence over affordable upgrades', () => {
  const initial = newWorld(0);
  initial.coins = 10n ** 30n;
  const page = pageFixture(initial);
  renderManager(page.ui, 'field', false, '田地');
  assert.equal(page.find('managerBanner')[0].message.priority, 2);
  const blocked = establishedWorld();
  blocked.inventory = {};
  assert.ok(managerUpgradeHelp(blocked, '加工'));
  const workshop = pageFixture(blocked);
  renderManager(workshop.ui, 'processing', false, '加工');
  const help = workshop.find('managerBanner')[0].message;
  assert.equal(help.priority, 1);
  assert.match(help.text, /小麦/);
  assert.doesNotMatch(help.text, /确认升级/);
  const empty = structuredClone(blocked);
  for (const slot of empty.stations.I) slot.recipe = null;
  const unassigned = pageFixture(empty);
  renderManager(unassigned.ui, 'processing', false, '加工');
  assert.doesNotMatch(unassigned.find('managerBanner')[0].message.text, /确认升级/);
});

test('all estate subpages reuse one role and give a page description', () => {
  const w = establishedWorld();
  for (const page of ['角色管理', '统计', '出售庄园历史', '图鉴', '出售庄园']) {
    assert.equal(managerPages[page], 'estate');
    const view = pageFixture(w);
    renderManager(view.ui, 'estate', false, page);
    const banner = view.find('managerBanner')[0];
    assert.equal(banner.role, 'estate');
    assert.equal(banner.background, 'manager-art:backgrounds/estate');
    assert.equal(banner.message.priority, 0);
    assert.ok(banner.message.text.startsWith('这里'));
  }
});

test('profile has only archive details and switches the actual appearance', async () => {
  const w = newWorld(0);
  const page = pageFixture(w);
  managerInfo(page.ui, 'field');
  const profile = page.dialog('管理员资料');
  assert.equal(profile.find('managerReply'), undefined);
  assert.equal(profile.find('buttons', (entries) => entries.some(({ label }) => label === '送礼')), undefined);
  assert.equal(profile.find('buttons')[0].find(({ label }) => label === '切换角色').icon, 'manager-art:icons/switch');
  const before = w.managers.roles.field.gender;
  await profile.click('切换角色');
  assert.notEqual(w.managers.roles.field.gender, before);
});

test('gift quota stays legible and gift callbacks preserve the visible source without a success toast', async () => {
  for (const inCard of [false, true]) {
    const w = newWorld(0);
    w.productionValue = 50_000n;
    w.inventory.C01 = 2_000n;
    assert.equal(sell(w, 'C01', 50), true);
    const page = pageFixture(w, 320);
    let open;
    if (inCard) {
      renderManagerDirectory(page.ui);
      open = page.calls.find(([method]) => method === 'buttons')[1][0].find(({ label }) => label === '送礼').onClick;
    } else {
      renderManager(page.ui, 'estate', false, '角色管理');
      open = page.find('managerBanner')[0].actions.find(({ label }) => label === '送礼').onClick;
    }
    open();
    const picker = page.dialog('送礼');
    const quota = picker.find('row', (label) => label === '还能赠送的礼物总值');
    assert.ok(quota);
    assert.doesNotMatch(quota[1], /金币/);
    assert.equal(quota[2].stack, true);
    const [choices, pick] = picker.find('indexRows');
    pick(choices[0]);
    const quantity = picker.dialog('送出小麦');
    await quantity.click('确认送礼');
    assert.ok(quantity.calls.some(([method]) => method === 'returned'));
    assert.equal(quantity.find('toast'), undefined);
    const reply = page.find('queueManagerSpeech');
    assert.ok(reply);
    assert.equal(reply[0], inCard ? 'tasks' : 'estate');
    assert.equal(reply[3].inCard, inCard);
  }
});
