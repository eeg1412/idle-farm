# 放置农场

- 从 [README.md](README.md) 找运行入口，从 [docs/game-design.md](docs/game-design.md) 确认行为。按任务阅读相关段落，规格缺口写入差异说明。
- HTML 的 body 只承载一张画布。所有游戏 UI 用 PixiJS 绘制。竖屏铺满，横屏保持竖屏比例并留黑。界面交互查阅 [docs/ui.md](docs/ui.md)，保持单画布命中测试。
- 独立配方 Wiki 使用标准 HTML，入口为 `public/wiki/index.html`。图标源图、WebP 质量与按需加载见 [docs/assets.md](docs/assets.md)。
- 经济数量用 BigInt，存档序列化用十进制字符串。生产与任务逻辑放在 `src/game`，不依赖 PixiJS、DOM、IndexedDB 或真实时钟。任务统计只跟随成功经营事件，在同一事务提交。
- 研发只依赖逐项列出的条件。目录改动先编辑扩展式样，再生成新版运行数据。保留现有物品 ID 及旧档兼容性。
- 执行 [开发规范](docs/development.md)。主管分配互不冲突的文件和所需输入，子代理持续汇报，主管负责整合与用户同步。用户明确授权前禁止测试、预览和类似验证。所有模块完成后由主管执行最终编译。
- 小素材按大图透明网格绘制和裁切。大素材整幅生成，原图和页面用 WebP 均保留。
- 新增作物、牲畜或鱼类时，分别交付物品图标与同 ID 的独立设施场景图。构建前运行 `npm run art:check`。
- 新增或改画作物时同步交付四阶段成长动画。遵循 [作物动画开发规范](docs/development.md#作物成长动画) 的原图、固定根位、周期和可见区域规则。仅有静态图的作物资源不得进入发布构建。
- Sites 发布目标为静态 `dist/`。发布步骤见 [docs/sites.md](docs/sites.md)。
