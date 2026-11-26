import catalog from '../content/game-data.json' with { type: 'json' };
import { accountRandom } from './account-random.js';
import { unitPrice } from './advancement.js';
import { localCalendarDay, validCalendarDay } from './market.js';

const intervalMs = 30 * 60 * 1000;
// An order asks for at most this many hours (inclusive, drawn per order) of the product's peak output.
const capacityHours = [8n, 24n];
// A normal order asks for 1–4 whole hours of the product's peak output.
const normalHours = [1n, 4n];
const decimal = /^(0|[1-9]\d*)$/;
const isProduct = (id) => typeof id === 'string' && Object.hasOwn(catalog.items, id) &&
  catalog.items[id].kind.startsWith('P');
const products = Object.keys(catalog.items).filter(isProduct).sort();
const orderTypes = new Set(['high', 'normal', 'challenge']);

export const orderLimit = (world) => 3 + (world.tech.orderExpansion ?? 0);
export const orderReplacementLimit = (world) => 1 + (world.tech.orderNegotiation ?? 0);
export const normalOrderLimit = 6;
// Restore limit: saves from before single challenges may hold up to three offered challenges until they expire.
export const challengeOrderLimit = 3;
// Abandoning an accepted challenge stops new challenge orders for two hours of operating time.
export const challengeCooldownMs = 7_200_000;
// A delivered challenge lets the next three high orders for its product pay 2 times more.
const challengeBoostOrders = 3;
const challengeCapsules = 1000n;

export function newOrders(day = null) {
  return { day, generated: 0, replaced: 0, sequence: 0n, candidates: [], capacity: {}, nextAttemptMs: null,
    active: [], delivered: {}, boost: {}, challengeHoldUntilMs: null };
}

// Selling the farm clears this run's deliveries and boosts; today's quotas and the challenge cooldown stay.
export function resetOrderRun(world) {
  const { day, generated, replaced, sequence, challengeHoldUntilMs } = world.orders;
  world.orders = { ...newOrders(day), generated, replaced, sequence, challengeHoldUntilMs };
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
  world.orders = { ...orders, day, generated: 0, replaced: 0,
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

// Recipes still to research before the product can be made: the product and its transitive research
// prerequisites that are not unlocked (an unlocked recipe ends the walk). Its size is the research gap.
function missingResearch(id, unlocked) {
  const missing = new Set();
  (function visit(key) {
    if (missing.has(key) || unlocked.has(key)) return;
    missing.add(key);
    for (const required of catalog.research[key]?.requires ?? []) visit(required);
  })(id);
  return [...missing];
}
const maxChallengeGap = 2;

// Base: the longest candidate (positive recorded peak), ties to the smallest ID. Pool: catalog products
// that are not candidates this run (sorted by ID) within two research steps (gap ≤ 2); when none are,
// those with the smallest gap.
function challengePlan(world) {
  const eligible = eligibleCandidates(world.orders).sort();
  if (!eligible.length) return null;
  let base = eligible[0];
  for (const id of eligible) if (durationOf(id) > durationOf(base)) base = id;
  const known = new Set(eligible);
  const unlocked = new Set(world.unlocked);
  const unknown = products.filter((id) => !known.has(id)).map((id) => [id, missingResearch(id, unlocked).length]);
  const nearest = Math.max(maxChallengeGap, Math.min(...unknown.map(([, gap]) => gap)));
  return { base, pool: unknown.filter(([, gap]) => gap <= nearest).map(([id]) => id) };
}

// R(S): the shortest product at least as long as the base, otherwise the longest shorter one.
// Ties take the smallest ID (ids are sorted).
function pickTarget(ids, floor) {
  let longer = null;
  let shorter = null;
  for (const id of ids) {
    const duration = durationOf(id);
    if (duration >= floor) {
      if (longer === null || duration < durationOf(longer)) longer = id;
    } else if (shorter === null || duration > durationOf(shorter)) shorter = id;
  }
  return longer ?? shorter;
}

// T1 = R(U); null when the pool is empty.
function challengeTarget(world) {
  const plan = challengePlan(world);
  if (!plan) return null;
  return pickTarget(plan.pool, durationOf(plan.base));
}

const challengeHeld = (orders, atMs) => orders.challengeHoldUntilMs !== null && atMs < orders.challengeHoldUntilMs;
// Challenges need at least three candidates this run, no challenge order and no running cooldown.
const canGenerateChallenge = (world, atMs) => eligibleCandidates(world.orders).length >= 3 &&
  !challengeHeld(world.orders, atMs) && ofType(world.orders, 'challenge').length === 0 &&
  challengeTarget(world) !== null;
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

function normalOrderHours(world, sequence) {
  const [fewestHours, mostHours] = normalHours;
  return fewestHours + accountRandom(world.accountSeed, 'normal-hours', sequence)(mostHours - fewestHours + 1n);
}

const ceilDiv = (numerator, denominator) => (numerator + denominator - 1n) / denominator;
const atLeastOne = (count) => count > 0n ? count : 1n;
const orderCount = (byValue, byCapacity) => atLeastOne(byValue < byCapacity ? byValue : byCapacity);
const premiumLevel = (world) => BigInt(world.tech.orderPremium ?? 0);

// High orders: per piece floor((U × (50 + L + B) × d + 50) / 100) with d = max(5, 10 − k) tenths for the
// product's k high deliveries this run and B = 20 while a challenge boost remains. With k = 0 and no
// boost this equals floor((U × (50 + L) + 5) / 10), the merchant's per-unit rounding.
// The rate is (50 + L + B) × d in hundredths of the unit price.
function highRate(world, item) {
  const orders = world.orders;
  const delivered = BigInt(orders.delivered[item] ?? 0);
  const decay = delivered >= 5n ? 5n : 10n - delivered;
  const boost = (orders.boost[item] ?? 0) > 0 ? 20n : 0n;
  return (50n + premiumLevel(world) + boost) * decay;
}

// Generating or replacing a high order for a boosted product uses up one boost.
function consumeBoost(orders, item) {
  const left = orders.boost[item] ?? 0;
  if (left <= 0) return {};
  const boost = { ...orders.boost };
  if (left > 1) boost[item] = left - 1;
  else delete boost[item];
  return { boost };
}

// Until the first-order task reward has been issued, a high order holds at most 10 pieces.
const firstOrderCap = 10n;
const firstOrderCount = (world, count) =>
  (world.taskRewards ?? []).includes('firstOrder') || count <= firstOrderCap ? count : firstOrderCap;

// High: count = max(1, min(ceil(V / 2U), ceil(peak hourly output × H))), H drawn from 8–24 whole hours;
// capped at 10 while the first-order task reward is unissued.
// Normal: count = max(1, ceil(peak hourly output × H)), H drawn from 1–4 whole hours; each piece pays 2U.
// rewardRate records the per-piece multiplier in hundredths for display.
function makeOffer(world, item, sequence, type = 'high') {
  const price = unitPrice(world, item);
  const peak = world.orders.capacity[item] ?? 0n;
  if (type === 'normal') {
    const count = atLeastOne(ceilDiv(peak * normalOrderHours(world, sequence), 100n));
    return { id: sequence.toString(), type, item, status: 'offered', count, reward: count * 2n * price,
      rewardRate: 200 };
  }
  const byValue = ceilDiv(world.productionValue, 2n * price);
  const byCapacity = ceilDiv(peak * orderHours(world, sequence), 100n);
  const count = firstOrderCount(world, orderCount(byValue, byCapacity));
  const rate = highRate(world, item);
  return { id: sequence.toString(), type, item, status: 'offered', count, reward: count * ((price * rate + 50n) / 100n),
    rewardRate: Number(rate) };
}

// Research cost: the recipe's research coins plus its research materials at catalog base price, without
// research discounts; zero when it has no research entry.
function researchCost(id) {
  const research = catalog.research[id];
  if (!research) return 0n;
  let cost = BigInt(research.coins);
  for (const [material, amount] of Object.entries(research.costs ?? {})) {
    cost += BigInt(amount) * BigInt(catalog.items[material].price);
  }
  return cost;
}

// Pioneer bonus: 10 × the research cost of every recipe still missing (target and prerequisites);
// 10 × floor(half the target's own cost) when it is already researched.
const pioneerBonusScale = 10n;
function pioneerBonus(world, target, missing) {
  if (!missing.length) return researchCost(target) / 2n * pioneerBonusScale;
  return missing.reduce((sum, id) => sum + researchCost(id), 0n) * pioneerBonusScale;
}

// One level-1 station without technology, in hundredths per hour, rounded like forecastHourlyProduction.
function baseHourlyOutput(id) {
  const duration = BigInt(catalog.items[id].durationMs);
  return (BigInt(catalog.items[id].output) * 360_000_000n + duration / 2n) / duration;
}

// The target is priced at quality 1. Count = max(1, min(ceil(V / 2U), ceil(C0 × H / 100))) with H drawn
// from 8–24 whole hours; reward = count × floor((U × (80 + L) + 5) / 10) + pioneer bonus.
function makeChallenge(world, target, sequence) {
  const price = BigInt(catalog.items[target].price);
  const byValue = ceilDiv(world.productionValue, 2n * price);
  const hourly = baseHourlyOutput(target);
  const byCapacity = ceilDiv(hourly * orderHours(world, sequence), 100n);
  const count = orderCount(byValue, byCapacity);
  const missing = missingResearch(target, new Set(world.unlocked));
  const bonus = pioneerBonus(world, target, missing);
  const capsules = (world.challengeCapsuleItems ?? []).includes(target) ? 0n : challengeCapsules;
  // +1× per research step still missing, fixed at generation.
  const rate = 80n + premiumLevel(world) + 10n * BigInt(missing.length);
  return { id: sequence.toString(), type: 'challenge', item: target, status: 'offered', count,
    reward: count * ((price * rate + 5n) / 10n) + bonus, rewardRate: Number(rate * 10n),
    bonus, capsules };
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
  addOrder(world, makeOffer(world, item, orders.sequence + 1n),
    { generated: orders.generated + 1, ...consumeBoost(orders, item) });
  return true;
}

// Each timed checkpoint: (1) a high order while today's quota lasts; (2) one challenge (T1) when allowed;
// (3) a normal order only if the quota was already used up when the checkpoint began. Products of different types do not exclude each other.
function generateOrder(world, atMs = world.clockMs) {
  const quotaUsed = world.orders.generated >= orderLimit(world);
  let generated = !quotaUsed && generateHighOrder(world);
  if (canGenerateChallenge(world, atMs)) {
    addOrder(world, makeChallenge(world, challengeTarget(world), world.orders.sequence + 1n));
    generated = true;
  }
  if (quotaUsed && canGenerateNormal(world.orders)) {
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
  return generateOrder(world, atMs);
}

const capsulesPerRushMinute = 100n;
const rushMinuteMs = 60_000;
// dayEndMs may be passed as a number or as { dayEndMs }; anything else skips the day-end check.
const rushDayEnd = (value) => typeof value === 'number' ? value
  : typeof value?.dayEndMs === 'number' ? value.dayEndMs : undefined;

// The pending checkpoint may be rushed when the timer runs, it falls before the local day ends (when the
// caller supplies dayEndMs, the operating-clock time of the next local midnight) and generating at the
// current clock would add an order: while today's high quota lasts, a high order (slots and an unused
// candidate) or a challenge; once it is used up, a challenge or a normal order. Challenge cooldown is
// checked at clockMs.
function rushDueMs(world, dayEndMs) {
  const orders = world.orders;
  const due = orders.nextAttemptMs;
  if (due === null || due <= world.clockMs || (dayEndMs !== undefined && due >= dayEndMs)) return null;
  const limit = orderLimit(world);
  const ready = orders.generated < limit
    ? (ofType(orders, 'high').length < limit && unusedCandidates(orders, 'high').length > 0) ||
      canGenerateChallenge(world, world.clockMs)
    : canGenerateChallenge(world, world.clockMs) || canGenerateNormal(orders);
  return ready ? due : null;
}

// Capsules to bring the next checkpoint forward: 100 per started minute left. Returned even when the
// holding is short (rushOrder refuses then); null when the checkpoint cannot be rushed.
export function orderRushCost(world, dayEndMs) {
  const due = rushDueMs(world, rushDayEnd(dayEndMs));
  if (due === null) return null;
  return BigInt(Math.ceil((due - world.clockMs) / rushMinuteMs)) * capsulesPerRushMinute;
}

// Spend capsules to run the next checkpoint now; later checkpoints follow 30 minutes after the clock.
// The world clock, production and day changes do not move. A refusal changes nothing.
export function rushOrder(world, dayEndMs) {
  const cost = orderRushCost(world, dayEndMs);
  if (cost === null || (world.capsules ?? 0n) < cost) return false;
  const before = { orders: world.orders, capsules: world.capsules };
  world.capsules = (world.capsules ?? 0n) - cost;
  world.orders = { ...world.orders, nextAttemptMs: world.clockMs + intervalMs };
  if (generateOrder(world, world.clockMs)) return true;
  world.orders = before.orders;
  world.capsules = before.capsules;
  return false;
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
    if (canGenerateChallenge(world, dueMs) || canGenerateNormal(orders)) kind = 'scheduled';
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
  // Accepting one challenge withdraws the other offered challenges.
  if (order.type === 'challenge') {
    const orders = world.orders;
    world.orders = { ...orders, active: orders.active.filter((entry) =>
      entry.type !== 'challenge' || entry.status !== 'offered') };
  }
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
  // An abandoned challenge stops challenge orders for two hours; day changes and farm sales keep it.
  if (order.type === 'challenge') {
    world.orders = { ...world.orders, challengeHoldUntilMs: world.clockMs + challengeCooldownMs };
  }
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
  const orders = world.orders;
  if (order.type === 'high') {
    world.orders = { ...orders, delivered: { ...orders.delivered, [item]: (orders.delivered[item] ?? 0) + 1 } };
  } else if (order.type === 'challenge') {
    world.orders = { ...orders, boost: { ...orders.boost, [item]: challengeBoostOrders } };
    // The first completed challenge for each product grants its time capsules once per account.
    const capsules = order.capsules ?? 0n;
    const claimed = world.challengeCapsuleItems ?? [];
    if (capsules > 0n && !claimed.includes(item)) {
      world.capsules = (world.capsules ?? 0n) + capsules;
      world.challengeCapsuleItems = [...claimed, item];
    }
  }
  return true;
}

// Offered challenges draw from untried products, excluding every current challenge product, within
// base–2×base duration; an empty range falls back to R over the remaining untried products.
function challengeReplacements(world) {
  const orders = world.orders;
  const plan = challengePlan(world);
  if (!plan) return [];
  const taken = new Set(ofType(orders, 'challenge').map((order) => order.item));
  const rest = plan.pool.filter((id) => !taken.has(id));
  const floor = durationOf(plan.base);
  const ranged = rest.filter((id) => durationOf(id) >= floor && durationOf(id) <= 2 * floor);
  if (ranged.length) return ranged;
  const fallback = pickTarget(rest, floor);
  return fallback === null ? [] : [fallback];
}

function replacementCandidates(world, order) {
  const orders = world.orders;
  if (order?.status !== 'offered' || orders.replaced >= orderReplacementLimit(world)) return [];
  if (order.type === 'challenge') return challengeReplacements(world);
  if (eligibleCandidates(orders).length < 3) return [];
  return unusedCandidates(orders, order.type);
}

export const canReplaceOrder = (world, id) => replacementCandidates(world, lookup(world, id)).length > 0;

export function replaceOrder(world, id) {
  const previous = lookup(world, id);
  const candidates = replacementCandidates(world, previous);
  if (!candidates.length) return false;
  const sequence = world.orders.sequence + 1n;
  const item = chooseItem(world, candidates);
  const changes = { sequence, replaced: world.orders.replaced + 1 };
  if (previous.type === 'challenge') {
    updateOffer(world, previous, makeChallenge(world, item, sequence), changes);
  } else {
    const next = makeOffer(world, item, sequence, previous.type);
    updateOffer(world, previous, next, previous.type === 'high' ? { ...changes, ...consumeBoost(world.orders, item) } : changes);
  }
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
  // The old day-long challengeHold flag (any value) migrates to no cooldown.
  const challengeHoldUntilMs = Object.hasOwn(raw, 'challengeHoldUntilMs') ? raw.challengeHoldUntilMs : null;
  requireField(challengeHoldUntilMs === null || Number.isSafeInteger(challengeHoldUntilMs), 'challengeHoldUntilMs');
  // Saves from before order balancing start with no deliveries or boosts.
  const delivered = productCounts(Object.hasOwn(raw, 'delivered') ? raw.delivered : {}, 'delivered');
  const boost = productCounts(Object.hasOwn(raw, 'boost') ? raw.boost : {}, 'boost');
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
  const limits = { high: orderLimit(world), normal: normalOrderLimit, challenge: challengeOrderLimit };
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
    const restoredOrder = { id, type, item, status, count: parseAmount(order.count, field + '.count', 1n),
      reward: parseAmount(order.reward, field + '.reward', 1n) };
    // Orders saved before reward rates have none; it is not reconstructed.
    if (Object.hasOwn(order, 'rewardRate')) {
      requireField(Number.isSafeInteger(order.rewardRate) && order.rewardRate >= 100, field + '.rewardRate');
      restoredOrder.rewardRate = order.rewardRate;
    }
    // Only orders saved while standard times were stored have one; it is kept but no longer shown.
    if (Object.hasOwn(order, 'standardMs')) {
      requireField(Number.isSafeInteger(order.standardMs) && order.standardMs > 0, field + '.standardMs');
      restoredOrder.standardMs = order.standardMs;
    }
    if (type !== 'challenge') return restoredOrder;
    // Challenges saved before order balancing have no pioneer bonus or capsules.
    return { ...restoredOrder,
      bonus: parseAmount(Object.hasOwn(order, 'bonus') ? order.bonus : '0', field + '.bonus', 0n),
      capsules: parseAmount(Object.hasOwn(order, 'capsules') ? order.capsules : '0', field + '.capsules', 0n) };
  });
  // An accepted challenge never coexists with another challenge order.
  const challenges = restored.filter((order) => order.type === 'challenge');
  requireField(!challenges.some((order) => order.status === 'locked') || challenges.length === 1, 'active.challenge');
  return { day, generated, replaced, sequence, candidates: [...candidates].sort(), capacity, nextAttemptMs,
    active: restored, delivered, boost, challengeHoldUntilMs };
}

// Product ID → positive integer.
function productCounts(value, field) {
  requireField(value !== null && typeof value === 'object' && !Array.isArray(value), field);
  return Object.fromEntries(Object.entries(value).map(([item, count]) => {
    requireField(isProduct(item) && Number.isSafeInteger(count) && count > 0, field + '.' + item);
    return [item, count];
  }));
}
