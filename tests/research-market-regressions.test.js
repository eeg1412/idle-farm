import test from 'node:test';
import assert from 'node:assert/strict';
import { accountRandom } from '../src/game/account-random.js';
import { researchHourMs as hour, techDefinitions, techOffer, unitPrice, upgradeTech } from '../src/game/advancement.js';
import {
  localCalendarDay, marketForecast, marketIsActive, marketRate, marketResetsRemaining, marketUnitPrice, resetMarket,
  synchronizeMarket,
} from '../src/game/market.js';
import { objectives, settleTaskRewards } from '../src/game/objectives.js';
import { drawQuality } from '../src/game/quality.js';
import { qualityDrawTaskTargets } from '../src/game/quality-tasks.js';
import {
  advanceWorld, assignFacility, catalog, farmSaleOffer, newWorld, sellBatch, sellFarm, tradeOffer, updateWorldWallTime,
} from '../src/game/world.js';
import { decodeWorldRecord, encodeWorldRecord, initializeAccountSeed } from '../src/platform/world-save.js';

const seed = '0123456789abcdef0123456789abcdef';
const day = '2026-11-17';
const wall = new Date(2026, 10, 17, 12).getTime();

test('ordinary points combine projected, online and clipped offline time with weighted carry', () => {
  const world = newWorld(wall, seed);
  const projected = structuredClone(world);
  advanceWorld(projected, hour);
  assert.equal(projected.basicResearchPoints, 100n);
  assert.equal(world.basicResearchPoints, 0n);
  advanceWorld(world, hour / 2);
  world.wallAnchorMs += hour / 2;
  assert.equal(world.basicResearchPoints, 0n);
  world.researchPoints = techOffer(world, 'basicResearchRate').cost;
  assert.ok(upgradeTech(world, 'basicResearchRate'));
  assert.equal(updateWorldWallTime(world, wall + hour / 2), 0);
  assert.equal(updateWorldWallTime(world, wall + hour), hour / 2);
  assert.equal(world.basicResearchPoints, 102n);
  assert.equal(world.basicResearchElapsedMs, 0);
  advanceWorld(world, hour + 1);
  assert.equal(world.basicResearchWeightedMs, 104n);
  world.tech.basicResearchRate = 0;
  advanceWorld(world, 2 * hour);
  assert.equal(world.basicResearchPoints, 202n);
  assert.equal(world.basicResearchWeightedMs, 4n);
  advanceWorld(world, 2 * hour + 123);
  const carried = (value) => [value.basicResearchElapsedMs, value.basicResearchWeightedMs];
  assert.deepEqual(carried(world), [123, 12_304n]);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.deepEqual(carried(world), [123, 12_304n]);
  const nextWall = wall + 50 * hour;
  assert.equal(updateWorldWallTime(world, nextWall), 6 * hour);
  assert.equal(world.basicResearchPoints, 802n);
  assert.equal(updateWorldWallTime(world, nextWall), 0);
  assert.equal(updateWorldWallTime(world, wall), 0);
  assert.deepEqual(carried(world), [123, 12_304n]);
});

test('old records keep previous receipts and qualities while market and ordinary progress migrate from defaults', () => {
  const world = newWorld(wall, seed);
  world.quality.C01 = '400';
  world.researchPoints = 190n;
  world.tech = Object.fromEntries(techDefinitions.slice(0, 21).map(({ key }) => [key, 50]));
  const completed = [...Object.keys(qualityDrawTaskTargets), 'techLevel1200'];
  world.taskRewards = completed;
  const old = encodeWorldRecord(world);
  for (const key of ['accountSeed', 'market', 'basicResearchPoints', 'basicResearchElapsedMs', 'basicResearchWeightedMs', 'qualityDraws']) {
    delete old[key];
  }

  const imported = decodeWorldRecord(old);
  assert.deepEqual([imported.quality, imported.researchPoints, imported.tech], [world.quality, world.researchPoints, world.tech]);
  assert.deepEqual([imported.basicResearchPoints, imported.basicResearchElapsedMs, imported.basicResearchWeightedMs, imported.qualityDraws,
    imported.accountSeed, imported.market], [0n, 0, 0n, 0n, null, null]);
  imported.wallAnchorMs = wall + 2 * hour;
  assert.equal(updateWorldWallTime(imported, wall + 2 * hour), 0);
  assert.equal(imported.basicResearchPoints, 0n);
  for (const task of objectives(imported).long.filter(({ id }) => completed.includes(id))) {
    assert.deepEqual([task.done, task.rewarded, task.current >= task.required], [true, true, true]);
  }
  assert.ok(settleTaskRewards(imported).ids.every((id) => !completed.includes(id)));
  const assigned = initializeAccountSeed(imported);
  assert.match(assigned, /^[a-f0-9]{32}$/);
  assert.equal(initializeAccountSeed(imported), assigned);
  assert.equal(decodeWorldRecord(encodeWorldRecord(imported)).accountSeed, assigned);
  for (const change of [
    { basicResearchElapsedMs: hour }, { basicResearchWeightedMs: '-1' }, { qualityDraws: 2 },
    { accountSeed: 'invalid' }, { tech: { marketManipulation: 4 } }, { tech: { marketForecast: 2 } },
    { market: { day: '2026-11-31', sequence: 0, used: 0, rates: null } },
  ]) assert.throws(() => decodeWorldRecord({ ...old, ...change }), { code: 'corrupt-transfer' });
});

test('full technology pays at 1474 only once and preserves an older receipt', () => {
  const fullTechId = 'techLevel1200';
  const world = newWorld(wall, seed);
  world.tech = Object.fromEntries(techDefinitions.map(({ key, maxLevel }) => [key, maxLevel]));
  world.tech.premiumSales -= 1;
  world.researchPoints = techOffer(world, 'premiumSales').cost;
  assert.ok(!settleTaskRewards(world).ids.includes(fullTechId));
  const before = world.coins;
  assert.ok(upgradeTech(world, 'premiumSales'));
  assert.deepEqual(settleTaskRewards(world), { ids: [fullTechId], coins: 7_000_000n, researchPoints: 0n });
  assert.equal(world.coins - before, 7_000_000n);
  assert.equal(settleTaskRewards(world).coins, 0n);

  const old = encodeWorldRecord(world);
  delete old.tech.marketPromotion;
  delete old.tech.premiumSales;
  old.coins = String(before + 6_900_000n);
  const imported = decodeWorldRecord(old);
  const goal = objectives(imported).long.find(({ id }) => id === fullTechId);
  assert.deepEqual([goal.done, goal.rewarded], [true, true]);
  assert.equal(settleTaskRewards(imported).coins, 0n);
  assert.equal(imported.coins, before + 6_900_000n);
});

test('quality selection has its own stream and ignores candidate unlock order', () => {
  const left = newWorld(wall, seed);
  left.basicResearchPoints = 300n;
  left.unlocked.push('P01', 'C02');
  left.quality = { C01: '6', I01: '3' };
  const right = structuredClone(left);
  right.unlocked.reverse();
  right.productionValue = 100_000n;
  right.tech.marketManipulation = 1;
  synchronizeMarket(right, day);
  assert.ok(resetMarket(right, day, 0));
  assert.deepEqual(drawQuality(left, 'all'), drawQuality(right, 'all'));
  assert.deepEqual(left.quality, right.quality);
});

test('a market snapshot uses three full random rounds and distinct uniformly sampled item slots', () => {
  const world = newWorld(wall, seed);
  world.productionValue = 100_000n;
  world.unlocked = Object.keys(catalog.items).slice(0, 100).reverse();
  synchronizeMarket(world, day);
  const sorted = [...world.unlocked].sort();
  const random = accountRandom(seed, 'market:' + day, 0);
  const picked = [];
  for (let i = 0; i < 10; i += 1) {
    const from = i + Number(random(BigInt(sorted.length - i)));
    [sorted[i], sorted[from]] = [sorted[from], sorted[i]];
    picked.push(sorted[i]);
  }
  const directions = picked.map(() => random(10_000n));
  const magnitudes = picked.map(() => {
    const ticket = Number(random(19n));
    return ticket === 0 ? 0 : (Math.floor((ticket - 1) / 2) + 1) * 10;
  });
  const expected = (threshold, scale) => Object.fromEntries(picked.map((id, i) => {
    const magnitude = magnitudes[i];
    if (magnitude === 0) return [id, 0];
    return [id, directions[i] < threshold ? Math.round(magnitude * scale / 90) : -magnitude];
  }));
  assert.deepEqual(world.market.rates, expected(5_000n, 90));
  assert.equal(new Set(Object.keys(world.market.rates)).size, 10);
  for (const [tech, threshold, scale] of [
    [{ marketPromotion: 10 }, 6_000n, 90],
    [{ premiumSales: 10 }, 5_000n, 200],
    [{ marketPromotion: 10, premiumSales: 10 }, 6_000n, 200],
  ]) {
    const modified = { ...world, market: null, tech };
    synchronizeMarket(modified, day);
    assert.deepEqual(modified.market.rates, expected(threshold, scale));
  }
  const interleaved = accountRandom(seed, 'market:' + day, 0);
  const oldOrder = [...world.unlocked].sort();
  const old = {};
  for (let i = 0; i < 10; i += 1) {
    const j = i + Number(interleaved(BigInt(oldOrder.length - i)));
    [oldOrder[i], oldOrder[j]] = [oldOrder[j], oldOrder[i]];
    const direction = interleaved(10_000n) < 5_000n ? 1 : -1;
    old[oldOrder[i]] = direction * Math.ceil(Number(interleaved(19n)) / 2) * 10 || 0;
  }
  assert.notDeepEqual(world.market.rates, old);
});

test('market upgrades preserve the first board through handover and affect only future boards', () => {
  const world = newWorld(wall, seed);
  world.unlocked = Object.keys(catalog.items);
  world.productionValue = 99_700n;
  world.tech = { marketForecast: 1, marketManipulation: 1, marketPromotion: 9, premiumSales: 9 };
  world.researchPoints = techOffer(world, 'marketPromotion').cost + techOffer(world, 'premiumSales').cost;
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  const fullyUpgraded = structuredClone(world);
  assert.ok(upgradeTech(fullyUpgraded, 'marketPromotion'));
  assert.ok(upgradeTech(fullyUpgraded, 'premiumSales'));
  const finishedAt = wall + 12_000;
  updateWorldWallTime(fullyUpgraded, finishedAt);

  // The action boundary advances and snapshots before mutating technology.
  updateWorldWallTime(world, finishedAt);
  assert.equal(world.productionValue, 100_000n);
  const first = world.market;
  assert.notDeepEqual(first.rates, fullyUpgraded.market.rates);
  assert.ok(upgradeTech(world, 'marketPromotion'));
  const prices = Object.keys(first.rates).map((id) => marketUnitPrice(world, id));
  const premiumCost = techOffer(world, 'premiumSales').cost;
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(marketIsActive(world), false);
  assert.equal(world.market, first);
  assert.ok(world.researchPoints >= premiumCost);
  assert.ok(upgradeTech(world, 'premiumSales'));
  world.productionValue = 100_000n;
  synchronizeMarket(world, day);
  assert.equal(world.market, first);
  assert.deepEqual(Object.keys(first.rates).map((id) => marketUnitPrice(world, id)), prices);

  assert.ok(resetMarket(world, day, 0));
  assert.ok(resetMarket(fullyUpgraded, day, 0));
  assert.deepEqual(world.market, fullyUpgraded.market);
  const reset = world.market;
  const forecast = marketForecast(world);
  assert.equal(world.market, reset);
  assert.equal(marketResetsRemaining(world), 0);
  updateWorldWallTime(world, new Date(2026, 10, 18, 12).getTime());
  assert.deepEqual(world.market, { ...forecast, sequence: 0, used: 0 });
  assert.equal(marketResetsRemaining(world), 1);
});

test('market activates at the gate, keeps same-day resets through handover, previews the next day, and ignores day rollback', () => {
  const world = newWorld(wall, seed);
  world.productionValue = 99_999n;
  synchronizeMarket(world, day);
  assert.equal(marketIsActive(world), false);
  assert.equal(world.market.rates, null);
  world.productionValue = 99_700n;
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  assert.equal(updateWorldWallTime(world, wall + 12_000), 12_000);
  assert.equal(world.productionValue, 100_000n);
  assert.equal(marketIsActive(world), true);
  assert.equal(Object.keys(world.market.rates).length, 1);
  assert.equal(resetMarket(world), false);
  world.researchPoints = 500n;
  assert.ok(upgradeTech(world, 'marketManipulation'));
  assert.equal(marketResetsRemaining(world), 1);
  assert.ok(resetMarket(world, day, 0));
  assert.equal(marketResetsRemaining(world), 0);
  assert.ok(upgradeTech(world, 'marketManipulation'));
  assert.equal(resetMarket(world, day, 0), false);
  assert.ok(resetMarket(world, day, 1));
  const record = structuredClone(world.market);
  assert.deepEqual(decodeWorldRecord(encodeWorldRecord(world)).market, record);

  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(marketIsActive(world), false);
  assert.deepEqual(world.market, record);
  assert.equal(resetMarket(world), false);
  world.productionValue = 100_000n;
  synchronizeMarket(world, day);
  assert.deepEqual(world.market, record);
  world.tech.marketForecast = 1;
  const forecast = marketForecast(world);
  const nextWall = new Date(2026, 10, 18, 12).getTime();
  assert.equal(forecast.day, localCalendarDay(nextWall));
  updateWorldWallTime(world, nextWall);
  assert.deepEqual(world.market, { ...forecast, sequence: 0, used: 0 });
  assert.equal(marketResetsRemaining(world), 2);
  updateWorldWallTime(world, wall);
  assert.deepEqual(world.market, { ...forecast, sequence: 0, used: 0 });
});

test('market trade prices round each unit and invalidate an entire stale batch without contributing to T', () => {
  const world = newWorld(wall, seed);
  world.productionValue = 100_000n;
  world.quality.C01 = '2';
  world.inventory = { C01: 2n, I01: 2n };
  world.market = { day, sequence: 0, used: 0, rates: { C01: 0 } };
  const plain = tradeOffer(world, 'C01', 100);
  const flour = tradeOffer(world, 'I01', 100);
  assert.equal(marketRate(world, 'C01'), 0);
  assert.equal(plain.price, 165n);
  world.market = { ...world.market, rates: { C01: -90, I01: 90 } };
  const before = structuredClone(world);
  assert.equal(marketUnitPrice(world, 'C01'), 17n);
  assert.equal(marketUnitPrice(world, 'I01'), (unitPrice(world, 'I01') * 190n + 50n) / 100n);
  const quotes = [plain, flour].map((expectedQuote) => ({ id: expectedQuote.id, percent: 100, expectedQuote }));
  assert.equal(sellBatch(world, quotes), false);
  assert.deepEqual(world, before);
  const current = quotes.map(({ id, percent }) => ({ id, percent, expectedQuote: tradeOffer(world, id, percent) }));
  assert.ok(sellBatch(world, current));
  const actual = current.reduce((sum, { expectedQuote }) => sum + expectedQuote.gain, 0n);
  assert.deepEqual([world.stats.revenue, world.stats.lifetimeRevenue], [actual, actual]);
  assert.deepEqual([world.productionValue, world.lifetimeProductionValue, world.prestigeCredit],
    [before.productionValue, before.lifetimeProductionValue, before.prestigeCredit]);
  assert.equal(settleTaskRewards(world).researchPoints, 1n);
});
