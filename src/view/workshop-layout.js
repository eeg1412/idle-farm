import data from '../content/game-data.json' with { type: 'json' };
import visuals from '../content/workshop-visuals.json' with { type: 'json' };

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const modulo = (value, period) => ((value % period) + period) % period;
const machineKey = (kind) => kind === 'P' ? 'refining' : 'processing';
const textureKey = (key) => 'workshop:' + key;

export function workshopIconIds(id) {
  if (!data.items[id]) return [];
  return [...new Set([...Object.keys(data.items[id].inputs ?? {}), id])];
}

export function workshopTextureSources(kind, config = visuals) {
  const machine = config?.machines?.[machineKey(kind)];
  const tread = config?.conveyor?.tread;
  if (!machine?.path || !tread?.path || !Array.isArray(machine.size) || machine.size.length !== 2
      || !Array.isArray(tread.size) || tread.size.length !== 2
      || !Array.isArray(tread.logicalSize) || tread.logicalSize.length !== 2
      || ![...machine.size, ...tread.size, ...tread.logicalSize].every((value) => Number.isFinite(value) && value > 0)
      || ![machine.placement?.x, machine.placement?.y, machine.placement?.width, machine.placement?.height,
        machine.bodyEdges?.left, machine.bodyEdges?.right, machine.bodyEdges?.top, machine.bodyEdges?.bottom,
        machine.occlusionCover?.inputX, machine.occlusionCover?.outputX].every(Number.isFinite)) return [];
  return [
    { key: textureKey('machine'), ...machine },
    { key: textureKey('tread'), ...tread },
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
  return {
    surfaceOffsets: layout.surfaceRegions.map(({ bounds }) => [displacement - bounds.x, 0]),
    inputs,
    output: { visible: Boolean(running && started && outputElapsed >= 0 && distance < layout.output.path.length),
      position: positionOn(layout.output.path, distance), alpha: 1 },
    machineOffset: [running ? Math.sin(clock / 41) * 1.5 : 0,
      running ? Math.sin(clock / 29) * 0.9 : 0],
  };
}
