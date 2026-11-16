// LT-2026-11-v3 catalogue policy (docs/expansion/07). Prices are exact BigInt
// rationals rounded once with ceilDiv. Research is regenerated from prices;
// only the piecewise power curve and the k_ref logarithm use floating point,
// and their results are rounded into decimal strings (deterministic data).
// The caller supplies the immutable 1.14 snapshot (structure only) and the
// research policy tables parsed from 07 §7.7/§7.8.
export const balanceVersion = 'LT-2026-11-v3';

// κ: crops 1, livestock/fish 10 (one ranch = ten fields of the same cycle).
const rawFactors = { C: 1n, L: 10n, F: 10n };
// Recipe pricing per category, in thousandths: m = material markup, ω = work factor.
const recipeFactors = {
  I: [1200n, 500n], IL: [1200n, 500n], IF: [1200n, 500n],
  P: [1300n, 750n], PL: [1300n, 750n], PF: [1300n, 750n],
  PD: [1350n, 875n],
  PT: [1400n, 1000n],
};
// Research material caps: 10 facilities or 4 stations for 4 hours.
const capSeconds = 4n * 3600n;
const capFacilities = 10n;
const capStations = 4n;
const kReferenceScale = 130;
const kReferenceBase = 153;

function fail(message) {
  throw new Error(`长期平衡生成：${message}`);
}

function ceilDiv(numerator, denominator) {
  return (numerator + denominator - 1n) / denominator;
}

function sameEntries(left, right) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

function sameKinds(left, right) {
  return Object.keys(left).sort().join(',') === Object.keys(right).sort().join(',');
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
    if (!node || node.requires.join(',') !== original.requires.join(',') || !sameKinds(node.costs, original.costs)) {
      fail(`${id}的研发前置或耗材种类发生变化`);
    }
  }
}

function seconds(item, id) {
  const duration = BigInt(item.durationMs);
  if (duration <= 0n || duration % 1000n !== 0n) fail(`${id}周期必须为整秒`);
  return duration / 1000n;
}

function validatePolicy(policy, research) {
  const anchors = policy?.researchAnchors;
  if (!Array.isArray(anchors) || anchors.length < 2) fail('缺少研发总价锚点');
  for (const [index, anchor] of anchors.entries()) {
    if (typeof anchor.u !== 'bigint' || typeof anchor.b !== 'bigint' || anchor.u <= 0n || anchor.b <= 0n) fail(`研发锚点${index + 1}无效`);
    if (index && (anchor.u <= anchors[index - 1].u || anchor.b <= anchors[index - 1].b)) fail('研发锚点必须严格递增');
  }
  const overrides = policy.researchOverrides;
  if (!overrides || typeof overrides !== 'object') fail('缺少研发引导覆盖');
  for (const [id, override] of Object.entries(overrides)) {
    if (!research[id]) fail(`引导覆盖${id}不是研发节点`);
    if (!/^[1-9]\d*$/.test(override.coins ?? '')) fail(`引导覆盖${id}金币无效`);
    if (!sameKinds(override.costs, research[id].costs)) fail(`引导覆盖${id}的耗材种类与研发表不一致`);
    if (Object.values(override.costs).some((count) => !/^[1-9]\d*$/.test(count))) fail(`引导覆盖${id}材料数量无效`);
  }
  return { anchors: anchors.map((anchor) => ({ u: Number(anchor.u), b: Number(anchor.b) })), overrides };
}

// 3 significant figures, minimum 10.
function roundSignificant(value) {
  if (!Number.isFinite(value) || value < 10) return 10n;
  const exponent = Math.floor(Math.log10(value)) - 2;
  if (exponent <= 0) return BigInt(Math.round(value));
  const rounded = BigInt(Math.round(value / 10 ** exponent)) * 10n ** BigInt(exponent);
  return rounded < 10n ? 10n : rounded;
}

export function applyLongTermBalance(catalogue, baseline, policy) {
  preserveStructure(catalogue, baseline);
  const { anchors, overrides } = validatePolicy(policy, catalogue.research);
  const items = Object.fromEntries(Object.entries(catalogue.items).map(([id, item]) => [id, { ...item, inputs: { ...item.inputs }, sources: [...item.sources] }]));

  // Raw goods: single-facility base rate r = κ·5t²/144 coins/s; this keeps the
  // numerator 5κt² over the fixed denominator 144.
  const rateNumerators = new Map();
  for (const [id, item] of Object.entries(items)) {
    if (Object.keys(item.inputs).length) continue;
    const kappa = rawFactors[item.kind];
    if (!kappa) fail(`${id}不是可定价原料`);
    const t = seconds(item, id);
    rateNumerators.set(id, 5n * kappa * t * t);
    // price = ceilDiv(5κt³, 144·out)
    item.price = ceilDiv(5n * kappa * t * t * t, 144n * BigInt(item.output)).toString();
  }

  // r_ref: the largest raw base rate anywhere upstream (recursive).
  const references = new Map();
  function referenceFor(id) {
    if (rateNumerators.has(id)) return rateNumerators.get(id);
    if (references.has(id)) return references.get(id);
    let highest = 0n;
    for (const input of Object.keys(items[id].inputs)) {
      const value = referenceFor(input);
      if (value > highest) highest = value;
    }
    if (highest <= 0n) fail(`${id}缺少上游原料`);
    references.set(id, highest);
    return highest;
  }

  // price = ceilDiv(m·V·144 + ω·t·5κ_ref·t_ref², 1000·144), m/ω in thousandths.
  const priced = new Set(rateNumerators.keys());
  function priceFor(id) {
    const item = items[id];
    if (priced.has(id)) return BigInt(item.price);
    const factors = recipeFactors[item.kind];
    if (!factors) fail(`${id}缺少配方定价类别`);
    const [markup, work] = factors;
    const value = Object.entries(item.inputs).reduce((total, [input, count]) => total + priceFor(input) * BigInt(count), 0n);
    item.price = ceilDiv(markup * value * 144n + work * seconds(item, id) * referenceFor(id), 1000n * 144n).toString();
    priced.add(id);
    return BigInt(item.price);
  }
  for (const id of Object.keys(items)) priceFor(id);

  // U(id): one level-1 line's flow at the generated base price — raw goods
  // price·out/t (r after ceilDiv), recipes price/t (one station).
  function unitValue(id) {
    const item = items[id];
    return Number(BigInt(item.price) * BigInt(item.output)) / Number(seconds(item, id));
  }
  // Total = 2·B(U), B piecewise power on log10(U) through the anchors; both
  // ends extrapolate along their outer segment.
  function researchTotal(u) {
    const exact = anchors.find((anchor) => anchor.u === u);
    if (exact) return 2 * exact.b;
    let upper = anchors.findIndex((anchor) => u < anchor.u);
    if (upper === -1) upper = anchors.length - 1;
    else if (upper === 0) upper = 1;
    const left = anchors[upper - 1];
    const right = anchors[upper];
    const slope = Math.log10(right.b / left.b) / Math.log10(right.u / left.u);
    return 2 * left.b * Math.pow(u / left.u, slope);
  }
  function materialCap(id, kReference) {
    const item = items[id];
    const duration = BigInt(item.durationMs);
    if (rateNumerators.has(id)) {
      const multiplier = 1n + kReference + kReference * kReference / 64n;
      return capFacilities * capSeconds * 1000n * BigInt(item.output) * multiplier / duration;
    }
    const level = 1n + kReference / 2n;
    return capStations * capSeconds * 1000n * BigInt(item.output) * level / duration;
  }

  const research = {};
  for (const [id, node] of Object.entries(catalogue.research)) {
    const requires = [...node.requires];
    if (Object.hasOwn(overrides, id)) {
      research[id] = { coins: overrides[id].coins, costs: { ...overrides[id].costs }, requires };
      continue;
    }
    const u = unitValue(id);
    if (!Number.isFinite(u) || u <= 0) fail(`${id}单线产值无效`);
    const total = researchTotal(u);
    if (!Number.isFinite(total) || total <= 0) fail(`${id}研发总价无效`);
    const kReference = BigInt(Math.max(0, Math.round(kReferenceScale * Math.log10(u / kReferenceBase))));
    const kinds = Object.keys(node.costs);
    const share = kinds.length ? total / 3 / kinds.length : 0;
    const costs = {};
    let materialValue = 0n;
    for (const material of kinds) {
      const price = BigInt(items[material].price);
      let quantity = BigInt(Math.round(share / Number(price)));
      const cap = materialCap(material, kReference);
      if (quantity > cap) quantity = cap;
      if (quantity < 1n) quantity = 1n;
      costs[material] = quantity.toString();
      materialValue += quantity * price;
    }
    research[id] = { coins: roundSignificant(total - Number(materialValue)).toString(), costs, requires };
  }

  // Catalogue/save format stays at 1.14; the economic policy has its own
  // version so original export packages remain compatible.
  return { version: baseline.version, balanceVersion, initial: [...catalogue.initial], items, research };
}

// Descriptive generation metadata, not an independent verification or a
// calendar-time simulation. Processing/refining capacity remain separate.
export function summarizeGeneratedBalance(catalogue, baseline, policy) {
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
  let materialValue = 0n;
  let baseProcessing = 0n;
  let baseRefining = 0n;
  let materialMajority = 0;
  for (const node of Object.values(catalogue.research)) {
    coins += BigInt(node.coins);
    let nodeMaterials = 0n;
    for (const [input, quantity] of Object.entries(node.costs)) {
      const work = workFor(input);
      const amount = BigInt(quantity);
      nodeMaterials += amount * BigInt(catalogue.items[input].price);
      baseProcessing += amount * (work.agricultural + work.animal);
      baseRefining += amount * work.refining;
    }
    materialValue += nodeMaterials;
    if (nodeMaterials > BigInt(node.coins)) materialMajority += 1;
  }
  function hours(numerator, denominator = 1n) {
    const divisor = denominator * 3600n;
    const micros = (numerator * 1000000n + divisor / 2n) / divisor;
    return `${micros / 1000000n}.${String(micros % 1000000n).padStart(6, '0')}`;
  }
  const sample = (ids, pick) => Object.fromEntries(ids.filter((id) => pick(id)).map((id) => [id, pick(id)]));
  return {
    coverage: {
      items: Object.keys(catalogue.items).length,
      recipes: Object.values(catalogue.items).filter((item) => Object.keys(item.inputs).length > 0).length,
      research: Object.keys(catalogue.research).length,
    },
    prices,
    samplePrices: sample(['C01', 'C12', 'C13', 'C50', 'L01', 'F01', 'L10', 'I01', 'P01', 'IL01', 'P150', 'PD18', 'PT50'],
      (id) => catalogue.items[id] && { old: baseline.items[id].price, generated: catalogue.items[id].price }),
    research: {
      coins: coins.toString(),
      materialValueAtBasePrice: materialValue.toString(),
      nodesWithMaterialsAboveCoins: materialMajority,
      overrides: Object.keys(policy?.researchOverrides ?? {}),
      samples: sample(['C02', 'C12', 'C13', 'L01', 'F01', 'C50', 'L10', 'PT50', 'PD18'], (id) => catalogue.research[id]
        && { coins: catalogue.research[id].coins, costs: catalogue.research[id].costs }),
    },
    processing: { baseHours: hours(baseProcessing) },
    refining: { baseHours: hours(baseRefining) },
  };
}
