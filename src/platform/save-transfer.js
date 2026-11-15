import catalog from '../content/game-data.json' with { type: 'json' };
import { decodeWorldRecord, encodeWorldRecord } from './world-save.js';

const format = 'idle-farm-save';
const formatVersion = 1;
const schemaVersion = 2;
const gameVersion = catalog.version ?? '1.14';

export function saveTransferError(message, cause) {
  const error = new Error(message, { cause });
  error.userMessage = message;
  return error;
}

export function createSaveTransfer({ development = false, browser = window } = {}) {
  const environment = development ? 'development' : 'production';
  const candidates = new WeakMap();
  const clipboard = () => browser.navigator?.clipboard;

  function decode(text) {
    let packet;
    try { packet = JSON.parse(text); }
    catch (cause) { throw saveTransferError('存档内容无法读取，请选择完整的存档文件。', cause); }
    if (!packet || packet.format !== format || packet.formatVersion !== formatVersion ||
        packet.gameVersion !== gameVersion || packet.schemaVersion !== schemaVersion ||
        packet.record?.schemaVersion !== schemaVersion) {
      throw saveTransferError('存档版本不一致，只能导入当前版本的存档。');
    }
    if (packet.environment !== environment) {
      throw saveTransferError('存档环境不一致，开发存档与正式存档不能互相导入。');
    }
    try { return decodeWorldRecord(packet.record); }
    catch (cause) { throw saveTransferError('存档数据不完整或已损坏，无法导入。', cause); }
  }

  function inspectSave(text) {
    if (typeof text !== 'string' || !text.trim()) throw saveTransferError('请先选择或粘贴存档内容。');
    const world = decode(text);
    const candidate = {
      world,
      version: gameVersion,
      summary: {
        coins: world.coins, researchPoints: world.researchPoints,
        facilities: Object.values(world.facilities).reduce((total, entries) => total + entries.length, 0),
        unlocked: world.unlocked.length, completedRuns: world.completedRuns,
        clockMs: world.clockMs, environment,
      },
    };
    candidates.set(candidate, text);
    return candidate;
  }

  function resolveCandidate(candidate) {
    const text = candidate && candidates.get(candidate);
    if (!text) throw saveTransferError('请重新读取存档后再确认导入。');
    return decode(text);
  }

  function exportWorld(world) {
    let text;
    try {
      text = JSON.stringify({
        format, formatVersion, gameVersion, schemaVersion, environment,
        record: encodeWorldRecord(world),
      });
    } catch (cause) { throw saveTransferError('暂时无法整理存档，请稍后重试。', cause); }
    return {
      filename: `idle-farm-${gameVersion}-${environment}-${new Date().toISOString().replaceAll(':', '-')}.json`,
      text,
    };
  }

  async function captureImport() {
    if (typeof browser.showOpenFilePicker !== 'function') {
      throw saveTransferError('当前浏览器不支持选择存档文件，请使用粘贴或拖入存档。');
    }
    try {
      const [handle] = await browser.showOpenFilePicker({
        multiple: false,
        types: [{ description: '放置农场存档', accept: { 'application/json': ['.json'] } }],
      });
      if (!handle) return null;
      return await (await handle.getFile()).text();
    } catch (cause) {
      if (cause.name === 'AbortError') return null;
      throw saveTransferError('无法读取存档文件，请重试或使用粘贴导入。', cause);
    }
  }

  async function readClipboard() {
    try {
      if (!clipboard()?.readText) throw new Error('Clipboard unavailable');
      return await clipboard().readText();
    } catch (cause) { throw saveTransferError('无法读取剪贴板，请在存档面板粘贴或拖入文件。', cause); }
  }

  async function copyText(text) {
    try {
      if (!clipboard()?.writeText) throw new Error('Clipboard unavailable');
      await clipboard().writeText(text);
    } catch (cause) { throw saveTransferError('无法复制存档，请使用下载保存。', cause); }
  }

  async function download({ filename, text }) {
    let url;
    try {
      url = browser.URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
      const link = browser.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    } catch (cause) { throw saveTransferError('无法下载存档，请使用复制保存。', cause); }
    finally { if (url) browser.setTimeout(() => browser.URL.revokeObjectURL(url), 60000); }
  }

  return {
    version: gameVersion, environment, inspectSave, resolveCandidate, exportWorld,
    captureImport, readClipboard, copyText, download,
  };
}
