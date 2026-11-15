import catalog from '../content/game-data.json' with { type: 'json' };

const destination = (target, tab) => tab ? { target, tab } : { target };
const field = destination('牧场', '田地');
const livestock = destination('牧场', '畜牧');
const fish = destination('牧场', '鱼池');
const processing = destination('工坊', '加工');
const refining = destination('工坊', '精制');
const warehouse = destination('仓库');
const research = destination('研究');

export const taskCoinRewards = Object.freeze({
  firstHarvest: 10n,
  firstFlour: 20n,
  breadRecipe: 30n,
  firstBread: 50n,
  firstSale: 20n,
  firstPlot: 15n,
  livestockIntro: 100n,
  fishIntro: 100n,
  moreFields: 150n,
  farmIncome: 5000n,
  recipeCollection: 8000n,
  qualityCollection: 12000n,
  newFarm: 50n,
  milleCrepe: 50000n,
  itemCollection: 250000n,
  qualityMaster: 80000n,
  buildLivestock: 100n,
  buildFish: 100n,
  collectLivestock: 150n,
  collectFish: 150n,
  firstLivestockProcessing: 400n,
  firstFishProcessing: 400n,
  firstMixedProduct: 1500n,
  threeSectorGift: 150000n,
});

const produced = (world, id) => world.stats.produced[id] ?? 0n;
const learned = (world, id) => BigInt(world.unlocked.includes(id));
const countWhere = (list, predicate) => BigInt(list.filter(predicate).length);
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

const mainGuide = [
  ['firstHarvest', '第一次收成', field, (world) => produced(world, 'C01')],
  ['firstFlour', '磨出面粉', processing, (world) => produced(world, 'I01')],
  ['breadRecipe', '研发乡村面包', research, (world) => learned(world, 'P01')],
  ['firstBread', '烤出乡村面包', refining, (world) => produced(world, 'P01')],
  ['firstSale', '第一次出货', warehouse, (world) => world.stats.sold],
  ['firstPlot', '扩建田地', field, (world) => world.stats.plots],
];

const introductionBranches = [
  ['livestockIntro', '建造第一座畜牧场', livestock, (world) => world.stats.boughtL, '畜牧'],
  ['fishIntro', '建造第一座鱼池', fish, (world) => world.stats.boughtF, '水产'],
];

const longTerm = [
  ['moreFields', '农地扩建', field, (world) => world.stats.plots, 10n],
  ['farmIncome', '经营收入', warehouse, (world) => world.stats.lifetimeRevenue, 100000n],
  ['recipeCollection', '工坊配方集', research, (world) => countWhere(world.unlocked, (id) => id.startsWith('P')), 25n],
  ['qualityCollection', '品质进阶', research, (world) => countWhere(Object.values(world.quality), (level) => BigInt(level) >= 5n), 10n],
  ['newFarm', '经营交接', destination('出售牧场'), (world) => BigInt(world.completedRuns), 1n],
  ['milleCrepe', '南岛珍果千层', refining, (world) => produced(world, 'P150'), 1n],
  ['itemCollection', '完整图鉴', destination('图鉴'), (world) => BigInt(world.unlocked.length), BigInt(Object.keys(catalog.items).length)],
  ['qualityMaster', '百级名品', research, highestQuality, 100n],
  ['buildLivestock', '建造畜牧场', livestock, (world) => world.stats.boughtL, 1n],
  ['buildFish', '建造鱼池', fish, (world) => world.stats.boughtF, 1n],
  ['collectLivestock', '畜牧产物入库', livestock, (world) => sumProduced(world, (item) => item?.kind === 'L'), 1n],
  ['collectFish', '鱼类入库', fish, (world) => sumProduced(world, (item) => item?.kind === 'F'), 1n],
  ['firstLivestockProcessing', '加工畜牧原料', processing, (world) => sumProduced(world, (item) => item?.kind === 'IL'), 1n],
  ['firstFishProcessing', '加工水产原料', processing, (world) => sumProduced(world, (item) => item?.kind === 'IF'), 1n],
  ['firstMixedProduct', '制作复合商品', refining, (world) => sumProduced(world, (item) => item?.kind === 'PD' || item?.kind === 'PT'), 1n],
  ['threeSectorGift', '紫苏双鱼牛汁千层御膳礼盒', refining, (world) => produced(world, 'PT50'), 1n],
];

function progress(world, [id, name, location, count, required = 1n]) {
  const current = count(world);
  return { id, name, ...location, current, required, done: current >= required,
    rewardCoins: taskCoinRewards[id], rewarded: world.taskRewards?.includes(id) ?? false };
}

export function objectives(world) {
  const guide = mainGuide.map((task) => progress(world, task));
  const active = guide.some((task) => !task.done);
  if (world.stats.sold > 0n) {
    guide.push(...introductionBranches.map(([id, name, target, count, branch]) => ({
      ...progress(world, [id, name, target, count]), branch,
    })));
  }
  return { guide, active, long: longTerm.map((task) => progress(world, task)) };
}

// The caller settles a private draft and commits its coins and receipt IDs together.
// Neither progress queries nor save decoding issue rewards.
export function settleTaskRewards(world) {
  const { guide, long } = objectives(world);
  const previous = world.taskRewards ?? [];
  const rewarded = new Set(previous);
  const ids = [];
  let coins = 0n;
  for (const task of [...guide, ...long]) {
    if (!task.done || rewarded.has(task.id)) continue;
    rewarded.add(task.id);
    ids.push(task.id);
    coins += task.rewardCoins;
  }
  world.taskRewards = [...previous, ...ids];
  world.coins += coins;
  return { ids, coins };
}

