# 程序架构

| 模块 | 职责 |
| --- | --- |
| `src/content/game-data.json` | 525 项品类、产出、配方和 523 项研发 |
| `src/game/world.js` | 三类设施及两类工位、事件调度、库存与保留量、报价与周回 |
| `src/game/advancement.js` | 品质、配方研发、24 条永久科技及叠加规则 |
| `src/game/objectives.js` | 入门路径、养殖引导和长期目标 |
| `src/platform/world-save.js` | IndexedDB 读写、旧档迁移、修订号保护和恢复 |
| `src/platform/layout.js` | 竖屏响应式布局与横屏最大宽度 |
| `src/platform/farm-audio.js` | 游戏音乐、操作音效和音量 |
| `src/view/canvas-ui.js` | PixiJS 页面与 Dialog、响应式排版、滚动、键盘焦点和按需贴图 |
| `src/view/production-pages.js` | 田地、畜牧、鱼池、加工与精制 |
| `src/view/research-page.js` | 品种与配方、品质、经营改良 |
| `src/view/research-tree.js` | 研究节点布局、可见范围和拖动缩放 |
| `src/view/management-pages.js` | 仓库、图鉴、任务、设置、出售牧场 |
| `src/main.js` | 时间推进、交互提交、离线汇总和存档边界 |
| `scripts/generate-game-data.mjs` | 将 1.14 式样表转换为运行数据 |
| `scripts/build-wiki.mjs` | 独立 Wiki 的生成与图标版本 |

旧版 `state.js`、`save.js` 及旧内容数据用于迁移和原有资料。v1.14 模拟状态使用 v2 存档结构，数量和金额在运行时使用 BigInt，写入 IndexedDB 时编码为十进制字符串。模拟与动作使用同一存档提交边界。备份与修订号校验在同一事务中处理。

[开发规范](development.md) · [1.14 式样](expansion/README.md) · [界面参考图](ui-references/v1.14/README.md)
