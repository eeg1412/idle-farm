import { activeGuideTask, objectives } from '../game/objectives.js';
import { catalog, facilityOffer, stationOffer, stationUpgradeOffer, stationRequirements } from '../game/world.js';
import { researchOffer, techDefinitions, techOffer } from '../game/advancement.js';
import { qualityDrawOffer } from '../game/quality.js';
import { activeMerchantHoldQuantity, hasDeliverableOrder } from '../game/orders.js';
import { compact } from './numbers.js';
import { helpVoice, productionHelpCopy, taskHelpCopy, tutorialDestination, otherStationCopy, researchHelpCopy, contextHelpCopy } from './manager-help-text.js';

const facilityKinds = { 田地: 'C', 畜牧: 'L', 鱼塘: 'F', 矿洞: 'M' };
const stationKinds = { 料坊: 'I', 工房: 'P' };
const placeNames = { C: '田地', L: '养殖场', F: '鱼塘', M: '矿洞', I: '料坊位', P: '工房位' };
const purchaseNames = { C: '购地', L: '购买养殖场', F: '购买鱼塘', M: '购买矿洞', I: '增设料坊位', P: '增设工房位' };
const addNames = { C: '一块田', I: '一个料坊位', P: '一个工房位' };
const assignmentNames = { C: '播种', L: '安排养殖', F: '安排养殖', M: '开采', I: '选择配方', P: '选择配方' };
const replacementNames = { C: '换种', L: '更换品种', F: '更换品种', M: '更换矿种', I: '更换配方', P: '更换配方' };
const taskCache = new WeakMap();
const tutorialCache = new WeakMap();
const researchFocusCache = new WeakMap();
const upgradeCache = new WeakMap();
const researchHelpCache = new WeakMap();
// Every 「」 term is a button or page name and is always red; extra terms cover unquoted keywords.
const quotedTerms = (text, extra = []) => [...new Set([...extra, ...[...text.matchAll(/「([^」]+)」/g)].map((match) => match[1])])];
const tutorial = (text, emphasis = []) => ({ text, emphasis, priority: 2, expression: 'smile' });
// Guidance that already names where to go (sell in the warehouse, the next task's page) takes no destination prefix.
const elsewhere = (text) => ({ text, here: false });
const spoken = (step) => typeof step === 'string' ? { text: step, here: true } : step ?? null;

function guideState(world) {
  let state = taskCache.get(world);
  if (!state) {
    const active = activeGuideTask(world);
    const { guide } = objectives(world);
    const branches = new Map();
    if (world.stats.sold > 0n) for (const task of guide) {
      if (task.branch && !task.done && !branches.has(task.branch)) branches.set(task.branch, task);
    }
    state = { active, branches: [...branches.values()], main: guide.filter((task) => !task.branch && !task.done) };
    taskCache.set(world, state);
  }
  return state;
}

// Tasks whose item may still be locked: the guide then names the nearest item to research (see guideResearchFocus).
const researchGoals = {
  collectLivestock: (item) => item.kind === 'L', collectFish: (item) => item.kind === 'F',
  collectMining: (item) => item.kind === 'M', firstLivestockProcessing: (item) => item.kind === 'IL',
  firstFishProcessing: (item) => item.kind === 'IF', firstMiningProcessing: (item) => item.kind === 'IM',
  firstMixedProduct: (item) => item.kind.startsWith('P') && item.sources.length >= 2,
  recipeTrio: (item) => item.kind.startsWith('P'),
};
// Mining research is costly, so its guidance lists the target's materials and coins.
const costListed = new Set(['collectMining', 'firstMiningProcessing']);
const researchIds = Object.keys(catalog.research).filter((id) => Object.hasOwn(catalog.items, id)).sort();

// Recipes still to research for `id`, prerequisites first: the first entry has every prerequisite unlocked.
function researchPlan(id, unlocked) {
  const plan = [];
  const seen = new Set();
  (function visit(key) {
    if (seen.has(key) || unlocked.has(key)) return;
    seen.add(key);
    for (const required of catalog.research[key]?.requires ?? []) visit(required);
    plan.push(key);
  })(id);
  return plan;
}

// Nearest locked item matching `predicate`: fewest recipes to research, then the lowest total research coins,
// then the smallest ID. `step` is the recipe to research now on the way to `goal`.
function nearestResearch(world, predicate) {
  const unlocked = new Set(world.unlocked);
  let best = null;
  for (const id of researchIds) {
    if (unlocked.has(id) || !predicate(catalog.items[id])) continue;
    const plan = researchPlan(id, unlocked);
    if (!plan.every((key) => Object.hasOwn(catalog.research, key))) continue;
    const coins = plan.reduce((sum, key) => sum + BigInt(catalog.research[key].coins), 0n);
    if (!best || plan.length < best.plan.length || plan.length === best.plan.length && coins < best.coins) {
      best = { goal: id, plan, coins };
    }
  }
  return best && { goal: best.goal, step: best.plan[0] };
}

// The research the guide and the task card's 「前往」 point to while the task's item is locked; null otherwise.
export function guideResearchFocus(world, taskId) {
  const predicate = researchGoals[taskId];
  if (!predicate) return null;
  let cached = researchFocusCache.get(world);
  if (!cached) { cached = new Map(); researchFocusCache.set(world, cached); }
  if (cached.has(taskId)) return cached.get(taskId);
  const ready = taskId !== 'recipeTrio' && world.unlocked.some((id) => catalog.items[id] && predicate(catalog.items[id]));
  const focus = ready ? null : nearestResearch(world, predicate);
  cached.set(taskId, focus);
  return focus;
}

function taskPage(world, task) {
  return guideResearchFocus(world, task.id) ? '研究' : task.tab ?? task.target;
}

function matchesPage(world, task, page) {
  if (task.id === 'stationUpgrade') return page === '料坊' || page === '工房';
  if (page === '研究' && guideResearchFocus(world, task.id)) return true;
  return (task.tab ?? task.target) === page;
}

function slotsFor(world, kind) {
  return world.facilities[kind] ?? world.stations[kind];
}

const itemName = (id) => catalog.items[id].name;
const producerPlace = (kind) => placeNames[kind] ?? placeNames[kind[0]];

// What a research offer lacks: missing materials (the first one explained) and coins.
function shortage(world, offer) {
  const short = offer.costs.filter(([id, amount]) => (world.inventory[id] ?? 0n) < amount).map(([id]) => id);
  const details = { short: short.map(itemName), coins: world.coins < offer.coins };
  const first = short[0];
  if (!first) return details;
  if (!world.unlocked.includes(first)) return { ...details, locked: true };
  const eater = ['I', 'P'].find((kind) => world.stations[kind].some((slot) =>
    slot.recipe && Object.hasOwn(catalog.items[slot.recipe]?.inputs ?? {}, first)));
  return { ...details, ...(eater && { eaten: placeNames[eater] }), from: producerPlace(catalog.items[first].kind) };
}

function researchDetails(world, { goal, step }, listCost) {
  const details = { name: itemName(step), goal: goal === step ? '' : itemName(goal), short: [], coins: false };
  if (listCost) {
    const offer = researchOffer(world, goal);
    if (offer) details.cost = { name: itemName(goal), coins: compact(offer.coins),
      items: offer.costs.map(([id, amount]) => ({ name: itemName(id), amount: compact(amount) })) };
  }
  const offer = researchOffer(world, step);
  return offer && !offer.affordable ? { ...details, ...shortage(world, offer) } : details;
}

function lockedStep(world, task, type, speaker) {
  const focus = guideResearchFocus(world, task.id);
  return focus ? taskHelpCopy(speaker, type, {
    branch: task.branch, ...researchDetails(world, focus, costListed.has(task.id)),
  }) : null;
}

function purchaseStep(world, kind, speaker) {
  const quote = Object.hasOwn(world.facilities, kind) ? facilityOffer(world, kind) : stationOffer(world, kind);
  const purchase = purchaseNames[kind];
  if (quote && !quote.affordable) return elsewhere(productionHelpCopy(speaker, 'funds', { purchase }));
  if (!slotsFor(world, kind).length) return productionHelpCopy(speaker, 'buy', { purchase });
  return productionHelpCopy(speaker, addNames[kind] ? 'addMore' : 'buyMore', { purchase, what: addNames[kind] });
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

// Some slot is below the target but none below it can pay for one more level: earn coins first.
function upgradeNeedsCoins(world, kind, target) {
  const slots = slotsFor(world, kind);
  const quote = world.facilities[kind] ? facilityOffer : stationUpgradeOffer;
  return slots.some((slot) => BigInt(slot.level) < target) &&
    !slots.some((slot, index) => BigInt(slot.level) < target && quote(world, kind, index, 1n)?.affordable);
}

// Upgrade tasks: [kind, target level]. stationUpgrade uses the processing station, as on the task page.
const upgradeTasks = { firstUpgrade: ['C', 2n], fieldLevel10: ['C', 10n], livestockUpgrade: ['L', 5n],
  fishUpgrade: ['F', 5n], miningUpgrade: ['M', 5n], stationUpgrade: ['I', 2n] };

// True when the task manager tells an upgrade task to earn coins first; the task card then goes to the warehouse.
export function guideNeedsCoins(world, taskId) {
  const entry = upgradeTasks[taskId];
  return Boolean(entry) && upgradeNeedsCoins(world, ...entry);
}

function upgradeStep(world, kind, target, speaker) {
  const slots = slotsFor(world, kind);
  if (!slots.length) return purchaseStep(world, kind, speaker);
  if (!slots.some((slot) => BigInt(slot.level) < target)) return otherStationCopy(speaker);
  if (upgradeNeedsCoins(world, kind, target)) {
    return elsewhere(productionHelpCopy(speaker, 'upgradeFunds', { place: placeNames[kind], target }));
  }
  // The copy points to batch upgrade instead of naming a slot or a step count.
  return productionHelpCopy(speaker, 'upgrade', { place: placeNames[kind], target });
}

function firstUnlocked(world, predicate) {
  return world.unlocked.find((id) => predicate(catalog.items[id]));
}

// Locked order still short of stock: the one with the fewest pieces left, after the merchant's hold.
function orderStock(world, speaker) {
  const left = (order) => {
    const have = (world.inventory[order.item] ?? 0n) - activeMerchantHoldQuantity(world, order.item);
    return order.count - (have > 0n ? have : 0n);
  };
  const order = world.orders.active.filter((entry) => entry.status === 'locked')
    .reduce((best, entry) => !best || left(entry) < left(best) ? entry : best, null);
  return taskHelpCopy(speaker, 'orderStock', { left: compact(left(order)), item: itemName(order.item) });
}

// No order yet: minutes until the next check, plus the next unfinished main task to do meanwhile.
function orderWaiting(world, speaker) {
  const minutes = Math.max(1, Math.ceil((world.orders.nextAttemptMs - world.clockMs) / 60000));
  const next = guideState(world).main.find((task) => task.id !== 'firstOrder');
  const page = next && taskPage(world, next);
  const step = next && spoken(taskInstruction(world, next, page, speaker));
  return elsewhere(taskHelpCopy(speaker, 'orderWaiting', {
    minutes, next: step?.text ?? '', page: step?.here ? page : '',
  }));
}

function taskInstruction(world, task, page, speaker) {
  switch (task.id) {
    case 'firstHarvest': return assignStep(world, 'C', 'C01', speaker);
    case 'firstFlour': return assignStep(world, 'I', 'I01', speaker);
    case 'firstOrder': {
      if (!world.orders.active.length) {
        return world.orders.nextAttemptMs === null ? taskHelpCopy(speaker, 'orderProduction') : orderWaiting(world, speaker);
      }
      if (hasDeliverableOrder(world)) return taskHelpCopy(speaker, 'orderReady');
      if (world.orders.active.some((order) => order.status === 'locked')) return orderStock(world, speaker);
      return taskHelpCopy(speaker, 'firstOrder');
    }
    case 'breadRecipe': {
      const offer = researchOffer(world, 'P01');
      return offer && !offer.affordable
        ? taskHelpCopy(speaker, 'breadLack', { name: itemName('P01'), ...shortage(world, offer) })
        : taskHelpCopy(speaker, 'breadRecipe');
    }
    case 'recipeTrio': {
      const focus = guideResearchFocus(world, task.id);
      return focus ? taskHelpCopy(speaker, 'recipeNext', researchDetails(world, focus, false)) : taskHelpCopy(speaker, task.id);
    }
    case 'firstTech': {
      const ready = techDefinitions.some((definition) => {
        const offer = techOffer(world, definition.key);
        return offer?.eligible && offer.affordable;
      });
      return taskHelpCopy(speaker, ready ? 'firstTech' : 'firstTechPoints');
    }
    case 'delegationTech':
      return taskHelpCopy(speaker, techOffer(world, 'delegation')?.affordable ? 'delegationTech' : 'delegationTechPoints');
    case 'firstSale': case 'firstSeed': case 'reserveStock': case 'codex20': return taskHelpCopy(speaker, task.id);
    case 'firstBread': return assignStep(world, 'P', 'P01', speaker);
    case 'firstPlot': return purchaseStep(world, 'C', speaker);
    case 'firstUpgrade': return upgradeStep(world, ...upgradeTasks.firstUpgrade, speaker);
    case 'firstSwitch': {
      const alternative = world.unlocked.find((id) => id !== 'C01' && catalog.items[id]?.kind === 'C');
      return alternative ? assignStep(world, 'C', alternative, speaker) : taskHelpCopy(speaker, 'firstSwitch');
    }
    case 'addProcessor': return purchaseStep(world, 'I', speaker);
    case 'addRefinery': return purchaseStep(world, 'P', speaker);
    case 'stationUpgrade': return upgradeStep(world, page === '工房' ? 'P' : 'I', 2n, speaker);
    case 'fieldLevel10': return upgradeStep(world, 'C', 10n, speaker);
    case 'livestockIntro': case 'buildLivestock': return purchaseStep(world, 'L', speaker);
    case 'fishIntro': case 'buildFish': return purchaseStep(world, 'F', speaker);
    case 'miningIntro': case 'buildMine': return purchaseStep(world, 'M', speaker);
    case 'collectLivestock': case 'collectFish': case 'collectMining': {
      const kind = { collectLivestock: 'L', collectFish: 'F', collectMining: 'M' }[task.id];
      const id = firstUnlocked(world, (item) => item.kind === kind);
      return id ? assignStep(world, kind, id, speaker) : lockedStep(world, task, 'collectLocked', speaker);
    }
    case 'livestockUpgrade': case 'fishUpgrade': case 'miningUpgrade':
      return upgradeStep(world, { livestockUpgrade: 'L', fishUpgrade: 'F', miningUpgrade: 'M' }[task.id], 5n, speaker);
    case 'firstLivestockProcessing': case 'firstFishProcessing': case 'firstMiningProcessing': {
      const kind = { firstLivestockProcessing: 'IL', firstFishProcessing: 'IF', firstMiningProcessing: 'IM' }[task.id];
      const id = firstUnlocked(world, (item) => item.kind === kind);
      return id ? assignStep(world, 'I', id, speaker) : lockedStep(world, task, 'processingLocked', speaker);
    }
    case 'firstMixedProduct': {
      const id = firstUnlocked(world, (item) => item.kind.startsWith('P') && item.sources.length >= 2);
      return id ? assignStep(world, 'P', id, speaker) : lockedStep(world, task, 'mixedLocked', speaker);
    }
    // The sale stays closed until the main line is done (farmSaleOffer.guideLocked); that copy names 「任务」 itself.
    case 'newFarm': return activeGuideTask(world) ? elsewhere(taskHelpCopy(speaker, 'newFarmLocked'))
      : taskHelpCopy(speaker, task.gateMet ? 'newFarm' : 'newFarmGate');
    default: return null;
  }
}

const pageRoles = { 任务: 'tasks', 田地: 'field', 畜牧: 'livestock', 鱼塘: 'fish', 矿洞: 'mine',
  料坊: 'processing', 工房: 'refining', 仓库: 'warehouse', 研究: 'research', 图鉴: 'estate', 出售庄园: 'estate', 订单中心: 'orders' };
const speakerKey = (speaker) => speaker.role + ':' + speaker.gender;

// The task page speaks for the active main task, or the first shown unfinished branch task once the main line is
// done; other pages speak for the active main task or the first branch task whose place matches.
export function managerTutorial(world, page, speaker) {
  speaker = helpVoice(speaker, pageRoles[page]);
  const key = page + ':' + speakerKey(speaker);
  let cached = tutorialCache.get(world);
  if (!cached) { cached = new Map(); tutorialCache.set(world, cached); }
  if (cached.has(key)) return cached.get(key);
  const state = guideState(world);
  const task = page === '任务' ? state.active ?? state.branches[0] ?? null
    : state.active && matchesPage(world, state.active, page) ? state.active
      : state.branches.find((task) => matchesPage(world, task, page));
  let result = null;
  if (task) {
    const destination = taskPage(world, task);
    const step = spoken(taskInstruction(world, task, page === '任务' ? destination : page, speaker));
    if (step) {
      const text = page === '任务' && step.here ? tutorialDestination(speaker, destination, step.text) : step.text;
      result = { ...tutorial(text, quotedTerms(text)), taskId: task.id };
    }
  }
  cached.set(key, result);
  return result;
}

const guideCache = new WeakMap();
const kindPages = { C: '田地', L: '畜牧', F: '鱼塘', M: '矿洞', I: '料坊', P: '工房' };

// Coins a task card sends to the warehouse for: where they are spent next, and whether they are still short.
function earnTarget(world, taskId) {
  if (taskId === 'firstPlot') return { page: '田地', button: purchaseNames.C, short: !facilityOffer(world, 'C')?.affordable };
  const entry = upgradeTasks[taskId];
  return entry ? { page: kindPages[entry[0]], button: '批量管理', short: guideNeedsCoins(world, taskId) } : null;
}

// Guidance for a task-card arrival: what task `taskId` needs on `page` right now, in the page manager's voice and
// without a destination prefix. Main and branch guide tasks only; null when the task is done or the page has nothing
// to do for it. Landing pages: the task's own page (the 料坊 or 工房 page for stationUpgrade), the warehouse when the
// card sent the player to earn coins, the research page while the task's item is locked.
export function managerTaskGuide(world, taskId, page, speaker) {
  speaker = helpVoice(speaker, pageRoles[page]);
  const key = taskId + ':' + page + ':' + speakerKey(speaker);
  let cached = guideCache.get(world);
  if (!cached) { cached = new Map(); guideCache.set(world, cached); }
  if (cached.has(key)) return cached.get(key);
  const task = objectives(world).guide.find((entry) => entry.id === taskId);
  let text = null;
  if (task && !task.done) {
    const own = task.tab ?? task.target;
    if (taskId === 'stationUpgrade' ? page === '料坊' || page === '工房' : page === own) {
      text = spoken(taskInstruction(world, task, page, speaker))?.text ?? null;
    } else if (page === '仓库') {
      const earn = earnTarget(world, taskId);
      if (earn) text = taskHelpCopy(speaker, earn.short ? 'earn' : 'earnDone', earn);
    } else if (page === '研究') {
      text = guideResearchFocus(world, taskId) ? spoken(taskInstruction(world, task, page, speaker))?.text ?? null
        : researchGoals[taskId] ? taskHelpCopy(speaker, 'researchDone', { page: own }) : null;
    }
  }
  const result = text ? { text, emphasis: quotedTerms(text), expression: 'smile' } : null;
  cached.set(key, result);
  return result;
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
    // One hint per page when anything can be upgraded; batch upgrade covers every slot at once.
    if (slots.some((slot, index) => quote(world, kind, index, 1n)?.affordable)) {
      const text = productionHelpCopy(speaker, 'upgradeReady', { place: placeNames[kind] });
      messages.push({ text, priority: 1, emphasis: quotedTerms(text), expression: 'smile' });
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
      const text = researchHelpCopy(speaker, 'quality', { all: all.affordable && all.count > 1n });
      messages.push({ text, emphasis: quotedTerms(text), expression: 'smile', priority: 1 });
    }
  } else if (tab === '经营改良') {
    for (const definition of techDefinitions) {
      const offer = techOffer(world, definition.key);
      if (!offer?.eligible || !offer.affordable) continue;
      const text = researchHelpCopy(speaker, 'tech', { name: definition.name });
      messages.push({ text, emphasis: quotedTerms(text), expression: 'smile', priority: 1 });
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
  const emphasis = quotedTerms(text, type === 'introduction' ? introductionEmphasis[details.page] ?? [] : []);
  return { text, emphasis, expression: type === 'missing' ? 'sad' : 'smile' };
}
