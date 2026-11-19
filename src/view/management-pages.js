import { catalog, facilityOffer, farmSaleOffer, forecastHourlyProduction, quantity, startingCoins, tradeOffer } from '../game/world.js';
import { marketForecast, marketIsActive, marketRate, marketResetsRemaining, marketUnitPrice } from '../game/market.js';
import { objectives, taskCoinRewards, taskProductionGates } from '../game/objectives.js';
import { compact } from './numbers.js';
import { managerIds, managerStatus } from '../game/managers.js';
import { renderMerchantEntry } from './merchant-page.js';

const entries = Object.entries(catalog.items);
const typeTabs = ['全部', '原料', '中间产物', '商品'];
const sourceTabs = ['全部', '农业', '畜牧', '水产', '矿业'];
const complexityTabs = ['全部', '单类', '双类', '三类', '四类'];
const facilityTabs = { C: '田地', L: '畜牧', F: '鱼池', M: '矿洞' };

const managementEntries = [
  { page: '管理员管理', icon: 'manager-directory', description: '查看管理员、送礼与切换形象' },
  { page: '统计', icon: 'statistics', description: '查看产出、收入与经营进度' },
  { page: '出售庄园历史', icon: 'sale-history', description: '查看历次出售时间与产值' },
  { page: '图鉴', icon: 'nav-catalog', description: '查阅物品、配方与来源' },
  { page: '出售庄园', icon: 'sale-reset', description: '预览出售收益与新一轮配置' },
];

export function renderManagement(ui) {
  for (const { page, icon, description } of managementEntries) {
    ui.card((card) => card.item(icon, page, description), {
      padding: 16, gap: 12, style: 'navigation', onClick: () => ui.go(page),
      indicator: page === '管理员管理' && managerIds.some((id) => managerStatus(ui.w, id).claim),
    });
  }
}

function typeOf(item) {
  if (item.kind.startsWith('P')) return '商品';
  if (item.kind.startsWith('I')) return '中间产物';
  return '原料';
}

function typeLabel(item) {
  return { C: '作物', L: '畜牧原料', F: '水产原料', M: '矿产原料' }[item.kind] ?? typeOf(item);
}

export function productComplexity(item) {
  return complexityTabs[item.sources.length] ?? '全部';
}

// Durations of 60 minutes or more: whole minutes rounded up, no seconds.
export function hoursLabel(seconds) {
  const minutes = Math.ceil(seconds / 60);
  const remainder = minutes % 60;
  return Math.floor(minutes / 60) + ' 小时' + (remainder ? ' ' + remainder + ' 分' : '');
}

function timeLabel(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  if (seconds >= 3600) return hoursLabel(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? minutes + ' 分' + (remainder ? ' ' + remainder + ' 秒' : '') : seconds + ' 秒';
}

function showFilters(ui) {
  const local = ui.local;
  local.type ??= '全部';
  local.source ??= '全部';
  local.complexity ??= '全部';
  const select = (key, value) => {
    local[key] = value;
    local.scroll = 0;
    ui.refresh();
  };
  ui.tabs(typeTabs, local.type, (value) => select('type', value), { sticky: true, style: 'framed' });
  ui.tabs(sourceTabs, local.source, (value) => select('source', value), { style: 'framed', compact: true });
  if (local.type === '商品') {
    ui.tabs(complexityTabs, local.complexity, (value) => select('complexity', value), { style: 'framed', compact: true });
  }
}

function matchesFilters(local, item) {
  return (local.type === '全部' || local.type === typeOf(item)) &&
    (local.source === '全部' || item.sources.includes(local.source)) &&
    (local.type !== '商品' || local.complexity === '全部' || local.complexity === productComplexity(item));
}

function warehouseEntries(world, { type = '全部', source = '全部' } = {}) {
  return entries.filter(([id, item]) => Object.hasOwn(world.inventory, id) &&
    (type === '全部' || type === typeOf(item)) &&
    (source === '全部' || item.sources.includes(source)));
}

function showSource(ui, id) {
  const item = catalog.items[id];
  if (!item) return;
  if (facilityTabs[item.kind]) ui.go('庄园', { tab: facilityTabs[item.kind], id });
  else ui.go('工坊', { tab: typeOf(item) === '商品' ? '精制' : '加工', id });
}

function showResearch(ui, id) {
  ui.go('研究', { tab: '品种配方', id });
}

function salePanel(ui, id) {
  const state = { percent: 0, pending: false, revised: false };
  ui.dialog('出售' + catalog.items[id].name, (panel) => {
    const chosen = tradeOffer(panel.w, id, state.percent);
    if (!chosen) return;
    panel.card((entry) => {
      entry.feature(chosen.id, (body) => {
        body.heading(catalog.items[id].name, { size: 18, marketRate: marketRate(panel.w, id) });
        body.row('当前库存', chosen.inventory, { compact: true, divider: true });
        body.row('单价', compact(chosen.price) + ' 金币', { compact: true });
      }, { ratio: 0.25 });
    }, { padding: 8, gap: 4 });
    panel.slider(state.percent, (percent) => {
      if (state.pending) return;
      state.percent = percent;
      state.revised = false;
      panel.refresh();
    }, { bubble: true });
    panel.row('出售数量', chosen.count, { compact: true, divider: true });
    panel.row('预计得款', chosen.gain, { compact: true, divider: true });
    if (chosen.reserveAffected > 0n) {
      panel.text('本次将动用保留库存 ' + compact(chosen.reserveAffected) + ' 件。');
      panel.row('出售后库存', compact(chosen.remaining));
    }
    if (state.revised) panel.text('库存或售价已变化，请重新确认。');
    panel.buttons([
      { label: '取消', onClick: () => panel.close(), disabled: state.pending },
      {
        label: '确认出售', tone: 'gold', disabled: !chosen.affordable || state.pending,
        onClick: async () => {
          if (state.pending) return;
          state.pending = true;
          panel.refresh();
          const sold = await panel.action('sell', chosen.id, chosen.percent, chosen);
          state.pending = false;
          if (sold) {
            panel.close();
          } else {
            state.revised = true;
            panel.refresh();
          }
        },
      },
    ]);
  }, { variant: 'warehouse-sale' });
}

function batchSalePanel(ui, filters) {
  const selected = new Set();
  ui.dialog('批量管理', (panel) => {
    const quotes = warehouseEntries(panel.w, filters)
      .filter(([id]) => quantity(panel.w, id) > 0n)
      .map(([id]) => tradeOffer(panel.w, id, 100));
    const available = new Set(quotes.map(({ id }) => id));
    for (const id of selected) {
      if (!available.has(id)) selected.delete(id);
    }
    panel.row('已选品项', selected.size + ' / ' + quotes.length, { compact: true, noWrap: true });
    panel.buttons([
      { label: '全选', disabled: selected.size === quotes.length, onClick: () => {
        for (const id of available) selected.add(id);
        panel.refresh();
      } },
      { label: '取消选择', disabled: selected.size === 0, onClick: () => {
        selected.clear();
        panel.refresh();
      } },
    ]);
    if (quotes.length) {
      panel.selectionGrid(quotes.map(({ id, inventory, price, gain }) => ({
        id, icon: id, label: catalog.items[id].name,
        detail: '库存 ' + compact(inventory) + ' 件\n单价 ' + compact(price) + '\n总价 ' + compact(gain),
        marketRate: marketRate(panel.w, id), selected: selected.has(id),
      })), ({ id }) => {
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        panel.refresh();
      });
    } else panel.text('当前筛选无可出售库存。', { muted: true });
    panel.button('批量出售', () => confirmBatchSale(panel, [...selected]), {
      tone: 'gold', disabled: selected.size === 0,
    });
  });
}

function confirmBatchSale(ui, ids) {
  const state = { percent: 0, pending: false, revised: false };
  ui.dialog('批量出售', (panel) => {
    const quotes = ids.map((id) => tradeOffer(panel.w, id, state.percent));
    const total = { count: 0n, gain: 0n, reserveAffected: 0n };
    for (const quote of quotes) {
      total.count += quote.count;
      total.gain += quote.gain;
      total.reserveAffected += quote.reserveAffected;
    }
    const setPercent = (percent) => {
      if (state.pending) return;
      state.percent = percent;
      state.revised = false;
      panel.refresh();
    };
    panel.row('已选品项', ids.length, { compact: true, noWrap: true });
    if (state.revised) panel.text('库存或报价可能已变化，请核对后重新确认。');
    panel.slider(state.percent, setPercent, { bubble: true });
    panel.buttons([25, 50, 75, 100].map((percent) => ({
      label: percent + '%', tone: state.percent === percent ? 'green' : 'plain', disabled: state.pending,
      onClick: () => setPercent(percent),
    })), { style: 'filter' });
    panel.row('出售数量', total.count, { compact: true, divider: true, noWrap: true });
    panel.row('预计得款', compact(total.gain) + ' 金币', { compact: true, divider: true, noWrap: true });
    if (total.reserveAffected > 0n) {
      panel.text('本次将动用保留库存 ' + compact(total.reserveAffected) + ' 件。');
    }
    panel.buttons([
      { label: '取消', onClick: () => panel.close(), disabled: state.pending },
      {
        label: '确认出售', tone: 'gold', disabled: total.count === 0n || state.pending,
        onClick: async () => {
          if (state.pending) return;
          state.pending = true;
          const selections = quotes.map((expectedQuote) => ({
            id: expectedQuote.id, percent: expectedQuote.percent, expectedQuote,
          }));
          const sold = await panel.action('sellBatch', selections);
          state.pending = false;
          if (!panel.isActive()) return;
          if (sold) panel.close();
          else {
            state.revised = true;
            panel.local.scroll = 0;
            panel.refresh();
          }
        },
      },
    ]);
  });
}

export function reservePanel(ui, id) {
  const state = { digits: (ui.w.reserves[id] ?? 0n).toString(), pending: false };
  const set = (value) => {
    if (state.pending) return;
    state.digits = value.replace(/^0+(?=\d)/, '');
    ui.refresh();
  };
  const normalize = (value) => value.replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10));
  ui.dialog('加工保留量', (panel) => {
    panel.item(id, catalog.items[id].name, undefined, { marketRate: marketRate(panel.w, id) });
    panel.text('工位开批后，库存仍须达到此数量。');
    panel.row('当前库存', quantity(panel.w, id));
    panel.text('保留数量');
    if (state.digits) panel.fullNumber(BigInt(state.digits));
    else panel.text('请输入保留量');
    for (const row of [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']]) {
      panel.buttons(row.map((digit) => ({ label: digit, onClick: () => set(state.digits + digit), disabled: state.pending })));
    }
    panel.buttons([
      { label: '清空', onClick: () => set(''), disabled: state.pending },
      { label: '0', onClick: () => set(state.digits + '0'), disabled: state.pending },
      { label: '删除', onClick: () => set(state.digits.slice(0, -1)), disabled: state.pending },
    ]);
    panel.buttons([
      { label: '取消', onClick: () => panel.close(), disabled: state.pending },
      {
        label: '保存', tone: 'gold', disabled: state.pending || !state.digits, onClick: async () => {
          if (state.pending || !state.digits) return;
          state.pending = true;
          panel.refresh();
          if (await panel.action('reserve', id, BigInt(state.digits))) {
            panel.close();
          } else {
            state.pending = false;
            panel.refresh();
          }
        },
      },
    ]);
  }, {
    onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
      const key = normalize(event.key);
      if (/^[0-9]$/.test(key)) set(state.digits + key);
      else if (key === 'Backspace') set(state.digits.slice(0, -1));
      else if (key === 'Delete') set('');
      else return false;
      return true;
    },
    onPaste(event) {
      const digits = normalize(event.clipboardData?.getData('text/plain') ?? '');
      if (/^[0-9]+$/.test(digits)) set(digits);
      return true;
    },
  });
}

function warehouseDetail(ui, id) {
  const item = catalog.items[id];
  if (!item) return;
  ui.dialog(item.name, (panel) => {
    const amount = quantity(panel.w, id);
    panel.item(id, item.name, item.sources.join(' · ') + ' · ' + typeLabel(item), { marketRate: marketRate(panel.w, id) });
    for (const [label, value] of [
      ['库存', amount],
      ['品质（级）', BigInt(panel.w.quality[id] ?? 1)],
      ['单价', marketUnitPrice(panel.w, id)],
      ['加工保留量', panel.w.reserves[id] ?? 0n],
    ]) {
      panel.text(label);
      panel.fullNumber(value);
    }
    panel.buttons([
      { label: '加工保留量', onClick: () => reservePanel(panel, id) },
      { label: '出售', tone: 'gold', onClick: () => salePanel(panel, id), disabled: amount <= 0n },
    ]);
    panel.buttons([
      { label: '查看来源', onClick: () => showSource(panel, id) },
      { label: '查看用途', onClick: () => panel.go('图鉴', { id, tab: '用途' }) },
    ]);
  });
}

function hourlyRateLabel(rate, signed = false) {
  const whole = rate / 100n;
  const sign = whole < 0n ? '−' : signed && whole > 0n ? '+' : '';
  return sign + compact(whole < 0n ? -whole : whole, 0, 1000n);
}

function compareHourlyRates(left, right) {
  if (left.net === right.net) return left.id.localeCompare(right.id);
  const leftDeficit = left.net < 0n;
  const rightDeficit = right.net < 0n;
  if (leftDeficit !== rightDeficit) return leftDeficit ? -1 : 1;
  return (leftDeficit ? left.net < right.net : left.net > right.net) ? -1 : 1;
}

function sampleHourlyProduction(world) {
  return forecastHourlyProduction(world).sort(compareHourlyRates);
}

function showHourlyProduction(ui) {
  ui.dialog('每小时产出与支出', (panel) => {
    const rows = panel.local.sampledValue ?? [];
    panel.sampleProgress('每 3 秒更新一次');
    if (!rows.length) {
      panel.text('暂无已安排生产的设施或工位。');
      return;
    }
    panel.scrollList(rows, (row, { id, produced, consumed, net }) => {
      const netValue = hourlyRateLabel(net, true);
      const netTone = netValue === '0' ? undefined : net < 0n ? 'danger' : 'green';
      row.card((cell) => {
        cell.item(id, catalog.items[id].name, undefined, { marketRate: marketRate(panel.w, id) });
        cell.stats([
          { label: '产出', value: hourlyRateLabel(produced) },
          { label: '支出', value: hourlyRateLabel(consumed) },
          { label: '净变化', value: netValue, tone: netTone },
        ]);
      }, { padding: 8, gap: 8 });
    });
  }, { sample: sampleHourlyProduction, sampleEveryMs: 3000 });
}

function marketRows(ui, rates, showPrice) {
  const changes = Object.entries(rates).filter(([, rate]) => rate !== 0);
  if (!changes.length) {
    ui.text('暂无品项涨跌', { muted: true });
    return;
  }
  ui.scrollList(changes, (row, [id, rate], index) => {
    row.row(catalog.items[id].name, showPrice ? compact(marketUnitPrice(ui.w, id)) + ' 金币' : null,
      { compact: true, divider: index < changes.length - 1, icon: id, marketRate: rate });
  });
}

function showMarket(ui) {
  ui.dialog('市场行情', (panel) => {
    if (!marketIsActive(panel.w)) return;
    const { day, sequence, rates } = panel.w.market;
    panel.heading('今日行情 · ' + day);
    marketRows(panel, rates, true);
    const forecast = marketForecast(panel.w);
    if (forecast) {
      panel.heading('明日预测 · ' + forecast.day);
      marketRows(panel, forecast.rates, false);
    }
    if (panel.w.tech.marketManipulation > 0) {
      const remaining = marketResetsRemaining(panel.w);
      panel.row('今日剩余重置', remaining + ' 次');
      panel.button('重置今日行情', () => panel.action('resetMarket', day, sequence), {
        tone: 'gold', disabled: remaining === 0,
      });
    }
  });
}

export function renderWarehouse(ui) {
  const obtained = warehouseEntries(ui.w);
  if (marketIsActive(ui.w)) {
    ui.buttons([
      { label: '查看产出／支出图表', onClick: () => showHourlyProduction(ui) },
      { label: '市场行情', onClick: () => showMarket(ui) },
    ]);
  } else ui.button('查看产出／支出图表', () => showHourlyProduction(ui));
  renderMerchantEntry(ui);
  ui.local.source ??= '全部';
  ui.local.type ??= '全部';
  ui.tabs(typeTabs, ui.local.type, (type) => {
    ui.local.type = type;
    ui.local.scroll = 0;
    ui.refresh();
  }, { sticky: true, style: 'segmented' });
  ui.tabs(sourceTabs, ui.local.source, (source) => {
    ui.local.source = source;
    ui.local.scroll = 0;
    ui.refresh();
  }, { style: 'filter', compact: true });
  const filters = { type: ui.local.type, source: ui.local.source };
  const filtered = filters.type === '全部' && filters.source === '全部' ? obtained : warehouseEntries(ui.w, filters);
  const compactView = Boolean(ui.local.compactWarehouse);
  const setCompact = (value) => {
    ui.local.compactWarehouse = value;
    ui.refresh();
  };
  ui.buttons([
    { label: '批量管理', tone: 'gold', onClick: () => batchSalePanel(ui, filters),
      disabled: !filtered.some(([id]) => quantity(ui.w, id) > 0n) },
    { label: '缩小', onClick: () => setCompact(true), disabled: compactView },
    { label: '放大', onClick: () => setCompact(false), disabled: !compactView },
  ]);
  if (!filtered.length) {
    if (!obtained.length) {
      ui.image('warehouse-empty-v1', Math.min(ui.width, 120), { center: true });
      ui.text('库存 0', { muted: true, align: 'center' });
      ui.buttons([
        { label: '前往田地', onClick: () => ui.go('庄园', { tab: '田地' }) },
        { label: '前往工坊', onClick: () => ui.go('工坊') },
      ]);
    } else {
      ui.text('库存 0', { muted: true });
    }
    return;
  }
  ui.scrollList(filtered, (cell, [id, item]) => {
    const amount = quantity(ui.w, id);
    const quality = compact(ui.w.quality[id] ?? 1n) + ' 级';
    const price = compact(marketUnitPrice(ui.w, id)) + ' 金币';
    const rate = marketRate(ui.w, id);
    const open = () => warehouseDetail(ui, id);
    const drawActions = (row) => row.buttons([
      { label: '详情', onClick: open },
      { label: '出售', onClick: () => salePanel(ui, id), tone: 'gold', disabled: amount <= 0n },
    ], { style: 'production' });
    if (compactView) {
      cell.card((row) => {
        row.row(item.name, null, { icon: id, marketRate: rate, compact: true });
        row.row('库存', amount, { compact: true, noWrap: true });
        row.row('品质', quality, { compact: true, noWrap: true });
        row.row('单价', price, { compact: true, noWrap: true });
      }, { padding: 6, gap: 4, footer: drawActions });
      return;
    }
    cell.card((row) => {
      row.feature(id, (card) => {
        card.heading(item.name, { marketRate: rate });
        card.row('库存', amount, { style: 'metric', compact: true, divider: true, noWrap: true });
        card.row('品质', quality, { compact: true });
        card.row('单价', price, { compact: true });
      }, { ratio: 0.28, onClick: open });
      drawActions(row);
    }, { padding: 8, gap: 6 });
  }, { columns: compactView ? 'auto' : 1 });
}

function catalogViewSnapshot(local) {
  return {
    catalogId: local.catalogId ?? null,
    showUses: Boolean(local.showUses),
    scroll: local.scroll ?? 0,
    type: local.type,
    source: local.source,
    complexity: local.complexity,
  };
}

function renderCatalogDetail(ui, id) {
  const item = catalog.items[id];
  if (!item) return;
  const open = ui.w.unlocked.includes(id);
  ui.local.onBack = () => {
    let parent;
    if (ui.local.catalogTrail?.length) {
      parent = ui.local.catalogTrail.pop();
    } else if (ui.local.catalogListParent) {
      parent = ui.local.catalogListParent;
      delete ui.local.catalogListParent;
    }
    if (!parent) return false;
    Object.assign(ui.local, parent);
    ui.refresh();
    return true;
  };
  const openDetail = (key) => {
    if (key === id) return;
    (ui.local.catalogTrail ??= []).push(catalogViewSnapshot(ui.local));
    ui.local.catalogId = key;
    ui.local.showUses = false;
    ui.local.scroll = 0;
    ui.refresh();
  };
  const artwork = id === 'PT50' ? 'scene-composite-gift' : id;
  ui.card((header) => {
    header.feature(artwork, (card) => {
      card.heading(item.name);
      if (item.level) {
        card.badges([{ label: productComplexity(item) }, { label: compact(item.level) + ' 级', tone: 'gold' }]);
      } else {
        card.text(typeLabel(item) + ' · ' + item.sources.join(' · '));
      }
      if (item.subject && item.subject !== item.name) card.text('养殖对象 · ' + item.subject);
      card.row('基准单价', compact(item.price), { icon: 'coin', compact: true, divider: true });
      card.row('基础耗时', timeLabel(item.durationMs), { icon: 'clock', compact: true, divider: true });
      card.row('每批产出', compact(item.output) + ' 件', { icon: 'nav-warehouse', compact: true });
    }, { ratio: 0.42, cover: artwork !== id, surface: 'none' });
  }, { padding: 8, gap: 7 });
  const materials = Object.entries(item.inputs);
  if (!materials.length) {
    ui.card((card) => card.row('获取方式', { C: '农田收获', L: '养殖场产出', F: '鱼池养殖', M: '矿洞开采' }[item.kind]));
  } else {
    const needed = materials.reduce((sum, [, amount]) => sum + BigInt(amount), 0n);
    ui.card((card) => {
      card.heading('配方材料', {
        aside: compact(materials.length) + ' 种 · 共 ' + compact(needed) + ' 件', asideNoWrap: true,
      });
      card.detailRows(materials.map(([key, amount]) => ({
        icon: key, label: catalog.items[key].name, value: compact(amount), onClick: () => openDetail(key),
      })), { variant: 'recipe' });
    }, { padding: 8, gap: 7 });
  }
  const uses = entries.filter(([, entry]) => entry.inputs[id] != null);
  ui.buttons([
    open
      ? { label: '查看来源', onClick: () => showSource(ui, id) }
      : { label: '查看研发', tone: 'gold', onClick: () => showResearch(ui, id) },
    ...(uses.length ? [{
      label: ui.local.showUses ? '收起用途' : '查看用途',
      onClick: () => {
        ui.local.showUses = !ui.local.showUses;
        ui.refresh();
      },
    }] : []),
  ]);
  if (ui.local.showUses) {
    ui.heading('用于以下配方');
    if (!uses.length) {
      ui.text('暂无生产配方使用此品项。', { muted: true });
      return;
    }
    ui.scrollList(uses, (cell, [key, entry]) => cell.tile(key, entry.name, () => openDetail(key)), { columns: 'auto' });
  }
}

export function renderCatalog(ui) {
  if (ui.local.id && catalog.items[ui.local.id]) {
    ui.local.catalogId = ui.local.id;
    ui.local.catalogTrail = [];
    delete ui.local.catalogListParent;
    ui.local.showUses = ui.local.tab === '用途';
    ui.local.tab = undefined;
    ui.local.id = undefined;
  }
  if (ui.local.catalogId) {
    renderCatalogDetail(ui, ui.local.catalogId);
    return;
  }
  ui.local.onBack = undefined;
  ui.image('catalog-banner', 74);
  ui.balance('已解锁', compact(ui.w.unlocked.length) + ' / ' + compact(entries.length), { inline: true });
  showFilters(ui);
  const filtered = entries.filter(([, item]) => matchesFilters(ui.local, item));
  if (ui.local.type === '商品') filtered.sort(([, left], [, right]) => left.level - right.level);
  if (!filtered.length) {
    ui.text('此类别暂无品项。', { muted: true });
    return;
  }
  ui.scrollList(filtered, (cell, [id, item]) => {
    const open = ui.w.unlocked.includes(id);
    cell.tile(id, item.name, () => {
      ui.local.catalogListParent = catalogViewSnapshot(ui.local);
      ui.local.catalogTrail = [];
      ui.local.catalogId = id;
      ui.local.showUses = false;
      ui.local.scroll = 0;
      ui.refresh();
    }, { description: open ? undefined : '未解锁' });
  }, { columns: 'auto' });
}

const taskArt = {
  firstHarvest: 'scene-wheat', firstPlot: 'scene-wheat', moreFields: 'scene-wheat',
  firstFlour: 'task-process', firstLivestockProcessing: 'task-process', firstFishProcessing: 'task-process',
  breadRecipe: 'task-product', firstBread: 'task-product', firstMixedProduct: 'task-product',
  milleCrepe: 'task-product', threeSectorGift: 'task-product',
  livestockIntro: 'scene-hen', buildLivestock: 'scene-hen', collectLivestock: 'scene-hen',
  fishIntro: 'scene-fish', buildFish: 'scene-fish', collectFish: 'scene-fish',
  miningIntro: 'mining-tab', buildMine: 'mining-tab', collectMining: 'mining-tab',
  miningUpgrade: 'mining-tab', miningTop: 'mining-tab', miningProduct: 'mining-tab',
  firstSale: 'nav-warehouse', farmIncome: 'nav-warehouse',
  recipeCollection: 'nav-research', qualityCollection: 'nav-research', qualityMaster: 'nav-research',
  newFarm: 'sale-retain', itemCollection: 'nav-catalog',
  firstUpgrade: 'scene-wheat', firstSeed: 'nav-research', firstSwitch: 'scene-wheat',
  reserveStock: 'nav-warehouse', addProcessor: 'task-process', addRefinery: 'task-product',
  stationUpgrade: 'task-process',
  recipeTrio: 'nav-research', fieldLevel10: 'scene-wheat', codex20: 'nav-catalog',
  livestockUpgrade: 'scene-hen', fishUpgrade: 'scene-fish', firstTech: 'tech-farm', delegationTech: 'sale-retain',
  collection100: 'nav-catalog', collection200: 'nav-catalog', collection300: 'nav-catalog', collection400: 'nav-catalog',
  quality25: 'nav-research', quality50: 'nav-research', quality200: 'nav-research', quality400: 'nav-research',
  facilityLevel50: 'scene-wheat', facilityLevel100: 'scene-wheat', facilityLevel200: 'scene-wheat',
  facilityLevel400: 'scene-wheat', stationLevel10: 'task-process', stationLevel50: 'task-process',
  stationLevel100: 'task-process', stationLevel200: 'task-process', techLevel25: 'tech-farm',
  techLevel100: 'tech-farm', techLevel300: 'tech-farm', techLevel600: 'tech-farm', techLevel900: 'tech-farm',
  techLevel1200: 'tech-farm', runs5: 'sale-reset', runs20: 'sale-reset', runs50: 'sale-reset', runs100: 'sale-reset',
  livestockTop: 'scene-L10', fishTop: 'scene-F10',
};
const featuredGoals = ['buildLivestock', 'collectFish', 'firstLivestockProcessing', 'firstMixedProduct'];
const taskItems = { firstHarvest: 'C01', firstFlour: 'I01', breadRecipe: 'P01', firstBread: 'P01',
  milleCrepe: 'P150', threeSectorGift: 'PT50', miningTop: 'M10', miningProduct: 'PM14' };

export function renderTasks(ui) {
  const { guide, active, long } = objectives(ui.w);
  if (ui.local.guideActive === true && !active) ui.local.scroll = 0;
  ui.local.guideActive = active;
  ui.text('任务完成后自动发奖，每项只发一次。', { muted: true });
  const goals = active ? guide : [
    ...featuredGoals.map((id) => long.find((goal) => goal.id === id)).filter(Boolean),
    ...long.filter((goal) => !featuredGoals.includes(goal.id)),
  ];
  ui.scrollList(goals, (cell, goal) => {
    cell.card((entry) => entry.feature(taskArt[goal.id], (card) => {
      card.heading(goal.name);
      if (goal.id === 'techLevel1200' && goal.rewarded) {
        card.row('完成', '已到账');
        return;
      }
      const required = compact(goal.required);
      card.text(goal.condition.replace('{目标}', required));
      const researchPoints = goal.rewardResearchPoints ?? 0n;
      const reward = '奖励 ' + compact(goal.rewardCoins) + ' 金币' +
        (researchPoints > 0n ? ' + ' + compact(researchPoints) + ' 高级研发点' : '');
      const gate = goal.gate != null && !goal.gateMet ? ' · 需累计产值 ' + compact(goal.gate) : '';
      card.text(reward + gate + (goal.rewarded ? ' · 已到账' : ''), { muted: !goal.rewarded });
      const progress = compact(goal.current) + ' / ' + required;
      const earnForLand = goal.id === 'firstPlot' && !goal.done && ui.w.coins < facilityOffer(ui.w, 'C').cost;
      const target = earnForLand ? '仓库' : goal.target;
      const tab = earnForLand ? undefined : goal.tab;
      const destination = target === '庄园' ? (tab === '畜牧' ? '养殖场' : tab ?? target) : target;
      card.titleBar(progress, goal.done ? '已完成' : earnForLand ? '前往出货' : '前往' + destination,
        () => ui.go(target, { tab, id: goal.itemId ?? taskItems[goal.id] }), {
          compact: true, disabled: goal.done, tone: goal.done ? 'plain' : 'gold',
        });
    }, { ratio: 0.32 }), { padding: 8, gap: 6 });
  });
}

const instructions = [
  ['田地', '新庄园先点击空田的「播种」，选择已研发的种子安排种植。换种立即开始新的生长周期。购地增加可同时生产的作物，升级立即增加当前批次及之后的收成。'],
  ['畜牧、鱼池和矿洞', '购买设施，再安排已研发的牲畜、鱼或矿种。更换对象立即开始新周期。'],
  ['工坊', '更换配方立即退回旧批次已记录的材料，并开始检查新配方。材料齐备自动开工。每批产出随工位等级增长（1+j+⌊j²/64⌋ 倍），材料投入同比放大；升级工位从下一批起生效。'],
  ['研究', '满足前置并备齐金币和实物，点击研发立即解锁。每累计一小时有效时间发放普通研发点。消耗 100 普通研发点随机提升一个已研发品项的品质。'],
  ['出货', '在仓库选择物品，拖动百分比滑条。确认前可以查看出售数量和预计得款。行情生效时，按当天倍率出货。'],
  ['出售庄园', '首次出货任务奖励 1 点高级研发点。生产积累的高级研发点在出售庄园时领取，未满一点的收益跨轮保留。任意产值均可出售。出售后保留已研发品项、品质、普通研发点、经营改良和任务进度。工坊重置为加工位、精制位各 1 个（均为 1 级），需重新安排配方，原优先生产与未完成批次清空。'],
];

function showInstructions(ui) {
  let index = 0;
  ui.dialog('操作说明', (panel) => {
    panel.row(instructions[index][0], (index + 1) + ' / ' + instructions.length);
    panel.text(instructions[index][1]);
    panel.buttons([
      {
        label: '上一步', disabled: index === 0,
        onClick: () => { index -= 1; panel.refresh(); },
      },
      {
        label: index + 1 === instructions.length ? '完成' : '下一步', tone: 'gold',
        onClick: () => {
          if (index + 1 === instructions.length) {
            panel.close();
          } else {
            index += 1;
            panel.refresh();
          }
        },
      },
    ]);
  });
}

function saveMessage(error, fallback) {
  return error?.userMessage || fallback;
}

function savedResult(result, fallback) {
  if (result?.ok !== false) return result;
  const error = new Error(fallback);
  error.userMessage = result.message || fallback;
  throw error;
}

async function showExportSave(ui) {
  let file;
  try {
    file = savedResult(await ui.saveAction('exportSave'), '未能导出存档，请重试。');
    if (!file?.text || !file.filename) throw new Error('Missing save export');
  } catch (error) {
    ui.toast(saveMessage(error, '未能导出存档，请重试。'));
    return;
  }
  const state = { pending: false, message: '' };
  const deliver = async (panel, method) => {
    if (state.pending) return;
    state.pending = true;
    state.message = '';
    panel.refresh();
    try {
      savedResult(await panel.saveAction(method, method === 'download' ? file : file.text),
        method === 'download' ? '未能下载存档，可以尝试复制存档。' : '未能复制存档，可以尝试下载存档。');
      state.message = method === 'download' ? '已交给浏览器下载。' : '存档已复制。';
    } catch (error) {
      state.message = saveMessage(error,
        method === 'download' ? '未能下载存档，可以尝试复制存档。' : '未能复制存档，可以尝试下载存档。');
    } finally {
      state.pending = false;
      panel.refresh();
    }
  };
  ui.dialog('导出存档', (panel) => {
    panel.card((card) => {
      card.row('存档版本', panel.saveManagement.version);
      card.text(file.filename, { muted: true });
    }, { padding: 12, gap: 8 });
    panel.text('下载存档文件，或复制存档以便保存和迁移。');
    if (state.message) panel.text(state.message);
    panel.buttons([
      { label: '下载存档', tone: 'gold', disabled: state.pending, onClick: () => deliver(panel, 'download') },
      { label: '复制存档', disabled: state.pending, onClick: () => deliver(panel, 'copyText') },
    ], { style: 'production' });
  }, { onClose: () => !state.pending });
}

const saveImportFailureColor = 0xa03221;

async function replaceSave(panel, state, operation, candidate) {
  if (state.pending) return;
  state.pending = true;
  if (operation === 'importSave') state.failed = false;
  state.message = operation === 'importSave' ? '正在导入存档，请稍候…' : '正在清除存档，请稍候…';
  panel.local.scroll = 0;
  panel.refresh();
  let succeeded = false;
  const fallback = operation === 'importSave'
    ? '未能导入存档，当前经营记录已保留。'
    : '未能清除存档，当前经营记录已保留。';
  try {
    const result = await panel.saveAction(operation, ...(candidate ? [candidate] : []));
    succeeded = Boolean(result?.ok);
    if (!succeeded) {
      if (operation === 'importSave') state.failed = true;
      state.message = result?.message || fallback;
    }
    else panel.toast(result.message || (operation === 'importSave' ? '存档已导入' : '存档已清除，新庄园已准备好'));
  } catch (error) {
    if (operation === 'importSave') state.failed = true;
    state.message = saveMessage(error, fallback);
  } finally {
    state.pending = false;
    if (!succeeded) panel.refresh();
  }
}

function confirmImportSave(ui, candidate) {
  const state = { pending: false, message: '', failed: false };
  ui.dialog('确认导入存档', (panel) => {
    const summary = candidate.summary;
    panel.text(state.message || '存档读取成功，请核对摘要后确认导入。',
      { color: state.failed ? saveImportFailureColor : undefined });
    panel.text('导入后，将用此存档替换当前全部经营记录。');
    panel.card((card) => {
      card.row('源存档版本', candidate.version);
      card.row('金币', summary.coins, { compact: true, icon: 'coin' });
      card.row('高级研发点', summary.researchPoints, { compact: true });
      card.row('设施总数（含矿洞）', compact(summary.facilities));
      card.row('已研发品项', compact(summary.unlocked));
      card.row('已出售庄园', compact(summary.completedRuns) + ' 次');
    }, { padding: 12, gap: 8 });
    panel.text('不会补算存档导出后的离线收获。', { muted: true });
    panel.buttons([
      { label: '取消', disabled: state.pending, onClick: () => panel.close() },
      {
        label: '确认导入', tone: 'gold', disabled: state.pending,
        onClick: () => replaceSave(panel, state, 'importSave', candidate),
      },
    ], { style: 'production' });
  }, { flow: 'save-import', onClose: () => !state.pending });
}

function showImportSave(ui) {
  const state = { pending: false, message: '', failed: false, closed: false, panel: undefined };
  const showMessage = (message, failed = false) => {
    state.message = message;
    state.failed = failed;
    if (state.panel?.isActive()) {
      state.panel.local.scroll = 0;
      state.panel.refresh();
    }
  };
  const inspect = (text) => {
    if (state.pending || state.closed || !state.panel?.isActive()) return;
    state.pending = true;
    showMessage('正在核对存档版本与数据…');
    try {
      const candidate = ui.saveManagement.inspectSave(text);
      if (!candidate?.summary || !candidate.version) throw new Error('Missing import summary');
      state.pending = false;
      state.message = '存档读取成功，请核对确认面板中的摘要。';
      confirmImportSave(ui, candidate);
    } catch (error) {
      state.pending = false;
      showMessage(saveMessage(error, '无法读取这份存档，请确认文件完整，且存档格式与环境匹配。'), true);
    }
  };
  const receive = async (panel, method, ...args) => {
    if (state.pending || !panel?.isActive()) return;
    state.pending = true;
    state.failed = false;
    state.message = method === 'captureImport' ? '正在选择并读取存档文件…'
      : method === 'readClipboard' ? '正在读取剪贴板…' : '正在读取存档文件…';
    panel.local.scroll = 0;
    let text;
    let failed = false;
    try {
      text = savedResult(await panel.saveAction(method, ...args), '未能读取存档，请使用粘贴或拖入文件。');
    } catch (error) {
      failed = true;
      state.failed = true;
      state.message = saveMessage(error, '未能读取存档，请使用粘贴或拖入文件。');
    } finally {
      state.pending = false;
      if (panel.isActive()) panel.refresh();
    }
    if (state.closed || !panel.isActive()) return;
    if (typeof text === 'string') inspect(text);
    else if (text === null) showMessage('未能取得存档文件：可能已取消选择，或受隐私模式／权限限制。请在此面板粘贴存档文本，或拖入 JSON 存档文件。', true);
    else if (!failed) {
      showMessage('没有读取到存档内容，请重新选择文件，或在此面板粘贴存档文本／拖入 JSON 存档文件。', true);
    } else showMessage(state.message, true);
  };
  ui.dialog('导入存档', (panel) => {
    state.panel = panel;
    state.closed = false;
    panel.text(state.message || '请选择存档文件，读取后将显示确认摘要。',
      { color: state.failed ? saveImportFailureColor : undefined });
    panel.row('当前版本', panel.saveManagement.version);
    panel.text('请选择与当前游戏格式和环境匹配的存档。');
    panel.text('也可以在此页面粘贴存档文本，或拖入一个 JSON 存档文件。', { muted: true });
    panel.text('读取后会先显示存档摘要，确认后才替换当前记录。');
    panel.buttons([
      { label: '选择文件', tone: 'gold', disabled: state.pending, onClick: () => receive(panel, 'captureImport') },
      { label: '读取剪贴板', disabled: state.pending, onClick: () => receive(panel, 'readClipboard') },
    ], { style: 'production' });
  }, {
    flow: 'save-import',
    onImportText: inspect,
    onImportFile: (file) => receive(state.panel, 'readImportFile', file),
    onClose() {
      if (state.pending) return false;
      state.closed = true;
      return true;
    },
  });
}

function showClearSave(ui) {
  const state = { pending: false, message: '' };
  ui.dialog('确认清除存档', (panel) => {
    if (state.message) panel.text(state.message);
    panel.text('清除后将从新庄园重新开始。');
    panel.card((card) => {
      card.titleBar('全部重新开始');
      card.detailRows([
        { icon: 'coin', label: '金币、库存和全部设施' },
        { icon: 'nav-research', label: '品种、配方、品质和永久科技' },
        { icon: 'task-product', label: '任务进度、经营记录和出售庄园次数' },
      ], { variant: 'pill' });
    }, { padding: 12, gap: 8 });
    panel.text('需要保留进度时，请先导出存档。');
    panel.buttons([
      { label: '取消', disabled: state.pending, onClick: () => panel.close() },
      {
        label: '确认清除', tone: 'danger', disabled: state.pending,
        onClick: () => replaceSave(panel, state, 'clearSave'),
      },
    ], { style: 'production' });
  }, { onClose: () => !state.pending });
}

export function renderSettings(ui) {
  const settings = ui.w.settings;
  ui.image('settings-banner', 96);
  ui.section('声音', 'settings-sound', (card) => {
    const preview = ui.local.volumePreview ??= {};
    const lastAudible = ui.local.lastAudible ??= {};
    const channels = [
      ['music', '音乐', 'settings-music', 70],
      ['sound', '音效', 'settings-sound', 75],
    ];
    for (const [key, label, icon, fallbackVolume] of channels) {
      const savedVolume = settings[key];
      const value = preview[key] ?? savedVolume;
      const save = async (next) => {
        if (savedVolume > 0) lastAudible[key] = savedVolume;
        if (next !== savedVolume) await ui.action('updateSettings', { [key]: next });
        delete preview[key];
        ui.refresh();
      };
      card.row(label, value + '%', { icon, compact: true });
      card.split((left) => {
        left.slider(value, (next) => {
          preview[key] = next;
          ui.refresh();
        }, { onCommit: save });
      }, (right) => {
        right.settingToggle('静音', value === 0, () => save(value === 0 ? lastAudible[key] ?? fallbackVolume : 0));
      }, { ratio: 0.65, divider: key === 'music' });
    }
  });
  ui.section('操作说明', 'settings-guide', (card) => {
    card.button('重看操作说明', () => showInstructions(ui), { trailingIcon: 'chevron-right' });
  });
  ui.section('存档管理', 'nav-warehouse', (card) => {
    card.buttons([
      { label: '导出存档', onClick: () => showExportSave(ui) },
      { label: '导入存档', onClick: () => showImportSave(ui) },
    ], { style: 'production' });
    card.button('清除存档', () => showClearSave(ui), { tone: 'danger' });
  });
}

function farmDetails(ui, offer) {
  const multiplier = Math.floor(offer.multiplierBasisPoints / 10000);
  const decimal = String(offer.multiplierBasisPoints % 10000).padStart(4, '0').replace(/0+$/, '');
  const multiplierLabel = compact(multiplier) + (decimal ? '.' + decimal : '') + ' 倍';
  const details = [
    { icon: 'coin', label: '本轮生产总值', value: compact(offer.productionValue) },
    { icon: 'nav-workshop', label: '后续生产评估倍率', value: multiplierLabel },
  ];
  for (const { icon, label, value } of details) {
    ui.card((card) => card.row(label, value, { icon, style: 'metric', compact: true, divider: false }),
      { padding: 8, gap: 6 });
  }
  ui.balance('预计获得高级研发点', offer.reward, { variant: 'centered', inspectable: false });
  const newRun = [{ label: '2 块空田、基础 ' + compact(startingCoins) + ' 金币' }];
  if (offer.completedRuns === 0 && !ui.w.taskRewards?.includes('newFarm') &&
    (ui.w.lifetimeProductionValue ?? 0n) >= taskProductionGates.newFarm) {
    newRun.push({ label: '首次经营交接另奖 ' + compact(taskCoinRewards.newFarm) + ' 金币（仅一次）' });
  }
  const changes = [
    ['保留', [{ label: '已研发品项、品质、普通研发点、经营改良、任务进度' }]],
    ['清空', [
      { label: '田地、养殖场、鱼池、矿洞' },
      { label: '库存、金币' },
    ]],
    ['工坊重置', [
      { label: '重置为加工位、精制位各 1 个' },
      { label: '原配方、优先生产和未完成批次清空' },
    ]],
    ['新一轮', newRun],
  ];
  for (const [title, rows] of changes) {
    ui.card((card) => {
      card.titleBar(title);
      card.detailRows(rows, { variant: 'pill' });
    }, { padding: 8, gap: 6 });
  }
}

export function renderFarmSale(ui) {
  ui.image('sale-banner', 80);
  farmDetails(ui, farmSaleOffer(ui.w));
  ui.button('出售庄园', () => {
    const state = { pending: false, revised: false };
    ui.dialog('确认出售庄园', (panel) => {
      const offer = farmSaleOffer(panel.w);
      farmDetails(panel, offer);
      if (!offer.reward) panel.text('本次出售可获得 0 点高级研发点。');
      if (state.revised) panel.text('经营记录或预计点数已变化，请重新确认。');
      panel.buttons([
        { label: '继续经营', onClick: () => panel.close(), disabled: state.pending },
        {
          label: '确认出售', tone: 'gold', disabled: state.pending,
          onClick: async () => {
            if (state.pending) return;
            state.pending = true;
            panel.refresh();
            const sold = await panel.action('sellFarm', offer);
            state.pending = false;
            if (sold) {
              panel.close();
              panel.go('庄园');
            } else {
              state.revised = true;
              panel.refresh();
            }
          },
        },
      ]);
    }, { variant: 'farm-sale' });
  }, { tone: 'gold', style: 'primary' });
}
