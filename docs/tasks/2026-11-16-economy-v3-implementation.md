# 经济再平衡 v3 实施任务卡

- 日期：2026-11-16。PM：主代理，独占本任务卡、`docs/feedback-checklist.md` 与 `AGENTS.md`。
- 用户目标：“按照最新的代码结合 `docs/reviews/2026-11-16-economy-rebalance-plan.md`，对项目进行修正。”即按 ECO-01 方案（LT-2026-11-v3）实施，基线为提交 8a0d570。
- 用户采纳方案即采纳 §7 规约替换；工位增长公式按方案默认“每级每批 +1 件、投入×level”（用户原话截断，未另行指定）。
- 本次允许：阅读、实现、按 `npm run content:generate` 生成运行数据（交付工作）；全部完成后 PM 执行最终编译。禁止：测试、冒烟、预览、试编译、语法或运行时检查、`--check`、平衡/模拟脚本、skill 验证脚本。无推送授权。

## 冻结接口

- 工位：`station.level` 十进制字符串，新建/旧档/出售牧场重建默认 `'1'`；每批产出 = level 件，投入 = 配方数量×level，升级自下一批生效。
- `world.js` 新导出 `stationUpgradeOffer(world, kind, index, steps)`（steps 为 BigInt 或 `'max'`）→ `{ cost, affordable, target, currentOutput, output, durationMs }`，与 `facilityOffer` 单设施报价同形；`upgradeStation(world, kind, index, steps)` → boolean。
- `stats.batchSales`：BigInt，存档十进制字符串，缺省 0n；`sellBatch` 成功且有 ≥2 个成交报价时 +1。
- `objectives.js` 新导出 `taskResearchPointRewards`（id→BigInt）；`progress()` 项新增 `rewardResearchPoints`（缺省 0n）；`settleTaskRewards` 返回 `{ ids, coins, researchPoints }` 并在同一草稿 `world.researchPoints += researchPoints`。
- 账本：`prestigeLedgerVersion = 'LT-2026-11-v3'`；v2→v3 迁移 coins、productionValue、lifetimeProductionValue 各 ×10 一次。
- 运行数据：`balanceVersion = 'LT-2026-11-v3'`；`game-data.json` 结构字段不变（items.price、research.coins/costs/requires）。
- `docs/expansion/07` 新增两张供生成器读取的表（格式冻结）：
  - `### 7.7 研发总价锚点`：表头 `| U锚点 | 基准值B |`，6 行整数，如 `| 5 | 100 |`、`| 200 | 550000 |`、`| 420000 | 75000000000000000 |`。
  - `### 7.8 研发引导覆盖`：表头 `| ID | 金币 | 材料 |`，材料用 `N×ID + N×ID`，5 行：P01 120 `2×C01 + 1×I01`；IL01 6000000 `100×L01`；IF01 6000000 `100×F01`；IL02 15000000 `400×L02`；PD01 20000000 `20×I01 + 20×IL01 + 20×IL02`。

| 任务 / agent | 唯一目标 | 唯一成果物与所有权 | 上下文 |
| --- | --- | --- | --- |
| ECO-03 / v3_specs | 按方案 §7 改正式式样 | `docs/expansion/01-operations.md`、`docs/expansion/07-balance-validation.md`、`docs/game-design.md`、`docs/ui/pages/tasks.md`、`docs/ui/pages/workshop.md` | 新建干净上下文；与 ECO-01/02 代理无存活上下文，只传本卡与方案路径 |
| ECO-04 / v3_data | 生成器按 §3.2/3.3/3.6 重写并重新生成数据 | `scripts/long-term-balance.mjs`、`scripts/generate-game-data.mjs`、`src/content/game-data.json`（仅经生成命令写入） | 新建干净上下文；依赖 ECO-03 的 07 §7.7/7.8（格式已冻结，可先实现，07 交付后再生成） |
| ECO-05 / v3_logic | 游戏逻辑与存档按 §3.4–3.10、§4、§6 实施 | `src/game/advancement.js`、`src/game/world.js`、`src/game/prestige-ledger.js`、`src/game/objectives.js`、`src/platform/world-save.js` | 新建干净上下文；耦合工作（迁移横跨账本与存档）留在同一任务 |
| ECO-06 / v3_ui | 工位升级界面、任务 RP 显示、动作白名单 | `src/main.js`、`src/view/production-pages.js`、`src/view/management-pages.js` | 新建干净上下文；按冻结接口与 ECO-05 并行 |
| PM | AGENTS.md §7 替换、反馈清单、最终编译 | `AGENTS.md`、`docs/feedback-checklist.md`、本卡 | — |

未分配：`tests/*` 不改不跑（会与新数值不一致，待用户授权验证时另开任务）。

## 进展

- 四项任务已指派。
- ECO-06 已交付：main.js 白名单/反馈/任务奖励文案含“高级研发点”；production-pages.js `improveStation` 对话框、工位卡等级与升级按钮；management-pages.js 任务 RP 显示、45 项新任务 taskArt、操作说明。依赖 ECO-05 的任务 ID 与 §4.3 一致，待整合核对。所有权交回 PM。
- ECO-04 生成器代码已交付，未生成。PM 裁定：材料上限按方案正文 4 小时（附录 F4 实为 2 小时，以正文与 §3.11 为准）；U<5 沿首段外推。待 ECO-03 交付 07 后通知生成。
- ECO-05 已交付五个文件；接口偏差：`stationRequirements(world, id, level=1n)` 新增第三参，PM 已在 production-pages.js 三处调用传入 `station.level`。支线任务提交时即评估（不受 sold>0 显示门槛）；L01/F01 研发远晚于 firstSale，实际无提前发奖，PM 接受。旧档补发新任务按方案默认。
- ECO-03 已交付五份式样与 07 §7.7/7.8；已通知 ECO-04 生成。ECO-03 同一成果物延续：所有权扩展到 game-design.md 全文、expansion README/02/03/04/08（仅散文，不动机读表；05/06 不动）、balance.md、ui/qa.md、ui/pages/research.md，清理 v2 残留。
- ECO-04 已生成 LT-2026-11-v3（525 品项、523 研发）：C01 30、C50 156,250、L01 4,800、F01 7,623、I01 95、P01 300；研发 C02 900+7×C01+2×I01、C12 2.83e5 < C13 4.0e5、L01 7.33e5+12,222×C01、C50 3.99e13；研发金币合计 3.64e18；覆盖 5 项与 07 §7.8 一致。原料 U 改用生成价 price·out/t（与附录 F4 及品质 U 一致），已通知 ECO-03 在 07 §7.4 写明。生成命令运行两次（第一次 U 口径偏差）。所有权交回 PM。
- ECO-03 续作已交付：game-design.md 全文、expansion README/02/03/04/08（仅散文，表格行未动）、balance.md、ui/qa.md、ui/pages/research.md 清理 v2 残留；07 §7.4 写明 U=price×output×1000/durationMs。注意：首次出售后 newFarm 奖励 96,000,000,000 金币在同一提交到账（F5 公式值），第二轮实际起始约 9.6e10 金币。
- PM 最终 `npm run build` 退出码 0。全部所有权回到 PM，任务结束。未运行测试、预览或语法检查；`tests/*` 未更新，预计与新数值不一致。未提交、未推送。
