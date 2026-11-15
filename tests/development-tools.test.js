import test from 'node:test';
import assert from 'node:assert/strict';
import { researchOffer, techDefinitions, techOffer } from '../src/game/advancement.js';
import { grantDevelopmentTools } from '../src/game/development-tools.js';
import { advanceWorld, arrangeStation, catalog, newWorld } from '../src/game/world.js';

test('development tools unlock every item and complete every technology without losing a large balance', () => {
  const world = newWorld(0);
  const existingCoins = 10n ** 120n + 17n;
  world.coins = existingCoins;
  world.unlocked.push('C02');
  world.tech.cropYield = 2;

  assert.equal(grantDevelopmentTools(world), true);

  assert.equal(world.coins, existingCoins + 1_000_000_000_000n);
  assert.deepEqual(new Set(world.unlocked), new Set(Object.keys(catalog.items)));
  assert.equal(world.unlocked.length, new Set(world.unlocked).size);
  for (const id of Object.keys(catalog.research)) assert.equal(researchOffer(world, id), null);
  for (const { key } of techDefinitions) {
    const offer = techOffer(world, key);
    assert.equal(offer.maxed, true, key);
    assert.equal(offer.level, 5, key);
    assert.equal(offer.eligible, false, key);
  }
});

test('development tools preserve production batches, quality, inventory and recorded business events', () => {
  const world = newWorld(0);
  world.inventory = { C01: 12n, I01: 3n };
  assert.equal(arrangeStation(world, 'I', 0, 'I01'), true);
  advanceWorld(world, 1000);
  world.reserves = { C01: 4n };
  world.quality = { C01: '1000000000000000000000', I01: '7' };
  world.researchPoints = 9n;
  world.productionValue = 77n;
  world.stats = {
    produced: { C01: 7n, I01: 2n }, sold: 3n, plots: 4n,
    revenue: 9n, lifetimeRevenue: 16n, boughtL: 2n, boughtF: 1n,
  };
  const before = structuredClone(world);

  grantDevelopmentTools(world);

  const { coins: beforeCoins, unlocked: beforeUnlocked, tech: beforeTech, ...beforeBusiness } = before;
  const { coins, unlocked, tech, ...afterBusiness } = world;
  assert.deepEqual(afterBusiness, beforeBusiness);
});

test('repeated development grants add coins again while leaving completed unlocks and business state unchanged', () => {
  const world = newWorld(0);
  grantDevelopmentTools(world);
  const firstGrant = structuredClone(world);

  assert.equal(grantDevelopmentTools(world), true);

  assert.deepEqual(world, { ...firstGrant, coins: firstGrant.coins + 1_000_000_000_000n });
});
