import { catalog } from '../game/world.js';
import { compact } from './numbers.js';

// Upstream: the item's full material chain. Downstream: items made directly from it.
function chainNodes(id, needs) {
  const nodes = new Map();
  const node = (key, requires) => {
    const item = catalog.items[key];
    const need = needs?.get(key);
    return { id: key, icon: key, label: item.name, requires,
      status: need != null ? '需 ' + compact(need) : item.sources.join(' · '),
      tone: key === id ? 'done' : 'neutral' };
  };
  (function visit(key) {
    if (nodes.has(key)) return;
    const requires = Object.keys(catalog.items[key].inputs ?? {});
    nodes.set(key, node(key, requires));
    requires.forEach(visit);
  })(id);
  for (const [key, item] of Object.entries(catalog.items)) {
    if (!nodes.has(key) && Object.hasOwn(item.inputs ?? {}, id)) nodes.set(key, node(key, [id]));
  }
  return [...nodes.values()];
}

// Item detail dialog shared by every page; `needs` adds the order's required units
// while `isCurrent(world)` reports the order as still active.
export function showItemDetail(ui, id, { needs, isCurrent } = {}) {
  const item = catalog.items[id];
  ui.dialog(item.name, (panel) => {
    const orderNeeds = needs && (!isCurrent || isCurrent(panel.w)) ? needs : undefined;
    panel.item(id, item.name, item.sources.join(' · '));
    const need = orderNeeds?.get(id);
    if (need != null) panel.row('本单需要', compact(need) + ' 件', { compact: true });
    panel.row('当前库存', compact(panel.w.inventory[id] ?? 0n) + ' 件', { compact: true });
    const nodes = chainNodes(id, orderNeeds);
    if (nodes.length < 2) return;
    panel.heading('生产链', { size: 17 });
    const view = panel.local.itemChain ??= {};
    panel.tree({
      nodes, production: true, view,
      onSelect: (next) => { if (next !== id) showItemDetail(panel, next, { needs: orderNeeds, isCurrent }); },
    });
  });
}
