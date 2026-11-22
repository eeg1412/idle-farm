import catalog from '../content/game-data.json' with { type: 'json' };

const basis = 10000n;
const discountPerLevel = 100;
const appraisalPerLevel = 200;
const workshopPerLevel = 200;
const processingPerLevel = 50;
const cyclePerLevel = 100;
const yieldPerLevel = 200;

export const marketBaseUpwardChance = 50;
export const marketUpwardChancePerLevel = 1;
export const marketBaseMaximumIncrease = 90;
export const marketMaximumIncreasePerLevel = 11;
const merchantBaseMarkup = 200;
const merchantMarkupReduction = 5;

export const techDefinitions = [
  { key: 'recipeDiscount', budget: 125_000n, name: '配方笔记', source: '通用' },
  { key: 'cropBuy', budget: 125_000n, name: '土地议价', source: '农业' },
  { key: 'cropUpgrade', budget: 125_000n, name: '田地改造', source: '农业' },
  { key: 'cropYield', budget: 420_000n, baseCost: 150n, name: '丰收栽培', source: '农业' },
  { key: 'cropResearch', budget: 125_000n, name: '农业研发手册', source: '农业' },
  { key: 'cropProcessing', budget: 100_000n, name: '农业加工提速', source: '农业' },
  { key: 'cropCycle', budget: 230_000n, baseCost: 50n, name: '作物周期改良', source: '农业', item: 'C05', prerequisite: 'cropYield', prerequisiteLevel: 20 },
  { key: 'cropRefining', budget: 230_000n, name: '农业精制专精', source: '农业', item: 'P01', prerequisite: 'cropProcessing', prerequisiteLevel: 20 },
  { key: 'appraisal', budget: 250_000n, baseCost: 50n, name: '经营评估', source: '通用' },
  { key: 'workshopSpeed', budget: 320_000n, baseCost: 75n, name: '工坊提速', source: '通用' },
  { key: 'delegation', budget: 140_000n, baseCost: 50n, name: '代管时长', source: '通用' },
  { key: 'livestockBuy', budget: 125_000n, name: '养殖场议价', source: '畜牧', item: 'L01' },
  { key: 'livestockUpgrade', budget: 125_000n, name: '养殖场改造', source: '畜牧', item: 'L01' },
  { key: 'livestockYield', budget: 420_000n, baseCost: 150n, name: '畜群培育', source: '畜牧', item: 'L01' },
  { key: 'livestockResearch', budget: 125_000n, name: '畜牧研发手册', source: '畜牧', item: 'L01' },
  { key: 'livestockProcessing', budget: 100_000n, name: '畜牧加工提速', source: '畜牧', item: 'L01' },
  { key: 'livestockCycle', budget: 230_000n, baseCost: 50n, name: '畜牧周期改良', source: '畜牧', item: 'L05', prerequisite: 'livestockYield', prerequisiteLevel: 20 },
  { key: 'livestockRefining', budget: 230_000n, name: '畜牧精制专精', source: '畜牧', item: 'PL01', prerequisite: 'livestockProcessing', prerequisiteLevel: 20 },
  { key: 'fishBuy', budget: 125_000n, name: '鱼塘议价', source: '水产', item: 'F01' },
  { key: 'fishUpgrade', budget: 125_000n, name: '鱼塘改造', source: '水产', item: 'F01' },
  { key: 'fishYield', budget: 420_000n, baseCost: 150n, name: '鱼群培育', source: '水产', item: 'F01' },
  { key: 'fishResearch', budget: 125_000n, name: '水产研发手册', source: '水产', item: 'F01' },
  { key: 'fishProcessing', budget: 100_000n, name: '水产加工提速', source: '水产', item: 'F01' },
  { key: 'fishCycle', budget: 230_000n, baseCost: 50n, name: '水产周期改良', source: '水产', item: 'F05', prerequisite: 'fishYield', prerequisiteLevel: 20 },
  { key: 'fishRefining', budget: 230_000n, name: '水产精制专精', source: '水产', item: 'PF01', prerequisite: 'fishProcessing', prerequisiteLevel: 20 },
  { key: 'miningBuy', budget: 125_000n, name: '矿洞议价', source: '矿业', item: 'M01' },
  { key: 'miningUpgrade', budget: 125_000n, name: '矿洞改造', source: '矿业', item: 'M01' },
  { key: 'miningYield', budget: 420_000n, baseCost: 150n, name: '矿产增收', source: '矿业', item: 'M01' },
  { key: 'miningResearch', budget: 125_000n, name: '矿业研发手册', source: '矿业', item: 'M01' },
  { key: 'miningProcessing', budget: 100_000n, name: '矿业加工提速', source: '矿业', item: 'M01' },
  { key: 'miningCycle', budget: 230_000n, baseCost: 50n, name: '开采周期改良', source: '矿业', item: 'M05', prerequisite: 'miningYield', prerequisiteLevel: 20 },
  { key: 'miningRefining', budget: 230_000n, name: '矿业精制专精', source: '矿业', item: 'PM01', prerequisite: 'miningProcessing', prerequisiteLevel: 20 },
  { key: 'basicResearchRate', name: '普通研发点倍率', source: '通用', budget: 200_000n },
  { key: 'marketForecast', name: '市场预测', source: '市场', costs: [60n] },
  { key: 'marketManipulation', name: '市场操纵', source: '市场', costs: [50n, 450n, 2_500n] },
  { key: 'marketPromotion', name: '市场推广', source: '市场',
    costs: [30n, 50n, 80n, 160n, 300n, 580n, 1_100n, 1_800n, 2_500n, 3_400n] },
  { key: 'premiumSales', name: '溢价销售', source: '市场',
    costs: [40n, 60n, 90n, 210n, 400n, 800n, 1_500n, 2_400n, 3_500n, 6_000n] },
  { key: 'merchantRestock', name: '商路调度', source: '市场',
    costs: [30n, 50n, 80n, 160n, 300n, 580n, 1_100n, 1_800n, 2_500n, 3_400n] },
  { key: 'merchantBargaining', name: '采购议价', source: '市场',
    costs: [40n, 60n, 90n, 210n, 400n, 800n, 1_500n, 2_400n, 3_500n, 6_000n] },
].map((definition) => {
  const costs = definition.costs ?? techCostCurve(definition);
  return { ...definition, costs, maxLevel: costs.length, budget: definition.budget ?? costs.reduce((a, b) => a + b, 0n) };
});

function techCostCurve({ key, budget, baseCost = 25n }) {
  const costs = Array.from({ length: 10 }, (_, level) => {
    const k = BigInt(level);
    return baseCost / 25n * (25n + 5n * k + k * k);
  });
  if (key === 'delegation') costs[0] = 15n;
  const remainder = budget - costs.reduce((sum, cost) => sum + cost, 0n);
  const middle = remainder / 4n;
  for (const quota of [middle, remainder - middle]) {
    const previous = costs.at(-1);
    const rest = quota - 20n * previous - 210n;
    if (rest < 0n) throw new Error('Technology budget cannot supply an increasing cost curve: ' + key);
    const blocks = rest / 210n;
    const tail = rest % 210n;
    for (let i = 1n; i <= 20n; i += 1n) {
      costs.push(previous + i * (1n + blocks) + tail / 20n + BigInt(i > 20n - tail % 20n));
    }
  }
  return costs;
}

const techByKey = Object.fromEntries(techDefinitions.map((definition) => [definition.key, definition]));
export const techMaxLevels = Object.fromEntries(techDefinitions.map(({ key, maxLevel }) => [key, maxLevel]));
export const techTotalLevels = techDefinitions.reduce((sum, { maxLevel }) => sum + maxLevel, 0);
const yieldKeys = { C: 'cropYield', L: 'livestockYield', F: 'fishYield', M: 'miningYield' };
const researchKeys = { C: 'cropResearch', I: 'cropResearch', L: 'livestockResearch', IL: 'livestockResearch', F: 'fishResearch', IF: 'fishResearch',
  M: 'miningResearch', IM: 'miningResearch' };
const researchMaterialDiscount = ['研发材料费用降低', 0, discountPerLevel, '%', 100];
const effectDefinitions = {
  recipeDiscount: researchMaterialDiscount,
  cropResearch: researchMaterialDiscount,
  livestockResearch: researchMaterialDiscount,
  fishResearch: researchMaterialDiscount,
  miningResearch: researchMaterialDiscount,
  cropYield: ['增产', 0, yieldPerLevel, '%', 100],
  livestockYield: ['增产', 0, yieldPerLevel, '%', 100],
  fishYield: ['增产', 0, yieldPerLevel, '%', 100],
  miningYield: ['增产', 0, yieldPerLevel, '%', 100],
  appraisal: ['经营评估倍率', 10000, appraisalPerLevel, '倍', 10000],
  workshopSpeed: ['生产提速', 0, workshopPerLevel, '%', 100],
  cropProcessing: ['生产提速', 0, processingPerLevel, '%', 100],
  livestockProcessing: ['生产提速', 0, processingPerLevel, '%', 100],
  fishProcessing: ['生产提速', 0, processingPerLevel, '%', 100],
  miningProcessing: ['生产提速', 0, processingPerLevel, '%', 100],
  cropCycle: ['生产提速', 0, cyclePerLevel, '%', 100],
  livestockCycle: ['生产提速', 0, cyclePerLevel, '%', 100],
  fishCycle: ['生产提速', 0, cyclePerLevel, '%', 100],
  miningCycle: ['生产提速', 0, cyclePerLevel, '%', 100],
  cropRefining: ['生产提速', 0, processingPerLevel, '%', 100],
  livestockRefining: ['生产提速', 0, processingPerLevel, '%', 100],
  fishRefining: ['生产提速', 0, processingPerLevel, '%', 100],
  miningRefining: ['生产提速', 0, processingPerLevel, '%', 100],
  basicResearchRate: ['每小时普通研发点', 100, 4, '点'],
  marketManipulation: ['每日重置次数', 0, 1, '次'],
  marketForecast: ['明日首次行情', 0, 1, ''],
  marketPromotion: ['上涨方向概率', marketBaseUpwardChance, marketUpwardChancePerLevel, '%'],
  premiumSales: ['最高售价倍率', 100 + marketBaseMaximumIncrease, marketMaximumIncreasePerLevel, '倍', 100],
  merchantRestock: ['每日手动进货次数', 0, 1, '次'],
  merchantBargaining: ['商人售价倍率', merchantBaseMarkup, -merchantMarkupReduction, '倍', 100],
};

const techLevel = (world, key) => world.tech[key] ?? 0;
const held = (world, id) => world.inventory[id] ?? 0n;
const canPay = (world, coins, costs) => world.coins >= coins && costs.every(([id, amount]) => held(world, id) >= amount);

export const discount = (world, key) => discountPerLevel * techLevel(world, key);
export const merchantRestockLimit = (world) => techLevel(world, 'merchantRestock');
export const merchantMarkup = (world) => BigInt(merchantBaseMarkup - merchantMarkupReduction * techLevel(world, 'merchantBargaining'));
export const appraisalLevel = (world) => techLevel(world, 'appraisal');
export const appraisalMultiplierBasisPoints = (world) => 10000 + appraisalPerLevel * appraisalLevel(world);
export const researchHourMs = 3_600_000;
const delegationAnchors = [[0, 6], [10, 12], [20, 24], [35, 48], [50, 72]];

function delegationTime(level) {
  const index = delegationAnchors.findIndex(([cap]) => cap >= level);
  const [upperLevel, upperHours] = delegationAnchors[index];
  const [lowerLevel, lowerHours] = delegationAnchors[Math.max(0, index - 1)];
  return upperLevel === lowerLevel ? upperHours * researchHourMs
    : lowerHours * researchHourMs +
      Math.floor((level - lowerLevel) * (upperHours - lowerHours) * researchHourMs / (upperLevel - lowerLevel));
}

export const delegationMilliseconds = (world) => delegationTime(techLevel(world, 'delegation'));
export const delegationHours = (world) => delegationMilliseconds(world) / researchHourMs;
export const basicResearchHourlyRate = (world) => 100 + 4 * techLevel(world, 'basicResearchRate');
export const facilityYieldBasis = (world, kind) => 10000 + yieldPerLevel * techLevel(world, yieldKeys[kind]);

export function rate(world, id) {
  const item = catalog.items[id];
  if (!item) return 10000;
  if (item.kind === 'C') return 10000 + cyclePerLevel * techLevel(world, 'cropCycle');
  if (item.kind === 'L') return 10000 + cyclePerLevel * techLevel(world, 'livestockCycle');
  if (item.kind === 'F') return 10000 + cyclePerLevel * techLevel(world, 'fishCycle');
  if (item.kind === 'M') return 10000 + cyclePerLevel * techLevel(world, 'miningCycle');

  const base = 10000 + workshopPerLevel * techLevel(world, 'workshopSpeed');
  if (item.kind === 'IL') return base + processingPerLevel * techLevel(world, 'livestockProcessing');
  if (item.kind === 'IF') return base + processingPerLevel * techLevel(world, 'fishProcessing');
  if (item.kind === 'IM') return base + processingPerLevel * techLevel(world, 'miningProcessing');
  if (item.kind === 'I') return base + processingPerLevel * techLevel(world, 'cropProcessing');

  const crop = item.sources.includes('农业') ? techLevel(world, 'cropRefining') : 0;
  const livestock = item.sources.includes('畜牧') ? techLevel(world, 'livestockRefining') : 0;
  const fish = item.sources.includes('水产') ? techLevel(world, 'fishRefining') : 0;
  const mining = item.sources.includes('矿业') ? techLevel(world, 'miningRefining') : 0;
  // Four industry sources may coexist; keep the existing combined speed ceiling.
  return Math.min(25000, base + processingPerLevel * (crop + livestock + fish + mining));
}

function discounted(amount, reduction) {
  return (amount * BigInt(10000 - reduction) + basis - 1n) / basis;
}

function pay(world, offer) {
  world.coins -= offer.coins;
  for (const [id, amount] of offer.costs) world.inventory[id] = held(world, id) - amount;
}

// `unlocked` is an optional Set built once from world.unlocked by callers that make many offers.
export function researchOffer(world, id, unlocked = null) {
  const isUnlocked = unlocked ? (key) => unlocked.has(key) : (key) => world.unlocked.includes(key);
  const node = catalog.research[id];
  if (!Object.hasOwn(catalog.research, id) || isUnlocked(id)) return null;

  const requires = node.requires.filter((required) => !isUnlocked(required));
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

const priceAtQuality = (base, level) => base + (level - 1n) * ((base + 5n) / 10n);
const qualityLevel = (world, id) => BigInt(world.quality[id] ?? '1');

export function unitPrice(world, id) {
  const item = catalog.items[id];
  return Object.hasOwn(catalog.items, id) ? priceAtQuality(BigInt(item.price), qualityLevel(world, id)) : 0n;
}

export function techOffer(world, key) {
  if (!Object.hasOwn(techByKey, key)) return null;
  const definition = techByKey[key];
  const { maxLevel, prerequisiteLevel } = definition;
  const level = techLevel(world, key);
  const requires = [];
  if (definition.prerequisite && techLevel(world, definition.prerequisite) < prerequisiteLevel) {
    requires.push(`${techByKey[definition.prerequisite].name} ${prerequisiteLevel} 级`);
  }
  if (definition.item && !world.unlocked.includes(definition.item)) {
    const item = catalog.items[definition.item];
    requires.push(`已研发${item.subject ?? item.name}`);
  }
  const maxed = level >= maxLevel;
  const cost = maxed ? 0n : definition.costs[level];
  const [label, initial, step, unit, divisor = 1] = effectDefinitions[key] ?? ['费用降低', 0, discountPerLevel, '%', 100];
  const nextLevel = Math.min(maxLevel, level + 1);
  const effect = key === 'delegation'
    ? { label: '离线结算上限', unit: '分钟', current: delegationTime(level) / 60000, next: delegationTime(nextLevel) / 60000 }
    : { label, unit, current: (initial + level * step) / divisor,
      next: (initial + nextLevel * step) / divisor };
  return { level, maxLevel, maxed, cost, eligible: !maxed && requires.length === 0,
    affordable: !maxed && world.researchPoints >= cost, requires, effect };
}

export function upgradeTech(world, key) {
  const offer = techOffer(world, key);
  if (!offer?.eligible || !offer.affordable) return false;
  world.researchPoints -= offer.cost;
  world.tech[key] = offer.level + 1;
  return true;
}
