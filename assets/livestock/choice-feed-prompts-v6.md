# 2026-11-15 choice/feed v6

后续用户明确否定本批 V4 选择图复用：该选择部分仅保留历史，活动选择来源已换为 `choice-registration-v7.json`，全部逐 ID 输入当前 V5 动画帧新生成。用户随后再次否定 v6-r3 综合饲料仍不明显，本文件饲料与旧静态通过也仅留历史，已切到 `feed-registration-v8.json` 的新设计；旧内部审阅不代表用户接受。

用户追加 9/10：养殖选择图恢复抬头；真实进食动画保留 V5 全部 80 帧，全部动物另加共用复合饲料图片层。

## 抬头选择来源

复用已认可 pixel-v4 原稿的成年抬头第 0 帧，独立登记在 `choice-registration-v6.json`。登记参考 `layout-v4-before-feeding.json` 的实际成熟源窗口；选择图不再从 V5 进食 atlas 或站立场景取得。原稿保持原样，沿历史 alpha 200 隔离，透明紧裁后 nearest 缩放至 88px 内，置入 96px 透明图标。活动物特征、角耳尾脚完整保留。canonical 仓库产物不改。

## 共用复合饲料

内置 `image_gen`，2026-11-15，单张新生成透明原稿；不是程序细粒或旧产品图。风格参考仅为 `raw/pixel-v4-black-pig-style.png` 与 `raw/pixel-v4-accessories.png`。工具原始产物保存在 `raw/compound-feed-v6.png`（1840×854，原文件不改），生产裁切与 128×64 纹理契约见 `feed-registration-v6.json`。原稿宽扁堆体经 nearest 归一至登记 120×56 的内容区，保留透明通道；无饲槽、食盆、地面、烘焙投影或动物。

实际提示词：

> Create one new game sprite asset: a low mound of mixed livestock feed, on a fully transparent background. The two attached images are STYLE REFERENCES ONLY for the existing idle-farm pixel sprite family; do not include or redraw any animals, eggs, milk buckets or atlas layout. Draw one broad, squat mound viewed from slightly above in a restrained three-quarter farm-game camera, about 2.15 times wider than high. The mound is a readable contiguous heap of large distinct golden corn kernels, pale wheat/oat grains and a few earthy brown feed pellets, with only a few short straw pieces and tiny green leaf flakes mixed through it. Main visual mass must be warm golden grain that contrasts against a wooden barn floor. Crisp intentional pixel clusters, stepped dark golden/brown silhouette, medium-detail pixel-art with organized discrete shading and chunky grains, matching the supplied pixel animals, no smooth gradients or realistic texture. Designed to stay clearly recognizable when the entire sprite is only 18 to 24 screen pixels wide, so use large clear individual kernel clusters instead of scattered fine dust or thin filaments. All feed pieces connect into one compact low mound with flat bottom ground plane, keep generous transparent margin around every side. No bowl, no trough, no sack, no shovel, no animal, no floor, no ground patch, no surrounding scenery, no cast shadow, no ellipse, no frame, no labels, no text, no watermark. True transparent alpha outside the precise mound silhouette; no pale matte, no gray or neon fringes.

`src/view/livestock-layout.js` 的 `livestockFeedLayout` 供运行和素材回退共用。每只动物一份图片与轻影，沿既有 feeding.x/y 真实嘴部接触点向嘴前布置，随同动物 3/2/1 与透视变换。首轮源格 `max(2*radiusX,38)` 经静态 QA CF-R01 退回：小型料堆在 130px 卡中仅成黄点。第二轮将最小宽改为场景 32px 后仍被低嘴遮挡，继续退回，源图不需重画。第三轮保持 32px 场景下限再乘景深，由共享 helper 将堆体朝口部前侧偏移可见宽 0.2、底部向前偏移可见高 0.55，图片和轻影同移；真实嘴点、脚点、动物帧和 mouthBounds 不变。以上是本轮实现参数，静态图、实际运行验收和用户认可分别记录，不把参数存在视为通过。全部动物原画、动画帧与透明选择图仍不含饲料。
