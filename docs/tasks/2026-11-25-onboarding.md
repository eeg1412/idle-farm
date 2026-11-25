# 新手开场与任务讲解

## 用户确认的需求

- 只在第一次建档（`newWorld` 新建的庄园）触发开场；读取已有存档、出售庄园后的新一轮不触发。
- 开场：加载后强制进入庄园大地图并滚到顶部，露出任务公告栏；天气固定晴天。地图压暗（0.55），任务管理员从画布底部中间升起（0.4 秒），头顶气泡逐字讲 3 句（`introLines`：欢迎 → 游戏循环 → 去任务公告栏看看），男女各一版，按当前任务管理员性别。点任意处推进：打字中点击先补全，再点进入下一句。不设跳过。（初版写「右下角升起」，用户改为底部中间。）
- 第 3 句后管理员退下；任务公告栏（建筑与「任务」木牌）周围亮圈、其余压暗，上下跳动的箭头指向公告栏；此时只有公告栏可点。
- 进入任务页时解除晴天锁定，之后按原规则 10–30 分钟后才重新抽天气。任务页顶部横幅的管理员直接处于隐藏状态（无消失动画）；画面压暗，管理员从底部中间升起讲 3 句（`taskPageLines`）；讲完退下后才提交 `completeIntro` 写入存档，顶部管理员回来（立绘从横幅底边升回，气泡与按钮淡入），对白从原进度继续。（初版写「进入任务界面即开场完成」，按本段执行。）开场完成前关闭或刷新，下次从大地图重新开始。
- 任务页「未完成」页签的主线与支线任务卡，在「前往…」左边加问号按钮；长期任务与「已完成」页签不加。点击后顶部横幅背景保留，横幅中的管理员立绘向下沉出横幅（被横幅裁切），气泡与按钮淡出（0.2 秒）；画面压暗，管理员从底部中间升起讲该任务的固定说明；打字中点击补全，讲完再点关闭，管理员退下，顶部管理员回来并继续原句。讲解期间其他操作不可用。
- 固定说明：主线 17 项、支线 19 项，每项 1–2 句，讲任务用途，不重复操作步骤；男女各一版，符合[露斐／维诺人设](../npc-personalities.md#逐人设定)。全部写完交用户审阅。
- 校验全部新手任务的指示链，指出不完整处。

## 冻结接口

- `world.introPending`：boolean。`newWorld` 设 `true`；`sellFarm` 保留原值；存档以 boolean 保存，旧档缺字段读为 `false`。
- `src/game/world.js` 导出 `completeIntro(world)`：`introPending` 为 `true` 时改为 `false` 并返回 `true`，否则返回 `false`。`src/main.js` 登记动作名 `completeIntro`，经现有保存事务提交，无 Toast、无音效。
- `src/view/onboarding-text.js`：
  - `introLines(gender)` → 3 个字符串（`gender` 为 `'female' | 'male'`）。
  - `taskPageLines(gender)` → 任务页开场 3 个字符串。
  - `taskExplanation(taskId, gender)` → 字符串；`taskId` 为主线与支线的 36 个任务 ID。
  - 文中「」包住的词按现有规则红字强调。
- 天气：`createEstateWeatherSession()` 返回的会话新增 `setSunnyLock(locked)`。锁定期间雨势为 0、不抽取；解除时下一次抽取在解除时刻后随机 10–30 分钟。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| OB-1 指示链核对 | 子代理 onboarding-audit（新上下文） | 新增 `docs/tasks/2026-11-25-onboarding-audit.md` | 主线与支线逐步核对报告（只读源码与数据） |
| OB-2 文案 | 子代理 onboarding-copy（新上下文） | 新增 `src/view/onboarding-text.js`（原名 `onboarding-copy.js`） | 开场 3 句与 36 项固定说明，男女各一版 |
| OB-3 存档状态 | 子代理 onboarding-state（新上下文） | `src/game/world.js`（仅 `newWorld`、`sellFarm` 保留字段、新增 `completeIntro`）、`src/platform/world-save.js`（仅该字段）、`src/main.js`（仅登记动作） | `introPending` 字段与动作 |
| OB-4 界面 | 子代理 onboarding-ui（新上下文） | 新增 `src/view/onboarding-overlay.js`；`src/view/canvas-ui.js`、`src/view/estate-map.js`、`src/view/estate-weather.js`、`src/view/management-pages.js`（仅 `renderTasks` 问号按钮） | 开场流程、地图引导、问号讲解、横幅淡出淡入、晴天锁定 |
| OB-6 规则 | 子代理 onboarding-rules（新上下文） | `src/game/orders.js`（仅首单件数上限）、`src/game/world.js`（仅 `farmSaleOffer` 新字段与 `sellFarm` 拒绝） | 首单上限 10 件；主线未完成不可出售庄园 |
| OB-7 指导修正 | 子代理 onboarding-guide（新上下文） | `src/view/manager-help.js`、`src/view/manager-help-text.js`、`src/view/manager-page.js`、`src/view/management-pages.js`（仅 `renderFarmSale` 按钮与任务指导相关处） | 核对报告第 1–8 项指导修正；出售按钮变灰 |
| OB-5 文档 | 待 OB-6、OB-7 交付后指派 | `AGENTS.md`（订单条目）、`docs/ui/pages/tasks.md`、`docs/ui/pages/estate.md`、`docs/ui/pages/sell-farm.md`、`docs/game-design.md`、`docs/tasks/2026-11-22-order-center.md`、`docs/feedback-checklist.md` | 长期正文与反馈记录；修正任务页文档首次出货奖励 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

OB-4 交付后，PM 已将 `manager-help-copy.js` 与 `onboarding-copy.js` 改名为 `manager-help-text.js` 与 `onboarding-text.js`（用户确认），并同步 import 与文档路径。

## 追加需求（用户确认）

- 首单件数上限 10 件：「完成1件订单」任务尚未发放奖励（`taskRewards` 不含 `firstOrder`）时生成的高额订单，件数 = min(原公式, 10)，至少 1 件。报酬按封顶后件数计算。普通订单、挑战订单不变。
- 新手主线未完成（`activeGuideTask(world)` 不为 null）时不可出售庄园：「出售庄园」页的出售按钮变灰，点击显示简短原因；`sellFarm` 同条件返回 false。`legacyGuideCompleted` 的老存档不受影响。
- 核对报告 [onboarding-audit](2026-11-25-onboarding-audit.md) 列出的指导修正（不改规则）：任务页主线完成后讲第一个未完成支线；支线入库／加工与复合商品点名要研发的品项，研究页显示该指导，矿业写明材料与金币；升级类任务补金币不足分支；扩充配方点名下一项；扩建田地、添置加工位、添置精制位在任务页不再说「要先有个生产的地方」；永久科技说明高级研发点来自出售庄园；研发乡村面包材料不足时说明缺哪样；首单备货显示还差几件，无单时给出具体下一步与等待分钟数。

- 气泡换行修正：开引号后紧跟闭合标点（如「？」）时不再错位（`src/view/manager-speech.js` `groupForLineBreak`）。

## 状态

OB-1 至 OB-7 已交付。追加「前往」演出已实施：主线与支线任务卡的「前往…」「前往出货」「前往研究」带来源任务 ID（不写入网址，长期任务不带），目标页岗位管理员从底部中间升起讲该任务在本页的动态指导，指导为空不演出；出售庄园页在主线未完成时讲先完成主线。行为见 `docs/ui/pages/tasks.md`「前往演出」。长期文档已同步：`AGENTS.md`（订单条目首单上限）、`docs/game-design.md`、`docs/ui/pages/tasks.md`、`docs/ui/pages/estate.md`、`docs/ui/pages/sell-farm.md`、`docs/tasks/2026-11-22-order-center.md`、`docs/feedback-checklist.md`。

## 未验证

- 未运行测试。预计约 30 个既有测试用例因「主线未完成不可出售庄园」失败（它们在新档上直接出售庄园），1 个订单件数用例可能因首单上限失败；均未运行确认。
- 画面只经用户实看部分，其余未实看；「前往」演出各落点分支未实看。

## 追加需求：「前往」演出（用户确认）

- 新手任务（主线、支线）卡片上的「前往…」「前往出货」「前往研究」按钮，每次点击都把跳转标记为来自该任务（携带任务 ID）。长期任务不标记。
- 到达目标页时，该页顶部横幅的管理员直接处于隐藏状态（无消失动画）；画面压暗，目标页自己的管理员（按该页岗位与当前性别）从底部中间升起，逐字讲所标记任务在本页的动态指导；讲完退下后，顶部横幅管理员升回并继续原句。交互与任务页「？」讲解相同。
- 指导内容按标记的任务 ID 取，不按页面另选任务；覆盖每个新手任务所有可能的落点分支（含缺钱时的仓库、未解锁时的研究页、升级与购买、订单各状态）。指导为空时不演出。

冻结接口：`src/view/manager-help.js` 导出 `managerTaskGuide(world, taskId, page, speaker)` → `{ text, emphasis, expression } | null`；`page` 为页面名（田地、畜牧、鱼塘、矿洞、加工、精制、仓库、研究、订单中心、图鉴、出售庄园），`speaker` 为目标页管理员 `{ role, gender }`。

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| OB-8 落点指导 | 子代理 onboarding-guide（复用：同一指导链的连续成果物） | `src/view/manager-help.js`、`src/view/manager-help-text.js` | `managerTaskGuide` 与全分支文案矩阵 |
| OB-9 前往演出 | 子代理 onboarding-ui（复用：同一叠层组件的连续成果物） | `src/view/canvas-ui.js`、`src/view/onboarding-overlay.js`、`src/view/management-pages.js`（仅 `renderTasks` 的「前往」点击标记） | 跳转标记、目标页演出、横幅隐藏与恢复 |
