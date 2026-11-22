import { catalog } from '../game/world.js';
import { marketUnitPrice } from '../game/market.js';
import { compact } from './numbers.js';

const silent = { muted: true, fontSize: 14 };
const money = (value) => compact(value ?? 0n) + ' 金币';
const count = (value) => compact(value ?? 0n);
const inventoryEstimates = new WeakMap();

export function inventoryEstimate(world) {
  const cached = inventoryEstimates.get(world);
  if (cached) return cached.value;
  const value = Object.entries(world.inventory).reduce((total, [id, amount]) =>
    total + (catalog.items[id] ? amount * marketUnitPrice(world, id) : 0n), 0n);
  inventoryEstimates.set(world, { value });
  return value;
}

export function productionSummary(world) {
  return [['田地', world.facilities.C], ['畜牧', world.facilities.L], ['鱼塘', world.facilities.F],
    ['矿洞', world.facilities.M], ['加工', world.stations.I], ['精制', world.stations.P]]
    .map(([name, slots], index) => ({ name, total: slots.length,
      active: slots.filter((slot) => Boolean(slot.batch)).length,
      empty: slots.filter((slot) => !slot.recipe).length,
      blocked: index < 4 ? undefined : slots.filter((slot) => slot.recipe && !slot.batch).length }));
}

export function renderStatistics(ui) {
  const tab = ui.local.statisticsTab ?? '现在';
  ui.tabs(['现在', '累计'], tab, (next) => { ui.local.statisticsTab = next; ui.local.scroll = 0; ui.refresh(); });
  const world = ui.w;
  if (tab === '现在') {
    ui.detailRows([
      { label: '出售前累计产值', value: money(world.productionValue) },
      { label: '仓库销售收入', value: money(world.stats.revenue) },
      { label: '行脚商销售收入', value: money(world.merchant.directSales) },
      { label: '库存估值', value: money(inventoryEstimate(world)) },
    ].map((entry) => ({ ...entry, noWrap: true })));
    for (const line of productionSummary(world)) ui.card((card) => {
      card.row(line.name, count(line.total), { compact: true });
      card.text('生产中 ' + count(line.active) + ' · 待安排 ' + count(line.empty) +
        (line.blocked === undefined ? '' : ' · 缺材料 ' + count(line.blocked)), silent);
    });
  } else {
    ui.detailRows([
      { label: '累计生产总值', value: money(world.lifetimeProductionValue) },
      { label: '生产完成件数', value: count(Object.values(world.stats.produced).reduce((sum, value) => sum + value, 0n)) },
      { label: '仓库累计收入', value: money(world.stats.lifetimeRevenue) },
      { label: '仓库卖出件数', value: count(world.stats.sold) },
      { label: '出售庄园次数', value: count(world.completedRuns) },
      { label: '已研发物品', value: count(world.unlocked.filter((id) => catalog.items[id]).length) + ' / ' + count(Object.keys(catalog.items).length) },
      { label: '品质提升次数', value: count(world.qualityDraws) },
    ].map((entry) => ({ ...entry, noWrap: true })));
  }
}

export function saleDate(time) {
  const date = new Date(time);
  const pad = (value) => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
    pad(date.getHours()) + ':' + pad(date.getMinutes());
}

export function renderFarmSaleHistory(ui) {
  const records = ui.w.farmSaleHistory ?? [];
  if (!records.length) { ui.text('还没有出售记录。', silent); return; }
  ui.scrollList([...records].reverse(), (cell, record) => cell.card((card) => {
    card.heading('第 ' + count(record.run) + ' 次出售', { size: 18 });
    card.text(saleDate(record.soldAt), silent);
    card.row('出售时产值', money(record.productionValue), { compact: true, noWrap: true });
  }));
}
