import { catalog } from '../game/world.js';
import { compact } from './numbers.js';
import { showItemDetail } from './item-chain.js';
import { canDeliverOrder, canReplaceOrder, orderLimit, orderReplacementLimit } from '../game/orders.js';

function statusTag(world, order) {
  if (order.status !== 'locked') return { label: '未接受', tone: 'blue' };
  return canDeliverOrder(world, order.id) ? { label: '可交付', tone: 'green' } : { label: '待备货', tone: 'gold' };
}

function quantities(ui, order) {
  ui.row('所需件数', compact(order.count) + ' 件', { compact: true });
  ui.row('当前库存', compact(ui.w.inventory[order.item] ?? 0n) + ' 件', { compact: true });
  ui.row('固定报酬', compact(order.reward) + ' 金币', { compact: true });
}

function orderProduct(ui, order, small = false) {
  ui.item(order.item, catalog.items[order.item].name, undefined,
    { iconSize: small ? 34 : 50, titleSize: small ? 14 : 18, badges: [statusTag(ui.w, order)] });
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
    panel.text('订单作废，不发报酬，今日订单名额不返还。', { muted: true, fontSize: 14 });
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
    { label: '交付', tone: 'gold', disabled: !canDeliverOrder(ui.w, order.id), blockCardTap: !inDetail,
      onClick: () => submit('deliverOrder') },
    { label: '放弃', onClick: () => confirmAbandon(ui, order, inDetail) },
  ];
  const buttons = [{ label: '接受', tone: 'gold', onClick: () => submit('acceptOrder') }];
  if (canReplaceOrder(ui.w, order.id)) buttons.push({ label: '替换', onClick: () => submit('replaceOrder') });
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

function productionNodes(product, needed) {
  const nodes = new Map();
  function visit(id) {
    if (nodes.has(id)) return;
    const item = catalog.items[id];
    const requires = Object.keys(item.inputs ?? {});
    nodes.set(id, { id, icon: id, label: item.name, requires,
      status: '需 ' + compact(needed.get(id) ?? 0n), tone: id === product ? 'done' : 'neutral' });
    requires.forEach(visit);
  }
  visit(product);
  return [...nodes.values()];
}

function showOrder(ui, order) {
  const needs = orderRequirements(order.item, BigInt(order.count));
  const nodes = productionNodes(order.item, needs);
  ui.dialog('订单详情', (dlg) => {
    const current = isCurrentOrder(dlg.w, order);
    if (!current) {
      dlg.text('订单已结束', { muted: true });
      return;
    }
    orderProduct(dlg, current, true);
    quantities(dlg, current);
    dlg.heading('生产链', { size: 17 });
    const view = dlg.local.productionTree ??= {};
    dlg.tree({
      nodes, production: true, view,
      onSelect: (id) => showItemDetail(dlg, id, { needs, isCurrent: (world) => Boolean(isCurrentOrder(world, order)) }),
    });
    dlg.footer((footer) => footer.buttons(orderActions(dlg, current, true)));
  });
}

export function renderOrders(ui) {
  const { active, generated, replaced } = ui.w.orders;
  ui.row('今日订单', generated + ' / ' + orderLimit(ui.w));
  ui.row('今日替换', replaced + ' / ' + orderReplacementLimit(ui.w));
  const small = Boolean(ui.local.compactOrders);
  const setCompact = (value) => {
    ui.local.compactOrders = value;
    ui.refresh();
  };
  ui.buttons([
    { label: '缩小', disabled: small, onClick: () => setCompact(true) },
    { label: '放大', disabled: !small, onClick: () => setCompact(false) },
  ], { style: 'production' });
  if (!active.length) ui.empty('暂无订单', { icon: 'menu-orders' });
  ui.scrollList(active, (cell, order) => {
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
