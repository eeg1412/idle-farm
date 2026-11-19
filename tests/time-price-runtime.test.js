import test from 'node:test';
import assert from 'node:assert/strict';
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import {
  research, researchOffer, techDefinitions, techTotalLevels, techOffer, unitPrice, upgradeTech,
} from '../src/game/advancement.js';
import { drawQuality, qualityDrawOffer } from '../src/game/quality.js';
import { objectives, settleTaskRewards, taskResearchPointRewards } from '../src/game/objectives.js';
import { integerSquareRoot } from '../src/game/prestige-ledger.js';
import { localCalendarDay } from '../src/game/market.js';
import {
  advanceWorld, arrangeStation, assignFacility, buyFacility, buyStation, catalog, clearStation, facilityOffer, farmSaleOffer,
  forecastHourlyProduction, newWorld, sell, sellFarm, stationRequirements, stationUpgradeOffer, tradeOffer, updateWorldWallTime,
  synchronizeWorldCalendar, upgradeFacility, upgradeStation,
} from '../src/game/world.js';

const coinScale = BigInt(economyScale.coinScale);
const wheatPrice = 30n * coinScale;
const qualityTwoWheatPrice = 33n * coinScale;
const pointCost = integerSquareRoot(1_000_000n ** 2n * coinScale);
const activityRoot = (value) => integerSquareRoot(49n * value);

function beginWheat() {
  const world = newWorld(0);
  for (const index of [0, 1]) assert.ok(assignFacility(world, 'C', index, 'C01'));
  return world;
}

function beginFlour() {
  const world = beginWheat();
  advanceWorld(world, 12_000);
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  advanceWorld(world, 26_000);
  assert.deepEqual(settleTaskRewards(world).ids, ['firstHarvest', 'firstFlour']);
  return world;
}

test('the first warehouse sale grants exactly one advanced point and leaves ordinary points unchanged', () => {
  const world = beginWheat();
  advanceWorld(world, 12_000);
  assert.equal(world.inventory.C01, 4n);
  assert.equal(world.productionValue, 4n * wheatPrice);
  settleTaskRewards(world);
  assert.equal(world.coins, 940n * coinScale);
  assert.equal(world.researchPoints, 0n);
  const quote = tradeOffer(world, 'C01', 25);
  assert.deepEqual([quote.count, quote.gain], [1n, wheatPrice]);
  assert.equal(sell(world, 'C01', 25, { ...quote, price: wheatPrice + 1n }), false);
  assert.deepEqual(settleTaskRewards(world).ids, []);
  assert.ok(sell(world, 'C01', 25, quote));
  assert.equal(world.researchPoints, 0n);
  assert.deepEqual(settleTaskRewards(world), { ids: ['firstSale'], coins: 710n * coinScale, researchPoints: 1n });
  assert.equal(world.coins, 1_680n * coinScale);
  assert.equal(world.researchPoints, 1n);
  assert.equal(world.lifetimeProductionValue, 4n * wheatPrice);
  assert.equal(world.prestigeCredit, activityRoot(4n * wheatPrice) * 10_000n);
  assert.deepEqual(settleTaskRewards(world), { ids: [], coins: 0n, researchPoints: 0n });

  assert.equal(world.basicResearchPoints, 0n);
  assert.equal(qualityDrawOffer(world).affordable, false);
  const staleSale = tradeOffer(world, 'C01', 100);
  world.quality.C01 = '2';
  assert.equal(unitPrice(world, 'C01'), qualityTwoWheatPrice);
  assert.equal(world.facilities.C[0].batch.amount, '2');
  assert.equal(facilityOffer(world, 'C', 0).currentNextOutput, 2n);
  const afterQuality = structuredClone(world);
  assert.equal(sell(world, 'C01', 100, staleSale), false);
  assert.deepEqual(world, afterQuality);
  assert.equal(world.productionValue, 4n * wheatPrice);
  const latest = tradeOffer(world, 'C01', 100);
  assert.ok(sell(world, 'C01', 100, latest));
  assert.equal(world.stats.lifetimeRevenue, wheatPrice + 3n * qualityTwoWheatPrice);
  assert.equal(settleTaskRewards(world).researchPoints, 0n);
  assert.deepEqual(world.taskRewards, ['firstHarvest', 'firstSale']);
});

test('six draws are deterministic when submitted together and stale or unavailable quotes make no changes', () => {
  const world = newWorld(0, '0123456789abcdef0123456789abcdef');
  world.basicResearchPoints = 650n;
  world.quality = { C01: '7', I01: '3' };
  world.inventory = { C01: 5n, I01: 8n };
  const all = qualityDrawOffer(world, 'all');
  assert.deepEqual(all, { mode: 'all', count: 6n, cost: 600n, sequence: 0n, affordable: true });
  const before = structuredClone(world);
  for (const mode of [0n, -1n, 1, '3', 'C01']) {
    assert.equal(qualityDrawOffer(world, mode), null);
    assert.equal(drawQuality(world, mode), false);
  }
  assert.equal(drawQuality(world, 'all', { ...all, cost: 700n }), false);
  assert.deepEqual(world, before);
  const sequential = structuredClone(world);
  for (let step = 0; step < 6; step += 1) assert.ok(drawQuality(sequential));
  assert.equal(drawQuality(sequential, 'all', all), false);
  const result = drawQuality(world, 'all', all);
  assert.equal(result.count, 6n);
  assert.equal(Object.values(result.gains).reduce((sum, n) => sum + n, 0n), 6n);
  assert.deepEqual(world, sequential);
  assert.deepEqual([world.basicResearchPoints, world.qualityDraws, world.coins, world.researchPoints],
    [50n, 6n, before.coins, before.researchPoints]);
  assert.deepEqual(world.inventory, before.inventory);
  assert.equal(drawQuality(world), false);
  assert.equal(qualityDrawOffer({ ...before, unlocked: [] }).affordable, false);
  assert.ok(settleTaskRewards(world).ids.includes('qualityCollection'));
  assert.equal(settleTaskRewards(world).ids.includes('qualityCollection'), false);
});

test('a facility-level upgrade applies only its multiplier to the current batch snapshot', () => {
  const world = newWorld(0);
  world.coins = 30_000_000n * coinScale;
  world.researchPoints = 200_000n;
  world.tech.cropYield = 12;
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  advanceWorld(world, 1_000);
  assert.ok(upgradeTech(world, 'cropYield'));
  world.quality.C01 = '2';
  const slot = world.facilities.C[0];
  const early = { id: 'C01', amount: '2', yieldBase: '2', facilityYieldBasis: 12_400, start: 0, end: 12_000 };
  assert.deepEqual(slot.batch, early);
  const quote = facilityOffer(world, 'C', 0);
  assert.deepEqual([quote.currentOutput, quote.output, quote.currentNextOutput, quote.nextOutput], [2n, 4n, 2n, 5n]);
  assert.ok(upgradeFacility(world, 'C', 0));
  assert.deepEqual(slot.batch, { ...early, amount: '4' });
  assert.ok(upgradeFacility(world, 'C', 0, 7n));
  assert.deepEqual(slot.batch, { ...early, amount: '24' });
  advanceWorld(world, early.end);
  assert.equal(world.stats.produced.C01, 24n);
  assert.equal(world.productionValue, 24n * qualityTwoWheatPrice);
  assert.equal(world.lifetimeProductionValue, 24n * qualityTwoWheatPrice);
  assert.deepEqual(slot.batch, { id: 'C01', amount: '25', yieldBase: '2', facilityYieldBasis: 12_600, start: 12_000, end: 24_000 });
  assert.deepEqual(slot.planting, { id: 'C01', start: 0, duration: 12_000 });
});

test('workshop upgrades affect the forecast and next batch while preserving the running batch', () => {
  const world = newWorld(0);
  world.coins = 1_000_000n * coinScale;
  world.researchPoints = 1_000n;
  world.inventory.C01 = 20n;
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const original = { id: 'I01', amount: '12', start: 0, end: 14_000, inputs: { C01: 2n } };
  const slot = world.stations.I[0];
  assert.deepEqual(slot.batch, original);
  assert.ok(upgradeTech(world, 'workshopSpeed'));
  world.quality.I01 = '2';
  const quote = stationUpgradeOffer(world, 'I', 0);
  assert.deepEqual([quote.currentOutput, quote.output, quote.durationMs], [12n, 24n, 13_726]);
  assert.ok(upgradeStation(world, 'I', 0));
  const duration = 13_726n;
  const hourly = (count) => (count * 360_000_000n + duration / 2n) / duration;
  assert.deepEqual(forecastHourlyProduction(world), [
    { id: 'I01', produced: hourly(24n), consumed: 0n, net: hourly(24n) },
    { id: 'C01', produced: 0n, consumed: hourly(4n), net: -hourly(4n) },
  ]);
  assert.deepEqual(stationRequirements(world, 'I01', 2n), [{ id: 'C01', owned: 18n, needed: 4n }]);
  assert.deepEqual(slot.batch, original);
  const canceled = structuredClone(world);
  assert.ok(clearStation(canceled, 'I', 0));
  assert.equal(canceled.inventory.C01, 20n);
  assert.equal(canceled.stations.I[0].batch, null);
  assert.equal(canceled.productionValue, 0n);
  advanceWorld(world, original.end);
  assert.equal(world.inventory.I01, 12n);
  assert.equal(world.inventory.C01, 14n);
  assert.deepEqual(slot.batch, { id: 'I01', amount: '24', start: 14_000, end: 27_726, inputs: { C01: 4n } });
});

test('starting resources fund bread, the first barn, and the first pond at the expected times', () => {
  const bread = beginFlour();
  assert.equal(bread.coins, 1_330n * coinScale);
  assert.equal(bread.inventory.I01, 12n);
  assert.equal(bread.inventory.C01, 4n);
  assert.ok(research(bread, 'P01'));
  assert.ok(arrangeStation(bread, 'P', 0, 'P01'));
  advanceWorld(bread, 56_999);
  assert.equal(bread.stats.produced.P01, undefined);
  advanceWorld(bread, 57_000);
  assert.equal(bread.stats.produced.P01, 1n);
  assert.deepEqual(settleTaskRewards(bread).ids, ['breadRecipe', 'firstBread']);

  for (const [kind, id, researchAt, collectionAt, receipt] of [
    ['L', 'L01', 26_000, 56_000, 'collectLivestock'],
    ['F', 'F01', 36_000, 78_000, 'collectFish'],
  ]) {
    const world = beginFlour();
    assert.ok(clearStation(world, 'I', 0));
    advanceWorld(world, researchAt);
    assert.ok(research(world, id));
    assert.ok(buyFacility(world, kind));
    assert.ok(assignFacility(world, kind, 0, id));
    advanceWorld(world, collectionAt - 1);
    assert.equal(world.stats.produced[id], undefined);
    advanceWorld(world, collectionAt);
    assert.equal(world.stats.produced[id], BigInt(catalog.items[id].output));
    assert.ok(settleTaskRewards(world).ids.includes(receipt));
  }
});

test('the first cross-sector product can be supplied from the starter farm within ten minutes', () => {
  const world = beginFlour();
  assert.ok(clearStation(world, 'I', 0));
  assert.ok(research(world, 'L01'));
  assert.ok(buyFacility(world, 'L'));
  assert.ok(assignFacility(world, 'L', 0, 'L01'));
  advanceWorld(world, 56_000);
  assert.ok(settleTaskRewards(world).ids.includes('collectLivestock'));
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  advanceWorld(world, 60_000);
  assert.ok(research(world, 'L02'));
  assert.ok(buyFacility(world, 'L'));
  assert.ok(assignFacility(world, 'L', 1, 'L02'));
  advanceWorld(world, 116_000);
  assert.ok(research(world, 'IL01'));
  assert.ok(buyStation(world, 'I'));
  assert.ok(arrangeStation(world, 'I', 1, 'IL01'));
  advanceWorld(world, 146_000);
  assert.ok(research(world, 'IL02'));
  advanceWorld(world, 212_000);
  assert.ok(settleTaskRewards(world).ids.includes('firstLivestockProcessing'));
  advanceWorld(world, 224_000);
  assert.equal(world.inventory.I01, 156n);
  assert.ok(arrangeStation(world, 'I', 0, 'IL02'));
  advanceWorld(world, 319_000);
  assert.ok(research(world, 'PD01'));
  assert.ok(arrangeStation(world, 'P', 0, 'PD01'));
  assert.deepEqual(world.stations.P[0].batch.inputs, { I01: 2n, IL01: 2n, IL02: 2n });
  advanceWorld(world, 550_000);
  assert.equal(world.stats.produced.PD01, 1n);
  assert.ok(settleTaskRewards(world).ids.includes('firstMixedProduct'));
  assert.ok(world.coins > 0n && Object.values(world.inventory).every((amount) => amount >= 0n));
});

test('6, 12, 24, 48 and 72-hour offline caps match repeated live ticks with wheat, flour and bread moving through the chain', () => {
  const start = beginFlour();
  assert.ok(research(start, 'P01'));
  assert.ok(arrangeStation(start, 'P', 0, 'P01'));
  for (const [level, hours] of [[0, 6], [10, 12], [20, 24], [35, 48], [50, 72]]) {
    const online = structuredClone(start);
    const offline = structuredClone(start);
    online.tech.delegation = offline.tech.delegation = level;
    const limit = hours * 3_600_000;
    const late = limit * 2;
    for (let hour = 1; hour <= hours; hour += 1) {
      advanceWorld(online, online.clockMs + 3_600_000);
      online.wallAnchorMs = hour * 2 * 3_600_000;
      synchronizeWorldCalendar(online, online.wallAnchorMs);
    }
    assert.equal(updateWorldWallTime(offline, late), limit);
    assert.equal(offline.wallAnchorMs, late);
    assert.equal(updateWorldWallTime(offline, late), 0);
    assert.equal(offline.merchant.day, localCalendarDay(late));
    assert.deepEqual({ ...offline, market: null }, { ...online, market: null });
    assert.equal(offline.basicResearchPoints, BigInt(hours) * 100n);
    const produced = offline.stats.produced;
    const wheat = 4n * BigInt(Math.floor(offline.clockMs / 12_000));
    const flourBatches = BigInt(Math.floor((offline.clockMs - 12_000) / 14_000));
    const bread = BigInt(Math.floor((offline.clockMs - 26_000) / 31_000));
    assert.deepEqual(produced, { C01: wheat, I01: 12n * flourBatches, P01: bread });
    assert.equal(offline.inventory.C01, wheat - 3n - 2n * (flourBatches + 1n));
    assert.equal(offline.inventory.I01, 12n * flourBatches - 8n - 2n * (bread + 1n));
    assert.equal(offline.inventory.P01, bread);
  }
});

test('activity credits settle once at farm sale, keep their remainder and carry quality across runs', () => {
  const world = beginWheat();
  advanceWorld(world, 7_200_000);
  const productionValue = 2_400n * wheatPrice;
  const credit = activityRoot(productionValue) * 10_000n;
  const remainder = credit - 18n * pointCost;
  assert.equal(world.lifetimeProductionValue, productionValue);
  assert.equal(world.prestigeCredit, credit);
  assert.equal(world.researchPoints, 0n);
  const offer = farmSaleOffer(world);
  assert.equal(offer.reward, 18n);
  assert.ok(sellFarm(world, offer));
  assert.equal(world.researchPoints, 18n);
  assert.equal(world.prestigeCredit, remainder);
  assert.equal(sellFarm(world, offer), false);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(world.researchPoints, 18n);
  assert.equal(world.prestigeCredit, remainder);
  assert.equal(world.lifetimeProductionValue, productionValue);

  assert.ok(drawQuality(world));
  const quality = { ...world.quality };
  assert.equal(world.basicResearchPoints, 100n);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.deepEqual(world.quality, quality);
  assert.equal(world.qualityDraws, 1n);
  assert.equal(world.basicResearchPoints, 100n);
  assert.equal(world.researchPoints, 18n);
  assert.deepEqual(world.facilities.C, [
    { level: '1', recipe: null, batch: null },
    { level: '1', recipe: null, batch: null },
  ]);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  assert.equal(world.facilities.C[0].batch.amount, '2');
});

test('later completions use the current price and appraisal without revaluing earlier contributions', () => {
  const world = newWorld(0);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  const originalValue = 2n * wheatPrice;
  const originalCredit = activityRoot(originalValue) * 10_000n;
  advanceWorld(world, 12_000);
  assert.deepEqual([world.productionValue, world.lifetimeProductionValue, world.prestigeCredit], [originalValue, originalValue, originalCredit]);
  world.coins = 1_000n * coinScale;
  world.researchPoints = 51n;
  world.quality.C01 = '2';
  assert.ok(upgradeTech(world, 'appraisal'));
  assert.deepEqual([world.productionValue, world.lifetimeProductionValue, world.prestigeCredit], [originalValue, originalValue, originalCredit]);
  const creditAt = (value) => originalCredit + (activityRoot(value) - activityRoot(originalValue)) * 10_200n;
  advanceWorld(world, 24_000);
  const valueAt24 = originalValue + 2n * qualityTwoWheatPrice;
  assert.deepEqual([world.productionValue, world.lifetimeProductionValue, world.prestigeCredit], [valueAt24, valueAt24, creditAt(valueAt24)]);
  advanceWorld(world, 48_000);
  const valueAt48 = originalValue + 6n * qualityTwoWheatPrice;
  assert.deepEqual([world.productionValue, world.lifetimeProductionValue, world.prestigeCredit], [valueAt48, valueAt48, creditAt(valueAt48)]);
  assert.equal(world.researchPoints, 1n);
  assert.equal(farmSaleOffer(world).reward, 1n);
});

test('research discounts only the generated physical costs and a declined quote has no side effects', () => {
  const world = newWorld(0);
  const full = researchOffer(world, 'P01');
  const coins = BigInt(catalog.research.P01.coins);
  assert.deepEqual([full.coins, full.costs], [coins, [['C01', 3n], ['I01', 8n]]]);
  world.tech.recipeDiscount = 50;
  world.coins = coins - 1n;
  world.inventory = { C01: 2n, I01: 4n };
  const discounted = researchOffer(world, 'P01');
  assert.deepEqual([discounted.coins, discounted.costs], [coins, [['C01', 2n], ['I01', 4n]]]);
  const before = structuredClone(world);
  assert.equal(research(world, 'constructor'), false);
  assert.equal(research(world, 'P01'), false);
  assert.deepEqual(world, before);
  world.coins = coins;
  world.inventory.I01 = 3n;
  const shortMaterials = structuredClone(world);
  assert.equal(research(world, 'P01'), false);
  assert.deepEqual(world, shortMaterials);
  world.inventory.I01 = 4n;
  assert.ok(research(world, 'P01'));
  assert.deepEqual(world.inventory, { C01: 0n, I01: 0n });
  assert.equal(world.coins, 0n);
  assert.equal(world.researchPoints, 0n);
});

test('per-technology costs use exact segment quotas, prerequisites and task scope', () => {
  const world = newWorld(0);
  world.researchPoints = 5_823_060n;
  assert.equal(techDefinitions.length, 35);
  assert.equal(techTotalLevels, 1_494);
  assert.equal(techOffer(world, 'qualityDiscount'), null);
  assert.equal(upgradeTech(world, 'fishQuality'), false);
  assert.equal(upgradeTech(world, 'livestockYield'), false);
  assert.equal(upgradeTech(world, 'fishYield'), false);
  assert.equal(upgradeTech(world, 'miningYield'), false);
  assert.equal(upgradeTech(world, 'livestockCycle'), false);
  assert.equal(upgradeTech(world, 'fishRefining'), false);
  assert.equal(upgradeTech(world, 'miningCycle'), false);
  assert.equal(upgradeTech(world, 'miningRefining'), false);
  assert.equal(researchOffer(world, 'P01').eligible, true);
  for (const id of ['C02', 'L01', 'L05', 'PL01', 'F01', 'F05', 'PF01', 'M01', 'M05', 'PM01']) world.unlocked.push(id);
  world.quality.C01 = '400';
  world.tech.livestockQuality = 50;
  assert.equal(objectives(world).long.find(({ id }) => id === 'techLevel1200').current, 0n);
  for (const key of ['cropYield', 'livestockYield', 'fishYield', 'miningYield']) {
    const offer = techOffer(world, key);
    assert.equal(offer.eligible, true);
    assert.equal(offer.cost, 150n);
    assert.deepEqual([offer.effect.current, offer.effect.next], [0, 2]);
  }
  for (const [key, prerequisite, item] of [
    ['livestockCycle', 'livestockYield', 'L05'], ['livestockRefining', 'livestockProcessing', 'PL01'],
    ['fishCycle', 'fishYield', 'F05'], ['fishRefining', 'fishProcessing', 'PF01'],
    ['miningCycle', 'miningYield', 'M05'], ['miningRefining', 'miningProcessing', 'PM01'],
  ]) {
    world.tech[prerequisite] = 19;
    assert.equal(techOffer(world, key).eligible, false);
    world.tech[prerequisite] = 20;
    assert.equal(techOffer(world, key).eligible, true);
    world.unlocked = world.unlocked.filter((id) => id !== item);
    assert.equal(techOffer(world, key).eligible, false);
    world.unlocked.push(item);
    delete world.tech[prerequisite];
  }
  const sum = (values) => values.reduce((a, b) => a + b, 0n);
  const marketCosts = {
    marketForecast: [60n],
    marketManipulation: [50n, 450n, 2_500n],
    marketPromotion: [30n, 50n, 80n, 160n, 300n, 580n, 1_100n, 1_800n, 2_500n, 3_400n],
    premiumSales: [40n, 60n, 90n, 210n, 400n, 800n, 1_500n, 2_400n, 3_500n, 6_000n],
    merchantRestock: [30n, 50n, 80n, 160n, 300n, 580n, 1_100n, 1_800n, 2_500n, 3_400n],
    merchantBargaining: [40n, 60n, 90n, 210n, 400n, 800n, 1_500n, 2_400n, 3_500n, 6_000n],
  };
  const miningBudgets = {
    miningBuy: 125_000n, miningUpgrade: 125_000n, miningYield: 420_000n,
    miningResearch: 125_000n, miningProcessing: 100_000n, miningCycle: 230_000n, miningRefining: 230_000n,
  };
  for (const { key, maxLevel, budget, costs, baseCost = 25n } of techDefinitions) {
    if (Object.hasOwn(miningBudgets, key)) {
      assert.equal(budget, miningBudgets[key], key);
      assert.equal(maxLevel, 50, key);
    }
    assert.equal(sum(costs), budget, key);
    for (let index = 1; index < costs.length; index += 1) assert.ok(costs[index] > costs[index - 1], key);
    if (maxLevel === 50) {
      const firstTen = Array.from({ length: 10 }, (_, i) =>
        key === 'delegation' && i === 0 ? 15n : baseCost / 25n * BigInt(25 + 5 * i + i * i));
      assert.deepEqual(costs.slice(0, 10), firstTen, key);
      const middle = (budget - sum(firstTen)) / 4n;
      assert.equal(sum(costs.slice(10, 30)), middle, key);
      for (const [offset, quota] of [[10, middle], [30, budget - sum(firstTen) - middle]]) {
        const previous = costs[offset - 1];
        const extra = quota - 20n * previous - 210n;
        const tail = extra % 210n;
        for (let i = 1; i <= 20; i += 1) {
          const expected = previous + BigInt(i) + BigInt(i) * (extra / 210n) + tail / 20n +
            (BigInt(i) > 20n - tail % 20n ? 1n : 0n);
          assert.equal(costs[offset + i - 1], expected, key + ' ' + (offset + i));
        }
      }
    }
    if (Object.hasOwn(marketCosts, key)) assert.deepEqual(costs, marketCosts[key], key);
    for (let level = 0; level < maxLevel; level += 1) {
      const before = world.researchPoints;
      assert.ok(upgradeTech(world, key), key);
      assert.equal(world.researchPoints, before - costs[level], key);
    }
    assert.equal(techOffer(world, key).maxed, true);
    assert.equal(upgradeTech(world, key), false);
  }
  assert.equal(world.researchPoints, 0n);
  const tasks = objectives(world);
  assert.equal(tasks.guide.length, 16);
  assert.equal(tasks.long.length, 38);
  assert.equal(tasks.long.find(({ id }) => id === 'techLevel1200').current, 1_494n);
  assert.equal(tasks.long.find(({ id }) => id === 'techLevel1200').done, true);
  world.stats.sold = 1n;
  assert.equal(objectives(world).guide.length, 35);
  assert.equal(Object.values(taskResearchPointRewards).reduce((total, amount) => total + amount, 0n), 40_152n);
});
