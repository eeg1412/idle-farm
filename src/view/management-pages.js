import { catalog, facilityOffer, farmSaleOffer, quantity, tradeOffer } from '../game/world.js';
import { unitPrice } from '../game/advancement.js';
import { objectives } from '../game/objectives.js';
import { compact } from './numbers.js';

const entries = Object.entries(catalog.items);
const typeTabs = ['全部', '原料', '中间产物', '商品'];
const sourceTabs = ['全部', '农业', '畜牧', '水产'];
const complexityTabs = ['全部', '单类', '双类', '三类'];
const facilityTabs = { C: '田地', L: '畜牧', F: '鱼池' };
const PAGE_SIZE = 12;

const managementEntries = [
  { page: '任务', icon: 'task-product', description: '查看任务进度' },
  { page: '图鉴', icon: 'nav-catalog', description: '查阅物品、配方与来源' },
  { page: '出售牧场', icon: 'sale-reset', description: '预览出售收益与新一轮配置' },
];

export function renderManagement(ui) {
  ui.titleBar('经营');
  for (const { page, icon, description } of managementEntries) {
    ui.card((card) => card.item(icon, page, description), {
      padding: 16, gap: 12, style: 'navigation', onClick: () => ui.go(page),
    });
  }
}

function typeOf(item) {
  if (item.kind.startsWith('P')) return '商品';
  if (item.kind.startsWith('I')) return '中间产物';
  return '原料';
}

function typeLabel(item) {
  return { C: '作物', L: '畜牧原料', F: '水产原料' }[item.kind] ?? typeOf(item);
}

function complexityOf(item) {
  return complexityTabs[item.sources.length] ?? '全部';
}

function timeLabel(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
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
    local.page = 0;
    ui.refresh();
  };
  ui.tabs(typeTabs, local.type, (value) => select('type', value), { style: 'framed' });
  ui.tabs(sourceTabs, local.source, (value) => select('source', value), { style: 'framed' });
  if (local.type === '商品') {
    ui.tabs(complexityTabs, local.complexity, (value) => select('complexity', value), { style: 'framed' });
  }
}

function matchesFilters(local, item) {
  return (local.type === '全部' || local.type === typeOf(item)) &&
    (local.source === '全部' || item.sources.includes(local.source)) &&
    (local.type !== '商品' || local.complexity === '全部' || local.complexity === complexityOf(item));
}

function paged(ui, items, draw, useGrid = false) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(Math.max(0, ui.local.page ?? 0), pages - 1);
  const change = (direction) => {
    ui.local.page = page + direction;
    ui.local.scroll = 0;
    ui.refresh();
  };
  const visible = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  if (useGrid) ui.grid(visible, (cell, entry) => draw(entry, cell), { equalHeight: true });
  else visible.forEach((entry, index) => draw(entry, ui, index));
  if (pages > 1) {
    ui.row('页码', compact(page + 1) + ' / ' + compact(pages));
    ui.buttons([
      { label: '上一页', onClick: () => change(-1), disabled: page === 0 },
      { label: '下一页', onClick: () => change(1), disabled: page + 1 === pages },
    ]);
  }
}

function showSource(ui, id) {
  const item = catalog.items[id];
  if (!item) return;
  if (facilityTabs[item.kind]) ui.go('牧场', { tab: facilityTabs[item.kind], id });
  else ui.go('工坊', { tab: typeOf(item) === '商品' ? '精制' : '加工', id });
}

function showResearch(ui, id) {
  ui.go('研究', { tab: '品种与配方', id });
}

function salePanel(ui, ids, multiple = false) {
  const state = {
    percentages: Object.fromEntries(ids.map((id) => [id, 0])),
    index: 0, pending: false, revised: false,
  };
  ui.dialog(multiple ? '出售所选' : '出售' + catalog.items[ids[0]].name, (panel) => {
    const quotes = ids.map((id) => tradeOffer(panel.w, id, state.percentages[id]));
    const chosen = quotes[state.index];
    if (!chosen) return;
    if (multiple) {
      panel.row('第 ' + (state.index + 1) + ' / ' + ids.length + ' 项', catalog.items[chosen.id].name);
      panel.buttons([
        {
          label: '上一项', disabled: state.index === 0 || state.pending,
          onClick: () => { state.index -= 1; panel.refresh(); },
        },
        {
          label: '下一项', disabled: state.index + 1 === ids.length || state.pending,
          onClick: () => { state.index += 1; panel.refresh(); },
        },
      ]);
    }
    panel.card((entry) => {
      entry.feature(chosen.id, (body) => {
        body.row('当前库存', chosen.inventory, { compact: true, divider: true });
        body.row('单价', compact(chosen.price) + ' 金币', { compact: true });
      }, { ratio: 0.25 });
    }, { padding: 8, gap: 4 });
    panel.slider(state.percentages[chosen.id], (percent) => {
      if (state.pending) return;
      state.percentages[chosen.id] = percent;
      state.revised = false;
      panel.refresh();
    }, { bubble: true });
    panel.row('出售数量', chosen.count, { compact: true, divider: true });
    panel.row('预计得款', chosen.gain, { compact: true, divider: true });
    if (chosen.reserveAffected > 0n) {
      panel.text('本次将动用保留库存 ' + compact(chosen.reserveAffected) + ' 件。');
      panel.row('出售后库存', compact(chosen.remaining));
    }
    const active = quotes.filter((quote) => quote.affordable);
    if (multiple) {
      panel.row('预计总得款', compact(active.reduce((total, quote) => total + quote.gain, 0n)));
    }
    if (state.revised) panel.text('库存或售价已变化，请重新确认。');
    panel.buttons([
      { label: '取消', onClick: () => panel.close(), disabled: state.pending },
      {
        label: '确认出售', tone: 'gold', disabled: !active.length || state.pending,
        onClick: async () => {
          if (state.pending) return;
          state.pending = true;
          panel.refresh();
          const sold = multiple
            ? await panel.action('sellBatch', quotes.filter((quote) => quote.percent > 0).map((quote) => ({
              id: quote.id, percent: quote.percent, expectedQuote: quote,
            })))
            : await panel.action('sell', chosen.id, chosen.percent, chosen);
          state.pending = false;
          if (sold) {
            if (multiple) ui.local.selected = [];
            panel.close();
          } else {
            state.revised = true;
            panel.refresh();
          }
        },
      },
    ]);
  }, multiple ? false : { variant: 'warehouse-sale' });
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
    panel.item(id, catalog.items[id].name);
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
    panel.item(id, item.name, item.sources.join(' · ') + ' · ' + typeLabel(item));
    for (const [label, value] of [
      ['库存', amount],
      ['品质（级）', BigInt(panel.w.quality[id] ?? 1)],
      ['单价（金币）', unitPrice(panel.w, id)],
      ['加工保留量', panel.w.reserves[id] ?? 0n],
    ]) {
      panel.text(label);
      panel.fullNumber(value);
    }
    panel.buttons([
      { label: '加工保留量', onClick: () => reservePanel(panel, id) },
      { label: '出售', tone: 'gold', onClick: () => salePanel(panel, [id]), disabled: amount <= 0n },
    ]);
    panel.buttons([
      { label: '查看来源', onClick: () => showSource(panel, id) },
      { label: '查看用途', onClick: () => panel.go('图鉴', { id, tab: '用途' }) },
    ]);
    panel.button('复制完整数量', async () => {
      try {
        await navigator.clipboard.writeText(amount.toString());
        panel.float('已复制');
      } catch {
        panel.toast('无法复制，可在详情查看完整数量');
      }
    });
    panel.button('关闭', () => panel.close());
  });
}

export function renderWarehouse(ui) {
  ui.image('warehouse', Math.round(ui.width * 0.35));
  ui.local.source ??= '全部';
  ui.local.type ??= '全部';
  ui.tabs(typeTabs, ui.local.type, (type) => {
    ui.local.type = type;
    ui.local.page = 0;
    ui.local.scroll = 0;
    ui.refresh();
  }, { sticky: true, style: 'segmented' });
  ui.tabs(sourceTabs, ui.local.source, (source) => {
    ui.local.source = source;
    ui.local.page = 0;
    ui.local.scroll = 0;
    ui.refresh();
  }, { style: 'filter' });
  const stocked = entries.filter(([id]) => quantity(ui.w, id) > 0n);
  const selected = ui.local.selected ??= [];
  const toggleMulti = () => {
    ui.local.multi = !ui.local.multi;
    ui.local.selected = [];
    ui.refresh();
  };
  if (stocked.length && ui.local.multi) {
    ui.buttons([
      { label: '退出多选', onClick: toggleMulti },
      {
        label: '出售所选', tone: 'gold', disabled: !selected.length,
        onClick: () => salePanel(ui, [...selected], true),
      },
    ], { style: 'production' });
  }
  const filtered = stocked.filter(([, item]) =>
    (ui.local.source === '全部' || item.sources.includes(ui.local.source)) &&
    (ui.local.type === '全部' || ui.local.type === typeOf(item)));
  if (!filtered.length) {
    if (stocked.length) {
      ui.text('此类别暂无库存。', { muted: true });
      if (!ui.local.multi) ui.button('多选', toggleMulti);
    } else {
      ui.text('仓库暂无库存。', { muted: true });
      ui.buttons([
        { label: '前往田地', onClick: () => ui.go('牧场', { tab: '田地' }) },
        { label: '前往工坊', onClick: () => ui.go('工坊') },
      ]);
    }
    return;
  }
  paged(ui, filtered, ([id, item], _, index) => {
    const amount = quantity(ui.w, id);
    const marked = selected.includes(id);
    const open = ui.local.multi ? () => {
      ui.local.selected = marked ? selected.filter((key) => key !== id) : [...selected, id];
      ui.refresh();
    } : () => warehouseDetail(ui, id);
    ui.card((row) => {
      row.feature(id, (card) => {
        card.heading(item.name);
        card.row('库存', amount, { style: 'metric', compact: true, divider: true });
        card.row('品质', compact(ui.w.quality[id] ?? 1n) + ' 级', { compact: true });
        card.row('单价', compact(unitPrice(ui.w, id)) + ' 金币', { compact: true });
      }, { ratio: 0.28, onClick: open });
      if (ui.local.multi) {
        row.button(marked ? '已勾选' : '勾选', open, { tone: marked ? 'gold' : 'plain' });
      } else {
        row.buttons([
          { label: '详情', onClick: open },
          { label: '出售', onClick: () => salePanel(ui, [id]), tone: 'gold' },
          ...(index === 0 ? [{ label: '多选', onClick: toggleMulti }] : []),
        ], { style: 'production' });
      }
    }, { padding: 8, gap: 6 });
  });
}

function renderCatalogDetail(ui, id) {
  const item = catalog.items[id];
  if (!item) return;
  const open = ui.w.unlocked.includes(id);
  ui.local.onBack = () => {
    if (ui.local.catalogTrail?.length) {
      ui.local.catalogId = ui.local.catalogTrail.pop();
    } else {
      ui.local.catalogId = null;
    }
    ui.local.showUses = false;
    ui.local.scroll = 0;
    ui.refresh();
    return true;
  };
  const openDetail = (key) => {
    (ui.local.catalogTrail ??= []).push(id);
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
        card.badges([{ label: complexityOf(item) }, { label: compact(item.level) + ' 级', tone: 'gold' }]);
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
    ui.card((card) => card.row('获取方式', { C: '农田收获', L: '畜牧场养殖', F: '鱼池养殖' }[item.kind]));
  } else {
    const needed = materials.reduce((sum, [, amount]) => sum + BigInt(amount), 0n);
    ui.card((card) => {
      card.heading('配方材料', { aside: compact(materials.length) + ' 种 · 共 ' + compact(needed) + ' 件' });
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
    if (!uses.length) ui.text('暂无生产配方使用此品项。', { muted: true });
    ui.grid(uses, (cell, [key, entry]) => cell.tile(key, entry.name, () => openDetail(key)), { equalHeight: true });
  }
}

export function renderCatalog(ui) {
  if (ui.local.id && catalog.items[ui.local.id]) {
    ui.local.catalogId = ui.local.id;
    ui.local.catalogTrail = [];
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
  if (!filtered.length) ui.text('此类别暂无品项。', { muted: true });
  paged(ui, filtered, ([id, item], cell) => {
    const open = ui.w.unlocked.includes(id);
    cell.tile(id, item.name, () => {
      ui.local.catalogId = id;
      ui.local.showUses = false;
      ui.local.scroll = 0;
      ui.refresh();
    }, { description: open ? undefined : '未解锁' });
  }, true);
}

const taskArt = {
  firstHarvest: 'scene-wheat', firstPlot: 'scene-wheat', moreFields: 'scene-wheat',
  firstFlour: 'task-process', firstLivestockProcessing: 'task-process', firstFishProcessing: 'task-process',
  breadRecipe: 'task-product', firstBread: 'task-product', firstMixedProduct: 'task-product',
  milleCrepe: 'task-product', threeSectorGift: 'task-product',
  livestockIntro: 'scene-hen', buildLivestock: 'scene-hen', collectLivestock: 'scene-hen',
  fishIntro: 'scene-fish', buildFish: 'scene-fish', collectFish: 'scene-fish',
  firstSale: 'nav-warehouse', farmIncome: 'nav-warehouse',
  recipeCollection: 'nav-research', qualityCollection: 'nav-research', qualityMaster: 'nav-research',
  newFarm: 'sale-retain', itemCollection: 'nav-catalog',
};
const featuredGoals = ['buildLivestock', 'collectFish', 'firstLivestockProcessing', 'firstMixedProduct'];
const taskItems = { firstHarvest: 'C01', firstFlour: 'I01', breadRecipe: 'P01', firstBread: 'P01',
  milleCrepe: 'P150', threeSectorGift: 'PT50' };

export function renderTasks(ui) {
  const { guide, active, long } = objectives(ui.w);
  if (ui.local.guideActive === true && !active) ui.local.scroll = 0;
  ui.local.guideActive = active;
  ui.image('tasks-banner', 101);
  const goals = active ? guide : [
    ...featuredGoals.map((id) => long.find((goal) => goal.id === id)).filter(Boolean),
    ...long.filter((goal) => !featuredGoals.includes(goal.id)),
  ];
  for (const goal of goals) {
    ui.card((entry) => entry.feature(taskArt[goal.id], (card) => {
      card.heading(goal.name);
      const progress = compact(goal.current) + ' / ' + compact(goal.required);
      const earnForLand = goal.id === 'firstPlot' && !goal.done && ui.w.coins < facilityOffer(ui.w, 'C').cost;
      const target = earnForLand ? '仓库' : goal.target;
      const tab = earnForLand ? undefined : goal.tab;
      const destination = target === '牧场' ? (tab === '畜牧' ? '畜牧场' : tab ?? target) : target;
      card.titleBar(progress, goal.done ? '已完成' : earnForLand ? '前往出货' : '前往' + destination,
        () => ui.go(target, { tab, id: goal.itemId ?? taskItems[goal.id] }), {
          compact: true, disabled: goal.done, tone: goal.done ? 'plain' : 'gold',
        });
    }, { ratio: 0.32 }), { padding: 8, gap: 6 });
  }
}

const instructions = [
  ['田地', '选择已研发的种子安排种植。换种立即开始新的生长周期。购地增加可同时生产的作物，升级增加每批收成。'],
  ['畜牧和鱼池', '购买畜牧场或鱼池，再安排已研发的牲畜或鱼。更换对象立即开始新周期。'],
  ['工坊', '更换配方立即退回旧批次已记录的材料，并开始检查新配方。材料齐备自动开工，每批产出 1 件。'],
  ['研究', '满足前置并备齐金币和实物，点击研发立即解锁。已研发品项可继续升级品质。'],
  ['出货', '在仓库选择物品，拖动百分比滑条。确认前可以查看出售数量和预计得款。'],
  ['出售牧场', '本轮生产总值决定预计获得的高级研发点。出售后保留研发、品质、经营改良、工位和任务进度。'],
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
        label: index + 1 === instructions.length ? '关闭' : '下一步', tone: 'gold',
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
  ui.section('显示', 'settings-display', (card) => {
    const percent = Math.round(settings.textScale * 100);
    const setScale = (delta) => ui.action('updateSettings', {
      textScale: Math.min(200, Math.max(100, percent + delta)) / 100,
    });
    card.text('文字大小', { fontSize: 18 });
    card.stepper(percent + '%',
      percent > 100 ? () => setScale(-25) : null,
      percent < 200 ? () => setScale(25) : null);
    card.settingToggle('减弱动态', settings.reducedMotion,
      () => ui.action('updateSettings', { reducedMotion: !settings.reducedMotion }));
  });
  ui.section('操作说明', 'settings-guide', (card) => {
    card.button('重看操作说明  ›', () => showInstructions(ui));
  });
}

function farmDetails(ui, offer, summary = false) {
  const multiplier = Math.floor(offer.multiplierTenths / 10);
  const decimal = offer.multiplierTenths % 10;
  const multiplierLabel = compact(multiplier) + (decimal ? '.' + decimal : '') + ' 倍';
  const details = [
    { icon: 'coin', label: '本轮生产总值', value: compact(offer.productionValue) },
    { icon: 'nav-workshop', label: '经营评估倍率', value: multiplierLabel },
  ];
  if (summary) {
    ui.stats(details);
  } else {
    for (const { icon, label, value } of details) {
      ui.card((card) => card.row(label, value, { icon, style: 'metric', compact: true }), { padding: 8, gap: 6 });
    }
  }
  ui.balance('预计获得高级研发点', offer.reward, { variant: 'centered' });
  if (summary) {
    ui.row('保留', '工位、研发、品质、经营改良、任务进度');
    ui.row('清空', '田地、畜牧场、鱼池、库存、金币');
    ui.row('新一轮', '2 块小麦田、60 金币');
    return;
  }
  const changes = [
    ['保留', [{ icon: 'sale-retain', label: '工位、研发、品质、经营改良、任务进度' }]],
    ['清空', [
      { icon: 'sale-reset', label: '田地、畜牧场、鱼池' },
      { icon: 'nav-warehouse', label: '库存、金币' },
    ]],
    ['新一轮', [{ icon: 'facility-field', label: '2 块小麦田、60 金币' }]],
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
  ui.button('出售牧场', () => {
    const state = { pending: false, revised: false };
    ui.dialog('确认出售牧场', (panel) => {
      const offer = farmSaleOffer(panel.w);
      farmDetails(panel, offer, true);
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
              panel.go('牧场');
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
