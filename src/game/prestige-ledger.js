export const prestigeLedgerVersion = 'LT-2026-11-v2';

const activityScale = 30000000n;
const creditPerPoint = 10000000n;
const legacyPointScale = 25n;

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
    pendingLegacyResearchPoints: 0n,
    legacyResearchPointsSettled: true,
  };
}

export function legacyResearchPointsReward(productionValue, multiplierBasisPoints) {
  const base = BigInt((1n + productionValue / 1000n).toString(2).length) - 1n;
  return base * BigInt(multiplierBasisPoints) / 10000n;
}

// Return a migration draft; reading or encoding an old world must not mutate it.
export function migratePrestigeLedger(world) {
  if (world.prestigeLedgerVersion === prestigeLedgerVersion) return world;
  if (world.prestigeLedgerVersion !== undefined) throw new RangeError('Unknown prestige ledger version');
  const multiplierBasisPoints = 10000 + 200 * (world.tech?.appraisal ?? 0);
  return {
    ...world,
    ...newPrestigeLedger(),
    researchPoints: world.researchPoints * legacyPointScale,
    pendingLegacyResearchPoints: legacyResearchPointsReward(world.productionValue, multiplierBasisPoints) * legacyPointScale,
    legacyResearchPointsSettled: false,
  };
}

export function recordProductionContribution(world, deltaValue, multiplierBasisPoints) {
  const ledger = migratePrestigeLedger(world);
  if (ledger !== world) Object.assign(world, ledger);
  const previous = integerSquareRoot(activityScale * world.lifetimeProductionValue);
  world.lifetimeProductionValue += deltaValue;
  const current = integerSquareRoot(activityScale * world.lifetimeProductionValue);
  world.prestigeCredit += (current - previous) * BigInt(multiplierBasisPoints);
}

export function prestigeLedgerOffer(world) {
  const ledger = migratePrestigeLedger(world);
  const newResearchPoints = ledger.prestigeCredit / creditPerPoint;
  const legacyResearchPoints = ledger.legacyResearchPointsSettled ? 0n : ledger.pendingLegacyResearchPoints;
  return {
    prestigeLedgerVersion: ledger.prestigeLedgerVersion,
    lifetimeProductionValue: ledger.lifetimeProductionValue,
    prestigeCredit: ledger.prestigeCredit,
    pendingLegacyResearchPoints: ledger.pendingLegacyResearchPoints,
    legacyResearchPointsSettled: ledger.legacyResearchPointsSettled,
    newResearchPoints,
    legacyResearchPoints,
    reward: newResearchPoints + legacyResearchPoints,
  };
}

// Called only by the existing successful farm sale, before its normal reset.
export function settlePrestigeLedger(world) {
  const ledger = migratePrestigeLedger(world);
  if (ledger !== world) Object.assign(world, ledger);
  const { reward } = prestigeLedgerOffer(world);
  world.researchPoints += reward;
  world.prestigeCredit %= creditPerPoint;
  world.pendingLegacyResearchPoints = 0n;
  world.legacyResearchPointsSettled = true;
  return reward;
}
