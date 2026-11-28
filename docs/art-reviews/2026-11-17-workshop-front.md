# 工坊正视动画素材

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

以正视设计图为参考生成七张透明部件和一张室内背景。背景铺满动画区，墙面和木地板衬托正面机身及两侧输送线。

| 部件 | [原稿目录](../../assets/source/art/workshop/front/) | [运行目录](../../public/art/workshop/front/) | WebP 尺寸 |
| --- | --- | --- | ---: |
| 工坊室内背景 | `background.png` | `background.webp` | 400 × 144 |
| 加工机身 | `processing.png` | `processing.webp` | 136 × 108 |
| 精制机身 | `refining.png` | `refining.webp` | 136 × 108 |
| 裁断式固定木架 | `belt-base.png` | `belt-base.webp` | 128 × 32 |
| 可重复木板履带 | `tread.png` | `tread.webp` | 32 × 12 |
| 正面轮齿 | `gear.png` | `gear.webp` | 64 × 64 |
| 铜制烟囱 | `chimney.png` | `chimney.webp` | 40 × 52 |
| 米白像素烟团 | `smoke.png` | `smoke.webp` | 64 × 64 |

透明部件以 Alpha ≥24 确定裁切范围，最近邻缩放，WebP 质量 70、Alpha 质量 100。机身和效果件等比缩放，木架与履带裁为水平条带。背景居中裁切，最近邻缩放，WebP 质量 80。两种机身的齿轮安装点同为场景坐标 (200, 98)。
