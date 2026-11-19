import { Container, Graphics, Rectangle, Sprite, Text, TextStyle, CanvasTextMetrics, Texture, Assets, UPDATE_PRIORITY } from 'pixi.js';
import data from '../content/game-data.json' with { type: 'json' };
import { researchHourMs } from '../game/advancement.js';
import { activeGuideTask } from '../game/objectives.js';
import { managerStatus } from '../game/managers.js';
import cropVisuals from '../content/crop-visuals.runtime.json' with { type: 'json' };
import workshopVisuals from '../content/workshop-visuals.json' with { type: 'json' };
import managerPortraits from '../content/manager-portraits.json' with { type: 'json' };
import { compact } from './numbers.js';
import { gameHistory, pageForRoute, routeForPage } from './navigation.js';
import { mountEstateMap } from './estate-map.js';
import { createLoadingTasks, loadWithDeadline } from './loading-tasks.js';
import { createLoadingScreen } from './loading-screen.js';
import { renderProduction, renderWorkshop } from './production-pages.js';
import { minPlotAnimationMs, mountPlotAnimation, plotFrameSize, plotSharedTextureKeys } from './plot-animation.js';
import {
  livestockFrameSize, livestockIdleFrames, livestockSpecies, minLivestockAnimationMs, mountLivestockAnimation,
} from './livestock-animation.js';
import {
  fishFrameSize, fishIdleFrames, fishSpecies, fishHabitats, minFishAnimationMs, mountFishAnimation,
} from './fish-animation.js';
import { mountWorkshopAnimation, syncWorkshopMotion, workshopIconIds, workshopTextureSources } from './workshop-animation.js';
import miningVisuals from '../content/mining-visuals.json' with { type: 'json' };
import { mountMiningAnimation } from './mining-animation.js';
import { renderResearch, researchReadyTabs } from './research-page.js';
import { mountResearchTree } from './research-tree.js';
import { renderMerchant } from './merchant-page.js';
import { managerPages, renderManager, renderManagerDirectory } from './manager-page.js';
import { renderStatistics, renderFarmSaleHistory } from './management-records.js';
import { createManagerSpeechQueue, fitManagerSpeech } from './manager-speech.js';
import {
  renderWarehouse, renderCatalog, renderTasks, renderSettings, renderFarmSale, renderManagement,
} from './management-pages.js';

const palette = {
  paper: 0xfcf2e2, card: 0xfff9ee, ink: 0x172f1b, muted: 0x625d4c, border: 0xc8aa7e,
  green: 0x297b34, leaf: 0x56a940, selection: 0xdcebd2, gold: 0xffce45, pale: 0xf6e9d0,
  cream: 0xfffdf7, red: 0xa03221, dark: 0x223524, gray: 0xede5d7, line: 0xe3d0b3,
};
const homePage = '庄园';
const pages = {
  [homePage]: null,
  田地: (ui) => renderProduction(ui, 'C'), 畜牧: (ui) => renderProduction(ui, 'L'),
  鱼池: (ui) => renderProduction(ui, 'F'), 矿洞: (ui) => renderProduction(ui, 'M'),
  加工: (ui) => renderWorkshop(ui, 'I'), 精制: (ui) => renderWorkshop(ui, 'P'),
  仓库: renderWarehouse, 行脚商: renderMerchant, 研究: renderResearch, 经营: renderManagement,
  管理员管理: renderManagerDirectory, 统计: renderStatistics, 出售庄园历史: renderFarmSaleHistory,
  图鉴: renderCatalog, 任务: renderTasks, 出售庄园: renderFarmSale, 设置: renderSettings,
};
const menuPages = Object.keys(pages);
const menuIcons = {
  [homePage]: 'menu-map', 田地: 'menu-field', 畜牧: 'menu-livestock', 鱼池: 'menu-fish', 矿洞: 'menu-mine',
  加工: 'menu-processing', 精制: 'menu-refining', 仓库: 'menu-warehouse', 行脚商: 'menu-merchant',
  研究: 'menu-research', 经营: 'menu-operations', 图鉴: 'menu-catalog', 任务: 'menu-tasks',
  管理员管理: 'manager-directory', 统计: 'statistics', 出售庄园历史: 'sale-history',
  出售庄园: 'menu-farm-sale', 设置: 'menu-settings',
};
const estateDestinations = {
  field: '田地', livestock: '畜牧', fish: '鱼池', mine: '矿洞', processing: '加工', refining: '精制',
  warehouse: '仓库', research: '研究', operations: '经营', tasks: '任务',
};
const noResearchReadyTabs = new Set();
const defaultDialogSampleEveryMs = 3000;
const drawnIcons = {
  'view-grid': { kind: 'grid' },
  'view-list': { kind: 'list' },
  close: { kind: 'close' },
  ...Object.fromEntries(['left', 'right', 'up', 'down'].flatMap((direction) => [
    ['chevron-' + direction, { kind: 'chevron', direction }],
    ['arrow-' + direction, { kind: 'arrow', direction }],
  ])),
};
const heroKeys = new Set(['fields', 'livestock', 'fish', 'mining', 'workshop', 'warehouse', 'research',
  'tasks-banner', 'catalog-banner', 'sale-banner', 'settings-banner', 'merchant-banner', 'merchant-waiting']);
const sceneKeys = new Set(['scene-wheat', 'scene-empty-field', 'scene-hen', 'scene-empty-barn',
  'scene-fish', 'scene-empty-pond', 'scene-composite-gift']);
for (const [id, item] of Object.entries(data.items)) {
  if (['C', 'L', 'F', 'M'].includes(item.kind)) {
    sceneKeys.add('scene-' + id);
  }
}
const uiIconKeys = new Set([...Object.keys(drawnIcons), 'nav-menu', 'nav-workshop', 'nav-warehouse', 'nav-research',
  ...Object.values(menuIcons),
  'nav-catalog', 'facility-field', 'facility-empty-field',
  'mining-tab', 'facility-empty-mine', 'mining-buy', 'mining-upgrade', 'mining-yield',
  'mining-research', 'mining-processing', 'mining-cycle', 'mining-refining',
  'facility-hen', 'facility-empty-barn', 'facility-fish', 'facility-empty-pond', 'facility-mill',
  'facility-kitchen', 'coin', 'research-point', 'research-point-basic', 'market-up', 'market-down', 'clock', 'task-barn', 'task-fish', 'task-process', 'task-product',
  'sale-retain', 'sale-reset', 'tech-water', 'tech-farm', 'tech-livestock', 'tech-workshop',
  'tech-market-forecast', 'tech-market-manipulation', 'tech-market-promotion', 'tech-premium-sales', 'tech-basic-research-rate',
  'tech-merchant-restock', 'tech-merchant-bargaining',
  'facility-buffalo', 'facility-mallard', 'facility-goat', 'facility-goose', 'facility-pig',
  'facility-rabbit', 'facility-sheep', 'facility-muscovy', 'facility-cattle',
  'facility-carp', 'facility-sea-bass', 'facility-trout', 'facility-mandarin-fish', 'facility-salmon',
  'facility-eel', 'facility-sea-bream', 'facility-turbot', 'facility-sturgeon',
  'settings-sound', 'settings-music', 'settings-display', 'settings-guide',
  'operation-switch', 'operation-upgrade', 'operation-sell', 'portrait-warehouse', 'warehouse-empty-v1',
  ...Array.from({ length: 49 }, (_, index) => 'plot-C' + String(index + 2).padStart(2, '0')),
  ...Object.entries(data.items).filter(([, item]) => item.kind === 'L').map(([id]) => 'livestock-' + id),
  ...Object.entries(data.items).filter(([, item]) => item.kind === 'F').map(([id]) => 'fish-' + id),
]);
const path = (name) => new URL(name, document.baseURI).href;
const number = (value) => typeof value === 'bigint' ? compact(value) : String(value ?? '—');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const managerAsset = (id) => typeof id === 'string' && id.startsWith('manager-art:') ? id.slice(12) : undefined;
const hasIcon = (id) => uiIconKeys.has(id) || Object.hasOwn(data.items, id) || Boolean(managerAsset(id));
const marketLabelGap = 4;
const marketRateText = (rate) => '×' + ((100 + rate) / 100);
const marketMarkSize = (size) => Math.min(15, size);
function marketMarkLayout(span, size, amount) {
  const iconSize = Math.min(19, size + 2);
  const naturalWidth = iconSize + 2 + amount.width;
  const fit = Math.min(1, span / naturalWidth);
  return { iconSize, fit, width: naturalWidth * fit, height: Math.max(iconSize, amount.height) * fit };
}

function marketLabelFits(span, title, titleWidth, markWidth) {
  return titleWidth + marketLabelGap + markWidth <= span && !title.includes('\n');
}

function copyViewState(value, seen = new Map()) {
  if (typeof value === 'function') return undefined;
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const [key, child] of Object.entries(value)) {
    if (typeof child !== 'function') copy[key] = copyViewState(child, seen);
  }
  return copy;
}
function restoreViewState(target, saved) {
  for (const key of Object.keys(target)) if (!Object.hasOwn(saved, key)) delete target[key];
  for (const [key, value] of Object.entries(saved)) {
    if (value && typeof value === 'object' && target[key] && typeof target[key] === 'object' &&
        Array.isArray(value) === Array.isArray(target[key])) restoreViewState(target[key], value);
    else target[key] = copyViewState(value);
  }
  if (Array.isArray(target)) target.length = saved.length;
}
// Fields no page draws statically: the projected clock moves them every frame, and the save
// revision changes on every commit (including the 5-second autosave) without any visible effect.
const clockOnlyFields = new Set(['clockMs', 'wallAnchorMs', 'revision', 'basicResearchElapsedMs', 'basicResearchWeightedMs']);
// Texture LRU limits for page icons and facility scenes. Animation textures are never evicted.
const iconCacheLimit = 200;
const sceneCacheLimit = 40;
// Upper bound on how long an unchanged frame may stay on screen without a render.
const idleRenderMs = 1000;
// Plain-data equality for projected worlds; shared references short-circuit.
function sameState(a, b, skip) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const key of keys) {
    if (skip?.has(key)) continue;
    if (!Object.hasOwn(b, key) || !sameState(a[key], b[key])) return false;
  }
  return true;
}
const inkGraphics = () => {
  const graphics = new Graphics();
  graphics.eventMode = 'none';
  return graphics;
};

function paintPanel(g, x, y, width, height, fill, outline, radius) {
  if (radius) g.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
  else g.rect(x, y, width, height);
  g.fill(fill);
  if (outline) g.stroke({ color: outline, width: 1.1 });
}

function panel(parent, x, y, width, height, fill, outline, radius = 9) {
  const g = inkGraphics();
  paintPanel(g, x, y, width, height, fill, outline, radius);
  parent.addChild(g);
  return g;
}

function drawIndicator(parent, right, top) {
  const radius = 6;
  const inset = radius + 3;
  parent.addChild(inkGraphics().circle(right - inset, top + inset, radius)
    .fill(palette.red).stroke({ color: palette.cream, width: 1.1 }));
}

function drawPixelIcon(parent, icon, x, y, width, height) {
  if (icon.kind) {
    const art = inkGraphics();
    const size = Math.min(width, height);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const unit = size / 24;
    if (icon.kind === 'close') {
      const outline = [-6, -10, 0, -4, 6, -10, 10, -6, 4, 0, 10, 6,
        6, 10, 0, 4, -6, 10, -10, 6, -4, 0, -10, -6];
      const stroke = icon.outline
        ? { color: icon.outline, width: 2.2 * unit, join: 'round', alignment: 0 }
        : { color: 0x102315, width: 0.7 * unit, join: 'round' };
      art.poly(outline.map((value, index) => (index % 2 ? cy : cx) + value * unit))
        .fill(palette.ink).stroke(stroke);
    } else if (icon.kind === 'grid') {
      for (const dx of [-8, 2]) for (const dy of [-8, 2]) {
        art.roundRect(cx + dx * unit, cy + dy * unit, 6 * unit, 6 * unit, unit).fill(palette.ink);
      }
    } else if (icon.kind === 'list') {
      for (const dy of [-8, -1, 6]) {
        art.roundRect(cx - 9 * unit, cy + dy * unit, 4 * unit, 4 * unit, unit).fill(palette.ink);
        art.roundRect(cx - 2 * unit, cy + dy * unit, 11 * unit, 4 * unit, unit).fill(palette.ink);
      }
    } else if (icon.kind === 'chevron' || icon.kind === 'arrow') {
      const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[icon.direction];
      const outline = icon.kind === 'chevron'
        ? [-7, -8, -3, -11, 8, 0, -3, 11, -7, 8, 1, 0]
        : [-10, -3, 1, -3, 1, -8, 10, 0, 1, 8, 1, 3, -10, 3];
      const points = [];
      for (let index = 0; index < outline.length; index += 2) {
        const dx = outline[index] * unit;
        const dy = outline[index + 1] * unit;
        points.push(cx + dx * Math.cos(angle) - dy * Math.sin(angle),
          cy + dx * Math.sin(angle) + dy * Math.cos(angle));
      }
      art.poly(points).fill(icon.color ?? palette.ink);
    }
    return parent.addChild(art);
  }
  const columns = icon.rows[0].length;
  const unit = Math.max(1, Math.floor(Math.min(width / columns, height / icon.rows.length)));
  const left = Math.round(x + (width - columns * unit) / 2);
  const top = Math.round(y + (height - icon.rows.length * unit) / 2);
  const art = inkGraphics();
  for (const [key, color] of Object.entries(icon.colors)) {
    icon.rows.forEach((row, dy) => Array.from(row).forEach((pixel, dx) => {
      if (pixel === key) art.rect(left + dx * unit, top + dy * unit, unit, unit);
    }));
    art.fill(color);
  }
  return parent.addChild(art);
}

function textStyle(width, { size = 16, color = palette.ink, align = 'left', weight = '600', wrap = true }) {
  return {
    fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: size, fontWeight: weight, fill: color, align, wordWrap: wrap,
    wordWrapWidth: Math.max(8, width), breakWords: wrap, lineHeight: Math.ceil(size * 1.36),
  };
}

function textNode(parent, value, x, y, width, options = {}) {
  const { align = 'left' } = options;
  const label = new Text({ text: number(value), style: textStyle(width, options) });
  label.eventMode = 'none';
  const shift = align === 'right' ? Math.max(0, width - label.width) :
    align === 'center' ? Math.max(0, (width - label.width) / 2) : 0;
  label.position.set(x + shift, y);
  parent.addChild(label);
  return label;
}

function managerBubblePath(g, x, y, width, height) {
  const right = x + width;
  const bottom = y + height;
  const radius = Math.min(10, height / 4);
  const tail = y + height / 2;
  const halfBase = Math.min(6, height / 5);
  return g.moveTo(x + radius, y).lineTo(right - radius, y).quadraticCurveTo(right, y, right, y + radius)
    .lineTo(right, bottom - radius).quadraticCurveTo(right, bottom, right - radius, bottom)
    .lineTo(x + radius, bottom).quadraticCurveTo(x, bottom, x, bottom - radius)
    .lineTo(x, tail + halfBase).lineTo(x - 11, tail + 2).lineTo(x, tail - halfBase)
    .lineTo(x, y + radius).quadraticCurveTo(x, y, x + radius, y).closePath();
}

function managerCaption(layer, speech, x, y, width, height, preferredSize) {
  for (const child of layer.removeChildren()) child.destroy();
  if (!speech) return () => false;
  const styles = new Map();
  const measure = (text, size) => {
    if (!styles.has(size)) styles.set(size, new TextStyle(textStyle(width, { size, weight: '700', wrap: false })));
    return CanvasTextMetrics.measureText(text, styles.get(size));
  };
  const { size, lines, lineText } = fitManagerSpeech(speech.glyphs, width, height, preferredSize, measure);
  const top = y + (height - measure(lineText.join('\n'), size).height) / 2;
  const lineHeight = styles.get(size).lineHeight;
  const runs = [];
  lines.forEach((glyphs, row) => {
    const left = x + (width - measure(lineText[row], size).width) / 2;
    const rowRuns = [];
    for (const glyph of glyphs) {
      if (rowRuns.at(-1)?.red !== glyph.red) rowRuns.push({ red: glyph.red, glyphs: [] });
      rowRuns.at(-1).glyphs.push(glyph);
    }
    let prefix = '';
    for (const run of rowRuns) {
      const label = textNode(layer, '', left + (prefix ? measure(prefix, size).width : 0), top + lineHeight * row,
        width, { size, weight: '700', wrap: false, color: run.red ? palette.red : palette.ink });
      runs.push({ label, glyphs: run.glyphs });
      prefix += run.glyphs.map((glyph) => glyph.text).join('');
    }
  });
  return (shown) => {
    let changed = false;
    for (const { label, glyphs } of runs) {
      const next = glyphs.filter((glyph) => glyph.order < shown).map((glyph) => glyph.text).join('');
      if (next !== label.text) { label.text = next; changed = true; }
    }
    return changed;
  };
}

function compactLabel(parent, value, x, y, width, options) {
  const label = textNode(parent, compact(value), x, y, width, { ...options, wrap: false });
  for (let places = 1; label.width > width && places >= 0; places -= 1) {
    label.text = compact(value, places);
  }
  if (label.width > width) {
    label.style.fontSize = Math.max(11, Math.floor(label.style.fontSize * width / label.width));
  }
  if (label.width > width) {
    label.style.wordWrap = true;
    label.style.breakWords = true;
  }
  if (options.align === 'right') label.x = x + Math.max(0, width - label.width);
  return label;
}

export function createGameView(app, dispatch, restore, replace, onNavigate, browser = window, saveManagement = {}, audio = {}) {
  const developmentToolsEnabled = typeof __DEV_TEST_MODE__ !== 'undefined' && __DEV_TEST_MODE__;
  let settingsTitleClicks = 0;
  let developmentTitleTarget;
  const root = new Container();
  const clip = inkGraphics();
  app.stage.addChild(root, clip);
  root.mask = clip;
  let current = homePage;
  let pageParent;
  let linkedEntryParent;
  let navigationEpoch = 0;
  let navigation = gameHistory(browser);
  let merchantDialogEpoch = 0;
  const managerConversations = new Map();
  const managerDailyLines = new WeakMap();
  const managerCandidates = new Map();
  const managerTapTimes = new Map();
  const managerSelections = new WeakMap();
  let managerConversationSequence = 0;
  let managerSpeech;
  let managerSpeechMount;
  let managerSpeechWasVisible = false;
  let routeDialogSequence = 0;
  let applyingRoute = false;
  let layout;
  let world;
  let status;
  let waiting = false;
  let pendingRender = false;
  let navigationMenu;
  let modal;
  let pendingModal;
  let nextDialogSampleAt = 0;
  let updateDialogSampleProgress;
  let notices;
  let floating;
  let point;
  let scrollTarget;
  let focusIndex = -1;
  let returnedManagerFocus;
  let controls = [];
  let building = false;
  let drag = null;
  let sliderDrag = null;
  let treeGesture = false;
  let coast = null;
  let scrollActivity = -Infinity;
  let pressedPointer = null;
  let needsRender = false;
  let blockTap = false;
  let feedbackLayer;
  let noticeNode;
  let floatNode;
  let drawn;
  let estateMap;
  let lastResearchReady;
  // Any change to the stage sets this; the stage is rendered only on dirty frames (plus a slow
  // safety refresh), never skipped when something may have changed.
  let frameDirty = true;
  let lastRenderAt = -Infinity;
  const markDirty = () => { frameDirty = true; };
  const openingTasks = createLoadingTasks(markDirty);
  let openingScreen;
  let progressTiming;
  let progressEpoch;
  let lastProgressClock;
  let syncPlotVisibility;
  let plotSharedLoad;
  let scrollImages;
  let listRow;
  const progressBars = new Set();
  const countdowns = new Set();
  const activePlots = new Set();
  const visiblePlotIds = new Set();
  const cropPlots = new Map();
  const shortPlotStarts = new Map();
  const livestockTextures = new Map();
  const livestockBatches = new Map();
  const fishTextures = new Map();
  const fishBatches = new Map();
  const miningTextures = new Map();
  const workshopTextures = new Map();
  const workshopMotionStates = new Map();
  const locals = Object.fromEntries(Object.keys(pages).map((page) => [page, { scroll: 0 }]));
  const textures = new Map();
  // Only the three opening-art URLs use smooth sampling. Keep the policy by URL
  // so a later caller/retry cannot switch a shared opening source back to nearest.
  const smoothImages = new Set();
  const failedImages = new Set();
  const loadingImages = new Map();
  // LRU order (oldest first) of page icons and scenes drawn by drawImage, url -> category.
  const imageUse = new Map();
  // Urls used by any animation loader: never evicted, even if a page also draws them as icons.
  const pinnedImages = new Set();
  // Urls drawn since the current page build started; these may be on screen and are never evicted.
  let imagesInUse = new Set();
  const unloadingImages = new Map();
  // Animations parked during a rebuild, keyed by type/slot/batch, waiting to be re-attached.
  const retainedAnimations = new Map();
  const frame = { width: 0, height: 0 };

  const scale = () => 1;
  function pauseManagerSpeech() {
    managerSpeech?.pause();
    audio.stopDialogue?.();
    managerSpeechWasVisible = false;
  }

  function resetManagerSpeech() {
    if (managerSpeech) pauseManagerSpeech();
    managerSpeech = undefined;
    managerSpeechMount = undefined;
  }

  function progressClock(now) {
    const elapsed = progressTiming ? Math.max(0, now - progressTiming.anchor) : 0;
    const projected = world.clockMs + elapsed;
    lastProgressClock = Math.max(lastProgressClock ?? projected, projected);
    return lastProgressClock;
  }

  function currentBatch(source, fallback) {
    if (!source) return fallback;
    const collection = source.type === 'station' ? world?.stations : world?.facilities;
    return collection?.[source.kind]?.[source.index]?.batch;
  }

  function bindCountdownText(label, readValue, align, readTone) {
    if (!readValue) return;
    const epoch = navigationEpoch;
    const row = listRow?.layer;
    let lastColor;
    const update = (clock) => {
      if (label.destroyed || epoch !== navigationEpoch) return false;
      if (row && !row.visible) return true;
      const next = number(readValue(clock));
      if (label.text !== next) {
        label.text = next;
        align();
        markDirty();
      }
      const color = readTone?.() === 'danger' ? palette.red : palette.ink;
      if (color !== lastColor) { label.style.fill = color; lastColor = color; markDirty(); }
      return true;
    };
    update(progressClock(performance.now()));
    countdowns.add(update);
  }

  function updateBatchDisplays(now) {
    const clock = progressClock(now);
    for (const updates of [countdowns, progressBars]) {
      for (const update of updates) if (!update(clock)) updates.delete(update);
    }
    return clock;
  }

  const requestRender = () => {
    needsRender = true;
    markDirty();
    if (pendingRender) return;
    pendingRender = true;
    requestAnimationFrame(() => {
      pendingRender = false;
      if (!treeGesture && (pressedPointer === null || sliderDrag)) redraw();
    });
  };

  function loadImage(url) {
    const texture = textures.get(url);
    if (texture && !texture.destroyed) return Promise.resolve(texture);
    if (texture) textures.delete(url);
    if (failedImages.has(url)) return Promise.resolve(undefined);
    if (loadingImages.has(url)) return loadingImages.get(url);
    // Assets owns the cache. Wait for any prior eviction before requesting it again.
    const unloading = unloadingImages.get(url);
    const requestTexture = async () => {
      if (unloading) await unloading;
      return Assets.load(url);
    };
    const fetchTexture = async () => {
      // Only the winning await may publish. A timed-out Assets request can finish
      // internally later, but its continuation cannot populate our live texture map.
      const asset = openingTasks.active ? await loadWithDeadline(requestTexture) : await requestTexture();
      if (!asset || asset.destroyed || !asset.width || !asset.height) throw new Error('图片无效');
      asset.source.scaleMode = smoothImages.has(url) ? 'linear' : 'nearest';
      textures.set(url, asset);
      markDirty();
      return asset;
    };
    const pending = openingTasks.run('image:' + url, fetchTexture).catch(() => {
      failedImages.add(url);
    }).finally(() => loadingImages.delete(url));
    loadingImages.set(url, pending);
    return pending;
  }

  function prepareTextures(key, work) {
    // This separate task includes atlas validation/slicing, beyond the image requests.
    return openingTasks.run('textures:' + key, work).catch(() => {});
  }

  function loadOpeningImage(url) {
    // Opening URLs belong only to this overlay. These three fixed textures have
    // no icon/scene LRU category and retain the existing cache ownership.
    smoothImages.add(url);
    return loadImage(url);
  }

  function unavailableTextures(key) {
    prepareTextures(key, () => { throw new Error('动画资源资料缺失或无效'); });
  }

  async function retryOpeningResources() {
    // Failed Assets promises are explicitly removed before a fresh request. Successful
    // page/animation textures retain their normal bounded/pinned cache ownership.
    // Let current preparations settle before discarding their destination entries.
    // A slow unrelated atlas can otherwise complete into an entry we already removed.
    await openingTasks.settlePending();
    const failedKeys = new Set(openingTasks.snapshot().failed.map((task) => task.key));
    const failed = [...failedImages].filter((url) => failedKeys.has('image:' + url));
    await Promise.allSettled(failed.map((url) => {
      let unloading = unloadingImages.get(url);
      if (!unloading) {
        unloading = Assets.unload(url).catch(() => {}).finally(() => {
          if (unloadingImages.get(url) === unloading) unloadingImages.delete(url);
        });
        unloadingImages.set(url, unloading);
      }
      // Keep the actual unload in the shared map even when this short wait times out;
      // a new request must never race an outstanding texture destruction.
      return loadWithDeadline(() => unloading, 5000);
    }));
    for (const url of failed) failedImages.delete(url);
    for (const cache of [cropPlots, livestockTextures, fishTextures, miningTextures, workshopTextures]) {
      for (const [key, entry] of cache) {
        if (!entry.textures && failedKeys.has(entry.loadingKey) &&
            openingTasks.state(entry.loadingKey) === 'failed') cache.delete(key);
      }
    }
    plotSharedLoad = undefined;
    openingTasks.clearFailures(failedKeys);
    openingScreen.retryArt();
    requestRender();
  }

  openingScreen = createLoadingScreen(app, {
    tasks: openingTasks, load: loadOpeningImage, markDirty, retry: retryOpeningResources,
    retryStartup: () => saveManagement.retryInitialization?.(),
    onComplete: () => { syncPlotVisibility?.(); requestRender(); },
  });

  // Animation scenes (crop plants, livestock, fish, workshop) load through here and are pinned.
  function loadAnimationImage(url) {
    pinnedImages.add(url);
    return loadImage(url);
  }

  function touchImage(url, category) {
    imagesInUse.add(url);
    if (!category) return;
    imageUse.delete(url);
    imageUse.set(url, category);
  }

  // Evicts least recently drawn icons and scenes beyond their limits. Only loaded textures that
  // no animation uses and the current page has not drawn are candidates.
  function trimImages() {
    for (const [category, limit] of [['icon', iconCacheLimit], ['scene', sceneCacheLimit]]) {
      let count = 0;
      for (const [url, kind] of imageUse) if (kind === category && textures.has(url) && !pinnedImages.has(url)) count += 1;
      if (count <= limit) continue;
      for (const [url, kind] of imageUse) {
        if (count <= limit) break;
        if (kind !== category || !textures.has(url) || pinnedImages.has(url) || imagesInUse.has(url) ||
            loadingImages.has(url)) continue;
        textures.delete(url);
        imageUse.delete(url);
        count -= 1;
        // Assets.unload destroys the texture and drops it from the Assets caches; a later
        // drawImage reloads it (normally from the browser HTTP cache).
        const unloading = Assets.unload(url).catch(() => {}).finally(() => {
          if (unloadingImages.get(url) === unloading) unloadingImages.delete(url);
        });
        unloadingImages.set(url, unloading);
      }
    }
  }

  function loadPlotTextures(id) {
    const existing = cropPlots.get(id);
    if (existing) return existing.textures;
    const visual = cropVisuals[id];
    const individual = visual?.mode === 'individual';
    if (!individual && id !== 'C01') return unavailableTextures('crop:' + id);
    const crop = { loadingKey: 'textures:crop:' + id };
    cropPlots.set(id, crop);
    plotSharedLoad ??= Promise.all(plotSharedTextureKeys.map(async (key) => [
      key, await loadAnimationImage(path(`./art/plot/${key}.webp?game=1&v=5`)),
    ])).then((entries) => entries.every(([, texture]) => texture) ? new Map(entries) : undefined);

    if (individual) {
      if (visual.stages?.length !== 4) return unavailableTextures('crop:' + id);
      const retained = visual.harvestMode === 'retainedPlant';
      if (retained && !visual.repeatBare) return unavailableTextures('crop:' + id);
      const plantLoad = Promise.all(visual.stages.map((stage) =>
        loadAnimationImage(path('./' + stage.path + '?game=1&v=4'))));
      const bareLoad = retained
        ? loadAnimationImage(path('./' + visual.repeatBare.path + '?game=1&v=5')) : Promise.resolve(undefined);
      prepareTextures('crop:' + id, () => Promise.all([plotSharedLoad, plantLoad, bareLoad]).then(([shared, plants, bare]) => {
        if (!shared || plants.some((texture, index) => !texture ||
            texture.width !== visual.stages[index].width || texture.height !== visual.stages[index].height)) throw new Error('作物纹理无效');
        if (retained && (!bare || bare.width !== visual.repeatBare.width || bare.height !== visual.repeatBare.height)) throw new Error('作物成年纹理无效');
        crop.textures = { shared, plants, visual, bare };
        if (visiblePlotIds.has(id)) requestRender();
      }));
      return;
    }

    const atlasLoad = loadAnimationImage(path(`./art/plot/crops/${id}.webp?game=1&v=3`));
    const frontLoad = loadAnimationImage(path(`./art/plot/crops/${id}-front.webp?game=1&v=3`));
    prepareTextures('crop:' + id, () => Promise.all([plotSharedLoad, atlasLoad, frontLoad]).then(([shared, atlas, front]) => {
      const size = plotFrameSize;
      if (!shared || !atlas || !front || atlas.width !== size * 2 || atlas.height !== size * 2 ||
          front.width !== size * 2 || front.height !== size * 2) throw new Error('小麦图集无效');
      const frames = (texture) => Array.from({ length: 4 }, (_, index) => new Texture({
        source: texture.source,
        frame: new Rectangle(index % 2 * size, Math.floor(index / 2) * size, size, size),
      }));
      crop.textures = { shared, stages: frames(atlas), frontStages: frames(front) };
      if (visiblePlotIds.has(id)) requestRender();
    }));
  }

  function loadLivestockTextures(id) {
    if (!Object.hasOwn(livestockSpecies, id)) return unavailableTextures('livestock:' + id);
    const species = livestockSpecies[id];
    const feedTexture = species?.feedTexture;
    if (!feedTexture?.path || feedTexture.size?.length !== 2 || !species.product?.icon || !species.stages) return unavailableTextures('livestock:' + id);
    const existing = livestockTextures.get(id);
    if (existing) return existing.textures;
    const entry = { loadingKey: 'textures:livestock:' + id };
    livestockTextures.set(id, entry);
    prepareTextures('livestock:' + id, () => Promise.all([
      loadAnimationImage(path('./art/livestock/barn.webp?game=1&v=1')),
      loadAnimationImage(path(`./art/livestock/animals/${id}.webp?game=1&v=4`)),
      loadAnimationImage(path(`./wiki/icons/${species.product.icon}.webp?game=1`)),
      loadAnimationImage(path(feedTexture.path + '?game=1&v=1')),
    ]).then(([barn, atlas, product, feed]) => {
      const size = livestockFrameSize;
      const rows = species.stages;
      if (!barn || !atlas || !product || !feed || barn.width !== size || barn.height !== size ||
          atlas.width !== size * livestockIdleFrames || atlas.height !== size * rows ||
          product.width !== 96 || product.height !== 96 ||
          feed.width !== feedTexture.size[0] || feed.height !== feedTexture.size[1]) throw new Error('畜牧纹理无效');
      const stages = Array.from({ length: rows }, (_, stage) => Array.from({ length: livestockIdleFrames }, (_, frame) =>
        new Texture({ source: atlas.source, frame: new Rectangle(frame * size, stage * size, size, size) })));
      entry.textures = { barn, stages, product, feed };
      if (visiblePlotIds.has(id)) requestRender();
    }));
  }

  function syncLivestockBatches(nextWorld) {
    const present = new Set();
    for (const [index, facility] of (nextWorld?.facilities.L ?? []).entries()) {
      const batch = facility.batch;
      if (!batch || !Object.hasOwn(livestockSpecies, batch.id)) continue;
      const key = 'L:' + index;
      present.add(key);
      const previous = livestockBatches.get(key);
      if (previous?.id === batch.id && previous.start === batch.start && previous.end === batch.end) continue;
      const shortBatch = batch.end - batch.start < minLivestockAnimationMs;
      const sameAnimal = previous?.id === batch.id;
      livestockBatches.set(key, {
        id: batch.id, start: batch.start, end: batch.end,
        animationStart: shortBatch && sameAnimal ? previous.animationStart : batch.start,
        previousHarvestAt: !shortBatch && sameAnimal && previous.end === batch.start ? batch.start : undefined,
      });
    }
    for (const key of livestockBatches.keys()) if (!present.has(key)) livestockBatches.delete(key);
  }

  function loadFishTextures(id) {
    if (!Object.hasOwn(fishSpecies, id)) return unavailableTextures('fish:' + id);
    const species = fishSpecies[id];
    const habitat = fishHabitats[species?.habitat];
    if (!habitat?.pond || !species.stages) return unavailableTextures('fish:' + id);
    const existing = fishTextures.get(id);
    if (existing) return existing.textures;
    const entry = { loadingKey: 'textures:fish:' + id };
    fishTextures.set(id, entry);
    prepareTextures('fish:' + id, () => Promise.all([
      loadAnimationImage(path(habitat.pond.replace(/^public\//, './') + '?game=1&v=1')),
      loadAnimationImage(path(`./art/fish/animals/${id}.webp?game=1&v=1`)),
    ]).then(([pond, atlas]) => {
      const size = fishFrameSize;
      const rows = fishSpecies[id].stages;
      if (!pond || !atlas || pond.width !== size || pond.height !== size ||
          atlas.width !== size * fishIdleFrames || atlas.height !== size * rows) throw new Error('鱼池图集无效');
      const stages = Array.from({ length: rows }, (_, stage) => Array.from({ length: fishIdleFrames }, (_, frame) =>
        new Texture({ source: atlas.source, frame: new Rectangle(frame * size, stage * size, size, size) })));
      entry.textures = { pond, stages };
      if (visiblePlotIds.has(id)) requestRender();
    }));
  }

  function syncFishBatches(nextWorld) {
    const present = new Set();
    for (const [index, facility] of (nextWorld?.facilities.F ?? []).entries()) {
      const batch = facility.batch;
      if (!batch || !Object.hasOwn(fishSpecies, batch.id)) continue;
      present.add(index);
      const previous = fishBatches.get(index);
      if (previous?.id === batch.id && previous.start === batch.start && previous.end === batch.end) continue;
      const shortBatch = batch.end - batch.start < minFishAnimationMs;
      fishBatches.set(index, {
        id: batch.id, start: batch.start, end: batch.end,
        animationStart: shortBatch && previous?.id === batch.id ? previous.animationStart : batch.start,
      });
    }
    for (const index of fishBatches.keys()) if (!present.has(index)) fishBatches.delete(index);
  }

  function loadWorkshopTextures(id, kind) {
    if (!data.items[id]) return unavailableTextures('workshop:' + kind + ':' + id);
    const visibleKey = kind + ':' + id;
    const sources = workshopTextureSources(kind);
    if (!sources?.length || sources.some((source) => !source?.path)) return unavailableTextures('workshop:' + visibleKey);
    const key = visibleKey + '|' + sources.map((source) => source.path).join('|');
    const existing = workshopTextures.get(key);
    if (existing) return existing.textures;
    const entry = { loadingKey: 'textures:workshop:' + key };
    workshopTextures.set(key, entry);
    prepareTextures('workshop:' + key, () => Promise.all([
      ...workshopIconIds(id).map(async (iconId) => [iconId,
        await loadAnimationImage(path('./wiki/icons/' + iconId + '.webp?game=1')),
      ]),
      ...sources.map(async (source) => [source.key,
        await loadAnimationImage(path(source.path + '?game=1')),
      ]),
    ]).then((assets) => {
      if (assets.some(([, texture]) => !texture)) throw new Error('动画图片未载入');
      entry.textures = new Map(assets);
      // A completed load only redraws a still-visible recipe. No display node is
      // captured here, so leaving a page cannot resurrect its conveyor sprites.
      if (visiblePlotIds.has('workshop:' + visibleKey)) requestRender();
    }));
  }

  // Shared animation textures are pinned; only visible mines initiate loads.
  function loadMiningTextures(id) {
    const item = miningVisuals.items?.[id];
    const { left, right } = miningVisuals.opening ?? {};
    if (!item?.icon || !miningVisuals.background?.path || !miningVisuals.foreground?.path ||
        !miningVisuals.foreground.rect || !miningVisuals.cart?.path || !miningVisuals.cart.cargo ||
        !Number.isFinite(miningVisuals.cart.visibleLeftX) ||
        !Number.isFinite(left) || !Number.isFinite(right) || right <= left ||
        !miningVisuals.track?.inside || !miningVisuals.track?.station || !miningVisuals.sceneSize) return unavailableTextures('mining:' + id);
    const existing = miningTextures.get(id);
    if (existing) return existing.textures;
    const entry = { loadingKey: 'textures:mining:' + id };
    miningTextures.set(id, entry);
    const sources = { background: miningVisuals.background.path, foreground: miningVisuals.foreground.path,
      cart: miningVisuals.cart.path, icon: item.icon };
    prepareTextures('mining:' + id, () => Promise.all(Object.entries(sources).map(async ([key, source]) => [key,
      await loadAnimationImage(path('./' + source.replace(/^(?:public\/|\.\/)/, '') + '?game=1')),
    ])).then((assets) => {
      if (assets.some(([, texture]) => !texture)) throw new Error('动画图片未载入');
      const loaded = Object.fromEntries(assets);
      if (loaded.background.width !== miningVisuals.background.width ||
          loaded.background.height !== miningVisuals.background.height ||
          loaded.cart.width !== miningVisuals.cart.width || loaded.cart.height !== miningVisuals.cart.height) throw new Error('矿洞纹理无效');
      entry.textures = loaded;
      if (visiblePlotIds.has('mining:' + id)) requestRender();
    }));
  }

  function unmountPlot(plot) {
    if (!plot.animation) return;
    plot.animation.destroy();
    if (plot.holder && !plot.holder.destroyed) plot.holder.destroy({ children: true });
    plot.animation = undefined;
    plot.holder = undefined;
    plot.retained = undefined;
    activePlots.delete(plot);
    markDirty();
  }

  // Before a rebuild destroys the old page, a mounted animation is detached (not destroyed) so
  // the new card for the same slot and batch can adopt it. Nothing renders in between.
  function parkPlot(plot) {
    const { animation, holder, retained } = plot;
    if (!animation || !holder || holder.destroyed || !retained) { unmountPlot(plot); return; }
    holder.parent?.removeChild(holder);
    const previous = retainedAnimations.get(retained.key);
    if (previous) destroyRetained(previous);
    retainedAnimations.set(retained.key, { animation, holder, ...retained });
    plot.animation = undefined;
    plot.holder = undefined;
    plot.retained = undefined;
    activePlots.delete(plot);
  }

  function destroyRetained(entry) {
    entry.animation.destroy();
    if (!entry.holder.destroyed) entry.holder.destroy({ children: true });
  }

  // Parked animations that no visible card adopted unload exactly as before.
  function flushRetainedAnimations() {
    if (!retainedAnimations.size) return;
    for (const entry of retainedAnimations.values()) destroyRetained(entry);
    retainedAnimations.clear();
    markDirty();
  }

  // Re-attaches a parked animation only when every input it was mounted with is unchanged.
  function adoptAnimation(plot, retained) {
    const entry = retainedAnimations.get(retained.key);
    if (!entry) return false;
    retainedAnimations.delete(retained.key);
    if (entry.textures !== retained.textures || entry.motion !== retained.motion ||
        !sameState(entry.signature, retained.signature)) {
      destroyRetained(entry);
      return false;
    }
    plot.art.addChild(entry.holder);
    plot.animation = entry.animation;
    plot.holder = entry.holder;
    plot.retained = retained;
    activePlots.add(plot);
    markDirty();
    return true;
  }

  // Each animation mounts into its own holder so it can be moved between cards as one node.
  function animationHolder(plot) {
    const holder = new Container();
    holder.eventMode = 'none';
    plot.art.addChild(holder);
    plot.holder = holder;
    return holder;
  }

  function drawImage(parent, id, x, y, w, h, crop = false, trackViewport = true) {
    if (!id || w < 1 || h < 1) return;
    if (drawnIcons[id]) { drawPixelIcon(parent, drawnIcons[id], x, y, w, h); return; }
    const manager = managerAsset(id);
    const hero = heroKeys.has(id);
    const scene = sceneKeys.has(id);
    if (!hero && !scene && !hasIcon(id)) return;
    const directory = hero || scene ? './art/' : uiIconKeys.has(id) ? './ui-icons/' : './wiki/icons/';
    const livestockChoice = id.startsWith('livestock-') && data.items[id.slice(10)]?.kind === 'L';
    const livestockScene = id.startsWith('scene-') && data.items[id.slice(6)]?.kind === 'L';
    const version = livestockChoice ? '&v=4' : livestockScene ? '&v=4' : '';
    const source = id === 'mining' ? miningVisuals.background?.path : undefined;
    const file = id === 'merchant-banner' ? 'merchant' : id;
    const url = manager ? path('./art/managers/' + manager + '.webp?game=1' + (manager.startsWith('portraits/') ? '&v=2' : ''))
      : source ? path('./' + source.replace(/^public\//, '') + '?game=1')
      : path(directory + file + '.webp?game=1' + version);
    touchImage(url, scene || manager && !manager.startsWith('icons/') ? 'scene' : hero ? undefined : 'icon');
    if (trackViewport && scrollImages) {
      const layer = new Container();
      layer.eventMode = 'none';
      parent.addChild(layer);
      scrollImages.push({
        layer, bounds: new Rectangle(x, y, w, h),
        mount() {
          const texture = textures.get(url);
          if (texture) {
            mountImage(layer, texture, x, y, w, h, crop, scene);
            return;
          }
          const placeholder = hero || scene ? panel(layer, x, y, w, h, 0xd8e5c7, null, 0) : undefined;
          if (failedImages.has(url)) return;
          loadImage(url).then((asset) => {
            if (!asset || layer.destroyed) return;
            placeholder?.destroy();
            mountImage(layer, asset, x, y, w, h, crop, scene);
          });
        },
      });
      return;
    }
    const texture = textures.get(url);
    if (!texture) {
      if (hero || scene) panel(parent, x, y, w, h, 0xd8e5c7, null, 0);
      if (!loadingImages.has(url) && !failedImages.has(url)) {
        loadImage(url).then((asset) => { if (asset) requestRender(); });
      }
      return;
    }
    mountImage(parent, texture, x, y, w, h, crop, scene);
  }

  function mountImage(parent, texture, x, y, w, h, crop, scene) {
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.eventMode = 'none';
    const factor = (crop ? Math.max : Math.min)(w / texture.width, h / texture.height);
    sprite.scale.set(factor);
    sprite.position.set(x + (w - sprite.width) / 2, y + (h - sprite.height) / 2);
    parent.addChild(sprite);
    markDirty();
    if (crop) {
      const mask = inkGraphics();
      if (scene) mask.roundRect(x, y, w, h, 10);
      else mask.rect(x, y, w, h);
      mask.fill(0xffffff);
      parent.addChild(mask);
      sprite.mask = mask;
    }
  }

  function hitAt(g, parent, x, y, width, height, fn) {
    g.eventMode = 'static';
    g.cursor = 'pointer';
    const hitArea = new Rectangle(x, y, width, height);
    g.hitArea = hitArea;
    const run = (event) => {
      if (blockTap || waiting || openingScreen?.blocking) return;
      if (developmentToolsEnabled) settingsTitleClicks = 0;
      if (event) point = root.toLocal(event.global);
      else point = root.toLocal(parent.toGlobal({ x: x + width / 2, y: y + hitArea.height / 2 }));
      fn(event);
    };
    g.on('pointertap', run);
    const control = { run, parent, x, y, width, height };
    controls.push(control);
    return control;
  }

  function directionIcon(parent, direction, x, y, width, height, { arrow = false, color = palette.ink } = {}) {
    return drawPixelIcon(parent, { kind: arrow ? 'arrow' : 'chevron', direction, color }, x, y, width, height);
  }

  function transitionNode(parent, from, to, x, y, width,
    { size = 16, color = palette.ink, arrowColor = color, align = 'right' } = {}) {
    const layer = new Container();
    layer.eventMode = 'none';
    parent.addChild(layer);
    const first = textNode(layer, from, 0, 0, width, { size, color, weight: '800', wrap: false });
    const last = textNode(layer, to, 0, 0, width, { size, color, weight: '800', wrap: false });
    const iconSize = Math.max(12, size);
    const gap = 5;
    const naturalWidth = first.width + last.width + iconSize + gap * 2;
    const height = Math.max(first.height, last.height, iconSize);
    first.y = (height - first.height) / 2;
    last.position.set(first.width + gap * 2 + iconSize, (height - last.height) / 2);
    directionIcon(layer, 'right', first.width + gap, (height - iconSize) / 2, iconSize, iconSize,
      { arrow: true, color: arrowColor });
    const fit = Math.min(1, Math.max(1, width) / naturalWidth);
    layer.scale.set(fit);
    layer.position.set(x + (align === 'center' ? (width - naturalWidth * fit) / 2 :
      align === 'left' ? 0 : width - naturalWidth * fit), y);
    return layer;
  }

  function showButtonIndicator(options, draw) {
    if (options.indicator) {
      draw();
      return;
    }
    const show = () => { if (options.indicatorWhenVisible()) draw(); };
    let row = listRow;
    while (row && !row.observeIndicators) row = row.outerRow;
    if (row) (row.indicators ??= []).push(show);
    else show();
  }

  function buttonAt(parent, x, y, width, height, label, fn, options = {}) {
    const disabled = !fn || options.disabled || waiting;
    const hasIndicator = options.indicator || (!disabled && options.indicatorWhenVisible);
    const tone = options.tone ?? 'plain';
    const index = disabled ? -1 : controls.length;
    if (index >= 0 && !modal && options.managerFocus && returnedManagerFocus === label) {
      focusIndex = index;
      returnedManagerFocus = undefined;
    }
    const focused = index >= 0 && index === focusIndex;
    const green = tone === 'green' && !disabled;
    const gold = tone === 'gold' && !disabled;
    const stroke = focused ? palette.green : green ? 0x226328 : gold ? 0xd69a24 : palette.border;
    const fill = disabled ? palette.gray : gold ? palette.gold : green ? palette.green :
      tone === 'danger' ? 0xf5ddce : palette.pale;
    let g;
    if (options.segment) {
      g = green || focused ? panel(parent, x + 2, y + 2, width - 4, height - 4, fill, stroke, height / 2) : inkGraphics();
      if (!g.parent) parent.addChild(g);
    } else {
      panel(parent, x, y + 2, width, height - 2, green ? 0x205e28 : gold ? 0xb77919 : 0xe2c9a6, null, 13);
      g = panel(parent, x, y, width, height - 3, fill, stroke, 13);
      panel(parent, x + 1.5, y + 1, width - 3, height - 5, { color: palette.cream, alpha: 0 },
        green ? null : 0xfff5db, 12);
    }
    const iconOnly = options.iconOnly ?? (label === '关闭' ? 'close' : label === '返回' ? 'chevron-left' : undefined);
    if (iconOnly) {
      const size = options.managerFocus ? Math.min(24, Math.max(8, Math.min(width, height) - 8)) : 24;
      drawImage(parent, iconOnly, x + (width - size) / 2, y + (height - size) / 2, size, size);
    } else {
      const icon = options.icon && hasIcon(options.icon) && width >= 63 ? 21 : 0;
      const trailing = options.trailingIcon && hasIcon(options.trailingIcon) ? 22 : 0;
      const baseSize = options.emphasis ? 23 : 18;
      const captionWidth = width - 8 - icon - trailing;
      const size = options.compactLabel ? 15 * scale() : Math.min(baseSize * scale(),
        (captionWidth - 2) / Math.max(2, Array.from(String(label)).length));
      const caption = textNode(parent, label, x + 4 + icon, y + 2, captionWidth,
        { size: Math.max(8, size), align: 'center', color: disabled ? palette.muted : green ? palette.cream : palette.ink,
          weight: '750', wrap: !options.compactLabel });
      if (options.compactLabel && caption.width > captionWidth) caption.scale.set(captionWidth / caption.width);
      caption.y = y + (height - caption.height) / 2;
      if (icon) drawImage(parent, options.icon, Math.max(x + 5, caption.x - icon), y + (height - 18) / 2, 18, 18);
      if (trailing) drawImage(parent, options.trailingIcon, x + width - trailing - 3, y + (height - 18) / 2, 18, 18);
    }
    if (hasIndicator) {
      const segmentInset = options.segment ? 2 : 0;
      showButtonIndicator(options, () => drawIndicator(parent, x + width - segmentInset, y + segmentInset));
    }
    if (iconOnly) {
      g.label = label;
      const hitWidth = Math.max(options.touchSize ?? 48, width);
      const hitHeight = Math.max(options.touchSize ?? 48, height);
      if (!disabled) hitAt(g, parent, x - (hitWidth - width) / 2, y - (hitHeight - height) / 2,
        hitWidth, hitHeight, fn);
      return;
    }
    if (!disabled) hitAt(g, parent, x, y, width, height, fn);
  }

  function sampleDialog(now) {
    if (!modal?.sample || pendingModal || modal.closing || !world || status?.busy || document.hidden ||
        now < nextDialogSampleAt) return false;
    modal.sampledValue = modal.sample(world);
    nextDialogSampleAt = now + (modal.sampleEveryMs ?? defaultDialogSampleEveryMs);
    return true;
  }

  function activateDialog(dialog) {
    if (dialog) navigationMenu = undefined;
    if (modal === dialog) return;
    if (dialog) pauseManagerSpeech();
    if (modal?.sample) delete modal.sampledValue;
    if (modal?.flow === 'merchant-refresh') {
      modal.dismissed = true;
      if (modal.afterClose) queueMicrotask(modal.afterClose);
    }
    modal = dialog;
    nextDialogSampleAt = 0;
    updateDialogSampleProgress = undefined;
    if (modal?.sample) sampleDialog(performance.now());
  }

  function setDialog(title, draw, options = false) {
    if (navigation?.returning) return;
    coast = null;
    const info = typeof options === 'object'
      ? { title, draw, scroll: 0, ...options } : { title, draw, scroll: 0, center: options };
    info.routeKey = String(++routeDialogSequence);
    info.parentDialog = modal;
    info.ownerPage = current;
    info.navigationEpoch = navigationEpoch;
    if (current === '行脚商') info.merchantDialogEpoch = merchantDialogEpoch;
    info.pageContext = { ...captureContext(modal), linkedEntryParent: undefined };
    if (info.onImportText || info.onImportFile) app.canvas.focus?.({ preventScroll: true });
    if (!modal && current === '研究' && linkedEntryParent) {
      info.parentPage = linkedEntryParent;
      linkedEntryParent = undefined;
    }
    if (building) { pendingModal = info; requestRender(); }
    else {
      activateDialog(info);
      focusIndex = -1;
      recordRoute();
      redraw();
    }
  }

  function dismissDialog() {
    coast = null;
    pendingModal = undefined;
    returnedManagerFocus = modal?.managerFocus;
    activateDialog(undefined);
    focusIndex = -1;
    returnToRecordedParent();
  }

  function closeManagerGift(afterReturn) {
    if (modal?.flow !== 'manager-quantity') return false;
    coast = null;
    pendingModal = undefined;
    modal.dismissed = true;
    const picker = modal.parentDialog;
    if (picker?.flow === 'manager-gifts') picker.dismissed = true;
    const parent = picker?.parentDialog;
    returnedManagerFocus = parent ? undefined : '送礼';
    const returned = availableDialog(parent);
    activateDialog(returned ? parent : undefined);
    focusIndex = -1;
    afterReturn?.();
    returnToRecordedParent();
    return returned;
  }

  function conversationFor(owner, role, gender, greeting) {
    owner.managerSpeechKeys ??= {};
    const previous = managerConversations.get(owner.managerSpeechKeys[role]);
    if (previous?.gender === gender) {
      if (greeting && !managerDailyLines.has(previous)) managerDailyLines.set(previous, { text: greeting(), expression: 'smile', priority: 0 });
      return previous;
    }
    const speech = createManagerSpeechQueue(role, gender);
    if (greeting) {
      const daily = { text: greeting(), expression: 'smile', priority: 0 };
      managerDailyLines.set(speech, daily);
      speech.offer(daily);
    }
    owner.managerSpeechKeys[role] = ++managerConversationSequence;
    managerConversations.set(managerConversationSequence, speech);
    // Retain queues for live pages and the open dialog chain; discarded profiles and
    // earlier page visits must not accumulate for the lifetime of an idle session.
    const owners = [...Object.values(locals), owner];
    for (let dialog = modal; dialog; dialog = dialog.parentDialog) owners.push(dialog);
    const live = new Set(owners.flatMap((entry) => Object.values(entry.managerSpeechKeys ?? {})));
    for (const key of managerConversations.keys()) if (!live.has(key)) managerConversations.delete(key);
    return speech;
  }

  function queueManagerSpeech(role, gender, line, { inCard = false } = {}) {
    const owner = modal?.managerRole === role && modal.managerFocus !== '管理员资料' ? modal : locals[current];
    const speech = conversationFor(owner, role, gender);
    if (inCard) owner.managerReplyRole = role;
    else delete owner.managerReplyRole;
    speech.enqueue(line);
    requestRender();
  }

  function advanceManagerSpeech(role, gender, { messages, nextGreeting, inCard = false } = {}) {
    const now = performance.now();
    if (now - (managerTapTimes.get(role) ?? -Infinity) < 300) return;
    managerTapTimes.set(role, now);
    const owner = modal?.managerRole === role && modal.managerFocus !== '管理员资料' ? modal : locals[current];
    const speech = conversationFor(owner, role, gender);
    const candidates = messages ?? (inCard ? [] : managerCandidates.get(role + ':' + gender)?.messages) ?? [];
    const nextDaily = nextGreeting ?? managerCandidates.get(role + ':' + gender)?.nextGreeting;
    const currentText = speech.line?.text;
    const help = candidates.filter((line, index) => line?.text &&
      candidates.findIndex((other) => other?.text === line.text) === index);
    const currentIndex = help.findIndex((line) => line.text === currentText);
    const another = help.find((line, index) => index > currentIndex && line.text !== currentText)
      ?? help.find((line) => line.text !== currentText);
    const daily = !another && nextDaily?.(currentText);
    const selected = another ?? (daily ? { text: daily, expression: 'smile', priority: 0 } : undefined);
    if (!selected) return;
    speech.select(selected);
    managerSelections.set(speech, { line: selected, candidates: JSON.stringify(help) });
    if (daily) managerDailyLines.set(speech, selected);
    if (inCard) owner.managerReplyRole = role;
    else delete owner.managerReplyRole;
    pauseManagerSpeech();
    requestRender();
  }

  async function closeDialog() {
    if (waiting || navigation?.returning) return;
    const shown = modal;
    if (shown?.closing) return;
    if (shown?.onClose) {
      shown.closing = true;
      try {
        if (await shown.onClose() === false || modal !== shown) return;
      } finally {
        shown.closing = false;
      }
    }
    restoreDialogParent(shown);
    returnToRecordedParent();
  }

  function availableDialog(dialog) {
    return Boolean(dialog && dialog.navigationEpoch === navigationEpoch &&
      !dialog.dismissed && (dialog.ownerPage !== '行脚商' || dialog.merchantDialogEpoch === merchantDialogEpoch) &&
      (!world || !dialog.available || dialog.available(world)));
  }

  function restoreDialogParent(shown) {
    pendingModal = undefined;
    focusIndex = -1;
    if (availableDialog(shown?.parentDialog)) activateDialog(shown.parentDialog);
    else if (!restoreContext(shown?.parentPage)) {
      returnedManagerFocus = shown?.managerFocus;
      activateDialog(undefined);
    }
  }

  function reserveMerchantSale(hold) {
    return dispatch('reserveMerchantSale', hold);
  }

  function clearMerchantPage(release) {
    if (release && locals.行脚商.editor?.holdCount > 0n) void reserveMerchantSale(null);
    locals.行脚商 = { scroll: 0 };
    merchantDialogEpoch += 1;
    sliderDrag = null;
    coast = null;
  }

  function sameMerchantTab(first, second) {
    return (first ?? '买入') === (second ?? '买入');
  }

  function prepareMerchantNavigation(page, tab) {
    if (current !== '行脚商') return;
    if (page !== current) clearMerchantPage(false);
    else if (!sameMerchantTab(locals.行脚商.tab, tab)) clearMerchantPage(true);
  }

  function switchMerchantTab(tab) {
    if (current !== '行脚商' || sameMerchantTab(locals.行脚商.tab, tab)) return;
    clearMerchantPage(true);
    locals.行脚商.tab = tab;
    pendingModal = undefined;
    activateDialog(undefined);
    focusIndex = -1;
    refresh();
  }

  function hasMerchantRefreshNotice() {
    return modal?.flow === 'merchant-refresh' || pendingModal?.flow === 'merchant-refresh';
  }

  function merchantBatchChanged(afterClose) {
    if (current !== '行脚商') return false;
    const preemptedOffline = modal?.flow === 'offline-report' || pendingModal?.flow === 'offline-report';
    clearMerchantPage(false);
    pendingModal = undefined;
    activateDialog(undefined);
    recordRoute(true);
    setDialog('行脚商已换货', (panel) => {
      panel.button('知道了', panel.close, { tone: 'gold' });
    }, { center: true, maxHeight: 172, flow: 'merchant-refresh', afterClose });
    return preemptedOffline;
  }

  function captureContext(sourceDialog = modal) {
    const local = locals[current];
    return {
      page: current, local: current === '行脚商'
        ? { tab: local.tab, scroll: local.scroll, merchantDialogEpoch }
        : copyViewState(local),
      modal: sourceDialog,
      parent: pageParent, linkedEntryParent, epoch: navigationEpoch,
    };
  }

  function rememberContext() {
    const active = navigation?.active;
    if (!active || applyingRoute || navigation.returning) return;
    active.context = captureContext();
    active.scroll = locals[current].scroll;
  }

  function restoreContext(context) {
    if (!context || context.epoch !== navigationEpoch || !Object.hasOwn(pages, context.page)) return false;
    navigationMenu = undefined;
    const changedPage = current !== context.page;
    if (changedPage) resetManagerSpeech();
    prepareMerchantNavigation(context.page, context.local.tab);
    current = context.page;
    const local = locals[current];
    if (current === '行脚商') {
      local.tab = context.local.tab;
      local.scroll = context.local.merchantDialogEpoch === merchantDialogEpoch ? context.local.scroll : 0;
    } else restoreViewState(local, context.local);
    if (changedPage) { delete local.managerSpeechKeys; delete local.managerReplyRole; }
    pageParent = context.parent;
    linkedEntryParent = context.linkedEntryParent;
    pendingModal = undefined;
    activateDialog(availableDialog(context.modal) ? context.modal : undefined);
    focusIndex = -1;
    if (changedPage) onNavigate?.(current);
    return true;
  }

  function defaultParent(page) {
    const parent = page === '行脚商' ? '仓库' : ['图鉴', '出售庄园', '管理员管理', '统计', '出售庄园历史'].includes(page) ? '经营' : homePage;
    return {
      page: parent, local: copyViewState(locals[parent]), modal: undefined,
      parent: parent === homePage ? undefined : defaultParent(parent), epoch: navigationEpoch,
    };
  }

  function go(destination, options = {}, sourceDialog) {
    const page = pageForRoute(destination, options.tab);
    const tab = page === destination ? options.tab : undefined;
    if (!Object.hasOwn(pages, page) || navigation?.returning) return;
    navigationMenu = undefined;
    if (developmentToolsEnabled) settingsTitleClicks = 0;
    coast = null;
    rememberContext();
    const changedPage = page !== current;
    const directedEntry = options.id !== undefined || tab !== undefined;
    if (!changedPage && !directedEntry && modal) {
      dismissDialog();
      return;
    }
    const source = availableDialog(sourceDialog) && sourceDialog.ownerPage !== current
      ? { ...sourceDialog.pageContext, modal: sourceDialog }
      : captureContext(availableDialog(sourceDialog) ? sourceDialog : modal);
    if (page === homePage) pageParent = undefined;
    else if (options.menu) pageParent = defaultParent(page);
    else if (changedPage || directedEntry && !(page === '研究' && !modal && options.id === undefined)) pageParent = source;
    linkedEntryParent = page === '研究' && options.id !== undefined ? pageParent : undefined;
    if (changedPage || tab !== undefined) prepareMerchantNavigation(page, tab);
    if (changedPage) {
      resetManagerSpeech();
      current = page;
      delete locals[page].managerSpeechKeys;
      delete locals[page].managerReplyRole;
      onNavigate?.(current);
    }
    if (page === '图鉴') {
      delete locals[page].catalogId;
      delete locals[page].catalogListParent;
      locals[page].catalogTrail = [];
      locals[page].showUses = false;
    }
    if (tab !== undefined) { locals[page].tab = tab; locals[page].scroll = 0; }
    if (options.id !== undefined) {
      locals[page].id = options.id;
      delete locals[page].positionedSourceId;
      locals[page].scroll = 0;
      if (page === '研究') locals[page].openResearchItem = true;
    }
    else if (page === '研究' && tab !== undefined) delete locals[page].linkedResearchItem;
    pendingModal = undefined;
    activateDialog(undefined);
    focusIndex = -1;
    recordRoute();
    redraw();
  }

  function back() {
    if (waiting || navigation?.returning) return;
    if (developmentToolsEnabled) settingsTitleClicks = 0;
    coast = null;
    if (modal) { closeDialog(); return; }
    if (navigationMenu) { closeNavigationMenu(); return; }
    applyingRoute = true;
    let moved;
    try { moved = restorePageParent(); }
    finally { applyingRoute = false; }
    if (moved) returnToRecordedParent();
  }

  function restorePageParent() {
    if (locals[current].onBack?.()) return true;
    if (current === homePage) return false;
    if (!restoreContext(pageParent)) restoreContext(defaultParent(current));
    return true;
  }

  function showExactNumber(label, value) {
    setDialog(label, (dialog) => {
      dialog.fullNumber(value);
      dialog.button('复制数值', async () => {
        try { await navigator.clipboard.writeText(value.toString()); float('已复制'); }
        catch { toast('无法复制，请查看上方数值。'); }
      });
    }, { center: true });
  }

  function routeSnapshot() {
    const local = locals[current];
    const tab = current === '图鉴' ? (local.showUses || local.tab === '用途' ? '用途' : undefined) : local.tab;
    return {
      ...routeForPage(current, tab),
      id: (current === '图鉴' ? local.id ?? local.catalogId : local.id ?? local.linkedResearchItem) || undefined,
      dialog: modal?.routeKey,
    };
  }

  function recordRoute(replace = false) {
    if (!navigation || applyingRoute || navigation.returning) return;
    const route = routeSnapshot();
    const prior = navigation.active;
    if (prior && Object.keys(route).every((key) => route[key] === prior.route[key])) {
      rememberContext();
      return;
    }
    navigation.write(route, modal, replace, locals[current].scroll, captureContext());
  }

  function returnToRecordedParent() {
    if (!navigation?.backTo(routeSnapshot(), modal, captureContext())) recordRoute(true);
    redraw();
  }

  function addDirectLinkParents() {
    const parents = [];
    for (let parent = pageParent; parent; parent = parent.parent) parents.unshift(parent);
    for (const [index, parent] of parents.entries()) {
      const route = routeForPage(parent.page, parent.local.tab);
      navigation.write(route, undefined, index === 0, parent.local.scroll, parent);
    }
    navigation.write(routeSnapshot(), modal, false, locals[current].scroll, captureContext());
  }

  function restoreRoute(initial = false) {
    if (!navigation) return;
    navigationMenu = undefined;
    if (developmentToolsEnabled) settingsTitleClicks = 0;
    const entry = navigation.read();
    const { page: destination, tab: routeTab, id } = entry.route;
    const page = pageForRoute(destination, routeTab);
    const tab = page === destination ? routeTab : undefined;
    applyingRoute = true;
    coast = null;
    const restoringTab = !modal && !entry.modal && page === current &&
      (page === '研究' || page === '行脚商') && routeSnapshot().tab !== routeTab;
    if (entry.backward && !restoringTab && (modal || current !== homePage)) {
      try {
        if (modal) restoreDialogParent(modal);
        else restorePageParent();
      } finally { applyingRoute = false; }
      recordRoute(true);
      redraw();
      return;
    }
    if (!restoreContext(entry.context)) {
      const changedPage = page !== current;
      if (changedPage) {
        resetManagerSpeech();
        delete locals[page].managerSpeechKeys;
        delete locals[page].managerReplyRole;
      }
      prepareMerchantNavigation(page, tab);
      if (changedPage) onNavigate?.(page);
      current = page;
      pageParent = page === homePage ? undefined : defaultParent(page);
      linkedEntryParent = undefined;
      const local = locals[page];
      local.tab = tab;
      delete local.positionedSourceId;
      if (page === '图鉴') {
        local.catalogId = id;
        local.showUses = tab === '用途';
        local.catalogTrail = [];
        delete local.catalogListParent;
        delete local.id;
      } else if (id && (id !== local.linkedResearchItem || local.activeResearchTab !== tab)) local.id = id;
      else delete local.id;
      if (page === '研究') local.openResearchItem = Boolean(id && (initial || !entry.key));
      if (page === '研究' && !id && local.linkedResearchItem) {
        const panel = local.researchPanels?.[tab];
        if (panel) delete panel.selected;
        delete local.linkedResearchItem;
      }
      if (entry.scroll !== undefined && page !== '行脚商') local.scroll = entry.scroll;
      pendingModal = undefined;
      activateDialog(availableDialog(entry.modal) ? entry.modal : undefined);
    }
    focusIndex = -1;
    if (!initial) redraw();
    applyingRoute = false;
    if (initial && !entry.key && entry.position === undefined && pageParent) addDirectLinkParents();
    else if (!entry.key || (entry.modal && !modal)) recordRoute(true);
    else rememberContext();
  }

  function refresh() {
    recordRoute();
    redraw();
  }

  function toast(message, { placement = 'top' } = {}) {
    notices = { message, placement, expires: performance.now() + 2500 };
    drawFeedback();
  }

  function float(message) {
    const at = point ?? { x: frame.width / 2, y: frame.height * 0.72 };
    floating = { message, at: { x: at.x, y: at.y }, started: performance.now() };
    drawFeedback();
  }

  async function action(name, ...args) {
    if (waiting) return false;
    waiting = true;
    const savedPoint = point;
    redraw();
    try {
      const result = await dispatch(name, ...args);
      point = savedPoint;
      if (!result?.ok) {
        if (name === 'giftManager' && result?.staleManagerGift) {
          if (result.toast) toast(result.toast);
        } else if (result?.message || result?.toast) toast(result.message || result.toast);
        return false;
      }
      if (result.float) float(result.float);
      if (result.toast) toast(result.toast);
      return result.qualityDraw ?? result.managerGift ?? true;
    } finally {
      waiting = false;
      redraw();
    }
  }

  async function saveAction(name, ...args) {
    if (waiting) return { ok: false, message: '正在处理存档，请稍候。' };
    if (typeof saveManagement[name] !== 'function') return { ok: false, message: '当前无法执行这项存档操作。' };
    waiting = true;
    try {
      // Start native picker/clipboard work in the original input event before rebuilding the view.
      const pending = saveManagement[name](...args);
      redraw();
      return await pending;
    } finally {
      waiting = false;
      if (['captureImport', 'readClipboard', 'readImportFile', 'download', 'copyText'].includes(name)) {
        app.canvas.focus?.({ preventScroll: true });
      }
      redraw();
    }
  }

  function withinScrollViewport(top, bottom, scroll, viewport, left, right) {
    const upper = Math.max(top, scroll);
    const lower = Math.min(bottom, scroll + viewport.height);
    if (upper >= lower) return false;
    const { pinned } = viewport;
    const pinnedTop = pinned && Math.max(scroll, pinned.top);
    return !pinned || upper < pinnedTop || lower > pinnedTop + pinned.height ||
      left < pinned.left || right > pinned.right;
  }

  function marketMark(parent, width, rate, size, trackViewport) {
    const layer = new Container();
    layer.eventMode = 'none';
    parent.addChild(layer);
    const color = rate > 0 ? palette.green : palette.red;
    const icon = rate > 0 ? 'market-up' : 'market-down';
    const markSize = marketMarkSize(size);
    const amount = textNode(layer, marketRateText(rate), 0, 0, width,
      { size: markSize, color, weight: '800', wrap: false });
    // Reserve space for the icon while its texture loads.
    const bounds = marketMarkLayout(width, markSize, amount);
    const { iconSize, fit } = bounds;
    amount.x = iconSize + 2;
    drawImage(layer, icon, 0, Math.max(0, (amount.height - iconSize) / 2), iconSize, iconSize, false, trackViewport);
    layer.scale.set(fit);
    return { layer, width: bounds.width, height: bounds.height };
  }

  function marketLabel(parent, value, x, y, width, rate, options = {}) {
    if (!rate) return textNode(parent, value, x, y, width, options);
    const { size = 16, align = 'left', trackViewport = true } = options;
    const span = Math.max(1, width);
    const layer = new Container();
    layer.eventMode = 'none';
    layer.position.set(x, y);
    parent.addChild(layer);
    const color = rate > 0 ? palette.green : palette.red;
    const title = textNode(layer, value, 0, 0, span, { ...options, align: 'left', color, wrap: false });
    const mark = marketMark(layer, span, rate, size, trackViewport);
    const inset = (blockWidth) => align === 'center' ? (span - blockWidth) / 2 : align === 'right' ? span - blockWidth : 0;
    if (marketLabelFits(span, title.text, title.width, mark.width)) {
      const inlineWidth = title.width + marketLabelGap + mark.width;
      const height = Math.max(title.height, mark.height);
      title.position.set(inset(inlineWidth), (height - title.height) / 2);
      mark.layer.position.set(title.x + title.width + marketLabelGap, (height - mark.height) / 2);
    } else {
      title.style.wordWrap = options.wrap !== false;
      title.style.breakWords = options.wrap !== false;
      title.style.align = align;
      if (title.width > span) title.scale.set(span / title.width);
      title.x = inset(title.width);
      mark.layer.position.set(inset(mark.width), title.height + 1);
    }
    return layer;
  }

  function layoutUI(parent, x, y, width, local, availableHeight, fullBleed = 0, pinTabs, options = {}) {
    let cursor = y;
    const dialogContent = Boolean(options.captureFooter);
    let methodDepth = 0;
    let trailingButtons = [];
    const rowGap = 7;
    const resetScroll = () => { local.scroll = 0; redraw(); };
    const choiceGap = (columns) => columns > 1 ? 7 : 4;
    const choiceCellWidth = (columns) => (width + choiceGap(columns)) / columns - choiceGap(columns);
    function scrollChoices(items, onSelect, columns, heights, draw, { toggle = false } = {}) {
      if (!items.length) return;
      const top = cursor;
      const gap = choiceGap(columns);
      const cellWidth = choiceCellWidth(columns);
      const rows = [];
      let nextTop = top;
      for (let index = 0; index < items.length; index += columns) {
        const height = typeof heights === 'number' ? heights : heights[rows.length];
        rows.push({ top: nextTop, bottom: nextTop + height, height });
        nextTop += height + gap;
      }
      const listHeight = rows.at(-1).bottom - top;
      const list = new Container();
      list.eventMode = 'none';
      parent.addChild(list);
      const hit = inkGraphics();
      parent.addChild(hit);
      const rendered = new Map();
      const focus = controls.length;
      let selected = clamp(local.indexKeyboard ?? 0, 0, items.length - 1);
      let visibleScroll = 0;
      function firstRowAfter(y) {
        let first = 0;
        let end = rows.length;
        while (first < end) {
          const middle = (first + end) >>> 1;
          if (rows[middle].bottom <= y) first = middle + 1;
          else end = middle;
        }
        return first;
      }
      function paint(scroll) {
        visibleScroll = scroll;
        const viewport = options.viewport ?? { height: availableHeight };
        const firstRow = firstRowAfter(scroll);
        let endRow = firstRow;
        while (endRow < rows.length && rows[endRow].top < scroll + viewport.height) endRow += 1;
        const first = columns * firstRow;
        const end = Math.min(items.length, columns * endRow);
        for (const [index, tile] of rendered) {
          if (index >= first && index < end) continue;
          tile.layer.destroy({ children: true });
          rendered.delete(index);
        }
        for (let index = first; index < end; index += 1) {
          const left = x + (index % columns) * (cellWidth + gap);
          const { top: at, height } = rows[Math.floor(index / columns)];
          let tile = rendered.get(index);
          if (!tile) {
            const layer = new Container();
            list.addChild(layer);
            draw(layer, items[index], left, at, cellWidth, height);
            const outline = inkGraphics();
            layer.addChild(outline);
            tile = { layer, outline };
            rendered.set(index, tile);
          }
          tile.outline.clear();
          if (onSelect && focusIndex === focus && selected === index) {
            tile.outline.roundRect(left, at, cellWidth, height, 9).stroke({ color: palette.green, width: 2 });
          }
        }
      }
      if (onSelect && !waiting) {
        const control = hitAt(hit, parent, x, top, width, listHeight, (event) => {
          let index = selected;
          if (event) {
            const position = parent.toLocal(event.global);
            const row = firstRowAfter(position.y);
            const column = Math.floor((position.x - x) / (cellWidth + gap));
            if (!rows[row] || position.y < rows[row].top || column < 0 || column >= columns ||
                position.x - x - column * (cellWidth + gap) >= cellWidth) return;
            index = row * columns + column;
          }
          const item = items[index];
          if (item && (toggle || !item.selected)) onSelect(item);
        });
        control.height = rows[0].height;
        control.key = (key) => {
          const stepByKey = { ArrowDown: columns, ArrowUp: -columns, ArrowLeft: -1, ArrowRight: 1 };
          if (!Object.hasOwn(stepByKey, key)) return false;
          selected = clamp(selected + stepByKey[key], 0, items.length - 1);
          local.indexKeyboard = selected;
          const rowIndex = Math.floor(selected / columns);
          const row = rows[rowIndex];
          const viewportHeight = options.viewport?.height ?? availableHeight;
          if (row.top < visibleScroll || row.bottom > visibleScroll + viewportHeight) {
            const previousTop = rows[rowIndex - 1]?.top ?? top - row.height - gap;
            changeScroll(Math.max(previousTop, Math.min(row.top, row.bottom - viewportHeight)));
          } else paint(visibleScroll);
          return true;
        };
      }
      if (options.observeScroll) options.observeScroll(paint);
      else paint(local.scroll ?? 0);
      cursor += listHeight + rowGap;
    }
    function choiceTitle(layer, item, left, top, span, height, size, align = 'left') {
      const title = marketLabel(layer, item.label, left, top, span, item.marketRate,
        { size, align, weight: '800', trackViewport: false });
      const fit = Math.min(1, height / title.height);
      if (fit < 1) {
        if (align === 'center') title.x = left + (title.x - left) * fit + span * (1 - fit) / 2;
        title.scale.set(fit);
      }
      return title;
    }
    const ui = {
      w: world, local, width, height: availableHeight, refresh, back, action, float, toast,
      currentWorld: () => world, reserveMerchantSale, switchMerchantTab,
      go: (page, settings) => go(page, settings, local.routeKey ? local : undefined),
      isActive: () => local.routeKey ? modal === local && local.navigationEpoch === navigationEpoch : locals[current] === local,
      saveManagement, saveAction,
      dialog: setDialog, close: closeDialog, closeManagerGift, queueManagerSpeech, advanceManagerSpeech,
      tree(options) {
        const treeHeight = Math.max(120, availableHeight - cursor - 5);
        mountResearchTree({
          ...options, parent, x, y: cursor, width, height: treeHeight,
          // The tree manages its own viewport as its content moves and zooms.
          drawImage: (layer, id, left, top, w, h) => drawImage(layer, id, left, top, w, h, false, false),
          textNode, transitionNode, buttonAt, inkGraphics, requestRender, textScale: scale(),
          isWaiting: () => waiting || Boolean(modal),
          markGesture(active) {
            treeGesture = active;
            if (active) coast = null;
            else if (needsRender) requestRender();
          },
        });
        cursor += treeHeight;
      },
      heading(value, { aside, asideNoWrap = false, style, size = style === 'production' ? 27 : 22, marketRate } = {}) {
        const clearance = options.headingClearance;
        const headingWidth = clearance && cursor < clearance.bottom
          ? Math.max(1, Math.min(width, clearance.right - x)) : width;
        if (aside == null) {
          const t = marketLabel(parent, value, x, cursor + 2, headingWidth, marketRate, { size: size * scale(), weight: '800' });
          cursor += t.height + 11;
          return;
        }
        if (asideNoWrap) {
          const preferredSize = (style === 'production' ? 18 : 16) * scale();
          const minimumSize = Math.min(preferredSize, 12 * scale());
          const info = textNode(parent, aside, x, cursor, Math.max(1, headingWidth - 13),
            { size: preferredSize, weight: '800', wrap: false });
          const maximumAsideWidth = Math.max(1, headingWidth * 0.56 - 13);
          const beside = headingWidth > 160 && info.width * minimumSize / preferredSize <= maximumAsideWidth;
          const available = beside ? maximumAsideWidth : Math.max(1, headingWidth - 13);
          if (info.width > available) {
            info.style.fontSize = preferredSize * available / info.width;
            info.style.lineHeight = Math.ceil(info.style.fontSize * 1.36);
          }
          const title = marketLabel(parent, value, x, cursor + 2,
            beside ? Math.max(1, headingWidth - info.width - 25) : headingWidth,
            marketRate, { size: size * scale(), weight: '800' });
          info.position.set(x + headingWidth - info.width - 7,
            beside ? title.y + Math.max(0, (title.height - info.height) / 2) : title.y + title.height + 7);
          const badge = panel(parent, info.x - 6, info.y - 2, info.width + 13, info.height + 4,
            palette.pale, null, 13);
          parent.setChildIndex(badge, parent.getChildIndex(info));
          cursor = Math.max(title.y + title.height, info.y + info.height + 2) + 8;
          return;
        }
        const room = scale() <= 1.45 && headingWidth > 160 ? Math.min(105, Math.floor(headingWidth * 0.39)) : 0;
        const title = marketLabel(parent, value, x, cursor + 2, headingWidth - room,
          marketRate, { size: size * scale(), weight: '800' });
        const info = textNode(parent, aside, room ? x + headingWidth - room : x,
          room ? cursor + 5 : title.y + title.height, room ? room - 8 : headingWidth,
          { size: (style === 'production' ? 18 : 16) * scale(), align: room ? 'right' : 'left', weight: '800' });
        if (room) {
          const badge = panel(parent, info.x - 6, info.y - 2, info.width + 13, info.height + 4, palette.pale, null, 13);
          parent.setChildIndex(badge, parent.getChildIndex(info));
        }
        cursor = Math.max(title.y + title.height, info.y + info.height) + 8;
      },
      titleBar(title, label, fn, options = {}) {
        const compactTitle = options.compact === true;
        const production = options.style === 'production';
        const inset = compactTitle ? 0 : 12;
        const beside = Boolean(label) && width >= 186 * Math.min(scale(), 1.32);
        const buttonWidth = beside ? Math.min(width * 0.48, Math.max(90, label.length * 16 * scale() + 20)) : width;
        const headingWidth = width - inset - (beside ? buttonWidth + 8 : 0);
        const top = cursor;
        const t = textNode(parent, title, x + inset, top, headingWidth, {
          size: (compactTitle ? 19 : production ? 35 : 30) * scale(), weight: '800',
        });
        const height = Math.max(t.height, beside ? 48 : 28);
        t.y += (height - t.height) / 2;
        if (!compactTitle) parent.addChild(inkGraphics().roundRect(x + 1, t.y + 4, 4, Math.max(15, t.height - 8), 2).fill(palette.green));
        if (beside) buttonAt(parent, x + width - buttonWidth, top, buttonWidth, height, label, fn,
          { tone: 'gold', emphasis: production, ...options });
        cursor += height + rowGap;
        if (label && !beside) ui.button(label, fn, { tone: 'gold', ...options });
      },
      text(value, options = {}) {
        const { fontSize = 15, muted = false, color, align, suffix } = options;
        const style = { size: fontSize * scale(), color: color ?? (muted ? palette.muted : palette.ink) };
        if (!suffix) {
          const t = textNode(parent, value, x, cursor, width, { ...style, align });
          cursor += t.height + rowGap;
          return;
        }
        const prefix = textNode(parent, value, x, cursor, width, { ...style, wrap: false });
        const tail = textNode(parent, suffix.value, x, cursor, width,
          { ...style, color: suffix.tone === 'danger' ? palette.red : style.color, wrap: false });
        const naturalWidth = prefix.width + tail.width;
        const fit = Math.min(1, width / naturalWidth);
        prefix.scale.set(fit);
        tail.scale.set(fit);
        const inset = width - naturalWidth * fit;
        if (align === 'right') prefix.x += inset;
        else if (align === 'center') prefix.x += inset / 2;
        tail.x = prefix.x + prefix.width;
        cursor += Math.max(prefix.height, tail.height) + rowGap;
      },
      sampleProgress(label) {
        if (modal !== local || !local.sample) return;
        const top = cursor;
        const radius = 6;
        const indent = radius * 2 + 6;
        const caption = textNode(parent, label, x + indent, top, width - indent,
          { size: 12 * scale(), color: palette.muted, wrap: false });
        const height = Math.max(caption.height, radius * 2);
        const cx = x + radius;
        const cy = top + height / 2;
        caption.y = cy - caption.height / 2;
        const track = inkGraphics().circle(cx, cy, radius).fill(palette.line)
          .stroke({ color: palette.border, width: 1 });
        const fill = inkGraphics();
        parent.addChild(track, fill);
        cursor += height + 4;

        const cycleMs = local.sampleEveryMs ?? defaultDialogSampleEveryMs;
        const startAngle = -Math.PI / 2;
        const { observeScroll, viewport } = options;
        let visible = !observeScroll || !viewport;
        let previous = -1;
        const update = (now) => {
          if (!visible || modal !== local || pendingModal || local.closing || fill.destroyed) return;
          const fraction = nextDialogSampleAt && cycleMs > 0
            ? clamp(1 - (nextDialogSampleAt - now) / cycleMs, 0, 1) : 0;
          const percent = Math.round(fraction * 100);
          if (percent === previous) return;
          previous = percent;
          markDirty();
          fill.clear();
          if (percent === 100) fill.circle(cx, cy, radius).fill(palette.green);
          else if (percent > 0) fill.moveTo(cx, cy).lineTo(cx, cy - radius)
            .arc(cx, cy, radius, startAngle, startAngle + Math.PI * 2 * percent / 100)
            .lineTo(cx, cy).fill(palette.green);
        };
        updateDialogSampleProgress = update;
        if (observeScroll && viewport) observeScroll((scroll) => {
          visible = withinScrollViewport(top, top + height, scroll, viewport, x, x + width);
          if (visible && !document.hidden) update(performance.now());
        });
        else update(performance.now());
      },
      row(label, value, options = {}) {
        const metric = options.style === 'metric';
        const comparison = options.style === 'comparison';
        const compactRow = options.compact || metric || comparison;
        const start = cursor;
        const background = options.pill ? parent.addChild(inkGraphics()) : null;
        if (background) background.label = 'detail-row-background';
        const minimumHeight = background ? 33 : compactRow ? 32 : 0;
        const icon = options.icon && (hasIcon(options.icon) || sceneKeys.has(options.icon)) ? (compactRow ? 29 : 28) : 0;
        if (icon && !options.valueIcon) drawImage(parent, options.icon, x, cursor + 1, icon - 3, icon - 3);
        const size = (compactRow ? 16 : 15) * scale();
        const valueColor = options.tone === 'danger' ? palette.red : options.tone === 'green' ? palette.green : palette.ink;
        if (options.valueAtClock) value = options.valueAtClock(progressClock(performance.now()));
        const transition = value && typeof value === 'object' && value.from != null && value.to != null ? value :
          options.from != null && options.to != null ? { from: options.from, to: options.to } : undefined;
        const valueStr = transition ? number(transition.from) + ' ' + number(transition.to) : number(value);
        if ((options.noWrap || label === '距收获') && value != null && !options.marketRate && !options.valueMarketRate) {
          const nameX = x + icon + (options.pill ? 6 : 0);
          const room = Math.max(1, x + width - nameX - 2);
          const name = textNode(parent, label, nameX, start, room,
            { size, weight: '750', wrap: false });
          const amount = textNode(parent, valueStr, nameX, start, room,
            { size, weight: '800', wrap: false, color: valueColor });
          const nameWidth = name.width;
          let baselineWidth = 0;
          if (options.valueAtClock) {
            // Reserve the longest ordinary minute display so ticking seconds never reflows the row.
            const measure = textNode(parent, '999 分 59 秒', 0, 0, room, { size, wrap: false });
            baselineWidth = measure.width;
            measure.destroy();
          }
          const height = Math.max(32, minimumHeight, Math.ceil(size * 1.36) + 4, icon);
          const align = () => {
            amount.scale.set(1);
            const fit = Math.min(1, room / (nameWidth + Math.max(amount.width, baselineWidth) + 6));
            name.scale.set(fit);
            amount.scale.set(fit);
            name.y = start + (height - name.height) / 2;
            amount.position.set(x + width - amount.width, start + (height - amount.height) / 2);
          };
          align();
          bindCountdownText(amount, options.valueAtClock, align, options.toneAtClock);
          if (background) paintPanel(background, x, start, width, height, palette.pale, null, 9);
          if (options.divider) parent.addChild(
            inkGraphics().rect(x, start + height, width, 1).fill({ color: palette.line, alpha: 0.7 }));
          cursor += height + (compactRow ? 3 : rowGap);
          return;
        }
        const aWidth = options.stack || scale() > 1.45 || value == null ? width :
          Math.floor(width * (options.compact ? 0.68 : metric ? 0.65 : 0.53));
        const nameX = x + (options.valueIcon ? 0 : icon) + (options.pill ? 6 : 0);
        const a = marketLabel(parent, label, nameX, cursor + 2,
          x + aWidth - nameX - (value == null && options.onClick ? 20 : 0), options.marketRate,
          { size, weight: '750' });
        const amountSize = (metric || comparison ? 20 : compactRow ? 17 : 15) * scale();
        const sameLine = !options.stack && value != null && scale() <= 1.45 && valueStr.length * amountSize * 0.55 <= width - aWidth;
        let b;
        const valueLeft = sameLine ? x + aWidth : x;
        const valueTop = sameLine ? cursor : cursor + a.height + 2;
        const valueWidth = Math.max(1, (sameLine ? width - aWidth : width) -
          (options.valueIcon ? icon : 0) - (options.onClick ? 20 : 0));
        if (value != null) b = transition
          ? transitionNode(parent, transition.from, transition.to, valueLeft, valueTop, valueWidth,
            { size: amountSize, color: valueColor,
              arrowColor: comparison ? 0xce8918 : options.tone === 'danger' ? palette.red : palette.ink })
          : marketLabel(parent, valueStr, valueLeft, valueTop, valueWidth, options.valueMarketRate,
            { size: amountSize, align: 'right', weight: '800', color: valueColor });
        if (icon && options.valueIcon) drawImage(parent, options.icon, x + width - icon - (options.onClick ? 20 : 0),
          b?.y ?? cursor, icon - 3, icon - 3);
        if (options.onClick) {
          const markerY = b ? b.y + (b.height - 16) / 2 : cursor + 3;
          directionIcon(parent, 'right', x + width - 17, markerY, 16, 16);
        }
        const height = Math.max(minimumHeight, options.onClick ? 48 : 0,
          (b ? b.y + b.height : start) - start + 2, a.height + 4, icon);
        if (background) paintPanel(background, x, start, width, height, palette.pale, null, 9);
        if (options.divider ?? (metric || comparison)) parent.addChild(
          inkGraphics().rect(x, start + height, width, 1).fill({ color: palette.line, alpha: 0.7 }));
        if (options.onClick && !waiting) {
          const hit = inkGraphics();
          parent.addChild(hit);
          hitAt(hit, parent, x, start, width, height, options.onClick);
        }
        cursor += height + (compactRow ? 3 : rowGap);
      },
      detailRows(entries, { variant = 'label' } = {}) {
        const draw = (group) => entries.forEach(({ label, value, icon, tone, marketRate, onClick, noWrap }, index) => {
          group.row(label, value, {
            icon, tone, marketRate, compact: true, divider: variant === 'label' && index < entries.length - 1, onClick, noWrap,
            valueIcon: variant === 'label' && value != null, pill: variant === 'pill' && scale() <= 1.2,
          });
        });
        if (variant === 'recipe') {
          for (const entry of entries) ui.card((group) => group.row(entry.label, entry.value,
            { icon: entry.icon, compact: true, onClick: entry.onClick }), { padding: 6, gap: 4 });
        } else if (variant === 'label') ui.card(draw, { padding: 7, gap: 6, style: 'subtle' });
        else draw(ui);
      },
      button(label, fn, options = {}) {
        if (dialogContent && (label === '关闭' || label === '返回')) return;
        const h = Math.max(48, Math.ceil(27 * scale()));
        const large = options.style === 'primary' || options.style === 'production';
        const buttonWidth = Math.min(width, options.maxWidth ?? (options.style === 'primary' ? width * 0.86 : width));
        buttonAt(parent, x + (width - buttonWidth) / 2, cursor, buttonWidth, h, label, fn,
          { emphasis: large, ...options });
        cursor += h + rowGap;
      },
      iconButton(icon, label, fn, { align = 'right', ...options } = {}) {
        const height = Math.max(44, Math.ceil(26 * scale()));
        const left = align === 'left' ? x : align === 'center' ? x + (width - height) / 2 : x + width - height;
        buttonAt(parent, left, cursor, height, height, label, fn, { ...options, iconOnly: icon });
        cursor += height + rowGap;
      },
      buttons(list, { style, size, compact = false } = {}) {
        if (dialogContent) list = list.filter((item) => item.label !== '关闭' &&
          !(list.length === 1 && item.label === '返回'));
        if (!list.length) return;
        const segmented = style === 'segmented' || style === 'framed';
        const filter = style === 'filter';
        const gap = segmented || compact ? 2 : 6;
        const count = compact ? Math.max(1, Math.floor((width + gap) / (36 + gap))) :
          width >= 240 && scale() <= 1.6 ? 4 :
          ((width >= 180 && segmented) || (width >= 225 && style === 'production')) && scale() <= 1.6 ? 3 : 2;
        const rowCount = Math.ceil(list.length / count);
        const perLine = compact ? Math.ceil(list.length / rowCount) : Math.min(count, list.length);
        const height = Math.max(size === 'large' ? 53 : filter ? (compact ? 44 : 43) : 48, Math.ceil(26 * scale()));
        for (let i = 0; i < list.length; i += perLine) {
          const part = list.slice(i, i + perLine);
          const buttonWidth = (width - (part.length - 1) * gap) / part.length;
          if (segmented) {
            panel(parent, x, cursor + 1, width, height, 0xe9d7b9, null, height / 2);
            panel(parent, x, cursor, width, height, palette.pale, palette.border, height / 2);
          }
          part.forEach((item, pos) => buttonAt(parent, x + pos * (buttonWidth + gap), cursor,
            buttonWidth, height, item.label, item.onClick, {
              emphasis: segmented || style === 'production', segment: segmented, compactLabel: compact, ...item,
            }));
          cursor += height + rowGap;
        }
      },
      footer(draw) {
        const layer = parent.addChild(new Container());
        const child = layoutUI(layer, x, cursor, width, local, availableHeight);
        draw(child);
        trailingButtons.push({ layer, top: cursor, bottom: child.bottom });
        cursor = child.bottom;
      },
      tabs(values, selected, onSelect, { keepScroll = false, sticky = false, style, size, compact, indicatorTabs } = {}) {
        const choices = values.map((label) => ({
          label, onClick: () => { onSelect(label); if (!keepScroll && local.scroll) resetScroll(); },
          tone: label === selected ? 'green' : 'plain',
          indicator: indicatorTabs?.has(label),
        }));
        const buttonOptions = { style, size, compact };
        if (sticky && pinTabs) cursor += pinTabs(cursor, choices, buttonOptions);
        else ui.buttons(choices, buttonOptions);
      },
      badges(entries, { style } = {}) {
        const gap = 6;
        let left = x;
        let height = 0;
        for (const { label, from, to, tone, minCharacters = 0 } of entries) {
          const size = (style === 'production' ? 15 : 13) * scale();
          const transition = from != null && to != null;
          const summary = transition ? number(from) + ' 至 ' + number(to) : label;
          const w = Math.min(width, Math.ceil(Math.max(minCharacters, Array.from(String(summary)).length) * size) + 16);
          if (left + w > x + width) { cursor += height + gap; left = x; height = 0; }
          const color = tone === 'blocked' ? 0xffffff : tone === 'danger' ? palette.red :
            tone === 'green' ? palette.cream : palette.ink;
          const caption = transition
            ? transitionNode(parent, from, to, left + 5, cursor + 3, w - 10, { size, color, align: 'center' })
            : textNode(parent, label, left + 5, cursor + 3, w - 10, { size, color, align: 'center' });
          const h = caption.height + 6;
          const bg = panel(parent, left, cursor, w, h,
            tone === 'blocked' ? palette.red : tone === 'gold' ? palette.gold :
              tone === 'green' ? palette.green : palette.pale, null, 9);
          parent.setChildIndex(bg, parent.getChildIndex(caption));
          height = Math.max(height, h);
          left += w + gap;
        }
        if (height) cursor += height + rowGap;
      },
      image(id, size = 56, { maxHeight = 162, center = false } = {}) {
        const hero = heroKeys.has(id);
        const bleed = hero ? fullBleed : 0;
        const h = hero ? Math.max(id === 'research' ? 54 : 66, Math.min(maxHeight, size)) : size;
        const span = hero ? width + bleed * 2 : Math.min(width, size);
        const left = center && !hero ? x + Math.round((width - span) / 2) : x - bleed;
        drawImage(parent, id, left, cursor, span, h, hero);
        cursor += h + rowGap;
      },
      managerExpression(role, gender) {
        const owner = local.managerFocus === '管理员资料' ? locals[current] : local;
        const speech = managerConversations.get(owner.managerSpeechKeys?.[role]);
        return speech?.gender === gender ? speech.line?.expression ?? 'smile' : 'smile';
      },
      managerReply(role, gender, greeting, { always = false } = {}) {
        if (!always && local.managerReplyRole !== role) return;
        const speech = conversationFor(local, role, gender, greeting);
        if (!always && !speech.line) return;
        const top = cursor;
        const height = width < 285 ? 52 : 46;
        // A directory profile leaves its source card's reply in the uncovered strip.
        if (modal?.managerFocus === '管理员资料' && modal.managerRole === role && modal.managerInCard) {
          local.scroll = Math.max(0, top - 5);
        }
        cursor += height + rowGap;
        managerSpeech = speech;
        const caption = parent.addChild(new Container({ label: 'manager-dialogue' }));
        parent.addChildAt(managerBubblePath(inkGraphics(), x + 5, top, width - 5, height)
          .fill(palette.card).stroke({ color: palette.border, width: 1.1 }), parent.children.length - 1);
        let reveal;
        let visible = true;
        const startLine = () => {
          if (!always && !speech.line) {
            delete local.managerReplyRole;
            requestRender();
            return;
          }
          reveal = managerCaption(caption, speech.line, x + 14, top + 5, width - 24, height - 10, 14);
          reveal(speech.shown);
          requestRender();
        };
        managerSpeechMount = {
          visible: () => visible && (local.routeKey ? modal === local :
            !modal || modal.managerFocus === '管理员资料' && modal.managerRole === role && modal.managerInCard),
          startLine,
          reveal: () => { if (reveal(speech.shown)) markDirty(); },
        };
        reveal = managerCaption(caption, speech.line, x + 14, top + 5, width - 24, height - 10, 14);
        reveal(speech.shown);
        options.observeScroll?.((scroll) => {
          visible = withinScrollViewport(top, top + height, scroll, options.viewport, x, x + width);
        });
      },
      managerBanner({ role, gender, greeting, background, message, messages = [], nextGreeting, receive, receiveIcon, actions }) {
        const speech = conversationFor(local, role, gender, greeting);
        managerCandidates.set(role + ':' + gender, { messages, nextGreeting });
        const selection = managerSelections.get(speech);
        if (selection && selection.candidates !== JSON.stringify(messages) &&
            !(current === '管理员管理' && local.managerReplyRole === role)) managerSelections.delete(speech);
        if (!(current === '管理员管理' && local.managerReplyRole === role)) {
          speech.offer(managerSelections.get(speech)?.line ?? message ?? managerDailyLines.get(speech));
        }
        const suppressed = current === '管理员管理' && Boolean(local.managerReplyRole);
        if (!suppressed) managerSpeech = speech;
        const height = Math.max(66, Math.min(205, Math.round(width * 0.45)));
        const bleed = fullBleed;
        const span = width + bleed * 2;
        const left = x - bleed;
        const right = left + span;
        const top = cursor;
        panel(parent, left, top, span, height, 0xd8e5c7, null, 0);
        drawImage(parent, background, left, top, span, height, true);
        const tight = span < 275;
        const gap = tight ? 3 : width < 350 ? 6 : 8;
        const actionWidth = tight ? Math.max(20, Math.min(48, Math.floor((span * 0.64 - 10 - 2 * gap) / 3))) : 48;
        const actionSpan = actionWidth * actions.length + gap * (actions.length - 1);
        const dialogueX = Math.max(left + 5, Math.min(left + Math.round(span * 0.39), right - actionSpan - 14));
        const dialogueWidth = right - dialogueX - 10;
        const buttonsTop = top + height - actionWidth - 6;
        const art = managerPortraits[role][gender];
        // Position the source's face at the center of the earlier 255px chest crop.
        const formerWidth = Math.min(dialogueX - left + 3, (height - 3) * 255 / art.height);
        const formerFace = (dialogueX + left) / 2;
        const portraitScale = formerWidth / 255;
        const portraitLeft = formerFace - art.faceX * portraitScale;
        const portrait = new Sprite({ texture: Texture.EMPTY, roundPixels: true, label: 'manager-portrait' });
        portrait.eventMode = 'none';
        portrait.visible = false;
        parent.addChild(portrait);
        let portraitVisible = false;
        let portraitUrl;
        let pendingPortrait;
        const showPortrait = () => {
          if (!portraitVisible) return;
          const expression = speech.line?.expression ?? 'smile';
          const url = path('./art/managers/portraits/' + role + '/' + gender + '-' + expression + '.webp?game=1&v=2');
          portraitUrl = url;
          touchImage(url, 'scene');
          const mount = (texture) => {
            if (!texture || texture.destroyed || portrait.destroyed || portraitUrl !== url) return;
            portrait.texture = texture;
            portrait.position.set(portraitLeft, top + height - texture.height * portraitScale);
            portrait.scale.set(portraitScale);
            portrait.visible = portraitVisible;
            markDirty();
          };
          const cached = textures.get(url);
          if (cached && !cached.destroyed) {
            if (portrait.texture !== cached) mount(cached);
            return;
          }
          if (pendingPortrait === url || failedImages.has(url)) return;
          pendingPortrait = url;
          loadImage(url).then(mount).finally(() => {
            if (pendingPortrait === url) pendingPortrait = undefined;
          });
        };
        const bubbleY = top + (tight ? 4 : 8);
        const bubbleHeight = Math.max(18, buttonsTop - bubbleY - (tight ? 3 : 6));
        const bubble = parent.addChild(managerBubblePath(inkGraphics(), dialogueX, bubbleY, dialogueWidth, bubbleHeight)
          .fill(receive && bubbleHeight < 49 ? palette.selection : palette.card)
          .stroke({ color: palette.border, width: 1.25 }));
        bubble.visible = !suppressed;
        const bubbleWidth = Math.max(1, dialogueWidth - 20);
        const claimHeight = receive ? Math.min(24, Math.max(12, bubbleHeight - 19)) : 0;
        const caption = parent.addChild(new Container({ label: 'manager-dialogue' }));
        caption.eventMode = 'none';
        caption.visible = !suppressed;
        let reveal;
        let bubbleVisible = false;
        const startLine = () => {
          reveal = managerCaption(caption, speech.line, dialogueX + 10, bubbleY + 3, bubbleWidth,
            bubbleHeight - claimHeight - 6, width < 350 ? 14 : 16);
          reveal(speech.shown);
          showPortrait();
          markDirty();
        };
        if (!suppressed) managerSpeechMount = {
          visible: () => bubbleVisible && (!modal || modal.managerFocus === '管理员资料' &&
            modal.managerRole === role && !modal.managerInCard),
          startLine,
          reveal: () => { if (reveal(speech.shown)) markDirty(); },
        };
        startLine();
        const observe = (scroll) => {
          const viewport = options.viewport ?? { height: availableHeight };
          portraitVisible = withinScrollViewport(top, top + height, scroll, viewport, left, right);
          portrait.visible = portraitVisible && portrait.texture !== Texture.EMPTY && !portrait.texture.destroyed;
          const pinned = viewport.pinned;
          const pinnedY = pinned ? Math.max(scroll, pinned.top) : Infinity;
          const covered = pinned && dialogueX < pinned.right && dialogueX + dialogueWidth > pinned.left &&
            bubbleY < pinnedY + pinned.height && bubbleY + bubbleHeight > pinnedY;
          bubbleVisible = !suppressed && !covered && bubbleY >= scroll && bubbleY + bubbleHeight <= scroll + viewport.height;
          if (!bubbleVisible) speech.pause();
          showPortrait();
        };
        if (options.observeScroll) options.observeScroll(observe);
        else observe(0);
        if (claimHeight && !suppressed) {
          const claimTop = bubbleY + bubbleHeight - claimHeight - 3;
          panel(parent, dialogueX + 6, claimTop, dialogueWidth - 12, claimHeight - 2,
            palette.selection, palette.green, 6);
          const claimLabel = textNode(parent, '收回礼', dialogueX + 22, claimTop + 1, dialogueWidth - 35, {
            size: Math.min(13, claimHeight - 4), weight: '800', color: palette.green, align: 'center',
          });
          const iconSize = Math.min(18, claimHeight - 4);
          drawImage(parent, receiveIcon, Math.max(dialogueX + 10, claimLabel.x - iconSize - 2), claimTop + 2, iconSize, iconSize);
        }
        if (receive) {
          const hit = inkGraphics();
          parent.addChild(hit);
          hit.label = '收回礼';
          if (!waiting) {
            if (controls.length === focusIndex) managerBubblePath(hit, dialogueX, bubbleY, dialogueWidth, bubbleHeight)
              .stroke({ color: palette.green, width: 2 });
            hitAt(hit, parent, dialogueX, bubbleY, dialogueWidth, bubbleHeight, receive);
          }
        }
        if (!waiting) {
          const portraitHit = parent.addChild(inkGraphics());
          portraitHit.label = '换管理员对白';
          hitAt(portraitHit, parent, left, top, Math.max(1, dialogueX - left - 4), height,
            () => advanceManagerSpeech(role, gender, { messages, nextGreeting }));
        }
        const actionLeft = dialogueX + (dialogueWidth - actionSpan) / 2;
        actions.forEach(({ label, icon, onClick }, index) => {
          buttonAt(parent, actionLeft + index * (actionWidth + gap), buttonsTop, actionWidth, actionWidth,
            label, onClick, { iconOnly: icon, managerFocus: true, touchSize: tight ? actionWidth : 48 });
        });
        cursor += height + rowGap;
      },
      item(id, title, description, { marketRate } = {}) {
        const icon = hasIcon(id) ? 60 : 0;
        if (icon) drawImage(parent, id, x, cursor, 52, 52);
        const label = marketLabel(parent, title ?? data.items[id]?.name ?? '', x + icon, cursor,
          width - icon, marketRate, { size: 18 * scale(), weight: '800' });
        const extra = description == null ? 0 : textNode(parent, description, x + icon, cursor + label.height + 2,
          width - icon, { size: 13 * scale(), color: palette.muted }).height + 2;
        cursor += Math.max(icon ? 52 : 0, label.height + extra) + rowGap;
      },
      feature(id, draw, { ratio = 0.31, onClick, style, surface, align, artAspect, cover,
        plotAnimation, livestockAnimation, fishAnimation, miningAnimation, workshopAnimation, animationOnly = false } = {}) {
        const top = cursor;
        const workshop = Boolean(workshopAnimation?.id);
        const strip = workshop ? options.workshopStrip : undefined;
        const scene = workshop || Boolean(miningAnimation) || sceneKeys.has(id);
        const stacked = workshop || width < 210 || scale() > 1.6;
        const artWidth = workshop ? strip?.width ?? width
          : stacked ? Math.min(width, 135) : Math.floor(width * clamp(ratio, 0.16, 0.48));
        const artHeight = workshop ? artWidth / workshopVisuals.stage.width * workshopVisuals.stage.height
          : Math.round(artWidth * (artAspect ?? (style === 'facility' || style === 'workshop' ? 1.08 : 1)));
        const artX = strip?.x ?? (stacked ? x + (width - artWidth) / 2 : x);
        const artTop = strip?.top ?? top;
        const drawX = stacked ? x : x + artWidth + 16;
        const drawY = stacked ? artTop + artHeight + 8 : top;
        const copy = new Container();
        parent.addChild(copy);
        const child = layoutUI(copy, drawX, drawY, width - (drawX - x), local, availableHeight,
          0, undefined, { headingClearance: options.headingClearance, observeScroll: options.observeScroll, viewport: options.viewport });
        draw(child);
        const copyHeight = child.bottom - top - rowGap;
        const height = Math.max(artTop + artHeight - top, copyHeight);
        if (!stacked && (align === 'center' || style === 'upgrade')) copy.y = (height - copyHeight) / 2;
        const artY = stacked ? artTop : top + (height - artHeight) / 2;
        if (surface !== 'none' && !scene) panel(parent, artX, artY, artWidth, artHeight,
          surface === 'water' ? 0xc0ddd9 : palette.pale, null, 8);
        if (onClick && !waiting) {
          const hit = inkGraphics();
          parent.addChild(hit);
          hitAt(hit, parent, artX, artY, artWidth, artHeight, onClick);
        }
        const inset = scene ? 0 : 2;
        const crop = cover || scene || heroKeys.has(id);
        const imageWidth = artWidth - inset * 2;
        const imageHeight = artHeight - inset * 2;
        const animation = workshop ? workshopAnimation : miningAnimation ?? fishAnimation ?? livestockAnimation ?? plotAnimation;
        // Animation cards never request fallback images, even before mounting is possible.
        if (animation && options.registerPlot) {
          const art = new Container();
          art.eventMode = 'none';
          art.position.set(artX + inset, artY + inset);
          parent.addChild(art);
          if (strip) {
            const { radius } = strip;
            // The scene's rectangular mask clips the lower edge before the rounded corners below it.
            const mask = inkGraphics().roundRect(0, 0, imageWidth, imageHeight + radius, radius).fill(0xffffff);
            mask.position.copyFrom(art.position);
            parent.addChild(mask);
            art.mask = mask;
          }
          options.registerPlot({ art, box: new Rectangle(0, 0, imageWidth, imageHeight),
            type: workshop ? 'workshop' : miningAnimation ? 'mining' : fishAnimation ? 'fish' : livestockAnimation ? 'livestock' : 'crop', ...animation });
        } else if (!animationOnly && !animation) {
          drawImage(parent, id, artX + inset, artY + inset, imageWidth, imageHeight, crop);
        }
        if (!stacked) parent.addChild(inkGraphics().rect(x + artWidth + 7, top, 1, height)
          .fill(palette.line));
        cursor = top + height + rowGap;
      },
      stats(entries, { columns = entries.length, style } = {}) {
        const count = width < (style === 'workshop' ? 143 : 185) || scale() > 1.5 ? 1 : Math.max(1, columns);
        const gap = 5;
        const cellWidth = (width - gap * (count - 1)) / count;
        for (let index = 0; index < entries.length; index += count) {
          const top = cursor;
          let height = 0;
          const cells = [];
          entries.slice(index, index + count).forEach(({ label, value, icon, tone }, column) => {
            const layer = new Container();
            const left = x + column * (cellWidth + gap);
            parent.addChild(layer);
            const iconSize = hasIcon(icon) ? 20 : 0;
            if (iconSize) drawImage(layer, icon, left + 5, top + 3, iconSize, iconSize);
            const a = textNode(layer, label, left + 4 + iconSize, top + 4, cellWidth - 8 - iconSize,
              { size: (style === 'workshop' ? 14 : 13) * scale(), align: 'center', color: palette.ink });
            const valueColor = tone === 'danger' ? palette.red : tone === 'green' ? palette.green : palette.ink;
            const b = textNode(layer, value, left + 4, a.y + a.height, cellWidth - 8,
              { size: (style === 'workshop' ? 22 : 17) * scale(), align: 'center', weight: '800', color: valueColor });
            height = Math.max(height, b.y + b.height - top + 5);
            cells.push({ layer, left });
          });
          for (const { layer, left } of cells) {
            const bg = panel(layer, left, top, cellWidth, height, style === 'workshop' ? palette.card : palette.pale,
              style === 'workshop' ? palette.line : null, 6);
            layer.setChildIndex(bg, 0);
          }
          cursor += height + rowGap;
        }
      },
      balance(label, value, { variant, accent, inline = false, icon, inspectable = true } = {}) {
        const top = cursor;
        const research = variant === 'quality' || variant === 'efficiency';
        if (research) {
          const pad = Math.min(9, Math.max(3, (width - 288) / 2));
          const accessible = inspectable && scale() > 1.5 && width >= 236;
          const iconSize = icon && hasIcon(icon) ? 26 : 0;
          const marker = variant === 'efficiency' ? 14 : 0;
          const titleInset = iconSize ? iconSize + 4 : marker;
          const left = x + pad + titleInset;
          const title = textNode(parent, label, left, top + 6,
            width - pad * 2 - titleInset - (accessible ? 112 : 0),
            { size: Math.min(34, 27 * scale()), weight: '800' });
          const titleHeight = Math.max(accessible ? 49 : 38, title.height + 12);
          const line = top + titleHeight;
          if (iconSize) drawImage(parent, icon, x + pad, top + (titleHeight - iconSize) / 2, iconSize, iconSize);
          else if (marker) parent.addChild(inkGraphics().roundRect(x + pad + 2, top + 10, 5, 25, 2).fill(palette.green));
          parent.addChild(inkGraphics().rect(x + pad, line, width - pad * 2, 1)
            .fill(palette.line));
          const amount = compactLabel(parent, value, x + pad, line + 2, width - pad * 2,
            { size: Math.min(63, 40 * scale()), align: 'right', weight: '800' });
          const height = amount.y + amount.height - top + 5;
          const panelBg = panel(parent, x, top, width, height, palette.card, palette.border, 9);
          parent.setChildIndex(panelBg, parent.getChildIndex(title));
          if (accessible) buttonAt(parent, x + width - 111, top + 2, 105, 46, '查看完整数值',
            () => showExactNumber(label, value));
          else if (inspectable && !waiting) hitAt(panelBg, parent, x, top, width, height,
            () => showExactNumber(label, value));
          cursor += height + rowGap + 3;
          return;
        }
        if (inline) {
          const t = textNode(parent, label + '  ' + number(value), x + 6, top + 10, width - 12,
            { size: 27 * scale(), weight: '800', align: 'center' });
          const h = t.height + 20;
          const bg = panel(parent, x, top, width, h, palette.card, palette.border, 9);
          parent.setChildIndex(bg, parent.getChildIndex(t));
          cursor += h + rowGap;
          return;
        }
        const exact = typeof value === 'bigint';
        const canInspect = exact && inspectable;
        const horizontal = exact ? 2 : 9;
        const size = Math.min(31, (variant ? 22 : 15) * scale());
        const detail = canInspect && width >= 236 && (!variant || scale() > 1.5);
        const center = !exact || (variant === 'centered' && !detail);
        const a = textNode(parent, label, x + horizontal, top + 6, width - (detail ? 116 : horizontal * 2),
          { size, align: center ? 'center' : 'left', weight: '800' });
        const labelHeight = detail ? Math.max(52, a.height + 6) : a.height + 6;
        if (detail) {
          buttonAt(parent, x + width - 110, top + 2, 108, 48, '查看完整数值', () => showExactNumber(label, value));
        }
        const options = { size: (variant === 'centered' ? 49 : variant === 'research' ? 37 : 28) * scale(),
          align: center ? 'center' : 'right', weight: '800' };
        const b = (exact ? compactLabel : textNode)(parent, value, x + horizontal, top + labelHeight + 2,
          width - horizontal * 2, options);
        const height = b.y + b.height - top + 6;
        if (center) b.x = x + (width - b.width) / 2;
        const bg = panel(parent, x, top, width, height, accent ? palette.pale : palette.card,
          variant ? palette.border : null, 9);
        parent.setChildIndex(bg, parent.getChildIndex(a));
        if (canInspect && !detail && !waiting) hitAt(bg, parent, x, top, width, height,
          () => showExactNumber(label, value));
        cursor += height + rowGap;
      },
      fullNumber(value) {
        const digits = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ', ');
        const t = textNode(parent, digits, x, cursor, width,
          { size: 17 * scale(), weight: '750' });
        cursor += t.height + rowGap;
      },
      countdown(label, source, { format, inactiveText = '暂停', inactiveTone = 'plain', ...options } = {}) {
        const target = { ...source };
        const readValue = (clock) => {
          const batch = currentBatch(target);
          if (!batch) return inactiveText;
          const remaining = batch.end - clock;
          return format ? format(remaining) : Math.max(0, Math.ceil(remaining / 1000)) + ' 秒';
        };
        ui.row(label, undefined, {
          ...options, noWrap: true, valueAtClock: readValue,
          toneAtClock: () => currentBatch(target) ? options.tone ?? 'plain' : inactiveTone,
        });
      },
      researchProgress() {
        ui.row('距下次发放', undefined, {
          compact: true, noWrap: true, icon: 'clock',
          valueAtClock: (clock) => {
            const elapsed = world.basicResearchElapsedMs + Math.floor(Math.max(0, clock - world.clockMs));
            const seconds = Math.ceil((researchHourMs - elapsed % researchHourMs) / 1000);
            return Math.floor(seconds / 60) + ' 分 ' + seconds % 60 + ' 秒';
          },
        });
      },
      goalProgress(fraction, { complete = false } = {}) {
        const height = 8;
        // An unfinished goal keeps a visible gap even when its progress rounds to 100%.
        const filled = complete ? width : clamp(Math.round(width * fraction), 0, Math.max(0, width - 5));
        panel(parent, x, cursor, width, height, palette.line, null, height / 2);
        if (filled > 0) panel(parent, x, cursor, filled, height, complete ? palette.green : palette.gold, null, height / 2);
        cursor += height + rowGap;
      },
      batchProgress(batch, source) {
        const top = cursor;
        const track = panel(parent, x, top, width, 8, palette.line, null, 4);
        track.label = 'batch-progress-track';
        cursor += 8 + rowGap;
        if (!source && (!batch || batch.end <= batch.start)) return;
        const target = source ? { ...source } : undefined;
        const epoch = navigationEpoch;
        const row = listRow?.layer;
        const fill = inkGraphics();
        fill.label = 'batch-progress-fill';
        parent.addChild(fill);
        let previous = -1;
        const update = (clock) => {
          if (fill.destroyed || epoch !== navigationEpoch) return false;
          if (row && !row.visible) return true;
          const active = currentBatch(target, batch);
          const raw = active && active.end > active.start
            ? width * clamp((clock - active.start) / (active.end - active.start), 0, 1) : 0;
          // Redraw only when the fill moves by a whole device pixel.
          const pixel = 1 / ((layout?.scale || 1) * (app.renderer.resolution || 1));
          const filled = raw >= width ? width : Math.min(width, Math.round(raw / pixel) * pixel);
          if (filled !== previous) {
            markDirty();
            fill.clear();
            if (filled > 0) fill.roundRect(x, top, filled, 8, Math.min(filled / 2, 4)).fill(palette.leaf);
            previous = filled;
          }
          return true;
        };
        if (update(progressClock(performance.now()))) progressBars.add(update);
      },
      materialTable(rows, { style, title } = {}) {
        if (!rows.length) return;
        if (title) ui.heading(title, { size: 21 });
        if (width < 195 || scale() > 1.5) {
          for (const { id, label, owned, needed, marketRate, onClick } of rows) {
            ui.row(label ?? data.items[id]?.name ?? '', number(owned) + ' / ' + number(needed), {
              icon: id, marketRate, tone: owned < needed ? 'danger' : 'plain',
            });
            if (onClick) ui.button('查看来源', onClick);
          }
          return;
        }
        const featured = ['workshop', 'research', 'balance'].includes(style);
        const nameWidth = Math.floor(width * (featured ? 0.52 : 0.44));
        const amountWidth = (width - nameWidth) / 2;
        const top = cursor;
        const at = parent.children.length;
        const line = inkGraphics();
        const headings = [featured ? '' : '材料', '持有', '所需'];
        headings.forEach((label, index) => {
          const left = index === 0 ? x + 5 : x + nameWidth + (index - 1) * amountWidth;
          const w = index === 0 ? nameWidth - 5 : amountWidth - 6;
          textNode(parent, label, left, top + 3, w, { size: 13 * scale(), align: index === 0 ? 'left' : 'right', color: palette.muted });
        });
        const headerHeight = Math.ceil((featured ? 29 : 23) * scale());
        cursor += headerHeight;
        for (const { id, label, owned, needed, marketRate, onClick } of rows) {
          line.moveTo(x, cursor).lineTo(x + width, cursor);
          const icon = hasIcon(id) ? (featured ? 38 : 27) : 0;
          if (icon) drawImage(parent, id, x + 3, cursor + 5, icon - 4, icon - 4);
          const a = marketLabel(parent, label ?? data.items[id]?.name ?? '', x + icon + 4, cursor + 4,
            nameWidth - icon - 7, marketRate, { size: (featured ? 17 : 14) * scale(), weight: '750' });
          const b = textNode(parent, owned, x + nameWidth, cursor + 4, amountWidth - 6,
            { size: (featured ? 18 : 14) * scale(), align: 'right', color: owned < needed ? palette.red : palette.ink, weight: '800' });
          const c = textNode(parent, needed, x + nameWidth + amountWidth, cursor + 4, amountWidth - 6,
            { size: (featured ? 18 : 14) * scale(), align: 'right', weight: '800' });
          const height = Math.max(onClick || featured ? 45 : 34, a.height + 8, b.height + 8, c.height + 8);
          a.y = cursor + (height - a.height) / 2;
          b.y = cursor + (height - b.height) / 2;
          c.y = cursor + (height - c.height) / 2;
          if (onClick && !waiting) {
            const hit = inkGraphics();
            parent.addChild(hit);
            hitAt(hit, parent, x, cursor, width, height, onClick);
          }
          cursor += height;
        }
        const border = panel(parent, x, top, width, cursor - top, palette.card, palette.line, 6);
        parent.setChildIndex(border, at);
        const header = panel(parent, x + 1, top + 1, width - 2, headerHeight - 1, palette.pale, null, 5);
        parent.setChildIndex(header, at + 1);
        parent.addChild(line.stroke({ color: palette.line, width: 1 }));
        cursor += rowGap;
      },
      tile(id, label, onClick, { description } = {}) {
        const top = cursor;
        const size = Math.min(width - 20, 138);
        const artX = x + (width - size) / 2;
        const title = textNode(parent, label, x + 8, top + size + 13, width - 16,
          { size: 18 * scale(), align: 'center', weight: '800' });
        const extra = description ? textNode(parent, description, x + 8, title.y + title.height + 3,
          width - 16, { size: 12 * scale(), align: 'center', color: palette.muted }).height + 3 : 0;
        const height = title.y + title.height + extra - top + 10;
        const surface = (rowHeight) => {
          const bg = panel(parent, x, top, width, rowHeight, palette.card,
            onClick && controls.length === focusIndex ? palette.green : palette.border, 13);
          bg.label = 'catalog-tile';
          parent.setChildIndex(bg, parent.getChildIndex(title));
          if (onClick && !waiting) hitAt(bg, parent, x, top, width, rowHeight, onClick);
        };
        if (options.rowSurfaces) options.rowSurfaces.push({ height, surface });
        else surface(height);
        drawImage(parent, id, artX, top + 8, size, size);
        cursor += height + rowGap;
      },
      card(draw, { padding = 10, gap = 9, style, onClick, cornerAction, footer, bleedWorkshopArt = false, indicator = false } = {}) {
        const top = cursor;
        const layer = new Container();
        parent.addChild(layer);
        const radius = style === 'subtle' ? 10 : 15;
        const cornerSize = 30;
        const cornerX = x + width - padding - cornerSize;
        const cornerY = top + Math.max(1, padding - 3);
        const contentWidth = width - padding * 2 - (onClick ? 24 : 0);
        const child = layoutUI(layer, x + padding, top + padding, contentWidth, local, availableHeight, 0, undefined,
          { registerPlot: options.registerPlot, observeScroll: options.observeScroll, viewport: options.viewport, headingClearance: cornerAction
            ? { right: cornerX - 6, bottom: cornerY + cornerSize } : undefined,
          workshopStrip: bleedWorkshopArt ? { x, top, width, radius } : undefined });
        draw(child);
        let bottom = child.bottom;
        let footerLayer;
        if (footer) {
          footerLayer = layer.addChild(new Container());
          footerLayer.label = 'scroll-list-card-footer';
          const actions = layoutUI(footerLayer, x + padding, bottom, contentWidth, local, availableHeight);
          footer(actions);
          bottom = actions.bottom;
        }
        const height = bottom - top + Math.max(2, padding - 5);
        const focused = onClick && controls.length === focusIndex;
        const outline = focused ? palette.green : style === 'subtle' ? palette.line : palette.border;
        const shadow = layer.addChildAt(inkGraphics(), 0);
        const bg = layer.addChildAt(inkGraphics(), 1);
        const border = bleedWorkshopArt ? layer.addChild(inkGraphics()) : undefined;
        if (border) border.label = 'workshop-card-outline';
        const arrow = onClick ? directionIcon(layer, 'right',
          x + width - padding - 18, top + (height - 22) / 2, 18, 22, { color: palette.green }) : undefined;
        const control = onClick && !waiting ? hitAt(bg, layer, x, top, width, height, onClick) : undefined;
        const surface = (rowHeight) => {
          paintPanel(bg, x, top, width, rowHeight, palette.card, border ? null : outline, radius);
          paintPanel(shadow, x, top + 3, width, rowHeight, { color: 0x886643, alpha: 0.10 }, null, radius);
          border?.roundRect(x, top, width, rowHeight, radius).stroke({ color: outline, width: 1.1 });
          if (footerLayer) footerLayer.y = rowHeight - height;
          if (arrow) arrow.y = (rowHeight - height) / 2;
          if (control) {
            bg.hitArea.height = rowHeight;
            control.height = rowHeight;
          }
        };
        if (options.rowSurfaces) {
          bg.label = 'scroll-list-card';
          options.rowSurfaces.push({ height, surface });
        } else surface(height);
        if (cornerAction) {
          const hit = inkGraphics();
          hit.label = cornerAction.label;
          layer.addChild(hit);
          if (!waiting && controls.length === focusIndex) {
            hit.roundRect(cornerX, cornerY, cornerSize, cornerSize, 4)
              .stroke({ color: palette.green, width: 1.5 });
          }
          drawPixelIcon(layer, { kind: 'close', outline: cornerAction.outline }, cornerX + 5, cornerY + 5, 20, 20);
          if (!waiting) hitAt(hit, layer, cornerX, cornerY, cornerSize, cornerSize, (event) => {
              event?.stopPropagation();
              cornerAction.onClick?.();
            });
        }
        if (indicator) drawIndicator(layer, x + width - 6, top + 6);
        cursor += height + gap;
      },
      split(left, right, { ratio = 0.64, divider = false } = {}) {
        if (width < 265 || scale() > 1.45) {
          left(ui);
          right(ui);
        } else {
          const leftWidth = Math.round(width * ratio) - 4;
          const a = layoutUI(parent, x, cursor, leftWidth, local, availableHeight);
          const b = layoutUI(parent, x + leftWidth + 8, cursor, width - leftWidth - 8, local, availableHeight);
          left(a);
          right(b);
          cursor = Math.max(a.bottom, b.bottom);
        }
        if (divider) {
          parent.addChild(inkGraphics().rect(x, cursor, width, 1).fill(palette.line));
          cursor += 9;
        }
      },
      section(label, icon, draw) {
        const top = cursor;
        const layer = new Container();
        parent.addChild(layer);
        const heading = textNode(layer, label, x + 45, top + 6, width - 52, { size: 20 * scale(), weight: '800' });
        const tagHeight = Math.max(41, heading.height + 12);
        const child = layoutUI(layer, x + 12, top + tagHeight + 11, width - 24, local, availableHeight);
        draw(child);
        const border = panel(layer, x, top + 20, width, child.bottom - top - 13, palette.card, palette.border, 8);
        layer.setChildIndex(border, 0);
        const tag = panel(layer, x + 7, top, Math.min(width - 14, heading.width + 49), tagHeight, palette.gold, palette.border, 7);
        layer.setChildIndex(tag, 1);
        drawImage(layer, icon, x + 15, top + (tagHeight - 27) / 2, 27, 27);
        cursor = child.bottom + 17;
      },
      settingToggle(label, checked, onClick) {
        const top = cursor;
        const caption = textNode(parent, label, x + 4, top + 8, width - 78,
          { size: 15 * scale(), weight: '750' });
        const height = Math.max(48, caption.height + 15);
        const trackX = x + width - 59;
        const trackY = top + (height - 25) / 2;
        const hit = inkGraphics().roundRect(trackX, trackY, 55, 25, 12)
          .fill(checked ? palette.green : 0xa39579).stroke({ color: palette.border, width: 1 });
        hit.circle(trackX + (checked ? 42 : 13), trackY + 12.5, 9.5).fill(palette.cream);
        parent.addChild(hit);
        if (onClick && !waiting) hitAt(hit, parent, x, top, width, height, onClick);
        cursor += height + rowGap;
      },
      stepper(value, decrease, increase) {
        const top = cursor;
        const keyWidth = Math.min(62, Math.floor(width * 0.24));
        const height = Math.max(48, Math.ceil(35 * scale()));
        buttonAt(parent, x, top, keyWidth, height, '−', decrease, { tone: 'gold' });
        buttonAt(parent, x + width - keyWidth, top, keyWidth, height, '＋', increase, { tone: 'gold' });
        const middle = width - (keyWidth + 6) * 2;
        panel(parent, x + keyWidth + 6, top, middle, height, palette.card, palette.border, 6);
        const caption = textNode(parent, value, x + keyWidth + 6, top, middle,
          { size: Math.min(25 * scale(), middle / Math.max(3, String(value).length * 0.55)), align: 'center', weight: '800' });
        caption.y = top + (height - caption.height) / 2;
        cursor += height + rowGap;
      },
      scrollList(items, draw, { columns = 1, focusIndex = -1 } = {}) {
        const equalHeight = columns === 'auto';
        const count = equalHeight ? (width < 280 || scale() > 1.45 ? 1 : 2) : columns;
        const gap = 8;
        const cellWidth = (width - (count - 1) * gap) / count;
        const rows = [];
        const outerRow = listRow;
        for (let index = 0; index < items.length; index += count) {
          const top = cursor;
          const layer = new Container();
          parent.addChild(layer);
          const row = { layer, top, outerRow, observeIndicators: Boolean(options.observeScroll) };
          listRow = row;
          const rowSurfaces = equalHeight ? [] : undefined;
          let next = top;
          items.slice(index, index + count).forEach((entry, column) => {
            const cell = layoutUI(layer, x + column * (cellWidth + gap), top, cellWidth, local, availableHeight,
              0, undefined, { rowSurfaces, registerPlot: options.registerPlot, observeScroll: options.observeScroll, viewport: options.viewport });
            draw(cell, entry, index + column);
            next = Math.max(next, cell.bottom);
          });
          if (rowSurfaces?.length) {
            const height = Math.max(...rowSurfaces.map((entry) => entry.height));
            for (const entry of rowSurfaces) entry.surface(height);
          }
          row.bottom = next;
          rows.push(row);
          if (focusIndex >= index && focusIndex < index + count) {
            local.scroll = Math.max(0, top - (options.viewport?.pinned?.height ?? 0));
          }
          cursor = next;
        }
        listRow = outerRow;
        options.observeScroll?.((scroll) => {
          for (const row of rows) {
            const { layer, top, bottom, indicators } = row;
            layer.visible = withinScrollViewport(top, bottom, scroll, options.viewport, x, x + width);
            if (layer.visible && indicators) {
              row.indicators = undefined;
              for (const show of indicators) show();
            }
          }
        });
      },
      indexRows(items, onSelect) {
        const height = Math.max(48, Math.ceil(28 * 1.36 * scale() + 7));
        scrollChoices(items, onSelect, 1, height, (layer, { icon, label, status }, left, top, span) => {
          panel(layer, left, top, span, height, palette.card, palette.line, 9);
          if (icon) drawImage(layer, icon, left + 7, top + 6, 32, height - 12);
          const title = textNode(layer, label, left + 47, top + 4, span - 66,
            { size: 15 * scale(), weight: '800', wrap: false });
          if (title.width > span - 66) title.style.fontSize *= (span - 66) / title.width;
          textNode(layer, status, left + 47, top + height - 5 - Math.ceil(13 * scale() * 1.36), span - 66,
            { size: 13 * scale(), color: palette.muted });
          if (onSelect) directionIcon(layer, 'right', left + span - 20, top + (height - 18) / 2, 15, 18,
            { color: palette.green });
        });
      },
      choiceGrid(items, onSelect, { iconsOnly = false } = {}) {
        const font = Math.min(17, 13 * scale());
        const largeType = scale() > 1.55;
        const minimum = iconsOnly ? 48 : largeType ? 131 : 99;
        const limit = iconsOnly ? 8 : largeType ? 2 : 4;
        const columns = clamp(Math.floor((width + 7) / (minimum + 7)), 1, limit);
        const hasMarket = iconsOnly && items.some((item) => item.marketRate);
        const padding = 6;
        const iconSize = 32;
        const titleGap = 2;
        const detailGap = 3;
        const titleOptions = { size: font, align: 'center', weight: '800', trackViewport: false };
        const detailOptions = { size: Math.max(10, font - 2), align: 'center', color: palette.muted, wrap: false };
        const cellWidth = choiceCellWidth(columns);
        const titleWidth = Math.max(1, cellWidth - 10);
        const detailWidth = cellWidth - 8;
        let heights = 49 + (hasMarket ? 19 : 0);
        if (!iconsOnly) {
          const style = new TextStyle(textStyle(titleWidth, titleOptions));
          const unwrapped = new TextStyle(textStyle(titleWidth, { ...titleOptions, align: 'left', wrap: false }));
          const markSize = marketMarkSize(font);
          const markStyle = new TextStyle(textStyle(titleWidth, { size: markSize, weight: '800', wrap: false }));
          const detailStyle = new TextStyle(textStyle(detailWidth, detailOptions));
          heights = [];
          for (const [index, { label, marketRate, duration, assignmentSummary }] of items.entries()) {
            const name = number(label);
            const title = CanvasTextMetrics.measureText(name, style);
            let titleHeight = title.height;
            if (marketRate) {
              const amount = CanvasTextMetrics.measureText(marketRateText(marketRate), markStyle);
              const mark = marketMarkLayout(titleWidth, markSize, amount);
              const plain = CanvasTextMetrics.measureText(name, unwrapped);
              titleHeight = marketLabelFits(titleWidth, name, plain.width, mark.width)
                ? Math.max(plain.height, mark.height)
                : title.height * Math.min(1, titleWidth / title.width) + 1 + mark.height;
            }
            const cycle = CanvasTextMetrics.measureText(number(duration), detailStyle);
            const assignmentHeight = assignmentSummary
              ? detailGap + CanvasTextMetrics.measureText(assignmentSummary, detailStyle).height : 0;
            const height = Math.ceil(padding * 2 + iconSize + titleGap + titleHeight + detailGap + cycle.height + assignmentHeight);
            const row = Math.floor(index / columns);
            heights[row] = Math.max(heights[row] ?? 0, height);
          }
        }
        scrollChoices(items, onSelect, columns, heights, (layer, item, left, top, span, height) => {
          const card = panel(layer, left, top, span, height,
            item.selected ? palette.selection : palette.card, item.selected ? palette.green : palette.line, 11);
          card.label = 'picker-choice:' + item.id;
          if (iconsOnly) {
            drawImage(layer, item.icon ?? item.id, left + (span - iconSize) / 2, top + 8, iconSize, iconSize, false, false);
            if (item.marketRate) {
              const mark = marketMark(layer, span - 8, item.marketRate, 12, false);
              mark.layer.position.set(left + (span - mark.width) / 2, top + 44);
            }
            return;
          }
          const content = new Container({ label: 'picker-content:' + item.id });
          content.eventMode = 'none';
          layer.addChild(content);
          drawImage(content, item.icon ?? item.id, (span - iconSize) / 2, 0, iconSize, iconSize, false, false);
          const title = marketLabel(content, item.label, 5, iconSize + titleGap, titleWidth, item.marketRate, titleOptions);
          const duration = textNode(content, item.duration, 4, title.y + title.height + detailGap, detailWidth, detailOptions);
          const last = item.assignmentSummary
            ? textNode(content, item.assignmentSummary, 4, duration.y + duration.height + detailGap, detailWidth, detailOptions)
            : duration;
          content.position.set(left, top + (height - last.y - last.height) / 2);
        });
      },
      selectionGrid(items, onSelect) {
        const columns = width >= 374 ? 3 : width >= 206 ? 2 : 1;
        const titleSize = 14 * scale();
        const titleHeight = Math.ceil(titleSize * 1.36) * 2 + 1;
        const detailSize = 12 * scale();
        const detailLines = items.some(({ detail }) => detail?.split('\n').length >= 3) ? 3 : 2;
        const height = 43 + titleHeight + Math.ceil(detailSize * 1.36) * detailLines + 7;
        scrollChoices(items, onSelect, columns, height, (layer, item, left, top, span) => {
          const card = panel(layer, left, top, span, height,
            item.selected ? palette.selection : palette.card, item.selected ? palette.green : palette.line, 9);
          card.label = 'selection-choice:' + item.id;
          drawImage(layer, item.icon ?? item.id, left + 8, top + 5, 32, 32, false, false);
          const checkX = left + span - 27;
          const checkY = top + 8;
          panel(layer, checkX, checkY, 18, 18, item.selected ? palette.green : palette.cream,
            item.selected ? palette.green : palette.border, 4);
          if (item.selected) layer.addChild(inkGraphics().moveTo(checkX + 4, checkY + 9)
            .lineTo(checkX + 8, checkY + 13).lineTo(checkX + 14, checkY + 5)
            .stroke({ color: palette.cream, width: 2, cap: 'round', join: 'round' }));
          const title = choiceTitle(layer, item, left + 8, top + 39, span - 16, titleHeight, titleSize);
          if (item.detail != null) {
            const detail = textNode(layer, item.detail, left + 8, title.y + title.height + 3, span - 16,
              { size: detailSize, color: palette.muted });
            const fit = Math.min(1, (span - 16) / detail.width, (top + height - 6 - detail.y) / detail.height);
            detail.scale.set(fit);
          }
        }, { toggle: true });
      },
      slider(value, onChange, { min = 0, max = 100, step = 1, label = '', bubble = false, onCommit, onCancel } = {}) {
        if (label) ui.row(label, value + '%');
        const top = cursor, usable = Math.max(1, width - 24);
        const fraction = clamp((value - min) / Math.max(1, max - min), 0, 1);
        const trackY = top + (bubble ? 32 : 20);
        const thumbX = x + 12 + usable * fraction;
        const g = inkGraphics().roundRect(x + 12, trackY, usable, 10, 5).fill(palette.pale);
        g.label = 'ratio-slider';
        if (fraction > 0) g.roundRect(x + 12, trackY, usable * fraction, 10, 5).fill(palette.gold);
        if (!bubble) g.circle(thumbX, trackY + 5, 11).fill(palette.gold).stroke({ color: palette.border, width: 2 });
        parent.addChild(g);
        if (bubble) {
          const labelX = clamp(thumbX - 27, x, x + width - 54);
          panel(parent, labelX, top, 54, 24, palette.gold, palette.line, 5);
          textNode(parent, value + '%', labelX, top + 2, 54, { size: 14, align: 'center', weight: '800' });
          drawImage(parent, 'coin', thumbX - 14, trackY - 9, 28, 28);
        }
        if (!waiting) {
          if (controls.length === focusIndex) parent.addChild(inkGraphics().roundRect(x, top, width, 50, 5)
            .stroke({ color: 0x168455, width: 2 }));
          const changeByKey = (next) => {
            if (next === value) return;
            onChange(next);
            onCommit?.(next);
          };
          const track = (event) => {
            if (event.pointerId !== track.pointerId) return;
            const localPoint = root.toLocal(event.global);
            const ratio = clamp((localPoint.x - track.startX) / usable, 0, 1);
            const next = clamp(min + Math.round((max - min) * ratio / step) * step, min, max);
            if (next !== track.current) { track.current = next; onChange(next); }
          };
          track.current = value;
          track.commit = () => onCommit?.(track.current);
          track.cancel = onCancel;
          g.eventMode = 'static';
          g.hitArea = new Rectangle(x, top, width, 50);
          g.cursor = 'pointer';
          g.on('pointerdown', (event) => {
            event.stopPropagation();
            if (sliderDrag || !event.isPrimary || event.button !== 0) return;
            track.pointerId = event.pointerId;
            point = root.toLocal(event.global);
            track.startX = root.toLocal(parent.toGlobal({ x: x + 12, y: top })).x;
            sliderDrag = track;
            track(event);
          });
          controls.push({ parent, x, y: top, width, height: 50, run() {
            changeByKey(value >= max ? min : Math.min(max, value + step));
          }, key(key) {
            if (key === 'ArrowLeft' || key === 'ArrowDown') changeByKey(Math.max(min, value - step));
            else if (key === 'ArrowRight' || key === 'ArrowUp') changeByKey(Math.min(max, value + step));
            else if (key === 'Home') changeByKey(min);
            else if (key === 'End') changeByKey(max);
            else return false;
            return true;
          } });
        }
        cursor += 50;
      },
      get bottom() { return cursor; },
      get footerBlocks() { return trailingButtons; },
    };
    if (options.captureFooter) {
      for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(ui))) {
        if (typeof descriptor.value !== 'function') continue;
        const draw = descriptor.value;
        ui[name] = (...args) => {
          const topLevel = methodDepth === 0;
          const footerButton = topLevel && (name === 'button' || name === 'buttons');
          if (topLevel && !footerButton) trailingButtons = [];
          const owner = parent;
          const layer = footerButton ? new Container() : undefined;
          const top = cursor;
          if (layer) { owner.addChild(layer); parent = layer; }
          methodDepth += 1;
          try { return draw(...args); }
          finally {
            methodDepth -= 1;
            if (layer) {
              parent = owner;
              if (cursor > top) trailingButtons.push({ layer, top, bottom: cursor });
            }
          }
        };
      }
    }
    return ui;
  }

  function observePlots(plots, { body, state, x, right, y, height, pinned }) {
    const tab = state.tab;
    const maskLeft = Math.max(0, x);
    const maskRight = Math.min(frame.width, right);
    const maskTop = Math.max(0, -y);
    const maskBottom = Math.min(height, frame.height - y);
    for (const plot of plots) {
      const start = body.toLocal({ x: 0, y: 0 }, plot.art);
      const end = body.toLocal({ x: plot.box.width, y: plot.box.height }, plot.art);
      plot.bounds = new Rectangle(start.x, start.y, end.x - start.x, end.y - start.y);
    }
    return (scroll = state.scroll) => {
      visiblePlotIds.clear();
      if (!world || status?.busy || (modal || pendingModal) && !openingScreen.blocking || document.hidden ||
          state !== locals[current] || state.tab !== tab) {
        for (const plot of activePlots) unmountPlot(plot);
        return;
      }
      // Once pinned, the tabs stay at the top of the scroll mask.
      const pinnedTop = pinned && Math.max(scroll, pinned.top);
      let animationFrame;
      for (const plot of plots) {
        const left = Math.max(plot.bounds.left, maskLeft);
        const right = Math.min(plot.bounds.right, maskRight);
        const top = Math.max(plot.bounds.top, scroll + maskTop);
        const bottom = Math.min(plot.bounds.bottom, scroll + maskBottom);
        const covered = pinned && left >= pinned.left && right <= pinned.right &&
          top >= pinnedTop && bottom <= pinnedTop + pinned.height;
        if (left >= right || top >= bottom || covered) {
          unmountPlot(plot);
          continue;
        }
        if (plot.type === 'mining') {
          const { batch, session, index } = plot;
          visiblePlotIds.add('mining:' + batch.id);
          const mineTextures = loadMiningTextures(batch.id);
          if (!mineTextures || plot.animation) continue;
          const retained = {
            key: 'mining:' + index + ':' + batch.id + ':' + (session?.startedAt ?? batch.start),
            textures: mineTextures,
            signature: { session: session ?? { startedAt: batch.start, durationMs: batch.end - batch.start },
              width: plot.box.width, height: plot.box.height },
          };
          const now = performance.now();
          const frame = { clock: progressClock(now), now };
          if (adoptAnimation(plot, retained)) {
            plot.animation.update(frame);
            continue;
          }
          plot.animation = mountMiningAnimation(animationHolder(plot), mineTextures, plot.box,
            miningVisuals, batch, session, () => world?.facilities.M?.[index]?.batch);
          plot.retained = retained;
          plot.animation.update(frame);
          activePlots.add(plot);
          markDirty();
          continue;
        }
        if (plot.type === 'workshop') {
          visiblePlotIds.add('workshop:' + plot.kind + ':' + plot.id);
          const stationTextures = loadWorkshopTextures(plot.id, plot.kind);
          if (!stationTextures || plot.animation) continue;
          if (!animationFrame) {
            const now = performance.now();
            animationFrame = { clock: progressClock(now), now };
          }
          const motionKey = plot.kind + ':' + plot.index;
          let motion = workshopMotionStates.get(motionKey);
          if (!motion || motion.id !== plot.id) {
            motion = { kind: plot.kind, index: plot.index, id: plot.id, clock: 0, started: false };
            workshopMotionStates.set(motionKey, motion);
          }
          const retained = {
            key: 'workshop:' + plot.kind + ':' + plot.index + ':' + plot.id,
            textures: stationTextures, motion,
            signature: { width: plot.box.width, height: plot.box.height },
          };
          if (adoptAnimation(plot, retained)) {
            plot.animation.update(animationFrame);
            continue;
          }
          // The station is read through the slot (kind/index), which the retention key fixes.
          plot.animation = mountWorkshopAnimation(animationHolder(plot), stationTextures, plot.box, plot,
            () => world?.stations[plot.kind]?.[plot.index], motion);
          plot.retained = retained;
          plot.animation.update(animationFrame);
          activePlots.add(plot);
          markDirty();
          continue;
        }
        const { batch, index } = plot;
        if (!batch) continue;
        visiblePlotIds.add(batch.id);
        const livestock = plot.type === 'livestock';
        const fish = plot.type === 'fish';
        const plotTextures = fish ? loadFishTextures(batch.id) : livestock ? loadLivestockTextures(batch.id) : loadPlotTextures(batch.id);
        if (!plotTextures) continue;
        if (plot.animation) continue;
        if (!animationFrame) {
          const now = performance.now();
          animationFrame = { clock: progressClock(now), now };
        }
        let animationStart = batch.start;
        if (!livestock && !fish && batch.end - batch.start < minPlotAnimationMs) {
          // Keep the same visual start when a fast crop finishes another real batch.
          const previous = shortPlotStarts.get(index);
          if (previous?.id === batch.id) animationStart = previous.start;
          else shortPlotStarts.set(index, { id: batch.id, start: animationStart });
        }
        const previousFish = fish ? fishBatches.get(index) : undefined;
        const previousAnimal = livestock ? livestockBatches.get('L:' + index) : undefined;
        if (fish) animationStart = previousFish?.animationStart ?? batch.start;
        else if (livestock) animationStart = previousAnimal?.animationStart ?? batch.start;
        const previousHarvestAt = livestock ? previousAnimal?.previousHarvestAt : undefined;
        const planting = !livestock && !fish ? world.facilities.C[index]?.planting : undefined;
        // Every mount input is part of the retention check; a parked animation is reused only
        // when it would be mounted with the same slot, batch, timeline, textures and box.
        const retained = {
          key: plot.type + ':' + index + ':' + batch.id + ':' + batch.start,
          textures: plotTextures,
          signature: {
            batch: { ...batch }, animationStart, previousHarvestAt, planting: planting ?? null,
            width: plot.box.width, height: plot.box.height,
          },
        };
        if (adoptAnimation(plot, retained)) {
          plot.animation.update(animationFrame);
          continue;
        }
        const holder = animationHolder(plot);
        if (fish) {
          plot.animation = mountFishAnimation(holder, plotTextures, plot.box, batch, animationStart);
        } else if (livestock) {
          plot.animation = mountLivestockAnimation(holder, plotTextures, plot.box, batch,
            animationStart, previousHarvestAt);
        } else plot.animation = mountPlotAnimation(holder, plotTextures, plot.box, batch, animationStart,
          planting);
        plot.retained = retained;
        plot.animation.update(animationFrame);
        activePlots.add(plot);
        markDirty();
      }
    };
  }

  function scrollArea(parent, x, y, width, height, state, draw, bleed = 0, { captureFooter = false } = {}) {
    const body = new Container();
    const mask = inkGraphics().rect(x - bleed, y, width + bleed * 2, height).fill(0xffffff);
    parent.addChild(body, mask);
    body.mask = mask;
    let pinned;
    const viewport = { height };
    const pinTabs = (top, choices, buttonOptions) => {
      const layer = new Container();
      parent.addChild(layer);
      layer.mask = mask;
      const group = layoutUI(layer, x + 2, 4, width - 4, state, height);
      group.buttons(choices, buttonOptions);
      const backdrop = panel(layer, x, 0, width, group.bottom, palette.paper, null, 0);
      layer.setChildIndex(backdrop, 0);
      pinned = { layer, top, left: x, right: x + width, height: group.bottom };
      viewport.pinned = pinned;
      return group.bottom;
    };
    const scrollObservers = [];
    const plots = [];
    const images = [];
    const ui = layoutUI(body, x + 2, 0, width - 4, state, height, bleed ? bleed + 2 : 0, pinTabs,
      {
        captureFooter, viewport,
        observeScroll: (observe) => scrollObservers.push(observe),
        registerPlot: state === locals[current] ? (plot) => plots.push(plot) : undefined,
      });
    const previousImages = scrollImages;
    scrollImages = images;
    try { draw(ui); }
    finally { scrollImages = previousImages; }
    const footerBlocks = ui.footerBlocks;
    const footerTop = footerBlocks[0]?.top;
    if (footerBlocks.length) {
      const footerHeight = ui.bottom - footerTop + 10;
      height = Math.max(1, height - footerHeight);
      viewport.height = height;
      mask.clear().rect(x - bleed, y, width + bleed * 2, height).fill(0xffffff);
      const footer = new Container();
      footer.label = captureFooter ? 'dialog-footer' : 'page-footer';
      footer.position.y = y + height + 6 - footerTop;
      panel(parent, x - bleed, y + height, width + bleed * 2, footerHeight, palette.card, null, 0);
      parent.addChild(footer);
      for (const block of footerBlocks) footer.addChild(block.layer);
    }
    const bodyImages = [];
    for (const image of images) {
      // Fixed dialog-footer and sticky controls were moved out of the scroll body.
      let ancestor = image.layer.parent;
      while (ancestor && ancestor !== body) ancestor = ancestor.parent;
      if (!ancestor) {
        image.mount();
        continue;
      }
      const { left, top, right, bottom } = image.bounds;
      image.start = body.toLocal({ x: left, y: top }, image.layer);
      image.end = body.toLocal({ x: right, y: bottom }, image.layer);
      bodyImages.push(image);
    }
    scrollObservers.push((scroll) => {
      for (const image of bodyImages) {
        const { layer, start, end, mount } = image;
        layer.visible = withinScrollViewport(start.y, end.y, scroll, viewport, start.x, end.x);
        if (layer.visible && mount) {
          image.mount = undefined;
          mount();
        }
      }
    });
    setupScrollTarget(parent, body, state, x - bleed, x + width + bleed, y, height,
      (footerTop ?? ui.bottom) + 5, pinned, scrollObservers);
    if (plots.length) {
      syncPlotVisibility = observePlots(plots, scrollTarget);
      scrollObservers.push(syncPlotVisibility);
    }
  }

  function setupScrollTarget(parent, body, state, x, right, y, height, contentHeight, pinned, scrollObservers) {
    const max = Math.max(0, contentHeight - height);
    state.scroll = clamp(state.scroll ?? 0, 0, max);
    state.onScrollChange?.(state.scroll);
    for (const observe of scrollObservers) observe(state.scroll);
    if (navigation?.active && state === locals[current]) navigation.active.scroll = state.scroll;
    if (state === locals[current]) rememberContext();
    body.y = y - state.scroll;
    if (pinned) pinned.layer.y = y + Math.max(0, pinned.top - state.scroll);
    scrollTarget = { body, state, max, x, right, y, height, pinned, scrollObservers };
    if (max > 0) {
      const thumbH = Math.max(22, height * height / (height + max));
      const trackX = scrollTarget.right;
      const thumb = inkGraphics().roundRect(trackX - 5, 0, 5, thumbH, 2.5).fill(0x243d30);
      thumb.eventMode = 'static';
      thumb.cursor = 'ns-resize';
      thumb.hitArea = new Rectangle(trackX - 14, 0, 14, thumbH);
      thumb.on('pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.stopPropagation();
        beginDrag(event, true);
      });
      thumb.on('pointerover', () => {
        if (scrollTarget?.thumb !== thumb) return;
        scrollTarget.thumbHover = true;
        updateScrollThumb(performance.now());
      });
      thumb.on('pointerout', () => {
        if (scrollTarget?.thumb !== thumb) return;
        scrollTarget.thumbHover = false;
        updateScrollThumb(performance.now());
      });
      parent.addChild(thumb);
      scrollTarget.thumb = thumb;
      scrollTarget.thumbRange = Math.max(1, height - thumbH);
      thumb.y = y + scrollTarget.thumbRange * (state.scroll / max);
      updateScrollThumb(performance.now());
    }
  }

  function estateArea(parent, researchReady, claimableReturns) {
    const { width, height } = frame;
    const body = new Container();
    body.label = 'estate-map';
    const mask = inkGraphics().rect(0, 0, width, height).fill(0xffffff);
    parent.addChild(body, mask);
    body.mask = mask;
    const firstControl = controls.length;
    estateMap = mountEstateMap(body, {
      width,
      insetTop: layout.inset.top,
      onOpen: (id) => {
        if (!Object.hasOwn(estateDestinations, id)) return;
        const page = estateDestinations[id];
        delete locals[page].id;
        delete locals[page].positionedSourceId;
        delete locals[page].linkedResearchItem;
        go(page);
      },
      bind: (target, x, y, w, h, run) => hitAt(target, body, x, y, w, h, run),
      getImage: (url) => textures.get(url),
      loadImage: loadAnimationImage,
      markDirty,
      researchReady,
      returnGiftSites: new Set(Object.entries(estateDestinations)
        .filter(([, page]) => claimableReturns.has(page)).map(([site]) => site)),
      guideTaskName: activeGuideTask(world)?.name,
      focusedIndex: focusIndex - firstControl,
    });
    const map = estateMap;
    setupScrollTarget(parent, body, locals[homePage], 0, width, 0, height, map.height, undefined,
      [(scroll) => map.setViewport(scroll, height)]);
  }

  function changeScroll(value, active = true) {
    if (!scrollTarget) return;
    const { max, body, state, y, thumb, thumbRange, pinned, scrollObservers } = scrollTarget;
    state.scroll = clamp(value, 0, max);
    state.onScrollChange?.(state.scroll);
    for (const observe of scrollObservers) observe(state.scroll);
    if (navigation?.active && state === locals[current]) navigation.active.scroll = state.scroll;
    if (state === locals[current]) rememberContext();
    body.y = y - state.scroll;
    if (pinned) pinned.layer.y = y + Math.max(0, pinned.top - state.scroll);
    if (thumb) thumb.y = y + thumbRange * (state.scroll / max);
    if (active) scrollActivity = performance.now();
    updateScrollThumb(performance.now());
    markDirty();
  }

  function updateScrollThumb(now) {
    if (!scrollTarget?.thumb) return;
    const idle = clamp((now - scrollActivity - 550) / 520, 0, 1);
    const alpha = (drag?.thumb || scrollTarget.thumbHover) ? 0.72 : 0.56 - 0.32 * idle;
    if (scrollTarget.thumb.alpha !== alpha) {
      scrollTarget.thumb.alpha = alpha;
      markDirty();
    }
  }

  function handleDevelopmentTitleTap(event) {
    if (!developmentToolsEnabled || !event || event.button !== 0 || blockTap || waiting ||
        current !== '设置' || !world || modal || pendingModal || status?.busy) return;
    settingsTitleClicks += 1;
    if (settingsTitleClicks !== 11) return;
    settingsTitleClicks = 0;
    point = root.toLocal(event.global);
    void action('grantDevelopmentTools');
  }

  function closeNavigationMenu() {
    if (!navigationMenu) return;
    focusIndex = navigationMenu.buttonIndex;
    navigationMenu = undefined;
    coast = null;
    redraw();
  }

  function navigationMenuButton(parent, right, top) {
    const layer = new Container();
    parent.addChild(layer);
    const size = 36;
    const left = right - size;
    const buttonIndex = controls.length;
    const focused = !waiting && (navigationMenu ? navigationMenu.focusIndex === 0 : focusIndex === buttonIndex);
    const button = panel(layer, left, top, size, size,
      navigationMenu ? palette.selection : palette.pale, focused ? palette.green : palette.border, 11);
    button.label = 'navigation-menu-button';
    drawImage(layer, 'nav-menu', left + 5, top + 5, 26, 26);
    const control = waiting ? undefined : hitAt(button, layer, left - 6, top - 6, size + 12, size + 12, () => {
      if (navigationMenu) { closeNavigationMenu(); return; }
      coast = null;
      navigationMenu = { buttonIndex, scroll: 0, focusIndex: 0 };
      focusIndex = -1;
      redraw();
    });
    return { layer, control, right, y: top + size + 8 };
  }

  function drawNavigationMenu(parent, { layer: trigger, control, right, y }, claimableReturns) {
    // Give the overlay the only hit targets and keyboard controls while it is open.
    const layer = new Container();
    layer.label = 'navigation-menu';
    parent.addChild(layer);
    const outside = new Container();
    outside.eventMode = 'static';
    outside.hitArea = root.hitArea;
    outside.on('pointertap', (event) => {
      if (event.isPrimary && event.button === 0 && !blockTap) closeNavigationMenu();
    });
    layer.addChild(outside);
    controls = [control];

    const width = Math.min(288, Math.max(1, right - layout.inset.left - 8));
    const x = right - width;
    const columns = width >= 270 ? 3 : width >= 152 ? 2 : 1;
    const padding = 6;
    const rowHeight = 64;
    const contentHeight = Math.ceil(menuPages.length / columns) * rowHeight + padding * 2;
    const height = Math.max(1, Math.min(contentHeight, frame.height - layout.inset.bottom - 8 - y));
    panel(layer, x, y, width, height, palette.card, palette.border, 11);

    const viewport = new Container();
    viewport.eventMode = 'static';
    viewport.hitArea = new Rectangle(x, y, width, height);
    const body = new Container();
    const mask = inkGraphics().rect(x, y, width, height).fill(0xffffff);
    layer.addChild(viewport);
    viewport.addChild(body, mask);
    body.mask = mask;
    const columnWidth = Math.max(1, (width - padding * 2 - (height < contentHeight ? 6 : 0)) / columns);
    const iconSize = Math.min(32, Math.max(1, columnWidth - 8));
    const labelSize = Math.min(14, Math.max(6, (columnWidth - 8) / 4));
    for (const [index, page] of menuPages.entries()) {
      const icon = menuIcons[page];
      const tile = new Container();
      tile.label = icon;
      tile.position.set(x + padding + (index % columns) * columnWidth,
        padding + Math.floor(index / columns) * rowHeight);
      body.addChild(tile);
      const focused = navigationMenu.focusIndex === controls.length;
      const surface = panel(tile, 2, 2, Math.max(1, columnWidth - 4), rowHeight - 4,
        focused ? palette.selection : palette.card, focused ? palette.green : palette.line, 8);
      drawImage(tile, icon, (columnWidth - iconSize) / 2, 6, iconSize, iconSize, false, false);
      textNode(tile, page === homePage ? '大地图' : page, 4, 40, columnWidth - 8, {
        size: labelSize, align: 'center', weight: '750', wrap: false,
      });
      if (claimableReturns.has(page) || page === '管理员管理' && claimableReturns.size > 0) drawIndicator(tile, columnWidth - 2, 2);
      hitAt(surface, tile, 0, 0, columnWidth, rowHeight, () => go(page, { menu: true }));
    }
    setupScrollTarget(layer, body, navigationMenu, x, right, y, height, contentHeight, undefined, []);
    layer.addChild(trigger);
  }

  function homeHud(parent, content, { left, top, right }) {
    const coinX = left + 8;
    const menuRight = frame.width - right - 8;
    const balanceHeight = 36;
    const balanceTop = top + 12;
    const coinWidth = Math.min(158, menuRight - coinX - 43);
    if (coinWidth >= 48) {
      const coinSurface = panel(parent, coinX, balanceTop, coinWidth, balanceHeight,
        palette.pale, palette.line, 18);
      coinSurface.label = 'estate-coin-balance';
      drawImage(parent, 'coin', coinX + 7, balanceTop + 5, 25, 25);
      const amount = compactLabel(parent, content.coins, coinX + 36, balanceTop, coinWidth - 42,
        { size: 22, weight: '800' });
      amount.y = balanceTop + (balanceHeight - amount.height) / 2;
    }
    return navigationMenuButton(parent, menuRight, balanceTop);
  }

  function topBar(parent, content, x, y, w, hasWorld) {
    const height = 59;
    panel(parent, 0, 0, frame.width, y + height, palette.paper, null, 0);
    parent.addChild(inkGraphics().rect(0, y + height - 1, frame.width, 1).fill(palette.line));
    const backWidth = 48;
    buttonAt(parent, x, y + 8, backWidth, 43, '返回', back, { iconOnly: 'chevron-left' });
    const titleRoom = Math.max(1, w - (backWidth + 7) * 2);
    const titleX = x + (w - titleRoom) / 2;
    const title = textNode(parent, current, titleX, y, titleRoom, {
      size: Math.min(30, 25 * scale(), titleRoom / current.length), align: 'center', weight: '850',
    });
    title.y = y + (height - title.height) / 2;
    const menu = hasWorld ? navigationMenuButton(parent, x + w, y + 12) : undefined;
    if (developmentToolsEnabled && current === '设置' && content && !waiting && !status?.busy && !modal && !pendingModal) {
      const titleHit = inkGraphics();
      parent.addChild(titleHit);
      titleHit.label = 'development-settings-title';
      const hitWidth = Math.max(48, title.width + 8);
      titleHit.eventMode = 'static';
      titleHit.hitArea = new Rectangle(title.x + (title.width - hitWidth) / 2, y + 5, hitWidth, 49);
      titleHit.on('pointertap', handleDevelopmentTitleTap);
      developmentTitleTarget = titleHit;
    }
    return menu;
  }

  function drawFeedback() {
    if (!feedbackLayer) return;
    // Called on build, on new feedback and every frame while feedback is shown or fading out.
    markDirty();
    // Each message is built once per feedback layer; later frames only move and fade it.
    const live = (node, source) => node && node.source === source && !node.layer.destroyed &&
      node.layer.parent === feedbackLayer;
    const drop = (node) => { if (node && !node.layer.destroyed) node.layer.destroy({ children: true }); };
    const now = performance.now();
    if (notices && notices.expires > now) {
      if (!live(noticeNode, notices)) {
        drop(noticeNode);
        const layer = new Container();
        layer.eventMode = 'passive';
        // The toast stays beneath a floating label, as when both were direct children.
        feedbackLayer.addChildAt(layer, 0);
        const source = notices;
        const inset = layout.inset.top;
        const width = frame.width - 28;
        const top = inset + 69;
        const bubble = textNode(layer, source.message, 23, top, width - 66,
          { size: 15 * Math.min(1.45, scale()), color: palette.cream, align: 'center' });
        const height = Math.max(48, bubble.height + 15);
        bubble.y = top + (height - bubble.height) / 2;
        const bg = panel(layer, 14, top, width, height, palette.dark, null);
        bg.eventMode = 'none';
        layer.setChildIndex(bg, 0);
        const closeLeft = 14 + width - 48;
        const closeTop = top + (height - 48) / 2;
        const close = layer.addChild(inkGraphics());
        close.eventMode = 'static';
        close.cursor = 'pointer';
        close.label = '关闭提示';
        close.hitArea = new Rectangle(closeLeft, closeTop, 48, 48);
        layer.addChild(inkGraphics().moveTo(closeLeft + 16, closeTop + 16).lineTo(closeLeft + 32, closeTop + 32)
          .moveTo(closeLeft + 32, closeTop + 16).lineTo(closeLeft + 16, closeTop + 32)
          .stroke({ color: 0xffffff, width: 2.5, cap: 'round' })).eventMode = 'none';
        close.on('pointerdown', (event) => event.stopPropagation());
        close.on('pointertap', (event) => {
          event.stopPropagation();
          if (notices !== source) return;
          notices = undefined;
          drawFeedback();
        });
        noticeNode = { source, layer };
      }
    } else {
      notices = undefined;
      drop(noticeNode);
      noticeNode = undefined;
    }
    const elapsed = floating ? (now - floating.started) / 650 : 1;
    if (elapsed >= 1) {
      floating = undefined;
      drop(floatNode);
      floatNode = undefined;
      return;
    }
    const w = Math.min(210, frame.width - 24);
    const y = clamp(floating.at.y - elapsed * 25, 24, frame.height - 40);
    const x = clamp(floating.at.x - w / 2, 10, frame.width - w - 10);
    if (!live(floatNode, floating)) {
      drop(floatNode);
      const label = textNode(feedbackLayer, floating.message, x, y, w, { size: 17, align: 'center', color: palette.cream, weight: '800' });
      label.style.fill = palette.ink;
      label.style.stroke = { color: palette.cream, width: 4, join: 'round' };
      floatNode = { source: floating, layer: label, shift: label.x - x };
    }
    floatNode.layer.position.set(x + floatNode.shift, y);
    floatNode.layer.alpha = 1 - elapsed;
  }

  function redraw() {
    if (!layout || building) return;
    if (treeGesture || (pressedPointer !== null && !sliderDrag)) {
      needsRender = true;
      markDirty();
      syncPlotVisibility?.();
      return;
    }
    needsRender = false;
    building = true;
    markDirty();
    // A throwing page must not leave `building` set, or every later redraw would be skipped.
    try { build(); }
    catch (error) { flushRetainedAnimations(); throw error; }
    finally { building = false; }
    drawn = { layout, world, status, epoch: progressTiming?.epoch };
    if (pendingModal) {
      const next = pendingModal;
      pendingModal = undefined;
      activateDialog(next);
      recordRoute();
      requestRender();
    } else rememberContext();
    // Visible cards adopt their parked animations here; the rest unload as before.
    syncPlotVisibility?.();
    flushRetainedAnimations();
    trimImages();
  }

  function cachedResearchReadyTabs(world) {
    const { accountSeed, basicResearchPoints, coins, researchPoints, unlocked, inventory, tech } = world;
    // Committed and projected worlds expose these inputs as read-only snapshots.
    const inputs = { accountSeed, basicResearchPoints, coins, researchPoints, unlocked, inventory, tech };
    if (!sameState(lastResearchReady?.inputs, inputs)) {
      lastResearchReady = { inputs, tabs: researchReadyTabs(world) };
    }
    return lastResearchReady.tabs;
  }

  function build() {
    const { x, y, width, height, scale: zoom, inset } = layout;
    frame.width = width / zoom;
    frame.height = height / zoom;
    root.position.set(x, y);
    root.scale.set(zoom);
    root.eventMode = 'static';
    root.hitArea = new Rectangle(0, 0, frame.width, frame.height);
    clip.clear().rect(x, y, width, height).fill(0xffffff);
    progressBars.clear();
    countdowns.clear();
    updateDialogSampleProgress = undefined;
    managerSpeechMount = undefined;
    for (const plot of [...activePlots]) parkPlot(plot);
    syncPlotVisibility = undefined;
    visiblePlotIds.clear();
    imagesInUse = new Set();
    for (const child of root.removeChildren()) child.destroy({ children: true });
    controls = [];
    scrollTarget = undefined;
    estateMap = undefined;
    if (developmentToolsEnabled) developmentTitleTarget = undefined;
    panel(root, 0, 0, frame.width, frame.height, palette.paper, null, 0);
    const margin = frame.width > 550 ? (frame.width - 520) / 2 : 8;
    const left = Math.max(margin, inset.left + 6);
    const w = Math.max(80, frame.width - left - Math.max(margin, inset.right + 6));
    const isHome = current === homePage;
    const hasWorld = world && !status?.busy;
    if (!hasWorld) resetManagerSpeech();
    if (navigationMenu && (!hasWorld || waiting)) {
      navigationMenu = undefined;
      focusIndex = -1;
    }
    const claimableReturns = hasWorld && (isHome || navigationMenu)
      ? new Set(Object.entries(managerPages).flatMap(([page, role]) =>
        managerStatus(world, role)?.claim ? [page] : []))
      : undefined;
    let menu = isHome ? undefined : topBar(root, world, left, inset.top, w, hasWorld);
    const readyTabs = hasWorld && !waiting && (isHome || current === '研究')
      ? cachedResearchReadyTabs(world) : noResearchReadyTabs;
    const top = inset.top + 59;
    const bottom = frame.height - inset.bottom - 5;
    if (hasWorld && isHome) {
      const hud = new Container();
      menu = homeHud(hud, world, inset);
      estateArea(root, readyTabs.size > 0, claimableReturns);
      root.addChild(hud);
    } else if (hasWorld) {
      const drawPage = current === '研究' ? (ui) => renderResearch(ui, readyTabs) : pages[current];
      const manager = managerPages[current];
      const draw = manager ? (ui) => {
        renderManager(ui, manager, readyTabs.has('品种配方'), current);
        drawPage(ui);
      } : drawPage;
      scrollArea(root, left, top, w, Math.max(40, bottom - top), locals[current], draw,
        Math.max(0, Math.min(left, frame.width - left - w)));
    } else {
      const ui = layoutUI(root, left, top + 20, w, {}, Math.max(40, bottom - top));
      ui.heading(status?.title ?? '正在准备庄园');
      if (status?.message) ui.text(status.message);
      if (status?.recoverable) {
        if (status.confirmRestore) {
          if (status.recovery) {
            const time = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
              .format(status.recovery.wallAnchorMs);
            ui.row('备份时间', time);
          }
          ui.buttons([
            { label: '返回', onClick: () => { status.confirmRestore = false; redraw(); } },
            { label: '确认恢复', onClick: restore, tone: 'gold' },
          ]);
        } else ui.button('恢复上次记录', () => {
          status.confirmRestore = true;
          status.confirmReplace = false;
          redraw();
        }, { tone: 'gold' });
      }
      if (status?.retry) ui.button('重新读取记录', status.retry, { tone: 'gold' });
      if (status?.replaceable) {
        if (status.confirmReplace) {
          ui.text('新建后将清除这份无法读取的经营记录。');
          ui.buttons([
            { label: '取消', onClick: () => { status.confirmReplace = false; redraw(); } },
            { label: '确认新建', onClick: replace, tone: 'danger' },
          ]);
        } else ui.button('新建经营记录', () => {
          status.confirmReplace = true;
          status.confirmRestore = false;
          redraw();
        });
      }
    }

    if (navigationMenu && menu) drawNavigationMenu(root, menu, claimableReturns);
    if (modal && hasWorld) {
      controls = [];
      const sheetBottom = frame.height - inset.bottom - 7;
      const shade = inkGraphics().rect(0, 0, frame.width, frame.height)
        .fill({ color: palette.dark, alpha: modal.variant === 'warehouse-sale' ? 0.36 : 0.64 });
      shade.eventMode = 'static';
      root.addChild(shade);
      const variant = modal.variant;
      const minimum = variant === 'warehouse-sale' ? 358 : variant === 'facility-upgrade' ? 475 : 250;
      const ratio = variant === 'warehouse-sale' ? 0.48 : variant === 'facility-upgrade' ? 0.57 : 0.77;
      const boxHeight = Math.min(Math.max(modal.minHeight ?? minimum, frame.height * ratio), sheetBottom - inset.top - 14,
        modal.maxHeight ?? Infinity);
      const boxY = modal.center ? (frame.height - boxHeight) / 2 : sheetBottom - boxHeight;
      const fullSheet = variant === 'warehouse-sale' || variant === 'facility-upgrade';
      const boxLeft = fullSheet ? inset.left + 2 : left;
      const boxWidth = fullSheet ? frame.width - boxLeft - inset.right - 2 : w;
      panel(root, boxLeft, boxY, boxWidth, boxHeight, palette.card, palette.border, 12);
      if (fullSheet) panel(root, boxLeft + 4, boxY + 4, boxWidth - 8, boxHeight - 8, palette.card, palette.line, 9);
      const headerHeight = Math.max(56, Math.ceil(26 * Math.min(scale(), 1.45) * 1.36) + 14);
      panel(root, boxLeft + 1, boxY + 1, boxWidth - 2, headerHeight, palette.green, null, 11);
      panel(root, boxLeft + 1, boxY + headerHeight - 12, boxWidth - 2, 13, palette.green, null, 0);
      const titleRoom = Math.max(1, boxWidth - 112);
      const title = textNode(root, modal.title, boxLeft + 56, boxY, titleRoom, {
        size: Math.min(26 * Math.min(scale(), 1.45), titleRoom / Math.max(1, Array.from(modal.title).length)),
        align: 'center', color: palette.cream, weight: '800', wrap: false,
      });
      title.y = boxY + (headerHeight - title.height) / 2;
      buttonAt(root, boxLeft + boxWidth - 49, boxY + (headerHeight - 44) / 2, 44, 44,
        '关闭', closeDialog, { iconOnly: 'close' });
      const pad = 10;
      scrollArea(root, left + pad, boxY + headerHeight + 8, w - pad * 2,
        Math.max(1, boxHeight - headerHeight - 16), modal, modal.draw,
        fullSheet ? Math.max(0, left + pad - boxLeft) : pad, { captureFooter: true });
    }
    feedbackLayer = new Container();
    feedbackLayer.eventMode = 'passive';
    root.addChild(feedbackLayer);
    drawFeedback();
  }

  function beginDrag(event, thumb = false) {
    if (openingScreen?.blocking || !scrollTarget?.max || !event.isPrimary || event.button !== 0) return;
    const p = root.toLocal(event.global);
    if (p.x < scrollTarget.x || p.x > scrollTarget.right ||
        p.y < scrollTarget.y || p.y > scrollTarget.y + scrollTarget.height) return;
    coast = null;
    blockTap = false;
    drag = { pointerId: event.pointerId, y: p.y, at: scrollTarget.state.scroll, thumb,
      lastScroll: scrollTarget.state.scroll, lastTime: performance.now(), velocity: 0 };
    scrollActivity = drag.lastTime;
  }
  root.on('pointerdown', (event) => {
    if (developmentToolsEnabled && event.target !== developmentTitleTarget) settingsTitleClicks = 0;
    coast = null;
    beginDrag(event);
  });
  root.on('globalpointermove', (event) => {
    if (sliderDrag) { sliderDrag(event); return; }
    if (!drag || event.pointerId !== drag.pointerId || !scrollTarget) return;
    const distance = root.toLocal(event.global).y - drag.y;
    if (Math.abs(distance) > (drag.thumb ? 0 : 7)) blockTap = true;
    if (!blockTap) return;
    const ratio = drag.thumb ? scrollTarget.max / scrollTarget.thumbRange : -1;
    changeScroll(drag.at + distance * ratio);
    const now = performance.now();
    const position = scrollTarget.state.scroll;
    const instantaneous = (position - drag.lastScroll) / Math.max(10, now - drag.lastTime);
    drag.velocity = clamp(drag.velocity * 0.28 + instantaneous * 0.72, -2.6, 2.6);
    drag.lastScroll = position;
    drag.lastTime = now;
  });
  function endPointer(event, cancelled = false) {
    const activePointer = sliderDrag ?? drag;
    if (event && activePointer && event.pointerId !== activePointer.pointerId) return;
    const wasDragging = Boolean(drag || sliderDrag);
    const finishSlider = cancelled && sliderDrag?.cancel ? sliderDrag.cancel : sliderDrag?.commit;
    const now = performance.now();
    if (drag && blockTap && !drag.thumb && !cancelled &&
        now - drag.lastTime < 95 && Math.abs(drag.velocity) > 0.06 && scrollTarget) {
      coast = { state: scrollTarget.state, velocity: drag.velocity, lastTime: now };
    }
    drag = null;
    sliderDrag = null;
    finishSlider?.();
    if (blockTap) setTimeout(() => { blockTap = false; }, 0);
    if (wasDragging) requestRender();
  }
  root.on('pointerup', (event) => endPointer(event));
  root.on('pointerupoutside', (event) => endPointer(event));
  root.on('pointercancel', (event) => endPointer(event, true));
  app.canvas.addEventListener('pointerdown', (event) => {
    if (openingScreen?.blocking) return;
    if (event.isPrimary && event.button === 0) pressedPointer = event.pointerId;
  }, { capture: true });
  function releasePointer(event) {
    if (event.pointerId !== pressedPointer) return;
    pressedPointer = null;
    endPointer(event, event.type === 'pointercancel');
    if (needsRender) requestRender();
  }
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);
  window.addEventListener('blur', () => {
    pressedPointer = null;
    treeGesture = false;
    coast = null;
    endPointer(undefined, true);
    if (needsRender) requestRender();
  });
  let scrollWheelEvent;
  root.on('wheel', (event) => {
    if (openingScreen?.blocking) return;
    if (!scrollTarget) return;
    if (navigationMenu) scrollWheelEvent = event.nativeEvent;
    const p = root.toLocal(event.global);
    if (p.x < scrollTarget.x || p.x > scrollTarget.right ||
        p.y < scrollTarget.y || p.y > scrollTarget.y + scrollTarget.height) return;
    coast = null;
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? scrollTarget.height : 1;
    changeScroll(scrollTarget.state.scroll + event.deltaY * unit / layout.scale);
    scrollWheelEvent = event.nativeEvent;
  });
  // Pixi handles wheel in a passive capture listener; cancel only the event it consumed.
  function preventScrollWheel(event) {
    if (event !== scrollWheelEvent) return;
    scrollWheelEvent = undefined;
    event.preventDefault();
  }
  const wheelCanvas = app.canvas;
  wheelCanvas.addEventListener('wheel', preventScrollWheel, { passive: false });
  root.on('destroyed', () => {
    wheelCanvas.removeEventListener('wheel', preventScrollWheel);
    scrollWheelEvent = undefined;
  });

  app.canvas.addEventListener('keydown', (event) => {
    if (openingScreen?.blocking) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openingScreen.retryFailed(); }
      return;
    }
    if (modal?.onKeyDown?.(event)) { event.preventDefault(); return; }
    if (event.key === 'Escape') { event.preventDefault(); back(); return; }
    if (!controls.length) return;
    const activeFocus = navigationMenu?.focusIndex ?? focusIndex;
    if (event.key === 'Tab') {
      event.preventDefault();
      const nextFocus = activeFocus < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (activeFocus + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      if (navigationMenu) navigationMenu.focusIndex = nextFocus;
      else focusIndex = nextFocus;
      const target = controls[nextFocus];
      if (scrollTarget) {
        let container = target.parent;
        while (container && container !== scrollTarget.body) container = container.parent;
        if (container) {
          const y = scrollTarget.body.toLocal(target.parent.toGlobal({ x: target.x, y: target.y })).y;
          changeScroll(y - Math.max(12, scrollTarget.height / 3));
        }
      }
      redraw();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      controls[activeFocus]?.run();
    } else if (controls[activeFocus]?.key?.(event.key)) event.preventDefault();
  });
  app.canvas.addEventListener('paste', (event) => {
    if (openingScreen?.blocking) return;
    if (modal?.onPaste?.(event)) { event.preventDefault(); return; }
    if (!modal?.onImportText || waiting) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain');
    if (text) Promise.resolve(modal.onImportText(text)).catch(() => toast('无法读取导入内容。'));
  });
  app.canvas.addEventListener('dragover', (event) => {
    if (modal?.onImportText || modal?.onImportFile) event.preventDefault();
  });
  app.canvas.addEventListener('drop', async (event) => {
    if (openingScreen?.blocking) return;
    const shown = modal;
    if (!shown?.onImportText && !shown?.onImportFile) return;
    event.preventDefault();
    if (waiting) return;
    const files = event.dataTransfer?.files;
    if (files?.length !== 1 || !/\.json$/i.test(files[0].name)) {
      toast('请拖入一份 JSON 存档文件。');
      return;
    }
    try {
      if (shown.onImportFile) await shown.onImportFile(files[0]);
      else {
        const text = typeof saveManagement.readImportFile === 'function'
          ? await saveAction('readImportFile', files[0]) : await files[0].text();
        if (modal === shown && !waiting) await shown.onImportText(text);
      }
    } catch (error) { toast(error?.userMessage || '无法读取存档文件。'); }
  });
  document.addEventListener?.('visibilitychange', () => { markDirty(); syncPlotVisibility?.(); });
  // Input, focus, viewport and context events may change what is shown (hover, gestures in the
  // research tree, sliders, text entry); each marks the next frame dirty.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave', 'wheel',
    'keydown', 'keyup', 'paste', 'drop', 'dragover', 'focus', 'blur', 'webglcontextrestored']) {
    app.canvas.addEventListener(type, markDirty, { passive: true, capture: true });
  }
  for (const type of ['pointerup', 'pointercancel', 'blur', 'focus', 'resize', 'pageshow']) {
    window.addEventListener(type, markDirty, { passive: true });
  }
  window.visualViewport?.addEventListener('resize', markDirty, { passive: true });
  // Pixi tracks drags that leave the canvas through document-level pointer moves.
  document.addEventListener?.('pointermove', markDirty, { passive: true, capture: true });
  app.ticker.add(() => {
    if (notices || floating) drawFeedback();
    const now = performance.now();
    openingScreen.update(now, !needsRender && !pendingRender && !building);
    const speechVisible = !openingScreen.blocking && managerSpeechMount?.visible() && !document.hidden && !status?.busy &&
      !pendingModal && !navigationMenu;
    if (!speechVisible && managerSpeechWasVisible) pauseManagerSpeech();
    managerSpeechWasVisible = speechVisible;
    const speechUpdate = managerSpeech?.update(now, speechVisible);
    if (speechUpdate?.changed) managerSpeechMount?.startLine();
    else if (speechUpdate) managerSpeechMount?.reveal();
    if (speechUpdate?.audible) audio.typeDialogue?.();
    const clock = world && !status?.busy && !document.hidden ? updateBatchDisplays(now) : undefined;
    if (sampleDialog(now)) requestRender();
    if (clock !== undefined) updateDialogSampleProgress?.(now);
    if (coast) {
      if (scrollTarget?.state !== coast.state) coast = null;
      else {
        const elapsed = Math.min(40, now - coast.lastTime);
        coast.lastTime = now;
        const next = scrollTarget.state.scroll + coast.velocity * elapsed;
        changeScroll(next);
        coast.velocity *= Math.exp(-elapsed / 165);
        if (next <= 0 || next >= scrollTarget.max || Math.abs(coast.velocity) < 0.03) coast = null;
      }
    }
    if (activePlots.size && world &&
        !document.hidden && !modal && !pendingModal && !status?.busy) {
      const animationFrame = { clock: clock ?? progressClock(now), now };
      let animated = false;
      for (const plot of activePlots) if (plot.animation.update(animationFrame) !== false) animated = true;
      if (animated) markDirty();
    }
    if (estateMap && !document.hidden && !modal && !pendingModal && estateMap.update(now)) markDirty();
    if (coast) markDirty();
    updateScrollThumb(now);
  });
  // The stage renders only on dirty frames (R6): Pixi's per-tick render is replaced by this
  // LOW-priority listener, which runs after every NORMAL update in the same tick (including
  // the game's own paint), so a change made in a frame is rendered in that frame. The frame
  // rate itself is unchanged while anything moves; idle frames render at most once a second.
  if (typeof app.render === 'function' && typeof app.ticker.remove === 'function') {
    app.ticker.remove(app.render, app);
    app.ticker.add(() => {
      const now = performance.now();
      if (!frameDirty && now - lastRenderAt < idleRenderMs) return;
      frameDirty = false;
      lastRenderAt = now;
      app.render();
      openingScreen.afterRender();
    }, undefined, UPDATE_PRIORITY.LOW);
  }

  if (navigation) {
    restoreRoute(true);
    const syncRoute = () => {
      if (navigation.active?.hash !== browser.location.hash ||
          browser.history.state?.farmNavigation?.key !== navigation.active?.key) restoreRoute();
    };
    browser.addEventListener('popstate', syncRoute);
    browser.addEventListener('hashchange', syncRoute);
  }

  function resize(nextLayout) {
    const resized = !layout || layout.width !== nextLayout.width || layout.height !== nextLayout.height;
    layout = nextLayout;
    openingScreen.resize(nextLayout);
    markDirty();
    if (resized) { pressedPointer = null; treeGesture = false; coast = null; endPointer(undefined, true); floating = undefined; }
    // Keep captured pointer targets intact until a drag finishes.
    if (!drag && !sliderDrag) redraw();
  }

  function resetSession() {
    navigationEpoch += 1;
    navigationMenu = undefined;
    pendingModal = undefined;
    activateDialog(undefined);
    pageParent = undefined;
    linkedEntryParent = undefined;
    current = homePage;
    lastResearchReady = undefined;
    for (const page of Object.keys(pages)) locals[page] = { scroll: 0 };
    shortPlotStarts.clear();
    livestockBatches.clear();
    fishBatches.clear();
    workshopMotionStates.clear();
    for (const plot of activePlots) unmountPlot(plot);
    flushRetainedAnimations();
    visiblePlotIds.clear();
    progressTiming = undefined;
    progressEpoch = undefined;
    lastProgressClock = undefined;
    resetManagerSpeech();
    managerConversations.clear();
    managerCandidates.clear();
    managerTapTimes.clear();
    progressBars.clear();
    countdowns.clear();
    coast = null;
    drag = null;
    sliderDrag = null;
    treeGesture = false;
    pressedPointer = null;
    blockTap = false;
    focusIndex = -1;
    floating = undefined;
    notices = undefined;
    point = undefined;
    if (developmentToolsEnabled) settingsTitleClicks = 0;
    // A new history session leaves old browser entries unable to restore stale dialogs.
    navigation = gameHistory(browser);
    recordRoute(true);
    onNavigate?.(current);
    redraw();
  }

  function isImportingSave() {
    const pending = [modal, pendingModal];
    const visited = new Set();
    while (pending.length) {
      const dialog = pending.pop();
      if (!dialog || visited.has(dialog) || dialog.navigationEpoch !== navigationEpoch) continue;
      visited.add(dialog);
      if (dialog.flow === 'save-import' || dialog.onImportText || dialog.onImportFile) return true;
      pending.push(dialog.parentDialog);
    }
    return false;
  }

  return {
    go, toast, float, dialog: setDialog, close: closeDialog, dismiss: dismissDialog, resize, resetSession, isImportingSave,
    merchantBatchChanged, hasMerchantRefreshNotice,
    get loading() { return openingScreen.blocking; },
    pauseProgress() {
      if (world && progressTiming) progressClock(performance.now());
      progressTiming = undefined;
      pauseManagerSpeech();
    },
    render(nextLayout, nextWorld, nextStatus, nextProgressTiming) {
      // A new world or status may change anything that reads `world` lazily; render this frame.
      markDirty();
      if (nextProgressTiming?.epoch !== undefined && nextProgressTiming.epoch !== progressEpoch) {
        progressEpoch = nextProgressTiming.epoch;
        lastProgressClock = undefined;
      }
      if (nextWorld?.completedRuns !== world?.completedRuns || nextWorld?.clockMs < world?.clockMs) {
        shortPlotStarts.clear();
        livestockBatches.clear();
        fishBatches.clear();
        workshopMotionStates.clear();
      } else {
        for (const [index, timeline] of shortPlotStarts) {
          const nextBatch = nextWorld?.facilities.C[index]?.batch;
          if (!nextBatch || nextBatch.id !== timeline.id || nextBatch.end - nextBatch.start >= minPlotAnimationMs) {
            shortPlotStarts.delete(index);
          }
        }
      }
      syncLivestockBatches(nextWorld);
      syncFishBatches(nextWorld);
      for (const [key, phase] of workshopMotionStates) {
        const station = nextWorld?.stations[phase.kind]?.[phase.index];
        if ((station?.batch?.id ?? station?.recipe) !== phase.id) workshopMotionStates.delete(key);
        else syncWorkshopMotion(phase, station, nextWorld.clockMs);
      }
      // Rebuild only when something a page draws statically may differ. When just the clock
      // moved, countdowns, progress bars and animations follow `world` frame by frame. A new
      // commit (such as the 5-second autosave) whose data equal the drawn world, apart from
      // the clock fields and save revision, needs no rebuild either (S1).
      const structural = !drawn || nextLayout !== layout || drawn.layout !== nextLayout ||
        nextStatus !== drawn.status ||
        nextProgressTiming?.epoch !== drawn.epoch || !sameState(nextWorld, drawn.world, clockOnlyFields);
      world = nextWorld;
      status = nextStatus;
      progressTiming = nextProgressTiming;
      openingScreen.pageState(Boolean(world && !status?.busy), !world && status && !status.busy ? status : undefined);
      if (structural) resize(nextLayout);
      if (world && !status?.busy && !document.hidden) updateBatchDisplays(performance.now());
    },
  };
}
