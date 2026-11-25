import assert from 'node:assert/strict';
import test from 'node:test';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import { actualHourlyProduction, advanceWorld, forecastHourlyProduction, newWorld } from '../src/game/world.js';

const afternoon = new Date(2026, 10, 22, 15).getTime();
// Full-speed hundredths per hour for `amount` items every batch of `id`, rounded like the forecast.
const hourly = (id, amount) => {
  const duration = BigInt(catalog.items[id].durationMs);
  return (amount * 360_000_000n + duration / 2n) / duration;
};
const rows = (world) => Object.fromEntries(actualHourlyProduction(world).map((row) => [row.id, row]));
// Sets recipes without starting batches, so stock stays as given.
function station(world, kind, index, recipe, extra = {}) {
  const slots = world.stations[kind];
  slots[index] ??= { order: Math.max(...Object.values(world.stations).flat().map(({ order }) => order)) + 1,
    level: '1', recipe: null, priority: false, batch: null };
  Object.assign(slots[index], { recipe }, extra);
}

test('an input in stock runs the station at full speed and matches the full-load forecast', () => {
  const world = newWorld(afternoon);
  world.inventory = { I01: 2n };
  station(world, 'P', 0, 'P01');
  const before = structuredClone(world);
  const actual = actualHourlyProduction(world);
  assert.deepEqual(world, before);
  assert.deepEqual(actual.map(({ id, produced, consumed, net }) => ({ id, produced, consumed, net })),
    forecastHourlyProduction(world));
  const { P01, I01 } = rows(world);
  assert.equal(P01.produced, hourly('P01', 1n));
  assert.equal(I01.consumed, hourly('P01', 2n));
  assert.deepEqual([P01.arranged, P01.starved, P01.short, I01.arranged, I01.starved, I01.short],
    [true, false, false, false, false, false]);
});

test('without stock or upstream a station produces nothing and its input is short', () => {
  const world = newWorld(afternoon);
  station(world, 'P', 0, 'P01');
  const { P01, I01 } = rows(world);
  assert.deepEqual([P01.produced, P01.consumed, P01.net, P01.arranged, P01.starved], [0n, 0n, 0n, true, true]);
  assert.deepEqual([I01.produced, I01.consumed, I01.short, I01.arranged], [0n, 0n, true, false]);
});

test('reserved stock does not count as in stock', () => {
  const world = newWorld(afternoon);
  world.inventory = { I01: 10n };
  world.reserves = { I01: 9n };
  station(world, 'P', 0, 'P01');
  const { P01, I01 } = rows(world);
  assert.deepEqual([P01.produced, P01.starved, I01.short], [0n, true, true]);
  world.reserves = { I01: 8n };
  assert.equal(rows(world).P01.produced, hourly('P01', 1n));
});

test('stock without upstream runs downstream at full speed and drains the input', () => {
  const world = newWorld(afternoon);
  world.inventory = { I01: 100n };
  station(world, 'P', 0, 'P01');
  const { P01, I01 } = rows(world);
  assert.equal(P01.produced, hourly('P01', 1n));
  assert.equal(I01.produced, 0n);
  assert.equal(I01.net, -hourly('P01', 2n));
  assert.ok(I01.net < 0n);
  assert.equal(I01.short, false);
});

test('short upstream output goes to stations in priority order', () => {
  // One wheat field feeds one flour line at full speed; flour is the only upstream for bread and biscuits.
  const build = (breadPriority) => {
    const world = newWorld(afternoon);
    world.inventory = { I02: 100n };
    world.facilities.C[0].recipe = 'C01';
    station(world, 'I', 0, 'I01');
    station(world, 'P', 0, 'P02');
    // Level 14 (x16) asks for more flour than the line makes.
    station(world, 'P', 1, 'P01', { level: '14', priority: breadPriority });
    return rows(world);
  };
  const flour = hourly('I01', 12n);
  const prioritized = build(true);
  assert.equal(prioritized.C01.short, false);
  assert.deepEqual([prioritized.I01.produced, prioritized.I01.starved, prioritized.I01.short], [flour, false, true]);
  // Bread takes every bag of flour; biscuits get none.
  assert.deepEqual([prioritized.P02.produced, prioritized.P02.starved], [0n, true]);
  assert.ok(prioritized.P01.starved);
  assert.ok(prioritized.P01.produced >= flour / 2n - 1n && prioritized.P01.produced <= flour / 2n + 1n);
  assert.ok(prioritized.I01.consumed >= flour - 1n && prioritized.I01.consumed <= flour + 1n);
  assert.equal(prioritized.I02.consumed, 0n);

  // In slot order the biscuits come first and run at full speed; bread gets the rest.
  const ordered = build(false);
  assert.deepEqual([ordered.P02.produced, ordered.P02.starved], [hourly('P02', 1n), false]);
  assert.equal(ordered.I02.consumed, hourly('P02', 1n));
  const rest = flour - hourly('P02', 1n);
  assert.ok(ordered.P01.starved);
  assert.ok(ordered.P01.produced >= rest / 2n - 1n && ordered.P01.produced <= rest / 2n + 1n);
});

test('an input limited elsewhere returns its unused share to later stations', () => {
  const world = newWorld(afternoon);
  world.facilities.C[0].recipe = 'C01';
  station(world, 'I', 0, 'I01');
  // Biscuits come first but have no syrup, so all flour reaches the bread line.
  station(world, 'P', 0, 'P02', { priority: true });
  station(world, 'P', 1, 'P01', { level: '14' });
  const { P01, P02, I01, I02 } = rows(world);
  assert.deepEqual([P02.produced, P02.starved, I02.short], [0n, true, true]);
  const flour = hourly('I01', 12n);
  assert.ok(P01.produced >= flour / 2n - 1n && P01.produced <= flour / 2n + 1n);
  assert.equal(I01.short, true);
});

test('a running batch counts as in stock until it completes without a refill', () => {
  const world = newWorld(afternoon);
  world.inventory = { I01: 2n };
  station(world, 'P', 0, 'P01');
  advanceWorld(world, 0);
  const { batch } = world.stations.P[0];
  assert.ok(batch && world.inventory.I01 === 0n);
  const running = rows(world);
  assert.deepEqual([running.P01.produced, running.P01.starved, running.I01.short], [hourly('P01', 1n), false, false]);
  assert.equal(running.I01.consumed, hourly('P01', 2n));
  advanceWorld(world, batch.end);
  assert.equal(world.stations.P[0].batch, null);
  const idle = rows(world);
  assert.deepEqual([idle.P01.produced, idle.P01.starved, idle.I01.short], [0n, true, true]);
});

test('an advance records real capacity only after a completion', () => {
  const world = newWorld(afternoon);
  world.inventory = { I01: 6n };
  station(world, 'P', 0, 'P01');
  advanceWorld(world, 1_000);
  assert.deepEqual(world.orders.capacity, {});
  advanceWorld(world, world.stations.P[0].batch.end);
  // The completion restarts the line, and its running batch counts as in stock.
  assert.equal(world.orders.capacity.P01, hourly('P01', 1n));
});
