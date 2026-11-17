import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const entries = Object.entries;
const keys = Object.keys;
const sum = (values) => values.reduce((total, value) => total + value, 0n);
const max = (values) => values.reduce((best, value) => value > best ? value : best, 0n);
const ceil = (numerator, denominator) => (numerator + denominator - 1n) / denominator;

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function fraction(n, d = 1n) {
  const divisor = gcd(n < 0n ? -n : n, d);
  return { n: n / divisor, d: d / divisor };
}

const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const compare = (a, b) => a.n * b.d - b.n * a.d;
const sumFractions = (values) => values.reduce(add, fraction(0n));
const rate = ({ n, d }) => fraction(3n * d + n, 3n * d);

const idPattern = /^(?:C|I[LF]?|L|F|P[LFDT]?)\d{2,3}$/;
function tableRows(markdown, width) {
  const rows = markdown.split(/\r?\n/).map((line) => line.split('|').slice(1, -1).map((part) => part.trim()))
    .filter(([id]) => idPattern.test(id ?? ''));
  assert.equal(new Set(rows.map(([id]) => id)).size, rows.length, '目录 ID 重复');
  assert(rows.every((row) => row.length === width), '目录表列数');
  return rows;
}

export async function loadCatalogueInputs() {
  const [catalogue, researchText] = await Promise.all(
    ['05-catalog.md', '06-research.md'].map((file) => readFile(new URL('docs/expansion/' + file, root), 'utf8')),
  );
  const source = new Map(tableRows(catalogue, 4).map(([id, name, seconds, inputs]) => [
    id, { name, lower: BigInt(seconds), inputs: Object.fromEntries(inputs === '—' ? [] :
      inputs.split(/\s*\+\s*/).map((term) => {
        const [amount, input] = term.split('×');
        assert.match(amount, /^[1-9]\d*$/, id + ' 配方数量');
        assert.match(input, idPattern, id + ' 配方 ID');
        return [input, amount];
      })) },
  ]));
  const split = (value) => value === '—' ? [] : value.split('、').map((id) => id.trim());
  const research = new Map(tableRows(researchText, 4).map(([id, , overrides, materials]) =>
    [id, { requires: split(overrides), materials: split(materials) }]));
  return { source, research };
}

function walk(map, dependencies, visit) {
  const output = new Map();
  const stack = new Set();
  function recurse(id) {
    if (output.has(id)) return output.get(id);
    assert(map.has(id), '未知前置 ' + id);
    assert(!stack.has(id), '依赖成环 ' + id);
    const item = map.get(id);
    stack.add(id);
    for (const upstream of dependencies(item)) recurse(upstream);
    const row = visit(id, item, output);
    stack.delete(id);
    output.set(id, row);
    return row;
  }
  for (const id of map.keys()) recurse(id);
  return output;
}

function catalogModel(inputs, runtime, scale) {
  const use = new Map(Array.from(inputs.keys(), (id) => [id, 0n]));
  for (const { inputs: materials } of inputs.values()) {
    for (const [id, count] of entries(materials)) {
      assert(use.has(id), '配方输入未定义 ' + id);
      use.set(id, use.get(id) + BigInt(count));
    }
  }
  const quantity = new Map(Array.from(use, ([id, count]) => {
    let batches = 1n;
    while (2n * batches ** 2n <= count) batches += 1n;
    return [id, batches];
  }));
  return walk(inputs, (row) => keys(row.inputs), (id, item, prior) => {
    const out = quantity.get(id);
    assert(item.lower >= 1n && item.lower <= 43200n, id + ' 基础周期下界');
    const recipe = entries(item.inputs).map(([input, count]) => [prior.get(input), BigInt(count)]);
    const allocated = sumFractions(recipe.map(([a, count]) => fraction(a.work.n * count, a.work.d * a.out)));
    const workAt = (seconds) => add(fraction(seconds), allocated);
    const target = sumFractions(recipe.map(([a]) => rate(a.work)));
    const baseline = max([item.lower, ...recipe.flatMap(([a, count]) =>
      [ceil(11n * a.t, 10n), ceil(11n * count * a.t, 10n * a.out)])]);
    const allowed = (t) => t >= baseline && (!recipe.length ||
      compare(add(rate(workAt(t)), fraction(-out, t)), fraction(11n * target.n, 10n * target.d)) >= 0n);
    const actual = runtime[id];
    assert(actual, '生成漏项 ' + id);
    assert(Number.isSafeInteger(actual.durationMs) && actual.durationMs % 1000 === 0, id + ' 周期非整秒');
    const t = BigInt(actual.durationMs) / 1000n;
    assert(t >= 1n && t <= 43200n && allowed(t), id + ' 周期／供料／同窗理论约束');
    assert(!allowed(t - 1n), id + ' 周期不是最小整秒');
    const work = workAt(t);
    const targetRate = rate(work);
    const price = scale * t * targetRate.n / (targetRate.d * out);
    assert(price >= 10n, id + ' 单价低于 10 金');
    assert.equal(actual.output, String(out), id + ' 动态基础批量');
    assert.equal(actual.price, String(price), id + ' 单价');
    assert.deepEqual(actual.inputs, item.inputs, id + ' 配方投入');
    const valueRate = fraction(price * out, t);
    const upstreamRate = sumFractions(recipe.map(([item]) => item.valueRate));
    if (recipe.length) {
      assert(compare(valueRate, fraction(11n * upstreamRate.n, 10n * upstreamRate.d)) > 0n, id + ' 同窗不严格递增');
      assert(5n * price * out >= 6n * sum(recipe.map(([a, count]) => count * a.price)), id + ' 投料增值不足');
    }
    const coldStart = t + max(recipe.map(([a, count]) => a.coldStart + ceil(count, a.out) * a.t));
    return { id, use: use.get(id), t, out, work, price, valueRate, coldStart, upstreamRate,
      recipe: recipe.length > 0, extended: t > item.lower };
  });
}

function verifyResearch(catalogue, inputs, generated, scale) {
  assert.deepEqual(keys(generated).sort(), [...inputs.keys()].sort(), '生成研发 ID');
  return walk(inputs, (row) => row.requires.filter((id) => inputs.has(id)), (id, row, checked) => {
    const actual = generated[id];
    const { work } = catalogue.get(id);
    assert.deepEqual([...actual.requires].sort(), [...row.requires].sort(), id + ' 研发前置');
    assert.deepEqual(keys(actual.costs).sort(), [...row.materials].sort(), id + ' 研发耗材 ID');
    const rateAtWork = rate(work);
    const base = ceil(scale * (60n * work.d + work.n) * rateAtWork.n, 2n * work.d * rateAtWork.d);
    const materials = row.materials.map((key) => catalogue.get(key));
    const minimum = sum(materials.map(({ price }) => price));
    const prior = row.requires.filter((key) => catalogue.get(key).recipe && checked.has(key));
    const total = max([base, ceil(5n * minimum, 2n), minimum + 10n * scale, ...prior.map((key) => checked.get(key).total)]);
    const seconds = max([300n, ceil(work.n, work.d) > 3600n ? 3600n : ceil(work.n, work.d)]);
    const extra = max([0n, total / 3n - minimum]);
    const value = sum(materials.map((material) => {
      const limit = max([1n, seconds * material.out / material.t]);
      const count = 1n + extra / (BigInt(materials.length) * material.price);
      const expected = count > limit ? limit : count;
      assert.equal(actual.costs[material.id], String(expected), id + ' 耗材数量 ' + material.id);
      return expected * material.price;
    }));
    assert.equal(actual.coins, String(total - value), id + ' 研发金币');
    assert(5n * value <= 2n * total, id + ' 研发材料占比超过 40%');
    return { total, value, coins: total - value };
  });
}

function verifyReachability(catalogue, sources) {
  const unlocked = new Set(catalogue.initial);
  const producible = new Set();
  while (true) {
    const before = unlocked.size + producible.size;
    for (const id of unlocked) {
      if (keys(catalogue.items[id].inputs).every((input) => producible.has(input))) producible.add(id);
    }
    for (const [id, row] of sources.research) {
      if (row.requires.every((input) => unlocked.has(input)) &&
        row.materials.every((input) => producible.has(input))) unlocked.add(id);
    }
    if (unlocked.size + producible.size === before) break;
  }
  assert.equal(producible.size, sources.source.size, '研发／生产联合可达性');
}

export function verifyCatalogue(runtime, sources, coinScale) {
  const scale = BigInt(coinScale);
  assert.deepEqual(keys(runtime.items).sort(), [...sources.source.keys()].sort(), '运行目录 ID');
  assert.deepEqual([...runtime.initial].sort(), ['C01', 'I01'], '初始解锁');
  const model = catalogModel(sources.source, runtime.items, scale);
  const ordered = [...model.values()].sort((a, b) => {
    const byWork = compare(a.work, b.work);
    return Math.sign(Number(byWork || compare(a.valueRate, b.valueRate)));
  });
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1];
    const b = ordered[i];
    if (compare(a.work, b.work)) assert(compare(a.valueRate, b.valueRate) < 0n, a.id + '/' + b.id + ' 工时收益序');
  }
  const research = verifyResearch(model, sources.research, runtime.research, scale);
  verifyReachability(runtime, sources);
  const recipes = ordered.filter(({ recipe }) => recipe);
  const samples = ['C01', 'C05', 'F01', 'I01', 'IF01', 'P01', 'P02', 'P169'].map((id) => {
    const { t, out, price, work, coldStart } = model.get(id);
    return { id, t, out, price, work: work.n + '/' + work.d, coldStart };
  });
  const lowestWindow = recipes.map((row) => ({
    id: row.id, ratio: fraction(row.valueRate.n * row.upstreamRate.d, row.valueRate.d * row.upstreamRate.n),
  })).sort((a, b) => Math.sign(Number(compare(a.ratio, b.ratio))))[0];
  const lowest = ordered.reduce((best, row) => row.price < best.price ? row : best);
  return {
    items: model.size, recipes: recipes.length, research: research.size,
    extendedCycles: recipes.filter((row) => row.extended).length,
    maxBatchSeconds: max(ordered.map((row) => row.t)), maxColdStartSeconds: max(ordered.map((row) => row.coldStart)),
    researchCoins: sum([...research.values()].map((row) => row.coins)),
    researchMaterialsValue: sum([...research.values()].map((row) => row.value)),
    lowestPrice: { id: lowest.id, coins: lowest.price },
    lowestWindow: { id: lowestWindow.id, ratio: Number(lowestWindow.ratio.n) / Number(lowestWindow.ratio.d) }, samples,
  };
}

export function verifyCatalogueAppend(runtime, sources, coinScale, generate) {
  const rank = Math.max(...[...sources.source.keys()].filter((id) => /^I\d+$/.test(id)).map((id) => Number(id.slice(1))));
  const id = 'I' + (rank + 1);
  const usage = sum([...sources.source.values()].map(({ inputs }) => BigInt(inputs.C15 ?? 0)));
  const shift = 2n * BigInt(runtime.items.C15.output) ** 2n - usage;
  assert(shift > 0n, 'C15 用量已超过当前产量档');
  const addition = { name: '验证用新配方', lower: 1n, inputs: { C15: String(shift) } };
  const fields = { ...addition, kind: 'I', sources: ['农业'] };
  const source = new Map([...sources.source, [id, fields]]);
  const research = new Map([...sources.research, [id, { requires: ['C15'], materials: ['C15'] }]]);
  const items = Object.fromEntries([...source].map(([id, { lower, ...row }]) => [
    id, { ...runtime.items[id], ...row, minimumSeconds: Number(lower) },
  ]));
  const researchInput = Object.fromEntries([...research].map(([id, { requires, materials }]) => [
    id, { requires, costs: Object.fromEntries(materials.map((material) => [material, true])) },
  ]));
  const { balanced } = generate({ initial: runtime.initial, items, research: researchInput }, runtime, coinScale);
  const { balanced: repeat } = generate({ initial: runtime.initial, items, research: researchInput }, runtime, coinScale);
  assert.equal(JSON.stringify(balanced), JSON.stringify(repeat), '同一目录重复生成不一致');
  const stats = verifyCatalogue(balanced, { source, research }, coinScale);
  assert.equal(Number(balanced.items.C15.output), Number(runtime.items.C15.output) + 1, '追加配方未使 C15 越过产量档');
  const changedPrices = keys(runtime.items).filter((key) => runtime.items[key].price !== balanced.items[key].price);
  const changedQuotes = keys(runtime.research).filter((key) => JSON.stringify(runtime.research[key]) !== JSON.stringify(balanced.research[key]));
  assert(changedPrices.some((key) => key !== 'C15') && changedQuotes.length > 0, '追加配方未重新派生下游售价与研究报价');
  return { items: stats.items, recipe: id, material: 'C15', outputBefore: runtime.items.C15.output,
    outputAfter: balanced.items.C15.output, changedPrices: changedPrices.length, changedQuotes: changedQuotes.length };
}

export function verifyMinimumPrice(runtime, sources, generate) {
  const rank = Math.max(...keys(runtime.items).filter((id) => /^C\d+$/.test(id)).map((id) => Number(id.slice(1))));
  const id = 'C' + (rank + 1);
  const items = Object.fromEntries([...sources.source].map(([key, { lower, ...row }]) => [
    key, { ...runtime.items[key], ...row, minimumSeconds: Number(lower) },
  ]));
  items[id] = { name: '最低价验证用作物', kind: 'C', sources: ['农业'], minimumSeconds: 1, inputs: {} };
  const research = { ...runtime.research, [id]: { requires: [], costs: {} } };
  const catalogue = { initial: runtime.initial, items, research };
  for (const invalid of [0, -1, 1.5, '5', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => generate(catalogue, runtime, invalid), /coinScale 必须为正安全整数/);
  }
  assert.throws(() => generate(catalogue, runtime, 5), new RegExp(id + ' 的单价 6 不足 10 金'));
  const { balanced } = generate(catalogue, runtime, 8);
  assert.equal(balanced.items[id].price, '10', id + ' 最低价边界');
  return { item: id, rejectedPrice: 6, acceptedPrice: 10 };
}
