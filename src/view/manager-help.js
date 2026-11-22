import { activeGuideTask, objectives } from '../game/objectives.js';
import { catalog, facilityOffer, stationOffer, stationUpgradeOffer, stationRequirements } from '../game/world.js';
import { techDefinitions, techOffer } from '../game/advancement.js';
import { qualityDrawOffer } from '../game/quality.js';
import { helpVoice, productionHelpCopy, taskHelpCopy, tutorialDestination, otherStationCopy, researchHelpCopy, contextHelpCopy } from './manager-help-copy.js';

const facilityKinds = { 田地: 'C', 畜牧: 'L', 鱼塘: 'F', 矿洞: 'M' };
const stationKinds = { 加工: 'I', 精制: 'P' };
const placeNames = { C: '田地', L: '养殖场', F: '鱼塘', M: '矿洞', I: '加工位', P: '精制位' };
const purchaseNames = { C: '购地', L: '购买养殖场', F: '购买鱼塘', M: '购买矿洞', I: '增设加工位', P: '增设精制位' };
const assignmentNames = { C: '播种', L: '安排养殖', F: '安排养殖', M: '开采', I: '选择配方', P: '选择配方' };
const replacementNames = { C: '换种', L: '更换品种', F: '更换品种', M: '更换矿种', I: '更换配方', P: '更换配方' };
const taskCache = new WeakMap();
const upgradeCache = new WeakMap();
const researchHelpCache = new WeakMap();
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

function purchaseStep(world, kind, speaker) {
  const quote = Object.hasOwn(world.facilities, kind) ? facilityOffer(world, kind) : stationOffer(world, kind);
  return productionHelpCopy(speaker, quote && !quote.affordable ? 'funds' : 'buy', { purchase: purchaseNames[kind] });
}

function assignStep(world, kind, id, speaker) {
  const slots = slotsFor(world, kind);
  const name = catalog.items[id]?.subject ?? catalog.items[id]?.name;
  if (!slots.length) return purchaseStep(world, kind, speaker);
  if (!world.unlocked.includes(id)) return productionHelpCopy(speaker, 'locked', { name: catalog.items[id].name });
  const assigned = slots.find((slot) => slot.recipe === id);
  if (assigned?.batch) return productionHelpCopy(speaker, 'running', { name });
  if (assigned) {
    const missing = (kind === 'I' || kind === 'P') && stationRequirements(world, id, assigned.level)
      .find(({ owned, needed }) => owned < needed);
    return missing ? productionHelpCopy(speaker, 'missing', {
      name, index: slots.indexOf(assigned) + 1, place: placeNames[kind], item: catalog.items[missing.id].name,
    }) : productionHelpCopy(speaker, 'ready', { name });
  }
  const index = Math.max(0, slots.findIndex((slot) => !slot.recipe));
  const button = slots[index].recipe ? replacementNames[kind] : assignmentNames[kind];
  return productionHelpCopy(speaker, 'empty', { index: index + 1, place: placeNames[kind], button, name });
}

function upgradeStep(world, kind, target, speaker) {
  const slots = slotsFor(world, kind);
  if (!slots.length) return purchaseStep(world, kind, speaker);
  const quote = world.facilities[kind] ? facilityOffer : stationUpgradeOffer;
  let index = slots.findIndex((slot, index) => BigInt(slot.level) < target && quote(world, kind, index, 1n)?.affordable);
  if (index < 0) index = slots.findIndex((slot) => BigInt(slot.level) < target);
  if (index < 0) return otherStationCopy(speaker);
  const empty = world.facilities[kind] && !slots[index].recipe;
  const entry = empty ? '点第' + (index + 1) + '个' + placeNames[kind] + '的图片打开详情，再点「升级」'
    : '点第' + (index + 1) + '个' + placeNames[kind] + '的「升级」';
  return productionHelpCopy(speaker, 'upgrade', { index: index + 1, place: placeNames[kind], target, entry });
}

function firstUnlocked(world, predicate) {
  return world.unlocked.find((id) => predicate(catalog.items[id]));
}

function taskInstruction(world, task, page, speaker) {
  switch (task.id) {
    case 'firstHarvest': return assignStep(world, 'C', 'C01', speaker);
    case 'firstFlour': return assignStep(world, 'I', 'I01', speaker);
    case 'breadRecipe': case 'firstSale': case 'firstSeed': case 'reserveStock': case 'recipeTrio': case 'codex20':
    case 'firstTech': case 'delegationTech': return taskHelpCopy(speaker, task.id);
    case 'firstBread': return assignStep(world, 'P', 'P01', speaker);
    case 'firstPlot': return purchaseStep(world, 'C', speaker);
    case 'firstUpgrade': return upgradeStep(world, 'C', 2n, speaker);
    case 'firstSwitch': {
      const alternative = world.unlocked.find((id) => id !== 'C01' && catalog.items[id]?.kind === 'C');
      return alternative ? assignStep(world, 'C', alternative, speaker) : taskHelpCopy(speaker, 'firstSwitch');
    }
    case 'addProcessor': return purchaseStep(world, 'I', speaker);
    case 'addRefinery': return purchaseStep(world, 'P', speaker);
    case 'stationUpgrade': return upgradeStep(world, page === '精制' ? 'P' : 'I', 2n, speaker);
    case 'fieldLevel10': return upgradeStep(world, 'C', 10n, speaker);
    case 'livestockIntro': case 'buildLivestock': return purchaseStep(world, 'L', speaker);
    case 'fishIntro': case 'buildFish': return purchaseStep(world, 'F', speaker);
    case 'miningIntro': case 'buildMine': return purchaseStep(world, 'M', speaker);
    case 'collectLivestock': case 'collectFish': case 'collectMining': {
      const kind = { collectLivestock: 'L', collectFish: 'F', collectMining: 'M' }[task.id];
      const id = firstUnlocked(world, (item) => item.kind === kind);
      return id ? assignStep(world, kind, id, speaker) : taskHelpCopy(speaker, 'collectLocked', {
        branch: task.branch, button: assignmentNames[kind],
      });
    }
    case 'livestockUpgrade': case 'fishUpgrade': case 'miningUpgrade':
      return upgradeStep(world, { livestockUpgrade: 'L', fishUpgrade: 'F', miningUpgrade: 'M' }[task.id], 5n, speaker);
    case 'firstLivestockProcessing': case 'firstFishProcessing': case 'firstMiningProcessing': {
      const kind = { firstLivestockProcessing: 'IL', firstFishProcessing: 'IF', firstMiningProcessing: 'IM' }[task.id];
      const id = firstUnlocked(world, (item) => item.kind === kind);
      return id ? assignStep(world, 'I', id, speaker) : taskHelpCopy(speaker, 'processingLocked', { branch: task.branch });
    }
    case 'firstMixedProduct': {
      const id = firstUnlocked(world, (item) => item.kind.startsWith('P') && item.sources.length >= 2);
      return id ? assignStep(world, 'P', id, speaker) : taskHelpCopy(speaker, 'mixedLocked');
    }
    case 'newFarm': return taskHelpCopy(speaker, task.gateMet ? 'newFarm' : 'newFarmGate');
    default: return null;
  }
}

const pageRoles = { 任务: 'tasks', 田地: 'field', 畜牧: 'livestock', 鱼塘: 'fish', 矿洞: 'mine',
  加工: 'processing', 精制: 'refining', 仓库: 'warehouse', 研究: 'research', 图鉴: 'estate', 出售庄园: 'estate' };
const speakerKey = (speaker) => speaker.role + ':' + speaker.gender;

export function managerTutorial(world, page, speaker) {
  speaker = helpVoice(speaker, pageRoles[page]);
  const state = guideState(world);
  const task = page === '任务' ? state.active : state.active && matchesPage(state.active, page) ? state.active
    : state.branches.find((task) => matchesPage(task, page));
  if (!task) return null;
  const destination = task.tab ?? task.target;
  const text = taskInstruction(world, task, page === '任务' ? destination : page, speaker);
  if (!text) return null;
  const spoken = page === '任务' ? tutorialDestination(speaker, destination, text) : text;
  return { ...tutorial(spoken, [...new Set([...spoken.matchAll(/「([^」]+)」/g)].map((match) => match[1]))]), taskId: task.id };
}

export function managerUpgradeMessages(world, page, speaker) {
  speaker = helpVoice(speaker, pageRoles[page]);
  const key = page + ':' + speakerKey(speaker);
  let cached = upgradeCache.get(world);
  if (!cached) { cached = new Map(); upgradeCache.set(world, cached); }
  if (cached.has(key)) return cached.get(key);
  const kind = facilityKinds[page] ?? stationKinds[page];
  const messages = [];
  if (kind) {
    const facilities = Boolean(facilityKinds[page]);
    const slots = slotsFor(world, kind);
    const quote = facilities ? facilityOffer : stationUpgradeOffer;
    for (const [index, slot] of slots.entries()) {
      if (!quote(world, kind, index, 1n)?.affordable) continue;
      const entry = facilities && !slot.recipe ? '点第' + (index + 1) + '个' + placeNames[kind] + '的图片打开详情，再点「升级」'
        : '点第' + (index + 1) + '个' + placeNames[kind] + '的「升级」';
      messages.push({ text: productionHelpCopy(speaker, 'upgradeReady', { index: index + 1, place: placeNames[kind], entry }),
        priority: 1, emphasis: ['升级', '确认升级'], expression: 'smile' });
    }
  }
  cached.set(key, messages);
  return messages;
}

export function managerUpgradeHelp(world, page, speaker) {
  return managerUpgradeMessages(world, page, speaker)[0] ?? null;
}

export function managerResearchHelp(world, tab, speaker) {
  speaker = helpVoice(speaker, 'research');
  const key = tab + ':' + speakerKey(speaker);
  let cached = researchHelpCache.get(world);
  if (!cached) { cached = new Map(); researchHelpCache.set(world, cached); }
  if (cached.has(key)) return cached.get(key);
  const messages = [];
  if (tab === '品质') {
    const single = qualityDrawOffer(world, 'single');
    if (single?.affordable) {
      const all = qualityDrawOffer(world, 'all');
      messages.push({
        text: researchHelpCopy(speaker, 'quality', { all: all.affordable && all.count > 1n }),
        emphasis: ['抽取一次', ...(all.affordable && all.count > 1n ? ['全部抽取'] : [])],
        expression: 'smile', priority: 1,
      });
    }
  } else if (tab === '经营改良') {
    for (const definition of techDefinitions) {
      const offer = techOffer(world, definition.key);
      if (!offer?.eligible || !offer.affordable) continue;
      messages.push({
        text: researchHelpCopy(speaker, 'tech', { name: definition.name }),
        emphasis: ['经营改良', definition.name, '确认升级'], expression: 'smile', priority: 1,
      });
    }
  }
  cached.set(key, messages);
  return messages;
}

export function managerContextHelp(role, gender, type, details = {}) {
  const text = contextHelpCopy(role, gender, type, details);
  if (!text) return null;
  const introductionEmphasis = { 角色管理: ['好感', '今日心愿', '送礼', '切换角色'],
    统计: ['生产状态', '库存估值', '累计收入'], 出售庄园历史: ['时间', '产值'],
    图鉴: ['材料', '来源', '用途', '研发条件'], 出售庄园: ['高级研发点', '新一轮配置'] };
  const emphasis = type === 'introduction' ? introductionEmphasis[details.page] ?? []
    : [...new Set([...text.matchAll(/「([^」]+)」/g)].map((match) => match[1]))];
  return { text, emphasis, expression: type === 'missing' ? 'sad' : 'smile' };
}
