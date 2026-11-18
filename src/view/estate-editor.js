import { AccessibilitySystem, Application, Assets, Container, Graphics, Text, extensions } from 'pixi.js';
import { viewportLayout } from '../platform/layout.js';
import { estateMapAspect, getEstateLayout, mountEstateMap } from './estate-map.js';

const draftKey = 'idle-farm:estate-editor:layout-v1';
const filename = 'estate-layout.json';
const minWidthRatio = 0.08;
const maxWidthRatio = 0.85;
const colors = {
  paper: 0xf6eddb, line: 0xd6c39d, ink: 0x2a382e, muted: 0x536452,
  soft: 0xfff9ec, disabled: 0xeee3ce, green: 0x35674d, sand: 0xb09a72,
};
const fontFamily = 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const precise = (value) => Number(value.toFixed(4));
const copyLayout = (buildings) => buildings.map(({ id, center, widthRatio }) => ({ id, center: [...center], widthRatio }));
const payload = (buildings) => ({
  schemaVersion: 1,
  mapAspect: estateMapAspect,
  buildings: buildings.map(({ id, center, widthRatio }) => ({
    id, center: center.map(precise), widthRatio: precise(widthRatio),
  })),
});

function readDraft(defaults) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(draftKey));
    if (draft?.schemaVersion !== 1 || draft.mapAspect !== estateMapAspect ||
      !Array.isArray(draft.buildings) || draft.buildings.length !== defaults.length) return copyLayout(defaults);
    const saved = new Map(draft.buildings.map((building) => [building.id, building]));
    const restored = defaults.map(({ id }) => saved.get(id));
    const valid = restored.every((building) => {
      if (!Array.isArray(building?.center) || building.center.length !== 2) return false;
      const [x, y] = building.center;
      const { widthRatio } = building;
      return Number.isFinite(x) && x >= 0 && x <= 1 && Number.isFinite(y) && y >= 0 && y <= estateMapAspect &&
        Number.isFinite(widthRatio) && widthRatio >= minWidthRatio && widthRatio <= maxWidthRatio;
    });
    if (valid) return copyLayout(restored);
  } catch {
    // A damaged or unavailable browser draft does not prevent the editor from opening.
  }
  return copyLayout(defaults);
}

function downloadLayout(buildings) {
  const file = new Blob([`${JSON.stringify(payload(buildings), null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

function label(parent, text, x, y, { size = 14, color = colors.ink, weight = '600', centered = false } = {}) {
  const caption = parent.addChild(new Text({
    text,
    style: { fontFamily, fontSize: size, fontWeight: weight, fill: color },
  }));
  caption.anchor.set(centered ? 0.5 : 0, 0.5);
  caption.position.set(x, y);
  return caption;
}

function fitLabel(caption, width) {
  caption.scale.set(1);
  caption.scale.set(Math.min(1, Math.max(0, width) / Math.max(1, caption.width)));
}

function contains({ x, y, width, height }, point) {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

export async function startEstateEditor(canvas) {
  extensions.remove(AccessibilitySystem);
  const app = new Application();
  await app.init({
    canvas, preference: 'webgl', background: 0x000000, antialias: true,
    autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoStart: false,
  });

  const defaults = getEstateLayout();
  const labels = new Map(defaults.map(({ id, label: name }) => [id, name]));
  const initialWidths = new Map(defaults.map(({ id, widthRatio }) => [id, widthRatio]));
  let buildings = readDraft(defaults);
  const undo = [];
  // The estate map is a fixed set of 22 textures, including the ten animated props.
  const textures = new Map();
  const loading = new Map();
  const panel = app.stage.addChild(new Container({ label: 'estate-editor' }));
  const scenery = panel.addChild(new Container({ label: 'editor-map-viewport' }));
  const chrome = panel.addChild(new Container({ label: 'editor-controls' }));
  const mask = scenery.addChild(new Graphics());
  const mapBody = scenery.addChild(new Container({ label: 'editor-map' }));
  mapBody.mask = mask;
  let layout;
  let viewport;
  let map;
  let mapScene;
  let outline;
  let scroll = 0;
  let selectedId;
  let fitMap;
  let mapWidth;
  let gesture;
  let frameId = 0;
  let dirty = true;
  let buttons = [];
  let picker;
  let decrease;
  let increase;
  let reset;
  let undoButton;
  let zoom;
  let progress;
  let percent;
  let instructions;
  const boxes = new Map();

  function markDirty() {
    dirty = true;
    if (!frameId) frameId = window.requestAnimationFrame(render);
  }

  function loadImage(url) {
    if (textures.has(url)) return Promise.resolve(textures.get(url));
    if (!loading.has(url)) {
      loading.set(url, Assets.load(url).then((texture) => {
        texture.source.scaleMode = 'nearest';
        textures.set(url, texture);
        return texture;
      }).catch(() => {
        textures.set(url, undefined);
        showMessage('部分地图素材加载失败');
      }).finally(() => loading.delete(url)));
    }
    return loading.get(url);
  }

  function render(now) {
    frameId = 0;
    if (gesture?.kind === 'building' && gesture.moved && gesture.point && !fitMap) {
      const { point } = gesture;
      const edge = Math.min(54, viewport.height / 5);
      const top = viewport.y + edge;
      const bottom = viewport.y + viewport.height - edge;
      if (point.x >= viewport.x && point.x <= viewport.x + viewport.width) {
        const speed = point.y < top ? -10 * clamp((top - point.y) / edge, 0, 1) :
          point.y > bottom ? 10 * clamp((point.y - bottom) / edge, 0, 1) : 0;
        if (speed && setScroll(scroll + speed)) moveBuilding(gesture, point);
      }
    }
    const animated = map?.update(now);
    if (animated || dirty) {
      dirty = false;
      app.render();
    }
    if ((animated || gesture?.moved || dirty) && !frameId) frameId = window.requestAnimationFrame(render);
  }

  function updateViewport() {
    mapBody.position.set(viewport.x + Math.floor((viewport.width - mapWidth) / 2), viewport.y - Math.round(scroll));
    map.setViewport(scroll, viewport.height);
    // The map's culling bounds describe the committed layout until a drag ends.
    if (gesture?.kind === 'building' && gesture.moved) {
      for (const { node } of gesture.visuals) node.visible = true;
    }
    if (progress) {
      const span = Math.max(8, viewport.height * viewport.height / map.height);
      progress.visible = map.height > viewport.height + 1;
      progress.height = span;
      progress.y = viewport.y + (viewport.height - span) * scroll / Math.max(1, map.height - viewport.height);
    }
    markDirty();
  }

  function setScroll(value) {
    const next = clamp(value, 0, Math.max(0, map.height - viewport.height));
    if (scroll === next) return false;
    scroll = next;
    updateViewport();
    return true;
  }

  function drawSelection() {
    const box = boxes.get(selectedId);
    outline.visible = !!box;
    if (!box) return;
    outline.position.set(box.x, box.y);
    outline.clear().roundRect(0, 0, box.width, box.height, 5)
      .stroke({ color: 0x31291b, alpha: 0.82, width: 4 });
    outline.roundRect(0, 0, box.width, box.height, 5).stroke({ color: 0xffdc72, width: 2 });
  }

  function rebuildMap(focusY) {
    mapScene?.destroy({ children: true });
    mapScene = mapBody.addChild(new Container({ label: 'editor-estate-art' }));
    mapWidth = Math.max(1, Math.floor(fitMap ? Math.min(viewport.width, viewport.height / estateMapAspect) : viewport.width));
    boxes.clear();
    map = mountEstateMap(mapScene, {
      width: mapWidth, onOpen() {}, markDirty, loadImage,
      getImage: (url) => textures.get(url),
      layoutOverrides: Object.fromEntries(buildings.map((building) => [building.id, building])),
      guideTaskName: '第一次收成',
      bind(target, x, y, width, height) {
        boxes.set(target.label.slice('estate-entry-'.length), { x, y, width, height });
      },
    });
    outline = mapScene.addChild(new Graphics({ label: 'editor-selection' }));
    drawSelection();
    const nextScroll = focusY === undefined ? scroll : focusY * mapWidth - viewport.height / 2;
    scroll = clamp(nextScroll, 0, Math.max(0, map.height - viewport.height));
    updateViewport();
  }

  function addButton(x, y, width, text, run, primary = false) {
    const button = { x, y, width, height: 44, run, enabled: true };
    const frame = chrome.addChild(new Container());
    frame.position.set(x, y);
    const background = frame.addChild(new Graphics());
    const caption = label(frame, text, width / 2, 22, { centered: true, weight: '700' });
    button.set = (value, enabled = true) => {
      button.enabled = enabled;
      caption.text = value;
      caption.style.fill = enabled && primary ? 0xfff8e7 : enabled ? colors.ink : colors.muted;
      fitLabel(caption, width - 8);
      background.clear().roundRect(0.5, 2.5, width - 1, 39, 7)
        .fill(enabled ? primary ? colors.green : colors.soft : colors.disabled)
        .stroke({ color: primary && enabled ? colors.green : colors.line, width: 1 });
    };
    buttons.push(button);
    button.set(text);
    return button;
  }

  function showMessage(message = '拖建筑移动 · 拖空地滚动') {
    if (!instructions) return;
    instructions.text = message;
    fitLabel(instructions, Math.max(0, zoom.x - instructions.x - 8));
    markDirty();
  }

  function updateControls() {
    const entry = buildings.find(({ id }) => id === selectedId);
    picker.set(entry ? `选中 ${labels.get(entry.id)} ›` : '选择建筑 ›');
    decrease.set('−', !!entry && entry.widthRatio > minWidthRatio);
    increase.set('＋', !!entry && entry.widthRatio < maxWidthRatio);
    percent.text = entry ? `${Math.round(100 * entry.widthRatio / initialWidths.get(entry.id))}%` : '缩放';
    undoButton.set('撤销', undo.length > 0);
    const changed = buildings.some(({ center, widthRatio }, index) => {
      const initial = defaults[index];
      return center[0] !== initial.center[0] || center[1] !== initial.center[1] || widthRatio !== initial.widthRatio;
    });
    reset.set('恢复默认', changed);
    zoom.set(fitMap ? '放大' : '全图');
    markDirty();
  }

  function buildChrome() {
    for (const child of chrome.removeChildren()) child.destroy({ children: true });
    buttons = [];
    const { width, height, inset } = layout;
    const left = Math.ceil(inset.left) + 8;
    const right = width - Math.ceil(inset.right) - 8;
    const space = Math.max(1, right - left);
    const top = Math.ceil(inset.top) + 4;
    const bottom = height - Math.ceil(inset.bottom) - 4;
    const narrow = space < 254;
    const headY = top + (narrow ? 26 : 0);
    const title = label(chrome, '庄园摆放', narrow ? (left + right) / 2 : left, top + (narrow ? 12 : 22), {
      size: 18, centered: narrow, weight: '800',
    });
    if (!narrow) fitLabel(title, space - 172);
    const helpY = headY + 44;
    const viewportY = helpY + 44;
    const footerY = Math.max(viewportY + 1, bottom - 92);
    viewport = { x: 0, y: viewportY, width, height: footerY - viewportY };
    const frame = new Graphics().rect(0, 0, width, viewportY).fill(colors.paper)
      .rect(0, footerY, width, height - footerY).fill(colors.paper);
    frame.moveTo(0, viewportY - 0.5).lineTo(width, viewportY - 0.5).stroke({ color: colors.line, width: 1 });
    frame.moveTo(0, footerY + 0.5).lineTo(width, footerY + 0.5).stroke({ color: colors.line, width: 1 });
    chrome.addChildAt(frame, 0);
    mask.clear().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill(0xffffff);
    const exportWidth = narrow ? Math.floor((space - 6) * 0.54) : 90;
    const homeWidth = narrow ? space - 6 - exportWidth : 70;
    addButton(right - exportWidth - 6 - homeWidth, headY, homeWidth, '返回大地图', () => {
      window.location.hash = '#/farm';
    });
    addButton(right - exportWidth, headY, exportWidth, '导出 JSON', () => {
      downloadLayout(buildings);
      showMessage('已生成布局文件');
    }, true);
    instructions = label(chrome, '', left, helpY + 22, { size: 13, color: colors.muted });
    zoom = addButton(right - 52, helpY, 52, '', toggleFit);
    showMessage();

    const scaleValueWidth = 43;
    const scaleButtonWidth = 44;
    const scaleGroupWidth = scaleButtonWidth * 2 + scaleValueWidth;
    const rowY = footerY + 3;
    const scaleX = right - scaleGroupWidth;
    picker = addButton(left, rowY, Math.max(1, scaleX - left - 6), '', selectNext);
    decrease = addButton(scaleX, rowY, scaleButtonWidth, '−', () => scaleBuilding(-1));
    percent = label(chrome, '', scaleX + scaleButtonWidth + scaleValueWidth / 2, rowY + 22, { centered: true, size: 12 });
    increase = addButton(right - scaleButtonWidth, rowY, scaleButtonWidth, '＋', () => scaleBuilding(1));
    const half = Math.floor((space - 6) / 2);
    undoButton = addButton(left, rowY + 44, half, '撤销', undoLast);
    reset = addButton(left + half + 6, rowY + 44, space - half - 6, '恢复默认', restoreDefaults);
    progress = chrome.addChild(new Graphics().roundRect(0, 0, 4, 100, 2).fill({ color: colors.sand, alpha: 0.8 }));
    progress.x = width - 5;
    updateControls();
  }

  function resize() {
    const css = window.getComputedStyle(canvas);
    const inset = Object.fromEntries(['top', 'right', 'bottom', 'left'].map((edge) =>
      [edge, Number.parseFloat(css.getPropertyValue(`--safe-${edge}`)) || 0]));
    const width = Math.max(1, document.documentElement.clientWidth);
    const height = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
    const next = viewportLayout(width, height, inset);
    const screen = app.renderer.screen;
    const sameScreen = width === screen.width && height === screen.height;
    if (layout && sameScreen && Object.keys(inset).every((edge) => layout.inset[edge] === next.inset[edge])) return;
    finishGesture();
    const focusY = map ? (scroll + viewport.height / 2) / mapWidth : undefined;
    fitMap ??= width >= height;
    if (!sameScreen) app.renderer.resize(width, height);
    layout = next;
    panel.position.set(layout.x, layout.y);
    buildChrome();
    rebuildMap(focusY);
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(payload(buildings)));
    } catch {
      showMessage('草稿未保存，可导出 JSON');
    }
    updateControls();
  }

  function record(before) {
    undo.push(before);
    if (undo.length > 40) undo.shift();
    saveDraft();
  }

  function setSelection(id) {
    selectedId = id;
    drawSelection();
    updateControls();
  }

  function selectNext() {
    const index = buildings.findIndex(({ id }) => id === selectedId);
    const next = buildings[(index + 1) % buildings.length];
    setSelection(next.id);
    const box = boxes.get(next.id);
    if (box && (box.y < scroll || box.y + box.height > scroll + viewport.height)) {
      setScroll(box.y + (box.height - viewport.height) / 2);
    }
  }

  function scaleBuilding(direction) {
    const entry = buildings.find(({ id }) => id === selectedId);
    if (!entry) return;
    const step = initialWidths.get(selectedId) * 0.05;
    const next = precise(clamp(entry.widthRatio + step * direction, minWidthRatio, maxWidthRatio));
    if (next === entry.widthRatio) return;
    const before = copyLayout(buildings);
    entry.widthRatio = next;
    rebuildMap();
    record(before);
  }

  function undoLast() {
    if (!undo.length) return;
    buildings = undo.pop();
    rebuildMap();
    saveDraft();
  }

  function restoreDefaults() {
    const before = copyLayout(buildings);
    buildings = copyLayout(defaults);
    rebuildMap();
    record(before);
  }

  function toggleFit() {
    const active = buildings.find(({ id }) => id === selectedId);
    const focusY = active?.center[1] ?? (scroll + viewport.height / 2) / mapWidth;
    fitMap = !fitMap;
    rebuildMap(focusY);
    updateControls();
  }

  function eventPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    const { width, height } = app.renderer.screen;
    return {
      x: (event.clientX - bounds.left) * width / bounds.width - layout.x,
      y: (event.clientY - bounds.top) * height / bounds.height - layout.y,
    };
  }

  function buildingAt(point, pointerType) {
    if (!contains(viewport, point)) return;
    const local = { x: point.x - mapBody.x, y: point.y - mapBody.y };
    const hits = [...boxes].filter(([, box]) => {
      const pad = pointerType === 'touch' ? 5 : 0;
      return local.x >= box.x - pad && local.x <= box.x + box.width + pad &&
        local.y >= box.y - pad && local.y <= box.y + box.height + pad;
    });
    return (hits.find(([id]) => id === selectedId) ?? hits.at(-1))?.[0];
  }

  function startPointer(event) {
    if (gesture || event.button !== 0) return;
    const point = eventPoint(event);
    const button = buttons.find((control) => control.enabled && contains(control, point));
    if (button) {
      gesture = { kind: 'button', button };
    } else if (contains(viewport, point)) {
      const id = buildingAt(point, event.pointerType);
      const entry = buildings.find((building) => building.id === id);
      if (entry) {
        setSelection(id);
        const layers = [`estate-scene-${id}`, `estate-nameplate-${id}`].map((name) => mapScene.getChildByLabel(name, true));
        const visuals = [...layers.filter(Boolean), outline].map((node) => ({ node, x: node.x, y: node.y }));
        gesture = { kind: 'building', entry, center: [...entry.center], visuals, before: copyLayout(buildings) };
      } else {
        gesture = { kind: 'pan' };
      }
    } else {
      return;
    }
    gesture.pointerId = event.pointerId;
    gesture.start = point;
    gesture.startScroll = scroll;
    canvas.setPointerCapture(event.pointerId);
  }

  function moveBuilding(active, point) {
    const [startX, startY] = active.center;
    const x = precise(clamp(startX + (point.x - active.start.x) / mapWidth, 0, 1));
    const y = precise(clamp(startY + (point.y - active.start.y + scroll - active.startScroll) / mapWidth, 0, estateMapAspect));
    active.entry.center = [x, y];
    const offsetX = Math.round(x * mapWidth) - Math.round(startX * mapWidth);
    const offsetY = Math.round(y * mapWidth) - Math.round(startY * mapWidth);
    for (const visual of active.visuals) visual.node.position.set(visual.x + offsetX, visual.y + offsetY);
    markDirty();
  }

  function movePointer(event) {
    const point = eventPoint(event);
    if (!gesture) {
      const button = buttons.some((control) => control.enabled && contains(control, point));
      canvas.style.cursor = button ? 'pointer' : buildingAt(point, event.pointerType) ? 'grab' :
        contains(viewport, point) && map.height > viewport.height ? 'ns-resize' : 'default';
      return;
    }
    if (event.pointerId !== gesture.pointerId || gesture.kind === 'button') return;
    if (!gesture.moved && Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) < 3) return;
    gesture.moved = true;
    gesture.point = point;
    canvas.style.cursor = 'grabbing';
    if (gesture.kind === 'building') moveBuilding(gesture, point);
    else setScroll(gesture.startScroll + gesture.start.y - point.y);
  }

  function finishGesture(event) {
    if (!gesture || (event && gesture.pointerId !== event.pointerId)) return;
    const active = gesture;
    gesture = undefined;
    if (canvas.hasPointerCapture(active.pointerId)) canvas.releasePointerCapture(active.pointerId);
    canvas.style.cursor = 'default';
    if (active.kind === 'building' && active.moved) {
      rebuildMap();
      if (active.entry.center.some((value, index) => value !== active.center[index])) record(active.before);
    }
    if (active.kind === 'pan' && !active.moved && event?.type === 'pointerup') setSelection(undefined);
    if (active.kind === 'button' && event?.type === 'pointerup' && contains(active.button, eventPoint(event))) {
      active.button.run();
    }
  }

  resize();
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', startPointer);
  canvas.addEventListener('pointermove', movePointer);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, finishGesture);
  canvas.addEventListener('wheel', (event) => {
    if (!contains(viewport, eventPoint(event))) return;
    event.preventDefault();
    if (gesture || fitMap) return;
    const multiplier = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? viewport.height : 1;
    setScroll(scroll + event.deltaY * multiplier);
  }, { passive: false });
  window.addEventListener('keydown', (event) => {
    if (gesture) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoLast();
    } else if (!event.ctrlKey && !event.metaKey && (event.key === '+' || event.key === '-')) {
      event.preventDefault();
      scaleBuilding(event.key === '+' ? 1 : -1);
    }
  });
}
