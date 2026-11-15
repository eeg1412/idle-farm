import {
  catalog, facilityOffer, productionDurationMs, quantity, stationOffer, stationRequirements,
} from '../game/world.js';
import { unitPrice } from '../game/advancement.js';
import { objectives } from '../game/objectives.js';
import { reservePanel } from './management-pages.js';
import { compact } from './numbers.js';
import { livestockSpecies } from './livestock-animation.js';

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
const facilityPageSize = 6;
const stationPageSize = 4;

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

function visibleItems(items, index, size) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.max(0, Math.min(index ?? 0, pages - 1));
  return {
    entries: items.slice(page * size, (page + 1) * size),
    page, pages, offset: page * size,
  };
}

function paginate(ui, view, select) {
  if (view.pages <= 1) return;
  ui.row('页数', (view.page + 1) + ' / ' + view.pages);
  ui.buttons([
    { label: '上一页', disabled: view.page === 0, onClick: () => select(view.page - 1) },
    { label: '下一页', disabled: view.page + 1 >= view.pages, onClick: () => select(view.page + 1) },
  ]);
}

async function submit(ui, name, args, success, feedback) {
  if (!await ui.action(name, ...args)) return;
  success?.();
  ui.close();
  if (feedback) ui.float?.(feedback);
}

function dialogButtons(ui, label, action, disabled = false, style) {
  ui.buttons([
    { label: '取消', onClick: () => ui.close() },
    { label, tone: 'gold', disabled, onClick: action },
  ], { style });
}

function replacementChoices(dialog, items, onSelect) {
  const iconsOnly = dialog.w.settings.pickerIconsOnly;
  dialog.button(iconsOnly ? '显示：仅图标' : '显示：详细', async () => {
    if (!await dialog.action('updateSettings', { pickerIconsOnly: !iconsOnly })) return;
    dialog.local.scroll = 0;
    dialog.local.indexKeyboard = 0;
    dialog.refresh();
  }, { maxWidth: 150 });
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
        dlg.go('研究', { tab: '品种与配方' });
      }, confirm);
    } else {
      replacementChoices(dlg, choices.map((id) => ({
        id,
        icon: kind === 'L' ? 'livestock-' + id : id,
        label: assignedName(id),
        duration: remainingTime(productionDurationMs(dlg.w, id)),
        selected: id === facility.recipe && (!facility.batch || facility.batch.id === id),
      })), ({ id }) => submit(dlg, 'assignFacility', [kind, index, id], null, '已' + label));
    }
    dlg.button('关闭', () => dlg.close());
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
      ui.local['facilityPage' + kind] = Math.floor(dlg.w.facilities[kind].length / facilityPageSize);
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
    dlg.row('等级', level + ' → ' + target, { style: 'comparison', from: level, to: target });
    if (quote.output != null) {
      const current = quote.currentOutput ?? facility.batch?.amount;
      const from = current == null ? undefined : compact(current);
      const to = compact(quote.output);
      dlg.row('每批' + itemName(facility.recipe), from == null ? to : from + ' → ' + to, {
        style: 'comparison', icon: facility.recipe, from, to,
      });
    }
    dlg.materialTable([{ id: 'coin', label: '金币', owned: dlg.w.coins, needed: quote.cost }], { style: 'balance' });
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
        dlg.row('距收获', remainingTime(facility.batch.end - dlg.w.clockMs));
      }
      if (facility.recipe && facility.recipe !== facility.batch?.id) {
        dlg.row('下批安排', assignedName(facility.recipe));
      }
      if (facility.recipe) dlg.row('下批耗时', remainingTime(productionDurationMs(dlg.w, facility.recipe)));
    }
    if (!id) dlg.button('升级', () => improveFacility(dlg, kind, index), confirm);
    dlg.button('关闭', () => dlg.close());
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
      }, { ratio: 0.36, style: 'facility', artAspect: 0.97, align: 'center', onClick: openDetails });
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
        copy.row('距收获', remainingTime(active.end - ui.w.clockMs), { style: 'metric', icon: 'clock' });
        copy.batchProgress(active);
        if (facility.recipe !== active.id) {
          copy.row(crop ? '下批播种' : '下批安排', assignedName(facility.recipe), { style: 'metric' });
        }
      }
      if (kind !== 'L') copy.buttons(actions, { style: 'production' });
    }, {
      ratio: 0.36, style: 'facility', artAspect: facilityArtAspects[kind], onClick: openDetails,
      plotAnimation: crop && active ? { batch: active, index } : undefined,
      livestockAnimation: kind === 'L' && active && Object.hasOwn(livestockSpecies, active.id)
        ? { batch: active, index } : undefined,
    });
    if (kind === 'L') body.buttons(actions, { style: 'production' });
  }, { style: 'production' });
}

function sourceSummary(ui, kind, id, note) {
  const item = catalog.items[id];
  if (item?.kind?.[0] !== kind) return;
  ui.card((card) => {
    const body = card ?? ui;
    if (kind === 'I' || kind === 'P') body.item(id, item.name, note);
    else facilityPreview(body, kind, id, note);
    if (!ui.w.unlocked.includes(id)) {
      body.button('查看研发条件', () => body.go('研究', { tab: '品种与配方', id }), confirm);
    }
  });
}

export function renderProduction(ui) {
  const tab = productionTabs.includes(ui.local.tab) ? ui.local.tab : productionTabs[0];
  const kind = facilityKinds[productionTabs.indexOf(tab)];
  ui.image(facilityHeroes[kind], Math.round(ui.width * facilityHeroHeights[kind]), { title: facilityNames[kind] });
  ui.tabs(productionTabs, tab, (value) => {
    ui.local.tab = value;
    ui.local.id = null;
    ui.refresh();
  }, { style: 'segmented' });
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
  const focusIndex = focus ? list.findIndex((facility) => facility.recipe === focus || facility.batch?.id === focus) : -1;
  if (focusIndex < 0) sourceSummary(ui, kind, focus, '在' + facilityNames[kind] + '中安排生产');
  if (!list.length) {
    const instruction = kind === 'C' ? '购地后即可播种。' : '购买' + facilityNames[kind] + '后即可安排养殖。';
    ui.card((card) => (card ?? ui).text(instruction, { muted: true }), { style: 'production' });
    return;
  }
  const pageKey = 'facilityPage' + kind;
  const page = focusIndex < 0 ? ui.local[pageKey] : Math.floor(focusIndex / facilityPageSize);
  const view = visibleItems(list, page, facilityPageSize);
  for (const [index, facility] of view.entries.entries()) {
    facilityCard(ui, kind, index + view.offset, facility);
  }
  paginate(ui, view, (page) => {
    ui.local.id = null;
    ui.local[pageKey] = page;
    ui.refresh();
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
    }, { sticky: true, style: 'filter' });
    if (station.batch) {
      const refund = station.batch.inputs == null ? '早期记录缺少材料明细，本批材料无法退回。' : '已扣材料退回仓库。';
      dlg.text('改用其他配方会中止本批。' + refund, { muted: true });
    }
    if (!choices.length) {
      dlg.text('暂无已研发的配方。');
      dlg.button('前往研究', () => {
        dlg.close();
        dlg.go('研究', { tab: '品种与配方' });
      }, confirm);
    } else {
      dlg.text('新配方立即生效，材料齐备时开工。', { muted: true });
      replacementChoices(dlg, choices.map((id) => ({
        id,
        icon: id,
        label: itemName(id),
        duration: remainingTime(productionDurationMs(dlg.w, id)),
        selected: id === station.recipe && (!station.batch || station.batch.id === id),
      })), ({ id }) => submit(dlg, 'arrangeStation', [kind, index, id], null,
        station.batch ? '已切换配方' : '已安排配方'));
    }
    dlg.button('关闭', () => dlg.close());
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
      ui.local['stationPage' + kind] = Math.floor(dlg.w.stations[kind].length / stationPageSize);
    }), !quote.affordable);
  });
}

function sourceButton(ui, id) {
  ui.button('查看来源 · ' + itemName(id), () => {
    ui.close();
    ui.go('图鉴', { id });
  });
}

function requirementRows(ui, recipe, { withLinks = false, style } = {}) {
  if (!recipe) return [];
  const requirements = stationRequirements(ui.w, recipe);
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
    const requirements = stationRequirements(world, station.recipe);
    const waiting = requirements.filter(({ owned, needed }) => owned < needed);
    label = waiting.length && waiting.every(({ id, needed }) => quantity(world, id) >= needed)
      ? '材料已预留' : '等待材料';
  }
  return { label, tone: station.batch ? 'green' : 'blocked', minCharacters: 5 };
}

function stationProgress(ui, batch) {
  ui.row('剩余', batch ? remainingTime(batch.end - ui.w.clockMs) : '暂停',
    { tone: batch ? 'plain' : 'danger' });
  ui.batchProgress(batch);
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
    dlg.button('关闭', () => dlg.close());
  });
}

function stationDetails(ui, kind, index) {
  ui.dialog(stationNames[kind] + '详情', (dlg) => {
    const station = dlg.w.stations[kind][index];
    if (!station) return;
    const active = station.batch;
    const id = active?.id ?? station.recipe;
    const item = catalog.items[id];
    dlg.badges([stationBadge(dlg.w, station)], { style: 'production' });
    if (item) {
      dlg.item(id, item.name, item.sources.join(' · '));
      dlg.row('当前库存', compact(quantity(dlg.w, id)));
      dlg.row(active ? '本批产出' : '每批产出', compact(active?.amount ?? item.output) + ' 件');
      stationProgress(dlg, active);
      const next = catalog.items[station.recipe];
      if (next) {
        dlg.row('下批配方', next.name);
        dlg.row('下批耗时', remainingTime(productionDurationMs(dlg.w, station.recipe)));
        const materialValue = Object.entries(next.inputs).reduce(
          (sum, [material, amount]) => sum + unitPrice(dlg.w, material) * BigInt(amount), 0n,
        );
        const valueAdded = unitPrice(dlg.w, station.recipe) * BigInt(next.output) - materialValue;
        dlg.row('加工增值', compact(valueAdded) + ' 金币');
        dlg.text('材料', { muted: true });
        const requirements = requirementRows(dlg, station.recipe, { withLinks: true });
        reserveButtons(dlg, requirements);
      }
    } else stationProgress(dlg, active);
    dlg.row('用料优先级', station.priority ? '优先' : '普通');
    dlg.button(station.priority ? '设为普通' : '设为优先', async () => {
      if (!await dlg.action('setStationPriority', kind, index, !station.priority)) return;
      dlg.float?.(station.priority ? '已设为普通' : '已设为优先');
      dlg.refresh();
    });
    dlg.button('关闭', () => dlg.close());
  });
}

function stationCard(ui, kind, index, station, source) {
  const active = station.batch;
  const id = active?.id ?? station.recipe;
  const item = catalog.items[id];
  const badge = stationBadge(ui.w, station);
  const openDetails = () => stationDetails(ui, kind, index);
  ui.card((body) => {
    if (!item) {
      body.feature(emptyStationArt[kind], (copy) => {
        copy.heading('空' + stationNames[kind], { style: 'production' });
        copy.badges([badge], { style: 'production' });
        copy.button('选择配方', () => chooseRecipe(ui, kind, index, source), { tone: 'gold', style: 'production' });
      }, { ratio: 0.35, style: 'workshop', align: 'center', onClick: openDetails });
      stationProgress(body, active);
      return;
    }
    const complexity = kind === 'P' ? ['单类', '双类', '三类'][item.sources.length - 1] : item.sources[0];
    body.feature(id, (copy) => {
      copy.heading(item.name, { style: 'production' });
      copy.badges([
        { label: complexity },
        badge,
      ], { style: 'production' });
      copy.stats([
        { label: '当前库存', value: compact(quantity(ui.w, id)) },
        { label: active ? '本批产出' : '每批产出', value: compact(active?.amount ?? item.output) + ' 件' },
      ], { style: 'workshop' });
    }, { ratio: 0.35, style: 'workshop', artAspect: 1.10, onClick: openDetails });
    stationProgress(body, active);
    body.text('材料', { muted: true });
    const requirements = requirementRows(body, station.recipe, { style: 'workshop' });
    const actions = [{ label: '更换配方', tone: 'gold', onClick: () => chooseRecipe(ui, kind, index, source) }];
    if (requirements.length) actions.push({ label: '查看来源', tone: 'gold', onClick: () => openSources(ui, requirements) });
    body.buttons(actions, { style: 'production' });
    reserveButtons(body, requirements);
  }, { style: 'production' });
}

export function renderWorkshop(ui) {
  const local = ui.local;
  const tab = workshopTabs.includes(local.tab) ? local.tab : workshopTabs[0];
  const kind = tab === '精制' ? 'P' : 'I';
  const sourceKey = 'workshopSource' + kind;
  const focus = catalog.items[local.id]?.kind?.[0] === kind ? local.id : null;
  const source = !focus && sources.includes(local[sourceKey]) ? local[sourceKey] : sources[0];
  const pageKey = 'stationPage' + kind;
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
    ui.refresh();
  }, { keepScroll: true, sticky: true, style: 'segmented' });
  ui.tabs(sources, source, (value) => {
    local[sourceKey] = value;
    local.id = null;
    local[pageKey] = 0;
    local.scroll = 0;
    ui.refresh();
  }, { style: 'filter' });
  const list = ui.w.stations[kind].map((station, index) => ({ station, index })).filter(({ station }) => {
    if (source === sources[0] || (!station.recipe && !station.batch)) return true;
    const current = catalog.items[station.batch?.id];
    const next = catalog.items[station.recipe];
    return current?.sources.includes(source) || next?.sources.includes(source);
  });
  const focusIndex = focus ? list.findIndex(({ station }) => station.recipe === focus || station.batch?.id === focus) : -1;
  if (focusIndex < 0) sourceSummary(ui, kind, focus, '在' + stationNames[kind] + '中选择对应配方');
  const page = focusIndex < 0 ? local[pageKey] : Math.floor(focusIndex / stationPageSize);
  const view = visibleItems(list, page, stationPageSize);
  for (const { station, index } of view.entries) stationCard(ui, kind, index, station, source);
  if (!list.length) ui.text('没有符合筛选条件的工位。', { muted: true });
  paginate(ui, view, (page) => {
    local.id = null;
    local[pageKey] = page;
    local.scroll = 0;
    ui.refresh();
  });
  const quote = stationOffer(ui.w, kind);
  if (quote) ui.button('增设' + stationNames[kind], () => purchaseStation(ui, kind), {
    style: 'production', tone: 'gold', disabled: quote.atLimit,
  });
}
