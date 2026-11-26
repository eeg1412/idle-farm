import assert from 'node:assert/strict';
import test from 'node:test';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import { unitPrice } from '../src/game/advancement.js';
import { managerGiftRemaining } from '../src/game/managers.js';
import { objectives, settleTaskRewards } from '../src/game/objectives.js';
import {
  abandonOrder, acceptOrder, canDeliverOrder, canReplaceOrder, challengeCooldownMs, deliverOrder, hasDeliverableOrder,
  orderItemTags, orderRushCost, raiseOrderCapacity, replaceOrder, rushOrder,
} from '../src/game/orders.js';
import {
  advanceWorld, arrangeStation, buyStation, farmSaleOffer, newWorld, orderStandardTime, sellFarm, updateWorldWallTime,
} from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord } from '../src/platform/world-save.js';

const halfHour = 30 * 60_000;
const afternoon = new Date(2026, 10, 22, 15).getTime();
// Base hourly output at level 1 without technology, in hundredths per hour.
const baseHourly = (id) => {
  const duration = BigInt(catalog.items[id].durationMs);
  return (BigInt(catalog.items[id].output) * 360_000_000n + duration / 2n) / duration;
};
// ceil(count × 100 × 1 hour / C) for C hundredths per hour.
const standardMs = (count, hourly) => Number((count * 360_000_000n + hourly - 1n) / hourly);

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
  assert.deepEqual([offer.type, offer.item, offer.count, offer.reward, offer.rewardRate],
    ['high', 'P02', 3n, 129_213n, 550]);
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
  assert.equal(reward.researchPoints, 0n);
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
  // P01 was produced earlier this run and is out of stock; its recorded peak keeps it a candidate.
  raiseOrderCapacity(world, [{ id: 'P01', produced: 10_000n }]);
  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  updateWorldWallTime(world, afternoon + 64_000);
  const due = world.orders.nextAttemptMs;
  updateWorldWallTime(world, afternoon + due - 30_000);
  assert.ok(arrangeStation(world, 'P', 0, 'P03'));
  const done = world.stations.P[0].batch.end;
  assert.ok(done > due);
  const offline = structuredClone(world);
  updateWorldWallTime(world, afternoon + due);
  // Challenges may join the timed checkpoint once three candidates exist; only high orders are checked here.
  const highOrders = (target) => target.orders.active.filter(({ type }) => type === 'high');
  assert.deepEqual(highOrders(world).map(({ item, count }) => [item, count]), [['P02', 1n], ['P01', 2n]]);
  updateWorldWallTime(world, afternoon + done);
  updateWorldWallTime(offline, afternoon + done);
  assert.equal(offline.productionValue, 19_997n);
  assert.deepEqual(offline.orders, world.orders);
  assert.equal(highOrders(offline)[1].count, 2n);
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
  assert.deepEqual(loaded.orders.capacity, {});
  assert.equal(loaded.orders.nextAttemptMs, null);
  assert.deepEqual([loaded.orders.challengeHoldUntilMs, loaded.orders.delivered, loaded.orders.boost], [null, {}, {}]);
  // Legacy candidates only become eligible once a peak is recorded for them.
  raiseOrderCapacity(loaded, [{ id: 'P02', produced: 10_000n }, { id: 'P03', produced: 10_000n }]);
  assert.ok(arrangeStation(loaded, 'P', 0, 'P01'));
  advanceWorld(loaded, 31_000);
  // The first order is only a high order even with three candidates.
  assert.deepEqual(loaded.orders.active.map(({ type }) => type), ['high']);
  const [first] = loaded.orders.active;
  assert.equal(first.item, 'P01');
  assert.ok(replaceOrder(loaded, first.id));
  const [replacement] = loaded.orders.active;
  assert.notEqual(replacement.item, 'P01');
  assert.ok(acceptOrder(loaded, replacement.id));
  assert.equal(canReplaceOrder(loaded, replacement.id), false);
  advanceWorld(loaded, 31_000 + 2 * halfHour);
  // The first timed checkpoint adds a high order and one challenge (near in research); the second only a
  // high order.
  const types = loaded.orders.active.map(({ type }) => type);
  assert.deepEqual(types, ['high', 'high', 'challenge', 'high']);
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

test('order size is the smaller of half the run value and 8-24 hours of the peak output', () => {
  const world = newWorld(afternoon);
  world.unlocked.push('P01');
  world.inventory = { I01: 2n };
  // A huge run value would ask for millions of loaves without the capacity cap.
  world.productionValue = world.lifetimeProductionValue = 10n ** 15n;
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  const peak = world.orders.capacity.P01;
  // The running batch counts as in stock, so its full real output is recorded on arrangement.
  assert.equal(peak, baseHourly('P01'));
  assert.deepEqual(world.orders.candidates, ['P01']);
  // The standard time uses every station making the product at full speed; none making it gives null.
  assert.equal(orderStandardTime(world, { item: 'P01', count: 3n }), standardMs(3n, baseHourly('P01')));
  assert.equal(orderStandardTime(world, { item: 'P02', count: 3n }), null);
  advanceWorld(world, world.stations.P[0].batch.end);
  const [offer] = world.orders.active;
  assert.equal(offer.item, 'P01');
  assert.ok(offer.count >= (peak * 8n + 99n) / 100n && offer.count <= (peak * 24n + 99n) / 100n);
  // The recorded peak survives a save round trip and is cleared by selling the farm.
  const restored = decodeWorldRecord(encodeWorldRecord(world));
  assert.equal(restored.orders.capacity.P01, peak);
  assert.ok(sellFarm(restored, farmSaleOffer(restored)));
  assert.deepEqual(restored.orders.capacity, {});
});

// Recipes still to research for a product: itself and its transitive prerequisites not yet unlocked.
function missingResearch(world, id) {
  const unlocked = new Set(world.unlocked);
  const missing = new Set();
  (function visit(key) {
    if (missing.has(key) || unlocked.has(key)) return;
    missing.add(key);
    for (const required of catalog.research[key]?.requires ?? []) visit(required);
  })(id);
  return [...missing];
}

// Research coins plus research materials at catalog base price.
function researchCost(id) {
  const research = catalog.research[id];
  if (!research) return 0n;
  let cost = BigInt(research.coins);
  for (const [material, amount] of Object.entries(research.costs ?? {})) {
    cost += BigInt(amount) * BigInt(catalog.items[material].price);
  }
  return cost;
}

// 10 × every missing recipe's research cost; 10 × floor(half the target's own cost) once it is researched.
function pioneerBonus(world, id) {
  const missing = missingResearch(world, id);
  return 10n * (missing.length ? missing.reduce((sum, key) => sum + researchCost(key), 0n) : researchCost(id) / 2n);
}

// Challenge targets stay within two research steps whenever such untried products exist.
function assertChallengeTargets(world, targets, candidates) {
  const gaps = Object.keys(catalog.items).filter((id) => catalog.items[id].kind.startsWith('P') &&
    !candidates.includes(id)).map((id) => missingResearch(world, id).length);
  const limit = Math.max(2, Math.min(...gaps));
  for (const item of targets) {
    assert.ok(!candidates.includes(item));
    assert.ok(missingResearch(world, item).length <= limit);
  }
}

test("after today's high orders a checkpoint adds one challenge and a small normal order", () => {
  const world = newWorld(afternoon);
  // P02 and P03 join the candidates below, so their recipes are researched as in real play.
  world.unlocked.push('P01', 'I02', 'I03', 'P02', 'P03');
  world.inventory = { I01: 2n };
  world.orders.generated = 3;
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  advanceWorld(world, world.stations.P[0].batch.end);
  // The first product starts the timer but today's high orders are already used up.
  assert.deepEqual(world.orders.active, []);
  assert.deepEqual(world.orders.candidates, ['P01']);
  const due = world.orders.nextAttemptMs;
  advanceWorld(world, due);
  // Fewer than three candidates: no challenge, only a normal order.
  assert.deepEqual(world.orders.active.map(({ type }) => type), ['normal']);
  raiseOrderCapacity(world, [{ id: 'P02', produced: 10_000n }, { id: 'P03', produced: 10_000n }]);
  const candidates = ['P01', 'P02', 'P03'];
  advanceWorld(world, due + halfHour);
  const challenges = world.orders.active.filter(({ type }) => type === 'challenge');
  assert.deepEqual(world.orders.active.map(({ type }) => type), ['normal', 'challenge', 'normal']);
  const [normal] = world.orders.active;
  const targets = challenges.map(({ item }) => item);
  assertChallengeTargets(world, targets, candidates);
  for (const challenge of challenges) {
    // Eight times plus one per missing research step, plus the pioneer bonus for every missing recipe.
    const gap = BigInt(missingResearch(world, challenge.item).length);
    const price = BigInt(catalog.items[challenge.item].price);
    assert.equal(challenge.bonus, pioneerBonus(world, challenge.item));
    assert.equal(challenge.reward, challenge.count * ((price * (80n + 10n * gap) + 5n) / 10n) + challenge.bonus);
    assert.equal(challenge.capsules, 1000n);
    assert.equal(challenge.rewardRate, Number((80n + 10n * gap) * 10n));
    assert.ok(!Object.hasOwn(challenge, 'standardMs'));
  }
  // A normal order asks for 1-4 hours of the recorded peak and pays twice the unit price.
  const peak = world.orders.capacity.P01;
  assert.equal(normal.item, 'P01');
  assert.ok(normal.count >= (peak + 99n) / 100n && normal.count <= (peak * 4n + 99n) / 100n);
  assert.equal(normal.reward, normal.count * 2n * unitPrice(world, 'P01'));
  assert.equal(normal.rewardRate, 200);
  assert.ok(!Object.hasOwn(normal, 'standardMs'));
  assert.equal(world.orders.generated, 3);
  const restored = decodeWorldRecord(encodeWorldRecord(world));
  assert.deepEqual(restored.orders, world.orders);
  // An offered challenge can be replaced by another untried product.
  assert.ok(canReplaceOrder(world, challenges[0].id));
  const replaced = decodeWorldRecord(encodeWorldRecord(world));
  assert.ok(replaceOrder(replaced, challenges[0].id));
  const replacement = replaced.orders.active.find(({ id }) => id === replaced.orders.sequence.toString());
  assert.equal(replacement.type, 'challenge');
  assert.ok(!targets.includes(replacement.item));
  assertChallengeTargets(replaced, [replacement.item], candidates);
  assert.equal(replaced.orders.replaced, 1);
  // Delivering a challenge pays its fixed reward, grants capsules once per product and boosts high orders.
  const delivered = decodeWorldRecord(encodeWorldRecord(world));
  const [first] = challenges;
  assert.ok(acceptOrder(delivered, first.id));
  assert.deepEqual(delivered.orders.active.map(({ type }) => type), ['normal', 'challenge', 'normal']);
  delivered.inventory[first.item] = first.count;
  const before = { coins: delivered.coins, capsules: delivered.capsules };
  assert.ok(deliverOrder(delivered, first.id));
  assert.deepEqual([delivered.coins - before.coins, delivered.capsules - before.capsules], [first.reward, 1000n]);
  assert.deepEqual(delivered.challengeCapsuleItems, [first.item]);
  assert.deepEqual([delivered.orders.boost, delivered.orders.delivered], [{ [first.item]: 3 }, {}]);
  const reloaded = decodeWorldRecord(encodeWorldRecord(delivered));
  assert.deepEqual(reloaded.challengeCapsuleItems, [first.item]);
  assert.ok(sellFarm(reloaded, farmSaleOffer(reloaded)));
  assert.deepEqual([reloaded.challengeCapsuleItems, reloaded.orders.boost], [[first.item], {}]);
  // Abandoning an accepted challenge holds new challenges for two hours of operating time.
  assert.ok(acceptOrder(world, first.id));
  const abandonedAt = world.clockMs;
  assert.ok(abandonOrder(world, first.id));
  assert.equal(world.orders.challengeHoldUntilMs, abandonedAt + challengeCooldownMs);
  const challengeCount = () => world.orders.active.filter(({ type }) => type === 'challenge').length;
  advanceWorld(world, abandonedAt + 3 * halfHour);
  assert.equal(challengeCount(), 0);
  advanceWorld(world, abandonedAt + 4 * halfHour);
  assert.equal(challengeCount(), 1);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.deepEqual([world.orders.active, world.orders.candidates, world.orders.challengeHoldUntilMs],
    [[], [], abandonedAt + challengeCooldownMs]);
});

test('high orders decay with repeated deliveries and spend a challenge boost', () => {
  const world = newWorld(afternoon);
  world.unlocked.push('P01');
  world.inventory = { I01: 2n };
  world.orders.delivered = { P01: 3 };
  world.orders.boost = { P01: 1 };
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  advanceWorld(world, world.stations.P[0].batch.end);
  const [offer] = world.orders.active;
  assert.equal(offer.type, 'high');
  // k = 3 gives 0.7 times; the boost adds 2 times before the decay: floor((U × 70 × 7 + 50) / 100).
  assert.equal(offer.reward, offer.count * ((unitPrice(world, 'P01') * 70n * 7n + 50n) / 100n));
  assert.equal(offer.rewardRate, 490);
  assert.ok(!Object.hasOwn(offer, 'standardMs'));
  assert.deepEqual(world.orders.boost, {});
  // Without a boost, k = 3 is 0.5 × 0.7 = 3.5 times.
  const plain = newWorld(afternoon);
  plain.unlocked.push('P01');
  plain.inventory = { I01: 2n };
  plain.orders.delivered = { P01: 3 };
  assert.ok(arrangeStation(plain, 'P', 0, 'P01'));
  advanceWorld(plain, plain.stations.P[0].batch.end);
  const [plainOffer] = plain.orders.active;
  assert.equal(plainOffer.rewardRate, 350);
  assert.equal(plainOffer.reward, plainOffer.count * ((unitPrice(plain, 'P01') * 350n + 50n) / 100n));
  assert.ok(acceptOrder(world, offer.id));
  world.inventory.P01 = offer.count;
  assert.ok(deliverOrder(world, offer.id));
  assert.deepEqual(world.orders.delivered, { P01: 4 });
  const restored = decodeWorldRecord(encodeWorldRecord(world));
  assert.deepEqual(restored.orders.delivered, { P01: 4 });
  assert.ok(sellFarm(restored, farmSaleOffer(restored)));
  assert.deepEqual([restored.orders.delivered, restored.orders.boost], [{}, {}]);
});

test('time capsules bring the next order checkpoint forward', () => {
  const world = newWorld(afternoon);
  world.unlocked.push('P01');
  world.inventory = { I01: 2n };
  // Before the first product there is no timer to rush.
  assert.equal(orderRushCost(world), null);
  raiseOrderCapacity(world, [{ id: 'P02', produced: 10_000n }]);
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  advanceWorld(world, world.stations.P[0].batch.end);
  assert.equal(world.orders.active.length, 1);
  const due = world.orders.nextAttemptMs;
  assert.equal(due - world.clockMs, halfHour);
  // 30 minutes left cost 100 capsules each; a checkpoint at or after the day's end cannot be rushed.
  assert.equal(orderRushCost(world), 3_000n);
  assert.equal(orderRushCost(world, due), null);
  assert.equal(orderRushCost(world, { dayEndMs: due + 1 }), 3_000n);
  const unchanged = structuredClone(world);
  assert.equal(rushOrder(world), false);
  assert.deepEqual(world, unchanged);
  world.capsules = 5_000n;
  const rushedAt = world.clockMs;
  assert.ok(rushOrder(world));
  assert.deepEqual([world.capsules, world.clockMs, world.orders.generated, world.orders.nextAttemptMs],
    [2_000n, rushedAt, 2, rushedAt + halfHour]);
  assert.deepEqual(world.orders.active.map(({ type, item }) => [type, item]), [['high', 'P01'], ['high', 'P02']]);
  // With every candidate already asked for, the next checkpoint cannot generate and cannot be rushed.
  assert.equal(orderRushCost(world), null);
  assert.equal(rushOrder(world), false);
  const restored = decodeWorldRecord(encodeWorldRecord(world));
  assert.deepEqual(restored.orders, world.orders);
});

test('orders saved before order types load as high orders', () => {
  const world = newWorld(afternoon);
  world.unlocked.push('P01');
  world.inventory = { I01: 2n };
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  advanceWorld(world, world.stations.P[0].batch.end);
  const legacy = encodeWorldRecord(world);
  delete legacy.orders.challengeHoldUntilMs;
  delete legacy.orders.delivered;
  delete legacy.orders.boost;
  delete legacy.challengeCapsuleItems;
  // The old day-long flag migrates to no cooldown.
  legacy.orders.challengeHold = true;
  for (const order of legacy.orders.active) delete order.type;
  const loaded = decodeWorldRecord(legacy);
  assert.deepEqual(loaded.orders.active.map(({ type, item }) => [type, item]), [['high', 'P01']]);
  assert.deepEqual([loaded.orders.challengeHoldUntilMs, loaded.orders.delivered, loaded.orders.boost,
    loaded.challengeCapsuleItems], [null, {}, {}, []]);
  assert.ok(!Object.hasOwn(loaded.orders, 'challengeHold'));
});
