# 管理员界面四项修正

## 目标、输入与所有权

- 基线：GitHub 最新 main `14f5041`；已同步到原 Sites 工作区，保留 Sites 源码历史与项目 ID。
- 需求：经营首页取消页面介绍、恢复既有日常对白；出售庄园与图鉴删除管理员下方的小横幅；所有玩家可见「切换形象」统一为「切换角色」；管理员资料切换按钮使用普通淡色。
- PM：`/root`，拥有本任务卡、反馈清单及相关 UI 文档，负责需求、整合、最终构建和原 Sites 发布。
- 实现所有者：`manager_ui_fixes`，目标为四项界面修正，独占 `src/view/manager-page.js`、`src/view/management-pages.js`。交付后结束所有权。
- 新建干净上下文 `fork_turns: none`；四项共享两个界面文件与管理员路径，作为单一连续成果物，不拆分并发修改。无共享资产生成，无其他接口依赖，无所有权转交。

## 最少读取与精确依据

- `AGENTS.md`；`docs/development.md` 的无人值守实装及 GitHub 推送授权；`docs/performance.md` 渲染部分。
- `src/view/manager-page.js` 的 `estatePageIntroductions`、`managerInfo`、`renderManager`、`renderManagerDirectory`。
- `src/view/management-pages.js` 的 `managementEntries`、`renderCatalog`、`renderFarmSale`。
- `src/view/canvas-ui.js` 的按钮 tone 映射与 `renderManager` 调用；普通 `plain` 使用 `palette.pale`。
- `docs/ui/pages/management.md`、`docs/tasks/2026-11-19-manager-guidance.md` 的本次行为段。

## 实现边界与冻结接口

- 仅删除介绍映射中的「经营」项，五个经营子页介绍和既有帮助、送礼优先级继续沿原路径。
- 删除 `catalog-banner`、`sale-banner` 两处 `ui.image` 调用；管理员横幅由 `canvas-ui.js` 统一渲染，继续保留。不删除素材文件。
- 玩家文案包括管理页说明、介绍句、顶部操作标签及列表按钮，均用「切换角色」；动作名 `switchManagerAppearance` 与存档字段不改。
- 资料切换按钮显式 `tone: 'plain'`，保留原图标、动作和排版。
- 单画布 PixiJS、现有命中和可见性逻辑不变；不增 DOM、不改经济、存档、素材、动画、对白队列或定时器。
- 允许范围外的必要修改先报告 PM，不自行扩大文件所有权。

## 权限、交付与完成条件

- 本次未获运行测试、冒烟、预览、试编译、语法或运行时检查授权；实现代理不得执行。普通源文件阅读、实现允许。
- 所有文件完成后仅 PM 执行发布所需最终编译；本次用户明确要求发布到原 Sites，授权该发布流程的源码同步，不向 GitHub 推送。
- 交付：两文件修改、逐项实际接入位置、接口是否变化、未完成及未验证项；按接手、阶段和交付汇报。
- PM 读码核对四项路径，更新规格、反馈与构建发布结果；不得将源审阅或编译当作实际画布验收。

## 实装交接

`manager_ui_fixes` 已完成并冻结两文件，所有权结束。PM 已阅读实际 diff 及 `canvas-ui.js` 的页面挂载、普通按钮颜色路径：经营首页沿既有对白路径，五子页介绍保留；两旧横幅绘制调用移除；四处相关玩家文案统一；资料按钮使用 `plain`。无新增接口、资源或经营规则。未运行测试、预览或实际画布验收。

PM 最终生产构建（Sites build helper → `npm run build`）退出码 0；存在现有大分块体积提示。未运行其他检查或实际画布验收。
