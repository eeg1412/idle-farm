---
name: farm-content
description: 修改《放置农场》的作物、配方、研究成本或品质规则时使用，检查材料来源和科技依赖。
---

1. 在 `docs/game-design.md` 的物品表和研发表修改定义。检查产物唯一性、整数件数及研发材料的生产来源。
2. 运行 `npm run content:generate`，阅读生成数据差异。保持已有 ID 稳定，按需更新存档迁移。
3. 运行 `npm run check`，为新增规则覆盖对应边界。报告是否存在无法到达的节点或资源争用回归。
