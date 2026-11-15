import catalog from '../content/game-data.json' with { type: 'json' };
import { appraisalMultiplierBasisPoints, delegationMilliseconds, discount, facilityYieldBonus, rate, unitPrice } from './advancement.js';

export { catalog, unitPrice };

const facilityTypes = {
  C: { buy: 'cropBuy', upgrade: 'cropUpgrade', factor: 1n, free: 2 },
  L: { buy: 'livestockBuy', upgrade: 'livestockUpgrade', factor: 10n, free: 0 },
  F: { buy: 'fishBuy', upgrade: 'fishUpgrade', factor: 10n, free: 0 },
};
const stationTypes = { I: { base: 75n, limit: 48 }, P: { base: 95n, limit: 32 } };
const startingCoins = 60n;
const facilityLimit = 40;
const rewardThreshold = 1000n;

const emptyFacility = () => ({ level: '1', recipe: null, batch: null });
const emptyStation = (order) => ({ order, recipe: null, priority: false, batch: null });
const ceilDiv = (value, divisor) => (value + divisor - 1n) / divisor;

function asNatural(value) {
  if (typeof value === 'bigint') return value >= 0n ? value : null;
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) return BigInt(value);
  return null;
}

function discounted(world, amount, key) {
  return ceilDiv(amount * BigInt(10000 - discount(world, key)), 10000n);
}

function geometric(base, bought) {
  const count = BigInt(bought);
  return ceilDiv(base * 6n ** count, 5n ** count);
}

function facilityUpgradeTotal(world, type, level) {
  const k = level - 1n;
  const squares = k * (k + 1n) * (2n * k + 1n) / 6n;
  const longTerm = k > 14n ? (k - 14n) ** 5n : 0n;
  return discounted(world, type.factor * (30n * squares + 5000n * longTerm), type.upgrade);
}

function facilityOutput(world, kind, id, level) {
  const item = catalog.items[id];
  if (!item) return null;
  const k = level - 1n;
  return BigInt(item.output) + k + k * k / 64n + facilityYieldBonus(world, kind);
}

export function productionDurationMs(world, id) {
  const item = catalog.items[id];
  return item ? Math.ceil(item.durationMs * 10000 / rate(world, id)) : null;
}

function makeBatch(world, id, amount) {
  return { id, amount: String(amount), start: world.clockMs, end: world.clockMs + productionDurationMs(world, id) };
}

function startingFacilities(recipe) {
  return { C: Array.from({ length: facilityTypes.C.free }, () => ({ ...emptyFacility(), recipe })), L: [], F: [] };
}

export function newWorld(now) {
  const world = {
    schemaVersion: 2, revision: 0, clockMs: 0, wallAnchorMs: now, coins: startingCoins,
    inventory: {}, reserves: {}, unlocked: [...catalog.initial], quality: {}, tech: {},
    researchPoints: 0n, productionValue: 0n, completedRuns: 0, firstCompletedRunAtMs: null,
    facilities: startingFacilities(null), stations: { I: [emptyStation(0)], P: [emptyStation(1)] },
    stats: { produced: {}, sold: 0n, plots: 0n, revenue: 0n, lifetimeRevenue: 0n, boughtL: 0n, boughtF: 0n },
    guideSkipped: false, settings: { textScale: 1, music: 70, sound: 75, pickerIconsOnly: false },
  };
  settleProduction(world);
  return world;
}

export const quantity = (world, id) => world.inventory[id] ?? 0n;

export function availableToProduce(world, id) {
  const available = quantity(world, id) - (world.reserves[id] ?? 0n);
  return available > 0n ? available : 0n;
}

export function stationRequirements(world, id) {
  return Object.entries(catalog.items[id]?.inputs ?? {}).map(([key, amount]) => ({
    id: key, owned: availableToProduce(world, key), needed: BigInt(amount),
  }));
}

function orderedStations(world) {
  const stations = [...world.stations.I, ...world.stations.P];
  let nextOrder = Math.max(-1, ...stations.map((station) => station.order ?? -1)) + 1;
  for (const station of stations) station.order ??= nextOrder++;
  return stations.sort((a, b) => Number(b.priority) - Number(a.priority) || a.order - b.order);
}

function startProduction(world, stations, onStart) {
  for (const [kind, facilities] of Object.entries(world.facilities)) {
    for (const facility of facilities) {
      if (facility.batch || !facility.recipe) continue;
      const count = facilityOutput(world, kind, facility.recipe, BigInt(facility.level));
      facility.batch = makeBatch(world, facility.recipe, count);
      if (kind === 'C' && (!facility.planting || facility.planting.id !== facility.batch.id)) {
        facility.planting = {
          id: facility.batch.id, start: facility.batch.start,
          duration: facility.batch.end - facility.batch.start,
        };
      }
      onStart?.(facility);
    }
  }
  for (const station of stations) {
    if (station.batch || !station.recipe) continue;
    const materials = stationRequirements(world, station.recipe);
    if (materials.some(({ owned, needed }) => owned < needed)) continue;
    const inputs = {};
    for (const { id, needed } of materials) {
      world.inventory[id] = quantity(world, id) - needed;
      inputs[id] = needed;
    }
    station.batch = { ...makeBatch(world, station.recipe, catalog.items[station.recipe].output), inputs };
    onStart?.(station);
  }
}

export function settleProduction(world) {
  startProduction(world, orderedStations(world));
}

function deposit(world, batch) {
  const { id } = batch;
  const count = BigInt(batch.amount);
  world.inventory[id] = quantity(world, id) + count;
  world.productionValue += count * unitPrice(world, id);
  world.stats.produced[id] = (world.stats.produced[id] ?? 0n) + count;
}

function pushEvent(heap, entry) {
  let index = heap.length;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].batch.end <= entry.batch.end) break;
    heap[index] = heap[parent];
    index = parent;
  }
  heap[index] = entry;
}

function popEvent(heap) {
  const result = heap[0];
  const tail = heap.pop();
  if (heap.length === 0) return result;
  let index = 0;
  while (index * 2 + 1 < heap.length) {
    let child = index * 2 + 1;
    if (child + 1 < heap.length && heap[child + 1].batch.end < heap[child].batch.end) child += 1;
    if (tail.batch.end <= heap[child].batch.end) break;
    heap[index] = heap[child];
    index = child;
  }
  heap[index] = tail;
  return result;
}

export function advanceWorld(world, targetMs, { deferFinalStarts = false } = {}) {
  if (!Number.isSafeInteger(targetMs) || targetMs < world.clockMs) return;
  const stations = orderedStations(world);
  const heap = [];
  const enqueue = (entry) => pushEvent(heap, entry);
  for (const entry of [...Object.values(world.facilities).flat(), ...stations]) {
    if (entry.batch) enqueue(entry);
  }

  if (heap[0]?.batch.end !== world.clockMs && (world.clockMs < targetMs || !deferFinalStarts)) {
    startProduction(world, stations, enqueue);
  }
  while (heap.length && heap[0].batch.end <= targetMs) {
    const completedAt = heap[0].batch.end;
    world.clockMs = completedAt;
    do {
      const entry = popEvent(heap);
      deposit(world, entry.batch);
      entry.batch = null;
    } while (heap[0]?.batch.end === completedAt);
    if (completedAt !== targetMs || !deferFinalStarts) startProduction(world, stations, enqueue);
  }
  world.clockMs = targetMs;
}

export function updateWorldWallTime(world, now) {
  if (!Number.isSafeInteger(now)) return 0;
  if (world.completedRuns > 0 && world.firstCompletedRunAtMs === null) {
    world.firstCompletedRunAtMs = world.wallAnchorMs;
  }
  const elapsed = Math.max(0, Math.min(delegationMilliseconds(world), now - world.wallAnchorMs));
  advanceWorld(world, world.clockMs + elapsed);
  world.wallAnchorMs = Math.max(world.wallAnchorMs, now);
  return elapsed;
}

export function facilityOffer(world, kind, index = null, steps = 1n) {
  if (!Object.hasOwn(facilityTypes, kind)) return null;
  const type = facilityTypes[kind];
  const facilities = world.facilities[kind];
  if (index === null) {
    const count = facilities.length;
    const atLimit = count >= facilityLimit;
    const cost = discounted(world, geometric(60n, Math.max(0, count - type.free)) * type.factor, type.buy);
    return { cost, count, limit: facilityLimit, atLimit, affordable: !atLimit && world.coins >= cost,
      target: null, currentOutput: null, output: null, durationMs: null };
  }
  if (!Number.isInteger(index)) return null;
  const facility = facilities[index];
  if (!facility) return null;
  const level = BigInt(facility.level);
  const startingCost = facilityUpgradeTotal(world, type, level);
  const costFor = (count) => facilityUpgradeTotal(world, type, level + count) - startingCost;
  let count = asNatural(steps);
  if (steps === 'max') {
    let lower = 0n;
    let upper = 1n;
    while (costFor(upper) <= world.coins) {
      lower = upper;
      upper *= 2n;
    }
    while (upper - lower > 1n) {
      const middle = (lower + upper) / 2n;
      if (costFor(middle) <= world.coins) lower = middle;
      else upper = middle;
    }
    count = lower || 1n;
  }
  if (!count) return null;
  const target = level + count;
  const cost = costFor(count);
  return { cost, affordable: world.coins >= cost, target,
    currentOutput: facilityOutput(world, kind, facility.recipe, level),
    output: facilityOutput(world, kind, facility.recipe, target),
    durationMs: productionDurationMs(world, facility.recipe) };
}

export function stationOffer(world, kind) {
  if (!Object.hasOwn(stationTypes, kind)) return null;
  const { base, limit } = stationTypes[kind];
  const count = world.stations[kind].length;
  const atLimit = count >= limit;
  const cost = geometric(base, Math.max(0, count - 1));
  return { cost, count, limit, atLimit, affordable: !atLimit && world.coins >= cost };
}

export function buyFacility(world, kind) {
  const quote = facilityOffer(world, kind);
  if (!quote?.affordable) return false;
  world.coins -= quote.cost;
  world.facilities[kind].push(emptyFacility());
  const counter = { C: 'plots', L: 'boughtL', F: 'boughtF' }[kind];
  world.stats[counter] += 1n;
  return true;
}

export function upgradeFacility(world, kind, index, steps) {
  const quote = facilityOffer(world, kind, index, steps);
  if (!quote?.affordable || quote.target === null) return false;
  const facility = world.facilities[kind][index];
  world.coins -= quote.cost;
  facility.level = String(quote.target);
  if (facility.batch) {
    // Apply the upgraded yield to this harvest without restarting its growth clock.
    facility.batch.amount = String(facilityOutput(world, kind, facility.batch.id, quote.target));
  }
  return true;
}

export function assignFacility(world, kind, index, id) {
  if (!Object.hasOwn(facilityTypes, kind) || !Number.isInteger(index)) return false;
  const facility = world.facilities[kind][index];
  if (!facility || catalog.items[id]?.kind !== kind || !world.unlocked.includes(id)) return false;
  const changed = facility.recipe !== id;
  if (facility.batch?.id !== id) facility.batch = null;
  facility.recipe = id;
  if (kind === 'C') {
    if (changed) {
      facility.planting = { id, start: world.clockMs, duration: productionDurationMs(world, id) };
    } else if (!facility.planting) {
      // A pre-session plot already assigned this crop has no provable first planting date.
      facility.planting = { id, start: null, duration: null };
    }
  }
  settleProduction(world);
  return true;
}

export function buyStation(world, kind) {
  const quote = stationOffer(world, kind);
  if (!quote?.affordable) return false;
  const highestOrder = Math.max(-1, ...orderedStations(world).map((station) => station.order));
  world.coins -= quote.cost;
  world.stations[kind].push(emptyStation(highestOrder + 1));
  return true;
}

export function arrangeStation(world, kind, index, id) {
  if (!Object.hasOwn(stationTypes, kind) || !Number.isInteger(index)) return false;
  const station = world.stations[kind][index];
  if (!station || catalog.items[id]?.kind[0] !== kind || !world.unlocked.includes(id)) return false;
  if (station.batch && station.batch.id !== id) {
    for (const [material, count] of Object.entries(station.batch.inputs ?? {})) {
      world.inventory[material] = quantity(world, material) + count;
    }
    station.batch = null;
  }
  station.recipe = id;
  settleProduction(world);
  return true;
}

export function setStationPriority(world, kind, index, priority) {
  if (!Object.hasOwn(stationTypes, kind) || !Number.isInteger(index) || typeof priority !== 'boolean') return false;
  const station = world.stations[kind][index];
  if (!station) return false;
  station.priority = priority;
  settleProduction(world);
  return true;
}

export function reserve(world, id, amount) {
  const count = asNatural(amount);
  if (!Object.hasOwn(catalog.items, id) || count === null) return false;
  if (count === 0n) delete world.reserves[id];
  else world.reserves[id] = count;
  settleProduction(world);
  return true;
}

export function tradeOffer(world, id, percent) {
  if (!Object.hasOwn(catalog.items, id) || !Number.isInteger(percent) || percent < 0 || percent > 100) return null;
  const inventory = quantity(world, id);
  const count = inventory * BigInt(percent) / 100n;
  const remaining = inventory - count;
  const price = unitPrice(world, id);
  const gain = count * price;
  const reserved = world.reserves[id] ?? 0n;
  const held = inventory < reserved ? inventory : reserved;
  const reserveAffected = held > remaining ? held - remaining : 0n;
  return { id, percent, inventory, count, remaining, price, gain, reserveAffected, affordable: count > 0n };
}

function quoteMatches(actual, expected) {
  return actual.id === expected.id && actual.percent === expected.percent && actual.count === expected.count &&
    actual.gain === expected.gain && actual.reserveAffected === expected.reserveAffected;
}

export function sellBatch(world, selections) {
  if (!Array.isArray(selections) || selections.length === 0) return false;
  const quotes = [];
  const ids = new Set();
  for (const selection of selections) {
    if (!selection) return false;
    const { id, percent, expectedQuote } = selection;
    const actual = tradeOffer(world, id, percent);
    if (!actual || ids.has(id) || expectedQuote && !quoteMatches(actual, expectedQuote)) return false;
    ids.add(id);
    if (actual.affordable) quotes.push(actual);
  }
  if (!quotes.length) return false;
  for (const { id, count, remaining, gain } of quotes) {
    world.inventory[id] = remaining;
    world.coins += gain;
    world.stats.sold += count;
    world.stats.revenue += gain;
    world.stats.lifetimeRevenue += gain;
  }
  return true;
}

export function sell(world, id, percent, expectedQuote) {
  return sellBatch(world, [{ id, percent, expectedQuote }]);
}

export function farmSaleOffer(world) {
  const productionValue = world.productionValue;
  const multiplierBasisPoints = appraisalMultiplierBasisPoints(world);
  const base = BigInt((1n + productionValue / rewardThreshold).toString(2).length - 1);
  return {
    completedRuns: world.completedRuns, productionValue, multiplierBasisPoints,
    stationCount: world.stations.I.length + world.stations.P.length,
    plotCount: world.facilities.C.length, livestockCount: world.facilities.L.length,
    pondCount: world.facilities.F.length,
    reward: base * BigInt(multiplierBasisPoints) / 10000n,
  };
}

export function sellFarm(world, expectedOffer) {
  const actual = farmSaleOffer(world);
  const check = ['completedRuns', 'multiplierBasisPoints', 'reward', 'stationCount', 'plotCount', 'livestockCount', 'pondCount'];
  if (!expectedOffer || check.some((key) => actual[key] !== expectedOffer[key])) return false;
  world.researchPoints += actual.reward;
  world.completedRuns += 1;
  world.firstCompletedRunAtMs ??= world.wallAnchorMs;
  world.coins = startingCoins;
  world.productionValue = 0n;
  world.stats.revenue = 0n;
  world.inventory = {};
  world.reserves = {};
  world.facilities = startingFacilities('C01');
  world.stations = { I: [emptyStation(0)], P: [emptyStation(1)] };
  settleProduction(world);
  return true;
}
