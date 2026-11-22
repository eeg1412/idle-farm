# 时空胶囊图标静态审阅

2026-11-22，TC-REVIEW，由PM独立于素材生成者审阅。[任务卡](../tasks/2026-11-22-time-capsule-icon.md)。本次仅图标素材，不代表仓库运行已接入或用户认可。

已直接打开现有 `P01.webp`、`PM01.webp` 画风参考、1254×1254原稿、最终96×96 WebP及96px米色底证据。原稿与成品静态通过：封闭铜色端帽、青蓝核心及金色沙漏可辨，整体为一个完整容器，阶梯轮廓和分组明暗衔接已有仓库图标；没有场景、文字、外部光圈或烘焙地面影。96px下时间符号清晰、端帽和玻璃分离，没有有效轮廓裁切或正常底色可见杂边。

首次按Alpha>0裁切因原稿极淡外围像素导致本体偏小，已修正转换边界：按Alpha≥128找主体框并保留2原图像素边距，仅裁外部范围；框内Alpha原样、nearest等比缩放到64×55，置于96×96透明画布。没有程序修画、重绘滤镜或阈值擦除像素。WebP质量70、Alpha质量100。

| 文件 | SHA256 |
| --- | --- |
| `assets/source/items/time-capsule/raw-v1.png` | `53b5e3712e21254901f38b73236898936a83ffd27dfa8d014821cc2265421247` |
| `assets/source/items/time-capsule/time-capsule-96.png` | `db7774a02439eba152653f2aab85180dff4f3b6ca369cf167a1bf7f759a60590` |
| `public/wiki/icons/time-capsule.webp` | `94f4c23607b1744e71b5701f4a41f4ff0c509bea9daef60183623a6e62236fb6` |
| `assets/source/items/time-capsule/reviews/96-beige.png` | `bda995612b2ebd008dcadaa9849f9fbac9dde6c96e838716bd482bed1fab8df6` |

最后一项证据图仅本地保存，不提交，由 `.gitignore` 按该目录忽略。导出及证据重生成入口 `scripts/export-time-capsule-icon.mjs`，完整内置image_gen实际提示词及工具路径见 `assets/source/items/time-capsule/prompt.txt`、`source-manifest.json`。这是一张内置新绘原稿，不是程序绘画。

正式物品类别／编号、数量、获取和用途待定义；未修改目录、价格、仓库代码、存档或其他物品。未运行测试、游戏预览、检查或编译，未推送。资料仅确认源／成品与96px静态辨识，不确认真实游戏显示或用户认可。
