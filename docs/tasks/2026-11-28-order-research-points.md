# 普通研发点改由订单发放

## 用户确认的需求

- 普通研发点不再随有效时间按小时发放（在线、离线均不再累积）。
- 改为每交付一张订单发放：普通订单 50 点、高额订单 100 点、挑战订单 200 点。手动交付与「立即交付」相同。
- 「普通研发点倍率」科技改为百分比加成：第 L 级倍率 `100+4L`%（0 级 100%，50 级 300%），三档同乘，实发 `基础点 × (100+4L) / 100`（结果均为整数：普通 50+2L、高额 100+4L、挑战 200+8L）。科技级数上限、费用曲线与满级预算不变。
- 品质效果不变：所有品项每级单价 +约 10%（`p+(q−1)×floor((p+5)/10)`）。每抽仍消耗 100 点，抽取规则不变。
- 研究页「品质」去掉「距下次发放」倒计时，说明改为订单来源。

## 冻结接口

- `src/game/advancement.js`：删除 `basicResearchHourlyRate`；新增导出 `basicResearchRatePercent(world)` → `100 + 4 × techLevel(world,'basicResearchRate')`（Number）。`researchHourMs` 保留（代管时长仍在用）。
- `src/game/orders.js`：新增导出 `orderResearchBase = { normal: 50n, high: 100n, challenge: 200n }` 与 `orderResearchPoints(world, type)` → BigInt `orderResearchBase[type] × BigInt(basicResearchRatePercent(world)) / 100n`。`deliverOrder` 成功时在同一事务把该值加到 `world.basicResearchPoints`；`deliverOfferedOrder` 经 `deliverOrder` 自然覆盖。
- `src/game/quality.js`：删除 `accrueBasicResearch`；`qualityDrawCost`、`qualityDrawOffer`、`drawQuality` 不变。
- 世界字段：删除 `basicResearchElapsedMs`、`basicResearchWeightedMs`。`basicResearchPoints` 保留。旧档中的这两个字段读档时忽略，保存时省略；余额照常读入。`schemaVersion` 不变。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| BR-1 发放逻辑 | 子代理 order-research-logic（新上下文） | `src/game/advancement.js`、`src/game/orders.js`、`src/game/quality.js`、`src/game/world.js`（仅 `newWorld` 字段与 `advanceWorld` 调用）、`src/platform/world-save.js`（仅两个字段）、`src/main.js`（仅显示重投影与交付飘字） | 冻结接口实现；交付飘字附研发点 |
| BR-2 研究页 | 子代理 order-research-view（新上下文） | `src/view/research-page.js`、`src/view/canvas-ui.js`（仅 `researchProgress` 与 `clockOnlyFields`） | 去倒计时、来源说明、科技效果文案 |
| BR-3 文档 | BR-1、BR-2 交付后指派 | `AGENTS.md`（科技条目中普通研发点一句）、`docs/expansion/01-operations.md`、`docs/expansion/10-time-capsule.md`、`docs/game-design.md`、`docs/ui/pages/research.md`、`docs/ui/pages/orders.md`、`docs/ui/qa.md`、`docs/feedback-checklist.md` | 长期正文与反馈记录 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- BR-1 发放逻辑：已完成。
- BR-2 研究页：已完成。
- BR-3 文档：已完成；扩展范围的 `docs/economy-guidelines.md` E-22、`docs/architecture.md`、`docs/performance.md`、`docs/ui/pages/sell-farm.md`、`docs/verification.md`、`docs/expansion/07-balance-validation.md` 已同步（07 的品质任务外推口径标「待确认」）。
- 未验证：未运行测试，画面未实看。
