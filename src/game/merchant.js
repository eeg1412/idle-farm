import catalog from '../content/game-data.json' with { type: 'json' };
import economyScale from '../content/economy-scale.json' with { type: 'json' };
import { accountRandom } from './account-random.js';
import { merchantMarkup, merchantRestockLimit } from './advancement.js';
import { marketUnitPrice, validCalendarDay } from './market.js';

export const merchantProductionGate = 10;
export const merchantSalesGate = 1_000_000n;
export const merchantPurchaseMultipliers = Object.freeze([125, 150, 200]);
const min = (a, b) => a < b ? a : b;

const kinds = { C: 1, L: 1, F: 1, M: 1, I: 2, IL: 2, IF: 2, IM: 2,
  P: 3, PD: 3, PL: 3, PF: 3, PM: 3, PT: 3 };

export function merchantItemTier(id) {
  return typeof id === 'string' && Object.hasOwn(catalog.items, id) ? kinds[catalog.items[id].kind] : undefined;
}

export function newMerchant(day = null) {
  return { day, freeUsed: false, manualUsed: 0, sequence: 0n, version: 0n,
    produced: {}, sales: { 1: 0n, 2: 0n, 3: 0n }, directSales: 0n, batch: null };
}

export function resetMerchantRun(world) {
  const { day, freeUsed, manualUsed, sequence, version } = world.merchant;
  world.merchant = { ...newMerchant(day), freeUsed, manualUsed, sequence, version };
  delete world.merchantHold;
}

export function recordMerchantProduction(world, id) {
  const merchant = world.merchant;
  if (Object.hasOwn(merchant.produced, id)) return;
  const tier = merchantItemTier(id);
  world.merchant = { ...merchant, produced: { ...merchant.produced, [id]: tier } };
}

export function recordMerchantSales(world, quotes) {
  const sales = { ...world.merchant.sales };
  for (const { id, gain } of quotes) sales[merchantItemTier(id)] += gain;
  world.merchant = { ...world.merchant, sales };
  synchronizeMerchant(world, world.merchant.day);
}

export function merchantStatus(world) {
  const { day, produced, sales, directSales, freeUsed, manualUsed, batch, version } = world.merchant;
  const producedCount = Object.values(produced).filter((tier) => tier <= 2).length;
  const salesLevel12 = sales[1] + sales[2];
  const salesTotal = salesLevel12 + sales[3] + directSales;
  const unlocked = producedCount >= merchantProductionGate && salesLevel12 > merchantSalesGate;
  const restocksRemaining = BigInt(Math.max(0, merchantRestockLimit(world) - manualUsed));
  const freeRestockAvailable = Boolean(day && !freeUsed);
  const lockedReason = !unlocked ? 'requirements' : !batch && !freeRestockAvailable ? 'free-used' :
    !batch ? 'no-supply' : undefined;
  return { unlocked, producedCount, salesLevel12, salesTotal, directSales, batch, restocksRemaining, freeRestockAvailable,
    day, run: world.completedRuns, version, lockedReason };
}

function shelfSize(produced) {
  return Math.max(1, Math.floor(Object.keys(produced).length / 10));
}

function compareAmounts(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function rankedCandidates(world, ceiling, sequence, excluded = []) {
  const excludedIds = new Set(excluded);
  const candidates = Object.keys(world.merchant.produced).sort().flatMap((id) => {
    if (world.merchant.produced[id] === 3 || excludedIds.has(id)) return [];
    const price = marketUnitPrice(world, id);
    return price > ceiling ? [] : [{ id, price, value: (world.inventory[id] ?? 0n) * price }];
  });
  const uniformBelow = accountRandom(world.accountSeed, 'merchant:stock', sequence);
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Number(uniformBelow(BigInt(i + 1)));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.sort((a, b) => compareAmounts(a.value, b.value));
}

function fillShelf(stock, candidates, pending, newSlots, budget) {
  const selected = [];
  let remaining = budget;
  for (const group of [pending, candidates]) {
    const limit = group === pending ? pending.length : newSlots;
    let picked = 0;
    for (const { id, price } of group) {
      if (picked >= limit) break;
      if (price > remaining) continue;
      stock[id] = 1n;
      remaining -= price;
      picked += 1;
      selected.push({ id, price });
    }
  }
  if (!selected.length) return 0n;
  const share = remaining / BigInt(selected.length);
  for (const { id, price } of selected) {
    const count = share / price;
    stock[id] += count;
    remaining -= count * price;
  }
  // Stable price order preserves the selection order for equal prices.
  for (const { id, price } of selected.sort((a, b) => compareAmounts(a.price, b.price))) {
    const count = remaining / price;
    stock[id] += count;
    remaining -= count * price;
  }
  return budget - remaining;
}

function fullRestock(world, salesTotal, manual) {
  const merchant = world.merchant;
  if (!world.accountSeed) return false;
  const sequence = merchant.sequence + 1n;
  const budget = min(salesTotal * BigInt(economyScale.merchantSalesMultiplier),
    world.productionValue * BigInt(economyScale.merchantProductionMultiplier));
  const stock = {};
  const candidates = rankedCandidates(world, salesTotal, sequence);
  const initialCost = fillShelf(stock, candidates, [], shelfSize(merchant.produced), budget);
  if (initialCost === 0n) return false;
  const wantedIds = Object.keys(merchant.produced).sort().filter((id) => !Object.hasOwn(stock, id));
  const uniformBelow = accountRandom(world.accountSeed, 'merchant:wanted', sequence);
  const id = wantedIds.length ? wantedIds[Number(uniformBelow(BigInt(wantedIds.length)))] : undefined;
  const wantedCount = id ? budget / (10n * marketUnitPrice(world, id)) : 0n;
  const capacity = wantedCount > 0n ? wantedCount : 1n;
  const multiplierRoll = accountRandom(world.accountSeed, 'merchant:wanted-multiplier', sequence);
  const multiplier = merchantPurchaseMultipliers[Number(multiplierRoll(BigInt(merchantPurchaseMultipliers.length)))];
  const wanted = id ? { id, capacity, remaining: capacity, multiplier } : null;
  const batch = { id: sequence, stock, wanted, baseline: salesTotal, initialCost, initialCostIsUpperBound: false,
    spent: 0n, pending: [], trades: 0n };
  world.merchant = { ...merchant, batch, sequence, version: merchant.version + 1n,
    freeUsed: merchant.freeUsed || !manual, manualUsed: merchant.manualUsed + Number(manual) };
  delete world.merchantHold;
  return true;
}

export function synchronizeMerchant(world, day) {
  const merchant = world.merchant;
  const dateChanged = validCalendarDay(day) && (!merchant.day || day > merchant.day);
  if (dateChanged) world.merchant = { ...merchant, day, freeUsed: false, manualUsed: 0 };
  if (!world.merchant.day || world.merchant.freeUsed || !world.accountSeed) return dateChanged;
  const { unlocked, salesTotal } = merchantStatus(world);
  return (unlocked && fullRestock(world, salesTotal, false)) || dateChanged;
}

export function restockMerchant(world, expected) {
  const { day, run, version, unlocked, restocksRemaining, salesTotal } = merchantStatus(world);
  if (!day || !unlocked || restocksRemaining === 0n ||
    expected?.day !== day || expected.run !== run || expected.version !== version) return false;
  return fullRestock(world, salesTotal, true);
}

function refill(world, batch, additionalSales = 0n) {
  if (!batch?.pending.length) return batch;
  const salesTotal = merchantStatus(world).salesTotal + additionalSales;
  const salesRoom = (salesTotal - batch.baseline) * BigInt(economyScale.merchantSalesMultiplier);
  const productionRoom = world.productionValue * BigInt(economyScale.merchantProductionMultiplier) - batch.initialCost;
  const budget = min(salesRoom, productionRoom) - batch.spent;
  if (budget <= 0n) return batch;
  const stock = { ...batch.stock };
  const pending = batch.pending.map((id) => ({ id, price: marketUnitPrice(world, id) }))
    .filter(({ price }) => price <= salesTotal);
  const slots = shelfSize(world.merchant.produced) - Object.keys(stock).length;
  const excluded = Object.keys(stock);
  if (batch.wanted) excluded.push(batch.wanted.id);
  const candidates = slots > 0 ? rankedCandidates(world, salesTotal, batch.id, excluded) : [];
  const cost = fillShelf(stock, candidates, pending, slots, budget);
  if (cost === 0n) return batch;
  return { ...batch, stock, spent: batch.spent + cost, pending: batch.pending.filter((id) => stock[id] === 0n) };
}

export function visitMerchant(world) {
  const synchronized = synchronizeMerchant(world, world.merchant.day);
  const merchant = world.merchant;
  const batch = refill(world, merchant.batch);
  if (batch === merchant.batch) return synchronized;
  world.merchant = { ...merchant, batch, version: merchant.version + 1n };
  return true;
}

export function merchantTradeOffer(world, side, id, count) {
  if (typeof count !== 'bigint' || count < 0n || !merchantItemTier(id) ||
    (side !== 'buy' && side !== 'sell')) return null;
  const { unlocked, batch, run } = merchantStatus(world);
  const buying = side === 'buy';
  if (!unlocked || !batch || (buying ? !Object.hasOwn(batch.stock, id) : batch.wanted?.id !== id)) return null;

  const inventory = world.inventory[id] ?? 0n;
  const stock = buying ? batch.stock[id] : 0n;
  const remaining = buying ? 0n : batch.wanted.remaining;
  const warehousePrice = marketUnitPrice(world, id);
  const unitPrice = buying ? (warehousePrice * merchantMarkup(world) + 99n) / 100n :
    (warehousePrice * BigInt(batch.wanted.multiplier) + 50n) / 100n;
  const total = unitPrice * count;
  const maximum = buying ? min(stock, world.coins / unitPrice) : min(inventory, remaining);
  const reserved = buying ? 0n : world.reserves[id] ?? 0n;
  const held = min(inventory, reserved);
  const reserveAffected = held - min(held, inventory - min(inventory, count));
  return { side, id, count, inventory, stock, remaining, reserved, unitPrice, total, maximum, reserveAffected,
    run, batchId: batch.id, trades: batch.trades, canTrade: count > 0n && count <= maximum };
}

export function reserveMerchantSale(world, hold) {
  if (hold === null) {
    delete world.merchantHold;
    return true;
  }
  const offer = merchantTradeOffer(world, 'sell', hold?.id, hold?.count);
  if (!offer?.canTrade || offer.run !== hold.run || offer.batchId !== hold.batchId) return false;
  const { id, count, run, batchId } = offer;
  world.merchantHold = { id, count, run, batchId };
  return true;
}

function confirmTrade(world, side, expected) {
  if (expected?.side !== side || expected.canTrade !== true) return null;
  const actual = merchantTradeOffer(world, side, expected.id, expected.count);
  if (!actual?.canTrade || actual.run !== expected.run || actual.batchId !== expected.batchId ||
    actual.trades !== expected.trades || actual.unitPrice !== expected.unitPrice || actual.total !== expected.total) return null;
  if (actual.reserveAffected === expected.reserveAffected) return actual;
  return actual.reserveAffected < expected.reserveAffected && actual.inventory > expected.inventory &&
    actual.reserved === expected.reserved ? actual : null;
}

export function buyMerchant(world, expected) {
  const actual = confirmTrade(world, 'buy', expected);
  if (!actual) return false;
  const merchant = world.merchant;
  const { id, count, total, inventory } = actual;
  const stock = { ...merchant.batch.stock, [id]: actual.stock - count };
  const soldOut = stock[id] === 0n;
  const pending = soldOut ? [...merchant.batch.pending, id] : merchant.batch.pending;
  const batch = { ...merchant.batch, stock, pending, trades: actual.trades + 1n };
  world.coins -= total;
  world.inventory[id] = inventory + count;
  world.merchant = { ...merchant, batch: soldOut ? refill(world, batch) : batch, version: merchant.version + 1n };
  return true;
}

export function sellMerchant(world, expected) {
  const actual = confirmTrade(world, 'sell', expected);
  const hold = world.merchantHold;
  if (!actual || !hold || actual.id !== hold.id || actual.count !== hold.count ||
    actual.run !== hold.run || actual.batchId !== hold.batchId) return false;

  const { id, count, total, inventory } = actual;
  const merchant = world.merchant;
  const wanted = { ...merchant.batch.wanted, remaining: actual.remaining - count };
  const batch = { ...merchant.batch, wanted, trades: actual.trades + 1n };
  world.inventory[id] = inventory - count;
  world.coins += total;
  world.merchant = { ...merchant, directSales: merchant.directSales + total,
    batch: refill(world, batch, total), version: merchant.version + 1n };
  delete world.merchantHold;
  return true;
}
