const checkIntervalMs = 15 * 60 * 1000;
const foregroundCheckGapMs = 60 * 1000;
const takeoverTimeoutMs = 12000;
const staleMessage = '版本已变化，请稍后再试。';

// Updates are optional: registration/check failures must never block the game.
export function startPwaUpdates({ serviceWorker, scriptURL, save, canPrompt, showPrompt, reload }) {
  let registration;
  let checking;
  let lastCheckAt = -Infinity;
  let candidate;
  let prompt;
  let promptTimer;
  let accepting = false;
  let reloaded = false;
  const watched = new WeakSet();
  const prompted = new WeakSet();

  const waiting = () => registration?.waiting?.state === 'installed' && serviceWorker.controller
    ? registration.waiting : undefined;
  const isCurrent = (worker) => waiting() === worker;
  const isTakingOver = (worker) => registration?.active === worker &&
    (worker.state === 'activating' || worker.state === 'activated');
  const isAvailable = (worker) => candidate === worker && (isCurrent(worker) || isTakingOver(worker));

  function schedulePrompt() {
    if (promptTimer || !candidate || prompted.has(candidate)) return;
    promptTimer = setTimeout(() => {
      promptTimer = undefined;
      refresh(false);
      const worker = candidate;
      if (!worker || prompted.has(worker) || accepting) return;
      if (canPrompt()) {
        const shown = showPrompt({
          isAvailable: () => isAvailable(worker),
          accept: () => accept(worker),
        });
        if (shown) {
          prompted.add(worker);
          prompt = { worker, view: shown };
          return;
        }
      }
      schedulePrompt();
    }, 1000);
  }

  function refresh(schedule = true) {
    // A known update remains actionable after another tab activates it. Never
    // manufacture a candidate from active alone: that would offer first installs.
    const next = waiting() ?? (candidate && isTakingOver(candidate) ? candidate : undefined);
    if (candidate !== next) {
      if (prompt && prompt.worker !== next) prompt.view.invalidate?.();
      candidate = next;
    }
    if (schedule) schedulePrompt();
  }

  function watch(worker) {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', refresh);
  }

  function takeOver(worker) {
    return new Promise((resolve) => {
      let finished = false;
      let timer;
      const finish = (ok) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        serviceWorker.removeEventListener('controllerchange', changed);
        worker.removeEventListener('statechange', changed);
        registration.removeEventListener('updatefound', changed);
        resolve(ok);
      };
      const changed = () => {
        if (worker.state === 'redundant' || !isAvailable(worker)) { finish(false); return; }
        if (serviceWorker.controller === worker) { finish(true); return; }
      };
      // Subscribe before both the identity check and postMessage: another tab may
      // already be activating this exact worker while the save is in flight.
      serviceWorker.addEventListener('controllerchange', changed);
      worker.addEventListener('statechange', changed);
      registration.addEventListener('updatefound', changed);
      timer = setTimeout(() => finish(false), takeoverTimeoutMs);
      changed();
      if (finished) return;
      if (isCurrent(worker)) {
        try { worker.postMessage({ type: 'IDLE_MANOR_ACTIVATE_UPDATE' }); }
        catch { finish(false); }
      }
    });
  }

  async function accept(worker) {
    if (accepting || reloaded || !isAvailable(worker)) return { ok: false, message: staleMessage };
    accepting = true;
    try {
      // Only a completed save transaction permits activation or reload. Undefined
      // (including an obsolete queued world epoch) is deliberately not success.
      if (await save() !== true) return { ok: false, message: '暂时无法保存，请稍后重试。' };
      if (document.hidden) return { ok: false, message: '请回到游戏后再试。' };
      if (!isAvailable(worker)) {
        return { ok: false, message: staleMessage };
      }
      if (!await takeOver(worker)) return { ok: false, message: '暂时无法更新，请稍后重试。' };
      if (!reloaded) {
        reloaded = true;
        reload();
      }
      return { ok: true };
    } catch {
      return { ok: false, message: '暂时无法更新，请稍后重试。' };
    } finally {
      accepting = false;
      refresh();
    }
  }

  async function check() {
    if (!registration || checking || document.hidden) return;
    if (performance.now() - lastCheckAt < foregroundCheckGapMs) { refresh(); return; }
    lastCheckAt = performance.now();
    checking = registration.update().catch(() => {}).finally(() => {
      checking = undefined;
      refresh();
    });
    await checking;
  }

  serviceWorker.addEventListener('controllerchange', refresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { refresh(); void check(); }
  });
  setInterval(() => { void check(); }, checkIntervalMs);
  serviceWorker.register(scriptURL, { updateViaCache: 'none' }).then((registered) => {
    registration = registered;
    registration.addEventListener('updatefound', () => {
      watch(registration.installing);
      refresh();
    });
    watch(registration.installing);
    watch(registration.waiting);
    refresh();
    void check();
  }).catch(() => {});
}
