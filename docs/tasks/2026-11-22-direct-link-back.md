# 直接打开页面链接后浏览器返回离开网站

PM：主代理。单一输出、单一所有者（direct_link_back，新建上下文）。未授权测试、预览或推送；最终编译由 PM 执行。

- 用户原话：如果 URL 输入的是 https://idle-farm.wikimoe.com/#/warehouse，那么点击返回键会返回到浏览器的导航页面。需要理解当前导航机制，看看能不能修复。
- 现行机制：`src/view/canvas-ui.js` `restoreRoute(true)` 在首个页面加载、无游戏历史状态且存在父级时调用 `addDirectLinkParents()`：把当前浏览器记录 replace 为父级（大地图／经营），再 push 当前页（`src/view/navigation.js` `gameHistory().write`）。式样见 `docs/ui/navigation.md`「通过菜单或直接打开页面链接时……上一级是大地图」。
- 推断根因（未经浏览器实测）：父级记录是在加载时、无用户激活的情况下由 `pushState` 补出的。Chromium 的历史操作干预会把“未经用户激活就新增记录前的那条”标为可跳过，浏览器返回键跳过补出的大地图记录，直接离开网站。游戏内返回按钮走 `history.back()`，不受该干预影响。

| 触发入口 | 适用条件 | 只允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| 首次加载直接链接（非首页、无 `farmNavigation` 状态） | 存在父级 | 加载时不再立即补父级记录，只保留当前一条；在首次用户激活事件（画布 pointerdown／pointerup、keydown 等，在 UI 处理之前）先补出父级链与当前页，再处理该输入 | 补出的记录结构、父级规则、上下文与滚动；之后的页内导航、弹窗分层、页签替换、游戏内返回按钮；刷新与前进／后退恢复 | 实际 diff |
| 首次激活前用户已通过 popstate／hashchange 改变路由，或会话被重置 | — | 取消待补，不重复补 | 现有 `resetSession`／`restoreRoute` 行为 | 同上 |

- 首次激活前直接按浏览器返回仍会离开网站，这是浏览器限制，文档如实写明。
- 文档：`docs/ui/navigation.md` 中直接链接父级的句子补充“父级记录在首次点击或按键时补入”。
