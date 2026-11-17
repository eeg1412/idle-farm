import assert from 'node:assert/strict';
import economyScale from '../../src/content/economy-scale.json' with { type: 'json' };
import * as game from '../../src/game/world.js';
import * as research from '../../src/game/advancement.js';
import { drawQuality, qualityDrawOffer } from '../../src/game/quality.js';
import { qualityDrawTaskTargets } from '../../src/game/quality-tasks.js';
import { localCalendarDay, marketRate, synchronizeMarket } from '../../src/game/market.js';
import { integerSquareRoot } from '../../src/game/prestige-ledger.js';
import { objectives, settleTaskRewards, taskResearchPointRewards } from '../../src/game/objectives.js';

const { catalog } = game;
const { items } = catalog;
const coinScale = BigInt(economyScale.coinScale);
const creditPerPoint = integerSquareRoot(1_000_000n ** 2n * coinScale);
const hour = 3_600_000;
const day = 24 * hour;
const ceil = (n, d) => (n + d - 1n) / d;
const quantity = game.quantity;
const status = (condition, label) => assert(condition, label);
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const rawKind = (id) => ['C', 'L', 'F'].includes(items[id].kind) ? items[id].kind : null;
const band = (id) => items[id].kind[0];
const sum = (values) => values.reduce((a, b) => a + b, 0n);
const TIME_LIMIT = Symbol('visit end');

function farm(world = game.newWorld(0)) {
  const cashflow = { C: 0n, L: 0n, F: 0n, workshop: 0n, research: 0n, rewards: 0n, resets: 0n };
  const initialCoins = world.coins;
  const initialPoints = world.researchPoints;
  const pointflow = { activity: 0n, rewards: 0n, tech: 0n };
  const initialBasicPoints = world.basicResearchPoints;
  const basicFlow = { earned: 0n, spent: 0n };
  const drawMilestones = {};
  const marketSales = {};
  let firstDelegation = null;
  const unlockTimes = {};
  let firstTech = null;
  let firstHandover = null;
  let materialWait = 0;

  function validate() {
    status(world.coins >= 0n && world.researchPoints >= 0n, '金币或点数为负');
    status(Object.values(world.inventory).every((n) => n >= 0n), '实物库存为负');
    assert.equal(world.coins, initialCoins + sum(Object.values(cashflow)), '全程金币账本守恒');
    assert.equal(world.researchPoints, initialPoints + sum(Object.values(pointflow)), '全程高级点账本守恒');
    assert.equal(world.basicResearchPoints, initialBasicPoints + basicFlow.earned - basicFlow.spent, '全程普通点账本守恒');
  }

  function settle() {
    const coins = world.coins;
    const points = world.researchPoints;
    const reward = settleTaskRewards(world);
    assert.equal(world.coins - coins, reward.coins, '任务发金币守恒');
    assert.equal(world.researchPoints - points, reward.researchPoints, '任务发点守恒');
    cashflow.rewards += reward.coins;
    pointflow.rewards += reward.researchPoints;
    validate();
    return reward;
  }

  function production(run) {
    const value = world.lifetimeProductionValue;
    const before = { ...world.stats.produced };
    function materials() {
      const stock = { ...world.inventory };
      for (const station of Object.values(world.stations).flat()) {
        for (const [id, count] of Object.entries(station.batch?.inputs ?? {})) stock[id] = (stock[id] ?? 0n) + count;
      }
      return stock;
    }
    const expected = materials();
    const pointsBefore = world.basicResearchPoints;
    run();
    basicFlow.earned += world.basicResearchPoints - pointsBefore;
    let producedValue = 0n;
    for (const [id, n] of Object.entries(world.stats.produced)) {
      const produced = n - (before[id] ?? 0n);
      if (!produced) continue;
      expected[id] = (expected[id] ?? 0n) + produced;
      producedValue += produced * game.unitPrice(world, id);
      const item = items[id];
      // Every checked workshop operates at level 1.
      if (!rawKind(id)) {
        const out = BigInt(item.output);
        assert.equal(produced % out, 0n, id + ' 完工批次数非整批');
        for (const [input, count] of Object.entries(item.inputs)) {
          expected[input] = (expected[input] ?? 0n) - produced / out * BigInt(count);
        }
      }
    }
    const actual = materials();
    for (const id of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
      assert.equal(actual[id] ?? 0n, expected[id] ?? 0n, id + ' 完工及在制品物料守恒');
    }
    assert.equal(world.lifetimeProductionValue - value, producedValue, 'T 仅由真实完工产生');
    settle();
  }

  function advanceTo(clock, limit = Infinity, deferFinalStarts = false) {
    if (clock > limit) throw TIME_LIMIT;
    const elapsed = clock - world.clockMs;
    production(() => {
      game.advanceWorld(world, clock, { deferFinalStarts });
      world.wallAnchorMs += elapsed;
      synchronizeMarket(world, localCalendarDay(world.wallAnchorMs));
    });
  }

  function wallVisit(wall) {
    production(() => game.updateWorldWallTime(world, wall));
  }

  function sell(id, pct = 100) {
    const quote = game.tradeOffer(world, id, pct);
    if (!quote?.affordable) return null;
    const coins = world.coins;
    status(game.sell(world, id, pct, quote), id + ' 售卖失败');
    assert.equal(world.coins - coins, quote.gain, id + ' 售卖金币守恒');
    assert.equal(quantity(world, id), quote.remaining, id + ' 售卖件数守恒');
    cashflow[rawKind(id) ?? 'workshop'] += quote.gain;
    const rate = marketRate(world, id);
    const base = game.unitPrice(world, id);
    assert.equal(quote.price, (base * BigInt(100 + rate) + 50n) / 100n, id + ' 每件行情成交价');
    if (rate) marketSales[rate > 0 ? 'up' : 'down'] ??= {
      wall: world.wallAnchorMs, id, rate, base, price: quote.price, earned: quote.gain,
    };
    settle();
    return quote;
  }

  function spend(cost, change, label, bucket = null) {
    const coins = world.coins;
    status(change(), label + ' 失败');
    assert.equal(coins - world.coins, cost, label + ' 金币守恒');
    if (bucket) cashflow[bucket] -= cost;
    settle();
  }

  function startingWheat() {
    for (const index of [0, 1]) status(game.assignFacility(world, 'C', index, 'C01'), '安排初始田');
  }

  // Plant one independent cash line. It is never switched by research material procurement.
  function cash(needed, limit) {
    while (world.coins < needed) {
      for (const id of new Set(Object.values(world.facilities).flat().map((line) => line.recipe).filter(Boolean))) {
        sell(id);
        if (world.coins >= needed) return;
      }
      const line = world.facilities.C[0];
      status(line.batch, '现金产线停工');
      const neededUnits = ceil(needed - world.coins, game.marketUnitPrice(world, line.recipe));
      const batches = ceil(neededUnits, BigInt(line.batch.amount));
      const next = line.batch.end + (Number(batches) - 1) * game.productionDurationMs(world, line.recipe);
      // Carry a running cash line to the next visit rather than fabricate the funds.
      if (next > limit) throw TIME_LIMIT;
      advanceTo(next, limit);
    }
  }

  function ensureFacility(kind, slot, limit) {
    while (world.facilities[kind].length <= slot) {
      const offer = game.facilityOffer(world, kind);
      status(offer && !offer.atLimit, kind + ' 无可用设施');
      cash(offer.cost, limit);
      spend(offer.cost, () => game.buyFacility(world, kind), kind + ' 买设施', kind);
    }
    return world.facilities[kind][slot];
  }

  function stopWorkshop(kind) {
    const slot = world.stations[kind][0];
    if (slot.recipe) status(game.clearStation(world, kind, 0), '停工 ' + slot.recipe);
  }

  function procure(id, amount, limit) {
    if (quantity(world, id) >= amount) {
      const kind = band(id);
      if (!rawKind(id) && world.stations[kind][0].recipe === id) stopWorkshop(kind);
      return;
    }
    status(world.unlocked.includes(id), '采购尚未解锁的材料 ' + id);
    const item = items[id];
    const raw = rawKind(id);
    if (raw) {
      const slot = raw === 'C' ? 1 : 0;
      const line = ensureFacility(raw, slot, limit);
      if (line.recipe !== id) status(game.assignFacility(world, raw, slot, id), '改种 ' + id);
      const out = BigInt(line.batch.amount);
      const batches = Number(ceil(amount - quantity(world, id), out));
      const ready = line.batch.end + (batches - 1) * game.productionDurationMs(world, id);
      const start = world.clockMs;
      advanceTo(ready, limit);
      materialWait += world.clockMs - start;
    } else {
      const kind = band(id);
      const active = world.stations[kind][0];
      if (active.recipe !== id || !active.batch) {
        stopWorkshop(kind);
        const batches = ceil(amount - quantity(world, id), BigInt(item.output));
        const required = Object.entries(item.inputs).map(([input, count]) => [input, batches * BigInt(count)]);
        // Make the deepest direct input first, then replenish anything it consumed.
        required.sort(([a], [b]) => depth(b) - depth(a) || compareId(a, b));
        for (const [input, count] of required) procure(input, count, limit);
        while (required.some(([input, count]) => quantity(world, input) < count)) {
          for (const [input, count] of required) procure(input, count, limit);
        }
        status(game.arrangeStation(world, kind, 0, id), '工位安排 ' + id);
      }
      const line = world.stations[kind][0];
      status(line.batch, '加工无法开批 ' + id);
      const batches = ceil(amount - quantity(world, id), BigInt(line.batch.amount));
      const ready = line.batch.end + (Number(batches) - 1) * game.productionDurationMs(world, id);
      // Finish in-window batches so long recipes can resume on the next return.
      if (ready > limit) {
        if (line.batch.end <= limit) advanceTo(line.batch.end, limit);
        throw TIME_LIMIT;
      }
      const start = world.clockMs;
      advanceTo(ready, limit, true);
      materialWait += world.clockMs - start;
      stopWorkshop(kind);
      game.settleProduction(world);
    }
    status(quantity(world, id) >= amount, '备料量不足 ' + id);
  }

  const depths = new Map();
  function depth(id) {
    if (!depths.has(id)) depths.set(id, 1 + Math.max(0, ...Object.keys(items[id].inputs).map(depth)));
    return depths.get(id);
  }

  function unlock(id, limit) {
    if (world.unlocked.includes(id)) return;
    const offer = research.researchOffer(world, id);
    cash(offer.coins, limit);
    const inputs = [...offer.costs].sort(([a], [b]) => depth(b) - depth(a) || compareId(a, b));
    for (const [input, count] of inputs) procure(input, count, limit);
    const ready = research.researchOffer(world, id);
    if (!ready.affordable && ready.costs.some(([input, count]) => quantity(world, input) < count)) {
      return unlock(id, limit);
    }
    status(ready.eligible && ready.affordable, '研发前置／库存未满足 ' + id);
    const before = ready.costs.map(([input, count]) => [input, quantity(world, input) - count]);
    const points = world.researchPoints;
    spend(ready.coins, () => research.research(world, id), '解锁 ' + id, 'research');
    for (const [input, count] of before) assert.equal(quantity(world, input), count, id + ' 研发扣料');
    status(world.researchPoints >= points, id + ' 解锁不得扣除高级点');
    unlockTimes[id] = world.wallAnchorMs;
  }

  function upgradeTech(key) {
    const offer = research.techOffer(world, key);
    status(offer.eligible && offer.affordable, key + ' 科技不足');
    const before = world.researchPoints;
    status(research.upgradeTech(world, key), key + ' 科技升级失败');
    assert.equal(before - world.researchPoints, offer.cost, key + ' 高级点守恒');
    pointflow.tech -= offer.cost;
    firstTech ??= world.wallAnchorMs;
    if (key === 'delegation') firstDelegation ??= world.wallAnchorMs;
    settle();
  }

  function draw() {
    const offer = qualityDrawOffer(world, 'all');
    if (!offer.affordable) return;
    const before = world.qualityDraws;
    const coins = world.coins;
    const points = world.researchPoints;
    const result = drawQuality(world, 'all', offer);
    assert.equal(result.count, offer.count);
    assert.equal(sum(Object.values(result.gains)), offer.count);
    assert.equal(world.coins, coins);
    assert.equal(world.researchPoints, points);
    basicFlow.spent += offer.cost;
    for (const threshold of [1n, ...Object.values(qualityDrawTaskTargets)]) {
      if (before < threshold && world.qualityDraws >= threshold) drawMilestones[threshold] = {
        wall: world.wallAnchorMs, clock: world.clockMs, hourlyRate: research.basicResearchHourlyRate(world),
      };
    }
    settle();
  }

  function handover() {
    const points = world.researchPoints;
    const coins = world.coins;
    const credit = game.farmSaleOffer(world);
    status(game.sellFarm(world, credit), '交接失败');
    assert.equal(world.researchPoints - points, credit.reward, '交接按报价发权益');
    firstHandover ??= { wall: world.wallAnchorMs, T: world.lifetimeProductionValue, points: credit.reward };
    cashflow.resets += world.coins - coins;
    pointflow.activity += credit.reward;
    settle();
    return credit.reward;
  }

  return { world, cashflow, pointflow, basicFlow, drawMilestones, marketSales, unlockTimes, startingWheat,
    advanceTo, wallVisit, settle, sell, cash, spend, ensureFacility, stopWorkshop, procure, unlock, upgradeTech, draw, handover,
    firstTech: () => firstTech, firstDelegation: () => firstDelegation,
    firstHandover: () => firstHandover, materialWait: () => materialWait };
}

export function checkOpening() {
  const bread = farm();
  bread.startingWheat();
  bread.advanceTo(12_000);
  assert.equal(quantity(bread.world, 'C01'), 4n);
  status(game.arrangeStation(bread.world, 'I', 0, 'I01'), '磨粉开工');
  bread.advanceTo(26_000);
  assert.equal(quantity(bread.world, 'I01'), 12n);
  assert.equal(bread.world.coins, 1330n * coinScale);
  bread.unlock('P01', 26_000);
  status(game.arrangeStation(bread.world, 'P', 0, 'P01'), '面包开工');
  bread.advanceTo(57_000);
  assert.equal(quantity(bread.world, 'P01'), 1n);

  const firstRaw = (id, unlockAt, finishAt) => {
    const trial = farm();
    const { world } = trial;
    trial.startingWheat();
    trial.advanceTo(12_000);
    status(game.arrangeStation(world, 'I', 0, 'I01'), '磨粉开工');
    trial.advanceTo(26_000);
    assert.equal(quantity(world, 'C01'), 4n);
    trial.stopWorkshop('I');
    assert.equal(quantity(world, 'C01'), 6n, '停工精确退款');
    trial.advanceTo(unlockAt);
    trial.unlock(id, unlockAt);
    trial.procure(id, 1n, finishAt);
    assert.equal(world.clockMs, finishAt);
    assert.equal(quantity(world, id), 2n);
    return finishAt / 1000;
  };

  const sale = farm();
  sale.startingWheat();
  sale.advanceTo(12_000);
  sale.sell('C01', 25);
  assert.equal(sale.world.coins, 1680n * coinScale);
  assert.equal(sale.world.researchPoints, 1n);
  sale.sell('C01', 25);
  sale.sell('C01');
  assert.equal(sale.world.researchPoints, 1n, '首点重复发放');
  assert.equal(qualityDrawOffer(sale.world).affordable, false);
  sale.advanceTo(hour);
  const expected = { ...sale.world.facilities.C[0].batch };
  const coins = sale.world.coins;
  sale.draw();
  assert.equal(sale.world.qualityDraws, 1n);
  assert.equal(sale.world.basicResearchPoints, 0n);
  assert.equal(sale.world.researchPoints, 1n);
  assert.equal(sale.world.coins, coins);
  assert.deepEqual(sale.world.facilities.C[0].batch, expected, '品质抽取保留开批数量与周期');

  const twoHours = farm();
  twoHours.startingWheat();
  twoHours.advanceTo(2 * hour);
  assert.equal(twoHours.world.lifetimeProductionValue, 72_000n * coinScale);
  assert.equal(game.farmSaleOffer(twoHours.world).reward, 18n);
  assert.equal(twoHours.handover(), 18n);
  assert.equal(twoHours.handover(), 0n, '空档交接重复领活动权益');

  const mixed = farm();
  mixed.startingWheat();
  const mixedLimit = 45 * 60_000;
  const order = unlockOrder();
  for (const id of order) {
    if (dependencies('PD01').has(id)) mixed.unlock(id, mixedLimit);
  }
  mixed.procure('PD01', 1n, mixedLimit);
  assert(mixed.world.clockMs <= mixedLimit, '复合商品出货超过 45 分钟');

  const { guide, long } = objectives(sale.world);
  assert.deepEqual([guide.filter((task) => !task.branch).length, guide.filter((task) => task.branch).length, long.length],
    [16, 14, 36]);
  assert.deepEqual(long.filter(({ id }) => id.startsWith('quality')).map(({ id }) => id).sort(),
    ['qualityCollection', 'qualityMaster', 'quality25', 'quality50', 'quality200', 'quality400'].sort());
  assert.equal(sum(Object.values(taskResearchPointRewards)), 40_152n);

  return { breadSeconds: 57, livestockSeconds: firstRaw('L01', 26_000, 56_000),
    fishSeconds: firstRaw('F01', 36_000, 78_000), mixedId: 'PD01', mixedSeconds: mixed.world.clockMs / 1000,
    firstAdvancedPointSeconds: 12, firstQualitySeconds: 3600, twoHourActivityPoints: 18, steadySupply: checkSteadySupply() };
}

function checkSteadySupply() {
  const sim = farm();
  const { world } = sim;
  sim.startingWheat();
  sim.advanceTo(60_000);
  sim.unlock('P01', 120_000);
  // Warm up the chain with stock available to both dedicated consumers.
  sim.procure('C01', 40n, 300_000);
  sim.procure('I01', 24n, 300_000);
  assert(game.clearFacility(world, 'C', 1));
  assert(game.arrangeStation(world, 'I', 0, 'I01'));
  assert(game.arrangeStation(world, 'P', 0, 'P01'));
  const start = { ...world.stats.produced };
  // A common duration for wheat, flour and bread has equal initial and final phases.
  const elapsed = 2604;
  sim.advanceTo(world.clockMs + elapsed * 1000);
  const produced = ['C01', 'I01', 'P01'].map((id) => (world.stats.produced[id] ?? 0n) - (start[id] ?? 0n));
  assert.deepEqual(produced, [434n, 2232n, 84n], '连续专线供料/同刻完工');
  const values = produced.map((amount, index) => amount * game.unitPrice(world, ['C01', 'I01', 'P01'][index]));
  assert(10n * values[2] > 11n * values[1] && 10n * values[1] > 11n * values[0], '实盘含余量同窗');
  assert(world.inventory.C01 > 0n && world.inventory.I01 > 0n, '必须计入上游余量');
  return { seconds: elapsed, produced, values };
}

function dependencies(target) {
  const needed = new Set();
  function visit(id) {
    if (needed.has(id)) return;
    needed.add(id);
    for (const input of Object.keys(items[id].inputs)) visit(input);
    const node = catalog.research[id];
    if (node) {
      for (const input of [...node.requires, ...Object.keys(node.costs)]) visit(input);
    }
  }
  visit(target);
  return needed;
}

function unlockOrder() {
  const unlocked = new Set(catalog.initial);
  const producible = new Set();
  const order = [];
  const targets = [...new Set(['L01', 'F01', ...dependencies('PD01'), ...dependencies('C50'),
    ...dependencies('L10'), ...dependencies('F10'), ...Object.keys(catalog.research)])];
  while (unlocked.size < Object.keys(items).length) {
    const before = unlocked.size + producible.size;
    for (const id of unlocked) {
      if (Object.keys(items[id].inputs).every((input) => producible.has(input))) producible.add(id);
    }
    for (const id of targets) {
      if (unlocked.has(id)) continue;
      const node = catalog.research[id];
      if (node.requires.every((required) => unlocked.has(required)) &&
        Object.keys(node.costs).every((required) => producible.has(required))) {
        unlocked.add(id);
        order.push(id);
      }
    }
    status(unlocked.size + producible.size > before, '研发顺序卡死');
  }
  return order;
}

function revenueIds(world) {
  return Object.entries(world.facilities).flatMap(([kind, lines]) => lines.flatMap(({ recipe }, index) => {
    if (!recipe || (kind === 'C' ? index === 1 : index === 0)) return [];
    return [recipe];
  }));
}

function diversify(sim, horizon, { maxLines = 6, maxLevel = 100n, terminal = false } = {}) {
  const { world } = sim;
  const unlockedRaw = world.unlocked.filter(rawKind);
  for (const kind of ['C', 'L', 'F']) {
    const candidates = unlockedRaw.filter((id) => rawKind(id) === kind);
    if (!candidates.length) continue;
    const gross = (id) => BigInt(items[id].output) * game.unitPrice(world, id);
    candidates.sort((a, b) => {
      const gain = gross(b) * BigInt(game.productionDurationMs(world, a)) -
        gross(a) * BigInt(game.productionDurationMs(world, b));
      return gain > 0n ? 1 : gain < 0n ? -1 : compareId(a, b);
    });
    const best = candidates[0];
    const lines = world.facilities[kind];
    const quote = game.facilityOffer(world, kind);
    if (lines.length < maxLines && quote.affordable && quote.cost <= world.coins / 12n) {
      sim.ensureFacility(kind, lines.length, horizon);
    }
    for (const [index, line] of lines.entries()) {
      if (!terminal && (kind === 'C' ? index === 1 : index === 0)) continue;
      if (line.recipe !== best) status(game.assignFacility(world, kind, index, best), kind + ' 营收线排产');
      if (BigInt(line.level) >= maxLevel) continue;
      for (const steps of [16n, 4n, 1n]) {
        const upgrade = game.facilityOffer(world, kind, index, steps);
        if (upgrade.cost > world.coins / 18n || upgrade.target > maxLevel) continue;
        sim.spend(upgrade.cost, () => game.upgradeFacility(world, kind, index, steps), kind + ' 营收设施升级', kind);
        break;
      }
    }
  }
}

function snapshot(sim, wall, phase, order, cursor) {
  const { world } = sim;
  return { phase, wallDay: Math.round(wall * 100 / day) / 100, unlocked: world.unlocked.length,
    nextResearch: order[cursor] ?? null, cash: world.coins, rp: world.researchPoints,
    T: world.lifetimeProductionValue, pendingRp: game.farmSaleOffer(world).reward,
    researchPaid: -sim.cashflow.research, researchWaitHours: Math.round(sim.materialWait() / hour * 10) / 10,
    netCash: sim.cashflow, delegationLevel: world.tech.delegation ?? 0,
    rawTiers: Object.fromEntries(['C50', 'L10', 'F10'].map((id) => [id, sim.unlockTimes[id] === undefined ? null : Math.ceil(sim.unlockTimes[id] / day)])),
    firstTechDay: sim.firstTech() === null ? null : sim.firstTech() / day, firstHandover: sim.firstHandover(),
    firstDelegationDay: sim.firstDelegation() === null ? null : sim.firstDelegation() / day,
    qualityDraws: world.qualityDraws, drawMilestones: sim.drawMilestones, marketSales: sim.marketSales,
    lines: Object.fromEntries(Object.entries(world.facilities).map(([kind, lines]) => [kind,
      lines.filter((line) => line.recipe).map(({ recipe, level }) => recipe + ':' + level)])) };
}

function checkProgression(visitDays, stopAtFirstTech, show) {
  const sim = farm();
  const { world } = sim;
  const order = unlockOrder();
  let cursor = 0;
  let regularIncome = null;
  sim.startingWheat();

  for (let wall = 0; wall <= 1825 * day; wall += visitDays * day) {
    sim.wallVisit(wall);
    const limit = world.clockMs + 40 * 60_000;
    sim.draw();
    if (world.completedRuns === 0 && wall > 0 && wall % (4 * day) === 0 && game.farmSaleOffer(world).reward >= 75n) {
      assert.equal(wall % (4 * day), 0, '经营交接不在四日节点');
      sim.handover();
      sim.upgradeTech('delegation');
      sim.upgradeTech('recipeDiscount');
      while ((world.tech.delegation ?? 0) < 20 && research.techOffer(world, 'delegation').affordable) {
        sim.upgradeTech('delegation');
      }
    }
    for (const id of new Set(revenueIds(world))) sim.sell(id);
    diversify(sim, limit);
    if (cursor < order.length) {
      try {
        while (cursor < order.length) {
          sim.unlock(order[cursor], limit);
          cursor += 1;
        }
      } catch (error) {
        if (error !== TIME_LIMIT) throw error;
      }
    }
    for (const [kind, id] of [['L', 'L01'], ['F', 'F01']]) {
      if (world.unlocked.includes(id) && !world.facilities[kind].length) {
        try {
          sim.procure(id, 1n, limit);
        } catch (error) {
          if (error !== TIME_LIMIT) throw error;
        }
      }
    }

    const allRaw = ['C01', 'L01', 'F01'].every((id) => (world.stats.produced[id] ?? 0n) > 0n);
    if (!regularIncome && allRaw && sim.firstTech() !== null && ['C', 'L', 'F'].every((kind) => sim.cashflow[kind] > 0n) &&
      world.facilities.L.some((line) => line.batch) && world.facilities.F.some((line) => line.batch)) {
      regularIncome = snapshot(sim, wall, '稳定开局', order, cursor);
      status(world.lifetimeProductionValue > 0n && world.stats.lifetimeRevenue > 0n, '三业缺少实际经营事件');
      show('回访', { visitDays, ...regularIncome });
      if (stopAtFirstTech) return;
    }
    if (cursor === order.length) {
      status(regularIncome, '完整图鉴路线缺少三业和首科技');
      show('完整图鉴', snapshot(sim, wall, '完整图鉴', order, cursor));
      return { sim, wall };
    }
    if (!stopAtFirstTech && (wall === 30 * day || wall === 90 * day || wall === 270 * day || wall === 540 * day)) {
      show('进度', snapshot(sim, wall, '研发', order, cursor));
    }
  }
  throw new Error('五年内未完成 ' + (stopAtFirstTech ? '三业开局' : '图鉴') + '：' +
    JSON.stringify(snapshot(sim, 1825 * day, '未完成', order, cursor), (_, value) => typeof value === 'bigint' ? value.toString() : value));
}

export function checkScenarios(show) {
  checkQualityVisits(1, show);
  checkQualityVisits(0.5, show);
  checkProgression(0.5, true, show);
  checkProgression(3, true, show);
  const { sim, wall } = checkProgression(1, false, show);
  show('最长批次', checkLongestBatch(sim.world));
  checkTerminal(sim, wall, show);
}

function checkQualityVisits(visitDays, show) {
  const sim = farm();
  const { world } = sim;
  sim.startingWheat();
  const expectedPerVisit = 6n;
  const maxTarget = 3_240n;
  const visits = Number(maxTarget / expectedPerVisit);
  let handoverDay;
  for (let visit = 1; visit <= visits; visit += 1) {
    const wall = visit * visitDays * day;
    sim.wallVisit(wall);
    sim.draw();
    sim.sell('C01');
    if (visit === 4) {
      const carry = [world.basicResearchPoints, world.qualityDraws, { ...world.quality }];
      const awarded = sim.handover();
      assert.ok(awarded > 0n);
      handoverDay = wall / day;
      assert.deepEqual([world.basicResearchPoints, world.qualityDraws, world.quality], carry);
    }
  }
  assert.equal(world.qualityDraws, maxTarget);
  assert.equal(world.basicResearchPoints, 0n);
  assert.equal(sim.basicFlow.earned, maxTarget * 100n);
  for (const [id, threshold] of Object.entries(qualityDrawTaskTargets)) {
    const expectedDay = Math.ceil(Number(threshold) / Number(expectedPerVisit)) * visitDays;
    assert.equal(sim.drawMilestones[threshold].wall / day, expectedDay);
    assert.ok(world.taskRewards.includes(id), id + ' 回访到账');
  }
  assert.ok(sim.marketSales.up && sim.marketSales.down, '回访路线须实际成交涨跌两种报价');
  show('品质回访', { visitDays, effectiveHoursPerVisit: 6, handoverDay,
    drawMilestones: sim.drawMilestones, marketSales: sim.marketSales, points: sim.basicFlow,
    cash: world.coins, revenue: world.stats.lifetimeRevenue, quality: world.quality, T: world.lifetimeProductionValue });
}

function checkLongestBatch(legalState) {
  const branch = farm(structuredClone(legalState));
  const { world } = branch;
  const [id, item] = Object.entries(items).reduce((longest, entry) =>
    entry[1].durationMs > longest[1].durationMs ? entry : longest);
  const startingClock = world.clockMs;
  const limit = startingClock + 7 * day;
  const inputs = Object.entries(item.inputs).sort(([left], [right]) =>
    Number(band(right) === 'P') - Number(band(left) === 'P') || compareId(left, right));
  while (inputs.some(([input, count]) => quantity(world, input) < BigInt(count))) {
    for (const [input, count] of inputs) branch.procure(input, BigInt(count), limit);
  }
  branch.stopWorkshop('P');
  status(game.arrangeStation(world, 'P', 0, id), id + ' 最长批未开工');
  const snapshot = world.stations.P[0].batch;
  const elapsed = snapshot.end - snapshot.start;
  assert.equal(elapsed, item.durationMs, id + ' 最长批实际周期');
  const elapsedBeforeBatch = world.clockMs - startingClock;
  const stockBefore = quantity(world, id);
  const comparison = structuredClone(world);
  game.advanceWorld(comparison, snapshot.end);
  branch.wallVisit(world.wallAnchorMs + elapsed);
  assert.equal(quantity(world, id), stockBefore + BigInt(snapshot.amount), id + ' 长批离线完工件数');
  assert.deepEqual(world.inventory, comparison.inventory, id + ' 长批在线离线库存等价');
  assert.equal(world.lifetimeProductionValue, comparison.lifetimeProductionValue, id + ' 长批在线离线产值等价');
  return { id, seconds: elapsed / 1000, sequentialPrepSeconds: elapsedBeforeBatch / 1000,
    output: snapshot.amount };
}

function remainingTechnology(world) {
  return sum(research.techDefinitions.map(({ key, costs }) => sum(costs.slice(world.tech[key] ?? 0))));
}

function rawProjection(world) {
  status(Object.values(world.stations).flat().every((station) => !station.recipe), '解析外推要求已停止工坊');
  const active = Object.values(world.facilities).flat().filter((line) => line.batch);
  status(active.length, '解析外推缺少稳定产线');
  const lines = active.map(({ batch, level, recipe }) => {
    const cycle = game.productionDurationMs(world, recipe);
    const amount = BigInt(batch.amount);
    const firstEnd = batch.end - world.clockMs;
    const levelOffset = BigInt(level) - 1n;
    const bonus = BigInt(research.facilityYieldBasis(world, rawKind(recipe)));
    const repeated = BigInt(items[recipe].output) * (1n + levelOffset + levelOffset ** 2n / 64n) * bonus / 10_000n;
    status(Number.isSafeInteger(cycle) && cycle > 0 && firstEnd > 0, '稳定产线快照无效');
    return { id: recipe, cycle, amount, firstEnd, repeated };
  });
  function estimate(elapsed) {
    const produced = {};
    for (const { id, cycle, amount, firstEnd, repeated } of lines) {
      if (elapsed < firstEnd) continue;
      produced[id] = (produced[id] ?? 0n) + amount + BigInt(Math.floor((elapsed - firstEnd) / cycle)) * repeated;
    }
    const value = sum(Object.entries(produced).map(([id, amount]) => game.unitPrice(world, id) * amount));
    const T = world.lifetimeProductionValue + value;
    const multiplier = BigInt(research.appraisalMultiplierBasisPoints(world));
    const credit = world.prestigeCredit +
      (integerSquareRoot(49n * T) - integerSquareRoot(49n * world.lifetimeProductionValue)) * multiplier;
    return { produced, value, T, credit, availableRp: world.researchPoints + credit / creditPerPoint };
  }
  const proof = structuredClone(world);
  for (const days of [1, 2]) {
    game.updateWorldWallTime(proof, world.wallAnchorMs + days * day);
    const predicted = estimate(Math.min(day, research.delegationMilliseconds(world)) * days);
    assert.equal(proof.lifetimeProductionValue, predicted.T, '真实稳定线与整周期产值外推不符');
    assert.equal(proof.prestigeCredit, predicted.credit, '真实稳定线与平方根权益外推不符');
    for (const [id, amount] of Object.entries(predicted.produced)) {
      assert.equal(quantity(proof, id) - quantity(world, id), amount, '真实稳定线与整数批量外推不符 ' + id);
    }
  }
  return estimate;
}

function checkTerminal(sim, catalogAt, show) {
  const { world } = sim;
  const observationEnd = 1825 * day;
  assert.equal(remainingTechnology(game.newWorld(0)), 4_443_060n);
  sim.stopWorkshop('I');
  sim.stopWorkshop('P');

  const allTech = Object.fromEntries(research.techDefinitions.map(({ key, maxLevel }) => [key, maxLevel]));
  const stages = [
    { delegation: 20, appraisal: 20, cropYield: 20, livestockYield: 20, fishYield: 20,
      livestockProcessing: 20, fishProcessing: 20, livestockCycle: 1, fishCycle: 1,
      livestockRefining: 1, fishRefining: 1 },
    { appraisal: 50, basicResearchRate: 50, marketManipulation: 1, marketForecast: 1 },
    { cropYield: 40, livestockYield: 40, fishYield: 40, livestockCycle: 25, fishCycle: 25 },
    { cropYield: 50, livestockYield: 50, fishYield: 50, livestockCycle: 50, fishCycle: 50 },
    allTech,
  ];
  const stageCost = (levels) => sum(research.techDefinitions.map(({ key, costs }) =>
    levels[key] ? sum(costs.slice(world.tech[key] ?? 0, levels[key])) : 0n));
  const handovers = [];
  let rate50;
  let highRateDraw;
  let fullRateDraw;
  let wall = world.wallAnchorMs;
  while (wall < observationEnd) {
    wall = Math.min(wall + day, observationEnd);
    sim.wallVisit(wall);
    sim.draw();
    if (rate50 && !highRateDraw) {
      const elapsed = world.clockMs - rate50.clock;
      assert.equal(elapsed, day, '满倍率之后按权威墙钟推进 24 小时');
      const toFirstHour = hour - rate50.elapsedMs;
      const firstHourWeight = rate50.weightedMs + BigInt(toFirstHour) * 300n;
      const earned = firstHourWeight / BigInt(hour) + BigInt(Math.floor((elapsed - toFirstHour) / hour)) * 300n;
      const draws = world.qualityDraws - rate50.draws;
      assert.equal(draws, (rate50.balance + earned) / 100n, '初回含购前数值的混合小时');
      assert.equal(world.basicResearchPoints, (rate50.balance + earned) % 100n);
      highRateDraw = { wallDay: wall / day, clock: world.clockMs, draws, earned, totalDraws: world.qualityDraws,
        totalEarned: sim.basicFlow.earned };
    } else if (highRateDraw && !fullRateDraw) {
      assert.equal(world.clockMs - highRateDraw.clock, day, '纯满倍率窗口按权威墙钟推进 24 小时');
      assert.equal(sim.basicFlow.earned - highRateDraw.totalEarned, 7_200n);
      const draws = world.qualityDraws - highRateDraw.totalDraws;
      assert.equal(draws, 72n, '完整满倍率24小时应抽72次');
      fullRateDraw = { wallDay: wall / day, draws };
    }
    for (const id of new Set(Object.values(world.facilities).flat().map(({ recipe }) => recipe).filter(Boolean))) sim.sell(id);
    for (const exit of handovers) {
      if (exit.cashRecoveredDay === null && world.coins >= exit.cashBefore) exit.cashRecoveredDay = wall / day;
    }
    const levels = stages[handovers.length];
    const budget = levels && stageCost(levels);
    if (budget && world.researchPoints + game.farmSaleOffer(world).reward >= budget) {
      const cashBefore = world.coins;
      const T = world.lifetimeProductionValue;
      const reward = sim.handover();
      for (const [key, target] of Object.entries(levels)) {
        while ((world.tech[key] ?? 0) < target) sim.upgradeTech(key);
      }
      handovers.push({ wallDay: wall / day, T, reward, spent: budget, cashBefore,
        cashAfter: world.coins, cashRecoveredDay: null });
      if (levels.basicResearchRate && !rate50) {
        assert.equal(research.basicResearchHourlyRate(world), 300);
        rate50 = { wallDay: wall / day, clock: world.clockMs, draws: world.qualityDraws,
          balance: world.basicResearchPoints, elapsedMs: world.basicResearchElapsedMs,
          weightedMs: world.basicResearchWeightedMs };
      }
    }
    diversify(sim, world.clockMs, { maxLines: 14, maxLevel: 400n, terminal: true });
    if (handovers.length === stages.length && world.taskRewards.includes('quality400')) break;
  }
  const fullTech = handovers.length === stages.length;
  let projectedTechDay;
  if (!fullTech) {
    const estimate = rawProjection(world);
    let low = 0;
    let high = 1;
    const elapsedPerVisit = Math.min(day, research.delegationMilliseconds(world));
    while (estimate(high * elapsedPerVisit).availableRp < remainingTechnology(world)) high *= 2;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (estimate(middle * elapsedPerVisit).availableRp < remainingTechnology(world)) low = middle;
      else high = middle;
    }
    projectedTechDay = wall / day + high;
  }
  show('终局', { catalogDay: catalogAt / day, observedThroughDay: wall / day, rate50, highRateDraw, fullRateDraw,
    firstHighTechDay: handovers[0]?.wallDay ?? null, techDay: fullTech ? handovers.at(-1).wallDay : null,
    projectedTechDay: projectedTechDay ?? null, remainingTechPoints: remainingTechnology(world), handovers,
    drawMilestones: sim.drawMilestones, marketSales: sim.marketSales, basicFlow: sim.basicFlow,
    coins: world.coins, advancedPoints: world.researchPoints, pointflow: sim.pointflow, T: world.lifetimeProductionValue,
    lifetimeRevenue: world.stats.lifetimeRevenue, netCash: sim.cashflow });
  status(rate50 && highRateDraw && fullRateDraw, '观察期内没有在真实经营路线下购满普通点倍率并抽取');
  status(world.taskRewards.includes('itemCollection') && world.taskRewards.includes('quality400'), '终局品质与图鉴任务未完成到账');
  status(fullTech, '五年观察期未购满科技，请根据实盘记录复核');
  assert.equal(sum(Object.values(world.tech).map(BigInt)), 1_124n);
  assert.ok(world.taskRewards.includes('techLevel1200'));
}
