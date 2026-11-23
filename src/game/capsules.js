// Time capsules (expansion spec 10): an account resource that fast-forwards one building category.
// The world clock never moves here; only the chosen category's slots are advanced on a virtual
// timeline and then shifted back so their remaining time reflects the skipped duration.
import { recordOrderAcquisition, recordOrderProduction } from './orders.js';
import { productionContributionBatch } from './prestige-ledger.js';
import {
  deposit, orderedStations, popEvent, productionDurationMs, productionRestarter, pushEvent, settleProduction, startFacility,
} from './world.js';

export const capsulesPerMinute = 100n;
export const capsuleUseLimit = 12_000n;
export const capsuleStep = 100n;
export const capsuleKinds = ['C', 'L', 'F', 'M', 'I', 'P'];
// Upper bound on estimated batch completions (station kinds) for one use; see spec 10.3 rule 8.
export const capsuleEventLimit = 50_000;

const minuteMs = 60_000;
const stationKinds = new Set(['I', 'P']);
const maximumMinutes = Number(capsuleUseLimit / capsulesPerMinute);

const owned = (world) => world.capsules ?? 0n;

// Holdings have no cap; `remaining` stays in the result shape and is always 0n.
export function grantCapsules(world, amount) {
  if (typeof amount !== 'bigint' || amount < 0n) return { added: 0n, remaining: 0n };
  world.capsules = owned(world) + amount;
  return { added: amount, remaining: 0n };
}

const copyGroups = (groups) => Object.fromEntries(Object.entries(groups).map(([kind, slots]) =>
  [kind, slots.map((slot) => ({ ...slot }))]));

// Enough of a copy for settleProduction and a dry station run: starts replace slot batch/planting/mining
// objects and write inventory entries; nothing else is written.
function projectProduction(world) {
  return { ...world, inventory: { ...world.inventory },
    facilities: copyGroups(world.facilities), stations: copyGroups(world.stations) };
}

function ownStations(world, kind) {
  const own = new Set(world.stations[kind]);
  return orderedStations(world).filter((station) => own.has(station));
}

// Completions of one running facility within `durationMs`, in closed form.
function facilityCompletions(world, facility, durationMs) {
  const { batch } = facility;
  const target = world.clockMs + durationMs;
  if (!batch || batch.end > target) return null;
  const duration = productionDurationMs(world, facility.recipe);
  const repeats = Math.floor((target - batch.end) / duration);
  return { first: batch.end, repeats, lastStart: batch.end + repeats * duration };
}

function facilityBatchCount(world, kind, durationMs) {
  let total = 0n;
  for (const facility of world.facilities[kind]) {
    if (!facility.recipe) continue;
    const completion = facilityCompletions(world, facility, durationMs);
    if (completion) total += 1n + BigInt(completion.repeats);
  }
  return total;
}

// Upper-bound estimate of station completions (no stalls), used by the computation guard.
function stationEventEstimate(world, kind, durationMs) {
  let total = 0;
  for (const station of world.stations[kind]) {
    if (!station.recipe) continue;
    const duration = productionDurationMs(world, station.recipe);
    const untilFirst = station.batch ? station.batch.end - world.clockMs : duration;
    if (untilFirst <= durationMs) total += 1 + Math.floor((durationMs - untilFirst) / duration);
  }
  return total;
}

function guardMinutes(world, kind) {
  let lower = 0;
  let upper = maximumMinutes;
  if (stationEventEstimate(world, kind, upper * minuteMs) <= capsuleEventLimit) return upper;
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    if (stationEventEstimate(world, kind, middle * minuteMs) <= capsuleEventLimit) lower = middle;
    else upper = middle;
  }
  return lower;
}

// Saves accept negative start times, so the shifted start keeps the true batch length.
const earlier = (at, durationMs) => at - durationMs;

// Shift the category's running slots back by the skipped duration so animations read the new progress.
// Save validation requires nonnegative starts, so a start that would precede clock zero is held at 0.
function shiftSlots(slots, durationMs) {
  for (const slot of slots) {
    if (!slot.batch) continue;
    slot.batch = { ...slot.batch, start: earlier(slot.batch.start, durationMs), end: slot.batch.end - durationMs };
    if (slot.planting) slot.planting = { ...slot.planting, start: earlier(slot.planting.start, durationMs) };
    if (slot.mining) slot.mining = { ...slot.mining, startedAt: earlier(slot.mining.startedAt, durationMs) };
  }
}

function addProduced(produced, id, count) {
  produced[id] = (produced[id] ?? 0n) + count;
}

function advanceFacilities(world, kind, durationMs) {
  const clockMs = world.clockMs;
  const facilities = world.facilities[kind];
  const pending = [];
  facilities.forEach((facility, rank) => {
    if (!facility.recipe) return;
    const completion = facilityCompletions(world, facility, durationMs);
    if (completion) pending.push({ facility, rank, ...completion });
  });
  // Deposit in completion order, as the event timeline would first see each item.
  pending.sort((a, b) => a.first - b.first || a.rank - b.rank);
  const contributions = productionContributionBatch(world);
  const produced = {};
  let batches = 0n;
  try {
    for (const { facility, repeats, lastStart } of pending) {
      const finished = facility.batch;
      facility.batch = null;
      // Restart with the same rules as normal play; every repeat yields the same snapshot amount.
      world.clockMs = lastStart;
      startFacility(world, kind, facility);
      world.clockMs = clockMs;
      deposit(world, finished, contributions, world.wallAnchorMs);
      addProduced(produced, finished.id, BigInt(finished.amount));
      if (repeats > 0) {
        const count = BigInt(facility.batch.amount) * BigInt(repeats);
        deposit(world, { id: facility.batch.id, amount: String(count) }, contributions, world.wallAnchorMs);
        addProduced(produced, facility.batch.id, count);
      }
      batches += 1n + BigInt(repeats);
    }
  } finally {
    world.clockMs = clockMs;
    contributions.flush();
  }
  shiftSlots(facilities, durationMs);
  return { batches, produced };
}

// Event-by-event station run on the virtual timeline [clockMs, clockMs + durationMs].
// `apply` deposits through the normal production path; otherwise only inventory is tracked.
function runStations(world, kind, durationMs, apply) {
  const clockMs = world.clockMs;
  const target = clockMs + durationMs;
  const stations = ownStations(world, kind);
  const heap = [];
  const enqueue = (entry) => pushEvent(heap, entry);
  for (const station of stations) if (station.batch) enqueue(station);
  const restart = productionRestarter(world, stations, enqueue, {});
  const contributions = apply ? productionContributionBatch(world) : null;
  const timeline = [];
  const produced = {};
  let batches = 0n;
  let stallAt = null;
  try {
    restart([], []);
    if (!heap.length) stallAt = 0;
    while (stallAt === null && heap[0].batch.end <= target) {
      const eventAt = heap[0].batch.end;
      world.clockMs = eventAt;
      const completed = [];
      const depositedIds = new Set();
      let firstProduct = null;
      let firstStation = null;
      while (heap[0]?.batch.end === eventAt) {
        const entry = popEvent(heap);
        const { id } = entry.batch;
        const count = BigInt(entry.batch.amount);
        if (apply) {
          deposit(world, entry.batch, contributions, world.wallAnchorMs);
          // Same tie-break as advanceWorld; the first order is timed from the real clock.
          if (recordOrderAcquisition(world, id) && world.orders.nextAttemptMs === null) {
            if (!firstStation || entry.order < firstStation.order ||
                (entry.order === firstStation.order && world.stations.P.indexOf(entry) < world.stations.P.indexOf(firstStation))) {
              firstProduct = id;
              firstStation = entry;
            }
          }
          addProduced(produced, id, count);
        } else world.inventory[id] = (world.inventory[id] ?? 0n) + count;
        depositedIds.add(id);
        entry.batch = null;
        completed.push(entry);
      }
      batches += BigInt(completed.length);
      timeline.push(eventAt - clockMs, completed.length);
      if (firstProduct !== null) recordOrderProduction(world, firstProduct, clockMs);
      restart(completed, depositedIds);
      if (!heap.length) stallAt = eventAt - clockMs;
    }
  } finally {
    world.clockMs = clockMs;
    contributions?.flush();
  }
  if (apply) shiftSlots(stations, durationMs);
  return { batches, produced, timeline, stallAt };
}

function countUntil(timeline, durationMs) {
  let total = 0n;
  for (let index = 0; index < timeline.length && timeline[index] <= durationMs; index += 2) total += BigInt(timeline[index + 1]);
  return total;
}

// Quote on a settled projection. Returns the public offer plus the station timeline for previews.
function quote(world, kind) {
  const base = { kind, owned: owned(world), maximum: 0n, step: capsuleStep, perMinute: capsulesPerMinute,
    useLimit: capsuleUseLimit, minutes: 0, batches: 0n, available: false,
    stallMinutes: null, guardMinutes: null };
  if (!capsuleKinds.includes(kind)) return { offer: base, sim: null, timeline: null };
  const sim = projectProduction(world);
  settleProduction(sim);
  const station = stationKinds.has(kind);
  const slots = station ? sim.stations[kind] : sim.facilities[kind];
  // Usable only while the category has a batch in progress (spec 10.4).
  const available = slots.some((slot) => slot.recipe && slot.batch);
  const offer = { ...base, available };
  if (!available) return { offer, sim, timeline: null };
  let minutes = Math.min(maximumMinutes, Number(offer.owned / capsulesPerMinute));
  let timeline = null;
  if (station) {
    offer.guardMinutes = guardMinutes(sim, kind);
    minutes = Math.min(minutes, offer.guardMinutes);
    if (minutes > 0) {
      const run = runStations(projectProduction(sim), kind, minutes * minuteMs, false);
      timeline = run.timeline;
      if (run.stallAt !== null) {
        offer.stallMinutes = Math.floor(run.stallAt / minuteMs);
        minutes = Math.min(minutes, offer.stallMinutes);
      }
    }
  }
  if (minutes <= 0) return { offer, sim, timeline };
  // Zero completed batches still advances progress, so it does not disable use.
  const batches = station ? countUntil(timeline, minutes * minuteMs) : facilityBatchCount(sim, kind, minutes * minuteMs);
  return { offer: { ...offer, minutes, maximum: BigInt(minutes) * capsulesPerMinute, batches }, sim, timeline };
}

// offer.maximum = min(owned, 12,000, stall cutoff, computation guard) in whole minutes; 0n disables use.
// The stall cutoff is the first moment no slot of a station category can keep running.
export function capsuleUseOffer(world, kind) {
  return quote(world, kind).offer;
}

const validAmount = (offer, capsules) => typeof capsules === 'bigint' && capsules > 0n &&
  capsules % capsuleStep === 0n && capsules <= offer.maximum;

export function previewCapsuleUse(world, kind, capsules) {
  const { offer, sim, timeline } = quote(world, kind);
  const valid = validAmount(offer, capsules);
  const minutes = typeof capsules === 'bigint' && capsules > 0n ? Number(capsules / capsulesPerMinute) : 0;
  if (!valid) return { kind, capsules, minutes, durationMs: minutes * minuteMs, batches: 0n, valid };
  const durationMs = minutes * minuteMs;
  const batches = stationKinds.has(kind) ? countUntil(timeline, durationMs) : facilityBatchCount(sim, kind, durationMs);
  return { kind, capsules, minutes, durationMs, batches, valid };
}

// Called inside an action transaction; the caller settles task rewards in the same commit.
export function useCapsules(world, kind, capsules) {
  if (typeof capsules !== 'bigint' || !capsuleKinds.includes(kind)) return false;
  settleProduction(world);
  const { offer } = quote(world, kind);
  if (!validAmount(offer, capsules)) return false;
  world.capsules = owned(world) - capsules;
  const minutes = Number(capsules / capsulesPerMinute);
  const durationMs = minutes * minuteMs;
  const { batches, produced } = stationKinds.has(kind)
    ? runStations(world, kind, durationMs, true) : advanceFacilities(world, kind, durationMs);
  return { kind, capsules, minutes, durationMs, batches, produced };
}
