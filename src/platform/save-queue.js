export function createSaveQueue() {
  let tail = Promise.resolve();
  let pending = 0;
  return {
    get pending() { return pending > 0; },
    enqueue(work) {
      pending += 1;
      const result = tail.then(() => work()).finally(() => { pending -= 1; });
      tail = result.catch(() => {});
      return result;
    },
  };
}
