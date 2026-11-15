import { catalog, facilityOffer, productionDurationMs, quantity } from '../game/world.js';
import { qualityOffer, researchOffer, techDefinitions, techOffer } from '../game/advancement.js';
import { compact } from './numbers.js';

const tabs = ['品种与配方', '品质', '经营改良'];
const sources = ['全部', '农业', '畜牧', '水产'];
const kinds = ['全部', '原料', '中间产物', '商品'];
const techSources = ['全部', '通用', ...sources.slice(1)];
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
const qualitySteps = [['+1', 1n], ['+10', 10n], ['+100', 100n], ['最高可升', 'max']];
const techByKey = Object.fromEntries(techDefinitions.map((definition) => [definition.key, definition]));
const facilityBuy = { cropBuy: 'C', livestockBuy: 'L', fishBuy: 'F' };
const facilityUpgrade = { cropUpgrade: 'C', livestockUpgrade: 'L', fishUpgrade: 'F' };
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
      dialog.button('返回', () => dialog.close());
    });
  });
}

function researchStatus(w, id, offer) {
  if (w.unlocked.includes(id)) return { status: '已研发', tone: 'done' };
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
    ui.button('返回', ui.close);
    return;
  }

  showMaterials(ui, offer.costs, offer.coins, '研发所需材料');
  ui.buttons([
    { label: '返回', onClick: ui.close },
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

function qualityDetails(ui, id, local) {
  const item = catalog.items[id];
  const selected = local.step ?? 1n;
  const offer = qualityOffer(ui.w, id, selected);
  if (!offer) return;
  const { current, target, currentPrice, nextPrice, coins, costs } = offer;
  ui.feature(id === 'F01' ? 'scene-fish' : id, (content) => {
    content.heading(item.name, { size: 30 });
    content.detailRows([
      { label: '品质', value: `${compact(current)} → ${compact(target)}` },
      { label: '单价', value: `${compact(currentPrice)} → ${compact(nextPrice)}` },
    ], { variant: 'pill' });
  }, { ratio: 0.36, surface: item.kind === 'F' ? 'water' : undefined, align: 'center', style: 'research' });
  ui.buttons(qualitySteps.map(([label, step]) => ({
    label, tone: step === selected ? 'gold' : 'plain',
    onClick: () => { local.step = step; ui.refresh(); },
  })), { style: 'production' });
  showMaterials(ui, costs, coins, '升级所需材料');
  ui.buttons([
    { label: '关闭', onClick: ui.close },
    {
      label: '确认升级', tone: 'gold', disabled: !offer.affordable,
      onClick: () => ui.action('upgradeQuality', id, target - current),
    },
  ], { style: 'production', size: 'large' });
  showMaterialSources(ui, costs);
}

function showQuality(ui, id) {
  const local = { step: 1n };
  ui.dialog(catalog.items[id].name, (dialog) => qualityDetails(dialog, id, local));
}

function techEffect(w, definition, offer) {
  const key = definition.key;
  const upgraded = offer.maxed ? w : { ...w, tech: { ...w.tech, [key]: offer.level + 1 } };
  const transition = (current, next) => offer.maxed ? current : `${current} → ${next}`;
  const buy = facilityBuy[key];
  const upgrade = facilityUpgrade[key];
  if (buy) {
    return {
      label: '建造价格', icon: 'operation-upgrade',
      value: transition(compact(facilityOffer(w, buy).cost), compact(facilityOffer(upgraded, buy).cost)),
    };
  }
  if (upgrade && w.facilities[upgrade].length) {
    return {
      label: '首座设施升级', icon: 'operation-upgrade',
      value: transition(compact(facilityOffer(w, upgrade, 0).cost), compact(facilityOffer(upgraded, upgrade, 0).cost)),
    };
  }
  if (key === 'workshopSpeed') {
    return {
      label: '面粉每批耗时', icon: 'clock',
      value: transition(duration(productionDurationMs(w, 'I01')), duration(productionDurationMs(upgraded, 'I01'))),
    };
  }
  const { label, current, next, unit } = offer.effect;
  return { label, value: transition(`${current}${unit}`, `${next}${unit}`) };
}

function techRequirements(ui, definition) {
  const rows = [];
  if (definition.prerequisite) {
    const prerequisite = techByKey[definition.prerequisite];
    rows.push({
      label: `${prerequisite.name} 5 级`,
      icon: techIcon(prerequisite),
      value: techOffer(ui.w, prerequisite.key).maxed ? '已达成' : '未达成',
      onClick: () => showTech(ui, prerequisite),
    });
  }
  if (definition.item) {
    const item = catalog.items[definition.item];
    rows.push({
      label: `已研发${researchName(item)}`,
      icon: researchIcon(definition.item),
      value: ui.w.unlocked.includes(definition.item) ? '已达成' : '未达成',
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
    const level = offer.maxed ? '5 级 · 已满级' : `${compact(offer.level)} → ${compact(offer.level + 1)} 级`;
    content.badges([{ label: level }], { style: 'production' });
    content.detailRows([techEffect(ui.w, definition, offer)], { variant: 'stack' });
  }, {
    ratio: 0.42,
    surface: definition.source === '水产' ? 'water' : undefined,
    align: 'center',
    style: 'research',
  });
  ui.text(definition.description, { muted: true });
  techRequirements(ui, definition);
  if (offer.maxed) {
    ui.button('返回', ui.close);
    return;
  }
  ui.heading('高级研发点', { size: 21 });
  ui.materialTable([{ id: 'coin', label: '高级研发点', owned: ui.w.researchPoints, needed: offer.cost }], { style: 'research' });
  ui.buttons([
    { label: '返回', onClick: ui.close },
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
  return catalogItems.map(([id, item]) => ({
    id, label: researchName(item), icon: researchIcon(id),
    requires: catalog.research[id]?.requires ?? [],
    ...researchStatus(w, id, researchOffer(w, id)),
  }));
}

function qualityNodes(w) {
  return catalogItems.filter(([id]) => w.unlocked.includes(id)).map(([id, item]) => {
    const offer = qualityOffer(w, id);
    return {
      id, label: item.name, icon: id, requires: [],
      status: `品质 ${compact(offer.current)}`, tone: offer.affordable ? 'ready' : 'neutral',
      nextLabel: `品质 ${compact(offer.target)}`,
    };
  });
}

function techNodes(w) {
  return techDefinitions.map((definition) => {
    const { key, name, prerequisite } = definition;
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
      id: key, label: name, icon: techIcon(definition), status, tone,
      requires: prerequisite ? [prerequisite] : [],
    };
  });
}

function showNodeFinder(ui, nodes, view, efficiency, quality) {
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
    if (!efficiency && !quality) dialog.tabs(['全部状态', '已研发', '可研发'], status,
      (value) => select('status', value), { style: 'filter' });
    const matches = nodes.filter((node) => {
      const { id } = node;
      if (!efficiency && !quality && status !== '全部状态' && node.status !== status) return false;
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

export function renderResearch(ui) {
  const local = ui.local;
  const { id, openResearchItem } = local;
  const linked = id && catalog.items[id];
  const requested = tabs.includes(local.tab) ? local.tab : tabs[0];
  const active = linked && (requested === tabs[2] || (requested === tabs[1] && !ui.w.unlocked.includes(id)))
    ? tabs[0] : requested;
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
  }, { keepScroll: true, sticky: true, style: 'segmented' });
  const efficiency = active === tabs[2];
  const quality = active === tabs[1];
  if (efficiency) ui.balance('高级研发点', ui.w.researchPoints, { variant: 'efficiency' });
  const nodes = efficiency ? techNodes(ui.w) : quality ? qualityNodes(ui.w) : researchNodes(ui.w);
  const select = (key) => {
    if (efficiency) showTech(ui, techByKey[key]);
    else if (quality) showQuality(ui, key);
    else showResearch(ui, key);
  };
  if (linked && openResearchItem) {
    view.focus = id;
    select(id);
  }
  ui.tree({ nodes, view, mode: quality ? 'quality' : 'map',
    onSelect: select, onFind: () => showNodeFinder(ui, nodes, view, efficiency, quality) });
}
