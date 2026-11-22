import assert from 'node:assert/strict';
import catalogue from '../src/content/game-data.json' with { type: 'json' };
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import { applyLongTermBalance, balanceVersion } from './long-term-balance.mjs';
import { loadCatalogueInputs, verifyCatalogue, verifyCatalogueAppend, verifyMinimumPrice } from './lib/time-cost-catalog.mjs';

// Flags: --catalog-only, --opening-only, --tech-time (measurement only, no catalogue checks),
// --days=<observation days, default 1825>, --visit=<comma-separated visit intervals in days, default 1,0.5,3>.
const argv = process.argv.slice(2);
const arguments_ = new Set(argv.filter((argument) => !argument.includes('=')));
const option = (name) => argv.find((argument) => argument.startsWith('--' + name + '='))?.slice(name.length + 3);
const show = (group, result) => console.log(group + ' ' +
  JSON.stringify(result, (_, value) => typeof value === 'bigint' ? value.toString() : value));

const measurement = {};
if (option('days') !== undefined) {
  measurement.observationDays = Number(option('days'));
  assert(Number.isSafeInteger(measurement.observationDays) && measurement.observationDays > 0, '--days 必须为正整数');
}
if (option('visit') !== undefined) {
  measurement.visits = option('visit').split(',').map(Number);
  assert(measurement.visits.length && measurement.visits.every((visit) => visit > 0), '--visit 必须为正数列表');
}

assert.equal(catalogue.balanceVersion, balanceVersion);
const { coinScale } = economyScale;
assert(Number.isSafeInteger(coinScale) && coinScale > 0, 'coinScale 必须为正安全整数');

if (arguments_.has('--tech-time')) {
  const { measureTechTime } = await import('./lib/time-cost-scenarios.mjs');
  measureTechTime(show, measurement);
} else {
  const sources = await loadCatalogueInputs();
  show('目录', verifyCatalogue(catalogue, sources, coinScale));
  show('追加回归', verifyCatalogueAppend(catalogue, sources, coinScale, applyLongTermBalance));

  show('最低价回归', verifyMinimumPrice(catalogue, sources, applyLongTermBalance));

  if (!arguments_.has('--catalog-only')) {
    const { checkOpening, checkScenarios } = await import('./lib/time-cost-scenarios.mjs');
    show('新档', checkOpening());
    if (!arguments_.has('--opening-only')) checkScenarios(show, measurement);
  }
}
