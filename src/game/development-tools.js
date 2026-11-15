import catalog from '../content/game-data.json' with { type: 'json' };
import { techDefinitions } from './advancement.js';

const techLevelLimit = 5;
const coinGrant = 1_000_000_000_000n;

export function grantDevelopmentTools(world) {
  world.unlocked = [...new Set([...world.unlocked, ...Object.keys(catalog.items)])];
  for (const { key } of techDefinitions) world.tech[key] = techLevelLimit;
  world.coins += coinGrant;
  return true;
}
