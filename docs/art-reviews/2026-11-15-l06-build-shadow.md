# L06 构建脚线报错复查

本轮 BUILD-L06-20261115，只处理用户提供的 `art:check` 失败；旧的全畜牧静态审阅不关闭本次失败。

## 原版本证据

PM 实际打开了 `assets/livestock/raw/pixel-v5-feeding-pig.png`、`assets/livestock/animals/L06/mature-2.png` 与 `assets/livestock/alignment/L06-mature.png`。原稿和成熟四帧分镜中的脚线下轮廓属于前蹄；未见需要退回重画的烘焙椭圆地影。第 2 帧嘴已经抬高，不能用扩大嘴部豁免解释或修复本次报错。

素材所有者针对 L06 成熟四帧读取像素：y273 的可见部分位于 x142—164 前蹄区，每帧该行约18—21像素；旧脚印登记本身包含 y274 的前蹄接地点，而公共根脚点为 y270。`noBakedGroundShadow` 从 y273 扫描，因而把未对齐的真实蹄底标记为疑似投影。这是源解剖脚点与导出落点不一致，不能以放宽门禁、脚区豁免或改嘴框消除。

## 修订与范围

`feeding-registration-v5.json` 中 L06 成熟四帧统一使用真实前蹄下边界 y819（可见蹄底 y818），`canvas.top` 从 −202 改为 −208，因此原始绝对源窗顶仍为 y611、尺寸仍为277×220、共享尺度仍为0.7292418772563177。导出器消费逐阶段 `anchorMethod`，保留本轮依据；未修改原画、检测器、检测阈值或 `supportXRange`。

资源所有者执行普通转换 `node scripts/export-livestock-animation.mjs --species=L06 --refresh-scenes`，成熟四帧统一上移5场景像素，更新 `layout.json`、`atlas.json`、运行 `livestock-visuals.json`、L06 PNG／图集／归一源网格／回退及分镜。成熟 `grounding.y` 从271.5到266.5、`feeding.y` 从275到271；肉品落点沿既有运行代码消费成熟 grounding。源登记的嘴点保持不变，局部嘴框由同一变换重新计算，与支撑脚区分离。

为保留选择图真实历史输入，在更新动画前将旧成熟0／3帧归档到 `assets/livestock/choice-input-archive/v7/L06/`，并同步 `choice-registration-v7.json` 与 manifest 的引用，保留原哈希及原路径。选择图成品未重新生成。

PM 实际重开修订后的 `assets/livestock/alignment/L06-mature.png`、`public/art/livestock/animals/L06.webp`、`public/art/scene-L06.webp`：四帧前蹄沿同一脚线归位，嘴框未包含支撑区，源画头颈变化和身体尺度保留，回退使用同一新成熟动物与独立饲料。透明查看器的低 Alpha 显示不作为新增底色缺陷。此结论限本轮脚点静态修订。

PM 另只读核对源登记→导出器→layout／manifest／运行metadata，以及 `livestock-animation.js` 的固定root、阶段阴影、饲料和成熟产品落点消费链。没有修改运行展示或经济行为。

## 当前判定

- 原画：本次报错涉及的成熟前蹄局部无需重画；本结论仅覆盖投影疑点。
- 修订后的源登记、PNG 和发布 WebP：本轮脚点／投影疑点静态复查通过；不扩大为全部畜牧画风或运行体验通过。
- 资源门禁、最终构建、PixiJS 真实循环、动物／产品影与收获落点：未运行，未验收。本轮没有运行授权。
- 用户认可：未取得，不以内部静态审图替代。
