import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { advanceWorld, assignFacility, farmSaleOffer, newWorld, sellFarm } from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord, openWorldSave, readWorldSave, writeWorldSave } from '../src/platform/world-save.js';

const saleTime = new Date(2026, 10, 19, 12, 30).getTime();

function producedWorld() {
  const world = newWorld(saleTime);
  assignFacility(world, 'C', 0, 'C01');
  advanceWorld(world, 24_000);
  return world;
}

test('a successful sale snapshots its pre-reset value and stale or invalid attempts add nothing', () => {
  const world = producedWorld();
  const originalHistory = world.farmSaleHistory;
  const value = world.productionValue;
  const offer = farmSaleOffer(world);
  const before = structuredClone(world);
  for (const time of [-1, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(sellFarm(world, offer, time), false);
    assert.deepEqual(world, before);
  }
  assert.equal(sellFarm(world, offer, saleTime), true);
  assert.notEqual(world.farmSaleHistory, originalHistory);
  assert.deepEqual(originalHistory, []);
  assert.deepEqual(world.farmSaleHistory, [{ run: 1, soldAt: saleTime, productionValue: value }]);
  assert.equal(world.productionValue, 0n);
  assert.equal(sellFarm(world, offer, saleTime), false);
  assert.equal(world.farmSaleHistory.length, 1);
  assert.equal(sellFarm(world, farmSaleOffer(world)), true);
  assert.equal(world.farmSaleHistory[1].productionValue, 0n);
  assert.equal(world.farmSaleHistory[1].soldAt, world.wallAnchorMs);
});

test('sale history codecs retain exact large values and migrate old records without inventing sales', () => {
  const world = newWorld(saleTime);
  world.completedRuns = 8;
  const value = 10n ** 100n + 13n;
  world.farmSaleHistory = [{ run: 7, soldAt: saleTime, productionValue: value },
    { run: 8, soldAt: saleTime - 100_000, productionValue: 0n }];
  const record = encodeWorldRecord(world);
  assert.equal(record.farmSaleHistory[0].productionValue, value.toString());
  assert.deepEqual(decodeWorldRecord(record).farmSaleHistory, world.farmSaleHistory);
  delete record.farmSaleHistory;
  const migrated = decodeWorldRecord(record);
  assert.equal(migrated.completedRuns, 8);
  assert.deepEqual(migrated.farmSaleHistory, []);
  assert.equal(sellFarm(migrated, farmSaleOffer(migrated)), true);
  assert.equal(migrated.farmSaleHistory[0].run, 9);

  for (const history of [null, [{ run: 0, soldAt: saleTime, productionValue: '1' }],
    [{ run: 9, soldAt: saleTime, productionValue: '1' }],
    [{ run: 1, soldAt: -1, productionValue: '1' }],
    [{ run: 1, soldAt: saleTime, productionValue: '-1' }],
    [{ run: 2, soldAt: saleTime, productionValue: '1' }, { run: 2, soldAt: saleTime, productionValue: '1' }]]) {
    assert.throws(() => decodeWorldRecord({ ...record, farmSaleHistory: history }), { code: 'corrupt-transfer' });
  }
});

test('a conflicting save cannot append a sale history record into persisted state', async (t) => {
  globalThis.indexedDB = new IDBFactory();
  const db = await openWorldSave();
  t.after(() => db.close());
  const first = producedWorld();
  first.revision = await writeWorldSave(db, first);
  const stale = structuredClone(first);
  const value = first.productionValue;
  assert.equal(sellFarm(first, farmSaleOffer(first), saleTime), true);
  first.revision = await writeWorldSave(db, first);
  assert.equal(sellFarm(stale, farmSaleOffer(stale), saleTime + 1), true);
  await assert.rejects(writeWorldSave(db, stale), { code: 'revision-conflict' });
  assert.deepEqual((await readWorldSave(db)).farmSaleHistory,
    [{ run: 1, soldAt: saleTime, productionValue: value }]);
});
