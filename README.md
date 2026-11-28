# 放置庄园 · Idle Manor

面向公开 ChatGPT Sites 的 PixiJS 生产线管理游戏。v1.14 游戏在单个 PixiJS 画布内运行，包含种植、畜牧、水产、矿业、料坊、工房、交易、研发、品质、经营改良、任务和周回。经营记录保存在浏览器的 IndexedDB。正式玩法与发布范围见 [游戏式样书](docs/game-design.md)；当前经济式样为 [LT-2026-11-v13](docs/expansion/README.md)，按含料工时定价，使用独立 v7 存档。

项目仓库：[eeg1412/idle-farm](https://github.com/eeg1412/idle-farm)。

## 运行

需要 Node.js 22.12 或更高版本。

```sh
npm ci
npm run build
```

`npm run preview` 预览 `dist/`。生产构建生成离线缓存脚本，开发模式下保留热更新。

本地开发使用 `npm run dev`。在开发服务器的 `/#/settings` 页面连续点击页头「设置」11 下，即可解锁全部品种与配方、将全部 42 项经营改良升至各自上限，并追加 1T 金币。开发存档独立保存，所有 Build 产物及预览均不提供此入口，具体规则见[开发测试模式](docs/development.md#开发测试模式)。

## Cloudflare 发布

完成 [Cloudflare Pages 配置](docs/cloudflare.md)后，先运行 `npm run build`，再运行 `npm run publish:cloudflare`，将已有 `dist/` 上传到 Pages 项目 `idle-farm`。发布指令不自动构建；原有 [Sites 发布流程](docs/sites.md)继续保留。

## 从哪里开始

| 内容 | 入口 |
| --- | --- |
| AI 开发入口与项目配置 | [AGENTS.md](AGENTS.md)、[开发规范](docs/development.md)、[Codex 配置说明](docs/codex.md) |
| 产品、配方与任务 | [游戏式样书](docs/game-design.md) |
| 农业、畜牧、水产与矿业设计 | [1.14 扩展式样书](docs/expansion/README.md) |
| 当前经济式样与调整依据 | [LT-v8 经营](docs/expansion/01-operations.md) · [价格算法](docs/expansion/07-balance-validation.md) · [LT-v7 历史方案](docs/reviews/2026-11-16-time-cost-balance.md) |
| 历史年度估算 | [1.13数值平衡归档](docs/balance.md)，不作为现版完成天数 |
| 物品图标与资源加载 | [图标技术规格](docs/assets.md) |
| 页面、按钮与反馈 | [界面与交互规格](docs/ui.md) |
| 已实现范围及后续模块 | [架构](docs/architecture.md) |
| 验证 | [验收步骤](docs/verification.md) |
| 用户反馈与交付状态 | [反馈清单](docs/feedback-checklist.md) |
| 公开部署 | [Cloudflare Pages](docs/cloudflare.md) · [Sites](docs/sites.md) |



