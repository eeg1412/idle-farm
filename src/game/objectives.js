import catalog from '../content/game-data.json' with { type: 'json' };
import generatedCoinCaps from '../content/task-coin-caps.json' with { type: 'json' };
import { techDefinitions, techTotalLevels } from './advancement.js';
import { coinScale } from './coin-scale.js';
import { qualityDrawTaskTargets } from './quality-tasks.js';

const destination = (target, tab) => tab ? { target, tab } : { target };
const field = destination('庄园', '田地');
const livestock = destination('庄园', '畜牧');
const fish = destination('庄园', '鱼池');
const mining = destination('庄园', '矿洞');
const processing = destination('工坊', '加工');
const refining = destination('工坊', '精制');
const warehouse = destination('仓库');
const research = destination('研究');
const codex = destination('图鉴');
const farmSale = destination('出售庄园');

// The base rewards also cap the recalculated amounts after applying coinScale.
const baseCoinRewards = {
  firstHarvest: 340n,
  firstFlour: 390n,
  breadRecipe: 460n,
  firstBread: 570n,
  firstSale: 710n,
  firstPlot: 870n,
  firstUpgrade: 1_100n,
  firstSeed: 1_700n,
  firstSwitch: 2_100n,
  reserveStock: 2_600n,
  addProcessor: 2_700n,
  addRefinery: 2_900n,
  stationUpgrade: 3_100n,
  recipeTrio: 2_900n,
  fieldLevel10: 46_000n,
  codex20: 80_000n,
  livestockIntro: 14_000n,
  buildLivestock: 3_500n,
  collectLivestock: 3_500n,
  livestockUpgrade: 4_500n,
  fishIntro: 18_000n,
  buildFish: 4_500n,
  collectFish: 4_500n,
  fishUpgrade: 4_500n,
  firstLivestockProcessing: 20_000n,
  firstFishProcessing: 25_000n,
  miningIntro: 18_000n,
  buildMine: 4_500n,
  collectMining: 4_500n,
  miningUpgrade: 4_500n,
  firstMiningProcessing: 25_000n,
  firstMixedProduct: 70_000n,
  newFarm: 20_000_000_000n,
  firstTech: 10_000_000_000n,
  delegationTech: 10_000_000_000n,
  moreFields: 730_000_000n,
  farmIncome: 43_000_000_000n,
  recipeCollection: 14_000_000n,
  milleCrepe: 460_000_000_000_000n,
  itemCollection: 2_800_000_000_000_000n,
  threeSectorGift: 2_700_000_000_000_000n,
  collection100: 1_100_000_000n,
  collection200: 290_000_000_000n,
  collection300: 5_000_000_000_000n,
  collection400: 69_000_000_000_000n,
  facilityLevel50: 92_000_000n,
  facilityLevel100: 5_900_000_000n,
  facilityLevel200: 380_000_000_000n,
  facilityLevel400: 25_000_000_000_000n,
  stationLevel10: 110_000n,
  stationLevel50: 230_000_000n,
  stationLevel100: 14_000_000_000n,
  stationLevel200: 970_000_000_000n,
  techLevel25: 530_000_000_000n,
  techLevel100: 2_500_000_000_000n,
  techLevel300: 47_000_000_000_000n,
  techLevel600: 490_000_000_000_000n,
  techLevel900: 1_600_000_000_000_000n,
  techLevel1200: 11_000_000_000_000_000n,
  runs5: 1_900_000_000_000n,
  runs20: 47_000_000_000_000n,
  runs50: 760_000_000_000_000n,
  runs100: 3_700_000_000_000_000n,
  livestockTop: 45_000_000_000_000n,
  fishTop: 62_000_000_000_000n,
  miningTop: 62_000_000_000_000n,
  miningProduct: 2_700_000_000_000_000n,
};

// Fixed research-point rewards. They are committed with the task settlement and never
// enter T/credit or the appraisal multiplier.
export const taskResearchPointRewards = Object.freeze({
  firstSale: 1n,
  collection200: 500n,
  collection300: 2_000n,
  collection400: 6_000n,
  itemCollection: 19_451n,
  runs5: 200n,
  runs20: 1_000n,
  runs50: 3_000n,
  runs100: 8_000n,
});

// Lifetime production value T (prestige ledger) each gated task needs before it counts as done.
export const taskProductionGates = Object.freeze({
  newFarm: 520_000n * coinScale,
  runs5: 8_000_000_000n * coinScale,
  runs20: 800_000_000_000n * coinScale,
  runs50: 32_000_000_000_000n * coinScale,
  runs100: 280_000_000_000_000n * coinScale,
});

const produced = (world, id) => world.stats.produced[id] ?? 0n;
const learned = (world, id) => BigInt(world.unlocked.includes(id));
const countWhere = (list, predicate) => BigInt(list.filter(predicate).length);
const maxLevel = (list) => list.reduce((highest, entry) => {
  const level = BigInt(entry.level ?? '1');
  return level > highest ? level : highest;
}, 1n);
const techTotal = (world) => BigInt(techDefinitions.reduce((total, { key }) => total + (world.tech[key] ?? 0), 0));
const allStations = (world) => [...world.stations.I, ...world.stations.P];
const allFacilities = (world) => Object.values(world.facilities).flat();
const unlockedCount = (world) => BigInt(world.unlocked.length);
const runs = (world) => BigInt(world.completedRuns);
const sumProduced = (world, predicate) => Object.entries(world.stats.produced)
  .filter(([id]) => predicate(catalog.items[id]))
  .reduce((total, [, count]) => total + count, 0n);

const qualityDraws = (world) => world.qualityDraws;
const qualityTask = (id) => [id, `品质抽取 ${qualityDrawTaskTargets[id]} 次`, '累计完成 {目标} 次品质抽取',
  research, qualityDraws, qualityDrawTaskTargets[id]];

const plotCondition = '累计购买至少 {目标} 块额外田地';
const fieldLevelCondition = '将任意一块田地升到 {目标} 级';
const stationLevelCondition = '将任意加工位或精制位升到 {目标} 级';
const recipeCondition = '研发至少 {目标} 种精制配方';
const codexCondition = '解锁至少 {目标} 种图鉴物品';
const facilityLevelCondition = '将任意田地、养殖场、鱼池或矿洞升到 {目标} 级';
const techCondition = '永久科技的总等级达到 {目标} 级';
const runCondition = '累计出售庄园至少 {目标} 次';

// Tuples are [id, name, condition, destination, count(world), required = 1n, branch].
const mainGuide = [
  ['firstHarvest', '第一次收成', '让至少 {目标} 份小麦入库', field, (world) => produced(world, 'C01')],
  ['firstFlour', '磨出面粉', '加工并入库至少 {目标} 份面粉', processing, (world) => produced(world, 'I01')],
  ['breadRecipe', '研发乡村面包', '解锁乡村面包的精制配方', research, (world) => learned(world, 'P01')],
  ['firstBread', '烤出乡村面包', '精制并入库至少 {目标} 份乡村面包', refining, (world) => produced(world, 'P01')],
  ['firstSale', '第一次出货', '在仓库售出至少 {目标} 件物品', warehouse, (world) => world.stats.sold],
  ['firstPlot', '扩建田地', plotCondition, field, (world) => world.stats.plots],
  ['firstUpgrade', '田地升级', fieldLevelCondition, field, (world) => maxLevel(world.facilities.C), 2n],
  ['firstSeed', '研发甘蔗', '解锁甘蔗种子', research, (world) => learned(world, 'C02')],
  ['firstSwitch', '改种新作物', '在任意田地种下小麦以外的作物', field,
    (world) => countWhere(world.facilities.C, (slot) => slot.recipe && slot.recipe !== 'C01')],
  ['reserveStock', '设置保留量', '为任一物品设置大于 0 的加工保留量', warehouse,
    (world) => BigInt(Object.keys(world.reserves).length)],
  ['addProcessor', '添置加工位', '让工坊拥有至少 {目标} 个加工位', processing, (world) => BigInt(world.stations.I.length), 2n],
  ['addRefinery', '添置精制位', '让工坊拥有至少 {目标} 个精制位', refining, (world) => BigInt(world.stations.P.length), 2n],
  ['stationUpgrade', '升级工位', stationLevelCondition, processing, (world) => maxLevel(allStations(world)), 2n],
  ['recipeTrio', '扩充配方', recipeCondition, research, (world) => countWhere(world.unlocked, (id) => id.startsWith('P')), 3n],
  ['fieldLevel10', '田地十级', fieldLevelCondition, field, (world) => maxLevel(world.facilities.C), 10n],
  ['codex20', '图鉴收录', codexCondition, codex, unlockedCount, 20n],
];

// Displayed after the first sale. Tasks moved here keep their IDs, conditions and receipts.
const buyLivestockCondition = '累计购买至少 {目标} 座养殖场';
const buyFishCondition = '累计购买至少 {目标} 座鱼池';
const buyMineCondition = '累计购买至少 {目标} 座矿洞';
const introductionBranches = [
  ['livestockIntro', '建造第一座养殖场', buyLivestockCondition, livestock, (world) => world.stats.boughtL, 1n, '畜牧'],
  ['buildLivestock', '建造养殖场', buyLivestockCondition, livestock, (world) => world.stats.boughtL, 1n, '畜牧'],
  ['collectLivestock', '畜牧产物入库', '生产并入库至少 {目标} 份畜牧产物', livestock,
    (world) => sumProduced(world, (item) => item?.kind === 'L'), 1n, '畜牧'],
  ['livestockUpgrade', '养殖场升级', '将任意一座养殖场升到 {目标} 级', livestock,
    (world) => maxLevel(world.facilities.L), 5n, '畜牧'],
  ['firstLivestockProcessing', '加工畜牧原料', '加工并入库至少 {目标} 份畜牧中间产物', processing,
    (world) => sumProduced(world, (item) => item?.kind === 'IL'), 1n, '畜牧'],
  ['fishIntro', '建造第一座鱼池', buyFishCondition, fish, (world) => world.stats.boughtF, 1n, '水产'],
  ['buildFish', '建造鱼池', buyFishCondition, fish, (world) => world.stats.boughtF, 1n, '水产'],
  ['collectFish', '鱼类入库', '养殖并入库至少 {目标} 条鱼', fish,
    (world) => sumProduced(world, (item) => item?.kind === 'F'), 1n, '水产'],
  ['fishUpgrade', '鱼池升级', '将任意一座鱼池升到 {目标} 级', fish, (world) => maxLevel(world.facilities.F), 5n, '水产'],
  ['firstFishProcessing', '加工水产原料', '加工并入库至少 {目标} 份水产中间产物', processing,
    (world) => sumProduced(world, (item) => item?.kind === 'IF'), 1n, '水产'],
  ['miningIntro', '建造第一座矿洞', buyMineCondition, mining, (world) => world.stats.boughtM, 1n, '矿业'],
  ['buildMine', '建造矿洞', buyMineCondition, mining, (world) => world.stats.boughtM, 1n, '矿业'],
  ['collectMining', '矿产入库', '开采并入库至少 {目标} 份矿产', mining,
    (world) => sumProduced(world, (item) => item?.kind === 'M'), 1n, '矿业'],
  ['miningUpgrade', '矿洞升级', '将任意一座矿洞升到 {目标} 级', mining,
    (world) => maxLevel(world.facilities.M), 5n, '矿业'],
  ['firstMiningProcessing', '加工矿业原料', '加工并入库至少 {目标} 份矿业中间产物', processing,
    (world) => sumProduced(world, (item) => item?.kind === 'IM'), 1n, '矿业'],
  ['firstMixedProduct', '制作复合商品', '精制并入库至少 {目标} 份复合商品', refining,
    (world) => sumProduced(world, (item) => item?.kind.startsWith('P') && item.sources.length >= 2), 1n, '复合'],
  ['newFarm', '经营交接', runCondition, farmSale, runs, 1n, '经营'],
  ['firstTech', '永久科技', techCondition, research, techTotal, 1n, '经营'],
  ['delegationTech', '代管时长', '将永久科技「代管时长」升到 {目标} 级', research,
    (world) => BigInt(world.tech.delegation ?? 0), 1n, '经营'],
];

const longTerm = [
  ['moreFields', '农地扩建', '当前拥有至少 {目标} 块额外田地', field,
    (world) => BigInt(Math.max(0, world.facilities.C.length - 2)), 10n],
  ['farmIncome', '经营收入', '累计出货收入达到 {目标} 金币', warehouse, (world) => world.stats.lifetimeRevenue, 1_000_000_000_000n * coinScale],
  ['recipeCollection', '工坊配方集', recipeCondition, research,
    (world) => countWhere(world.unlocked, (id) => id.startsWith('P')), 25n],
  qualityTask('qualityCollection'),
  ['milleCrepe', '南岛珍果千层', '精制并入库至少 {目标} 份该商品', refining, (world) => produced(world, 'P150')],
  ['itemCollection', '完整图鉴', '解锁图鉴中的全部 {目标} 种物品', codex, unlockedCount, BigInt(Object.keys(catalog.items).length)],
  qualityTask('qualityMaster'),
  ['threeSectorGift', '紫苏双鱼牛汁千层御膳礼盒', '精制并入库至少 {目标} 份该商品', refining, (world) => produced(world, 'PT50')],
  ['collection100', '图鉴百种', codexCondition, codex, unlockedCount, 100n],
  ['collection200', '图鉴两百种', codexCondition, codex, unlockedCount, 200n],
  ['collection300', '图鉴三百种', codexCondition, codex, unlockedCount, 300n],
  ['collection400', '图鉴四百种', codexCondition, codex, unlockedCount, 400n],
  qualityTask('quality25'),
  qualityTask('quality50'),
  qualityTask('quality200'),
  qualityTask('quality400'),
  ['facilityLevel50', '设施五十级', facilityLevelCondition, field, (world) => maxLevel(allFacilities(world)), 50n],
  ['facilityLevel100', '设施百级', facilityLevelCondition, field, (world) => maxLevel(allFacilities(world)), 100n],
  ['facilityLevel200', '设施两百级', facilityLevelCondition, field, (world) => maxLevel(allFacilities(world)), 200n],
  ['facilityLevel400', '设施四百级', facilityLevelCondition, field, (world) => maxLevel(allFacilities(world)), 400n],
  ['stationLevel10', '工位十级', stationLevelCondition, processing, (world) => maxLevel(allStations(world)), 10n],
  ['stationLevel50', '工位五十级', stationLevelCondition, processing, (world) => maxLevel(allStations(world)), 50n],
  ['stationLevel100', '工位百级', stationLevelCondition, processing, (world) => maxLevel(allStations(world)), 100n],
  ['stationLevel200', '工位两百级', stationLevelCondition, processing, (world) => maxLevel(allStations(world)), 200n],
  ['techLevel25', '科技累计25级', techCondition, research, techTotal, 25n],
  ['techLevel100', '科技累计100级', techCondition, research, techTotal, 100n],
  ['techLevel300', '科技累计300级', techCondition, research, techTotal, 300n],
  ['techLevel600', '科技累计600级', techCondition, research, techTotal, 600n],
  ['techLevel900', '科技累计900级', techCondition, research, techTotal, 900n],
  ['techLevel1200', '科技全满', techCondition, research, techTotal, BigInt(techTotalLevels)],
  ['runs5', '五次交接', runCondition, farmSale, runs, 5n],
  ['runs20', '二十次交接', runCondition, farmSale, runs, 20n],
  ['runs50', '五十次交接', runCondition, farmSale, runs, 50n],
  ['runs100', '百次交接', runCondition, farmSale, runs, 100n],
  ['livestockTop', '牛肉庄园', '解锁肉用黄牛品种', research, (world) => learned(world, 'L10')],
  ['fishTop', '鲟鱼鱼池', '解锁鲟鱼品种', research, (world) => learned(world, 'F10')],
  ['miningTop', '宝石矿洞', '解锁宝石原矿', research, (world) => learned(world, 'M10')],
  ['miningProduct', '锡衬铜盘鲈鱼片', '精制并入库至少 {目标} 份该商品', refining, (world) => produced(world, 'PM14')],
];

function floorTwoSignificantDigits(value) {
  const places = value.toString().length - 2;
  if (places <= 0) return value;
  const scale = 10n ** BigInt(places);
  return value / scale * scale;
}

const coinCaps = { ...generatedCoinCaps, firstTech: 1250n * coinScale, delegationTech: 2500n * coinScale };
for (const [id, gate] of Object.entries(taskProductionGates)) coinCaps[id] = gate / 100n;
for (const [id, , , , , required] of longTerm) {
  if (id.startsWith('techLevel')) coinCaps[id] = 1250n * required * coinScale;
}
export const taskCoinRewards = Object.freeze(Object.fromEntries(Object.entries({
  ...baseCoinRewards, ...Object.fromEntries(Object.entries(qualityDrawTaskTargets).map(([id, target]) => [id, 100n * target])),
}).map(([id, baseReward]) => {
  const reward = baseReward * coinScale;
  if (Object.hasOwn(qualityDrawTaskTargets, id)) return [id, BigInt(generatedCoinCaps[id])];
  if (!Object.hasOwn(coinCaps, id)) return [id, reward];
  const capped = floorTwoSignificantDigits(BigInt(coinCaps[id]));
  return [id, capped < reward ? capped : reward];
})));

function progress(world, [id, name, condition, location, count, required = 1n, branch]) {
  const current = count(world);
  const gate = taskProductionGates[id] ?? null;
  const gateMet = gate === null || (world.lifetimeProductionValue ?? 0n) >= gate;
  const rewarded = world.taskRewards?.includes(id) ?? false;
  const completedLegacy = rewarded && (Object.hasOwn(qualityDrawTaskTargets, id) || id === 'techLevel1200');
  return { id, name, condition, ...location, current: completedLegacy && current < required ? required : current,
    required, gate, gateMet, done: completedLegacy || current >= required && gateMet,
    rewardCoins: taskCoinRewards[id], rewardResearchPoints: taskResearchPointRewards[id] ?? 0n,
    rewarded, ...(branch && { branch }) };
}

export function objectives(world) {
  const guide = mainGuide.map((task) => progress(world, task));
  const active = guide.some((task) => !task.done);
  if (world.stats.sold > 0n) guide.push(...introductionBranches.map((task) => progress(world, task)));
  return { guide, active, long: longTerm.map((task) => progress(world, task)) };
}

// Same task as objectives(world): `active ? guide.find((task) => !task.done && !task.branch) : null`.
// Branch entries always carry a non-empty branch, so only main-guide tasks qualify, and `active`
// holds exactly when some main-guide task is undone; the first undone main task is the answer.
export function activeGuideTask(world) {
  for (const task of mainGuide) {
    const entry = progress(world, task);
    if (!entry.done) return entry;
  }
  return null;
}

// The caller settles a private draft and commits its coins, RP and receipt IDs together.
// Neither progress queries nor save decoding issue rewards. Branch tasks are settled even
// before they are displayed, so a task regrouped from the long-term list keeps its timing.
export function settleTaskRewards(world) {
  const tasks = [
    ...mainGuide.map((task) => progress(world, task)),
    ...introductionBranches.map((task) => progress(world, task)),
    ...longTerm.map((task) => progress(world, task)),
  ];
  const previous = world.taskRewards ?? [];
  const rewarded = new Set(previous);
  const ids = [];
  let coins = 0n;
  let researchPoints = 0n;
  for (const task of tasks) {
    if (!task.done || rewarded.has(task.id)) continue;
    rewarded.add(task.id);
    ids.push(task.id);
    coins += task.rewardCoins;
    researchPoints += task.rewardResearchPoints;
  }
  world.taskRewards = [...previous, ...ids];
  world.coins += coins;
  world.researchPoints += researchPoints;
  return { ids, coins, researchPoints };
}
