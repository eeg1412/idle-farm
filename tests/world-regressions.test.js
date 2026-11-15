import test from 'node:test';
import assert from 'node:assert/strict';
import { objectives } from '../src/game/objectives.js';
import { qualityOffer, research } from '../src/game/advancement.js';
import {
  advanceWorld, arrangeStation, assignFacility, buyFacility, farmSaleOffer, newWorld, productionDurationMs,
  quantity, reserve, sell, sellBatch, sellFarm, tradeOffer,
} from '../src/game/world.js';

const longObjective = (world, id) => objectives(world).long.find((objective) => objective.id === id);

test('the textile chain can be researched in the first run and produces one unit per batch', () => {
  const world = newWorld(0);
  world.inventory = { C01: 24n, I01: 8n };
  assert.equal(research(world, 'C51'), false);
  assert.equal(qualityOffer(world, 'C51'), null);
  assert.equal(world.coins, 60n);
  assert.deepEqual(world.inventory, { C01: 24n, I01: 8n });
  world.coins = 20_000n;
  assert.ok(research(world, 'C51'));
  assert.equal(world.coins, 19_520n);
  assert.equal(quantity(world, 'C01'), 0n);
  assert.equal(quantity(world, 'I01'), 0n);
  assert.ok(assignFacility(world, 'C', 0, 'C51'));
  advanceWorld(world, 12_000 + 8 * 52_000);
  assert.equal(quantity(world, 'C51'), 16n);

  world.inventory.I101 = 32n;
  assert.equal(research(world, 'P151'), false);
  assert.equal(quantity(world, 'I101'), 32n);
  world.inventory.I101 = 0n;
  assert.ok(research(world, 'I101'));
  assert.ok(arrangeStation(world, 'I', 0, 'I101'));
  assert.equal(world.stations.I[0].batch, null);
  advanceWorld(world, world.clockMs + 2 * 52_000 + 46_000);
  assert.equal(quantity(world, 'I101'), 1n);

  world.inventory.I101 = 36n;
  assert.ok(research(world, 'P151'));
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
  assert.equal(world.coins, 60n + expectedRevenue);
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
