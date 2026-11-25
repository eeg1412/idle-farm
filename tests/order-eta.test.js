import assert from 'node:assert/strict';
import test from 'node:test';
import { newWorld, orderCompletion, productionDurationMs } from '../src/game/world.js';

const afternoon = new Date(2026, 10, 22, 15).getTime();
const hour = 3_600_000;
const order = (count, item = 'P01') => ({ item, count });

function setup() {
  const world = newWorld(afternoon);
  world.unlocked.push('P01');
  return world;
}

// Places a P01 station with an optional batch locked at `amount` ending at `end`; no inputs are consumed.
function station(world, index, { end = null, amount = '1', level = '1' } = {}) {
  const slots = world.stations.P;
  slots[index] ??= { order: Math.max(...Object.values(world.stations).flat().map(({ order: slot }) => slot)) + 1,
    level: '1', recipe: null, priority: false, batch: null };
  Object.assign(slots[index], {
    recipe: 'P01', level,
    batch: end === null ? null : { id: `b${index}`, amount, start: world.clockMs, end },
  });
}

function completion(world, value) {
  const before = structuredClone(world);
  const result = orderCompletion(world, value);
  assert.deepEqual(world, before);
  return result;
}

test('stock covering the order is ready, even before research', () => {
  const world = newWorld(afternoon);
  world.inventory = { P01: 5n };
  assert.deepEqual(completion(world, order(5n)), { status: 'ready' });
});

test('an item not researched is unknown', () => {
  const world = newWorld(afternoon);
  station(world, 0, { end: world.clockMs + hour });
  assert.deepEqual(completion(world, order(1n)), { status: 'unknown' });
});

test('idle or finished stations are unknown', () => {
  const world = setup();
  station(world, 0);
  assert.deepEqual(completion(world, order(1n)), { status: 'unknown' });
  station(world, 0, { end: world.clockMs });
  assert.deepEqual(completion(world, order(1n)), { status: 'unknown' });
});

test('a need within the running batch completes at its end', () => {
  const world = setup();
  const end = world.clockMs + 12 * hour;
  station(world, 0, { end, amount: '3' });
  world.inventory = { P01: 1n };
  assert.deepEqual(completion(world, order(4n)), { status: 'scheduled', atMs: end });
});

test('a need spanning batches completes at the k-th arrival', () => {
  const world = setup();
  const end = world.clockMs + 12 * hour;
  const period = productionDurationMs(world, 'P01');
  // Level 2 makes 2 per later batch: 1 + 2 + 2 + 2 reaches 7 on the fourth arrival.
  station(world, 0, { end, amount: '1', level: '2' });
  assert.deepEqual(completion(world, order(7n)), { status: 'scheduled', atMs: end + 3 * period });
  assert.deepEqual(completion(world, order(6n)), { status: 'scheduled', atMs: end + 3 * period });
  assert.deepEqual(completion(world, order(5n)), { status: 'scheduled', atMs: end + 2 * period });
});

test('interleaved lines complete at the earliest combined arrival', () => {
  const world = setup();
  const period = productionDurationMs(world, 'P01');
  const a = world.clockMs + 1_000;
  const b = a + Math.floor(period / 2);
  station(world, 0, { end: a });
  station(world, 1, { end: b });
  // Arrivals: a, b, a + p, b + p, a + 2p, ...
  assert.deepEqual(completion(world, order(2n)), { status: 'scheduled', atMs: b });
  assert.deepEqual(completion(world, order(3n)), { status: 'scheduled', atMs: a + period });
  assert.deepEqual(completion(world, order(4n)), { status: 'scheduled', atMs: b + period });
  assert.deepEqual(completion(world, order(5n)), { status: 'scheduled', atMs: a + 2 * period });
});

test('large orders are computed without stepping batches and unsafe times are unknown', () => {
  const world = setup();
  const end = world.clockMs + hour;
  const period = productionDurationMs(world, 'P01');
  station(world, 0, { end });
  assert.deepEqual(completion(world, order(1_000_000_000n)),
    { status: 'scheduled', atMs: end + (1_000_000_000 - 1) * period });
  assert.deepEqual(completion(world, order(10n ** 30n)), { status: 'unknown' });
});

test('the merchant hold reduces available stock', () => {
  const world = setup();
  const end = world.clockMs + hour;
  const period = productionDurationMs(world, 'P01');
  station(world, 0, { end });
  world.inventory = { P01: 5n };
  assert.deepEqual(completion(world, order(4n)), { status: 'ready' });
  world.merchant = { ...world.merchant, batch: { id: 'm1', wanted: { id: 'P01' } } };
  world.merchantHold = { id: 'P01', run: world.completedRuns, batchId: 'm1', count: 3n };
  // 5 - 3 = 2 available; 2 more arrive at end and end + p.
  assert.deepEqual(completion(world, order(4n)), { status: 'scheduled', atMs: end + period });
});
