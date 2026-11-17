# L08–L10 畜牧脚位复查

检查器以场景 y=270 为固定注册线，在各阶段脚区按 Alpha≥128 检查最低像素，容许 y268–272。原稿与旧导出对照确认越线像素是原画的前蹄或前蹼轮廓。原稿、检查器、透明度阈值和支撑脚横向范围沿用现行版本。

| 阶段 | 原稿 | 前脚最低像素 y（源码 Alpha≥200，帧 0–3） | 修订后原稿脚底下边界 y | 发布帧最低像素 y（修订前 → 后） |
| --- | --- | --- | --- | --- |
| L08 成熟 | [绵羊](../../assets/livestock/raw/pixel-v5-feeding-sheep.png) | 734、735、734、734 | 735、736、735、735 | 272、273、272、272 → 269、269、269、269 |
| L09 成长 | [番鸭](../../assets/livestock/raw/pixel-v5-feeding-muscovy.png) | 480、480、480、480 | 481、481、481、481 | 273、273、273、273 → 269、269、269、269 |
| L10 成熟 | [牛](../../assets/livestock/raw/pixel-v5-feeding-cattle-r2.png) | 770、770、770、770 | 771、771、771、771 | 273、273、273、273 → 269、269、269、269 |

在 [`feeding-registration-v5.json`](../../assets/livestock/feeding-registration-v5.json) 登记原稿前脚下边界。各阶段保持原画布尺寸和缩放倍率。L08 第 1 帧源窗起点下移 1 个原画像素，其余源窗保留原绝对坐标。定向导出同步首帧脚印、统一进食位置、局部嘴框、运行登记与逐帧成品。L08／L10 同步重导各自的静态场景源图和 WebP，沿用原场景的发布棚舍、发布成熟帧与 V8 料盘合成输入。L08／L10 的原第 0 帧和第 3 帧按 V7 选择图真实输入归档，保留原路径及 SHA-256。

已静态打开原稿脚部、最新分镜（[L08](../../assets/livestock/alignment/L08-mature.png)、[L09](../../assets/livestock/alignment/L09-growing.png)、[L10](../../assets/livestock/alignment/L10-mature.png)）、130px 合成的发布帧，以及 [L08](../../public/art/scene-L08.webp)／[L10](../../public/art/scene-L10.webp) 发布场景。三个阶段四帧均在同一脚线上，红框只交叠低头口部，原稿头颈动作和场景中的独立料盘可辨。未修订阶段的 PNG 图集像素及 WebP Alpha 一致，整张 WebP 有损重编码产生少量 RGB 差异。

`npm run art:check` 通过，覆盖 88 个设施场景、全部作物、80 张畜牧帧和 120 张鱼类帧。本轮图像结论限脚位与静态图；PixiJS 真实循环、动态阴影及收获衔接未运行验收。
