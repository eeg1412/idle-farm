import test from 'node:test';
import assert from 'node:assert/strict';
import {
  capsuleUseLimit, capsuleUseOffer, grantCapsules, previewCapsuleUse, useCapsules,
} from '../src/game/capsules.js';
import {
  advanceWorld, arrangeStation, assignFacility, buyStation, newWorld, productionDurationMs, quantity,
} from '../src/game/world.js';

const hourMs = 3_600_000;

function farmWorld() {
  const world = newWorld(0);
  assert.ok(assignFacility(world, 'C', 0, 'C01'));
  assert.ok(assignFacility(world, 'C', 1, 'C01'));
  // Run long enough that shifted batch starts stay above clock zero.
  advanceWorld(world, 3 * hourMs + 5_123);
  return world;
}

// Two processing stations where the second consumes the first's output (I02 -> I03).
function chainWorld({ C02 = 40n, C03 = 10n } = {}) {
  const world = newWorld(0);
  advanceWorld(world, 3 * hourMs);
  world.coins = 10n ** 30n;
  world.unlocked.push('C02', 'C03', 'I02', 'I03');
  assert.ok(buyStation(world, 'I'));
  world.inventory = { C02, C03 };
  assert.ok(arrangeStation(world, 'I', 0, 'I02'));
  assert.ok(arrangeStation(world, 'I', 1, 'I03'));
  return world;
}

test('grantCapsules adds every capsule because holdings have no cap', () => {
  const world = newWorld(0);
  assert.equal(world.capsules, 0n);
  assert.equal(world.pendingTaskCapsules, 0n);
  assert.deepEqual(grantCapsules(world, 1_000n), { added: 1_000n, remaining: 0n });
  assert.deepEqual(grantCapsules(world, 10n ** 9n), { added: 10n ** 9n, remaining: 0n });
  assert.deepEqual(grantCapsules(world, 0n), { added: 0n, remaining: 0n });
  assert.deepEqual(grantCapsules(world, -1n), { added: 0n, remaining: 0n });
  assert.equal(world.capsules, 10n ** 9n + 1_000n);
});

test('facility fast-forward matches a real advance of the same span without moving the clock', () => {
  const world = farmWorld();
  world.capsules = 5_000n;
  const expected = structuredClone(world);
  const clockMs = world.clockMs;
  advanceWorld(expected, clockMs + 37 * 60_000);

  const preview = previewCapsuleUse(world, 'C', 3_700n);
  assert.equal(preview.valid, true);
  assert.equal(preview.minutes, 37);
  const result = useCapsules(world, 'C', 3_700n);
  assert.ok(result);
  assert.equal(result.minutes, 37);
  assert.equal(result.batches, preview.batches);
  assert.equal(world.clockMs, clockMs);
  assert.equal(world.capsules, 1_300n);
  assert.equal(quantity(world, 'C01'), quantity(expected, 'C01'));
  assert.equal(result.produced.C01, quantity(expected, 'C01') - quantity(structuredClone(farmWorld()), 'C01'));
  assert.equal(world.stats.produced.C01, expected.stats.produced.C01);
  assert.equal(world.productionValue, expected.productionValue);
  assert.equal(world.lifetimeProductionValue, expected.lifetimeProductionValue);
  assert.equal(world.prestigeCredit, expected.prestigeCredit);
  world.facilities.C.forEach((facility, index) => {
    const reference = expected.facilities.C[index];
    assert.equal(facility.batch.end - world.clockMs, reference.batch.end - expected.clockMs);
    assert.equal(facility.batch.start - world.clockMs, reference.batch.start - expected.clockMs);
    assert.equal(facility.batch.amount, reference.batch.amount);
    // Saves accept negative starts, so the shifted planting start keeps its true offset.
    assert.equal(facility.planting.start, reference.planting.start - (expected.clockMs - world.clockMs));
  });
  // Fast-forwarding grants no basic research points.
  assert.equal(world.basicResearchPoints, structuredClone(farmWorld()).basicResearchPoints);
});

test('station fast-forward feeds same-category stations and stops at the stall', () => {
  const world = chainWorld();
  world.capsules = capsuleUseLimit;
  const offer = capsuleUseOffer(world, 'I');
  assert.equal(offer.available, true);
  assert.ok(offer.stallMinutes !== null);
  assert.ok(offer.maximum > 0n && offer.maximum < capsuleUseLimit);
  assert.equal(offer.maximum, BigInt(offer.stallMinutes) * 100n);

  const expected = structuredClone(world);
  advanceWorld(expected, world.clockMs + offer.stallMinutes * 60_000);
  const clockMs = world.clockMs;
  const result = useCapsules(world, 'I', offer.maximum);
  assert.ok(result);
  assert.equal(world.clockMs, clockMs);
  assert.equal(world.capsules, capsuleUseLimit - offer.maximum);
  for (const id of ['C02', 'C03', 'I02', 'I03']) assert.equal(quantity(world, id), quantity(expected, id), id);
  assert.ok(result.produced.I03 > 0n, 'the chained station consumed fast-forwarded output');
  assert.equal(world.stats.produced.I03, expected.stats.produced.I03);
  assert.equal(world.productionValue, expected.productionValue);
  // Selecting beyond the stall is refused and charges nothing.
  world.capsules = capsuleUseLimit;
  const after = capsuleUseOffer(world, 'I');
  assert.equal(useCapsules(world, 'I', after.maximum + 100n), false);
  assert.equal(world.capsules, capsuleUseLimit);
});

test('stations without materials offer nothing and keep the capsules', () => {
  const world = chainWorld({ C02: 0n, C03: 0n });
  world.capsules = 1_000n;
  const offer = capsuleUseOffer(world, 'I');
  assert.equal(offer.maximum, 0n);
  assert.equal(useCapsules(world, 'I', 100n), false);
  assert.equal(world.capsules, 1_000n);
  assert.deepEqual(world.inventory, { C02: 0n, C03: 0n });
  // A category with nothing arranged is unavailable.
  assert.equal(capsuleUseOffer(world, 'L').available, false);
  assert.equal(capsuleUseOffer(world, 'L').maximum, 0n);
});

test('use amounts must be whole steps within the offer', () => {
  const world = farmWorld();
  world.capsules = 20_000n;
  const offer = capsuleUseOffer(world, 'C');
  assert.equal(offer.maximum, capsuleUseLimit);
  for (const amount of [0n, 150n, -100n, capsuleUseLimit + 100n, 100, '100']) {
    assert.equal(previewCapsuleUse(world, 'C', amount).valid, false);
    assert.equal(useCapsules(world, 'C', amount), false);
  }
  assert.equal(world.capsules, 20_000n);
  world.capsules = 250n;
  assert.equal(capsuleUseOffer(world, 'C').maximum, 200n);
  assert.equal(useCapsules(world, 'C', 300n), false);
  assert.ok(useCapsules(world, 'C', 200n));
  assert.equal(world.capsules, 50n);
});

test('the facility batch count follows the real batch duration', () => {
  const world = farmWorld();
  world.capsules = 100n;
  const duration = productionDurationMs(world, 'C01');
  const remaining = world.facilities.C.map((facility) => facility.batch.end - world.clockMs);
  const expected = remaining.reduce((total, left) =>
    total + (left <= 60_000 ? 1n + BigInt(Math.floor((60_000 - left) / duration)) : 0n), 0n);
  assert.equal(previewCapsuleUse(world, 'C', 100n).batches, expected);
  assert.equal(useCapsules(world, 'C', 100n).batches, expected);
});

test('a running batch that will not finish inside the span can still be advanced', () => {
  const world = farmWorld();
  world.unlocked.push('C51');
  assert.ok(assignFacility(world, 'C', 0, 'C51'));
  assert.ok(assignFacility(world, 'C', 1, 'C51'));
  world.capsules = 1_000n;
  const before = world.facilities.C.map((facility) => facility.batch.end - world.clockMs);
  assert.ok(before.every((left) => left > 30_000));
  const preview = previewCapsuleUse(world, 'C', 0n);
  assert.equal(preview.valid, false);
  const offer = capsuleUseOffer(world, 'C');
  assert.equal(offer.maximum, 1_000n);
  // C51 batches outlast 30 seconds; a short span completes nothing but still moves progress.
  world.facilities.C.forEach((facility) => { facility.batch.end = world.clockMs + 120_000; });
  const result = useCapsules(world, 'C', 100n);
  assert.ok(result);
  assert.equal(result.batches, 0n);
  world.facilities.C.forEach((facility) => assert.equal(facility.batch.end - world.clockMs, 60_000));
});
