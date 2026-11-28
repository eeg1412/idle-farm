import { actualHourlyProduction, catalog, orderCompletion, orderStandardTime } from '../game/world.js';
import { compact } from './numbers.js';
import { showItemDetail } from './item-chain.js';
import { researchPathNodes, showResearch } from './research-page.js';
import { hourlyRateLabel, hoursLabel } from './management-pages.js';
import { planOrderLines } from '../game/order-plan.js';
import { canDeliverOffered, canDeliverOrder, canReplaceOrder, orderLimit, orderPlaceholders, orderReplacementLimit, orderResearchReward, orderRushCost } from '../game/orders.js';

// Orders saved before order types existed are high-value orders.
const orderType = (order) => order.type ?? 'high';
const typeTags = {
  high: { label: '高额订单', tone: 'purple' },
  normal: { label: '普通订单', tone: 'teal' },
  challenge: { label: '挑战订单', tone: 'orange' },
};
const abandonNotes = {
  high: '订单作废，不发报酬，今日高额订单名额不返还。',
  normal: '订单作废，不发报酬。',
  challenge: '订单作废，不发报酬，2 小时内不再有挑战订单。',
};

function typeTag(order) {
  return typeTags[orderType(order)];
}

function statusTag(world, order) {
  if (order.status !== 'locked') return { label: '未接受', tone: 'blue' };
  return canDeliverOrder(world, order.id) ? { label: '可交付', tone: 'green' } : { label: '待备货', tone: 'gold' };
}

// One actualHourlyProduction pass per render, keyed by item id.
function hourlyRates(world) {
  return new Map(actualHourlyProduction(world).map((row) => [row.id, row]));
}

function hourlyChange(ui, order, rates) {
  const rate = rates.get(order.item);
  let value;
  let tone;
  // A reason instead of a rate means nothing is being produced: shown in red.
  if (!ui.w.unlocked.includes(order.item)) value = '未研发';
  else if (!rate?.arranged) value = '未安排生产';
  else if (rate.produced === 0n) value = '缺料';
  if (value) tone = 'danger';
  else {
    const label = hourlyRateLabel(rate.net, true);
    value = label + ' 件';
    tone = label === '0' ? undefined : rate.net < 0n ? 'danger' : 'green';
  }
  ui.row('当前产能', value, { compact: true, tone });
}

// Accepted orders only: when running lines reach the count. noWrap is the row layout that ticks valueAtClock.
function expectedCompletion(ui, order) {
  const eta = orderCompletion(ui.w, order);
  if (eta.status === 'ready') ui.row('预计完成时间', '订单完成', { compact: true, noWrap: true, tone: 'green' });
  else if (eta.status === 'scheduled') {
    ui.row('预计完成时间', remainingTime(eta.atMs - ui.w.clockMs),
      { compact: true, noWrap: true, valueAtClock: (clock) => remainingTime(eta.atMs - clock) });
  } else if (hasOrderLine(ui.w, order.item)) ui.row('预计完成时间', '计算中', { compact: true, noWrap: true, tone: 'muted' });
  else ui.row('预计完成时间', '无法计算', { compact: true, noWrap: true, tone: 'danger' });
}

// Researched and set as the recipe of some facility or station, running or not.
function hasOrderLine(world, item) {
  if (!world.unlocked.includes(item)) return false;
  const lists = [...['C', 'L', 'F', 'M'].map((kind) => world.facilities[kind]),
    ...['I', 'P'].map((kind) => world.stations[kind])];
  return lists.some((list) => list?.some((slot) => slot?.recipe === item));
}

// Unaccepted orders: time for the current production to make the count.
function standardTime(ui, order) {
  const ms = orderStandardTime(ui.w, order);
  const help = ui.orderHelp?.('standardTime');
  if (ms !== null) ui.row('标准完成时间', remainingTime(ms), { compact: true, help });
  else ui.row('标准完成时间', '未安排生产', { compact: true, tone: 'danger', help });
}

function quantities(ui, order, rates) {
  const accepted = order.status === 'locked';
  ui.row('所需件数', compact(order.count) + ' 件', { compact: true });
  ui.row('当前库存', compact(ui.w.inventory[order.item] ?? 0n) + ' 件', { compact: true });
  hourlyChange(ui, order, rates);
  if (accepted) expectedCompletion(ui, order);
  else standardTime(ui, order);
  ui.rewards(rewardEntries(ui.w, order), { label: '报酬' });
}

// Coins (all of the reward), boosted basic research points, then capsules when there are any.
function rewardEntries(world, order) {
  // Multiplier over the unit price fixed at generation, drawn like a market rate; older orders have none.
  const rate = typeof order.rewardRate === 'number' ? order.rewardRate - 100 : 0;
  const entries = [{ icon: 'coin', value: order.reward, marketRate: rate || undefined },
    { icon: 'research-point-basic', value: orderResearchReward(world, order) }];
  const capsules = order.capsules ?? 0n;
  if (capsules > 0n) entries.push({ icon: 'time-capsule', value: capsules });
  return entries;
}

// badgeSize shrinks the type and status tags (compact list cards only); the default keeps the item's size.
function orderProduct(ui, order, small = false, badgeSize = undefined) {
  ui.item(order.item, catalog.items[order.item].name, undefined,
    { iconSize: small ? 34 : 50, titleSize: small ? 14 : 18, badges: [typeTag(order), statusTag(ui.w, order)], badgeSize });
}

// Delivery's float comes from the action result in main.js.
const successFloat = { replaceOrder: () => '已替换' };

// The order is still active with the same product, count and reward.
function isCurrentOrder(world, order) {
  const current = world.orders.active.find(({ id }) => id === order.id);
  return current && current.item === order.item && current.count === order.count && current.reward === order.reward
    ? current : undefined;
}

function confirmAbandon(ui, order, inDetail) {
  ui.dialog('放弃订单', (panel) => {
    panel.text('确定放弃「' + catalog.items[order.item].name + '」×' + compact(order.count) + ' 的订单吗？');
    panel.text(abandonNotes[orderType(order)], { muted: true, fontSize: 14 });
    panel.buttons([
      { label: '再想想', onClick: panel.close },
      { label: '确认放弃', tone: 'danger', onClick: async () => {
        if (!panel.isActive() || !await panel.action('abandonOrder', order) || !panel.isActive()) return;
        await panel.close();
        if (inDetail && ui.isActive()) ui.close();
      } },
    ]);
  }, { center: true, maxHeight: 240 });
}

const placeNames = { C: '田地', L: '养殖场', F: '鱼塘', M: '矿洞', I: '料坊位', P: '工房位' };

// One plan per displayed world and order: worlds are replaced on each display refresh, not mutated per frame.
// Buttons only need availability (no completion, no world copy); the preview takes its own snapshot.
const planCache = new WeakMap();
function orderPlan(world, orderId) {
  let plans = planCache.get(world);
  if (!plans) planCache.set(world, plans = new Map());
  if (!plans.has(orderId)) plans.set(orderId, planOrderLines(world, orderId, { completion: false }));
  return plans.get(orderId);
}

function blockedReason(plan) {
  if (plan.reason === 'stockReady') return '库存已够交付';
  const place = placeNames[plan.kind];
  if (plan.reason === 'missingFacility' && place) return '缺少' + place;
  if (plan.reason === 'noSlot' && place) return '没有可用的' + place;
  if (plan.reason === 'locked' && catalog.items[plan.item]) return '缺少「' + catalog.items[plan.item].name + '」的配方';
  if (plan.reason === 'covered') return '产线已排好';
  if (plan.reason === 'notAccepted') return '订单已结束';
  return '暂时无法排产';
}

// Tab by the line producing the new recipe; raw materials are grouped by industry inside their tab.
const planTabs = [
  { label: '原料', kinds: ['C', 'L', 'F', 'M'] },
  { label: '中间产物', kinds: ['I'] },
  { label: '商品', kinds: ['P'] },
];
const industryNames = { C: '农业', L: '畜牧', F: '水产', M: '矿业' };

// The whole plan and its completion text are fixed when taken; later world updates do not redraw them.
// rootLines undefined asks for the recommended count of new lines for the order's product.
function planSnapshot(world, orderId, rootLines) {
  const plan = planOrderLines(world, orderId, rootLines === undefined ? undefined : { rootLines });
  if (plan.status !== 'ok') return { plan };
  const eta = plan.completion;
  const completion = eta?.status === 'ready' ? { value: '订单完成', tone: 'green' }
    : eta?.status === 'scheduled' ? { value: remainingTime(eta.atMs - world.clockMs) }
      : { value: '无法计算', tone: 'danger' };
  return { plan, completion };
}

// Place at the top left, then the centered swap block; every card reserves a full swap's height.
function planChangeCard(cell, change) {
  cell.card((card) => {
    card.text(placeNames[change.kind] + (change.index + 1), { fontSize: 12, muted: true });
    card.recipeChange(change.from, change.to);
    // gap is the space below the card: 8 matches scrollList's 8px column gap.
  }, { padding: 6, gap: 8, showArrow: false });
}

// 'auto' gives equal-height cards, two per row on regular widths.
function planChangeGrid(panel, changes) {
  panel.scrollList(changes, planChangeCard, { columns: 'auto' });
}

// Preview fixed at opening; only a new slider value or a failed confirm retakes the snapshot (on the next draw,
// from the world it receives). Confirming sends that snapshot's changes and line count for applyOrderLines to match.
function showPlan(ui, order) {
  ui.dialog('排产', (panel) => {
    const local = panel.local;
    const current = isCurrentOrder(panel.w, order);
    if (!current) {
      panel.text('订单已结束', { muted: true });
      panel.footer((footer) => footer.buttons([{ label: '取消', onClick: panel.close }]));
      return;
    }
    const { plan, completion } = local.planSnapshot ??= planSnapshot(panel.w, current.id, local.planRootLines);
    if (plan.status === 'ok') {
      local.planRootLines = plan.rootLines;
      local.planRange = plan.rootRange;
    }
    // The range from the last workable plan keeps the slider usable even if one count turns out blocked.
    const range = local.planRange;
    if (plan.status === 'ok') {
      panel.row('预计完成时间', completion.value, { compact: true, noWrap: true, tone: completion.tone });
    }
    if (range && range.max > range.min) {
      const lines = local.planRootLines ?? range.recommended;
      panel.row('产线', String(lines), { compact: true, noWrap: true });
      panel.slider(lines, (next) => {
        if (next === local.planRootLines) return;
        local.planRootLines = next;
        local.planSnapshot = undefined;
        panel.refresh();
      }, { min: range.min, max: range.max });
    }
    if (plan.status !== 'ok') {
      panel.text(blockedReason(plan), { muted: true });
      panel.footer((footer) => footer.buttons([{ label: '取消', onClick: panel.close }]));
      return;
    }
    const tabs = planTabs.map((tab) => ({ ...tab,
      changes: plan.changes.filter((change) => tab.kinds.includes(change.kind)) }))
      .filter((tab) => tab.changes.length);
    const selected = tabs.find((tab) => tab.label === panel.local.planTab) ?? tabs[0];
    if (tabs.length > 1) {
      panel.tabs(tabs.map((tab) => tab.label), selected?.label, (value) => {
        panel.local.planTab = value;
        panel.refresh();
      }, { style: 'filter', compact: true });
    }
    if (selected?.label === '原料') {
      for (const kind of selected.kinds) {
        const group = selected.changes.filter((change) => change.kind === kind);
        if (!group.length) continue;
        panel.heading(industryNames[kind], { size: 16 });
        planChangeGrid(panel, group);
      }
    } else if (selected) planChangeGrid(panel, selected.changes);
    panel.footer((footer) => footer.buttons([
      { label: '取消', onClick: panel.close },
      { label: '确认排产', tone: 'gold', disabled: !plan.changes.length, reason: '无需改动', onClick: async () => {
        if (!panel.isActive()) return;
        if (!await panel.action('applyOrderLines', current.id, plan.changes, plan.rootLines)) {
          if (!panel.isActive()) return;
          panel.float('情况有变，请重新排产', { tone: 'danger' });
          // Retaken on the next draw with the current world and the current line count.
          local.planSnapshot = undefined;
          panel.refresh();
          return;
        }
        if (panel.isActive()) await panel.close();
      } },
    ]));
  });
}

function planButton(ui, order, inDetail) {
  const plan = orderPlan(ui.w, order.id);
  const blocked = plan.status !== 'ok';
  return { label: '排产', tone: 'gold', disabled: blocked, reason: blocked ? blockedReason(plan) : undefined,
    blockCardTap: !inDetail, onClick: () => showPlan(ui, order) };
}

function orderActions(ui, order, inDetail = false) {
  const submit = async (action) => {
    if (!ui.isActive() || !await ui.action(action, order)) return;
    if (successFloat[action]) ui.float(successFloat[action](order));
    if (inDetail && action !== 'acceptOrder' && ui.isActive()) ui.close();
  };
  if (order.status === 'locked') return [
    { label: '交付', tone: 'green', disabled: !canDeliverOrder(ui.w, order.id), reason: '存货还不够交这一单', blockCardTap: !inDetail,
      onClick: () => submit('deliverOrder') },
    planButton(ui, order, inDetail),
    { label: '放弃', onClick: () => confirmAbandon(ui, order, inDetail) },
  ];
  // Enough free stock turns 接受 into a one-step accept-and-deliver in the same slot.
  const buttons = [canDeliverOffered(ui.w, order.id)
    ? { label: '立即交付', tone: 'green', onClick: () => submit('deliverOfferedOrder') }
    : { label: '接受', tone: 'gold', onClick: () => submit('acceptOrder') }];
  // Replace stays visible; when unavailable it is grey and a tap shows the reason in red.
  const usedUp = ui.w.orders.replaced >= orderReplacementLimit(ui.w);
  buttons.push({ label: '替换', disabled: !canReplaceOrder(ui.w, order.id),
    reason: usedUp ? '今天的替换次数用完了'
      : orderType(order) === 'challenge' ? '没有别的新商品可挑战' : '多做几种商品才能替换',
    blockCardTap: !inDetail,
    onClick: () => submit('replaceOrder') });
  return buttons;
}

// Units each chain item needs for the order: whole base batches per recipe, shared materials summed.
function orderRequirements(product, count) {
  const order = [];
  const seen = new Set();
  (function visit(id) {
    if (seen.has(id)) return;
    seen.add(id);
    for (const input of Object.keys(catalog.items[id].inputs ?? {})) visit(input);
    order.push(id);
  })(product);
  const needed = new Map([[product, count]]);
  for (const id of order.reverse()) {
    const item = catalog.items[id];
    const need = needed.get(id) ?? 0n;
    if (!item.inputs || need <= 0n) continue;
    const output = BigInt(item.output ?? 1);
    const batches = (need + output - 1n) / output;
    for (const [input, amount] of Object.entries(item.inputs)) {
      needed.set(input, (needed.get(input) ?? 0n) + batches * BigInt(amount));
    }
  }
  return needed;
}

// Researched recipes are green; unresearched ones are grey and say so.
function productionNodes(product, needed, unlocked) {
  const nodes = new Map();
  function visit(id) {
    if (nodes.has(id)) return;
    const item = catalog.items[id];
    const requires = Object.keys(item.inputs ?? {});
    const researched = unlocked.has(id);
    const need = '需 ' + compact(needed.get(id) ?? 0n);
    nodes.set(id, { id, icon: id, label: item.name, requires,
      status: researched ? need : '未研发 · ' + need, tone: researched ? 'done' : 'locked' });
    requires.forEach(visit);
  }
  visit(product);
  return [...nodes.values()];
}

function showOrder(ui, order) {
  const needs = orderRequirements(order.item, BigInt(order.count));
  const nodes = productionNodes(order.item, needs, new Set(ui.w.unlocked));
  ui.dialog('订单详情', (dlg) => {
    const current = isCurrentOrder(dlg.w, order);
    if (!current) {
      dlg.text('订单已结束', { muted: true });
      return;
    }
    orderProduct(dlg, current, true);
    quantities(dlg, current, hourlyRates(dlg.w));
    // An unresearched challenge target can also show its research prerequisites.
    const locked = orderType(current) === 'challenge' && !dlg.w.unlocked.includes(current.item);
    const tab = locked && dlg.local.chainTab === '科技树' ? '科技树' : '生产链';
    if (locked) {
      dlg.tabs(['生产链', '科技树'], tab, (value) => {
        dlg.local.chainTab = value;
        dlg.refresh();
      }, { style: 'filter', compact: true });
    } else dlg.heading('生产链', { size: 17 });
    if (tab === '科技树') {
      const view = dlg.local.researchTree ??= { focus: current.item };
      dlg.tree({ nodes: researchPathNodes(dlg.w, current.item), production: true, view,
        onSelect: (id) => showResearch(dlg, id) });
    } else {
      const view = dlg.local.productionTree ??= {};
      dlg.tree({
        nodes, production: true, view,
        onSelect: (id) => showItemDetail(dlg, id, { needs, isCurrent: (world) => Boolean(isCurrentOrder(world, order)) }),
      });
    }
    dlg.footer((footer) => footer.buttons(orderActions(dlg, current, true),
      { uniformLabel: current.status === 'locked' }));
  });
}

function remainingTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds >= 3600) return hoursLabel(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? minutes + ' 分' + (remainder ? ' ' + remainder + ' 秒' : '') : seconds + ' 秒';
}

// Operating-clock time of the next local midnight; wallAnchorMs is the wall time at clockMs.
function nextMidnightClock(world) {
  const midnight = new Date(world.wallAnchorMs);
  return world.clockMs + Math.max(0, midnight.setHours(24, 0, 0, 0) - world.wallAnchorMs);
}

const countdownTo = (dueMs) => (clock) => '还要 ' + remainingTime(dueMs - clock);

// One placeholder card per remaining order slot today; the reason, countdown and progress stay inside it.
// rush: { cost, onClick, disabled } puts the capsule rush button inside the scheduled card.
function placeholderCard(cell, placeholder, rush = null) {
  const icon = 'menu-orders';
  const { kind, dueMs, batch } = placeholder;
  if (kind === 'firstProduct' && batch) {
    const span = Math.max(1, batch.end - batch.start);
    cell.empty('第一件商品做好就有订单', {
      icon,
      valueAtClock: (clock) => catalog.items[batch.id].name + ' 还要 ' + remainingTime(batch.end - clock),
      progressAtClock: (clock) => Math.min(1, Math.max(0, (clock - batch.start) / span)),
    });
  } else if (kind === 'firstProduct') cell.empty('第一件商品做好就有订单', { icon, hint: '去工房位做点商品吧' });
  else if (kind === 'afterFirst') cell.empty('还没开始接单', { icon, hint: '第一件商品做好后，再等约 ' + placeholder.afterMinutes + ' 分钟' });
  else if (kind === 'noCandidate') cell.empty('可下单的商品不够了', { icon, hint: '多做几种商品，就能接到更多订单' });
  else if (kind === 'slotsFull') cell.empty('订单接满了', { icon, hint: '交付或放弃一张后，新订单才会来' });
  else if (kind === 'tomorrow') cell.empty('今天赶不上了', { icon, hint: '明天还会有新订单' });
  else cell.empty('下一张订单在路上', { icon, valueAtClock: countdownTo(dueMs),
    action: rush && { label: '加速 (', midIcon: 'time-capsule', midIconSize: 26, midText: compact(rush.cost) + ')', tone: 'plain',
      disabled: rush.disabled,
      reason: '时空胶囊不够', onClick: rush.onClick } });
}

function confirmRush(ui, cost) {
  ui.dialog('加速订单', (panel) => {
    panel.text('消耗 ' + compact(cost) + ' 个时空胶囊，立即生成订单？');
    panel.buttons([
      { label: '再想想', onClick: panel.close },
      { label: '确认', tone: 'gold', onClick: async () => {
        if (!panel.isActive() || !await panel.action('rushOrder', { dayEndMs: nextMidnightClock(panel.w) }) || !panel.isActive()) return;
        await panel.close();
      } },
    ]);
  }, { center: true, maxHeight: 240 });
}

// Capsule rush for the earliest scheduled checkpoint; cost is null when it cannot be rushed.
const rushOption = (ui, cost) => ({ cost, disabled: (ui.w.capsules ?? 0n) < cost, onClick: () => confirmRush(ui, cost) });

export function renderOrders(ui) {
  const { active, generated, replaced } = ui.w.orders;
  ui.row('时空胶囊', compact(ui.w.capsules ?? 0n), { icon: 'time-capsule' });
  ui.row('今日高额订单', generated + ' / ' + orderLimit(ui.w));
  ui.row('今日替换', replaced + ' / ' + orderReplacementLimit(ui.w));
  const small = Boolean(ui.local.compactOrders);
  const setCompact = (value) => {
    ui.local.compactOrders = value;
    ui.refresh();
  };
  ui.buttons([
    { label: '缩小', disabled: small, reason: '已经是缩小视图了', onClick: () => setCompact(true) },
    { label: '放大', disabled: !small, reason: '已经是放大视图了', onClick: () => setCompact(false) },
  ], { style: 'production' });
  const forecast = orderPlaceholders(ui.w, nextMidnightClock(ui.w));
  // Show the "not enough products" card only once, however many slots it covers.
  const placeholders = forecast.filter(({ kind }, index) => kind !== 'dailyLimit' &&
    (kind !== 'noCandidate' || forecast.findIndex((entry) => entry.kind === 'noCandidate') === index))
    .map((placeholder) => ({ placeholder }));
  const firstScheduled = placeholders.find(({ placeholder }) => placeholder.kind === 'scheduled');
  const rushCost = firstScheduled ? orderRushCost(ui.w, nextMidnightClock(ui.w)) : null;
  const rates = small ? null : hourlyRates(ui.w);
  ui.scrollList([...active, ...placeholders], (cell, order) => {
    if (order.placeholder) {
      return placeholderCard(cell, order.placeholder,
        order === firstScheduled && rushCost != null ? rushOption(ui, rushCost) : null);
    }
    cell.card((card) => {
      orderProduct(card, order, small, small ? 11 : undefined);
      if (small) {
        card.text('需 ' + compact(order.count) + ' 件', { fontSize: 13 });
        card.rewards([{ text: '报酬:', tight: true }, ...rewardEntries(ui.w, order)], { fontSize: 13 });
      } else {
        quantities(card, order, rates);
        card.buttons(orderActions(ui, order), { uniformLabel: order.status === 'locked' });
      }
    }, { style: 'production', showArrow: false, onClick: () => showOrder(ui, order) });
  }, { columns: small ? 'auto' : 1 });
}
