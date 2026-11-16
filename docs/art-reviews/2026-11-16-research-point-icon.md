# 高级研发点图标

| 文件 | 规格 |
| --- | --- |
| [原稿](../../assets/source/ui-icons/research-point.png) | 内置图像生成第二稿，1254×1254 RGBA PNG |
| [游戏图标](../../public/ui-icons/research-point.webp) | `research-point`，96×96 RGBA WebP，质量 70，Alpha 质量 100 |

参考游戏现用的[研究书](../../public/ui-icons/nav-research.webp)和[麦穗金币](../../public/ui-icons/coin.webp)的明暗与轮廓。首稿的菱形与大面积实色明暗层次较少。第二稿用青绿八角边和浅金四角星，在象牙色界面上与圆形麦穗金币有清楚的色形区别。

导出时清除 Alpha 低于 12 的像素，裁切 `(177, 223, 1077, 1082)`，以最近邻等比缩至 80×76，放在 96×96 透明画布的 `(8, 10)`。WebP 使用 Pillow，`method=6`。已打开原稿、WebP 和浅色底上的 25、26、34 像素静态合成，星形清楚、轮廓完整。实际画布显示待验收。

品质升级报价包含高级研发点时，费用表显示此图标。经营改良费用和研究页两个页签的余额共用此图标。标准费用表、窄屏替代行和页顶余额继续使用现有的按需图标加载路径。

## 第二稿绘制提示

```text
Use case: stylized-concept.
Asset: a single new Advanced Research Point resource icon for a cozy Japanese farm game. Two input images are existing farm game UI sprites enlarged with nearest-neighbor. Image 1, the research book, is a style reference for the deep warm outlines and the many carefully grouped midtone pixels on the pages. Image 2, the wheat coin, is a style reference for the softly beveled edge, contrast, and intentional clusters of light pixels. Design a new item only; do not reproduce their subjects.
Draw an emerald-jade research seal, a wonderfully small piece of carved dark green enamel in a warm almost black forest-green edge. Face forward with just a 1–2 pixel deeper bottom-right side, wide beveled shoulders and tightly clipped corners, like a chunky rotated square with short chamfered tips. Let the shape feel hand crafted and almost as broad as tall. Stamp one recognizable butter-gold four-point star in its center, with short stepped tips and a broad, high-contrast center. The gold star covers about half of the width and half of the height. Shade its inset edge with two warm antique-gold tones. Use a few restrained grouped pixels of muted pale jade near the top left bevel, warm midgreen on the face, and cool deep green on the lower right bevel. The bevel is sculpted with several small areas of distinct midtone clusters and short contour highlights that follow the shape, to match the detailed pixelcraft of the source icons. Let the green dominate. The outer outline uses a consistent dark warm-green line one to two pixels thick. Hand-pixelled 16-bit SNES item sprite, native roughly 44×44 grid, magnified with exact square edges. Small, deliberate highlights and selective dithering as in the reference art. Avoid large chunky blocks, smooth gradients, modern vector look, glassy glow, or flat geometric logo rendering.
One fully visible icon, centered, occupying most of a square canvas, against a genuinely transparent alpha background. Keep the whole silhouette clear. Must work on warm ivory UI at 22–34 logical pixels. No letters, typography, second symbols, adornments, separate objects, shadows beneath the icon, glowing/antialias haze around it, floating sparkles, gradient background, or transparency checkerboard.
```
