# 角色管理改名、研发点余额卡去弹窗、产线扩展按钮吸底

PM：主代理。三张卡互不重叠，各自新建干净上下文、单一所有者并行。未授权测试、预览或推送；最终编译由 PM 执行。

## UR-1 「管理员管理」改名「角色管理」
- 用户原话：【管理员管理】这个名字改为角色管理。
- 只改页面名「管理员管理」→「角色管理」，包括作为路由键、菜单、页名、父级映射使用的同名字符串，保证所有引用一致；路由 slug `managers`、网址 `#/managers` 不变；单独的「管理员」一词不改。
- 文件：`src/view/navigation.js`、`canvas-ui.js`、`management-pages.js`、`manager-help-copy.js`、`manager-help.js`、`manager-page.js`、相关测试源、`docs/ui/navigation.md`、`docs/ui/pages/management.md`、`docs/ui.md` 等现行文档（历史记录不改）。

## UR-2 研发点余额卡去掉弹窗
- 用户原话：研发的普通点发点和经营改良的高级研发点，点击后有一个弹窗，去掉这个多余的弹窗。
- 根因：`src/view/research-page.js` 品质页「普通研发点」与经营改良「高级研发点」两张 `ui.balance(...)` 默认 `inspectable`，点击或「查看完整数值」按钮打开 `showExactNumber` 弹窗。
- 改动：两处传 `inspectable: false`，不再有点击热区与按钮；其他页面余额卡不变。同步 `docs/ui/pages/research.md`。

## UR-3 产线扩展按钮吸附到底部
- 用户原话：所有产线的扩展按钮，吸附到底部。
- 根因：`src/view/production-pages.js` `renderProduction` 的购地／购买设施按钮与 `renderWorkshop` 的「增设加工位／精制位」按钮排在列表末尾，随内容滚动。
- 改动：改用页面固定底栏 `ui.footer(...)`（`canvas-ui.js` 已支持 `page-footer`），田地、养殖、鱼塘、矿洞、加工、精制六处一致；按钮文案、可用条件、弹窗不变。同步 `docs/ui/pages/fields.md`、`docs/ui/pages/workshop.md`。
