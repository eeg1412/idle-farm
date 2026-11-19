import catalog from '../content/game-data.json' with { type: 'json' };
import { accountRandom } from './account-random.js';
import { marketUnitPrice, validCalendarDay } from './market.js';
import { availableToProduce, settleProduction } from './world.js';

export const managerIds = Object.freeze(['tasks', 'estate', 'livestock', 'field', 'mine', 'fish',
  'processing', 'refining', 'warehouse', 'research', 'merchant']);
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
});
export const managerDailyCap = 30_000n;
export const managerWishUnlockCount = 10;
export const managerAffinityThresholds = Object.freeze([
  0n, 30n, 360n, 750n, 1_500n, 3_600n, 8_700n, 18_000n, 36_000n, 66_000n, 109_500n,
].map((points) => points * 100n));
const affinityUnitCosts = [100n, 100n, 100n, 1_000n, 10_000n, 100_000n,
  1_000_000n, 10_000_000n, 50_000_000n, 300_000_000n].map((goldPerPoint) => goldPerPoint / 100n);
const maximumAffinity = managerAffinityThresholds.at(-1);
const giftQuoteTerms = ['day', 'run', 'spent', 'unitPrice', 'gain', 'affinityCharge', 'affinityRemainder', 'returnValue'];
const min = (a, b) => a < b ? a : b;

function newRelationship(gender) {
  return { gender, affinity: 0n, dailyGain: 0n, affinityRemainder: 0n, wants: [],
    currentReturn: 0n, readyReturn: 0n, sequence: 0n };
}

export function newManagers(day = null, { legacyAllFemale = false } = {}) {
  return { day: validCalendarDay(day) ? day : null, spent: 0n, affinitySpent: 0n,
    roles: Object.fromEntries(managerIds.map((id) =>
      [id, newRelationship(legacyAllFemale ? 'female' : managerDefaultGenders[id])])) };
}

function managerLevel(affinity) {
  return managerAffinityThresholds.findLastIndex((threshold) => affinity >= threshold);
}

function affinityCeiling(affinity, dailyGain) {
  return min(affinity + managerDailyCap - dailyGain, maximumAffinity);
}

export function validManagerAffinityRemainder(affinity, dailyGain, remainder) {
  return affinityCeiling(affinity, dailyGain) === affinity ? remainder === 0n
    : remainder < affinityUnitCosts[managerLevel(affinity)];
}

function affinityFundingRemaining(world) {
  const remaining = world.productionValue - world.managers.affinitySpent;
  return remaining > 0n ? remaining : 0n;
}

function valueToDailyCap({ affinity, dailyGain, affinityRemainder }) {
  const limit = affinityCeiling(affinity, dailyGain);
  let value = 0n;
  for (let level = managerLevel(affinity); affinity < limit; level += 1) {
    const end = min(limit, managerAffinityThresholds[level + 1]);
    value += (end - affinity) * affinityUnitCosts[level];
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
    const end = min(limit, managerAffinityThresholds[level + 1]);
    const price = affinityUnitCosts[level];
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

export function synchronizeManagerCalendar(world, day) {
  if (!validCalendarDay(day)) return;
  const previous = world.managers;
  const nextDay = previous.day === null || day > previous.day;
  const effectiveDay = nextDay ? day : previous.day;
  const pendingWishes = nextDay || previous.roles[managerIds[0]].wants.length === 0;
  const candidates = pendingWishes && world.accountSeed ? Object.keys(world.merchant.produced) : [];
  const draw = candidates.length > managerWishUnlockCount;
  if (!nextDay && !draw) return;
  candidates.sort();
  const roles = Object.fromEntries(managerIds.map((id) => {
    const role = previous.roles[id];
    const current = nextDay ? { ...role, dailyGain: 0n, affinityRemainder: 0n, wants: [],
      currentReturn: 0n, readyReturn: role.readyReturn + role.currentReturn } : role;
    return [id, draw ? { ...current, wants: drawWants(world, id, effectiveDay, candidates) } : current];
  }));
  world.managers = { ...previous, day: effectiveDay, roles };
}

export function resetManagerRun(world) {
  const managers = world.managers;
  const roles = Object.fromEntries(managerIds.map((id) => [id, { ...managers.roles[id], wants: [] }]));
  world.managers = { ...managers, spent: 0n, affinitySpent: 0n, roles };
}

export function managerGiftRemaining(world) {
  const balance = world.stats.revenue - world.managers.spent;
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
  const { gender, affinity, dailyGain, wants, currentReturn, readyReturn, sequence } = role;
  const level = managerLevel(affinity);
  const run = world.completedRuns;
  const claim = day && returnCandidates(world, readyReturn, true).length ? { id, day, run, sequence } : null;
  return { id, day, run, gender, affinity, level, nextThreshold: managerAffinityThresholds[level + 1] ?? null,
    dailyGain, dailyCap: managerDailyCap, affinityFundingRemaining: affinityFundingRemaining(world),
    valueToDailyCap: valueToDailyCap(role), wants, currentReturn, readyReturn, returnRate: 50 + 10 * level, claim };
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
    returnValue: value * BigInt(5 + level), level, wanted };
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
  const candidates = returnCandidates(world, role.readyReturn);
  if (!candidates.length) return false;
  const random = accountRandom(world.accountSeed, `manager-return:${id}`, role.sequence);
  const { itemId, price } = candidates[Number(random(BigInt(candidates.length)))];
  const count = role.readyReturn / (10n * price);
  const value = count * 10n * price;
  world.inventory[itemId] = (world.inventory[itemId] ?? 0n) + count;
  setRelationship(world, id, { ...role, readyReturn: role.readyReturn - value, sequence: role.sequence + 1n });
  settleProduction(world);
  return { id, itemId, count, value };
}

export function switchManagerAppearance(world, id) {
  if (typeof id !== 'string' || !Object.hasOwn(world.managers.roles, id)) return false;
  const role = world.managers.roles[id];
  const gender = role.gender === 'female' ? 'male' : 'female';
  setRelationship(world, id, { ...role, gender });
  return gender;
}
