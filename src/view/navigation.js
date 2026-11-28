const routes = {
  庄园: ['farm', { 田地: 'fields', 畜牧: 'livestock', 鱼塘: 'fish', 矿洞: 'mining' }],
  工坊: ['workshop', { 料坊: 'processing', 工房: 'refining' }],
  仓库: ['warehouse', {}],
  订单中心: ['orders', {}],
  行脚商: ['merchant', { 买入: 'buy', 卖出: 'sell' }],
  研究: ['research', { 品种配方: 'recipes', 品质: 'quality', 经营改良: 'efficiency' }],
  经营: ['management', {}],
  角色管理: ['managers', {}],
  统计: ['statistics', {}],
  出售庄园历史: ['farm-sale-history', {}],
  图鉴: ['catalog', { 用途: 'uses' }],
  任务: ['tasks', { 未完成: 'active', 已完成: 'done' }],
  设置: ['settings', {}],
  出售庄园: ['farm-sale', {}],
};

const productionPages = Object.fromEntries(['庄园', '工坊'].flatMap((page) =>
  Object.keys(routes[page][1]).map((tab) => [tab, page])));

export function pageForRoute(page, tab) {
  if (page === '工坊') return Object.hasOwn(routes.工坊[1], tab) ? tab : '料坊';
  if (page === '庄园' && Object.hasOwn(routes.庄园[1], tab)) return tab;
  return page;
}

export function routeForPage(page, tab) {
  return Object.hasOwn(productionPages, page) ? { page: productionPages[page], tab: page } : { page, tab };
}

export function gameHash(route) {
  const { page, tab } = routeForPage(route.page, route.tab);
  const [slug, tabs] = Object.hasOwn(routes, page) ? routes[page] : routes.庄园;
  const params = new URLSearchParams();
  if (Object.hasOwn(tabs, tab)) params.set('tab', tabs[tab]);
  if (route.id) params.set('item', route.id);
  if (route.dialog) params.set('dialog', route.dialog);
  const query = params.toString();
  return '#/' + slug + (query ? '?' + query : '');
}

export function parseGameHash(hash) {
  const [slug, query] = hash.replace(/^#\/?/, '').split('?');
  const [page, [, tabs]] = Object.entries(routes).find(([, [path]]) => path === slug) ?? ['庄园', routes.庄园];
  const params = new URLSearchParams(query);
  const value = params.get('tab');
  const tab = page === '行脚商' && value === 'give' ? '卖出' : Object.keys(tabs).find((label) => tabs[label] === value);
  return {
    page,
    tab,
    id: /^[A-Z]{1,3}[0-9]{2,3}$/.test(params.get('item') ?? '') ? params.get('item') : undefined,
  };
}

export function gameHistory(browser) {
  if (!browser?.history || !browser.location) return null;
  const { history, location } = browser;
  const session = Math.random().toString(36).slice(2);
  const entries = new Map();
  let sequence = 0;
  let active;
  let returningTo;
  return {
    get active() { return active; },
    get returning() { return returningTo !== undefined; },
    read() {
      const state = history.state?.farmNavigation;
      const position = Number.isSafeInteger(state?.position) ? state.position : undefined;
      const backward = position !== undefined && active && position < active.position && returningTo === undefined;
      const returned = returningTo;
      returningTo = undefined;
      if (state?.session === session && entries.has(state.key) && entries.get(state.key).hash === location.hash) {
        active = entries.get(state.key);
        if (returned?.key === active.key) {
          active.context = returned.context;
          active.scroll = returned.context?.local.scroll ?? active.scroll;
        }
        return { ...active, backward };
      }
      active = undefined;
      return { route: parseGameHash(location.hash), position, backward };
    },
    write(route, modal, replace = false, scroll = 0, context) {
      const hash = gameHash(route);
      // Research, merchant and task tabs are single destinations. Keep dialog entries layered.
      if (!modal && !active?.modal && !route.dialog && !active?.route.dialog &&
          (route.page === '研究' || route.page === '行脚商' || route.page === '任务') &&
          active?.route.page === route.page &&
          route.tab !== active.route.tab) replace = true;
      const previous = replace ? active?.previous : active?.key;
      const key = replace && active ? active.key : ++sequence;
      const observed = history.state?.farmNavigation?.position;
      const position = (active?.position ?? (Number.isSafeInteger(observed) ? observed : 0)) + (replace ? 0 : 1);
      active = { key, position, previous, route, modal, hash, scroll, context };
      entries.set(key, active);
      history[replace ? 'replaceState' : 'pushState']({
        ...history.state, farmNavigation: { session, key, position },
      }, '', hash);
      return active;
    },
    backTo(route, modal, context) {
      if (returningTo) return false;
      const hash = gameHash(route);
      for (let entry = entries.get(active?.previous); entry; entry = entries.get(entry.previous)) {
        if (entry.hash !== hash || entry.modal !== modal) continue;
        const steps = entry.position - active.position;
        if (steps === -1 && typeof history.back === 'function') {
          returningTo = { key: entry.key, context };
          history.back();
          return true;
        }
        if (steps < 0 && typeof history.go === 'function') {
          returningTo = { key: entry.key, context };
          history.go(steps);
          return true;
        }
        break;
      }
      return false;
    },
  };
}
