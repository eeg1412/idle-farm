import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceWorld, assignProductionBatch, batchUpgradeOffer, buyStation, catalog, clearProductionBatch,
  facilityOffer, facilitySnapshotOutput, newWorld, setStationPriority, stationMultiplier, stationUpgradeOffer,
  upgradeFacility, upgradeProductionBatch, upgradeStation,
} from '../src/game/world.js';

test('batch facility upgrades quote each current level and reject stale or unaffordable totals atomically', () => {
  const world = newWorld(0);
  world.coins = 1_000_000_000n;
  assert.ok(assignProductionBatch(world, 'C', [0], 'C01'));
  assert.ok(upgradeFacility(world, 'C', 1, 1));
  const planted = world.facilities.C[0];
  const originalBatch = { ...planted.batch };
  const planting = planted.planting;
  // New technology cannot change the snapshot of an already running harvest.
  world.tech.cropYield = '50';
  world.tech.cropUpgrade = '10';
  for (const steps of [1, 5, 10]) {
    const cost = facilityOffer(world, 'C', 0, steps).cost + facilityOffer(world, 'C', 1, steps).cost;
    assert.deepEqual(batchUpgradeOffer(world, 'C', [1, 0], steps), { cost, affordable: true });
  }
  assert.equal(batchUpgradeOffer(world, 'C', [0, 0], 5), null);
  assert.equal(batchUpgradeOffer(world, 'C', [0, 2], 5), null);
  assert.equal(batchUpgradeOffer(world, 'C', [], 5), null);
  assert.equal(batchUpgradeOffer(world, 'C', [0, 1], 'max'), null);
  const { cost } = batchUpgradeOffer(world, 'C', [0, 1], 5);
  world.coins = cost - 1n;
  const insufficient = structuredClone(world);
  assert.equal(batchUpgradeOffer(world, 'C', [0, 1], 5).affordable, false);
  assert.equal(upgradeProductionBatch(world, 'C', [0, 1], 5, cost), false);
  assert.deepEqual(world, insufficient);

  world.coins = cost;
  const unchanged = structuredClone(world);
  assert.equal(upgradeProductionBatch(world, 'C', [0, 1], 5, cost - 1n), false);
  assert.deepEqual(world, unchanged);
  assert.ok(upgradeProductionBatch(world, 'C', [0, 1], 5, cost));
  assert.equal(world.coins, 0n);
  assert.deepEqual(world.facilities.C.map(({ level }) => level), ['6', '7']);
  assert.deepEqual(planted.batch, { ...originalBatch, amount: String(facilitySnapshotOutput(originalBatch, 6n)) });
  assert.equal(planted.planting, planting);

  assert.ok(clearProductionBatch(world, 'C', [1, 0]));
  assert.deepEqual(world.facilities.C, [
    { level: '6', recipe: null, batch: null }, { level: '7', recipe: null, batch: null },
  ]);
  assert.equal(clearProductionBatch(world, 'C', [0, 1]), false);
});

test('batch recipe replacement refunds recorded inputs before settling by station priority', () => {
  const world = newWorld(0);
  world.coins = 1_000_000_000n;
  assert.ok(buyStation(world, 'I'));
  world.unlocked.push('I03');
  world.inventory = { C01: 2n, C03: 4n, I02: 2n };
  assert.ok(assignProductionBatch(world, 'I', [0, 1], 'I03'));
  assert.ok(setStationPriority(world, 'I', 1, true));
  const before = structuredClone(world);
  assert.equal(assignProductionBatch(world, 'I', [0, 2], 'I01'), false);
  assert.equal(assignProductionBatch(world, 'I', [0, 1], 'C01'), false);
  assert.equal(assignProductionBatch(world, 'I', [0, 1], 'I04'), false);
  assert.deepEqual(world, before);

  assert.ok(assignProductionBatch(world, 'I', [0, 1], 'I01'));
  const [first, priority] = world.stations.I;
  assert.equal(first.recipe, 'I01');
  assert.equal(first.batch, null);
  assert.equal(priority.recipe, 'I01');
  assert.equal(priority.priority, true);
  assert.deepEqual(priority.batch.inputs, { C01: 2n });
  assert.deepEqual(world.inventory, { C01: 0n, C03: 4n, I02: 2n });
  const batch = priority.batch;
  assert.ok(assignProductionBatch(world, 'I', [0, 1], 'I01'));
  assert.equal(priority.batch, batch);
  assert.deepEqual(world.stats.produced, {});
});

test('batch clear combines refunds before waiting stations can consume materials', () => {
  const world = newWorld(0);
  world.coins = 1_000_000_000n;
  for (let i = 0; i < 3; i++) assert.ok(buyStation(world, 'I'));
  assert.ok(upgradeStation(world, 'I', 2, 1));
  world.unlocked.push('I03');
  world.inventory = { C03: 4n, I02: 2n };
  assert.ok(assignProductionBatch(world, 'I', [0, 1, 2, 3], 'I03'));
  assert.ok(setStationPriority(world, 'I', 0, true));
  assert.ok(setStationPriority(world, 'I', 1, true));
  assert.ok(setStationPriority(world, 'I', 2, true));
  const before = structuredClone(world);
  assert.equal(clearProductionBatch(world, 'I', [0, 4]), false);
  assert.deepEqual(world, before);

  assert.ok(clearProductionBatch(world, 'I', [1, 0]));
  const [first, second, priority, waiting] = world.stations.I;
  for (const station of [first, second]) {
    assert.equal(station.recipe, null);
    assert.equal(station.batch, null);
    assert.equal(station.priority, false);
  }
  assert.deepEqual(priority.batch.inputs, { C03: 4n, I02: 2n });
  assert.equal(waiting.batch, null);
  assert.deepEqual(world.inventory, { C03: 0n, I02: 0n });
});

test('batch workshop upgrades keep paid amounts and apply the new multiplier on the next batch', () => {
  const world = newWorld(0);
  world.coins = 1_000_000_000n;
  assert.ok(buyStation(world, 'I'));
  world.inventory.C01 = 100n;
  assert.ok(assignProductionBatch(world, 'I', [0, 1], 'I01'));
  const { cost } = batchUpgradeOffer(world, 'I', [0, 1], 10n);
  assert.equal(cost, stationUpgradeOffer(world, 'I', 0, 10n).cost * 2n);
  const coins = world.coins;
  const batches = world.stations.I.map(({ batch }) => batch);
  const snapshots = structuredClone(batches);
  assert.ok(upgradeProductionBatch(world, 'I', [0, 1], 10n, cost));
  assert.equal(world.coins, coins - cost);
  for (const [index, station] of world.stations.I.entries()) {
    assert.equal(station.level, '11');
    assert.equal(station.batch, batches[index]);
    assert.deepEqual(station.batch, snapshots[index]);
  }

  advanceWorld(world, snapshots[0].end);
  const multiplier = stationMultiplier(11n);
  const flour = catalog.items.I01;
  assert.equal(world.inventory.I01, 2n * BigInt(flour.output));
  for (const station of world.stations.I) {
    assert.equal(station.batch.inputs.C01, BigInt(flour.inputs.C01) * multiplier);
    assert.equal(station.batch.amount, String(BigInt(flour.output) * multiplier));
  }
});
