import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceWorld, arrangeStation, assignFacility, farmSaleOffer, newWorld,
  productionDurationMs, quantity, sellFarm, startingCoins,
} from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord } from '../src/platform/world-save.js';

function assertEmptyFarm(world) {
  assert.deepEqual(world.facilities, {
    C: [
      { level: '1', recipe: null, batch: null },
      { level: '1', recipe: null, batch: null },
    ],
    L: [], F: [], M: [],
  });
  assert.deepEqual(world.stations, {
    I: [{ order: 0, level: '1', recipe: null, priority: false, batch: null }],
    P: [{ order: 1, level: '1', recipe: null, priority: false, batch: null }],
  });
}

test('new saves still begin with two empty fields and the normal starting coins', () => {
  const world = newWorld(0);
  assertEmptyFarm(world);
  assert.equal(world.coins, startingCoins);
  advanceWorld(world, 4 * productionDurationMs(world, 'C01'));
  assert.deepEqual(world.inventory, {});
  assert.deepEqual(world.stats.produced, {});
  assert.equal(world.productionValue, 0n);
});

test('selling a producing farm leaves empty fields until the player plants wheat', () => {
  const world = newWorld(0);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  assert.ok(assignFacility(world, 'C', 1, 'C01'));
  advanceWorld(world, productionDurationMs(world, 'C01'));
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const produced = structuredClone(world.stats.produced);
  const saleValue = world.productionValue;
  const offer = farmSaleOffer(world);
  const researchPoints = world.researchPoints;
  assert.ok(saleValue > 0n);
  assert.ok(sellFarm(world, offer, 12345));

  assertEmptyFarm(world);
  assert.equal(world.completedRuns, 1);
  assert.equal(world.coins, startingCoins);
  assert.equal(world.productionValue, 0n);
  assert.equal(world.researchPoints, researchPoints + offer.reward);
  assert.equal(world.lifetimeProductionValue, offer.lifetimeProductionValue);
  assert.deepEqual(world.farmSaleHistory, [{ run: 1, soldAt: 12345, productionValue: saleValue }]);
  assert.deepEqual(world.inventory, {});
  assert.deepEqual(world.reserves, {});

  advanceWorld(world, world.clockMs + 4 * productionDurationMs(world, 'C01'));
  assertEmptyFarm(world);
  assert.deepEqual(world.inventory, {});
  assert.deepEqual(world.stats.produced, produced);
  assert.equal(world.productionValue, 0n);
  assert.equal(world.lifetimeProductionValue, offer.lifetimeProductionValue);

  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  const { batch, planting } = world.facilities.C[0];
  assert.equal(planting.id, 'C01');
  assert.equal(planting.start, world.clockMs);
  advanceWorld(world, batch.end);
  assert.equal(quantity(world, 'C01'), BigInt(batch.amount));
  assert.equal(world.stats.produced.C01, produced.C01 + BigInt(batch.amount));
  assert.equal(world.facilities.C[1].recipe, null);
  assert.equal(world.facilities.C[1].batch, null);
});

test('save decoding preserves empty sold fields and existing scheduled production', () => {
  const sold = newWorld(0);
  assert.ok(sellFarm(sold, farmSaleOffer(sold)));
  assertEmptyFarm(decodeWorldRecord(encodeWorldRecord(sold)));

  for (const world of [newWorld(0), sold]) {
    assert.ok(assignFacility(world, 'C', 0, 'C01'));
    assert.ok(assignFacility(world, 'C', 1, 'C01'));
    advanceWorld(world, productionDurationMs(world, 'C01'));
    assert.ok(arrangeStation(world, 'I', 0, 'I01'));
    const restored = decodeWorldRecord(encodeWorldRecord(world));
    assert.deepEqual(restored.facilities, world.facilities);
    assert.deepEqual(restored.stations, world.stations);
    assert.equal(restored.completedRuns, world.completedRuns);
    advanceWorld(restored, restored.facilities.C[0].batch.end);
    assert.ok(restored.stats.produced.C01 > world.stats.produced.C01);
    assert.equal(restored.facilities.C[0].recipe, 'C01');
    assert.equal(restored.stations.I[0].recipe, 'I01');
  }
});
