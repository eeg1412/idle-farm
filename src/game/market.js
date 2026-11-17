import { accountRandom } from './account-random.js';
import {
  marketBaseMaximumIncrease, marketBaseUpwardChance, marketMaximumIncreasePerLevel, marketUpwardChancePerLevel,
  techMaxLevels, unitPrice,
} from './advancement.js';

export const marketProductionGate = 100_000n;

function positiveRate(magnitude, level) {
  return Math.floor((magnitude * (marketBaseMaximumIncrease + marketMaximumIncreasePerLevel * level) +
    marketBaseMaximumIncrease / 2) / marketBaseMaximumIncrease);
}

const positiveRates = new Set();
for (let level = 0; level <= techMaxLevels.premiumSales; level += 1) {
  for (let magnitude = 10; magnitude <= marketBaseMaximumIncrease; magnitude += 10) {
    positiveRates.add(positiveRate(magnitude, level));
  }
}

export function validMarketRate(rate) {
  return Number.isInteger(rate) && (rate > 0 ? positiveRates.has(rate) : rate >= -90 && rate % 10 === 0);
}

const dateText = (year, month, day) => [String(year).padStart(4, '0'), String(month).padStart(2, '0'),
  String(day).padStart(2, '0')].join('-');

export function localCalendarDay(wallMs) {
  const date = new Date(wallMs);
  if (!Number.isFinite(date.getTime())) return null;
  return dateText(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function utcFromDay(day) {
  const date = new Date(day + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) ? date : null;
}

export function validCalendarDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = utcFromDay(day);
  return Boolean(date && date.toISOString().startsWith(day + 'T'));
}

function nextCalendarDay(day) {
  const date = utcFromDay(day);
  date.setUTCDate(date.getUTCDate() + 1);
  return dateText(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function marketIsActive(world) {
  return world.productionValue >= marketProductionGate && world.market?.rates != null;
}

function generateRates({ accountSeed, unlocked, tech }, day, sequence) {
  const available = [...unlocked].sort();
  const count = Math.min(available.length, Math.max(1, Math.floor(available.length / 10)));
  const uniformBelow = accountRandom(accountSeed, 'market:' + day, sequence);
  for (let index = 0; index < count; index += 1) {
    const swap = index + Number(uniformBelow(BigInt(available.length - index)));
    [available[index], available[swap]] = [available[swap], available[index]];
  }
  const selected = available.slice(0, count);
  const upwardChanceBasisPoints = BigInt(100 * (marketBaseUpwardChance + marketUpwardChancePerLevel * (tech.marketPromotion ?? 0)));
  const directions = selected.map(() => uniformBelow(10_000n) < upwardChanceBasisPoints ? 1 : -1);
  const magnitudes = selected.map(() => 10 * Math.ceil(Number(uniformBelow(19n)) / 2));
  const premiumLevel = tech.premiumSales ?? 0;
  return Object.fromEntries(selected.map((id, index) => {
    const magnitude = magnitudes[index];
    const rate = directions[index] > 0 ? positiveRate(magnitude, premiumLevel) : -magnitude || 0;
    return [id, rate];
  }));
}

export function synchronizeMarket(world, day) {
  let market = world.market;
  if (validCalendarDay(day) && (!market || day > market.day)) {
    market = { day, sequence: 0, used: 0, rates: null };
  }
  if (market && market.rates === null && world.productionValue >= marketProductionGate && world.accountSeed) {
    market = { ...market, rates: generateRates(world, market.day, market.sequence) };
  }
  world.market = market;
}

export function marketResetsRemaining(world) {
  return Math.max(0, (world.tech.marketManipulation ?? 0) - (world.market?.used ?? 0));
}

export function resetMarket(world, expectedDay, expectedSequence) {
  if (!marketIsActive(world) || marketResetsRemaining(world) < 1 ||
    (expectedDay !== undefined && world.market.day !== expectedDay) ||
    (expectedSequence !== undefined && world.market.sequence !== expectedSequence)) return false;
  const { day, sequence, used } = world.market;
  world.market = { day, sequence: sequence + 1, used: used + 1,
    rates: generateRates(world, day, sequence + 1) };
  return true;
}

export function marketForecast(world) {
  if (!marketIsActive(world) || !world.tech.marketForecast) return null;
  const day = nextCalendarDay(world.market.day);
  return { day, rates: generateRates(world, day, 0) };
}

export function marketRate(world, id) {
  return marketIsActive(world) ? world.market.rates[id] ?? 0 : 0;
}

export function marketUnitPrice(world, id) {
  const price = unitPrice(world, id);
  if (price === 0n) return 0n;
  const rounded = (price * BigInt(100 + marketRate(world, id)) + 50n) / 100n;
  return rounded > 0n ? rounded : 1n;
}
