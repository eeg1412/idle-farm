import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import economyScale from '../src/content/economy-scale.json' with { type: 'json' };
import generatedCoinCaps from '../src/content/task-coin-caps.json' with { type: 'json' };
import { objectives, settleTaskRewards, taskCoinRewards, taskProductionGates } from '../src/game/objectives.js';
import {
  delegationHours, delegationMilliseconds, research,
} from '../src/game/advancement.js';
import {
  advanceWorld, arrangeStation, assignFacility, buyFacility, buyStation, catalog, facilityOffer, farmSaleOffer, newWorld,
  productionDurationMs, quantity, reserve, sell, sellBatch, sellFarm, stationMultiplier, stationOffer, stationRequirements,
  stationUpgradeOffer, tradeOffer,
} from '../src/game/world.js';

const longObjective = (world, id) => objectives(world).long.find((objective) => objective.id === id);
const coinScale = BigInt(economyScale.coinScale);

test('the textile chain can be researched in the first run and produces a complete batch at each stage', () => {
  const world = newWorld(0);
  world.inventory = { C01: 24n, I01: 8n };
  assert.equal(research(world, 'C51'), false);
  assert.equal(world.coins, 600n * coinScale);
  assert.deepEqual(world.inventory, { C01: 24n, I01: 8n });
  world.coins = BigInt(catalog.research.C51.coins);
  world.inventory = { C01: 6n, I01: 14n };
  assert.ok(research(world, 'C51'));
  assert.equal(world.coins, 0n);
  assert.equal(quantity(world, 'C01'), 0n);
  assert.equal(quantity(world, 'I01'), 0n);
  assert.ok(assignFacility(world, 'C', 0, 'C51'));
  const cottonDuration = productionDurationMs(world, 'C51');
  advanceWorld(world, 8 * cottonDuration);
  assert.equal(quantity(world, 'C51'), 16n);

  world.inventory.I101 = 32n;
  assert.equal(research(world, 'P151'), false);
  assert.equal(quantity(world, 'I101'), 32n);
  world.inventory.I101 = 0n;
  // Spend all cotton so the yarn station has to wait for two harvests to start.
  world.coins = BigInt(catalog.research.I101.coins);
  world.inventory.C51 = 4n;
  assert.ok(research(world, 'I101'));
  assert.equal(world.coins, 0n);
  assert.equal(quantity(world, 'C51'), 0n);
  assert.ok(arrangeStation(world, 'I', 0, 'I101'));
  assert.equal(world.stations.I[0].batch, null);
  advanceWorld(world, world.clockMs + 2 * cottonDuration + productionDurationMs(world, 'I101'));
  assert.equal(quantity(world, 'I101'), 4n);

  world.inventory.I101 = 19n;
  world.coins = BigInt(catalog.research.P151.coins);
  assert.ok(research(world, 'P151'));
  assert.equal(world.coins, 0n);
  assert.equal(quantity(world, 'I101'), 4n);
  assert.equal(research(world, 'P151'), false);
  assert.equal(world.completedRuns, 0);
  assert.equal(world.wallAnchorMs, 0);
  assert.ok(arrangeStation(world, 'P', 0, 'P151'));
  assert.deepEqual(world.stations.P[0].batch.inputs, { I101: 4n });
  advanceWorld(world, world.stations.P[0].batch.end);
  assert.equal(quantity(world, 'P151'), 1n);
  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.ok(['C51', 'I101', 'P151'].every((id) => world.unlocked.includes(id)));
});

test('confirmed sales update both revenue totals and a farm sale starts the next run at zero', () => {
  const world = newWorld(0);
  world.inventory.C01 = 10n ** 120n + 9n;
  world.inventory.I01 = 2n;
  const wheat = tradeOffer(world, 'C01', 100);
  const flour = tradeOffer(world, 'I01', 100);
  const expectedRevenue = wheat.gain + flour.gain;

  assert.equal(sellBatch(world, [wheat, { ...flour, expectedQuote: { ...flour, count: 1n } }]), false);
  assert.equal(quantity(world, 'C01'), wheat.count);
  assert.equal(world.stats.revenue, 0n);
  assert.equal(world.stats.lifetimeRevenue, 0n);

  assert.ok(sellBatch(world, [wheat, flour]));
  assert.equal(world.coins, 600n * coinScale + expectedRevenue);
  assert.equal(world.stats.revenue, expectedRevenue);
  assert.equal(world.stats.lifetimeRevenue, expectedRevenue);

  assert.ok(sellFarm(world, farmSaleOffer(world)));
  assert.equal(world.coins, 600n * coinScale);
  assert.equal(world.stats.revenue, 0n);
  assert.equal(world.stats.lifetimeRevenue, expectedRevenue);
  assert.equal(longObjective(world, 'farmIncome').current, expectedRevenue);
  assert.ok(longObjective(world, 'farmIncome').done);

  world.inventory.I01 = 1n;
  const nextSale = tradeOffer(world, 'I01', 100);
  assert.ok(sell(world, 'I01', 100));
  assert.equal(world.stats.revenue, nextSale.gain);
  assert.equal(world.stats.lifetimeRevenue, expectedRevenue + nextSale.gain);
});

test('quality milestones count lifetime draws and ignore previous quality levels', () => {
  const world = newWorld(0);
  world.quality = { C01: (10n ** 120n).toString(), I01: '100' };
  let goal = longObjective(world, 'qualityMaster');
  assert.deepEqual([goal.name, goal.current, goal.required, goal.done], ['品质抽取 360 次', 0n, 360n, false]);
  world.qualityDraws = 359n;
  assert.equal(longObjective(world, 'qualityMaster').done, false);
  world.qualityDraws = 360n;
  assert.equal(longObjective(world, 'qualityMaster').done, true);
  assert.equal(settleTaskRewards(world).ids.includes('qualityMaster'), true);
  assert.equal(settleTaskRewards(world).ids.includes('qualityMaster'), false);
});

test('fields, barns and ponds change production immediately and keep a batch when selecting its current item', () => {
  for (const [kind, original, replacement] of [['C', 'C01', 'C02'], ['L', 'L01', 'L02'], ['F', 'F01', 'F02']]) {
    const world = newWorld(0);
    if (kind !== 'C') world.unlocked.push(original);
    world.unlocked.push(replacement);
    if (kind !== 'C') assert.ok(buyFacility(world, kind));
    if (kind === 'C') assert.ok(assignFacility(world, 'C', 1, original));
    assert.ok(assignFacility(world, kind, 0, original));
    const facility = world.facilities[kind][0];
    const oldBatch = facility.batch;
    advanceWorld(world, 1000);

    assert.equal(assignFacility(world, kind, 0, 'I01'), false);
    assert.ok(assignFacility(world, kind, 0, original));
    assert.equal(facility.batch, oldBatch);
    assert.ok(assignFacility(world, kind, 0, replacement));
    assert.equal(facility.recipe, replacement);
    assert.equal(facility.batch.id, replacement);
    assert.equal(facility.batch.start, 1000);
    assert.equal(facility.batch.end, 1000 + productionDurationMs(world, replacement));
    assert.equal(world.productionValue, 0n);
    assert.deepEqual(world.stats.produced, {});

    advanceWorld(world, oldBatch.end);
    assert.equal(quantity(world, original), kind === 'C' ? 2n : 0n);
    assert.equal(quantity(world, replacement), 0n);
    advanceWorld(world, facility.batch.end);
    assert.ok(quantity(world, replacement) > 0n);
  }
});

test('changing a processing recipe returns its recorded inputs and starts the replacement immediately', () => {
  const world = newWorld(0);
  const station = world.stations.I[0];
  world.unlocked.push('I03');
  world.inventory = { C01: 2n, C03: 4n, I02: 1n };
  assert.ok(reserve(world, 'C03', 3n));
  assert.ok(arrangeStation(world, 'I', 0, 'I03'));
  assert.equal(station.batch, null);
  assert.equal(quantity(world, 'I02'), 1n);

  assert.ok(reserve(world, 'C03', 2n));
  const batch = station.batch;
  assert.equal(batch.id, 'I03');
  assert.deepEqual(batch.inputs, { C03: 2n, I02: 1n });
  assert.equal(quantity(world, 'C03'), 2n);
  assert.equal(quantity(world, 'I02'), 0n);

  advanceWorld(world, 1000);
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.equal(station.recipe, 'I01');
  assert.equal(station.batch.id, 'I01');
  assert.equal(station.batch.start, 1000);
  assert.deepEqual(station.batch.inputs, { C01: 2n });
  assert.equal(quantity(world, 'C01'), 0n);
  assert.equal(quantity(world, 'C03'), 4n);
  assert.equal(quantity(world, 'I02'), 1n);
  assert.equal(world.reserves.C03, 2n);
  assert.equal(world.productionValue, 0n);
  assert.deepEqual(world.stats.produced, {});

  advanceWorld(world, batch.end);
  assert.equal(quantity(world, 'I03'), 0n);
  assert.equal(quantity(world, 'I01'), 12n);
});

test('refining can reuse refunded inputs and switch to a recipe with missing materials', () => {
  const world = newWorld(0);
  const station = world.stations.P[0];
  world.unlocked.push('P01', 'P02', 'P03');
  world.inventory = { I01: 2n, I02: 1n };
  assert.ok(arrangeStation(world, 'P', 0, 'P01'));
  const oldBatch = station.batch;
  advanceWorld(world, 1000);

  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  const replacement = station.batch;
  assert.equal(replacement.id, 'P02');
  assert.equal(replacement.start, 1000);
  assert.deepEqual(replacement.inputs, { I01: 1n, I02: 1n });
  assert.ok(arrangeStation(world, 'P', 0, 'P02'));
  assert.equal(station.batch, replacement);
  assert.equal(quantity(world, 'I01'), 1n);
  assert.equal(quantity(world, 'I02'), 0n);

  assert.ok(arrangeStation(world, 'P', 0, 'P03'));
  assert.equal(station.recipe, 'P03');
  assert.equal(station.batch, null);
  assert.equal(quantity(world, 'I01'), 2n);
  assert.equal(quantity(world, 'I02'), 1n);
  advanceWorld(world, Math.max(oldBatch.end, replacement.end));
  assert.equal(quantity(world, 'P01'), 0n);
  assert.equal(quantity(world, 'P02'), 0n);
});

test('a station switch coinciding with completions starts the new recipe after those outputs enter stock', () => {
  const world = newWorld(0);
  world.unlocked.push('I02');
  world.inventory = { C01: 4n, C02: 2n };
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const completedAt = world.stations.I[0].batch.end;
  advanceWorld(world, completedAt - productionDurationMs(world, 'C01'));
  for (const index of [0, 1]) {
    assert.ok(assignFacility(world, 'C', index, 'C01'));
    assert.equal(world.facilities.C[index].batch.end, completedAt);
  }

  advanceWorld(world, completedAt, { deferFinalStarts: true });
  assert.ok(arrangeStation(world, 'I', 0, 'I02'));
  assert.equal(quantity(world, 'C01'), 6n);
  assert.equal(quantity(world, 'I01'), 12n);
  assert.equal(world.stats.produced.I01, 12n);
  assert.equal(world.stations.I[0].batch.id, 'I02');
  assert.equal(world.stations.I[0].batch.start, completedAt);
});

test('LT-2026-11-v13 uses the same batch formula for every item', () => {
  assert.equal(catalog.balanceVersion, 'LT-2026-11-v13');
  const usage = new Map();
  for (const item of Object.values(catalog.items)) {
    for (const [id, count] of Object.entries(item.inputs)) {
      usage.set(id, (usage.get(id) ?? 0n) + BigInt(count));
    }
  }
  for (const [id, { output }] of Object.entries(catalog.items)) {
    const consumed = (usage.get(id) ?? 0n) / 2n;
    const quantity = BigInt(output);
    assert.ok((quantity - 1n) ** 2n <= consumed && quantity ** 2n > consumed, `${id} base batch quantity`);
  }
});

test('minimal recipe cycles allow 10% extra time for each direct input batch and set prices before unit rounding', () => {
  const ceilDivide = (numerator, denominator) => (numerator + denominator - 1n) / denominator;
  const catalogSpec = readFileSync(new URL('../docs/expansion/05-catalog.md', import.meta.url), 'utf8');
  const baseSeconds = new Map(Array.from(catalogSpec.matchAll(/^\| ([A-Z]+\d+) \| [^|]+ \| (\d+) \|/gm),
    ([, id, seconds]) => [id, BigInt(seconds)]));
  const add = ([a, b], [c, d]) => {
    const numerator = a * d + c * b;
    const denominator = b * d;
    let gcd = numerator;
    let remainder = denominator;
    while (remainder !== 0n) [gcd, remainder] = [remainder, gcd % remainder];
    return [numerator / gcd, denominator / gcd];
  };
  const upstreamLabor = new Map();
  function allocated(id) {
    if (upstreamLabor.has(id)) return upstreamLabor.get(id);
    let sum = [0n, 1n];
    for (const [inputId, count] of Object.entries(catalog.items[id].inputs)) {
      const upstream = catalog.items[inputId];
      const [a, b] = allocated(inputId);
      const t = BigInt(upstream.durationMs) / 1000n;
      sum = add(sum, [BigInt(count) * (t * b + a), b * BigInt(upstream.output)]);
    }
    upstreamLabor.set(id, sum);
    return sum;
  }
  for (const [id, item] of Object.entries(catalog.items)) {
    const inputs = Object.entries(item.inputs);
    let expectedSeconds = baseSeconds.get(id);
    assert.notEqual(expectedSeconds, undefined, `${id} frozen base cycle`);
    let upstreamRate = [0n, 1n];
    for (const [inputId, count] of inputs) {
      const upstream = catalog.items[inputId];
      const upstreamSeconds = BigInt(upstream.durationMs) / 1000n;
      const output = BigInt(upstream.output);
      const startupSeconds = ceilDivide(11n * upstreamSeconds, 10n);
      const supplySeconds = ceilDivide(11n * BigInt(count) * upstreamSeconds, 10n * output);
      if (startupSeconds > expectedSeconds) expectedSeconds = startupSeconds;
      if (supplySeconds > expectedSeconds) expectedSeconds = supplySeconds;
      const [a, b] = allocated(inputId);
      upstreamRate = add(upstreamRate, [(upstreamSeconds + 3n) * b + a, 3n * b]);
    }
    assert.equal(item.durationMs % 1000, 0, `${id} whole-second cycle`);
    const seconds = BigInt(item.durationMs) / 1000n;
    const [a, b] = allocated(id);
    const [u, v] = upstreamRate;
    const meetsRevenueFloor = (t) => 10n * v * ((((t + 3n) * b + a) * t) - 3n * b * BigInt(item.output)) >=
      33n * b * t * u;
    assert.ok(seconds >= expectedSeconds, `${id} cycle has insufficient supply time`);
    if (inputs.length) assert.ok(meetsRevenueFloor(seconds), `${id} cycle has insufficient target rate`);
    assert.ok(seconds === expectedSeconds || (inputs.length && !meetsRevenueFloor(seconds - 1n)), `${id} cycle is not minimal`);
    assert.ok(item.durationMs <= 43_200_000, `${id} cycle exceeds 12 hours`);
    const expectedPrice = coinScale * seconds * ((seconds + 3n) * b + a) / (3n * b * BigInt(item.output));
    assert.equal(BigInt(item.price), expectedPrice, `${id} gold per item`);
    assert.ok(expectedPrice >= 10n, `${id} minimum price`);
  }

  assert.equal(catalog.items.I01.durationMs, 14_000);
  assert.equal(catalog.items.P01.durationMs, 31_000);
  assert.equal(catalog.items.IF01.durationMs, 93_000);
  assert.equal(catalog.items.P169.durationMs, 15_246_000);
});

test('recipe prices cover input value and all direct upstream production in the same time window', () => {
  for (const [id, item] of Object.entries(catalog.items)) {
    const inputs = Object.entries(item.inputs);
    if (!inputs.length) continue;
    let inputValue = 0n;
    let rateNumerator = 0n;
    let rateDenominator = 1n;
    for (const [inputId, count] of inputs) {
      const upstream = catalog.items[inputId];
      const price = BigInt(upstream.price);
      const duration = BigInt(upstream.durationMs);
      inputValue += BigInt(count) * price;
      rateNumerator = rateNumerator * duration + rateDenominator * price * BigInt(upstream.output);
      rateDenominator *= duration;
    }
    const batchValue = BigInt(item.price) * BigInt(item.output);
    assert.ok(5n * batchValue >= 6n * inputValue, `${id} adds less than 20% to its inputs' value`);
    assert.ok(10n * batchValue * rateDenominator > 11n * BigInt(item.durationMs) * rateNumerator,
      `${id} earns less than 110% of all direct upstream output in the same time window`);
  }
  assert.equal(BigInt(catalog.items.I01.price), coinScale * 14n * 29n / (3n * 12n));
  assert.equal(BigInt(catalog.items.P01.price), 396n * coinScale);
});

test('actual research quotes keep the material share within 40%, including the first bread recipe', () => {
  for (const [id, { coins, costs }] of Object.entries(catalog.research)) {
    const materialValue = Object.entries(costs).reduce((total, [inputId, count]) =>
      total + BigInt(catalog.items[inputId].price) * BigInt(count), 0n);
    assert.ok(5n * materialValue <= 2n * (materialValue + BigInt(coins)), `${id} material share`);
  }
  const { P01, PL01 } = catalog.research;
  // Bread has 106/3 seconds of included labor, giving a pre-rounding total of coinScale * 16445/27.
  const breadTotal = (16_445n * coinScale + 26n) / 27n;
  const breadMaterials = 8n * BigInt(catalog.items.I01.price) + 3n * BigInt(catalog.items.C01.price);
  assert.equal(BigInt(P01.coins), breadTotal - breadMaterials);
  assert.deepEqual(P01.costs, { C01: '3', I01: '8' });
  assert.deepEqual(PL01.costs, { IL01: '8', IL02: '4' });
});

test('facilities and workstations charge the scaled base once for purchase and upgrade', () => {
  for (const [kind, firstPurchased] of [['C', 2], ['L', 0], ['F', 0]]) {
    const world = newWorld(0);
    assert.equal(facilityOffer(world, kind).cost, 600n * coinScale);
    assert.ok(buyFacility(world, kind));
    assert.equal(world.coins, 0n);
    assert.equal(facilityOffer(world, kind).cost, 3_000n * coinScale);
    assert.equal(facilityOffer(world, kind, firstPurchased).cost, 300n * coinScale);
  }
  for (const [kind, base] of [['I', 750n], ['P', 950n]]) {
    const price = base * coinScale;
    const world = newWorld(0);
    assert.equal(stationOffer(world, kind).cost, price);
    assert.equal(stationUpgradeOffer(world, kind, 0).cost, price);
    assert.equal(stationOffer(world, kind).affordable, false);
    world.coins = price;
    assert.ok(buyStation(world, kind));
    assert.equal(world.coins, 0n);
    assert.equal(stationOffer(world, kind).cost, 25n * price);
  }
});

test('station batches scale output and inputs by W(L) = 1 + j + floor(j^2/64)', () => {
  for (const [level, multiplier] of [[1, 1n], [2, 2n], [8, 8n], [9, 10n], [65, 129n], [100, 253n]]) {
    assert.equal(stationMultiplier(level), multiplier, String(level));
    assert.equal(stationMultiplier(String(level)), multiplier, String(level));
    assert.equal(stationRequirements(newWorld(0), 'I01', BigInt(level))[0].needed, 2n * multiplier, String(level));
  }

  const world = newWorld(0);
  const station = world.stations.I[0];
  station.recipe = 'I01';
  const upgrade = stationUpgradeOffer(world, 'I', 0, 8n);
  assert.equal(upgrade.target, 9n);
  assert.equal(upgrade.currentOutput, 12n);
  assert.equal(upgrade.output, 120n);

  station.recipe = null;
  station.level = '9';
  world.inventory = { C01: 19n };
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.equal(station.batch, null);
  world.inventory.C01 = 20n;
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  assert.deepEqual(station.batch.inputs, { C01: 20n });
  assert.equal(station.batch.amount, '120');
  assert.equal(quantity(world, 'C01'), 0n);
  advanceWorld(world, station.batch.end);
  assert.equal(quantity(world, 'I01'), 120n);
});

test('delegation applies the five anchors with interpolation in integer milliseconds', () => {
  const world = newWorld(0);
  for (const [level, minutes] of [[0, 360], [1, 396], [10, 720], [11, 792], [20, 1440],
    [21, 1536], [35, 2880], [36, 2976], [50, 4320]]) {
    world.tech.delegation = level;
    assert.equal(delegationMilliseconds(world), minutes * 60000, String(level));
    assert.equal(delegationHours(world), minutes / 60, String(level));
  }
});

test('gated tasks need lifetime production value before they count as done or pay out', () => {
  assert.deepEqual(taskProductionGates, {
    newFarm: 520_000n * coinScale,
    runs5: 8_000_000_000n * coinScale,
    runs20: 800_000_000_000n * coinScale,
    runs50: 32_000_000_000_000n * coinScale,
    runs100: 280_000_000_000_000n * coinScale,
  });
  const world = newWorld(0);
  world.completedRuns = 5;
  world.lifetimeProductionValue = taskProductionGates.newFarm - 1n;
  let goal = longObjective(world, 'runs5');
  assert.equal(goal.current, 5n);
  assert.equal(goal.gate, taskProductionGates.runs5);
  assert.equal(goal.gateMet, false);
  assert.equal(goal.done, false);
  let settled = settleTaskRewards(world);
  assert.ok(!settled.ids.includes('newFarm'));
  assert.ok(!settled.ids.includes('runs5'));

  world.lifetimeProductionValue = taskProductionGates.runs5 - 1n;
  assert.equal(longObjective(world, 'runs5').done, false);
  settled = settleTaskRewards(world);
  assert.ok(settled.ids.includes('newFarm'));
  assert.ok(!settled.ids.includes('runs5'));

  world.lifetimeProductionValue = taskProductionGates.runs5;
  goal = longObjective(world, 'runs5');
  assert.equal(goal.gateMet, true);
  assert.equal(goal.done, true);
  settled = settleTaskRewards(world);
  assert.ok(settled.ids.includes('runs5'));
  assert.ok(!settled.ids.includes('runs20'));

  const ungated = longObjective(world, 'farmIncome');
  assert.equal(ungated.gate, null);
  assert.equal(ungated.gateMet, true);
  assert.equal(ungated.required, 1_000_000_000_000n * coinScale);
});

test('scaled task rewards use the lower of each base reward and the rounded cap', () => {
  const roundCap = (cap) => BigInt(cap.toString().replace(/^(\d{2})(\d+)$/, (_, head, tail) => head + '0'.repeat(tail.length)));
  for (const id of ['recipeTrio', 'codex20', 'recipeCollection', 'collection100']) {
    assert.equal(taskCoinRewards[id], roundCap(generatedCoinCaps[id]), id);
  }
  for (const [id, target] of [['qualityCollection', 6n], ['quality25', 30n], ['quality50', 120n],
    ['qualityMaster', 360n], ['quality200', 1080n], ['quality400', 3240n]]) {
    assert.equal(taskCoinRewards[id], 100n * coinScale * target, id);
  }
  assert.equal(taskCoinRewards.fieldLevel10, 46_000n * coinScale);
  assert.equal(taskCoinRewards.firstTech, roundCap(1_250n * coinScale));
  assert.equal(taskCoinRewards.delegationTech, roundCap(2_500n * coinScale));
  assert.equal(taskCoinRewards.techLevel1200, roundCap(1_250n * 1_494n * coinScale));
});

test('农地扩建 counts the extra fields currently owned, not lifetime purchases', () => {
  const world = newWorld(0);
  world.stats.plots = 12n;
  assert.equal(longObjective(world, 'moreFields').current, 0n);
  for (let index = 0; index < 10; index += 1) world.facilities.C.push({ level: '1', recipe: null, batch: null });
  const goal = longObjective(world, 'moreFields');
  assert.equal(goal.current, 10n);
  assert.equal(goal.done, true);
});
