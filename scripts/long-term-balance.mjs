import { qualityDrawTaskTargets } from '../src/game/quality-tasks.js';

export const balanceVersion = 'LT-2026-11-v10';

const maxCycle = 43200n;
const minimumRatio = fraction(11n, 10n);
const max = (a, b) => a > b ? a : b;
const min = (a, b) => a < b ? a : b;
const ceilDiv = (a, b) => (a + b - 1n) / b;
const floor = ({ numerator, denominator }) => numerator / denominator;
const ceil = ({ numerator, denominator }) => ceilDiv(numerator, denominator);

function fail(message) {
  throw new Error(`长期平衡生成：${message}`);
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function fraction(numerator, denominator = 1n) {
  const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function add(a, b) {
  return fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}

function multiply(a, b) {
  return fraction(a.numerator * b.numerator, a.denominator * b.denominator);
}

function compare(a, b) {
  const left = a.numerator * b.denominator;
  const right = b.numerator * a.denominator;
  return left === right ? 0 : left < right ? -1 : 1;
}

function asText({ numerator, denominator }) {
  return denominator === 1n ? numerator.toString() : `${numerator}/${denominator}`;
}

function integerRoot(number) {
  if (number < 2n) return number;
  let estimate = number;
  let next = (estimate + 1n) / 2n;
  while (next < estimate) {
    estimate = next;
    next = (estimate + number / estimate) / 2n;
  }
  return estimate;
}

function topologicalOrder(graph, label) {
  const done = new Set();
  const visiting = new Set();
  function visit(id) {
    if (done.has(id)) return;
    if (visiting.has(id)) fail(`${label}成环：${[...visiting, id].join(' → ')}`);
    const dependencies = graph.get(id);
    if (!dependencies) fail(`${label}包含未知品项 ${id}`);
    visiting.add(id);
    for (const dependency of dependencies) visit(dependency);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return done;
}

const sameList = (left, right) => left.join(',') === right.join(',');
const sameKeys = (left, right) => sameList(Object.keys(left).sort(), Object.keys(right).sort());

function preserveStructure(catalogue, baseline) {
  if (baseline.version !== '1.14') fail('仅可使用固定 1.14 结构快照');
  if (!sameList(catalogue.initial, baseline.initial)) fail('初始品项发生变化');
  const snapshotMax = {};
  const rank = (id) => Number(/\d+$/.exec(id)[0]);
  for (const [id, original] of Object.entries(baseline.items)) {
    const item = catalogue.items[id];
    if (!item || item.kind !== original.kind || item.level !== original.level
      || !sameList(item.sources, original.sources) || !sameKeys(item.inputs, original.inputs)
      || Object.entries(original.inputs).some(([key, count]) => item.inputs[key] !== count)) {
      fail(`${id} 的生产配方、来源或等级偏离 1.14 结构快照`);
    }
    snapshotMax[original.kind] = Math.max(snapshotMax[original.kind] ?? 0, rank(id));
  }
  for (const [id, original] of Object.entries(baseline.research)) {
    const node = catalogue.research[id];
    if (!node || !sameList(node.requires, original.requires) || !sameKeys(node.costs, original.costs)) {
      fail(`${id} 的研发前置或耗材种类偏离 1.14 结构快照`);
    }
  }
  for (const [id, item] of Object.entries(catalogue.items)) {
    if (catalogue.initial.includes(id) === Object.hasOwn(catalogue.research, id)) fail(`${id} 的研发覆盖无效`);
    if (!Object.hasOwn(baseline.items, id) && !(rank(id) > snapshotMax[item.kind])) {
      fail(`${id} 须追加在 ${item.kind} 类快照末尾`);
    }
  }
}

const targetRate = (hours) => add(fraction(1n), multiply(hours, fraction(1n, 3n)));

function production(catalogue, scale) {
  const order = topologicalOrder(new Map(Object.entries(catalogue.items).map(([id, item]) => [id, Object.keys(item.inputs)])), '生产配方');
  const uses = new Map([...order].map((id) => [id, 0n]));
  for (const { inputs } of Object.values(catalogue.items)) {
    for (const [input, count] of Object.entries(inputs)) uses.set(input, uses.get(input) + BigInt(count));
  }
  const calculations = new Map();
  for (const id of order) {
    const item = catalogue.items[id];
    const s = BigInt(item.minimumSeconds);
    if (s < 1n || s > maxCycle) fail(`${id} 的基础周期下界须在 1–${maxCycle} 秒内`);
    const u = uses.get(id);
    const q = 1n + integerRoot(u / 2n);
    let minimum = s;
    let a = fraction(0n);
    let upstreamTarget = fraction(0n);
    let upstreamActual = fraction(0n);
    let materialValue = 0n;
    const inputs = Object.entries(item.inputs);
    for (const [input, count] of inputs) {
      const incoming = calculations.get(input);
      const quantity = BigInt(count);
      const growth = ceilDiv(11n * incoming.t, 10n);
      const supply = ceilDiv(11n * quantity * incoming.t, 10n * incoming.q);
      minimum = max(minimum, max(growth, supply));
      if (minimum > maxCycle) {
        fail(`${id} 的 ${input} ${growth > maxCycle ? '直接上游周期' : '供料周期'}要求超过 ${maxCycle} 秒`);
      }
      a = add(a, multiply(incoming.h, fraction(quantity, incoming.q)));
      upstreamTarget = add(upstreamTarget, incoming.target);
      upstreamActual = add(upstreamActual, incoming.rate);
      materialValue += incoming.price * quantity;
    }
    const targetThreshold = multiply(upstreamTarget, minimumRatio);
    const meetsThreshold = (t) => compare(add(targetRate(add(fraction(t), a)), fraction(-q, t)), targetThreshold) >= 0;
    let t = minimum;
    if (inputs.length) {
      if (!meetsThreshold(maxCycle)) fail(`${id} 的同窗目标准备工时超过 ${maxCycle} 秒`);
      let high = maxCycle;
      while (t < high) {
        const mid = (t + high) / 2n;
        if (meetsThreshold(mid)) high = mid;
        else t = mid + 1n;
      }
    }
    const h = add(fraction(t), a);
    const target = targetRate(h);
    const price = floor(multiply(fraction(scale * t, q), target));
    if (price < 10n) fail(`${id} 的单价 ${price} 不足 10 金`);
    const rate = fraction(price * q, t);
    if (inputs.length) {
      if (price * q * 5n < materialValue * 6n) fail(`${id} 的批总价低于投入价值的 1.2 倍`);
      if (compare(rate, multiply(upstreamActual, minimumRatio)) <= 0) fail(`${id} 的实际同窗产值未超过上游的 1.1 倍`);
    }
    calculations.set(id, { u, q, s, t, a, h, target, price, rate, minimum, targetThreshold });
  }

  const ordered = [...calculations].sort(([, a], [, b]) => compare(a.h, b.h));
  let groupHours;
  let previousMax;
  let currentMax;
  for (const [id, calculated] of ordered) {
    if (!groupHours || compare(groupHours, calculated.h) !== 0) {
      groupHours = calculated.h;
      previousMax = currentMax;
      currentMax = undefined;
    }
    if (previousMax && compare(previousMax.rate, calculated.rate) >= 0) fail(`${id} 与 ${previousMax.id} 的含料工时与实际产值率顺序不一致`);
    if (!currentMax || compare(calculated.rate, currentMax.rate) > 0) currentMax = { id, rate: calculated.rate };
  }
  return calculations;
}

function researchPrices(catalogue, calculations, scale) {
  const prerequisites = new Map(catalogue.initial.map((id) => [id, []]));
  for (const [id, node] of Object.entries(catalogue.research)) prerequisites.set(id, node.requires);
  const quotes = new Map();
  for (const id of topologicalOrder(prerequisites, '研发前置')) {
    const node = catalogue.research[id];
    if (!node) continue;
    const { h, target } = calculations.get(id);
    const materials = Object.keys(node.costs);
    const baseMaterialValue = materials.reduce((sum, key) => sum + calculations.get(key).price, 0n);
    const baseWork = add(fraction(30n), multiply(h, fraction(1n, 2n)));
    const base = ceil(multiply(baseWork, multiply(fraction(scale), target)));
    let total = max(base, max(ceilDiv(5n * baseMaterialValue, 2n), baseMaterialValue + 10n * scale));
    for (const key of node.requires) {
      if (Object.keys(catalogue.items[key].inputs).length && quotes.has(key)) total = max(total, quotes.get(key).total);
    }
    const allowance = materials.length ? max(0n, total / 3n - baseMaterialValue) / BigInt(materials.length) : 0n;
    const seconds = max(300n, min(3600n, ceil(h)));
    const floorsBeyondLimit = [];
    const costs = {};
    let materialValue = 0n;
    for (const key of materials) {
      const { price, q, t } = calculations.get(key);
      const limit = seconds * q / t;
      if (limit === 0n) floorsBeyondLimit.push(key);
      const count = min(1n + allowance / price, max(1n, limit));
      costs[key] = count.toString();
      materialValue += count * price;
    }
    if (5n * materialValue > 2n * total || total <= materialValue) fail(`${id} 的研发材料占比超过 40% 或金币非正`);
    quotes.set(id, { total, materialValue, floorsBeyondLimit, costs });
  }
  return quotes;
}

export function applyLongTermBalance(catalogue, baseline, coinScale) {
  if (!Number.isSafeInteger(coinScale) || coinScale < 1) fail('coinScale 必须为正安全整数');
  const scale = BigInt(coinScale);
  preserveStructure(catalogue, baseline);
  const calculations = production(catalogue, scale);
  const quotes = researchPrices(catalogue, calculations, scale);
  const items = {};
  for (const [id, { minimumSeconds, ...fields }] of Object.entries(catalogue.items)) {
    const { t, q, price } = calculations.get(id);
    const { name, subject, inputs, kind, sources, level } = fields;
    items[id] = {
      name, ...(subject ? { subject } : {}), durationMs: Number(t * 1000n),
      output: q.toString(), price: price.toString(), inputs, kind, sources,
      ...(level === undefined ? {} : { level }),
    };
  }
  const research = {};
  for (const [id, node] of Object.entries(catalogue.research)) {
    const { total, materialValue, costs } = quotes.get(id);
    research[id] = { coins: (total - materialValue).toString(), costs, requires: node.requires };
  }
  const balanced = { version: baseline.version, balanceVersion, initial: catalogue.initial, items, research };
  return { balanced, calculations, quotes, scale };
}

export function taskCoinCaps({ balanced, scale }) {
  const costs = Object.entries(balanced.research);
  const compareAmount = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const cheapest = (selected) => selected.map(([, node]) => BigInt(node.coins)).sort(compareAmount);
  const allCosts = cheapest(costs);
  const recipeCosts = cheapest(costs.filter(([id]) => balanced.items[id].kind.startsWith('P')));
  function halfCheapest(sorted, count) {
    if (sorted.length < count) fail(`任务金币上限缺少 ${count} 个研发报价`);
    return sorted.slice(0, count).reduce((sum, cost) => sum + cost, 0n) / 2n;
  }

  const caps = {
    recipeTrio: halfCheapest(recipeCosts, 3),
    codex20: halfCheapest(allCosts, 20 - balanced.initial.length),
    recipeCollection: halfCheapest(recipeCosts, 25),
    milleCrepe: BigInt(balanced.research.P150.coins) / 2n,
    itemCollection: halfCheapest(allCosts, allCosts.length),
    threeSectorGift: BigInt(balanced.research.PT50.coins) / 2n,
    collection100: halfCheapest(allCosts, 100 - balanced.initial.length),
    collection200: halfCheapest(allCosts, 200 - balanced.initial.length),
    collection300: halfCheapest(allCosts, 300 - balanced.initial.length),
    collection400: halfCheapest(allCosts, 400 - balanced.initial.length),
    livestockTop: BigInt(balanced.research.L10.coins) / 2n,
    fishTop: BigInt(balanced.research.F10.coins) / 2n,
    ...Object.fromEntries(Object.entries(qualityDrawTaskTargets).map(([id, target]) => [id, 100n * scale * target])),
  };
  for (const [id, cap] of Object.entries(caps)) {
    if (cap < 1n) fail(`${id} 的任务金币上限不足 1 金`);
  }
  return Object.fromEntries(Object.entries(caps).map(([id, cap]) => [id, cap.toString()]));
}

export function summarizeGeneratedBalance({ balanced, calculations, quotes }) {
  let coins = 0n;
  let materials = 0n;
  let changedCycles = 0;
  let maxSeconds = 0n;
  for (const [id, quote] of quotes) {
    coins += BigInt(balanced.research[id].coins);
    materials += quote.materialValue;
  }
  for (const { s, t } of calculations.values()) {
    if (t !== s) changedCycles += 1;
    maxSeconds = max(maxSeconds, t);
  }
  return {
    items: calculations.size,
    recipes: Object.values(balanced.items).filter(({ inputs }) => Object.keys(inputs).length).length,
    research: quotes.size,
    changedCycles,
    maxSeconds: maxSeconds.toString(),
    coins: coins.toString(),
    materials: materials.toString(),
    minimumMaterialBeyondLimit: Object.fromEntries([...quotes].filter(([, q]) => q.floorsBeyondLimit.length)
      .map(([id, q]) => [id, q.floorsBeyondLimit])),
  };
}

export function balanceDetails({ calculations }) {
  return Object.fromEntries([...calculations].map(([id, { u, q, s, t, a, h, price, rate, minimum, targetThreshold }]) => [
    id,
    { U: String(u), Q: String(q), s: String(s), t: String(t), A: asText(a), H: asText(h),
      price: String(price), rate: asText(rate), minimum: String(minimum), targetThreshold: asText(targetThreshold) },
  ]));
}
