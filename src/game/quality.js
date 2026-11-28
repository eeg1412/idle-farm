import { accountRandom } from './account-random.js';

export const qualityDrawCost = 100n;

export function qualityDrawOffer(world, mode = 'single') {
  if (mode !== 'single' && mode !== 'all') return null;
  const funded = world.basicResearchPoints / qualityDrawCost;
  const count = mode === 'all' ? funded : 1n;
  return { mode, count, cost: count * qualityDrawCost, sequence: world.qualityDraws,
    affordable: count > 0n && count <= funded && world.unlocked.length > 0 && Boolean(world.accountSeed) };
}

export function drawQuality(world, mode, expectedOffer) {
  const offer = qualityDrawOffer(world, mode);
  if (!offer?.affordable || (expectedOffer !== undefined &&
    ['mode', 'count', 'cost', 'sequence'].some((key) => offer[key] !== expectedOffer?.[key]))) return false;

  const ids = [...world.unlocked].sort();
  const levels = ids.map((id) => BigInt(world.quality[id] ?? '1'));
  let minimum = levels.reduce((left, right) => left < right ? left : right);
  let minimumCount = levels.filter((level) => level === minimum).length;
  const candidateCount = BigInt(ids.length);
  const gains = {};
  for (let draw = 0n; draw < offer.count; draw += 1n) {
    const uniformBelow = accountRandom(world.accountSeed, 'quality', offer.sequence + draw);
    let index;
    do {
      index = Number(uniformBelow(candidateCount));
    } while (uniformBelow(4n + levels[index] - minimum) >= 4n);
    const previous = levels[index];
    levels[index] += 1n;
    gains[ids[index]] = (gains[ids[index]] ?? 0n) + 1n;
    if (previous === minimum && --minimumCount === 0) {
      minimum += 1n;
      minimumCount = levels.filter((level) => level === minimum).length;
    }
  }
  for (const id of Object.keys(gains)) world.quality[id] = (BigInt(world.quality[id] ?? '1') + gains[id]).toString();
  world.basicResearchPoints -= offer.cost;
  world.qualityDraws += offer.count;
  return { count: offer.count, gains };
}
