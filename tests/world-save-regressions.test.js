import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import { upgradeTech } from '../src/game/advancement.js';
import { localCalendarDay, synchronizeMarket } from '../src/game/market.js';
import {
  advanceWorld, arrangeStation, assignFacility, buyFacility, buyStation, catalog, clearStation,
  farmSaleOffer, newWorld, productionDurationMs, reserve, sell, sellFarm, tradeOffer, upgradeFacility, upgradeStation,
} from '../src/game/world.js';
import { grantDevelopmentTools } from '../src/game/development-tools.js';
import { objectives, settleTaskRewards } from '../src/game/objectives.js';
import { integerSquareRoot } from '../src/game/prestige-ledger.js';
import { createSaveQueue } from '../src/platform/save-queue.js';
import { createSaveTransfer, saveFormatMessage } from '../src/platform/save-transfer.js';
import {
  acknowledgeOffline, decodeWorldRecord, openWorldSave, readWorldSave,
  replaceWorldSave, restoreWorldSave, settleOfflineWorld, writeWorldSave,
} from '../src/platform/world-save.js';

const coinScale = BigInt(economyScale.coinScale);

async function freshDatabase(t) {
  globalThis.indexedDB = new IDBFactory();
  const db = await openWorldSave();
  t.after(() => db.close());
  return db;
}

test('saved market rates survive reload and same-day import independently of the premium level', async (t) => {
  const db = await freshDatabase(t);
  const wall = new Date(2026, 10, 17, 12).getTime();
  const world = newWorld(wall, '0123456789abcdef0123456789abcdef');
  world.productionValue = 100_000n;
  world.tech.marketPromotion = 10;
  world.tech.premiumSales = 10;
  const day = localCalendarDay(wall);
  world.market = { day, sequence: 0, used: 0, rates: { C01: 200 } };
  world.revision = await writeWorldSave(db, world);
  const loaded = await readWorldSave(db);
  assert.deepEqual(loaded.market, world.market);
  assert.deepEqual(loaded.tech, world.tech);

  const transfer = createSaveTransfer({ browser: {} });
  const packet = transfer.exportWorld(loaded);
  const restored = transfer.resolveCandidate(transfer.inspectSave(packet.text));
  synchronizeMarket(restored, day);
  const replaced = await replaceWorldSave(db, restored, loaded.revision);
  assert.deepEqual(replaced.market, world.market);
  assert.deepEqual((await readWorldSave(db)).market, world.market);

  const retained = JSON.parse(packet.text);
  retained.record.market.rates.C01 = 11;
  assert.equal(transfer.inspectSave(JSON.stringify(retained)).world.market.rates.C01, 11);
  for (const invalidRate of [-100, -23, 23, 201]) {
    retained.record.market.rates.C01 = invalidRate;
    assert.throws(() => transfer.inspectSave(JSON.stringify(retained)), { code: 'import-corrupt-record' });
  }
  retained.record.market.rates.C01 = 11;
  for (const key of ['marketPromotion', 'premiumSales']) {
    retained.record.tech[key] = 11;
    assert.throws(() => transfer.inspectSave(JSON.stringify(retained)), { code: 'import-corrupt-record' });
    retained.record.tech[key] = 10;
  }
});

function openOldDatabase(t, name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      t.after(() => request.result.close());
      resolve(request.result);
    };
  });
}

function rawRecord(db, slot, update) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', update ? 'readwrite' : 'readonly');
    const store = tx.objectStore('records');
    const get = store.get(slot);
    let record;
    get.onsuccess = () => {
      record = get.result;
      if (update) store.put(update(record), slot);
    };
    tx.oncomplete = () => resolve(record);
    tx.onabort = () => reject(tx.error);
  });
}

test('v7 startup, saves and clearing touch only the chosen environment database', async (t) => {
  globalThis.indexedDB = new IDBFactory();
  const oldRelease = await openOldDatabase(t, 'tianjian-workshop');
  const oldDevelopment = await openOldDatabase(t, 'idle-farm-development');
  const oldCurrent = { revision: 2, marker: 'current' };
  const oldPrevious = { revision: 1, marker: 'previous' };
  for (const db of [oldRelease, oldDevelopment]) {
    await rawRecord(db, 'current', () => oldCurrent);
    await rawRecord(db, 'previous', () => oldPrevious);
  }
  const releaseDatabase = await openWorldSave();
  t.after(() => releaseDatabase.close());
  assert.equal(releaseDatabase.name, 'idle-farm-v7');
  assert.equal(await readWorldSave(releaseDatabase), null);
  const releaseWorld = newWorld(0);
  releaseWorld.coins = 137n;
  releaseWorld.tech.appraisal = 2;
  releaseWorld.quality.C01 = '3';
  releaseWorld.revision = await writeWorldSave(releaseDatabase, releaseWorld);
  const releaseRecord = await rawRecord(releaseDatabase, 'current');

  const developmentDatabase = await openWorldSave({ development: true });
  t.after(() => developmentDatabase.close());
  assert.equal(developmentDatabase.name, 'idle-farm-v7-development');
  assert.equal(await readWorldSave(developmentDatabase), null);
  const developmentWorld = newWorld(0);
  assert.equal(grantDevelopmentTools(developmentWorld), true);
  developmentWorld.revision = await writeWorldSave(developmentDatabase, developmentWorld);
  assert.equal((await rawRecord(developmentDatabase, 'current')).coins, String(1_000_000_000_000n + 600n * coinScale));
  assert.deepEqual(await readWorldSave(developmentDatabase), developmentWorld);
  assert.deepEqual(await rawRecord(releaseDatabase, 'current'), releaseRecord);
  assert.deepEqual(await readWorldSave(releaseDatabase), releaseWorld);

  const reopenedRelease = await openWorldSave();
  const reopenedDevelopment = await openWorldSave({ development: true });
  t.after(() => reopenedRelease.close());
  t.after(() => reopenedDevelopment.close());
  assert.deepEqual(await readWorldSave(reopenedRelease), releaseWorld);
  assert.deepEqual(await readWorldSave(reopenedDevelopment), developmentWorld);

  developmentWorld.revision = await writeWorldSave(reopenedDevelopment, developmentWorld);
  assert.equal((await readWorldSave(reopenedDevelopment, 'previous')).revision, 1);
  await replaceWorldSave(reopenedDevelopment, newWorld(0), developmentWorld.revision, { clearBackup: true });
  assert.equal(await readWorldSave(reopenedDevelopment, 'previous'), null);
  assert.deepEqual(await rawRecord(reopenedRelease, 'current'), releaseRecord);
  for (const db of [oldRelease, oldDevelopment]) {
    assert.deepEqual(await rawRecord(db, 'current'), oldCurrent);
    assert.deepEqual(await rawRecord(db, 'previous'), oldPrevious);
  }
});

test('two farm sales and reloading preserve tutorial receipts and lifetime progress', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.stats.produced.C01 = 9n;
  assert.equal(objectives(world).active, true);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(objectives(world).guide[0].current, 9n);
  Object.assign(world.stats.produced, { I01: 1n, P01: 1n });
  Object.assign(world.stats, { sold: 9n, revenue: 1200n, lifetimeRevenue: 1200n });
  world.coins = 100_000n * coinScale;
  world.unlocked = [...new Set([...world.unlocked, ...Object.keys(catalog.items).slice(0, 20), 'C02', 'P01', 'P02', 'P03'])];
  assert.ok(buyFacility(world, 'C'));
  assert.ok(assignFacility(world, 'C', 0, 'C02'));
  assert.ok(upgradeFacility(world, 'C', 0, 9n));
  assert.ok(reserve(world, 'C01', 1n));
  assert.ok(buyStation(world, 'I'));
  assert.ok(buyStation(world, 'P'));
  assert.ok(upgradeStation(world, 'I', 0, 1n));
  assert.equal(objectives(world).active, false);
  settleTaskRewards(world);
  const receipts = [...world.taskRewards];
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  await writeWorldSave(db, world);
  const stored = await readWorldSave(db);
  const resumed = objectives(stored);
  assert.equal(stored.completedRuns, 2);
  assert.deepEqual(stored.taskRewards, receipts);
  assert.ok(resumed.guide.filter((goal) => !goal.branch).every((goal) => goal.rewarded));
  assert.ok(resumed.guide.find(({ id }) => id === 'firstBread').done);
  assert.equal(resumed.long.find(({ id }) => id === 'farmIncome').current, 1200n);
  // 农地扩建 counts extra fields currently owned; a farm sale resets the farm to its two free fields.
  assert.equal(resumed.long.find(({ id }) => id === 'moreFields').current, 0n);
});

test('missing display preference defaults and the saved choice survives farm sale and reload', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.revision = await writeWorldSave(db, world);
  await rawRecord(db, 'current', (entry) => {
    delete entry.settings.pickerIconsOnly;
    return entry;
  });
  const restored = await readWorldSave(db);
  assert.equal(restored.settings.pickerIconsOnly, false);
  restored.settings.pickerIconsOnly = true;
  assert.ok(sellFarm(restored, farmSaleOffer(restored)));
  await writeWorldSave(db, restored);
  assert.equal((await readWorldSave(db)).settings.pickerIconsOnly, true);
});

test('automatic save receives its clock defaults after an action resolves or rejects', async () => {
  const queue = createSaveQueue();
  const save = (anchor = 5000, wall = 15000) => [anchor, wall];
  const action = queue.enqueue(() => ({ ok: true }));
  const autoSave = queue.enqueue(save);
  assert.equal(queue.pending, true);
  assert.deepEqual(await action, { ok: true });
  assert.deepEqual(await autoSave, [5000, 15000]);
  assert.equal(queue.pending, false);
  await assert.rejects(queue.enqueue(() => { throw new Error('action failed'); }), /action failed/);
  assert.deepEqual(await queue.enqueue(save), [5000, 15000]);
});

test('offline report persists signed net inventory change, replays once and supports guarded dismissal', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.inventory.C01 = 20n;
  assert.equal(arrangeStation(world, 'I', 0, 'I01'), true);
  const batchAmount = BigInt(world.stations.I[0].batch.amount);
  const elapsedMs = 2 * productionDurationMs(world, 'I01');
  world.revision = await writeWorldSave(db, world);

  const draft = structuredClone(world);
  settleOfflineWorld(world, draft, elapsedMs);
  assert.deepEqual(draft.pendingOffline, {
    id: 2, elapsedMs, produced: { I01: 2n * batchAmount }, inventoryDelta: { C01: -4n, I01: 2n * batchAmount },
  });
  draft.revision = await writeWorldSave(db, draft);
  const next = structuredClone(draft);
  settleOfflineWorld(draft, next, 2 * elapsedMs);
  assert.deepEqual(next.pendingOffline, {
    id: 3, elapsedMs: 2 * elapsedMs, produced: { I01: 4n * batchAmount },
    inventoryDelta: { C01: -8n, I01: 4n * batchAmount },
  });
  assert.equal(acknowledgeOffline(next, draft.pendingOffline.id), false);
  next.revision = await writeWorldSave(db, next);
  const raw = await rawRecord(db, 'current');
  assert.equal(raw.pendingOffline.inventoryDelta.C01, '-8');
  assert.equal(raw.pendingOffline.produced.I01, String(4n * batchAmount));

  const reopened = await openWorldSave();
  t.after(() => reopened.close());
  const loaded = await readWorldSave(reopened);
  const replay = structuredClone(loaded);
  settleOfflineWorld(loaded, replay, 2 * elapsedMs);
  assert.deepEqual(replay, loaded);
  replay.revision = await writeWorldSave(reopened, replay);
  assert.deepEqual((await readWorldSave(reopened)).pendingOffline, next.pendingOffline);

  assert.equal(acknowledgeOffline(replay, replay.pendingOffline.id), true);
  replay.revision = await writeWorldSave(reopened, replay);
  const dismissed = await readWorldSave(reopened);
  assert.equal(dismissed.pendingOffline, undefined);
  assert.deepEqual(dismissed.inventory, next.inventory);
  assert.deepEqual(dismissed.stats, next.stats);
});

test('v7 encodes paid inputs and preserves exact run and lifetime accounting', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.coins = 10n ** 120n + 1n;
  world.inventory.C01 = 2n;
  world.stats.revenue = 42n;
  world.stats.lifetimeRevenue = 100000n;
  assert.equal(arrangeStation(world, 'I', 0, 'I01'), true);
  world.revision = await writeWorldSave(db, world);
  assert.deepEqual(await readWorldSave(db), world);
  const raw = await rawRecord(db, 'current');
  assert.deepEqual(raw.stations.I[0].batch.inputs, { C01: '2' });
  assert.equal(raw.stats.revenue, '42');
  assert.equal(raw.stats.lifetimeRevenue, '100000');

  const incomplete = structuredClone(raw);
  delete incomplete.stations.I[0].batch.inputs;
  assert.throws(() => decodeWorldRecord(incomplete), { code: 'corrupt-transfer' });
});

test('a schema mismatch cannot be loaded, restored or overwritten as corruption', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.revision = await writeWorldSave(db, world);
  world.revision = await writeWorldSave(db, world);
  const current = await rawRecord(db, 'current');
  const previous = await rawRecord(db, 'previous');
  const wrongSchema = { ...current, schemaVersion: 2 };
  await rawRecord(db, 'current', () => wrongSchema);
  await assert.rejects(readWorldSave(db), { code: 'unsupported-version' });
  await assert.rejects(restoreWorldSave(db), { code: 'unsupported-version' });
  await assert.rejects(writeWorldSave(db, newWorld(0), { replaceCorrupt: true }), { code: 'unsupported-version' });
  assert.deepEqual(await rawRecord(db, 'current'), wrongSchema);
  assert.deepEqual(await rawRecord(db, 'previous'), previous);

  const unsupportedBackup = { ...previous, schemaVersion: 4 };
  const corrupt = { ...current, coins: 'bad' };
  await rawRecord(db, 'current', () => corrupt);
  await rawRecord(db, 'previous', () => unsupportedBackup);
  await assert.rejects(readWorldSave(db, 'previous'), { code: 'unsupported-version' });
  await assert.rejects(restoreWorldSave(db), { code: 'unsupported-version' });
  await assert.rejects(writeWorldSave(db, newWorld(0), { replaceCorrupt: true }), { code: 'unsupported-version' });
  assert.deepEqual(await rawRecord(db, 'current'), corrupt);
  assert.deepEqual(await rawRecord(db, 'previous'), unsupportedBackup);
});

test('v7 transfer validates version and environment before confirmation and replaces only after revalidation', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.revision = await writeWorldSave(db, world);
  world.coins = 700n;
  world.revision = await writeWorldSave(db, world);
  const current = await rawRecord(db, 'current');
  const previous = await rawRecord(db, 'previous');
  const production = createSaveTransfer({ browser: {} });
  const development = createSaveTransfer({ development: true, browser: {} });
  const source = newWorld(0);
  source.coins = 420n;
  source.researchPoints = 129n;
  source.stats.sold = 1n;
  const { text } = production.exportWorld(source);
  const packet = JSON.parse(text);
  assert.equal(packet.formatVersion, 2);
  assert.equal(packet.schemaVersion, 3);
  assert.equal(Object.hasOwn(packet, 'saveEpoch'), false);
  assert.equal(Object.hasOwn(packet.record, 'saveEpoch'), false);
  for (const invalid of [
    { ...packet, formatVersion: 1 },
    { ...packet, schemaVersion: 4 },
    { ...packet, record: { ...packet.record, schemaVersion: undefined } },
  ]) {
    assert.throws(() => production.inspectSave(JSON.stringify(invalid)),
      { code: 'import-version-mismatch', message: saveFormatMessage });
  }
  assert.throws(() => development.inspectSave(text), { code: 'import-environment-mismatch' });
  assert.throws(() => production.inspectSave(development.exportWorld(source).text), { code: 'import-environment-mismatch' });
  const candidate = production.inspectSave(text);
  assert.equal(candidate.summary.coins, 420n);
  assert.throws(() => production.resolveCandidate({ ...candidate }), /重新读取/);
  candidate.world.coins = 99n;
  candidate.world.taskRewards.push('firstSale');
  const draft = production.resolveCandidate(candidate);
  assert.deepEqual(draft, source);
  assert.deepEqual(await rawRecord(db, 'current'), current);
  assert.deepEqual(await rawRecord(db, 'previous'), previous);
  await assert.rejects(replaceWorldSave(db, { ...draft, quality: { C01: '-1' } }, world.revision), /quality/);
  assert.deepEqual(await rawRecord(db, 'current'), current);
  assert.deepEqual(await rawRecord(db, 'previous'), previous);
  const replacement = await replaceWorldSave(db, draft, world.revision);
  assert.deepEqual(replacement, { ...source, revision: world.revision + 1 });
  assert.deepEqual(await readWorldSave(db), replacement);
  assert.deepEqual(await rawRecord(db, 'previous'), current);
});

test('published v7 records and exchanges preserve progress when unused fields are present', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.inventory.C01 = 2n;
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  // This batch had already started with the retired item yield improvement.
  Object.assign(world.facilities.C[0].batch, { yieldBase: '3', amount: '3' });
  world.completedRuns = 2;
  world.researchPoints = 15n;
  world.settings.pickerIconsOnly = true;
  world.revision = await writeWorldSave(db, world);
  const transfer = createSaveTransfer({ browser: {} });
  const packet = JSON.parse(transfer.exportWorld(world).text);
  const priorShape = {
    ...packet.record, saveEpoch: 'v7', firstCompletedRunAtMs: 0, guideSkipped: false,
    itemYield: { C01: '1' },
    stats: { ...packet.record.stats, batchSales: '7' },
    settings: { ...packet.record.settings, textScale: 1, reducedMotion: true },
  };
  await rawRecord(db, 'current', () => priorShape);
  const reopened = await openWorldSave();
  t.after(() => reopened.close());
  const loaded = await readWorldSave(reopened);
  assert.deepEqual(loaded, world);
  const candidate = transfer.inspectSave(JSON.stringify({ ...packet, saveEpoch: 'v7', record: priorShape }));
  assert.deepEqual(transfer.resolveCandidate(candidate), world);
  const continued = structuredClone(loaded);
  advanceWorld(continued, 12_000);
  assert.equal(continued.inventory.C01, 3n);
  assert.equal(continued.facilities.C[0].batch.amount, '2');

  loaded.revision = await writeWorldSave(reopened, loaded);
  const current = await rawRecord(reopened, 'current');
  assert.deepEqual(current, { ...packet.record, revision: loaded.revision });
  assert.deepEqual(await rawRecord(reopened, 'previous'), packet.record);

  await rawRecord(reopened, 'current', () => ({ ...current, coins: 'invalid' }));
  await rawRecord(reopened, 'previous', () => priorShape);
  const restored = await restoreWorldSave(reopened, { corruptRevision: loaded.revision, backupRevision: world.revision });
  assert.deepEqual(restored, { ...world, revision: loaded.revision + 1 });
  assert.deepEqual(await rawRecord(reopened, 'current'), { ...packet.record, revision: restored.revision });
});

test('crop technology and catalog changes preserve the persisted open-batch snapshot', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.coins = 10_000n * coinScale;
  world.researchPoints = 10000n;
  world.tech.cropYield = 25;
  assert.equal(assignFacility(world, 'C', 0, 'C01'), true);
  const crop = world.facilities.C[0];
  const batch = structuredClone(crop.batch);
  const planting = structuredClone(crop.planting);
  assert.equal(batch.yieldBase, '2');
  assert.equal(batch.facilityYieldBasis, 15000);
  assert.equal(upgradeTech(world, 'cropYield'), true);
  assert.deepEqual(crop.batch, batch);
  assert.equal(upgradeFacility(world, 'C', 0, 1n), true);
  assert.deepEqual(crop.batch, { ...batch, amount: '6' });
  world.revision = await writeWorldSave(db, world);
  const raw = await rawRecord(db, 'current');
  assert.deepEqual(raw.facilities.C[0].planting, planting);
  assert.deepEqual(raw.facilities.C[0].batch, { ...batch, amount: '6' });
  for (const [key, value] of [['yieldBase', '0'], ['yieldBase', 2], ['facilityYieldBasis', 15100],
    ['facilityYieldBasis', 20200], ['facilityYieldBasis', '15000'], ['amount', '7']]) {
    const corrupt = structuredClone(raw);
    corrupt.facilities.C[0].batch[key] = value;
    assert.throws(() => decodeWorldRecord(corrupt), { code: 'corrupt-transfer' });
  }
  for (const quality of [{ unknown: '1' }, { C01: 1 }, { C01: '-1' }, { C01: '0' }, { C01: '01' }]) {
    assert.throws(() => decodeWorldRecord({ ...raw, quality }), { code: 'corrupt-transfer' });
  }
  assert.throws(() => decodeWorldRecord({ ...raw, tech: { qualityDiscount: 1 } }), { code: 'corrupt-transfer' });
  const item = catalog.items.C01;
  const oldOutput = item.output;
  t.after(() => { item.output = oldOutput; });
  item.output = '4';
  const reopened = await openWorldSave();
  t.after(() => reopened.close());
  const loaded = await readWorldSave(reopened);
  const loadedCrop = loaded.facilities.C[0];
  assert.deepEqual(loadedCrop.batch, { ...batch, amount: '6' });
  assert.equal(upgradeFacility(loaded, 'C', 0, 1n), true);
  assert.deepEqual(loadedCrop.batch, { ...batch, amount: '9' });
  assert.deepEqual(loadedCrop.planting, planting);
  advanceWorld(loaded, batch.end);
  assert.equal(loaded.inventory.C01, 9n);
  assert.equal(loadedCrop.batch.yieldBase, '4');
  assert.equal(loadedCrop.batch.facilityYieldBasis, 15200);
  assert.equal(loadedCrop.batch.amount, '18');
  assert.deepEqual(loadedCrop.planting, planting);
  assert.ok(sellFarm(loaded, farmSaleOffer(loaded)));
  assert.equal(loaded.tech.cropYield, 26);
  assert.equal(loaded.facilities.C[0].batch.amount, '6');
});

test('a catalog update preserves paid inputs and timing while valuing completion and sales at current prices', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(2_000);
  world.clockMs = 2_000;
  world.coins = 400n;
  world.inventory = { C01: 6n, I01: 3n };
  world.quality.I01 = '2';
  world.stats.produced.I01 = 3n;
  world.taskRewards = ['firstFlour'];
  world.productionValue = 500n;
  world.lifetimeProductionValue = 1_234n;
  world.prestigeCredit = 2_000_000n;
  world.researchPoints = 9n;

  // This level-two batch was already running when the station was upgraded to level three.
  const batch = { id: 'I01', start: 1_000, end: 10_000, amount: '2', inputs: { C01: 4n } };
  Object.assign(world.stations.I[0], { recipe: 'I01', level: '3', batch });
  const staleOffer = tradeOffer(world, 'I01', 100);
  world.revision = await writeWorldSave(db, world);
  const transfer = createSaveTransfer({ browser: {} });
  const packet = JSON.parse(transfer.exportWorld(world).text);
  const item = catalog.items.I01;
  const oldItem = { ...item };
  t.after(() => Object.assign(item, oldItem));
  Object.assign(item, { price: '101', output: '5', inputs: { C01: '1' }, durationMs: 22000 });

  const reopened = await openWorldSave();
  t.after(() => reopened.close());
  const loaded = await readWorldSave(reopened);
  assert.deepEqual(loaded, world);
  const pointCost = integerSquareRoot(1_000_000n ** 2n * coinScale);
  assert.equal(farmSaleOffer(loaded).reward, 2_000_000n / pointCost);
  packet.gameVersion = '1.13';
  packet.balanceVersion = 'LT-2026-11-v7';
  const candidate = transfer.inspectSave(JSON.stringify(packet));
  assert.equal(candidate.version, '1.13');
  assert.equal(candidate.balanceVersion, 'LT-2026-11-v7');
  assert.deepEqual(transfer.resolveCandidate(candidate), loaded);
  const cancelled = structuredClone(loaded);
  assert.equal(clearStation(cancelled, 'I', 0), true);
  assert.equal(cancelled.inventory.C01, 10n);
  const currentPrice = 111n;
  assert.equal(sell(loaded, 'I01', 100, staleOffer), false);
  assert.deepEqual(loaded, world);
  const currentOffer = tradeOffer(loaded, 'I01', 100);
  assert.equal(currentOffer.gain, 3n * currentPrice);
  const sold = structuredClone(loaded);
  assert.equal(sell(sold, 'I01', 100, currentOffer), true);
  assert.equal(sold.coins, 400n + 3n * currentPrice);
  assert.equal(sold.stats.lifetimeRevenue, 3n * currentPrice);

  advanceWorld(loaded, batch.end - 1);
  assert.deepEqual(loaded.stations.I[0].batch, batch);
  advanceWorld(loaded, batch.end);
  const newValue = 1_234n + 2n * currentPrice;
  assert.equal(loaded.inventory.I01, 5n);
  assert.equal(loaded.productionValue, 500n + 2n * currentPrice);
  assert.equal(loaded.lifetimeProductionValue, newValue);
  assert.equal(loaded.prestigeCredit,
    2_000_000n + (integerSquareRoot(49n * newValue) - integerSquareRoot(49n * 1_234n)) * 10_000n);
  assert.equal(loaded.researchPoints, world.researchPoints);
  assert.deepEqual(loaded.taskRewards, world.taskRewards);
  assert.deepEqual(loaded.stations.I[0].batch, {
    id: 'I01', start: 10_000, end: 32_000, amount: '15', inputs: { C01: 3n },
  });
});

test('stale recovery and replacement cannot overwrite a repaired record', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.revision = await writeWorldSave(db, world);
  world.coins = 80n;
  world.revision = await writeWorldSave(db, world);
  await rawRecord(db, 'current', (record) => ({ ...record, coins: 'invalid' }));
  await assert.rejects(readWorldSave(db), { code: 'corrupt-current', revision: 2 });
  const options = { corruptRevision: 2, backupRevision: 1 };

  const second = await openWorldSave();
  t.after(() => second.close());
  const [first, stale] = await Promise.allSettled([restoreWorldSave(db, options), restoreWorldSave(second, options)]);
  assert.equal(first.status, 'fulfilled');
  assert.equal(first.value.revision, 3);
  assert.equal(first.value.coins, 600n * coinScale);
  assert.equal(stale.status, 'rejected');
  assert.equal(stale.reason.code, 'revision-conflict');
  await assert.rejects(writeWorldSave(second, newWorld(0), { replaceCorrupt: true, corruptRevision: 2 }),
    { code: 'revision-conflict' });
  assert.deepEqual(await readWorldSave(second), first.value);
  assert.equal((await readWorldSave(second, 'previous')).revision, 1);
});
