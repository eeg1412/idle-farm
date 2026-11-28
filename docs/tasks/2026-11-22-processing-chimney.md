# 大地图加工烟囱冒烟

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

## 目标与所有权

用户追加“加工也有一个烟囱，上面也加上冒烟效果”。当前上下文是首页大地图动效，范围为 `estate-map.js` 的 processing 建筑烟囱，不是工坊生产卡。PM维护本任务卡与反馈，具体代码交 EW-SMOKE / processing_smoke，新建干净上下文；该任务输出为地图加工烟囱冒烟，与天气补云实现独立。

- agent↔objective↔artifact：processing_smoke → 加工烟囱烟雾 → `src/view/estate-map.js`；可新增 `docs/art-reviews/2026-11-22-processing-chimney.md`、`scripts/review-processing-chimney.mjs` 与本地证据 `assets/source/art/estate-weather/reviews/processing-*.png`。
- 原weather_code已结束map所有权；只修改上述文件，其他worker正改 `estate-weather.js`／`estate-clouds.js`／删除 `estate-animal-clouds.js`，不得覆盖或撤销他们或外部订单工作的修改。
- 共享资产生成：无。复用现用 `public/art/estate/refining-motion.webp`，不改原图、不生成新烟雾、不替换建筑。PM已实开加工图、精制图与烟雾图确认存在可复用烟团。

## 最小输入与实际证据

- 只读 `src/view/estate-map.js` 的 processing/refining site、loadArt/update、view culling 与层级；`docs/performance.md` 渲染和纹理小节；`docs/ui/pages/estate.md` 加工与精制条目。
- `processing.webp` 原图536×320：烟囱在屋顶右上，帽口中心约源坐标[330,32]；须通过 `view_image` 实开确认接地口，不把PM目测当精确像素证明。
- `refining-motion.webp` 是独立透明烟团141×168，现精制site prop[403,37,122]、pivot[.28,.93]，4.4秒上飘缩放／alpha循环；processing原prop[348,223,152]为水轮，8秒旋转。必须同时保留两动效，不得用烟取代水轮。
- 用户最新天气层级：云影覆盖建筑和名字、鸟在其上，HUD／菜单／Dialog最上。map刚新增的weatherShadowLayer及attach目标必须保留。

## 行为边界

| 入口 | 适用条件 | 只允许改变 | 必须保留 | 证据 |
| --- | --- | --- | --- | --- |
| 首页processing建筑可见 | 现有mapActive时更新 | 在真实烟囱口产生小幅上飘、渐显／渐隐烟团，可复用原精制烟团 | 原建筑、中心／宽比、名字／hit区域、水轮8秒旋转、精制原烟、云影／雨／鸟／HUD层级 | 实开原图并对齐静态合成、实际load/update/culling diff |
| 滚出／后台／切页／重绘 | 按现有地图生命周期 | 不再更新不可见加工烟雾，显示节点随art销毁，纹理由共享pinned loader持有 | 原视口和交互，不新增ticker、不每帧建节点/Texture/Graphics clear、不按时钟整页重建 | 源码生命周期 |

## 方法和交付

在processing art创建固定烟雾Sprite（1–2个足够），用现有applyImage加载同URL，不新增下载或改缓存版本。烟根位与真实帽口对应，尺度比照现精制小烟，不放大遮挡建筑。只改Sprite属性并沿原update返回值标脏；将烟雾可见边界纳入processing视觉culling范围，不能扩点击区。需新接口／其他文件先报PM。

允许源图／已有WebP查看、像素尺寸读取、静态合成证据；不运行测试、冒烟、浏览器预览、语法／运行时检查或编译。只有全部资料齐备后由PM最终编译。推送授权无。若生成静态证据，图片仅本地保存；报告记录路径／sha256、原source与锚点依据，不将静态摆位当真实动画通过。没有新原画，不需要用imagegen重画现用烟团。

接手复述范围／所有权；完成报告实际anchor/size、load→update→culling路径、水轮保留证据与未验证项，结束文件所有权。PM按diff复核并更新反馈。

## 交付记录

processing_smoke已交回map／静态报告／图片脚本的所有权。实际锚点[330,32]、最长边88、两团4.4秒／错2.2秒、最大右漂12／上升20源像素；loadArt复用refining-motion，update独立于水轮纹理就绪、视觉上界扩至源y=-76，点击区不改。PM已实开原图及两份静态证据并读diff；独立源码复核确认原水轮8秒旋转、精制烟与天气层级保留。最终编译待天气最后不重叠布局交齐后由PM统一执行；运行未验证。
