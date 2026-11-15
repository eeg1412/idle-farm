import { AccessibilitySystem, Application, extensions } from 'pixi.js';
import {
  advanceWorld, newWorld, settleProduction, catalog,
  buyFacility, upgradeFacility, assignFacility, buyStation, arrangeStation,
  setStationPriority, reserve, sell, sellBatch, sellFarm,
} from './game/world.js';
import { research, upgradeQuality, upgradeTech, qualityOffer } from './game/advancement.js';
import { objectives } from './game/objectives.js';
import { viewportLayout } from './platform/layout.js';
import {
  openWorldSave, readWorldSave, writeWorldSave, restoreWorldSave, settleOfflineWorld, acknowledgeOffline,
  replaceWorldSave,
} from './platform/world-save.js';
import { createSaveQueue } from './platform/save-queue.js';
import { createSaveTransfer, saveTransferError } from './platform/save-transfer.js';
import { compact } from './view/numbers.js';
import { createGameView } from './view/canvas-ui.js';
import { createFarmAudio } from './platform/farm-audio.js';

extensions.remove(AccessibilitySystem);
const app = new Application();
const canvas = document.querySelector('#game');
await app.init({
  canvas, preference: 'webgl', background: 0x000000, antialias: true,
  autoDensity: true, resolution: Math.min(devicePixelRatio, 2),
});
let world = null;
let worldEpoch = 0;
let db;
let status;
let layout;
let frontAnchor;
let displayedSecond = -1;
let visible = !document.hidden;
let visibleSince = visible ? performance.now() : Infinity;
let offlineDialogId;
const audio = createFarmAudio();
const saveQueue = createSaveQueue();
const { enqueue } = saveQueue;
const transfer = createSaveTransfer({ development: __DEV_TEST_MODE__ });
const enqueueCurrent = (work) => {
  const epoch = worldEpoch;
  return enqueue(() => epoch === worldEpoch ? work() : undefined);
};
const longGoalsToast = '长期目标已开放';
const offlineWorkerThresholdMs = 15 * 60 * 1000;
const displayRefreshMs = 1000;

function updateSettings(draft, partial) {
  if (!partial || typeof partial !== 'object') return false;
  for (const [key, value] of Object.entries(partial)) {
    const valid = key === 'textScale' ? typeof value === 'number' && value >= 1 && value <= 2 :
      key === 'pickerIconsOnly' ? typeof value === 'boolean' :
      ['music', 'sound'].includes(key) && Number.isInteger(value) && value >= 0 && value <= 100;
    if (!valid) return false;
  }
  Object.assign(draft.settings, partial);
  return true;
}

const actions = {
  buyFacility, upgradeFacility, assignFacility, buyStation, arrangeStation, setStationPriority,
  reserve, sell, sellBatch, sellFarm, research, upgradeQuality, upgradeTech, updateSettings,
};

if (__DEV_TEST_MODE__) {
  const { grantDevelopmentTools } = await import('./game/development-tools.js');
  actions.grantDevelopmentTools = grantDevelopmentTools;
}

const px = (value) => Number.parseFloat(value) || 0;
function paint(display = world, anchor = frontAnchor) {
  const timing = display && anchor >= visibleSince ? { anchor, maxElapsed: displayRefreshMs } : undefined;
  if (layout) view.render(layout, display, status, timing);
}
function resize() {
  const css = getComputedStyle(canvas);
  const inset = Object.fromEntries(['top', 'right', 'bottom', 'left'].map((edge) =>
    [edge, px(css.getPropertyValue('--safe-' + edge))]));
  const width = Math.max(1, document.documentElement.clientWidth);
  const height = Math.max(1, window.visualViewport?.height ?? window.innerHeight);
  app.renderer.resize(width, height);
  layout = viewportLayout(width, height, inset);
  view.resize(layout);
}

function foreground(draft, deferFinalStarts = false, anchor = performance.now(), wallAt = Date.now()) {
  anchor = Math.max(anchor, frontAnchor);
  const elapsed = Math.max(0, Math.floor(anchor - frontAnchor));
  advanceWorld(draft, draft.clockMs + elapsed, { deferFinalStarts });
  draft.wallAnchorMs = Math.max(draft.wallAnchorMs, wallAt);
  return anchor;
}

async function commit(draft, anchor) {
  draft.revision = await writeWorldSave(db, draft);
  world = draft;
  frontAnchor = anchor;
  audio.configure(draft.settings);
}

function productionSummary(before, after) {
  return Object.entries(after.stats.produced).map(([id, total]) =>
    [id, total - (before.stats.produced[id] ?? 0n)]).filter(([, amount]) => amount > 0n);
}

function completedGuide(before, after) {
  return objectives(before).active && !objectives(after).active;
}

function showOffline() {
  const report = world?.pendingOffline;
  if (offlineDialogId === report?.id) return;
  offlineDialogId = report?.id;
  if (!report) { view.dismiss(); return; }
  const seconds = Math.floor(report.elapsedMs / 1000);
  const span = seconds >= 3600 ? Math.floor(seconds / 3600) + ' 小时 ' + Math.floor(seconds % 3600 / 60) + ' 分钟' :
    seconds >= 60 ? Math.floor(seconds / 60) + ' 分钟 ' + (seconds % 60) + ' 秒' : seconds + ' 秒';
  view.dialog('离开期间收获', (ui) => {
    ui.row('结算时长', span);
    for (const [title, amounts] of [['实际产出', report.produced], ['仓库净变化', report.inventoryDelta]]) {
      ui.heading(title);
      const entries = Object.entries(amounts);
      if (!entries.length) ui.text('无', { muted: true });
      for (const [id, amount] of entries) {
        ui.row(catalog.items[id].name, (amount > 0n ? '+' : '') + compact(amount), { icon: id });
      }
    }
    ui.button('知道了', ui.close, { tone: 'gold' });
  }, { center: true, available: (current) => current?.pendingOffline?.id === report.id, onClose: () => {
    const anchor = performance.now();
    const now = Date.now();
    return enqueueCurrent(() => closeOffline(report.id, anchor, now));
  } });
}

function staleSave() {
  world = null;
  status = { title: '经营记录已在其他页面更新', message: '请返回正在经营的页面继续。' };
  paint();
  showOffline();
}

function retryInitialization() {
  const failed = status;
  return enqueueCurrent(() => status === failed && initialize());
}

async function closeOffline(id, anchorAt, wallAt) {
  if (!world) return true;
  if (status?.busy) return false;
  const before = world;
  const draft = structuredClone(before);
  if (!acknowledgeOffline(draft, id)) return !draft.pendingOffline;
  try {
    const anchor = foreground(draft, false, anchorAt, wallAt);
    await commit(draft, anchor);
    offlineDialogId = undefined;
    paint();
    if (completedGuide(before, draft)) view.toast(longGoalsToast);
    return true;
  } catch (error) {
    if (error.code === 'revision-conflict') staleSave();
    else view.toast('暂时无法关闭收获汇总，请重试');
    return false;
  }
}

function settleInWorker(base, now) {
  const worker = new Worker(new URL('./platform/offline-worker.js', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = ({ data }) => resolve(data);
    worker.onerror = reject;
    worker.onmessageerror = reject;
    worker.postMessage({ base, now });
  }).finally(() => worker.terminate());
}

function settleLocally(base, now) {
  const draft = structuredClone(base);
  settleOfflineWorld(base, draft, now);
  return draft;
}

async function settleOffline(base, now, anchor) {
  let draft;
  if (now - base.wallAnchorMs >= offlineWorkerThresholdMs && typeof Worker === 'function') {
    status = { busy: true, title: '正在整理收获' };
    paint();
    try { draft = await settleInWorker(base, now); }
    catch { draft = settleLocally(base, now); }
  } else draft = settleLocally(base, now);
  await commit(draft, anchor);
  status = undefined;
  paint();
  showOffline();
  if (completedGuide(base, draft)) view.toast(longGoalsToast);
}

async function initialize(recovery) {
  status = { busy: true, title: '正在整理收获' };
  paint();
  try {
    if (!db) db = await openWorldSave(__DEV_TEST_MODE__ ? 'idle-farm-development' : undefined);
    const previous = recovery ? await restoreWorldSave(db, {
      corruptRevision: recovery.corruptRevision, backupRevision: recovery.revision,
    }) : await readWorldSave(db);
    const now = Date.now();
    const anchor = performance.now();
    await settleOffline(previous ?? newWorld(now), now, anchor);
  } catch (error) {
    if (error.code === 'revision-conflict') { staleSave(); return; }
    world = null;
    const corrupted = error.code === 'corrupt-current';
    let backup;
    let backupError;
    if (corrupted) {
      try { backup = await readWorldSave(db, 'previous'); }
      catch (failure) { backupError = failure; }
    }
    status = error.code === 'unsupported-version' || backupError?.code === 'unsupported-version'
      ? { title: '请使用更新版本', message: '这份经营记录需要更新的游戏版本。' }
      : corrupted && (!backupError || backupError.code === 'corrupt-previous') ? { title: '这份经营记录无法读取',
        message: backup ? '备份之后的经营进度可能会丢失。' : '没有可用的上次经营记录。',
        recovery: backup ? { revision: backup.revision, wallAnchorMs: backup.wallAnchorMs, corruptRevision: error.revision } : null,
        corruptRevision: error.revision, recoverable: Boolean(backup), replaceable: !backup }
        : { title: '暂时无法打开牧场', retry: retryInitialization };
    paint();
  }
}

function feedback(name, args, before, after, quality) {
  if (__DEV_TEST_MODE__ && name === 'grantDevelopmentTools') {
    return { toast: '开发测试模式：已解锁全部科技，并追加 1T 金币', sound: 'success' };
  }
  if (name === 'research') return { toast: '已研发：' + catalog.items[args[0]].name, sound: 'research' };
  if (name === 'upgradeQuality') return { float: '品质升至 ' + compact(quality.target) + ' 级', sound: 'success' };
  if (name === 'upgradeTech') return { toast: '改良已生效', sound: 'success' };
  if (name === 'sellFarm') return { toast: '新一轮经营已开始', sound: 'prestige' };
  if (name === 'sell' || name === 'sellBatch') return { float: '+' + compact(after.coins - before.coins) + ' 金币', sound: 'sell' };
  if (name === 'buyFacility') return { toast: '已' + ({ C: '购地', L: '购买畜牧场', F: '购买鱼池' })[args[0]], sound: 'success' };
  if (name === 'buyStation') return { toast: '已增设' + (args[0] === 'I' ? '加工位' : '精制位'), sound: 'success' };
  if (name === 'upgradeFacility') return { float: '已升级', sound: 'success' };
  if (name === 'reserve') return { float: '已保存保留量' };
  return {};
}

function dispatch(name, ...args) {
  const anchorAt = performance.now();
  const wallAt = Date.now();
  const epoch = worldEpoch;
  return enqueue(async () => {
    if (epoch !== worldEpoch || !world || status?.busy || !actions[name]) return { ok: false };
    try {
      const before = world;
      const draft = structuredClone(before);
      const anchor = foreground(draft, true, anchorAt, wallAt);
      const beforeAction = structuredClone(draft);
      const quality = name === 'upgradeQuality' ? qualityOffer(draft, ...args) : null;
      if (actions[name](draft, ...args) === false) {
        settleProduction(draft);
        await commit(draft, anchor);
        paint();
        const message = ['sell', 'sellBatch', 'sellFarm'].includes(name)
          ? '报价已更新，请重新确认' : '条件有变化，请重新确认';
        return { ok: false, message: completedGuide(before, draft) ? message + ' · ' + longGoalsToast : message };
      }
      settleProduction(draft);
      await commit(draft, anchor);
      if (name === 'sellFarm') view.go('牧场', { tab: '田地' });
      else paint();
      const result = feedback(name, args, beforeAction, draft, quality);
      if (completedGuide(before, draft)) result.toast = [result.toast, longGoalsToast].filter(Boolean).join(' · ');
      if (result.sound) audio.play(result.sound);
      return { ok: true, ...result };
    } catch (error) {
      if (error.code === 'revision-conflict') {
        staleSave();
        return { ok: false };
      }
      return { ok: false, message: '暂时无法保存，请稍后重试' };
    }
  });
}

function transferFailure(error, fallback) {
  if (error.code === 'revision-conflict') {
    staleSave();
    return '经营记录已在其他页面更新，请返回正在经营的页面。';
  }
  return error.userMessage ?? fallback;
}

function activateReplacement(next) {
  world = next;
  worldEpoch += 1;
  frontAnchor = performance.now();
  displayedSecond = -1;
  offlineDialogId = undefined;
  status = undefined;
  audio.configure(world.settings);
  audio.setTrack('farm');
  view.resetSession();
  paint();
  showOffline();
}

function exportSave() {
  const epoch = worldEpoch;
  return enqueue(async () => {
    if (epoch !== worldEpoch || !world || status?.busy) {
      throw saveTransferError('经营记录尚未准备好，请稍后再导出。');
    }
    try {
      const draft = structuredClone(world);
      const anchor = foreground(draft);
      await commit(draft, anchor);
      const exported = transfer.exportWorld(world);
      paint();
      return exported;
    } catch (error) {
      throw saveTransferError(transferFailure(error, '暂时无法导出存档，请稍后重试。'), error);
    }
  });
}

function importSave(candidate) {
  const epoch = worldEpoch;
  return enqueue(async () => {
    if (epoch !== worldEpoch || !world || status?.busy) {
      return { ok: false, message: '经营记录已变化，请重新读取存档。' };
    }
    try {
      const draft = transfer.resolveCandidate(candidate);
      const now = Date.now();
      if (draft.firstCompletedRunAtMs !== null && draft.firstCompletedRunAtMs > now) {
        throw saveTransferError('存档中的经营日期晚于当前时间，请核对设备时间后再导入。');
      }
      // Import the saved progress as-is; time since the export earns no extra production.
      draft.wallAnchorMs = now;
      const next = await replaceWorldSave(db, draft, world.revision);
      activateReplacement(next);
      return { ok: true, message: '存档已导入' };
    } catch (error) {
      return { ok: false, message: transferFailure(error, '暂时无法导入存档，请稍后重试。') };
    }
  });
}

function clearSave() {
  const epoch = worldEpoch;
  return enqueue(async () => {
    if (epoch !== worldEpoch || !world || status?.busy) {
      return { ok: false, message: '经营记录已变化，请重新确认。' };
    }
    try {
      const draft = newWorld(Date.now());
      const next = await replaceWorldSave(db, draft, world.revision, { clearBackup: true });
      activateReplacement(next);
      return { ok: true, message: '存档已清除，新牧场已准备好' };
    } catch (error) {
      return { ok: false, message: transferFailure(error, '暂时无法清除存档，请稍后重试。') };
    }
  });
}

const saveManagement = {
  version: transfer.version, environment: transfer.environment,
  exportSave, inspectSave: transfer.inspectSave, importSave, clearSave,
  captureImport: transfer.captureImport, readClipboard: transfer.readClipboard,
  copyText: transfer.copyText, download: transfer.download,
};

const view = createGameView(app, dispatch, () => {
  const recovery = status?.recovery;
  if (recovery) return enqueueCurrent(() => status?.recovery === recovery && initialize(recovery));
}, () => {
  const confirmation = status;
  if (!confirmation?.replaceable) return;
  return enqueueCurrent(async () => {
    if (status !== confirmation) return;
    try {
      const draft = newWorld(Date.now());
      const anchor = performance.now();
      draft.revision = await writeWorldSave(db, draft, { replaceCorrupt: true, corruptRevision: confirmation.corruptRevision });
      world = draft;
      frontAnchor = anchor;
      status = undefined;
      audio.configure(world.settings);
      paint();
    } catch (error) {
      if (error.code === 'revision-conflict') staleSave();
      else view.toast('暂时无法新建经营记录');
    }
  });
}, (page) => audio.setTrack(page === '工坊' ? 'workshop' : 'farm'), window, saveManagement);

window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
canvas.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
canvas.addEventListener('keydown', () => audio.unlock());
resize();
enqueue(() => initialize());

async function saveForeground(anchorAt, wallAt) {
  if (!world || status?.busy) return;
  const before = world;
  const draft = structuredClone(before);
  try {
    const anchor = foreground(draft, false, anchorAt, wallAt);
    const changes = productionSummary(before, draft);
    await commit(draft, anchor);
    if (visible && changes.length) audio.play(changes.some(([id]) => id[0] === 'I' || id[0] === 'P') ? 'finish' : 'harvest');
    paint();
    if (completedGuide(before, draft)) view.toast(longGoalsToast);
  } catch (error) {
    if (error.code === 'revision-conflict') staleSave();
    else if (visible) view.toast('暂时无法保存经营记录');
  }
}

setInterval(() => { if (world && visible && !status?.busy && !saveQueue.pending) enqueueCurrent(saveForeground); }, 5000);
app.ticker.add(() => {
  if (!world || !visible || status?.busy || saveQueue.pending) return;
  const now = performance.now();
  const second = Math.floor(now / displayRefreshMs);
  if (displayedSecond === second) return;
  displayedSecond = second;
  const display = structuredClone(world);
  const anchor = foreground(display, false, now);
  paint(display, anchor);
});

async function resumeOffline(anchor, now) {
  if (!world) return;
  try {
    await settleOffline(world, now, Math.max(anchor, frontAnchor));
  } catch (error) {
    if (error.code === 'revision-conflict') staleSave();
    else {
      const failure = { busy: true, title: '暂时无法保存离线收获', retry: () =>
        enqueueCurrent(() => status === failure && resumeOffline(anchor, now)) };
      status = failure;
      paint();
    }
  }
}

document.addEventListener('visibilitychange', () => {
  const becameVisible = !document.hidden;
  const anchor = performance.now();
  visible = becameVisible;
  visibleSince = visible ? anchor : Infinity;
  view.pauseProgress();
  audio.setVisible(visible);
  const now = Date.now();
  enqueueCurrent(() => becameVisible ? resumeOffline(anchor, now) : saveForeground(anchor, now));
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', document.baseURI)).catch(() => {});
}
