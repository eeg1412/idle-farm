import test from 'node:test';
import assert from 'node:assert/strict';
import { gameHash, parseGameHash } from '../src/view/navigation.js';

test('mine route round trips and existing farm routes retain their tabs', () => {
  for (const [tab, slug] of [['田地', 'fields'], ['畜牧', 'livestock'], ['鱼池', 'fish'], ['矿洞', 'mining']]) {
    const hash = gameHash({ page: '牧场', tab, id: tab === '矿洞' ? 'M10' : 'C01' });
    assert.ok(hash.startsWith('#/farm?tab=' + slug));
    assert.equal(parseGameHash(hash).tab, tab);
  }
  assert.equal(parseGameHash('#/farm?tab=mining&item=M10').id, 'M10');
  assert.equal(parseGameHash('#/farm?tab=unknown').tab, undefined);
});
