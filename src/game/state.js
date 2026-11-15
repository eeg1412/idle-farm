import catalog from '../content/catalog.json' with { type: 'json' };

export { catalog };

const dayMs = 86400000;
const productionRewardThreshold = 1000n;
const startingCrop = catalog.items.C01;
const firstHarvestMs = startingCrop.durationMs;
const startingCoins = 60n;
const emptyStation = () => ({ recipe: null, ends: null });
const appraisalCosts = [1n, 2n, 4n, 8n, 16n];

export function newState(wallAnchorMs) {
  return {
    schemaVersion: 1, revision: 0, clockMs: 0, wallAnchorMs,
    coins: startingCoins, inventory: {}, unlocked: [...catalog.initial], quality: {}, reserves: {},
    productionValue: 0n, researchPoints: 0n, appraisalLevel: 0,
    completedRuns: 0, firstCompletedRunAtMs: null, everMadeIslandMilleCrepe: false,
    guideSkipped: false, delegationLevel: 0, workshopSpeedLevel: 0,
    stats: { wheat: 0n, flour: 0n, bread: 0n, sold: 0n, plots: 0, revenue: 0n },
    plots: [firstHarvestMs, firstHarvestMs], stations: {
      I: emptyStation(), P: emptyStation(),
    },
  };
}

export function updateWallTime(state, now) {
  if (state.completedRuns > 0 && state.firstCompletedRunAtMs == null) {
    state.firstCompletedRunAtMs = state.wallAnchorMs;
  }
  let hasLegacyStations = false;
  for (const station of Object.values(state.stations)) {
    if (Object.hasOwn(station, 'paused')) {
      delete station.paused;
      hasLegacyStations = true;
    }
  }
  if (hasLegacyStations) startStations(state);
  const maximum = (2 + 2 * state.delegationLevel) * 3600000;
  advance(state, state.clockMs + Math.max(0, Math.min(maximum, now - state.wallAnchorMs)));
  state.wallAnchorMs = Math.max(state.wallAnchorMs, now);
}

export const quantity = (state, id) => state.inventory[id] ?? 0n;

function unitPrice(state, id) {
  const price = BigInt(catalog.items[id].price);
  const increase = price * 12n / 100n;
  const quality = BigInt(state.quality[id] ?? 1);
  const matureQuality = quality > 10n ? quality - 10n : 0n;
  return price + (quality - 1n) * (increase || 1n) + price * matureQuality ** 2n / 1000n;
}

function harvest(state, id, amount) {
  state.inventory[id] = quantity(state, id) + amount;
  state.productionValue += amount * unitPrice(state, id);
  const tracked = { C01: 'wheat', I01: 'flour', P01: 'bread' }[id];
  if (tracked) state.stats[tracked] += amount;
  if (id === 'P150') state.everMadeIslandMilleCrepe = true;
}

function canConsume(state, entries, useReserves = false) {
  return entries.every(([id, needed]) => quantity(state, id) >= BigInt(needed) +
    (useReserves ? state.reserves[id] ?? 0n : 0n));
}

function consume(state, entries) {
  for (const [id, needed] of entries) state.inventory[id] -= BigInt(needed);
}

export function workshopDurationMs(baseMs, level = 0) {
  return Math.ceil(baseMs * 5 / (5 + level));
}

function startStations(state) {
  for (const station of Object.values(state.stations)) {
    if (!station.recipe || station.ends !== null) continue;
    const item = catalog.items[station.recipe];
    const inputs = Object.entries(item.inputs);
    if (!canConsume(state, inputs, true)) continue;
    consume(state, inputs);
    station.ends = state.clockMs + workshopDurationMs(item.durationMs, state.workshopSpeedLevel);
    station.output = station.recipe;
    station.outputQuantity = item.output;
  }
}

export function advance(state, targetMs) {
  while (true) {
    const next = Math.min(...state.plots, ...Object.values(state.stations).map((station) => station.ends ?? Infinity));
    if (next > targetMs) break;
    state.clockMs = next;
    state.plots = state.plots.map((ends) => {
      if (ends !== next) return ends;
      harvest(state, 'C01', BigInt(startingCrop.output));
      return next + firstHarvestMs;
    });
    for (const station of Object.values(state.stations)) {
      if (station.ends !== next) continue;
      harvest(state, station.output, BigInt(station.outputQuantity ?? catalog.items[station.output].output));
      station.ends = null;
      delete station.output;
      delete station.outputQuantity;
    }
    startStations(state);
  }
  state.clockMs = targetMs;
}

export function arrange(state, kind, recipe) {
  const station = state.stations[kind];
  if (!station || typeof recipe !== 'string' || !recipe.startsWith(kind) ||
    !catalog.items[recipe] || !state.unlocked.includes(recipe)) return false;
  station.recipe = recipe;
  startStations(state);
  return true;
}

export function researchOffer(state, id) {
  const node = catalog.research[id];
  if (!node || state.unlocked.includes(id)) return null;
  const firstCompletedRunAtMs = state.firstCompletedRunAtMs ?? state.wallAnchorMs;
  const elapsedDays = Math.max(0, Math.floor((state.wallAnchorMs - firstCompletedRunAtMs) / dayMs));
  const eligible = state.completedRuns >= node.minCompletedRuns &&
    elapsedDays >= node.availableAfterDays && node.requires.every((key) => state.unlocked.includes(key));
  const costs = Object.entries(node.costs).map(([item, count]) =>
    [item, BigInt(count) * BigInt(node.materialMultiplier)]);
  const coins = BigInt(node.coins);
  return { eligible, costs, coins, affordable: state.coins >= coins && canConsume(state, costs) };
}

export function research(state, id) {
  const offer = researchOffer(state, id);
  if (!offer?.eligible || !offer.affordable) return false;
  consume(state, offer.costs);
  state.coins -= offer.coins;
  state.unlocked.push(id);
  return true;
}

export function reserve(state, id, amount) {
  state.reserves[id] = amount;
  startStations(state);
}

export function sell(state, id, count) {
  if (!catalog.items[id] || count <= 0n || count > quantity(state, id)) return false;
  const gain = unitPrice(state, id) * count;
  state.inventory[id] -= count;
  state.coins += gain;
  state.stats.sold += count;
  state.stats.revenue += gain;
  return true;
}

export function farmSaleOffer(state) {
  const productionValue = state.productionValue;
  const multiplierTenths = 10 + 2 * state.appraisalLevel;
  const magnitude = 1n + productionValue / productionRewardThreshold;
  const base = BigInt(magnitude.toString(2).length - 1);
  return {
    completedRuns: state.completedRuns, productionValue, multiplierTenths,
    stationCount: Object.keys(state.stations).length, plotCount: state.plots.length,
    reward: base * BigInt(multiplierTenths) / 10n,
  };
}

export function sellFarm(state, offer) {
  const latest = farmSaleOffer(state);
  if (!offer || latest.completedRuns !== offer.completedRuns || latest.reward !== offer.reward ||
    latest.stationCount !== offer.stationCount || latest.plotCount !== offer.plotCount) return false;
  state.researchPoints += latest.reward;
  state.completedRuns += 1;
  state.firstCompletedRunAtMs ??= state.wallAnchorMs;
  state.coins = startingCoins;
  state.productionValue = 0n;
  state.inventory = {};
  state.reserves = {};
  const nextHarvest = state.clockMs + firstHarvestMs;
  state.plots = [nextHarvest, nextHarvest];
  state.stations = Object.fromEntries(Object.keys(state.stations).map((kind) => [kind, emptyStation()]));
  return true;
}

export function appraisalOffer(state) {
  const cost = appraisalCosts[state.appraisalLevel];
  if (cost === undefined) return null;
  return { cost, affordable: state.researchPoints >= cost, multiplierTenths: 12 + 2 * state.appraisalLevel };
}

export function upgradeAppraisal(state) {
  const offer = appraisalOffer(state);
  if (!offer?.affordable) return false;
  state.researchPoints -= offer.cost;
  state.appraisalLevel += 1;
  return true;
}

export function plotPrice(state) {
  const n = BigInt(state.plots.length - 2);
  const divisor = 5n ** n;
  return (60n * 6n ** n + divisor - 1n) / divisor;
}

export function buyPlot(state) {
  const price = plotPrice(state);
  if (state.plots.length >= 40 || state.coins < price) return false;
  state.coins -= price;
  state.plots.push(state.clockMs + firstHarvestMs);
  state.stats.plots += 1;
  return true;
}
