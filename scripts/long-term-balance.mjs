// LT-2026-11-v4 catalogue policy (docs/expansion/07). Prices are exact BigInt
// rationals rounded once with ceilDiv. Research is regenerated from era values
// e; only the piecewise power curves (total B and material time limit) use
// floating point, and their results are rounded into decimal strings
// (deterministic data). Sixth roots are corrected exactly in BigInt.
// The caller supplies the immutable 1.14 snapshot (structure only) and the
// research policy tables parsed from 07 §7.7/§7.8. Catalogue items carry the
// internal field generationSeconds (g), which is never written to the output.
export const balanceVersion = 'LT-2026-11-v4';

// σ: sector premium in thousandths (crops 1000, livestock 1050, fish 1150).
const sectorPremium = { C: 1000n, L: 1050n, F: 1150n };
// N(id)=σ·5·g²·(g+127); era value u = N/(1000·eraDenominator).
const eraDenominator = 20016n;
const eraScale = 1000n * eraDenominator;
// Recipe pricing per category, in thousandths: m = material markup, ω = work factor.
const recipeFactors = {
  I: [1200n, 500n], IL: [1200n, 500n], IF: [1200n, 500n],
  P: [1300n, 750n], PL: [1300n, 750n], PF: [1300n, 750n],
  PD: [1350n, 875n],
  PT: [1400n, 1000n],
};
// φ: recipe era factor in thousandths of the highest upstream raw era value.
const recipeEraFactor = {
  I: 1100n, IL: 1100n, IF: 1100n,
  P: 1250n, PL: 1250n, PF: 1250n,
  PD: 1500n,
  PT: 2000n,
};
// Research material caps: 10 k-level facilities or 4 (1+j)-level stations for
// capSeconds(e); station purchase base A_s by material class.
const capFacilities = 10n;
const capStations = 4n;
const stationBase = { I: 750n, P: 950n };

// Notes for the descriptive summary only (never part of game-data.json).
const generationNotes = new WeakMap();

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

function isRecipe(item) {
  return Object.keys(item.inputs).length > 0;
}

// Generation seconds g against the snapshot cycle; output only for livestock
// and recipes (crop output is now 2 and fish output 1 by the v4 tables).
function preserveStructure(catalogue, baseline) {
  if (baseline.version !== '1.14') fail('仅可使用固定1.14原始快照');
  if (catalogue.initial.join(',') !== baseline.initial.join(',')) fail('初始品项发生变化');
  // Appended items (outside the snapshot) must number above the highest
  // snapshot ID of their kind and carry a research node; snapshot IDs keep the
  // per-ID comparison below.
  const rankOf = (id) => Number(/\d+$/.exec(id)?.[0]);
  const snapshotMax = {};
  for (const [id, original] of Object.entries(baseline.items)) {
    snapshotMax[original.kind] = Math.max(snapshotMax[original.kind] ?? 0, rankOf(id));
  }
  for (const [id, item] of Object.entries(catalogue.items)) {
    if (Object.hasOwn(baseline.items, id)) continue;
    if (!snapshotMax[item.kind] || !(rankOf(id) > snapshotMax[item.kind])) fail(`${id}必须追加在${item.kind}类快照最大编号之后`);
    if (!Number.isSafeInteger(item.generationSeconds) || item.generationSeconds <= 0) fail(`${id}缺少代际秒`);
    if (!catalogue.research[id]) fail(`追加品项${id}缺少研发节点`);
  }
  for (const id of Object.keys(catalogue.research)) {
    if (!Object.hasOwn(baseline.research, id) && Object.hasOwn(baseline.items, id)) fail(`${id}的研发覆盖范围发生变化`);
  }
  for (const [id, original] of Object.entries(baseline.items)) {
    const item = catalogue.items[id];
    if (!item || !Number.isSafeInteger(item.generationSeconds) || item.generationSeconds * 1000 !== original.durationMs
      || ((item.kind === 'L' || isRecipe(item)) && item.output !== original.output)
      || ['kind', 'level'].some((key) => item[key] !== original[key])
      || item.sources.join(',') !== original.sources.join(',') || !sameEntries(item.inputs, original.inputs)) {
      fail(`${id}的生产配方、代际秒、产量、来源或等级发生变化`);
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
    if (typeof anchor.e !== 'bigint' || typeof anchor.b !== 'bigint' || typeof anchor.capSeconds !== 'bigint'
      || anchor.e <= 0n || anchor.b <= 0n || anchor.capSeconds <= 0n) fail(`研发锚点${index + 1}无效`);
    if (index && (anchor.e <= anchors[index - 1].e || anchor.b <= anchors[index - 1].b)) fail('研发锚点必须严格递增');
  }
  const overrides = policy.researchOverrides;
  if (!overrides || typeof overrides !== 'object') fail('缺少研发引导覆盖');
  for (const [id, override] of Object.entries(overrides)) {
    if (!research[id]) fail(`引导覆盖${id}不是研发节点`);
    if (!/^[1-9]\d*$/.test(override.coins ?? '')) fail(`引导覆盖${id}金币无效`);
    if (!sameKinds(override.costs, research[id].costs)) fail(`引导覆盖${id}的耗材种类与研发表不一致`);
    if (Object.values(override.costs).some((count) => !/^[1-9]\d*$/.test(count))) fail(`引导覆盖${id}材料数量无效`);
  }
  return {
    anchors: anchors.map((anchor) => ({ e: Number(anchor.e), b: Number(anchor.b), capSeconds: Number(anchor.capSeconds) })),
    overrides,
  };
}

// 3 significant figures, minimum 10.
function roundSignificant(value) {
  if (!Number.isFinite(value) || value < 10) return 10n;
  const exponent = Math.floor(Math.log10(value)) - 2;
  if (exponent <= 0) return BigInt(Math.round(value));
  const rounded = BigInt(Math.round(value / 10 ** exponent)) * 10n ** BigInt(exponent);
  return rounded < 10n ? 10n : rounded;
}

// Largest k ≥ 0 with denominator·k⁶ ≤ numerator: Math.pow estimate, BigInt correction.
function sixthRoot(numerator, denominator) {
  let k = BigInt(Math.max(0, Math.floor(Math.pow(Number(numerator) / Number(denominator), 1 / 6))));
  while (k > 0n && denominator * k ** 6n > numerator) k -= 1n;
  while (denominator * (k + 1n) ** 6n <= numerator) k += 1n;
  return k;
}

// M(k) = W(1+k) = 1 + k + ⌊k²/64⌋.
function levelMultiplier(k) {
  return 1n + k + k * k / 64n;
}

export function applyLongTermBalance(catalogue, baseline, policy) {
  preserveStructure(catalogue, baseline);
  const { anchors, overrides } = validatePolicy(policy, catalogue.research);
  const items = Object.fromEntries(Object.entries(catalogue.items).map(([id, { generationSeconds, ...item }]) => [id, { ...item, inputs: { ...item.inputs }, sources: [...item.sources] }]));

  // Raw goods: N = σ·5·g²·(g+127); price = ceilDiv(N·t, 1000·20016·out),
  // g = generation seconds, t = production cycle (durationMs/1000).
  const rateNumerators = new Map();
  for (const [id, item] of Object.entries(items)) {
    if (isRecipe(item)) continue;
    const sigma = sectorPremium[item.kind];
    if (!sigma) fail(`${id}不是可定价原料`);
    const g = BigInt(catalogue.items[id].generationSeconds);
    const numerator = sigma * 5n * g * g * (g + 127n);
    rateNumerators.set(id, numerator);
    item.price = ceilDiv(numerator * seconds(item, id), eraScale * BigInt(item.output)).toString();
  }

  // N_ref: the largest raw N anywhere upstream (recursive).
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

  // price = ceilDiv(m·V·20016000 + ω·t·N_ref, 1000·20016000), m/ω in thousandths.
  const priced = new Set(rateNumerators.keys());
  function priceFor(id) {
    const item = items[id];
    if (priced.has(id)) return BigInt(item.price);
    const factors = recipeFactors[item.kind];
    if (!factors) fail(`${id}缺少配方定价类别`);
    const [markup, work] = factors;
    const value = Object.entries(item.inputs).reduce((total, [input, count]) => total + priceFor(input) * BigInt(count), 0n);
    item.price = ceilDiv(markup * value * eraScale + work * seconds(item, id) * referenceFor(id), 1000n * eraScale).toString();
    priced.add(id);
    return BigInt(item.price);
  }
  for (const id of Object.keys(items)) priceFor(id);

  // Era value e: raw u = N/(1000·20016); recipes φ/1000 × N_ref/(1000·20016).
  function era(id) {
    const item = items[id];
    if (rateNumerators.has(id)) return Number(rateNumerators.get(id)) / Number(eraScale);
    const phi = recipeEraFactor[item.kind];
    if (!phi) fail(`${id}缺少代际系数`);
    return Number(phi * referenceFor(id)) / Number(1000n * eraScale);
  }
  // Index of the right anchor of the segment containing e (ends extrapolate).
  function segment(e) {
    const upper = anchors.findIndex((anchor) => e < anchor.e);
    if (upper === -1) return anchors.length - 1;
    return upper === 0 ? 1 : upper;
  }
  // Total0 = 2·B(e), log10 B piecewise linear in log10 e through the anchors;
  // both ends extrapolate along their outer segment.
  function researchTotal(e) {
    const exact = anchors.find((anchor) => anchor.e === e);
    if (exact) return 2 * exact.b;
    const upper = segment(e);
    const left = anchors[upper - 1];
    const right = anchors[upper];
    const slope = Math.log10(right.b / left.b) / Math.log10(right.e / left.e);
    return 2 * left.b * Math.pow(e / left.e, slope);
  }
  // capSeconds(e): log10-linear in log10 e through the §7.7 third column,
  // clamped to the end values outside the anchor range.
  function capSecondsFor(e) {
    if (e <= anchors[0].e) return anchors[0].capSeconds;
    if (e >= anchors[anchors.length - 1].e) return anchors[anchors.length - 1].capSeconds;
    const exact = anchors.find((anchor) => anchor.e === e);
    if (exact) return exact.capSeconds;
    const upper = segment(e);
    const left = anchors[upper - 1];
    const right = anchors[upper];
    if (left.capSeconds === right.capSeconds) return left.capSeconds;
    const slope = Math.log10(right.capSeconds / left.capSeconds) / Math.log10(right.e / left.e);
    return left.capSeconds * Math.pow(e / left.e, slope);
  }
  // Raw material: k = ⌊(800·Total/300)^(1/6)⌋, cap = ⌊10·capSeconds·out·M(k)/t⌋.
  // Recipe material: j = ⌊(2000·Total/A_s)^(1/6)⌋, cap = ⌊4·capSeconds·W(1+j)/t⌋.
  // t is the material's own production cycle; Total is floored to an integer
  // for the exact root.
  function materialCap(id, total, limitSeconds) {
    const item = items[id];
    const t = Number(seconds(item, id));
    const whole = BigInt(Math.floor(total));
    if (rateNumerators.has(id)) {
      const k = sixthRoot(800n * whole, 300n);
      return BigInt(Math.floor(Number(capFacilities) * limitSeconds * Number(item.output) * Number(levelMultiplier(k)) / t));
    }
    const base = stationBase[item.kind[0]];
    if (!base) fail(`${id}缺少工位购买基价`);
    const j = sixthRoot(2000n * whole, base);
    return BigInt(Math.floor(Number(capStations) * limitSeconds * Number(levelMultiplier(j)) / t));
  }

  const eras = new Map();
  const baseTotals = new Map();
  for (const id of Object.keys(catalogue.research)) {
    if (Object.hasOwn(overrides, id)) continue;
    const e = era(id);
    if (!Number.isFinite(e) || e <= 0) fail(`${id}代际值无效`);
    const total = researchTotal(e);
    if (!Number.isFinite(total) || total <= 0) fail(`${id}研发总价无效`);
    eras.set(id, e);
    baseTotals.set(id, total);
  }
  // Recipe cap: dependents(y) = {x | y ∈ research[x].requires, x not overridden};
  // Total(y) = min(Total0(y), min dependents' Total) for non-overridden recipes,
  // resolved in reverse topological order of requires (memoised recursion over
  // dependents). Raw nodes are not capped.
  const dependents = new Map();
  for (const [id, node] of Object.entries(catalogue.research)) {
    if (Object.hasOwn(overrides, id)) continue;
    for (const key of node.requires) {
      if (!dependents.has(key)) dependents.set(key, []);
      dependents.get(key).push(id);
    }
  }
  const totals = new Map();
  const visiting = new Set();
  function cappedTotal(id) {
    if (totals.has(id)) return totals.get(id);
    if (visiting.has(id)) fail(`${id}的研发前置成环`);
    visiting.add(id);
    let total = baseTotals.get(id);
    if (isRecipe(items[id])) {
      for (const dependent of dependents.get(id) ?? []) {
        const limit = cappedTotal(dependent);
        if (limit < total) total = limit;
      }
    }
    visiting.delete(id);
    totals.set(id, total);
    return total;
  }

  const research = {};
  for (const [id, node] of Object.entries(catalogue.research)) {
    const requires = [...node.requires];
    if (Object.hasOwn(overrides, id)) {
      research[id] = { coins: overrides[id].coins, costs: { ...overrides[id].costs }, requires };
      continue;
    }
    const total = cappedTotal(id);
    const limitSeconds = capSecondsFor(eras.get(id));
    const kinds = Object.keys(node.costs);
    const share = kinds.length ? total / 3 / kinds.length : 0;
    const costs = {};
    let materialValue = 0n;
    for (const material of kinds) {
      const price = BigInt(items[material].price);
      let quantity = BigInt(Math.round(share / Number(price)));
      const cap = materialCap(material, total, limitSeconds);
      if (quantity > cap) quantity = cap;
      if (quantity < 1n) quantity = 1n;
      costs[material] = quantity.toString();
      materialValue += quantity * price;
    }
    research[id] = { coins: roundSignificant(total - Number(materialValue)).toString(), costs, requires };
  }

  // Catalogue/save format stays at 1.14; the economic policy has its own
  // version so original export packages remain compatible.
  const result = { version: baseline.version, balanceVersion, initial: [...catalogue.initial], items, research };
  generationNotes.set(result, {
    eras: new Map(Object.keys(items).map((id) => [id, era(id)])),
    capped: [...totals].filter(([id, total]) => total < baseTotals.get(id)).map(([id]) => id),
  });
  return result;
}

// Descriptive generation metadata, not an independent verification or a
// calendar-time simulation. Processing/refining capacity remain separate.
export function summarizeGeneratedBalance(catalogue, baseline, policy) {
  const notes = generationNotes.get(catalogue);
  // Items outside the 1.14 snapshot are counted as added and never compared
  // with an old price.
  const prices = { changed: 0, unchanged: 0, added: 0, byKind: {} };
  for (const [id, item] of Object.entries(catalogue.items)) {
    if (!Object.hasOwn(baseline.items, id)) {
      prices.added += 1;
      continue;
    }
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
  const nodeTotals = new Map();
  for (const [id, node] of Object.entries(catalogue.research)) {
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
    nodeTotals.set(id, BigInt(node.coins) + nodeMaterials);
    if (nodeMaterials > BigInt(node.coins)) materialMajority += 1;
  }
  function hours(numerator, denominator = 1n) {
    const divisor = denominator * 3600n;
    const micros = (numerator * 1000000n + divisor / 2n) / divisor;
    return `${micros / 1000000n}.${String(micros % 1000000n).padStart(6, '0')}`;
  }
  const byTotal = (left, right) => (left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : left[0] < right[0] ? -1 : 1);
  const cheapestSum = (filter, count) => [...nodeTotals].filter(([id]) => filter(id)).sort(byTotal).slice(0, count)
    .reduce((sum, [, total]) => sum + total, 0n).toString();
  const maxNode = [...nodeTotals].sort(byTotal).at(-1)?.[0];
  // Raw prices must rise strictly with the era value within C, L and F (equal era, equal price).
  const priceOrderViolations = [];
  if (notes) {
    for (const kind of ['C', 'L', 'F']) {
      const ids = Object.keys(catalogue.items).filter((id) => catalogue.items[id].kind === kind)
        .sort((left, right) => notes.eras.get(left) - notes.eras.get(right) || (left < right ? -1 : 1));
      for (let index = 1; index < ids.length; index += 1) {
        const [previous, current] = [ids[index - 1], ids[index]];
        const [low, high] = [BigInt(catalogue.items[previous].price), BigInt(catalogue.items[current].price)];
        const sameEra = notes.eras.get(previous) === notes.eras.get(current);
        if (sameEra ? low !== high : low >= high) priceOrderViolations.push(`${previous}≥${current}`);
      }
    }
  }
  const sample = (ids, pick) => Object.fromEntries(ids.filter((id) => pick(id)).map((id) => [id, pick(id)]));
  return {
    coverage: {
      items: Object.keys(catalogue.items).length,
      recipes: Object.values(catalogue.items).filter((item) => Object.keys(item.inputs).length > 0).length,
      research: Object.keys(catalogue.research).length,
    },
    prices,
    priceOrderViolations,
    samplePrices: sample(['C01', 'C02', 'C10', 'C13', 'C25', 'C35', 'C50', 'L01', 'L05', 'L10', 'F01', 'F05', 'F10', 'I01', 'P01', 'IL01', 'P150', 'PD18', 'PT50'],
      (id) => catalogue.items[id] && Object.hasOwn(baseline.items, id) && {
        old: baseline.items[id].price,
        generated: catalogue.items[id].price,
        durationMs: catalogue.items[id].durationMs,
        output: catalogue.items[id].output,
      }),
    research: {
      coins: coins.toString(),
      materialValueAtBasePrice: materialValue.toString(),
      nodesWithMaterialsAboveCoins: materialMajority,
      overrides: Object.keys(policy?.researchOverrides ?? {}),
      cappedNodes: notes?.capped ?? [],
      cheapest18Total: cheapestSum(() => true, 18),
      cheapest25PPrefixedTotal: cheapestSum((id) => id.startsWith('P'), 25),
      cheapest25KindPTotal: cheapestSum((id) => catalogue.items[id].kind === 'P', 25),
      maxNode,
      samples: sample(['C02', 'C10', 'L01', 'L04', 'F01', 'F03', 'F04', 'IL01', 'IF01', 'P01', 'PD01', maxNode], (id) => catalogue.research[id]
        && { coins: catalogue.research[id].coins, costs: catalogue.research[id].costs, total: nodeTotals.get(id).toString() }),
    },
    processing: { baseHours: hours(baseProcessing) },
    refining: { baseHours: hours(baseRefining) },
  };
}
