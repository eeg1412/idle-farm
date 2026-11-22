import catalog from '../content/game-data.json' with { type: 'json' };
import { accountRandom } from './account-random.js';
import { unitPrice } from './advancement.js';
import { localCalendarDay, validCalendarDay } from './market.js';

const intervalMs = 30 * 60 * 1000;
const candidateSets = new WeakMap();
const decimal = /^(0|[1-9]\d*)$/;
const isProduct = (id) => typeof id === 'string' && Object.hasOwn(catalog.items, id) &&
  catalog.items[id].kind.startsWith('P');

export const orderLimit = (world) => 3 + (world.tech.orderExpansion ?? 0);
export const orderReplacementLimit = (world) => 1 + (world.tech.orderNegotiation ?? 0);

export function newOrders(day = null) {
  return { day, generated: 0, replaced: 0, sequence: 0n, candidates: [], nextAttemptMs: null, active: [] };
}

export function resetOrderRun(world) {
  const { day, generated, replaced, sequence } = world.orders;
  world.orders = { ...newOrders(day), generated, replaced, sequence };
}

export function synchronizeOrders(world, day) {
  const orders = world.orders;
  if (!validCalendarDay(day) || (orders.day !== null && day <= orders.day)) return;
  world.orders = { ...orders, day, generated: 0, replaced: 0,
    active: orders.active.filter((order) => order.status === 'locked') };
}

// Calling this for a purchase, return, or refund only records eligibility.
export function recordOrderAcquisition(world, id) {
  if (!isProduct(id)) return false;
  const orders = world.orders;
  let known = candidateSets.get(orders.candidates);
  if (!known) {
    known = new Set(orders.candidates);
    candidateSets.set(orders.candidates, known);
  }
  if (!known.has(id)) {
    // Heap traversal can differ when an interval is split across several foreground advances.
    world.orders = { ...orders, candidates: [...orders.candidates, id].sort() };
  }
  return true;
}

function unusedCandidates(orders) {
  const occupied = new Set(orders.active.map((order) => order.item));
  return orders.candidates.filter((item) => !occupied.has(item));
}

function chooseItem(world, candidates) {
  const draw = accountRandom(world.accountSeed, 'orders', world.orders.sequence + 1n);
  return candidates[Number(draw(BigInt(candidates.length)))];
}

function makeOffer(world, item, sequence) {
  const price = unitPrice(world, item);
  const denominator = 2n * price;
  const count = (world.productionValue + denominator - 1n) / denominator || 1n;
  const premium = BigInt(world.tech.orderPremium ?? 0);
  // Match the merchant's per-unit rounding before multiplying by the shipment size.
  const paidPerUnit = (price * (50n + premium) + 5n) / 10n;
  return { id: sequence.toString(), item, status: 'offered', count, reward: count * paidPerUnit };
}

function generateOrder(world, firstItem) {
  const orders = world.orders;
  const limit = orderLimit(world);
  if (orders.generated >= limit || orders.active.length >= limit) return false;
  const candidates = unusedCandidates(orders);
  if (!candidates.length || (firstItem !== undefined && !candidates.includes(firstItem))) return false;
  const item = firstItem ?? chooseItem(world, candidates);
  const sequence = orders.sequence + 1n;
  world.orders = { ...orders, sequence, generated: orders.generated + 1,
    active: [...orders.active, makeOffer(world, item, sequence)] };
  return true;
}

// The timeline calls this once all simultaneous completions are in stock and valued.
export function recordOrderProduction(world, id, atMs = world.clockMs) {
  if (!recordOrderAcquisition(world, id) || world.orders.nextAttemptMs !== null) return false;
  world.orders = { ...world.orders, nextAttemptMs: atMs + intervalMs };
  return generateOrder(world, id);
}

export function attemptScheduledOrder(world, atMs = world.clockMs) {
  const due = world.orders.nextAttemptMs;
  if (due === null || atMs !== due) return false;
  world.orders = { ...world.orders, nextAttemptMs: due + intervalMs };
  return generateOrder(world);
}

const lookup = (world, id) => world.orders.active.find((order) => order.id === id);

export function activeMerchantHoldQuantity(world, item) {
  const hold = world.merchantHold;
  const batch = world.merchant?.batch;
  return hold && batch && hold.id === item && hold.run === world.completedRuns &&
    hold.batchId === batch.id && batch.wanted?.id === item ? hold.count : 0n;
}

function deliverable(world, order) {
  return order?.status === 'locked' &&
    (world.inventory[order.item] ?? 0n) - activeMerchantHoldQuantity(world, order.item) >= order.count;
}

export const canDeliverOrder = (world, id) => deliverable(world, lookup(world, id));
export const hasDeliverableOrder = (world) => world.orders.active.some((order) => deliverable(world, order));

function updateOffer(world, previous, next, changes = {}) {
  const orders = world.orders;
  world.orders = { ...orders, ...changes, active: orders.active.map((order) => order === previous ? next : order) };
}

export function acceptOrder(world, id) {
  const order = lookup(world, id);
  if (order?.status !== 'offered') return false;
  updateOffer(world, order, { ...order, status: 'locked' });
  return true;
}

function endOrder(world, order) {
  const orders = world.orders;
  world.orders = { ...orders, active: orders.active.filter((entry) => entry !== order) };
}

export function abandonOrder(world, id) {
  const order = lookup(world, id);
  if (order?.status !== 'locked') return false;
  endOrder(world, order);
  return true;
}

export function deliverOrder(world, id) {
  const order = lookup(world, id);
  if (!deliverable(world, order)) return false;
  const { item, count, reward } = order;
  world.inventory[item] -= count;
  world.coins += reward;
  world.stats.sold += count;
  world.stats.revenue += reward;
  world.stats.lifetimeRevenue += reward;
  world.stats.ordersCompleted += 1n;
  world.stats.orderRevenue = (world.stats.orderRevenue ?? 0n) + reward;
  world.stats.lifetimeOrderRevenue = (world.stats.lifetimeOrderRevenue ?? 0n) + reward;
  endOrder(world, order);
  return true;
}

function replacementCandidates(world, order) {
  const orders = world.orders;
  if (order?.status !== 'offered' || orders.replaced >= orderReplacementLimit(world) ||
    orders.candidates.length < 3) return [];
  return unusedCandidates(orders);
}

export const canReplaceOrder = (world, id) => replacementCandidates(world, lookup(world, id)).length > 0;

export function replaceOrder(world, id) {
  const previous = lookup(world, id);
  const candidates = replacementCandidates(world, previous);
  if (!candidates.length) return false;
  const sequence = world.orders.sequence + 1n;
  const next = makeOffer(world, chooseItem(world, candidates), sequence);
  updateOffer(world, previous, next, { sequence, replaced: world.orders.replaced + 1 });
  return true;
}

export function orderItemTags(world) {
  const products = new Set(world.orders.active.filter((order) => order.status === 'locked').map((order) => order.item));
  const materials = new Set();
  const pending = [...products];
  while (pending.length) {
    const inputs = catalog.items[pending.pop()].inputs;
    for (const item of Object.keys(inputs ?? {})) {
      if (materials.has(item)) continue;
      materials.add(item);
      pending.push(item);
    }
  }
  return { products, materials };
}

function requireField(condition, field) {
  if (!condition) throw new TypeError('Invalid order record: ' + field);
}

function orderAmount(value, field, minimum) {
  requireField(typeof value === 'bigint' || (typeof value === 'string' && decimal.test(value)), field);
  const amount = BigInt(value);
  requireField(amount >= minimum, field);
  return amount;
}

export function restoreOrders(raw, world, parseAmount = orderAmount) {
  if (raw === undefined) {
    const days = [localCalendarDay(world.wallAnchorMs), world.merchant?.day, world.market?.day, world.managers?.day];
    const day = days.filter(validCalendarDay).sort().at(-1) ?? null;
    const evidence = new Set([...Object.keys(world.inventory), ...Object.keys(world.merchant?.produced ?? {})]);
    return { ...newOrders(day), candidates: [...evidence].filter(isProduct).sort() };
  }
  requireField(raw !== null && typeof raw === 'object' && !Array.isArray(raw), 'orders');
  const { day, generated, replaced, nextAttemptMs, candidates, active } = raw;
  requireField(day === null || validCalendarDay(day), 'day');
  requireField(Number.isInteger(generated) && generated >= 0 && generated <= orderLimit(world), 'generated');
  requireField(Number.isInteger(replaced) && replaced >= 0 && replaced <= orderReplacementLimit(world), 'replaced');
  const sequence = parseAmount(raw.sequence, 'orders.sequence', 0n);
  requireField(sequence >= BigInt(generated + replaced), 'sequence');
  requireField(Array.isArray(candidates) && Array.from(candidates).every(isProduct), 'candidates');
  const eligible = new Set(candidates);
  requireField(eligible.size === candidates.length, 'candidates');
  requireField(nextAttemptMs === null || (Number.isSafeInteger(nextAttemptMs) && nextAttemptMs > world.clockMs &&
    nextAttemptMs - world.clockMs <= intervalMs && eligible.size > 0), 'nextAttemptMs');
  requireField(Array.isArray(active) && active.length <= orderLimit(world) &&
    (nextAttemptMs !== null || active.length === 0), 'active');
  const ids = new Set();
  const items = new Set();
  const restored = Array.from(active, (order, index) => {
    const field = 'orders.active.' + index;
    requireField(order !== null && typeof order === 'object' && !Array.isArray(order), field);
    const { id, item, status } = order;
    requireField(typeof id === 'string' && decimal.test(id) && id !== '0' &&
      BigInt(id) <= sequence && !ids.has(id), field + '.id');
    requireField(eligible.has(item) && !items.has(item), field + '.item');
    requireField(status === 'offered' || status === 'locked', field + '.status');
    ids.add(id);
    items.add(item);
    return { id, item, status, count: parseAmount(order.count, field + '.count', 1n),
      reward: parseAmount(order.reward, field + '.reward', 1n) };
  });
  return { day, generated, replaced, sequence, candidates: [...candidates].sort(), nextAttemptMs, active: restored };
}
