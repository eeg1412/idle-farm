import catalog from '../content/game-data.json' with { type: 'json' };
import { techDefinitions } from './advancement.js';
import { capsuleHoldLimit } from './capsules.js';

const coinGrant = 1_000_000_000_000n;

export function grantDevelopmentTools(world) {
  world.unlocked = [...new Set([...world.unlocked, ...Object.keys(catalog.items)])];
  for (const { key, maxLevel } of techDefinitions) world.tech[key] = maxLevel;
  world.coins += coinGrant;
  // Time capsules are set to the holding cap (expansion spec 10.9).
  world.capsules = capsuleHoldLimit;
  return true;
}
