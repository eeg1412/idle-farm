import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { capsuleHoldLimit } from '../src/game/capsules.js';
import { managerAffinityThreshold, managerAffinityThresholds, managerStatus } from '../src/game/managers.js';
import { taskCapsuleRewardTotal } from '../src/game/objectives.js';
import { assignFacility, farmSaleOffer, newWorld, sellFarm } from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord, openWorldSave, readWorldSave, writeWorldSave } from '../src/platform/world-save.js';

const wall = new Date(2026, 10, 22, 12).getTime();
const seed = '0123456789abcdef0123456789abcdef';

function capsuleWorld() {
  const world = newWorld(wall, seed);
  world.capsules = 12_300n;
  world.pendingTaskCapsules = 4_500n;
  world.managers.roles.field.readyCapsules = 2_700n;
  world.managers.roles.estate.readyCapsules = 10n ** 20n;
  return world;
}

const rejects = (record) => assert.throws(() => decodeWorldRecord(record), { code: 'corrupt-transfer' });

test('capsule balances and ready capsules save as decimal text and read back as BigInt', async (t) => {
  const world = capsuleWorld();
  const record = encodeWorldRecord(world);
  assert.equal(record.capsules, '12300');
  assert.equal(record.pendingTaskCapsules, '4500');
  assert.equal(record.managers.roles.field.readyCapsules, '2700');
  assert.equal(record.managers.roles.estate.readyCapsules, '100000000000000000000');
  assert.doesNotThrow(() => JSON.stringify(record));
  const decoded = decodeWorldRecord(record);
  assert.equal(decoded.capsules, 12_300n);
  assert.equal(decoded.pendingTaskCapsules, 4_500n);
  assert.equal(decoded.managers.roles.field.readyCapsules, 2_700n);
  assert.equal(decoded.managers.roles.estate.readyCapsules, 10n ** 20n);
  assert.equal(decoded.managers.roles.mine.readyCapsules, 0n);

  globalThis.indexedDB = new IDBFactory();
  const db = await openWorldSave();
  t.after(() => db.close());
  world.revision = await writeWorldSave(db, world);
  const loaded = await readWorldSave(db);
  assert.equal(loaded.capsules, 12_300n);
  assert.equal(loaded.pendingTaskCapsules, 4_500n);
  assert.deepEqual(loaded.managers, decoded.managers);
  // A second write reuses the loaded world without BigInt serialization errors.
  loaded.capsules = capsuleHoldLimit;
  loaded.revision = await writeWorldSave(db, loaded);
  assert.equal((await readWorldSave(db)).capsules, capsuleHoldLimit);
});

test('records from before time capsules read every capsule field as zero', () => {
  const record = encodeWorldRecord(capsuleWorld());
  delete record.capsules;
  delete record.pendingTaskCapsules;
  for (const role of Object.values(record.managers.roles)) delete role.readyCapsules;
  const decoded = decodeWorldRecord(record);
  assert.equal(decoded.capsules, 0n);
  assert.equal(decoded.pendingTaskCapsules, 0n);
  for (const role of Object.values(decoded.managers.roles)) assert.equal(role.readyCapsules, 0n);
  assert.equal(encodeWorldRecord(decoded).capsules, '0');
});

test('capsule fields accept their limits and reject values beyond them', () => {
  const record = encodeWorldRecord(capsuleWorld());
  const accepted = structuredClone(record);
  accepted.capsules = String(capsuleHoldLimit);
  accepted.pendingTaskCapsules = String(taskCapsuleRewardTotal);
  assert.equal(decodeWorldRecord(accepted).capsules, 144_000n);
  assert.equal(decodeWorldRecord(accepted).pendingTaskCapsules, 186_100n);

  for (const [key, value] of [['capsules', '144001'], ['capsules', '-1'], ['capsules', 5],
    ['pendingTaskCapsules', '186101'], ['pendingTaskCapsules', '-1'], ['pendingTaskCapsules', '1.5']]) {
    const invalid = structuredClone(record);
    invalid[key] = value;
    rejects(invalid);
  }
  for (const value of ['-1', '01', 3, null]) {
    const invalid = structuredClone(record);
    invalid.managers.roles.field.readyCapsules = value;
    rejects(invalid);
  }
  const live = capsuleWorld();
  live.capsules = capsuleHoldLimit + 1n;
  assert.throws(() => encodeWorldRecord(live));
});

test('affinity above the former level-10 maximum stays readable', () => {
  const world = capsuleWorld();
  const affinity = managerAffinityThreshold(15) + 1_234n;
  assert.ok(affinity > managerAffinityThresholds.at(-1));
  world.managers.roles.field.affinity = affinity;
  const decoded = decodeWorldRecord(encodeWorldRecord(world));
  assert.equal(decoded.managers.roles.field.affinity, affinity);
  assert.equal(managerStatus(decoded, 'field').level, 15);

  const record = encodeWorldRecord(world);
  record.managers.roles.field.affinityRemainder = '1';
  record.managers.roles.field.dailyGain = '0';
  // Remainders are still checked against the level's unit cost (300M gold per point from level 9).
  assert.equal(decodeWorldRecord(record).managers.roles.field.affinityRemainder, 1n);
  record.managers.roles.field.affinityRemainder = String(300_000_000n);
  rejects(record);
});

test('farm sale keeps capsule balances through a save round trip', () => {
  const world = capsuleWorld();
  assert.equal(sellFarm(world, farmSaleOffer(world)), true);
  const decoded = decodeWorldRecord(encodeWorldRecord(world));
  assert.equal(decoded.capsules, 12_300n);
  assert.equal(decoded.pendingTaskCapsules, 4_500n);
  assert.equal(decoded.managers.roles.field.readyCapsules, 2_700n);
});

test('fast-forwarded production may start before clock zero but must still be running now', () => {
  const world = capsuleWorld();
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  const facility = world.facilities.C[0];
  const duration = facility.batch.end - facility.batch.start;
  // A fast-forward shifts the batch back so only 500 ms remain; its start falls before clock zero.
  const end = world.clockMs + 500;
  facility.batch = { ...facility.batch, start: Math.min(end - duration, -1), end };
  facility.planting = { ...facility.planting, start: -3_600_000 };
  const record = encodeWorldRecord(world);
  assert.ok(record.facilities.C[0].batch.start < 0);
  const decoded = decodeWorldRecord(record);
  assert.equal(decoded.facilities.C[0].batch.start, facility.batch.start);
  assert.equal(decoded.facilities.C[0].planting.start, -3_600_000);

  for (const start of [-0.5, Number.MIN_SAFE_INTEGER - 1, world.clockMs + 1, '0']) {
    const invalid = structuredClone(record);
    invalid.facilities.C[0].batch.start = start;
    rejects(invalid);
  }
  const ended = structuredClone(record);
  ended.facilities.C[0].batch.end = world.clockMs;
  rejects(ended);
  const planting = structuredClone(record);
  planting.facilities.C[0].planting.start = world.clockMs + 1;
  rejects(planting);
});

test('a mine session may start before clock zero', () => {
  const world = capsuleWorld();
  world.unlocked = [...new Set([...world.unlocked, 'M01'])];
  world.facilities.M = [{ level: '1', recipe: 'M01', batch: null }];
  const record = encodeWorldRecord(world);
  record.facilities.M[0].mining = { id: 'M01', startedAt: -90_000, durationMs: 120_000 };
  assert.equal(decodeWorldRecord(record).facilities.M[0].mining.startedAt, -90_000);
  record.facilities.M[0].mining.startedAt = -1.5;
  rejects(record);
});
