# 大地图加工与精制连续烟效静态审阅

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

日期：2026-11-22。任务：EW-SMOKE；实现所有者：processing_smoke。范围为首页大地图加工与精制建筑烟效，依据 [任务卡](../tasks/2026-11-22-processing-chimney.md) 及用户追加要求“精制建筑的烟和加工建筑的烟都做成一样烟不会停的动画。另外不要让两种建筑的烟动画时刻一样”。两座共用一套连续烟团模型与同一资产，固定错相；复用现有建筑、水轮与烟团，不产生新原画，不修改任何公共图片。

## 原图与锚点

- 已通过 `view_image` 实开 `public/art/estate/processing.webp`：536×320，烟囱位于屋顶右上，帽口中轴采用源坐标 `[330, 32]`。该坐标对应帽口上表面，未移动建筑或烟囱。
- 已通过 `view_image` 实开 `public/art/estate/refining.webp`：536×320，保留原精制烟团的源锚点 `[403, 37]`，对应右侧砖烟囱帽口。
- 已实开 `public/art/estate/refining-motion.webp`：141×168，透明背景烟团，底部烟尾作为锚点。两座均采用 `[0.28, 0.93]`，对应烟图坐标 `[39.48, 156.24]`。
- 已实开 `public/art/estate/processing-motion.webp`：原水轮，静态合成保留原 `prop [348, 223, 152]` 摆位。合成里的水轮只显示零角度，不证明运行旋转。
- 首页默认布局中，两座烟团统一使用 `smokeUnit = 地图宽度 * 0.37 / 472`。最长边上限为 `88 * smokeUnit`，右漂最多 `12 * smokeUnit`，上升最多 `20 * smokeUnit`；每团尺寸系数为 `0.53 + 0.47 * phase`。390 像素地图宽度下，两座烟团最长边上限均约 26.9 屏幕像素，右漂上限约 3.67、上升上限约 6.11 屏幕像素。
- 保留布局编辑器的建筑缩放相邻行为：每座使用 `effectiveSmokeUnit = smokeUnit * 当前widthRatio / site.widthRatio`，尺寸、漂移、上升和视觉裁剪均使用该有效单位；帽口仍按建筑自身 `unit` 映射。默认比值为 1，两座烟同尺寸；编辑器覆盖建筑宽比时，烟随该建筑等比缩放，不更改编辑器或其它文件。
- 两座共同采用周期 4.4 秒、每座三个固定烟团、`alpha = 0.62 * sin(π * phase)`。原精制单烟节点及其专属 `animate` 已移除，没有叠加旧烟层。

## 连续可见与错相边界

第 `k` 个烟团（`k = 0, 1, 2`）的相位为：

`phase(k, t) = ((t + phaseOffset + k * 4.4 / 3) mod 4.4) / 4.4`

`t` 为原地图传入的全局单调时钟秒数。加工固定 `phaseOffset = 0`；精制固定 `phaseOffset = 1.1` 秒。没有随机数、局部开始时刻或按重绘重置的计时器。

- **无全体透明时刻：** 三团等距分布，任意时刻必有一团相位落入 `[1/3, 2/3]`，故该团 alpha 至少为 `0.62 * sin(π/3) = 0.62 * √3/2 ≈ 0.5369 > 0`。即使一个烟团恰好在循环边界，其余两个也各为约 0.5369。该结论适用于建筑与烟纹理已就绪且地图允许更新的状态，不包含资源尚未到达或整个场景不可见。
- **两座不会同步：** 三团集合的平移重复间隔为 `4.4/3` 秒。两座偏移差 `1.1 / (4.4/3) = 0.75`，不是整数，故同一时刻两座的相位集合不相同。偏移取固定值，跨重绘与滚动继续从全局时钟复算。
- **经营边界：** 只修改装饰 Sprite，沿原 `buildingsActive` 更新门禁运行，没有引入生产、离线或经营时间累计。

以上为公式推导，不属于实际游戏运行验证。

## 实际接入路径

1. `src/view/estate-map.js` 为加工与精制各创建三个 `eventMode='none'` 烟团 Sprite，均由同一 `chimneySmokeStyle` 和同一更新分支驱动。两座区别仅在真实烟囱口坐标及固定相位偏移。原水轮仍由 `motion` 创建，`processing.animate` 的 `turn * cycle(time, 8)` 未修改。
2. 两座进入原预加载范围后，各自的 `loadArt` 都调用 `applyImage('refining-motion', ...)`，URL 版本不变，沿现有地图图片 loader 复用共享纹理。纹理回调拒绝已销毁 `art`；成功挂载后调用 `markDirty`。
3. 烟效和水轮分别按各自纹理就绪状态更新，烟纹理不依赖水轮纹理先到达。`update` 仅改已有 Sprite 的 `visible`、位置、缩放和 alpha，沿原返回值标记动画变化；未新增 ticker、逐帧节点或 Texture。
4. 原 `setViewport` 仍收集 `visibleEntries`，原地图 `buildingsActive` 仍控制这些条目的更新。两座视觉顶界均使用 `烟囱口屏幕 y - (88 + 20) * effectiveSmokeUnit`，覆盖烟团完整上飘边界；原 `bind` 使用的 `top`、`left`、`right`、`bottom` 没有改动。
5. 烟团属于各自的原建筑 `art` 子树，沿既有地图销毁路径释放显示节点；不销毁共享纹理。建筑和名字的中心、宽比、布局不变；`weatherShadowLayer`、天气 attach/mount 目标、鸟／HUD 层级没有改动。

以上为源码接入说明。尚未执行实际游戏生命周期验证。

## 静态证据

导出入口：`node scripts/review-processing-chimney.mjs`。脚本仅通过 sharp 合成已有图像，不导入或运行游戏。每行左为加工、右为精制，固定取同一时刻 `0 / 0.55 / 1.1 / 1.65` 秒，分别使用 0 与 1.1 秒偏移，记录同一模型、同一屏幕尺寸、同时间而不同相位的静态结果。大图按 390 像素地图的三倍尺寸合成，小图还原 390 像素比例；像素取整与 sharp 重采样和实际 Pixi 渲染存在差别。合成不包含地图背景、天气、名字或实际 Pixi 变换。

**证据图仅本地保存**，不提交到仓库。新环境可通过上述脚本重建。

| 本地路径 | SHA-256 |
| --- | --- |
| `assets/source/art/estate-weather/reviews/processing-refining-continuous-phases.png` | `f58c1bb437968299a35a089caab0037812706bb11e6ad47b6dda07a2dfd8989b` |
| `assets/source/art/estate-weather/reviews/processing-refining-390px-size.png` | `ca615b7cc563f872a9af204c7fe9881be41f190fd946adc505cf8ab42d3fff47` |

| 既有源图 | SHA-256 |
| --- | --- |
| `public/art/estate/processing.webp` | `21488af92acfe219c6fa6ac30dcfb0d294f228d8ed85860163305155c7a5faee` |
| `public/art/estate/refining.webp` | `bcc3e245dcc369a95f1a300f67da5a1e51205924fc6d78e75e254c81de6859e3` |
| `public/art/estate/refining-motion.webp` | `2db1fd822dd1504e3023f35d9152fdb66184f4e63f228ad014efa96a161b3326` |
| `public/art/estate/processing-motion.webp` | `2d42f3d73b4b9bdd26d60c3b1ee479da2fa7e3f4cdc28a87dd9d04a678e3af1d` |

## 状态与未验证项

- 原图与静态摆位：已通过 `view_image` 图像审阅，两座烟根与各自帽口相接，烟团尺度一致，同时间静态相位不同，水轮保留。实际动画：未验证。
- 加载、独立纹理到达、视口裁剪与销毁：已阅读实现路径；运行结果未验证。
- 连续可见与错相：已列出公式边界；连续运行结果未验证。后台、切页、滚动、尺寸切换、布局编辑器缩放、天气遮挡、原水轮旋转与两座烟效：未运行验证。静态图只覆盖首页默认布局。
- 未执行测试、冒烟、浏览器预览、语法或运行时检查、编译；最终编译由项目经理在全部资料齐备后执行。本报告不将静态合成视作真实动画验收通过。
