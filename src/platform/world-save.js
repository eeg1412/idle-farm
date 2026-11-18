import catalog from '../content/game-data.json' with { type: 'json' };
import { researchHourMs, techMaxLevels } from '../game/advancement.js';
import { validCalendarDay, validMarketRate } from '../game/market.js';
import { merchantItemTier, merchantProductionGate, merchantPurchaseMultipliers, merchantSalesGate, newMerchant } from '../game/merchant.js';
import { taskCoinRewards } from '../game/objectives.js';
import { facilitySnapshotOutput, updateWorldWallTime, worldSchemaVersion } from '../game/world.js';
import { prestigeLedgerVersion } from '../game/prestige-ledger.js';

const databaseName = 'idle-farm-v7';
const developmentDatabaseName = 'idle-farm-v7-development';
const storeName = 'records';
const decimalPattern = /^(0|[1-9]\d*)$/;
const signedDecimalPattern = /^(0|-?[1-9]\d*)$/;
const facilityKinds = ['C', 'L', 'F', 'M'];
const stationKinds = ['I', 'P'];
const limits = { C: 40, L: 40, F: 40, M: 40, I: 48, P: 32 };
const seedPattern = /^[0-9a-f]{32}$/;

export class WorldSaveError extends Error {
  constructor(code, cause) {
    super(code, { cause });
    this.name = 'WorldSaveError';
    this.code = code;
  }
}

export function openWorldSave({ development = false } = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(development ? developmentDatabaseName : databaseName, 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(new WorldSaveError('unavailable', request.error));
    request.onblocked = () => {
      blocked = true;
      reject(new WorldSaveError('unavailable'));
    };
  });
}

export async function readWorldSave(db, slot = 'current') {
  if (slot !== 'current' && slot !== 'previous') throw new WorldSaveError('invalid-slot');
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName);
    const request = tx.objectStore(storeName).get(slot);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new WorldSaveError('unavailable', request.error));
    tx.onabort = () => reject(new WorldSaveError('unavailable', tx.error));
  });
  return record === undefined ? null : readRecord(record, slot);
}

function transact(db, operate) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    let result;
    let reason;
    const abort = (error) => {
      reason = error;
      tx.abort();
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(reason ?? new WorldSaveError('unavailable', tx.error));
    const current = store.get('current');
    const previous = store.get('previous');
    previous.onsuccess = () => {
      try {
        result = operate(store, current.result, previous.result);
      } catch (error) {
        abort(error);
      }
    };
  });
}

// Per connection: the record this session last committed to `current`, so routine saves can
// skip re-decoding it. A full read and validation still runs on the first save, after any
// failure or mismatch, and on every fullCheckInterval-th save, so outside damage is found within a minute.
const fullCheckInterval = 12;
const lastWritten = new WeakMap();
const markerFields = ['revision', 'schemaVersion', 'prestigeLedgerVersion', 'wallAnchorMs', 'clockMs',
  'coins', 'productionValue', 'researchPoints'];

function recordMarker(record) {
  return markerFields.map((field) => record?.[field]);
}

function sameMarker(record, marker) {
  return record !== null && typeof record === 'object' && !Array.isArray(record) &&
    markerFields.every((field, index) => record[field] === marker[index]);
}

export async function writeWorldSave(db, world, { replaceCorrupt = false, corruptRevision } = {}) {
  integer(world.revision, 'revision');
  const known = lastWritten.get(db);
  lastWritten.delete(db);
  let written;
  let checked;
  const revision = await transact(db, (store, current, previous) => {
    let saved;
    // Trust `current` only when it still carries exactly the revision and marker this session wrote.
    checked = replaceCorrupt || !known || known.sinceFull + 1 >= fullCheckInterval ||
      known.marker[0] !== world.revision || !sameMarker(current, known.marker);
    if (!checked) {
      saved = { revision: recordRevision(current) };
    } else if (current !== undefined) {
      try {
        saved = readRecord(current, 'current');
      } catch (error) {
        if (!replaceCorrupt || error.code !== 'corrupt-current') throw error;
      }
    }
    if (replaceCorrupt && (current === undefined || saved ||
      (corruptRevision !== undefined && corruptRevision !== recordRevision(current)))) {
      throw new WorldSaveError('revision-conflict');
    }
    if (replaceCorrupt && previous !== undefined) {
      try {
        readRecord(previous, 'previous');
        throw new WorldSaveError('revision-conflict');
      } catch (error) {
        if (error.code !== 'corrupt-previous') throw error;
      }
    }
    if ((saved && saved.revision !== world.revision) || (current === undefined && world.revision !== 0)) {
      throw new WorldSaveError('revision-conflict');
    }
    const revision = nextRevision(world.revision, current, previous);
    const next = encodeWorld({ ...world, revision });
    if (saved) store.put(checked ? amounts(saved, decimalText, signedDecimalText) : current, 'previous');
    store.put(next, 'current');
    written = recordMarker(next);
    return revision;
  });
  // Reached only after the transaction committed; a rejection leaves no marker, forcing a full check next time.
  lastWritten.set(db, { marker: written, sinceFull: checked ? 0 : known.sinceFull + 1 });
  return revision;
}

export async function replaceWorldSave(db, world, expectedRevision, { clearBackup = false } = {}) {
  integer(expectedRevision, 'revision');
  return transact(db, (store, current, previous) => {
    if (current === undefined) throw new WorldSaveError('revision-conflict');
    const saved = readRecord(current, 'current');
    if (saved.revision !== expectedRevision) throw new WorldSaveError('revision-conflict');
    const revision = nextRevision(expectedRevision, current, previous);
    const next = { ...world, revision };
    if (next.pendingOffline) next.pendingOffline = { ...next.pendingOffline, id: revision };
    const record = encodeWorld(next);
    if (clearBackup) store.delete('previous');
    else store.put(amounts(saved, decimalText, signedDecimalText), 'previous');
    store.put(record, 'current');
    return next;
  });
}

export function encodeWorldRecord(world) {
  return encodeWorld(world);
}

export function decodeWorldRecord(record) {
  return readRecord(record, 'transfer');
}

export async function restoreWorldSave(db, { corruptRevision, backupRevision } = {}) {
  return transact(db, (store, current, previous) => {
    if (current === undefined) throw new WorldSaveError('revision-conflict');
    try {
      readRecord(current, 'current');
      throw new WorldSaveError('revision-conflict');
    } catch (error) {
      if (error.code !== 'corrupt-current') throw error;
    }
    if (previous === undefined) throw new WorldSaveError('no-backup');
    const backup = readRecord(previous, 'previous');
    if ((corruptRevision !== undefined && corruptRevision !== recordRevision(current)) ||
      (backupRevision !== undefined && backupRevision !== backup.revision)) {
      throw new WorldSaveError('revision-conflict');
    }
    const world = { ...backup, revision: nextRevision(backup.revision, current, previous) };
    store.put(encodeWorld(world), 'current');
    return world;
  });
}

function recordRevision(record) {
  return Number.isSafeInteger(record?.revision) && record.revision >= 0 ? record.revision : null;
}

function nextRevision(revision, ...records) {
  const revisions = records.map(recordRevision).filter((value) => value !== null);
  const next = Math.max(revision, ...revisions) + 1;
  if (!Number.isSafeInteger(next)) throw new WorldSaveError('revision-conflict');
  return next;
}

function valid(condition, field) {
  if (!condition) throw new Error(`Invalid save field: ${field}`);
}

function object(value, field) {
  valid(value !== null && typeof value === 'object' && !Array.isArray(value), field);
  return value;
}

function integer(value, field) {
  valid(Number.isSafeInteger(value) && value >= 0, field);
  return value;
}

function decimal(value, field, minimum = 0n) {
  valid(typeof value === 'string' && decimalPattern.test(value), field);
  const amount = BigInt(value);
  valid(amount >= minimum, field);
  return amount;
}

function decimalText(value, field, minimum = 0n) {
  const text = typeof value === 'bigint' ? value.toString() : value;
  decimal(text, field, minimum);
  return text;
}

function signedDecimal(value, field) {
  valid(typeof value === 'string' && signedDecimalPattern.test(value), field);
  return BigInt(value);
}

function signedDecimalText(value, field) {
  const text = typeof value === 'bigint' ? value.toString() : value;
  signedDecimal(text, field);
  return text;
}

function quantityMap(value, field, convert) {
  return Object.fromEntries(Object.entries(object(value, field)).map(([id, amount]) => {
    valid(Object.hasOwn(catalog.items, id), `${field}.${id}`);
    return [id, convert(amount, `${field}.${id}`)];
  }));
}

function recordStats(value, convert) {
  const stats = object(value, 'stats');
  return {
    produced: quantityMap(stats.produced, 'stats.produced', convert),
    sold: convert(stats.sold, 'stats.sold'),
    plots: convert(stats.plots, 'stats.plots'),
    revenue: convert(stats.revenue, 'stats.revenue'),
    lifetimeRevenue: convert(stats.lifetimeRevenue, 'stats.lifetimeRevenue'),
    boughtL: convert(stats.boughtL, 'stats.boughtL'),
    boughtF: convert(stats.boughtF, 'stats.boughtF'),
    boughtM: convert(Object.hasOwn(stats, 'boughtM') ? stats.boughtM : '0', 'stats.boughtM'),
  };
}

function stationBatches(stations, convert) {
  object(stations, 'stations');
  return Object.fromEntries(stationKinds.map((kind) => {
    valid(Array.isArray(stations[kind]), `stations.${kind}`);
    return [kind, stations[kind].map((slot, index) => {
      object(slot, `stations.${kind}.${index}`);
      if (slot.batch === null) return { ...slot };
      const batch = object(slot.batch, `${kind}.batch`);
      const inputs = quantityMap(batch.inputs, `${kind}.batch.inputs`, (value, field) => convert(value, field, 1n));
      return { ...slot, batch: { ...batch, inputs } };
    })];
  }));
}

function offlineAmounts(summary, convert, convertSigned) {
  object(summary, 'pendingOffline');
  const id = integer(summary.id, 'pendingOffline.id');
  const elapsedMs = integer(summary.elapsedMs, 'pendingOffline.elapsedMs');
  valid(id > 0 && elapsedMs > 0, 'pendingOffline');
  return {
    id, elapsedMs,
    produced: quantityMap(summary.produced, 'pendingOffline.produced', (value, field) => convert(value, field, 1n)),
    inventoryDelta: quantityMap(summary.inventoryDelta, 'pendingOffline.inventoryDelta', convertSigned),
  };
}

export function initializeAccountSeed(world) {
  if (world.accountSeed == null) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    world.accountSeed = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return world.accountSeed;
}

function marketRecord(value, unlocked, seed) {
  if (value === null) return null;
  const { day, sequence, used, rates } = object(value, 'market');
  valid(validCalendarDay(day), 'market.day');
  valid(integer(sequence, 'market.sequence') === integer(used, 'market.used') &&
    used <= techMaxLevels.marketManipulation, 'market.used');
  if (rates === null) {
    valid(sequence === 0, 'market.sequence');
    return { day, sequence, used, rates };
  }
  valid(seed !== null, 'market.seed');
  const ids = new Set(unlocked);
  const entries = Object.entries(object(rates, 'market.rates'));
  valid(entries.length >= 1 && entries.length <= Math.max(1, Math.floor(ids.size / 10)), 'market.rates');
  for (const [id, rate] of entries) {
    valid(ids.has(id) && validMarketRate(rate), `market.rates.${id}`);
  }
  return { day, sequence, used, rates: Object.fromEntries(entries) };
}

function merchantRecord(value, world, market, seed, convert) {
  const legacy = !Object.hasOwn(world, 'merchant');
  const source = legacy ? newMerchant(market?.day ?? null) : object(value, 'merchant');
  const { day, freeUsed, manualUsed, sequence, version, produced, sales, batch } = source;
  const barter = !Object.hasOwn(source, 'directSales');
  valid(day === null || validCalendarDay(day), 'merchant.day');
  valid(typeof freeUsed === 'boolean', 'merchant.freeUsed');
  valid(integer(manualUsed, 'merchant.manualUsed') <= (world.tech.merchantRestock ?? 0), 'merchant.manualUsed');
  const amount = (value, field, minimum = 0n) =>
    convert(legacy && typeof value === 'bigint' ? value.toString() : value, `merchant.${field}`, minimum);
  const savedSequence = amount(sequence, 'sequence');
  const savedVersion = amount(version, 'version');
  valid(BigInt(savedVersion) >= BigInt(savedSequence), 'merchant.version');
  valid(BigInt(savedSequence) >= BigInt(manualUsed + Number(freeUsed)) &&
    (BigInt(savedSequence) === 0n || day !== null && seed !== null), 'merchant.sequence');

  const entries = Object.entries(object(produced, 'merchant.produced'));
  const unlocked = new Set(world.unlocked);
  for (const [id, tier] of entries) {
    valid(unlocked.has(id) && merchantItemTier(id) === tier && BigInt(world.stats.produced[id] ?? 0n) > 0n,
      `merchant.produced.${id}`);
  }
  const totals = object(sales, 'merchant.sales');
  const salesByTier = Object.fromEntries([1, 2, 3].map((tier) => [tier, amount(totals[tier], 'sales.' + tier)]));
  const salesLevel12 = BigInt(salesByTier[1]) + BigInt(salesByTier[2]);
  const warehouseSales = salesLevel12 + BigInt(salesByTier[3]);
  valid(warehouseSales <= BigInt(world.stats.revenue), 'merchant.sales');
  const directSales = amount(barter ? '0' : source.directSales, 'directSales');
  const state = { day, freeUsed, manualUsed, sequence: savedSequence, version: savedVersion,
    produced: Object.fromEntries(entries), sales: salesByTier, directSales, batch: null };
  if (batch === null) return state;

  object(batch, 'merchant.batch');
  valid(salesLevel12 > merchantSalesGate && entries.filter(([, tier]) => tier < 3).length >= merchantProductionGate,
    'merchant.batch');
  const id = amount(batch.id, 'batch.id', 1n);
  valid(id === savedSequence, 'merchant.batch.id');
  const baseline = amount(batch.baseline, 'batch.baseline', merchantSalesGate + 1n);
  const spent = amount(batch.spent, 'batch.spent');
  const baselineAmount = BigInt(baseline);
  const salesGrowth = warehouseSales + BigInt(directSales) - baselineAmount;
  valid(salesGrowth >= 0n, 'merchant.batch.baseline');
  valid(salesGrowth > 0n || BigInt(spent) === 0n, 'merchant.batch.spent');
  const oldBudget = baselineAmount * 5n;
  if (barter) {
    valid(!Object.hasOwn(batch, 'trades') && !Object.hasOwn(batch, 'initialCost') &&
      !Object.hasOwn(batch, 'initialCostIsUpperBound') &&
      BigInt(spent) <= (warehouseSales - baselineAmount) * 5n, 'merchant.batch');
  }
  const initialCost = amount(barter ? oldBudget.toString() : batch.initialCost, 'batch.initialCost', 1n);
  const initialCostIsUpperBound = barter || batch.initialCostIsUpperBound;
  valid(typeof initialCostIsUpperBound === 'boolean' &&
    (!initialCostIsUpperBound || BigInt(initialCost) === oldBudget && baselineAmount <= warehouseSales),
    'merchant.batch.initialCostIsUpperBound');
  const trades = amount(barter ? '0' : batch.trades, 'batch.trades');
  valid(BigInt(trades) <= BigInt(savedVersion) - BigInt(savedSequence), 'merchant.batch.trades');
  const stock = quantityMap(batch.stock, 'merchant.batch.stock', convert);
  const ids = Object.keys(stock);
  const stockedUnits = Object.values(stock).reduce((total, count) => total + BigInt(count), 0n);
  valid(ids.length >= 1 && ids.length <= Math.floor(entries.length / merchantProductionGate) &&
    ids.every((id) => state.produced[id] === 1 || state.produced[id] === 2) &&
    stockedUnits <= BigInt(initialCost) + BigInt(spent), 'merchant.batch.stock');
  valid(Array.isArray(batch.pending), 'merchant.batch.pending');
  const pending = new Set(batch.pending);
  valid(pending.size === batch.pending.length && pending.size === ids.filter((id) => BigInt(stock[id]) === 0n).length &&
    [...pending].every((id) => typeof id === 'string' && Object.hasOwn(stock, id) && BigInt(stock[id]) === 0n),
    'merchant.batch.pending');
  let wanted = null;
  if (batch.wanted !== null) {
    const { id, multiplier: savedMultiplier } = object(batch.wanted, 'merchant.batch.wanted');
    valid(typeof id === 'string' && Object.hasOwn(state.produced, id) && !Object.hasOwn(stock, id),
      'merchant.batch.wanted.id');
    const capacity = amount(batch.wanted.capacity, 'batch.wanted.capacity', 1n);
    const remaining = amount(batch.wanted.remaining, 'batch.wanted.remaining');
    valid(BigInt(remaining) <= BigInt(capacity) &&
      (!initialCostIsUpperBound || BigInt(capacity) <= oldBudget / 10n), 'merchant.batch.wanted.remaining');
    valid(!barter || !Object.hasOwn(batch.wanted, 'multiplier'), 'merchant.batch.wanted.multiplier');
    const multiplier = barter ? 200 : savedMultiplier;
    valid(merchantPurchaseMultipliers.includes(multiplier) && (!initialCostIsUpperBound || multiplier === 200),
      'merchant.batch.wanted.multiplier');
    wanted = { id, capacity, remaining, multiplier };
  }
  state.batch = { id, baseline, initialCost, initialCostIsUpperBound, spent, stock, pending: [...pending], wanted, trades };
  return state;
}

function amounts(world, convert, convertSigned) {
  const pendingOffline = Object.hasOwn(world, 'pendingOffline') && offlineAmounts(world.pendingOffline, convert, convertSigned);
  if (pendingOffline) valid(pendingOffline.id <= world.revision, 'pendingOffline.id');
  const { music, sound, pickerIconsOnly = false } = object(world.settings, 'settings');
  const accountSeed = Object.hasOwn(world, 'accountSeed') ? world.accountSeed : null;
  valid(accountSeed === null || typeof accountSeed === 'string' && seedPattern.test(accountSeed), 'accountSeed');
  const market = Object.hasOwn(world, 'market') ? marketRecord(world.market, world.unlocked, accountSeed) : null;
  const merchant = merchantRecord(world.merchant, world, market, accountSeed, convert);
  const basicResearchElapsedMs = Object.hasOwn(world, 'basicResearchElapsedMs')
    ? integer(world.basicResearchElapsedMs, 'basicResearchElapsedMs') : 0;
  return {
    schemaVersion: world.schemaVersion,
    revision: world.revision,
    clockMs: world.clockMs,
    wallAnchorMs: world.wallAnchorMs,
    completedRuns: world.completedRuns,
    prestigeLedgerVersion: world.prestigeLedgerVersion,
    unlocked: world.unlocked,
    quality: world.quality,
    tech: world.tech,
    facilities: facilityRecords(world),
    settings: { music, sound, pickerIconsOnly },
    taskRewards: taskRewardIds(world),
    coins: convert(world.coins, 'coins'),
    productionValue: convert(world.productionValue, 'productionValue'),
    researchPoints: convert(world.researchPoints, 'researchPoints'),
    basicResearchPoints: convert(Object.hasOwn(world, 'basicResearchPoints') ? world.basicResearchPoints : '0', 'basicResearchPoints'),
    basicResearchElapsedMs,
    basicResearchWeightedMs: convert(Object.hasOwn(world, 'basicResearchWeightedMs') ? world.basicResearchWeightedMs : '0', 'basicResearchWeightedMs'),
    qualityDraws: convert(Object.hasOwn(world, 'qualityDraws') ? world.qualityDraws : '0', 'qualityDraws'),
    accountSeed,
    market,
    merchant,
    lifetimeProductionValue: convert(world.lifetimeProductionValue, 'lifetimeProductionValue'),
    prestigeCredit: convert(world.prestigeCredit, 'prestigeCredit'),
    inventory: quantityMap(world.inventory, 'inventory', convert),
    reserves: quantityMap(world.reserves, 'reserves', convert),
    stats: recordStats(world.stats, convert),
    stations: stationBatches(world.stations, convert),
    ...(pendingOffline && { pendingOffline }),
  };
}

function facilityRecords(world) {
  const facilities = object(world.facilities, 'facilities');
  const mines = Object.hasOwn(facilities, 'M') ? facilities.M : [];
  valid(Array.isArray(mines), 'facilities.M');
  return { ...facilities, M: mines.map((slot, index) => {
    object(slot, `facilities.M.${index}`);
    const recorded = Object.hasOwn(slot, 'mining');
    // Old active mines resume the current saved batch's phase, never the import time.
    const source = recorded ? slot.mining : slot.batch && slot.recipe === slot.batch.id
      ? { id: slot.batch.id, startedAt: slot.batch.start, durationMs: slot.batch.end - slot.batch.start } : undefined;
    if (source === undefined) return { ...slot };
    const mining = object(source, `facilities.M.${index}.mining`);
    return { ...slot, mining: { id: mining.id, startedAt: mining.startedAt, durationMs: mining.durationMs } };
  }) };
}

function taskRewardIds(world) {
  const ids = world.taskRewards;
  valid(
    Array.isArray(ids) && new Set(ids).size === ids.length &&
      ids.every((id) => typeof id === 'string' && Object.hasOwn(taskCoinRewards, id)),
    'taskRewards',
  );
  return [...ids];
}

function validateRecipe(id, kind, field) {
  valid(typeof id === 'string' && Object.hasOwn(catalog.items, id) && catalog.items[id].kind.startsWith(kind), field);
}

function validatePlanting(world, slot, field) {
  if (slot.recipe === null) {
    valid(!Object.hasOwn(slot, 'planting'), `${field}.planting`);
    return;
  }
  const planting = object(slot.planting, `${field}.planting`);
  valid(planting.id === slot.recipe, `${field}.planting.id`);
  valid(integer(planting.start, `${field}.planting.start`) <= world.clockMs, `${field}.planting.start`);
  valid(integer(planting.duration, `${field}.planting.duration`) > 0, `${field}.planting.duration`);
  valid(Number.isSafeInteger(planting.start + planting.duration), `${field}.planting.duration`);
}

function validateFacilityLists(world, key, kinds) {
  const lists = object(world[key], key);
  for (const kind of kinds) {
    const slots = lists[kind];
    const minimum = kind === 'C' ? 2 : key === 'stations' ? 1 : 0;
    valid(Array.isArray(slots) && slots.length >= minimum && slots.length <= limits[kind], `${key}.${kind}`);
    for (const [index, slot] of slots.entries()) {
      const field = `${key}.${kind}.${index}`;
      object(slot, field);
      if (slot.recipe !== null) validateRecipe(slot.recipe, kind, `${field}.recipe`);
      const level = decimal(slot.level, `${field}.level`, 1n);
      if (key === 'facilities' && kind === 'C') validatePlanting(world, slot, field);
      if (key === 'facilities' && kind === 'M') {
        if (slot.recipe === null) valid(!Object.hasOwn(slot, 'mining'), `${field}.mining`);
        else if (Object.hasOwn(slot, 'mining')) {
          const mining = object(slot.mining, `${field}.mining`);
          valid(mining.id === slot.recipe, `${field}.mining.id`);
          valid(integer(mining.startedAt, `${field}.mining.startedAt`) <= world.clockMs, `${field}.mining.startedAt`);
          valid(integer(mining.durationMs, `${field}.mining.durationMs`) > 0, `${field}.mining.durationMs`);
          valid(Number.isSafeInteger(mining.startedAt + mining.durationMs), `${field}.mining.durationMs`);
        }
      }
      if (key === 'stations') {
        valid(typeof slot.priority === 'boolean', `${field}.priority`);
        integer(slot.order, `${field}.order`);
      }
      if (slot.batch === null) continue;
      const batch = object(slot.batch, `${field}.batch`);
      validateRecipe(batch.id, kind, `${field}.batch.id`);
      const amount = decimal(batch.amount, `${field}.batch.amount`, 1n);
      if (key === 'facilities') {
        decimal(batch.yieldBase, `${field}.batch.yieldBase`, 1n);
        const basis = integer(batch.facilityYieldBasis, `${field}.batch.facilityYieldBasis`);
        valid(basis >= 10000 && basis <= 20000 && basis % 200 === 0, `${field}.batch.facilityYieldBasis`);
        valid(amount === facilitySnapshotOutput(batch, level), `${field}.batch.amount`);
      }
      const start = integer(batch.start, `${field}.batch.start`);
      const end = integer(batch.end, `${field}.batch.end`);
      valid(start <= world.clockMs && world.clockMs < end, `${field}.batch`);
    }
  }
}

function validateWorld(world) {
  valid(world.schemaVersion === worldSchemaVersion, 'schemaVersion');
  valid(world.prestigeLedgerVersion === prestigeLedgerVersion, 'prestigeLedgerVersion');
  integer(world.wallAnchorMs, 'wallAnchorMs');
  integer(world.clockMs, 'clockMs');
  integer(world.revision, 'revision');
  integer(world.completedRuns, 'completedRuns');
  const elapsed = world.basicResearchElapsedMs ?? 0;
  const weighted = BigInt(world.basicResearchWeightedMs ?? 0);
  valid(integer(elapsed, 'basicResearchElapsedMs') < researchHourMs, 'basicResearchElapsedMs');
  valid(weighted >= 100n * BigInt(elapsed) &&
    weighted < 300n * BigInt(elapsed) + BigInt(researchHourMs), 'basicResearchWeightedMs');
  valid(Array.isArray(world.unlocked), 'unlocked');
  const unlocked = new Set(world.unlocked);
  valid(unlocked.size === world.unlocked.length && world.unlocked.every((id) => typeof id === 'string' &&
    Object.hasOwn(catalog.items, id)) && catalog.initial.every((id) => unlocked.has(id)), 'unlocked');
  quantityMap(world.quality, 'quality', (value, field) => decimal(value, field, 1n));
  for (const [key, level] of Object.entries(object(world.tech, 'tech'))) {
    valid(Object.hasOwn(techMaxLevels, key) && integer(level, `tech.${key}`) <= techMaxLevels[key], `tech.${key}`);
  }
  if (world.market) valid(world.market.used <= (world.tech.marketManipulation ?? 0), 'market.used');
  const settings = object(world.settings, 'settings');
  if (Object.hasOwn(settings, 'pickerIconsOnly')) {
    valid(typeof settings.pickerIconsOnly === 'boolean', 'settings.pickerIconsOnly');
  }
  for (const key of ['music', 'sound']) {
    valid(Number.isFinite(settings[key]) && settings[key] >= 0, `settings.${key}`);
  }
  validateFacilityLists(world, 'facilities', facilityKinds);
  validateFacilityLists(world, 'stations', stationKinds);
}

function encodeWorld(world) {
  validateWorld(world);
  return amounts(world, decimalText, signedDecimalText);
}

function readRecord(record, slot) {
  if (record && typeof record === 'object' && !Array.isArray(record) &&
    record.schemaVersion !== worldSchemaVersion) {
    throw new WorldSaveError('unsupported-version');
  }
  try {
    object(record, slot);
    const world = amounts(record, decimal, signedDecimal);
    validateWorld(world);
    return world;
  } catch (error) {
    const failure = new WorldSaveError(`corrupt-${slot}`, error);
    failure.revision = recordRevision(record);
    throw failure;
  }
}

function quantityChanges(before, after) {
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Object.fromEntries([...ids].map((id) => [id, (after[id] ?? 0n) - (before[id] ?? 0n)])
    .filter(([, change]) => change !== 0n));
}

function addChanges(previous, changes) {
  const totals = { ...previous };
  for (const [id, amount] of Object.entries(changes)) {
    const next = (totals[id] ?? 0n) + amount;
    if (next === 0n) delete totals[id];
    else totals[id] = next;
  }
  return totals;
}

export function settleOfflineWorld(before, draft, now) {
  const elapsedMs = updateWorldWallTime(draft, now);
  if (elapsedMs < 15000) return;
  const produced = quantityChanges(before.stats.produced, draft.stats.produced);
  const inventoryDelta = quantityChanges(before.inventory, draft.inventory);
  if (!Object.keys(produced).length && !Object.keys(inventoryDelta).length) return;
  const pending = before.pendingOffline;
  draft.pendingOffline = {
    id: draft.revision + 1,
    elapsedMs: Math.min(Number.MAX_SAFE_INTEGER, (pending?.elapsedMs ?? 0) + elapsedMs),
    produced: addChanges(pending?.produced, produced),
    inventoryDelta: addChanges(pending?.inventoryDelta, inventoryDelta),
  };
}

export function acknowledgeOffline(world, id) {
  if (world.pendingOffline?.id !== id) return false;
  delete world.pendingOffline;
  return true;
}
