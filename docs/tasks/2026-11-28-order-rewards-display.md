# 订单收益显示与开拓奖励

## 用户确认的需求

- 订单列表（大卡、小卡）与订单详情显示普通研发点收益。
- 订单全部收益以「图标＋数量」显示，与任务卡奖励行同样式（`ui.rewards`）：金币、普通研发点，挑战单另加时空胶囊（数量为 0 不显示）。「固定报酬」文字行取消；原有报酬倍率涨跌标记保留，跟在金币项后。小卡「N 件 · X 金币」改为「N 件」＋图标收益。
- 挑战订单「开拓奖金」（金币，研发成本 ×10）整个取消，改为「开拓奖励」普通研发点：出单时目标商品仍有未研发配方（`missing.length > 0`）为 200 点，已全部研发为 100 点，出单时判定并写入订单。开拓奖励与交付点数一样乘「普通研发点倍率」。挑战单研发点合计：缺研发 200+200=400，不缺 200+100=300（未加成）。
- 已生成的旧挑战单：保留出单时的金币报酬（含旧开拓奖金），不补开拓研发点。
- 界面研发点显示加成后的实际值，交付点数与开拓奖励合为一个数。

## 冻结接口

`src/game/orders.js`：
- 新挑战单 `bonus` 为 `0n`，`reward = count × floor((U×rate+5)/10)`（不再加金币奖金）；新增字段 `pioneer`（BigInt，`200n` 或 `100n`）。旧单无 `pioneer` 时视为 `0n`。
- 导出 `orderResearchReward(world, order)` → BigInt `(orderResearchBase[order.type] + (order.pioneer ?? 0n)) × BigInt(basicResearchRatePercent(world)) / 100n`。`deliverOrder` 改用它发放。`orderResearchPoints(world, type)` 保留。
- 存档：`pioneer` 只在挑战单上以十进制字符串保存（`src/platform/world-save.js` 订单序列化处），读档缺省 `0n`（`restoreOrders`）。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| BR-4 开拓奖励逻辑 | 子代理 order-research-logic（复用：BR-1 的直接依赖链，同一发放函数） | `src/game/orders.js`（挑战生成、恢复、发放）、`src/platform/world-save.js`（仅订单序列化 `pioneer`） | 冻结接口 |
| BR-5 订单收益显示 | 子代理 order-rewards-view（新上下文） | `src/view/order-page.js`（收益行、小卡）、`src/view/canvas-ui.js`（仅 `rewards`/`rewardFlow` 为倍率标记所需的扩展） | 图标收益行 |
| BR-6 文档 | BR-4、BR-5 交付后指派 | `AGENTS.md`（订单条目开拓奖金一句）、`docs/tasks/2026-11-24-order-types.md`、`docs/tasks/2026-11-25-order-balance.md`、`docs/game-design.md`、`docs/ui/pages/orders.md`、`docs/feedback-checklist.md` | 长期正文与反馈记录 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- BR-4 开拓奖励逻辑：已完成。
- BR-5 订单收益显示：已完成。
- BR-6 文档：已完成。
- BR-7 报酬标题与小卡、BR-8 报酬并排：已完成，文档已同步到[订单中心](../ui/pages/orders.md)与反馈清单。
- BR-9 缺口与分档、BR-10 文档：已完成。
- 未验证：未运行测试，画面未实看；开拓奖励改为研发点后的收益对比未复算。

## 追加需求：报酬标题与小卡（用户确认）

- 大卡与详情：图标收益行上方加标题「报酬」。
- 小卡：第一行「需 N 件」；新起一行「报酬：」后接图标收益。小卡上的订单类型与状态标签缩小以节约空间（大卡、详情的标签不变）。
- 金币项后的报酬倍率标记外加括号，如「(▲ ×1.2)」；只作用于订单收益行，仓库等其他倍率标记不变。

| 任务 | 所有者 | 可编辑文件 |
|---|---|---|
| BR-7 报酬标题与小卡 | 子代理 order-rewards-view（复用：BR-5 同一成果物的连续修改） | `src/view/order-page.js`、`src/view/canvas-ui.js`（仅 `rewardFlow` 倍率括号与 `item` 标签尺寸可选参数） |

## 追加需求：报酬与标题并排（用户确认）

- 大卡与详情：图标收益放得下时，与标题「报酬」同一行，标题居左、收益居右；放不下时才换到下一行（现行方式）。小卡不变。

| 任务 | 所有者 | 可编辑文件 |
|---|---|---|
| BR-8 报酬并排 | 子代理 order-rewards-view（复用：BR-5 同一成果物） | `src/view/order-page.js`、`src/view/canvas-ui.js`（仅 `rewards`/`rewardFlow`）；待 CB-1 交还 canvas-ui.js 后开始 |

## 追加需求：挑战研发缺口与开拓奖励分档（用户确认）

- 挑战订单目标的研发缺口上限由 2 改为 3（`maxChallengeGap = 3`）；没有缺口 ≤3 的商品时仍取最小缺口。
- 开拓奖励按出单时的研发缺口分档：`pioneer = 100 + 100 × 缺口`（0→100、1→200、2→300、3→400 普通研发点；最小缺口兜底超过 3 时按同一公式）。交付时与交付点数 200 相加后同乘普通研发点倍率。已出的挑战单保留出单时写入的值。

| 任务 | 所有者 | 可编辑文件 |
|---|---|---|
| BR-9 缺口与分档 | 子代理 order-research-logic（复用：BR-4 同一函数） | `src/game/orders.js`（`maxChallengeGap`、`makeChallenge` 的 `pioneer` 与注释） |
| BR-10 文档 | 子代理 order-research-docs（复用：BR-6 同一文档） | `AGENTS.md`（订单条目）、`docs/tasks/2026-11-24-order-types.md`、`docs/tasks/2026-11-25-order-balance.md`、`docs/game-design.md`、`docs/economy-guidelines.md`、`docs/ui/pages/orders.md`、`docs/feedback-checklist.md` |
