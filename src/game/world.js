import catalog from '../content/game-data.json' with { type: 'json' };
import { appraisalMultiplierBasisPoints, delegationMilliseconds, discount, facilityYieldBasis, rate, unitPrice } from './advancement.js';
import { coinScale } from './coin-scale.js';
import { localCalendarDay, marketUnitPrice, synchronizeMarket } from './market.js';
import { newManagers, resetManagerRun, synchronizeManagerCalendar } from './managers.js';
import {
  newMerchant, recordMerchantProduction, recordMerchantSales, reserveMerchantSale, resetMerchantRun, synchronizeMerchant,
} from './merchant.js';
import {
  activeMerchantHoldQuantity, attemptScheduledOrder, newOrders, raiseOrderCapacity, recordOrderAcquisition, recordOrderProduction,
  resetOrderRun, synchronizeOrders,
} from './orders.js';
import { activeGuideTask } from './objectives.js';
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

// Standard completion time: every refining station (world.stations.P) switched to the order's product at
// full speed, whatever it currently makes and whether the product was researched; inputs not counted.
// P sums each station's hourly output in hundredths, rounded like forecastHourlyProduction;
// ceil(count × 100 × 3,600,000 / P) ms, null when P is 0.
export function orderStandardTime(world, order) {
  const duration = BigInt(productionDurationMs(world, order.item) ?? 0);
  if (duration <= 0n) return null;
  let produced = 0n;
  for (const { level = '1' } of world.stations.P ?? []) {
    const amount = stationOutput(order.item, level) ?? 0n;
    produced += (amount * 360_000_000n + duration / 2n) / duration;
  }
  if (produced <= 0n) return null;
  const count = BigInt(order.count);
  return Number((count * 100n * 3_600_000n + produced - 1n) / produced);
}

const utilizationScale = 1_000_000n;
// Allocation rates are items per hour x 10^12, floored per line; ample next to the 10^-6 utilization quantum.
const allocationRateScale = 3_600_000n * 10n ** 12n;
const allocationRate = (amount, duration) => amount * allocationRateScale / duration;
// Share of a full-speed request, rounded to the utilization quantum so per-line flooring of
// equal rational rates never reads as a shortage.
function shareOf(supplied, requested) {
  if (requested === 0n) return utilizationScale;
  const share = (supplied * utilizationScale + requested / 2n) / requested;
  return share < utilizationScale ? share : utilizationScale;
}

// Real hourly output: facilities run at full speed; each station runs at the smallest share of its
// inputs. Every input counts as in stock for a station that has a batch running (end after the
// current clock), and an input also counts as in stock when availableToProduce covers one of the
// station's batches; otherwise the station receives upstream real output, handed out greedily in
// orderedStations order. Every station (in stock or not) draws its full-speed request from the
// upstream pool in that order and returns what its utilization leaves unused to later stations.
//
// Consecutive stations in orderedStations with the same recipe, level, priority and running state form
// one group, so every member has the same in-stock verdict for every input. Within such
// a run greedy allocation fills members one after another, so member k's share of every input is the
// same non-decreasing function clamp(t - (k - 1), 0, 1) of that input's total share t; since min and a
// non-decreasing function commute, the members' utilizations sum to min(min_i t_i, n): exactly the
// group's utilization times n. Inputs used and handed on are therefore identical, and a member below
// 100% exists exactly when the group is below 100%. Non-adjacent stations are not merged, because an
// interleaved consumer of a shared input would then be served in a different order; a running and an
// idle station are not merged, because only the running one counts every input as in stock.
//
// Upstream output depends on utilizations, so passes repeat until utilizations no longer change. Pass
// k uses the output of pass k - 1 (stations start at zero). When no station's output feeds back into
// its own supply (through inputs or earlier consumers' leftovers), an item whose dependency chain spans
// j station products is exact from pass j + 1; such a chain is at most the number of distinct station
// recipes N, so N + 1 passes reach and confirm the fixed point. Feedback loops through shared inputs
// may oscillate; the cap bounds the work and the last pass is used.
export function actualHourlyProduction(world) {
  const lines = new Map();
  const arranged = new Set();
  const starved = new Set();
  const register = (id) => {
    if (!lines.has(id)) lines.set(id, { duration: 1n, produced: 0n, consumed: 0n });
  };
  // Exact accumulation as in forecastHourlyProduction, with amounts carrying the utilization scale.
  const addRate = (id, duration, produced, consumed) => {
    register(id);
    const total = lines.get(id);
    const divisor = greatestCommonDivisor(total.duration, duration);
    const totalScale = duration / divisor;
    const batchScale = total.duration / divisor;
    total.duration *= totalScale;
    total.produced = total.produced * totalScale + produced * batchScale;
    total.consumed = total.consumed * totalScale + consumed * batchScale;
  };

  const facilitySupply = new Map();
  for (const [kind, facilities] of Object.entries(world.facilities)) {
    for (const { recipe, level } of facilities) {
      if (!recipe) continue;
      const durationMs = productionDurationMs(world, recipe);
      const output = facilityOutput(world, kind, recipe, BigInt(level));
      if (durationMs === null || output === null) continue;
      const duration = BigInt(durationMs);
      arranged.add(recipe);
      addRate(recipe, duration, output * utilizationScale, 0n);
      facilitySupply.set(recipe, (facilitySupply.get(recipe) ?? 0n) + allocationRate(output, duration));
    }
  }
  // Row order follows the saved station lists, as in forecastHourlyProduction.
  for (const { recipe } of Object.values(world.stations).flat()) {
    if (!recipe || !catalog.items[recipe]) continue;
    register(recipe);
    for (const id of Object.keys(catalog.items[recipe].inputs ?? {})) register(id);
  }

  const groups = [];
  for (const station of orderedStations(world)) {
    const { recipe } = station;
    if (!recipe || !catalog.items[recipe]) continue;
    const level = BigInt(station.level ?? '1');
    const priority = Boolean(station.priority);
    const running = Boolean(station.batch) && station.batch.end > world.clockMs;
    const last = groups.at(-1);
    if (last && last.recipe === recipe && last.level === level && last.priority === priority && last.running === running) {
      last.count += 1n;
      continue;
    }
    groups.push({ recipe, level, priority, running, count: 1n });
  }
  for (const group of groups) {
    group.duration = BigInt(productionDurationMs(world, group.recipe));
    group.output = group.count * stationOutput(group.recipe, group.level);
    group.supply = allocationRate(group.output, group.duration);
    group.inputs = stationRequirements(world, group.recipe, group.level).map(({ id, owned, needed }) => ({
      id, needed: group.count * needed, stocked: group.running || owned >= needed,
      request: allocationRate(group.count * needed, group.duration),
    }));
    arranged.add(group.recipe);
  }

  const runPass = (utilizations) => {
    const pools = new Map(facilitySupply);
    groups.forEach((group, index) => {
      pools.set(group.recipe, (pools.get(group.recipe) ?? 0n) + group.supply * utilizations[index] / utilizationScale);
    });
    const short = new Set();
    const next = groups.map((group) => {
      let utilization = utilizationScale;
      const grants = group.inputs.map((input) => {
        const pool = pools.get(input.id) ?? 0n;
        const granted = pool < input.request ? pool : input.request;
        const share = shareOf(granted, input.request);
        if (!input.stocked && share < utilizationScale) short.add(input.id);
        const supplied = input.stocked ? utilizationScale : share;
        if (supplied < utilization) utilization = supplied;
        return granted;
      });
      group.inputs.forEach((input, index) => {
        const used = input.request * utilization / utilizationScale;
        pools.set(input.id, (pools.get(input.id) ?? 0n) - (used < grants[index] ? used : grants[index]));
      });
      return utilization;
    });
    return { next, short };
  };

  let utilizations = groups.map(() => 0n);
  let short = new Set();
  const passLimit = new Set(groups.map(({ recipe }) => recipe)).size + 1;
  for (let pass = 0; pass < passLimit; pass += 1) {
    const result = runPass(utilizations);
    const settled = result.next.every((utilization, index) => utilization === utilizations[index]);
    utilizations = result.next;
    short = result.short;
    if (settled) break;
  }

  groups.forEach((group, index) => {
    const utilization = utilizations[index];
    if (utilization < utilizationScale) starved.add(group.recipe);
    addRate(group.recipe, group.duration, group.output * utilization, 0n);
    for (const input of group.inputs) addRate(input.id, group.duration, 0n, input.needed * utilization);
  });

  const roundHourlyHundredths = (amount, duration) => {
    const scaled = duration * utilizationScale;
    return (amount * 360_000_000n + scaled / 2n) / scaled;
  };
  return Array.from(lines, ([id, total]) => {
    const produced = roundHourlyHundredths(total.produced, total.duration);
    const consumed = roundHourlyHundredths(total.consumed, total.duration);
    return { id, produced, consumed, net: produced - consumed,
      arranged: arranged.has(id), starved: starved.has(id), short: short.has(id) };
  });
}

// Order sizes cap at the products' peak real output this run (order spec). Call after any action that
// may change arrangements, levels, technology or stock, once on load before offline settlement, and at
// the end of an advance that completed at least one batch.
export function recordOrderCapacity(world) {
  return raiseOrderCapacity(world, actualHourlyProduction(world));
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
    researchPoints: 0n, basicResearchPoints: 0n,
    accountSeed, qualityDraws: 0n, market: null, merchant: newMerchant(day),
    managers: newManagers(day), orders: newOrders(day), productionValue: 0n, completedRuns: 0, farmSaleHistory: [],
    capsules: 0n, pendingTaskCapsules: 0n, challengeCapsuleItems: [],
    ...newPrestigeLedger(),
    facilities: startingFacilities(null), stations: { I: [emptyStation(0)], P: [emptyStation(1)] },
    stats: { produced: {}, sold: 0n, plots: 0n, revenue: 0n, warehouseRevenue: 0n, lifetimeRevenue: 0n,
      ordersCompleted: 0n, orderRevenue: 0n, lifetimeOrderRevenue: 0n, boughtL: 0n, boughtF: 0n, boughtM: 0n },
    taskRewards: [], legacyGuideCompleted: false, introPending: true, settings: { music: 0, sound: 0, pickerIconsOnly: false, giftAllMode: 'cap', giftAllEven: false,
      batchUpgradeEven: false },
  };
  settleProduction(world);
  return world;
}

export function completeIntro(world) {
  if (world.introPending !== true) return false;
  world.introPending = false;
  return true;
}

export const quantity = (world, id) => world.inventory[id] ?? 0n;

export function availableToProduce(world, id) {
  const available = quantity(world, id) - (world.reserves[id] ?? 0n) - activeMerchantHoldQuantity(world, id);
  return available > 0n ? available : 0n;
}

// Running lines of `id`: the batch in progress pays its locked amount at `end`, then one batch at the
// current level arrives every current period (later inputs are not checked).
function runningOrderLines(world, id) {
  const lines = [];
  const period = productionDurationMs(world, id);
  const add = (batch, each) => {
    if (!batch || !(batch.end > world.clockMs)) return;
    lines.push({
      end: BigInt(batch.end), first: BigInt(batch.amount),
      period: period > 0 ? BigInt(period) : 0n, each: period > 0 && each > 0n ? each : 0n,
    });
  };
  for (const [kind, facilities] of Object.entries(world.facilities)) {
    for (const { recipe, level, batch } of facilities) {
      if (recipe === id) add(batch, facilityOutput(world, kind, id, BigInt(level)) ?? 0n);
    }
  }
  for (const { recipe, level = '1', batch } of Object.values(world.stations).flat()) {
    if (recipe === id) add(batch, stationOutput(id, level) ?? 0n);
  }
  return lines;
}

const lineArrivals = (line, t) => t < line.end ? 0n
  : line.first + (line.each > 0n ? (t - line.end) / line.period * line.each : 0n);

// Earliest time one line alone delivers `need`, or null when it never does.
function lineAloneTime(line, need) {
  if (line.first >= need) return line.end;
  if (line.each === 0n) return null;
  return line.end + ceilDiv(need - line.first, line.each) * line.period;
}

// Estimated completion of an order from stock less the merchant hold plus running lines (order ETA spec).
export function orderCompletion(world, order) {
  const count = BigInt(order.count);
  const available = quantity(world, order.item) - activeMerchantHoldQuantity(world, order.item);
  if (available >= count) return { status: 'ready' };
  if (!world.unlocked.includes(order.item)) return { status: 'unknown' };
  const lines = runningOrderLines(world, order.item);
  const need = count - available;
  let high = null;
  for (const line of lines) {
    const time = lineAloneTime(line, need);
    if (time !== null && (high === null || time < high)) high = time;
  }
  if (high === null) return { status: 'unknown' };
  // Totals are a non-decreasing step function of integer t that rises only at integer arrival times,
  // so the least integer t reaching `need` is itself an arrival time.
  let low = lines.reduce((least, line) => line.end < least ? line.end : least, high) - 1n;
  const total = (t) => lines.reduce((sum, line) => sum + lineArrivals(line, t), 0n);
  while (high - low > 1n) {
    const middle = (low + high) / 2n;
    if (total(middle) >= need) high = middle;
    else low = middle;
  }
  const atMs = Number(high);
  return Number.isSafeInteger(atMs) && BigInt(atMs) === high ? { status: 'scheduled', atMs } : { status: 'unknown' };
}

// A station at level L consumes every recipe input x W(L) per batch (see stationMultiplier).
export function stationRequirements(world, id, level = 1n) {
  const scale = stationMultiplier(level);
  return Object.entries(catalog.items[id]?.inputs ?? {}).map(([key, amount]) => ({
    id: key, owned: availableToProduce(world, key), needed: BigInt(amount) * scale,
  }));
}

export function orderedStations(world) {
  const stations = [...world.stations.I, ...world.stations.P];
  return stations.sort((a, b) => Number(b.priority) - Number(a.priority) || a.order - b.order);
}

// Caller guarantees the facility is idle and has a recipe.
export function startFacility(world, kind, facility, onStart) {
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

// `facilityGroups` defaults to every facility; a capsule fast-forward passes only its own slots.
function startProduction(world, stations, onStart, facilityGroups = world.facilities) {
  for (const [kind, facilities] of Object.entries(facilityGroups)) {
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
export function productionRestarter(world, stations, onStart, facilityGroups = world.facilities) {
  const facilityKinds = new Map();
  let facilityCount = 0;
  for (const [kind, facilities] of Object.entries(facilityGroups)) {
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
      startProduction(world, stations, onStart, facilityGroups);
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

export function deposit(world, batch, contributions, wallAt) {
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

export function pushEvent(heap, entry) {
  let index = heap.length;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].batch.end <= entry.batch.end) break;
    heap[index] = heap[parent];
    index = parent;
  }
  heap[index] = entry;
}

export function popEvent(heap) {
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

// Local dates can have 23 or 25 hours. Resolve the next day in the device's calendar.
function nextOrderMidnight(clockMs, wallMs) {
  const midnight = new Date(wallMs);
  const distance = midnight.setHours(24, 0, 0, 0) - wallMs;
  return distance > 0 ? clockMs + distance : Infinity;
}

export function advanceWorld(world, targetMs, {
  deferFinalStarts = false, wallStartMs = world.wallAnchorMs, orderWallStartMs = wallStartMs,
} = {}) {
  if (!Number.isSafeInteger(targetMs) || targetMs < world.clockMs) return;
  const startMs = world.clockMs;
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
  synchronizeOrders(world, localCalendarDay(orderWallStartMs));
  let midnight = nextOrderMidnight(startMs, orderWallStartMs);
  let completedAny = false;
  try {
    while (true) {
      const eventAt = Math.min(heap[0]?.batch.end ?? Infinity, world.orders.nextAttemptMs ?? Infinity, midnight);
      if (eventAt > targetMs) break;
      world.clockMs = eventAt;
      if (eventAt === midnight) {
        const wallAt = orderWallStartMs + (eventAt - startMs);
        synchronizeOrders(world, localCalendarDay(wallAt));
        midnight = nextOrderMidnight(eventAt, wallAt);
      }
      // Keep the existing deposit/merchant and restart order. Only the first order's
      // item uses the permanent station position to break ties among finished goods.
      const completed = [];
      const depositedIds = new Set();
      let firstProduct = null;
      let firstStation = null;
      while (heap[0]?.batch.end === eventAt) {
        const entry = popEvent(heap);
        const { id } = entry.batch;
        deposit(world, entry.batch, contributions, wallStartMs + (eventAt - startMs));
        if (recordOrderAcquisition(world, id) && world.orders.nextAttemptMs === null) {
          // Old saves can contain equal order numbers. The saved product-slot list breaks that tie.
          if (!firstStation || entry.order < firstStation.order ||
              (entry.order === firstStation.order && world.stations.P.indexOf(entry) < world.stations.P.indexOf(firstStation))) {
            firstProduct = id;
            firstStation = entry;
          }
        }
        depositedIds.add(id);
        entry.batch = null;
        completed.push(entry);
      }
      if (completed.length) completedAny = true;
      if (firstProduct !== null) recordOrderProduction(world, firstProduct, eventAt);
      else if (world.orders.nextAttemptMs === eventAt) attemptScheduledOrder(world, eventAt);
      if (completed.length && (eventAt !== targetMs || !deferFinalStarts)) restart(completed, depositedIds);
    }
  } finally {
    contributions.flush();
  }
  world.clockMs = targetMs;
  // Completions change stock and so real output; record the peak once per advance after settlement.
  if (completedAny) recordOrderCapacity(world);
}

export function updateWorldWallTime(world, now) {
  if (!Number.isSafeInteger(now)) return 0;
  const elapsed = Math.max(0, Math.min(delegationMilliseconds(world), now - world.wallAnchorMs));
  const startMs = world.clockMs;
  const target = startMs + elapsed;
  const orderWallStartMs = Math.min(world.wallAnchorMs, now);
  // A page change during inactivity can end a hold partway through the offline interval.
  // Advance in two runs so the second run checks every waiting station under the released hold.
  const holdEndsAt = world.merchantHoldEndsAt;
  delete world.merchantHoldEndsAt;
  if (world.merchantHold && holdEndsAt !== undefined) {
    const untilRelease = Math.max(0, holdEndsAt - world.wallAnchorMs);
    advanceWorld(world, world.clockMs + Math.min(elapsed, untilRelease),
      { deferFinalStarts: untilRelease <= elapsed, orderWallStartMs });
    reserveMerchantSale(world, null);
  }
  const advanced = world.clockMs - startMs;
  advanceWorld(world, target, { wallStartMs: world.wallAnchorMs + advanced, orderWallStartMs: orderWallStartMs + advanced });
  world.wallAnchorMs = Math.max(world.wallAnchorMs, now);
  const held = world.merchantHold;
  synchronizeWorldCalendar(world, now);
  if (held && !world.merchantHold) settleProduction(world);
  return elapsed;
}

export function synchronizeWorldCalendar(world, wallMs) {
  const day = localCalendarDay(wallMs);
  synchronizeOrders(world, day);
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

// Even split: the same total levels (steps × slots) go one at a time to the currently lowest
// slot (ties in selection order), so low levels catch up first. Slots left at +0 are skipped.
function evenUpgradeSteps(slots, total) {
  const levels = slots.map((slot) => BigInt(slot.level));
  const added = slots.map(() => 0n);
  for (let left = total; left > 0n; left -= 1n) {
    let lowest = 0;
    for (let index = 1; index < levels.length; index += 1) if (levels[index] < levels[lowest]) lowest = index;
    levels[lowest] += 1n;
    added[lowest] += 1n;
  }
  return added;
}

function productionUpgradeBatchQuote(world, kind, indices, steps, even = false) {
  const count = asNatural(steps);
  if (count !== 1n && count !== 5n && count !== 10n) return null;
  const selection = productionSelection(world, kind, indices);
  if (!selection) return null;
  const offer = selection.station ? stationUpgradeOffer : facilityOffer;
  const added = even ? evenUpgradeSteps(selection.slots, count * BigInt(indices.length)) : indices.map(() => count);
  const chosen = indices.map((index, position) => ({ index, slot: selection.slots[position], steps: added[position] }))
    .filter(({ steps: slotSteps }) => slotSteps > 0n);
  const upgrades = chosen.map(({ index, steps: slotSteps }) => offer(world, kind, index, slotSteps));
  if (upgrades.some((quote) => !quote)) return null;
  const cost = upgrades.reduce((sum, quote) => sum + quote.cost, 0n);
  if (!even && cost > world.coins) {
    // Each slot takes the whole step or is skipped: cheapest first (ties in selection order)
    // while the running total fits, then keep the selection order.
    const order = upgrades.map((quote, position) => position)
      .sort((a, b) => (upgrades[a].cost < upgrades[b].cost ? -1 : upgrades[a].cost > upgrades[b].cost ? 1 : a - b));
    const included = new Set();
    let total = 0n;
    for (const position of order) {
      if (total + upgrades[position].cost > world.coins) break;
      total += upgrades[position].cost;
      included.add(position);
    }
    if (included.size) {
      const kept = chosen.map((entry, position) => position).filter((position) => included.has(position));
      return { station: selection.station, slots: kept.map((position) => chosen[position].slot),
        upgrades: kept.map((position) => upgrades[position]), cost: total, affordable: true };
    }
  }
  return { station: selection.station, slots: chosen.map(({ slot }) => slot), upgrades, cost, affordable: world.coins >= cost };
}

// `levels` lists every selected slot's level after the upgrade (+0 for slots an even split skips).
export function batchUpgradeOffer(world, kind, indices, steps, even = false) {
  const quote = productionUpgradeBatchQuote(world, kind, indices, steps, even);
  if (!quote) return null;
  const targets = new Map(quote.slots.map((slot, position) => [slot, quote.upgrades[position].target]));
  const group = quote.station ? world.stations[kind] : world.facilities[kind];
  const levels = indices.map((index) => targets.get(group[index]) ?? BigInt(group[index].level));
  return { cost: quote.cost, affordable: quote.affordable, levels, count: quote.slots.length };
}

function applyProductionUpgrade(slot, quote, station) {
  slot.level = String(quote.target);
  if (!station && slot.batch) {
    // Apply the upgraded yield to this harvest without restarting its growth clock.
    slot.batch.amount = String(quote.output);
  }
}

export function upgradeProductionBatch(world, kind, indices, steps, expectedCost, even = false) {
  if (typeof even !== 'boolean') return false;
  const quote = productionUpgradeBatchQuote(world, kind, indices, steps, even);
  if (!quote?.affordable || quote.cost !== expectedCost) return false;
  world.coins -= quote.cost;
  quote.slots.forEach((slot, index) => applyProductionUpgrade(slot, quote.upgrades[index], quote.station));
  settleProduction(world);
  recordOrderCapacity(world);
  return true;
}

// Only the level changes; a running batch keeps its paid inputs and its output.
export function upgradeStation(world, kind, index, steps) {
  const quote = stationUpgradeOffer(world, kind, index, steps);
  if (!quote?.affordable) return false;
  world.coins -= quote.cost;
  applyProductionUpgrade(world.stations[kind][index], quote, true);
  recordOrderCapacity(world);
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
  recordOrderCapacity(world);
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
    recordOrderAcquisition(world, material);
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
    world.stats.warehouseRevenue += gain;
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
    guideLocked: activeGuideTask(world) !== null,
  };
}

export function sellFarm(world, expectedOffer, soldAt = world.wallAnchorMs) {
  if (!Number.isSafeInteger(soldAt) || soldAt < 0 || !Number.isSafeInteger(world.completedRuns + 1)) return false;
  const actual = farmSaleOffer(world);
  const check = ['completedRuns', 'productionValue', 'multiplierBasisPoints', 'reward',
    'stationCount', 'plotCount', 'livestockCount', 'pondCount', 'mineCount', 'prestigeLedgerVersion',
    'lifetimeProductionValue', 'prestigeCredit'];
  if (!expectedOffer || check.some((key) => actual[key] !== expectedOffer[key])) return false;
  if (actual.guideLocked) return false;
  settlePrestigeLedger(world);
  world.farmSaleHistory = [...(world.farmSaleHistory ?? []), {
    run: world.completedRuns + 1, soldAt, productionValue: world.productionValue,
  }];
  world.completedRuns += 1;
  world.coins = startingCoins;
  world.productionValue = 0n;
  world.stats.revenue = 0n;
  world.stats.warehouseRevenue = 0n;
  world.stats.orderRevenue = 0n;
  resetOrderRun(world);
  resetMerchantRun(world);
  resetManagerRun(world);
  world.inventory = {};
  world.reserves = {};
  world.facilities = startingFacilities(null);
  world.stations = { I: [emptyStation(0)], P: [emptyStation(1)] };
  settleProduction(world);
  return true;
}
