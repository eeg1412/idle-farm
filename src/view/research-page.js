import { catalog, quantity } from '../game/world.js';
import { basicResearchHourlyRate, researchOffer, techDefinitions, techOffer, unitPrice } from '../game/advancement.js';
import { qualityDrawCost, qualityDrawOffer } from '../game/quality.js';
import { hoursLabel } from './management-pages.js';
import { compact } from './numbers.js';

const recipeTab = '品种配方';
const qualityTab = '品质';
const techTab = '经营改良';
const tabs = [recipeTab, qualityTab, techTab];
const sources = ['全部', '农业', '畜牧', '水产'];
const kinds = ['全部', '原料', '中间产物', '商品'];
const techSources = ['全部', '通用', ...sources.slice(1), '市场'];
// Crop uses include new recipes made with previously available ingredients.
const cropUseRanges = {
  纺织与染料: [['C', 51, 52], ['C', 57, 61], ['I', 101, 102], ['I', 109, 117],
    ['P', 151, 152], ['P', 155, 155], ['P', 161, 169]],
  药草: [['C', 53, 54], ['C', 62, 65], ['I', 103, 104], ['I', 118, 122],
    ['P', 153, 154], ['P', 170, 175]],
  酿造: [['C', 55, 56], ['C', 66, 68], ['I', 105, 108], ['I', 123, 127],
    ['P', 156, 160], ['P', 176, 180]],
};
const cropUses = ['全部用途', ...Object.keys(cropUseRanges)];
const catalogItems = Object.entries(catalog.items);
const recipeResearch = Object.entries(catalog.research);
const techByKey = Object.fromEntries(techDefinitions.map((definition) => [definition.key, definition]));
const livestockArt = {
  L01: 'facility-hen',
  L02: 'facility-buffalo',
  L03: 'facility-mallard',
  L04: 'facility-goat',
  L05: 'facility-goose',
  L06: 'facility-pig',
  L07: 'facility-rabbit',
  L08: 'facility-sheep',
  L09: 'facility-muscovy',
  L10: 'facility-cattle',
};
const techSourceArt = {
  通用: 'nav-research',
  农业: 'tech-farm',
  畜牧: 'tech-livestock',
  水产: 'tech-water',
};
const techArt = {
  appraisal: 'sale-retain',
  delegation: 'clock',
  workshopSpeed: 'tech-workshop',
  fishBuy: 'facility-fish',
  fishUpgrade: 'facility-empty-pond',
  basicResearchRate: 'tech-basic-research-rate',
  marketManipulation: 'tech-market-manipulation',
  marketForecast: 'tech-market-forecast',
  marketPromotion: 'tech-market-promotion',
  premiumSales: 'tech-premium-sales',
};

function itemKind(item) {
  if (item.kind.startsWith('P')) return '商品';
  if (item.kind.startsWith('I')) return '中间产物';
  return '原料';
}

function researchName(item) {
  return item.subject ?? item.name;
}

function researchIcon(id) {
  return livestockArt[id] ?? id;
}

function techIcon(definition) {
  return techArt[definition.key] ?? techSourceArt[definition.source];
}

function duration(milliseconds) {
  const deciseconds = Math.ceil(milliseconds / 100);
  if (deciseconds >= 36000) return hoursLabel(deciseconds / 10);
  const minutes = Math.floor(deciseconds / 600);
  const seconds = (deciseconds % 600) / 10;
  return minutes ? `${compact(minutes)} 分钟${seconds ? ` ${seconds} 秒` : ''}` : `${seconds} 秒`;
}

function showMaterials(ui, costs, coins, title) {
  const rows = costs.map(([id, needed]) => ({
    id, label: catalog.items[id].name, owned: quantity(ui.w, id), needed,
  }));
  rows.push({ id: 'coin', label: '金币', owned: ui.w.coins, needed: coins });
  ui.materialTable(rows, { style: 'research', title });
}

function showMaterialSources(ui, costs) {
  if (!costs.length) return;
  ui.button('查看材料来源', () => {
    ui.dialog('材料来源', (dialog) => {
      const rows = costs.map(([id]) => {
        const item = catalog.items[id];
        return {
          label: item.name, value: item.sources.join('、'), icon: id,
          onClick: () => dialog.go('图鉴', { id }),
        };
      });
      dialog.detailRows(rows, { variant: 'stack' });
    });
  });
}

function researchStatus(w, id, offer, unlocked = null) {
  if (unlocked ? unlocked.has(id) : w.unlocked.includes(id)) return { status: '已研发', tone: 'done' };
  if (offer?.eligible && offer.affordable) return { status: '可研发', tone: 'ready' };
  if (offer?.eligible) return { status: '材料不足', tone: 'locked' };
  return { status: '前置未完成', tone: 'locked' };
}

function researchDetails(ui, id) {
  const item = catalog.items[id];
  const node = catalog.research[id];
  const offer = researchOffer(ui.w, id);
  const { status, tone } = researchStatus(ui.w, id, offer);
  ui.feature(researchIcon(id), (content) => {
    content.heading(researchName(item), { size: 30 });
    content.badges([{ label: status, tone: tone === 'ready' ? 'gold' : tone === 'done' ? 'green' : 'plain' }],
      { style: 'production' });
  }, { ratio: 0.42, surface: 'none', align: 'center', style: 'research' });

  ui.detailRows([
    { label: '解锁', value: item.name, icon: id },
    { label: '单价（金币）', value: compact(unitPrice(ui.w, id)) },
    { label: itemKind(item) === '原料' ? '基础周期' : '基础耗时', value: duration(item.durationMs) },
  ], { variant: 'label' });
  if (node?.requires.length) {
    ui.heading('研发前置');
    const prerequisites = node.requires.map((key) => ({
      label: researchName(catalog.items[key]), icon: researchIcon(key),
      value: ui.w.unlocked.includes(key) ? '已研发' : '未研发',
      onClick: () => showResearch(ui, key),
    }));
    ui.detailRows(prerequisites, { variant: 'stack' });
  }

  if (!offer) {
    if (ui.w.unlocked.includes(id)) ui.button('查看来源', () => ui.go('图鉴', { id }));
    return;
  }

  showMaterials(ui, offer.costs, offer.coins, '研发所需材料');
  ui.buttons([
    {
      label: '研发', tone: 'gold', disabled: !offer.eligible || !offer.affordable,
      onClick: async () => {
        if (await ui.action('research', id)) ui.close();
      },
    },
  ], { style: 'production' });
  showMaterialSources(ui, offer.costs);
}

function showResearch(ui, id) {
  ui.dialog(researchName(catalog.items[id]), (dialog) => researchDetails(dialog, id));
}

function showQualityDrawResults(ui, result) {
  ui.dialog('品质抽取结果', (dialog) => {
    dialog.row('完成抽取', compact(result.count) + ' 次');
    dialog.scrollList(Object.entries(result.gains).sort(([a], [b]) => a.localeCompare(b)), (row, [id, gain]) => {
      row.row(catalog.items[id].name, '+' + compact(gain) + ' 级', { icon: id });
    });
  });
}

function renderQuality(ui) {
  ui.stats([{ label: '普通研发点', value: ui.w.basicResearchPoints, icon: 'research-point-basic' }]);
  ui.researchProgress();
  ui.text(`每小时发放 ${basicResearchHourlyRate(ui.w)} 普通研发点。每抽消耗 ${qualityDrawCost} 点，随机提升一个已研发品项的品质。`,
    { muted: true });
  const single = qualityDrawOffer(ui.w, 'single');
  const all = qualityDrawOffer(ui.w, 'all');
  ui.buttons([
    { label: '抽取一次', tone: 'gold', disabled: !single.affordable, onClick: () => submit(single) },
    { label: `全部抽取（${compact(all.count)} 次）`, disabled: !all.affordable, onClick: () => submit(all) },
  ], { style: 'production', size: 'large' });

  async function submit(offer) {
    const result = await ui.action('drawQuality', offer.mode, offer);
    if (result) showQualityDrawResults(ui, result);
  }
  const unlocked = new Set(ui.w.unlocked);
  ui.heading('已研发品项品质');
  ui.indexRows(catalogItems.filter(([id]) => unlocked.has(id)).map(([id, item]) => ({
    icon: id, label: item.name, status: '品质 ' + compact(ui.w.quality[id] ?? 1n) + ' 级',
  })));
}

function techEffect(offer, key) {
  const transition = (current, next) => offer.maxed ? current : { from: current, to: next };
  const { label, current, next, unit } = offer.effect;
  const prefix = label.endsWith('费用降低') ? '降低' : label === '生产提速' ? '提速' : '';
  const effect = (value) => {
    if (unit === '分钟') {
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      return (hours ? `${hours}小时` : '') + (minutes ? `${minutes}分钟` : '');
    }
    if (key === 'marketForecast') return value ? '可查看' : '未解锁';
    if (key === 'premiumSales') return `${value.toFixed(2)} ${unit}`;
    if (unit === '次' || unit === '点') return `${value} ${unit}`;
    return `${prefix}${value}${unit}`;
  };
  return { label, value: transition(effect(current), effect(next)) };
}

function techRequirements(ui, definition) {
  const rows = [];
  if (definition.prerequisite && (ui.w.tech[definition.prerequisite] ?? 0) < definition.prerequisiteLevel) {
    const prerequisite = techByKey[definition.prerequisite];
    rows.push({
      label: `${prerequisite.name} ${definition.prerequisiteLevel} 级`,
      icon: techIcon(prerequisite),
      value: '未达成',
      onClick: () => showTech(ui, prerequisite),
    });
  }
  if (definition.item && !ui.w.unlocked.includes(definition.item)) {
    const item = catalog.items[definition.item];
    rows.push({
      label: `已研发${researchName(item)}`,
      icon: researchIcon(definition.item),
      value: '未达成',
      onClick: () => showResearch(ui, definition.item),
    });
  }
  if (!rows.length) return;
  ui.heading('研发前置');
  ui.detailRows(rows, { variant: 'stack' });
}

function techDetails(ui, definition) {
  const offer = techOffer(ui.w, definition.key);
  if (!offer) return;
  ui.feature(techIcon(definition), (content) => {
    content.heading(definition.name, { size: 30 });
    const level = offer.maxed ? { label: `${offer.maxLevel} 级 · 已满级` }
      : { from: compact(offer.level), to: compact(offer.level + 1) + ' 级' };
    content.badges([level], { style: 'production' });
    content.detailRows([techEffect(offer, definition.key)], { variant: 'stack' });
  }, {
    ratio: 0.42,
    surface: definition.source === '水产' ? 'water' : undefined,
    align: 'center',
    style: 'research',
  });
  techRequirements(ui, definition);
  if (offer.maxed) return;
  ui.materialTable([{ id: 'research-point', label: '高级研发点', owned: ui.w.researchPoints, needed: offer.cost }],
    { style: 'research' });
  ui.buttons([
    {
      label: '确认升级', tone: 'gold', disabled: !offer.eligible || !offer.affordable,
      onClick: async () => {
        if (await ui.action('upgradeTech', definition.key)) ui.close();
      },
    },
  ], { style: 'production' });
}

function showTech(ui, definition) {
  ui.dialog(definition.name, (dialog) => techDetails(dialog, definition));
}

function researchNodes(w) {
  const unlocked = new Set(w.unlocked);
  return catalogItems.map(([id, item]) => ({
    id, label: researchName(item), icon: researchIcon(id),
    requires: catalog.research[id]?.requires ?? [],
    ...researchStatus(w, id, researchOffer(w, id, unlocked), unlocked),
  }));
}

function techNodes(w) {
  return techDefinitions.map((definition) => {
    const { key, name, prerequisite, source } = definition;
    const offer = techOffer(w, key);
    const level = `${compact(offer.level)} 级`;
    let status = `${level} · 点数不足`;
    let tone = 'locked';
    if (offer.maxed) {
      status = `${level} · 已满级`;
      tone = 'done';
    } else if (!offer.eligible) {
      status = `${level} · 条件未满足`;
    } else if (offer.affordable) {
      status = `${level} · 可升级`;
      tone = 'ready';
    }
    return {
      id: key, label: name, icon: techIcon(definition), status, tone, group: source,
      requires: prerequisite ? [prerequisite] : [],
    };
  });
}

function showNodeFinder(ui, nodes, view, active) {
  const efficiency = active === techTab;
  const recipes = active === recipeTab;
  ui.dialog('查找节点', (dialog) => {
    const local = dialog.local;
    const source = local.source ?? sources[0];
    const kind = local.kind ?? kinds[0];
    const status = local.status ?? '全部状态';
    const cropUse = local.cropUse ?? cropUses[0];
    const showCropUses = !efficiency && (source === sources[0] || source === '农业');
    const cropRanges = showCropUses ? cropUseRanges[cropUse] : undefined;
    const select = (key, value) => {
      local[key] = value;
      local.indexKeyboard = 0;
      local.scroll = 0;
      dialog.refresh();
    };
    dialog.tabs(efficiency ? techSources : sources, source, (value) => select('source', value), { style: 'filter' });
    if (showCropUses) dialog.tabs(cropUses, cropUse, (value) => select('cropUse', value), { style: 'filter' });
    if (!efficiency) dialog.tabs(kinds, kind, (value) => select('kind', value), { style: 'filter' });
    if (recipes) dialog.tabs(['全部状态', '已研发', '可研发'], status,
      (value) => select('status', value), { style: 'filter' });
    const matches = nodes.filter((node) => {
      const { id } = node;
      if (recipes && status !== '全部状态' && node.status !== status) return false;
      if (efficiency) return source === sources[0] || techByKey[id].source === source;
      const item = catalog.items[id];
      const matchesSource = source === sources[0] || item.sources.includes(source);
      const rank = Number(id.slice(1));
      const matchesUse = !cropRanges || cropRanges.some(([prefix, first, last]) =>
        item.kind === prefix && rank >= first && rank <= last);
      return matchesSource && matchesUse && (kind === kinds[0] || itemKind(item) === kind);
    });
    if (!matches.length) dialog.text('没有符合筛选的节点', { muted: true });
    dialog.indexRows(matches, ({ id }) => {
      view.focus = id;
      dialog.close();
    });
  });
}

export function researchReadyTabs(world) {
  const readyTabs = new Set();
  const unlocked = new Set(world.unlocked);
  if (recipeResearch.some(([id, node]) => {
    if (unlocked.has(id) || !node.requires.every((required) => unlocked.has(required))) return false;
    const offer = researchOffer(world, id, unlocked);
    return offer?.eligible && offer.affordable;
  })) readyTabs.add(recipeTab);

  if (qualityDrawOffer(world).affordable) readyTabs.add(qualityTab);

  if (techDefinitions.some(({ key }) => {
    const offer = techOffer(world, key);
    return offer?.eligible && offer.affordable;
  })) readyTabs.add(techTab);
  return readyTabs;
}

export function renderResearch(ui, readyTabs = researchReadyTabs(ui.w)) {
  const local = ui.local;
  const { id, openResearchItem } = local;
  const linked = id && catalog.items[id];
  const requested = tabs.includes(local.tab) ? local.tab : recipeTab;
  const active = linked && (requested === techTab ||
    (requested === qualityTab && !ui.w.unlocked.includes(id))) ? recipeTab : requested;
  local.tab = active;
  local.activeResearchTab = active;
  const panels = local.researchPanels ?? (local.researchPanels = {});
  const view = panels[active] ?? (panels[active] = {});
  if (linked) local.linkedResearchItem = id;
  delete local.id;
  delete local.openResearchItem;

  ui.tabs(tabs, active, (tab) => {
    if (tab === active) return;
    local.tab = tab;
    delete local.linkedResearchItem;
    ui.refresh();
  }, { keepScroll: true, sticky: true, style: 'segmented', indicatorTabs: readyTabs });
  const efficiency = active === techTab;
  const quality = active === qualityTab;
  if (quality) {
    renderQuality(ui);
    return;
  }
  if (efficiency) ui.balance('高级研发点', ui.w.researchPoints, { variant: 'efficiency', icon: 'research-point' });
  const nodes = efficiency ? techNodes(ui.w) : researchNodes(ui.w);
  const select = (key) => efficiency ? showTech(ui, techByKey[key]) : showResearch(ui, key);
  if (linked && openResearchItem) {
    view.focus = id;
    select(id);
  }
  ui.tree({ nodes, view,
    groups: efficiency ? techSources.slice(1) : undefined,
    onSelect: select, onFind: () => showNodeFinder(ui, nodes, view, active) });
}
