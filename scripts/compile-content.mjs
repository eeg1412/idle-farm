import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const design = await read('../docs/game-design.md');
const rows = (start, end) => design.split(start)[1].split(end)[0]
  .split('\n').filter((line) => /^\| [CIP]\d+ \|/.test(line))
  .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));

function inputs(text) {
  const result = {};
  for (const part of text.split(' + ')) {
    const match = /^([1-9]\d*)×([CIP]\d+)$/.exec(part);
    assert.ok(match, part);
    const [, count, id] = match;
    assert.ok(!(id in result), id);
    result[id] = count;
  }
  return result;
}

const items = {};
for (const [id, name, ...data] of rows('## 4. 物品与完整配方表', '## 5. 研发与品质')) {
  assert.ok(!(id in items), id);
  const crop = id.startsWith('C');
  const [duration, output, price] = crop ? data : [data[2], data[1], data[3]];
  assert.ok([duration, output, price].every((field) => /^[1-9]\d*$/.test(field)), id);
  items[id] = { name, durationMs: Number(duration) * 1000, output, price, inputs: crop ? {} : inputs(data[0]) };
}
for (const [kind, count, maximumMs] of [['C', 50, 300000], ['I', 100, 600000], ['P', 150, 1800000]]) {
  assert.equal(Object.keys(items).filter((id) => id.startsWith(kind)).length, count);
  let previousMs = 0;
  for (let n = 1; n <= count; n += 1) {
    const id = kind + String(n).padStart(2, '0');
    const item = items[id];
    assert.ok(item && item.durationMs > previousMs, `${id} 的基础时长必须递增`);
    if (kind !== 'C') assert.equal(item.output, '1', `${id} 每批必须产出 1 件`);
    previousMs = item.durationMs;
  }
  assert.equal(previousMs, maximumMs, `${kind} 的最长基础时长`);
}
assert.equal(new Set(Object.values(items).map(({ name }) => name)).size, 300);

const research = {};
for (const [id, name, prerequisites, coins, materials] of rows('### 5.2 种子与配方研发明细', '### 5.3 品种与品质研发明细')) {
  assert.equal(items[id]?.name, name);
  assert.ok(!(id in research) && /^[1-9]\d*$/.test(coins), id);
  const costs = inputs(materials);
  const requires = new Set([
    ...(prerequisites === '—' ? [] : prerequisites.split('、')),
    ...Object.keys(costs), ...Object.keys(items[id].inputs),
  ]);
  for (const key of requires) assert.ok(items[key], key);
  research[id] = { coins, costs, requires: [...requires] };
}

const initial = ['C01', 'I01'];
assert.equal(Object.keys(research).length, 298);
assert.ok(initial.every((id) => !(id in research)));
const signatures = new Set();
for (const [id, item] of Object.entries(items)) {
  if (id.startsWith('C')) continue;
  let cost = 0n;
  for (const [key, count] of Object.entries(item.inputs)) {
    assert.ok(items[key], key);
    assert.ok(id.startsWith('P') ? key.startsWith('I')
      : key.startsWith('C') || key.startsWith('I') && Number(key.slice(1)) < Number(id.slice(1)), id);
    cost += BigInt(items[key].price) * BigInt(count);
  }
  assert.ok(BigInt(item.output) * BigInt(item.price) > cost, id);
  const signature = id[0] + JSON.stringify(Object.entries(item.inputs).sort());
  assert.ok(!signatures.has(signature), id);
  signatures.add(signature);
}
assert.equal(signatures.size, 250);
assert.ok(Object.keys(items.I100.inputs).every((id) => id.startsWith('I')));
for (const [start, end, minKinds, minQuantity] of [
  [31, 60, 3, 5], [61, 100, 4, 8], [101, 125, 5, 13], [126, 149, 6, 18], [150, 150, 8, 35],
]) {
  for (let index = start; index <= end; index += 1) {
    const id = 'P' + index;
    const quantities = Object.values(items[id].inputs);
    assert.ok(quantities.length >= minKinds && quantities.reduce((sum, n) => sum + BigInt(n), 0n) >= BigInt(minQuantity), id);
  }
}

function reachable(excluded = new Set()) {
  const reached = new Set(initial);
  let size = 0;
  while (size !== reached.size) {
    size = reached.size;
    for (const [id, { requires }] of Object.entries(research)) {
      if (!excluded.has(id) && requires.every((key) => reached.has(key))) reached.add(id);
    }
  }
  return reached;
}

assert.equal(reachable().size, 300, '存在不可达的研发');
assert.equal(reachable(new Set(['P12', 'P46', 'P80', 'P115'])).size, 296, '发现整组研发门槛');
const pacing = JSON.parse(await read('../docs/research-pacing.json'));
const pacedIds = new Set([...pacing.instant, ...pacing.order]);
assert.equal(pacing.instant.length, 7);
assert.equal(pacing.order.length, 291);
assert.equal(pacedIds.size, 298);
assert.equal(pacing.minimumFullUnlockDays, 365);
assert.deepEqual([...pacedIds].sort(), Object.keys(research).sort());
const starterIds = new Set([...initial, ...pacing.instant]);
for (const id of pacing.instant) {
  assert.ok(research[id].requires.every((key) => starterIds.has(key)), id);
  Object.assign(research[id], { minCompletedRuns: 0, availableAfterDays: 0, materialMultiplier: 1 });
}
let lastDay = 0;
let lastRank = 0;
for (const interval of pacing.intervals) {
  assert.ok(Number.isInteger(interval.lastRank) && interval.lastRank > lastRank);
  assert.ok(Number.isInteger(interval.availableAfterDays) && interval.availableAfterDays > lastDay);
  lastDay = interval.availableAfterDays;
  assert.ok(Number.isInteger(interval.materialMultiplier) && interval.materialMultiplier > 0);
  lastRank = interval.lastRank;
}
assert.equal(lastRank, pacing.order.length);
const learned = new Set(starterIds);
for (const [index, id] of pacing.order.entries()) {
  const interval = pacing.intervals.find(({ lastRank }) => index < lastRank);
  assert.ok(research[id].requires.every((key) => learned.has(key)), id);
  Object.assign(research[id], {
    minCompletedRuns: 1,
    availableAfterDays: interval.availableAfterDays,
    materialMultiplier: interval.materialMultiplier,
  });
  learned.add(id);
}
assert.equal(lastDay, pacing.minimumFullUnlockDays);
assert.equal(research.P150.availableAfterDays, lastDay);

const target = new URL('../src/content/catalog.json', import.meta.url);
const generated = JSON.stringify({ initial, items, research, researchRules: { minimumFullUnlockDays: pacing.minimumFullUnlockDays } }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  assert.equal(await readFile(target, 'utf8'), generated, '请运行 npm run content:generate');
} else {
  await writeFile(target, generated);
}
console.log('300 个品项、250 条配方、298 个研发节点通过校验。');
