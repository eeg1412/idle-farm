import {
  catalog, facilityOffer, productionDurationMs, quantity, stationOffer, stationRequirements, stationUpgradeOffer,
} from '../game/world.js';
import { unitPrice } from '../game/advancement.js';
import { objectives } from '../game/objectives.js';
import { reservePanel } from './management-pages.js';
import { compact } from './numbers.js';

const productionTabs = ['田地', '畜牧', '鱼池'];
const workshopTabs = ['加工', '精制'];
const sources = ['全部', '农业', '畜牧', '水产'];
const facilityKinds = ['C', 'L', 'F'];
const facilityNames = { C: '田地', L: '畜牧场', F: '鱼池' };
const facilityHeroes = { C: 'fields', L: 'livestock', F: 'fish' };
const facilityHeroHeights = { C: 0.45, L: 0.45, F: 0.45 };
const facilityArtAspects = { C: 1.06, L: 1.11, F: 1.20 };
const emptyFacilityArt = { C: 'scene-empty-field', L: 'scene-empty-barn', F: 'scene-empty-pond' };
const purchaseLabels = { C: '购地', L: '购买畜牧场', F: '购买鱼池' };
const stationNames = { I: '加工位', P: '精制位' };
const emptyStationArt = { I: 'facility-mill', P: 'facility-kitchen' };
const upgradeOptions = [
  { label: '+1', steps: 1n }, { label: '+10', steps: 10n },
  { label: '+100', steps: 100n }, { label: '最高可升', steps: 'max' },
];

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
    copy.heading(assignedName(id), { size: 18 });
    if (note) copy.text(note, { fontSize: 13, muted: true });
  }, { ratio: 0.23, artAspect: facilityArtAspects[kind], align: 'center' });
}

function remainingTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return seconds + ' 秒';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? minutes + ' 分 ' + remainder + ' 秒' : minutes + ' 分';
}

async function submit(ui, name, args, success, feedback) {
  if (!await ui.action(name, ...args)) return;
  success?.();
  ui.close();
  if (feedback) ui.float?.(feedback);
}

async function clearProduction(ui, action, kind, index, label) {
  if (!await ui.action(action, kind, index)) return;
  ui.local.id = null;
  delete ui.local.positionedSourceId;
  ui.refresh();
  ui.float?.('已清空' + label);
}

function dialogButtons(ui, label, action, disabled = false, style) {
  ui.buttons([
    { label: '取消', onClick: () => ui.close() },
    { label, tone: 'gold', disabled, onClick: action },
  ], { style });
}

function replacementChoices(dialog, items, onSelect) {
  const iconsOnly = dialog.w.settings.pickerIconsOnly;
  dialog.iconButton(iconsOnly ? 'view-list' : 'view-grid', iconsOnly ? '切换为详细显示' : '切换为仅图标', async () => {
    if (!await dialog.action('updateSettings', { pickerIconsOnly: !iconsOnly })) return;
    dialog.local.scroll = 0;
    dialog.local.indexKeyboard = 0;
    dialog.refresh();
  }, { align: 'right' });
  dialog.choiceGrid(items, onSelect, { iconsOnly });
}

function chooseFacility(ui, kind, index) {
  const crop = kind === 'C';
  const title = crop ? '选择作物' : kind === 'L' ? '选择牲畜' : '选择鱼种';
  const assignLabel = crop ? '播种' : '安排养殖';
  const replaceLabel = crop ? '换种' : '更换';
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
      replacementChoices(dlg, choices.map((id) => ({
        id,
        icon: kind === 'L' ? 'livestock-' + id : kind === 'F' ? 'fish-' + id : id,
        label: assignedName(id),
        duration: remainingTime(productionDurationMs(dlg.w, id)),
        selected: id === facility.recipe && (!facility.batch || facility.batch.id === id),
      })), ({ id }) => submit(dlg, 'assignFacility', [kind, index, id], null, '已' + label));
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
      onClick: () => {
        selected = option;
        dlg.refresh();
      },
    })), { style: 'production' });
    const level = compact(facility.level);
    const target = compact(quote.target);
    dlg.row('等级', { from: level, to: target }, { style: 'comparison' });
    if (quote.output != null) {
      const current = quote.currentOutput ?? facility.batch?.amount;
      const from = current == null ? undefined : compact(current);
      const to = compact(quote.output);
      dlg.row('每批' + itemName(facility.recipe), from == null ? to : { from, to }, {
        style: 'comparison', icon: facility.recipe,
      });
    }
    dlg.materialTable([{ id: 'coin', label: '金币', owned: dlg.w.coins, needed: quote.cost }], { style: 'balance' });
    dlg.text(facility.batch ? '升级后本批产出立即增加，收获时间不变。' : '升级后每批产出立即生效。', { muted: true });
    dialogButtons(dlg, '确认升级', () => submit(dlg, 'upgradeFacility', [kind, index, selected.steps], null,
      '升至 ' + compact(quote.target) + ' 级'), !quote.affordable, 'production');
  }, { variant: 'facility-upgrade' });
}

function facilityDetails(ui, kind, index) {
  ui.dialog(facilityNames[kind] + '详情', (dlg) => {
    const facility = dlg.w.facilities[kind][index];
    if (!facility) return;
    const id = facility.batch?.id ?? facility.recipe;
    if (id) facilityPreview(dlg, kind, id);
    dlg.row('等级', compact(facility.level) + ' 级');
    if (id) {
      dlg.row('产出品项', itemName(id));
      dlg.row('仓库库存', compact(quantity(dlg.w, id)) + ' 份');
      if (facility.batch) {
        dlg.row('本批产出', compact(facility.batch.amount) + ' 份');
        dlg.countdown('距收获', { type: 'facility', kind, index }, { format: remainingTime });
      }
      if (facility.recipe && facility.recipe !== facility.batch?.id) {
        dlg.row('下批安排', assignedName(facility.recipe));
      }
      if (facility.recipe) dlg.row('下批耗时', remainingTime(productionDurationMs(dlg.w, facility.recipe)));
    }
    if (!id) dlg.button('升级', () => improveFacility(dlg, kind, index), confirm);
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
        copy.button(crop ? '播种' : '安排养殖', () => chooseFacility(ui, kind, index), {
          tone: 'green', style: 'production',
        });
      }, {
        ratio: 0.36, style: 'facility', artAspect: 0.97, align: 'center', onClick: openDetails,
        animationOnly: Boolean(id),
      });
      return;
    }
    const actions = [
      { label: crop ? '换种' : '更换', onClick: () => chooseFacility(ui, kind, index) },
      { label: '升级', tone: 'gold', onClick: () => improveFacility(ui, kind, index) },
    ];
    body.feature(facilityImage(kind, id), (copy) => {
      const level = compact(facility.level) + ' 级';
      copy.heading(assignedName(id), { style: 'production', aside: crop ? level : undefined });
      if (!crop) copy.badges([{ label: level }], { style: 'production' });
      const amount = active?.amount ?? facilityOffer(ui.w, kind, index)?.currentOutput;
      if (amount != null) {
        copy.row(crop ? '每批收成' : '每批产出 ' + item.name, compact(amount) + ' 份', { style: 'metric', icon: id });
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
    if (kind === 'I' || kind === 'P') body.item(id, item.name, note);
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

export function renderProduction(ui) {
  const tab = productionTabs.includes(ui.local.tab) ? ui.local.tab : productionTabs[0];
  const kind = facilityKinds[productionTabs.indexOf(tab)];
  ui.image(facilityHeroes[kind], Math.round(ui.width * facilityHeroHeights[kind]), { title: facilityNames[kind] });
  ui.tabs(productionTabs, tab, (value) => {
    ui.local.tab = value;
    ui.local.id = null;
    delete ui.local.positionedSourceId;
    ui.refresh();
  }, { sticky: true, style: 'segmented' });
  const quote = facilityOffer(ui.w, kind);
  ui.titleBar(kind === 'C' ? '种植地块' : kind === 'L' ? '养殖场地' : '养殖鱼池', purchaseLabels[kind], () => purchaseFacility(ui, kind), {
    style: 'production', tone: 'green', disabled: quote?.atLimit,
  });
  if (kind === 'C') {
    const taskState = objectives(ui.w);
    const objective = taskState.active ? taskState.guide.find((task) => !task.done && !task.branch) : null;
    if (objective) {
      const earnForLand = objective.id === 'firstPlot' && ui.w.coins < quote.cost;
      ui.button(earnForLand ? '扩建田地 · 前往出货' : '任务 · ' + objective.name,
        () => ui.go(earnForLand ? '仓库' : '任务'));
    }
  }
  const list = ui.w.facilities[kind];
  const focus = catalog.items[ui.local.id]?.kind === kind ? ui.local.id : null;
  const sourceIndex = focus ? list.findIndex((facility) => facility.recipe === focus || facility.batch?.id === focus) : -1;
  if (sourceIndex < 0) sourceSummary(ui, kind, focus, '在' + facilityNames[kind] + '中安排生产');
  if (!list.length) {
    const instruction = kind === 'C' ? '购地后即可播种。' : '购买' + facilityNames[kind] + '后即可安排养殖。';
    ui.card((card) => (card ?? ui).text(instruction, { muted: true }), { style: 'production' });
    return;
  }
  const focusIndex = productionFocusIndex(ui.local, kind, list.length - 1, focus, sourceIndex);
  ui.scrollList(list, (cell, facility, index) => facilityCard(cell, kind, index, facility), { focusIndex });
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
    }, { sticky: true, style: 'filter' });
    if (station.batch) {
      const refund = station.batch.inputs == null ? '早期记录缺少材料明细，本批材料无法退回。' : '已扣材料退回仓库。';
      dlg.text('改用其他配方会中止本批。' + refund, { muted: true });
    }
    if (!choices.length) {
      dlg.text('暂无已研发的配方。');
      dlg.button('前往研究', () => {
        dlg.close();
        dlg.go('研究', { tab: '品种配方' });
      }, confirm);
    } else {
      replacementChoices(dlg, choices.map((id) => ({
        id,
        icon: id,
        label: itemName(id),
        duration: remainingTime(productionDurationMs(dlg.w, id)),
        selected: id === station.recipe && (!station.batch || station.batch.id === id),
      })), ({ id }) => submit(dlg, 'arrangeStation', [kind, index, id], null,
        station.batch ? '已切换配方' : '已安排配方'));
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

function stationOutput(world, kind, index) {
  return stationUpgradeOffer(world, kind, index, 1n)?.currentOutput;
}

function improveStation(ui, kind, index) {
  let selected = upgradeOptions[0];
  ui.dialog('升级' + stationNames[kind], (dlg) => {
    const station = dlg.w.stations[kind][index];
    if (!station) return;
    const quote = stationUpgradeOffer(dlg.w, kind, index, selected.steps);
    if (!quote) return;
    const id = station.recipe ?? station.batch?.id;
    const item = catalog.items[id];
    if (item) dlg.item(id, item.name, item.sources.join(' · '));
    dlg.buttons(upgradeOptions.map((option) => ({
      label: option.label,
      tone: option === selected ? 'gold' : 'plain',
      onClick: () => {
        selected = option;
        dlg.refresh();
      },
    })), { style: 'production' });
    dlg.row('等级', { from: compact(station.level), to: compact(quote.target) }, { style: 'comparison' });
    // An empty station (or a legacy batch without a recipe) has no next-batch output to compare.
    if (quote.currentOutput != null && quote.output != null) {
      dlg.row('每批产出' + (item ? item.name : ''), {
        from: compact(quote.currentOutput) + ' 件', to: compact(quote.output) + ' 件',
      }, { style: 'comparison', icon: item ? id : undefined });
    }
    dlg.materialTable([{ id: 'coin', label: '金币', owned: dlg.w.coins, needed: quote.cost }], { style: 'balance' });
    dlg.text(station.batch
      ? '升级从下一批起生效，本批产出与已扣材料不变。每批材料投入随等级同步增加。'
      : '升级从下一批起生效。每批材料投入随等级同步增加。', { muted: true });
    dialogButtons(dlg, '确认升级', () => submit(dlg, 'upgradeStation', [kind, index, selected.steps], null,
      '升至 ' + compact(quote.target) + ' 级'), !quote.affordable, 'production');
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
  ui.materialTable(requirements.map((row) => ({ ...row, label: itemName(row.id) })), { style });
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
    const requirements = stationRequirements(world, station.recipe, BigInt(station.level ?? '1'));
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

function stationDetails(ui, kind, index) {
  ui.dialog(stationNames[kind] + '详情', (dlg) => {
    const station = dlg.w.stations[kind][index];
    if (!station) return;
    const active = station.batch;
    const id = active?.id ?? station.recipe;
    const item = catalog.items[id];
    const output = stationOutput(dlg.w, kind, index);
    dlg.badges([stationBadge(dlg.w, station)], { style: 'production' });
    dlg.row('等级', compact(station.level) + ' 级');
    if (item) {
      dlg.item(id, item.name, item.sources.join(' · '));
      dlg.row('当前库存', compact(quantity(dlg.w, id)));
      dlg.row(active ? '本批产出' : '每批产出', compact(active?.amount ?? output) + ' 件');
      if (active && output != null && output !== active.amount) dlg.row('下批产出', compact(output) + ' 件');
      stationProgress(dlg, active, kind, index);
      const next = catalog.items[station.recipe];
      if (next) {
        dlg.row('下批配方', next.name);
        dlg.row('下批耗时', remainingTime(productionDurationMs(dlg.w, station.recipe)));
        const level = BigInt(station.level);
        const materialValue = Object.entries(next.inputs).reduce(
          (sum, [material, amount]) => sum + unitPrice(dlg.w, material) * BigInt(amount) * level, 0n,
        );
        const valueAdded = unitPrice(dlg.w, station.recipe) * (output ?? BigInt(next.output) * level) - materialValue;
        dlg.row('直接机会增值', compact(valueAdded) + ' 金币');
        if (valueAdded < 0n) {
          dlg.text('当前成品售价低于材料直售价值；研发和任务仍可能需要此产物。', { muted: true });
        }
        dlg.text('材料', { muted: true });
        const requirements = requirementRows(dlg, station.recipe, { withLinks: true, level: station.level });
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
      { label: '升级', tone: 'gold', onClick: () => improveStation(dlg, kind, index) },
    ], { style: 'production' });
  });
}

function stationCard(ui, kind, index, station, source) {
  const active = station.batch;
  const id = active?.id ?? station.recipe;
  const item = catalog.items[id];
  const badge = stationBadge(ui.w, station);
  const level = { label: compact(station.level) + ' 级' };
  const openDetails = () => stationDetails(ui, kind, index);
  // Workshop rows: 升级 is always the rightmost and the only gold button.
  const upgrade = { label: '升级', tone: 'gold', onClick: () => improveStation(ui, kind, index) };
  ui.card((body) => {
    if (!item) {
      body.feature(emptyStationArt[kind], (copy) => {
        copy.heading('空' + stationNames[kind], { style: 'production' });
        copy.badges([level, badge], { style: 'production' });
        copy.buttons([
          { label: '选择配方', onClick: () => chooseRecipe(ui, kind, index, source) },
          upgrade,
        ], { style: 'production' });
      }, {
        ratio: 0.35, style: 'workshop', align: 'center', onClick: openDetails,
        animationOnly: Boolean(id),
      });
      stationProgress(body, active, kind, index);
      return;
    }
    const complexity = kind === 'P' ? ['单类', '双类', '三类'][item.sources.length - 1] : item.sources[0];
    body.feature(id, (copy) => {
      copy.heading(item.name, { style: 'production' });
      copy.badges([
        { label: complexity },
        level,
        badge,
      ], { style: 'production' });
      copy.stats([
        { label: '当前库存', value: compact(quantity(ui.w, id)) },
        { label: active ? '本批产出' : '每批产出', value: compact(active?.amount ?? stationOutput(ui.w, kind, index)) + ' 件' },
      ], { style: 'workshop' });
    }, {
      ratio: 0.35, style: 'workshop', artAspect: 1, onClick: openDetails,
      animationOnly: true,
      workshopAnimation: { kind, index, id },
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
    cornerAction: item ? {
      label: '清空' + stationNames[kind],
      onClick: () => clearProduction(ui, 'clearStation', kind, index, stationNames[kind]),
    } : undefined,
  });
}

export function renderWorkshop(ui) {
  const local = ui.local;
  const tab = workshopTabs.includes(local.tab) ? local.tab : workshopTabs[0];
  const kind = tab === '精制' ? 'P' : 'I';
  const sourceKey = 'workshopSource' + kind;
  const focus = catalog.items[local.id]?.kind?.[0] === kind ? local.id : null;
  const source = !focus && sources.includes(local[sourceKey]) ? local[sourceKey] : sources[0];
  const scrolls = local.workshopScrolls ??= {};
  if (local.activeWorkshopTab !== tab) {
    local.activeWorkshopTab = tab;
    local.scroll = focus ? 0 : scrolls[tab] ?? 0;
  }
  local.onScrollChange = (scroll) => { scrolls[tab] = scroll; };
  ui.image('workshop', Math.round(ui.width * 0.35));
  ui.tabs(workshopTabs, tab, (value) => {
    if (value === tab) return;
    scrolls[tab] = local.scroll;
    local.tab = value;
    local.id = null;
    delete local.positionedSourceId;
    ui.refresh();
  }, { keepScroll: true, sticky: true, style: 'segmented' });
  ui.tabs(sources, source, (value) => {
    local[sourceKey] = value;
    local.id = null;
    delete local.positionedSourceId;
    local.scroll = 0;
    ui.refresh();
  }, { style: 'filter' });
  const list = ui.w.stations[kind].map((station, index) => ({ station, index })).filter(({ station }) => {
    if (source === sources[0] || (!station.recipe && !station.batch)) return true;
    const current = catalog.items[station.batch?.id];
    const next = catalog.items[station.recipe];
    return current?.sources.includes(source) || next?.sources.includes(source);
  });
  const sourceIndex = focus ? list.findIndex(({ station }) => station.recipe === focus || station.batch?.id === focus) : -1;
  if (sourceIndex < 0) sourceSummary(ui, kind, focus, '在' + stationNames[kind] + '中选择对应配方', { buttonTone: 'plain' });
  if (list.length) {
    const focusIndex = productionFocusIndex(local, kind, list.length - 1, focus, sourceIndex);
    ui.scrollList(list, (cell, { station, index }) => stationCard(cell, kind, index, station, source), { focusIndex });
  } else ui.text('没有符合筛选条件的工位。', { muted: true });
  const quote = stationOffer(ui.w, kind);
  if (quote) ui.button('增设' + stationNames[kind], () => purchaseStation(ui, kind), {
    style: 'production', tone: 'plain', disabled: quote.atLimit,
  });
}
