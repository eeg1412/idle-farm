import test from 'node:test';
import assert from 'node:assert/strict';
import { gameHash, parseGameHash } from '../src/view/navigation.js';

test('mine route round trips and existing farm routes retain their tabs', () => {
  for (const [tab, slug] of [['田地', 'fields'], ['畜牧', 'livestock'], ['鱼池', 'fish'], ['矿洞', 'mining']]) {
    const route = { page: '庄园', tab, id: tab === '矿洞' ? 'M10' : 'C01' };
    const hash = '#/farm?tab=' + slug + '&item=' + route.id;
    assert.equal(gameHash(route), hash);
    assert.deepEqual(parseGameHash(hash), route);
  }
  assert.equal(gameHash({ page: '出售庄园' }), '#/farm-sale');
  assert.equal(parseGameHash('#/farm-sale').page, '出售庄园');
  assert.equal(parseGameHash('').page, '庄园');
  assert.equal(parseGameHash('#/farm?tab=unknown').tab, undefined);
});
