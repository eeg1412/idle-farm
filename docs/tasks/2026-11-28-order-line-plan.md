# 订单排产

## 用户确认的需求

- 已接受订单的按钮行改为「交付｜排产｜放弃」，订单卡与订单详情相同；「排产」为黄色（gold）按钮。三个按钮同一字号：空间不足时整行统一缩小，取其中最小字号。
- 点击「排产」：按当前状态计算排产方案，弹出预览，确认后执行。预览列出每条将变更的产线（原配方 → 新配方，运行中的批次标明将作废或退料）与执行后的预计完成时间；取消则不变。
- 方案规则：
  - 缺口 = 订单件数 −（库存 − 行脚商预留），沿配方 inputs 向上游拆解；每一环扣除该物品现有库存（扣预留与加工保留量）与已在生产该物品的订单产线产量，只为仍缺的环节排产线。
  - 数量按当前等级每小时产量配比平衡上下游，上限为平衡所需（方案 A），不追加多余产线。
  - 选线顺序：空产线 → 等料闲置的非订单产线 → 运行中的非订单产线（运行中优先进度最少的）；同一档内优先等级高的。带「订单」标签的产线（任一已接受订单的商品及其上游，`orderItemTags`）一律不动。
  - 执行后把方案涉及的加工位、精制位优先级设为最高，订单链先得原料。
- 按钮变灰，点击提示原因：库存已够交付；缺少某类设施（如「缺少鱼塘」）；可用产线凑不出完整链（如「没有可用的精制位」）；链上原料未研发且库存不足（「缺少「X」的配方」）。
- 订单交付或放弃后不自动恢复；「订单」标签按当前已接受订单实时计算，自然解除。

## 冻结接口

`src/game/order-plan.js`（新模块，纯逻辑，不依赖 PixiJS/DOM/真实时钟）：

```js
planOrderLines(world, orderId) →
  { status: 'ok', changes: [{ kind, index, from, to, running }], completion }
    // kind: 'C'|'L'|'F'|'M'|'I'|'P'；from: 原配方 ID 或 null；to: 新配方 ID；
    // running: 该产线有进行中批次（设施作废、工位退料）；
    // completion: 执行后 orderCompletion(world 副本, order) 的结果
  | { status: 'blocked', reason: 'stockReady' | 'missingFacility' | 'noSlot' | 'locked' | 'covered' | 'notAccepted', kind?, item? }
    // covered：订单产线已足够，方案为空（界面「产线已排好」）；notAccepted：订单不存在或未接受（PM 对接时扩充）
applyOrderLines(world, orderId, expectedChanges) → boolean
    // 重新计算方案，与 expectedChanges 一致才执行（复用现有配方安排函数与工位优先级），否则返回 false 且世界不变
```

动作名 `applyOrderLines`。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| OLP-1 排产逻辑 | 子代理 order-plan-logic（新上下文） | 新增 `src/game/order-plan.js`；`src/main.js`（仅登记动作与反馈） | 冻结接口实现 |
| OLP-2 排产界面 | 子代理 order-plan-view（新上下文） | `src/view/order-page.js`（按钮行、预览弹窗、灰色原因）、`src/view/canvas-ui.js`（按钮行统一字号选项） | 按钮与预览 |
| OLP-3 文档 | OLP-1、OLP-2 交付后指派 | `docs/ui/pages/orders.md`、`docs/game-design.md`、`docs/feedback-checklist.md` | 长期正文与反馈记录 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- OLP-1、OLP-2、OLP-3 均已完成。
- 接口扩充：`blocked.reason` 增加 `covered`（订单产线已足够，方案为空，界面「产线已排好」）与 `notAccepted`（订单不存在或未接受，界面「订单已结束」）；`planOrderLines(world, orderId, { completion })` 增加第三参数，`completion: false` 时不复制世界、不计算 `completion`，结果不含该字段，默认 `true`。
- 性能：订单卡与详情的「排产」按钮只需可用状态，调用 `completion: false` 的轻量形式；按钮与预览弹窗的结果分别按 world 对象（WeakMap）与订单 ID 缓存，同一显示世界内不重复计算。
- 长期正文：[订单中心界面](../ui/pages/orders.md)、[游戏设计 订单中心](../game-design.md#订单中心)；反馈记录见 [反馈清单](../feedback-checklist.md)「2026-11-28：订单排产」。

## 追加需求：产线数量拉杆（用户确认）

- 预览弹窗顶部（预计完成时间下方）加拉杆，调整订单商品新增产线数量；上游产线按比例自动配平。默认值为系统推荐的平衡值。拖动时变更列表与预计完成时间随拉杆重算（玩家操作驱动，不随经营状态实时更新）。
- 接口扩充：`planOrderLines(world, orderId, { completion, rootLines })`，结果增加 `rootRange: { min, max, recommended }` 与实际采用的 `rootLines`；不传 `rootLines` 时采用 `recommended`。`applyOrderLines(world, orderId, expectedChanges, rootLines)` 按同一 `rootLines` 重算，比较时忽略 `running`（批次进度变化不使确认失败）。

## 已知局限

- 上下游配比按各产线当前等级满负荷的近似速率计算，不计缺料与离线代管。
- 已在生产某环物品的产线可能同时供应多张已接受订单，计算本单时仍按全额计入。
- 批数与产线数逐级向上取整，配比结果可能多或少 1 条产线。
- 预计完成时间在执行后无运行批次可算时，按排产后订单商品的稳态每小时净产出估算，不计上游首批完工前的等待，可能偏早；净产出为 0 时显示「无法计算」。
- 上游每环受「一轮批次产量达到该环净需求即停」约束，拉杆把订单商品产线调多时，上游产线可能不再随之增加。
- `covered`（产线已排好）只在变更为空且拉杆上限为 0 时返回；推荐数量为 0 而上限大于 0 时返回 ok + 空变更，预览中「确认排产」灰色提示「无需改动」。

## 未验证

- 未运行测试，画面未实看。
