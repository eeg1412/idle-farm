import { catalog } from '../game/world.js';
import { compact } from './numbers.js';
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

function orderActions(ui, order, inDetail = false) {
  const submit = async (action) => {
    if (!ui.isActive() || !await ui.action(action, order)) return;
    if (inDetail && action !== 'acceptOrder' && ui.isActive()) ui.close();
  };
  if (order.status === 'locked') return [
    { label: '交付', tone: 'gold', disabled: !canDeliverOrder(ui.w, order.id), blockCardTap: !inDetail,
      onClick: () => submit('deliverOrder') },
    { label: '放弃', onClick: () => submit('abandonOrder') },
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

function productionNodes(product, count) {
  const needed = orderRequirements(product, count);
  const nodes = new Map();
  function visit(id) {
    if (nodes.has(id)) return;
    const item = catalog.items[id];
    const requires = Object.keys(item.inputs ?? {});
    nodes.set(id, { id, icon: id, label: item.name, requires, need: needed.get(id) ?? 0n,
      status: '需 ' + compact(needed.get(id) ?? 0n), tone: id === product ? 'done' : 'neutral' });
    requires.forEach(visit);
  }
  visit(product);
  return [...nodes.values()];
}

function showProductionNode(ui, id, nodes) {
  const item = catalog.items[id];
  ui.dialog(item.name, (panel) => {
    panel.item(id, item.name, item.sources.join(' · '));
    const node = nodes.find((entry) => entry.id === id);
    if (node) panel.row('本单需要', compact(node.need) + ' 件', { compact: true });
    panel.row('当前库存', compact(panel.w.inventory[id] ?? 0n) + ' 件', { compact: true });
    const materials = Object.entries(item.inputs ?? {});
    if (materials.length) {
      panel.heading('生产材料', { size: 17 });
      panel.detailRows(materials.map(([input, count]) => ({
        icon: input, label: catalog.items[input].name, value: '每批 ' + compact(count) + ' 件',
        onClick: () => showProductionNode(panel, input, nodes),
      })), { variant: 'stack' });
    }
    const uses = nodes.filter((node) => node.requires.includes(id));
    if (uses.length) {
      panel.heading('用于生产', { size: 17 });
      panel.detailRows(uses.map((node) => ({
        icon: node.icon, label: node.label, onClick: () => showProductionNode(panel, node.id, nodes),
      })), { variant: 'stack' });
    }
  });
}

function showOrder(ui, order) {
  const nodes = productionNodes(order.item, BigInt(order.count));
  ui.dialog('订单详情', (dlg) => {
    const current = dlg.w.orders.active.find(({ id }) => id === order.id);
    if (!current || current.item !== order.item || current.count !== order.count || current.reward !== order.reward) {
      dlg.text('订单已结束', { muted: true });
      return;
    }
    orderProduct(dlg, current, true);
    quantities(dlg, current);
    dlg.heading('生产链', { size: 17 });
    const view = dlg.local.productionTree ??= {};
    dlg.tree({
      nodes, production: true, view,
      onSelect: (id) => showProductionNode(dlg, id, nodes),
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
  if (!active.length) ui.text('暂无订单', { muted: true });
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
