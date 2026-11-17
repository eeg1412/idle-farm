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
        conveyor.inputSpacing, conveyor.packetSpacing, conveyor.outputSize, conveyor.underlap, gear.diameter,
        gear.periodMs, smoke.intervalMs, smoke.lifetimeMs, smoke.startSize, smoke.endSize].every(positive)
      || ![x, y, base.y, tread.y, conveyor.contactY,
        smoke.maxAlpha, smoke.rise, smoke.drift, smoke.sway].every(Number.isFinite)
      || !Number.isInteger(conveyor.maxPerEvent) || conveyor.maxPerEvent < 2
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

export function workshopMaterialOrder(materials, recipeId, cycle) {
  const random = randomSequence(recipeId + ':' + cycle);
  const order = [...materials];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}

export function workshopInputEvent(stream, serial) {
  if (serial < 0 || !stream.materials.length) return [];
  const cycle = Math.floor(serial / stream.materials.length);
  const eventIndex = serial % stream.materials.length;
  const order = workshopMaterialOrder(stream.materials, stream.recipeId, cycle);
  const random = randomSequence(stream.recipeId + ':group:' + serial);
  const count = 2 + Math.floor(random() * (stream.maxPerEvent - 1));
  return Array.from({ length: count }, (_, packet) => {
    const id = order[(eventIndex + packet) % order.length];
    return { id, event: serial, cycle, packet,
      origin: [stream.spawnX - packet * stream.packetSpacing, stream.contactY] };
  });
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
  const groupTail = (conveyor.maxPerEvent - 1) * conveyor.packetSpacing;
  const eventSlots = materials.length ? Math.ceil((coverX + inputHalf + groupTail) / conveyor.inputSpacing) : 0;

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
    inputStream: {
      recipeId: id, materials, size: conveyor.inputSize,
      spacing: conveyor.inputSpacing, packetSpacing: conveyor.packetSpacing,
      maxPerEvent: conveyor.maxPerEvent, coverX, spawnX: -inputHalf, contactY: conveyor.contactY,
      eventSlots, capacity: eventSlots * conveyor.maxPerEvent,
    },
    itemMasks: {
      input: { x: 0, y: 0, width: inputMaskEnd, height: stage.height },
      output: { x: outputMaskStart, y: 0, width: stage.width - outputMaskStart, height: stage.height },
    },
    output: { id, size: conveyor.outputSize, startX: outputMaskStart - outputHalf,
      endX: stage.width + outputHalf, y: conveyor.contactY },
    surfaceSpeed: conveyor.speed, surfacePeriod: conveyor.tread.logicalWidth,
  };
}

// Read activity from the existing station snapshots. An expired batch can still
// be attached to the last snapshot, so the animation waits for a rollover.
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
      motion.outputStart = previous.end;
    }
    motion.batch = next && { start: next.start, end: next.end };
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

export function workshopMotionFrame(layout, clock, { started = true, running = true, outputElapsed } = {}) {
  const travel = clock * layout.surfaceSpeed;
  const displacement = travel % layout.surfacePeriod;
  const stream = layout.inputStream;
  const latest = Math.floor(travel / stream.spacing);
  const inputs = [];
  if (running && started) {
    for (let eventOffset = 0; eventOffset < stream.eventSlots; eventOffset += 1) {
      const serial = latest - eventOffset;
      const distance = travel - serial * stream.spacing;
      const packets = workshopInputEvent(stream, serial);
      for (let index = 0; index < stream.maxPerEvent; index += 1) {
        const packet = packets[index];
        const x = packet ? packet.origin[0] + distance : 0;
        inputs.push({ ...packet, visible: Boolean(packet && x > stream.spawnX && x < stream.coverX),
          position: [x, packet?.origin[1] ?? 0] });
      }
    }
  }
  const { startX, endX, y } = layout.output;
  const outputX = startX + (outputElapsed ?? 0) * layout.surfaceSpeed;
  return {
    surfaceOffsets: layout.surfaceRegions.map(({ bounds }) => [displacement - bounds.x, 0]),
    inputs,
    output: { visible: outputElapsed >= 0 && outputX < endX,
      position: [clamp(outputX, startX, endX), y], alpha: 1 },
    machineOffset: machineOffsetAt(clock),
    gearAngle: Math.PI * 2 * (clock % layout.gear.periodMs) / layout.gear.periodMs,
    smoke: running && started ? smokeFrame(layout.smoke, clock) : [],
  };
}
