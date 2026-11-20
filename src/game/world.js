import catalog from '../content/game-data.json' with { type: 'json' };
import { appraisalMultiplierBasisPoints, delegationMilliseconds, discount, facilityYieldBasis, rate, unitPrice } from './advancement.js';
import { coinScale } from './coin-scale.js';
import { localCalendarDay, marketUnitPrice, synchronizeMarket } from './market.js';
import { newManagers, resetManagerRun, synchronizeManagerCalendar } from './managers.js';
import {
  newMerchant, recordMerchantProduction, recordMerchantSales, reserveMerchantSale, resetMerchantRun, synchronizeMerchant,
} from './merchant.js';
import { accrueBasicResearch } from './quality.js';
import { newPrestigeLedger, prestigeLedgerOffer, productionContributionBatch, settlePrestigeLedger } from './prestige-ledger.js';

export { catalog, marketUnitPrice, unitPrice };
export const worldSchemaVersion = 3;
export const startingCoins = 600n * coinScale;

const facilityBuyBase = 600n * coinScale;
const facilityUpgradeBase = 300n * coinScale;
const facilityTypes = {
  C: { buy: 'cropBuy', upgrade: 'cropUpgrade', free: 2 },
  L: { buy: 'livestockBuy', upgrade: 'livestockUpgrade', free: 0 },
  F: { buy: 'fishBuy', upgrade: 'fishUpgrade', free: 0 },
  M: { buy: 'miningBuy', upgrade: 'miningUpgrade', free: 0 },
};
const facilityGrowth = 5n;
const stationTypes = {
  I: { base: 750n * coinScale, limit: 48 },
  P: { base: 950n * coinScale, limit: 32 },
};
const stationGrowth = 25n;
const facilityLimit = 40;

const emptyFacility = () => ({ level: '1', recipe: null, batch: null });
const emptyStation = (order) => ({ order, level: '1', recipe: null, priority: false, batch: null });
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

function geometric(base, growth, bought) {
  return base * growth ** BigInt(bought);
}

// Cumulative upgrade weight S'(k) = k(k+1)(2k+1)/6 + floor(k^6/24000) for k = level - 1.
function upgradeWeight(level) {
  const k = level - 1n;
  return k * (k + 1n) * (2n * k + 1n) / 6n + k ** 6n / 24000n;
}

function facilityUpgradeTotal(world, type, level) {
  return discounted(world, facilityUpgradeBase * upgradeWeight(level), type.upgrade);
}

function multiplyFacilityYield(base, yieldBasis, level) {
  return base * stationMultiplier(level) * BigInt(yieldBasis) / 10000n;
}

const catalogOutput = (id) => Object.hasOwn(catalog.items, id) ? BigInt(catalog.items[id].output) : null;

export function facilitySnapshotOutput(batch, level) {
  return multiplyFacilityYield(BigInt(batch.yieldBase), batch.facilityYieldBasis, level);
}

function facilityOutput(world, kind, id, level) {
  const base = catalogOutput(id);
  return base === null ? null : multiplyFacilityYield(base, facilityYieldBasis(world, kind), level);
}

// Station upgrades are never discounted and take effect from the next batch.
function stationUpgradeTotal(type, level) {
  return type.base * upgradeWeight(level);
}

// Per-batch station multiplier W(L) = 1 + j + floor(j^2/64), j = L - 1; scales output and every input alike.
export function stationMultiplier(level) {
  const j = BigInt(level) - 1n;
  return 1n + j + j * j / 64n;
}

function stationOutput(id, level) {
  const base = catalogOutput(id);
  return base === null ? null : base * stationMultiplier(level);
}

// Resolve a step request into a positive count; 'max' finds the most affordable steps (at least one).
function upgradeSteps(world, steps, costFor) {
  if (steps !== 'max') return asNatural(steps);
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
  return lower || 1n;
}

export function productionDurationMs(world, id) {
  const item = catalog.items[id];
  return item ? Math.ceil(item.durationMs * 10000 / rate(world, id)) : null;
}

function greatestCommonDivisor(a, b) {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function forecastHourlyProduction(world) {
  const totals = new Map();
  const addRate = (id, duration, produced, consumed) => {
    const total = totals.get(id) ?? { duration: 1n, produced: 0n, consumed: 0n };
    // Keep an exact common denominator until all lines have been counted.
    const divisor = greatestCommonDivisor(total.duration, duration);
    const totalScale = duration / divisor;
    const batchScale = total.duration / divisor;
    totals.set(id, {
      duration: total.duration * totalScale,
      produced: total.produced * totalScale + produced * batchScale,
      consumed: total.consumed * totalScale + consumed * batchScale,
    });
  };

  for (const [kind, facilities] of Object.entries(world.facilities)) {
    for (const { recipe, level } of facilities) {
      if (!recipe) continue;
      const duration = BigInt(productionDurationMs(world, recipe));
      addRate(recipe, duration, facilityOutput(world, kind, recipe, BigInt(level)), 0n);
    }
  }
  for (const { recipe, level = '1' } of Object.values(world.stations).flat()) {
    if (!recipe) continue;
    const item = catalog.items[recipe];
    const duration = BigInt(productionDurationMs(world, recipe));
    const scale = stationMultiplier(level);
    addRate(recipe, duration, stationOutput(recipe, level), 0n);
    for (const [id, amount] of Object.entries(item.inputs ?? {})) {
      addRate(id, duration, 0n, BigInt(amount) * scale);
    }
  }

  const roundHourlyHundredths = (amount, duration) => (amount * 360_000_000n + duration / 2n) / duration;
  return Array.from(totals, ([id, total]) => {
    const produced = roundHourlyHundredths(total.produced, total.duration);
    const consumed = roundHourlyHundredths(total.consumed, total.duration);
    return { id, produced, consumed, net: produced - consumed };
  });
}

function makeBatch(world, id, amount) {
  return { id, amount: String(amount), start: world.clockMs, end: world.clockMs + productionDurationMs(world, id) };
}

function startingFacilities(recipe) {
  return { C: Array.from({ length: facilityTypes.C.free }, () => ({ ...emptyFacility(), recipe })), L: [], F: [], M: [] };
}

export function newWorld(now = 0, accountSeed = now.toString(16).padStart(32, '0')) {
  const day = localCalendarDay(now);
  const world = {
    schemaVersion: worldSchemaVersion, revision: 0, clockMs: 0, wallAnchorMs: now, coins: startingCoins,
    inventory: {}, reserves: {}, unlocked: [...catalog.initial], quality: {}, tech: {},
    researchPoints: 0n, basicResearchPoints: 0n, basicResearchElapsedMs: 0, basicResearchWeightedMs: 0n,
    accountSeed, qualityDraws: 0n, market: null, merchant: newMerchant(day),
    managers: newManagers(day), productionValue: 0n, completedRuns: 0, farmSaleHistory: [],
    ...newPrestigeLedger(),
    facilities: startingFacilities(null), stations: { I: [emptyStation(0)], P: [emptyStation(1)] },
    stats: { produced: {}, sold: 0n, plots: 0n, revenue: 0n, lifetimeRevenue: 0n, boughtL: 0n, boughtF: 0n, boughtM: 0n },
    taskRewards: [], settings: { music: 0, sound: 0, pickerIconsOnly: false },
  };
  settleProduction(world);
  return world;
}

export const quantity = (world, id) => world.inventory[id] ?? 0n;

export function availableToProduce(world, id) {
  const hold = world.merchantHold;
  const batch = hold && world.merchant?.batch;
  const temporary = hold && hold.id === id && hold.run === world.completedRuns &&
    hold.batchId === batch?.id && batch?.wanted?.id === id ? hold.count : 0n;
  const available = quantity(world, id) - (world.reserves[id] ?? 0n) - temporary;
  return available > 0n ? available : 0n;
}

// A station at level L consumes every recipe input x W(L) per batch (see stationMultiplier).
export function stationRequirements(world, id, level = 1n) {
  const scale = stationMultiplier(level);
  return Object.entries(catalog.items[id]?.inputs ?? {}).map(([key, amount]) => ({
    id: key, owned: availableToProduce(world, key), needed: BigInt(amount) * scale,
  }));
}

function orderedStations(world) {
  const stations = [...world.stations.I, ...world.stations.P];
  return stations.sort((a, b) => Number(b.priority) - Number(a.priority) || a.order - b.order);
}

// Caller guarantees the facility is idle and has a recipe.
function startFacility(world, kind, facility, onStart) {
  const base = catalogOutput(facility.recipe);
  const yieldBasis = facilityYieldBasis(world, kind);
  const count = multiplyFacilityYield(base, yieldBasis, facility.level);
  facility.batch = { ...makeBatch(world, facility.recipe, count), yieldBase: String(base), facilityYieldBasis: yieldBasis };
  if (kind === 'C' && (!facility.planting || facility.planting.id !== facility.batch.id)) {
    facility.planting = {
      id: facility.batch.id, start: facility.batch.start,
      duration: facility.batch.end - facility.batch.start,
    };
  }
  if (kind === 'M' && (!facility.mining || facility.mining.id !== facility.batch.id)) {
    facility.mining = { id: facility.batch.id, startedAt: facility.batch.start,
      durationMs: facility.batch.end - facility.batch.start };
  }
  onStart?.(facility);
}

// Caller guarantees the station is idle and has a recipe; returns false (no mutation) when short of inputs.
function startStation(world, station, onStart) {
  const level = station.level;
  const materials = stationRequirements(world, station.recipe, level);
  if (materials.some(({ owned, needed }) => owned < needed)) return false;
  const inputs = {};
  for (const { id, needed } of materials) {
    world.inventory[id] = quantity(world, id) - needed;
    inputs[id] = needed;
  }
  station.batch = { ...makeBatch(world, station.recipe, stationOutput(station.recipe, level)), inputs };
  onStart?.(station);
  return true;
}

function startProduction(world, stations, onStart) {
  for (const [kind, facilities] of Object.entries(world.facilities)) {
    for (const facility of facilities) {
      if (facility.batch || !facility.recipe) continue;
      startFacility(world, kind, facility, onStart);
    }
  }
  for (const station of stations) {
    if (station.batch || !station.recipe) continue;
    startStation(world, station, onStart);
  }
}

// Incremental restarts for advanceWorld. Must start exactly what a full startProduction scan would,
// in the same order: after one full scan, the only idle facilities with a recipe are those just
// completed, and an idle station that failed its input check can only pass again once one of its
// input IDs has been deposited (between scans inventory otherwise only decreases; reserves,
// merchant holds, levels and recipes are fixed during an advance).
function productionRestarter(world, stations, onStart) {
  const facilityKinds = new Map();
  let facilityCount = 0;
  for (const [kind, facilities] of Object.entries(world.facilities)) {
    for (const facility of facilities) facilityKinds.set(facility, { kind, rank: facilityCount++ });
  }
  const stationRanks = new Map(stations.map((station, rank) => [station, rank]));
  // Aliased entries (one object at two positions) cannot be ranked uniquely; keep the full scan.
  const distinct = facilityKinds.size === facilityCount && stationRanks.size === stations.length &&
    !stations.some((station) => facilityKinds.has(station));
  const waiting = new Map();
  const inputIds = (station) => Object.keys(catalog.items[station.recipe]?.inputs ?? {});
  const block = (station) => {
    for (const id of inputIds(station)) {
      let set = waiting.get(id);
      if (!set) waiting.set(id, set = new Set());
      set.add(station);
    }
  };
  const unblock = (station) => {
    for (const id of inputIds(station)) waiting.get(id)?.delete(station);
  };
  let scanned = false;

  return (completed, depositedIds) => {
    if (!distinct || !scanned) {
      startProduction(world, stations, onStart);
      if (!distinct) return;
      scanned = true;
      waiting.clear();
      for (const station of stations) if (!station.batch && station.recipe) block(station);
      return;
    }
    const facilities = [];
    const ready = new Set();
    for (const entry of completed) {
      if (entry.batch || !entry.recipe) continue;
      if (facilityKinds.has(entry)) facilities.push(entry);
      else ready.add(entry);
    }
    for (const id of depositedIds) {
      for (const station of waiting.get(id) ?? []) ready.add(station);
    }
    facilities.sort((a, b) => facilityKinds.get(a).rank - facilityKinds.get(b).rank);
    for (const facility of facilities) startFacility(world, facilityKinds.get(facility).kind, facility, onStart);
    const candidates = [...ready].sort((a, b) => stationRanks.get(a) - stationRanks.get(b));
    for (const station of candidates) {
      unblock(station);
      if (station.batch || !station.recipe) continue;
      if (!startStation(world, station, onStart)) block(station);
    }
  };
}

export function settleProduction(world) {
  startProduction(world, orderedStations(world));
}

function deposit(world, batch, contributions, wallAt) {
  const { id } = batch;
  const count = BigInt(batch.amount);
  world.inventory[id] = quantity(world, id) + count;
  const value = count * unitPrice(world, id);
  // Within one advance the appraisal multiplier is fixed, so the credit is batched and flushed once.
  contributions.add(value, appraisalMultiplierBasisPoints(world));
  world.productionValue += value;
  world.stats.produced[id] = (world.stats.produced[id] ?? 0n) + count;
  if (!Object.hasOwn(world.merchant.produced, id)) {
    // Preserve the first eligible assortment even when several discoveries are settled in one catch-up.
    const day = localCalendarDay(wallAt);
    synchronizeManagerCalendar(world, day);
    recordMerchantProduction(world, id);
    // Open on the qualifying production event without advancing the merchant's calendar boundary.
    if (!world.merchant.batch) synchronizeMerchant(world, world.merchant.day);
    synchronizeManagerCalendar(world, day);
  }
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

export function advanceWorld(world, targetMs, { deferFinalStarts = false, wallStartMs = world.wallAnchorMs } = {}) {
  if (!Number.isSafeInteger(targetMs) || targetMs < world.clockMs) return;
  const startMs = world.clockMs;
  const elapsed = targetMs - startMs;
  const stations = orderedStations(world);
  const heap = [];
  const enqueue = (entry) => pushEvent(heap, entry);
  for (const entry of [...Object.values(world.facilities).flat(), ...stations]) {
    if (entry.batch) enqueue(entry);
  }

  const restart = productionRestarter(world, stations, enqueue);
  if (heap[0]?.batch.end !== world.clockMs && (world.clockMs < targetMs || !deferFinalStarts)) {
    restart([], []);
  }
  const contributions = productionContributionBatch(world);
  try {
    while (heap.length && heap[0].batch.end <= targetMs) {
      const completedAt = heap[0].batch.end;
      world.clockMs = completedAt;
      const completed = [];
      const depositedIds = new Set();
      do {
        const entry = popEvent(heap);
        deposit(world, entry.batch, contributions, wallStartMs + completedAt - startMs);
        depositedIds.add(entry.batch.id);
        entry.batch = null;
        completed.push(entry);
      } while (heap[0]?.batch.end === completedAt);
      if (completedAt !== targetMs || !deferFinalStarts) restart(completed, depositedIds);
    }
  } finally {
    contributions.flush();
  }
  world.clockMs = targetMs;
  accrueBasicResearch(world, elapsed);
}

export function updateWorldWallTime(world, now) {
  if (!Number.isSafeInteger(now)) return 0;
  const elapsed = Math.max(0, Math.min(delegationMilliseconds(world), now - world.wallAnchorMs));
  const startMs = world.clockMs;
  const target = startMs + elapsed;
  // A page change during inactivity can end a hold partway through the offline interval.
  // Advance in two runs so the second run checks every waiting station under the released hold.
  const holdEndsAt = world.merchantHoldEndsAt;
  delete world.merchantHoldEndsAt;
  if (world.merchantHold && holdEndsAt !== undefined) {
    const untilRelease = Math.max(0, holdEndsAt - world.wallAnchorMs);
    advanceWorld(world, world.clockMs + Math.min(elapsed, untilRelease), { deferFinalStarts: untilRelease <= elapsed });
    reserveMerchantSale(world, null);
  }
  advanceWorld(world, target, { wallStartMs: world.wallAnchorMs + world.clockMs - startMs });
  world.wallAnchorMs = Math.max(world.wallAnchorMs, now);
  const held = world.merchantHold;
  synchronizeWorldCalendar(world, now);
  if (held && !world.merchantHold) settleProduction(world);
  return elapsed;
}

export function synchronizeWorldCalendar(world, wallMs) {
  const day = localCalendarDay(wallMs);
  synchronizeMarket(world, day);
  synchronizeMerchant(world, day);
  synchronizeManagerCalendar(world, day);
}

export function facilityOffer(world, kind, index = null, steps = 1n) {
  if (!Object.hasOwn(facilityTypes, kind)) return null;
  const type = facilityTypes[kind];
  const facilities = world.facilities[kind];
  if (index === null) {
    const count = facilities.length;
    const atLimit = count >= facilityLimit;
    const cost = discounted(world, geometric(facilityBuyBase, facilityGrowth, Math.max(0, count - type.free)), type.buy);
    return { cost, count, limit: facilityLimit, atLimit, affordable: !atLimit && world.coins >= cost,
      target: null, currentOutput: null, output: null, currentNextOutput: null, nextOutput: null, durationMs: null };
  }
  if (!Number.isInteger(index)) return null;
  const facility = facilities[index];
  if (!facility) return null;
  const level = BigInt(facility.level);
  const startingCost = facilityUpgradeTotal(world, type, level);
  const costFor = (count) => facilityUpgradeTotal(world, type, level + count) - startingCost;
  const count = upgradeSteps(world, steps, costFor);
  if (!count) return null;
  const target = level + count;
  const cost = costFor(count);
  const currentNextOutput = facilityOutput(world, kind, facility.recipe, level);
  const nextOutput = facilityOutput(world, kind, facility.recipe, target);
  return { cost, affordable: world.coins >= cost, target,
    currentOutput: facility.batch ? BigInt(facility.batch.amount) : currentNextOutput,
    output: facility.batch ? facilitySnapshotOutput(facility.batch, target) : nextOutput,
    currentNextOutput, nextOutput,
    durationMs: productionDurationMs(world, facility.recipe) };
}

export function stationOffer(world, kind) {
  if (!Object.hasOwn(stationTypes, kind)) return null;
  const { base, limit } = stationTypes[kind];
  const count = world.stations[kind].length;
  const atLimit = count >= limit;
  const cost = geometric(base, stationGrowth, Math.max(0, count - 1));
  return { cost, count, limit, atLimit, affordable: !atLimit && world.coins >= cost };
}

// Same shape as a single-facility facilityOffer quote; steps is a positive BigInt or 'max'.
export function stationUpgradeOffer(world, kind, index, steps = 1n) {
  if (!Object.hasOwn(stationTypes, kind) || !Number.isInteger(index)) return null;
  const type = stationTypes[kind];
  const station = world.stations[kind][index];
  if (!station) return null;
  const level = BigInt(station.level);
  const startingCost = stationUpgradeTotal(type, level);
  const costFor = (count) => stationUpgradeTotal(type, level + count) - startingCost;
  const count = upgradeSteps(world, steps, costFor);
  if (!count) return null;
  const target = level + count;
  const cost = costFor(count);
  return { cost, affordable: world.coins >= cost, target,
    currentOutput: stationOutput(station.recipe, level),
    output: stationOutput(station.recipe, target),
    durationMs: productionDurationMs(world, station.recipe) };
}

function productionSelection(world, kind, indices) {
  const station = Object.hasOwn(stationTypes, kind);
  if (!station && !Object.hasOwn(facilityTypes, kind)) return null;
  if (!Array.isArray(indices) || !indices.length) return null;
  const group = station ? world.stations[kind] : world.facilities[kind];
  const slots = [];
  const seen = new Set();
  for (const index of indices) {
    if (!Number.isInteger(index) || !group[index] || seen.has(index)) return null;
    seen.add(index);
    slots.push(group[index]);
  }
  return { slots, station };
}

function productionUpgradeBatchQuote(world, kind, indices, steps) {
  const count = asNatural(steps);
  if (count !== 1n && count !== 5n && count !== 10n) return null;
  const selection = productionSelection(world, kind, indices);
  if (!selection) return null;
  const offer = selection.station ? stationUpgradeOffer : facilityOffer;
  const upgrades = indices.map((index) => offer(world, kind, index, count));
  const cost = upgrades.reduce((sum, quote) => sum + quote.cost, 0n);
  return { ...selection, upgrades, cost, affordable: world.coins >= cost };
}

export function batchUpgradeOffer(world, kind, indices, steps) {
  const quote = productionUpgradeBatchQuote(world, kind, indices, steps);
  return quote && { cost: quote.cost, affordable: quote.affordable };
}

function applyProductionUpgrade(slot, quote, station) {
  slot.level = String(quote.target);
  if (!station && slot.batch) {
    // Apply the upgraded yield to this harvest without restarting its growth clock.
    slot.batch.amount = String(quote.output);
  }
}

export function upgradeProductionBatch(world, kind, indices, steps, expectedCost) {
  const quote = productionUpgradeBatchQuote(world, kind, indices, steps);
  if (!quote?.affordable || quote.cost !== expectedCost) return false;
  world.coins -= quote.cost;
  quote.slots.forEach((slot, index) => applyProductionUpgrade(slot, quote.upgrades[index], quote.station));
  settleProduction(world);
  return true;
}

// Only the level changes; a running batch keeps its paid inputs and its output.
export function upgradeStation(world, kind, index, steps) {
  const quote = stationUpgradeOffer(world, kind, index, steps);
  if (!quote?.affordable) return false;
  world.coins -= quote.cost;
  applyProductionUpgrade(world.stations[kind][index], quote, true);
  return true;
}

export function buyFacility(world, kind) {
  const quote = facilityOffer(world, kind);
  if (!quote?.affordable) return false;
  world.coins -= quote.cost;
  world.facilities[kind].push(emptyFacility());
  const counter = { C: 'plots', L: 'boughtL', F: 'boughtF', M: 'boughtM' }[kind];
  world.stats[counter] += 1n;
  return true;
}

export function upgradeFacility(world, kind, index, steps) {
  const quote = facilityOffer(world, kind, index, steps);
  if (!quote?.affordable || quote.target === null) return false;
  world.coins -= quote.cost;
  applyProductionUpgrade(world.facilities[kind][index], quote, false);
  return true;
}

export function assignProductionBatch(world, kind, indices, id) {
  const selection = productionSelection(world, kind, indices);
  if (!selection) return false;
  const itemKind = catalog.items[id]?.kind;
  if ((selection.station ? itemKind?.[0] : itemKind) !== kind || !world.unlocked.includes(id)) return false;
  for (const slot of selection.slots) {
    if (kind === 'M' && slot.recipe !== id) delete slot.mining;
    if (slot.batch && slot.batch.id !== id) {
      if (selection.station) cancelStationBatch(world, slot);
      else slot.batch = null;
    }
    slot.recipe = id;
  }
  settleProduction(world);
  return true;
}

export function clearProductionBatch(world, kind, indices) {
  const selection = productionSelection(world, kind, indices);
  if (!selection) return false;
  const { slots, station } = selection;
  const configured = slots.filter((slot) => slot.recipe || slot.batch || (!station && (slot.planting || slot.mining)));
  if (!configured.length) return false;
  for (const slot of configured) {
    slot.recipe = null;
    if (station) {
      if (slot.batch) cancelStationBatch(world, slot);
      slot.priority = false;
    } else {
      slot.batch = null;
      delete slot.planting;
      delete slot.mining;
    }
  }
  settleProduction(world);
  return true;
}

export function assignFacility(world, kind, index, id) {
  return Object.hasOwn(facilityTypes, kind) && assignProductionBatch(world, kind, [index], id);
}

export function clearFacility(world, kind, index) {
  return Object.hasOwn(facilityTypes, kind) && clearProductionBatch(world, kind, [index]);
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
  return Object.hasOwn(stationTypes, kind) && assignProductionBatch(world, kind, [index], id);
}

export function clearStation(world, kind, index) {
  return Object.hasOwn(stationTypes, kind) && clearProductionBatch(world, kind, [index]);
}

function cancelStationBatch(world, station) {
  for (const [material, count] of Object.entries(station.batch.inputs)) {
    world.inventory[material] = quantity(world, material) + count;
  }
  station.batch = null;
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
  const price = marketUnitPrice(world, id);
  const gain = count * price;
  const reserved = world.reserves[id] ?? 0n;
  const held = inventory < reserved ? inventory : reserved;
  const reserveAffected = held > remaining ? held - remaining : 0n;
  return { id, percent, inventory, count, remaining, price, gain, reserveAffected, affordable: count > 0n };
}

function quoteMatches(actual, expected) {
  return actual.id === expected?.id && actual.percent === expected.percent && actual.inventory === expected.inventory &&
    actual.count === expected.count && actual.remaining === expected.remaining && actual.price === expected.price &&
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
    if (!actual || ids.has(id) || (expectedQuote !== undefined && !quoteMatches(actual, expectedQuote))) return false;
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
  recordMerchantSales(world, quotes);
  return true;
}

export function sell(world, id, percent, expectedQuote) {
  return sellBatch(world, [{ id, percent, expectedQuote }]);
}

export function farmSaleOffer(world) {
  const productionValue = world.productionValue;
  const multiplierBasisPoints = appraisalMultiplierBasisPoints(world);
  return {
    completedRuns: world.completedRuns, productionValue, multiplierBasisPoints,
    stationCount: world.stations.I.length + world.stations.P.length,
    plotCount: world.facilities.C.length, livestockCount: world.facilities.L.length,
    pondCount: world.facilities.F.length,
    mineCount: world.facilities.M.length,
    ...prestigeLedgerOffer(world),
  };
}

export function sellFarm(world, expectedOffer, soldAt = world.wallAnchorMs) {
  if (!Number.isSafeInteger(soldAt) || soldAt < 0 || !Number.isSafeInteger(world.completedRuns + 1)) return false;
  const actual = farmSaleOffer(world);
  const check = ['completedRuns', 'productionValue', 'multiplierBasisPoints', 'reward',
    'stationCount', 'plotCount', 'livestockCount', 'pondCount', 'mineCount', 'prestigeLedgerVersion',
    'lifetimeProductionValue', 'prestigeCredit'];
  if (!expectedOffer || check.some((key) => actual[key] !== expectedOffer[key])) return false;
  settlePrestigeLedger(world);
  world.farmSaleHistory = [...(world.farmSaleHistory ?? []), {
    run: world.completedRuns + 1, soldAt, productionValue: world.productionValue,
  }];
  world.completedRuns += 1;
  world.coins = startingCoins;
  world.productionValue = 0n;
  world.stats.revenue = 0n;
  resetMerchantRun(world);
  resetManagerRun(world);
  world.inventory = {};
  world.reserves = {};
  world.facilities = startingFacilities(null);
  world.stations = { I: [emptyStation(0)], P: [emptyStation(1)] };
  settleProduction(world);
  return true;
}
