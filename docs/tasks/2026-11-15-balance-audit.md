# 长期经营与周目数值评估任务卡

- 用户目标：评估现行游戏数值能否支撑非常长期游玩和有特色的周目，生成 Markdown 报告，逐项指出具体数值、问题原因、建议数值或公式。
- 日期：2026-11-15。
- PM：主代理，负责真实执行路径、证据整合、建议一致性、需求与反馈记录。
- 方法：静态阅读设计文档、当前运行数据与实际代码；数值例子为公式推导，不是运行实测。历史 `state.js` / `catalog.json` 不作为当前版本依据。
- 本次允许验证：无。不得运行测试、模拟、冒烟、预览、语法或运行时检查、编译及验证脚本。无推送授权。
- 共享文件所有者：PM 独占本任务卡和 `docs/feedback-checklist.md`。最终报告由后继报告所有者独占。游戏源码、规格、数据和资产均不修改。
- 上下文：三个审查任务各自新建 `fork_turns: none`，仅传必要输入；后继报告任务接收审查成果与 PM 证据，不继承无关历史。

| 任务 / agent | 独立目标 | 唯一成果物与所有权 | 最少输入 | 下游与完成条件 |
| --- | --- | --- | --- | --- |
| NUM-01 / audit_production | 生产、配方、设施投资与工位约束 | `docs/reviews/2026-11-15-balance-production.md`，审查代理独占 | `world.js` 生产与设施函数、`advancement.js` 价格/速率、`game-data.json` 代表条目、扩展 01/07 相关章节 | PM；具体 ID、现值、源位置、手算、问题及建议公式，区分事实与推论 |
| NUM-02 / audit_progression | 研发、品质、永久科技、离线成长 | `docs/reviews/2026-11-15-balance-progression.md`，审查代理独占 | `advancement.js`、现行研究数据、扩展 01/06、`balance.md`、`research-pacing.json`、world 离线入口 | PM；同上，特别说明旧估算的版本边界 |
| NUM-03 / audit_prestige | 周目奖励、任务与长期重复体验 | `docs/reviews/2026-11-15-balance-prestige.md`，审查代理独占 | world 周目/入库函数、advancement 评估/费用、tasks/objectives、balance、sell-farm 说明 | PM；奖励曲线、取整与重置推导，提出可持续周目方案 |
| NUM-04 / balance_report | 统一独立可读的最终中文报告 | `docs/reviews/2026-11-15-long-term-balance-report.md`，报告代理独占 | PM 实际入口与版本差异摘要；三个审查片段交接后读取 | PM 复审；问题定位、原因、具体替代方案、长期周目方案与限制完整且一致 |

所有子代理不是独自在代码库工作，不得覆盖或撤销他人的修改。超出读取或所有权范围先交 PM 决策。输出包含接手、阶段、交付及未验证项。报告建议均为待标定设计，不代表现行行为或已经落地。

## 进展

- 三个独立静态审查任务已指派，执行中。
- 最终报告路径冻结为 `docs/reviews/2026-11-15-long-term-balance-report.md`，已分配 `balance_report` 单一所有者；当前只建立报告结构与已确认边界，三个审查成果交接后再整合其内容。
- PM 已核对真实 `main → world/advancement/objectives`、`canvas-ui → management-pages` 与数据生成路径；当前研发无自然日期门槛，历史 365 天结论不适用于现行版本。
