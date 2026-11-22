import data from '../content/game-data.json' with { type: 'json' };
import visuals from '../content/workshop-visuals.json' with { type: 'json' };

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const positive = (value) => Number.isFinite(value) && value > 0;
const finitePair = (pair) => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite);
const sizePair = (pair) => finitePair(pair) && pair.every(positive);
const machineKey = (kind) => kind === 'P' ? 'refining' : 'processing';
const textureKey = (key) => 'workshop:' + key;

export function workshopIconIds(id) {
  if (!data.items[id]) return [];
  return [...new Set([...Object.keys(data.items[id].inputs ?? {}), id])];
}

export function workshopTextureSources(kind, config = visuals) {
  const { stage, background, conveyor, effects } = config ?? {};
  const machine = config?.machines?.[machineKey(kind)];
  const { base, tread } = conveyor ?? {};
  const { gear, chimney, smoke } = effects ?? {};
  const sources = { background, machine, base, tread, gear, chimney, smoke };
  const { x, y, width, height } = machine?.placement ?? {};
  if (!Object.values(sources).every((asset) => asset?.path && sizePair(asset.size))
      || ![stage?.width, stage?.height, width, height, tread.logicalWidth, conveyor.speed, conveyor.inputSize,
        conveyor.outputSize, conveyor.underlap, gear.diameter,
        gear.periodMs, smoke.intervalMs, smoke.lifetimeMs, smoke.startSize, smoke.endSize].every(positive)
      || ![x, y, base.y, tread.y, conveyor.contactY,
        smoke.maxAlpha, smoke.rise, smoke.drift, smoke.sway].every(Number.isFinite)
      || !(Number.isFinite(conveyor.inputGap) && conveyor.inputGap >= 0) ||!(conveyor.outputOverlap >= 0 && conveyor.outputOverlap < 1)
      || !finitePair(gear.position)
      || !finitePair(chimney.position) || !finitePair(chimney.mouth) || !sizePair(chimney.logicalSize)) return [];
  const [frameX, frameY, frameWidth, frameHeight] = tread.frame ?? [];
  if (![frameX, frameY, frameWidth, frameHeight].every(Number.isInteger)
      || frameX < 0 || frameY < 0 || frameWidth < 1 || frameHeight < 1
      || frameX + frameWidth > tread.size[0] || frameY + frameHeight > tread.size[1]
      || conveyor.contactY < tread.y || conveyor.contactY >= tread.y + frameHeight) return [];
  return Object.entries(sources).map(([key, asset]) => ({ ...asset, key: textureKey(key) }));
}

function randomSequence(key) {
  let seed = 2166136261;
  for (const character of key) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Economy quantities are BigInt (or their decimal strings). Display counts are capped before
// becoming Numbers: any count above the cap is far beyond the densest pace a batch can show.
const countCap = 1_000_000_000n;
export function workshopDisplayCount(value) {
  try {
    const count = BigInt(value ?? 0);
    return count <= 0n ? 0 : Number(count > countCap ? countCap : count);
  } catch {
    return 0;
  }
}

// Output pace: spread `count` items evenly over `duration` ms, but never closer than `gap`
// logical px at belt `speed`. Past that density the belt runs continuously at `gap` and shows
// fewer items.
export function workshopConveyorPace(count, duration, speed, gap) {
  if (!(count > 0) || !(duration > 0)) return { count: 0, interval: 0 };
  const even = duration / count;
  const tightest = gap / speed;
  if (even >= tightest) return { count, interval: even };
  return { count: Math.max(1, Math.floor(duration / tightest)), interval: tightest };
}

// Input schedule, front-loaded: every batch's items enter from wholly outside the left edge,
// the first one at batch start, then one per minimum gap (`interval` = gap / speed), so item k
// (1..count) reaches the machine at start + travel + (k − 1)·interval. Only items that reach the
// machine by the batch end are shown, so nothing appears or vanishes mid-belt: count =
// min(total, floor((duration − travel) / interval) + 1), and 0 when duration < travel.
export function workshopInputSchedule(total, duration, speed, gap, travel) {
  const interval = gap / speed;
  if (!(total > 0) || !(duration >= travel)) return { count: 0, interval, travel };
  return { count: Math.min(total, Math.floor((duration - travel) / interval) + 1), interval, travel };
}

// Scale the real per-material counts to the shown count (largest remainder, every material
// kept once when there is room), so a saturated belt still carries the batch's material mix.
function materialQuotas(counts, total, shown) {
  if (shown >= total) return counts;
  const reserved = shown >= counts.length ? 1 : 0;
  const spread = shown - reserved * counts.length;
  const shares = counts.map(([id, count], index) => {
    const exact = spread * count / total;
    return { id, index, quota: reserved + Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = shown - shares.reduce((sum, { quota }) => sum + quota, 0);
  for (const share of [...shares].sort((a, b) => b.rest - a.rest || a.index - b.index)) {
    if (left <= 0) break;
    share.quota += 1;
    left -= 1;
  }
  return shares.filter(({ quota }) => quota > 0).map(({ id, quota }) => [id, quota]);
}

const gcd = (a, b) => b ? gcd(b, a % b) : a;

// Stable mixed order of an exact multiset without building it: an affine permutation of the
// slots (offset from the recipe and batch start) indexes the cumulative material buckets.
export function workshopMaterialMix(counts, recipeId, start, shown) {
  const total = counts.reduce((sum, [, count]) => sum + count, 0);
  if (!(shown > 0) || !total) return () => undefined;
  const quotas = materialQuotas(counts, total, shown);
  const random = randomSequence(recipeId + ':' + start);
  let step = Math.max(1, Math.round(shown * 0.6180339887));
  while (gcd(step, shown) !== 1) step += 1;
  const offset = Math.floor(random() * shown);
  return (slot) => {
    let bucket = (step * slot + offset) % shown;
    for (const [id, quota] of quotas) {
      if (bucket < quota) return id;
      bucket -= quota;
    }
    return quotas.at(-1)[0];
  };
}

export function workshopSceneLayout(id, kind, config = visuals) {
  const item = data.items[id];
  if (!item || !workshopTextureSources(kind, config).length) return undefined;
  const { stage, conveyor, effects } = config;
  const machine = config.machines[machineKey(kind)];
  const left = machine.placement.x;
  const right = left + machine.placement.width;
  const inputMaskEnd = left + conveyor.underlap;
  const outputMaskStart = right - conveyor.underlap;
  const inputHalf = conveyor.inputSize / 2;
  const outputHalf = conveyor.outputSize / 2;
  const coverX = inputMaskEnd + inputHalf;
  const materials = Object.keys(item.inputs ?? {});
  const spawnX = -inputHalf;
  const inputGap = conveyor.inputSize + conveyor.inputGap;
  const outputStartX = outputMaskStart - outputHalf;
  const outputEndX = stage.width + outputHalf;
  const outputGap = conveyor.outputSize * (1 - conveyor.outputOverlap);

  function surface(fromX, toX) {
    return {
      base: { x: fromX, y: conveyor.base.y, width: toX - fromX, height: conveyor.base.size[1] },
      bounds: { x: fromX, y: conveyor.tread.y, width: toX - fromX, height: conveyor.tread.frame[3] },
    };
  }

  return {
    stage, machine, treadFrame: conveyor.tread.frame, gear: effects.gear, chimney: effects.chimney,
    smoke: { ...effects.smoke, mouth: effects.chimney.mouth, recipeId: id,
      capacity: Math.ceil(effects.smoke.lifetimeMs / effects.smoke.intervalMs) },
    surfaceRegions: [surface(0, inputMaskEnd), surface(outputMaskStart, stage.width)],
    // Pools are bounded by belt length ÷ minimum spacing (+1 item at each end).
    inputStream: {
      recipeId: id, materials, size: conveyor.inputSize, gap: inputGap,
      coverX, spawnX, contactY: conveyor.contactY,
      capacity: materials.length ? Math.floor((coverX - spawnX) / inputGap) + 2 : 0,
    },
    itemMasks: {
      input: { x: 0, y: 0, width: inputMaskEnd, height: stage.height },
      output: { x: outputMaskStart, y: 0, width: stage.width - outputMaskStart, height: stage.height },
    },
    output: { id, size: conveyor.outputSize, gap: outputGap, startX: outputStartX, endX: outputEndX,
      y: conveyor.contactY, capacity: Math.floor((outputEndX - outputStartX) / outputGap) + 2 },
    surfaceSpeed: conveyor.speed, surfacePeriod: conveyor.tread.logicalWidth,
  };
}

const outputMemoryMs = 60_000;
const outputWindowLimit = 4;
const batchInputs = (inputs) => Object.entries(inputs ?? {})
  .map(([id, value]) => [id, workshopDisplayCount(value)]).filter(([, count]) => count > 0);

// Read activity from the existing station snapshots. An expired batch can still
// be attached to the last snapshot, so the animation waits for a rollover.
// `motion.batch` keeps the running batch's capped input counts and amount; each settled batch
// leaves an output window { start: its end, duration, amount } in `motion.outputs`.
export function syncWorkshopMotion(motion, station, clock) {
  const id = station?.batch?.id ?? station?.recipe;
  if (!id || id !== motion.id) return false;
  const previous = motion.batch;
  const batch = station.batch;
  const next = batch?.id === id && batch.end > batch.start ? batch : undefined;
  const sameBatch = previous && next && previous.start === next.start && previous.end === next.end;
  const lastClock = motion.lastClock ?? next?.start ?? clock;
  const observedClock = Math.max(lastClock, clock);
  motion.clock ??= 0;
  if (previous) motion.clock += Math.max(0, Math.min(clock, previous.end) - Math.max(lastClock, previous.start));
  if (!sameBatch) {
    if (next) {
      const from = Math.max(next.start, Math.min(lastClock, previous?.end ?? next.start));
      motion.clock += Math.max(0, Math.min(observedClock, next.end) - from);
    }
    if (previous && clock >= previous.end && (!next || next.start >= previous.end)) {
      motion.outputs = [...motion.outputs ?? [], {
        start: previous.end, duration: previous.end - previous.start, amount: previous.amount ?? 0,
      }].filter(({ start, duration }) => clock - start - duration < outputMemoryMs).slice(-outputWindowLimit);
    }
    motion.batch = next && { start: next.start, end: next.end,
      amount: workshopDisplayCount(next.amount), inputs: batchInputs(next.inputs) };
  } else {
    motion.batch.amount = workshopDisplayCount(next.amount);
  }
  motion.lastClock = observedClock;
  return Boolean(next && clock >= next.start && clock < next.end);
}

function machineOffsetAt(clock) {
  return [Math.sin(clock / 43) * 1.2, Math.sin(clock / 31) * 0.65];
}

function smokeFrame(smoke, clock) {
  const latest = Math.floor(clock / smoke.intervalMs);
  return Array.from({ length: smoke.capacity }, (_, index) => {
    const serial = latest - index;
    const born = serial * smoke.intervalMs;
    const progress = (clock - born) / smoke.lifetimeMs;
    if (serial < 0 || progress >= 1) return undefined;
    const random = randomSequence(smoke.recipeId + ':smoke:' + serial);
    const phase = random() * Math.PI * 2;
    const driftScale = 0.75 + random() * 0.5;
    const riseScale = 0.85 + random() * 0.3;
    const [dx, dy] = machineOffsetAt(born);
    const sway = Math.sin(progress * Math.PI * 2 + phase) * Math.sin(progress * Math.PI);
    return {
      position: [smoke.mouth[0] + dx + smoke.drift * progress * driftScale + smoke.sway * sway,
        smoke.mouth[1] + dy - smoke.rise * progress * riseScale],
      size: smoke.startSize + (smoke.endSize - smoke.startSize) * progress,
      alpha: smoke.maxAlpha * Math.min(1, progress / 0.16, (1 - progress) / 0.64),
    };
  });
}

// Inputs of the running batch only (no look-ahead into a batch that may never start): item k
// sits at coverX − v·(arrival − now) while 0 < arrival − now < travel, i.e. between entering
// at spawnX and passing under the machine mask. After the last one the belt runs empty.
function inputFrame(layout, batch, now) {
  const stream = layout.inputStream;
  const speed = layout.surfaceSpeed;
  const total = batch.inputs.reduce((sum, [, count]) => sum + count, 0);
  const travel = (stream.coverX - stream.spawnX) / speed;
  const { count, interval } = workshopInputSchedule(total, batch.end - batch.start, speed, stream.gap, travel);
  const items = [];
  if (!count) return items;
  const material = workshopMaterialMix(batch.inputs, stream.recipeId, batch.start, count);
  const since = now - batch.start;
  const first = Math.max(1, Math.floor((since - travel) / interval) + 1);
  const last = Math.min(count, Math.ceil(since / interval) + 1);
  for (let k = first; k <= last && items.length < stream.capacity; k += 1) {
    const ahead = travel + (k - 1) * interval - since;
    if (ahead <= 0 || ahead >= travel) continue;
    items.push({ id: material(k - 1), visible: true,
      position: [stream.coverX - speed * ahead, stream.contactY] });
  }
  return items;
}

// Products of settled batches: window { start, duration T, amount Q } emits item k (0..m−1) at
// start + k·Δ (first one at completion), then it rides right at belt speed until past endX.
// A window stops emitting one minimum gap before the next one begins. Older emissions come first, so the pool
// draws each later product on top of the previous one.
function outputFrame(layout, outputs, now) {
  const { startX, endX, y, gap, capacity } = layout.output;
  const speed = layout.surfaceSpeed;
  const travel = (endX - startX) / speed;
  const items = [];
  outputs.forEach((settled, index) => {
    // Back-to-back windows already keep the minimum gap; this only trims a window that a
    // shorter following batch would otherwise crowd (e.g. after a speed-up).
    const limit = (outputs[index + 1]?.start ?? Infinity) - gap / speed + 1e-6;
    const pace = workshopConveyorPace(settled.amount, settled.duration, speed, gap);
    if (!pace.count) return;
    const first = Math.max(0, Math.floor((now - travel - settled.start) / pace.interval));
    const last = Math.min(pace.count - 1, Math.floor((now - settled.start) / pace.interval));
    for (let k = first; k <= last; k += 1) {
      const emitted = settled.start + k * pace.interval;
      const elapsed = now - emitted;
      if (emitted > limit || elapsed < 0 || elapsed >= travel) continue;
      items.push({ visible: true, position: [clamp(startX + speed * elapsed, startX, endX), y], alpha: 1 });
    }
  });
  return items.slice(-capacity);
}

// `clock` is the active-only display clock (belt surface, gear, shake, smoke). Inputs and
// outputs follow the real station clock `now`, the same base as batch start/end.
export function workshopMotionFrame(layout, clock, { running = true, now = clock, batch, outputs = [] } = {}) {
  const travel = clock * layout.surfaceSpeed;
  const displacement = travel % layout.surfacePeriod;
  const inputs = running && batch?.inputs?.length && layout.inputStream.capacity
    ? inputFrame(layout, batch, now) : [];
  return {
    surfaceOffsets: layout.surfaceRegions.map(({ bounds }) => [displacement - bounds.x, 0]),
    inputs,
    outputs: outputFrame(layout, outputs, now),
    machineOffset: machineOffsetAt(clock),
    gearAngle: Math.PI * 2 * (clock % layout.gear.periodMs) / layout.gear.periodMs,
    smoke: running ? smokeFrame(layout.smoke, clock) : [],
  };
}
