import { catalog, stationRequirements } from '../game/world.js';
import { marketRate } from '../game/market.js';
import { merchantStatus } from '../game/merchant.js';
import { hasDeliverableOrder } from '../game/orders.js';
import {
  giftAllProtectedItems, managerGiftLimit, managerGiftRemaining, managerIds, managerStatus, planGiftAll, quoteGiftAll,
  quoteManagerGift,
} from '../game/managers.js';
import { managerCharacters } from './manager-dialogue.js';
import { managerTutorial, managerUpgradeMessages, managerResearchHelp, managerContextHelp } from './manager-help.js';
import { compact } from './numbers.js';

export const managerPages = {
  任务: 'tasks', 经营: 'estate', 畜牧: 'livestock', 田地: 'field', 矿洞: 'mine', 鱼塘: 'fish',
  加工: 'processing', 精制: 'refining', 仓库: 'warehouse', 研究: 'research', 行脚商: 'merchant', 订单中心: 'orders',
  角色管理: 'estate', 统计: 'estate', 出售庄园历史: 'estate', 图鉴: 'estate', 出售庄园: 'estate',
};

const estateIntroductionPages = new Set(['角色管理', '统计', '出售庄园历史', '图鉴', '出售庄园']);

const facilities = { field: 'C', livestock: 'L', fish: 'F', mine: 'M' };
const facilityHelpEmphasis = {
  field: ['购地', '播下种子', '种子下地', '添块田'],
  livestock: ['购买养殖场', '选只小家伙', '合适的动物', '盖座养殖场', '添个养殖场'],
  fish: ['购买鱼塘', '挑种鱼', '鱼种', '建个鱼塘', '添个鱼塘'],
  mine: ['购买矿洞', '选矿', '矿种', '买一座矿洞', '准备矿洞'],
};
const workshops = { processing: 'I', refining: 'P' };
const contextPlaceNames = { field: '田地', livestock: '养殖场', fish: '鱼塘', mine: '矿洞', processing: '加工位', refining: '精制位' };
const assignmentNames = { field: '播种', livestock: '安排养殖', fish: '安排养殖', mine: '开采', processing: '选择配方', refining: '选择配方' };
const silent = { muted: true, fontSize: 14 };
const produceForAffinity = '多生产一些物品，就能继续提高好感。';
const giftTypes = ['全部', '原料', '加工品', '商品'];
const giftType = (item) => item.kind[0] === 'I' ? '加工品' : item.kind[0] === 'P' ? '商品' : '原料';
const amount = (value) => compact(value) + ' 金币';
const pieces = (value) => compact(value) + ' 件';
const portrait = (id, gender, expression) => 'manager-art:portraits/' + id + '/' + gender + '-' + expression;
const actionIcon = (name) => 'manager-art:icons/' + name;
const nameOrder = (a, b) => a.localeCompare(b, 'zh-CN');

function subunits(value, base) {
  const whole = value / base;
  const remainder = value % base;
  if (!remainder || whole >= 10000n) return compact(whole);
  const width = String(base).length - 1;
  return compact(whole) + '.' + String(remainder).padStart(width, '0').replace(/0+$/, '');
}

function affinityNeedsProduction(status) {
  return status.valueToDailyCap > 0n && status.affinityFundingRemaining === 0n;
}

// Affinity levels have no cap; every level shows progress toward the next one.
function levelProgress(status) {
  return { progress: status.affinity - status.threshold, target: status.nextThreshold - status.threshold };
}

function giftAffinitySummary(panel, status) {
  panel.row('好感等级', status.level + ' 级', { compact: true, noWrap: true });
  const { progress, target } = levelProgress(status);
  panel.goalProgress(Number(progress) / Number(target));
  panel.text('下一级进度 ' + subunits(progress, 100n) + ' / ' + subunits(target, 100n) + ' 点', silent);
  panel.row('今日好感', subunits(status.dailyGain, 100n) + ' / ' + subunits(status.dailyCap, 100n) + ' 点', {
    compact: true, noWrap: true,
  });
}

function giftGainEntry(status, quote) {
  const atDailyCap = status.dailyGain >= status.dailyCap || Boolean(quote && status.dailyGain + quote.gain >= status.dailyCap);
  return {
    label: '增加好感',
    value: (quote ? '+' + subunits(quote.gain, 100n) + ' 点' : '—') + (atDailyCap ? '（已达今日上限）' : ''),
    tone: atDailyCap ? 'danger' : 'plain', noWrap: !atDailyCap,
  };
}

function managerResearchTab(ui) {
  const requested = ['品种配方', '品质', '经营改良'].includes(ui.local.tab) ? ui.local.tab : '品种配方';
  const linked = ui.local.id && Object.hasOwn(catalog.items, ui.local.id);
  return linked && (requested === '经营改良' || (requested === '品质' && !ui.w.unlocked.includes(ui.local.id)))
    ? '品种配方' : requested;
}

function managerHelp(ui, id, character, researchReady, page, speaker) {
  const world = ui.w;
  const tutorial = managerTutorial(world, page, speaker);
  const tab = managerResearchTab(ui);
  const techTutorial = tutorial && ['firstTech', 'delegationTech'].includes(tutorial.taskId);
  const showTutorial = id !== 'research' || (tab === '经营改良' ? techTutorial : tab === '品种配方' && !techTutorial);
  return [
    showTutorial ? tutorial : null,
    ...managerContextMessages(ui, id, character, researchReady, speaker.gender),
    ...managerUpgradeMessages(world, page, speaker),
    ...(id === 'research' ? managerResearchHelp(world, tab, speaker) : []),
  ].filter(Boolean);
}

function characterHelpMessage(text, emphasis = []) {
  return { text, emphasis: [...new Set([...emphasis, ...Array.from(text.matchAll(/「([^」]+)」/g), (match) => match[1])])] };
}

function managerContextMessages(ui, id, character, researchReady, gender) {
  const world = ui.w;
  if (id === 'tasks' || id === 'estate') return [];
  if (Object.hasOwn(facilities, id)) {
    const slots = world.facilities[facilities[id]];
    if (!slots.length) return [characterHelpMessage(character.help('none'), facilityHelpEmphasis[id])];
    return slots.flatMap((slot, index) => slot.recipe ? [] : [managerContextHelp(id, gender, 'empty', {
      index: index + 1, place: contextPlaceNames[id], button: assignmentNames[id],
    })]);
  }
  if (Object.hasOwn(workshops, id)) {
    const stations = world.stations[workshops[id]];
    const messages = [];
    for (const [index, station] of stations.entries()) {
      if (!station.recipe || station.batch) continue;
      for (const missing of stationRequirements(world, station.recipe, station.level)) {
        if (missing.owned >= missing.needed) continue;
        const name = catalog.items[missing.id].name;
        messages.push(managerContextHelp(id, gender, 'missing', {
          index: index + 1, place: contextPlaceNames[id], item: name, button: '查看来源',
        }));
      }
    }
    for (const [index, station] of stations.entries()) if (!station.recipe) messages.push(managerContextHelp(id, gender, 'idle', {
      index: index + 1, place: contextPlaceNames[id], button: '选择配方',
    }));
    return messages;
  }
  if (id === 'warehouse') {
    return Object.keys(world.market?.rates ?? {}).flatMap((key) => {
      const name = catalog.items[key]?.name;
      const rate = marketRate(world, key);
      return name && world.inventory[key] > 0n && rate !== 0
        ? [characterHelpMessage(character.help(name, rate), [name])] : [];
    });
  }
  if (id === 'research') {
    const tab = managerResearchTab(ui);
    return tab === '品种配方' && researchReady ? [characterHelpMessage(character.help(), ['品种配方'])] : [];
  }
  if (id === 'merchant' && !merchantStatus(world).unlocked) return [characterHelpMessage(character.help(), ['开摊条件'])];
  if (id === 'orders') {
    const { active } = world.orders;
    if (!active.length) return [characterHelpMessage(character.help('none'))];
    return [
      hasDeliverableOrder(world) ? characterHelpMessage(character.help('ready')) : null,
      active.some(({ status }) => status !== 'locked') ? characterHelpMessage(character.help('pending')) : null,
    ].filter(Boolean);
  }
  return [];
}

const randomLine = (lines) => lines[Math.floor(Math.random() * lines.length)];
const nextGreetingFor = (character) => (currentText) => {
  const lines = character.hello;
  const start = lines.indexOf(currentText);
  for (let step = 1; step <= lines.length; step += 1) {
    const line = lines[(start + step) % lines.length];
    if (line !== currentText) return line;
  }
  return undefined;
};

function showManagerFeedback(ui, id, text, wanted = false, inCard = false) {
  ui.queueManagerSpeech(id, managerStatus(ui.currentWorld(), id).gender, { text, expression: wanted ? 'happy' : 'smile' }, { inCard });
}

async function receiveGift(page, panel, status, inCard = false) {
  if (!status.claim) return;
  const result = await panel.action('claimManagerGift', status.claim);
  if (!result || result === true) return;
  // Capsules beyond the holding cap stay ready; main.js shows the holding-limit notice.
  const received = result.items.map(({ itemId, count }) => ({ icon: itemId, label: catalog.items[itemId].name, count }));
  if (result.capsules?.added > 0n) received.push({ icon: 'time-capsule', label: '时空胶囊', count: result.capsules.added });
  if (!received.length) return;
  const appearance = managerCharacters[status.id][status.gender];
  if (!inCard) showManagerFeedback(page, status.id, appearance.received, false, inCard);
  panel.dialog('收到回礼', (resultPanel) => {
    resultPanel.scrollList(received, (cell, { icon, label, count }) => {
      cell.row(label, '+' + compact(count), { icon });
    });
  }, { flow: 'manager-return-result' });
}

export function managerInfo(page, id, { inCard = false } = {}) {
  const role = managerCharacters[id];
  page.dialog('管理员资料', (panel) => {
    const status = managerStatus(panel.w, id);
    const character = role[status.gender];
    panel.local.managerRole = id;
    panel.card((card) => card.feature(portrait(id, status.gender, panel.managerExpression(id, status.gender, { inCard })), (copy) => {
      copy.heading(character.name, { size: 19 });
      copy.text(role.title, silent);
      copy.text(character.bio, silent);
    }, {
      align: 'center', ratio: 0.34, artAspect: 1.13, surface: 'none', cover: true,
      onClick: inCard ? undefined : () => {
        if (managerStatus(panel.currentWorld(), id).claim) return;
        panel.advanceManagerSpeech(id, status.gender, { nextGreeting: nextGreetingFor(character) });
      },
    }), { padding: 9, gap: 7 });
    panel.row('好感等级', status.level + ' 级', { compact: true, noWrap: true });
    const { progress, target } = levelProgress(status);
    panel.goalProgress(Number(progress) / Number(target));
    panel.text('距下一级 ' + subunits(target - progress, 100n) + ' 点', silent);
    panel.detailRows([
      { label: '今日好感', value: subunits(status.dailyGain, 100n) + ' / ' + subunits(status.dailyCap, 100n) },
      ...(status.valueToDailyCap > 0n
        ? [{ label: '今天涨满还需', value: '普通礼物 ' + amount(status.valueToDailyCap), noWrap: true }] : []),
      { label: '回礼比例', value: status.returnRate + '%' },
    ]);
    if (status.dailyGain >= status.dailyCap) panel.text('今日好感已满，仍可送礼。', silent);
    if (affinityNeedsProduction(status)) panel.text(produceForAffinity, silent);
    if (status.wants.length) {
      panel.heading('今日心愿', { size: 17 });
      for (const itemId of status.wants) panel.row(catalog.items[itemId].name, '好感 ×2', {
        icon: itemId, compact: true, noWrap: true,
      });
    }
    if (status.readyReturn > 0n && !status.claim) panel.text('有合适的物品时可领取回礼。', silent);
    panel.buttons([
      ...(status.claim ? [{ label: '收回礼', tone: 'plain', icon: actionIcon('receive'), onClick: () => receiveGift(page, panel, status, inCard) }] : []),
      { label: '切换角色', tone: 'plain', icon: actionIcon('switch'), onClick: () => panel.action('switchManagerAppearance', id) },
    ]);
  }, { managerFocus: '管理员资料', managerRole: id, managerInCard: inCard });
}

function giftChoices(world, status) {
  const wanted = new Set(status.wants);
  return Object.entries(world.inventory).flatMap(([id, inventory]) => {
    const item = catalog.items[id];
    if (!item || inventory <= 0n) return [];
    const limit = managerGiftLimit(world, id);
    if (limit.available <= 0n) return [];
    return [{ id, label: item.name, icon: id, type: giftType(item), wanted: wanted.has(id), ...limit }];
  }).sort((a, b) => Number(b.wanted) - Number(a.wanted) || nameOrder(a.label, b.label));
}

function giftPicker(page, opener, id, inCard = false) {
  const state = { type: '全部' };
  opener.dialog('送礼', (panel) => {
    const status = managerStatus(panel.w, id);
    const remaining = managerGiftRemaining(panel.w);
    panel.row('还能赠送的礼物总值', compact(remaining), { compact: true, noWrap: true });
    giftAffinitySummary(panel, status);
    if (remaining === 0n) {
      panel.text('去仓库卖出物品，就能继续送礼。', silent);
      panel.button(id === 'warehouse' ? '返回仓库' : '去仓库', () => panel.go('仓库'), { tone: 'gold' });
      return;
    }
    const items = giftChoices(panel.w, status);
    if (!items.length) {
      panel.empty('没有可送的库存。');
      return;
    }
    const reset = () => { panel.local.scroll = 0; delete panel.local.indexKeyboard; panel.refresh(); };
    if (items.length > 8) panel.tabs(giftTypes, state.type, (type) => { state.type = type; reset(); }, { style: 'filter', compact: true });
    const available = items.filter(({ type }) => state.type === '全部' || type === state.type);
    if (!available.length) {
      panel.empty('没有符合筛选的物品。');
      return;
    }
    const eligible = available.filter(({ maximum }) => maximum > 0n);
    if (eligible.length && affinityNeedsProduction(status)) panel.text(produceForAffinity, silent);
    panel.indexRows(eligible.map((item) => ({
      ...item, status: '可用 ' + pieces(item.available) + (item.wanted ? ' · 心愿' : ''),
      statusEmphasis: item.wanted ? ['心愿'] : [],
    })), (item) => giftQuantity(page, panel, id, item, inCard));
    if (eligible.length < available.length) {
      panel.text(eligible.length ? '其余物品超出送礼额度。' : '送礼额度不足。', silent);
    }
  }, { flow: 'manager-gifts', managerFocus: '送礼' });
}

function sameGiftQuote(a, b) {
  return Boolean(a && b && Object.keys(a).every((key) => a[key] === b[key]));
}

function giftQuantity(page, picker, id, item, inCard) {
  const quote = (world, count) => quoteManagerGift(world, id, item.id, count);
  const state = { count: 1n, checked: quote(picker.w, 1n), revised: false };
  const percentOf = (count, maximum) => maximum > 0n ? Number((count * 100n + maximum - 1n) / maximum) : 100;
  const countAt = (percent, maximum) => {
    const proportional = maximum * BigInt(percent) / 100n;
    return proportional > 0n ? proportional : 1n;
  };
  const choose = (panel, count, percent) => {
    state.count = count;
    state.percent = percent;
    state.checked = quote(panel.currentWorld(), count);
    state.revised = false;
    panel.refresh();
  };
  picker.dialog('送出' + item.label, (panel) => {
    const status = managerStatus(panel.w, id);
    const { maximum, unitPrice, available, remaining } = managerGiftLimit(panel.w, item.id);
    const limitReason = remaining <= 0n ? '额度已用完' : available <= 0n ? '库存不足' : '额度不足';
    const actual = quote(panel.w, state.count);
    const changed = Boolean(actual) && !sameGiftQuote(state.checked, actual);
    giftAffinitySummary(panel, status);
    panel.itemQuantity(item.id, item.label, pieces(state.count));
    if (status.wants.includes(item.id)) panel.text('今日心愿 · 好感 ×2', silent);
    panel.slider(state.percent ?? Math.min(100, percentOf(state.count, maximum)),
      (percent) => choose(panel, countAt(percent, maximum), percent), { min: 1, bubble: true });
    const choosePreset = (percent) => {
      const count = countAt(percent, maximum);
      if (count > maximum) choose(panel, maximum);
      else choose(panel, count, percent);
    };
    panel.buttons([
      { label: '25%', disabled: maximum === 0n, reason: limitReason, onClick: () => choosePreset(25) },
      { label: '50%', disabled: maximum === 0n, reason: limitReason, onClick: () => choosePreset(50) },
      { label: '100％', disabled: maximum === 0n, reason: limitReason, onClick: () => {
        choose(panel, maximum, 100);
      } },
    ], { style: 'filter', compact: true });
    panel.detailRows([
      { label: '礼物价值', value: amount(state.count * unitPrice), noWrap: true },
      giftGainEntry(status, actual),
      { label: '明日回礼', value: actual ? subunits(actual.returnValue, 10n) + ' 金币' : '—', noWrap: true },
    ]);
    if (!actual) panel.text('当前最多可送 ' + pieces(maximum) + '。', silent);
    else if (changed || state.revised) panel.text('报价已更新，请核对后送礼。', silent);
    panel.buttons([
      { label: '重选物品', onClick: () => panel.close() },
      {
        label: changed ? '核对报价' : '确认送礼', tone: 'gold', disabled: !actual,
        reason: maximum === 0n ? limitReason : '超出可送数量',
        onClick: async () => {
          if (changed) {
            state.checked = actual;
            state.revised = true;
            panel.refresh();
            return;
          }
          const sent = await panel.action('giftManager', actual);
          if (!sent) {
            state.checked = quote(panel.currentWorld(), state.count);
            state.revised = true;
            panel.refresh();
            return;
          }
          const character = managerCharacters[id][managerStatus(panel.currentWorld(), id).gender];
          const reply = randomLine(sent.wanted ? character.wantedThanks : character.thanks);
          panel.closeManagerGift(() => {
            showManagerFeedback(page, id, reply, sent.wanted, inCard);
          });
        },
      },
    ]);
  }, { flow: 'manager-quantity', minHeight: 465 });
}

export function renderManager(ui, id, researchReady = false, page = Object.keys(managerPages).find((page) => managerPages[page] === id)) {
  const status = managerStatus(ui.w, id);
  const character = managerCharacters[id][status.gender];
  const speaker = { role: id, gender: status.gender };
  const seen = new Set();
  const messages = (status.claim ? character.returnPrompts.map((text) => ({
    text, expression: 'smile', priority: 4,
  })) : [
    ...managerHelp(ui, id, character, researchReady, page, speaker).map((help) => ({ priority: 1, ...help })),
    ...(estateIntroductionPages.has(page) ? [{ ...managerContextHelp(id, status.gender, 'introduction', { page }), priority: 0 }] : []),
  ]).sort((a, b) => b.priority - a.priority).filter(({ text }) => {
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
  const message = messages[0] ?? null;
  ui.managerBanner({
    role: id, gender: status.gender, message, messages,
    greeting: () => randomLine(character.hello), nextGreeting: nextGreetingFor(character),
    background: 'manager-art:backgrounds/' + id,
    receive: status.claim ? () => receiveGift(ui, ui, status) : undefined,
    receiveIcon: actionIcon('receive'),
    actions: [
      { label: '管理员资料', icon: actionIcon('info'), onClick: () => managerInfo(ui, id) },
      { label: '送礼', icon: actionIcon('gift'), onClick: () => giftPicker(ui, ui, id) },
      { label: '切换角色', icon: actionIcon('switch'), onClick: () => ui.action('switchManagerAppearance', id) },
    ],
  });
}


export const managerDirectoryOrder = ['tasks', 'estate', 'field', 'livestock', 'fish', 'mine',
  'processing', 'refining', 'warehouse', 'research', 'merchant', 'orders'];

export function renderManagerDirectory(ui) {
  ui.scrollList(managerDirectoryOrder, (cell, id) => {
    const status = managerStatus(cell.w, id);
    const role = managerCharacters[id];
    const character = role[status.gender];
    cell.card((card) => {
      card.feature(portrait(id, status.gender, card.managerExpression(id, status.gender, { inCard: true })), (copy) => {
        copy.heading(character.name, { size: 19 });
        copy.text(role.title, silent);
        copy.text('好感 ' + status.level + ' 级', { fontSize: 15 });
        copy.row('今日好感', subunits(status.dailyGain, 100n) + ' / ' + subunits(status.dailyCap, 100n) + ' 点', { compact: true, noWrap: true });
        copy.goalProgress(Number(status.dailyGain) / Number(status.dailyCap));
      }, {
        ratio: 0.32, artAspect: 1.12, cover: true, surface: 'none',
        managerReply: { role: id, gender: status.gender },
      });
      card.buttons([
        { label: '资料', icon: actionIcon('info'), indicator: Boolean(status.claim), onClick: () => managerInfo(ui, id, { inCard: true }) },
        { label: '送礼', icon: actionIcon('gift'), onClick: () => giftPicker(ui, ui, id, true) },
        { label: '切换角色', icon: actionIcon('switch'), onClick: async () => {
          const changed = await ui.action('switchManagerAppearance', id);
          if (changed) {
            delete ui.local.managerSpeechKeys?.[id];
            delete ui.local.managerSpeechKeys?.[id + ':card'];
            const replying = ui.local.managerReplyRoles?.filter((role) => role !== id);
            if (replying?.length) ui.local.managerReplyRoles = replying;
            else delete ui.local.managerReplyRoles;
            ui.refresh();
          }
        } },
      ]);
    }, { padding: 8, gap: 5 });
  });
  const claims = managerIds.map((id) => managerStatus(ui.w, id).claim).filter(Boolean);
  ui.footer((footer) => footer.buttons([
    { label: '全员收礼', tone: 'plain', icon: actionIcon('receive'), disabled: !claims.length, reason: '没有回礼', onClick: () => receiveAll(ui) },
    { label: '全员送礼', tone: 'gold', icon: actionIcon('gift'), disabled: !giftAllReady(ui.w),
      reason: managerGiftRemaining(ui.w) <= 0n ? '额度已用完' : '没有可送物品', onClick: () => giftAll(ui) },
  ]));
}

// Claims every ready return at once and lists what arrived, like a single claim.
async function receiveAll(ui) {
  const claims = managerIds.map((id) => managerStatus(ui.currentWorld(), id).claim).filter(Boolean);
  if (!claims.length) return;
  const result = await ui.action('claimAllManagerGifts', claims);
  if (!result || result === true) return;
  const received = result.items.map(({ itemId, count }) => ({ icon: itemId, label: catalog.items[itemId].name, count }));
  if (result.capsules?.added > 0n) received.push({ icon: 'time-capsule', label: '时空胶囊', count: result.capsules.added });
  if (!received.length) return;
  ui.dialog('收到回礼', (panel) => {
    panel.scrollList(received, (cell, { icon, label, count }) => {
      cell.row(label, '+' + compact(count), { icon });
    });
  }, { flow: 'manager-return-result' });
}

// The directory rebuilds on every production completion, so the button uses this cheap
// precondition instead of building the plan: shared allowance left and an unprotected item that
// can be given. It stays enabled after everyone is full today, so the dialog can still send the
// rest of the allowance.
function giftAllReady(world) {
  if (managerGiftRemaining(world) <= 0n) return false;
  const protectedItems = giftAllProtectedItems(world);
  return Object.keys(world.inventory).some((itemId) =>
    !protectedItems.has(itemId) && managerGiftLimit(world, itemId).maximum > 0n);
}

const giftAllModes = { 送满今日好感: 'cap', 送出全部礼物额度: 'all' };
const savedGiftAllMode = (world) => world.settings.giftAllMode === 'all' ? 'all' : 'cap';
// Someone can still gain affinity today; otherwise only sending the rest of the allowance applies.
const giftAllCapOpen = (world) => managerIds.some((id) => {
  const status = managerStatus(world, id);
  return status.valueToDailyCap > 0n && status.affinityFundingRemaining > 0n;
});
// Once everyone is full today the dialog sends the remaining allowance without changing the saved preference.
const giftAllMode = (world) => giftAllCapOpen(world) ? savedGiftAllMode(world) : 'all';
const giftAllEven = (world) => world.settings.giftAllEven === true;
const giftAllPlan = (world) => planGiftAll(world, giftAllMode(world), { even: giftAllEven(world) })
  .map(({ id, itemId, count }) => ({ id, itemId, count }));
// Entries set to zero stay in the local plan so their sliders remain; they are never quoted or sent.
const plannedGifts = (gifts) => gifts.filter(({ count }) => count > 0n).map(({ id, itemId, count }) => ({ id, itemId, count }));
const quotePlan = (world, gifts) => {
  const planned = plannedGifts(gifts);
  return planned.length ? quoteGiftAll(world, planned) : null;
};
const affinityChange = (before, after, cap) =>
  subunits(before, 100n) + ' → ' + subunits(after, 100n) + ' / ' + subunits(cap, 100n) + ' 点';

// Each displayed world is a fresh object, so per-item limits are reused while sliders refresh the same view.
const giftLimits = new WeakMap();
function cachedGiftLimit(world, itemId) {
  if (!giftLimits.has(world)) giftLimits.set(world, new Map());
  const limits = giftLimits.get(world);
  if (!limits.has(itemId)) limits.set(itemId, managerGiftLimit(world, itemId));
  return limits.get(itemId);
}

// Planned pieces per item and planned total value.
function giftAllUsage(world, gifts) {
  const pieces = new Map();
  let value = 0n;
  for (const { itemId, count } of gifts) {
    if (count <= 0n) continue;
    value += count * cachedGiftLimit(world, itemId).unitPrice;
    pieces.set(itemId, (pieces.get(itemId) ?? 0n) + count);
  }
  return { pieces, value };
}

// Pieces of an item left for one role after other planned gifts of the same item (stock only).
function giftAllStock(world, usage, own, itemId) {
  const stock = cachedGiftLimit(world, itemId).available - ((usage.pieces.get(itemId) ?? 0n) - own);
  return stock > 0n ? stock : 0n;
}

// Pieces one role can take of an item after every other planned gift has used stock and the shared allowance.
function giftAllLimit(world, usage, own, itemId) {
  const { available, unitPrice, remaining } = cachedGiftLimit(world, itemId);
  if (unitPrice <= 0n) return 0n;
  const stock = available - ((usage.pieces.get(itemId) ?? 0n) - own);
  const budget = remaining - (usage.value - own * unitPrice);
  const byBudget = budget > 0n ? budget / unitPrice : 0n;
  const maximum = stock < byBudget ? stock : byBudget;
  return maximum > 0n ? maximum : 0n;
}

// Lowers planned counts, in plan order, to what the current stock and shared allowance still cover.
function fitGiftAllPlan(world, gifts) {
  const used = new Map();
  let value = 0n;
  for (const gift of gifts) {
    if (gift.count <= 0n) continue;
    const { available, unitPrice, remaining } = cachedGiftLimit(world, gift.itemId);
    const stock = available - (used.get(gift.itemId) ?? 0n);
    const byBudget = unitPrice > 0n && remaining > value ? (remaining - value) / unitPrice : 0n;
    const limit = stock < byBudget ? stock : byBudget;
    if (gift.count > limit) gift.count = limit > 0n ? limit : 0n;
    used.set(gift.itemId, (used.get(gift.itemId) ?? 0n) + gift.count);
    value += gift.count * unitPrice;
  }
}

function giftAll(page) {
  const state = { gifts: giftAllPlan(page.currentWorld()), changed: false };
  const regenerate = (world, changed) => {
    state.gifts = giftAllPlan(world);
    state.changed = changed;
  };
  page.dialog('全员送礼', (panel) => {
    const world = panel.w;
    let quote = quotePlan(world, state.gifts);
    if (!quote && plannedGifts(state.gifts).length) {
      // Production keeps consuming stock while the dialog is open; keep the player's plan and only
      // trim the entries that now exceed stock or the allowance. Rebuild only if that still fails.
      fitGiftAllPlan(world, state.gifts);
      quote = quotePlan(world, state.gifts);
    }
    if (!quote && plannedGifts(state.gifts).length) {
      regenerate(world, true);
      quote = quotePlan(world, state.gifts);
    }
    state.shown = quote;
    const planned = plannedGifts(state.gifts);
    panel.row('礼物总值 / 还能赠送的礼物总值', compact(quote?.value ?? 0n) + ' / ' + compact(managerGiftRemaining(world)), {
      compact: true, noWrap: true,
    });
    panel.toggle('平均分配', giftAllEven(world), async (on) => {
      if (!await panel.quietAction('updateSettings', { giftAllEven: on })) return;
      regenerate(panel.currentWorld(), false);
      panel.refresh();
    });
    // No choice is offered once everyone is full today: the plan simply sends the rest of the allowance.
    if (giftAllCapOpen(world)) {
      const mode = savedGiftAllMode(world);
      panel.tabs(Object.keys(giftAllModes), mode === 'all' ? '送出全部礼物额度' : '送满今日好感', async (label) => {
        const next = giftAllModes[label];
        if (next === savedGiftAllMode(panel.currentWorld())) return;
        if (!await panel.quietAction('updateSettings', { giftAllMode: next })) return;
        regenerate(panel.currentWorld(), false);
        panel.refresh();
      }, { style: 'filter', keepScroll: true });
    }
    if (state.changed) panel.text('条件有变化，请重新确认', silent);
    panel.scrollList(managerDirectoryOrder, (cell, id) => {
      const status = managerStatus(world, id);
      const character = managerCharacters[id][status.gender];
      const before = quote?.roles[id]?.before ?? status.dailyGain;
      const after = quote?.roles[id]?.after ?? status.dailyGain;
      const gifts = planned.filter((gift) => gift.id === id);
      cell.card((card) => {
        card.item(portrait(id, status.gender, 'smile'), character.name, '今日好感 ' + affinityChange(before, after, status.dailyCap),
          { iconSize: 40, titleSize: 16, crop: true, smooth: true });
        card.goalProgress(Number(after) / Number(status.dailyCap));
        if (!gifts.length) card.text('本次不送', silent);
        else card.rewards(gifts.flatMap(({ itemId, count }) => [
          { icon: itemId, value: count },
          ...(status.wants.includes(itemId) ? [{ text: '心愿', tone: 'danger' }] : []),
        ]), { fontSize: 14 });
      }, { padding: 8, gap: 5, onClick: () => giftAllRole(panel, state, id) });
    });
    panel.footer((footer) => footer.buttons([
      { label: '取消', onClick: () => panel.close() },
      {
        label: '确认送礼', tone: 'gold', disabled: !quote, reason: '未选择礼物',
        onClick: async () => {
          const shown = state.shown;
          if (!shown) return;
          const result = await panel.action('giftAllManagers', shown.gifts);
          if (!result) {
            // The action already toasts 「条件有变化，请重新确认」; avoid repeating it here. Keep the
            // player's edits and trim to the current stock; the render rebuilds only if that fails.
            fitGiftAllPlan(panel.currentWorld(), state.gifts);
            panel.refresh();
            return;
          }
          const current = panel.currentWorld();
          const replies = (result.roles ?? []).map(({ id, wanted }) => {
            const { gender } = managerStatus(current, id);
            const character = managerCharacters[id][gender];
            return {
              role: id, gender,
              line: { text: randomLine(wanted ? character.wantedThanks : character.thanks), expression: wanted ? 'happy' : 'smile' },
            };
          });
          panel.close();
          page.queueManagerReplies(replies);
        },
      },
    ]));
  }, { flow: 'manager-gift-all' });
}

function giftAllRole(opener, state, id) {
  const percents = new Map();
  const roleOrder = (gift) => managerIds.indexOf(gift.id);
  opener.dialog(managerCharacters[id][managerStatus(opener.w, id).gender].name, (panel) => {
    const world = panel.w;
    const status = managerStatus(world, id);
    // Sliders refresh on every move, so this dialog reads the plan without a full quote.
    panel.row('今日好感', subunits(status.dailyGain, 100n) + ' / ' + subunits(status.dailyCap, 100n) + ' 点', {
      compact: true, noWrap: true,
    });
    panel.goalProgress(Number(status.dailyGain) / Number(status.dailyCap));
    panel.divider();
    const usage = giftAllUsage(world, state.gifts);
    const mine = state.gifts.filter((gift) => gift.id === id);
    if (!mine.some(({ count }) => count > 0n)) panel.text('本次不送', silent);
    for (const gift of mine) {
      // 100% is this item's own stock left after other roles' plans, so moving one slider never
      // moves another; the shared allowance only caps the count when a slider is raised.
      const stock = giftAllStock(world, usage, gift.count, gift.itemId);
      const allowed = giftAllLimit(world, usage, gift.count, gift.itemId);
      panel.itemQuantity(gift.itemId, catalog.items[gift.itemId].name, pieces(gift.count));
      if (status.wants.includes(gift.itemId)) panel.rewards([{ text: '心愿', tone: 'danger' }], { fontSize: 13 });
      const shownPercent = stock > 0n ? Math.min(100, Number((gift.count * 100n + stock - 1n) / stock)) : 0;
      panel.slider(percents.get(gift.itemId) ?? shownPercent, (percent) => {
        const wanted = stock * BigInt(percent) / 100n;
        gift.count = wanted < allowed ? wanted : allowed;
        // A count held back by the allowance shows its real share of the stock instead of the drag.
        if (gift.count === wanted) percents.set(gift.itemId, percent);
        else percents.delete(gift.itemId);
        state.changed = false;
        panel.refresh();
      }, { min: 0, bubble: true });
    }
    const protectedItems = giftAllProtectedItems(world);
    const wanted = new Set(status.wants);
    const choices = Object.entries(world.inventory).flatMap(([itemId, inventory]) => {
      const item = catalog.items[itemId];
      if (!item || inventory <= 0n || protectedItems.has(itemId) || mine.some((gift) => gift.itemId === itemId)) return [];
      // Listed by stock so the list keeps its rows (and height) when the shared allowance runs out;
      // rows the allowance can no longer cover are shown disabled.
      const stock = giftAllStock(world, usage, 0n, itemId);
      return stock > 0n ? [{ id: itemId, label: item.name, icon: itemId, wanted: wanted.has(itemId), stock,
        disabled: giftAllLimit(world, usage, 0n, itemId) <= 0n }] : [];
    }).sort((a, b) => Number(b.wanted) - Number(a.wanted) || nameOrder(a.label, b.label));
    if (choices.length) {
      panel.heading('添加礼物', { size: 17 });
      panel.indexRows(choices.map((item) => ({
        ...item, status: '可用 ' + pieces(item.stock) + (item.wanted ? ' · 心愿' : ''),
        statusEmphasis: item.wanted ? ['心愿'] : [],
      })), (item) => {
        state.gifts.push({ id, itemId: item.id, count: 1n });
        state.gifts.sort((a, b) => roleOrder(a) - roleOrder(b));
        state.changed = false;
        panel.refresh();
      });
    }
    panel.footer((footer) => footer.buttons([
      { label: '本次不送', onClick: () => {
        state.gifts = state.gifts.filter((gift) => gift.id !== id);
        state.changed = false;
        panel.close();
      } },
      { label: '完成', tone: 'gold', onClick: () => panel.close() },
    ]));
  }, { flow: 'manager-gift-all-role' });
}
