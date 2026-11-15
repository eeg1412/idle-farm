// LT-2026-11-v2 catalogue policy. All monetary/workload arithmetic is exact.
// The caller supplies the immutable 1.14 snapshot, never a prior LT output.
export const balanceVersion = 'LT-2026-11-v2';

const cropAnchors = ['C02', 'C04', 'C08', 'C11', 'C17', 'C22', 'C28', 'C35', 'C42', 'C50'];
const frozenPrices = new Set(['C01', 'C02', 'C03', 'I01', 'I02', 'I03', 'P01', 'P02', 'P03']);

function fail(message) {
  throw new Error(`长期平衡生成：${message}`);
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function fraction(numerator, denominator = 1n) {
  if (denominator <= 0n) fail('分母必须为正数');
  const divisor = gcd(numerator, denominator);
  return { n: numerator / divisor, d: denominator / divisor };
}

function add(a, b) {
  return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
}

function multiply(a, numerator, denominator = 1n) {
  return fraction(a.n * numerator, a.d * denominator);
}

function ceilDiv(numerator, denominator) {
  return (numerator + denominator - 1n) / denominator;
}

function ceil(value) {
  return ceilDiv(value.n, value.d);
}

function rank(id) {
  return Number(id.match(/\d+$/)[0]);
}

function sameEntries(left, right) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

function preserveStructure(catalogue, baseline) {
  if (baseline.version !== '1.14') fail('仅可使用固定1.14原始快照');
  if (catalogue.initial.join(',') !== baseline.initial.join(',')) fail('初始品项发生变化');
  if (Object.keys(catalogue.items).length !== Object.keys(baseline.items).length
    || Object.keys(catalogue.research).length !== Object.keys(baseline.research).length) fail('目录覆盖范围发生变化');
  for (const [id, original] of Object.entries(baseline.items)) {
    const item = catalogue.items[id];
    if (!item || ['durationMs', 'output', 'kind', 'level'].some((key) => item[key] !== original[key])
      || item.sources.join(',') !== original.sources.join(',') || !sameEntries(item.inputs, original.inputs)) {
      fail(`${id}的生产配方、周期、产量、来源或等级发生变化`);
    }
  }
  for (const [id, original] of Object.entries(baseline.research)) {
    const node = catalogue.research[id];
    if (!node || node.requires.join(',') !== original.requires.join(',')
      || Object.keys(node.costs).sort().join(',') !== Object.keys(original.costs).sort().join(',')) {
      fail(`${id}的研发前置或耗材种类发生变化`);
    }
  }
}

export function applyLongTermBalance(catalogue, baseline) {
  preserveStructure(catalogue, baseline);
  const items = Object.fromEntries(Object.entries(catalogue.items).map(([id, item]) => [id, { ...item, inputs: { ...item.inputs }, sources: [...item.sources] }]));
  // Research is not derived from prices. Preserve every original field and
  // quantity, including prerequisite ordering, straight from the fixed source.
  const research = Object.fromEntries(Object.entries(baseline.research).map(([id, node]) => [id, { ...node, costs: { ...node.costs }, requires: [...node.requires] }]));

  // Envelope follows the original C01–C50 cycle order. Additional crops only
  // interpolate inside these fixed periods; new out-of-range cycles need a spec.
  const envelope = [];
  let highest = fraction(0n);
  for (let index = 1; index <= 50; index += 1) {
    const item = baseline.items[`C${String(index).padStart(2, '0')}`];
    const rate = fraction(BigInt(item.price) * BigInt(item.output) * 1000n, BigInt(item.durationMs));
    if (rate.n * highest.d > highest.n * rate.d) highest = rate;
    envelope.push({ time: BigInt(item.durationMs), rate: highest });
  }
  function envelopeAt(time) {
    if (time < envelope[0].time || time > envelope.at(-1).time) fail(`作物周期${time}ms超出原始锚点范围，不能外插`);
    const upper = envelope.findIndex((point) => point.time >= time);
    const right = envelope[upper];
    if (right.time === time) return right.rate;
    const left = envelope[upper - 1];
    const difference = fraction(right.rate.n * left.rate.d - left.rate.n * right.rate.d, right.rate.d * left.rate.d);
    return add(left.rate, multiply(difference, time - left.time, right.time - left.time));
  }
  for (const [id, item] of Object.entries(items)) {
    if (item.kind !== 'C') continue;
    if (frozenPrices.has(id)) {
      item.price = baseline.items[id].price;
      continue;
    }
    item.price = ceil(multiply(envelopeAt(BigInt(item.durationMs)), BigInt(item.durationMs), 1000n * BigInt(item.output))).toString();
  }
  const tierRates = cropAnchors.map((id) => fraction(BigInt(items[id].price) * BigInt(items[id].output) * 1000n, BigInt(items[id].durationMs)));
  const tiers = new Map();
  function tierFor(id) {
    if (tiers.has(id)) return tiers.get(id);
    const item = items[id];
    let tier;
    if (item.kind === 'C') {
      tier = cropAnchors.findIndex((anchor) => item.durationMs <= items[anchor].durationMs) + 1;
    } else if (item.kind === 'L' || item.kind === 'F') {
      tier = rank(id);
    } else if (item.kind.startsWith('P')) {
      tier = Math.ceil(item.level / 3);
    } else {
      tier = Math.max(...Object.keys(item.inputs).map(tierFor));
    }
    if (!Number.isInteger(tier) || tier < 1 || tier > 10) fail(`${id}缺少有效档次`);
    tiers.set(id, tier);
    return tier;
  }
  for (const [id, item] of Object.entries(items)) {
    if (item.kind !== 'L' && item.kind !== 'F') continue;
    item.price = ceil(multiply(tierRates[tierFor(id) - 1], (item.kind === 'L' ? 11n : 12n) * BigInt(item.durationMs), 1000n * BigInt(item.output))).toString();
  }
  const priced = new Set(Object.keys(items).filter((id) => !Object.keys(items[id].inputs).length));
  function priceFor(id) {
    if (priced.has(id)) return BigInt(items[id].price);
    const item = items[id];
    const value = Object.entries(item.inputs).reduce((total, [input, count]) => total + priceFor(input) * BigInt(count), 0n);
    if (frozenPrices.has(id)) {
      item.price = baseline.items[id].price;
    } else {
      // Single/dual/triple-source refining wages are 10/8, 11/8, 12/8.
      const multiplier = item.kind.startsWith('P') ? BigInt(9 + item.sources.length) : 8n;
      const wage = ceil(multiply(tierRates[tierFor(id) - 1], BigInt(item.durationMs) * multiplier, 8000n));
      item.price = (value + wage).toString();
    }
    priced.add(id);
    return BigInt(item.price);
  }
  for (const id of Object.keys(items)) priceFor(id);

  // Catalogue/save format stays at 1.14; the economic policy has its own
  // version so original export packages remain compatible.
  return { version: baseline.version, balanceVersion, initial: [...catalogue.initial], items, research };
}

// Descriptive generation metadata, not an independent verification or a
// calendar-time simulation. Processing/refining capacity remain separate.
export function summarizeGeneratedBalance(catalogue, baseline) {
  const prices = { changed: 0, unchanged: 0, byKind: {} };
  for (const [id, item] of Object.entries(catalogue.items)) {
    const change = BigInt(item.price) - BigInt(baseline.items[id].price);
    const kind = prices.byKind[item.kind] ??= { up: 0, down: 0, same: 0 };
    kind[change > 0n ? 'up' : change < 0n ? 'down' : 'same'] += 1;
    prices[change === 0n ? 'unchanged' : 'changed'] += 1;
  }
  const cache = new Map();
  function workFor(id) {
    if (cache.has(id)) return cache.get(id);
    const item = catalogue.items[id];
    const work = { agricultural: 0n, animal: 0n, refining: 0n };
    if (item.kind === 'I') work.agricultural = BigInt(item.durationMs) / 1000n;
    else if (item.kind === 'IL' || item.kind === 'IF') work.animal = BigInt(item.durationMs) / 1000n;
    else if (item.kind.startsWith('P')) work.refining = BigInt(item.durationMs) / 1000n;
    for (const [input, quantity] of Object.entries(item.inputs)) {
      const inputWork = workFor(input);
      for (const key of Object.keys(work)) work[key] += BigInt(quantity) * inputWork[key];
    }
    cache.set(id, work);
    return work;
  }
  let coins = 0n;
  let baseProcessing = 0n;
  let baseRefining = 0n;
  const materials = { up: 0, down: 0, same: 0 };
  for (const [id, node] of Object.entries(catalogue.research)) {
    coins += BigInt(node.coins);
    const oldTotal = Object.values(baseline.research[id].costs).reduce((total, count) => total + BigInt(count), 0n);
    const newTotal = Object.values(node.costs).reduce((total, count) => total + BigInt(count), 0n);
    materials[newTotal > oldTotal ? 'up' : newTotal < oldTotal ? 'down' : 'same'] += 1;
    for (const [input, quantity] of Object.entries(node.costs)) {
      const work = workFor(input);
      const amount = BigInt(quantity);
      baseProcessing += amount * (work.agricultural + work.animal);
      baseRefining += amount * work.refining;
    }
  }
  function hours(numerator, denominator = 1n) {
    const divisor = denominator * 3600n;
    const micros = (numerator * 1000000n + divisor / 2n) / divisor;
    return `${micros / 1000000n}.${String(micros % 1000000n).padStart(6, '0')}`;
  }
  return {
    coverage: {
      items: Object.keys(catalogue.items).length,
      recipes: Object.values(catalogue.items).filter((item) => Object.keys(item.inputs).length > 0).length,
      research: Object.keys(catalogue.research).length,
    },
    prices,
    samplePrices: Object.fromEntries(['C16', 'C22', 'C66', 'L06', 'F06', 'I100', 'P150', 'P169', 'PD13', 'PD19', 'PT41', 'PT50']
      .map((id) => [id, { old: baseline.items[id].price, generated: catalogue.items[id].price }])),
    research: { coins: coins.toString(), materialNodesByTotalQuantity: materials },
    processing: { baseHours: hours(baseProcessing) },
    refining: { baseHours: hours(baseRefining) },
  };
}
