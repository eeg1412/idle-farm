# 独立草树素材与大地图摆放

用户追加：生成单独不同种类草和树图像，适当摆放大地图，由视觉子代理审阅美感。与进行中的随机飞鸟/阳光返修一起最终构建并发布原公开Sites。保持用户认可底图及原建筑/门牌/动件/位置比例，新增少量独立透明植物装饰；此前用户嫌地图花哨，必须留道路与空地，不能重新铺满花边。

## 冻结接口与所有权

原光鸟实现者已结束两气氛模块所有权，原独审仅拥有自己的返修报告/证据。本文、feedback-checklist、docs/assets.md及最终整合/生产构建/发布由PM `/root`独占。下列是新的植物输出，与旧光鸟/群像目标不同，全部新干净上下文，只传最少资料；不要复用无关旧代理。

1. `map_foliage_art` → 原生6素材：独占新`assets/source/art/estate-foliage/`、`public/art/estate/foliage/`和`scripts/export-estate-foliage.mjs`。先实际开认可底图`public/art/estate/background.webp`与`public/art/estate/operations.webp`作画风参考，内置imagegen生成透明小素材图集再分割，每个独立PNG/WebP：`grass-meadow`短草、`grass-sedge`细长莎草、`grass-fescue`低矮簇状草；`tree-oak`圆冠阔叶树、`tree-birch`疏冠白桦、`tree-pine`小松树。匹配当前日式像素、黄绿/灰绿和左上光，3/4俯视，草12–26px、树约45–80px实际显示仍可辨。各物件完整、分离，无大地台/花朵/建筑/人物/文字/黑底/白底，不画背景场景。小素材按透明网格原生绘制再裁切，不程序画植物；六件独立成品紧致裁切留少量透明边，统一各图底部根脚锚点。最近邻等比转换WebP70/Alpha100，每种source尺寸/成品width/height/anchor/真实alpha与hash在`registration.json`登记。PNG保留源，成品树最长边256px、草最长边128px；metadata不可仅凭假定。输出真实prompt/引用/原始输出，尽快交素材和登记给摆放者/独审；不要测试/预览/构建/push。
2. `map_foliage_placement` → 运行摆放：独占`src/view/estate-map.js`、新`src/view/estate-foliage-layout.js`（纯数据/几何），必要新`src/view/estate-foliage.js`。最少读AGENTS/performance§1/5、estate-map及本卡；亲开当前底图和上轮静态建筑叠图。固定稀疏布景，建议3棵树各一+约5簇草，总数≤10，尺寸按实际图和落地关系确定，不均匀撒点，不挤满空白。放地图边缘/合适小空地，避主路/支路、建筑入口、门牌、矿岩与水面，层序背景→植物→原建筑→气氛/鸟→门牌→控件。建筑自身几何/动件/命中不得改变，不碰光鸟两个模块。沿现有loadAnimationImage固定有限缓存/迟到销毁防护、map视口按需载入，静态Sprite无ticker/随机/碰撞/UI，不改游戏/存档。公开独立layout含id、坐标、显示尺寸与anchor供静态合成；等真实registration到齐后用真实尺寸消耗，不能猜图。不要测试/预览/检查/构建/push。交实际调用链/hash并结束所有权。
3. `map_foliage_visual_review` → 新独审：独占新`assets/source/art/map-foliage-review/`及`docs/art-reviews/2026-11-19-map-foliage.md`。最少读本卡、farm-art-review及相关清单；开认可底图/原建筑参考，再实际开精确6源PNG/成品及实际显示尺寸，判类型/像素风/真实透明/完整轮廓/落地感。最终layout+真实图静态叠原建筑门牌并加最终阳光/几帧鸟，审全地图和320/390手机窗口（含滚动）疏密/比例/色彩、道路通畅、入口与文字无遮挡，不把正常重叠或视口边界自然裁切都退回。只读核对层位、加载/销毁/缓存/增量范围。若不合格给具体图证退原所有者（审阅者不改原稿/运行代码）；新报告记录精确hash与限制，结束所有权。静态合成允许，不跑游戏/Pixi/浏览器/测试/语法/运行检查或构建。

## 发布边界

不推GitHub，原Sites源码同步保存/发布已在前序任务授权。PM等本项及光鸟返修全部源码/素材/资料/独审冻结后统一最终生产构建一次。静态审图不称真实游戏运行通过。各代理阶段短报、只写互斥范围，接口变更先报PM与下游。

## 交付记录

六件源图/独立PNG/WebP已完成并冻结，原画者结束所有权。1536×1024原生图集SHA256 `d1e8bac8a4e24c7cc506493b9605ef6017be250911bb8a80f19c1bd11e03ae05`；真实登记`public/art/estate/foliage/registration.json`为`9931f81ebc90f7d7ba9753fb44654d1594b1749e8ef1569518977b10b65cf3d3`。PM亲开正常草底图集，6种造型清楚且配色相容。

摆放已冻结并结束所有权，8株固定几何、真实尺寸/根脚，map SHA256 `3fa14660dc1f4d4b962cf911f2cc433a1597d347309e480ae8dbea64a5cb1dea`，layout `ddd56e0662bd19deede47f550b9d8ee1318966b6f3d3a69e271d164ebb2a5cad`。PM亲读map完整diff及layout/metadata、实开390上下两位置；道路/门牌/根脚与光鸟相容。原建筑sites与20建筑动件、sign、认可底图保留原字节。源码入口为estateArea→mountEstateMap→setViewport→foliageEntries.loadArt→applyImage→原loadAnimationImage缓存，不加ticker或游戏动作。

独审已实际开最终六件、全图、320/390滚动视口、真实尺度及光鸟合成，报告疏密/比例/色彩/落地和道路文字范围无退回项；精确证据和限制由[本轮报告](../art-reviews/2026-11-19-map-foliage.md)冻结。不将静态结论写为运行通过。

最终独审报告已完成并结束所有权，PM已亲读报告；草树与光鸟返修的全部实现、素材、资料及报告冻结，无未闭环项。仅PM执行最终生产构建与原公开Sites发布，不运行测试/游戏预览。

PM通过Sites build-site helper执行最终`npm run build`，816模块生产构建及离线产物完成，退出码0。其后只补本文和反馈交付记录，未改运行输入；原公开Sites同源同步/打包/保存/发布继续执行。
