# 打开菜单时飞鸟暂停

PM：主代理。单一输出、单一所有者（menu_bird_pause，新建上下文）。未授权测试、预览或推送；最终编译由 PM 执行。

- 用户原话：修复一个 BUG，打开菜单时飞鸟会暂停。
- 根因：`src/view/canvas-ui.js` 中 `atmosphereActive = mapActive && openingScreen.complete && !status?.busy && !navigationMenu`，菜单打开即停止推进飞鸟时钟。现行 `docs/assets.md` 也写着“后台、弹窗、菜单暂停”。

| 触发入口 | 适用条件 | 只允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| 大地图右上菜单展开 | 地图可见、开屏完成、无弹窗、非后台、非忙碌 | 飞鸟继续推进与绘制 | 后台、弹窗、忙碌状态仍暂停；开屏后首趟与会话级定时器规则；行脚商动件、研究动画等其他动画的现有暂停行为不变 | 实际 diff |

- 可编辑：`src/view/canvas-ui.js` 中 `atmosphereActive` 这一处；`docs/assets.md` 中飞鸟暂停条件的句子。

## 追加：行脚商动件文档修正

- 用户原话：行脚商的旗子和挂灯在打开菜单时暂停 → 不能暂停，文档错误，修正。
- 事实：`estate-map.js` 中行脚商动件与研究动画由 `buildingsActive`（即 `mapActive`，不含菜单条件）驱动，菜单展开时照常运动；`docs/assets.md` 第 195 行写“后台／弹窗／菜单暂停”，与代码和用户意图不符。
- 只改 `docs/assets.md` 第 195 行该句：去掉“菜单”，写明菜单展开时照常运动。代码不改。单一所有者 merchant_doc_fix。
