import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance, appraisalOffer, arrange, buyPlot, catalog, farmSaleOffer, newState, quantity, research,
  researchOffer, reserve, sell, sellFarm, updateWallTime, upgradeAppraisal,
} from '../src/game/state.js';
import { guide, inGuide, longTerm } from '../src/game/tasks.js';
import { viewportLayout } from '../src/platform/layout.js';
import { decode, encode } from '../src/platform/save.js';

test('production, early sale and land purchase complete the same guide', () => {
  const state = newState(0);
  advance(state, 12000);
  assert.equal(quantity(state, 'C01'), 4n);
  sell(state, 'C01', 1n);
  reserve(state, 'C01', 12n);
  assert.ok(arrange(state, 'I', 'I01'));
  advance(state, 180000);
  assert.ok(research(state, 'P01'));
  assert.ok(arrange(state, 'P', 'P01'));
  advance(state, 240000);
  assert.ok(sell(state, 'P01', 1n));
  assert.ok(buyPlot(state));
  assert.ok(guide.every(([, , done]) => done(state)));
  assert.ok(!inGuide(state));
  assert.deepEqual(longTerm[0][2](state), [1, 10]);
});

test('offline settlement caps, persists and does not pay twice', () => {
  const state = newState(0);
  updateWallTime(state, 3 * 3600000);
  assert.equal(state.clockMs, 2 * 3600000);
  const restored = decode(encode(state));
  updateWallTime(restored, 3 * 3600000);
  assert.deepEqual(restored, state);
  restored.coins = 10n ** 120n + 1n;
  assert.deepEqual(decode(encode(restored)), restored);
});

test('portrait fills and landscape centers an upright area', () => {
  const insets = { left: 20, right: 20, top: 24, bottom: 12 };
  const portrait = viewportLayout(390, 844, insets);
  assert.deepEqual([portrait.width, portrait.height], [390, 844]);
  const landscape = viewportLayout(844, 390, insets);
  assert.equal(landscape.x, (844 - landscape.width) / 2);
  assert.equal(landscape.width, Math.floor(landscape.height * 390 / 844));
});

test('IndexedDB persists tasks with the game and rejects a stale writer', async () => {
  await import('fake-indexeddb/auto');
  const { openSave, readSave, writeSave } = await import('../src/platform/save.js');
  const db = await openSave();
  const state = newState(0);
  advance(state, 12000);
  state.revision = await writeSave(db, state);
  const stale = await readSave(db);
  state.guideSkipped = true;
  sell(state, 'C01', 1n);
  state.revision = await writeSave(db, state);
  await assert.rejects(writeSave(db, stale), /updated elsewhere/);
  db.close();

  const reopened = await openSave();
  const restored = await readSave(reopened);
  assert.deepEqual(restored, state);
  assert.equal(inGuide(restored), false);
  assert.deepEqual(longTerm[1][2](restored), [3n, 100000n]);
  reopened.close();
});

test('waiting and running stations can change recipe without changing the current batch', () => {
  const state = newState(0);
  state.unlocked.push('I02');
  state.inventory.C01 = 2n;
  assert.ok(arrange(state, 'I', 'I02'));
  assert.equal(state.stations.I.ends, null);
  assert.ok(arrange(state, 'I', 'I01'));
  assert.equal(state.stations.I.ends, 9000);
  assert.equal(quantity(state, 'C01'), 0n);

  state.inventory.C02 = 2n;
  assert.ok(arrange(state, 'I', 'I02'));
  assert.equal(state.stations.I.output, 'I01');
  assert.equal(state.stations.I.outputQuantity, '1');
  assert.equal(state.stations.I.ends, 9000);
  assert.equal(quantity(state, 'C02'), 2n);
  advance(state, 9000);
  assert.equal(quantity(state, 'I01'), 1n);
  assert.equal(state.stations.I.output, 'I02');
  assert.equal(state.stations.I.ends, 20000);
  assert.equal(quantity(state, 'C02'), 0n);

  assert.ok(arrange(state, 'I', 'I01'));
  advance(state, 20000);
  assert.equal(quantity(state, 'I02'), 1n);
  assert.equal(state.stations.I.recipe, 'I01');
  assert.equal(state.stations.I.output, 'I01');
  assert.equal(quantity(state, 'C01'), 2n);
});

test('a saved station with the former pause flag starts as soon as materials are available', () => {
  const state = newState(0);
  state.inventory.C01 = 2n;
  state.stations.I = { recipe: 'I01', ends: null, paused: true };
  const loaded = decode(encode(state));
  updateWallTime(loaded, 9000);
  assert.equal(quantity(loaded, 'I01'), 1n);
  assert.equal(Object.hasOwn(loaded.stations.I, 'paused'), false);
});

test('speed shortens new batches while a previously committed batch honors its saved output', () => {
  const state = newState(0);
  state.unlocked.push('I14');
  state.inventory.C14 = 4n;
  state.stations.I = { recipe: 'I14', ends: 20000, output: 'I14', outputQuantity: '2' };
  state.workshopSpeedLevel = 5;
  const loaded = decode(encode(state));
  advance(loaded, 20000);
  assert.equal(quantity(loaded, 'I14'), 2n);
  assert.equal(loaded.stations.I.ends, 43000);
  assert.equal(loaded.stations.I.outputQuantity, '1');
  advance(loaded, 43000);
  assert.equal(quantity(loaded, 'I14'), 3n);
  assert.equal(loaded.stations.I.ends, 66000);
});

test('a late product needs the full quantity of each intermediate ingredient', () => {
  const state = newState(0);
  const id = 'P150';
  state.unlocked.push(id);
  const { inputs, durationMs } = catalog.items[id];
  for (const [key, count] of Object.entries(inputs)) state.inventory[key] = BigInt(count);
  const component = Object.keys(inputs).find((key) => BigInt(inputs[key]) > 1n);
  state.inventory[component] -= 1n;
  assert.equal(arrange(state, 'P', id), true);
  assert.equal(state.stations.P.ends, null);
  state.inventory[component] = BigInt(inputs[component]);
  assert.equal(arrange(state, 'P', id), true);
  assert.equal(quantity(state, component), 0n);
  advance(state, durationMs);
  assert.equal(quantity(state, id), 1n);
  assert.equal(state.stations.P.ends, null);
});

test('calendar-gated research completes instantly and charges the quoted cost once', () => {
  const id = 'P150';
  const node = catalog.research[id];
  const state = newState(0);
  state.unlocked.push(...node.requires.filter((required) => !state.unlocked.includes(required)));
  state.coins = BigInt(node.coins);
  for (const [item, count] of Object.entries(node.costs)) {
    state.inventory[item] = BigInt(count) * BigInt(node.materialMultiplier);
  }
  assert.equal(node.availableAfterDays, 365);
  assert.equal(researchOffer(state, id).affordable, true);
  const before = structuredClone(state);
  assert.equal(research(state, id), false);
  assert.deepEqual(state, before);

  state.completedRuns = node.minCompletedRuns;
  state.firstCompletedRunAtMs = 0;
  state.wallAnchorMs = node.availableAfterDays * 86400000 - 1;
  assert.equal(researchOffer(state, id).eligible, false);
  updateWallTime(state, node.availableAfterDays * 86400000);
  const offer = researchOffer(state, id);
  assert.equal(offer.eligible, true);
  assert.equal(state.unlocked.includes(id), false);
  assert.equal(research(state, id), true);
  assert.equal(state.unlocked.includes(id), true);
  assert.equal(state.coins, 0n);
  for (const [item] of offer.costs) assert.equal(quantity(state, item), 0n);
  assert.equal(research(state, id), false);
});

test('a completed legacy run starts its calendar at the saved wall clock', () => {
  const state = newState(5000);
  delete state.firstCompletedRunAtMs;
  state.completedRuns = 1;
  updateWallTime(state, 6000);
  assert.equal(state.firstCompletedRunAtMs, 5000);
  updateWallTime(state, 4000);
  assert.equal(state.wallAnchorMs, 6000);
  assert.equal(state.firstCompletedRunAtMs, 5000);
});

test('production value counts completed output once at its current unit price', () => {
  const state = newState(0);
  assert.equal(state.productionValue, 0n);
  state.unlocked.push('P01');
  arrange(state, 'I', 'I01');
  arrange(state, 'P', 'P01');
  advance(state, 12000);
  assert.equal(state.productionValue, 12n);
  assert.equal(state.stations.I.ends, 21000);
  const flourPrice = BigInt(catalog.items.I01.price);
  state.quality.I01 = 2;
  assert.equal(state.productionValue, 12n);
  advance(state, 21000);
  const flourQualityBonus = flourPrice * 12n / 100n || 1n;
  assert.equal(state.productionValue, 12n + flourPrice + flourQualityBonus);
  advance(state, 180000);
  assert.ok(quantity(state, 'P01') > 0n);
  assert.equal(state.productionValue, state.stats.wheat * 3n +
    state.stats.flour * (flourPrice + flourQualityBonus) + state.stats.bread * BigInt(catalog.items.P01.price));
  const settled = state.productionValue;
  assert.ok(sell(state, 'P01', 1n));
  assert.equal(state.productionValue, settled);
  advance(state, 180000);
  assert.equal(state.productionValue, settled);
});

test('farm sale reward uses only completed production value and the appraisal multiplier', () => {
  const state = newState(100);
  state.stats.revenue = 10n ** 40n;
  for (const [value, level, expected] of [
    [0n, 0, 0n], [620n, 0, 0n], [999n, 5, 0n], [1000n, 0, 1n], [31000n, 0, 5n],
    [31000n, 2, 7n], [31000n, 5, 10n], [1000n * (2n ** 299n - 1n), 5, 598n],
  ]) {
    state.productionValue = value;
    state.appraisalLevel = level;
    assert.equal(farmSaleOffer(state).reward, expected);
  }
});

test('farm sale refreshes a changed offer and can settle a zero-point run', () => {
  const state = newState(100);
  state.productionValue = 620n;
  state.inventory = { C01: 10n };
  state.reserves = { C01: 6n };
  state.quality = { C01: 4 };
  state.unlocked.push('P01');
  state.guideSkipped = true;
  state.stats.wheat = 21n;
  state.clockMs = 700;
  arrange(state, 'I', 'I01');
  const zeroOffer = farmSaleOffer(state);
  assert.ok(buyPlot(state));
  assert.equal(sellFarm(state, zeroOffer), false);
  assert.equal(state.completedRuns, 0);
  const refreshed = farmSaleOffer(state);
  assert.equal(refreshed.reward, 0n);
  assert.equal(sellFarm(state, refreshed), true);
  assert.equal(sellFarm(state, refreshed), false);
  assert.equal(state.completedRuns, 1);
  assert.equal(state.firstCompletedRunAtMs, 100);
  assert.equal(state.coins, 60n);
  assert.equal(state.productionValue, 0n);
  assert.equal(state.researchPoints, 0n);
  assert.deepEqual(state.inventory, {});
  assert.deepEqual(state.reserves, {});
  assert.deepEqual(state.plots, [12700, 12700]);
  assert.deepEqual(state.stations, { I: { recipe: null, ends: null }, P: { recipe: null, ends: null } });
  assert.ok(state.unlocked.includes('P01'));
  assert.equal(state.quality.C01, 4);
  assert.equal(state.guideSkipped, true);
  assert.equal(state.stats.wheat, 21n);

  const staleReward = farmSaleOffer(state);
  state.wallAnchorMs = 200;
  state.productionValue = 1000n;
  assert.equal(sellFarm(state, staleReward), false);
  assert.ok(sellFarm(state, farmSaleOffer(state)));
  assert.equal(state.completedRuns, 2);
  assert.equal(state.firstCompletedRunAtMs, 100);
  assert.equal(state.researchPoints, 1n);
  assert.ok(upgradeAppraisal(state));
  assert.equal(state.appraisalLevel, 1);
  assert.equal(appraisalOffer(state).cost, 2n);
  assert.equal(upgradeAppraisal(state), false);
  assert.deepEqual(decode(encode(state)), state);
});

test('legacy saves start counting current production and research points from zero', () => {
  const state = newState(0);
  advance(state, 12000);
  const oldRecord = encode(state);
  delete oldRecord.productionValue;
  delete oldRecord.researchPoints;
  delete oldRecord.appraisalLevel;
  const loaded = decode(oldRecord);
  assert.equal(quantity(loaded, 'C01'), 4n);
  assert.equal(loaded.productionValue, 0n);
  assert.equal(loaded.researchPoints, 0n);
  assert.equal(loaded.appraisalLevel, 0);
  advance(loaded, 24000);
  assert.equal(loaded.productionValue, 12n);
});
