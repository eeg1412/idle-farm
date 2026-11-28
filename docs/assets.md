# 图标资源与按需加载

[游戏式样书](game-design.md) · [界面规格](ui.md)

## 物品图标

| 版本 | 位置 | 格式与用途 |
| --- | --- | --- |
| 绘制原图 | `assets/source/items/raw/<起始ID>-<结束ID>.png` | 透明方形 PNG，按目录 ID 从左到右、从上到下排列。绘制提示词见 [prompts.md](../assets/source/items/prompts.md) |
| 裁切用图标表 | `assets/source/items/<起始ID>-<结束ID>.png` | 透明方形 PNG，固定 5 行 × 5 列，每格一件 |
| 发布图 | `public/wiki/icons/<物品ID>.webp` | 每品项一张，96×96，WebP 有损编码质量 70，Alpha 质量 100。发布站点与页面仅使用 WebP |

当前共 574 项；原 525 项保留 21 张历史图标表。矿业使用透明网格原稿与逐品项覆盖图。原有 12 张保留原顺序，畜牧水产 6 张按扩展式样书中新增品项的表格顺序从左到右、从上到下排列。先定稿品项和配方并通过内容校验，再根据稳定 ID 绘制。原图保存于 `assets/source/items/raw/`。仅在原图能完整隔离出 25 个主体时，把图标重新居中到规则网格。出现粘连、缺图、越过画布边缘或类别误画时，先返工并重新检查。

- 作物和养殖产出展示收获原态。牲畜条目画可交易的蛋、奶或肉，水产条目画对应渔获。
- 中间产物展示粉、浆、切料、冻坯、面团及无装饰的开口备料容器。
- 所有商品必须是逐件包装的零售成品。名称写明袋装、瓶装、罐装、盒装、礼盒等实际包装。图标在 96×96 下仍要清楚呈现外包装和封口，内容可由透明瓶身、封闭观察窗或包装上的图样辨识。盘、碗、餐用陶盅等器皿只能作为包装内的内容或配件。裸露料理和单纯摆盘不通过审图。
- 校正后的每个图案最多占单格宽高的 64%，相邻主体之间至少保留约三分之一格的透明带。规则网格通过检查后裁成 96×96，使用最近邻缩放，保留透明背景。每个 WebP 必须对应唯一品项 ID。

```sh
python3 scripts/export-item-icons.py --source-dir assets/source/items/raw --normalize-to assets/source/items
python3 scripts/export-item-icons.py
python3 scripts/export-item-icons.py --check
```

导出使用 Python 3 与 Pillow（启用 WebP 支持）。既有 300 个图标沿用 `src/content/catalog.json` 的顺序。现行 574 项依据[扩展配方总表](expansion/05-catalog.md)。修改扩展后运行 `python3 scripts/validate-expansion-spec.py`。

发布图目录 `public/wiki/icons/` 是游戏运行时的物品图标来源，仓库、产物栏、畜牧与鱼塘动画、导出脚本和素材检查均引用该路径。路径中的 `wiki` 为历史名称：早期独立配方 Wiki 已删除，该目录与其中图标保留不动。

新增图标表依次为 `L01-IL05`、`IL06-PL10`、`PL11-PF15`、`PF16-PD20`、`PT01-PT25`、`PT26-PT50`、`C51-P160`、`C57-I122`、`I123-P180`。各表各 25 格，具体顺序见同目录提示词和配方总表。

## 界面图标

导航、生产设施、任务、操作和设置各使用按用途绘制的图标。`navigation` 图集导出的庄园与经营图标（`nav-ranch`、`nav-management`）及 `nav-fields` 已从发布目录移除，源图仍在 assets/。田地卡画作物生长中的地块，畜牧卡画栏舍和其中的牲畜，鱼塘卡画对应水域中的活鱼。产物栏和仓库中的物品使用对应品项的独立图标。

### 设施场景

68 种作物、10 种牲畜、10 种鱼均有独立满幅场景，用于非动画设施详情及历史素材交付；牲畜与鱼种选择使用独立透明活体图。`scene-C01` 到 `scene-C68`、`scene-L01` 到 `scene-L10`、`scene-F01` 到 `scene-F10` 是独立资源。庄园与工坊的已安排动画区域禁止回退图标、静态场景和程序占位，加载中／失败／资料缺失／卸载均保留区域；素材存在不构成运行回退授权。空设施初始选择图保留。收成明细中的物品图标表示实际产物。

场景原图保存在 `assets/source/art/`，小幅场景表及其提示词保存在 `assets/source/art/facility-sheets/`。按从左到右、从上到下的 ID 顺序绘制和检查，裁去分隔线后导出单张 320×320 WebP，质量 70。运行 `python3 scripts/export-facility-scenes.py` 可重新裁切。首页横幅、空设施和三个首个品种保留整幅绘制的 PNG 原图。游戏只加载当前页面相关的场景。最终构建执行 `npm run art:check`，以原料目录检查设施场景是否齐全；单独执行检查按用户验证授权。

#### 作物生长动画

场景画布320×320，固定天空、田地与洒水器在 `public/art/plot/`。C02–C68按 `public/art/plot/plants/<ID>/{sown,seedling,growing,mature}.webp` 交付四张独立透明单株；每张只有一株，运行按 `crop-visuals.json` 根位分别创建Sprite，纹理可复用，位置／透视／遮挡逐株计算。旧C02+整田图集不再活跃加载，已从发布目录 `public/art/plot/crops/` 移除，源图仍在 assets/。只有C01保留已认可640×640四期整幅前景例外，不能因统一新格式改掉原麦。

透明5×5原画、提示词和裁切登记在 `assets/plot/crop-atlases/`，早期原稿在 `early-atlases/`，真实四期单株在 `assets/plot/crops/<ID>/`，派生透明PNG在 `assets/plot/plants/<ID>/`。`node scripts/export-crop-animation.mjs` 是唯一生产转换逻辑；旧Python入口仅标准库转发Node。导出元数据保留源路径／裁切bounds、每期根点与尺寸，运行不按bbox重测。C01沿用wheat-0..3.png及既有原画来源，不要求普通单株目录。完整清单见 [farm-crops](../.agents/skills/farm-crops/SKILL.md)。

种植点沿底图真实垄脊布置。中、大型按 `assets/plot/crop-layout.json` 的 `fieldGeometry` 实测田面透视：列平行于田地左右侧边，排沿田垄、排距平滑递增，铺满可种田面直到画面左右与近端边缘，边缘植株允许被画框裁切，远端树冠完整，根脚不出实测土面轮廓；近端根脚离土面下沿至少 1/4 当地排距，贴边或落草的点沿列向远端后收，外侧少数点再沿田垄向田内小幅平移，不整列内缩；不能只摆两列窄条或为避裁切空出边缘。小型沿用 `furrows.json` 原根位。四期共用种植点，切期根位不动。`assets/plot/reviews/individual-v4/` 带背景、根位和130×138合成图只用于素材摆位审阅，不作为运行图片；这些证据图仅本地保存、不提交，同目录 json 照常提交。

`src/content/crop-harvest.json` 逐ID区分整株和保留植株采收，记录采收部分、真实成长期／成熟期审图依据及成年采后素材可否复用。`assets/plot/reviews/repeat-harvest/` 的对照图由本地程序拼接已有原画，仅用于审阅，不能称作内置绘图工具新绘原画；它与 `crop-harvest.json` 记录路径的其他配对证据图一样仅本地保存、不提交。需补画的成年采后状态使用内置 `image_gen` 编辑成熟单株，保留原成年枝冠／根脚与各ID来源；需要绘制原画的任务不能用程序擦除或放大小苗代替。`crop-visuals.json` 的保留植株条目新增 `harvestMode:'retainedPlant'` 与完整单株 `repeatBare` metadata，发布 `public/art/plot/plants/<ID>/bare.webp`；原四期继续用于首次换种，后续使用成年采后纹理和成熟纹理。

洒水器用固定器身与四个同轴的 64×64 喷头叠图。水滴与落地水花独立用 PixiJS 绘制，四向出水点随喷头同步。WebP 质量为 70，透明区域保留。品种首张可见的地块卡出现时按需加载对应图集，同种作物共用。加载期间及失败不显示静态图或占位图。

| 版本 | 位置 |
| --- | --- |
| 透明 5×5 原图 | `assets/source/ui-icons/raw/<图组>.png` |
| 裁切底稿 | `assets/source/ui-icons/<图组>.png`，对齐透明网格或已裁出的头像 |
| 单张发布图 | `public/ui-icons/<界面图标键>.webp`，小图 96×96，仓库头像 144×144，WebP 质量 70，Alpha 质量 100 |

按 `scripts/export-ui-icons.py` 记录的图组顺序裁切。运行 `python3 scripts/export-ui-icons.py <图组>` 可从对应原图重新生成。地块图标 `plot-C02`～`plot-C50`、`plot-generic`（原 `plots-early`／`plots-late` 图组）与 `navigation` 图组的发布图已从发布目录移除，脚本不再导出，源图仍在 assets/。图组提示词与原图同层目录保留。

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

展示无保底，跟随真实批次时长分完整／首末／末帧三档（每阶段至少1秒另留1秒；末帧档只显示成熟动物或常显附属产品，不逐批淡变），每帧 idle 300 毫秒，产品在收获前 3 秒（末阶段不足3秒时为整段末阶段）淡入且肉用动物同期淡出，展示收获后产品及其阴影淡出；淡变为 300 毫秒 smoothstep。肉品跨收获边界保持成熟落脚点，不跳到幼年位置。实际收成不跟随展示循环。这些 WebP 按可见图块请求，动画实例退出视口、换页、后台或被弹窗底板完全遮住时销毁，普通弹窗打开时背后可见的动画继续播放；不进入启动预缓存，已访问图可由现有离线缓存复用。资源检查按目录全部牲畜覆盖，不仅检查样例。

用户报告画风或选择图不可辨识时应重新打开反馈，实际状态由[反馈清单](feedback-checklist.md)维护。画风须实际查看新源图、手机实际图块尺寸和最近邻放大的像素边缘，同时确认细节足够；实际选择网格的图像与两种显示模式按授权验收。提示词含 `pixel-art`、素材数量／哈希、像素化滤镜、已有静态场景或透明文件、旧检查及构建通过都不证明风格合格，粗块图也不能靠像素标签结案，不能据此关闭反馈或写成用户已认可。

### 鱼塘动画与透明活鱼选择图

按目录全部鱼种交付，完整规范见 [farm-fish](../.agents/skills/farm-fish/SKILL.md)。按habitat使用河／海两套320×320固定背景：`public/art/fish/river-pond.webp`、`sea-pond.webp`，本轮原稿为river-pond-v2／sea-pond-v1，旧单一pond保留历史。每鱼三期各四张独立原画，发布1280×960透明图集、质量70；来源、提示词、布局、逐帧PNG和图集均保留 `assets/fish/`。

`public/ui-icons/fish-<ID>.webp` 为 96×96 透明活鱼，从成熟原画取得；`public/wiki/icons/<ID>.webp` 仍为 canonical 仓库渔获图，不重画替换。`assets/source/art/scene-<ID>.png` 和 `public/art/scene-<ID>.webp` 由共享鱼塘和本次成熟活鱼合成，按 `fish-layout.js` 共用展示只数、站位和深度；常规设施导出复用登记持久来源，避免重新导出时恢复旧鱼场景。

生产转换入口 `npm run art:fish`，`--habitats-only` 只更新背景／河海元数据及回退。`fish-visuals.json` 每ID含stages/size/habitat，`fish-habitats.json` 两类含pond及water polygon/color/alpha，源布局唯一登记并生成。运行顺序背景→鱼→水色半透明层→程序动态水波，后三层只在水面。三期鳃后躯干点注册160,210，每期共用画布尺度；不逐帧bbox居中或缩放，不改变经济。真实循环／小尺寸与静态审图分别记录，路径、哈希、帧数或门禁不能代替视觉结论。

共享背景、同种图集与选择图按需加载；滚出、切页、后台与弹窗底板完全遮住时卸载动画，普通弹窗打开时背后可见的动画继续播放；加载中或失败不显示同ID场景或其他回退图标。成熟鱼淡出后再淡入鱼苗，固定鱼塘不参与淡变；展示无保底，跟随真实批次时长：≥4秒三期完整，3–4秒只播鱼苗与成熟，<3秒只常显成熟鱼且不淡变。300ms 参数为实现选择。WebP 不进入启动预缓存，已访问图沿现有离线图片缓存复用。

### 工坊正视动画

当前工坊使用 [正视动画素材](art-reviews/2026-11-17-workshop-front.md)，尺寸和拼接位置在 `src/content/workshop-visuals.json` 登记。物料使用仓库同款图标，导出时记录可见底边以对齐履带。

### 历史素材：工坊木质机器与木板履带

2026-11-16按用户要求用内置image_gen独立重画三份木质原稿，替换旧金属机身／橡胶带面，不能用滤色或程序图形代替新绘图。真实输入及提示词在 `assets/workshop/prompts-wood-v6.md`，原稿在同目录 `raw/`，裁切来源和等比尺度在 `registration-wood-v6.json`。

| 对象 | 发布资源 | 持久PNG |
| --- | --- | --- |
| 木质加工机 | 已从发布目录移除，源图仍在 assets/（原165×632透明） | `assets/workshop/png/processing-machine-wood-v6.png` |
| 木质精制机 | 已从发布目录移除，源图仍在 assets/（原158×634透明） | `assets/workshop/png/refining-machine-wood-v6.png` |
| 无边木板履带 | 已从发布目录移除，源图仍在 assets/（原104×52不透明） | `assets/workshop/png/belt-surface-wood-v6.png` |

旧导出脚本 `export-wood-v6.mjs` 已删除；原画、PNG、`registration-wood-v6.json` 与 `workshop-visuals-wood-v6-candidate.json` 保留。

### 历史素材：工坊独立烟囱与烟雾

烟囱和烟雾在木质机身之上分层，不修改wood-v6机身原画。`assets/workshop/raw/chimney-smoke-v1.png`由内置image_gen真实生成透明2×2网格，烟囱顶口与三烟团分别裁出。实际提示词、输入与裁切／开口中心登记在同目录 `prompts-chimney-smoke-v1.md`、`registration-chimney-smoke-v1.json`；旧转换脚本 `export-chimney-smoke-v1.mjs` 已删除，原画与登记保留。

原发布的 `chimney-v1.webp`、`smoke-1-v1.webp`、`smoke-2-v1.webp`、`smoke-3-v1.webp`（均为96×96透明纹理）已从发布目录移除，源图仍在 assets/，持久PNG位于 `assets/workshop/png/`。烟囱源顶口中心315,312经400²真实裁切归一到48,48，锚点为0.5,0.5；现行安装与发射点、烟团生命周期等效果参数在 `src/content/workshop-visuals.json` 的 `effects` 中登记（旧 `workshop-effects.json` 已删除）。烟团保留真实Alpha轮廓，再由显示层控制全局透明度，不能把不透明程序圆或整块灰底当烟雾素材。源／成品直接图片审阅与真实漂浮、半透明叠加、130px组合分别验收，未运行部分不得记为通过。

第 2 版效果配置复用烟囱与烟团纹理。工坊齿轮 `gear-v1.webp`（96×96 透明，旋转锚点 0.5,0.5）已从发布目录移除，源图仍在 assets/；空仓图标采用 `public/ui-icons/warehouse-empty-v1.webp`（160×160 透明）。[源图、绘制提示和导出记录](art-reviews/2026-11-16-workshop-warehouse-assets.md)。

## 资源加载

### 矿业

矿业 49 个物品使用新绘像素原画，逐格传入 ID 与准确名称。M01–M10、IM01–IM16、PM01–PM23 的 96×96 透明图标位于`public/wiki/icons/`，持久源图通过`assets/source/items/overrides.json`登记；原25格图集保留历史顺序，不插入重排。矿业原稿、提示词、裁切/尺寸/哈希登记及PNG位于`assets/mining/`，转换入口为`scripts/export-mining-art.mjs`。

矿洞背景整幅生成，包含洞口和轨道。矿车透明单独生成，货载复用各M物品图标。`src/content/mining-visuals.json` 登记洞口原画层、内缘坐标、矿车轮脚锚点及车体可见左缘。运行时将洞口置于车体和货载下方，按洞口内缘做进出洞淡变。10张`scene-M<ID>`仅用于非动画详情/素材交付，不作为运行加载回退。矿洞导航、空设施与7项经营科技图标也单独真实绘制并发布透明WebP。页面WebP质量70，Alpha质量100，PNG原图不进dist。

矿洞真实批次进行中，洞内间歇显示白黄像素火花、金橙余火和局部微光。敲击节奏模拟真实挖矿：同一位置随机连敲3–10下（间隔0.62–0.90秒随机，每下落点在该位置±2像素内、火花随机偏左或偏右），停0.5–2.7秒（随机）后随机换到另一起点；时间线随时钟推进实时随机生成，不循环，时钟回退时重新开始，长时间跳跃不补播错过的敲击。火花采用固定程序图形，独立内部多边形mask限制在暗洞内，图层位于洞口原画上方、矿车和货载下方；不改变木梁、外部场景、矿车时序或声音。`mining-visuals.json`的sparks几何配置与矿车opening内缘坐标分开；短批次矿车保持静态到站帧，洞内火花独立更新。火花停止与销毁沿既有批次和动画生命周期，不新增纹理文件。

静态关键帧使用与Pixi相同的布局/时序输入合成；审图报告见本轮`docs/art-reviews/`，逐一分开记录原画、发布资源、合成分镜、实际运行与用户认可。`assets/mining/keyframes/` 与 `assets/mining/reviews/` 的图片是仅本地保存的证据图，不提交；`keyframes.json` 等清单照常提交，新环境用 `scripts/compose-mining-keyframes.mjs` 重新生成。素材存在或自动资源门通过不代表视觉或运行通过。

- PixiJS 游戏的庄园、工坊、仓库和图鉴列表连续滚动。列表只绘制进入视口的内容，并在其进入视口时按需请求对应图标和场景图。图片请求按资源 URL 合并并发请求，失败时保留名称及布局。物品图与界面图分别来自 `public/wiki/icons/` 和 `public/ui-icons/`。动画挂载和卸载遵循各场景的既有规则。
- Service Worker 只预缓存启动壳和必需依赖；带哈希的 `public/` 发布文件除 `art/estate/` 地图图外不进入安装清单，首次加载成功后按发布路径缓存并优先读缓存。除游戏首页外的导航走浏览器常规请求。原图不进入 `dist/`。

游戏大幅场景分别保留在 `assets/source/art/*.png`，各页发布图在 `public/art/*.webp`。游戏按当前页面的可见内容请求相应横幅、场景及图标，并沿用已访问发布图片的缓存。

### 发布文件名与资源网址

- `public/` 中的源文件保持原名。生产构建把每个非固定名文件发布为 `name-<8位内容哈希>.ext`，哈希取文件内容 sha256 的前 8 位十六进制；内容不变则发布名不变，同名覆盖图片后发布名随之改变。
- 运行时的全部 `public/` 资源网址一律经 `src/view/asset-url.js` 的 `assetUrl(path)` 生成，`path` 写 `public/` 下的源路径（接受 `art/x.webp`、`./art/x.webp`、`public/art/x.webp`）。生产构建从打包进 JS 的清单取发布名；路径不在清单中时抛错，不退回无哈希原路径。`npm run dev` 不使用清单，直接返回原路径。禁止在网址上手写 `?v=` 版本号或其他缓存标记，换图后不需要任何手动版本操作。
- 清单为 `src/content/asset-manifest.json`，由 `scripts/build-asset-manifest.mjs` 在 `vite build` 前生成，属于构建生成物，已列入 `.gitignore`，不提交。生成规则位于 `scripts/asset-manifest.mjs`。
- 固定名文件保持原名、不入清单：`index.html`、`sw.js`、`manifest.webmanifest`、`favicon.ico`、`icons/` 目录全部文件、`index.html` 的 `href`／`src` 与 `manifest.webmanifest` 的 `icons`／`screenshots`／`shortcuts` 直接引用的本地文件，以及 Cloudflare Pages 配置文件 `_headers`、`_redirects`、`_routes.json`。
- 运行时不请求的文件不入清单，并由构建从 `dist/` 删除：`art/plot/crops/` 中已登记作物的旧整田图集（C01 未改为单株模式时除外）、`art/loading/background.webp` 与 `art/loading/managers.webp`。调整这些加载规则时同步修改 `scripts/asset-manifest.mjs`。
- 新增运行时资源时，其路径必须能由 `src/view/canvas-ui.js` 的 `runtimeAssetPaths()` 推导。构建逐一核对该集合与清单，缺项即构建失败。该函数从物品、作物、牲畜、鱼类、矿业、工坊、管理员、开屏场景、地图建筑与地图气氛的目录及视觉登记推导路径；以下两组是写在 `canvas-ui.js` 中的固定名单，不由数据推导，新增对应资源时必须同步改名单：
  - 管理员表情：`managerExpressions`（`smile`、`happy`、`sad`、`angry`）× `managerGenders`（`female`、`male`），对应 `art/managers/portraits/<role>/<gender>-<expression>.webp`。
  - 管理员行动图标：`managerActionIcons`（`gift`、`info`、`receive`、`switch`），对应 `art/managers/icons/<name>.webp`。
- 资源加载失败、Service Worker 缓存与更新提示规则见[性能规约 §6](performance.md#6-构建与发布scriptsbuild-offlinemjs)。

## 管理员场景 CG 开屏

运行素材为 `public/art/loading/scenes/{role}-{gender}.webp` 共 24 张完整人物场景 CG 与原 `public/art/loading/logo.webp`。人物与环境绘在同一张画中，按当前立绘和角色性格设计工作动作。各幅独立使用内置绘图生成，源文件位于 `assets/source/art/loading/solo/{role}/`。订单中心两张场景采用 nearest 采样，其余开屏图和 Logo 沿用 linear 采样。

每次启动等存档恢复或新档建立后，从 12 个岗位各自已选形象中均匀选一张并锁定。新档按 `managerDefaultGenders` 默认六女六男，订单中心选男性；旧档保留已有岗位选择，缺订单岗位时补男性。只加载抽中的 CG 和 Logo，与当前可见页面资源并行。真实加载任务全成功且完整开屏可见至少 1000ms 后，以 300ms 淡出。失败继续原重试／查看存档问题，后台页面持续准备；开屏期间原对白与输入阻断保持。

CG 采用纵向近景构图。顶部 Logo 和底部进度控件避开脸部，画面边缘可裁切身体与环境。Logo 区域保留窗、天光等自然环境。`loading-layout.js` 为运行与静态渲染共享几何，manifest 登记实际尺寸与 faceBounds。分别对照角色身份、源图、成品及四尺寸开屏画面审图，运行验收单列。[原 22 套开屏审图](art-reviews/2026-11-20-solo-manager-loading.md) · [订单男女新设计审图](art-reviews/2026-11-22-order-art-redesign-v2.md)

订单两张开屏原画位于 `assets/source/art/loading/solo/orders/redesign-v2/{female,male}-scene-v3.png`，均为 1024×1536 独立完整场景，各自以对应人物全身立绘作为身份输入。茜梨在室外突风中抬手压住帽子，另一手抓住包裹的蓝签；奥林在乡路篷车旁系稳货物的防雨罩。两场景分别呈现茜梨护好货物的细心和奥林守住交付承诺的耐心。`src/content/loading-scenes.json` 分别登记发布图 `art/loading/scenes/orders-female.webp` 和 `art/loading/scenes/orders-male.webp`，faceBounds 按各自新原画登记。

茜梨以 `assets/source/art/managers/orders/anime/female-{smile,happy,angry,sad}.png` 四张全身原图导出胸像。角色页和管理员列表按岗位、性别与表情读取 `public/art/managers/portraits/orders/{gender}-{expression}.webp`；窗口背景为 `public/art/managers/backgrounds/orders.webp`。[茜梨原画及导出记录](../assets/source/art/managers/orders/anime/female-source.md)

奥林的微笑、高兴、生气和失落全身原画位于 `assets/source/art/managers/orders/redesign-v2/male-{smile,happy,angry,sad}.png`。四表情共用裁切范围，以 nearest 缩至 500×283，顶部透明留 6 像素，发布为 500×289 胸像。`assets/source/art/managers/orders/anchors.json` 的 male 字段与 `src/content/manager-portraits.json` 的 orders.male 保持同一登记。四张全身原图、两张 CG 的提示词、真实生成来源、裁切参数及发布图对应记录在 [source-manifest.json](../assets/source/art/managers/orders/redesign-v2/source-manifest.json)，专用导出入口为 `scripts/export-order-redesign-v2.mjs`。

旧群像与背景两层仅作历史留存，运行开屏不以它们回退。独立场景 CG 须保留真实背景、角色身份参考与场景登记，禁止程序拼立绘或用纯色背景替代。

### 认可近景群像与地图气氛（2026-11-19历史接入）

本节气氛/草树记载此前接入版本；当前运行状态以末尾撤除说明为准，阳光和新增植物已由用户撤回。

当时群像直接采用用户认可的1024×1536透明原稿，不加旧1344高padding；版本key为`all22-v3-approved-closeup`，满视口宽等比显示并延伸至底边之外。背景和LOGO原字节保留，1秒完整显示与300ms淡出不变。来源、旧版及导出登记见`assets/source/art/loading/`。

认可地图底图以816×1926、WebP90接入`public/art/estate/background.webp`；建筑/门牌/动件和几何不变。`public/art/estate/atmosphere/`新增512×1024透明暖阳与512×128横排四帧飞鸟，均由内置绘图原生生成，WebP70/Alpha100；代码仅裁帧、统一身体锚点、播放及平移，不程序画鸟或旋转静图冒充振翅。源图、提示和导出记录见`assets/source/art/estate-atmosphere/`。

暖阳单独linear，鸟nearest；层位在建筑上、门牌与控制下，不接收输入。复用固定纹理缓存、既有ticker及3鸟池，开屏complete且地图可见时才加载/推进；后台、弹窗、忙碌暂停并在恢复后续飞原趟，右上菜单展开时照常推进与绘制，离图销毁。飞行时钟为本次运行会话级共享，只在地图活动且纹理就绪时推进：开屏结束后首次进图必飞首趟，之后按会话级定时器每19.2秒一趟；切页回图、旋转或尺寸重建不触发新趟，若时钟正处某趟飞行中，新实例跳过该趟剩余部分。单鸟2.45秒、错开190ms。只增量改Sprite，不改玩法、数值、存档或建筑动画路径。静态分镜与只读源码结论见[本轮独审](art-reviews/2026-11-19-approved-art-atmosphere.md)，不代替实际运行体验。

后续用户反馈阳光不可见、要求随机飞过位置：阳光alpha从0.034–0.052提高为0.165–0.215，原纹理从当前视口左上斜向右下，等比覆盖当前可见区域。鸟每趟开始抽5个显示专用随机样本，确定高度、斜率、左右来向、编队间距与轻微弧度；同趟固定、滚动/暂停/同尺寸重建不重抽，不接经济种子或存档。仍在建筑上/门牌下，素材原字节不变。复查见[光鸟返修独审](art-reviews/2026-11-19-atmosphere-random-sunlight.md)。

### 大地图独立草树（2026-11-19历史接入，已撤除）

`public/art/estate/foliage/`含三种草`grass-meadow`/`grass-sedge`/`grass-fescue`与三种树`tree-oak`/`tree-birch`/`tree-pine`。内置绘图生成透明1536×1024网格原稿，仅裁切并nearest等比转WebP70/Alpha100；树最长边256px、草128px，真实尺寸和根脚见同目录`registration.json`，源PNG/提示/实际引用/生成记录在`assets/source/art/estate-foliage/`，转换脚本为`scripts/export-estate-foliage.mjs`。

独立`estate-foliage-layout.js`使用真实尺寸和根脚登记布置8处：三树各一、草共五簇；390宽地图树高64/68/64px，草最长边20–23px，随地图等比。层序为背景→草树→原建筑→阳光/鸟→门牌→控件。固定6个URL沿原缓存，仅进入现有视口预取区才请求，离屏隐藏、迟到回调检查销毁和最新可见状态；没有植物ticker或输入热点，不改变原建筑/道路/命中/经济/存档。植物原图不进dist。最终静态美感及源码范围见[植物独审](art-reviews/2026-11-19-map-foliage.md)，不代替游戏实测。

### 当前：撤除新增草树和阳光

用户明确撤回上述六种草树及阳光。删除新增植物运行布局/图层/加载/视口条目和全部public植物资源，以及阳光Sprite/请求/pose/发布纹理；草树导出脚本删除，气氛导出脚本仅保留鸟。原生源图、真实生成记录和历史审阅资料保留在`assets/source/art/`，不作为运行素材发布，不重绘认可底图或原建筑。

当前地图层序为认可底图→原建筑→随机飞鸟→门牌→控件。鸟沿用原生四帧、每趟固定随机路线、开屏后首趟必飞并按会话级定时器每19.2秒一趟（切页与重建不触发新趟）、暂停续飞原趟及有限共享缓存；阳光和新增草树不再请求或显示，原底图内已有植被不变。交付见[撤除与差分任务卡](tasks/2026-11-19-remove-foliage-sunlight-diff.md)。

### 行脚商旅行摊车（2026-11-19）

新增`public/art/estate/merchant.webp`，536×320透明画布、WebP90/Alpha100，原生绘图源1647×955等比nearest fit居中；源图/真实prompt/引用/生成记录/footprint与根脚登记保存在`assets/source/art/estate-merchant-cart/`，转换脚本`scripts/export-estate-merchant.mjs`。对象为布篷木轮旅行货车与货物，不是房屋，原图无人物或文字招牌。成品SHA256 `2fb3b18ccdaacf700d19c8c1f1cf23ed3fc84cf852e115f72860e850e8162232`，alpha128主体footprint[54,15,497,307]。

地图追加末尾静态merchant；现行center[0.4923,0.504]、widthRatio0.198（摆放编辑器导出）。两轮根脚在红圈草地内，篷/拉杆/木牌外缘可局部越红线，木牌避开支路；390地图宽实际主体70.2px。同款木牌“行脚商”，点车/牌进入原行脚商页面，不改变解锁。现已追加独立小旗／挂灯动件与未解锁盖布收摊图；沿原缓存/视口/毁后守卫，原十建筑几何、动画索引与飞鸟上层不变。原画来源见[历史素材报告](art-reviews/2026-11-19-estate-merchant-cart.md)，现行红框位置见[最新静态独审](art-reviews/2026-11-19-merchant-redbox.md)，不代替实际游戏运行。

### 行脚商开闭状态与独立动件（2026-11-19）

原开放底图merchant.webp不改。内置image_gen基于同款车重绘未开放盖布车，并新绘红米双色小旗四种布褶和独立金属挂灯；原画、实际提示与生成记录在assets/source/art/estate-merchant-states/，转换脚本scripts/export-estate-merchant-states.mjs。仅等比nearest裁切／缩放，保留新原画和PNG，发布WebP90/alpha100。闭车536×320同旧变换，alpha128 footprint[54,15,498,307]，轮脚基线307；不挪车体或旧十建筑。

新增public/art/estate/merchant-closed.webp、merchant-pennant-1.webp至-4.webp、merchant-lantern.webp。旗四帧共84×90裁切画布、同杆脚[10,84]，源车挂点[421,38]；按0.18秒切帧，保留原绘布褶变化，非整车缩放或摇摆。灯36×81保留长挂钩，挂点[375,91]、pivot[18,1]，3.2秒周期±0.055rad小摆。当前手机车宽390下70.2px、320下57.6px，部件与源车等比。

registration.json的runtime对象原样转入小型src/content/estate-merchant-visuals.json；新estate-merchant.js直接消费，参数不另维护。canvas地图只传merchantStatus(world).unlocked，未达条件闭车、不建旗灯；已达条件即开放，空货架不误判未开放。编辑器缺世界状态时默认开放预览。部件位于商车之上、既有飞鸟和木牌之下，不接收输入；沿共享有限新纹理缓存、原视口预载和可见ticker，后台／弹窗暂停、右上菜单展开时照常运动、离图销毁、迟到回调查destroy。基图未加载成功时holder隐藏，防止旗灯先到悬空；基图挂好才放行部件。

新开闭、手机实际比例、四帧与代码路径见[本轮静态独审](art-reviews/2026-11-19-merchant-states.md)。源码／分镜结论不代替真实Pixi循环和运行体验，用户认可另记。

### 网页图标与PWA图标

图标主体由内置绘图工具绘制为透明前景，原图与完整提示词保存在 `assets/source/art/pwa-icon-v3/`。庄园徽记采用砖红屋顶、奶油白墙、明亮窗户、金黄麦穗及底部绿叶，无文字，按32／48像素辨识设计。

`scripts/export-pwa-icons-v3.mjs` 将同一透明主体等比居中，程序合成纯色背景，导出 `public/icons/manor-v3-*` 的32／48／180／192／512 PNG及maskable512，并将32／48封装为 `public/favicon.ico`。背景色由 `assets/source/art/pwa-icon-v3/export-config.json` 的 `backgroundColor` 设置，默认橙色 `#F28C28`；更换配置后重新导出即可换色，原稿保持透明。正式PNG满幅不透明，maskable关键内容位于中央80%直径安全圆内。HTML和manifest使用v3图标引用，应用身份、启动地址和页面主题设定保持原值。

静态审图报告与来源、尺寸、变换和哈希登记保留在仓库，证据图片仅在 `assets/source/art/pwa-icon-v3/reviews/` 本地保存并忽略；图像静态审阅不代表实际安装图标刷新已经验证。

manifest仍为放置庄园，id=idle-manor、start_url=./#/farm、scope=./、standalone及主题不改，不重新建立应用身份。新图地址让浏览器识别图标变更；已安装图标的最终替换仍受浏览器及系统策略影响，可能需要用户在系统提供的更新入口确认，不能由游戏UI保证立即变更。manifest、ICO与`icons/`下PNG为固定名文件，不加内容哈希，由生产Service Worker安装清单预缓存，不另建缓存体系；用户授权的新版本提示在游戏UI中处理，安装提示不在本轮范围。
