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

68 种作物、10 种牲畜、10 种鱼均有独立满幅场景，用于设施详情、作物与鱼种选择，以及养殖卡和种植卡的动画回退；牲畜选择使用独立透明活体图。`scene-C01` 到 `scene-C68`、`scene-L01` 到 `scene-L10`、`scene-F01` 到 `scene-F10` 是独立资源。品种切换成功后立刻使用新对象的场景或动画。收成明细中的物品图标表示实际产物。

场景原图保存在 `assets/source/art/`，小幅场景表及其提示词保存在 `assets/source/art/facility-sheets/`。按从左到右、从上到下的 ID 顺序绘制和检查，裁去分隔线后导出单张 320×320 WebP，质量 70。运行 `python3 scripts/export-facility-scenes.py` 可重新裁切。首页横幅、空设施和三个首个品种保留整幅绘制的 PNG 原图。游戏只加载当前页面相关的场景。最终构建执行 `npm run art:check`，以原料目录检查设施场景是否齐全；单独执行检查按用户验证授权。

#### 作物生长动画

全部 68 种作物的地块使用独立透明前景，场景画布为 320×320，沿用种植卡现有的宽高比。固定场景层位于 `public/art/plot/`，每种作物的四期图集位于 `public/art/plot/crops/<作物ID>.webp`。图集是 640×640，读取顺序为左上种子、右上幼苗、左下成长、右下成熟。小麦图集沿用确认过的四期画面。

透明 5×5 原画、提示词和裁切登记位于 `assets/plot/crop-atlases/`，早期素材图集位于 `assets/plot/early-atlases/`，独立单株与原始四期合成图分别放在 `assets/plot/crops/<ID>/` 与 `assets/plot/crop-frames/<ID>.png`。`C01` 例外沿用 `assets/plot/wheat/wheat-0.png` 至 `wheat-3.png` 的已确认整幅前景及同目录原图、提示词和 `compose.py`，不要求不存在的普通单株目录。用 `python3 scripts/export-crop-animation.py` 重新导出；新增作物同步导出器的株型、早期阶段和尺寸登记。四期各用独立植株前景，远景、田地、洒水器与水滴由全部作物共用。完整交付清单见 [farm-crops](../.agents/skills/farm-crops/SKILL.md)。

种植点沿底图的垄脊布置。每条可种的田垄从垄头到垄尾按固定株距排列，垄边与洒水器占地留出必要空间。株距要让成熟作物在手机卡片上仍能分辨。四个成长阶段共用种植点，切换阶段时株位对齐。

洒水器用固定器身与四个同轴的 64×64 喷头叠图。水滴与落地水花独立用 PixiJS 绘制，四向出水点随喷头同步。WebP 质量为 70，透明区域保留。品种首张可见的地块卡出现时按需加载对应图集，同种作物共用。加载期间及失败时显示原有设施场景。

| 版本 | 位置 |
| --- | --- |
| 透明 5×5 原图 | `assets/source/ui-icons/raw/<图组>.png` |
| 裁切底稿 | `assets/source/ui-icons/<图组>.png`，对齐透明网格或已裁出的头像 |
| 单张发布图 | `public/ui-icons/<界面图标键>.webp`，小图 96×96，仓库头像 144×144，WebP 质量 70，Alpha 质量 100 |

按 `scripts/export-ui-icons.py` 记录的图组顺序裁切。运行 `python3 scripts/export-ui-icons.py <图组>` 可从对应原图重新生成。图组提示词与原图同层目录保留。

### 畜牧动画与透明牲畜选择图

交付范围覆盖目录全部 10 种牲畜，新增 ID 同步扩展。固定棚舍与动物、产品是分离图层；附属产品类是成年 4 帧，肉类是幼年、成长、成熟各 4 帧。分类由 `assets/livestock/layout.json` 显式 `slaughter` 定义，并生成运行登记 `src/content/livestock-visuals.json`，不按 ID 序号推断。完整交付清单见 [farm-livestock](../.agents/skills/farm-livestock/SKILL.md)。

牲畜使用兼顾像素边缘和形体细节的像素精灵：源图有实际像素色块、阶梯轮廓与离散明暗，同时保留清楚的五官、羽毛分组／毛团和身体结构；避免细碎写实毛发、柔光或拟真体积，也不能简化成缺少特征的粗块图。重绘须用内置 `image_gen` 生成版本化新原画，不能把旧拟真图降采样或加像素化滤镜称作重绘。全部透明选择图、idle 帧及同 ID 静态回退中的动物须保持同一风格；保留共享固定棚舍、脚位、动画时序与产出规则，其他资源是否重绘依任务卡范围执行。各次被拒绝稿、新来源与真实技术参数由素材负责人写入对应提示词文件和来源登记；不得把试稿参数写成用户要求，或在实际产物前补写完成数值。最新画风反馈、指定样稿与后续阶段门见[牲畜画风反馈记录](feedback-checklist.md#2026-11-15牲畜像素画风重新打开与全部重绘)，由 PM 按用户后续确认维护。

透明 5×5 原画及棚舍全幅原图在 `assets/livestock/raw/`，绘图提示词见 [首批提示词](../assets/livestock/prompts.md)与[扩展提示词](../assets/livestock/expansion-prompts.md)。`layout.json` 以 `sources.sheets` 维护多来源、实际隔离区域和固定注册点；每源规范网格在 `normalized/<来源键>.png`，首批的 `hen-pig-idle-grid.png` 仍保留。`animals/<ID>/` 保存逐帧 PNG，`atlases/<ID>.png` 保留整张 PNG 图集，`icons/<ID>.png` 保存透明活牲畜选择图。旧原稿产品部分、`products/<ID>.png` 和旧独立产品 WebP 可以保留溯源，不再作为活跃交付要求或动画来源。`atlas.json` 记录实际裁切区域、原图标识／哈希和每帧位置。动物源图注册点 `(138,270)` 及 `fixedGround` 不变，与真实站立脚印分开；棚舍始终不动。`all-species.png` 和 `selection-icons.png` 仅为素材总览，不能替代游戏画布验收。

动物原画、透明选择图和回退中的动物层都不烘焙椭圆阴影，复用物品图也不烘焙程序影。每阶段四帧使用同一尺度和固定解剖脚点，不逐帧按 bbox 重居中或按加权脚底像素中心挪动。`atlas.json` 每帧保留 `fixedGround: [138,270]`，并记录阶段共享的正数 `stageScale`、人工解剖脚点 `sourceAnchor: [x,y]` 与实际 `anchorMethod`；`sourceAnchor` 使用原始整张源图的绝对像素坐标，`sourceCanvas.left/top` 是相对此 anchor 的偏移，画布尺寸同阶段固定。导出从 `sourceAnchor + sourceCanvas.left/top` 提取画布，同阶段共用 `stageScale` 与 `scenePlacement`。

运行登记每 ID 使用 `{stages,slaughter,grounding,product}`。`grounding` 数组长度等于 `stages`，每项为 `{x,y,radiusX,radiusY}`，半径为有限正数，按阶段首帧真实支撑脚区域登记；`x/y` 可以不等于注册点 `(138,270)`，不逐帧测量或挪动动物。`product: {icon: ID, bounds: {x,y,width,height}}` 记录原有 96px 物品图可见 Alpha 的内容区域，动画直接加载与仓库相同的 `./wiki/icons/<ID>.webp?game=1`，按内容主体而非透明边距定位。肉品底边对齐成熟阶段落脚点，跨收获淡出保持；附属产物在动物附近接地。

每个 `layout.species[ID].stages[i]` 顶层显式登记正整数 `supportBandHeight` 和 `supportMaterial: golden-feet | opaque-feet`。前者限定首帧固定脚区高度，后者指定金色脚趾／蹼或不透明蹄／爪的语义选择；`footprint` 保留选择结果，材质枚举与具体说明分别记入 `supportMaterial`／`supportSelection`。动物导出只消费登记，不按固定 L 名单推断，也不补默认脚区；`productCell` 完全可选，仅保留为未消费的历史溯源，不作为新动物必交项。

动物与全部产物各用独立程序椭圆影，动物影中心取真实 `grounding.x/y`，取消旧 `y+3` 偏移；同阶段 idle 几何不变。产品影半径按可见主体宽度，几何恒定，两者分别乘 `animalAlpha`／`productAlpha`。本轮实现参数为产品可见最长边约 72px、动物影填充 Alpha 0.45、产品影填充 Alpha 0.36，属于实现选择，不是用户已确认的固定数值。交接和资源检查核对元数据与 canonical 消费路径，但不能据此代替静态审图或实际画布验收。

物品图默认复用；用户明确授权 L02 仓库牛奶改为奶桶，以既存 `assets/livestock/products/L02.png` 为转换来源，规范透明 96px PNG 持久保存在 `assets/source/items/overrides/L02.png`，`assets/source/items/overrides.json` 显式映射 `{"L02":"overrides/L02.png"}`。公共 `scripts/export-item-icons.py` 在常规图集导出后消费覆盖，避免重新导出时恢复旧壶；原 `assets/source/items/L01-IL05.png` 图集保留历史，其余库存 ID 和源图集不变。旧奶桶图仅作此次 canonical 覆盖的转换来源，仓库与动画仍共用 `public/wiki/icons/L02.webp`，实际来源链交付状态由反馈清单维护。

`npm run art:livestock` 从动物原画裁切、对齐并导出 WebP 质量 70、Alpha 质量 100，保留透明通道；产物只登记并复用原物品图。活牲畜图与物品图分开，仓库和动画产物使用同一物品图：

| 资源 | 发布位置与规格 | 用途 |
| --- | --- | --- |
| 动物动画 | `public/art/livestock/animals/<ID>.webp`，1280×320 或 1280×960 | 每行一个阶段，每行四张 320×320 独立 idle 帧 |
| 仓库／动画共用物品图 | `public/wiki/icons/<ID>.webp`，96×96 透明 | 实际可交易产出及动画产物；同一 URL、同一文件，按内容 bounds 接地，不另画动画产品 |
| 牲畜选择图 | `public/ui-icons/livestock-<ID>.webp`，96×96 透明 | 清楚展示活牲畜本体，不带棚舍，不用蛋、奶、肉替代 |
| 静态设施回退 | `public/art/scene-<ID>.webp`，320×320 | 加载期间、失败及静态设施详情 |
| 共享固定棚舍 | `public/art/livestock/barn.webp`，320×320 | 共用背景，原图及导出 PNG 均保留 |

展示保底 9 秒，每帧 idle 300 毫秒，产品在收获前 3 秒淡入且肉用动物同期淡出，展示收获后产品及其阴影淡出；淡变为 300 毫秒 smoothstep。肉品跨收获边界保持成熟落脚点，不跳到幼年位置。实际收成不跟随展示循环。这些 WebP 按可见图块请求，动画实例退出视口、弹窗、换页或后台时销毁，不进入启动预缓存，已访问图可由现有离线缓存复用。资源检查按目录全部牲畜覆盖，不仅检查样例。

用户报告画风或选择图不可辨识时应重新打开反馈，实际状态由[反馈清单](feedback-checklist.md)维护。画风须实际查看新源图、手机实际图块尺寸和最近邻放大的像素边缘，同时确认细节足够；实际选择网格的图像与两种显示模式按授权验收。提示词含 `pixel-art`、素材数量／哈希、像素化滤镜、已有静态场景或透明文件、旧检查及构建通过都不证明风格合格，粗块图也不能靠像素标签结案，不能据此关闭反馈或写成用户已认可。

## 资源加载

- Wiki 每页最多渲染 25 条。仅接近视口的当前页图标赋予图片 URL，交叉观察距离为 120 CSS 像素。缺少交叉观察能力时只请求当前页。搜索、筛选和跨页材料链接更新当前页，非当前页不发起新请求。
- Wiki HTML 内置结构化配方与名称，因此本地打开无需读取外部 JSON。图片独立存放，使用相对 URL。发布时按整套图标内容计算版本参数，避免旧缓存与新版配方混用。
- PixiJS 游戏按当前页面和列表分页请求相关横幅及图标，按资源 URL 合并并发请求。资源失败时保留名称及布局。物品图与界面图分别来自 `public/wiki/icons/` 和 `public/ui-icons/`。
- Service Worker 的安装清单排除 Wiki 及其图片，Wiki 导航走浏览器常规请求。未来添加游戏 WebP 时也应从预缓存清单排除，只预缓存启动壳和必需依赖。原图不进入 `dist/`。

游戏大幅场景分别保留在 `assets/source/art/*.png`，各页发布图在 `public/art/*.webp`。游戏只在当前页面请求相应场景与图标，并缓存已访问的发布图片。
