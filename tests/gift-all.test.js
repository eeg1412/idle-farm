import assert from 'node:assert/strict';
import test from 'node:test';
import {
  giftAllManagers, giftAllProtectedItems, giftManager, managerDailyCap, managerGiftRemaining, managerIds,
  managerStatus, planGiftAll, quoteGiftAll, quoteManagerGift,
} from '../src/game/managers.js';
import { marketUnitPrice, newWorld } from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord } from '../src/platform/world-save.js';

const today = new Date(2026, 10, 23, 12).getTime();

function giftingWorld({ budget = 100_000_000n, inventory = {} } = {}) {
  const world = newWorld(today);
  world.productionValue = 100_000_000n;
  world.stats.warehouseRevenue = budget;
  world.inventory = { ...inventory };
  return world;
}

test('cap mode gives wishes first and the fewest pieces that reach every daily cap', () => {
  const world = giftingWorld({ inventory: { C02: 10_000n, C03: 100_000n } });
  world.managers.roles.field.wants = ['C02'];
  const plan = planGiftAll(world, 'cap');
  assert.deepEqual([plan[0].id, plan[0].itemId], ['field', 'C02']);
  assert.ok(plan.slice(1).every((gift) => gift.itemId === 'C03' && gift.id !== 'field'));
  assert.equal(plan.length, managerIds.length);
  assert.deepEqual(planGiftAll(world, 'cap'), plan);

  // Each count is the least that reaches the cap.
  const shown = quoteGiftAll(world, plan);
  for (const gift of plan) {
    assert.equal(typeof gift.count, 'bigint');
    assert.equal(quoteManagerGift(world, gift.id, gift.itemId, gift.count).gain, managerDailyCap);
    if (gift.count > 1n) {
      assert.ok(quoteManagerGift(world, gift.id, gift.itemId, gift.count - 1n).gain < managerDailyCap);
    }
  }
  for (const id of managerIds) {
    assert.deepEqual([shown.roles[id].before, shown.roles[id].after], [0n, managerDailyCap]);
    assert.equal(shown.roles[id].wanted, id === 'field');
  }
  assert.equal(shown.remainingAfter, managerGiftRemaining(world) - shown.value);
  // Quoting never changes the shown world.
  assert.deepEqual([world.inventory.C02, world.inventory.C03, world.managers.spent], [10_000n, 100_000n, 0n]);

  const result = giftAllManagers(world, shown.gifts);
  assert.equal(result.value, shown.value);
  assert.deepEqual(result.roles.map(({ id }) => id), [...managerIds]);
  assert.deepEqual(result.roles.find(({ id }) => id === 'field'), { id: 'field', wanted: true, gain: managerDailyCap });
  assert.ok(managerIds.every((id) => managerStatus(world, id).dailyGain === managerDailyCap));
  assert.equal(world.inventory.C02, 10_000n - plan[0].count);
  assert.deepEqual(planGiftAll(world, 'cap'), []);
});

test('accepted order goods and all their upstream materials are never planned', () => {
  const world = giftingWorld({ inventory: { C01: 100_000n, I01: 100_000n, P02: 50n, C03: 5_000n } });
  world.orders.active.push({ status: 'locked', item: 'P02' });
  world.managers.roles.field.wants = ['C01'];
  const protectedItems = giftAllProtectedItems(world);
  assert.ok(['P02', 'I01', 'C01'].every((id) => protectedItems.has(id)));
  assert.equal(protectedItems.has('C03'), false);
  for (const mode of ['cap', 'all']) {
    const plan = planGiftAll(world, mode);
    assert.ok(plan.length > 0);
    assert.ok(plan.every((gift) => gift.itemId === 'C03'));
  }
});

test('all mode keeps the caps and spends the rest at the highest return rate', () => {
  const world = giftingWorld({ budget: 5_000_000n, inventory: { C03: 1_000_000n } });
  const capped = quoteGiftAll(world, planGiftAll(world, 'cap'));
  const all = quoteGiftAll(world, planGiftAll(world, 'all'));
  assert.ok(all.value > capped.value);
  assert.ok(all.remainingAfter < marketUnitPrice(world, 'C03'));
  for (const id of managerIds) assert.equal(all.roles[id].after, managerDailyCap);
  // Equal return rates fall back to managerIds order.
  assert.ok(all.roles[managerIds[0]].value > capped.roles[managerIds[0]].value);
  for (const id of managerIds.slice(1)) assert.equal(all.roles[id].value, capped.roles[id].value);
  assert.deepEqual(planGiftAll(world, 'unknown'), []);
});

test('a changed quote rejects the whole gift without committing any piece', () => {
  const world = giftingWorld({ inventory: { C03: 100_000n } });
  const shown = quoteGiftAll(world, planGiftAll(world, 'cap'));
  const before = structuredClone({ inventory: world.inventory, managers: world.managers });
  const last = shown.gifts.at(-1);
  const tampered = [...shown.gifts.slice(0, -1), { ...last, returnValue: last.returnValue + 1n }];
  assert.equal(giftAllManagers(world, tampered), false);
  assert.deepEqual({ inventory: world.inventory, managers: world.managers }, before);
  assert.equal(giftAllManagers(world, []), false);
  assert.equal(quoteGiftAll(world, [{ id: 'field', itemId: 'C03', count: 100_001n }]), null);
  assert.equal(quoteGiftAll(world, [{ id: 'field', itemId: 'C03', count: 0n }]), null);

  // A single gift in between changes the shared quota, so the shown plan is stale.
  assert.ok(giftManager(world, quoteManagerGift(world, 'tasks', 'C03', 1n)));
  const changed = structuredClone({ inventory: world.inventory, managers: world.managers });
  assert.equal(giftAllManagers(world, shown.gifts), false);
  assert.deepEqual({ inventory: world.inventory, managers: world.managers }, changed);
});

test('the gift-all preference saves and older records migrate to the cap mode', () => {
  const world = newWorld(today);
  assert.equal(world.settings.giftAllMode, 'cap');
  world.settings.giftAllMode = 'all';
  const record = encodeWorldRecord(world);
  assert.equal(decodeWorldRecord(record).settings.giftAllMode, 'all');
  delete record.settings.giftAllMode;
  assert.equal(decodeWorldRecord(record).settings.giftAllMode, 'cap');
  world.settings.giftAllMode = 'everything';
  assert.throws(() => encodeWorldRecord(world));
});
