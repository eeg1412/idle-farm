import catalog from '../content/game-data.json' with { type: 'json' };
import { techDefinitions } from './advancement.js';

const coinGrant = 1_000_000_000_000n;

export function grantDevelopmentTools(world) {
  world.unlocked = [...new Set([...world.unlocked, ...Object.keys(catalog.items)])];
  for (const { key, maxLevel } of techDefinitions) world.tech[key] = maxLevel;
  world.coins += coinGrant;
  // Development grant: a fixed stock of 144,000 capsules (holdings have no cap).
  world.capsules = 144_000n;
  return true;
}
