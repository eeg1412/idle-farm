import { coinScale } from './coin-scale.js';

export const prestigeLedgerVersion = 'LT-2026-11-v7';

const activityScale = 49n;
const creditPerPoint = integerSquareRoot(1_000_000n ** 2n * coinScale);

export function integerSquareRoot(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new RangeError('Expected a nonnegative integer');
  if (value < 2n) return value;
  let root = 1n << ((BigInt(value.toString(2).length) + 1n) / 2n);
  let next = (root + value / root) / 2n;
  while (next < root) {
    root = next;
    next = (root + value / root) / 2n;
  }
  return root;
}

export function newPrestigeLedger() {
  return {
    prestigeLedgerVersion,
    lifetimeProductionValue: 0n,
    prestigeCredit: 0n,
  };
}

// Under a fixed appraisal multiplier, the per-deposit differences between square roots telescope.
export function productionContributionBatch(world) {
  let startRoot = null;
  let multiplier = 0n;
  return {
    add(deltaValue, multiplierBasisPoints) {
      if (startRoot === null) {
        startRoot = integerSquareRoot(activityScale * world.lifetimeProductionValue);
        multiplier = BigInt(multiplierBasisPoints);
      }
      world.lifetimeProductionValue += deltaValue;
    },
    flush() {
      if (startRoot === null) return;
      const current = integerSquareRoot(activityScale * world.lifetimeProductionValue);
      world.prestigeCredit += (current - startRoot) * multiplier;
      startRoot = null;
    },
  };
}

export function prestigeLedgerOffer(world) {
  return {
    prestigeLedgerVersion: world.prestigeLedgerVersion,
    lifetimeProductionValue: world.lifetimeProductionValue,
    prestigeCredit: world.prestigeCredit,
    reward: world.prestigeCredit / creditPerPoint,
  };
}

// Called only by the existing successful farm sale, before its normal reset.
export function settlePrestigeLedger(world) {
  const { reward } = prestigeLedgerOffer(world);
  world.researchPoints += reward;
  world.prestigeCredit %= creditPerPoint;
  return reward;
}
