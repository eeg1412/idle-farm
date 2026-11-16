import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { arrange as arrangeLegacy, newState } from '../src/game/state.js';
import { arrangeStation, farmSaleOffer, newWorld, sellFarm } from '../src/game/world.js';
import { grantDevelopmentTools } from '../src/game/development-tools.js';
import { objectives } from '../src/game/objectives.js';
import { encode as encodeLegacy } from '../src/platform/save.js';
import { createSaveQueue } from '../src/platform/save-queue.js';
import {
  acknowledgeOffline, openWorldSave, readWorldSave, restoreWorldSave, settleOfflineWorld, writeWorldSave,
} from '../src/platform/world-save.js';

async function freshDatabase(t) {
  globalThis.indexedDB = new IDBFactory();
  const db = await openWorldSave();
  t.after(() => db.close());
  return db;
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

test('development grants persist in their own database without changing the release save', async (t) => {
  const releaseDatabase = await freshDatabase(t);
  const releaseWorld = newWorld(0);
  releaseWorld.coins = 137n;
  releaseWorld.tech.appraisal = 2;
  releaseWorld.quality.C01 = '3';
  releaseWorld.revision = await writeWorldSave(releaseDatabase, releaseWorld);
  const releaseRecord = await rawRecord(releaseDatabase, 'current');

  const developmentDatabase = await openWorldSave('idle-farm-development');
  t.after(() => developmentDatabase.close());
  assert.equal(releaseDatabase.name, 'tianjian-workshop');
  assert.equal(developmentDatabase.name, 'idle-farm-development');
  assert.equal(await readWorldSave(developmentDatabase), null);
  const developmentWorld = newWorld(0);
  assert.equal(grantDevelopmentTools(developmentWorld), true);
  developmentWorld.revision = await writeWorldSave(developmentDatabase, developmentWorld);
  assert.equal((await rawRecord(developmentDatabase, 'current')).coins, '1000000000600');
  assert.deepEqual(await readWorldSave(developmentDatabase), developmentWorld);
  assert.deepEqual(await rawRecord(releaseDatabase, 'current'), releaseRecord);
  assert.deepEqual(await readWorldSave(releaseDatabase), releaseWorld);

  const reopenedRelease = await openWorldSave();
  const reopenedDevelopment = await openWorldSave('idle-farm-development');
  t.after(() => reopenedRelease.close());
  t.after(() => reopenedDevelopment.close());
  assert.deepEqual(await readWorldSave(reopenedRelease), releaseWorld);
  assert.deepEqual(await readWorldSave(reopenedDevelopment), developmentWorld);
});

test('two farm sales and reloading preserve tutorial completion and lifetime goals', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.guideSkipped = true; // An older save may still carry this marker.
  world.stats.produced.C01 = 9n;
  assert.equal(objectives(world).active, true);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(objectives(world).guide[0].current, 9n);
  Object.assign(world.stats.produced, { I01: 1n, P01: 1n });
  Object.assign(world.stats, { plots: 3n, sold: 9n, revenue: 1200n, lifetimeRevenue: 1200n });
  world.unlocked.push('P01');
  assert.equal(objectives(world).active, false);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  await writeWorldSave(db, world);
  const stored = await readWorldSave(db);
  const resumed = objectives(stored);
  assert.equal(stored.completedRuns, 2);
  assert.equal(resumed.active, false);
  assert.ok(resumed.guide.filter((goal) => !goal.branch).every((goal) => goal.done));
  assert.equal(resumed.long.find(({ id }) => id === 'farmIncome').current, 1200n);
  // 农地扩建 counts extra fields currently owned; a farm sale resets the farm to its two free fields.
  assert.equal(resumed.long.find(({ id }) => id === 'moreFields').current, 0n);
});

test('replacement display preference defaults on older saves and survives farm sale and reload', async (t) => {
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
  world.facilities.C.forEach((facility) => { facility.recipe = null; });
  world.revision = await writeWorldSave(db, world);

  const draft = structuredClone(world);
  settleOfflineWorld(world, draft, 18000);
  assert.deepEqual(draft.pendingOffline, {
    id: 2, elapsedMs: 18000, produced: { C01: 4n, I01: 2n }, inventoryDelta: { I01: 2n },
  });
  draft.revision = await writeWorldSave(db, draft);
  const next = structuredClone(draft);
  settleOfflineWorld(draft, next, 36000);
  assert.deepEqual(next.pendingOffline, {
    id: 3, elapsedMs: 36000, produced: { C01: 4n, I01: 4n }, inventoryDelta: { C01: -4n, I01: 4n },
  });
  assert.equal(acknowledgeOffline(next, draft.pendingOffline.id), false);
  next.revision = await writeWorldSave(db, next);
  const raw = await rawRecord(db, 'current');
  assert.equal(raw.pendingOffline.inventoryDelta.C01, '-4');
  assert.equal(raw.pendingOffline.produced.I01, '4');

  const reopened = await openWorldSave();
  t.after(() => reopened.close());
  const loaded = await readWorldSave(reopened);
  const replay = structuredClone(loaded);
  settleOfflineWorld(loaded, replay, 36000);
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

test('save encodes new batch inputs and preserves lifetime revenue when migrating old records', async (t) => {
  const db = await freshDatabase(t);
  const world = newWorld(0);
  world.inventory.C01 = 2n;
  world.stats.revenue = 42n;
  world.stats.lifetimeRevenue = 100000n;
  assert.equal(arrangeStation(world, 'I', 0, 'I01'), true);
  world.revision = await writeWorldSave(db, world);
  assert.deepEqual(await readWorldSave(db), world);
  const raw = await rawRecord(db, 'current', (record) => {
    const old = structuredClone(record);
    old.stats.revenue = old.stats.lifetimeRevenue;
    delete old.stats.lifetimeRevenue;
    old.completedRuns = 1;
    old.firstCompletedRunAtMs = 0;
    delete old.stations.I[0].batch.inputs;
    return old;
  });
  assert.deepEqual(raw.stations.I[0].batch.inputs, { C01: '2' });
  const migrated = await readWorldSave(db);
  assert.equal(migrated.stats.revenue, 0n);
  assert.equal(migrated.stats.lifetimeRevenue, 100000n);
  assert.equal(migrated.stations.I[0].batch.inputs, null);

  const legacy = newState(0);
  legacy.inventory.C01 = 2n;
  legacy.stats.revenue = 9n;
  assert.equal(arrangeLegacy(legacy, 'I', 'I01'), true);
  await rawRecord(db, 'current', () => encodeLegacy(legacy));
  const loaded = await readWorldSave(db);
  assert.equal(loaded.stats.revenue, 9n);
  assert.equal(loaded.stats.lifetimeRevenue, 9n);
  assert.deepEqual(loaded.stations.I[0].batch.inputs, { C01: 2n });
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
  assert.equal(first.value.coins, 600n);
  assert.equal(stale.status, 'rejected');
  assert.equal(stale.reason.code, 'revision-conflict');
  await assert.rejects(writeWorldSave(second, newWorld(0), { replaceCorrupt: true, corruptRevision: 2 }),
    { code: 'revision-conflict' });
  assert.deepEqual(await readWorldSave(second), first.value);
  assert.equal((await readWorldSave(second, 'previous')).revision, 1);
});
