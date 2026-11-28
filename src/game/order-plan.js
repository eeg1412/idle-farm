import catalog from '../content/game-data.json' with { type: 'json' };
import { facilityYieldBasis } from './advancement.js';
import { activeMerchantHoldQuantity, orderItemTags } from './orders.js';
import {
  actualHourlyProduction, assignProductionBatch, availableToProduce, orderCompletion, productionDurationMs, quantity, setStationPriority,
  stationMultiplier,
} from './world.js';

// Order line planning (docs/tasks/2026-11-28-order-line-plan.md).
//
// Quantity model: the gap of the ordered product is count - (stock - merchant hold). Walking the
// recipe inputs in topological order, an item x still to be made needs net(x) = demand(x) - stock(x)
// (stock = availableToProduce, which leaves the processing reserve and the merchant hold), and
// each input i of x is demanded ceil(net(x) x inputs[i] / output) more. Station levels scale inputs
// and output alike, so the ratio does not depend on levels.
//
// Rate model: the product runs at R (items per hour of its existing order lines plus the new ones),
// finishing its gap in net(root) / R; over that span an upstream item x must arrive at
// D(x) = R x net(x) / net(root). Every slot already making x (all such slots carry the order tag)
// counts toward x at its current-level full-speed rate. New lines for x are added in selection order
// while the rate stays below D(x) and one round of batches (sum of per-batch outputs) stays below
// net(x); an item with no line at all gets at least one. Rates are items per hour x 10^12, floored
// per line; a shortfall of at most one unit per counted line reads as covered.
//
// New product lines range from min (one, or none when the product already has lines) to max (its
// free slots less those the chain's lineless items of the same kind need). The recommended count
// starts at what one batch round needs and drops one line at a time until the upstream balances
// (the minimum when none does). For any chosen count every upstream item without a line gets one,
// then lines toward the balance while slots last; when even one each does not fit, 'noSlot'.

const facilityKinds = new Set(['C', 'L', 'F', 'M']);
const rateScale = 3_600_000n * 10n ** 12n;
const ceilDiv = (value, divisor) => (value + divisor - 1n) / divisor;

const slotKind = (id) => {
  const kind = catalog.items[id]?.kind;
  if (!kind) return null;
  return facilityKinds.has(kind) ? kind : kind[0];
};
const slotGroup = (world, kind) => facilityKinds.has(kind) ? world.facilities[kind] ?? [] : world.stations[kind] ?? [];

function batchOutput(world, kind, id, level) {
  const base = BigInt(catalog.items[id].output);
  const scaled = base * stationMultiplier(level);
  return facilityKinds.has(kind) ? scaled * BigInt(facilityYieldBasis(world, kind)) / 10000n : scaled;
}

function lineFor(world, kind, id, level) {
  const output = batchOutput(world, kind, id, level);
  const duration = BigInt(productionDurationMs(world, id) ?? 0);
  return { output, rate: duration > 0n ? output * rateScale / duration : 0n };
}

// Items reachable from the product through recipe inputs, consumers before their inputs.
function topologicalChain(root) {
  const order = [];
  const done = new Set();
  const visiting = new Set();
  const visit = (id) => {
    if (done.has(id) || visiting.has(id) || !catalog.items[id]) return;
    visiting.add(id);
    for (const input of Object.keys(catalog.items[id].inputs ?? {})) visit(input);
    visiting.delete(id);
    done.add(id);
    order.push(id);
  };
  visit(root);
  return order.reverse();
}

function chainNeeds(world, root, gap) {
  const chain = topologicalChain(root);
  const demand = new Map([[root, gap]]);
  const net = new Map();
  for (const id of chain) {
    const wanted = demand.get(id) ?? 0n;
    const stock = id === root ? 0n : availableToProduce(world, id);
    const short = wanted - stock;
    if (short <= 0n) continue;
    net.set(id, short);
    const item = catalog.items[id];
    const output = BigInt(item.output);
    for (const [input, amount] of Object.entries(item.inputs ?? {})) {
      demand.set(input, (demand.get(input) ?? 0n) + ceilDiv(short * BigInt(amount), output));
    }
  }
  // Items still to be made, product first.
  return { items: chain.filter((id) => net.has(id)), net };
}

const tagged = (tags, slot) => [slot.recipe, slot.batch?.id].some((id) => id && (tags.products.has(id) || tags.materials.has(id)));

// Empty slots, then slots waiting for inputs, then running slots by least progress; higher level first.
function candidatePool(world, kind, tags) {
  const tier = (slot) => !slot.batch ? (slot.recipe ? 1 : 0) : 2;
  const clock = BigInt(world.clockMs);
  const entries = slotGroup(world, kind).map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !tagged(tags, slot));
  return entries.sort((a, b) => {
    const tiers = tier(a.slot) - tier(b.slot);
    if (tiers) return tiers;
    if (tier(a.slot) === 2) {
      const span = (slot) => { const value = BigInt(slot.batch.end) - BigInt(slot.batch.start); return value > 0n ? value : 1n; };
      const done = (slot) => clock - BigInt(slot.batch.start);
      const left = done(a.slot) * span(b.slot);
      const right = done(b.slot) * span(a.slot);
      if (left !== right) return left < right ? -1 : 1;
    }
    const levels = BigInt(b.slot.level ?? '1') - BigInt(a.slot.level ?? '1');
    if (levels) return levels > 0n ? 1 : -1;
    return a.index - b.index;
  });
}

// Full-speed rate, line count and one-round batch output of every slot already making `id`.
function existingLines(world, id) {
  let rate = 0n;
  let lines = 0n;
  let round = 0n;
  for (const kind of [...facilityKinds, 'I', 'P']) {
    for (const slot of slotGroup(world, kind)) {
      if (slot.recipe !== id) continue;
      const line = lineFor(world, kind, id, slot.level ?? '1');
      rate += line.rate;
      lines += 1n;
      round += line.output;
    }
  }
  return { rate, lines, round };
}

// Exactly `rootLines` new product lines; then one line for every upstream item without any line
// (failing with that item's kind when its pool is empty); then upstream lines toward the balance
// in topological order while slots last. `balanced` tells whether every upstream item reached it.
function allocate(world, root, items, net, existing, pools, rootLines) {
  const taken = new Map([...pools.keys()].map((kind) => [kind, 0]));
  const take = (kind) => {
    const pool = pools.get(kind);
    const next = taken.get(kind);
    if (next >= pool.length) return null;
    taken.set(kind, next + 1);
    return pool[next];
  };
  const chosen = [];
  const rootKind = slotKind(root);
  let rootRate = existing.get(root).rate;
  for (let count = 0; count < rootLines; count += 1) {
    const entry = take(rootKind);
    if (!entry) return { failed: rootKind };
    rootRate += lineFor(world, rootKind, root, entry.slot.level ?? '1').rate;
    chosen.push({ kind: rootKind, entry, id: root });
  }
  if (rootRate <= 0n) return { failed: rootKind };
  const upstream = items.filter((id) => id !== root).map((id) => ({ id, kind: slotKind(id), ...existing.get(id) }));
  const add = (state) => {
    const entry = take(state.kind);
    if (!entry) return false;
    const line = lineFor(world, state.kind, state.id, entry.slot.level ?? '1');
    state.rate += line.rate;
    state.lines += 1n;
    state.round += line.output;
    chosen.push({ kind: state.kind, entry, id: state.id });
    return true;
  };
  for (const state of upstream) {
    if (state.lines === 0n && !add(state)) return { failed: state.kind };
  }
  let balanced = true;
  for (const state of upstream) {
    const target = rootRate * net.get(state.id) / net.get(root);
    while (state.rate + state.lines < target && state.round < net.get(state.id)) {
      if (!add(state)) { balanced = false; break; }
    }
  }
  // Group the changes by item: product first, then upstream in topological order.
  const rank = new Map(items.map((id, index) => [id, index]));
  chosen.sort((a, b) => rank.get(a.id) - rank.get(b.id));
  return { chosen, balanced };
}

const sameChange = (a, b) => a && b && a.kind === b.kind && a.index === b.index &&
  a.from === b.from && a.to === b.to;

// Mutates `world`; callers run it on a copy.
function executeChanges(world, changes) {
  for (const { kind, index } of changes) {
    // Priority first, so the settlement after each arrangement already serves the order chain.
    if (!facilityKinds.has(kind) && !setStationPriority(world, kind, index, true)) return false;
  }
  for (const { kind, index, to } of changes) {
    if (!assignProductionBatch(world, kind, [index], to)) return false;
  }
  return true;
}

function lockedOrder(world, orderId) {
  const order = world.orders.active.find((entry) => entry.id === orderId);
  return order?.status === 'locked' ? order : null;
}

function planChanges(world, order, requestedLines) {
  const root = order.item;
  if (!catalog.items[root]) return { status: 'blocked', reason: 'notAccepted' };
  const held = quantity(world, root) - activeMerchantHoldQuantity(world, root);
  const gap = BigInt(order.count) - (held > 0n ? held : 0n);
  if (gap <= 0n) return { status: 'blocked', reason: 'stockReady' };

  const { items, net } = chainNeeds(world, root, gap);
  const locked = items.find((id) => !world.unlocked.includes(id));
  if (locked) return { status: 'blocked', reason: 'locked', item: locked };
  const missing = items.map(slotKind).find((kind) => !kind || slotGroup(world, kind).length === 0);
  if (missing !== undefined) return { status: 'blocked', reason: 'missingFacility', kind: missing };

  const tags = orderItemTags(world);
  const pools = new Map();
  for (const kind of new Set(items.map(slotKind))) pools.set(kind, candidatePool(world, kind, tags));
  const existing = new Map(items.map((id) => [id, existingLines(world, id)]));

  // Range of new product lines. min: one, or none when the product already has lines. max: the
  // product's free slots less the one line every upstream item without any line still needs from
  // the same pool; other pools must cover their own such items.
  const rootKind = slotKind(root);
  const rootExisting = existing.get(root);
  const minimum = new Map();
  for (const id of items) {
    if (id === root || existing.get(id).lines > 0n) continue;
    const kind = slotKind(id);
    minimum.set(kind, (minimum.get(kind) ?? 0) + 1);
  }
  for (const [kind, count] of minimum) {
    if (kind !== rootKind && pools.get(kind).length < count) return { status: 'blocked', reason: 'noSlot', kind };
  }
  const min = rootExisting.lines > 0n ? 0 : 1;
  const max = pools.get(rootKind).length - (minimum.get(rootKind) ?? 0);
  if (max < min) return { status: 'blocked', reason: 'noSlot', kind: rootKind };

  // Recommended: from as many lines as one batch round needs to cover the gap, down to the first
  // count whose upstream balances; the minimum when none does.
  let roundLines = 0;
  let round = rootExisting.round;
  for (const { slot } of pools.get(rootKind)) {
    if (round >= gap || roundLines >= max) break;
    round += batchOutput(world, rootKind, root, slot.level ?? '1');
    roundLines += 1;
  }
  let recommended = min;
  for (let lines = Math.max(roundLines, min); lines > min; lines -= 1) {
    if (allocate(world, root, items, net, existing, pools, lines).balanced) { recommended = lines; break; }
  }
  const rootRange = { min, max, recommended };
  const rootLines = Number.isInteger(requestedLines) ? Math.min(max, Math.max(min, requestedLines)) : recommended;

  const result = allocate(world, root, items, net, existing, pools, rootLines);
  if (!result.chosen) return { status: 'blocked', reason: 'noSlot', kind: result.failed };
  const changes = result.chosen.map(({ kind, entry, id }) => ({
    kind, index: entry.index, from: entry.slot.recipe ?? null, to: id, running: Boolean(entry.slot.batch),
  }));
  if (!changes.length && max === 0) return { status: 'blocked', reason: 'covered' };
  return { status: 'ok', changes, rootRange, rootLines };
}

// Completion after the plan ran on `world` (a copy). Running lines and stock come first
// (orderCompletion); lines that cannot start a batch yet are estimated from real hourly output,
// where idle stations draw on upstream real output (actualHourlyProduction).
function plannedCompletion(world, order) {
  const scheduled = orderCompletion(world, order);
  if (scheduled.status === 'ready' || scheduled.status === 'scheduled') return scheduled;
  const held = quantity(world, order.item) - activeMerchantHoldQuantity(world, order.item);
  const gap = BigInt(order.count) - (held > 0n ? held : 0n);
  if (gap <= 0n) return { status: 'ready' };
  const hourly = actualHourlyProduction(world).find((row) => row.id === order.item)?.net ?? 0n;
  if (hourly <= 0n) return { status: 'unknown' };
  const at = BigInt(world.clockMs) + ceilDiv(gap * 100n * 3_600_000n, hourly);
  const atMs = Number(at);
  return Number.isSafeInteger(atMs) && BigInt(atMs) === at
    ? { status: 'scheduled', atMs, estimated: true } : { status: 'unknown' };
}

// `completion: false` skips the copy and the completion estimate (for button states).
// `rootLines` picks the new product lines within rootRange (clamped); omitted, the recommended count.
export function planOrderLines(world, orderId, { completion = true, rootLines } = {}) {
  const order = lockedOrder(world, orderId);
  if (!order) return { status: 'blocked', reason: 'notAccepted' };
  const plan = planChanges(world, order, rootLines);
  if (plan.status !== 'ok' || !completion) return plan;
  const copy = structuredClone(world);
  const estimate = executeChanges(copy, plan.changes)
    ? plannedCompletion(copy, copy.orders.active.find((entry) => entry.id === orderId))
    : { status: 'unknown' };
  return { ...plan, completion: estimate };
}

export function applyOrderLines(world, orderId, expectedChanges, rootLines) {
  const order = lockedOrder(world, orderId);
  if (!order || !Array.isArray(expectedChanges)) return false;
  const plan = planChanges(world, order, rootLines);
  if (plan.status !== 'ok' || !plan.changes.length || plan.changes.length !== expectedChanges.length ||
      !plan.changes.every((change, index) => sameChange(change, expectedChanges[index]))) return false;
  // Work on a copy so a refused arrangement leaves the world untouched.
  const copy = structuredClone(world);
  if (!executeChanges(copy, plan.changes)) return false;
  for (const key of Object.keys(world)) if (!Object.hasOwn(copy, key)) delete world[key];
  Object.assign(world, copy);
  return true;
}
