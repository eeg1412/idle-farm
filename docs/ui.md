# 《放置庄园》UI 文档索引

[v1.14 畜牧与水产界面参考图](ui-references/v1.14/README.md) · [v1.14 经营与交互规则](expansion/01-operations.md)

首次进入显示庄园的田地页。庄园、工坊、仓库、研究和经营使用底栏，任务、图鉴、设置、出售庄园和行脚商通过页内入口进入。按当前任务读取对应文件。经营数值与前置见[游戏式样书](game-design.md)，已实现范围见[架构说明](architecture.md)。

## 通用规则

| 工作 | 读取 |
| --- | --- |
| 应用外壳、页面入口、响应式布局 | [全局导航与画布布局](ui/navigation.md) |
| 缩写、完整整数、数量输入、窄屏 | [数字显示](ui/numbers.md) |
| Dialog、Toast、点击处浮动小字 | [反馈规则](ui/feedback.md) |
| 验收 | [界面验收](ui/qa.md) |
| 绘制稿 | [八页界面参考图](ui-references/README.md) |

## 逐页规格

| 页面 | 读取 |
| --- | --- |
| 庄园 | [庄园与设施](ui/pages/fields.md) |
| 工坊 | [加工与精制](ui/pages/workshop.md) |
| 仓库 | [库存与出货](ui/pages/warehouse.md) |
| 行脚商 | [货架买入、求购卖出与换货](ui/pages/merchant.md) |
| 研究 | [种子、配方、品质与经营改良](ui/pages/research.md) |
| 经营 | [经营入口](ui/pages/management.md) |
| 任务 | [入门与长期任务](ui/pages/tasks.md) |
| 图鉴 | [图鉴与收集](ui/pages/catalog.md) |
| 设置 | [声音、显示与说明](ui/pages/settings.md) |
| 出售庄园 | [出售预览与确认](ui/pages/sell-farm.md) |
