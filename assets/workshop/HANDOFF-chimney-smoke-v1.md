# 工坊独立烟囱与烟团 chimney-smoke-v1 交接

本轮只新增独立烟囱、三烟团及 `src/content/workshop-effects.json`，没有修改wood-v6原稿／配置，也没有修改布局／渲染／经营代码。素材所有者 `/root/workshop_topdown_art`。

## 原画与四个成品

原稿 `assets/workshop/raw/chimney-smoke-v1.png` 是一次内置 `image_gen` 真正生成的1254×1254透明2×2网格，上左为正俯视陶／石砌顶圈与暗口，其余三格为独立灰白烟团。没有烘焙机器、材料、烟囱到烟团、背景或地面影；不是程序绘图／CLI替代。

实际输入为 `public/art/workshop/processing-machine-wood-v6.webp` 和 `public/art/workshop/refining-machine-wood-v6.webp`，已先实际打开，按本轮木质像素风与90°相机参考使用。精确prompt和默认生成文件在 `assets/workshop/prompts-chimney-smoke-v1.md`。

| 层 | 持久PNG | 发布WebP |
| --- | --- | --- |
| 烟囱顶圈 | `assets/workshop/png/chimney-v1.png` | `public/art/workshop/chimney-v1.webp` |
| 烟团1 | `assets/workshop/png/smoke-1-v1.png` | `public/art/workshop/smoke-1-v1.webp` |
| 烟团2 | `assets/workshop/png/smoke-2-v1.png` | `public/art/workshop/smoke-2-v1.webp` |
| 烟团3 | `assets/workshop/png/smoke-3-v1.png` | `public/art/workshop/smoke-3-v1.webp` |

四张均96×96，真实Alpha保留，PNG／WebP均是各自单格裁切；WebP质量70、Alpha100。没有将全局0.35透明度烘焙进烟团；原画的半透明细丝和透明空隙保持，代码另外乘整体maxAlpha。

## 精确锚点与冻结接口

`src/content/workshop-effects.json` 已在生成前按任务卡先行写入，四公开WebP齐备后已通知代码所有者可接入。烟囱logicalSize40×40、anchor=[0.5,0.5]；两工位position/emitter均[160,92]。

原稿暗口真实中心是source[315,312]，外轮廓bbox中心约[314,317]，没有把偏移外框中心当成开口。烟囱裁切 `(115,112,400,400)` 以开口为中心，最近邻96²后正好映射[48,48]，因此冻结anchor和emitter不变；该源偏差及归一方法已先向PM和代码所有者说明。

烟团裁切分别为 `(708,99,448,448)`、`(53,693,512,512)`、`(660,664,544,544)`；三个形状互不混入，统一缩放到96²。完整sourceBounds、格序、转换尺度及输入位置在 `assets/workshop/registration-chimney-smoke-v1.json`。

冻结烟雾参数：interval600ms、lifetime3200ms、startSize24、endSize60、maxAlpha0.35、rise68、drift18、sway8。半透明、漂浮、扩散、暂停行为由独立代码所有者实现，本素材producer不执行这些逻辑。

## 可持续转换与权限

`assets/workshop/export-chimney-smoke-v1.mjs` 只读取真实原稿，按登记裁切、最近邻缩放和WebP转换；另写来源登记。不绘烟、不擦图、不合成、不导入游戏／布局，也不修改效果JSON或其他代码。旧wood-v6、旧金属机、其他带面均未改动。

素材所有者已直接打开4张最终WebP；PM和独立审阅者已打开真实原稿。独立审阅者又逐件实开4组PNG/WebP，确认96²完整、正俯视烟囱、三独立烟团与真实Alpha保留条件通过，无退回项；黑底查看器的局部灰块经RGBA读取为Alpha0，不作烘焙底色问题。该通过仅限源图与成品，源码接入和实际130px用途、maxAlpha0.35、半透明漂浮／分层运行体验分别记录，未验内容不能算通过。

用户“保持不运行”持续遵守：没有测试、预览、静态拼图、语法／运行检查、资源门、编译、推送，没有调用任何旧compositor。

