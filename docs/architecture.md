# 程序架构

| 模块 | 职责 |
| --- | --- |
| `src/content/game-data.json` | 525 项品类、产出、配方和 523 项研发 |
| `src/content/livestock-visuals.json` | 由畜牧布局生成的全部牲畜视觉登记，显式分类与阶段，不进入经营状态 |
| `src/game/world.js` | 三类设施及两类工位、事件调度、库存与保留量、报价与周回 |
| `src/game/advancement.js` | 品质、配方研发、24 条永久科技及叠加规则 |
| `src/game/development-tools.js` | 仅开发服务器动态加载的科技与金币发放动作，正式构建排除 |
| `src/game/objectives.js` | 入门路径、养殖引导和长期目标 |
| `src/platform/world-save.js` | IndexedDB 读写、旧档迁移、修订号保护和恢复 |
| `src/platform/layout.js` | 竖屏响应式布局与横屏最大宽度 |
| `src/platform/farm-audio.js` | 游戏音乐、操作音效和音量 |
| `src/view/canvas-ui.js` | PixiJS 页面与 Dialog、响应式排版、滚动、键盘焦点和按需贴图 |
| `src/view/production-pages.js` | 田地、畜牧、鱼池、加工与精制 |
| `src/view/livestock-animation.js` | 全部牲畜的阶段、idle 换帧、9 秒保底和产品淡入淡出，按视觉登记分类，接收显示时钟而不改变经营数据 |
| `src/view/research-page.js` | 品种与配方、品质、经营改良 |
| `src/view/research-tree.js` | 研究节点布局、可见范围和拖动缩放 |
| `src/view/management-pages.js` | 仓库、图鉴、任务、设置、出售牧场 |
| `src/main.js` | 时间推进、交互提交、离线汇总和存档边界 |
| `scripts/generate-game-data.mjs` | 将 1.14 式样表转换为运行数据 |
| `scripts/export-livestock-animation.mjs` | 按多来源布局裁切牲畜原画，导出固定脚位图集、独立产品、透明牲畜选择图及运行视觉登记 |
| `scripts/export-crop-animation.py` | 按目录和固定根位生成四期作物图集，保留 C01 小麦整幅前景例外 |
| `.agents/skills/farm-livestock/`、`.agents/skills/farm-crops/` | 新增和改画时按 ID 交付内容、原画、图标、回退及动画的项目技能 |

旧版 `state.js`、`save.js` 及旧内容数据用于迁移和原有资料。v1.14 模拟状态使用 v2 存档结构，数量和金额在运行时使用 BigInt，写入 IndexedDB 时编码为十进制字符串。模拟与动作使用同一存档提交边界。备份与修订号校验在同一事务中处理。

`vite.config.js` 在编译时仅对开发服务器启用 `__DEV_TEST_MODE__`。设置页的 11 次连续点击通过 `src/main.js` 的动作队列在同一存档事务中发放。开发服务器使用 `idle-farm-development` 数据库，正式构建沿用 `tianjian-workshop`。构建期拦截器禁止产物包含开发入口、奖励模块或开发存档标识。

畜牧视觉布局位于 `assets/livestock/layout.json`，以显式 `slaughter` 区分成年附属产品与三阶段肉用动物；生成数据、资源检查和 UI 使用相同登记，覆盖目录全部牲畜。选择网格用 `public/ui-icons/livestock-<ID>.webp` 活体图，仓库用 `public/wiki/icons/<ID>.webp` 产出图（目录名中的 `wiki` 为历史名称，独立 Wiki 已删除），动画用独立产品图，避免混用。用户报告选择图不可辨识后，相关反馈已重新打开；完整资源链或构建通过不代表实际选择界面已经验收。

[开发规范](development.md) · [1.14 式样](expansion/README.md) · [界面参考图](ui-references/v1.14/README.md)
