import { catalog } from '../game/world.js';
import { compact } from './numbers.js';
import { showItemDetail } from './item-chain.js';
import { hoursLabel } from './management-pages.js';
import { canDeliverOrder, canReplaceOrder, orderLimit, orderPlaceholders, orderReplacementLimit, orderRushCost } from '../game/orders.js';

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

function quantities(ui, order, inDetail = false) {
  ui.row('所需件数', compact(order.count) + ' 件', { compact: true });
  ui.row('当前库存', compact(ui.w.inventory[order.item] ?? 0n) + ' 件', { compact: true });
  // Multiplier over the unit price fixed at generation, drawn like a market rate; older orders have none.
  const rate = typeof order.rewardRate === 'number' ? order.rewardRate - 100 : 0;
  ui.row('固定报酬', compact(order.reward) + ' 金币', { compact: true, valueMarketRate: rate || undefined });
  if (typeof order.standardMs === 'number') ui.row('标准完成时间', remainingTime(order.standardMs), { compact: true });
  if (!inDetail || orderType(order) !== 'challenge') return;
  const bonus = order.bonus ?? 0n;
  const capsules = order.capsules ?? 0n;
  if (bonus > 0n) ui.row('开拓奖金', compact(bonus) + ' 金币', { compact: true });
  if (capsules > 0n) ui.row('时空胶囊', compact(capsules) + ' 个', { compact: true });
}

function orderProduct(ui, order, small = false) {
  ui.item(order.item, catalog.items[order.item].name, undefined,
    { iconSize: small ? 34 : 50, titleSize: small ? 14 : 18, badges: [typeTag(order), statusTag(ui.w, order)] });
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

function orderActions(ui, order, inDetail = false) {
  const submit = async (action) => {
    if (!ui.isActive() || !await ui.action(action, order)) return;
    if (successFloat[action]) ui.float(successFloat[action](order));
    if (inDetail && action !== 'acceptOrder' && ui.isActive()) ui.close();
  };
  if (order.status === 'locked') return [
    { label: '交付', tone: 'gold', disabled: !canDeliverOrder(ui.w, order.id), reason: '存货还不够交这一单', blockCardTap: !inDetail,
      onClick: () => submit('deliverOrder') },
    { label: '放弃', onClick: () => confirmAbandon(ui, order, inDetail) },
  ];
  const buttons = [{ label: '接受', tone: 'gold', onClick: () => submit('acceptOrder') }];
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
    quantities(dlg, current, true);
    dlg.heading('生产链', { size: 17 });
    const view = dlg.local.productionTree ??= {};
    dlg.tree({
      nodes, production: true, view,
      onSelect: (id) => showItemDetail(dlg, id, { needs, isCurrent: (world) => Boolean(isCurrentOrder(world, order)) }),
    });
    dlg.footer((footer) => footer.buttons(orderActions(dlg, current, true)));
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
  } else if (kind === 'firstProduct') cell.empty('第一件商品做好就有订单', { icon, hint: '去精制位做点商品吧' });
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
  ui.scrollList([...active, ...placeholders], (cell, order) => {
    if (order.placeholder) {
      return placeholderCard(cell, order.placeholder,
        order === firstScheduled && rushCost != null ? rushOption(ui, rushCost) : null);
    }
    cell.card((card) => {
      orderProduct(card, order, small);
      if (small) card.text(compact(order.count) + ' 件 · ' + compact(order.reward) + ' 金币');
      else {
        quantities(card, order);
        card.buttons(orderActions(ui, order));
      }
    }, { style: 'production', showArrow: false, onClick: () => showOrder(ui, order) });
  }, { columns: small ? 'auto' : 1 });
}
