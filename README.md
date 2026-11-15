# 放置农场 · idle farm

面向公开 ChatGPT Sites 的 PixiJS 生产线管理游戏。v1.14 游戏在单个 PixiJS 画布内运行，包含种植、畜牧、水产、工坊、交易、研发、品质、经营改良、任务和周回。经营记录保存在浏览器的 IndexedDB。正式玩法与发布范围见 [游戏式样书](docs/game-design.md)。

项目仓库：[eeg1412/idle-farm](https://github.com/eeg1412/idle-farm)。

## 运行

需要 Node.js 22.12 或更高版本。

```sh
npm ci
npm run build
```

`npm run preview` 预览 `dist/`。生产构建生成离线缓存脚本，开发模式下保留热更新。

## 从哪里开始

| 内容 | 入口 |
| --- | --- |
| AI 开发入口与项目配置 | [AGENTS.md](AGENTS.md)、[开发规范](docs/development.md)、[Codex 配置说明](docs/codex.md) |
| 产品、配方与任务 | [游戏式样书](docs/game-design.md) |
| 畜牧与水产设计 | [1.14 扩展式样书](docs/expansion/README.md) |
| 年度节奏与经济 | [数值平衡](docs/balance.md) |
| 独立配方 Wiki | [直接打开](public/wiki/index.html) · [图标技术规格](docs/assets.md) |
| 页面、按钮与反馈 | [界面与交互规格](docs/ui.md) |
| 已实现范围及后续模块 | [架构](docs/architecture.md) |
| 验证 | [验收步骤](docs/verification.md) |
| 用户反馈与交付状态 | [反馈清单](docs/feedback-checklist.md) |
| 公开部署 | [Sites](docs/sites.md) |
