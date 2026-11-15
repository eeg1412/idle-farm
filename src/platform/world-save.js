import catalog from '../content/game-data.json' with { type: 'json' };
import { newWorld, updateWorldWallTime } from '../game/world.js';
import { catalog as legacyCatalog, workshopDurationMs } from '../game/state.js';
import { decode as decodeLegacy } from './save.js';

// Preserve the original database name so existing saves remain available after the rename.
const databaseName = 'tianjian-workshop';
const storeName = 'records';
const decimalPattern = /^(0|[1-9]\d*)$/;
const signedDecimalPattern = /^(0|-?[1-9]\d*)$/;
const facilityKinds = ['C', 'L', 'F'];
const stationKinds = ['I', 'P'];
const limits = { C: 40, L: 40, F: 40, I: 48, P: 32 };
const legacyStats = { wheat: 'C01', flour: 'I01', bread: 'P01' };

export class WorldSaveError extends Error {
  constructor(code, cause) {
    super(code, { cause });
    this.name = 'WorldSaveError';
    this.code = code;
  }
}

export function openWorldSave() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
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

export async function writeWorldSave(db, world, { replaceCorrupt = false, corruptRevision } = {}) {
  integer(world.revision, 'revision');
  return transact(db, (store, current, previous) => {
    let saved;
    if (current !== undefined) {
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
    if (saved) store.put(current, 'previous');
    store.put(next, 'current');
    return revision;
  });
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

function recordStats(value, completedRuns, convert) {
  const stats = object(value, 'stats');
  const recordedRevenue = convert(stats.revenue, 'stats.revenue');
  const legacyRevenue = !Object.hasOwn(stats, 'lifetimeRevenue');
  // Older records combine revenue from every run, so the current run cannot be reconstructed after a farm sale.
  return {
    ...stats,
    produced: quantityMap(stats.produced, 'stats.produced', convert),
    sold: convert(stats.sold, 'stats.sold'),
    plots: convert(stats.plots, 'stats.plots'),
    revenue: legacyRevenue && completedRuns > 0 ? convert('0', 'stats.revenue') : recordedRevenue,
    lifetimeRevenue: legacyRevenue ? recordedRevenue : convert(stats.lifetimeRevenue, 'stats.lifetimeRevenue'),
    boughtL: convert(stats.boughtL, 'stats.boughtL'),
    boughtF: convert(stats.boughtF, 'stats.boughtF'),
  };
}

function stationBatches(stations, convert) {
  object(stations, 'stations');
  return Object.fromEntries(stationKinds.map((kind) => {
    valid(Array.isArray(stations[kind]), `stations.${kind}`);
    return [kind, stations[kind].map((slot) => {
      if (slot.batch === null) return slot;
      const batch = object(slot.batch, `${kind}.batch`);
      const inputs = Object.hasOwn(batch, 'inputs') ? batch.inputs : null;
      return { ...slot, batch: { ...batch, inputs: inputs === null ? null :
        quantityMap(inputs, `${kind}.batch.inputs`, (value, field) => convert(value, field, 1n)) } };
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

function amounts(world, convert, convertSigned) {
  const pendingOffline = Object.hasOwn(world, 'pendingOffline') && offlineAmounts(world.pendingOffline, convert, convertSigned);
  if (pendingOffline) valid(pendingOffline.id <= world.revision, 'pendingOffline.id');
  return {
    ...world,
    settings: { pickerIconsOnly: false, ...world.settings },
    coins: convert(world.coins, 'coins'),
    productionValue: convert(world.productionValue, 'productionValue'),
    researchPoints: convert(world.researchPoints, 'researchPoints'),
    inventory: quantityMap(world.inventory, 'inventory', convert),
    reserves: quantityMap(world.reserves, 'reserves', convert),
    stats: recordStats(world.stats, world.completedRuns, convert),
    stations: stationBatches(world.stations, convert),
    ...(pendingOffline && { pendingOffline }),
  };
}

function validateRuns(world) {
  const anchor = integer(world.wallAnchorMs, 'wallAnchorMs');
  integer(world.clockMs, 'clockMs');
  integer(world.revision, 'revision');
  integer(world.completedRuns, 'completedRuns');
  if (world.firstCompletedRunAtMs !== null) {
    valid(integer(world.firstCompletedRunAtMs, 'firstCompletedRunAtMs') <= anchor, 'firstCompletedRunAtMs');
  }
}

function validateRecipe(id, kind, field) {
  valid(typeof id === 'string' && Object.hasOwn(catalog.items, id) && catalog.items[id].kind.startsWith(kind), field);
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
      if (key === 'facilities') decimal(slot.level, `${field}.level`, 1n);
      if (key === 'stations') {
        valid(typeof slot.priority === 'boolean', `${field}.priority`);
        if (slot.order !== undefined) integer(slot.order, `${field}.order`);
      }
      if (slot.batch === null) continue;
      const batch = object(slot.batch, `${field}.batch`);
      validateRecipe(batch.id, kind, `${field}.batch.id`);
      decimal(batch.amount, `${field}.batch.amount`, 1n);
      const start = integer(batch.start, `${field}.batch.start`);
      const end = integer(batch.end, `${field}.batch.end`);
      valid(start <= world.clockMs && world.clockMs < end, `${field}.batch`);
    }
  }
}

function validateWorld(world) {
  valid(world.schemaVersion === 2, 'schemaVersion');
  validateRuns(world);
  valid(Array.isArray(world.unlocked) && new Set(world.unlocked).size === world.unlocked.length &&
    world.unlocked.every((id) => Object.hasOwn(catalog.items, id)) &&
    catalog.initial.every((id) => world.unlocked.includes(id)), 'unlocked');
  quantityMap(world.quality, 'quality', (value, field) => decimal(value, field, 1n));
  for (const [key, level] of Object.entries(object(world.tech, 'tech'))) {
    valid(integer(level, `tech.${key}`) <= 5, `tech.${key}`);
  }
  valid(typeof world.guideSkipped === 'boolean', 'guideSkipped');
  const settings = object(world.settings, 'settings');
  valid(typeof settings.reducedMotion === 'boolean', 'settings.reducedMotion');
  if (Object.hasOwn(settings, 'pickerIconsOnly')) {
    valid(typeof settings.pickerIconsOnly === 'boolean', 'settings.pickerIconsOnly');
  }
  for (const key of ['textScale', 'music', 'sound']) {
    valid(Number.isFinite(settings[key]) && settings[key] >= 0, `settings.${key}`);
  }
  validateFacilityLists(world, 'facilities', facilityKinds);
  validateFacilityLists(world, 'stations', stationKinds);
}

function encodeWorld(world) {
  validateWorld(world);
  return amounts(world, decimalText, signedDecimalText);
}

function migrateLegacy(record) {
  const old = decodeLegacy(record);
  const world = newWorld(old.wallAnchorMs);
  const clock = integer(old.clockMs, 'clockMs');
  const cropDuration = legacyCatalog.items.C01.durationMs;
  const plots = old.plots.map((end) => ({
    level: '1',
    recipe: 'C01',
    batch: { id: 'C01', amount: catalog.items.C01.output, start: Math.max(0, end - cropDuration), end },
  }));
  const stations = {};
  for (const [index, kind] of stationKinds.entries()) {
    const station = old.stations[kind];
    if (!station) {
      stations[kind] = world.stations[kind];
      continue;
    }
    const batchId = station.output ?? station.recipe;
    const duration = batchId && workshopDurationMs(legacyCatalog.items[batchId]?.durationMs, old.workshopSpeedLevel);
    stations[kind] = [{
      recipe: station.recipe ?? null,
      priority: false,
      order: index,
      batch: station.ends == null ? null : {
        id: batchId,
        amount: decimalText(station.outputQuantity ?? legacyCatalog.items[batchId]?.output, `${kind}.batch.amount`, 1n),
        inputs: quantityMap(legacyCatalog.items[batchId]?.inputs ?? {}, `${kind}.batch.inputs`,
          (value, field) => decimal(String(value), field, 1n)),
        start: Math.max(0, Math.min(clock, station.ends - duration)),
        end: station.ends,
      },
    }];
  }
  const produced = Object.fromEntries(Object.entries(legacyStats).map(([stat, id]) => [id, old.stats[stat]]));
  if (old.everMadeIslandMilleCrepe) produced.P150 = 1n;
  return {
    ...world,
    revision: old.revision,
    clockMs: clock,
    coins: old.coins,
    inventory: old.inventory,
    reserves: old.reserves,
    unlocked: [...new Set([...catalog.initial, ...old.unlocked])],
    quality: Object.fromEntries(Object.entries(old.quality ?? {}).map(([id, level]) => [id, String(level)])),
    productionValue: old.productionValue,
    researchPoints: old.researchPoints,
    tech: {
      ...world.tech,
      appraisal: old.appraisalLevel,
      delegation: old.delegationLevel ?? 0,
      workshopSpeed: old.workshopSpeedLevel ?? 0,
    },
    completedRuns: old.completedRuns ?? 0,
    firstCompletedRunAtMs: old.firstCompletedRunAtMs ?? (old.completedRuns ? old.wallAnchorMs : null),
    facilities: { ...world.facilities, C: plots },
    stations,
    stats: { ...world.stats, produced, sold: old.stats.sold, plots: BigInt(old.stats.plots),
      revenue: old.completedRuns > 0 ? 0n : old.stats.revenue, lifetimeRevenue: old.stats.revenue },
    guideSkipped: old.guideSkipped ?? false,
  };
}

function readRecord(record, slot) {
  if (Number.isSafeInteger(record?.schemaVersion) && record.schemaVersion > 2) {
    throw new WorldSaveError('unsupported-version');
  }
  try {
    object(record, slot);
    const world = record.schemaVersion === 1 ? migrateLegacy(record) : amounts(record, decimal, signedDecimal);
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
