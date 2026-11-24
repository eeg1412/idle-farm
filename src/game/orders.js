import catalog from '../content/game-data.json' with { type: 'json' };
import { accountRandom } from './account-random.js';
import { unitPrice } from './advancement.js';
import { localCalendarDay, validCalendarDay } from './market.js';

const intervalMs = 30 * 60 * 1000;
// An order asks for at most this many hours (inclusive, drawn per order) of the product's peak output.
const capacityHours = [8n, 24n];
const decimal = /^(0|[1-9]\d*)$/;
const isProduct = (id) => typeof id === 'string' && Object.hasOwn(catalog.items, id) &&
  catalog.items[id].kind.startsWith('P');
const products = Object.keys(catalog.items).filter(isProduct).sort();
const orderTypes = new Set(['high', 'normal', 'challenge']);

export const orderLimit = (world) => 3 + (world.tech.orderExpansion ?? 0);
export const orderReplacementLimit = (world) => 1 + (world.tech.orderNegotiation ?? 0);
export const normalOrderLimit = 6;

export function newOrders(day = null) {
  return { day, generated: 0, replaced: 0, sequence: 0n, candidates: [], capacity: {}, nextAttemptMs: null,
    active: [], challengeHold: false };
}

export function resetOrderRun(world) {
  const { day, generated, replaced, sequence, challengeHold } = world.orders;
  world.orders = { ...newOrders(day), generated, replaced, sequence, challengeHold };
}

// Raise each product's recorded peak full-load output (hundredths per hour) for this run from an
// hourly forecast; peaks never fall. A product becomes an order candidate once its peak is positive.
export function raiseOrderCapacity(world, forecast) {
  const orders = world.orders;
  let capacity;
  for (const { id, produced } of forecast) {
    if (!isProduct(id) || produced <= (orders.capacity[id] ?? 0n)) continue;
    capacity ??= { ...orders.capacity };
    capacity[id] = produced;
  }
  if (!capacity) return false;
  const candidates = [...new Set([...orders.candidates, ...Object.keys(capacity)])].sort();
  world.orders = { ...orders, capacity, candidates };
  return true;
}

export function synchronizeOrders(world, day) {
  const orders = world.orders;
  if (!validCalendarDay(day) || (orders.day !== null && day <= orders.day)) return;
  world.orders = { ...orders, day, generated: 0, replaced: 0, challengeHold: false,
    active: orders.active.filter((order) => order.status === 'locked') };
}

// Candidates come from recorded capacity (raiseOrderCapacity); an acquisition only tells the
// order timeline that a product entered stock.
export function recordOrderAcquisition(world, id) {
  return isProduct(id);
}

// Products with a positive recorded peak. Older saves may still list candidates without one.
const eligibleCandidates = (orders) => orders.candidates.filter((item) => (orders.capacity[item] ?? 0n) > 0n);

const ofType = (orders, type) => orders.active.filter((order) => order.type === type);

// High and normal orders only exclude products already asked for by orders of the same type.
function unusedCandidates(orders, type) {
  const occupied = new Set(ofType(orders, type).map((order) => order.item));
  return eligibleCandidates(orders).filter((item) => !occupied.has(item));
}

const durationOf = (id) => catalog.items[id].durationMs;

// Base: the longest candidate (positive recorded peak). Target: the shortest other product at least
// as long, otherwise the longest shorter one. Ties take the smallest ID (both lists are sorted).
function challengeItems(orders) {
  const eligible = eligibleCandidates(orders).sort();
  if (!eligible.length) return null;
  let base = eligible[0];
  for (const id of eligible) if (durationOf(id) > durationOf(base)) base = id;
  const floor = durationOf(base);
  const known = new Set(eligible);
  let longer = null;
  let shorter = null;
  for (const id of products) {
    if (known.has(id)) continue;
    const duration = durationOf(id);
    if (duration >= floor) {
      if (longer === null || duration < durationOf(longer)) longer = id;
    } else if (shorter === null || duration > durationOf(shorter)) shorter = id;
  }
  const target = longer ?? shorter;
  return target === null ? null : { base, target };
}

const canGenerateChallenge = (orders) => !orders.challengeHold && ofType(orders, 'challenge').length === 0 &&
  challengeItems(orders) !== null;
const canGenerateNormal = (orders) => ofType(orders, 'normal').length < normalOrderLimit &&
  unusedCandidates(orders, 'normal').length > 0;

function chooseItem(world, candidates) {
  const draw = accountRandom(world.accountSeed, 'orders', world.orders.sequence + 1n);
  return candidates[Number(draw(BigInt(candidates.length)))];
}

function orderHours(world, sequence) {
  const [fewestHours, mostHours] = capacityHours;
  return fewestHours + accountRandom(world.accountSeed, 'order-hours', sequence)(mostHours - fewestHours + 1n);
}

const ceilDiv = (numerator, denominator) => (numerator + denominator - 1n) / denominator;
const orderCount = (byValue, byCapacity) => {
  const smaller = byValue < byCapacity ? byValue : byCapacity;
  return smaller > 0n ? smaller : 1n;
};
// Match the merchant's per-unit rounding before multiplying by the shipment size.
const premiumPerUnit = (world, price) => (price * (50n + BigInt(world.tech.orderPremium ?? 0)) + 5n) / 10n;

// Count = max(1, min(ceil(V / 2U), ceil(peak hourly output × H))), H drawn from 8–24 whole hours.
// High orders pay the order premium per unit; normal orders a fixed 1.2 times.
function makeOffer(world, item, sequence, type = 'high') {
  const price = unitPrice(world, item);
  const byValue = ceilDiv(world.productionValue, 2n * price);
  const byCapacity = ceilDiv((world.orders.capacity[item] ?? 0n) * orderHours(world, sequence), 100n);
  const count = orderCount(byValue, byCapacity);
  const paidPerUnit = type === 'normal' ? (price * 12n + 5n) / 10n : premiumPerUnit(world, price);
  return { id: sequence.toString(), type, item, status: 'offered', count, reward: count * paidPerUnit };
}

// The target is priced at quality 1; the base's peak output is converted by value.
function makeChallenge(world, { base, target }, sequence) {
  const price = BigInt(catalog.items[target].price);
  const byValue = ceilDiv(world.productionValue, 2n * price);
  const byCapacity = ceilDiv((world.orders.capacity[base] ?? 0n) * orderHours(world, sequence) * unitPrice(world, base),
    price * 100n);
  const count = orderCount(byValue, byCapacity);
  return { id: sequence.toString(), type: 'challenge', item: target, status: 'offered', count,
    reward: count * premiumPerUnit(world, price) };
}

function addOrder(world, order, changes = {}) {
  const orders = world.orders;
  world.orders = { ...orders, ...changes, sequence: BigInt(order.id), active: [...orders.active, order] };
}

function generateHighOrder(world, firstItem) {
  const orders = world.orders;
  const limit = orderLimit(world);
  if (orders.generated >= limit || ofType(orders, 'high').length >= limit) return false;
  const candidates = unusedCandidates(orders, 'high');
  if (!candidates.length || (firstItem !== undefined && !candidates.includes(firstItem))) return false;
  const item = firstItem ?? chooseItem(world, candidates);
  addOrder(world, makeOffer(world, item, orders.sequence + 1n), { generated: orders.generated + 1 });
  return true;
}

// Once today's high orders are used up, a checkpoint tries a challenge and then a normal order
// independently; their products do not exclude each other.
function generateOrder(world) {
  if (world.orders.generated < orderLimit(world)) return generateHighOrder(world);
  let generated = false;
  if (canGenerateChallenge(world.orders)) {
    addOrder(world, makeChallenge(world, challengeItems(world.orders), world.orders.sequence + 1n));
    generated = true;
  }
  if (canGenerateNormal(world.orders)) {
    const item = chooseItem(world, unusedCandidates(world.orders, 'normal'));
    addOrder(world, makeOffer(world, item, world.orders.sequence + 1n, 'normal'));
    generated = true;
  }
  return generated;
}

// The timeline calls this once all simultaneous completions are in stock and valued.
export function recordOrderProduction(world, id, atMs = world.clockMs) {
  if (!recordOrderAcquisition(world, id) || world.orders.nextAttemptMs !== null) return false;
  world.orders = { ...world.orders, nextAttemptMs: atMs + intervalMs };
  return generateHighOrder(world, id);
}

export function attemptScheduledOrder(world, atMs = world.clockMs) {
  const due = world.orders.nextAttemptMs;
  if (due === null || atMs !== due) return false;
  world.orders = { ...world.orders, nextAttemptMs: due + intervalMs };
  return generateOrder(world);
}

// The running product batch that ends first, with its slot location ({ type, kind, index }).
function earliestProductBatch(world) {
  let found = null;
  const scan = (groups, type) => {
    for (const [kind, slots] of Object.entries(groups ?? {})) {
      slots.forEach((slot, index) => {
        const batch = slot?.batch;
        if (batch && isProduct(batch.id) && (!found || batch.end < found.batch.end)) {
          found = { batch, source: { type, kind, index } };
        }
      });
    }
  };
  scan(world.stations, 'station');
  scan(world.facilities, 'facility');
  return found;
}

// Read-only forecast of today's remaining order slots, one entry each, in generation order.
// dayEndMs is the next local midnight mapped onto the operating clock (supplied by the view).
export function orderPlaceholders(world, dayEndMs) {
  const orders = world.orders;
  const limit = orderLimit(world);
  if (orders.generated >= limit) {
    const placeholders = [{ kind: 'dailyLimit', dueMs: dayEndMs }];
    const dueMs = orders.nextAttemptMs;
    if (dueMs === null || dueMs >= dayEndMs) return placeholders;
    let kind = 'noCandidate';
    if (canGenerateChallenge(orders) || canGenerateNormal(orders)) kind = 'scheduled';
    else if (ofType(orders, 'normal').length >= normalOrderLimit) kind = 'slotsFull';
    placeholders.push({ kind, dueMs });
    return placeholders;
  }
  const remaining = limit - orders.generated;
  const placeholders = [];
  if (orders.nextAttemptMs === null) {
    const found = earliestProductBatch(world);
    placeholders.push({ kind: 'firstProduct', batch: found?.batch ?? null, source: found?.source ?? null });
    for (let i = 1; i < remaining; i += 1) placeholders.push({ kind: 'afterFirst', afterMinutes: i * intervalMs / 60000 });
    return placeholders;
  }
  const unused = unusedCandidates(orders, 'high').length;
  const highActive = ofType(orders, 'high').length;
  for (let i = 0; i < remaining; i += 1) {
    const dueMs = orders.nextAttemptMs + i * intervalMs;
    if (unused <= i) placeholders.push({ kind: 'noCandidate', dueMs });
    else if (highActive + i >= limit) placeholders.push({ kind: 'slotsFull', dueMs });
    else if (dueMs >= dayEndMs) placeholders.push({ kind: 'tomorrow', dueMs });
    else placeholders.push({ kind: 'scheduled', dueMs });
  }
  return placeholders;
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
  // An abandoned challenge stops challenge orders until the next local day.
  if (order.type === 'challenge') world.orders = { ...world.orders, challengeHold: true };
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
  if (order?.status !== 'offered' || order.type === 'challenge' || orders.replaced >= orderReplacementLimit(world) ||
    eligibleCandidates(orders).length < 3) return [];
  return unusedCandidates(orders, order.type);
}

export const canReplaceOrder = (world, id) => replacementCandidates(world, lookup(world, id)).length > 0;

export function replaceOrder(world, id) {
  const previous = lookup(world, id);
  const candidates = replacementCandidates(world, previous);
  if (!candidates.length) return false;
  const sequence = world.orders.sequence + 1n;
  const next = makeOffer(world, chooseItem(world, candidates), sequence, previous.type);
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
  // Saves from before order types have no abandoned challenge.
  const challengeHold = Object.hasOwn(raw, 'challengeHold') ? raw.challengeHold : false;
  requireField(typeof challengeHold === 'boolean', 'challengeHold');
  // Saves from before order capacity start empty; the app records current capacity on load.
  const rawCapacity = Object.hasOwn(raw, 'capacity') ? raw.capacity : {};
  requireField(rawCapacity !== null && typeof rawCapacity === 'object' && !Array.isArray(rawCapacity), 'capacity');
  requireField(Array.isArray(candidates), 'candidates');
  const capacity = Object.fromEntries(Object.entries(rawCapacity).map(([item, peak]) => {
    requireField(isProduct(item) && candidates.includes(item), 'capacity.' + item);
    return [item, parseAmount(peak, 'orders.capacity.' + item, 0n)];
  }));
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
  requireField(Array.isArray(active) && (nextAttemptMs !== null || active.length === 0), 'active');
  const limits = { high: orderLimit(world), normal: normalOrderLimit, challenge: 1 };
  const ids = new Set();
  const items = { high: new Set(), normal: new Set(), challenge: new Set() };
  const restored = Array.from(active, (order, index) => {
    const field = 'orders.active.' + index;
    requireField(order !== null && typeof order === 'object' && !Array.isArray(order), field);
    const { id, item, status } = order;
    const type = Object.hasOwn(order, 'type') ? order.type : 'high';
    requireField(orderTypes.has(type) && items[type].size < limits[type], field + '.type');
    requireField(typeof id === 'string' && decimal.test(id) && id !== '0' &&
      BigInt(id) <= sequence && !ids.has(id), field + '.id');
    // Challenge targets may be any catalog product, including ones never produced or researched.
    requireField((type === 'challenge' ? isProduct(item) : eligible.has(item)) && !items[type].has(item),
      field + '.item');
    requireField(status === 'offered' || status === 'locked', field + '.status');
    ids.add(id);
    items[type].add(item);
    return { id, type, item, status, count: parseAmount(order.count, field + '.count', 1n),
      reward: parseAmount(order.reward, field + '.reward', 1n) };
  });
  return { day, generated, replaced, sequence, candidates: [...candidates].sort(), capacity, nextAttemptMs,
    active: restored, challengeHold };
}
