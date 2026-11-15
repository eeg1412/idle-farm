import catalog from '../content/game-data.json' with { type: 'json' };

const levelLimit = 5;
const basis = 10000n;
const cropReferences = ['C02', 'C04', 'C08', 'C11', 'C17', 'C22', 'C28', 'C35', 'C42', 'C50'];

export const techDefinitions = [
  { key: 'recipeDiscount', name: '配方笔记', source: '通用', description: '种子与配方的实物研发成本每级降低 10%' },
  { key: 'qualityDiscount', name: '品质手册', source: '通用', description: '品质提升的实物成本每级降低 10%' },
  { key: 'cropBuy', name: '土地议价', source: '农业', description: '农田购买价格每级降低 10%' },
  { key: 'cropUpgrade', name: '田地改造', source: '农业', description: '农田升级价格每级降低 10%' },
  { key: 'cropYield', name: '丰收栽培', source: '农业', description: '农田每批收成每级增加 1 件' },
  { key: 'appraisal', name: '经营评估', source: '通用', description: '出售牧场时，基础研发点倍率每级增加 0.2' },
  { key: 'workshopSpeed', name: '工坊提速', source: '通用', description: '工坊生产速率每级提高 20%' },
  { key: 'delegation', name: '代管时长', source: '通用', description: '离线结算上限每级增加 2 小时' },
  { key: 'livestockBuy', name: '畜牧场议价', source: '畜牧', description: '畜牧场购买价格每级降低 10%', item: 'L01' },
  { key: 'livestockUpgrade', name: '畜牧场改造', source: '畜牧', description: '畜牧场升级价格每级降低 10%', item: 'L01' },
  { key: 'livestockYield', name: '畜群培育', source: '畜牧', description: '畜牧场每批产出每级增加 1 件', item: 'L01' },
  { key: 'livestockResearch', name: '畜牧研发手册', source: '畜牧', description: '牲畜与畜牧加工配方的实物研发成本每级降低 10%', item: 'L01' },
  { key: 'livestockQuality', name: '畜牧品质手册', source: '畜牧', description: '畜牧原料与中间产物的实物品质成本每级降低 10%', item: 'L01' },
  { key: 'livestockProcessing', name: '畜牧加工提速', source: '畜牧', description: '畜牧中间产物生产速率每级提高 5%', item: 'L01' },
  { key: 'livestockCycle', name: '畜牧周期改良', source: '畜牧', description: '畜牧场生产速率每级提高 10%', item: 'L05', prerequisite: 'livestockYield' },
  { key: 'livestockRefining', name: '畜牧精制专精', source: '畜牧', description: '含畜牧原料来源的商品精制速率每级提高 5%', item: 'PL01', prerequisite: 'livestockProcessing' },
  { key: 'fishBuy', name: '鱼池议价', source: '水产', description: '鱼池购买价格每级降低 10%', item: 'F01' },
  { key: 'fishUpgrade', name: '鱼池改造', source: '水产', description: '鱼池升级价格每级降低 10%', item: 'F01' },
  { key: 'fishYield', name: '鱼群培育', source: '水产', description: '鱼池每批产出每级增加 1 件', item: 'F01' },
  { key: 'fishResearch', name: '水产研发手册', source: '水产', description: '鱼类与水产加工配方的实物研发成本每级降低 10%', item: 'F01' },
  { key: 'fishQuality', name: '水产品质手册', source: '水产', description: '水产原料与中间产物的实物品质成本每级降低 10%', item: 'F01' },
  { key: 'fishProcessing', name: '水产加工提速', source: '水产', description: '水产中间产物生产速率每级提高 5%', item: 'F01' },
  { key: 'fishCycle', name: '水产周期改良', source: '水产', description: '鱼池生产速率每级提高 10%', item: 'F05', prerequisite: 'fishYield' },
  { key: 'fishRefining', name: '水产精制专精', source: '水产', description: '含水产原料来源的商品精制速率每级提高 5%', item: 'PF01', prerequisite: 'fishProcessing' },
];

const techByKey = Object.fromEntries(techDefinitions.map((definition) => [definition.key, definition]));
const yieldKeys = { C: 'cropYield', L: 'livestockYield', F: 'fishYield' };
const qualityKeys = { L: 'livestockQuality', IL: 'livestockQuality', F: 'fishQuality', IF: 'fishQuality' };
const researchKeys = { L: 'livestockResearch', IL: 'livestockResearch', F: 'fishResearch', IF: 'fishResearch' };
const extraQualityInputs = { C: { I01: '1' }, L: { C01: '1' }, F: { I01: '1' } };
const effectDefinitions = {
  cropYield: ['每批额外产出', 0, 1, '件'],
  livestockYield: ['每批额外产出', 0, 1, '件'],
  fishYield: ['每批额外产出', 0, 1, '件'],
  appraisal: ['经营评估倍率', 10, 2, '倍', 10],
  delegation: ['离线结算上限', 2, 2, '小时'],
  workshopSpeed: ['生产速率加成', 0, 20, '%'],
  livestockProcessing: ['生产速率加成', 0, 5, '%'],
  fishProcessing: ['生产速率加成', 0, 5, '%'],
  livestockCycle: ['生产速率加成', 0, 10, '%'],
  fishCycle: ['生产速率加成', 0, 10, '%'],
  livestockRefining: ['生产速率加成', 0, 5, '%'],
  fishRefining: ['生产速率加成', 0, 5, '%'],
};

const techLevel = (world, key) => world.tech[key] ?? 0;
const held = (world, id) => world.inventory[id] ?? 0n;
const canPay = (world, coins, costs) => world.coins >= coins && costs.every(([id, amount]) => held(world, id) >= amount);

export const discount = (world, key) => 1000 * techLevel(world, key);
export const appraisalLevel = (world) => techLevel(world, 'appraisal');
export const delegationHours = (world) => 2 + 2 * techLevel(world, 'delegation');
export const facilityYieldBonus = (world, kind) => BigInt(techLevel(world, yieldKeys[kind]));

export function rate(world, id) {
  const item = catalog.items[id];
  if (!item || item.kind === 'C') return 10000;
  if (item.kind === 'L') return 10000 + 1000 * techLevel(world, 'livestockCycle');
  if (item.kind === 'F') return 10000 + 1000 * techLevel(world, 'fishCycle');

  const base = 10000 + 2000 * techLevel(world, 'workshopSpeed');
  if (item.kind === 'IL') return base + 500 * techLevel(world, 'livestockProcessing');
  if (item.kind === 'IF') return base + 500 * techLevel(world, 'fishProcessing');
  if (item.kind === 'I') return base;

  const livestock = item.sources.includes('畜牧') ? techLevel(world, 'livestockRefining') : 0;
  const fish = item.sources.includes('水产') ? techLevel(world, 'fishRefining') : 0;
  return base + 500 * (livestock + fish);
}

function discounted(amount, reduction) {
  return (amount * BigInt(10000 - reduction) + basis - 1n) / basis;
}

function pay(world, offer) {
  world.coins -= offer.coins;
  for (const [id, amount] of offer.costs) world.inventory[id] = held(world, id) - amount;
}

export function researchOffer(world, id) {
  const node = catalog.research[id];
  if (!node || world.unlocked.includes(id)) return null;

  const requires = node.requires.filter((required) => !world.unlocked.includes(required));
  const eligible = requires.length === 0;
  const reduction = discount(world, researchKeys[catalog.items[id].kind] ?? 'recipeDiscount');
  const coins = BigInt(node.coins);
  const costs = Object.entries(node.costs).map(([material, count]) => [material, discounted(BigInt(count), reduction)]);
  return { eligible, affordable: canPay(world, coins, costs), coins, costs, requires };
}

export function research(world, id) {
  const offer = researchOffer(world, id);
  if (!offer?.eligible || !offer.affordable) return false;
  pay(world, offer);
  world.unlocked.push(id);
  return true;
}

function priceAt(item, quality) {
  const base = BigInt(item.price);
  const linearStep = base * 12n / 100n || 1n;
  const overTen = quality > 10n ? quality - 10n : 0n;
  return base + (quality - 1n) * linearStep + base * overTen ** 2n / 1000n;
}

export function unitPrice(world, id) {
  const item = catalog.items[id];
  return item ? priceAt(item, BigInt(world.quality[id] ?? '1')) : 0n;
}

function qualityCoinFactor(item, id) {
  if (item.kind === 'L' || item.kind === 'F') {
    const ref = cropReferences[Number(id.slice(1)) - 1];
    return 10n * (20n + 4n * BigInt(catalog.items[ref].price));
  }
  return 20n + 4n * BigInt(item.price);
}

function qualitySum(level) {
  return level * (level + 1n) / 2n - 1n;
}

function qualitySquareSum(level) {
  return level * (level + 1n) * (2n * level + 1n) / 6n - 1n;
}

function affordableTarget(current, quote) {
  let low = current;
  let distance = 1n;
  while (quote(current + distance).affordable) {
    low = current + distance;
    distance *= 2n;
  }
  let high = current + distance;
  while (high - low > 1n) {
    const middle = (low + high) / 2n;
    if (quote(middle).affordable) low = middle;
    else high = middle;
  }
  return low;
}

export function qualityOffer(world, id, steps = 1n) {
  const item = catalog.items[id];
  if (!item || !world.unlocked.includes(id)) return null;
  if (steps !== 'max' && (typeof steps !== 'bigint' || steps < 1n)) return null;

  const current = BigInt(world.quality[id] ?? '1');
  const reduction = discount(world, qualityKeys[item.kind] ?? 'qualityDiscount');
  const coefficients = Object.fromEntries(Object.entries(extraQualityInputs[item.kind] ?? item.inputs)
    .map(([material, amount]) => [material, BigInt(amount)]));
  coefficients[id] = (coefficients[id] ?? 0n) + 2n;
  const factor = qualityCoinFactor(item, id);
  const currentSquareSum = qualitySquareSum(current);
  const currentSum = qualitySum(current);
  const materials = Object.entries(coefficients).map(([material, coefficient]) => ({
    id: material, coefficient, levelCost: material === id ? 1n : 0n,
  }));

  const quote = (target) => {
    const sum = qualitySum(target);
    const coins = factor * (qualitySquareSum(target) - currentSquareSum);
    const costs = materials.map(({ id: material, coefficient, levelCost }) => [material,
      discounted(coefficient * sum + levelCost * (target - 1n), reduction) -
        discounted(coefficient * currentSum + levelCost * (current - 1n), reduction),
    ]).filter(([, count]) => count > 0n);
    return { coins, costs, affordable: canPay(world, coins, costs) };
  };

  const target = steps === 'max' ? affordableTarget(current, quote) : current + steps;
  const cost = quote(target);
  return { ...cost, affordable: target > current && cost.affordable, current, target,
    currentPrice: priceAt(item, current), nextPrice: priceAt(item, target) };
}

export function upgradeQuality(world, id, steps = 1n) {
  const offer = qualityOffer(world, id, steps);
  if (!offer?.affordable) return false;
  pay(world, offer);
  world.quality[id] = offer.target.toString();
  return true;
}

export function techOffer(world, key) {
  if (!Object.hasOwn(techByKey, key)) return null;
  const definition = techByKey[key];
  const level = techLevel(world, key);
  const requires = [];
  if (definition.prerequisite && techLevel(world, definition.prerequisite) < levelLimit) {
    requires.push(`${techByKey[definition.prerequisite].name} 5 级`);
  }
  if (definition.item && !world.unlocked.includes(definition.item)) {
    const item = catalog.items[definition.item];
    requires.push(`已研发${item.subject ?? item.name}`);
  }
  const maxed = level >= levelLimit;
  const cost = maxed ? 0n : BigInt(definition.prerequisite ? 4 : 1) << BigInt(level);
  const [label, initial, step, unit, divisor = 1] = effectDefinitions[key] ?? ['费用减免', 0, 10, '%'];
  const nextLevel = Math.min(levelLimit, level + 1);
  const effect = { label, unit, current: (initial + level * step) / divisor,
    next: (initial + nextLevel * step) / divisor };
  return { level, maxed, cost, eligible: !maxed && requires.length === 0,
    affordable: !maxed && world.researchPoints >= cost, requires, effect };
}

export function upgradeTech(world, key) {
  const offer = techOffer(world, key);
  if (!offer?.eligible || !offer.affordable) return false;
  world.researchPoints -= offer.cost;
  world.tech[key] = offer.level + 1;
  return true;
}
