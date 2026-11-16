import { readFile, writeFile } from 'node:fs/promises';
import { kindCounts, productLevels } from './catalog-rules.mjs';
import { applyLongTermBalance, summarizeGeneratedBalance } from './long-term-balance.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [catalogue, researchTable, stockTable, legacyJson, cropUses, baselineJson, balanceSpec] = await Promise.all([
  read('docs/expansion/05-catalog.md'),
  read('docs/expansion/06-research.md'),
  read('docs/expansion/02-livestock-fish.md'),
  read('src/content/catalog.json'),
  read('docs/expansion/08-crop-uses.md'),
  read('src/content/balance-baseline-v114.json'),
  read('docs/expansion/07-balance-validation.md'),
]);

const levelFor = productLevels(cropUses);
const sectorByKind = { C: '农业', I: '农业', L: '畜牧', IL: '畜牧', F: '水产', IF: '水产' };
const sectorOrder = ['农业', '畜牧', '水产'];
const idPattern = /^(C|IL|IF|I|L|F|PL|PF|PD|PT|P)(\d{2,3})$/;

function fail(message) {
  throw new Error(message);
}

function readRows(markdown, title, columnCount, includeId = () => true) {
  return markdown.split(/\r?\n/).flatMap((line) => {
    if (!line.startsWith('|')) return [];
    const fields = line.split('|').slice(1, -1).map((field) => field.trim());
    if (!/^[A-Z]+\d/.test(fields[0] ?? '')) return [];
    if (!includeId(fields[0])) return [];
    if (!line.endsWith('|') || fields.length !== columnCount || !idPattern.test(fields[0])) fail(`${title}中的行无效：${line}`);
    return [fields];
  });
}

function positiveInteger(text, label) {
  if (!/^[1-9]\d*$/.test(text)) fail(`${label}必须为正整数：${text}`);
  return text;
}

function integerNumber(text, label) {
  if (!/^(0|[1-9]\d*)$/.test(text)) fail(`${label}必须为非负整数：${text}`);
  const amount = Number(text);
  if (!Number.isSafeInteger(amount)) fail(`${label}超出安全范围：${text}`);
  return amount;
}

function amounts(text, label) {
  if (text === '—') return {};
  const parsed = {};
  for (const term of text.split(/\s*\+\s*/)) {
    const match = /^([1-9]\d*)×([A-Z]+\d+)$/.exec(term);
    if (!match || !idPattern.test(match[2])) fail(`${label}的材料无效：${term}`);
    const [, count, id] = match;
    if (Object.hasOwn(parsed, id)) fail(`${label}的材料重复：${id}`);
    parsed[id] = count;
  }
  return parsed;
}

// Exactly one table directly under `heading`, with the frozen header.
function specTable(markdown, heading, header) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) fail(`07缺少「${heading}」`);
  const end = lines.findIndex((line, index) => index > start && /^#{1,3} /.test(line));
  const section = lines.slice(start + 1, end === -1 ? undefined : end).map((line) => line.trim());
  const top = section.findIndex((line) => line.replace(/\s+/g, ' ') === header);
  if (top === -1) fail(`07「${heading}」缺少表头 ${header}`);
  if (!/^\|(\s*:?-{3,}:?\s*\|)+$/.test(section[top + 1] ?? '')) fail(`07「${heading}」表格分隔行无效`);
  const columns = header.split('|').length - 2;
  const rows = [];
  for (const line of section.slice(top + 2)) {
    if (!line.startsWith('|')) break;
    const fields = line.split('|').slice(1, -1).map((field) => field.trim().replace(/^`(.*)`$/, '$1'));
    if (!line.endsWith('|') || fields.length !== columns) fail(`07「${heading}」行无效：${line}`);
    rows.push(fields);
  }
  if (!rows.length) fail(`07「${heading}」表格为空`);
  return rows;
}

const anchorRows = specTable(balanceSpec, '### 7.7 研发总价锚点', '| e锚点 | 基准值B | 材料时限秒 |');
if (anchorRows.length !== 6) fail(`07研发总价锚点应为6行：${anchorRows.length}`);
const researchAnchors = anchorRows.map(([e, b, capSeconds]) => ({
  e: BigInt(positiveInteger(e, '研发e锚点')),
  b: BigInt(positiveInteger(b, '研发基准值B')),
  capSeconds: BigInt(positiveInteger(capSeconds, '研发材料时限秒')),
}));
const researchOverrides = {};
for (const [id, coins, materials] of specTable(balanceSpec, '### 7.8 研发引导覆盖', '| ID | 金币 | 材料 |')) {
  if (!idPattern.test(id) || Object.hasOwn(researchOverrides, id)) fail(`07研发引导覆盖ID无效：${id}`);
  const costs = amounts(materials, `07研发引导覆盖${id}`);
  if (!Object.keys(costs).length) fail(`07研发引导覆盖${id}缺少材料`);
  researchOverrides[id] = { coins: positiveInteger(coins, `07研发引导覆盖${id}金币`), costs };
}
const researchPolicy = { researchAnchors, researchOverrides };

const stock = new Map();
for (const [id, subject, name, seconds, output, price, production] of readRows(stockTable, '养殖表', 7, (id) => /^[LF]\d/.test(id))) {
  if (stock.has(id) || !subject) fail(`${id}的养殖对象无效`);
  const generation = integerNumber(seconds, `${id}耗时`);
  const productionSeconds = integerNumber(positiveInteger(production, `${id}生产秒`), `${id}生产秒`);
  if (generation < 1 || generation > 300) fail(`${id}耗时超出品类范围：${seconds}`);
  if (id.startsWith('L') && productionSeconds !== 4 * generation) fail(`${id}生产秒必须为4×耗时：${production}`);
  if (id.startsWith('F') && productionSeconds > 14400) fail(`${id}生产秒不得超过14400：${production}`);
  stock.set(id, { subject, name, seconds, output, price, productionSeconds });
}

const items = {};
for (const [id, name, seconds, output, price, recipe] of readRows(catalogue, '物品表', 6)) {
  if (Object.hasOwn(items, id) || !name) fail(`物品无效：${id}`);
  const [, kind, rankText] = idPattern.exec(id);
  const rank = Number(rankText);
  if (rank < 1 || rank > kindCounts[kind] || id !== kind + String(rank).padStart(2, '0')) fail(`物品编号无效：${id}`);
  const cycle = integerNumber(seconds, `${id}耗时`);
  const limit = kind.startsWith('P') ? 1800 : kind.startsWith('I') ? 600 : 300;
  if (cycle < 1 || cycle > limit) fail(`${id}耗时超出品类范围：${seconds}`);
  const inputs = amounts(recipe, `${id}配方`);
  if (kind.length === 1 && 'CLF'.includes(kind) && Object.keys(inputs).length) fail(`${id}原料不能有生产配方`);
  if (/^[IP]/.test(kind) && (output !== '1' || !Object.keys(inputs).length)) fail(`${id}的单批投入或产量无效`);
  const animal = stock.get(id);
  if ((kind === 'L' || kind === 'F') && (!animal || animal.name !== name || animal.seconds !== seconds || animal.output !== output || animal.price !== price)) {
    fail(`${id}的物品表与养殖表不一致`);
  }
  // g (耗时) is the generation second; t is the production cycle: crops t=g,
  // livestock/fish t=养殖表「生产秒」. Only t reaches game-data.json.
  const production = animal ? animal.productionSeconds : cycle;
  items[id] = {
    name,
    ...(animal ? { subject: animal.subject } : {}),
    durationMs: production * 1000,
    output: positiveInteger(output, `${id}产量`),
    price: positiveInteger(price, `${id}售价`),
    inputs,
    kind,
    generationSeconds: cycle,
  };
}

for (const [kind, count] of Object.entries(kindCounts)) {
  for (let rank = 1; rank <= count; rank += 1) {
    const id = kind + String(rank).padStart(2, '0');
    if (!Object.hasOwn(items, id)) fail(`物品表缺少 ${id}`);
  }
}

for (const [id, item] of Object.entries(items)) {
  const ingredientSectors = new Set();
  let inputValue = 0n;
  for (const [key, count] of Object.entries(item.inputs)) {
    const input = items[key];
    if (!input) fail(`${id}使用了未知材料 ${key}`);
    if (item.kind.startsWith('P') && !input.kind.startsWith('I')) fail(`${id}的商品配方只能使用中间产物：${key}`);
    if (!sectorByKind[input.kind]) fail(`${id}使用了成品 ${key}`);
    if (item.kind.startsWith('I') && (sectorByKind[input.kind] !== sectorByKind[item.kind] || (input.kind.startsWith('I') && Number(idPattern.exec(key)[2]) >= Number(idPattern.exec(id)[2])))) {
      fail(`${id}的中间产物配方违反同来源或依赖顺序：${key}`);
    }
    ingredientSectors.add(sectorByKind[input.kind]);
    inputValue += BigInt(input.price) * BigInt(count);
  }
  if (inputValue >= BigInt(item.price)) fail(`${id}售价未覆盖投入`);
  item.sources = item.kind.startsWith('P') ? sectorOrder.filter((sector) => ingredientSectors.has(sector)) : [sectorByKind[item.kind]];
  if (item.kind.startsWith('P')) {
    const expectedSources = { P: ['农业'], PL: ['畜牧'], PF: ['水产'] }[item.kind];
    const expectedCount = expectedSources?.length ?? (item.kind === 'PD' ? 2 : 3);
    if (item.sources.length !== expectedCount || (expectedSources && expectedSources[0] !== item.sources[0])) fail(`${id}的来源类别不符合品类`);
    item.level = levelFor(item.kind, Number(idPattern.exec(id)[2]), item.sources.length);
  }
}

const { initial } = JSON.parse(legacyJson);
if (!Array.isArray(initial) || initial.join(',') !== 'C01,I01' || initial.some((id) => !items[id])) fail('初始品项应为小麦与面粉');
const research = {};
for (const [id, name, requirements, price, materials] of readRows(researchTable, '研发表', 5)) {
  if (!items[id] || items[id].name !== name || Object.hasOwn(research, id) || initial.includes(id)) fail(`研发品项无效：${id}`);
  const costs = amounts(materials, `${id}研发`);
  const requires = requirements === '—' ? [] : requirements.split('、');
  if (requires.length !== new Set(requires).size || requires.some((key) => key === id || !items[key])) fail(`${id}的研发前置无效`);
  for (const key of [...Object.keys(costs), ...Object.keys(items[id].inputs)]) {
    if (!requires.includes(key)) fail(`${id}的材料 ${key} 缺少研发前置`);
  }
  research[id] = {
    coins: positiveInteger(price, `${id}研发金币`),
    costs,
    requires,
  };
}

if (Object.keys(research).length + initial.length !== Object.keys(items).length) fail('部分物品缺少研发条件');
const reachable = new Set(initial);
const pending = new Set(Object.keys(research));
while (pending.size) {
  const previous = pending.size;
  for (const id of pending) {
    if (!research[id].requires.every((key) => reachable.has(key))) continue;
    reachable.add(id);
    pending.delete(id);
  }
  if (pending.size === previous) fail(`研发前置无法解锁：${[...pending].join('、')}`);
}

// Detail tables retain their historical inputs; only topology, generation
// seconds, recipe output, research prerequisites and research material kinds
// are checked against the immutable 1.14 snapshot (never game-data.json).
// LT-2026-11-v4 prices raw goods by generation g and production cycle t
// (σ·5g²(g+127)·t/(1000·20016·out)), recipes by markup plus work value, and
// regenerates every research node's coins and material quantities from its era
// value e using the 07 §7.7 anchors and material time limits; the 07 §7.8 guide
// override replaces the listed entry node. See docs/expansion/07.
const baseline = JSON.parse(baselineJson);
const balanced = applyLongTermBalance({ initial, items, research }, baseline, researchPolicy);
const output = `${JSON.stringify(balanced, null, 2)}\n`;
const destination = new URL('src/content/game-data.json', root);
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== output) {
    fail('运行目录与扩展式样不一致。请重新生成 game-data.json。');
  }
  console.log(`运行目录：${Object.keys(items).length} 个品项，${Object.keys(research).length} 个研发节点。`);
} else {
  await writeFile(destination, output);
  console.log(`已生成 ${balanced.balanceVersion}：${Object.keys(balanced.items).length} 个品项，${Object.keys(balanced.research).length} 个研发节点。`);
  console.log(JSON.stringify(summarizeGeneratedBalance(balanced, baseline, researchPolicy), null, 2));
}
