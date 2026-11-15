---
name: farm-content
description: 修改《放置农场》的作物、配方、研究成本或品质规则时使用，检查材料来源和科技依赖。
---

1. 以 `docs/expansion/05-catalog.md`、`06-research.md` 和涉及的 `02-livestock-fish.md` 为正式数据源；`docs/game-design.md` 保留旧版基础规格。检查产物唯一性、整数件数及研发材料来源。
2. 新增品项时同步 `scripts/catalog-rules.mjs` 的 `kindCounts`，再用 `npm run content:generate` 生成运行数据。保持已有 ID 稳定，按需更新旧档迁移。
3. 新增或改画作物按 [farm-crops](../farm-crops/SKILL.md) 交付；牲畜按 [farm-livestock](../farm-livestock/SKILL.md) 交付，不能只补内容数据而遗漏图标、设施回退和动画。
4. 验证遵守 `AGENTS.md`：用户明确授权前不运行 `npm run check`、测试、预览或同类检查；全部模块完成后由主管执行最终编译。已有授权时为规则边界补充对应验收，记录真实结果与剩余限制。
