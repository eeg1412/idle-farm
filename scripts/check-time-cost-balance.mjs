import assert from 'node:assert/strict';
import catalogue from '../src/content/game-data.json' with { type: 'json' };
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import { applyLongTermBalance } from './long-term-balance.mjs';
import { loadCatalogueInputs, verifyCatalogue, verifyCatalogueAppend, verifyMinimumPrice } from './lib/time-cost-catalog.mjs';

const arguments_ = new Set(process.argv.slice(2));
const show = (group, result) => console.log(group + ' ' +
  JSON.stringify(result, (_, value) => typeof value === 'bigint' ? value.toString() : value));

assert.equal(catalogue.balanceVersion, 'LT-2026-11-v11');
const { coinScale } = economyScale;
assert(Number.isSafeInteger(coinScale) && coinScale > 0, 'coinScale 必须为正安全整数');
const sources = await loadCatalogueInputs();
show('目录', verifyCatalogue(catalogue, sources, coinScale));
show('追加回归', verifyCatalogueAppend(catalogue, sources, coinScale, applyLongTermBalance));

show('最低价回归', verifyMinimumPrice(catalogue, sources, applyLongTermBalance));

if (!arguments_.has('--catalog-only')) {
  const { checkOpening, checkScenarios } = await import('./lib/time-cost-scenarios.mjs');
  show('新档', checkOpening());
  if (!arguments_.has('--opening-only')) checkScenarios(show);
}
