import assert from 'node:assert/strict';
import test from 'node:test';
import { claimManagerGift, giftManager, managerDailyCap, managerGiftLimit, managerGiftRemaining, managerIds,
  managerStatus, quoteManagerGift, switchManagerAppearance } from '../src/game/managers.js';
import { recordMerchantProduction } from '../src/game/merchant.js';
import { advanceWorld, arrangeStation, assignFacility, catalog, farmSaleOffer, marketUnitPrice, newWorld, sell, sellFarm,
  synchronizeWorldCalendar, updateWorldWallTime } from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord } from '../src/platform/world-save.js';

const firstDay = new Date(2026, 10, 18, 12).getTime();
const nextDay = new Date(2026, 10, 19, 12).getTime();
const fifthDay = new Date(2026, 10, 22, 12).getTime();

function fund(world, count = 2_000n) {
  if (world.productionValue < 50_000n) world.productionValue = 50_000n;
  world.inventory.C01 = count;
  assert.equal(sell(world, 'C01', 50), true);
}

function markProduced(world, ids) {
  for (const id of ids) {
    if (!world.unlocked.includes(id)) world.unlocked.push(id);
    world.stats.produced[id] = 1n;
    recordMerchantProduction(world, id);
  }
}

test('warehouse sales fund one quota, and the gift that raises affinity uses the higher rate', () => {
  const world = newWorld(firstDay);
  world.merchant.directSales = 1_000_000n;
  assert.equal(managerGiftRemaining(world), 0n);
  fund(world);
  const price = marketUnitPrice(world, 'C01');
  const quote = quoteManagerGift(world, 'field', 'C01', 20n);
  assert.equal(price, 150n);
  assert.equal(quote.gain, 3_000n);
  assert.equal(quote.level, 1);
  assert.equal(quote.returnValue, 18_000n);

  world.inventory.C01 += 100n;
  assert.deepEqual(giftManager(world, quote), quote);
  assert.equal(giftManager(world, quote), false);
  assert.equal(world.inventory.C01, 1_080n);
  assert.equal(managerGiftRemaining(world), 147_000n);
  assert.equal(managerGiftLimit(world, 'C01').maximum, 980n);
  assert.equal(managerStatus(world, 'warehouse').affinity, 0n);
  assert.equal(quoteManagerGift(world, 'warehouse', 'C01', 981n), null);
});

test('the first eleven types fix wishes, and wanted gifts double only affinity up to the daily cap', () => {
  const world = newWorld(firstDay);
  markProduced(world, Object.keys(catalog.items).filter((id) => id.startsWith('C')).slice(0, 10));
  synchronizeWorldCalendar(world, firstDay);
  assert.ok(managerIds.every((id) => managerStatus(world, id).wants.length === 0));
  for (const id of ['C11', 'C12']) world.unlocked.push(id);
  assignFacility(world, 'C', 0, 'C11');
  assignFacility(world, 'C', 1, 'C12');
  const ends = world.facilities.C.map((slot) => slot.batch.end);
  assert.notEqual(ends[0], ends[1]);
  const immediately = structuredClone(world);
  advanceWorld(immediately, Math.min(...ends));
  advanceWorld(world, Math.max(...ends));
  assert.equal(Object.keys(world.merchant.produced).length, 12);
  for (const id of managerIds) {
    const { wants } = managerStatus(world, id);
    assert.ok(wants.length >= 1 && wants.length <= 3);
    assert.deepEqual(wants, managerStatus(immediately, id).wants);
  }

  fund(world);
  const status = managerStatus(world, 'field');
  const itemId = status.wants[0];
  const price = marketUnitPrice(world, itemId);
  const count = (managerDailyCap / 2n) / price + 1n;
  world.inventory[itemId] = count + 1n;
  const gift = quoteManagerGift(world, 'field', itemId, count);
  assert.equal(gift.value, count * price);
  assert.equal(gift.gain, managerDailyCap);
  assert.equal(gift.returnValue, gift.value * BigInt(5 + gift.level));
  assert.ok(giftManager(world, gift));
  const beyondCap = quoteManagerGift(world, 'field', itemId, 1n);
  assert.equal(beyondCap.gain, 0n);
  assert.ok(beyondCap.returnValue > 0n && giftManager(world, beyondCap));
  assert.equal(managerStatus(world, 'field').dailyGain, managerDailyCap);
});

test('gift value buys affinity at each crossed rank and small gifts preserve unused value for the day', () => {
  const world = newWorld(firstDay);
  fund(world);
  world.managers.roles.field.affinity = 74_995n;
  const split = structuredClone(world);

  const single = quoteManagerGift(world, 'field', 'C01', 2n);
  assert.equal(single.gain, 34n);
  assert.equal(single.affinityRemainder, 5n);
  assert.ok(giftManager(world, single));
  assert.ok(giftManager(split, quoteManagerGift(split, 'field', 'C01', 1n)));
  assert.ok(giftManager(split, quoteManagerGift(split, 'field', 'C01', 1n)));
  assert.equal(split.managers.roles.field.affinity, world.managers.roles.field.affinity);
  assert.equal(split.managers.roles.field.affinityRemainder, world.managers.roles.field.affinityRemainder);
  assert.equal(split.managers.affinitySpent, 300n);

  synchronizeWorldCalendar(split, nextDay);
  assert.equal(split.managers.roles.field.affinityRemainder, 0n);
  assert.equal(split.managers.affinitySpent, 300n);
});

test('one real production allowance funds affinity across managers while excess gifts still get full-value returns', () => {
  const world = newWorld(firstDay);
  fund(world);
  world.productionValue = 200n;
  assert.ok(giftManager(world, quoteManagerGift(world, 'field', 'C01', 1n)));
  assert.equal(managerStatus(world, 'research').affinityFundingRemaining, 50n);
  const partial = quoteManagerGift(world, 'research', 'C01', 2n);
  assert.equal(partial.gain, 50n);
  assert.equal(partial.returnValue, 1_500n);
  assert.ok(giftManager(world, partial));

  const excess = quoteManagerGift(world, 'tasks', 'C01', 1n);
  assert.equal(excess.gain, 0n);
  assert.equal(excess.returnValue, 750n);
  assert.ok(giftManager(world, excess));
  assert.equal(world.managers.affinitySpent, 200n);
  assert.equal(world.managers.spent, 600n);
});

test('gift quotes protect production and merchant holds and reject an outdated warehouse price', () => {
  const world = newWorld(firstDay);
  fund(world);
  world.inventory.C01 = 100n;
  world.reserves.C01 = 20n;
  world.merchant.batch = { id: 9n, wanted: { id: 'C01' } };
  world.merchantHold = { id: 'C01', count: 35n, run: 0, batchId: 9n };
  assert.equal(managerGiftLimit(world, 'C01').maximum, 45n);
  const quote = quoteManagerGift(world, 'field', 'C01', 45n);
  world.productionValue = 100_000n;
  world.market = { day: managerStatus(world, 'field').day, sequence: 0, used: 0, rates: { C01: 30 } };
  assert.equal(giftManager(world, quote), false);
  assert.equal(world.inventory.C01, 100n);
  const updated = quoteManagerGift(world, 'field', 'C01', 45n);
  assert.equal(updated.unitPrice, marketUnitPrice(world, 'C01'));
  assert.ok(giftManager(world, updated));
  assert.equal(world.inventory.C01, 55n);
});

test('a later day rolls over the return once and receiving enough items starts a waiting workshop', () => {
  const world = newWorld(firstDay);
  fund(world);
  markProduced(world, ['C01']);
  const quote = quoteManagerGift(world, 'field', 'C01', 5n);
  assert.ok(giftManager(world, quote));
  assert.equal(managerStatus(world, 'field').claim, null);
  world.inventory.C01 = 0n;
  arrangeStation(world, 'I', 0, 'I01');
  assert.equal(world.stations.I[0].batch, null);

  const produced = structuredClone(world.stats.produced);
  const productionValue = world.productionValue;
  updateWorldWallTime(world, nextDay);
  assert.equal(managerStatus(world, 'field').currentReturn, 0n);
  assert.equal(managerStatus(world, 'field').readyReturn, 3_750n);
  assert.equal(managerStatus(world, 'field').dailyGain, 0n);
  synchronizeWorldCalendar(world, nextDay);
  const { claim } = managerStatus(world, 'field');
  assert.ok(claim);
  assert.deepEqual(claimManagerGift(world, claim), { id: 'field', items: [{ itemId: 'C01', count: 2n, value: 3_000n }], value: 3_000n,
    capsules: { added: 0n, remaining: 0n } });
  assert.equal(world.stations.I[0].batch.id, 'I01');
  assert.deepEqual(world.stats.produced, produced);
  assert.equal(world.productionValue, productionValue);
  assert.equal(managerStatus(world, 'field').readyReturn, 750n);
  assert.equal(managerStatus(world, 'field').claim, null);

  world.productionValue = 100_000n;
  world.market.rates = { C01: -50 };
  assert.ok(managerStatus(world, 'field').claim);
  assert.equal(claimManagerGift(world, claim), false);
  assert.ok(claimManagerGift(world, managerStatus(world, 'field').claim));

  // An unclaimed return expires once more than one day passes.
  world.managers.roles.field.readyReturn = 750n;
  updateWorldWallTime(world, fifthDay);
  assert.equal(managerStatus(world, 'field').readyReturn, 0n);
  assert.equal(managerStatus(world, 'field').claim, null);
});

test('time and prestige preserve relationships and already-earned returns while clearing quota and current candidates', () => {
  const world = newWorld(firstDay);
  fund(world);
  markProduced(world, ['C01']);
  assert.ok(giftManager(world, quoteManagerGift(world, 'field', 'C01', 20n)));
  assert.equal(switchManagerAppearance(world, 'field'), 'male');
  const before = managerStatus(world, 'field');
  assert.equal(sellFarm(world, farmSaleOffer(world)), true);
  assert.deepEqual(world.facilities.C, [
    { level: '1', recipe: null, batch: null },
    { level: '1', recipe: null, batch: null },
  ]);
  let after = managerStatus(world, 'field');
  assert.equal(after.affinity, before.affinity);
  assert.equal(after.dailyGain, before.dailyGain);
  assert.equal(after.currentReturn, before.currentReturn);
  assert.equal(after.gender, before.gender);
  assert.equal(managerGiftRemaining(world), 0n);
  assert.equal(world.managers.spent, 0n);
  assert.equal(world.managers.affinitySpent, 0n);
  synchronizeWorldCalendar(world, nextDay);
  after = managerStatus(world, 'field');
  assert.equal(after.readyReturn, before.currentReturn);
  assert.equal(after.dailyGain, 0n);
  assert.equal(after.claim, null);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  advanceWorld(world, world.facilities.C[0].batch.end);
  assert.ok(managerStatus(world, 'field').claim);

  const record = encodeWorldRecord(world);
  assert.equal(typeof record.managers.roles.field.readyReturn, 'string');
  assert.deepEqual(decodeWorldRecord(record).managers, world.managers);
  const invalid = structuredClone(record);
  invalid.managers.spent = '1';
  assert.throws(() => decodeWorldRecord(invalid), { code: 'corrupt-transfer' });
  const legacy = structuredClone(record);
  delete legacy.managers.affinitySpent;
  for (const role of Object.values(legacy.managers.roles)) delete role.affinityRemainder;
  const migrated = decodeWorldRecord(legacy);
  assert.equal(migrated.managers.affinitySpent, 0n);
  assert.equal(migrated.managers.roles.field.affinityRemainder, 0n);
  delete record.managers;
  assert.equal(managerStatus(decodeWorldRecord(record), 'field').affinity, 0n);
});
