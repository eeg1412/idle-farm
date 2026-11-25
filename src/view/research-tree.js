import { Container, Rectangle } from 'pixi.js';

const cardHeight = 104;
const maxZoom = 1.95;
const dragThreshold = 6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const paper = 0xfcf2e2;
const ink = 0x172f1b;
const muted = 0x625d4c;
const green = 0x297b34;
const beforeColor = 0x8d6337;
const afterColor = 0x478050;
const tones = {
  done: { fill: 0xe4efda, text: 0x325d32, marker: 0x558e51, rim: 0x8ab580 },
  ready: { fill: 0xf9e8b9, text: 0x6e4a17, marker: 0xc48f35, rim: 0xc7a35c },
  locked: { fill: 0xf1e6d6, text: 0x625744, marker: 0xd1bfa6, rim: 0xd0b68f },
  neutral: { fill: 0xeceddd, text: 0x4d5941, marker: 0xa2aa8d, rim: 0xc4bd9f },
};

function dependencyPlaces(nodes) {
  const byId = new Map(nodes.map((node, order) => [node.id, {
    node, key: node.id, order, before: [], after: [],
  }]));
  for (const place of byId.values()) {
    for (const id of new Set(place.node.requires ?? [])) {
      const prerequisite = byId.get(id);
      if (!prerequisite || prerequisite === place) continue;
      place.before.push(prerequisite);
      prerequisite.after.push(place);
    }
  }
  return byId;
}

function atlasLayout(nodes, cardWidth, columnGap, rowGap, maxColumns = 18) {
  const byId = dependencyPlaces(nodes);
  const places = [];
  const pending = new Map(Array.from(byId.values(), (place) => [place, place.before.length]));
  const ready = Array.from(pending.keys()).filter((place) => !pending.get(place));
  const columnStep = cardWidth + columnGap;
  const rowStep = cardHeight + rowGap;
  let columns = 1;
  let row = 0;
  // Keep a row bounded in width. A dependency becomes eligible only after its
  // last prerequisite has been placed in a complete earlier row.
  while (ready.length) {
    ready.sort((a, b) => a.order - b.order);
    const next = ready.splice(0, maxColumns);
    columns = Math.max(columns, next.length);
    next.forEach((place, column) => {
      Object.assign(place, { x: column * columnStep, y: row * rowStep });
      places.push(place);
      for (const dependent of place.after) {
        const count = pending.get(dependent) - 1;
        pending.set(dependent, count);
        if (!count) ready.push(dependent);
      }
    });
    row += 1;
  }
  const edges = places.flatMap((from) => from.after.map((to) => ({ from, to })));
  return {
    places, byId, edges,
    width: columns * columnStep - columnGap,
    height: Math.max(1, row * rowStep - rowGap),
  };
}

// One recipe in the middle row, its direct prerequisites above and its direct dependents below.
// A group wider than the grid wraps into whole columns, so every rail runs in a column gutter.
function neighborhoodLayout(nodes, current, cardWidth, columnGap, rowGap, columns) {
  const byId = dependencyPlaces(nodes);
  const center = byId.get(current);
  const columnStep = cardWidth + columnGap;
  const rowStep = cardHeight + rowGap;
  const width = columns * columnStep - columnGap;
  const places = [];
  let row = 0;
  const grid = (members) => {
    const offset = members.length <= columns ? (columns - members.length) / 2 : 0;
    members.forEach((place, index) => {
      place.x = (offset + index % columns) * columnStep;
      place.y = (row + Math.floor(index / columns)) * rowStep;
      places.push(place);
    });
    row += Math.ceil(members.length / columns);
  };
  if (center) {
    grid(center.before);
    Object.assign(center, { x: (width - cardWidth) / 2, y: row * rowStep });
    places.push(center);
    row += 1;
    grid(center.after);
  }
  return { places, byId, edges: [], width, height: Math.max(1, row * rowStep - rowGap) };
}

function groupedLayout(nodes, groups, columns, cardWidth, columnGap, rowGap) {
  const byId = dependencyPlaces(nodes);
  const places = [];
  const headings = [];
  const rowStep = cardHeight + rowGap;
  let y = 0;
  let width = cardWidth;
  for (const group of groups) {
    const members = [...byId.values()].filter(({ node }) => node.group === group);
    if (!members.length) continue;
    headings.push({ label: group, y });
    y += 26;
    const count = Math.min(columns, members.length);
    width = Math.max(width, count * (cardWidth + columnGap) - columnGap);
    members.forEach((place, index) => {
      place.x = index % columns * (cardWidth + columnGap);
      place.y = y + Math.floor(index / columns) * rowStep;
      places.push(place);
    });
    y += Math.ceil(members.length / columns) * rowStep - 14;
  }
  const edges = places.flatMap((from) => from.after.map((to) => ({ from, to })));
  return { places, byId, edges, headings, width, height: Math.max(1, y - rowGap + 14) };
}

function comparisonLayout(nodes, cardWidth, columnGap, rowGap) {
  const rowStep = cardHeight + rowGap;
  const places = [];
  const edges = [];
  const byId = new Map();
  nodes.forEach((node, row) => {
    const current = { node, key: node.id, x: 0, y: row * rowStep };
    places.push(current);
    byId.set(node.id, current);
    if (!node.nextLabel) return;
    const next = {
      node: { ...node, label: node.nextLabel, status: node.nextStatus },
      key: node.id + ':next', x: cardWidth + columnGap, y: current.y,
    };
    places.push(next);
    edges.push({ from: current, to: next });
  });
  return {
    places, byId, edges,
    width: 2 * cardWidth + columnGap,
    height: Math.max(1, nodes.length * rowStep - rowGap),
  };
}

function fitCaption(parent, value, x, y, width, height, size, color, textNode, options = {}) {
  const label = textNode(parent, value, x, y, width, {
    size, color, align: 'center', weight: options.weight ?? '700', wrap: options.wrap ?? false,
  });
  if (options.wrap) label.style.lineHeight = Math.ceil(size * 1.14);
  if (!options.wrap && label.width > width) {
    label.style.fontSize = Math.max(9, Math.floor(size * width / label.width));
    label.style.lineHeight = Math.ceil(label.style.fontSize * 1.36);
  }
  if (label.width > width || label.height > height) {
    const characters = Array.from(String(value));
    while (characters.length && (label.width > width || label.height > height)) {
      characters.pop();
      label.text = `${characters.join('')}…`;
    }
  }
  label.position.set(x + (width - label.width) / 2, y + (height - label.height) / 2);
  return label;
}

function drawPaper(parent, width, height, plot, inkGraphics) {
  const surface = inkGraphics();
  surface.roundRect(1, 2, width - 2, height - 2, 13).fill({ color: 0x986d36, alpha: 0.10 });
  surface.roundRect(0.5, 0.5, width - 1, height - 2, 13).fill(paper)
    .stroke({ color: 0xd8bf9a, width: 1 });
  surface.roundRect(plot.x, plot.y, plot.width, plot.height, 9).fill(0xfbf5e8);
  const dots = inkGraphics();
  for (let x = plot.x + 17; x < plot.x + plot.width - 10; x += 34) {
    for (let y = plot.y + 18; y < plot.y + plot.height - 10; y += 34) dots.circle(x, y, 0.8);
  }
  dots.fill({ color: 0xa58152, alpha: 0.22 });
  parent.addChild(surface, dots);
}

function arrowDown(graphics, x, y, color, alpha = 1) {
  return graphics.poly([x, y, x - 3.8, y - 6, x + 3.8, y - 6]).fill({ color, alpha });
}

function drawLocalEdge(layer, { from, to }, cardWidth, comparison, inkGraphics) {
  const shape = inkGraphics();
  shape.label = `research-map-edge:${from.key}:${to.key}`;
  if (comparison) {
    const y = from.y + cardHeight / 2;
    shape.moveTo(from.x + cardWidth, y).lineTo(to.x - 5, y)
      .stroke({ color: afterColor, width: 1.5, alpha: 0.8 });
    shape.poly([to.x - 1, y, to.x - 7, y - 3.8, to.x - 7, y + 3.8]).fill(afterColor);
  } else {
    const x = from.x + cardWidth / 2;
    shape.moveTo(x, from.y + cardHeight).lineTo(x, to.y - 3)
      .stroke({ color: muted, width: 1.35, alpha: 0.32 });
    arrowDown(shape, x, to.y - 1, muted, 0.42);
  }
  layer.addChild(shape);
}

function drawConnections(layer, selected, places, incoming, cardWidth, columnGap, rowGap, inkGraphics) {
  if (!places.length) return;
  const color = incoming ? beforeColor : afterColor;
  const center = selected.x + cardWidth / 2;
  const anchor = incoming ? selected.y - 3 : selected.y + cardHeight;
  const bus = anchor + rowGap * (incoming ? -0.42 : 0.42);
  const spans = [new Map(), new Map()];

  function segment(axis, cross, from, to) {
    if (from === to) return;
    const line = spans[axis].get(cross) ?? [];
    line.push([Math.min(from, to), Math.max(from, to)]);
    spans[axis].set(cross, line);
  }

  segment(1, center, anchor, bus);
  for (const place of places) {
    const x = place.x + cardWidth / 2;
    const y = incoming ? place.y + cardHeight : place.y - 3;
    const short = x === center && Math.abs(place.y - selected.y) === cardHeight + rowGap;
    const right = place.x < selected.x || place.x === 0;
    const gutter = right ? place.x + cardWidth + columnGap / 2 : place.x - columnGap / 2;
    const rail = short ? x : gutter;
    const bend = y + rowGap * (incoming ? 0.23 : -0.23);
    segment(1, x, y, bend);
    segment(0, bend, x, rail);
    segment(1, rail, bend, bus);
    segment(0, bus, rail, center);
  }

  const shape = inkGraphics();
  shape.label = `research-map-bus:${selected.key}:${incoming ? 'before' : 'after'}`;
  // A horizontal bus or vertical rail may carry more than one direct edge.
  // Draw the union of coincident runs, with separate endpoints for each item.
  spans.forEach((lines, axis) => {
    const append = (cross, start, end) => {
      if (axis === 0) shape.moveTo(start, cross).lineTo(end, cross);
      else shape.moveTo(cross, start).lineTo(cross, end);
    };
    for (const [cross, intervals] of lines) {
      intervals.sort((a, b) => a[0] - b[0]);
      let [start, end] = intervals[0];
      for (const [lo, hi] of intervals.slice(1)) {
        if (lo <= end) end = Math.max(end, hi);
        else {
          append(cross, start, end);
          start = lo;
          end = hi;
        }
      }
      append(cross, start, end);
    }
  });
  shape.stroke({ color, width: 2.2, alpha: 0.9, cap: 'round' });
  if (incoming) arrowDown(shape, center, selected.y - 1, color);
  else shape.circle(center, anchor, 2.6).fill(color);
  layer.addChild(shape);
  for (const place of places) {
    const endpoint = inkGraphics();
    endpoint.label = incoming ? `research-map-edge:${place.key}:${selected.key}`
      : `research-map-edge:${selected.key}:${place.key}`;
    const x = place.x + cardWidth / 2;
    if (incoming) endpoint.circle(x, place.y + cardHeight, 2.6).fill(color);
    else arrowDown(endpoint, x, place.y - 1, color);
    layer.addChild(endpoint);
  }
}

function drawCard(parent, place, cardWidth, { inkGraphics, drawImage, textNode }, detail, textScale, relation) {
  const { node } = place;
  const tone = tones[node.tone] ?? tones.neutral;
  const tile = new Container({ label: `research-map-node:${place.key}` });
  tile.eventMode = 'none';
  tile.position.set(place.x, place.y);
  parent.addChild(tile);

  const selected = relation === 'selected';
  const rim = { selected: green, before: beforeColor, after: afterColor }[relation] ?? tone.rim;
  const skin = inkGraphics();
  if (detail === 'marker') {
    skin.roundRect(0, 0, cardWidth, cardHeight, 15).fill(tone.marker);
    if (relation) skin.roundRect(-5, -5, cardWidth + 10, cardHeight + 10, 18)
      .stroke({ color: rim, width: selected ? 15 : 8 });
    tile.addChild(skin);
    return tile;
  }

  const captions = detail === 'full';
  const bright = node.tone === 'done' || node.tone === 'ready';
  skin.roundRect(0, 2.5, cardWidth, cardHeight, 11).fill({ color: 0x835f33, alpha: 0.10 });
  skin.roundRect(0, 0, cardWidth, cardHeight, 11).fill(selected || bright ? tone.fill : 0xfff9ee)
    .stroke({ color: rim, width: relation ? 2.2 : 1 });
  skin.circle(cardWidth / 2, captions ? 28 : 49, captions ? 21 : 29)
    .fill(selected || bright ? 0xfff9ee : 0xf8edd9);
  tile.addChild(skin);
  if (!captions) {
    drawImage(tile, node.icon, (cardWidth - 54) / 2, 21, 54, 54);
    tile.addChild(inkGraphics().circle(cardWidth - 13, cardHeight - 12, 5)
      .fill(tone.marker).stroke({ color: tone.fill, width: 1.1 }));
    return tile;
  }

  drawImage(tile, node.icon, (cardWidth - 42) / 2, 7, 42, 42);
  const titleSize = 14 * Math.min(textScale, 1.23);
  fitCaption(tile, node.label, 4, 46, cardWidth - 8, 39, titleSize, ink, textNode, { wrap: true, weight: '800' });
  if (node.status) {
    tile.addChild(inkGraphics().roundRect(6, 84, cardWidth - 12, 15, 7.5).fill(tone.fill));
    fitCaption(tile, node.status, 9, 84, cardWidth - 18, 15, 10.5, tone.text, textNode);
  }
  return tile;
}

export function mountResearchTree({ parent, x, y, width, height, nodes, view, drawImage, textNode, buttonAt,
  transitionNode, inkGraphics, requestRender, isWaiting, onSelect, onFind, markGesture, comparison, groups,
  readyOnly, onToggleStatus, production = false, current, neighborhood = false, textScale = 1 }) {
  const compact = height < 210;
  // The production chain has no toolbar or legend; its plot starts at the paper edge.
  const plotTop = production ? 8 : compact ? 50 : 77;
  const plot = { x: 7, y: plotTop, width: width - 14, height: Math.max(1, height - plotTop - 8) };
  const cardWidth = comparison ? clamp(Math.floor((plot.width - 48) / 2), 84, 144) : 110;
  const columnGap = comparison ? 34 : (groups || readyOnly ? 24 : 42);
  const rowGap = comparison ? 20 : (readyOnly ? 24 : 44);
  const columns = Math.max(1, Math.floor((plot.width - 20 + columnGap) / (cardWidth + columnGap)));
  const normalZoom = clamp((plot.width - 22) / (2 * cardWidth + columnGap), 0.67, 1);
  // A neighborhood view (production chains only) wraps each row to the cards that fit at normal zoom.
  const graph = production && neighborhood ? neighborhoodLayout(nodes, current, cardWidth, columnGap, rowGap,
    Math.max(2, Math.floor(((plot.width - 20) / normalZoom + columnGap) / (cardWidth + columnGap))))
    : comparison ? comparisonLayout(nodes, cardWidth, columnGap, rowGap) : groups
    ? groupedLayout(nodes, groups, columns, cardWidth, columnGap, rowGap)
    : atlasLayout(nodes, cardWidth, columnGap, rowGap, production ? Infinity : readyOnly ? columns : undefined);
  if (production) {
    // A link that skips a level may run along the outside of the first or last column.
    for (const place of graph.places) place.x += columnGap / 2;
    graph.width += columnGap;
  }
  const viewport = new Container({ label: 'research-map' });
  viewport.position.set(x, y);
  viewport.eventMode = 'static';
  viewport.hitArea = new Rectangle(0, 0, width, height);
  viewport.cursor = 'grab';
  parent.addChild(viewport);
  drawPaper(viewport, width, height, plot, inkGraphics);

  const content = new Container({ label: 'research-map-content' });
  content.eventMode = 'none';
  if (production) {
    // Each recipe is drawn once: its materials join above the product and one arrow enters it.
    const recipeEdges = content.addChild(new Container({ label: 'production-dependencies' }));
    const middle = neighborhood ? graph.byId.get(current) : undefined;
    if (middle) {
      // Only the middle recipe is linked: prerequisites join into it and it fans out to dependents.
      drawConnections(recipeEdges, middle, middle.before, true, cardWidth, columnGap, rowGap, inkGraphics);
      drawConnections(recipeEdges, middle, middle.after, false, cardWidth, columnGap, rowGap, inkGraphics);
    } else if (!neighborhood) {
      for (const place of graph.places) {
        drawConnections(recipeEdges, place, place.before, true, cardWidth, columnGap, rowGap, inkGraphics);
      }
    }
  }
  const edgeLayer = new Container({ label: 'research-map-edges' });
  content.addChild(edgeLayer);
  for (const { label, y } of graph.headings ?? []) {
    textNode(content, label, 0, y, graph.width, {
      size: 16 * Math.min(textScale, 1.25), color: ink, weight: '800',
    }).label = `research-map-group:${label}`;
  }
  const clip = inkGraphics().roundRect(plot.x, plot.y, plot.width, plot.height, 9).fill(0xffffff);
  viewport.addChild(content, clip);
  content.mask = clip;

  const center = { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
  const fit = Math.min(1, Math.max(1, plot.width - 14) / graph.width,
    Math.max(1, plot.height - 14) / graph.height);
  const minZoom = comparison ? 0.54 : Math.min(fit, normalZoom);
  const drawing = { inkGraphics, drawImage, textNode };
  const tiles = new Map();
  let connections = '';
  let legend;
  let legendLabel;

  function start() {
    view.node = undefined;
    view.scale = normalZoom;
    view.x = plot.x + 10;
    view.y = plot.y + 10;
  }

  function focus(place) {
    view.node = place.node.id;
    view.scale = normalZoom;
    view.x = center.x - (comparison ? graph.width / 2 : place.x + cardWidth / 2) * view.scale;
    view.y = center.y - (place.y + cardHeight / 2) * view.scale;
  }

  function offsetWithin(offset, start, span, length, alignStart = false) {
    const scaled = length * view.scale;
    if (scaled <= span) {
      const inset = (span - scaled) / 2;
      return start + (alignStart ? Math.min(inset, 10) : inset);
    }
    const slack = 12;
    return clamp(offset, start + span - scaled - slack, start + slack);
  }

  function paintEdges(visible, selected, detail) {
    // The production chain keeps its static recipe edges and has no selection overlay.
    const highlighted = !production && detail !== 'marker' && !comparison && selected;
    const local = !production && detail !== 'marker' && !highlighted ? graph.edges.filter(({ from, to }) =>
      visible.has(from) && visible.has(to) &&
      (comparison || (from.x === to.x && to.y - from.y === cardHeight + rowGap))) : [];
    const signature = highlighted ? selected.key : local.map(({ from, to }) => `${from.key}:${to.key}`).join(',');
    if (connections === signature) return;
    connections = signature;
    for (const shape of edgeLayer.removeChildren()) shape.destroy();
    if (highlighted) {
      drawConnections(edgeLayer, selected, selected.before, true, cardWidth, columnGap, rowGap, inkGraphics);
      drawConnections(edgeLayer, selected, selected.after, false, cardWidth, columnGap, rowGap, inkGraphics);
    } else {
      for (const edge of local) drawLocalEdge(edgeLayer, edge, cardWidth, comparison, inkGraphics);
    }
  }

  function paint() {
    view.x = offsetWithin(view.x, plot.x, plot.width, graph.width);
    view.y = offsetWithin(view.y, plot.y, plot.height, graph.height, readyOnly);
    content.position.set(view.x, view.y);
    content.scale.set(view.scale);
    const detail = view.scale >= 0.66 ? 'full' : view.scale >= 0.34 ? 'icon' : 'marker';
    if (nodes.length && !compact && !production) {
      const label = comparison ? comparison[0] : readyOnly ? `仅显示当前${groups ? '可升级' : '可研发'}项目`
        : detail === 'marker'
        ? `绿块已完成 · 金块${groups ? '可升级' : '可研发'} · 共 ${nodes.length} 项`
        : groups ? '棕线前置 · 绿线后续' : '前置在上 · 棕线前置 · 绿线后续';
      if (legendLabel !== label) {
        legend?.destroy({ children: true });
        legendLabel = label;
        legend = comparison
          ? transitionNode(viewport, comparison[0], comparison[1], plot.x, plotTop - 25, plot.width,
            { size: 12 * Math.min(textScale, 1.2), color: muted, align: 'center' })
          : fitCaption(viewport, label, plot.x, plotTop - 25, plot.width, 20,
            12 * Math.min(textScale, 1.2), muted, textNode);
      }
    }
    const left = (plot.x - view.x) / view.scale;
    const right = (plot.x + plot.width - view.x) / view.scale;
    const top = (plot.y - view.y) / view.scale;
    const bottom = (plot.y + plot.height - view.y) / view.scale;
    const visible = new Set(graph.places.filter((place) =>
      place.x + cardWidth > left && place.x < right && place.y + cardHeight > top && place.y < bottom));
    const selected = production ? undefined : graph.byId.get(view.node);
    const before = selected?.before ?? [];
    const after = selected?.after ?? [];
    // A production chain may outline one current card; it draws no selection edges or relation rims.
    const relation = production ? (place) => (current !== undefined && place.node.id === current ? 'selected' : undefined)
      : (place) => place.node.id === selected?.node.id ? 'selected'
      : before.includes(place) ? 'before' : after.includes(place) ? 'after' : undefined;
    for (const [place, tile] of tiles) {
      if (visible.has(place) && tile.detail === detail && tile.relation === relation(place)) continue;
      tile.view.destroy({ children: true });
      tiles.delete(place);
    }
    for (const place of visible) {
      if (tiles.has(place)) continue;
      const role = relation(place);
      tiles.set(place, { detail, relation: role, view: drawCard(content, place, cardWidth, drawing, detail, textScale, role) });
    }
    paintEdges(visible, selected, detail);
  }

  function zoomAt(scale, from, to = from) {
    const next = clamp(scale, minZoom, maxZoom);
    view.x = to.x - (from.x - view.x) * next / view.scale;
    view.y = to.y - (from.y - view.y) * next / view.scale;
    view.scale = next;
    paint();
  }

  const requested = graph.byId.get(view.focus);
  delete view.focus;
  if (requested) focus(requested);
  else if (!Number.isFinite(view.scale)) {
    start();
    // A chain opens at normal zoom on the ordered product, so any part beyond the plot can be panned.
    if (production && nodes.length) focus(graph.byId.get(nodes[0].id));
  }
  else if (view.plotCenter) {
    view.x += center.x - view.plotCenter.x;
    view.y += center.y - view.plotCenter.y;
    view.scale = clamp(view.scale, minZoom, maxZoom);
  }
  if (readyOnly && !graph.byId.has(view.node)) delete view.node;
  view.plotCenter = center;
  paint();
  if (!nodes.length) {
    const empty = readyOnly ? `暂无${groups ? '可升级' : '可研发'}项目` : '暂无研究项目';
    fitCaption(viewport, empty, plot.x, center.y - 15, plot.width, 30, 16, muted, textNode);
  }

  const gap = 5;
  const inset = 8;
  const toolbarHeight = compact ? 37 : 40;
  const railWidth = width - 2 * inset;
  const keyWidth = Math.min(41, Math.floor(railWidth * 0.14));
  const filterWidth = onToggleStatus ? Math.floor(railWidth * 0.30) : 0;
  const searchWidth = onFind ? railWidth - 2 * keyWidth - filterWidth - (onToggleStatus ? 3 : 2) * gap : 0;
  // Without a finder the zoom keys share the rail left by the optional status filter.
  const zoomWidth = onFind ? keyWidth : (railWidth - filterWidth - (onToggleStatus ? 2 : 1) * gap) / 2;
  const toolbar = { style: 'research-map' };
  const top = 8;
  let toolX = inset;
  function control(label, size, action, options = toolbar) {
    buttonAt(viewport, toolX, top, size, toolbarHeight, label, action, options);
    toolX += size + gap;
  }

  if (!production) {
    if (onFind) control('查找节点', searchWidth, onFind);
    if (onToggleStatus) control(readyOnly ? '全部状态' : '可研发', filterWidth, onToggleStatus,
      readyOnly ? { ...toolbar, tone: 'green' } : toolbar);
    const zoomOptions = { ...toolbar, disabled: !nodes.length, reason: readyOnly ? (groups ? '现在没有可升级的' : '现在没有可研发的') : '这里还是空的' };
    control('－', zoomWidth, () => zoomAt(view.scale / 1.32, center), zoomOptions);
    control('＋', zoomWidth, () => zoomAt(view.scale * 1.32, center), zoomOptions);
  }

  function activate(place) {
    view.node = place.node.id;
    paint();
    onSelect(place.node.id);
  }

  const pointers = new Map();
  const suppressTaps = new Set();
  let moved = false;
  let wheelEvent;
  const localPoint = (event) => viewport.toLocal(event.global);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  function nodeAt(position) {
    if (position.x < plot.x || position.x > plot.x + plot.width ||
      position.y < plot.y || position.y > plot.y + plot.height) return;
    const x = (position.x - view.x) / view.scale;
    const y = (position.y - view.y) / view.scale;
    for (const place of tiles.keys()) {
      if (x >= place.x && x <= place.x + cardWidth && y >= place.y && y <= place.y + cardHeight) return place;
    }
  }

  viewport.on('pointerdown', (event) => {
    event.stopPropagation();
    const joining = pointers.size > 0;
    if (isWaiting() || event.button !== 0 || pointers.has(event.pointerId)) return;
    if (joining) {
      if (event.pointerType !== 'touch' || [...pointers.values()][0].type !== 'touch') return;
      moved = true;
    } else {
      if (event.target !== viewport || !event.isPrimary) return;
      moved = false;
      markGesture(true);
    }
    const position = localPoint(event);
    pointers.set(event.pointerId, { type: event.pointerType, position, start: position, node: nodeAt(position) });
    viewport.cursor = 'grabbing';
  });

  viewport.on('pointermove', (event) => {
    if (!pointers.size) viewport.cursor = nodeAt(localPoint(event)) === undefined ? 'grab' : 'pointer';
  });

  viewport.on('globalpointermove', (event) => {
    const change = pointers.get(event.pointerId);
    if (!change) return;
    const position = localPoint(event);
    const previous = change.position;
    change.position = position;
    if (pointers.size > 1) {
      const [first, second] = pointers.values();
      const other = change === first ? second : change === second ? first : undefined;
      if (!other) return;
      const before = Math.max(1, distance(previous, other.position));
      const after = Math.max(1, distance(position, other.position));
      zoomAt(view.scale * after / before, midpoint(previous, other.position), midpoint(position, other.position));
      return;
    }
    if (!moved && distance(position, change.start) <= dragThreshold) return;
    const from = moved ? previous : change.start;
    moved = true;
    view.x += position.x - from.x;
    view.y += position.y - from.y;
    paint();
  });

  function end(event, cancelled = false) {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointers.delete(event.pointerId);
    suppressTaps.add(event.pointerId);
    queueMicrotask(() => suppressTaps.delete(event.pointerId));
    if (pointers.size) return;
    viewport.cursor = 'grab';
    markGesture(false);
    if (!cancelled && !moved && !isWaiting() && event.target === viewport && pointer.node !== undefined) {
      const released = localPoint(event);
      if (distance(pointer.start, released) <= dragThreshold && nodeAt(released) === pointer.node) {
        queueMicrotask(() => { if (!viewport.destroyed && !isWaiting()) activate(pointer.node); });
      }
    }
    requestRender();
  }

  viewport.on('pointerup', (event) => end(event));
  viewport.on('pointerupoutside', (event) => end(event, true));
  viewport.on('pointercancel', (event) => end(event, true));
  viewport.on('pointertapcapture', (event) => {
    if (pointers.size || suppressTaps.has(event.pointerId)) event.stopPropagation();
  });
  viewport.on('wheel', (event) => {
    event.stopPropagation();
    wheelEvent = event.nativeEvent;
    if (isWaiting() || pointers.size || !event.deltaY) return;
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? height : 1;
    const factor = Math.exp(-clamp(event.deltaY * unit, -180, 180) * 0.0025);
    zoomAt(view.scale * factor, localPoint(event));
  });

  // Pixi's listener is passive for wheel and does not forward native pointer cancellation.
  function preventWheel(event) {
    if (event !== wheelEvent) return;
    event.preventDefault();
    wheelEvent = undefined;
  }
  function cancel(event) { end(event, true); }
  function cancelAll() {
    if (!pointers.size) return;
    pointers.clear();
    viewport.cursor = 'grab';
    markGesture(false);
    requestRender();
  }
  window.addEventListener('wheel', preventWheel, { passive: false });
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('blur', cancelAll);
  viewport.on('destroyed', () => {
    window.removeEventListener('wheel', preventWheel);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('blur', cancelAll);
    if (pointers.size) markGesture(false);
  });
}
