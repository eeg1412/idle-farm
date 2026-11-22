import {
  batchUpgradeOffer, catalog, facilityOffer, productionDurationMs, quantity, stationMultiplier, stationOffer,
  stationRequirements, stationUpgradeOffer, unitPrice,
} from '../game/world.js';
import { marketRate, marketUnitPrice } from '../game/market.js';
import { hoursLabel, productComplexity, reservePanel } from './management-pages.js';
import { compact } from './numbers.js';

const sources = ['全部', '农业', '畜牧', '水产', '矿业'];
const facilityTabs = { 田地: 'C', 畜牧: 'L', 鱼塘: 'F', 矿洞: 'M' };
const facilityNames = { C: '田地', L: '养殖场', F: '鱼塘', M: '矿洞' };
const facilityArtAspects = { C: 1.06, L: 1.11, F: 1.20, M: 1 };
const emptyFacilityArt = { C: 'scene-empty-field', L: 'scene-empty-barn', F: 'scene-empty-pond', M: 'facility-empty-mine' };
const purchaseLabels = { C: '购地', L: '购买养殖场', F: '购买鱼塘', M: '购买矿洞' };
const stationNames = { I: '加工位', P: '精制位' };
const emptyStationArt = { I: 'facility-mill', P: 'facility-kitchen' };
const upgradeOptions = [
  { label: '+1', steps: 1n }, { label: '+10', steps: 10n },
  { label: '+100', steps: 100n }, { label: '最高可升', steps: 'max' },
];
const batchUpgradeSteps = [1n, 5n, 10n];

const confirm = { tone: 'gold' };

function itemName(id) {
  return catalog.items[id]?.name ?? '';
}

function assignedName(id) {
  const item = catalog.items[id];
  return item?.subject ?? item?.name ?? '';
}

function facilityImage(kind, id) {
  return id ? 'scene-' + id : emptyFacilityArt[kind];
}

function facilityPreview(ui, kind, id, note) {
  ui.feature(facilityImage(kind, id), (copy) => {
    const name = assignedName(id);
    const product = itemName(id);
    const rate = marketRate(ui.w, id);
    copy.heading(name, { size: 18, marketRate: name === product ? rate : 0 });
    if (note && name !== product && rate) copy.row(product, undefined, { marketRate: rate });
    if (note) copy.text(note, { fontSize: 13, muted: true });
  }, { ratio: 0.23, artAspect: facilityArtAspects[kind], align: 'center' });
}

function remainingTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return seconds + ' 秒';
  if (seconds >= 3600) return hoursLabel(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? minutes + ' 分 ' + remainder + ' 秒' : minutes + ' 分';
}

async function submit(ui, name, args, success, feedback, { keepOpen = false, state, isCurrent } = {}) {
  if (state?.pending || (keepOpen && !ui.isActive())) return;
  if (isCurrent && !isCurrent()) {
    ui.refresh();
    return;
  }
  if (state) {
    state.pending = true;
    ui.refresh();
  }
  try {
    if (!await ui.action(name, ...args)) return;
    success?.();
    if (!keepOpen) ui.close();
    if (feedback && (!keepOpen || ui.isActive())) ui.float?.(feedback);
  } finally {
    if (state) state.pending = false;
    if (keepOpen && ui.isActive()) ui.refresh();
  }
}

function currentUpgradeQuote(ui, offer, kind, index, steps, quote) {
  const current = offer(ui.currentWorld(), kind, index, steps);
  return current?.affordable && current.cost === quote.cost && current.target === quote.target;
}

async function clearProduction(ui, action, kind, index, label, panel) {
  if (!await ui.action(action, kind, index)) return;
  ui.local.id = null;
  delete ui.local.positionedSourceId;
  if (panel) panel.close();
  else ui.refresh();
  ui.float?.('已清空' + label);
}

function dialogButtons(ui, label, action, disabled = false, style) {
  ui.buttons([
    { label: '取消', onClick: () => ui.close() },
    { label, tone: 'gold', disabled, onClick: action },
  ], { style });
}

function replacementChoices(dialog, kind, choices, isSelected, onSelect) {
  const iconsOnly = dialog.w.settings.pickerIconsOnly;
  dialog.iconButton(iconsOnly ? 'view-list' : 'view-grid', iconsOnly ? '切换为详细显示' : '切换为仅图标', async () => {
    if (!await dialog.action('updateSettings', { pickerIconsOnly: !iconsOnly })) return;
    dialog.local.scroll = 0;
    dialog.local.indexKeyboard = 0;
    dialog.refresh();
  }, { align: 'right' });
  let assignments;
  if (!iconsOnly) {
    assignments = new Map();
    const slots = isWorkshop(kind) ? dialog.w.stations[kind] : dialog.w.facilities[kind];
    for (const { recipe } of slots) {
      if (recipe) assignments.set(recipe, (assignments.get(recipe) ?? 0) + 1);
    }
  }
  const items = choices.map((id) => ({
    ...productionChoice(dialog.w, kind, id),
    selected: isSelected(id),
    ...(assignments && { assignmentSummary: '已安排 ' + compact(assignments.get(id) ?? 0) + ' 条' }),
  }));
  dialog.choiceGrid(items, onSelect, { iconsOnly });
}

function isWorkshop(kind) {
  return Object.hasOwn(stationNames, kind);
}

function emptySlotName(kind) {
  if (kind === 'C') return '空地';
  return '空' + (stationNames[kind] ?? facilityNames[kind]);
}

function selectionIcon(kind, id) {
  if (kind === 'L') return 'livestock-' + id;
  if (kind === 'F') return 'fish-' + id;
  return id;
}

function productionChoice(world, kind, id) {
  const rate = marketRate(world, id);
  return {
    id, icon: selectionIcon(kind, id), label: isWorkshop(kind) ? itemName(id) : assignedName(id),
    ...(rate && { marketRate: rate }), duration: remainingTime(productionDurationMs(world, id)),
  };
}

function assignmentLabel(kind, occupied) {
  if (isWorkshop(kind)) return occupied ? '更换配方' : '选择配方';
  if (kind === 'C') return occupied ? '换种' : '播种';
  if (kind === 'M') return occupied ? '更换矿种' : '开采';
  return occupied ? '更换品种' : '安排养殖';
}

function batchOutput(world, kind, index, slot, id, upgradeQuote) {
  const workshop = isWorkshop(kind);
  const active = slot.batch;
  const amount = active?.amount ?? (upgradeQuote !== undefined ? upgradeQuote
    : workshop ? stationUpgradeOffer(world, kind, index, 1n) : facilityOffer(world, kind, index, 1n))?.currentOutput;
  if (amount == null) return null;
  return {
    label: active ? '本批' : '下批',
    amount: compact(amount) + (workshop ? ' 件' : ' 份'),
    total: BigInt(amount) * unitPrice(world, id),
  };
}

function batchImpact(dialog, kind, cancelled) {
  if (!cancelled) return;
  dialog.text(isWorkshop(kind)
    ? '将中止 ' + cancelled + ' 个未完成批次，已扣材料退回仓库。'
    : '将中止 ' + cancelled + ' 个未完成批次，这些批次没有收成。', { muted: true });
}

function batchReplace(ui, kind, targets, source, action) {
  const workshop = isWorkshop(kind);
  const title = workshop ? '批量选择配方' : kind === 'C' ? '批量选择作物' : kind === 'L' ? '批量选择牲畜' : kind === 'M' ? '批量选择矿种' : '批量选择鱼种';
  let filter = source;
  let chosen;
  ui.dialog(title, (dlg) => {
    const slots = workshop ? dlg.w.stations[kind] : dlg.w.facilities[kind];
    if (chosen) {
      const { icon, label, marketRate: rate } = productionChoice(dlg.w, kind, chosen);
      dlg.item(icon, label, '应用至 ' + targets.length + ' 处', { marketRate: rate });
      batchImpact(dlg, kind, targets.filter((index) => slots[index]?.batch && slots[index].batch.id !== chosen).length);
      dialogButtons(dlg, '确认' + action, () => submit(dlg, 'assignProductionBatch', [kind, targets, chosen], null, '已应用至 ' + targets.length + ' 处'));
      return;
    }
    if (workshop) dlg.tabs(sources, filter, (value) => {
      filter = value;
      dlg.local.scroll = 0;
      dlg.local.indexKeyboard = 0;
      dlg.refresh();
    }, { sticky: true, style: 'filter', compact: true });
    const choices = workshop ? workshopRecipes(dlg, kind, filter)
      : dlg.w.unlocked.filter((id) => catalog.items[id]?.kind === kind);
    if (!choices.length) {
      dlg.text('暂无符合条件的已研发' + (workshop ? '配方' : '品种') + '。', { muted: true });
      dlg.button('前往研究', () => {
        dlg.close();
        dlg.go('研究', { tab: '品种配方' });
      }, confirm);
      return;
    }
    replacementChoices(dlg, kind, choices, (id) =>
      targets.every((index) => slots[index]?.recipe === id && (!slots[index].batch || slots[index].batch.id === id)), ({ id }) => {
      chosen = id;
      dlg.local.scroll = 0;
      dlg.refresh();
    });
  });
}

function batchClear(ui, kind, targets) {
  const workshop = isWorkshop(kind);
  ui.dialog('批量清空', (dlg) => {
    const slots = workshop ? dlg.w.stations[kind] : dlg.w.facilities[kind];
    const occupied = targets.map((index) => slots[index]).filter((slot) => slot?.recipe || slot?.batch || slot?.planting);
    dlg.row('待清空数量', String(occupied.length));
    batchImpact(dlg, kind, occupied.filter((slot) => slot.batch).length);
    dialogButtons(dlg, '确认清空', () => submit(dlg, 'clearProductionBatch', [kind, targets], null, '已批量清空'), !occupied.length);
  });
}

function batchUpgrade(ui, kind, targets) {
  let steps = batchUpgradeSteps[0];
  let pending = false;
  ui.dialog('批量升级', (dlg) => {
    const quote = batchUpgradeOffer(dlg.w, kind, targets, steps);
    dlg.row('升级数量', String(targets.length));
    if (quote) {
      const slots = isWorkshop(kind) ? dlg.w.stations[kind] : dlg.w.facilities[kind];
      const levels = targets.map((index) => BigInt(slots[index].level));
      const low = levels.reduce((value, level) => level < value ? level : value);
      const high = levels.reduce((value, level) => level > value ? level : value);
      const range = (from, to) => compact(from) + (from === to ? '' : '～' + compact(to)) + ' 级';
      dlg.row('等级', { from: range(low, high), to: range(low + steps, high + steps) }, { style: 'comparison' });
    }
    dlg.buttons(batchUpgradeSteps.map((step) => ({
      label: '+' + step,
      tone: step === steps ? 'gold' : 'plain',
      disabled: pending,
      onClick: () => {
        if (pending) return;
        steps = step;
        dlg.refresh();
      },
    })), { style: 'production' });
    if (quote) dlg.materialTable([{ id: 'coin', label: '金币', owned: dlg.w.coins, needed: quote.cost }], { style: 'balance' });
    dlg.text(isWorkshop(kind) ? '升级从下一批生效，每批材料投入同步增加。'
      : '升级后按新等级计算产出，进行中的批次收获时间不变。', { muted: true });
    dialogButtons(dlg, pending ? '升级中…' : '确认升级', async () => {
      if (pending || !quote?.affordable || !dlg.isActive()) return;
      const current = batchUpgradeOffer(dlg.currentWorld(), kind, targets, steps);
      if (!current?.affordable || current.cost !== quote.cost) {
        dlg.refresh();
        return;
      }
      pending = true;
      dlg.refresh();
      try {
        await dlg.action('upgradeProductionBatch', kind, targets, steps, quote.cost);
      } finally {
        pending = false;
        if (dlg.isActive()) dlg.refresh();
      }
    }, pending || !quote?.affordable);
  });
}

function manageProduction(ui, kind, scope, source) {
  const workshop = isWorkshop(kind);
  const place = stationNames[kind] ?? facilityNames[kind];
  const filterLabel = workshop && source !== sources[0] ? ' · ' + source : '';
  const selected = new Set();
  ui.dialog('批量管理 · ' + place + filterLabel, (dlg) => {
    const list = scope(dlg.w);
    const checked = list.filter(({ index }) => selected.has(index));
    const targets = checked.map(({ index }) => index);
    const upgradeQuote = targets.length ? batchUpgradeOffer(dlg.w, kind, targets, batchUpgradeSteps[0]) : null;
    const canClear = checked.some(({ slot }) => slot.recipe || slot.batch || slot.planting);
    const replaceLabel = assignmentLabel(kind, canClear);
    dlg.row('已选', targets.length + ' / ' + list.length);
    dlg.buttons([
      { label: '全选', disabled: targets.length === list.length, onClick: () => {
        for (const { index } of list) selected.add(index);
        dlg.refresh();
      } },
      { label: '取消选择', disabled: !targets.length, onClick: () => {
        selected.clear();
        dlg.refresh();
      } },
    ]);
    dlg.selectionGrid(list.map(({ slot, index }) => {
      const id = slot.batch?.id ?? slot.recipe;
      const output = id ? batchOutput(dlg.w, kind, index, slot, id) : null;
      const slotLabel = '#' + (index + 1) + ' · ' + compact(slot.level) + ' 级';
      return {
        id: index,
        icon: id ?? (emptyStationArt[kind] ?? emptyFacilityArt[kind]),
        label: id ? itemName(id) : emptySlotName(kind),
        detail: output ? slotLabel + '\n' + output.label + ' ' + output.amount + '\n总价 ' + compact(output.total) : slotLabel,
        marketRate: marketRate(dlg.w, id), selected: selected.has(index),
      };
    }), ({ id }) => {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      dlg.refresh();
    });
    dlg.buttons([
      { label: replaceLabel, disabled: !targets.length, onClick: () => batchReplace(dlg, kind, targets, source, replaceLabel) },
      { label: '清空', disabled: !canClear, onClick: () => batchClear(dlg, kind, targets) },
      { label: '升级', tone: 'gold', disabled: !upgradeQuote?.affordable,
        onClick: () => batchUpgrade(dlg, kind, targets) },
    ], { style: 'production' });
  });
}

function productionLayout(ui, kind, list, scope, source) {
  const zoomedOut = Boolean(ui.local.compactProduction);
  function zoom(value) {
    ui.local.compactProduction = value;
    ui.refresh();
  }
  ui.buttons([
    { label: '批量管理', tone: 'gold', disabled: !list.length, onClick: () => manageProduction(ui, kind, scope, source) },
    { label: '缩小', disabled: zoomedOut, onClick: () => zoom(true) },
    { label: '放大', disabled: !zoomedOut, onClick: () => zoom(false) },
  ], { style: 'production' });
  return zoomedOut;
}

function compactProductionCard(ui, kind, index, slot, source) {
  const workshop = isWorkshop(kind);
  const id = slot.batch?.id ?? slot.recipe;
  const openDetails = () => workshop ? stationDetails(ui, kind, index, true) : facilityDetails(ui, kind, index, true);
  const choose = workshop ? () => chooseRecipe(ui, kind, index, source) : () => chooseFacility(ui, kind, index);
  const improve = workshop ? () => improveStation(ui, kind, index) : () => improveFacility(ui, kind, index);
  const offer = workshop ? stationUpgradeOffer : facilityOffer;
  const upgradeQuote = offer(ui.w, kind, index, 1n);
  ui.card((body) => {
    body.row(id ? itemName(id) : emptySlotName(kind), undefined, {
      compact: true, icon: id ?? (emptyStationArt[kind] ?? emptyFacilityArt[kind]),
      marketRate: marketRate(ui.w, id), onClick: openDetails,
    });
    const level = compact(slot.level) + ' 级';
    const status = workshop ? stationBadge(ui.w, slot) : null;
    const textOptions = { fontSize: 13, muted: true };
    if (status?.tone === 'blocked') {
      body.text(level + ' · ', { ...textOptions, suffix: { value: status.label, tone: 'danger' } });
    } else body.text(status ? level + ' · ' + status.label : level, textOptions);
    const output = id ? batchOutput(ui.w, kind, index, slot, id, upgradeQuote) : null;
    if (output) body.text(output.label + ' ' + output.amount + ' · 总价 ' + compact(output.total), { fontSize: 13 });
    if (slot.batch) body.countdown(workshop ? '剩余' : '距收获', {
      type: workshop ? 'station' : 'facility', kind, index,
    }, { format: remainingTime, compact: true });
  }, {
    padding: 7, style: 'production',
    footer: (actions) => actions.buttons([
      { label: assignmentLabel(kind, Boolean(id)), tone: id ? 'plain' : 'green', onClick: choose },
      { label: '升级', tone: 'gold', onClick: improve, disabled: !upgradeQuote?.affordable },
    ]),
  });
}

function chooseFacility(ui, kind, index) {
  const crop = kind === 'C';
  const title = crop ? '选择作物' : kind === 'L' ? '选择牲畜' : kind === 'M' ? '选择矿种' : '选择鱼种';
  const assignLabel = assignmentLabel(kind, false);
  const replaceLabel = assignmentLabel(kind, true);
  ui.dialog(title, (dlg) => {
    const facility = dlg.w.facilities[kind][index];
    if (!facility) return;
    const choices = dlg.w.unlocked.filter((id) => catalog.items[id]?.kind === kind);
    const label = facility.batch ? replaceLabel : assignLabel;
    if (facility.batch) dlg.text('更换品种后立即开始新一批，当前未完成的批次没有收成。', { muted: true });
    if (!choices.length) {
      dlg.text('研发对应品种后即可安排。');
      dlg.button('前往研究', () => {
        dlg.close();
        dlg.go('研究', { tab: '品种配方' });
      }, confirm);
    } else {
      replacementChoices(dlg, kind, choices, (id) => id === facility.recipe && (!facility.batch || facility.batch.id === id),
        ({ id }) => submit(dlg, 'assignFacility', [kind, index, id], null, '已' + label));
    }
  });
}

function purchaseFacility(ui, kind) {
  const label = purchaseLabels[kind];
  ui.dialog(label, (dlg) => {
    const quote = facilityOffer(dlg.w, kind);
    if (!quote) return;
    dlg.row('金币 · 持有 / 所需', compact(dlg.w.coins) + ' / ' + compact(quote.cost));
    dlg.row('购买后数量', compact(BigInt(dlg.w.facilities[kind].length) + 1n));
    dialogButtons(dlg, '确认购买', () => submit(dlg, 'buyFacility', [kind], () => {
      ui.local.focusPurchasedKind = kind;
    }), !quote.affordable);
  });
}

function improveFacility(ui, kind, index) {
  let selected = upgradeOptions[0];
  const state = { pending: false };
  ui.dialog('升级' + facilityNames[kind], (dlg) => {
    const facility = dlg.w.facilities[kind][index];
    if (!facility) return;
    const quote = facilityOffer(dlg.w, kind, index, selected.steps);
    if (!quote) return;
    if (facility.recipe) {
      dlg.feature(facilityImage(kind, facility.recipe), (copy) => {
        copy.heading(assignedName(facility.recipe), { style: 'production' });
      }, { ratio: 0.37, style: 'upgrade', artAspect: 0.82, align: 'center' });
    }
    dlg.buttons(upgradeOptions.map((option) => ({
      label: option.label,
      tone: option === selected ? 'gold' : 'plain',
      disabled: state.pending,
      onClick: () => {
        if (state.pending) return;
        selected = option;
        dlg.refresh();
      },
    })), { style: 'production' });
    const level = compact(facility.level);
    const target = compact(quote.target);
    dlg.row('等级', { from: level, to: target }, { style: 'comparison' });
    if (quote.output != null) {
      const outputId = facility.batch?.id ?? facility.recipe;
      const current = quote.currentOutput ?? facility.batch?.amount;
      const from = current == null ? undefined : compact(current);
      const to = compact(quote.output);
      dlg.row((facility.batch ? '本批' : '每批') + itemName(outputId), from == null ? to : { from, to }, {
        style: 'comparison', icon: outputId,
      });
    }
    if (facility.batch && quote.nextOutput != null &&
      (facility.batch.id !== facility.recipe || quote.nextOutput !== quote.output || quote.currentNextOutput !== quote.currentOutput)) {
      dlg.row('下批产出', { from: compact(quote.currentNextOutput), to: compact(quote.nextOutput) }, {
        style: 'comparison', icon: facility.recipe,
      });
    }
    dlg.materialTable([{ id: 'coin', label: '金币', owned: dlg.w.coins, needed: quote.cost }], { style: 'balance' });
    dlg.text(facility.batch ? '升级后本批产出立即增加，收获时间不变。' : '升级后每批产出立即生效。', { muted: true });
    dialogButtons(dlg, state.pending ? '升级中…' : '确认升级', () => submit(dlg, 'upgradeFacility', [kind, index, selected.steps], null,
      '升至 ' + compact(quote.target) + ' 级', {
        keepOpen: true, state,
        isCurrent: () => currentUpgradeQuote(dlg, facilityOffer, kind, index, selected.steps, quote),
      }), state.pending || !quote.affordable, 'production');
  }, { variant: 'facility-upgrade' });
}

function facilityDetails(ui, kind, index, compactMode = false) {
  ui.dialog(facilityNames[kind] + '详情', (dlg) => {
    const facility = dlg.w.facilities[kind][index];
    if (!facility) return;
    const id = facility.batch?.id ?? facility.recipe;
    if (id) facilityPreview(dlg, kind, id);
    dlg.row('等级', compact(facility.level) + ' 级');
    if (id) {
      const todayRate = marketRate(dlg.w, id);
      dlg.row('产出品项', itemName(id), todayRate && assignedName(id) !== itemName(id) ? { valueMarketRate: todayRate } : undefined);
      dlg.row('仓库库存', compact(quantity(dlg.w, id)) + ' 份');
      if (facility.batch) {
        dlg.row('本批产出', compact(facility.batch.amount) + ' 份');
        dlg.countdown('距收获', { type: 'facility', kind, index }, { format: remainingTime });
      }
      if (facility.recipe && facility.recipe !== facility.batch?.id) {
        const nextName = assignedName(facility.recipe);
        dlg.row('下批安排', nextName, { valueMarketRate: nextName === itemName(facility.recipe) ? marketRate(dlg.w, facility.recipe) : 0 });
      }
      if (facility.recipe) {
        const output = facilityOffer(dlg.w, kind, index, 1n)?.currentNextOutput;
        if (output != null && output !== facility.batch?.amount) dlg.row('下批产出', compact(output) + ' 份');
        dlg.row('下批耗时', remainingTime(productionDurationMs(dlg.w, facility.recipe)));
      }
    }
    if (compactMode && id) {
      const label = facilityNames[kind];
      dlg.button('清空' + label, () => clearProduction(ui, 'clearFacility', kind, index, label, dlg));
    } else if (!id) {
      const quote = facilityOffer(dlg.w, kind, index, 1n);
      dlg.button('升级', () => improveFacility(dlg, kind, index), {
        ...confirm, disabled: !quote?.affordable,
      });
    }
  });
}

function facilityCard(ui, kind, index, facility) {
  const crop = kind === 'C';
  const facilityName = facilityNames[kind];
  const active = facility.batch;
  const id = active?.id ?? facility.recipe;
  const item = catalog.items[id];
  const openDetails = () => facilityDetails(ui, kind, index);
  ui.card((body) => {
    if (!item) {
      body.feature(facilityImage(kind), (copy) => {
        copy.heading(crop ? '空地' : '空' + facilityName, { style: 'production' });
        copy.button(assignmentLabel(kind, false), () => chooseFacility(ui, kind, index), {
          tone: 'green', style: 'production',
        });
      }, {
        ratio: 0.36, style: 'facility', artAspect: 0.97, align: 'center', onClick: openDetails,
        animationOnly: Boolean(id),
      });
      return;
    }
    const upgradeQuote = facilityOffer(ui.w, kind, index, 1n);
    const actions = [
      { label: assignmentLabel(kind, true), onClick: () => chooseFacility(ui, kind, index) },
      {
        label: '升级', tone: 'gold', onClick: () => improveFacility(ui, kind, index),
        disabled: !upgradeQuote?.affordable,
      },
    ];
    body.feature(facilityImage(kind, id), (copy) => {
      const level = compact(facility.level) + ' 级';
      const todayRate = marketRate(ui.w, id);
      const name = assignedName(id);
      copy.heading(name, { style: 'production', aside: crop && !todayRate ? level : undefined, marketRate: name === item.name ? todayRate : 0 });
      if (!crop || todayRate) copy.badges([{ label: level }], { style: 'production' });
      const amount = active?.amount ?? upgradeQuote?.currentOutput;
      if (amount != null) {
        copy.row(crop ? '每批收成' : '每批产出 ' + item.name, compact(amount) + ' 份', {
          style: 'metric', icon: id, marketRate: name === item.name ? 0 : todayRate,
        });
        copy.row('总价', compact(BigInt(amount) * unitPrice(ui.w, id)), { style: 'metric' });
      }
      if (active) {
        const reference = { type: 'facility', kind, index };
        copy.countdown('距收获', reference, { format: remainingTime, style: 'metric', icon: 'clock' });
        copy.batchProgress(active, reference);
        if (facility.recipe !== active.id) {
          copy.row(crop ? '下批播种' : '下批安排', assignedName(facility.recipe), { style: 'metric' });
        }
      }
      if (kind !== 'L') copy.buttons(actions, { style: 'production' });
    }, {
      ratio: 0.36, style: 'facility', artAspect: facilityArtAspects[kind], onClick: openDetails,
      animationOnly: true,
      plotAnimation: crop && active ? { batch: active, index } : undefined,
      livestockAnimation: kind === 'L' && active ? { batch: active, index } : undefined,
      fishAnimation: kind === 'F' && active ? { batch: active, index } : undefined,
      miningAnimation: kind === 'M' && active ? { batch: active, index, session: facility.mining } : undefined,
    });
    if (kind === 'L') body.buttons(actions, { style: 'production' });
  }, {
    style: 'production',
    cornerAction: item ? {
      label: '清空' + facilityName,
      onClick: () => clearProduction(ui, 'clearFacility', kind, index, facilityName),
    } : undefined,
  });
}

function sourceSummary(ui, kind, id, note, { buttonTone = 'gold' } = {}) {
  const item = catalog.items[id];
  if (item?.kind?.[0] !== kind) return;
  ui.card((card) => {
    const body = card ?? ui;
    if (kind === 'I' || kind === 'P') {
      const todayRate = marketRate(ui.w, id);
      if (todayRate) body.item(id, item.name, note, { marketRate: todayRate });
      else body.item(id, item.name, note);
    }
    else facilityPreview(body, kind, id, note);
    if (!ui.w.unlocked.includes(id)) {
      body.button('查看研发条件', () => body.go('研究', { tab: '品种配方', id }), { tone: buttonTone });
    }
  });
}

function productionFocusIndex(local, kind, purchasedIndex, sourceId, sourceIndex) {
  if (local.focusPurchasedKind === kind) {
    delete local.focusPurchasedKind;
    return purchasedIndex;
  }
  if (sourceIndex < 0 || local.positionedSourceId === sourceId) return -1;
  local.positionedSourceId = sourceId;
  return sourceIndex;
}

function facilitySlots(world, kind) {
  return world.facilities[kind].map((slot, index) => ({ slot, index }));
}

export function renderProduction(ui, kind = facilityTabs[ui.local.tab] ?? 'C') {
  const scope = (world) => facilitySlots(world, kind);
  const list = scope(ui.w);
  const compactMode = productionLayout(ui, kind, list, scope);
  const focus = catalog.items[ui.local.id]?.kind === kind ? ui.local.id : null;
  const sourceIndex = focus ? list.findIndex(({ slot }) => slot.recipe === focus || slot.batch?.id === focus) : -1;
  if (sourceIndex < 0) sourceSummary(ui, kind, focus, '在' + facilityNames[kind] + '中安排生产');
  if (list.length) {
    const focusIndex = productionFocusIndex(ui.local, kind, list.length - 1, focus, sourceIndex);
    ui.scrollList(list, (cell, { slot, index }) => {
      if (compactMode) compactProductionCard(cell, kind, index, slot);
      else facilityCard(cell, kind, index, slot);
    }, { columns: compactMode ? 'auto' : 1, focusIndex });
  } else {
    const instruction = kind === 'C' ? '购地后即可播种。' : '购买' + facilityNames[kind] + (kind === 'M' ? '后即可开采。' : '后即可安排养殖。');
    ui.card((card) => (card ?? ui).text(instruction, { muted: true }), { style: 'production' });
  }
  const quote = facilityOffer(ui.w, kind);
  ui.button(purchaseLabels[kind], () => purchaseFacility(ui, kind), {
    style: 'production', tone: 'gold',
    disabled: !quote?.affordable,
  });
}

function workshopRecipes(ui, kind, source) {
  return ui.w.unlocked.filter((id) => {
    const item = catalog.items[id];
    return item?.kind?.[0] === kind && (source === sources[0] || item.sources.includes(source));
  });
}

function chooseRecipe(ui, kind, index, source) {
  let sourceFilter = source;
  ui.dialog('选择配方', (dlg) => {
    const station = dlg.w.stations[kind][index];
    if (!station) return;
    const choices = workshopRecipes(dlg, kind, sourceFilter);
    dlg.tabs(sources, sourceFilter, (value) => {
      sourceFilter = value;
      dlg.local.scroll = 0;
      dlg.local.indexKeyboard = 0;
      dlg.refresh();
    }, { sticky: true, style: 'filter', compact: true });
    if (station.batch) {
      dlg.text('改用其他配方会中止本批，已扣材料退回仓库。', { muted: true });
    }
    if (!choices.length) {
      dlg.text('暂无已研发的配方。');
      dlg.button('前往研究', () => {
        dlg.close();
        dlg.go('研究', { tab: '品种配方' });
      }, confirm);
    } else {
      replacementChoices(dlg, kind, choices, (id) => id === station.recipe && (!station.batch || station.batch.id === id),
        ({ id }) => submit(dlg, 'arrangeStation', [kind, index, id], null, station.batch ? '已切换配方' : '已安排配方'));
    }
  });
}

function purchaseStation(ui, kind) {
  const title = '增设' + stationNames[kind];
  ui.dialog(title, (dlg) => {
    const quote = stationOffer(dlg.w, kind);
    if (!quote) return;
    dlg.row('金币 · 持有 / 所需', compact(dlg.w.coins) + ' / ' + compact(quote.cost));
    dlg.row('现有工位', compact(dlg.w.stations[kind].length));
    dialogButtons(dlg, '确认购买', () => submit(dlg, 'buyStation', [kind], () => {
      ui.local['workshopSource' + kind] = sources[0];
      ui.local.focusPurchasedKind = kind;
    }), !quote.affordable);
  });
}

function improveStation(ui, kind, index) {
  let selected = upgradeOptions[0];
  const state = { pending: false };
  ui.dialog('升级' + stationNames[kind], (dlg) => {
    const station = dlg.w.stations[kind][index];
    if (!station) return;
    const quote = stationUpgradeOffer(dlg.w, kind, index, selected.steps);
    if (!quote) return;
    const id = station.recipe ?? station.batch?.id;
    const item = catalog.items[id];
    if (item) dlg.item(id, item.name, item.sources.join(' · '), { marketRate: marketRate(dlg.w, id) });
    dlg.buttons(upgradeOptions.map((option) => ({
      label: option.label,
      tone: option === selected ? 'gold' : 'plain',
      disabled: state.pending,
      onClick: () => {
        if (state.pending) return;
        selected = option;
        dlg.refresh();
      },
    })), { style: 'production' });
    dlg.row('等级', { from: compact(station.level), to: compact(quote.target) }, { style: 'comparison' });
    // An empty station has no next-batch output to compare.
    if (quote.currentOutput != null && quote.output != null) {
      dlg.row('每批产出' + (item ? item.name : ''), {
        from: compact(quote.currentOutput) + ' 件', to: compact(quote.output) + ' 件',
      }, { style: 'comparison', icon: item ? id : undefined });
    }
    dlg.materialTable([{ id: 'coin', label: '金币', owned: dlg.w.coins, needed: quote.cost }], { style: 'balance' });
    dlg.text(station.batch
      ? '升级从下一批起生效，本批产出与已扣材料不变。每批材料投入随等级同步增加。'
      : '升级从下一批起生效。每批材料投入随等级同步增加。', { muted: true });
    dialogButtons(dlg, state.pending ? '升级中…' : '确认升级', () => submit(dlg, 'upgradeStation', [kind, index, selected.steps], null,
      '升至 ' + compact(quote.target) + ' 级', {
        keepOpen: true, state,
        isCurrent: () => currentUpgradeQuote(dlg, stationUpgradeOffer, kind, index, selected.steps, quote),
      }), state.pending || !quote.affordable, 'production');
  }, { variant: 'facility-upgrade' });
}

function sourceButton(ui, id) {
  ui.button('查看来源 · ' + itemName(id), () => {
    ui.close();
    ui.go('图鉴', { id });
  });
}

function requirementRows(ui, recipe, { withLinks = false, style, level = '1' } = {}) {
  if (!recipe) return [];
  const requirements = stationRequirements(ui.w, recipe, BigInt(level));
  if (!requirements.length) return requirements;
  ui.materialTable(requirements.map((row) => ({ ...row, label: itemName(row.id), marketRate: marketRate(ui.w, row.id) })), { style });
  if (withLinks) for (const { id, owned, needed } of requirements) {
    if (owned < needed) sourceButton(ui, id);
  }
  return requirements;
}

function reserveButtons(ui, requirements) {
  const blocked = requirements.filter(({ id, owned, needed }) => owned < needed && quantity(ui.w, id) >= needed);
  for (const { id } of blocked) {
    const label = blocked.length === 1 ? '调整保留量' : '调整保留量 · ' + itemName(id);
    ui.button(label, () => reservePanel(ui, id));
  }
}

function stationBadge(world, station) {
  let label = '等待安排';
  if (station.batch) label = '生产中';
  else if (station.recipe) {
    const requirements = stationRequirements(world, station.recipe, BigInt(station.level));
    const waiting = requirements.filter(({ owned, needed }) => owned < needed);
    label = waiting.length && waiting.every(({ id, needed }) => quantity(world, id) >= needed)
      ? '材料已预留' : '等待材料';
  }
  return { label, tone: station.batch ? 'green' : 'blocked', minCharacters: 5 };
}

function stationProgress(ui, batch, kind, index) {
  const reference = { type: 'station', kind, index };
  ui.countdown('剩余', reference, { format: remainingTime, inactiveText: '暂停', inactiveTone: 'danger' });
  ui.batchProgress(batch, reference);
}

function openSources(ui, requirements) {
  const waitingFor = requirements.filter(({ owned, needed }) => owned < needed);
  const materials = waitingFor.length ? waitingFor : requirements;
  if (materials.length === 1) {
    ui.go('图鉴', { id: materials[0].id });
    return;
  }
  ui.dialog('查看材料来源', (dlg) => {
    for (const { id } of materials) sourceButton(dlg, id);
  });
}

function stationDetails(ui, kind, index, compactMode = false) {
  ui.dialog(stationNames[kind] + '详情', (dlg) => {
    const station = dlg.w.stations[kind][index];
    if (!station) return;
    const active = station.batch;
    const id = active?.id ?? station.recipe;
    const item = catalog.items[id];
    const quote = stationUpgradeOffer(dlg.w, kind, index, 1n);
    const output = quote?.currentOutput;
    dlg.badges([stationBadge(dlg.w, station)], { style: 'production' });
    dlg.row('等级', compact(station.level) + ' 级');
    if (item) {
      dlg.item(id, item.name, item.sources.join(' · '), { marketRate: marketRate(dlg.w, id) });
      dlg.row('当前库存', compact(quantity(dlg.w, id)));
      dlg.row(active ? '本批产出' : '每批产出', compact(active?.amount ?? output) + ' 件');
      if (active && output != null && output !== active.amount) dlg.row('下批产出', compact(output) + ' 件');
      stationProgress(dlg, active, kind, index);
      const next = catalog.items[station.recipe];
      if (next) {
        dlg.row('下批配方', next.name, { valueMarketRate: marketRate(dlg.w, station.recipe) });
        dlg.row('下批耗时', remainingTime(productionDurationMs(dlg.w, station.recipe)));
        const level = stationMultiplier(station.level);
        const materialValue = Object.entries(next.inputs).reduce(
          (sum, [material, amount]) => sum + marketUnitPrice(dlg.w, material) * BigInt(amount) * level, 0n,
        );
        const valueAdded = marketUnitPrice(dlg.w, station.recipe) * output - materialValue;
        dlg.row('直接机会增值', compact(valueAdded) + ' 金币');
        if (valueAdded < 0n) {
          dlg.text('当前成品售价低于材料直售价值；研发和任务仍可能需要此产物。', { muted: true });
        }
        dlg.text('材料', { muted: true });
        const requirements = requirementRows(dlg, station.recipe, { withLinks: true, level: station.level });
        if (compactMode && requirements.length && requirements.every(({ owned, needed }) => owned >= needed)) {
          dlg.button('查看来源', () => openSources(dlg, requirements));
        }
        reserveButtons(dlg, requirements);
      }
    } else stationProgress(dlg, active, kind, index);
    dlg.row('用料优先级', station.priority ? '优先' : '普通');
    dlg.buttons([
      {
        label: station.priority ? '设为普通' : '设为优先',
        onClick: async () => {
          if (!await dlg.action('setStationPriority', kind, index, !station.priority)) return;
          dlg.float?.(station.priority ? '已设为普通' : '已设为优先');
          dlg.refresh();
        },
      },
      {
        label: '升级', tone: 'gold', onClick: () => improveStation(dlg, kind, index),
        disabled: !quote?.affordable,
      },
    ], { style: 'production' });
    if (compactMode && id) {
      const label = stationNames[kind];
      dlg.button('清空' + label, () => clearProduction(ui, 'clearStation', kind, index, label, dlg));
    }
  });
}

function stationCard(ui, kind, index, station, source) {
  const active = station.batch;
  const id = active?.id ?? station.recipe;
  const item = catalog.items[id];
  const badge = stationBadge(ui.w, station);
  const level = { label: compact(station.level) + ' 级' };
  const openDetails = () => stationDetails(ui, kind, index);
  const upgradeQuote = stationUpgradeOffer(ui.w, kind, index, 1n);
  const upgrade = {
    label: '升级', tone: 'gold', onClick: () => improveStation(ui, kind, index),
    disabled: !upgradeQuote?.affordable,
  };
  ui.card((body) => {
    if (!item) {
      body.feature(emptyStationArt[kind], (copy) => {
        copy.heading('空' + stationNames[kind], { style: 'production' });
        copy.badges([level, badge], { style: 'production' });
        copy.buttons([
          { label: '选择配方', tone: 'green', onClick: () => chooseRecipe(ui, kind, index, source) },
          upgrade,
        ], { style: 'production' });
      }, {
        ratio: 0.35, style: 'workshop', align: 'center', onClick: openDetails,
        animationOnly: Boolean(id),
      });
      stationProgress(body, active, kind, index);
      return;
    }
    const complexity = kind === 'P' ? productComplexity(item) : item.sources[0];
    body.feature(id, (copy) => {
      copy.heading(item.name, { style: 'production', marketRate: marketRate(ui.w, id) });
      copy.badges([
        { label: complexity },
        level,
        badge,
      ], { style: 'production' });
      copy.stats([
        { label: '当前库存', value: compact(quantity(ui.w, id)) },
        {
          label: active ? '本批产出' : '每批产出',
          value: compact(active?.amount ?? upgradeQuote?.currentOutput) + ' 件',
        },
      ], { style: 'workshop' });
    }, {
      onClick: openDetails, workshopAnimation: { kind, index, id },
    });
    stationProgress(body, active, kind, index);
    body.text('材料', { muted: true });
    const requirements = requirementRows(body, station.recipe, { style: 'workshop', level: station.level });
    const actions = [{ label: '更换配方', onClick: () => chooseRecipe(ui, kind, index, source) }];
    if (requirements.length) actions.push({ label: '查看来源', onClick: () => openSources(ui, requirements) });
    actions.push(upgrade);
    body.buttons(actions, { style: 'production' });
    reserveButtons(body, requirements);
  }, {
    style: 'production',
    bleedWorkshopArt: Boolean(item),
    cornerAction: item ? {
      label: '清空' + stationNames[kind],
      outline: 0xffffff,
      onClick: () => clearProduction(ui, 'clearStation', kind, index, stationNames[kind]),
    } : undefined,
  });
}

function workshopSlots(world, kind, source) {
  return world.stations[kind].map((slot, index) => ({ slot, index })).filter(({ slot }) => {
    if (source === sources[0] || (!slot.recipe && !slot.batch)) return true;
    const current = catalog.items[slot.batch?.id];
    const next = catalog.items[slot.recipe];
    return current?.sources.includes(source) || next?.sources.includes(source);
  });
}

export function renderWorkshop(ui, kind = ui.local.tab === '精制' ? 'P' : 'I') {
  const local = ui.local;
  const sourceKey = 'workshopSource' + kind;
  const focus = catalog.items[local.id]?.kind?.[0] === kind ? local.id : null;
  const source = !focus && sources.includes(local[sourceKey]) ? local[sourceKey] : sources[0];
  ui.tabs(sources, source, (value) => {
    local[sourceKey] = value;
    local.id = null;
    delete local.positionedSourceId;
    local.scroll = 0;
    ui.refresh();
  }, { style: 'filter', compact: true });
  const scope = (world) => workshopSlots(world, kind, source);
  const list = scope(ui.w);
  const compactMode = productionLayout(ui, kind, list, scope, source);
  const sourceIndex = focus ? list.findIndex(({ slot }) => slot.recipe === focus || slot.batch?.id === focus) : -1;
  if (sourceIndex < 0) sourceSummary(ui, kind, focus, '在' + stationNames[kind] + '中选择对应配方', { buttonTone: 'plain' });
  if (list.length) {
    const focusIndex = productionFocusIndex(local, kind, list.length - 1, focus, sourceIndex);
    ui.scrollList(list, (cell, { slot, index }) => {
      if (compactMode) compactProductionCard(cell, kind, index, slot, source);
      else stationCard(cell, kind, index, slot, source);
    }, { columns: compactMode ? 'auto' : 1, focusIndex });
  } else ui.text('没有符合筛选条件的工位。', { muted: true });
  const quote = stationOffer(ui.w, kind);
  ui.button('增设' + stationNames[kind], () => purchaseStation(ui, kind), {
    style: 'production', tone: 'gold', disabled: !quote?.affordable,
  });
}
