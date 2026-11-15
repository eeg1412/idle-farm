# 图标资源与按需加载

[游戏式样书](game-design.md) · [界面规格](ui.md)

## 物品图标

| 版本 | 位置 | 格式与用途 |
| --- | --- | --- |
| 绘制原图 | `assets/source/items/raw/<起始ID>-<结束ID>.png` | 透明方形 PNG，按目录 ID 从左到右、从上到下排列。绘制提示词见 [prompts.md](../assets/source/items/prompts.md) |
| 裁切用图标表 | `assets/source/items/<起始ID>-<结束ID>.png` | 透明方形 PNG，固定 5 行 × 5 列，每格一件 |
| 发布图 | `public/wiki/icons/<物品ID>.webp` | 每品项一张，96×96，WebP 有损编码质量 70，Alpha 质量 100。发布站点与页面仅使用 WebP |

当前共 525 项，对应 21 张图标表。原有 12 张保留原顺序，畜牧水产 6 张按扩展式样书中新增品项的表格顺序从左到右、从上到下排列。先定稿品项和配方并通过内容校验，再根据稳定 ID 绘制。原图保存于 `assets/source/items/raw/`。仅在原图能完整隔离出 25 个主体时，把图标重新居中到规则网格。出现粘连、缺图、越过画布边缘或类别误画时，先返工并重新检查。

- 作物和养殖产出展示收获原态。牲畜条目画可交易的蛋、奶或肉，水产条目画对应渔获。
- 中间产物展示粉、浆、切料、冻坯、面团及无装饰的开口备料容器。
- 商品必须逐件带包装，按形态使用纸套、开窗盒、封口杯、礼袋或礼盒。通过透明窗口或掀开的盒盖露出内容，包装仍可辨识。
- 校正后的每个图案最多占单格宽高的 64%，相邻主体之间至少保留约三分之一格的透明带。规则网格通过检查后裁成 96×96，使用最近邻缩放，保留透明背景。每个 WebP 必须对应唯一品项 ID。

```sh
python3 scripts/export-item-icons.py --source-dir assets/source/items/raw --normalize-to assets/source/items
python3 scripts/export-item-icons.py
python3 scripts/export-item-icons.py --check
npm run wiki:build
```

导出使用 Python 3 与 Pillow（启用 WebP 支持）。既有 300 个图标沿用 `src/content/catalog.json` 的顺序。新增图标及 Wiki 的 525 项数值依据[扩展配方总表](expansion/05-catalog.md)。修改扩展后运行 `python3 scripts/validate-expansion-spec.py`，再执行 Wiki 构建。Wiki 的生产入口是 `dist/wiki/index.html`，源码版可直接打开 `public/wiki/index.html`，相邻 `icons/` 目录必须一并提供。

新增图标表依次为 `L01-IL05`、`IL06-PL10`、`PL11-PF15`、`PF16-PD20`、`PT01-PT25`、`PT26-PT50`、`C51-P160`、`C57-I122`、`I123-P180`。各表各 25 格，具体顺序见同目录提示词和配方总表。

## 界面图标

导航、生产设施、任务、操作和设置各使用按用途绘制的图标。牧场与经营使用 `navigation` 图集导出的新图标，绘制区域与工坊、仓库、研究统一。田地卡画作物生长中的地块，畜牧卡画栏舍和其中的牲畜，鱼池卡画对应水域中的活鱼。产物栏和仓库中的物品使用对应品项的独立图标。

### 设施场景

68 种作物、10 种牲畜、10 种鱼均有独立满幅场景，用于设施详情、品种选择、养殖卡和种植卡的动画回退。`scene-C01` 到 `scene-C68`、`scene-L01` 到 `scene-L10`、`scene-F01` 到 `scene-F10` 是独立资源。品种切换成功后立刻使用新对象的场景。收成明细中的物品图标表示实际产物。

场景原图保存在 `assets/source/art/`，小幅场景表及其提示词保存在 `assets/source/art/facility-sheets/`。按从左到右、从上到下的 ID 顺序绘制和检查，裁去分隔线后导出单张 320×320 WebP，质量 70。运行 `python3 scripts/export-facility-scenes.py` 可重新裁切。首页横幅、空设施和三个首个品种保留整幅绘制的 PNG 原图。游戏只加载当前页面相关的场景。日常检查和最终构建均执行 `npm run art:check`，以原料目录检查设施场景是否齐全。

#### 作物生长动画

全部 68 种作物的地块使用独立透明前景，场景画布为 320×320，沿用种植卡现有的宽高比。固定场景层位于 `public/art/plot/`，每种作物的四期图集位于 `public/art/plot/crops/<作物ID>.webp`。图集是 640×640，读取顺序为左上种子、右上幼苗、左下成长、右下成熟。小麦图集沿用确认过的四期画面。

透明 5×5 原画和裁切登记位于 `assets/plot/crop-atlases/`，早期素材图集位于 `assets/plot/early-atlases/`，独立单株与原始四期合成图分别放在 `assets/plot/crops/` 与 `assets/plot/crop-frames/`。用 `python3 scripts/export-crop-animation.py` 重新导出。四期各用独立植株前景，远景、田地、洒水器与水滴由全部作物共用。

种植点沿底图的垄脊布置。每条可种的田垄从垄头到垄尾按固定株距排列，垄边与洒水器占地留出必要空间。株距要让成熟作物在手机卡片上仍能分辨。四个成长阶段共用种植点，切换阶段时株位对齐。

洒水器用固定器身与四个同轴的 64×64 喷头叠图。水滴与落地水花独立用 PixiJS 绘制，四向出水点随喷头同步。WebP 质量为 70，透明区域保留。品种首张可见的地块卡出现时按需加载对应图集，同种作物共用。加载期间及失败时显示原有设施场景。

| 版本 | 位置 |
| --- | --- |
| 透明 5×5 原图 | `assets/source/ui-icons/raw/<图组>.png` |
| 裁切底稿 | `assets/source/ui-icons/<图组>.png`，对齐透明网格或已裁出的头像 |
| 单张发布图 | `public/ui-icons/<界面图标键>.webp`，小图 96×96，仓库头像 144×144，WebP 质量 70，Alpha 质量 100 |

按 `scripts/export-ui-icons.py` 记录的图组顺序裁切。运行 `python3 scripts/export-ui-icons.py <图组>` 可从对应原图重新生成。图组提示词与原图同层目录保留。

## 资源加载

- Wiki 每页最多渲染 25 条。仅接近视口的当前页图标赋予图片 URL，交叉观察距离为 120 CSS 像素。缺少交叉观察能力时只请求当前页。搜索、筛选和跨页材料链接更新当前页，非当前页不发起新请求。
- Wiki HTML 内置结构化配方与名称，因此本地打开无需读取外部 JSON。图片独立存放，使用相对 URL。发布时按整套图标内容计算版本参数，避免旧缓存与新版配方混用。
- PixiJS 游戏按当前页面和列表分页请求相关横幅及图标，按资源 URL 合并并发请求。资源失败时保留名称及布局。物品图与界面图分别来自 `public/wiki/icons/` 和 `public/ui-icons/`。
- Service Worker 的安装清单排除 Wiki 及其图片，Wiki 导航走浏览器常规请求。未来添加游戏 WebP 时也应从预缓存清单排除，只预缓存启动壳和必需依赖。原图不进入 `dist/`。

游戏大幅场景分别保留在 `assets/source/art/*.png`，各页发布图在 `public/art/*.webp`。游戏只在当前页面请求相应场景与图标，并缓存已访问的发布图片。
