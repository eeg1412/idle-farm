const storeName = 'records';
const decimal = (value) => value.toString();

export function encode(state) {
  const counters = Object.fromEntries(Object.entries(state.stats)
    .map(([key, value]) => [key, typeof value === 'bigint' ? decimal(value) : value]));
  const encodeQuantities = (values) => Object.fromEntries(
    Object.entries(values).map(([id, amount]) => [id, decimal(amount)]),
  );
  return {
    ...state, coins: decimal(state.coins), inventory: encodeQuantities(state.inventory),
    reserves: encodeQuantities(state.reserves), stats: counters,
    productionValue: decimal(state.productionValue), researchPoints: decimal(state.researchPoints),
  };
}

export function decode(record) {
  if (record.schemaVersion !== 1) throw new Error('Unsupported save version');
  const parse = (value) => {
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) throw new Error('Invalid amount');
    return BigInt(value);
  };
  const decodeQuantities = (values) => Object.fromEntries(
    Object.entries(values).map(([id, amount]) => [id, parse(amount)]),
  );
  const stats = { ...record.stats };
  for (const key of ['wheat', 'flour', 'bread', 'sold', 'revenue']) stats[key] = parse(stats[key]);
  return {
    ...record, coins: parse(record.coins), inventory: decodeQuantities(record.inventory),
    reserves: decodeQuantities(record.reserves), stats,
    productionValue: parse(record.productionValue ?? '0'),
    researchPoints: parse(record.researchPoints ?? '0'), appraisalLevel: record.appraisalLevel ?? 0,
  };
}

export function openSave() {
  return new Promise((resolve, reject) => {
    // Preserve the original database name so existing saves remain available after the rename.
    const request = indexedDB.open('tianjian-workshop', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Save unavailable'));
  });
}

export function readSave(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName).objectStore(storeName).get('current');
    request.onsuccess = () => {
      try {
        resolve(request.result ? decode(request.result) : null);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export function writeSave(db, state) {
  const next = encode({ ...state, revision: state.revision + 1 });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.get('current');
    request.onsuccess = () => {
      const current = request.result;
      if ((current?.revision ?? 0) !== state.revision) {
        tx.abort();
        return;
      }
      if (current) store.put(current, 'previous');
      store.put(next, 'current');
    };
    tx.oncomplete = () => resolve(next.revision);
    tx.onabort = () => reject(tx.error ?? new Error('Save was updated elsewhere'));
  });
}
