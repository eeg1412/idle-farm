# 任务完成冻结、任务页签与飞鸟时序

PM：主代理。反馈项见[反馈清单 2026-11-22](../feedback-checklist.md)。三张卡输入→输出互不重叠，文件所有权互斥，接口先冻结后并行。三项任务目标无关，各自新建干净上下文，不继承旧对话。

本次授权：普通阅读与实现。未授权测试、冒烟、预览、试编译、语法或运行时检查；子代理不编译，最终编译由 PM 在全部交付后执行。推送授权：无。

## 用户原话

1. 任务系统现在存在 bug，卖出庄园后很多本来已经完成的任务会重开，完成后又不给奖励。重开本质上就是 bug，任务完成后应该标记已完成，不管后来数值怎么变都不能重启。
2. 任务页面做 tab：未完成和已完成。已完成的进度不要出现超过目标的情况，冻结并标注完成。Tab 还需要符合当前浏览器返回按钮的通用逻辑。
3. 每次进入大地图都会有鸟飞过，比如页面切换。式样改成：只有开屏画面结束后必定有鸟飞过，后面按照定时器触发鸟飞过。页面切换不要有鸟。

## 冻结接口

- `objectives(world)` 与 `activeGuideTask(world)` 的返回结构不变：`{ guide, active, long }`，每项含 `id, name, condition, target, tab, current, required, gate, gateMet, done, rewardCoins, rewardResearchPoints, rewarded, branch?`。
- 新语义（TF-1 交付，TF-2 消费）：`done = rewarded || (原始计数 ≥ required && gateMet)`；`done` 时 `current === required`；未完成时 `current = min(原始计数, required)`。
- 任务页签路由（TF-2）：`#/tasks?tab=active` 为「未完成」，`#/tasks?tab=done` 为「已完成」，无 tab 时为「未完成」。

| 卡 | 代理 | 目标 | 成果物（独占） | 上下文 |
| --- | --- | --- | --- | --- |
| TF-1 | task_freeze_logic | 已领取任务永久完成、进度封顶 | `src/game/objectives.js`、`docs/game-design.md` §8.3 首两段 | 新建 |
| TF-2 | task_tabs_ui | 任务页两页签与浏览器返回 | `src/view/management-pages.js` 的 `renderTasks`、`src/view/navigation.js`、`docs/ui/pages/tasks.md`、`docs/ui/navigation.md` | 新建 |
| TF-3 | estate_bird_timing | 开屏后首趟、之后定时、切页无鸟 | `src/view/estate-atmosphere.js`、`src/view/estate-atmosphere-layout.js`、`docs/assets.md` 飞鸟段 | 新建 |

PM 独占：本文件、`docs/feedback-checklist.md`、`AGENTS.md`、最终编译。`src/view/canvas-ui.js`、`src/main.js` 本轮不分配；如确需改动先报 PM。

## TF-1 任务完成冻结

| 触发入口 | 适用条件 | 只允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| `progress()` 被 `objectives`、`activeGuideTask`、`settleTaskRewards` 调用 | 任务 ID 在 `world.taskRewards` 中 | 视为完成，`current` 显示为 `required` | 未领取任务仍按当前计数与产值门槛判定；`settleTaskRewards` 仍只对未领取且完成的任务同事务发一次奖；奖励数额、门槛、任务表不变 | 实际 diff |
| 同上 | 未领取 | `current` 封顶为 `required` | 门槛未达时不完成、不发奖 | 实际 diff |

- 原 `completedLegacy` 仅覆盖品质任务与 `techLevel1200`，改为对全部已领取任务生效即可，属于同一规则的推广。
- 式样：在 `docs/game-design.md` §8.3 写明“任务一经完成并到账即永久完成，之后计数下降（出售庄园重置设施、工位、田地等）不会重开；进度显示不超过目标”。把“已领取的六项品质任务与科技全满保留完成与到账”并入这条通则。

## TF-2 任务页签

| 触发入口 | 适用条件 | 只允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| 任务页 `renderTasks` | 任意 | 顶部加 `ui.tabs(['未完成','已完成'], …, { sticky: true, style: 'segmented' })`，切换时 `ui.local.tab=…; ui.local.scroll=0; ui.refresh()` | 卡片样式、前往按钮、`firstPlot` 前往出货、科技全满领取后只显示「完成」「已到账」、入门完成后滚动回顶 | 实际 diff |
| 「未完成」 | — | 列出当前阶段列表（`active ? guide : 长期（featured 排序）`）中 `!done` 的项 | 现有阶段选择逻辑 | 同上 |
| 「已完成」 | — | 列出 `guide`（含已显示的支线）与 `long` 中全部 `done` 项，进度显示 `required / required`，按钮「已完成」禁用 | 奖励行「已到账」 | 同上 |
| 浏览器返回 | 在任务页切换页签 | `navigation.js` 路由表 `任务: ['tasks', { 未完成: 'active', 已完成: 'done' }]`；替换规则列表加入 `'任务'`，页签切换替换当前记录，返回仍回到上一页 | 研究、行脚商现有替换规则；其他页面历史 | 同上 |

- 空列表文案：未完成为「全部任务已完成。」，已完成为「暂无已完成任务。」。保留一行原说明文字。
- 文档：`docs/ui/pages/tasks.md` 写入两页签、冻结完成和进度封顶，删除“读取当前等级”“出售庄园后重新累计”这类与冻结冲突的描述（未完成任务仍按当前计数）；`docs/ui/navigation.md` 路由表加任务页签网址，替换记录一句加入任务页签。
- 依赖：TF-1 的冻结接口，不需等待 TF-1 交付即可实现。

### TF-2b 入门完成后列出未完成支线

用户原话：入门任务全部完成后，未完成的产业支线（畜牧、水产等）列进「未完成」页签。上下文：TF-2 的连续成果物，复用 task_tabs_ui，重新取得 `renderTasks` 与 `docs/ui/pages/tasks.md` 的所有权。

| 触发入口 | 适用条件 | 只允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| 「未完成」页签 | `active === false`（入门主线全部完成） | 列表为：`guide` 中带 `branch` 的未完成支线在前，其后为原 featured 排序的长期目标中的未完成项 | 入门期（`active === true`）列表不变；「已完成」页签不变；卡片与按钮行为不变 | 实际 diff |

文档：`docs/ui/pages/tasks.md` 写明入门完成后「未完成」页签先列未完成支线，再列长期目标。

## TF-3 飞鸟时序

| 触发入口 | 适用条件 | 只允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| 开屏完成后大地图首次处于活动状态 | 本次运行会话内首次 | 必定飞过第一趟（pass 0，现行首趟起点规则不变） | 纹理加载完成前不消耗时间 | 实际 diff |
| 之后 | 地图活动时 | 按 `passEveryMs` 定时器飞后续各趟；计时跨地图卸载/重挂、尺寸重建持续保存在会话级（模块级）时钟，不随新实例归零 | 每趟随机路线、3 鸟池、四帧、暂停、80ms 上限、30fps 节流、层级 | 同上 |
| 从其他页面回到大地图、旋转或尺寸改变导致新实例 | 任意 | 不重新开始第一趟；若时钟落在某趟飞行中，跳过该趟剩余部分，等下一趟 | 同一实例内弹窗/菜单/后台暂停后恢复，继续原趟 | 同上 |

- 不改 `canvas-ui.js`、`estate-map.js`；`estate-map` 仍通过 `mountEstateAtmosphere` 和 holder 接口调用。
- 文档：更新 `docs/assets.md` 中“离图销毁，同尺寸地图重建复用holder与时钟。首次约4.2秒出现，每19.2秒一趟”等飞鸟时序描述为新式样。
- 遵守[性能规约](../performance.md)：不加 timer/RAF/整页重绘，沿用现有 ticker。
