import { activeGuideTask, objectives } from '../game/objectives.js';
import { catalog, facilityOffer, stationOffer, stationUpgradeOffer, stationRequirements } from '../game/world.js';

const facilityKinds = { 田地: 'C', 畜牧: 'L', 鱼池: 'F', 矿洞: 'M' };
const stationKinds = { 加工: 'I', 精制: 'P' };
const placeNames = { C: '田地', L: '养殖场', F: '鱼池', M: '矿洞', I: '加工位', P: '精制位' };
const purchaseNames = { C: '购地', L: '购买养殖场', F: '购买鱼池', M: '购买矿洞', I: '增设加工位', P: '增设精制位' };
const assignmentNames = { C: '播种', L: '安排养殖', F: '安排养殖', M: '开采', I: '选择配方', P: '选择配方' };
const replacementNames = { C: '换种', L: '更换品种', F: '更换品种', M: '更换矿种', I: '更换配方', P: '更换配方' };
const taskCache = new WeakMap();
const upgradeCache = new WeakMap();
const tutorial = (text, emphasis = []) => ({ text, emphasis, priority: 2, expression: 'smile' });

function guideState(world) {
  let state = taskCache.get(world);
  if (!state) {
    const active = activeGuideTask(world);
    const branches = new Map();
    if (world.stats.sold > 0n) for (const task of objectives(world).guide) {
      if (task.branch && !task.done && !branches.has(task.branch)) branches.set(task.branch, task);
    }
    state = { active, branches: [...branches.values()] };
    taskCache.set(world, state);
  }
  return state;
}

function matchesPage(task, page) {
  if (task.id === 'stationUpgrade') return page === '加工' || page === '精制';
  return (task.tab ?? task.target) === page;
}

function slotsFor(world, kind) {
  return world.facilities[kind] ?? world.stations[kind];
}

function purchaseStep(world, kind) {
  const quote = Object.hasOwn(world.facilities, kind) ? facilityOffer(world, kind) : stationOffer(world, kind);
  if (quote && !quote.affordable) return '金币还不够，先去仓库点物品的「出售」出货，再回来点「' + purchaseNames[kind] + '」。';
  return '点页面下方的「' + purchaseNames[kind] + '」，核对金额后点「确认购买」。';
}

function assignStep(world, kind, id) {
  const slots = slotsFor(world, kind);
  const name = catalog.items[id]?.subject ?? catalog.items[id]?.name;
  if (!slots.length) return purchaseStep(world, kind);
  if (!world.unlocked.includes(id)) return '先去研究的「品种配方」，点「' + catalog.items[id].name + '」查看条件并点「研发」，再回来安排生产。';
  const assigned = slots.find((slot) => slot.recipe === id);
  if (assigned?.batch) return '「' + name + '」正在生产，倒计时结束后会自动入库。';
  if (assigned) {
    const missing = (kind === 'I' || kind === 'P') && stationRequirements(world, id, assigned.level)
      .find(({ owned, needed }) => owned < needed);
    return missing ? '「' + name + '」在等材料，点它的「查看来源」，先补足「' + catalog.items[missing.id].name + '」；材料齐后会自动开工。'
      : '「' + name + '」已安排好，材料齐备会自动开工，产出自动入库。';
  }
  const index = Math.max(0, slots.findIndex((slot) => !slot.recipe));
  const button = slots[index].recipe ? replacementNames[kind] : assignmentNames[kind];
  return '点第' + (index + 1) + '个' + placeNames[kind] + '的「' + button + '」，在列表点「' + name + '」安排生产。';
}

function upgradeStep(world, kind, target) {
  const slots = slotsFor(world, kind);
  if (!slots.length) return purchaseStep(world, kind);
  const quote = world.facilities[kind] ? facilityOffer : stationUpgradeOffer;
  let index = slots.findIndex((slot, index) => BigInt(slot.level) < target && quote(world, kind, index, 1n)?.affordable);
  if (index < 0) index = slots.findIndex((slot) => BigInt(slot.level) < target);
  if (index < 0) return '这页的等级已达标，去另一类工位点「升级」，核对后点「确认升级」。';
  const empty = world.facilities[kind] && !slots[index].recipe;
  const entry = empty ? '点第' + (index + 1) + '个' + placeNames[kind] + '的图片打开详情，再点「升级」'
    : '点第' + (index + 1) + '个' + placeNames[kind] + '的「升级」';
  return entry + '，选「+1」并点「确认升级」，逐次升到' + target + '级。';
}

function firstUnlocked(world, predicate) {
  return world.unlocked.find((id) => predicate(catalog.items[id]));
}

function taskInstruction(world, task, page) {
  switch (task.id) {
    case 'firstHarvest': return assignStep(world, 'C', 'C01');
    case 'firstFlour': return assignStep(world, 'I', 'I01');
    case 'breadRecipe': return '打开「品种配方」，点「乡村面包」查看所需金币和材料，备齐后点「研发」。';
    case 'firstBread': return assignStep(world, 'P', 'P01');
    case 'firstSale': return '点有库存物品的「出售」，选好数量，再点「确认出售」完成第一次出货。';
    case 'firstPlot': return purchaseStep(world, 'C');
    case 'firstUpgrade': return upgradeStep(world, 'C', 2n);
    case 'firstSeed': return '打开「品种配方」，点「甘蔗」查看条件，备齐金币和材料后点「研发」。';
    case 'firstSwitch': {
      const alternative = world.unlocked.find((id) => id !== 'C01' && catalog.items[id]?.kind === 'C');
      return alternative ? assignStep(world, 'C', alternative) : '先去研究的「品种配方」点「甘蔗」并「研发」，再回田地点击「换种」选择甘蔗。';
    }
    case 'reserveStock': return '点任一物品打开详情，点「加工保留量」，填入大于0的数量并点「保存」。';
    case 'addProcessor': return purchaseStep(world, 'I');
    case 'addRefinery': return purchaseStep(world, 'P');
    case 'stationUpgrade': return upgradeStep(world, page === '精制' ? 'P' : 'I', 2n);
    case 'recipeTrio': return '在「品种配方」点尚未研发的精制配方，查看材料后点「研发」，累计解锁3种精制配方。';
    case 'fieldLevel10': return upgradeStep(world, 'C', 10n);
    case 'codex20': return '点尚未收录的物品，点「查看研发」检查条件，再点「研发」；累计解锁20种物品就能完成收录。';
    case 'livestockIntro': case 'buildLivestock': return purchaseStep(world, 'L');
    case 'fishIntro': case 'buildFish': return purchaseStep(world, 'F');
    case 'miningIntro': case 'buildMine': return purchaseStep(world, 'M');
    case 'collectLivestock': case 'collectFish': case 'collectMining': {
      const kind = { collectLivestock: 'L', collectFish: 'F', collectMining: 'M' }[task.id];
      const id = firstUnlocked(world, (item) => item.kind === kind);
      return id ? assignStep(world, kind, id) : '先去研究的「品种配方」研发对应品种，再回这里点「' + assignmentNames[kind] + '」。';
    }
    case 'livestockUpgrade': case 'fishUpgrade': case 'miningUpgrade':
      return upgradeStep(world, { livestockUpgrade: 'L', fishUpgrade: 'F', miningUpgrade: 'M' }[task.id], 5n);
    case 'firstLivestockProcessing': case 'firstFishProcessing': case 'firstMiningProcessing': {
      const kind = { firstLivestockProcessing: 'IL', firstFishProcessing: 'IF', firstMiningProcessing: 'IM' }[task.id];
      const id = firstUnlocked(world, (item) => item.kind === kind);
      return id ? assignStep(world, 'I', id) : '先去研究的「品种配方」研发' + task.branch + '加工配方，再回加工位点「选择配方」。';
    }
    case 'firstMixedProduct': {
      const id = firstUnlocked(world, (item) => item.kind.startsWith('P') && item.sources.length >= 2);
      return id ? assignStep(world, 'P', id) : '先去研究的「品种配方」研发多来源的精制配方，再回精制位点「选择配方」。';
    }
    case 'newFarm': return !task.gateMet
      ? '先继续生产，累计产值达到任务门槛后，再点「出售庄园」核对收益并「确认出售」。'
      : '先核对本页预计收益与重置项目，再点「出售庄园」，确认后点「确认出售」。';
    case 'firstTech': return '打开「经营改良」，点一项未满级改良，查看升级需要的高级研发点，备齐后点「确认升级」。';
    case 'delegationTech': return '打开「经营改良」，点「代管时长」查看所需高级研发点，备齐后点「确认升级」。';
    default: return null;
  }
}

export function managerTutorial(world, page) {
  const state = guideState(world);
  const task = page === '任务' ? state.active : state.active && matchesPage(state.active, page) ? state.active
    : state.branches.find((task) => matchesPage(task, page));
  if (!task) return null;
  const destination = task.tab ?? task.target;
  const text = taskInstruction(world, task, page === '任务' ? destination : page);
  if (!text) return null;
  const prefix = page === '任务' ? '先去「' + destination + '」。' : '';
  return { ...tutorial(prefix + text, [...new Set([...text.matchAll(/「([^」]+)」/g)].map((match) => match[1]))]), taskId: task.id };
}

export function managerUpgradeHelp(world, page) {
  let cached = upgradeCache.get(world);
  if (!cached) { cached = new Map(); upgradeCache.set(world, cached); }
  if (cached.has(page)) return cached.get(page);
  const kind = facilityKinds[page] ?? stationKinds[page];
  let message = null;
  if (kind) {
    const facilities = Boolean(facilityKinds[page]);
    const slots = slotsFor(world, kind);
    const quote = facilities ? facilityOffer : stationUpgradeOffer;
    const index = slots.findIndex((slot, index) => quote(world, kind, index, 1n)?.affordable);
    if (index >= 0) {
      const entry = facilities && !slots[index].recipe ? '点第' + (index + 1) + '个' + placeNames[kind] + '的图片打开详情，再点「升级」'
        : '点第' + (index + 1) + '个' + placeNames[kind] + '的「升级」';
      message = { text: entry + '，核对金币后点「确认升级」，就能提高每批产出。',
        priority: 1, emphasis: ['升级', '确认升级'], expression: 'smile' };
    }
  }
  cached.set(page, message);
  return message;
}
