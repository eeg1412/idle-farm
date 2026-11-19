import assert from 'node:assert/strict';
import test from 'node:test';
import { newWorld, catalog } from '../src/game/world.js';
import { marketUnitPrice } from '../src/game/market.js';
import { managerCharacters } from '../src/view/manager-dialogue.js';
import { inventoryEstimate, productionSummary } from '../src/view/management-records.js';
import { gameHash, parseGameHash } from '../src/view/navigation.js';

test('all appearances have a stable name and ten distinct replies for each event', () => {
  const names = [];
  for (const role of Object.values(managerCharacters)) for (const gender of ['female', 'male']) {
    const appearance = role[gender];
    assert.ok(appearance.name);
    names.push(appearance.name);
    for (const event of ['hello', 'thanks', 'wantedThanks']) {
      assert.equal(appearance[event].length, 10);
      assert.equal(new Set(appearance[event]).size, 10);
    }
  }
  assert.equal(names.length, 22);
  assert.equal(new Set(names).size, 22);
});

test('management routes retain their canonical identity', () => {
  for (const [page, hash] of [['管理员管理', '#/managers'], ['统计', '#/statistics'], ['出售庄园历史', '#/farm-sale-history']]) {
    assert.equal(gameHash({ page }), hash);
    assert.equal(parseGameHash(hash).page, page);
  }
});

test('inventory estimates use exact current market value including reserved inventory', () => {
  const world = newWorld(0);
  const big = 10n ** 40n;
  world.inventory.C01 = big;
  world.reserves.C01 = big - 1n;
  const expected = big * marketUnitPrice(world, 'C01');
  assert.equal(inventoryEstimate(world), expected);
  const changed = structuredClone(world);
  changed.inventory.C01 += 1n;
  assert.equal(inventoryEstimate(changed), expected + marketUnitPrice(changed, 'C01'));
});

test('production counts distinguish assigned and blocked workshop stations', () => {
  const world = newWorld(0);
  world.facilities.C[0].recipe = 'C01';
  world.facilities.C[0].batch = { end: 100 };
  const intermediate = Object.entries(catalog.items).find(([, item]) => item.kind[0] === 'I')[0];
  world.stations.I[0].recipe = intermediate;
  const rows = productionSummary(world);
  assert.equal(rows[0].active, 1);
  assert.equal(rows[0].blocked, undefined);
  assert.equal(rows[4].blocked, 1);
  assert.equal(rows[4].empty, 0);
  assert.equal(rows[5].empty, 1);
});
