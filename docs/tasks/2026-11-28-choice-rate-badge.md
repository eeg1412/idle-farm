# 选择网格倍率角标

## 用户确认的需求

- 选择产物或配方时的小卡片（选择网格），行情倍率不再单独占一行（不再跟在名称后或独占一行），改为显示在图标右上角；不用涨跌箭头图标，只显示倍率文字（如「×1.2」），文字加白色描边。文字颜色沿用现有涨绿跌红（PM 解释，用户未要求改色）。
- 适用于选择网格的普通与仅图标两种形态；卡片高度不再为倍率预留空间。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| CR-1 倍率角标 | 子代理 choice-rate-badge（新上下文；代码与文档为同一不可再分输出） | `src/view/canvas-ui.js`（仅 `choiceGrid`）、`docs/ui/pages/fields.md`、`docs/ui/pages/workshop.md`、`docs/feedback-checklist.md`（末尾新增条目） | 角标与文档 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- CR-1 已实施：`src/view/canvas-ui.js` `choiceGrid` 两种形态改为卡片左上角白色描边倍率角标（按用户后续反馈由图标右上角改到卡片左上角），不画方向图标，高度不再为倍率预留；`docs/ui/pages/fields.md`、`docs/ui/pages/workshop.md`、`docs/feedback-checklist.md` 已同步。
- 未运行测试，画面未实看；待 PM 读 diff 与最终编译。
