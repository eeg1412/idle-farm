import { readFile, writeFile } from 'node:fs/promises';
import { kindCounts, productLevels } from './catalog-rules.mjs';
import { assertCatalogDurationSpacing } from './lib/catalog-duration-spacing.mjs';
import { applyLongTermBalance, balanceDetails, summarizeGeneratedBalance, taskCoinCaps } from './long-term-balance.mjs';

const args = new Set(process.argv.slice(2));
for (const arg of args) {
  if (!['--check', '--details'].includes(arg)) throw new Error(`未知目录生成参数：${arg}`);
}
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [catalogue, researchTable, stockTable, legacyJson, cropUses, baselineJson, scaleJson] = await Promise.all([
  read('docs/expansion/05-catalog.md'),
  read('docs/expansion/06-research.md'),
  read('docs/expansion/02-livestock-fish.md'),
  read('src/content/catalog.json'),
  read('docs/expansion/08-crop-uses.md'),
  read('src/content/balance-baseline-v114.json'),
  read('src/content/economy-scale.json'),
]);

const levelFor = productLevels(cropUses);
const baseline = JSON.parse(baselineJson);
const sectorByKind = { C: '农业', I: '农业', L: '畜牧', IL: '畜牧', F: '水产', IF: '水产', M: '矿业', IM: '矿业' };
const sectorOrder = ['农业', '畜牧', '水产', '矿业'];
const idPattern = /^(C|IL|IF|IM|I|L|F|M|PL|PF|PD|PT|PM|P)(\d{2,3})$/;

function fail(message) {
  throw new Error(message);
}

function readRows(markdown, title, header, includeId = () => true) {
  const lines = markdown.split(/\r?\n/);
  if (!lines.includes(header)) fail(`${title}缺少表头：${header}`);
  const columnCount = header.split('|').length - 2;
  let tableHeader;
  return lines.flatMap((line, index) => {
    if (!line.startsWith('|')) return [];
    if (!lines[index - 1]?.startsWith('|')) tableHeader = line;
    const fields = line.split('|').slice(1, -1).map((field) => field.trim());
    if (!/^[A-Z]+\d/.test(fields[0] ?? '')) return [];
    if (!includeId(fields[0])) return [];
    if (tableHeader !== header || !line.endsWith('|') || fields.length !== columnCount || !idPattern.test(fields[0])) fail(`${title}中的行无效：${line}`);
    return [fields];
  });
}

function positiveInteger(text, label) {
  if (!/^[1-9]\d*$/.test(text)) fail(`${label}必须为正整数：${text}`);
  return text;
}

function integerNumber(text, label) {
  const amount = Number(positiveInteger(text, label));
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

function ids(text, label) {
  if (text === '—') return [];
  const result = text.split('、');
  if (result.some((id) => !idPattern.test(id)) || new Set(result).size !== result.length) {
    fail(`${label}包含无效或重复的 ID：${text}`);
  }
  return result;
}

const stock = new Map();
for (const [id, subject, name] of readRows(stockTable, '养殖表', '| ID | 对象 | 产物 |', (id) => /^[LF]\d/.test(id))) {
  if (stock.has(id) || !subject || !name) fail(`${id}的养殖对象无效`);
  stock.set(id, { subject, name });
}

const items = {};
const names = new Set();
for (const [id, name, seconds, recipe] of readRows(catalogue, '物品表', '| ID | 名称 | 基础周期下界秒 | 每批投入 |')) {
  if (Object.hasOwn(items, id) || !name || names.has(name)) fail(`物品 ID 或名称无效：${id} ${name}`);
  names.add(name);
  const [, kind, rankText] = idPattern.exec(id);
  const rank = Number(rankText);
  if (rank < 1 || rank > kindCounts[kind] || id !== kind + String(rank).padStart(2, '0')) fail(`物品编号无效：${id}`);
  const minimumSeconds = integerNumber(seconds, `${id}基础周期下界`);
  const inputs = amounts(recipe, `${id}配方`);
  const hasInputs = Object.keys(inputs).length > 0;
  if (/^[CLFM]$/.test(kind) ? hasInputs : !hasInputs) fail(`${id}的生产配方不符合品类`);
  const animal = stock.get(id);
  if ((kind === 'L' || kind === 'F') && (!animal || animal.name !== name)) fail(`${id}的物品表与养殖表不一致`);
  items[id] = { name, ...(animal ? { subject: animal.subject } : {}), minimumSeconds, inputs, kind };
}
for (const id of stock.keys()) {
  if (!items[id]) fail(`养殖表有未知品项：${id}`);
}

for (const [kind, count] of Object.entries(kindCounts)) {
  for (let rank = 1; rank <= count; rank += 1) {
    const id = kind + String(rank).padStart(2, '0');
    if (!Object.hasOwn(items, id)) fail(`物品表缺少 ${id}`);
  }
}

const recipeIdsByInputs = new Map();
for (const [id, item] of Object.entries(items)) {
  if (Object.keys(item.inputs).length) {
    const signature = JSON.stringify(Object.entries(item.inputs).sort());
    const duplicate = recipeIdsByInputs.get(signature);
    if (duplicate) fail(`${id}与${duplicate}的配方投入重复`);
    recipeIdsByInputs.set(signature, id);
  }
  for (const key of Object.keys(item.inputs)) {
    const input = items[key];
    if (!input) fail(`${id}使用了未知材料 ${key}`);
    if (item.kind.startsWith('P') && !input.kind.startsWith('I')) fail(`${id}的商品配方只能使用中间产物：${key}`);
    if (!sectorByKind[input.kind]) fail(`${id}使用了成品 ${key}`);
    const miningInput = input.kind === 'M' || (input.kind === 'IM' && Number(idPattern.exec(key)[2]) < Number(idPattern.exec(id)[2])) || ['I', 'IL', 'IF'].includes(input.kind);
    if (item.kind === 'IM' ? !miningInput : item.kind.startsWith('I') && (sectorByKind[input.kind] !== sectorByKind[item.kind] || (input.kind.startsWith('I') && Number(idPattern.exec(key)[2]) >= Number(idPattern.exec(id)[2])))) {
      fail(`${id}的中间产物配方违反同来源或依赖顺序：${key}`);
    }
  }
}

// Carry all upstream industries through IM, rather than treating every IM as pure mining.
const resolvingSources = new Set();
function resolveSources(id) {
  const item = items[id];
  if (item.sources) return item.sources;
  if (resolvingSources.has(id)) fail(`生产来源依赖成环：${id}`);
  resolvingSources.add(id);
  const inputs = Object.keys(item.inputs);
  const sectors = new Set(inputs.flatMap(resolveSources));
  item.sources = inputs.length ? sectorOrder.filter((sector) => sectors.has(sector)) : [sectorByKind[item.kind]];
  resolvingSources.delete(id);
  if (item.kind === 'IM' && !sectors.has('矿业')) fail(`${id}的矿业中间产物缺少矿业投入`);
  return item.sources;
}
for (const [id, item] of Object.entries(items)) {
  resolveSources(id);
  if (item.kind.startsWith('P')) {
    const expectedSources = { P: ['农业'], PL: ['畜牧'], PF: ['水产'] }[item.kind];
    const expectedCount = expectedSources?.length ?? (item.kind === 'PD' ? 2 : item.kind === 'PT' ? 3 : item.sources.length);
    if (item.sources.length !== expectedCount || (expectedSources && expectedSources[0] !== item.sources[0])) fail(`${id}的来源类别不符合品类`);
    if (item.kind === 'PM' ? !item.sources.includes('矿业') : item.sources.includes('矿业')) fail(`${id}的矿业来源与商品品类不符`);
    item.level = levelFor(item.kind, Number(idPattern.exec(id)[2]), item.sources.length);
  }
}

const { initial } = JSON.parse(legacyJson);
if (!Array.isArray(initial) || initial.join(',') !== 'C01,I01' || initial.some((id) => !items[id])) fail('初始品项应为小麦与面粉');
const research = {};
for (const [id, name, requirements, materials] of readRows(researchTable, '研发表', '| ID | 名称 | 前置研发或初始品项 | 耗材 ID |')) {
  if (!items[id] || items[id].name !== name || Object.hasOwn(research, id) || initial.includes(id)) fail(`研发品项无效：${id}`);
  const requires = ids(requirements, `${id}研发前置`);
  const costs = Object.fromEntries(ids(materials, `${id}研发耗材`).map((key) => [key, true]));
  if (requires.some((key) => key === id || !items[key])) fail(`${id}的研发前置无效`);
  for (const key of [...Object.keys(costs), ...Object.keys(items[id].inputs)]) {
    if (!requires.includes(key)) fail(`${id}的材料 ${key} 缺少研发前置`);
  }
  research[id] = { costs, requires };
}
if (Object.keys(research).length + initial.length !== Object.keys(items).length) fail('部分物品缺少研发条件');

const { coinScale } = JSON.parse(scaleJson) ?? {};
const result = applyLongTermBalance({ initial, items, research }, baseline, coinScale);
assertCatalogDurationSpacing(result.balanced.items);
const destinations = [
  ['src/content/game-data.json', result.balanced],
  ['src/content/task-coin-caps.json', taskCoinCaps(result)],
];
for (const [path, value] of destinations) {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  if (args.has('--check')) {
    if (await read(path) !== output) fail(`${path}与扩展式样不一致。请运行 npm run content:generate。`);
  } else {
    await writeFile(new URL(path, root), output);
  }
}
const summary = summarizeGeneratedBalance(result);
console.log(`${result.balanced.balanceVersion}：${summary.items} 个品项、${summary.recipes} 条配方、${summary.research} 个研发节点。`);
if (!args.has('--check')) console.log(JSON.stringify(summary, null, 2));
if (args.has('--details')) console.log(JSON.stringify(balanceDetails(result), null, 2));
