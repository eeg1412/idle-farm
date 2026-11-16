import catalog from '../content/game-data.json' with { type: 'json' };

const destination = (target, tab) => tab ? { target, tab } : { target };
const field = destination('牧场', '田地');
const livestock = destination('牧场', '畜牧');
const fish = destination('牧场', '鱼池');
const processing = destination('工坊', '加工');
const refining = destination('工坊', '精制');
const warehouse = destination('仓库');
const research = destination('研究');
const codex = destination('图鉴');
const farmSale = destination('出售牧场');

// LT-2026-11-v3 reward table (economy plan appendix F5); the original 24 task IDs are unchanged.
export const taskCoinRewards = Object.freeze({
  firstHarvest: 340n,
  firstFlour: 390n,
  breadRecipe: 460n,
  firstBread: 570n,
  firstSale: 710n,
  firstPlot: 870n,
  firstUpgrade: 1_100n,
  firstSeed: 1_700n,
  firstSwitch: 2_100n,
  bulkSale: 2_600n,
  reserveStock: 2_600n,
  addProcessor: 2_700n,
  addRefinery: 2_900n,
  stationPriority: 3_000n,
  stationUpgrade: 3_100n,
  firstQuality: 3_500n,
  recipeTrio: 20_000n,
  fieldLevel10: 48_000n,
  codex20: 540_000n,
  livestockIntro: 140_000n,
  buildLivestock: 34_000n,
  collectLivestock: 43_000n,
  livestockUpgrade: 54_000n,
  fishIntro: 1_100_000n,
  buildFish: 270_000n,
  collectFish: 290_000n,
  fishUpgrade: 300_000n,
  firstLivestockProcessing: 2_000_000n,
  firstFishProcessing: 3_600_000n,
  firstMixedProduct: 20_000_000n,
  newFarm: 96_000_000_000n,
  firstTech: 96_000_000_000n,
  delegationTech: 96_000_000_000n,
  moreFields: 59_000_000_000n,
  farmIncome: 43_000_000_000n,
  recipeCollection: 200_000_000_000n,
  qualityCollection: 7_200_000_000n,
  milleCrepe: 460_000_000_000_000n,
  itemCollection: 2_800_000_000_000_000n,
  qualityMaster: 1_000_000_000_000n,
  threeSectorGift: 2_700_000_000_000_000n,
  collection100: 13_000_000_000n,
  collection200: 290_000_000_000n,
  collection300: 5_000_000_000_000n,
  collection400: 69_000_000_000_000n,
  quality25: 20_000_000_000n,
  quality50: 96_000_000_000n,
  quality200: 6_000_000_000_000n,
  quality400: 600_000_000_000_000n,
  facilityLevel50: 11_000_000_000n,
  facilityLevel100: 43_000_000_000n,
  facilityLevel200: 960_000_000_000n,
  facilityLevel400: 120_000_000_000_000n,
  stationLevel10: 620_000_000n,
  stationLevel50: 140_000_000_000n,
  stationLevel100: 1_400_000_000_000n,
  stationLevel200: 260_000_000_000_000n,
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
});

// Fixed research-point rewards. They are committed with the task settlement and never
// enter T/credit or the appraisal multiplier.
export const taskResearchPointRewards = Object.freeze({
  collection200: 500n,
  collection300: 2_000n,
  collection400: 6_000n,
  itemCollection: 20_000n,
  runs5: 200n,
  runs20: 1_000n,
  runs50: 3_000n,
  runs100: 8_000n,
});

const produced = (world, id) => world.stats.produced[id] ?? 0n;
const learned = (world, id) => BigInt(world.unlocked.includes(id));
const countWhere = (list, predicate) => BigInt(list.filter(predicate).length);
const maxLevel = (list) => list.reduce((highest, entry) => {
  const level = BigInt(entry.level ?? '1');
  return level > highest ? level : highest;
}, 1n);
const techTotal = (world) => BigInt(Object.values(world.tech).reduce((total, level) => total + level, 0));
const allStations = (world) => [...world.stations.I, ...world.stations.P];
const allFacilities = (world) => [...world.facilities.C, ...world.facilities.L, ...world.facilities.F];
const unlockedCount = (world) => BigInt(world.unlocked.length);
const runs = (world) => BigInt(world.completedRuns);
const sumProduced = (world, predicate) => Object.entries(world.stats.produced)
  .filter(([id]) => predicate(catalog.items[id]))
  .reduce((total, [, count]) => total + count, 0n);

function highestQuality(world) {
  let highest = 1n;
  for (const value of Object.values(world.quality)) {
    const level = BigInt(value);
    if (level > highest) highest = level;
  }
  return highest;
}

// Tuples are [id, name, destination, count(world), required = 1n].
const mainGuide = [
  ['firstHarvest', '第一次收成', field, (world) => produced(world, 'C01')],
  ['firstFlour', '磨出面粉', processing, (world) => produced(world, 'I01')],
  ['breadRecipe', '研发乡村面包', research, (world) => learned(world, 'P01')],
  ['firstBread', '烤出乡村面包', refining, (world) => produced(world, 'P01')],
  ['firstSale', '第一次出货', warehouse, (world) => world.stats.sold],
  ['firstPlot', '扩建田地', field, (world) => world.stats.plots],
  ['firstUpgrade', '田地升级', field, (world) => maxLevel(world.facilities.C), 2n],
  ['firstSeed', '研发甘蔗', research, (world) => learned(world, 'C02'), 1n],
  ['firstSwitch', '改种新作物', field,
    (world) => countWhere(world.facilities.C, (slot) => slot.recipe && slot.recipe !== 'C01'), 1n],
  ['bulkSale', '批量出货', warehouse, (world) => world.stats.batchSales ?? 0n, 1n],
  ['reserveStock', '设置保留量', warehouse, (world) => BigInt(Object.keys(world.reserves).length), 1n],
  ['addProcessor', '添置加工位', processing, (world) => BigInt(world.stations.I.length), 2n],
  ['addRefinery', '添置精制位', refining, (world) => BigInt(world.stations.P.length), 2n],
  ['stationPriority', '设定工位优先', processing, (world) => countWhere(allStations(world), (station) => station.priority), 1n],
  ['stationUpgrade', '升级工位', processing, (world) => maxLevel(allStations(world)), 2n],
  ['firstQuality', '提升品质', research, highestQuality, 2n],
  ['recipeTrio', '扩充配方', research, (world) => countWhere(world.unlocked, (id) => id.startsWith('P')), 3n],
  ['fieldLevel10', '田地十级', field, (world) => maxLevel(world.facilities.C), 10n],
  ['codex20', '图鉴收录', codex, unlockedCount, 20n],
];

// Displayed after the first sale. Tasks moved here keep their IDs, conditions and receipts.
// Tuples are [id, name, destination, count(world), required, branch].
const introductionBranches = [
  ['livestockIntro', '建造第一座畜牧场', livestock, (world) => world.stats.boughtL, 1n, '畜牧'],
  ['buildLivestock', '建造畜牧场', livestock, (world) => world.stats.boughtL, 1n, '畜牧'],
  ['collectLivestock', '畜牧产物入库', livestock, (world) => sumProduced(world, (item) => item?.kind === 'L'), 1n, '畜牧'],
  ['livestockUpgrade', '畜牧场升级', livestock, (world) => maxLevel(world.facilities.L), 5n, '畜牧'],
  ['firstLivestockProcessing', '加工畜牧原料', processing,
    (world) => sumProduced(world, (item) => item?.kind === 'IL'), 1n, '畜牧'],
  ['fishIntro', '建造第一座鱼池', fish, (world) => world.stats.boughtF, 1n, '水产'],
  ['buildFish', '建造鱼池', fish, (world) => world.stats.boughtF, 1n, '水产'],
  ['collectFish', '鱼类入库', fish, (world) => sumProduced(world, (item) => item?.kind === 'F'), 1n, '水产'],
  ['fishUpgrade', '鱼池升级', fish, (world) => maxLevel(world.facilities.F), 5n, '水产'],
  ['firstFishProcessing', '加工水产原料', processing,
    (world) => sumProduced(world, (item) => item?.kind === 'IF'), 1n, '水产'],
  ['firstMixedProduct', '制作复合商品', refining,
    (world) => sumProduced(world, (item) => item?.kind === 'PD' || item?.kind === 'PT'), 1n, '复合'],
  ['newFarm', '经营交接', farmSale, runs, 1n, '经营'],
  ['firstTech', '永久科技', research, techTotal, 1n, '经营'],
  ['delegationTech', '代管时长', research, (world) => BigInt(world.tech.delegation ?? 0), 1n, '经营'],
];

const longTerm = [
  ['moreFields', '农地扩建', field, (world) => world.stats.plots, 10n],
  ['farmIncome', '经营收入', warehouse, (world) => world.stats.lifetimeRevenue, 10_000_000_000n],
  ['recipeCollection', '工坊配方集', research, (world) => countWhere(world.unlocked, (id) => id.startsWith('P')), 25n],
  ['qualityCollection', '品质进阶', research,
    (world) => countWhere(Object.values(world.quality), (level) => BigInt(level) >= 5n), 10n],
  ['milleCrepe', '南岛珍果千层', refining, (world) => produced(world, 'P150'), 1n],
  ['itemCollection', '完整图鉴', codex, unlockedCount, BigInt(Object.keys(catalog.items).length)],
  ['qualityMaster', '百级名品', research, highestQuality, 100n],
  ['threeSectorGift', '紫苏双鱼牛汁千层御膳礼盒', refining, (world) => produced(world, 'PT50'), 1n],
  ['collection100', '图鉴百种', codex, unlockedCount, 100n],
  ['collection200', '图鉴两百种', codex, unlockedCount, 200n],
  ['collection300', '图鉴三百种', codex, unlockedCount, 300n],
  ['collection400', '图鉴四百种', codex, unlockedCount, 400n],
  ['quality25', '品质二十五', research, highestQuality, 25n],
  ['quality50', '品质五十', research, highestQuality, 50n],
  ['quality200', '品质两百', research, highestQuality, 200n],
  ['quality400', '品质四百', research, highestQuality, 400n],
  ['facilityLevel50', '设施五十级', field, (world) => maxLevel(allFacilities(world)), 50n],
  ['facilityLevel100', '设施百级', field, (world) => maxLevel(allFacilities(world)), 100n],
  ['facilityLevel200', '设施两百级', field, (world) => maxLevel(allFacilities(world)), 200n],
  ['facilityLevel400', '设施四百级', field, (world) => maxLevel(allFacilities(world)), 400n],
  ['stationLevel10', '工位十级', processing, (world) => maxLevel(allStations(world)), 10n],
  ['stationLevel50', '工位五十级', processing, (world) => maxLevel(allStations(world)), 50n],
  ['stationLevel100', '工位百级', processing, (world) => maxLevel(allStations(world)), 100n],
  ['stationLevel200', '工位两百级', processing, (world) => maxLevel(allStations(world)), 200n],
  ['techLevel25', '科技累计25级', research, techTotal, 25n],
  ['techLevel100', '科技累计100级', research, techTotal, 100n],
  ['techLevel300', '科技累计300级', research, techTotal, 300n],
  ['techLevel600', '科技累计600级', research, techTotal, 600n],
  ['techLevel900', '科技累计900级', research, techTotal, 900n],
  ['techLevel1200', '科技全满', research, techTotal, 1200n],
  ['runs5', '五次交接', farmSale, runs, 5n],
  ['runs20', '二十次交接', farmSale, runs, 20n],
  ['runs50', '五十次交接', farmSale, runs, 50n],
  ['runs100', '百次交接', farmSale, runs, 100n],
  ['livestockTop', '牛肉牧场', research, (world) => learned(world, 'L10'), 1n],
  ['fishTop', '鲟鱼鱼池', research, (world) => learned(world, 'F10'), 1n],
];

function progress(world, [id, name, location, count, required = 1n]) {
  const current = count(world);
  return { id, name, ...location, current, required, done: current >= required,
    rewardCoins: taskCoinRewards[id], rewardResearchPoints: taskResearchPointRewards[id] ?? 0n,
    rewarded: world.taskRewards?.includes(id) ?? false };
}

const branchProgress = (world) => ([id, name, location, count, required, branch]) => ({
  ...progress(world, [id, name, location, count, required]), branch,
});

export function objectives(world) {
  const guide = mainGuide.map((task) => progress(world, task));
  const active = guide.some((task) => !task.done);
  if (world.stats.sold > 0n) guide.push(...introductionBranches.map(branchProgress(world)));
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
    ...introductionBranches.map(branchProgress(world)),
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
