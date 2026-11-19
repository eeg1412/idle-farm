import { catalog, stationRequirements } from '../game/world.js';
import { marketRate } from '../game/market.js';
import { merchantStatus } from '../game/merchant.js';
import { managerAffinityThresholds, managerGiftLimit, managerGiftRemaining, managerStatus, quoteManagerGift } from '../game/managers.js';
import { managerCharacters } from './manager-dialogue.js';
import { managerTutorial, managerUpgradeMessages, managerResearchHelp } from './manager-help.js';
import { compact } from './numbers.js';

export const managerPages = {
  任务: 'tasks', 经营: 'estate', 畜牧: 'livestock', 田地: 'field', 矿洞: 'mine', 鱼池: 'fish',
  加工: 'processing', 精制: 'refining', 仓库: 'warehouse', 研究: 'research', 行脚商: 'merchant',
  管理员管理: 'estate', 统计: 'estate', 出售庄园历史: 'estate', 图鉴: 'estate', 出售庄园: 'estate',
};

const estatePageIntroductions = {
  管理员管理: '这里能查看各位管理员的好感、今日心愿，送礼或切换角色。',
  统计: '这里能看生产状态、库存估值和累计收入，帮你核对经营情况。',
  出售庄园历史: '这里记着每次出售庄园的时间和产值。',
  图鉴: '这里能查每件物品的材料、来源和用途，未收录的物品也能查看研发条件。',
  出售庄园: '这里先预览高级研发点收益和新一轮配置，核对后再确认出售庄园。',
};

const facilities = { field: 'C', livestock: 'L', fish: 'F', mine: 'M' };
const facilityHelpEmphasis = {
  field: ['播下种子', '种子下地', '添块田'],
  livestock: ['选只小家伙', '合适的动物', '盖座养殖场', '添个养殖场'],
  fish: ['挑种鱼', '鱼种', '建个鱼池', '添个鱼池'],
  mine: ['选矿', '矿种', '买一座矿洞', '准备矿洞'],
};
const workshops = { processing: 'I', refining: 'P' };
const contextPlaceNames = { field: '田地', livestock: '养殖场', fish: '鱼池', mine: '矿洞', processing: '加工位', refining: '精制位' };
const assignmentNames = { field: '播种', livestock: '安排养殖', fish: '安排养殖', mine: '开采', processing: '选择配方', refining: '选择配方' };
const assignmentHints = { field: '把种子种下吧。', livestock: '迎接新伙伴吧。', fish: '挑批鱼种吧。', mine: '选好矿种。' };
const silent = { muted: true, fontSize: 14 };
const produceForAffinity = '多生产一些物品，就能继续提高好感。';
const giftTypes = ['全部', '原料', '加工品', '商品'];
const giftType = (item) => item.kind[0] === 'I' ? '加工品' : item.kind[0] === 'P' ? '商品' : '原料';
const amount = (value) => compact(value) + ' 金币';
const pieces = (value) => compact(value) + ' 件';
const portrait = (id, gender, expression) => 'manager-art:portraits/' + id + '/' + gender + '-' + expression;
const actionIcon = (name) => 'manager-art:icons/' + name;
const nameOrder = (a, b) => a.localeCompare(b, 'zh-CN');

function subunits(value, base) {
  const whole = value / base;
  const remainder = value % base;
  if (!remainder || whole >= 10000n) return compact(whole);
  const width = String(base).length - 1;
  return compact(whole) + '.' + String(remainder).padStart(width, '0').replace(/0+$/, '');
}

function affinityNeedsProduction(status) {
  return status.valueToDailyCap > 0n && status.affinityFundingRemaining === 0n;
}

function managerResearchTab(ui) {
  const requested = ['品种配方', '品质', '经营改良'].includes(ui.local.tab) ? ui.local.tab : '品种配方';
  const linked = ui.local.id && Object.hasOwn(catalog.items, ui.local.id);
  return linked && (requested === '经营改良' || (requested === '品质' && !ui.w.unlocked.includes(ui.local.id)))
    ? '品种配方' : requested;
}

function managerHelp(ui, id, character, researchReady, page) {
  const world = ui.w;
  const tutorial = managerTutorial(world, page);
  const tab = managerResearchTab(ui);
  const techTutorial = tutorial && ['firstTech', 'delegationTech'].includes(tutorial.taskId);
  const showTutorial = id !== 'research' || (tab === '经营改良' ? techTutorial : tab === '品种配方' && !techTutorial);
  return [
    showTutorial ? tutorial : null,
    ...managerContextMessages(ui, id, character, researchReady),
    ...managerUpgradeMessages(world, page),
    ...(id === 'research' ? managerResearchHelp(world, tab) : []),
  ].filter(Boolean);
}

function managerContextMessages(ui, id, character, researchReady) {
  const world = ui.w;
  if (id === 'tasks' || id === 'estate') return [];
  if (Object.hasOwn(facilities, id)) {
    const slots = world.facilities[facilities[id]];
    if (!slots.length) return [{ text: character.help('none'), emphasis: facilityHelpEmphasis[id] }];
    return slots.flatMap((slot, index) => slot.recipe ? [] : [{
      text: '第' + (index + 1) + '个' + contextPlaceNames[id] + '还空着，点「' + assignmentNames[id] + '」' + assignmentHints[id],
      emphasis: [assignmentNames[id]],
    }]);
  }
  if (Object.hasOwn(workshops, id)) {
    const stations = world.stations[workshops[id]];
    const messages = [];
    for (const [index, station] of stations.entries()) {
      if (!station.recipe || station.batch) continue;
      for (const missing of stationRequirements(world, station.recipe, station.level)) {
        if (missing.owned >= missing.needed) continue;
        const name = catalog.items[missing.id].name;
        messages.push({
          text: '第' + (index + 1) + '个' + contextPlaceNames[id] + '还差「' + name + '」，点「查看来源」'
            + (id === 'refining' ? '补齐就能起炉。' : '补齐再开工吧。'),
          expression: 'sad', emphasis: [name, '查看来源'],
        });
      }
    }
    for (const [index, station] of stations.entries()) if (!station.recipe) messages.push({
      text: '第' + (index + 1) + '个' + contextPlaceNames[id] + '还闲着，点「选择配方」'
        + (id === 'refining' ? '挑个想做的商品吧。' : '咱们就开工吧。'),
      emphasis: ['配方', '想做的商品', '选择配方'],
    });
    return messages;
  }
  if (id === 'warehouse') {
    return Object.keys(world.market?.rates ?? {}).flatMap((key) => {
      const name = catalog.items[key]?.name;
      const rate = marketRate(world, key);
      return name && world.inventory[key] > 0n && rate !== 0
        ? [{ text: character.help(name, rate), emphasis: [name] }] : [];
    });
  }
  if (id === 'research') {
    const tab = managerResearchTab(ui);
    return tab === '品种配方' && researchReady ? [{ text: character.help(), emphasis: ['品种配方'] }] : [];
  }
  if (id === 'merchant' && !merchantStatus(world).unlocked) return [{ text: character.help(), emphasis: ['开摊条件'] }];
  return [];
}

const randomLine = (lines) => lines[Math.floor(Math.random() * lines.length)];
const nextGreetingFor = (character) => (currentText) => {
  const lines = character.hello;
  const start = lines.indexOf(currentText);
  for (let step = 1; step <= lines.length; step += 1) {
    const line = lines[(start + step) % lines.length];
    if (line !== currentText) return line;
  }
  return undefined;
};

function showManagerFeedback(ui, id, text, wanted = false, inCard = false) {
  ui.queueManagerSpeech(id, managerStatus(ui.currentWorld(), id).gender, { text, expression: wanted ? 'happy' : 'smile' }, { inCard });
}

async function receiveGift(page, panel, status, inCard = false) {
  if (!status.claim) return;
  const result = await panel.action('claimManagerGift', status.claim);
  if (!result || result === true) return;
  const text = '收到 ' + pieces(result.count) + catalog.items[result.itemId].name;
  panel.toast(text);
  const appearance = managerCharacters[status.id][status.gender];
  showManagerFeedback(page, status.id, appearance.received, false, inCard);
}

export function managerInfo(page, id, { inCard = false } = {}) {
  const role = managerCharacters[id];
  if (inCard) page.local.managerReplyRole = id;
  page.dialog('管理员资料', (panel) => {
    const status = managerStatus(panel.w, id);
    const character = role[status.gender];
    panel.local.managerRole = id;
    panel.card((card) => card.feature(portrait(id, status.gender, panel.managerExpression(id, status.gender)), (copy) => {
      copy.heading(character.name, { size: 19 });
      copy.text(role.title, silent);
      copy.text(character.bio, silent);
    }, {
      align: 'center', ratio: 0.34, artAspect: 1.13, surface: 'none', cover: true,
      onClick: () => panel.advanceManagerSpeech(id, status.gender, {
        nextGreeting: nextGreetingFor(character), inCard,
      }),
    }), { padding: 9, gap: 7 });
    const atMax = status.nextThreshold == null || status.level === 10;
    panel.row('好感等级', atMax ? '10 级 · 已满级' : status.level + ' 级', { compact: true, noWrap: true });
    if (!atMax) {
      const floor = managerAffinityThresholds[status.level];
      const target = status.nextThreshold - floor;
      const progress = status.affinity - floor;
      panel.goalProgress(Number(progress) / Number(target));
      panel.text('距下一级 ' + subunits(target - progress, 100n) + ' 点', silent);
    }
    panel.detailRows([
      { label: '今日好感', value: subunits(status.dailyGain, 100n) + ' / ' + subunits(status.dailyCap, 100n) },
      ...(status.valueToDailyCap > 0n
        ? [{ label: '今天涨满还需', value: '普通礼物 ' + amount(status.valueToDailyCap), noWrap: true }] : []),
      { label: '回礼比例', value: status.returnRate + '%' },
    ]);
    if (status.dailyGain >= status.dailyCap) panel.text('今日好感已满，仍可送礼。', silent);
    if (affinityNeedsProduction(status)) panel.text(produceForAffinity, silent);
    if (status.wants.length) {
      panel.heading('今日心愿', { size: 17 });
      for (const itemId of status.wants) panel.row(catalog.items[itemId].name, '好感 ×2', {
        icon: itemId, compact: true, noWrap: true,
      });
    }
    if (status.readyReturn > 0n && !status.claim) panel.text('有合适的物品时可领取回礼。', silent);
    panel.buttons([
      ...(status.claim ? [{ label: '收回礼', icon: actionIcon('receive'), onClick: () => receiveGift(page, panel, status, inCard) }] : []),
      { label: '切换角色', tone: 'plain', icon: actionIcon('switch'), onClick: () => panel.action('switchManagerAppearance', id) },
    ]);
  }, { managerFocus: '管理员资料', managerRole: id, managerInCard: inCard });
}

function giftChoices(world, status) {
  const wanted = new Set(status.wants);
  return Object.entries(world.inventory).flatMap(([id, inventory]) => {
    const item = catalog.items[id];
    if (!item || inventory <= 0n) return [];
    const limit = managerGiftLimit(world, id);
    if (limit.available <= 0n) return [];
    return [{ id, label: item.name, icon: id, type: giftType(item), wanted: wanted.has(id), ...limit }];
  }).sort((a, b) => Number(b.wanted) - Number(a.wanted) || nameOrder(a.label, b.label));
}

function searchGifts(panel, state, items) {
  const prefixes = [...new Set(items.map(({ label }) => Array.from(label)[0]))].sort(nameOrder);
  function choose(value, prefix = false) {
    state.query = value.trim();
    state.prefix = prefix;
    state.queryScrollReset = true;
    return panel.close();
  }
  const editor = { value: state.query };
  const refreshText = () => panel.refresh();
  panel.dialog('按名称查找', (search) => {
    search.text('可点选品名首字，也可输入或粘贴品名。', silent);
    if (editor.value) {
      search.row('查找', editor.value, { compact: true });
      search.button('应用查找', () => choose(editor.value), { tone: 'gold' });
    }
    search.scrollList(prefixes, (cell, value) => {
      cell.button(value, () => choose(value, true));
    }, { columns: Math.max(1, Math.floor(search.width / 49)) });
  }, {
    onKeyDown(event) {
      if (event.key === 'Backspace') editor.value = Array.from(editor.value).slice(0, -1).join('');
      else if (event.key === 'Enter' && editor.value) { void choose(editor.value); return true; }
      else if (!event.ctrlKey && !event.metaKey && Array.from(event.key).length === 1) editor.value = (editor.value + event.key).slice(0, 30);
      else return false;
      refreshText();
      return true;
    },
    onPaste(event) {
      const value = event.clipboardData?.getData('text/plain');
      if (!value?.trim()) return false;
      editor.value = value.trim().slice(0, 30);
      refreshText();
      return true;
    },
  });
}

function giftPicker(page, opener, id, inCard = false) {
  const state = { type: '全部', wanted: false, query: '', prefix: false };
  opener.dialog('送礼', (panel) => {
    const status = managerStatus(panel.w, id);
    const remaining = managerGiftRemaining(panel.w);
    panel.row('还能赠送的礼物总值', compact(remaining), { compact: true, stack: panel.width < 350 });
    if (remaining === 0n) {
      panel.text('去仓库卖出物品，就能继续送礼。', silent);
      panel.button(id === 'warehouse' ? '返回仓库' : '去仓库', () => panel.go('仓库'), { tone: 'gold' });
      return;
    }
    const items = giftChoices(panel.w, status);
    if (!items.length) {
      panel.text('没有可送的库存。', silent);
      return;
    }
    if (state.queryScrollReset) {
      panel.local.scroll = 0;
      state.queryScrollReset = false;
    }
    const reset = () => { panel.local.scroll = 0; delete panel.local.indexKeyboard; panel.refresh(); };
    if (items.length > 8) panel.tabs(giftTypes, state.type, (type) => { state.type = type; reset(); }, { style: 'filter', compact: true });
    const filters = [];
    if (status.wants.length) filters.push({
      label: '只看心愿', tone: state.wanted ? 'green' : 'plain',
      onClick: () => { state.wanted = !state.wanted; reset(); },
    });
    if (items.length > 8 || state.query) filters.push(state.query
      ? { label: state.query + ' · 清除', onClick: () => { state.query = ''; reset(); } }
      : { label: '按名称查找', onClick: () => searchGifts(panel, state, items) });
    if (filters.length) panel.buttons(filters, { style: 'filter', compact: true });
    const available = items.filter(({ label, type, wanted }) => (state.type === '全部' || type === state.type) &&
      (!state.wanted || wanted) && (!state.query || (state.prefix ? label.startsWith(state.query) : label.includes(state.query))));
    if (!available.length) {
      panel.text(state.wanted && !state.query ? '库存里没有心愿物品。' : '没有符合筛选的物品。', silent);
      return;
    }
    const eligible = available.filter(({ maximum }) => maximum > 0n);
    if (eligible.length && affinityNeedsProduction(status)) panel.text(produceForAffinity, silent);
    panel.indexRows(eligible.map((item) => ({
      ...item, status: '可用 ' + pieces(item.available) + (item.wanted ? ' · 心愿' : ''),
    })), (item) => giftQuantity(page, panel, id, item, inCard));
    if (eligible.length < available.length) {
      panel.text(eligible.length ? '其余物品超出送礼额度。' : '送礼额度不足。', silent);
    }
  }, { flow: 'manager-gifts', managerFocus: '送礼' });
}

function exactAmount(panel, current, max, change) {
  const editor = { raw: String(current), fresh: true };
  const clear = () => { editor.raw = ''; editor.fresh = false; panel.refresh(); };
  const erase = () => {
    if (editor.fresh) return clear();
    editor.raw = editor.raw.slice(0, -1);
    panel.refresh();
  };
  const insert = (digit) => {
    const beginning = editor.fresh ? '' : editor.raw;
    editor.fresh = false;
    if (beginning.length <= String(max).length) editor.raw = (beginning + digit).replace(/^0+(?=[0-9])/, '');
    panel.refresh();
  };
  const submit = () => {
    const value = BigInt(editor.raw || '0');
    if (value < 1n || value > max) return;
    change(value);
    void panel.close();
  };
  panel.dialog('输入送礼数量', (keypad) => {
    const value = BigInt(editor.raw || '0');
    keypad.row('数量', pieces(value), { compact: true });
    keypad.text('最多 ' + pieces(max), silent);
    for (const line of ['123', '456', '789']) keypad.buttons([...line].map((digit) => ({
      label: digit, onClick: () => insert(digit),
    })));
    keypad.buttons([{ label: '清空', onClick: clear }, { label: '0', onClick: () => insert('0') }, { label: '删除', onClick: erase }]);
    keypad.button('确定数量', submit, { tone: 'gold', disabled: value < 1n || value > max });
  }, {
    onKeyDown(event) {
      if (/^[0-9]$/.test(event.key)) insert(event.key);
      else if (event.key === 'Backspace') erase();
      else if (event.key === 'Enter') submit();
      else return false;
      return true;
    },
    onPaste(event) {
      const value = event.clipboardData?.getData('text/plain')?.trim().replace(/[,，\s]/g, '');
      if (!value || !/^[0-9]+$/.test(value) || value.length > String(max).length + 1) return false;
      editor.raw = value;
      editor.fresh = false;
      panel.refresh();
      return true;
    },
  });
}

function sameGiftQuote(a, b) {
  return Boolean(a && b && Object.keys(a).every((key) => a[key] === b[key]));
}

function giftQuantity(page, picker, id, item, inCard) {
  const quote = (world, count) => quoteManagerGift(world, id, item.id, count);
  const state = { count: 1n, basis: item.maximum, checked: quote(picker.w, 1n), revised: false };
  const percentOf = (count) => Number((count * 100n + state.basis - 1n) / state.basis);
  const countAt = (percent) => {
    const proportional = state.basis * BigInt(percent) / 100n;
    return proportional > 0n ? proportional : 1n;
  };
  const choose = (panel, count, percent) => {
    state.count = count;
    state.percent = percent;
    state.checked = quote(panel.currentWorld(), count);
    state.revised = false;
    panel.refresh();
  };
  picker.dialog('送出' + item.label, (panel) => {
    const status = managerStatus(panel.w, id);
    const { maximum, unitPrice } = managerGiftLimit(panel.w, item.id);
    const actual = quote(panel.w, state.count);
    const changed = Boolean(actual) && !sameGiftQuote(state.checked, actual);
    panel.row('填写送礼数量', pieces(state.count), {
      icon: item.id, compact: true, pill: true,
      onClick: maximum > 0n ? () => exactAmount(panel, state.count, maximum, (value) => {
        if (value > state.basis) state.basis = maximum;
        choose(panel, value);
      }) : undefined,
    });
    if (status.wants.includes(item.id)) panel.text('今日心愿 · 好感 ×2', silent);
    panel.slider(state.percent ?? Math.min(100, percentOf(state.count)),
      (percent) => choose(panel, countAt(percent), percent), { min: 1, bubble: true });
    const choosePreset = (percent) => {
      const count = countAt(percent);
      if (count > maximum) choose(panel, maximum);
      else choose(panel, count, percent);
    };
    panel.buttons([
      { label: '25%', disabled: maximum === 0n, onClick: () => choosePreset(25) },
      { label: '50%', disabled: maximum === 0n, onClick: () => choosePreset(50) },
      { label: '最多', disabled: maximum === 0n, onClick: () => {
        state.basis = maximum;
        choose(panel, maximum, 100);
      } },
    ], { style: 'filter', compact: true });
    panel.detailRows([
      { label: '礼物价值', value: amount(state.count * unitPrice), noWrap: true },
      { label: '增加好感', value: actual ? '+' + subunits(actual.gain, 100n) + ' 点' : '—', noWrap: true },
      { label: '明日回礼', value: actual ? subunits(actual.returnValue, 10n) + ' 金币' : '—', noWrap: true },
    ]);
    if (!actual) panel.text('当前最多可送 ' + pieces(maximum) + '。', silent);
    else if (changed || state.revised) panel.text('报价已更新，请核对后送礼。', silent);
    panel.buttons([
      { label: '重选物品', onClick: () => panel.close() },
      {
        label: changed ? '核对报价' : '确认送礼', tone: 'gold', disabled: !actual,
        onClick: async () => {
          if (changed) {
            state.checked = actual;
            state.revised = true;
            panel.refresh();
            return;
          }
          const sent = await panel.action('giftManager', actual);
          if (!sent) {
            state.checked = quote(panel.currentWorld(), state.count);
            state.revised = true;
            panel.refresh();
            return;
          }
          const character = managerCharacters[id][managerStatus(panel.currentWorld(), id).gender];
          const reply = randomLine(sent.wanted ? character.wantedThanks : character.thanks);
          panel.closeManagerGift(() => {
            showManagerFeedback(page, id, reply, sent.wanted, inCard);
          });
        },
      },
    ]);
  }, { flow: 'manager-quantity', minHeight: 465 });
}

export function renderManager(ui, id, researchReady = false, page = Object.keys(managerPages).find((page) => managerPages[page] === id)) {
  const status = managerStatus(ui.w, id);
  const character = managerCharacters[id][status.gender];
  const seen = new Set();
  const messages = [
    ...managerHelp(ui, id, character, researchReady, page).map((help) => ({ priority: 1, ...help })),
    ...(estatePageIntroductions[page] ? [{ text: estatePageIntroductions[page], priority: 0 }] : []),
    ...(status.claim ? [{ text: character.return, expression: 'smile', priority: 0 }] : []),
  ].sort((a, b) => b.priority - a.priority).filter(({ text }) => {
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
  const message = messages[0] ?? null;
  ui.managerBanner({
    role: id, gender: status.gender, message, messages,
    greeting: () => randomLine(character.hello), nextGreeting: nextGreetingFor(character),
    background: 'manager-art:backgrounds/' + id,
    receive: status.claim ? () => receiveGift(ui, ui, status) : undefined,
    receiveIcon: actionIcon('receive'),
    actions: [
      { label: '管理员资料', icon: actionIcon('info'), onClick: () => managerInfo(ui, id) },
      { label: '送礼', icon: actionIcon('gift'), onClick: () => giftPicker(ui, ui, id) },
      { label: '切换角色', icon: actionIcon('switch'), onClick: () => ui.action('switchManagerAppearance', id) },
    ],
  });
}


export const managerDirectoryOrder = ['tasks', 'estate', 'field', 'livestock', 'fish', 'mine',
  'processing', 'refining', 'warehouse', 'research', 'merchant'];

export function renderManagerDirectory(ui) {
  ui.scrollList(managerDirectoryOrder, (cell, id) => {
    const status = managerStatus(cell.w, id);
    const role = managerCharacters[id];
    const character = role[status.gender];
    cell.card((card) => {
      card.feature(portrait(id, status.gender, card.managerExpression(id, status.gender)), (copy) => {
        copy.heading(character.name, { size: 19 });
        copy.text(role.title, silent);
        copy.text('好感 ' + status.level + ' 级', { fontSize: 15 });
        if (status.nextThreshold != null && status.level < 10) {
          const floor = managerAffinityThresholds[status.level];
          copy.goalProgress(Number(status.affinity - floor) / Number(status.nextThreshold - floor));
        } else copy.text('已满级', silent);
      }, {
        ratio: 0.32, artAspect: 1.12, cover: true, surface: 'none',
        onClick: () => ui.advanceManagerSpeech(id, status.gender, {
          messages: [], nextGreeting: nextGreetingFor(character), inCard: true,
        }),
      });
      card.managerReply(id, status.gender, () => randomLine(character.hello));
      card.buttons([
        { label: '资料', icon: actionIcon('info'), indicator: Boolean(status.claim), onClick: () => managerInfo(ui, id, { inCard: true }) },
        { label: '送礼', icon: actionIcon('gift'), onClick: () => giftPicker(ui, ui, id, true) },
        { label: '切换角色', icon: actionIcon('switch'), onClick: async () => {
          const changed = await ui.action('switchManagerAppearance', id);
          if (changed) { delete ui.local.managerSpeechKeys?.[id]; if (ui.local.managerReplyRole === id) delete ui.local.managerReplyRole; ui.refresh(); }
        } },
      ]);
    }, { padding: 8, gap: 5 });
  });
}
