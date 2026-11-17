const routes = {
  庄园: ['farm', { 田地: 'fields', 畜牧: 'livestock', 鱼池: 'fish', 矿洞: 'mining' }],
  工坊: ['workshop', { 加工: 'processing', 精制: 'refining' }],
  仓库: ['warehouse', {}],
  研究: ['research', { 品种配方: 'recipes', 品质: 'quality', 经营改良: 'efficiency' }],
  经营: ['management', {}],
  图鉴: ['catalog', { 用途: 'uses' }],
  任务: ['tasks', {}],
  设置: ['settings', {}],
  出售庄园: ['farm-sale', {}],
};

export function gameHash(route) {
  const [slug, tabs] = Object.hasOwn(routes, route.page) ? routes[route.page] : routes.庄园;
  const params = new URLSearchParams();
  if (Object.hasOwn(tabs, route.tab)) params.set('tab', tabs[route.tab]);
  if (route.id) params.set('item', route.id);
  if (route.dialog) params.set('dialog', route.dialog);
  const query = params.toString();
  return '#/' + slug + (query ? '?' + query : '');
}

export function parseGameHash(hash) {
  const [slug, query] = hash.replace(/^#\/?/, '').split('?');
  const [page, [, tabs]] = Object.entries(routes).find(([, [path]]) => path === slug) ?? ['庄园', routes.庄园];
  const params = new URLSearchParams(query);
  return {
    page,
    tab: Object.keys(tabs).find((tab) => tabs[tab] === params.get('tab')),
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
  return {
    get active() { return active; },
    read() {
      const state = history.state?.farmNavigation;
      if (state?.session === session && entries.has(state.key) && entries.get(state.key).hash === location.hash) {
        active = entries.get(state.key);
        return active;
      }
      active = undefined;
      return { route: parseGameHash(location.hash) };
    },
    write(route, modal, replace = false, scroll = 0, context) {
      const hash = gameHash(route);
      const previous = replace ? active?.previous : active?.key;
      const key = replace && active ? active.key : ++sequence;
      active = { key, previous, route, modal, hash, scroll, context };
      entries.set(key, active);
      history[replace ? 'replaceState' : 'pushState']({ ...history.state, farmNavigation: { session, key } }, '', hash);
      return active;
    },
    back() {
      if (!active?.previous) return false;
      history.back();
      return true;
    },
  };
}
