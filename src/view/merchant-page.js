import { merchantProductionGate, merchantSalesGate, merchantStatus, merchantTradeOffer } from '../game/merchant.js';
import { managerStatus } from '../game/managers.js';
import { catalog } from '../game/world.js';
import { compact } from './numbers.js';

const compactRow = { compact: true };
const note = { fontSize: 13, muted: true };
const pieces = (count) => compact(count) + ' 件';
const coins = (value) => compact(value) + ' 金币';
const atPercent = (count, percent) => count * BigInt(percent) / 100n;

export function renderMerchantEntry(ui) {
  ui.button('行脚商', () => ui.go('行脚商'), { indicator: Boolean(managerStatus(ui.w, 'merchant')?.claim) });
}

function restockDialog(ui) {
  ui.dialog('手动换货', (panel) => {
    const { day, run, version, unlocked, restocksRemaining } = merchantStatus(panel.w);
    panel.text('换货会替换当前货架和求购品。');
    panel.row('今日剩余', compact(restocksRemaining) + ' 次', compactRow);
    panel.buttons([
      { label: '取消', onClick: panel.close },
      { label: '确认换货', tone: 'gold', disabled: !unlocked || restocksRemaining === 0n,
        reason: unlocked ? '今天已经换过货了' : '行脚商还没来摆摊',
        onClick: () => panel.action('restockMerchant', { day, run, version }) },
    ]);
  }, { center: true, maxHeight: 290 });
}

function updateSaleHold(ui, editor, offer) {
  if (editor.side !== 'sell') return;
  const count = offer?.canTrade ? offer.count : 0n;
  if (editor.holdCount === count && (editor.holdPending || editor.holdReady || count === 0n)) return;
  editor.holdCount = count;
  editor.holdReady = false;
  editor.holdPending = count > 0n;
  const hold = count > 0n ? { id: editor.id, count, run: offer.run, batchId: offer.batchId } : null;
  const request = ui.reserveMerchantSale(hold);
  editor.holdRequest = request;
  void request.then(({ ok }) => {
    if (!ui.isActive() || ui.local.editor !== editor || editor.holdRequest !== request) return;
    editor.holdPending = false;
    editor.holdReady = ok && count > 0n;
    ui.refresh();
  });
}

function openQuantity(ui, side, id) {
  if (!ui.isActive()) return;
  const offer = merchantTradeOffer(ui.currentWorld(), side, id, 1n);
  if (!offer?.canTrade || ui.local.editor?.id === id) return;
  const editor = { side, id, count: 1n, maximum: offer.maximum, quote: offer, holdCount: 0n };
  ui.local.editor = editor;
  if (side === 'buy') ui.local.focusItem = id;
  updateSaleHold(ui, editor, offer);
  ui.refresh();
}

function setQuantity(ui, editor, count, percent) {
  if (!ui.isActive() || ui.local.editor !== editor) return;
  const offer = merchantTradeOffer(ui.currentWorld(), editor.side, editor.id, count);
  delete editor.preview;
  editor.percent = percent;
  if (editor.count !== count) {
    editor.count = count;
    editor.quote = offer;
  }
  updateSaleHold(ui, editor, offer);
  ui.refresh();
}

function quantityControls(card, ui, editor, available) {
  const { count, percent: selectedPercent } = editor.preview ?? editor;
  const { maximum } = editor;
  const relative = Number(count * 100n / maximum);
  const percent = selectedPercent ?? relative;
  const share = selectedPercent === undefined && count > 0n && relative === 0 ? '<1%' : percent + '%';
  card.row('已选 ' + pieces(count), share, compactRow);
  if (maximum > 1n) {
    const setPercent = (value) => setQuantity(ui, editor, atPercent(maximum, value), value);
    if (editor.side === 'sell') {
      const preview = (value) => {
        if (!ui.isActive() || ui.local.editor !== editor) return;
        editor.preview = { count: atPercent(maximum, value), percent: value };
        ui.refresh();
      };
      card.slider(percent, preview, { bubble: true,
        onCommit: () => {
          if (editor.preview) setPercent(editor.preview.percent);
        },
        onCancel: () => {
          if (!editor.preview || !ui.isActive() || ui.local.editor !== editor) return;
          delete editor.preview;
          ui.refresh();
        },
      });
    } else card.slider(percent, setPercent, { bubble: true });
    card.buttons([
      { label: '1 件', onClick: () => setQuantity(ui, editor, 1n) },
      ...[25, 50, 100].map((value) => ({
        label: value + '%', onClick: () => setPercent(value), disabled: atPercent(maximum, value) === 0n, reason: '这个比例凑不出一件',
      })),
    ], { style: 'filter', compact: true });
  }
  if (available > 1n && available < count) {
    card.button('改选 ' + pieces(available), () => setQuantity(ui, editor, available));
  }
}

function shelf(ui, batch) {
  const { local } = ui;
  const rows = Object.keys(batch.stock).map((id) => merchantTradeOffer(ui.w, 'buy', id, 0n)).filter(Boolean);
  if (!rows.length) {
    ui.empty('货架暂时没有商品。', { icon: 'menu-merchant' });
    return;
  }
  const focusIndex = local.focusItem ? rows.findIndex(({ id }) => id === local.focusItem) : -1;
  delete local.focusItem;
  ui.scrollList(rows, (cell, offer) => {
    const { id, stock, unitPrice, maximum } = offer;
    const editor = local.editor?.id === id ? local.editor : undefined;
    const detail = coins(unitPrice) + '/件 · 剩余 ' + pieces(stock);
    cell.card((card) => {
      card.item(id, catalog.items[id].name, detail);
      if (editor) quantityControls(card, ui, editor, maximum);
      else if (stock === 0n) card.text('已售罄', note);
      else if (maximum === 0n) card.text('金币不足', note);
    }, { padding: 8, style: editor ? undefined : 'subtle',
      onClick: !editor && maximum > 0n ? () => openQuantity(ui, 'buy', id) : undefined });
  }, { focusIndex });
}

function wantedGoods(ui, wanted) {
  const offer = wanted && merchantTradeOffer(ui.w, 'sell', wanted.id, 0n);
  if (!offer) {
    ui.empty('本批没有求购品。', { icon: 'menu-merchant' });
    return;
  }
  const { id, unitPrice, inventory, remaining, maximum } = offer;
  const editor = ui.local.editor;
  ui.card((card) => {
    card.item(id, catalog.items[id].name, '收购 ' + wanted.multiplier / 100 + ' 倍 · ' + coins(unitPrice) + '/件');
    card.stats([
      { label: '在库', value: pieces(inventory) },
      { label: '剩余可收', value: pieces(remaining) },
      { label: '当前可卖', value: pieces(maximum) },
    ]);
    if (editor) quantityControls(card, ui, editor, maximum);
    else if (remaining === 0n) card.text('本批求购已收满。', note);
    else if (inventory === 0n) card.text('仓库暂时没有该品项。', note);
    else card.button('选择数量', () => openQuantity(ui, 'sell', id), { tone: 'green' });
  }, { padding: 8, style: editor ? undefined : 'subtle' });
}

function reserveChanged(before, after) {
  return before && before.reserveAffected !== after.reserveAffected &&
    !(after.reserveAffected < before.reserveAffected && after.inventory > before.inventory &&
      after.reserved === before.reserved);
}

function quoteChanged(before, after) {
  return before && (before.unitPrice !== after.unitPrice || before.trades !== after.trades ||
    reserveChanged(before, after));
}

function unavailable(offer, balance) {
  if (offer.count === 0n) return '请选择至少 1 件。';
  if (offer.side === 'buy') {
    if (offer.count > offer.stock) return '货架余量不足，剩余 ' + pieces(offer.stock) + '。';
    if (offer.total > balance) return '金币不足，还差 ' + coins(offer.total - balance) + '。';
  } else {
    if (offer.count > offer.remaining) return '求购余量不足，剩余可收 ' + pieces(offer.remaining) + '。';
    if (offer.count > offer.inventory) return '仓库库存不足，当前在库 ' + pieces(offer.inventory) + '。';
  }
  return offer.canTrade ? undefined : '当前数量无法成交。';
}

function blockedReason(offer, balance) {
  if (offer.count === 0n) return '先选个数量吧';
  if (offer.side === 'buy') {
    if (offer.count > offer.stock) return '货架上没这么多了';
    if (offer.total > balance) return '金币还不够';
  } else {
    if (offer.count > offer.remaining) return '他收不了这么多';
    if (offer.count > offer.inventory) return '你的存货不够';
  }
  return '这个数量做不成买卖';
}

function tradeFooter(ui, editor) {
  const { preview } = editor;
  const offer = merchantTradeOffer(ui.w, editor.side, editor.id, preview?.count ?? editor.count);
  if (!offer) return;
  const quote = preview ? offer : editor.quote;
  const buy = editor.side === 'buy';
  const label = buy ? '买入' : '卖出';
  const changed = quoteChanged(quote, offer);
  const affectsReserve = !!reserveChanged(quote, offer);
  const maximumReserve = affectsReserve ? offer.reserveAffected : quote?.reserveAffected ?? offer.reserveAffected;
  const blocked = unavailable(offer, ui.w.coins);
  ui.footer((footer) => {
    footer.row(label + ' ' + pieces(offer.count), coins(offer.total), compactRow);
    if (blocked) footer.text(blocked, note);
    else if (buy) footer.text('金币充足 · 余额 ' + coins(ui.w.coins), note);
    else if (preview) footer.text('松手确定数量', note);
    else if (editor.holdPending) footer.text('正在预留选定库存…', note);
    else if (!editor.holdReady) footer.text('无法预留所选库存，请重新选择数量。', note);
    else footer.text('已预留 ' + pieces(offer.count) + '库存', note);
    if (changed) {
      const detail = quote.unitPrice !== offer.unitPrice ? '单价现为 ' + coins(offer.unitPrice) + '/件。' :
        affectsReserve ? '常驻保留量影响已变更。' : '';
      footer.text('报价已更新。' + detail, note);
    }
    if (maximumReserve > 0n) footer.text('本次最多动用 ' + pieces(maximumReserve) + '常驻保留库存。', note);
    footer.buttons([
      { label: '取消', onClick: () => {
        if (editor.holdCount > 0n) void ui.reserveMerchantSale(null);
        delete ui.local.editor;
        ui.refresh();
      } },
      { label: changed ? '按新报价确认' : '确认' + label, tone: 'gold',
        disabled: Boolean(blocked || preview) || (!buy && !editor.holdReady),
        reason: blocked ? blockedReason(offer, ui.w.coins) : preview || buy || editor.holdPending ? undefined : '存货还没留好，稍等一下',
        onClick: async () => {
          if (!ui.isActive() || ui.local.editor !== editor || editor.preview ||
              (!buy && (!editor.holdReady || editor.holdCount !== offer.count))) return;
          // Submit the terms visible to the player. Runtime revalidates the committed world.
          const expected = changed ? offer : quote ?? offer;
          if (!await ui.action(buy ? 'buyMerchant' : 'sellMerchant', expected) ||
              !ui.isActive() || ui.local.editor !== editor) return;
          delete ui.local.editor;
          ui.refresh();
        },
      },
    ]);
  });
}

function waitingForMerchant(ui, { producedCount, salesLevel12 }) {
  const productionReady = producedCount >= merchantProductionGate;
  const salesReady = salesLevel12 > merchantSalesGate;
  const salesTarget = compact(merchantSalesGate);
  const sales = compact(salesLevel12);
  const salesAmount = salesReady && sales === salesTarget ? compact(salesLevel12, 6) : sales;
  const salesProgress = salesReady ? 1 : Number(salesLevel12) / Number(merchantSalesGate);

  ui.card((card) => {
    card.heading('开摊条件', { size: 19, aside: '商人未到', asideNoWrap: true });
    const condition = (description, progress, fraction, complete) => {
      card.text(description);
      card.text(progress + (complete ? ' ✓' : ''), { ...note, color: complete ? 0x297b34 : undefined });
      card.goalProgress(fraction, { complete });
    };
    condition(`庄园、工坊加工共出产 ${merchantProductionGate} 种物品`,
      `已生产 ${producedCount} / ${merchantProductionGate} 种`, producedCount / merchantProductionGate, productionReady);
    condition(`在仓库卖出庄园产物和工坊加工品\n累计得款超过 ${salesTarget} 金币`,
      `已得款 ${salesAmount} 金币`, salesProgress, salesReady);
  }, { padding: 12 });
}

export function renderMerchant(ui) {
  const status = merchantStatus(ui.w);
  if (!status.unlocked) return waitingForMerchant(ui, status);
  const tab = ui.local.tab === '卖出' ? '卖出' : '买入';
  ui.row('金币余额', coins(ui.w.coins), { ...compactRow, icon: 'coin' });
  ui.tabs(['买入', '卖出'], tab, ui.switchMerchantTab, { style: 'framed', sticky: true });
  if (status.restocksRemaining > 0n) {
    ui.button('手动换货 · 剩 ' + compact(status.restocksRemaining) + ' 次', () => restockDialog(ui));
  }
  if (!status.batch) {
    ui.empty('暂未进货。', { icon: 'menu-merchant' });
    return;
  }
  if (tab === '买入') shelf(ui, status.batch);
  else wantedGoods(ui, status.batch.wanted);
  if (ui.local.editor) tradeFooter(ui, ui.local.editor);
}
