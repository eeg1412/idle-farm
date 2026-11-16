import data from '../content/game-data.json' with { type: 'json' };
import visuals from '../content/workshop-visuals.json' with { type: 'json' };
import effects from '../content/workshop-effects.json' with { type: 'json' };

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const modulo = (value, period) => ((value % period) + period) % period;
const machineKey = (kind) => kind === 'P' ? 'refining' : 'processing';
const textureKey = (key) => 'workshop:' + key;
const finitePair = (pair) => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite);

export function workshopIconIds(id) {
  if (!data.items[id]) return [];
  return [...new Set([...Object.keys(data.items[id].inputs ?? {}), id])];
}

export function workshopTextureSources(kind, config = visuals) {
  const machine = config?.machines?.[machineKey(kind)];
  const tread = config?.conveyor?.tread;
  const { chimney, gear, mounts, smoke } = effects;
  if (!machine?.path || !tread?.path || !Array.isArray(machine.size) || machine.size.length !== 2
      || !Array.isArray(tread.size) || tread.size.length !== 2
      || !Array.isArray(tread.logicalSize) || tread.logicalSize.length !== 2
      || ![...machine.size, ...tread.size, ...tread.logicalSize].every((value) => Number.isFinite(value) && value > 0)
      || ![machine.placement?.x, machine.placement?.y, machine.placement?.width, machine.placement?.height,
        machine.bodyEdges?.left, machine.bodyEdges?.right, machine.bodyEdges?.top, machine.bodyEdges?.bottom,
        machine.occlusionCover?.inputX, machine.occlusionCover?.outputX].every(Number.isFinite)) return [];
  const effectTextures = [chimney, gear, ...(smoke?.textures ?? [])];
  if (smoke?.textures?.length !== 3 || mounts?.chimneys?.length !== 2 || !mounts?.gears?.length
      || !effectTextures.every((asset) => asset?.path && Array.isArray(asset.size)
        && asset.size.length === 2 && asset.size.every((value) => Number.isFinite(value) && value > 0))
      || !finitePair(chimney.logicalSize) || !finitePair(chimney.anchor) || !finitePair(gear.anchor)
      || !mounts.chimneys.every(({ offset, phaseMs, driftDirection }) => finitePair(offset)
        && Number.isFinite(phaseMs) && (driftDirection === -1 || driftDirection === 1))
      || !mounts.gears.every(({ offset, size, periodMs, direction, angle }) => finitePair(offset)
        && [size, periodMs].every((value) => Number.isFinite(value) && value > 0)
        && (direction === -1 || direction === 1) && Number.isFinite(angle))
      || ![smoke.intervalMs, smoke.lifetimeMs, smoke.startSize, smoke.endSize].every((value) => Number.isFinite(value) && value > 0)
      || ![smoke.maxAlpha, smoke.rise, smoke.drift, smoke.sway].every(Number.isFinite)) return [];
  return [
    { key: textureKey('machine'), ...machine },
    { key: textureKey('tread'), ...tread },
    { key: textureKey('chimney'), ...chimney },
    { key: textureKey('gear'), ...gear },
    ...smoke.textures.map((asset, index) => ({ key: textureKey('smoke:' + index), ...asset })),
  ];
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
  const eventCount = stream.materials.length;
  const cycle = Math.floor(serial / eventCount);
  const eventIndex = modulo(serial, eventCount);
  const order = workshopMaterialOrder(stream.materials, stream.recipeId, cycle);
  const groups = randomSequence(stream.recipeId + ':group:' + serial);
  const count = 1 + Math.floor(groups() * stream.maxPerEvent);
  return Array.from({ length: count }, (_, packetIndex) => {
    // The main packet walks the full shuffled bag; extra packets may repeat any
    // actual material, including single-material recipes. These are visuals only.
    const id = packetIndex === 0 ? order[eventIndex] : order[Math.floor(groups() * order.length)];
    const random = randomSequence(stream.recipeId + ':packet:' + serial + ':' + packetIndex + ':' + id);
    const area = stream.spawnArea;
    return { id, event: serial, cycle, packet: packetIndex,
      origin: [area.minX, area.minY + random() * (area.maxY - area.minY)] };
  });
}

function route(points) {
  const distinct = points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0]
    || point[1] !== points[index - 1][1]);
  let length = 0;
  const segments = distinct.slice(1).map((end, index) => {
    const start = distinct[index];
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const segment = { start, end, offset: length, length: distance };
    length += distance;
    return segment;
  });
  return { points: distinct, segments, length };
}

function positionOn(path, distance) {
  const at = clamp(distance, 0, path.length);
  const segment = path.segments.find((part) => at <= part.offset + part.length)
    ?? path.segments[path.segments.length - 1];
  const fraction = clamp((at - segment.offset) / segment.length, 0, 1);
  return [segment.start[0] + (segment.end[0] - segment.start[0]) * fraction,
    segment.start[1] + (segment.end[1] - segment.start[1]) * fraction];
}

export function workshopSceneLayout(id, kind, config = visuals) {
  const item = data.items[id];
  if (!item) return undefined;
  const machine = config.machines[machineKey(kind)];
  const edges = machine.bodyEdges;
  const settings = config.conveyor.layout;
  const centerY = config.stage.height / 2;
  const centerX = (edges.left + edges.right) / 2;
  const mountPosition = ([x, y]) => [centerX + x, centerY + y];
  const chimneys = effects.mounts.chimneys.map(({ offset, ...source }) => ({
    ...source, position: mountPosition(offset),
  }));
  const gears = effects.mounts.gears.map(({ offset, ...gear }) => ({
    ...gear, position: mountPosition(offset),
  }));
  const capacityPerEmitter = Math.ceil(effects.smoke.lifetimeMs / effects.smoke.intervalMs);
  const inputSize = settings.inputSize;
  const inputCover = Math.max(machine.occlusionCover.inputX, edges.left + inputSize / 2 + 2);
  const outputCover = Math.min(machine.occlusionCover.outputX, edges.right - settings.outputSize / 2 - 2);
  const half = inputSize / 2;
  const stream = {
    recipeId: id, materials: Object.keys(item.inputs ?? {}), size: inputSize,
    spacing: settings.inputSpacing, maxPerEvent: settings.maxPerEvent, coverX: inputCover,
    spawnArea: { minX: -half, maxX: -half,
      minY: half, maxY: config.stage.height - half },
  };
  stream.eventSlots = stream.materials.length
    ? Math.ceil((stream.coverX - stream.spawnArea.minX) / stream.spacing) + 1 : 0;
  stream.capacity = stream.eventSlots * stream.maxPerEvent;
  const first = workshopInputEvent(stream, 0);
  const delayMs = first.length
    ? Math.min(...first.map((packet) => (inputCover - packet.origin[0]) / config.conveyor.speed)) : 0;
  function surface(fromX, toX) {
    return { direction: 'E',
      polygon: [fromX, 0, toX, 0, toX, config.stage.height, fromX, config.stage.height],
      bounds: { x: fromX, y: 0, width: toX - fromX, height: config.stage.height } };
  }
  return {
    stage: config.stage, machine,
    chimney: { mounts: chimneys, anchor: effects.chimney.anchor, size: effects.chimney.logicalSize },
    gear: { mounts: gears, anchor: effects.gear.anchor },
    smoke: { ...effects.smoke, emitters: chimneys, recipeId: id,
      capacityPerEmitter, capacity: capacityPerEmitter * chimneys.length },
    surfaceRegions: [surface(0, edges.left + settings.surfaceUnderlap),
      surface(edges.right - settings.surfaceUnderlap, config.stage.width)],
    inputStream: stream,
    itemMasks: {
      input: { x: 0, y: 0, width: centerX, height: config.stage.height },
      output: { x: centerX, y: 0, width: config.stage.width - centerX, height: config.stage.height },
    },
    output: { id, size: settings.outputSize, delayMs,
      path: route([[outputCover, centerY], [edges.right, centerY],
        [config.stage.width + settings.outputSize / 2, centerY]]) },
    surfaceSpeed: config.conveyor.speed, surfacePeriod: config.conveyor.tread.period,
  };
}

function machineOffsetAt(clock) {
  return [Math.sin(clock / 41) * 1.5, Math.sin(clock / 29) * 0.9];
}

function smokeFrame(smoke, clock, active) {
  if (!active) return [];
  return Array.from({ length: smoke.capacity }, (_, index) => {
    const emitterIndex = Math.floor(index / smoke.capacityPerEmitter);
    const { position, phaseMs, driftDirection } = smoke.emitters[emitterIndex];
    const latest = Math.floor((clock - phaseMs) / smoke.intervalMs);
    const serial = latest - index % smoke.capacityPerEmitter;
    if (serial < 0) return undefined;
    const born = phaseMs + serial * smoke.intervalMs;
    const age = clock - born;
    if (age < 0 || age >= smoke.lifetimeMs) return undefined;
    const progress = age / smoke.lifetimeMs;
    const random = randomSequence(smoke.recipeId + ':smoke:' + emitterIndex + ':' + serial);
    const phase = random() * Math.PI * 2;
    const driftScale = 0.75 + random() * 0.5;
    const riseScale = 0.85 + random() * 0.3;
    const birthOffset = machineOffsetAt(born);
    const sway = Math.sin(progress * Math.PI * 2 + phase) * Math.sin(progress * Math.PI);
    return {
      textureIndex: modulo(serial + emitterIndex, smoke.textures.length),
      position: [position[0] + birthOffset[0] + driftDirection * smoke.drift * progress * driftScale + smoke.sway * sway,
        position[1] + birthOffset[1] - smoke.rise * progress * riseScale],
      size: smoke.startSize + (smoke.endSize - smoke.startSize) * progress,
      alpha: clamp(smoke.maxAlpha, 0, 0.6) * Math.min(1, progress / 0.12)
        * Math.min(1, (1 - progress) / 0.55),
    };
  });
}

// Event membership and each packet's random height are stable for the recipe /
// event seed. Every packet starts fully outside the left edge and rolls right.
export function workshopMotionFrame(layout, clock, { started = true, running = true } = {}) {
  const travel = clock * layout.surfaceSpeed;
  const displacement = modulo(travel, layout.surfacePeriod);
  const stream = layout.inputStream;
  const latest = Math.floor(travel / stream.spacing);
  const inputs = [];
  for (let eventOffset = 0; eventOffset < stream.eventSlots; eventOffset += 1) {
    const serial = latest - eventOffset;
    const packets = workshopInputEvent(stream, serial);
    const distance = travel - serial * stream.spacing;
    for (let index = 0; index < stream.maxPerEvent; index += 1) {
      const packet = packets[index];
      const position = packet ? [packet.origin[0] + distance, packet.origin[1]] : [0, 0];
      inputs.push({ id: packet?.id ?? stream.materials[0], event: serial,
        cycle: packet?.cycle, packet: index, origin: packet?.origin,
        visible: Boolean(running && started && packet && position[0] <= stream.coverX), position });
    }
  }
  const outputElapsed = clock - layout.output.delayMs;
  const distance = modulo(Math.max(0, outputElapsed) * layout.surfaceSpeed,
    layout.output.path.length + layout.output.size * 2);
  const machineOffset = running ? machineOffsetAt(clock) : [0, 0];
  return {
    surfaceOffsets: layout.surfaceRegions.map(({ bounds }) => [displacement - bounds.x, 0]),
    inputs,
    output: { visible: Boolean(running && started && outputElapsed >= 0 && distance < layout.output.path.length),
      position: positionOn(layout.output.path, distance), alpha: 1 },
    machineOffset,
    gearAngles: layout.gear.mounts.map(({ angle, direction, periodMs }) =>
      angle + direction * Math.PI * 2 * modulo(clock, periodMs) / periodMs),
    smoke: smokeFrame(layout.smoke, clock, running && started),
  };
}
