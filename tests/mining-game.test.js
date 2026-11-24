import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import {
  rate, research, researchOffer, techDefinitions, techOffer, techTotalLevels, upgradeTech,
} from '../src/game/advancement.js';
import { objectives, settleTaskRewards, taskResearchPointRewards } from '../src/game/objectives.js';
import { drawQuality, qualityDrawOffer } from '../src/game/quality.js';
import {
  advanceWorld, arrangeStation, assignFacility, assignProductionBatch, batchUpgradeOffer,
  buyFacility, buyStation, catalog, clearStation, facilityOffer, facilitySnapshotOutput,
  farmSaleOffer, forecastHourlyProduction, newWorld, quantity, sellFarm, stationMultiplier,
  stationRequirements, upgradeFacility, upgradeProductionBatch, upgradeStation, updateWorldWallTime,
} from '../src/game/world.js';
import {
  decodeWorldRecord, encodeWorldRecord, openWorldSave, readWorldSave, writeWorldSave,
} from '../src/platform/world-save.js';
import { createSaveTransfer } from '../src/platform/save-transfer.js';

const miningIds = Object.keys(catalog.items).filter((id) => ['M', 'IM', 'PM'].includes(catalog.items[id].kind));
const fundedWorld = () => {
  const world = newWorld(0, '0123456789abcdef0123456789abcdef');
  world.coins = 10n ** 100n;
  world.unlocked = [...Object.keys(catalog.items)];
  return world;
};

test('mines have no free facilities and share livestock prices, discounts and capacity', () => {
  const world = fundedWorld();
  assert.deepEqual(newWorld(0).facilities.M, []);
  assert.equal(newWorld(0).stats.boughtM, 0n);
  for (let index = 0; index < 40; index += 1) {
    assert.equal(facilityOffer(world, 'M').cost, facilityOffer(world, 'F').cost);
    assert.ok(buyFacility(world, 'M'));
    assert.ok(buyFacility(world, 'F'));
  }
  assert.equal(world.stats.boughtM, 40n);
  assert.equal(facilityOffer(world, 'M').atLimit, true);
  const before = structuredClone(world);
  assert.equal(buyFacility(world, 'M'), false);
  assert.deepEqual(world, before);
  world.tech.miningUpgrade = 50;
  world.tech.fishUpgrade = 50;
  assert.equal(facilityOffer(world, 'M', 0, 10).cost, facilityOffer(world, 'F', 0, 10).cost);
});

test('legacy saves default absent mining fields and preserve earned full-tech receipts', () => {
  const world = newWorld(0, '0123456789abcdef0123456789abcdef');
  world.inventory.C01 = 123456789012345678901234567890n;
  world.quality.C01 = '17';
  world.qualityDraws = 3240n;
  world.taskRewards = ['techLevel1200', 'quality400'];
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  const record = encodeWorldRecord(world);
  delete record.facilities.M;
  delete record.stats.boughtM;
  const loaded = decodeWorldRecord(record);
  assert.deepEqual(loaded.facilities.M, []);
  assert.equal(loaded.stats.boughtM, 0n);
  assert.equal(techOffer(loaded, 'miningYield').level, 0);
  for (const key of ['inventory', 'quality', 'qualityDraws', 'taskRewards', 'accountSeed',
    'lifetimeProductionValue', 'prestigeCredit']) assert.deepEqual(loaded[key], world[key]);
  assert.deepEqual(loaded.facilities.C, world.facilities.C);
  const full = objectives(loaded).long.find(({ id }) => id === 'techLevel1200');
  assert.equal(full.required, 1_762n);
  assert.equal(full.done, true);
  assert.equal(full.rewarded, true);
  assert.equal(settleTaskRewards(loaded).ids.includes('techLevel1200'), false);
  record.facilities.M = null;
  assert.throws(() => decodeWorldRecord(record), { code: 'corrupt-transfer' });
});

test('mine batch upgrades preserve the original yield snapshot and timing', () => {
  const world = fundedWorld();
  assert.ok(buyFacility(world, 'M'));
  assert.ok(buyFacility(world, 'M'));
  world.tech.miningYield = 10;
  assert.ok(assignProductionBatch(world, 'M', [0, 1], 'M05'));
  const original = { ...world.facilities.M[0].batch };
  world.tech.miningYield = 50;
  world.tech.miningCycle = 50;
  const offer = batchUpgradeOffer(world, 'M', [0, 1], 5);
  const before = structuredClone(world);
  assert.equal(upgradeProductionBatch(world, 'M', [0, 1], 5, offer.cost - 1n), false);
  assert.deepEqual(world, before);
  assert.ok(upgradeProductionBatch(world, 'M', [0, 1], 5, offer.cost));
  assert.deepEqual(world.facilities.M[0].batch,
    { ...original, amount: String(facilitySnapshotOutput(original, 6n)) });
  const end = original.end;
  advanceWorld(world, end);
  assert.equal(quantity(world, 'M05'), 2n * facilitySnapshotOutput(original, 6n));
  assert.equal(world.facilities.M[0].batch.facilityYieldBasis, 20000);
  assert.ok(world.facilities.M[0].batch.end - end < original.end - original.start);
  assert.equal(forecastHourlyProduction(world).find(({ id }) => id === 'M05').produced > 0n, true);
});

test('mining processing and refining share stations and refund recorded inputs after upgrades', () => {
  for (const [kind, id] of [['I', 'IM13'], ['P', 'PM14']]) {
    const world = fundedWorld();
    assert.ok(upgradeStation(world, kind, 0, 4));
    const inputs = stationRequirements(world, id, 5n);
    for (const { id: material, needed } of inputs) world.inventory[material] = needed;
    assert.ok(arrangeStation(world, kind, 0, id));
    const batch = world.stations[kind][0].batch;
    assert.equal(BigInt(batch.amount), BigInt(catalog.items[id].output) * stationMultiplier(5n));
    assert.deepEqual(batch.inputs, Object.fromEntries(inputs.map(({ id: material, needed }) => [material, needed])));
    assert.ok(upgradeStation(world, kind, 0, 5));
    assert.equal(world.stations[kind][0].batch, batch);
    assert.ok(clearStation(world, kind, 0));
    for (const { id: material, needed } of inputs) assert.equal(quantity(world, material), needed);
  }
});

test('same-time mining deposits wake shared workshop supply chains', () => {
  const world = fundedWorld();
  assert.ok(buyFacility(world, 'M'));
  assert.ok(assignFacility(world, 'M', 0, 'M01'));
  assert.ok(arrangeStation(world, 'I', 0, 'IM01'));
  assert.equal(world.stations.I[0].batch, null);
  const needed = BigInt(catalog.items.IM01.inputs.M01);
  const output = BigInt(catalog.items.M01.output);
  const harvests = Number((needed + output - 1n) / output);
  advanceWorld(world, harvests * catalog.items.M01.durationMs);
  assert.equal(world.stations.I[0].batch.start, world.clockMs);
  assert.equal(world.stations.I[0].batch.inputs.M01, needed);
  assert.equal(world.stats.produced.M01, BigInt(harvests) * output);
});

test('mining contributes identically to direct and wall-time offline advancement', () => {
  const world = fundedWorld();
  assert.ok(buyFacility(world, 'M'));
  assert.ok(assignFacility(world, 'M', 0, 'M01'));
  assert.ok(arrangeStation(world, 'I', 0, 'IM01'));
  const direct = structuredClone(world);
  const offline = structuredClone(world);
  advanceWorld(direct, 6 * 3_600_000);
  assert.equal(updateWorldWallTime(offline, 6 * 3_600_000), 6 * 3_600_000);
  for (const key of ['inventory', 'stats', 'facilities', 'stations', 'productionValue',
    'lifetimeProductionValue', 'prestigeCredit', 'basicResearchPoints']) {
    assert.deepEqual(offline[key], direct[key]);
  }
});

test('mining tech keeps the seven water-sector budgets, prerequisites and combined speed cap', () => {
  assert.equal(techDefinitions.length, 42);
  assert.equal(techTotalLevels, 1_762);
  const budget = techDefinitions.reduce((sum, { costs }) => sum + costs.reduce((a, b) => a + b, 0n), 0n);
  assert.equal(budget, 6_723_660n);
  const mining = techDefinitions.filter(({ source }) => source === '矿业');
  assert.equal(mining.length, 7);
  for (const definition of mining) assert.equal(definition.maxLevel, 50);
  assert.ok(Object.values(taskResearchPointRewards).reduce((sum, points) => sum + points, 0n) * 100n <= budget * 2n);
  const world = fundedWorld();
  world.researchPoints = budget;
  world.tech.miningYield = 19;
  assert.equal(techOffer(world, 'miningCycle').eligible, false);
  world.tech.miningYield = 20;
  assert.ok(upgradeTech(world, 'miningCycle'));
  world.tech.miningProcessing = 19;
  assert.equal(techOffer(world, 'miningRefining').eligible, false);
  world.tech.miningProcessing = 20;
  assert.ok(upgradeTech(world, 'miningRefining'));
  world.tech = Object.fromEntries(techDefinitions.map(({ key, maxLevel }) => [key, maxLevel]));
  assert.equal(rate(world, 'M05'), 15000);
  assert.equal(rate(world, 'IM13'), 22500);
  assert.equal(rate(world, 'PM14'), 25000);
  const original = catalog.items.PM14.sources;
  try {
    catalog.items.PM14.sources = [...new Set([...original, '畜牧', '水产', '矿业'])];
    assert.equal(rate(world, 'PM14'), 25000);
  } finally {
    catalog.items.PM14.sources = original;
  }
});

test('mining research uses one material handbook and enters the unchanged global quality draw pool', () => {
  assert.equal(miningIds.length, 49);
  const world = fundedWorld();
  world.unlocked = world.unlocked.filter((id) => id !== 'IM13');
  for (const [id, amount] of Object.entries(catalog.research.IM13.costs)) world.inventory[id] = BigInt(amount);
  world.tech.recipeDiscount = 50;
  world.tech.miningResearch = 50;
  const offer = researchOffer(world, 'IM13');
  for (const [id, amount] of offer.costs) assert.equal(amount, (BigInt(catalog.research.IM13.costs[id]) + 1n) / 2n);
  assert.ok(research(world, 'IM13'));
  assert.ok(world.unlocked.includes('IM13'));
  assert.equal(world.quality.IM13, undefined);
  world.basicResearchPoints = 4000n;
  assert.equal(qualityDrawOffer(world).cost, 100n);
  const singles = structuredClone(world);
  const bulk = structuredClone(world);
  for (let i = 0; i < 40; i += 1) assert.ok(drawQuality(singles, 'single'));
  assert.ok(drawQuality(bulk, 'all'));
  assert.deepEqual(bulk.quality, singles.quality);
  assert.equal(bulk.qualityDraws, singles.qualityDraws);
  assert.equal(bulk.accountSeed, singles.accountSeed);
});

test('mining saves and transfers retain quantities, snapshots, random sequence and receipts', async (t) => {
  globalThis.indexedDB = new IDBFactory();
  const db = await openWorldSave();
  t.after(() => db.close());
  const world = fundedWorld();
  for (const id of miningIds) world.inventory[id] = 10n ** 30n;
  world.quality.M01 = '9';
  world.qualityDraws = 42n;
  world.tech.miningYield = 20;
  assert.ok(buyFacility(world, 'M'));
  assert.ok(assignFacility(world, 'M', 0, 'M05'));
  assert.ok(arrangeStation(world, 'I', 0, 'IM13'));
  assert.ok(arrangeStation(world, 'P', 0, 'PM14'));
  settleTaskRewards(world);
  world.revision = await writeWorldSave(db, world);
  const loaded = await readWorldSave(db);
  assert.deepEqual(loaded.inventory, world.inventory);
  assert.deepEqual(loaded.facilities, world.facilities);
  assert.deepEqual(loaded.stations, world.stations);
  assert.deepEqual(loaded.taskRewards, world.taskRewards);
  const transfer = createSaveTransfer({ browser: {} });
  const restored = transfer.resolveCandidate(transfer.inspectSave(transfer.exportWorld(loaded).text));
  assert.deepEqual(restored, loaded);
});

test('mine tasks follow successful operations once and farm handoff clears mines without losing history', () => {
  const world = fundedWorld();
  assert.ok(buyFacility(world, 'M'));
  assert.ok(upgradeFacility(world, 'M', 0, 4));
  assert.ok(assignFacility(world, 'M', 0, 'M01'));
  advanceWorld(world, world.facilities.M[0].batch.end);
  const reward = settleTaskRewards(world);
  for (const id of ['miningIntro', 'collectMining', 'miningUpgrade', 'miningTop']) {
    assert.ok(reward.ids.includes(id));
  }
  assert.equal(reward.ids.includes('buildMine'), false);
  assert.deepEqual(settleTaskRewards(world).ids, []);
  assert.ok(buyFacility(world, 'M'));
  assert.deepEqual(settleTaskRewards(world).ids, ['buildMine']);
  assert.deepEqual(settleTaskRewards(world).ids, []);
  const recipe = 'PM21';
  for (const { id, needed } of stationRequirements(world, recipe, 1n)) world.inventory[id] = needed;
  assert.ok(arrangeStation(world, 'P', 0, recipe));
  assert.deepEqual(settleTaskRewards(world).ids, []);
  advanceWorld(world, world.stations.P[0].batch.end);
  assert.deepEqual(settleTaskRewards(world).ids, ['firstMixedProduct']);
  assert.deepEqual(settleTaskRewards(world).ids, []);
  const history = structuredClone(world.stats);
  const receipt = [...world.taskRewards];
  const value = world.lifetimeProductionValue;
  const offer = farmSaleOffer(world);
  assert.equal(offer.mineCount, 2);
  assert.ok(buyFacility(world, 'M'));
  assert.equal(sellFarm(world, offer), false);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.deepEqual(world.facilities.M, []);
  assert.deepEqual(world.inventory, {});
  assert.equal(world.stats.boughtM, history.boughtM + 1n);
  assert.deepEqual(world.taskRewards, receipt);
  assert.equal(world.lifetimeProductionValue, value);
  assert.ok(world.unlocked.includes('M01'));
});
