// Initial-page work is measured by completed real tasks, never by elapsed time.
// The registry is discarded once the opening screen has finished.
export function createLoadingTasks(onChange) {
  const entries = new Map();
  let active = true;
  let version = 0;
  const changed = () => { version += 1; onChange?.(); };
  return {
    get active() { return active; },
    get version() { return version; },
    snapshot() {
      const tasks = [...entries.values()];
      return { total: tasks.length, done: tasks.filter((task) => task.state === 'done').length,
        pending: tasks.some((task) => task.state === 'pending'),
        failed: tasks.filter((task) => task.state === 'failed') };
    },
    run(key, work) {
      if (!active) return Promise.resolve().then(work);
      const existing = entries.get(key);
      if (existing) return existing.promise;
      const task = { key, state: 'pending' };
      entries.set(key, task);
      changed();
      task.promise = Promise.resolve().then(work).then((value) => {
        task.state = 'done'; changed(); return value;
      }, (error) => {
        task.state = 'failed'; task.error = error; changed(); throw error;
      });
      return task.promise;
    },
    state(key) { return entries.get(key)?.state; },
    async settlePending() {
      // Dependent image tasks can be discovered by preparation continuations.
      while ([...entries.values()].some((task) => task.state === 'pending')) {
        await Promise.allSettled([...entries.values()].filter((task) => task.state === 'pending').map((task) => task.promise));
      }
    },
    clearFailures(keys) {
      for (const [key, task] of entries) if (task.state === 'failed' && (!keys || keys.has(key))) entries.delete(key);
      changed();
    },
    finish() { active = false; entries.clear(); },
  };
}

export function loadWithDeadline(work, timeoutMs = 25000) {
  let timer;
  return Promise.race([
    Promise.resolve().then(work),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('资源加载超时')), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
}
