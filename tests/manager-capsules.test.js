import assert from 'node:assert/strict';
import test from 'node:test';
import { accountRandom } from '../src/game/account-random.js';
import { claimManagerGift, managerAffinityLevel, managerAffinityThreshold, managerAffinityThresholds,
  managerAffinityUnitCost, managerDailyCap, managerStatus, quoteManagerGift,
  synchronizeManagerCalendar } from '../src/game/managers.js';
import { newWorld } from '../src/game/world.js';

const firstDay = new Date(2026, 10, 18, 12).getTime();
const legacyThresholds = [0n, 30n, 360n, 750n, 1_500n, 3_600n, 8_700n, 18_000n, 36_000n, 66_000n, 109_500n]
  .map((points) => points * 100n);
const legacyUnitCosts = [100n, 100n, 100n, 1_000n, 10_000n, 100_000n,
  1_000_000n, 10_000_000n, 50_000_000n, 300_000_000n].map((gold) => gold / 100n);
const legacyMaximum = legacyThresholds.at(-1);
const legacyLevel = (affinity) => legacyThresholds.findLastIndex((threshold) => affinity >= threshold);
const min = (a, b) => a < b ? a : b;

function legacyValueToDailyCap(affinity, dailyGain, remainder) {
  const limit = min(affinity + managerDailyCap - dailyGain, legacyMaximum);
  let value = 0n;
  for (let level = legacyLevel(affinity); affinity < limit; level += 1) {
    const end = min(limit, legacyThresholds[level + 1]);
    value += (end - affinity) * legacyUnitCosts[level];
    affinity = end;
  }
  return value - remainder;
}

function legacyGain(affinity, dailyGain, remainder, weightedGift) {
  const limit = min(affinity + managerDailyCap - dailyGain, legacyMaximum);
  if (limit === affinity) return 0n;
  let remaining = remainder + weightedGift;
  const start = affinity;
  for (let level = legacyLevel(affinity); affinity < limit; level += 1) {
    const end = min(limit, legacyThresholds[level + 1]);
    const price = legacyUnitCosts[level];
    const gain = min(end - affinity, remaining / price);
    remaining -= gain * price;
    affinity += gain;
    if (affinity < end) break;
  }
  return affinity - start;
}

const points = (value) => value * 100n;

function managerWorld() {
  const world = newWorld(firstDay);
  world.capsules = 0n;
  return world;
}

function setRole(world, id, fields) {
  const role = world.managers.roles[id];
  world.managers = { ...world.managers, roles: { ...world.managers.roles, [id]: { ...role, ...fields } } };
}

function giftableWorld() {
  const world = managerWorld();
  world.stats.warehouseRevenue = 10n ** 30n;
  world.productionValue = 10n ** 30n;
  world.inventory.C01 = 10n ** 20n;
  return world;
}

test('levels 0-10 keep the existing thresholds, unit costs and level lookup', () => {
  assert.deepEqual([...managerAffinityThresholds], legacyThresholds);
  for (let level = 0; level <= 10; level += 1) assert.equal(managerAffinityThreshold(level), legacyThresholds[level]);
  for (let level = 0; level <= 9; level += 1) assert.equal(managerAffinityUnitCost(level), legacyUnitCosts[level]);
  for (const threshold of legacyThresholds) {
    for (const affinity of [threshold - 1n, threshold, threshold + 1n]) {
      if (affinity < 0n) continue;
      assert.equal(managerAffinityLevel(affinity), legacyLevel(affinity), String(affinity));
    }
  }
});

test('levels above 10 follow T(L) = 109,500 + 43,500n + 3,750n(n+1)', () => {
  assert.equal(managerAffinityThreshold(11), points(160_500n));
  assert.equal(managerAffinityThreshold(12), points(219_000n));
  // Sum of R(10..14) and R(10..19) from the formula.
  assert.equal(managerAffinityThreshold(15), points(439_500n));
  assert.equal(managerAffinityThreshold(20), points(957_000n));
  for (let level = 10; level < 40; level += 1) {
    const step = managerAffinityThreshold(level + 1) - managerAffinityThreshold(level);
    assert.equal(step, points(43_500n + 7_500n * BigInt(level - 9)));
  }
  for (const level of [10, 11, 12, 15, 20, 37]) {
    const threshold = managerAffinityThreshold(level);
    assert.equal(managerAffinityLevel(threshold), level);
    assert.equal(managerAffinityLevel(threshold - 1n), level - 1);
    assert.equal(managerAffinityLevel(managerAffinityThreshold(level + 1) - 1n), level);
  }
});

test('very large affinity resolves its level without walking every level', () => {
  const level = 1_000_000;
  const threshold = managerAffinityThreshold(level);
  assert.equal(managerAffinityLevel(threshold), level);
  assert.equal(managerAffinityLevel(threshold - 1n), level - 1);
  const huge = 10n ** 30n;
  const hugeLevel = managerAffinityLevel(huge);
  assert.ok(managerAffinityThreshold(hugeLevel) <= huge);
  assert.ok(managerAffinityThreshold(hugeLevel + 1) > huge);
});

test('every level from 9 up costs 300M gold per point and a full day at level 10+ costs 90B', () => {
  for (const level of [9, 10, 11, 50, 1_000]) assert.equal(managerAffinityUnitCost(level), 3_000_000n);
  const world = managerWorld();
  setRole(world, 'field', { affinity: managerAffinityThreshold(10) });
  const status = managerStatus(world, 'field');
  assert.equal(status.level, 10);
  assert.equal(status.valueToDailyCap, 90_000_000_000n);
  assert.equal(status.nextThreshold, managerAffinityThreshold(11));
  assert.equal(status.threshold, managerAffinityThreshold(10));
});

test('daily-cap valuation and affinity gain match the legacy rules below the old maximum', () => {
  const world = giftableWorld();
  const samples = [0n, 1n, 2_999n, 3_000n, 35_999n, 74_000n, 149_000n, 359_000n, 869_000n, 1_799_000n,
    3_599_000n, 6_599_000n, 10_000_000n, legacyMaximum - managerDailyCap];
  for (const affinity of samples) {
    for (const dailyGain of [0n, 12_345n, managerDailyCap - 1n]) {
      const level = legacyLevel(affinity);
      const remainder = level < 3 ? 0n : legacyUnitCosts[level] - 1n;
      setRole(world, 'field', { affinity, dailyGain, affinityRemainder: remainder, wants: [] });
      assert.equal(managerStatus(world, 'field').valueToDailyCap, legacyValueToDailyCap(affinity, dailyGain, remainder));
      for (const count of [1n, 7n, 1_000n, 10n ** 12n]) {
        const quote = quoteManagerGift(world, 'field', 'C01', count);
        assert.equal(quote.gain, legacyGain(affinity, dailyGain, remainder, quote.value), `${affinity}/${dailyGain}/${count}`);
        assert.equal(quote.returnValue, quote.value * BigInt(5 + legacyLevel(affinity + quote.gain)));
      }
    }
  }
});

test('affinity keeps rising past level 10 while return rate stops at 150%', () => {
  const world = giftableWorld();
  setRole(world, 'field', { affinity: legacyMaximum, dailyGain: 0n });
  const quote = quoteManagerGift(world, 'field', 'C01', 10n ** 12n);
  assert.equal(quote.gain, managerDailyCap);
  setRole(world, 'field', { affinity: managerAffinityThreshold(12) });
  const status = managerStatus(world, 'field');
  assert.equal(status.level, 12);
  assert.equal(status.returnRate, 150);
  const small = quoteManagerGift(world, 'field', 'C01', 3n);
  assert.equal(small.returnValue, small.value * 15n);
});

test('a day that reached the affinity cap draws capsules from the level range on rollover', () => {
  const world = managerWorld();
  const day = world.managers.day;
  setRole(world, 'field', { affinity: managerAffinityThreshold(3), dailyGain: managerDailyCap });
  setRole(world, 'estate', { affinity: managerAffinityThreshold(12), dailyGain: managerDailyCap });
  setRole(world, 'mine', { affinity: managerAffinityThreshold(10), dailyGain: managerDailyCap - 1n });
  const copy = structuredClone(world);
  synchronizeManagerCalendar(world, '2026-11-19');
  synchronizeManagerCalendar(copy, '2026-11-19');

  const expected = (id, low, high) => low + accountRandom(world.accountSeed, `manager-capsule:${id}:${day}`, 0n)(high - low + 1n);
  const field = world.managers.roles.field.readyCapsules;
  const estate = world.managers.roles.estate.readyCapsules;
  assert.equal(field, expected('field', 150n, 450n));
  assert.ok(field >= 150n && field <= 450n);
  assert.equal(estate, expected('estate', 1_800n, 2_700n));
  assert.ok(estate >= 1_800n && estate <= 2_700n);
  assert.equal(world.managers.roles.mine.readyCapsules, 0n);
  assert.equal(world.managers.roles.field.dailyGain, 0n);
  assert.equal(copy.managers.roles.field.readyCapsules, field);
  assert.equal(copy.managers.roles.estate.readyCapsules, estate);
  assert.equal(managerStatus(world, 'field').readyCapsules, field);
  assert.ok(managerStatus(world, 'field').claim);
  assert.equal(managerStatus(world, 'mine').claim, null);
});

test('capsule draws replace the unclaimed ones the next day, clear over a gap and need an account seed', () => {
  const world = managerWorld();
  setRole(world, 'field', { affinity: managerAffinityThreshold(10), dailyGain: managerDailyCap,
    currentReturn: 1_000n, readyReturn: 77n });
  synchronizeManagerCalendar(world, '2026-11-19');
  const first = world.managers.roles.field.readyCapsules;
  assert.ok(first >= 1_800n && first <= 2_700n);
  assert.equal(world.managers.roles.field.readyReturn, 1_000n);
  synchronizeManagerCalendar(world, '2026-11-19');
  assert.equal(world.managers.roles.field.readyCapsules, first);

  // Next day: the new draw and return replace the unclaimed ones instead of adding to them.
  setRole(world, 'field', { dailyGain: managerDailyCap, currentReturn: 500n });
  synchronizeManagerCalendar(world, '2026-11-20');
  const second = accountRandom(world.accountSeed, 'manager-capsule:field:2026-11-19', 0n)(901n) + 1_800n;
  assert.equal(world.managers.roles.field.readyCapsules, second);
  assert.equal(world.managers.roles.field.readyReturn, 500n);

  // A day below the cap leaves nothing to claim the following day.
  synchronizeManagerCalendar(world, '2026-11-21');
  assert.equal(world.managers.roles.field.readyCapsules, 0n);
  assert.equal(world.managers.roles.field.readyReturn, 0n);

  // A gap of more than one day expires the last earned capsules and return.
  setRole(world, 'field', { dailyGain: managerDailyCap, currentReturn: 500n, readyCapsules: 300n });
  synchronizeManagerCalendar(world, '2026-11-24');
  assert.equal(world.managers.roles.field.readyCapsules, 0n);
  assert.equal(world.managers.roles.field.readyReturn, 0n);

  const unseeded = managerWorld();
  unseeded.accountSeed = '';
  setRole(unseeded, 'field', { affinity: managerAffinityThreshold(10), dailyGain: managerDailyCap });
  synchronizeManagerCalendar(unseeded, '2026-11-19');
  assert.equal(unseeded.managers.roles.field.readyCapsules, 0n);
});

test('claiming capsules alone credits up to the holding cap and keeps the rest ready', () => {
  const world = managerWorld();
  synchronizeManagerCalendar(world, '2026-11-19');
  setRole(world, 'field', { readyCapsules: 500n });
  world.capsules = 143_900n;
  const status = managerStatus(world, 'field');
  assert.equal(status.readyReturn, 0n);
  assert.ok(status.claim);
  const sequence = world.managers.roles.field.sequence;

  const result = claimManagerGift(world, status.claim);
  assert.deepEqual(result, { id: 'field', items: [], value: 0n, capsules: { added: 100n, remaining: 400n } });
  assert.equal(world.capsules, 144_000n);
  assert.equal(world.managers.roles.field.readyCapsules, 400n);
  assert.equal(world.managers.roles.field.sequence, sequence);
  assert.ok(managerStatus(world, 'field').claim);

  world.capsules = 0n;
  const rest = claimManagerGift(world, managerStatus(world, 'field').claim);
  assert.deepEqual(rest.capsules, { added: 400n, remaining: 0n });
  assert.equal(world.capsules, 400n);
  assert.equal(world.managers.roles.field.readyCapsules, 0n);
  assert.equal(managerStatus(world, 'field').claim, null);
  assert.equal(claimManagerGift(world, { id: 'field', day: world.managers.day, run: 0, sequence }), false);
});
