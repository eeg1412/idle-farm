# 按牲畜 ID 交付

入口为 `assets/livestock/feeding-registration-v5.json`、`assets/livestock/layout.json`、`scripts/export-livestock-animation.mjs`、`src/view/livestock-animation.js` 和 `scripts/check-facility-art.mjs`。读取实际源后再改，不能仅复制蛋鸡、黑猪样例或保留两项硬编码覆盖。

## 内容与分类

- 在扩展式样中登记养殖对象、仓库产出、周期、每批数量、价格、研发前置、材料和后续用途，再生成 `src/content/game-data.json`；视觉模块不得发放或伪造经营收益。
- 新增品项会改变数量时，同步 `scripts/catalog-rules.mjs` 的 `kindCounts` 和相关式样总量；`scripts/generate-game-data.mjs` 按该表限制 ID 范围并要求全量连续 ID，不要只增加原画和一行目录就绕过生成器。
- 在 `layout.json` 为每个 `kind: L` ID 显式写入 `subject`、`product`、`slaughter`、来源和阶段。附属产品类是一行成年阶段；肉类是幼年、成长、成熟三行。分类不得通过 `L01`–`L05` 等序号区间推断。
- `src/content/livestock-visuals.json` 是导出的运行视觉登记，与目录和布局保持一一对应；新增 ID 不应另改一份手工支持名单。每期 `feeding` 与 `grounding` 同序，不能用畜种名单猜饲料类型或进食位置。

## 像素精灵画风与重绘

依据任务卡提供的最新用户画风约束、资源范围与阶段门执行；具体拒稿、认可及待办状态只记录在 `docs/feedback-checklist.md`。用户明确要求先审样稿时，先交指定样稿，未确认不批量生成或覆盖正式资源。确认后由 PM 更新反馈和后续任务卡，不重复申请已有授权，也不因旧反馈中的历史阶段继续阻塞已授权工作。展示时序方案的确认、旧素材交付或构建通过不能代替画风确认；被否定的原稿保留来源，不作为已认可范本。

- 新动物必须由 `imagegen` 绘图技能调用内置 `image_gen` 绘制新原画，由一个素材负责人独占共享原画生成、登记和导出。不能把旧拟真图降采样、最近邻放大、减色或加像素化滤镜后称为重绘。
- 源图本身应有清楚的像素组织、阶梯轮廓和离散明暗，同时保留手机尺寸仍可读的五官、鸡冠、耳角、蹄爪、羽毛分组／毛团及身体结构。用有组织的色块表现细节，避免细碎写实毛发、柔光、连续渐变和拟真体积；也不能靠大色块抹掉物种特征和形体。3–5 级离散色阶可作参考，不是硬指标；仅在提示词中写 `pixel-art` 不构成合格证据。
- 实际逻辑尺寸、像素块大小、色数和 Alpha 方式按任务卡及真实产物记录；试验参数不自动成为用户固定要求，不能靠达到某个数字宣布画风通过。
- 当前目录全部 10 种牲畜的透明选择图、80 张 idle 帧与 10 个同 ID 静态回退中的动物必须统一画风；不能只重画选择图或两个样例。新增 ID 仍按目录与显式阶段登记扩展，不把 10／80 固化成支持名单。
- 本轮 idle 是真实进食：附属产品类成年五阶段，加肉类五种各三阶段，共二十阶段、每期四帧。站立脚点与躯干固定，原画中头颈低头啄食或咀嚼；不能把整动物平移、旋转、缩放或一张静态图复用四次称为吃饲料。动作语义、原画及实际循环分别审，数量不作进食成立的证据。
- 动物重绘沿用共享固定棚舍、场景脚位、动画时序、显式 `slaughter` 分类与产出规则；仅在任务卡明确要求时变更对应项或重绘库存产出图，不自动扩大资源范围。棚舍内回退动物也必须使用新动物来源，不能保留旧风格动物。
- 新原画按版本保留，提示词与修订记录写入对应提示词文件，被拒绝的原稿与后续修订分开记录。记录实际来源路径、源图尺寸、逻辑像素网格或块尺寸、裁切与缩放方法；这些参数由素材负责人按真实产物补齐，尚未取得时明确写待补，不编造已实现的数值或把试稿参数固化成通用规范。
- 画风审核需实际查看新源图、按游戏实际手机图块尺寸呈现的动物及最近邻放大的像素边缘，核对形状、色块和全部用途的一致性。源图／素材查看与游戏画布验收分别记录；数量、尺寸、透明度、哈希或自动检查通过只能证明对应技术项，不能证明画风或可辨识性。用户尚未接受时保持反馈打开，实际选择网格与显示模式按验证授权验收。

## 每项资源

| 交付 | 路径与规格 | 用途 |
| --- | --- | --- |
| 透明绘制原图 | `assets/livestock/raw/` 下实际进食原稿 PNG，透明 5×5 网格 | 全动物及独立进食 idle；原画不含饲料、食槽、地面投影，格间保留透明带 |
| 提示词 | 当前进食来源为 `assets/livestock/feeding-prompts-v5.md`；历史 `prompts.md`、`expansion-prompts.md` 等保留 | 对应每个真实来源、物种、帧序与修订，不把旧 V4 记为本轮新稿 |
| 进食原图注册 | `assets/livestock/feeding-registration-v5.json` | 显式来源、每期四帧解剖脚点 anchors、共享 canvas、首帧 mouth 和 grain／hay／greens 类型，生产导出器实际消费 |
| 网格与裁切登记 | `assets/livestock/layout.json`、导出的规范网格和 `atlas.json` | 多来源、原图标识／哈希、源格、裁切区域、场景放置与固定脚位 |
| 动物逐帧 PNG | `assets/livestock/animals/<ID>/<阶段>-<帧号>.png` | 每期四张 320×320 透明场景坐标帧，不能用一张缩放图冒充 |
| PNG 动物图集 | `assets/livestock/atlases/<ID>.png` | 每行四帧；附属产品类一行、肉类三行 |
| 发布动物图集 | `public/art/livestock/animals/<ID>.webp` | 1280×320 或 1280×960，质量 70、保留透明通道 |
| 仓库／动画共用物品图 | `public/wiki/icons/<ID>.webp` | 原有 96×96 实际产出图；动画与仓库共用同 URL，不另画、另裁另一份动画产品 |
| 独立牲畜选择图 | `assets/livestock/icons/<ID>.png`、`public/ui-icons/livestock-<ID>.webp` | 96×96 透明的活牲畜主体，完整保留角、耳、尾、脚；主体填充图标，不带棚舍 |
| 独立普通选择来源 | `assets/livestock/choice-registration-v7.json`、`raw/choice-v7/<ID>.png`、`choice-prompts-v7.md` | 逐 ID 以当前 V5 adult/mature 的 0／3 PNG 输入内置 image_gen 新生成中性抬头图，保留真实输入／哈希、原稿与提示词；V4 复用批已被用户否定，只保留历史 |
| 共用复合饲料图片 | `assets/livestock/raw/compound-feed-v8.png`、`assets/livestock/feed-v8.png`、`public/art/livestock/feed-v8.webp` | 内置 image_gen 新画深蓝灰低沿托盘与浅谷粒／棕颗粒／绿色草料分组，128×64 透明，每只独立 Sprite 和轻影；原稿、转换、bounds/anchor 见 `feed-registration-v8.json`，旧 v6-r3 黄堆被用户再次否定 |
| 同 ID 静态设施回退 | `public/art/scene-<ID>.webp` | 320×320 完整设施场景；原图保留在 `assets/source/art/` 及其设施场景表 |
| 共享固定棚舍 | `assets/livestock/raw/barn.png`、`assets/livestock/barn.png`、`public/art/livestock/barn.webp` | 发布图 320×320；可复用，仍需纳入资源检查 |

现有 `hen-pig-idle-grid.png` 是首批来源的规范网格；多源扩展按实际导出登记保存各来源网格，不把未参与该网格的帧记作已交付。动物源图的共用注册点及 `fixedGround` 是场景坐标 `(138,270)`，与实际站立脚印的 `grounding` 几何分开；成熟形态保留物种特征。

当前活跃 V5 来源为 `raw/pixel-v5-feeding-{accessories,pig,rabbit,sheep,muscovy}.png` 与 `raw/pixel-v5-feeding-cattle-r2.png` 六张；`layout.sources.sheets` 与 manifest 保留实际身份和修订，旧 V4 及旧注册备份保留历史。后续修订按真实来源更新，不把上述版本号固化为无需查看的认可结论。

多源字段为 `sources.sheets`，每个物种写 `source`，阶段可显式覆盖来源。每源导出的规范网格位于 `assets/livestock/normalized/<来源键>.png`。`productCell` 是可选历史字段，不是新增动物必交项；仅存在时写入 `historicalProductCell` 并标明 `consumed: false`。旧原稿产品部分及独立产品成品可以保留溯源，但不再作为活跃产物来源或交付要求。原画的耳、角、脚越过名义单格但仍完整隔离在透明间距内时，先逐帧查看原图，再用阶段的 `expandTop/Bottom/Left/Right` 登记真实隔离区域；不能截掉部位来凑网格，也不能扩进相邻主体。导出器遇到主体贴登记边界会拒绝导出。透明背景有底色、主体粘连或缺失时，用绘图工具返工，不用脚本补画部位。

选择图从新生成的成体普通抬头原画裁取，不从带棚舍的 320×320 场景缩小，也不从 V5 低头首帧或旧 V4 普通图裁取。用户否定 V4 复用后，全部 10 种已由各自当前 V5 adult/mature 第 0／3 PNG 输入内置 image_gen 新生成，`choice-registration-v7.json` 持久保留输入路径／哈希、原稿尺寸、真实窗口与提示词；`atlas.animalIcon` 同步这些字段及 `pose: 'head-up'`、`generatedWith`。被拒 V4 选择 PNG/WebP 归档 `choice-v6-rejected/`，不能再次激活。已有仓库图标默认复用，仅按任务卡的明确例外更新 canonical 来源；新 ID 应先交付 canonical 物品图标，再由畜牧导出登记复用，不从动物原稿的产品格生成另一份动画产品。单项覆盖使用 `assets/source/items/overrides.json` 的显式 ID 映射和 `overrides/<ID>.png`，由公共 `scripts/export-item-icons.py` 在常规图集导出后消费，不能只替换发布文件。用户授权的 L02 奶桶以既存 `assets/livestock/products/L02.png` 为转换来源，规范透明 96px PNG 持久保存在 `assets/source/items/overrides/L02.png`，映射为 `{"L02":"overrides/L02.png"}`；原 `assets/source/items/L01-IL05.png` 图集保留历史，其余库存 ID 不改。旧奶桶只作为此次 canonical 覆盖的来源，动画仍消费仓库同一文件。动物重绘时，同 ID 静态回退中的动物同步使用新进食原画，不能默认沿用旧动物；静态回退从固定棚舍、按 3／2／1 和透视布置的成熟 V5 动物与独立复合饲料图片及轻影合成 `assets/source/art/scene-<ID>.png` 和回退 WebP。此次仅重画选择图时，80 进食帧、饲料 v6-r3 与已交回退保持冻结。饲料不能烘焙入透明动物／选择图来源。这些来源与保留状态写入 `atlas.json`，实际审阅与交付状态查反馈清单。

`npm run art:livestock` 是资源转换入口，使用 sharp 裁切、对齐、输出 WebP；它不能替代原画生成。新增来源、透明选择图和运行视觉登记必须进入同一可追溯导出路径。`assets/livestock/export-choices.mjs` 是普通生产和 `--choices-only` 共用的 V7 选择转换链；`--choices-only` 仅更新选择 PNG/WebP、身份对照和选择登记，不碰 80 帧、feed 或 fallback。`--feed-only` 由 `assets/livestock/export-feed.mjs` 只更新最新饲料图片、10 同 ID 回退、feedTexture 与20阶段四帧130px证据，不碰 V7 选择／动物帧／产物；普通全量导出同样消费最新饲料登记。`render-feed-v8-evidence.mjs` 从实际发布回退与原稿制作正常底审图证据。这些均是素材转换，不授权游戏检查或编译。

## 落地、阴影与帧稳定性交接

- 动物原画不绘制地面投影，原物品图不烘焙程序阴影。透明动物帧、透明选择图及静态回退使用的动物层不得带烘焙椭圆影子；静态回退同步使用新动物，不能借回退保留旧动物。共享棚舍保持独立，不把程序阴影烘焙回动物图片。
- 同一阶段四帧使用共享的尺度和固定的解剖脚点，保留原画中真实头颈啄食／咀嚼变化，不允许躯干整体缩放或位置跳动。每帧人工 sourceAnchor 使用同一解剖定义、原图绝对坐标，不要求不同源格的数字相同；同阶段共用相对 sourceCanvas 与 stageScale。不得逐帧按 bbox 重居中、缩放到相同包围框或按加权脚底像素中心移动动物；不稳定躯干或脚点应修订原画。
- `src/content/livestock-visuals.json` 每个目录 ID 使用 `{ stages, slaughter, grounding, feeding, product }`。`grounding` 是长度恰等于 `stages` 的数组，按图集阶段顺序排列；每项为 `{ x, y, radiusX, radiusY }`，两个半径均为有限正数，位置和大小对应最终帧的真实支撑脚区域，同阶段四个 idle 帧共用该项。生产导出只按阶段首帧登记静态脚印，不逐帧测量，也不为影子挪动动物；`grounding.x/y` 不强制等于源图注册点 `(138,270)`。
- `layout.species[ID].stages[i]` 顶层必须显式提供正整数 `supportBandHeight`、`supportMaterial` 和场景横向脚区 `supportXRange`。首帧支撑区域取场景 y 从 `fixedGround.y - supportBandHeight` 至 `fixedGround.y + 3`，再按 supportXRange 排除低头嘴／喙；此范围用于提取脚区，不是给阴影加位置偏移。`supportMaterial` 只用 `golden-feet`／`opaque-feet`：前者筛金色脚趾／蹼并保留 1px 外轮廓，排除贴地羽毛下摆；后者取该下脚区内不透明蹄／爪。导出只消费登记，不按固定 L 名单猜测或补默认 band；生成的 `footprint` 保留同一 supportMaterial／supportXRange，supportSelection 写实际说明。
- `product` 为 `{ icon: ID, bounds: { x, y, width, height } }`，`icon` 使用该 ID 的 canonical 物品图，`bounds` 是原有 96px 图标可见 Alpha 的内容区域。动画加载器直接请求 `./wiki/icons/<ID>.webp?game=1`，与仓库使用同一 URL，接受 96px 图标；不用旧独立 128px 产品图，也不将透明边距当作产品脚点。
- `assets/livestock/atlas.json` 每帧保留 `fixedGround: [138,270]`，新增 `stageScale` 有限正数、`sourceAnchor: [x,y]` 和 `anchorMethod` 说明；同阶段四帧的 `stageScale` 和场景脚点一致。`sourceAnchor` 是人工登记的解剖脚点，使用原始整张源图的绝对像素坐标，坐标为有限非负数；`sourceCanvas.left/top` 是相对此 anchor 的偏移，画布尺寸同阶段固定。导出从 `sourceAnchor + sourceCanvas.left/top` 提取画布，同阶段共用 `stageScale` 与 `scenePlacement`。`anchorMethod` 说明实际固定脚点与对齐方法，由素材负责人按实际导出填写，不凭空填一个标签声称无抖。
- 运行时在棚舍之上、动物之下的独立 PixiJS 地面层，按真实 `grounding.x/y` 绘制动物椭圆，不加旧 `y+3` 偏移；只在阶段切换时更新几何，idle 不移动或缩放影子，透明度乘 `animalAlpha`。全部产物另有独立椭圆影，半径按产品可见宽度确定，几何恒定并乘 `productAlpha`，不与动物阴影共用显隐状态。
- 产品按 `bounds` 缩放和定位可见主体。肉品按对应站位左右居中，高度对齐成熟 grounding 的变换落点，跨收获淡出保持，不跳回幼年脚点；附属产物放在动物附近且优先远离饲料侧。尺度按大小类与站位深度设置，不把 72px 等历史实现选择当作所有物种固定值。动物／产品独立影 Alpha 按当前运行配置，不恢复已删除的减弱动态功能。
- 派发资源与运行时任务时，交接实际来源、每阶段尺度／解剖脚点、真实脚印 `grounding`、canonical 产品身份／内容 `bounds` 和未验收项，不能只交一个帧数。最终资源检查按全部 `kind: L` ID 核对阶段长度、有效几何、共享尺度与脚点、原物品身份／96px 规格／生成登记，并对脚线下疑似烘焙投影作保守检查，给像素轮廓留出余量。元数据数值、图数量或检查通过都不能证明风格或无抖；PM 仍需审阅真实源图和分镜，浏览器验收按用户授权执行。

## 进食位置与复合饲料图片

- 源登记 `feeding-registration-v5.json` 每物种含实际来源 key、grain／hay／greens 类型与逐期 anchors／canvas／mouth；mouth 是首帧原图绝对口部接地点。导出按同一解剖脚点和 stageScale 换算进食位置，不从每帧嘴部 bbox 追踪饲料。
- `layout` 每期 `feeding` 为 `{x,y,radiusX,radiusY,kind}`，`feedingSource` 为 `{source,referenceFrame:0,sourceMouth,method,mouthBounds,sourceMouthBounds,mouthBoundsMethod}`。坐标为 320 场景注册 `(138,270)` 系；当前图片底部地面 anchor 比口部接地换算点低 3px 是实现选择，不是用户规定的统一偏移。
- `livestock-visuals[ID].feeding` 长度等于 stages、顺序一致；manifest 每物种同时交付 feeding／feedingSources，以及 `animation: 'feeding'` 和真实源注册路径。原稿与动物图集不含 feed／食槽，不能把产品格当饲料纹理。
- 用户再次否定 v6-r3 综合饲料仍不明显后，当前 `raw/compound-feed-v8.png` 由内置 image_gen 新画完整深蓝灰低沿托盘、浅谷粒／棕颗粒／绿色草料分组，保持像素轮廓而非与地板相同的细黄点；托盘是图像呈现选择，不新增经济动作。提示词及实际转换见 `feed-prompts-v8.md`，原稿不改。`feed-registration-v8.json` 契约为 `feedTexture: {path:'./art/livestock/feed-v8.webp',size:[128,64],bounds:{x:4,y:4,width:120,height:56},anchor:[64,60]}`，anchor 为纹理像素底中。透明 PNG/WebP 不带地面烘焙影，盘体自身暗侧仍属盘体。旧源／旧静态通过仅保留历史，用户新反馈重新打开本项。
- `src/content/livestock-visuals.json` 每 ID 使用同一 `feedTexture`；加载器提供 `textures.feed`，按可见性共享和卸载，并消费新 path 防止旧图缓存。运行每只动物分别创建 feed Sprite 和 feedShadow Graphics，`src/view/livestock-layout.js` 的 `livestockFeedLayout(feeding,feedTexture,baseAnimalScale)` 供运行／回退共用，其 `x/y/width/height/scale/shadow` 是 320 动物源格坐标，再应用该动物注册平移、体型与景深。当前基准场景下限52px宽，再乘站位depth保留近大远小；嘴前偏0.2可见宽、前下偏0.55可见高，盘与轻影同移。这是本轮实现选择，按真实130px全20阶段四帧审每只嘴前可见主体，不因尺寸或文件存在算通过；kind 保留来源，不再切换程序细粒。阶段更新位置，idle四帧不移动饲料，不改真实嘴／脚／mouthBounds。
- 单只组层序为动物影、产品影、饲料轻影、饲料、动物、产品；各组从远到近绘制。当前 feed 与轻影独立保持，不乘 animalAlpha／productAlpha；动物和产品按既有生命周期淡变，不新增饲料消耗、喂养按钮或经营统计。静态回退复用同一 feeding 登记独立合成，实际画布效果仍须按授权验收。

### 低嘴局部登记与脚线门禁

- `feedingSource.mouthBounds` 为 `{x,y,width,height}`，使用最终 320 场景坐标；同阶段共用一个紧凑区域，覆盖四张真实进食姿态中靠近／低于脚线的嘴或喙，不扩大到整个头部、前方地面或整列。
- `sourceMouthBounds` 使用首帧原图绝对坐标，与 `sourceMouth`、该帧 sourceAnchor 和同阶段 stageScale 可换算。两个框均须在各自图像内，包含已登记嘴点，并在 layout／atlas feedingSources 中一致；mouthBoundsMethod 说明局部选择依据。
- 局部框必须与显式 supportXRange 脚区不相交。当前 gate 在该脚区内读取 alpha≥128 的最低支撑像素，容许 y=268–272；这是固定注册点下的技术容差，不代表口部也必须落在脚区或此范围。
- 全幅脚线下疑似投影仍在原始 PNG 和发布帧两处拒绝；仅跳过精确 mouthBounds 中的真实低嘴像素，不能把扫描范围整体缩到脚区，不能用局部框放行脚区、整片地面或烘焙椭圆影。
- `assets/livestock/alignment/<ID>-<stage>.png` 的最新红框是该区域的静态交接资料，需连同源图、正常底色与最终 PNG／WebP 逐帧看是否只含真实嘴／喙。修正人工脚点、躯干或源格隔离后使用同次重导的新分镜，不拿旧静态图关闭新反馈。字段齐全、变换一致或门禁通过只能证明对应技术项，不能证明局部框合理、无烘焙影或真实动作连贯。

## 动画和实际使用

- 展示周期是 `max(实际生产周期,9000ms)`。肉用三期均分，附属产品类始终成年；四帧 idle 按 300ms 循环。短批次保留连续展示相位。
- 最后 3 秒产品以 300ms smoothstep 淡入：肉品在成熟落脚点，附属产物在附近接地；仅肉用动物同步淡出。展示收获后产品以 300ms 淡出，肉品与其阴影跨阶段边界保持成熟落点。首次养殖、换养不能凭空带入上次产品，不套用作物的 30ms 空隙。
- 棚舍、动物影、饲料及其轻影、产品影、真实进食动物和产品分别管理，棚舍不移动；阴影遵循登记，不跟随 idle 轮廓漂移。最近邻绘制，使用真实进食 idle 与既有阶段／产品淡变；不恢复已删除的减弱动态功能。
- 主界面仅为实际可见且活跃的图块挂载；滚出、弹窗、切页、后台时销毁。按需共享同种贴图，失败显示 `scene-<ID>`，WebP 不进启动预缓存。
- 养殖选择网格使用 `livestock-<ID>`；仓库、收成和动画产物共用 `<ID>` 原物品图，不能另用产品格或独立产品图。详细／仅图标模式、当前生产周期与设施点击命中都要保留。

资源检查必须按目录全部 `kind: L` ID 检查登记、图集尺寸／透明度、每期四帧独立性、固定注册点／共享尺度、阶段真实 `grounding`、疑似烘焙投影、canonical 产品及其内容 bounds、选择图、回退和共享棚舍，不要求旧独立动画产品。执行检查或画布验收仍须用户授权；未授权时记录未验收，不能以素材存在或测试源码推定完成。
