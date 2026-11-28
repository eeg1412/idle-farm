const productionPages = {
  料坊: { group: 'stations', slot: 'I', kind: 'processing' },
  工房: { group: 'stations', slot: 'P', kind: 'refining' },
  田地: { group: 'facilities', slot: 'C', kind: 'field' },
  畜牧: { group: 'facilities', slot: 'L', kind: 'livestock' },
  矿洞: { group: 'facilities', slot: 'M', kind: 'mine' },
};

// Read only the batches already projected for the current foreground display.
export function productionAmbienceFor(page, world) {
  const production = productionPages[page];
  if (!production || !world || !Number.isFinite(world.clockMs)) return null;
  const slots = world[production.group]?.[production.slot];
  if (!Array.isArray(slots)) return null;
  const running = (batch) => batch && batch.start <= world.clockMs && batch.end > world.clockMs;
  return slots.some((slot) => running(slot.batch)) ? { kind: production.kind } : null;
}
