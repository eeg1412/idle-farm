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
```

导出使用 Python 3 与 Pillow（启用 WebP 支持）。既有 300 个图标沿用 `src/content/catalog.json` 的顺序。新增图标的 525 项依据[扩展配方总表](expansion/05-catalog.md)。修改扩展后运行 `python3 scripts/validate-expansion-spec.py`。

发布图目录 `public/wiki/icons/` 是游戏运行时的物品图标来源，仓库、产物栏、牧场与鱼池动画、导出脚本和素材检查均引用该路径。路径中的 `wiki` 为历史名称：早期独立配方 Wiki 已删除，该目录与其中图标保留不动。

新增图标表依次为 `L01-IL05`、`IL06-PL10`、`PL11-PF15`、`PF16-PD20`、`PT01-PT25`、`PT26-PT50`、`C51-P160`、`C57-I122`、`I123-P180`。各表各 25 格，具体顺序见同目录提示词和配方总表。

## 界面图标

导航、生产设施、任务、操作和设置各使用按用途绘制的图标。牧场与经营使用 `navigation` 图集导出的新图标，绘制区域与工坊、仓库、研究统一。田地卡画作物生长中的地块，畜牧卡画栏舍和其中的牲畜，鱼池卡画对应水域中的活鱼。产物栏和仓库中的物品使用对应品项的独立图标。

### 设施场景

68 种作物、10 种牲畜、10 种鱼均有独立满幅场景，用于非动画设施详情及历史素材交付；牲畜与鱼种选择使用独立透明活体图。`scene-C01` 到 `scene-C68`、`scene-L01` 到 `scene-L10`、`scene-F01` 到 `scene-F10` 是独立资源。牧场与工坊的已安排动画区域禁止回退图标、静态场景和程序占位，加载中／失败／资料缺失／卸载均保留区域；素材存在不构成运行回退授权。空设施初始选择图保留。收成明细中的物品图标表示实际产物。

场景原图保存在 `assets/source/art/`，小幅场景表及其提示词保存在 `assets/source/art/facility-sheets/`。按从左到右、从上到下的 ID 顺序绘制和检查，裁去分隔线后导出单张 320×320 WebP，质量 70。运行 `python3 scripts/export-facility-scenes.py` 可重新裁切。首页横幅、空设施和三个首个品种保留整幅绘制的 PNG 原图。游戏只加载当前页面相关的场景。最终构建执行 `npm run art:check`，以原料目录检查设施场景是否齐全；单独执行检查按用户验证授权。

#### 作物生长动画

场景画布320×320，固定天空、田地与洒水器在 `public/art/plot/`。C02–C68按 `public/art/plot/plants/<ID>/{sown,seedling,growing,mature}.webp` 交付四张独立透明单株；每张只有一株，运行按 `crop-visuals.json` 根位分别创建Sprite，纹理可复用，位置／透视／遮挡逐株计算。旧C02+整田图集不再活跃加载。只有C01保留已认可640×640四期整幅前景例外，不能因统一新格式改掉原麦。

透明5×5原画、提示词和裁切登记在 `assets/plot/crop-atlases/`，早期原稿在 `early-atlases/`，真实四期单株在 `assets/plot/crops/<ID>/`，派生透明PNG在 `assets/plot/plants/<ID>/`。`node scripts/export-crop-animation.mjs` 是唯一生产转换逻辑；旧Python入口仅标准库转发Node。导出元数据保留源路径／裁切bounds、每期根点与尺寸，运行不按bbox重测。C01沿用wheat-0..3.png及既有原画来源，不要求普通单株目录。完整清单见 [farm-crops](../.agents/skills/farm-crops/SKILL.md)。

种植点沿底图真实垄脊布置，完整透视列族与各条田垄求交，列在田界自然进退，每排覆盖可种两端，不能只摆两列窄条。四期共用种植点，切期根位不动。`assets/plot/reviews/individual-v4/` 带背景、根位和130×138合成图只用于素材摆位审阅，不作为运行图片。

`src/content/crop-harvest.json` 逐ID区分整株和保留植株采收，记录采收部分、真实成长期／成熟期审图依据及成年采后素材可否复用。`assets/plot/reviews/repeat-harvest/` 的对照图由本地程序拼接已有原画，仅用于审阅，不能称作内置绘图工具新绘原画。需补画的成年采后状态使用内置 `image_gen` 编辑成熟单株，保留原成年枝冠／根脚与各ID来源；需要绘制原画的任务不能用程序擦除或放大小苗代替。`crop-visuals.json` 的保留植株条目新增 `harvestMode:'retainedPlant'` 与完整单株 `repeatBare` metadata，发布 `public/art/plot/plants/<ID>/bare.webp`；原四期继续用于首次换种，后续使用成年采后纹理和成熟纹理。

洒水器用固定器身与四个同轴的 64×64 喷头叠图。水滴与落地水花独立用 PixiJS 绘制，四向出水点随喷头同步。WebP 质量为 70，透明区域保留。品种首张可见的地块卡出现时按需加载对应图集，同种作物共用。加载期间及失败不显示静态图或占位图。

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

运行登记每ID使用 `{stages,slaughter,grounding,feeding,feedTexture,product}`。`grounding` 每期登记真实首帧支撑脚区 `{x,y,radiusX,radiusY}`，同阶段固定，不逐帧测量或挪动物。`feeding` 每期 `{x,y,radiusX,radiusY,kind}` 保留真实嘴点来源；当前全部动物共用复合饲料图片，不再按kind程序画细粒料。`feedTexture` 为 `{path:'./art/livestock/feed-v8.webp',size:[128,64],bounds:{x:4,y:4,width:120,height:56},anchor:[64,60]}`，loader共享一张Texture，每只动物独立Sprite和程序轻影。`livestockFeedLayout`由runtime和静态导出共用，V8重设计冷暗低沿托盘与浅／褐／绿混合料，基础场景可见宽采用至少52后再乘depth，使130px卡片仍可辨；参数是实现选择，真实嘴/脚登记不动。`product`仍用96px canonical内容bounds，动画与仓库同URL，肉品跨收获保持成熟落点，附属产物在饲料相反侧接地。

复合饲料当前新原画为 `assets/livestock/raw/compound-feed-v8.png`，成品PNG为 `assets/livestock/feed-v8.png`、发布 `public/art/livestock/feed-v8.webp`；登记 `feed-registration-v8.json`，实际提示词 `feed-prompts-v8.md`。内置image_gen以当前L01／L02帧作画风参考重新绘制，producer支持`--feed-only`，保留原稿并只转换饲料与相应登记／回退。V8-r1的20阶段四帧与10张静态回退130px已作[静态审阅](art-reviews/2026-11-15-livestock-feed-redesign.md)，真实Pixi图层和用户认可仍另验；旧v6-r3虽曾内部通过，用户再次反馈不可辨后已撤回作为当前交付依据，仅保留历史。

选择图V7必须以各ID当前V5成年／成熟第0/3帧作内置imagegen输入，重新生成普通抬头站姿，不能从旧V4复用。新原画 `assets/livestock/raw/choice-v7/<ID>.png`，完整提示词 `choice-prompts-v7.md`，输入帧／源hash／裁切在 `choice-registration-v7.json`。`export-choices.mjs`由正式畜牧producer消费；`--choices-only`仅重导10项选择，不改变80进食帧/feed/回退。成品仍为 `public/ui-icons/livestock-<ID>.webp`，独立透明96px，URL cache v4；scene/animal沿v3，原仓库产品不变。旧V4复用交付保留在拒绝历史，不作当前来源。见[最新静态审阅](art-reviews/2026-11-15-livestock-choice-feed.md)。

全种类、全部20阶段80帧本轮改为真实吃饲料idle，低头、啄食和咀嚼来自内置绘图工具的新原画，不能以整精灵旋转或静态缩放代替。新原稿、提示词、逐帧／图集、选择图和静态回退按精确版本交付；身体／脚点稳定性、正常透明底边缘和真实进食姿态须静态分镜审阅，真实循环另按授权验收。

V5实际来源和人工嘴／脚登记见 `assets/livestock/feeding-prompts-v5.md`、`feeding-registration-v5.json`；V4登记在切换前另存保留。低头嘴/喙可低于脚平面，脚线检查只在显式 `supportXRange` 判断；脚线下烘焙影仍按全幅原阈值拒绝，仅允许 `feedingSource.mouthBounds` 登记的真实低嘴局部。`sourceMouthBounds`保存其原稿映射，`mouthBoundsMethod`说明人工来源；局部框不能覆盖脚区或头前整片地面，审图须看最新版 `alignment/` 红框分镜，字段齐全不代替视觉判断。

每个 `layout.species[ID].stages[i]` 顶层显式登记正整数 `supportBandHeight` 和 `supportMaterial: golden-feet | opaque-feet`。前者限定首帧固定脚区高度，后者指定金色脚趾／蹼或不透明蹄／爪的语义选择；`footprint` 保留选择结果，材质枚举与具体说明分别记入 `supportMaterial`／`supportSelection`。动物导出只消费登记，不按固定 L 名单推断，也不补默认脚区；`productCell` 完全可选，仅保留为未消费的历史溯源，不作为新动物必交项。

动物与全部产物各用独立程序椭圆影，动物影中心取真实 `grounding.x/y`，取消旧 `y+3` 偏移；同阶段 idle 几何不变。产品影半径按可见主体宽度，几何恒定，两者分别乘 `animalAlpha`／`productAlpha`。本轮实现参数为产品可见最长边约 72px、动物影填充 Alpha 0.45、产品影填充 Alpha 0.36，属于实现选择，不是用户已确认的固定数值。交接和资源检查核对元数据与 canonical 消费路径，但不能据此代替静态审图或实际画布验收。

物品图默认复用；用户明确授权 L02 仓库牛奶改为奶桶，以既存 `assets/livestock/products/L02.png` 为转换来源，规范透明 96px PNG 持久保存在 `assets/source/items/overrides/L02.png`，`assets/source/items/overrides.json` 显式映射 `{"L02":"overrides/L02.png"}`。公共 `scripts/export-item-icons.py` 在常规图集导出后消费覆盖，避免重新导出时恢复旧壶；原 `assets/source/items/L01-IL05.png` 图集保留历史，其余库存 ID 和源图集不变。旧奶桶图仅作此次 canonical 覆盖的转换来源，仓库与动画仍共用 `public/wiki/icons/L02.webp`，实际来源链交付状态由反馈清单维护。

`npm run art:livestock` 从动物原画裁切、对齐并导出 WebP 质量 70、Alpha 质量 100，保留透明通道；产物只登记并复用原物品图。活牲畜图与物品图分开，仓库和动画产物使用同一物品图：

| 资源 | 发布位置与规格 | 用途 |
| --- | --- | --- |
| 动物动画 | `public/art/livestock/animals/<ID>.webp`，1280×320 或 1280×960 | 每行一个阶段，每行四张 320×320 独立 idle 帧 |
| 仓库／动画共用物品图 | `public/wiki/icons/<ID>.webp`，96×96 透明 | 实际可交易产出及动画产物；同一 URL、同一文件，按内容 bounds 接地，不另画动画产品 |
| 牲畜选择图 | `public/ui-icons/livestock-<ID>.webp`，96×96 透明 | 清楚展示活牲畜本体，不带棚舍，不用蛋、奶、肉替代 |
| 静态设施素材 | `public/art/scene-<ID>.webp`，320×320 | 非动画设施详情及历史来源，不在动画加载中或失败时回退显示 |
| 共享固定棚舍 | `public/art/livestock/barn.webp`，320×320 | 共用背景，原图及导出 PNG 均保留 |

展示保底 9 秒，每帧 idle 300 毫秒，产品在收获前 3 秒淡入且肉用动物同期淡出，展示收获后产品及其阴影淡出；淡变为 300 毫秒 smoothstep。肉品跨收获边界保持成熟落脚点，不跳到幼年位置。实际收成不跟随展示循环。这些 WebP 按可见图块请求，动画实例退出视口、弹窗、换页或后台时销毁，不进入启动预缓存，已访问图可由现有离线缓存复用。资源检查按目录全部牲畜覆盖，不仅检查样例。

用户报告画风或选择图不可辨识时应重新打开反馈，实际状态由[反馈清单](feedback-checklist.md)维护。画风须实际查看新源图、手机实际图块尺寸和最近邻放大的像素边缘，同时确认细节足够；实际选择网格的图像与两种显示模式按授权验收。提示词含 `pixel-art`、素材数量／哈希、像素化滤镜、已有静态场景或透明文件、旧检查及构建通过都不证明风格合格，粗块图也不能靠像素标签结案，不能据此关闭反馈或写成用户已认可。

### 鱼池动画与透明活鱼选择图

按目录全部鱼种交付，完整规范见 [farm-fish](../.agents/skills/farm-fish/SKILL.md)。按habitat使用河／海两套320×320固定背景：`public/art/fish/river-pond.webp`、`sea-pond.webp`，本轮原稿为river-pond-v2／sea-pond-v1，旧单一pond保留历史。每鱼三期各四张独立原画，发布1280×960透明图集、质量70；来源、提示词、布局、逐帧PNG和图集均保留 `assets/fish/`。

`public/ui-icons/fish-<ID>.webp` 为 96×96 透明活鱼，从成熟原画取得；`public/wiki/icons/<ID>.webp` 仍为 canonical 仓库渔获图，不重画替换。`assets/source/art/scene-<ID>.png` 和 `public/art/scene-<ID>.webp` 由共享鱼塘和本次成熟活鱼合成，按 `fish-layout.js` 共用展示只数、站位和深度；常规设施导出复用登记持久来源，避免重新导出时恢复旧鱼场景。

生产转换入口 `npm run art:fish`，`--habitats-only` 只更新背景／河海元数据及回退。`fish-visuals.json` 每ID含stages/size/habitat，`fish-habitats.json` 两类含pond及water polygon/color/alpha，源布局唯一登记并生成。运行顺序背景→鱼→水色半透明层→程序动态水波，后三层只在水面。三期鳃后躯干点注册160,210，每期共用画布尺度；不逐帧bbox居中或缩放，不改变经济。真实循环／小尺寸与静态审图分别记录，路径、哈希、帧数或门禁不能代替视觉结论。

共享背景、同种图集与选择图按需加载；滚出、弹窗、切页、后台卸载动画，加载中或失败不显示同ID场景或其他回退图标。成熟鱼淡出后再淡入鱼苗，固定鱼塘不参与淡变；本轮 9 秒保底与 300ms 参数为实现选择。WebP 不进入启动预缓存，已访问图沿现有离线图片缓存复用。

### 工坊正视动画

当前工坊使用 [正视动画素材](art-reviews/2026-11-17-workshop-front.md)，尺寸和拼接位置在 `src/content/workshop-visuals.json` 登记。物料使用仓库同款图标，导出时记录可见底边以对齐履带。

### 历史素材：工坊木质机器与木板履带

2026-11-16按用户要求用内置image_gen独立重画三份木质原稿，替换旧金属机身／橡胶带面，不能用滤色或程序图形代替新绘图。真实输入及提示词在 `assets/workshop/prompts-wood-v6.md`，原稿在同目录 `raw/`，裁切来源和等比尺度在 `registration-wood-v6.json`。

| 对象 | 发布资源 | 持久PNG |
| --- | --- | --- |
| 木质加工机 | `public/art/workshop/processing-machine-wood-v6.webp`，165×632透明 | `assets/workshop/png/processing-machine-wood-v6.png` |
| 木质精制机 | `public/art/workshop/refining-machine-wood-v6.webp`，158×634透明 | `assets/workshop/png/refining-machine-wood-v6.png` |
| 无边木板履带 | `public/art/workshop/belt-surface-wood-v6.webp`，104×52不透明 | `assets/workshop/png/belt-surface-wood-v6.png` |

`export-wood-v6.mjs` 对源图裁切、等比最近邻缩放并转换为 WebP，生成 `workshop-visuals-wood-v6-candidate.json`。

### 历史素材：工坊独立烟囱与烟雾

烟囱和烟雾在木质机身之上分层，不修改wood-v6机身原画。`assets/workshop/raw/chimney-smoke-v1.png`由内置image_gen真实生成透明2×2网格，烟囱顶口与三烟团分别裁出。实际提示词、输入与裁切／开口中心登记在同目录 `prompts-chimney-smoke-v1.md`、`registration-chimney-smoke-v1.json`，纯素材转换入口为 `export-chimney-smoke-v1.mjs`。

发布 `public/art/workshop/chimney-v1.webp`、`smoke-1-v1.webp`、`smoke-2-v1.webp`、`smoke-3-v1.webp` 均为96×96透明纹理，持久PNG位于 `assets/workshop/png/`。烟囱源顶口中心315,312经400²真实裁切归一到48,48，锚点为0.5,0.5；安装与发射点、烟团生命周期等由 `src/content/workshop-effects.json`登记。烟团保留真实Alpha轮廓，再由显示层控制全局透明度，不能把不透明程序圆或整块灰底当烟雾素材。源／成品直接图片审阅与真实漂浮、半透明叠加、130px组合分别验收，未运行部分不得记为通过。

第 2 版效果配置复用烟囱与烟团纹理。工坊齿轮新增 `public/art/workshop/gear-v1.webp`（96×96 透明，旋转锚点 0.5,0.5），空仓图标采用 `public/ui-icons/warehouse-empty-v1.webp`（160×160 透明）。[源图、绘制提示和导出记录](art-reviews/2026-11-16-workshop-warehouse-assets.md)。

## 资源加载

- PixiJS 游戏的牧场、工坊、仓库和图鉴列表连续滚动。列表只绘制进入视口的内容，并在其进入视口时按需请求对应图标和场景图。图片请求按资源 URL 合并并发请求，失败时保留名称及布局。物品图与界面图分别来自 `public/wiki/icons/` 和 `public/ui-icons/`。动画挂载和卸载遵循各场景的既有规则。
- Service Worker 的安装清单排除所有 WebP 图片；游戏图片（`art/`、`ui-icons/`、`wiki/icons/` 下带 `?game=1` 的请求）在首次加载后按需缓存。除游戏首页外的导航走浏览器常规请求。未来添加游戏 WebP 时也应从预缓存清单排除，只预缓存启动壳和必需依赖。原图不进入 `dist/`。

游戏大幅场景分别保留在 `assets/source/art/*.png`，各页发布图在 `public/art/*.webp`。游戏按当前页面的可见内容请求相应横幅、场景及图标，并沿用已访问发布图片的缓存。
