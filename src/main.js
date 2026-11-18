import { AccessibilitySystem, Application, extensions } from 'pixi.js';
import {
  advanceWorld, newWorld, settleProduction, catalog,
  buyFacility, upgradeFacility, assignFacility, clearFacility, buyStation, upgradeStation, arrangeStation, clearStation,
  assignProductionBatch, clearProductionBatch, upgradeProductionBatch,
  setStationPriority, reserve, sell, sellBatch, sellFarm, synchronizeWorldCalendar,
} from './game/world.js';
import { research, researchHourMs, upgradeTech } from './game/advancement.js';
import { resetMarket } from './game/market.js';
import { buyMerchant, reserveMerchantSale, restockMerchant, sellMerchant, visitMerchant } from './game/merchant.js';
import { drawQuality } from './game/quality.js';
import { objectives, settleTaskRewards } from './game/objectives.js';
import { viewportLayout } from './platform/layout.js';
import {
  openWorldSave, readWorldSave, writeWorldSave, restoreWorldSave, settleOfflineWorld, acknowledgeOffline,
  replaceWorldSave, initializeAccountSeed,
} from './platform/world-save.js';
import { createSaveQueue } from './platform/save-queue.js';
import { createSaveTransfer, saveFormatMessage, saveTransferError } from './platform/save-transfer.js';
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
let nextDisplayAt = 0;
let visible = !document.hidden;
let visibleSince = visible ? performance.now() : Infinity;
let offlineDialogId;
let currentPage;
let pendingMerchantReleases = 0;
let deferredMerchantRelease;
let uncommittedProgress;
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
    const valid = key === 'pickerIconsOnly' ? typeof value === 'boolean' :
      ['music', 'sound'].includes(key) && Number.isInteger(value) && value >= 0 && value <= 100;
    if (!valid) return false;
  }
  Object.assign(draft.settings, partial);
  return true;
}

const productionBatchActions = { assignProductionBatch, clearProductionBatch, upgradeProductionBatch };
const actions = {
  buyFacility, upgradeFacility, assignFacility, clearFacility, buyStation, upgradeStation, arrangeStation, clearStation,
  ...productionBatchActions,
  setStationPriority, reserve, sell, sellBatch, sellFarm, research, drawQuality, upgradeTech, resetMarket, updateSettings,
  buyMerchant, sellMerchant, restockMerchant, visitMerchant,
};
const merchantActions = new Set(['buyMerchant', 'sellMerchant', 'restockMerchant', 'visitMerchant', 'reserveMerchantSale']);

if (__DEV_TEST_MODE__) {
  const { grantDevelopmentTools } = await import('./game/development-tools.js');
  actions.grantDevelopmentTools = grantDevelopmentTools;
}

const px = (value) => Number.parseFloat(value) || 0;
const copySlots = (groups) => Object.fromEntries(Object.entries(groups).map(([kind, slots]) =>
  [kind, slots.map((slot) => ({ ...slot }))]));
// Copy the mutable parts used by production projections and transient reservation changes.
// Advance and restart replace slot batch/planting/mining objects, write inventory and stats.produced
// entries, and replace top-level fields, including merchant and ledger.
function projectWorld(source) {
  return {
    ...source,
    inventory: { ...source.inventory },
    stats: { ...source.stats, produced: { ...source.stats.produced } },
    facilities: copySlots(source.facilities),
    stations: copySlots(source.stations),
  };
}
function paint() {
  let display = world;
  let anchor = frontAnchor;
  // An earlier save can still be in flight when navigation leaves the merchant.
  // Wait for the queued release before projecting production past that departure.
  const releasing = display?.merchantHold && pendingMerchantReleases > 0;
  if (releasing) {
    display = { ...display };
    reserveMerchantSale(display, null);
  }
  const live = display && !releasing && visible && !status?.busy && Number.isFinite(frontAnchor) && frontAnchor >= visibleSince;
  if (live) {
    const now = performance.now();
    display = projectWorld(world);
    advanceForeground(display, false, now);
    // The projection stores whole milliseconds; keep the remaining frame phase in its anchor.
    anchor = frontAnchor + (display.clockMs - world.clockMs);
  }
  const timing = live ? { anchor, epoch: worldEpoch } : undefined;
  if (layout) view.render(layout, display, status, timing);
  nextDisplayAt = Infinity;
  if (!live) return;
  let nextEnd = Infinity;
  for (const groups of [display.facilities, display.stations]) {
    for (const slots of Object.values(groups)) {
      for (const slot of slots) {
        if (slot.batch && slot.batch.end > display.clockMs) nextEnd = Math.min(nextEnd, slot.batch.end);
      }
    }
  }
  // Reproject at the actual production boundary, even between regular snapshots.
  nextDisplayAt = anchor + Math.min(displayRefreshMs, nextEnd - display.clockMs,
    researchHourMs - display.basicResearchElapsedMs);
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

function advanceForeground(draft, deferFinalStarts, anchor) {
  anchor = Math.max(anchor, frontAnchor);
  const elapsed = Math.max(0, Math.floor(anchor - frontAnchor));
  advanceWorld(draft, draft.clockMs + elapsed, { deferFinalStarts });
  return anchor;
}

function foreground(draft, deferFinalStarts = false, anchor = performance.now(), wallAt = Date.now()) {
  const advanced = advanceForeground(draft, deferFinalStarts, anchor);
  draft.wallAnchorMs = Math.max(draft.wallAnchorMs, wallAt);
  const held = draft.merchantHold;
  synchronizeWorldCalendar(draft, wallAt);
  if (!deferFinalStarts && held && !draft.merchantHold) settleProduction(draft);
  return advanced;
}

async function commit(draft, anchor, options, initialBase) {
  const before = world;
  const progressBefore = uncommittedProgress ?? before ?? initialBase;
  const rewards = settleTaskRewards(draft);
  draft.revision = await writeWorldSave(db, draft, options);
  world = draft;
  uncommittedProgress = undefined;
  frontAnchor = anchor;
  audio.configure(draft.settings);
  const batch = draft.merchant.batch;
  if (before && before.completedRuns === draft.completedRuns && batch && batch.id !== before.merchant.batch?.id &&
      currentPage === '行脚商') {
    if (view.merchantBatchChanged(showOffline)) offlineDialogId = undefined;
  }
  return progressBefore ? progressToast(progressBefore, draft, rewards) : '';
}

function changeMerchantReservation(hold, anchorAt, wallAt) {
  const previous = world.merchantHold;
  const unchanged = previous && hold?.id === previous.id && hold.count === previous.count &&
    hold.run === previous.run && hold.batchId === previous.batchId;
  if (unchanged || hold === null && !previous) return { ok: true };
  // Match a normal action's production boundary without issuing an IndexedDB write for every selection.
  const draft = projectWorld(world);
  advanceForeground(draft, true, anchorAt);
  draft.wallAnchorMs = Math.max(draft.wallAnchorMs, wallAt);
  const ok = reserveMerchantSale(draft, hold);
  settleProduction(draft);
  uncommittedProgress ??= world;
  // Keep the sub-millisecond remainder across frequent slider updates.
  frontAnchor += draft.clockMs - world.clockMs;
  world = draft;
  paint();
  return { ok };
}

function releaseMerchantReservation(anchorAt, wallAt, visibleFrom) {
  if (!world?.merchantHold) return;
  if (!status?.busy && frontAnchor >= visibleFrom) {
    changeMerchantReservation(null, anchorAt, wallAt);
    return;
  }
  // Resume may still need this hold for production before the departure, even after a save retry.
  deferredMerchantRelease = { hold: world.merchantHold, anchorAt, wallAt };
  world = { ...world };
  reserveMerchantSale(world, null);
  paint();
}

function enqueueMerchantRelease(anchorAt, wallAt) {
  const visibleFrom = visibleSince;
  const epoch = worldEpoch;
  pendingMerchantReleases += 1;
  if (world?.merchantHold) queueMicrotask(paint);
  return enqueue(() => {
    pendingMerchantReleases -= 1;
    if (epoch !== worldEpoch) return { ok: false };
    releaseMerchantReservation(anchorAt, wallAt, visibleFrom);
    return { ok: true };
  });
}

// Committed worlds are never mutated, so each one's guide state is evaluated at most once.
const guideActivity = new WeakMap();
function guideActive(state) {
  if (!guideActivity.has(state)) guideActivity.set(state, objectives(state).active);
  return guideActivity.get(state);
}

function completedGuide(before, after) {
  return guideActive(before) && !guideActive(after);
}

function taskRewardText(rewards) {
  const parts = [];
  if (rewards?.coins > 0n) parts.push('+' + compact(rewards.coins) + ' 金币');
  if (rewards?.researchPoints > 0n) parts.push('+' + compact(rewards.researchPoints) + ' 高级研发点');
  return parts.length ? '任务奖励 ' + parts.join(' ') : '';
}

function progressToast(before, after, rewards) {
  return [completedGuide(before, after) ? longGoalsToast : '', taskRewardText(rewards)]
    .filter(Boolean).join(' · ');
}

function showOffline() {
  const report = world?.pendingOffline;
  // A native file window can hide the document; keep its import flow in front.
  if (!report || view.isImportingSave() || view.hasMerchantRefreshNotice()) return;
  if (offlineDialogId === report.id) return;
  offlineDialogId = report.id;
  const seconds = Math.floor(report.elapsedMs / 1000);
  const span = seconds >= 3600 ? Math.floor(seconds / 3600) + ' 小时 ' + Math.floor(seconds % 3600 / 60) + ' 分钟' :
    seconds >= 60 ? Math.floor(seconds / 60) + ' 分钟 ' + (seconds % 60) + ' 秒' : seconds + ' 秒';
  view.dialog('离开期间收获', (ui) => {
    ui.row('结算时长', span);
    for (const [title, amounts] of [['实际产出', report.produced], ['仓库净变化', report.inventoryDelta]]) {
      ui.heading(title);
      const entries = Object.entries(amounts);
      if (!entries.length) ui.text('无', { muted: true });
      else ui.scrollList(entries, (cell, [id, amount]) => {
        cell.row(catalog.items[id].name, (amount > 0n ? '+' : '') + compact(amount), { icon: id });
      });
    }
    ui.button('知道了', ui.close, { tone: 'gold' });
  }, { center: true, flow: 'offline-report', available: (current) => current?.pendingOffline?.id === report.id, onClose: () => {
    const anchor = performance.now();
    const now = Date.now();
    return enqueueCurrent(() => closeOffline(report.id, anchor, now));
  } });
}

function staleSave() {
  world = null;
  uncommittedProgress = undefined;
  deferredMerchantRelease = undefined;
  offlineDialogId = undefined;
  status = { title: '经营记录已在其他页面更新', message: '请返回正在经营的页面继续。' };
  paint();
  view.dismiss();
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
    const toast = await commit(draft, anchor);
    offlineDialogId = undefined;
    paint();
    if (toast) view.toast(toast);
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
  const release = deferredMerchantRelease;
  const endsOffline = release && release.anchorAt <= anchor;
  const snapshot = release ? { ...base, merchantHold: release.hold } : base;
  if (endsOffline) snapshot.merchantHoldEndsAt = Math.min(release.wallAt, now);
  let draft;
  if (now - base.wallAnchorMs >= offlineWorkerThresholdMs && typeof Worker === 'function') {
    status = { busy: true, title: '正在整理收获' };
    paint();
    try { draft = await settleInWorker(snapshot, now); }
    catch { draft = settleLocally(snapshot, now); }
  } else draft = settleLocally(snapshot, now);
  if (release && !endsOffline) {
    const elapsed = Math.floor(release.anchorAt - anchor);
    advanceWorld(draft, draft.clockMs + elapsed, { deferFinalStarts: true });
    reserveMerchantSale(draft, null);
    draft.wallAnchorMs = Math.max(draft.wallAnchorMs, release.wallAt);
    synchronizeWorldCalendar(draft, release.wallAt);
    settleProduction(draft);
    anchor = release.anchorAt;
  }
  if (currentPage === '行脚商') visitMerchant(draft);
  const toast = await commit(draft, anchor, undefined, base);
  deferredMerchantRelease = undefined;
  status = undefined;
  paint();
  showOffline();
  if (toast) view.toast(toast);
}

async function initialize(recovery) {
  status = { busy: true, title: '正在整理收获' };
  paint();
  try {
    if (!db) db = await openWorldSave({ development: __DEV_TEST_MODE__ });
    const previous = recovery ? await restoreWorldSave(db, {
      corruptRevision: recovery.corruptRevision, backupRevision: recovery.revision,
    }) : await readWorldSave(db);
    const now = Date.now();
    const anchor = performance.now();
    const base = previous ?? newWorld(now, null);
    initializeAccountSeed(base);
    await settleOffline(base, now, anchor);
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
    const versionError = backupError ?? error;
    status = versionError.code === 'unsupported-version'
      ? { title: '这份经营记录无法读取', message: saveFormatMessage }
      : corrupted && (!backupError || backupError.code === 'corrupt-previous') ? { title: '这份经营记录无法读取',
        message: backup ? '备份之后的经营进度可能会丢失。' : '没有可用的上次经营记录。',
        recovery: backup ? { revision: backup.revision, wallAnchorMs: backup.wallAnchorMs, corruptRevision: error.revision } : null,
        corruptRevision: error.revision, recoverable: Boolean(backup), replaceable: !backup }
        : { title: '暂时无法打开庄园', retry: retryInitialization };
    paint();
  }
}

function feedback(name, args, revenueBefore, after, actionResult) {
  if (__DEV_TEST_MODE__ && name === 'grantDevelopmentTools') {
    return { toast: '开发测试模式：已解锁全部科技，并追加 1T 金币', sound: 'success' };
  }
  if (name === 'research') return { toast: '已研发：' + catalog.items[args[0]].name, sound: 'research' };
  if (name === 'drawQuality') return { sound: 'success', qualityDraw: actionResult };
  if (name === 'resetMarket') return { toast: '今日行情已重置', sound: 'success' };
  if (name === 'buyMerchant' || name === 'sellMerchant') {
    const { id, count, total } = args[0];
    const buying = name === 'buyMerchant';
    return { toast: (buying ? '已买入 ' : '已卖出 ') + compact(count) + ' 件' + catalog.items[id].name +
      ' · ' + (buying ? '−' : '+') + compact(total) + ' 金币', sound: buying ? 'success' : 'sell' };
  }
  if (name === 'restockMerchant') return { sound: 'success' };
  if (name === 'upgradeTech') return { toast: '改良已生效', sound: 'success' };
  if (name === 'sellFarm') return { toast: '新一轮经营已开始', sound: 'prestige' };
  if (name === 'sell' || name === 'sellBatch') return { float: '+' + compact(after.stats.revenue - revenueBefore) + ' 金币', sound: 'sell' };
  if (name === 'buyFacility') return { toast: '已' + ({ C: '购地', L: '购买养殖场', F: '购买鱼池', M: '购买矿洞' })[args[0]], sound: 'success' };
  if (name === 'buyStation') return { toast: '已增设' + (args[0] === 'I' ? '加工位' : '精制位'), sound: 'success' };
  if (name === 'upgradeFacility' || name === 'upgradeStation' || name === 'upgradeProductionBatch') {
    return { float: '已升级', sound: 'success' };
  }
  if (name === 'assignProductionBatch') return { float: '已安排' };
  if (name === 'clearProductionBatch') return { float: '已清空' };
  if (name === 'reserve') return { float: '已保存保留量' };
  return {};
}

function dispatch(name, ...args) {
  const releasesHold = name === 'reserveMerchantSale' && args[0] === null;
  if (merchantActions.has(name) && (currentPage !== '行脚商' || !visible && !releasesHold)) {
    return Promise.resolve({ ok: false });
  }
  const anchorAt = performance.now();
  const wallAt = Date.now();
  if (releasesHold) return enqueueMerchantRelease(anchorAt, wallAt);
  const epoch = worldEpoch;
  return enqueue(async () => {
    if (epoch !== worldEpoch || !world || status?.busy) return { ok: false };
    try {
      if (name === 'reserveMerchantSale') return changeMerchantReservation(args[0], anchorAt, wallAt);
      if (!Object.hasOwn(actions, name)) return { ok: false };
      const draft = structuredClone(world);
      const anchor = foreground(draft, true, anchorAt, wallAt);
      // Feedback reads only the revenue before the action; a BigInt needs no copy.
      const revenueBefore = draft.stats.revenue;
      const actionResult = actions[name](draft, ...args);
      if (actionResult === false) {
        settleProduction(draft);
        const toast = await commit(draft, anchor);
        paint();
        if (name === 'visitMerchant') return { ok: true, toast };
        if (name === 'buyMerchant' || name === 'sellMerchant') return { ok: false, toast };
        const message = ['sell', 'sellBatch', 'sellFarm', 'drawQuality', 'upgradeProductionBatch'].includes(name)
          ? '报价已更新，请重新确认' : '条件有变化，请重新确认';
        return { ok: false, message: toast ? message + ' · ' + toast : message };
      }
      if (!Object.hasOwn(productionBatchActions, name)) settleProduction(draft);
      const toast = await commit(draft, anchor);
      if (name === 'sellFarm') {
        worldEpoch += 1;
        nextDisplayAt = 0;
        view.resetSession();
      }
      paint();
      const result = feedback(name, args, revenueBefore, draft, actionResult);
      result.toast = [result.toast, toast].filter(Boolean).join(' · ');
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
  uncommittedProgress = undefined;
  deferredMerchantRelease = undefined;
  worldEpoch += 1;
  frontAnchor = performance.now();
  nextDisplayAt = 0;
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
      const toast = await commit(draft, anchor);
      const exported = transfer.exportWorld(world);
      paint();
      if (toast) view.toast(toast);
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
      // Import the saved progress as-is; time since the export earns no extra production.
      draft.wallAnchorMs = Date.now();
      initializeAccountSeed(draft);
      synchronizeWorldCalendar(draft, draft.wallAnchorMs);
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
      const draft = newWorld(Date.now(), null);
      initializeAccountSeed(draft);
      synchronizeWorldCalendar(draft, draft.wallAnchorMs);
      settleTaskRewards(draft);
      const next = await replaceWorldSave(db, draft, world.revision, { clearBackup: true });
      activateReplacement(next);
      return { ok: true, message: '存档已清除，新庄园已准备好' };
    } catch (error) {
      return { ok: false, message: transferFailure(error, '暂时无法清除存档，请稍后重试。') };
    }
  });
}

const saveManagement = {
  version: transfer.version, environment: transfer.environment,
  exportSave, inspectSave: transfer.inspectSave, importSave, clearSave,
  captureImport: transfer.captureImport, readImportFile: transfer.readImportFile, readClipboard: transfer.readClipboard,
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
      const draft = newWorld(Date.now(), null);
      initializeAccountSeed(draft);
      synchronizeWorldCalendar(draft, draft.wallAnchorMs);
      const anchor = performance.now();
      await commit(draft, anchor, { replaceCorrupt: true, corruptRevision: confirmation.corruptRevision });
      status = undefined;
      paint();
    } catch (error) {
      if (error.code === 'revision-conflict') staleSave();
      else view.toast('暂时无法新建经营记录');
    }
  });
}, (page) => {
  const wasAtMerchant = currentPage === '行脚商';
  const atMerchant = page === '行脚商';
  currentPage = page;
  audio.setTrack(page === '工坊' ? 'workshop' : 'farm');
  if (wasAtMerchant && !atMerchant) {
    void enqueueMerchantRelease(performance.now(), Date.now());
  }
  if (!wasAtMerchant && atMerchant && world && visible && !status?.busy) {
    dispatch('visitMerchant').then(({ message, toast }) => {
      if (message || toast) view.toast(message || toast);
    });
  }
}, window, saveManagement);

window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
canvas.addEventListener('pointerdown', () => audio.unlock(), { passive: true });
canvas.addEventListener('keydown', () => audio.unlock());
resize();
enqueue(() => initialize());

async function saveForeground(anchorAt, wallAt) {
  if (!world || status?.busy) return;
  const draft = structuredClone(world);
  try {
    const anchor = foreground(draft, false, anchorAt, wallAt);
    const toast = await commit(draft, anchor);
    paint();
    if (visible) showOffline();
    if (toast) view.toast(toast);
  } catch (error) {
    if (error.code === 'revision-conflict') staleSave();
    else if (visible) view.toast('暂时无法保存经营记录');
  }
}

setInterval(() => { if (world && visible && !status?.busy && !saveQueue.pending) enqueueCurrent(saveForeground); }, 5000);
app.ticker.add(() => {
  if (!world || !visible || status?.busy || frontAnchor < visibleSince) return;
  const now = performance.now();
  if (now < nextDisplayAt) return;
  paint();
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
