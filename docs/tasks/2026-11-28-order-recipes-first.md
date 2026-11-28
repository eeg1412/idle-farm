# 选择配方时订单配方优先

## 用户确认的需求

- 更换配方时优先显示订单的配方。

PM 解释（按现有「订单」标签口径）：选择或更换配方／品种的选择网格（单个产线与批量选择，田地、畜牧、鱼塘、矿洞、料坊、工房）中，带「订单商品」标签的选项排最前，其次「订单原料」，其余保持原顺序；同组内保持原顺序。标签集合来自 `orderItemTags`（已接受订单的商品及其全部上游）。来源页签筛选、标签显示、已安排条数不变。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| OR-1 订单配方优先 | 子代理 order-recipes-first（新上下文；代码与文档为同一不可再分输出） | `src/view/production-pages.js`（仅 `replacementChoices` 排序）、`docs/ui/pages/fields.md`、`docs/ui/pages/workshop.md`（选择网格排序描述）、`docs/feedback-checklist.md`（末尾新增条目） | 排序与文档 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- OR-1：`src/view/production-pages.js` `replacementChoices` 已加稳定排序；追加需求「改用其他配方会终止本批的文案去掉。」「所有产线类似的文案都去掉 比如作物 什么的」：已删除 `chooseRecipe` 中止本批提示、`chooseFacility` 品种更换提示与 `batchImpact` 函数及两处调用（批量更换、批量清空）；`docs/ui/pages/fields.md`、`docs/ui/pages/workshop.md`、`docs/feedback-checklist.md` 已同步。待 PM 读 diff 与最终构建；未运行测试，画面未实看。
