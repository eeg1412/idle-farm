import catalog from '../content/game-data.json' with { type: 'json' };
import { accountRandom } from './account-random.js';
import { grantCapsules } from './capsules.js';
import { marketUnitPrice, validCalendarDay } from './market.js';
import { recordOrderAcquisition } from './orders.js';
import { availableToProduce, settleProduction } from './world.js';

export const managerIds = Object.freeze(['tasks', 'estate', 'livestock', 'field', 'mine', 'fish',
  'processing', 'refining', 'warehouse', 'research', 'merchant', 'orders']);
export const managerDefaultGenders = Object.freeze({
  tasks: 'female',
  estate: 'male',
  livestock: 'female',
  field: 'male',
  mine: 'female',
  fish: 'male',
  processing: 'female',
  refining: 'male',
  warehouse: 'female',
  research: 'male',
  merchant: 'female',
  orders: 'male',
});
export const managerDailyCap = 30_000n;
export const managerWishUnlockCount = 10;
// Cumulative thresholds for levels 0-10 in 1/100 affinity points; later levels follow managerAffinityThreshold.
export const managerAffinityThresholds = Object.freeze([
  0n, 30n, 360n, 750n, 1_500n, 3_600n, 8_700n, 18_000n, 36_000n, 66_000n, 109_500n,
].map((points) => points * 100n));
const affinityUnitCosts = [100n, 100n, 100n, 1_000n, 10_000n, 100_000n,
  1_000_000n, 10_000_000n, 50_000_000n, 300_000_000n].map((goldPerPoint) => goldPerPoint / 100n);
const tableTopLevel = managerAffinityThresholds.length - 1;
const tableTopThreshold = managerAffinityThresholds[tableTopLevel];
// Level 10 and above share the level-10 return rate and capsule range.
export const managerRewardLevelCap = 10;
const capsuleRanges = [[0n, 100n], [0n, 200n], [50n, 300n], [150n, 450n], [250n, 600n], [400n, 850n],
  [600n, 1_100n], [800n, 1_400n], [1_100n, 1_800n], [1_400n, 2_200n], [1_800n, 2_700n]];
const giftQuoteTerms = ['day', 'run', 'spent', 'unitPrice', 'gain', 'affinityCharge', 'affinityRemainder', 'returnValue'];
const min = (a, b) => a < b ? a : b;

function newRelationship(gender) {
  return { gender, affinity: 0n, dailyGain: 0n, affinityRemainder: 0n, wants: [],
    currentReturn: 0n, readyReturn: 0n, sequence: 0n, readyCapsules: 0n };
}

export function newManagers(day = null, { legacyAllFemale = false } = {}) {
  return { day: validCalendarDay(day) ? day : null, spent: 0n, affinitySpent: 0n,
    roles: Object.fromEntries(managerIds.map((id) =>
      [id, newRelationship(legacyAllFemale && id !== 'orders' ? 'female' : managerDefaultGenders[id])])) };
}

// Cumulative affinity (1/100 points) needed for `level`; from level 10, R(L) = 43,500 + 7,500 x (L - 9) points.
export function managerAffinityThreshold(level) {
  if (level <= tableTopLevel) return managerAffinityThresholds[level];
  const n = BigInt(level - tableTopLevel);
  return tableTopThreshold + (43_500n * n + 3_750n * n * (n + 1n)) * 100n;
}

export function managerAffinityLevel(affinity) {
  if (affinity < tableTopThreshold) {
    return managerAffinityThresholds.findLastIndex((threshold) => affinity >= threshold);
  }
  // Closed form: largest n with 3,750n^2 + 47,250n <= whole points above level 10, then exact correction.
  const excess = affinity / 100n - tableTopThreshold / 100n;
  let n = (integerSquareRoot(47_250n * 47_250n + 15_000n * excess) - 47_250n) / 7_500n;
  const above = (k) => 3_750n * k * k + 47_250n * k;
  while (n > 0n && above(n) > excess) n -= 1n;
  while (above(n + 1n) <= excess) n += 1n;
  return tableTopLevel + Number(n);
}

function integerSquareRoot(value) {
  if (value < 2n) return value;
  let root = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  for (;;) {
    const next = (root + value / root) >> 1n;
    if (next >= root) return root;
    root = next;
  }
}

const managerLevel = managerAffinityLevel;

export function managerAffinityUnitCost(level) {
  return affinityUnitCosts[Math.min(level, affinityUnitCosts.length - 1)];
}

function rewardLevel(level) {
  return Math.min(level, managerRewardLevelCap);
}

function affinityCeiling(affinity, dailyGain) {
  return affinity + managerDailyCap - dailyGain;
}

export function validManagerAffinityRemainder(affinity, dailyGain, remainder) {
  return affinityCeiling(affinity, dailyGain) === affinity ? remainder === 0n
    : remainder < managerAffinityUnitCost(managerLevel(affinity));
}

function affinityFundingRemaining(world) {
  const remaining = world.productionValue - world.managers.affinitySpent;
  return remaining > 0n ? remaining : 0n;
}

function valueToDailyCap({ affinity, dailyGain, affinityRemainder }) {
  const limit = affinityCeiling(affinity, dailyGain);
  let value = 0n;
  for (let level = managerLevel(affinity); affinity < limit; level += 1) {
    const end = min(limit, managerAffinityThreshold(level + 1));
    value += (end - affinity) * managerAffinityUnitCost(level);
    affinity = end;
  }
  return value - affinityRemainder;
}

function affinityOffer(role, giftValue, multiplier) {
  const limit = affinityCeiling(role.affinity, role.dailyGain);
  if (limit === role.affinity) return { gain: 0n, affinityCharge: 0n, affinityRemainder: 0n };

  const weightedGift = giftValue * multiplier;
  let remaining = role.affinityRemainder + weightedGift;
  let affinity = role.affinity;
  for (let level = managerLevel(affinity); affinity < limit; level += 1) {
    const end = min(limit, managerAffinityThreshold(level + 1));
    const price = managerAffinityUnitCost(level);
    const gain = min(end - affinity, remaining / price);
    remaining -= gain * price;
    affinity += gain;
    if (affinity < end) break;
  }

  const capped = affinity === limit;
  // Only whole gifted gold is charged against production. Anything above the cap is an ordinary gift.
  const affinityCharge = capped ? (weightedGift - remaining + multiplier - 1n) / multiplier : giftValue;
  return { gain: affinity - role.affinity, affinityCharge, affinityRemainder: capped ? 0n : remaining };
}

function setRelationship(world, id, next) {
  const managers = world.managers;
  world.managers = { ...managers, roles: { ...managers.roles, [id]: next } };
}

function drawWants(world, id, day, candidates) {
  const random = accountRandom(world.accountSeed, `manager-wants:${id}:${day}`, world.completedRuns);
  const count = 1 + Number(random(3n));
  const pool = [...candidates];
  for (let index = 0; index < count; index += 1) {
    const swap = index + Number(random(BigInt(pool.length - index)));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, count);
}

function drawCapsules(world, id, day, level) {
  const [low, high] = capsuleRanges[rewardLevel(level)];
  const random = accountRandom(world.accountSeed, `manager-capsule:${id}:${day}`, BigInt(world.completedRuns));
  return low + random(high - low + 1n);
}

// The calendar day after `day` (both YYYY-MM-DD, already validated).
function followingDay(day) {
  const date = new Date(day + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function synchronizeManagerCalendar(world, day) {
  if (!validCalendarDay(day)) return;
  const previous = world.managers;
  const nextDay = previous.day === null || day > previous.day;
  const effectiveDay = nextDay ? day : previous.day;
  const pendingWishes = nextDay || managerIds.some((id) => previous.roles[id].wants.length === 0);
  const candidates = pendingWishes && world.accountSeed ? Object.keys(world.merchant.produced) : [];
  const draw = candidates.length > managerWishUnlockCount;
  if (!nextDay && !draw) return;
  candidates.sort();
  // A return gift is claimable only on the day after it was earned. Each settlement replaces the
  // unclaimed one; after a gap of more than one day the last earned return has already expired.
  const consecutive = nextDay && previous.day !== null && followingDay(previous.day) === day;
  const roles = Object.fromEntries(managerIds.map((id) => {
    const role = previous.roles[id];
    const capsules = consecutive && world.accountSeed && role.dailyGain >= managerDailyCap
      ? drawCapsules(world, id, previous.day, managerLevel(role.affinity)) : 0n;
    const current = nextDay ? { ...role, dailyGain: 0n, affinityRemainder: 0n, wants: [],
      currentReturn: 0n, readyReturn: consecutive ? role.currentReturn : 0n,
      readyCapsules: capsules } : role;
    return [id, draw && current.wants.length === 0
      ? { ...current, wants: drawWants(world, id, effectiveDay, candidates) } : current];
  }));
  world.managers = { ...previous, day: effectiveDay, roles };
}

export function resetManagerRun(world) {
  const managers = world.managers;
  const roles = Object.fromEntries(managerIds.map((id) => [id, { ...managers.roles[id], wants: [] }]));
  world.managers = { ...managers, spent: 0n, affinitySpent: 0n, roles };
}

export function managerGiftRemaining(world) {
  const balance = world.stats.warehouseRevenue - world.managers.spent;
  return balance > 0n ? balance : 0n;
}

export function managerGiftLimit(world, itemId) {
  const remaining = managerGiftRemaining(world);
  if (typeof itemId !== 'string' || !Object.hasOwn(catalog.items, itemId)) {
    return { available: 0n, maximum: 0n, unitPrice: 0n, remaining };
  }
  const available = availableToProduce(world, itemId);
  const unitPrice = marketUnitPrice(world, itemId);
  const maximum = unitPrice > 0n ? min(available, remaining / unitPrice) : 0n;
  return { available, maximum, unitPrice, remaining };
}

function returnCandidates(world, balance, firstOnly = false) {
  if (balance < 10n || !world.accountSeed) return [];
  const limit = balance / 10n;
  const candidates = [];
  const produced = Object.keys(world.merchant.produced);
  if (!firstOnly) produced.sort();
  for (const itemId of produced) {
    if (!Object.hasOwn(catalog.items, itemId)) continue;
    const price = marketUnitPrice(world, itemId);
    if (price <= 0n || price > limit) continue;
    candidates.push({ itemId, price });
    if (firstOnly) break;
  }
  return candidates;
}

export function managerStatus(world, id) {
  const { day, roles } = world.managers;
  if (typeof id !== 'string' || !Object.hasOwn(roles, id)) return null;
  const role = roles[id];
  const { gender, affinity, dailyGain, wants, currentReturn, readyReturn, sequence, readyCapsules } = role;
  const level = managerLevel(affinity);
  const run = world.completedRuns;
  const claimable = readyCapsules > 0n || returnCandidates(world, readyReturn, true).length > 0;
  const claim = day && claimable ? { id, day, run, sequence } : null;
  return { id, day, run, gender, affinity, level, threshold: managerAffinityThreshold(level),
    nextThreshold: managerAffinityThreshold(level + 1),
    dailyGain, dailyCap: managerDailyCap, affinityFundingRemaining: affinityFundingRemaining(world),
    valueToDailyCap: valueToDailyCap(role), wants, currentReturn, readyReturn, readyCapsules,
    returnRate: 50 + 10 * rewardLevel(level), claim };
}

export function quoteManagerGift(world, id, itemId, count) {
  const { day, spent, roles } = world.managers;
  if (!day || typeof id !== 'string' || !Object.hasOwn(roles, id) || typeof count !== 'bigint' || count <= 0n) return null;
  const { maximum, unitPrice } = managerGiftLimit(world, itemId);
  if (count > maximum) return null;
  const role = roles[id];
  const value = count * unitPrice;
  const wanted = role.wants.includes(itemId);
  const progress = affinityOffer(role, min(value, affinityFundingRemaining(world)), wanted ? 2n : 1n);
  const level = managerLevel(role.affinity + progress.gain);
  return { id, itemId, count, day, run: world.completedRuns, spent, unitPrice, value, ...progress,
    returnValue: value * BigInt(5 + rewardLevel(level)), level, wanted };
}

export function giftManager(world, expected) {
  const quote = quoteManagerGift(world, expected?.id, expected?.itemId, expected?.count);
  if (!quote || giftQuoteTerms.some((key) => quote[key] !== expected[key])) return false;
  const { id, itemId, count, value, gain, affinityCharge, affinityRemainder, returnValue } = quote;
  const role = world.managers.roles[id];
  world.inventory[itemId] -= count;
  setRelationship(world, id, { ...role, affinity: role.affinity + gain, dailyGain: role.dailyGain + gain,
    affinityRemainder, currentReturn: role.currentReturn + returnValue });
  world.managers.spent += value;
  world.managers.affinitySpent += affinityCharge;
  return quote;
}

export function claimManagerGift(world, expected) {
  const { day, roles } = world.managers;
  const id = expected?.id;
  if (!day || typeof id !== 'string' || !Object.hasOwn(roles, id) || expected.day !== day ||
    expected.run !== world.completedRuns || expected.sequence !== roles[id].sequence) return false;
  const role = roles[id];
  let candidates = returnCandidates(world, role.readyReturn);
  const readyCapsules = role.readyCapsules;
  if (!candidates.length && readyCapsules <= 0n) return false;
  let balance = role.readyReturn;
  let sequence = role.sequence;
  let value = 0n;
  const items = [];
  const byItem = new Map();
  // Keep one price snapshot, but use each legacy draw's own persistent sequence.
  while (candidates.length) {
    const random = accountRandom(world.accountSeed, `manager-return:${id}`, sequence);
    const { itemId, price } = candidates[Number(random(BigInt(candidates.length)))];
    const count = balance / (10n * price);
    const itemValue = count * 10n * price;
    const previous = byItem.get(itemId);
    if (previous) {
      previous.count += count;
      previous.value += itemValue;
    } else {
      const item = { itemId, count, value: itemValue };
      items.push(item);
      byItem.set(itemId, item);
    }
    balance -= itemValue;
    value += itemValue;
    sequence += 1n;
    candidates = candidates.filter(({ price: candidatePrice }) => 10n * candidatePrice <= balance);
  }

  const inventory = { ...world.inventory };
  for (const { itemId, count } of items) inventory[itemId] = (inventory[itemId] ?? 0n) + count;
  world.inventory = inventory;
  for (const { itemId } of items) recordOrderAcquisition(world, itemId);
  // Capsules beyond the holding cap stay ready on this role for a later claim.
  const capsules = readyCapsules > 0n ? grantCapsules(world, readyCapsules) : { added: 0n, remaining: 0n };
  setRelationship(world, id, { ...role, readyReturn: balance, sequence, readyCapsules: readyCapsules - capsules.added });
  settleProduction(world);
  return { id, items, value, capsules };
}

export function switchManagerAppearance(world, id) {
  if (typeof id !== 'string' || !Object.hasOwn(world.managers.roles, id)) return false;
  const role = world.managers.roles[id];
  const gender = role.gender === 'female' ? 'male' : 'female';
  setRelationship(world, id, { ...role, gender });
  return gender;
}
