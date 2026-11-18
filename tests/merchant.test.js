import test from 'node:test';
import assert from 'node:assert/strict';
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import { accountRandom } from '../src/game/account-random.js';
import {
  buyMerchant, merchantItemTier, merchantStatus, merchantTradeOffer, recordMerchantProduction,
  reserveMerchantSale, restockMerchant, sellMerchant, visitMerchant,
} from '../src/game/merchant.js';
import {
  advanceWorld, assignFacility, farmSaleOffer, marketUnitPrice, newWorld, sell, sellBatch, sellFarm, updateWorldWallTime,
} from '../src/game/world.js';
import { createSaveTransfer } from '../src/platform/save-transfer.js';
import { decodeWorldRecord, encodeWorldRecord } from '../src/platform/world-save.js';

const seed = '0123456789abcdef0123456789abcdef';
const day = '2026-11-17';
const wall = new Date(2026, 10, 17, 12).getTime();
const later = new Date(2026, 10, 20, 12).getTime();
const crop = (index) => 'C' + String(index).padStart(2, '0');
const crops = (count) => Array.from({ length: count }, (_, index) => crop(index + 1));

function produced(world, ids) {
  for (const id of ids) {
    if (!world.unlocked.includes(id)) world.unlocked.push(id);
    world.stats.produced[id] = 1n;
    recordMerchantProduction(world, id);
  }
}

function openShop(shelfCount = 1, productionValue = 10_000_000n) {
  const world = newWorld(wall, seed);
  world.productionValue = productionValue;
  produced(world, crops(shelfCount * 10));
  for (const id of crops(shelfCount * 10).slice(shelfCount)) world.inventory[id] = 1n;
  world.inventory.C01 = 7_000n;
  assert.ok(sell(world, 'C01', 100));
  assert.ok(world.merchant.batch);
  return world;
}

function holdFor({ id, count, run, batchId }) {
  return { id, count, run, batchId };
}

function merchantSale(world, count) {
  const { id } = world.merchant.batch.wanted;
  const offer = merchantTradeOffer(world, 'sell', id, count);
  assert.ok(reserveMerchantSale(world, holdFor(offer)));
  return offer;
}

function asBarterRecord(world) {
  const record = encodeWorldRecord(world);
  delete record.merchant.directSales;
  const { batch } = record.merchant;
  delete batch.initialCost;
  delete batch.initialCostIsUpperBound;
  delete batch.trades;
  delete batch.wanted.multiplier;
  return record;
}

test('only real production is recorded and old lifetime production never unlocks the merchant', () => {
  const world = newWorld(wall, seed);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  advanceWorld(world, 12_000);
  assert.deepEqual(world.merchant.produced, { C01: 1 });
  advanceWorld(world, 24_000);
  assert.deepEqual(world.merchant.produced, { C01: 1 });
  assert.equal(merchantStatus(world).producedCount, 1);
  assert.ok(sell(world, 'C01', 100));

  const record = encodeWorldRecord(world);
  delete record.merchant;
  const legacy = decodeWorldRecord(record);
  assert.deepEqual(legacy.merchant.produced, {});
  assert.deepEqual(legacy.stats, world.stats);
  assert.equal(merchantStatus(legacy).salesLevel12, 0n);
  assert.equal(legacy.merchant.directSales, 0n);
  assert.equal(merchantStatus(legacy).unlocked, false);
});

test('opening requires ten level 1–2 completions and more than 1M in warehouse level 1–2 sales', () => {
  function pricedWorld(quality, products = crops(10)) {
    const world = newWorld(wall, seed);
    produced(world, products);
    world.productionValue = 100_000n;
    world.market = { day, sequence: 0, used: 0, rates: { C02: -90 } };
    world.inventory = Object.fromEntries(products.map((id) => [id, 1n]));
    world.quality.C02 = String(quality);
    return world;
  }
  const exact = pricedWorld(399_991);
  assert.equal(marketUnitPrice(exact, 'C02'), 1_000_000n);
  assert.ok(sell(exact, 'C02', 100));
  assert.equal(merchantStatus(exact).unlocked, false);
  const nine = pricedWorld(39_999_991, [...crops(9), 'P01']);
  assert.ok(sell(nine, 'C02', 100));
  assert.equal(merchantStatus(nine).unlocked, false);
  const refinedOnly = pricedWorld(39_999_991);
  refinedOnly.inventory.P01 = 1_000_000n;
  assert.ok(sell(refinedOnly, 'P01', 100));
  assert.equal(refinedOnly.merchant.sales[3], 1_000_000n * marketUnitPrice(refinedOnly, 'P01'));
  assert.equal(merchantStatus(refinedOnly).unlocked, false);
});

test('full orders use the smaller budget and current sale proceeds as the unit ceiling', () => {
  for (const [productionValue, expectedCount] of [[15_000_000n, 1n], [30_000_000n, 2n]]) {
    const world = newWorld(wall, seed);
    const ids = crops(10);
    produced(world, ids);
    world.productionValue = productionValue;
    world.inventory = Object.fromEntries(ids.map((id) => [id, 1n]));
    world.inventory.C01 = 0n;
    world.quality = { C01: '100000000', C02: '39999991' };
    world.market = { day, sequence: 0, used: 0, rates: { C02: -90 } };
    assert.equal(marketUnitPrice(world, 'C02'), 100_000_000n);
    assert.ok(sell(world, 'C02', 100));
    const { batch, salesTotal } = merchantStatus(world);
    assert.equal(salesTotal, 100_000_000n);
    assert.equal(batch.baseline, salesTotal);
    assert.deepEqual(batch.stock, { C02: expectedCount });
    assert.equal(batch.initialCost, 100_000_000n * expectedCount);
    assert.equal(batch.initialCostIsUpperBound, false);
    assert.equal(batch.trades, 0n);
    assert.notEqual(batch.wanted.id, 'C02');
  }
});

test('wanted item and purchase multiplier are independently reproducible per full order', () => {
  const world = openShop();
  world.tech.merchantRestock = 10;
  for (let index = 0; index <= 10; index += 1) {
    const { batch } = world.merchant;
    const wantedIds = crops(10).filter((id) => !Object.hasOwn(batch.stock, id));
    const wantedIndex = accountRandom(seed, 'merchant:wanted', batch.id)(BigInt(wantedIds.length));
    const multiplierIndex = accountRandom(seed, 'merchant:wanted-multiplier', batch.id)(3n);
    assert.equal(batch.wanted.id, wantedIds[Number(wantedIndex)]);
    assert.equal(batch.wanted.multiplier, [125, 150, 200][Number(multiplierIndex)]);
    const capacity = (batch.baseline * 2n) / (10n * marketUnitPrice(world, batch.wanted.id));
    assert.equal(batch.wanted.capacity, capacity > 0n ? capacity : 1n);
    if (index < 10) assert.ok(restockMerchant(world, merchantStatus(world)));
  }
});

test('buy quotes use affordable whole units and round per unit before charging', () => {
  const world = openShop(2);
  world.coins = 740n;
  world.tech.merchantBargaining = 10;
  const quote = merchantTradeOffer(world, 'buy', 'C02', 2n);
  assert.equal(quote.unitPrice, 380n);
  assert.equal(quote.maximum, 1n);
  assert.equal(quote.total, 760n);
  assert.equal(quote.canTrade, false);
  assert.equal(buyMerchant(world, quote), false);
  world.coins = 760n;
  assert.equal(buyMerchant(world, quote), false);
  const before = structuredClone(world);
  const ready = merchantTradeOffer(world, 'buy', 'C02', 2n);
  assert.ok(buyMerchant(world, ready));
  assert.equal(world.coins, 0n);
  assert.equal(world.inventory.C02, 2n);
  assert.equal(world.merchant.batch.stock.C02, before.merchant.batch.stock.C02 - 2n);
  assert.equal(world.merchant.batch.trades, 1n);
  assert.equal(world.merchant.version, before.merchant.version + 1n);
  assert.equal(buyMerchant(world, ready), false);
  assert.equal(world.merchant.directSales, 0n);
  assert.deepEqual(world.merchant.sales, before.merchant.sales);
  assert.deepEqual(world.merchant.produced, before.merchant.produced);
  assert.deepEqual(world.stats, before.stats);
  assert.equal(world.productionValue, before.productionValue);
  assert.equal(world.prestigeCredit, before.prestigeCredit);
});

test('sale quotes round each multiplier per unit, enforce batch quota and record only merchant proceeds', () => {
  const world = openShop();
  const { wanted } = world.merchant.batch;
  // Cane's 253-coin unit price distinguishes both rounding directions before subtotal.
  Object.assign(wanted, { id: 'C02', remaining: 2n });
  world.inventory.C02 = 3n;
  world.reserves.C02 = 2n;
  assert.equal(merchantTradeOffer(world, 'sell', 'C01', 1n), null);
  assert.equal(merchantTradeOffer(world, 'sell', 'C02', 3n).canTrade, false);
  for (const [multiplier, unitPrice] of [[125, 316n], [150, 380n], [200, 506n]]) {
    wanted.multiplier = multiplier;
    const quote = merchantTradeOffer(world, 'sell', 'C02', 2n);
    assert.equal(quote.unitPrice, unitPrice);
    assert.equal(quote.total, 2n * unitPrice);
    assert.equal(quote.maximum, 2n);
    assert.equal(quote.reserveAffected, 1n);
    assert.equal(sellMerchant(world, quote), false);
  }
  wanted.multiplier = 150;
  const expected = merchantSale(world, 2n);
  const before = structuredClone(world);
  assert.ok(sellMerchant(world, expected));
  assert.equal(world.coins, before.coins + 760n);
  assert.equal(world.inventory.C02, 1n);
  assert.equal(world.merchant.batch.wanted.remaining, 0n);
  assert.equal(world.merchant.directSales, 760n);
  assert.equal(merchantStatus(world).salesTotal, merchantStatus(before).salesTotal + 760n);
  assert.equal(world.merchant.batch.trades, 1n);
  assert.equal(world.merchant.version, before.merchant.version + 1n);
  assert.equal(sellMerchant(world, expected), false);
  assert.equal(merchantTradeOffer(world, 'sell', 'C02', 1n).canTrade, false);
  assert.equal(world.merchantHold, undefined);
  assert.deepEqual(world.merchant.sales, before.merchant.sales);
  assert.deepEqual(world.stats, before.stats);
  assert.equal(world.productionValue, before.productionValue);
  assert.equal(world.prestigeCredit, before.prestigeCredit);
});

test('reservation replacement is atomic and added inventory can lower the confirmed permanent reserve usage', () => {
  const world = openShop();
  const id = world.merchant.batch.wanted.id;
  world.inventory[id] = 3n;
  world.reserves[id] = 2n;
  let quote = merchantSale(world, 2n);
  assert.equal(quote.reserveAffected, 1n);
  assert.equal(reserveMerchantSale(world, { ...holdFor(quote), count: 4n }), false);
  assert.deepEqual(world.merchantHold, holdFor(quote));
  assert.ok(reserveMerchantSale(world, { ...holdFor(quote), count: 1n }));
  assert.equal(sellMerchant(world, quote), false);
  assert.ok(reserveMerchantSale(world, null));
  assert.equal(world.merchantHold, undefined);
  quote = merchantSale(world, 2n);
  world.inventory[id] = 2n;
  assert.equal(sellMerchant(world, quote), false);
  world.inventory[id] = 1n;
  assert.equal(sellMerchant(world, quote), false);
  world.inventory[id] = 3n;
  world.reserves[id] = 1n;
  assert.equal(sellMerchant(world, quote), false);
  world.reserves[id] = 2n;
  world.quality[id] = '2';
  assert.equal(sellMerchant(world, quote), false);
  delete world.quality[id];
  assert.ok(assignFacility(world, 'C', 0, id));
  advanceWorld(world, world.facilities.C[0].batch.end);
  assert.ok(world.inventory[id] > 3n);
  assert.equal(merchantTradeOffer(world, 'sell', id, 2n).reserveAffected, 0n);
  assert.ok(sellMerchant(world, quote));
});

test('refills need independent sales and real production headroom', () => {
  const world = openShop(1, 100_020n);
  const { batch } = world.merchant;
  assert.deepEqual(batch.stock, { C01: 6_668n });
  assert.equal(batch.initialCost, 1_000_200n);
  world.coins = 3_000_000n;
  world.inventory.C01 = 1n;
  assert.ok(sell(world, 'C01', 100));
  assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', 'C01', batch.stock.C01)));
  assert.deepEqual(world.merchant.batch.pending, ['C01']);
  assert.equal(visitMerchant(world), false);
  world.productionValue += 15n;
  assert.ok(visitMerchant(world));
  assert.equal(world.merchant.batch.stock.C01, 1n);
  assert.equal(world.merchant.batch.spent, 150n);

  assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', 'C01', 1n)));
  assert.deepEqual(world.merchant.batch.pending, ['C01']);
  world.productionValue += 100n;
  assert.ok(visitMerchant(world));
  assert.equal(world.merchant.batch.stock.C01, 1n);
  assert.equal(world.merchant.batch.spent, 300n);
  assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', 'C01', 1n)));
  assert.equal(visitMerchant(world), false);
  assert.deepEqual(world.merchant.batch.pending, ['C01']);
});

test('merchant sale funds one fair refill across sold out items and newly opened shelf positions', () => {
  const world = openShop(2);
  const { batch } = world.merchant;
  assert.deepEqual(Object.keys(batch.stock).sort(), ['C01', 'C02']);
  batch.stock.C01 = 1n;
  batch.stock.C02 = 1n;
  const order = ['C02', 'C01'];
  for (const id of order) assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', id, 1n)));
  assert.deepEqual(world.merchant.batch.pending, order);
  assert.equal(visitMerchant(world), false);
  const { version } = world.merchant;
  const { trades } = world.merchant.batch;
  produced(world, crops(30).slice(20));
  for (const id of crops(29)) world.inventory[id] = 50n;
  const amount = batch.wanted.remaining < 50n ? batch.wanted.remaining : 50n;
  const offer = merchantSale(world, amount);
  assert.ok(sellMerchant(world, offer));

  const restocked = world.merchant.batch;
  const ids = ['C01', 'C02', 'C30'];
  assert.deepEqual(Object.keys(restocked.stock).sort(), ids);
  assert.deepEqual(restocked.pending, []);
  assert.deepEqual(restocked.wanted, { ...batch.wanted, remaining: batch.wanted.remaining - amount });
  assert.equal(world.merchant.sequence, batch.id);
  assert.equal(world.merchant.version, version + 1n);
  assert.equal(restocked.trades, trades + 1n);
  const budget = offer.total * 2n;
  const prices = ids.map((id) => marketUnitPrice(world, id));
  const share = (budget - prices.reduce((sum, price) => sum + price, 0n)) / 3n;
  const counts = prices.map((price) => 1n + share / price);
  const remainder = budget - counts.reduce((sum, count, i) => sum + count * prices[i], 0n);
  counts[0] += remainder / prices[0];
  assert.deepEqual(ids.map((id) => restocked.stock[id]), counts);
  assert.equal(restocked.spent, budget - remainder % prices[0]);
  assert.equal(visitMerchant(world), false);
});

test('independent refill preserves an unused quote while a full new batch clears old reservations', () => {
  const world = openShop(2);
  world.tech.merchantRestock = 1;
  world.merchant.batch.stock.C01 = 1n;
  assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', 'C01', 1n)));
  const id = world.merchant.batch.wanted.id;
  world.inventory[id] = 3n;
  const quote = merchantSale(world, 2n);
  const version = world.merchant.version;
  world.inventory.C01 = 10n;
  assert.ok(sell(world, 'C01', 100));
  assert.ok(visitMerchant(world));
  assert.equal(world.merchant.version, version + 1n);
  assert.ok(sellMerchant(world, quote));
  const old = merchantSale(world, 1n);
  assert.ok(restockMerchant(world, merchantStatus(world)));
  assert.equal(world.merchantHold, undefined);
  assert.equal(sellMerchant(world, old), false);
  assert.equal(reserveMerchantSale(world, holdFor(old)), false);
});

test('a new day without eligible supply preserves the existing batch and all replacement limits', () => {
  const world = openShop();
  const { batch, sequence, version } = world.merchant;
  world.tech.merchantRestock = 1;
  for (const id of crops(10)) world.quality[id] = '1000000000000000000';
  updateWorldWallTime(world, later);
  assert.equal(merchantStatus(world).freeRestockAvailable, true);
  assert.equal(merchantStatus(world).restocksRemaining, 1n);
  assert.equal(restockMerchant(world, merchantStatus(world)), false);
  assert.equal(world.merchant.batch, batch);
  assert.equal(world.merchant.sequence, sequence);
  assert.equal(world.merchant.version, version);
  delete world.quality.C01;
  assert.ok(visitMerchant(world));
  assert.equal(merchantStatus(world).freeRestockAvailable, false);
  assert.equal(merchantStatus(world).restocksRemaining, 1n);
  assert.equal(world.merchant.sequence, sequence + 1n);
});

test('manual limits, local days, reruns, export, and import preserve stored state only', () => {
  const world = openShop();
  world.tech.merchantRestock = 2;
  const old = merchantStatus(world);
  assert.ok(restockMerchant(world, old));
  assert.equal(restockMerchant(world, old), false);
  const id = world.merchant.batch.wanted.id;
  world.inventory[id] = 2n;
  assert.ok(sellMerchant(world, merchantSale(world, 1n)));
  merchantSale(world, 1n);
  const record = encodeWorldRecord(world);
  assert.equal(record.merchant.directSales, world.merchant.directSales.toString());
  assert.equal(record.merchant.batch.trades, '1');
  assert.equal(Object.hasOwn(record, 'merchantHold'), false);
  const saved = decodeWorldRecord(record);
  assert.equal(merchantStatus(saved).restocksRemaining, 1n);
  assert.deepEqual(saved.merchant, world.merchant);
  assert.equal(saved.merchantHold, undefined);
  assert.ok(sellFarm(saved, farmSaleOffer(saved)));
  assert.deepEqual(saved.merchant.produced, {});
  assert.deepEqual(saved.merchant.sales, { 1: 0n, 2: 0n, 3: 0n });
  assert.equal(saved.merchant.directSales, 0n);
  assert.equal(saved.merchant.batch, null);
  assert.equal(saved.merchant.day, day);
  assert.equal(saved.merchant.freeUsed, true);
  produced(saved, [...crops(10), 'I01', 'P01']);
  saved.productionValue = 1_000_000n;
  saved.inventory = { C01: 10n ** 35n, I01: 3n, P01: 1n };
  assert.ok(sellBatch(saved, ['C01', 'I01', 'P01'].map((itemId) => ({ id: itemId, percent: 100 }))));
  assert.equal(merchantStatus(saved).lockedReason, 'free-used');
  assert.ok(restockMerchant(saved, merchantStatus(saved)));
  assert.equal(merchantStatus(saved).restocksRemaining, 0n);
  assert.equal(merchantStatus(saved).batch.id, old.batch.id + 2n);
  assert.notEqual(saved.merchant.sales[2], 0n);
  assert.notEqual(saved.merchant.sales[3], 0n);
  const transfer = createSaveTransfer({ browser: {} });
  const packet = transfer.exportWorld(saved).text;
  assert.equal(JSON.parse(packet).record.merchant.sales[1], (150n * 10n ** 35n).toString());
  assert.deepEqual(transfer.resolveCandidate(transfer.inspectSave(packet)).merchant, saved.merchant);
  const sequence = saved.merchant.sequence;
  updateWorldWallTime(saved, later);
  assert.equal(saved.merchant.sequence, sequence + 1n);
  assert.equal(saved.merchant.day, '2026-11-20');
  assert.equal(merchantStatus(saved).restocksRemaining, 2n);
  updateWorldWallTime(saved, wall);
  assert.equal(saved.merchant.sequence, sequence + 1n);
  assert.equal(saved.merchant.day, '2026-11-20');
});

test('old merchant batches keep stock and quota, retain a conservative production cost and pay double', () => {
  const world = openShop(1, 100_020n);
  world.tech.merchantRestock = 1;
  const record = asBarterRecord(world);
  const migrated = decodeWorldRecord(record);
  const { batch } = migrated.merchant;
  assert.deepEqual(batch.stock, world.merchant.batch.stock);
  assert.equal(batch.initialCost, batch.baseline * 5n);
  assert.equal(batch.initialCostIsUpperBound, true);
  assert.equal(batch.trades, 0n);
  assert.equal(batch.wanted.multiplier, 200);
  assert.equal(batch.wanted.capacity, world.merchant.batch.wanted.capacity);
  assert.equal(batch.wanted.remaining, world.merchant.batch.wanted.remaining);
  assert.equal(migrated.merchant.directSales, 0n);
  const quote = merchantSale(migrated, 1n);
  assert.equal(quote.unitPrice, marketUnitPrice(migrated, quote.id) * 2n);
  assert.ok(sellMerchant(migrated, quote));
  migrated.coins = 3_000_000n;
  assert.ok(buyMerchant(migrated, merchantTradeOffer(migrated, 'buy', 'C01', batch.stock.C01)));
  assert.equal(visitMerchant(migrated), false);
  assert.deepEqual(migrated.merchant.batch.pending, ['C01']);
  assert.deepEqual(decodeWorldRecord(encodeWorldRecord(migrated)).merchant, migrated.merchant);
  assert.ok(restockMerchant(migrated, merchantStatus(migrated)));
  assert.equal(migrated.merchant.batch.initialCostIsUpperBound, false);
  assert.equal(migrated.merchant.batch.trades, 0n);
});

test('lower multipliers pause new spending while historical costs still round trip', () => {
  const world = openShop();
  const { initialCost } = world.merchant.batch;
  const { merchantSalesMultiplier, merchantProductionMultiplier } = economyScale;
  world.coins = 50_000_000n;
  world.inventory.C01 = 1n;
  assert.ok(sell(world, 'C01', 100));
  assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', 'C01', world.merchant.batch.stock.C01)));
  assert.equal(world.merchant.batch.spent, 300n);
  assert.ok(buyMerchant(world, merchantTradeOffer(world, 'buy', 'C01', 2n)));
  economyScale.merchantSalesMultiplier = 1;
  economyScale.merchantProductionMultiplier = 1;
  try {
    const restored = decodeWorldRecord(encodeWorldRecord(world));
    assert.equal(restored.merchant.batch.initialCost, initialCost);
    assert.equal(restored.merchant.batch.spent, 300n);
    world.inventory.C01 = 1n;
    assert.ok(sell(world, 'C01', 100));
    assert.equal(visitMerchant(world), false);
    world.inventory.C01 = 1n;
    assert.ok(sell(world, 'C01', 100));
    assert.ok(visitMerchant(world));
    assert.equal(world.merchant.batch.spent, 450n);
  } finally {
    economyScale.merchantSalesMultiplier = merchantSalesMultiplier;
    economyScale.merchantProductionMultiplier = merchantProductionMultiplier;
  }
});

test('import rejects corrupt categories, daily limits, batch costs, quantities and trade counts', () => {
  const world = openShop();
  const record = encodeWorldRecord(world);
  const invalid = (edit) => {
    const changed = structuredClone(record);
    edit(changed.merchant);
    assert.throws(() => decodeWorldRecord(changed), { code: 'corrupt-transfer' });
  };
  assert.equal(merchantItemTier('IM01'), 2);
  assert.equal(merchantItemTier('PM01'), 3);
  invalid((state) => { state.day = '2026-02-30'; });
  invalid((state) => { state.manualUsed = 1; });
  invalid((state) => { state.produced.C01 = 2; });
  invalid((state) => { state.sales[1] = '001'; });
  invalid((state) => { state.sales[3] = '1'; });
  invalid((state) => { state.directSales = '-1'; });
  invalid((state) => { state.version = '0'; });
  invalid((state) => { state.batch.baseline = String(BigInt(state.batch.baseline) + 1n); });
  invalid((state) => { state.batch.initialCost = '0'; });
  invalid((state) => { state.batch.initialCostIsUpperBound = true; });
  invalid((state) => { state.batch.stock.C01 = '-1'; });
  invalid((state) => { state.batch.pending = ['C01']; });
  invalid((state) => { state.batch.wanted.id = 'C01'; });
  invalid((state) => { state.batch.wanted.multiplier = 100; });
  invalid((state) => { state.batch.wanted.remaining = String(BigInt(state.batch.wanted.capacity) + 1n); });
  invalid((state) => { state.batch.spent = '-1'; });
  invalid((state) => { state.batch.spent = '1'; });
  invalid((state) => { state.batch.trades = '1'; });
});
