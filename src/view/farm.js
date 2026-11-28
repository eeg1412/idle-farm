import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { guide, inGuide, longTerm } from '../game/tasks.js';
import { appraisalOffer, catalog, farmSaleOffer, plotPrice, quantity, researchOffer } from '../game/state.js';
import { compact } from './numbers.js';

const pages = ['田地', '料坊工房', '仓库', '研究'];
const palette = { paper: 0xf2e5ba, ink: 0x2a3828, green: 0x35583b, gold: 0xe7ba60, cream: 0xfff6da };

export function createFarm(app, dispatch) {
  const panel = new Container();
  const frame = new Graphics();
  app.stage.addChild(panel, frame);
  panel.mask = frame;
  let current = '田地';
  let taskPage = 0;
  let recipePicker = null;
  let recipePage = 0;
  let researchPage = 0;
  let saleOrigin = '田地';
  let confirmingSale = false;
  let salePending = false;
  let followCurrentTask = false;
  let layout;
  let model;
  let notice = '';
  let focused = 0;
  let buttons = [];

  function box(x, y, w, h, color) {
    const graphic = new Graphics().rect(x, y, w, h).fill(color);
    panel.addChild(graphic);
    return graphic;
  }

  function label(value, x, y, size = 16, fill = palette.ink, alignRight = false) {
    const text = new Text({
      text: String(value),
      style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '600', fill },
    });
    if (alignRight) text.anchor.x = 1;
    text.position.set(x, y);
    panel.addChild(text);
  }

  function button(value, x, y, w, action, selected = false) {
    const index = action ? buttons.push(action) - 1 : -1;
    const graphic = box(x, y, w, 48, action ? selected ? palette.gold : palette.green : 0xd3c8a8);
    if (focused === index && document.activeElement === app.canvas) {
      graphic.rect(x + 2, y + 2, w - 4, 44).stroke({ width: 2, color: 0xf9d480 });
    }
    if (action) {
      graphic.eventMode = 'static';
      graphic.cursor = 'pointer';
      graphic.hitArea = new Rectangle(x, y, w, 48);
      graphic.on('pointertap', action);
    }
    label(value, x + 9, y + 13, 15, selected || !action ? palette.ink : palette.cream);
  }

  const execute = (action, ...args) => () => dispatch(action, ...args);
  function navigate(page) {
    current = page;
    recipePicker = null;
    confirmingSale = false;
    focused = 0;
    if (page === '研究') researchPage = 0;
    if (page !== '任务') taskPage = 0;
    else followCurrentTask = true;
    redraw();
  }

  function openFarmSale() {
    saleOrigin = current;
    navigate('出售庄园');
  }

  function redraw() {
    if (!layout) return;
    const { x, y, scale, inset } = layout;
    const width = layout.width / scale;
    const height = layout.height / scale;
    panel.position.set(x, y);
    panel.scale.set(scale);
    frame.clear().rect(x, y, layout.width, layout.height).fill(0xffffff);
    for (const child of panel.removeChildren()) child.destroy();
    buttons = [];
    box(0, 0, width, height, palette.paper);
    const left = inset.left + 16;
    const right = width - inset.right - 16;
    const top = inset.top;
    const bottom = height - inset.bottom;
    box(0, 0, width, top + 82, palette.green);
    if (current === '出售庄园') {
      button('返回', left, top + 18, 64, salePending ? null : () => {
        if (confirmingSale) {
          confirmingSale = false;
          redraw();
        } else navigate(saleOrigin);
      });
      label('出售庄园', left + 80, top + 22, 24, palette.cream);
    } else {
      label('放置庄园', left, top + 13, 27, palette.cream);
    }
    if (!model) {
      label(notice || '正在准备田地', left, top + 104);
      return;
    }
    const row = top + 94;
    const widthIn = right - left;
    const half = (widthIn - 8) / 2;
    if (current === '出售庄园') {
      const offer = farmSaleOffer(model);
      label(confirmingSale ? '本轮可获得高级研发点' : '预计获得高级研发点', left, row + 8, 17);
      label(compact(offer.reward), right, row + 33, 24, palette.ink, true);
      label('本轮生产总值', left, row + 73, 17);
      label(compact(offer.productionValue), right, row + 98, 22, palette.ink, true);
      const multiplier = offer.multiplierTenths / 10;
      label('经营评估倍率　' + multiplier + ' 倍', left, row + 131, 16);
      if (offer.reward === 0n) label('生产总值满 1K 开始发点', left, row + 159, 14);
      label('保留 ' + compact(offer.stationCount) + ' 个工位、研发、品质与经营改良', left, row + 191, 14);
      label('清空 ' + compact(offer.plotCount) + ' 块田、库存和本轮金币', left, row + 216, 15);
      label('新一轮有 2 块小麦田和 60 金币', left, row + 241, 15);
      if (notice) label(notice, left, row + 267, 14);
      if (confirmingSale) {
        button('继续经营', left, bottom - 58, half, salePending ? null : () => {
          confirmingSale = false;
          redraw();
        });
        button('确认出售', left + half + 8, bottom - 58, half, salePending ? null : async () => {
          salePending = true;
          redraw();
          const sold = await dispatch('sellFarm', offer);
          salePending = false;
          if (sold) navigate('田地');
          else redraw();
        }, true);
      } else {
        button('出售庄园', left, bottom - 58, widthIn, () => {
          confirmingSale = true;
          redraw();
        }, true);
      }
      return;
    }
    label('金币  ' + compact(model.coins), left, top + 50, 15, palette.cream);
    button('任务', right - 146, top + 20, 64, () => navigate('任务'), current === '任务');
    button('出售庄园', right - 77, top + 20, 77, openFarmSale);
    const navWidth = (widthIn - 12) / 4;
    pages.forEach((page, index) =>
      button(page, left + index * (navWidth + 4), bottom - 59, navWidth, () => navigate(page), current === page));

    label(current, left, row, 21);
    if (notice) label(notice, left, bottom - 83, 13);
    if (current === '田地') {
      box(left, row + 37, widthIn, 104, 0xd5be87);
      const tile = Math.min(32, (widthIn - 24) / 8);
      for (let col = 0; col < 8; col += 1) {
        const tx = left + 12 + col * tile;
        box(tx, row + 75, tile - 3, 37, 0x9c754d);
        box(tx + 5, row + 65 - col % 2 * 7, 5, 26, 0xc7913b);
        box(tx + 10, row + 69, 5, 22, 0xe7ba60);
      }
      label('小麦田  ' + model.plots.length + ' 块', left, row + 151);
      const seconds = Math.max(0, Math.ceil((Math.min(...model.plots) - model.clockMs) / 1000));
      label('下次收获  ' + seconds + ' 秒', left, row + 180);
      label('高级研发点 ' + compact(model.researchPoints), left, row + 204, 13);
      button('购地 · ' + compact(plotPrice(model)), left, row + 229, widthIn, execute('buyPlot'));
      if (inGuide(model)) {
        const [title] = guide.find(([, , done]) => !done(model));
        button(title, left, row + 286, widthIn, () => navigate('任务'));
      }
    } else if (current === '料坊工房') {
      for (const [index, kind] of ['I', 'P'].entries()) {
        const y = row + 38 + index * 137;
        const station = model.stations[kind];
        const active = station.ends !== null;
        const itemId = active ? station.output : station.recipe;
        const item = catalog.items[itemId];
        const next = catalog.items[station.recipe];
        const title = item?.name ?? (kind === 'I' ? '料坊位' : '工房位');
        const status = active ? '生产中' : next ? '等待材料' : '等待安排';
        label(title + '  ·  ' + status, left, y);
        if (active) {
          const seconds = Math.ceil((station.ends - model.clockMs) / 1000);
          label('剩余 ' + seconds + ' 秒', right - 74, y + 25, 13);
        }
        if (item) {
          const output = active ? station.outputQuantity ?? item.output : item.output;
          label('库存 ' + compact(quantity(model, itemId)) +
            (active ? '  ·  本批产出 ' : '  ·  每批产出 ') + output, left, y + 25, 13);
        }
        if (active && next && station.recipe !== station.output) {
          label('下批：' + next.name, left, y + 46, 13);
        } else if (!active && next) {
          const materials = Object.entries(next.inputs);
          const material = materials.find(([id, needed]) =>
            quantity(model, id) - (model.reserves[id] ?? 0n) < BigInt(needed)) ?? materials[0];
          if (material) {
            const [id, needed] = material;
            const available = quantity(model, id) - (model.reserves[id] ?? 0n);
            label(catalog.items[id].name + ' ' + compact(available > 0n ? available : 0n) + ' / ' + needed, left, y + 46, 13);
          }
        }
        if (model.unlocked.some((id) => id.startsWith(kind))) {
          button(station.recipe ? '更换配方' : '选择配方', left, y + 68, widthIn, () => {
            recipePicker = kind;
            recipePage = 0;
            focused = 0;
            redraw();
          });
        } else {
          button('查看研究', left, y + 68, widthIn, () => navigate('研究'));
        }
      }
      const amount = model.reserves.C01 ? 0n : 12n;
      button(amount ? '预留 12 份小麦' : '取消小麦预留', left, row + 311, widthIn, execute('reserve', 'C01', amount));
    } else if (current === '仓库') {
      for (const [index, id] of ['C01', 'I01', 'P01'].entries()) {
        const y = row + 40 + index * 76;
        const count = quantity(model, id);
        label(catalog.items[id].name + '  ' + compact(count), left, y + 13);
        if (count > 0n) button('出售 1 份', right - 115, y, 115, execute('sell', id, 1n));
      }
    } else if (current === '研究') {
      const appraisal = appraisalOffer(model);
      label('高级研发点', left, row + 33, 15);
      label(compact(model.researchPoints), right, row + 51, 22, palette.ink, true);
      label('经营评估 ' + model.appraisalLevel + ' 级', left, row + 76, 15);
      if (appraisal) {
        button('升级经营评估 · ' + compact(appraisal.cost), left, row + 99, widthIn,
          appraisal.affordable ? execute('upgradeAppraisal') : null);
      }
      const ids = ['P01', ...Object.keys(catalog.research).filter((id) => id !== 'P01')];
      const options = ids.map((id) => [id, researchOffer(model, id)])
        .filter(([, offer]) => offer?.eligible);
      if (options.length === 0) {
        label('暂无可研发项目', left, row + 153, 18);
      } else {
        researchPage = Math.min(researchPage, options.length - 1);
        const [id, offer] = options[researchPage];
        label(catalog.items[id].name, left, row + 153, 18);
        label('持有 / 所需', left, row + 182, 13);
        label('金币 ' + compact(model.coins) + ' / ' + compact(offer.coins), left, row + 204, 15);
        offer.costs.forEach(([item, count], index) => {
          label(catalog.items[item].name + ' ' + compact(quantity(model, item)) + ' / ' + compact(count),
            left, row + 227 + index * 23, 15);
        });
        const actionY = row + 234 + offer.costs.length * 23;
        button('研发', left, actionY, options.length > 1 ? half : widthIn,
          offer.affordable ? execute('research', id) : null);
        if (options.length > 1) {
          button('下一个项目', left + half + 8, actionY, half, () => {
            researchPage = (researchPage + 1) % options.length;
            redraw();
          });
        }
      }
    } else {
      const guiding = inGuide(model);
      label(guiding ? '入门任务' : '长期任务', left, row + 35);
      const tasks = guiding ? guide : longTerm;
      const perPage = Math.max(2, Math.min(4, Math.floor((bottom - row - 218) / 56)));
      const pageCount = Math.ceil(tasks.length / perPage);
      if (followCurrentTask) {
        taskPage = guiding ? Math.floor(guide.findIndex(([, , done]) => !done(model)) / perPage) : 0;
        followCurrentTask = false;
      }
      taskPage = Math.min(taskPage, pageCount - 1);
      for (const [index, [title, page, check]] of tasks.slice(taskPage * perPage, (taskPage + 1) * perPage).entries()) {
        const progress = check(model);
        const status = guiding ? progress ? '已完成' : '前往' :
          progress[0] >= progress[1] ? '已完成' : compact(progress[0]) + '/' + compact(progress[1]);
        button(title + ' · ' + status, left, row + 63 + index * 55, widthIn, () => navigate(page));
      }
      const actionY = row + 64 + perPage * 55;
      button('下一页', left, actionY, half, () => { taskPage = (taskPage + 1) % pageCount; redraw(); });
      if (guiding) button('跳过入门', left + half + 8, actionY, half, execute('skipGuide'));
    }
    if (recipePicker) {
      buttons = [];
      const scrim = box(0, 0, width, height, { color: 0x11160d, alpha: 0.55 });
      scrim.eventMode = 'static';
      scrim.hitArea = new Rectangle(0, 0, width, height);
      const options = model.unlocked.filter((id) => id.startsWith(recipePicker));
      const perPage = Math.max(1, Math.min(5, Math.floor((bottom - row - 130) / 53)));
      const totalPages = Math.ceil(options.length / perPage);
      recipePage = Math.min(recipePage, totalPages - 1);
      const sheetTop = bottom - 118 - perPage * 53;
      const sheet = box(left, sheetTop, widthIn, bottom - sheetTop, palette.paper);
      sheet.eventMode = 'static';
      sheet.hitArea = new Rectangle(left, sheetTop, widthIn, bottom - sheetTop);
      label('选择配方', left + 12, sheetTop + 13, 20);
      const kind = recipePicker;
      const choices = options.slice(recipePage * perPage, (recipePage + 1) * perPage);
      choices.forEach((id, index) => {
        button(catalog.items[id].name, left + 12, sheetTop + 49 + index * 53, widthIn - 24, () => {
          recipePicker = null;
          focused = 0;
          dispatch('arrange', kind, id);
          redraw();
        }, id === model.stations[kind].recipe);
      });
      const footer = sheetTop + 53 + perPage * 53;
      if (totalPages > 1) {
        button('下一页', left + 12, footer, half - 12, () => {
          recipePage = (recipePage + 1) % totalPages;
          redraw();
        });
      }
      button('关闭', left + half + 8, footer, half - 12, closeRecipePicker);
    }
  }

  function closeRecipePicker() {
    recipePicker = null;
    focused = 0;
    redraw();
  }

  app.canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && buttons.length) {
      const next = focused + (event.shiftKey ? -1 : 1);
      if (next < 0 || next >= buttons.length) return;
      event.preventDefault();
      focused = next;
      redraw();
    } else if (event.key === 'Enter' && buttons[focused]) {
      event.preventDefault();
      buttons[focused]();
    } else if (event.key === 'Escape') {
      if (salePending) return;
      if (recipePicker) closeRecipePicker();
      else if (current === '出售庄园' && confirmingSale) {
        confirmingSale = false;
        redraw();
      } else if (current === '出售庄园') navigate(saleOrigin);
      else navigate('田地');
    }
  });
  app.canvas.addEventListener('focus', redraw);
  app.canvas.addEventListener('blur', redraw);

  return {
    render(nextLayout, nextState, message) {
      layout = nextLayout;
      model = nextState;
      notice = message;
      redraw();
    },
  };
}
