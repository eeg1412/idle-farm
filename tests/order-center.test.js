import assert from 'node:assert/strict';
import test from 'node:test';
import { managerGiftRemaining } from '../src/game/managers.js';
import { objectives, settleTaskRewards } from '../src/game/objectives.js';
import {
  acceptOrder, canDeliverOrder, canReplaceOrder, deliverOrder, hasDeliverableOrder,
  orderItemTags, recordOrderAcquisition, replaceOrder,
} from '../src/game/orders.js';
import {
  advanceWorld, arrangeStation, buyStation, farmSaleOffer, newWorld, sellFarm, updateWorldWallTime,
} from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord } from '../src/platform/world-save.js';

const halfHour = 30 * 60_000;
const afternoon = new Date(2026, 10, 22, 15).getTime();

test('the first delivery pays the fixed per-piece rounded price and both tasks once', () => {
  const world = newWorld(afternoon);
  world.unlocked.push('I02', 'P02');
  world.productionValue = world.lifetimeProductionValue = 4n * 7_831n;
  world.inventory = { I01: 1n, I02: 1n };
  world.tech.orderPremium = 5;
  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  advanceWorld(world, world.stations.P[0].batch.end);
  const [offer] = world.orders.active;
  // 7,831 × 5.5 rounds to 43,071 for each of the three pieces.
  assert.deepEqual([offer.item, offer.count, offer.reward], ['P02', 3n, 129_213n]);
  assert.ok(acceptOrder(world, offer.id));
  assert.equal(world.inventory.P02, 1n);
  assert.equal(canDeliverOrder(world, offer.id), false);
  assert.equal(deliverOrder(world, offer.id), false);
  world.tech.orderPremium = 50;
  world.quality.P02 = '5';
  const restored = decodeWorldRecord(encodeWorldRecord(world));
  restored.inventory.P02 = restored.reserves.P02 = 3n;
  const tagged = orderItemTags(restored);
  assert.deepEqual([...tagged.products], ['P02']);
  assert.ok(tagged.materials.has('C01') && tagged.materials.has('I01'));
  settleTaskRewards(restored);
  const before = { coins: restored.coins, value: restored.productionValue,
    lifetime: restored.lifetimeProductionValue, credit: restored.prestigeCredit };
  assert.ok(hasDeliverableOrder(restored));
  assert.ok(deliverOrder(restored, offer.id));
  assert.deepEqual([restored.inventory.P02, restored.stats.sold, restored.stats.ordersCompleted], [0n, 3n, 1n]);
  assert.deepEqual([restored.coins - before.coins, restored.stats.revenue, restored.stats.lifetimeRevenue],
    [129_213n, 129_213n, 129_213n]);
  assert.deepEqual([restored.productionValue, restored.lifetimeProductionValue, restored.prestigeCredit],
    [before.value, before.lifetime, before.credit]);
  assert.equal(managerGiftRemaining(restored), 0n);
  assert.equal(hasDeliverableOrder(restored), false);
  assert.equal(orderItemTags(restored).materials.size, 0);
  const reward = settleTaskRewards(restored);
  assert.ok(reward.ids.includes('firstOrder') && reward.ids.includes('firstSale'));
  assert.equal(reward.researchPoints, 1n);
  const reloaded = decodeWorldRecord(encodeWorldRecord(restored));
  assert.equal(deliverOrder(reloaded, offer.id), false);
  assert.deepEqual(settleTaskRewards(reloaded).ids, []);
});

test('midnight resets quotas before simultaneous completions price the first stable refining slot', () => {
  const start = new Date(2026, 10, 22, 23, 58, 56).getTime();
  const world = newWorld(start);
  world.orders.generated = 3;
  world.orders.replaced = 1;
  world.orders.sequence = 4n;
  world.coins = 1_000_000n;
  world.unlocked.push('I02', 'P01', 'P02');
  world.inventory = { I01: 3n, I02: 1n };
  assert.ok(buyStation(world, 'P'));
  assert.ok(arrangeStation(world, 'P', 1, 'P02'));
  updateWorldWallTime(world, start + 33_000);
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  const offline = structuredClone(world);
  updateWorldWallTime(world, start + 63_999);
  assert.deepEqual(world.orders.active, []);
  updateWorldWallTime(world, start + 64_000);
  const [first] = world.orders.active;
  assert.deepEqual([first.item, first.count, world.orders.generated, world.orders.replaced], ['P01', 3n, 1, 0]);
  assert.equal(world.productionValue, 9_811n);
  updateWorldWallTime(world, start + 64_000 + halfHour);
  updateWorldWallTime(offline, start + 64_000 + halfHour);
  assert.deepEqual(offline.orders, world.orders);
  assert.deepEqual(world.orders.active.map(({ item }) => item), ['P01', 'P02']);
});

test('an offline half-hour offer cannot see a later pending completion in the same catch-up', () => {
  const world = newWorld(afternoon);
  world.unlocked.push('I02', 'I03', 'P01', 'P02', 'P03');
  world.inventory = { I01: 2n, I02: 1n, I03: 1n, P01: 0n };
  recordOrderAcquisition(world, 'P01');
  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  updateWorldWallTime(world, afternoon + 64_000);
  const due = world.orders.nextAttemptMs;
  updateWorldWallTime(world, afternoon + due - 30_000);
  assert.ok(arrangeStation(world, 'P', 0, 'P03'));
  const done = world.stations.P[0].batch.end;
  assert.ok(done > due);
  const offline = structuredClone(world);
  updateWorldWallTime(world, afternoon + due);
  assert.deepEqual(world.orders.active.map(({ item, count }) => [item, count]), [['P02', 1n], ['P01', 2n]]);
  updateWorldWallTime(world, afternoon + done);
  updateWorldWallTime(offline, afternoon + done);
  assert.equal(offline.productionValue, 19_997n);
  assert.deepEqual(offline.orders, world.orders);
  assert.equal(offline.orders.active[1].count, 2n);
});

test('migration keeps zero-stock products and long tasks without starting the timer or refunding quota on handover', () => {
  const world = newWorld(afternoon);
  world.inventory = { P02: 0n, P03: 2n, I01: 4n };
  world.unlocked.push('P01', 'P02', 'P03');
  world.taskRewards = objectives(world).guide.filter(({ id }) => id !== 'firstOrder').map(({ id }) => id);
  const legacy = encodeWorldRecord(world);
  delete legacy.orders;
  delete legacy.legacyGuideCompleted;
  delete legacy.managers.roles.orders;
  delete legacy.stats.warehouseRevenue;
  delete legacy.stats.ordersCompleted;
  const loaded = decodeWorldRecord(legacy);
  assert.equal(objectives(loaded).active, false);
  assert.equal(objectives(loaded).guide.find(({ id }) => id === 'firstOrder').done, false);
  assert.deepEqual(loaded.orders.candidates, ['P02', 'P03']);
  assert.equal(loaded.orders.nextAttemptMs, null);
  assert.ok(arrangeStation(loaded, 'P', 0, 'P01'));
  advanceWorld(loaded, 31_000);
  const [first] = loaded.orders.active;
  assert.equal(first.item, 'P01');
  assert.ok(replaceOrder(loaded, first.id));
  const [replacement] = loaded.orders.active;
  assert.notEqual(replacement.item, 'P01');
  assert.ok(acceptOrder(loaded, replacement.id));
  assert.equal(canReplaceOrder(loaded, replacement.id), false);
  advanceWorld(loaded, 31_000 + 2 * halfHour);
  assert.equal(loaded.orders.active.length, 3);
  assert.ok(sellFarm(loaded, farmSaleOffer(loaded)));
  assert.deepEqual(loaded.orders.active, []);
  assert.deepEqual(loaded.orders.candidates, []);
  assert.deepEqual([loaded.orders.generated, loaded.orders.replaced, loaded.orders.nextAttemptMs], [3, 1, null]);
  loaded.inventory.I01 = 2n;
  assert.ok(arrangeStation(loaded, 'P', 0, 'P01'));
  const end = loaded.stations.P[0].batch.end;
  advanceWorld(loaded, end);
  assert.deepEqual(loaded.orders.active, []);
  assert.equal(loaded.orders.nextAttemptMs, end + halfHour);
});
