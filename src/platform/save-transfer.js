import catalog from '../content/game-data.json' with { type: 'json' };
import { decodeWorldRecord, encodeWorldRecord } from './world-save.js';

const format = 'idle-farm-save';
const formatVersion = 1;
const schemaVersion = 2;
const gameVersion = catalog.version ?? '1.14';

export function saveTransferError(message, cause, code) {
  const error = new Error(message, { cause });
  error.userMessage = message;
  if (code) error.code = code;
  return error;
}

export function createSaveTransfer({ development = false, browser = window } = {}) {
  const environment = development ? 'development' : 'production';
  const candidates = new WeakMap();
  const clipboard = () => browser.navigator?.clipboard;

  function decode(text) {
    let packet;
    try { packet = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch (cause) { throw saveTransferError('存档内容无法读取，请选择完整的存档文件。', cause, 'import-invalid-json'); }
    if (!packet || typeof packet !== 'object' || Array.isArray(packet) || packet.format !== format) {
      throw saveTransferError('这不是放置农场导出的存档文件，请重新选择。', undefined, 'import-invalid-format');
    }
    if (packet.formatVersion !== formatVersion || packet.gameVersion !== gameVersion ||
        packet.schemaVersion !== schemaVersion) {
      throw saveTransferError('存档版本不一致，只能导入当前版本的存档。', undefined, 'import-version-mismatch');
    }
    if (packet.environment !== environment) {
      throw saveTransferError('存档环境不一致，开发存档与正式存档不能互相导入。', undefined, 'import-environment-mismatch');
    }
    if (!packet.record || typeof packet.record !== 'object' || Array.isArray(packet.record)) {
      throw saveTransferError('存档数据不完整或已损坏，无法导入。', undefined, 'import-corrupt-record');
    }
    if (packet.record.schemaVersion !== schemaVersion) {
      throw saveTransferError('存档版本不一致，只能导入当前版本的存档。', undefined, 'import-version-mismatch');
    }
    try { return decodeWorldRecord(packet.record); }
    catch (cause) { throw saveTransferError('存档数据不完整或已损坏，无法导入。', cause, 'import-corrupt-record'); }
  }

  function inspectSave(text) {
    if (typeof text !== 'string' || !text.trim()) {
      throw saveTransferError('存档内容为空，请重新选择文件或粘贴完整存档。', undefined, 'import-empty');
    }
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

  async function readImportFile(file) {
    if (!file || file.size === 0) {
      throw saveTransferError('存档文件为空，请重新选择完整的存档文件。', undefined, 'import-empty');
    }
    try {
      let text;
      if (typeof file.text === 'function') text = await file.text();
      else if (typeof browser.FileReader === 'function') {
        text = await new Promise((resolve, reject) => {
          const reader = new browser.FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.onabort = () => reject(new Error('File reading cancelled'));
          reader.readAsText(file, 'UTF-8');
        });
      } else {
        throw saveTransferError('当前浏览器无法读取存档文件，请改用粘贴存档文本。', undefined, 'import-read-unsupported');
      }
      if (typeof text !== 'string' || !text.trim()) {
        throw saveTransferError('存档文件为空，请重新选择完整的存档文件。', undefined, 'import-empty');
      }
      return text;
    } catch (cause) {
      if (cause?.userMessage) throw cause;
      throw saveTransferError('无法读取所选存档文件，请重新选择或改用粘贴导入。', cause, 'import-read-failed');
    }
  }

  async function captureImport() {
    if (typeof browser.showOpenFilePicker !== 'function') {
      throw saveTransferError('当前浏览器不支持文件选择，请在此面板粘贴存档文本，或拖入 JSON 文件。',
        undefined, 'import-picker-unsupported');
    }
    let handle;
    try {
      [handle] = await browser.showOpenFilePicker({
        multiple: false,
        types: [{ description: '放置农场存档', accept: { 'application/json': ['.json'] } }],
      });
    } catch (cause) {
      // 空结果只表示未取得文件，不据此判定用户取消了选择。
      if (cause?.name === 'AbortError') return null;
      if (cause?.name === 'NotAllowedError' || cause?.name === 'SecurityError') {
        throw saveTransferError('当前页面未获准选择存档文件，可能受隐私模式或权限限制。请在此面板粘贴存档文本，或拖入 JSON 存档文件。',
          cause, 'import-picker-denied');
      }
      throw saveTransferError('无法打开存档文件选择器，请重试，或在此面板粘贴存档文本／拖入 JSON 存档文件。', cause, 'import-picker-failed');
    }
    if (!handle) return null;
    let file;
    try { file = await handle.getFile(); }
    catch (cause) {
      throw saveTransferError('无法访问所选存档文件，可能受隐私模式或权限限制。请重新选择，或在此面板粘贴存档文本／拖入 JSON 存档文件。', cause, 'import-read-denied');
    }
    return readImportFile(file);
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
    captureImport, readImportFile, readClipboard, copyText, download,
  };
}
