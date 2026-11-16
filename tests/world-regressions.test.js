import test from 'node:test';
import assert from 'node:assert/strict';
import { objectives, settleTaskRewards, taskProductionGates } from '../src/game/objectives.js';
import {
  delegationHours, delegationMilliseconds, qualityOffer, research, upgradeQuality,
} from '../src/game/advancement.js';
import {
  advanceWorld, arrangeStation, assignFacility, buyFacility, catalog, facilityOffer, farmSaleOffer, newWorld,
  productionDurationMs, quantity, reserve, sell, sellBatch, sellFarm, stationMultiplier, stationRequirements,
  stationUpgradeOffer, tradeOffer,
} from '../src/game/world.js';

const longObjective = (world, id) => objectives(world).long.find((objective) => objective.id === id);

test('the textile chain can be researched in the first run and produces one unit per batch', () => {
  const world = newWorld(0);
  world.inventory = { C01: 24n, I01: 8n };
  assert.equal(research(world, 'C51'), false);
  assert.equal(qualityOffer(world, 'C51'), null);
  assert.equal(world.coins, 600n);
  assert.deepEqual(world.inventory, { C01: 24n, I01: 8n });
  // LT-2026-11-v4: C51 costs 246,000 coins, 2,046 wheat and 646 flour.
  world.coins = 250_000n;
  world.inventory = { C01: 2_046n, I01: 646n };
  assert.ok(research(world, 'C51'));
  assert.equal(world.coins, 4_000n);
  assert.equal(quantity(world, 'C01'), 0n);
  assert.equal(quantity(world, 'I01'), 0n);
  assert.ok(assignFacility(world, 'C', 0, 'C51'));
  advanceWorld(world, 12_000 + 8 * 52_000);
  assert.equal(quantity(world, 'C51'), 16n);

  world.inventory.I101 = 32n;
  assert.equal(research(world, 'P151'), false);
  assert.equal(quantity(world, 'I101'), 32n);
  world.inventory.I101 = 0n;
  // I101 costs 302,000 coins and 48 cotton; spend all cotton so the yarn station starts empty.
  world.coins = 302_000n;
  world.inventory.C51 = 48n;
  assert.ok(research(world, 'I101'));
  assert.equal(world.coins, 0n);
  assert.equal(quantity(world, 'C51'), 0n);
  assert.ok(arrangeStation(world, 'I', 0, 'I101'));
  assert.equal(world.stations.I[0].batch, null);
  advanceWorld(world, world.clockMs + 2 * 52_000 + 46_000);
  assert.equal(quantity(world, 'I101'), 1n);

  world.inventory.I101 = 36n;
  world.coins = 401_000n; // P151 costs 401,000 coins and 14 yarn.
  assert.ok(research(world, 'P151'));
  assert.equal(quantity(world, 'I101'), 22n);
  assert.equal(research(world, 'P151'), false);
  assert.equal(world.completedRuns, 0);
  assert.equal(world.wallAnchorMs, 0);
  assert.ok(arrangeStation(world, 'P', 0, 'P151'));
  assert.deepEqual(world.stations.P[0].batch.inputs, { I101: 4n });
  advanceWorld(world, world.clockMs + 150_000);
  assert.equal(quantity(world, 'P151'), 1n);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.ok(['C51', 'I101', 'P151'].every((id) => world.unlocked.includes(id)));
});

test('confirmed sales update both revenue totals and a farm sale starts the next run at zero', () => {
  const world = newWorld(0);
  world.inventory.C01 = 10n ** 120n + 9n;
  world.inventory.I01 = 2n;
  const wheat = tradeOffer(world, 'C01', 100);
  const flour = tradeOffer(world, 'I01', 100);
  const expectedRevenue = wheat.gain + flour.gain;

  assert.equal(sellBatch(world, [wheat, { ...flour, expectedQuote: { ...flour, count: 1n } }]), false);
  assert.equal(quantity(world, 'C01'), wheat.count);
  assert.equal(world.stats.revenue, 0n);
  assert.equal(world.stats.lifetimeRevenue, 0n);

  assert.ok(sellBatch(world, [wheat, flour]));
  assert.equal(world.coins, 600n + expectedRevenue);
  assert.equal(world.stats.revenue, expectedRevenue);
  assert.equal(world.stats.lifetimeRevenue, expectedRevenue);

  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(world.stats.revenue, 0n);
  assert.equal(world.stats.lifetimeRevenue, expectedRevenue);
  assert.equal(longObjective(world, 'farmIncome').current, expectedRevenue);
  assert.ok(longObjective(world, 'farmIncome').done);

  world.inventory.I01 = 1n;
  const nextSale = tradeOffer(world, 'I01', 100);
  assert.ok(sell(world, 'I01', 100));
  assert.equal(world.stats.revenue, nextSale.gain);
  assert.equal(world.stats.lifetimeRevenue, expectedRevenue + nextSale.gain);
});

test('百级名品 tracks the highest quality level against 100', () => {
  const world = newWorld(0);
  assert.equal(longObjective(world, 'qualityMaster').current, 1n);

  world.quality = { C01: '99', I01: '75' };
  let goal = longObjective(world, 'qualityMaster');
  assert.equal(goal.current, 99n);
  assert.equal(goal.required, 100n);
  assert.equal(goal.done, false);

  world.quality.I01 = '100';
  goal = longObjective(world, 'qualityMaster');
  assert.equal(goal.current, 100n);
  assert.equal(goal.done, true);

  world.quality.C01 = (10n ** 120n).toString();
  assert.equal(longObjective(world, 'qualityMaster').current, 10n ** 120n);
});

test('fields, barns and ponds change production immediately and keep a batch when selecting its current item', () => {
  for (const [kind, original, replacement] of [['C', 'C01', 'C02'], ['L', 'L01', 'L02'], ['F', 'F01', 'F02']]) {
    const world = newWorld(0);
    world.coins = 600n;
    if (kind !== 'C') world.unlocked.push(original);
    world.unlocked.push(replacement);
    if (kind !== 'C') assert.ok(buyFacility(world, kind));
    assert.ok(assignFacility(world, kind, 0, original));
    const facility = world.facilities[kind][0];
    const oldBatch = facility.batch;
    advanceWorld(world, 1000);

    assert.equal(assignFacility(world, kind, 0, 'I01'), false);
    assert.ok(assignFacility(world, kind, 0, original));
    assert.equal(facility.batch, oldBatch);
    assert.ok(assignFacility(world, kind, 0, replacement));
    assert.equal(facility.recipe, replacement);
    assert.equal(facility.batch.id, replacement);
    assert.equal(facility.batch.start, 1000);
    assert.equal(facility.batch.end, 1000 + productionDurationMs(world, replacement));
    assert.equal(world.productionValue, 0n);
    assert.deepEqual(world.stats.produced, {});

    advanceWorld(world, oldBatch.end);
    assert.equal(quantity(world, original), kind === 'C' ? 2n : 0n);
    assert.equal(quantity(world, replacement), 0n);
    advanceWorld(world, facility.batch.end);
    assert.ok(quantity(world, replacement) > 0n);
  }
});

test('changing a processing recipe returns its recorded inputs and starts the replacement immediately', () => {
  const world = newWorld(0);
  const station = world.stations.I[0];
  world.unlocked.push('I03');
  world.inventory = { C01: 2n, C03: 4n, I02: 1n };
  assert.ok(reserve(world, 'C03', 3n));
  assert.ok(arrangeStation(world, 'I', 0, 'I03'));
  assert.equal(station.batch, null);
  assert.equal(quantity(world, 'I02'), 1n);

  assert.ok(reserve(world, 'C03', 2n));
  const batch = station.batch;
  assert.equal(batch.id, 'I03');
  assert.deepEqual(batch.inputs, { C03: 2n, I02: 1n });
  assert.equal(quantity(world, 'C03'), 2n);
  assert.equal(quantity(world, 'I02'), 0n);

  advanceWorld(world, 1000);
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.equal(station.recipe, 'I01');
  assert.equal(station.batch.id, 'I01');
  assert.equal(station.batch.start, 1000);
  assert.deepEqual(station.batch.inputs, { C01: 2n });
  assert.equal(quantity(world, 'C01'), 0n);
  assert.equal(quantity(world, 'C03'), 4n);
  assert.equal(quantity(world, 'I02'), 1n);
  assert.equal(world.reserves.C03, 2n);
  assert.equal(world.productionValue, 0n);
  assert.deepEqual(world.stats.produced, {});

  advanceWorld(world, batch.end);
  assert.equal(quantity(world, 'I03'), 0n);
  assert.equal(quantity(world, 'I01'), 1n);
});

test('refining can reuse refunded inputs and switch to a recipe with missing materials', () => {
  const world = newWorld(0);
  const station = world.stations.P[0];
  world.unlocked.push('P01', 'P02', 'P03');
  world.inventory = { I01: 2n, I02: 1n };
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  const oldBatch = station.batch;
  advanceWorld(world, 1000);

  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  const replacement = station.batch;
  assert.equal(replacement.id, 'P02');
  assert.equal(replacement.start, 1000);
  assert.deepEqual(replacement.inputs, { I01: 1n, I02: 1n });
  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  assert.equal(station.batch, replacement);
  assert.equal(quantity(world, 'I01'), 1n);
  assert.equal(quantity(world, 'I02'), 0n);

  assert.ok(arrangeStation(world, 'P', 0, 'P03'));
  assert.equal(station.recipe, 'P03');
  assert.equal(station.batch, null);
  assert.equal(quantity(world, 'I01'), 2n);
  assert.equal(quantity(world, 'I02'), 1n);
  advanceWorld(world, Math.max(oldBatch.end, replacement.end));
  assert.equal(quantity(world, 'P01'), 0n);
  assert.equal(quantity(world, 'P02'), 0n);
});

test('replacing a legacy station batch only returns materials recorded in the save', () => {
  const world = newWorld(0);
  const station = world.stations.I[0];
  world.unlocked.push('I02');
  world.inventory.C01 = 2n;
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const oldBatch = station.batch;
  oldBatch.inputs = null;
  station.recipe = 'I02';
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.equal(station.batch, oldBatch);
  assert.equal(station.recipe, 'I01');

  assert.ok(arrangeStation(world, 'I', 0, 'I02'));
  assert.equal(station.batch, null);
  assert.equal(station.recipe, 'I02');
  assert.equal(quantity(world, 'C01'), 0n);
  advanceWorld(world, oldBatch.end);
  assert.equal(quantity(world, 'I01'), 0n);
});

test('a station switch coinciding with completions starts the new recipe after those outputs enter stock', () => {
  const world = newWorld(0);
  world.unlocked.push('I02');
  world.inventory = { C01: 4n, C02: 2n };
  advanceWorld(world, 3000);
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.equal(world.stations.I[0].batch.end, 12000);

  advanceWorld(world, 12000, { deferFinalStarts: true });
  assert.ok(arrangeStation(world, 'I', 0, 'I02'));
  assert.equal(quantity(world, 'C01'), 6n);
  assert.equal(quantity(world, 'I01'), 1n);
  assert.equal(world.stats.produced.I01, 1n);
  assert.equal(world.stations.I[0].batch.id, 'I02');
  assert.equal(world.stations.I[0].batch.start, 12000);
});

test('LT-2026-11-v4 data: crops yield 2, fish yield 1 per batch', () => {
  assert.equal(catalog.balanceVersion, 'LT-2026-11-v4');
  const items = Object.values(catalog.items);
  assert.ok(items.filter(({ kind }) => kind === 'C').every(({ output }) => output === '2'));
  assert.ok(items.filter(({ kind }) => kind === 'F').every(({ output }) => output === '1'));
});

test('barns and ponds cost 600 coins to buy and 300 coins for the first upgrade', () => {
  for (const kind of ['L', 'F']) {
    const world = newWorld(0);
    assert.equal(facilityOffer(world, kind).cost, 600n);
    assert.ok(buyFacility(world, kind));
    assert.equal(world.coins, 0n);
    assert.equal(facilityOffer(world, kind).cost, 3_000n);
    assert.equal(facilityOffer(world, kind, 0).cost, 300n);
  }
});

test('station batches scale output and inputs by W(L) = 1 + j + floor(j^2/64)', () => {
  for (const [level, multiplier] of [[1, 1n], [2, 2n], [8, 8n], [9, 10n], [65, 129n], [100, 253n]]) {
    assert.equal(stationMultiplier(level), multiplier, String(level));
    assert.equal(stationMultiplier(String(level)), multiplier, String(level));
    assert.equal(stationRequirements(newWorld(0), 'I01', BigInt(level))[0].needed, 2n * multiplier, String(level));
  }

  const world = newWorld(0);
  const station = world.stations.I[0];
  station.recipe = 'I01';
  const upgrade = stationUpgradeOffer(world, 'I', 0, 8n);
  assert.equal(upgrade.target, 9n);
  assert.equal(upgrade.currentOutput, 1n);
  assert.equal(upgrade.output, 10n);

  station.recipe = null;
  station.level = '9';
  world.inventory = { C01: 19n };
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.equal(station.batch, null);
  world.inventory.C01 = 20n;
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.deepEqual(station.batch.inputs, { C01: 20n });
  assert.equal(station.batch.amount, '10');
  assert.equal(quantity(world, 'C01'), 0n);
  advanceWorld(world, station.batch.end);
  assert.equal(quantity(world, 'I01'), 10n);
});

test('delegation caps offline time at 24 h, +144 min per level to 10, then +36 min per level', () => {
  const world = newWorld(0);
  for (const [level, minutes] of [[0, 1440], [1, 1584], [10, 2880], [11, 2916], [20, 3240], [50, 4320]]) {
    world.tech.delegation = level;
    assert.equal(delegationMilliseconds(world), minutes * 60000, String(level));
    assert.equal(delegationHours(world), minutes / 60, String(level));
  }
});

test('quality above 100 also costs research points Rc(q) = d + floor(d(d+1)(2d+1)/1800)', () => {
  const world = newWorld(0);
  assert.equal(qualityOffer(world, 'C01', 99n).researchPoints, 0n);
  for (const [current, target, points] of [
    [100n, 101n, 1n], [100n, 120n, 29n], [100n, 200n, 1227n], [120n, 200n, 1198n], [100n, 1000n, 812250n],
    [1n, 1000n, 812250n],
  ]) {
    world.quality.C01 = current.toString();
    assert.equal(qualityOffer(world, 'C01', target - current).researchPoints, points, `${current}->${target}`);
  }

  world.quality.C01 = '99';
  const free = qualityOffer(world, 'C01', 1n);
  for (const [id, count] of free.costs) world.inventory[id] = count;
  world.coins = free.coins;
  assert.equal(free.researchPoints, 0n);
  assert.ok(upgradeQuality(world, 'C01', 1n));
  assert.equal(world.quality.C01, '100');
  assert.equal(world.researchPoints, 0n);

  const offer = qualityOffer(world, 'C01', 20n);
  assert.equal(offer.researchPoints, 29n);
  world.inventory = Object.fromEntries(offer.costs);
  world.coins = offer.coins;
  world.researchPoints = 28n;
  assert.equal(qualityOffer(world, 'C01', 20n).affordable, false);
  assert.equal(upgradeQuality(world, 'C01', 20n), false);
  assert.equal(world.quality.C01, '100');
  world.researchPoints = 29n;
  assert.equal(qualityOffer(world, 'C01', 20n).affordable, true);
  assert.ok(upgradeQuality(world, 'C01', 20n));
  assert.equal(world.quality.C01, '120');
  assert.equal(world.researchPoints, 0n);
  assert.equal(world.coins, 0n);

  world.quality.C01 = '100';
  world.coins = 10n ** 80n;
  for (const [id] of offer.costs) world.inventory[id] = 10n ** 80n;
  world.researchPoints = 29n; // Rc(121) = 32, so research points stop the maximum at 120.
  assert.equal(qualityOffer(world, 'C01', 'max').target, 120n);
});

test('gated tasks need lifetime production value before they count as done or pay out', () => {
  assert.deepEqual(taskProductionGates, {
    newFarm: 130_000_000_000n,
    runs5: 2_000_000_000_000_000n,
    runs20: 200_000_000_000_000_000n,
    runs50: 8_000_000_000_000_000_000n,
    runs100: 70_000_000_000_000_000_000n,
  });
  const world = newWorld(0);
  world.completedRuns = 5;
  world.lifetimeProductionValue = taskProductionGates.newFarm - 1n;
  let goal = longObjective(world, 'runs5');
  assert.equal(goal.current, 5n);
  assert.equal(goal.gate, taskProductionGates.runs5);
  assert.equal(goal.gateMet, false);
  assert.equal(goal.done, false);
  let settled = settleTaskRewards(world);
  assert.ok(!settled.ids.includes('newFarm'));
  assert.ok(!settled.ids.includes('runs5'));

  world.lifetimeProductionValue = taskProductionGates.runs5 - 1n;
  assert.equal(longObjective(world, 'runs5').done, false);
  settled = settleTaskRewards(world);
  assert.ok(settled.ids.includes('newFarm'));
  assert.ok(!settled.ids.includes('runs5'));

  world.lifetimeProductionValue = taskProductionGates.runs5;
  goal = longObjective(world, 'runs5');
  assert.equal(goal.gateMet, true);
  assert.equal(goal.done, true);
  settled = settleTaskRewards(world);
  assert.ok(settled.ids.includes('runs5'));
  assert.ok(!settled.ids.includes('runs20'));

  const ungated = longObjective(world, 'farmIncome');
  assert.equal(ungated.gate, null);
  assert.equal(ungated.gateMet, true);
  assert.equal(ungated.required, 1_000_000_000_000n);
});

test('农地扩建 counts the extra fields currently owned, not lifetime purchases', () => {
  const world = newWorld(0);
  world.stats.plots = 12n;
  assert.equal(longObjective(world, 'moreFields').current, 0n);
  for (let index = 0; index < 10; index += 1) world.facilities.C.push({ level: '1', recipe: null, batch: null });
  const goal = longObjective(world, 'moreFields');
  assert.equal(goal.current, 10n);
  assert.equal(goal.done, true);
});
