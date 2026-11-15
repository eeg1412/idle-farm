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
  return [
    { key: textureKey('background'), ...config.background },
    { key: textureKey('machine'), ...config.machines[machineKey(kind)] },
    { key: textureKey('tread'), ...config.conveyor.tread },
  ];
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
  const covers = machine.occlusionCover;
  const settings = config.conveyor.layout;
  const materials = Object.keys(item.inputs ?? {});
  const centerY = (edges.top + edges.bottom) / 2;
  const centerX = (edges.left + edges.right) / 2;
  const inputSize = settings.inputSize;
  const inputCover = Math.max(covers.inputX, edges.left + inputSize / 2 + 2);
  const outputCover = Math.min(covers.outputX, edges.right - settings.outputSize / 2 - 2);
  const inputX = settings.inputX;
  const outputX = clamp(settings.outputX, settings.outputSize / 2,
    config.stage.width - settings.outputSize / 2);
  const regions = [];
  function surface(fromX, toX) {
    regions.push({
      direction: 'E',
      polygon: [fromX, 0, toX, 0, toX, config.stage.height, fromX, config.stage.height],
      bounds: { x: fromX, y: 0, width: toX - fromX, height: config.stage.height },
    });
  }
  surface(0, edges.left + settings.surfaceUnderlap);
  surface(edges.right - settings.surfaceUnderlap, config.stage.width);
  const path = route([[inputX, centerY], [edges.left, centerY], [inputCover, centerY]]);
  const spacing = settings.inputSpacing;
  const speed = config.conveyor.speed;
  return {
    stage: config.stage, background: config.background, machine, conveyorPieces: [],
    surfaceRegions: regions,
    inputStream: { recipeId: id, materials, path, size: inputSize, spacing,
      capacity: materials.length ? Math.ceil(path.length / spacing) + 1 : 0 },
    itemMasks: {
      input: { x: 0, y: 0, width: centerX, height: config.stage.height },
      output: { x: centerX, y: 0, width: config.stage.width - centerX, height: config.stage.height },
    },
    output: { id, size: settings.outputSize, delayMs: path.length / speed,
      path: route([[outputCover, centerY], [edges.right, centerY], [outputX, centerY]]) },
    surfaceSpeed: speed, surfacePeriod: config.conveyor.tread.period,
  };
}

export function workshopMaterialOrder(materials, recipeId, cycle) {
  let seed = 2166136261;
  for (const character of recipeId + ':' + cycle) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const order = [...materials];
  for (let index = order.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = seed % (index + 1);
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}

// Pure display math shared by the Pixi view and authorized static art composition.
export function workshopMotionFrame(layout, clock, { started = true, running = true } = {}) {
  const travel = clock * layout.surfaceSpeed;
  const displacement = modulo(travel, layout.surfacePeriod);
  const stream = layout.inputStream;
  const latest = Math.floor(travel / stream.spacing);
  const orders = new Map();
  const inputs = Array.from({ length: stream.capacity }, (_, index) => {
    const serial = latest - index;
    const cycle = Math.max(0, Math.floor(serial / stream.materials.length));
    if (!orders.has(cycle)) orders.set(cycle, workshopMaterialOrder(stream.materials, stream.recipeId, cycle));
    const id = orders.get(cycle)[modulo(serial, stream.materials.length)];
    const distance = travel - serial * stream.spacing;
    return { id, serial, cycle,
      visible: Boolean(running && started && serial >= 0 && distance <= stream.path.length),
      position: positionOn(stream.path, distance) };
  });
  const outputElapsed = clock - layout.output.delayMs;
  const distance = modulo(Math.max(0, outputElapsed) * layout.surfaceSpeed,
    layout.output.path.length + layout.output.size * 2);
  const fraction = distance / layout.output.path.length;
  return {
    surfaceOffsets: layout.surfaceRegions.map(({ bounds }) => [displacement - bounds.x, 0]),
    inputs,
    output: { visible: Boolean(running && started && outputElapsed >= 0 && distance <= layout.output.path.length),
      position: positionOn(layout.output.path, distance),
      alpha: fraction > 0.83 ? (1 - fraction) / 0.17 : 1 },
    machineOffset: [running ? Math.sin(clock / 41) * 1.5 : 0,
      running ? Math.sin(clock / 29) * 0.9 : 0],
  };
}
