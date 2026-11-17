# 普通研发点与市场涨跌图标

风格参考为现有高级研发点徽章、研究书和操作图标。三枚原稿分别用内置绘图生成。按 Alpha ≥12 裁边，最近邻等比缩入 80×80 区域，居中放进 96×96 透明画布，导出 WebP 质量 70、Alpha 质量 100。

| 用途 | 原稿 | 游戏文件 | 裁切范围 |
| --- | --- | --- | --- |
| 普通研发点 | [PNG](../../assets/source/ui-icons/research-point-basic.png) | [WebP](../../public/ui-icons/research-point-basic.webp) | (252,235)–(1002,1019) |
| 上涨 | [PNG](../../assets/source/ui-icons/market-up.png) | [WebP](../../public/ui-icons/market-up.webp) | (277,227)–(988,1000) |
| 下跌 | [PNG](../../assets/source/ui-icons/market-down.png) | [WebP](../../public/ui-icons/market-down.webp) | (342,250)–(911,1040) |

在淡米色背景上复核 16、24、32 像素成品。蓝色书徽与高级点的翡翠星徽可区分，绿箭头向上，红箭头向下，轮廓完整。静态源图、WebP 和缩放预览通过。

## 绘制提示

Use case: stylized-concept. One standalone transparent pixel-art UI icon for a cozy Japanese farm game, no text. Existing interface has parchment, gold, and forest-green sprites with warm dark one-pixel outlines and technical SNES-era clusters of midtone pixels. A restrained five-color palette, distinct stepped pixel edges (roughly a native 28–36 pixel sprite), tiny mild highlights only. Fully visible and centered on square genuinely transparent RGBA canvas, with even margin. No pedestal, drop shadow, stray pixels, additional objects, glow, backdrop, checkerboard, smooth gradients, or typography.

- Draw an ordinary research currency icon: a compact copper-edged periwinkle-blue enamel token holding one small ivory open-book pictogram. Distinct blue silhouette and book read clearly at 24px. Casual item, subtly beveled and clearly distinct from a premium dark jade eight-sided seal bearing a gold star. Avoid making a gold coin or using a star.
- Draw exactly one forest-green upward pointing arrow, a thick short arrow stem with a centered three-step arrowhead above. No bounding badge or other symbol. A near-black forest-green outline, warm green flat face, restrained fern highlights. High legibility on ivory at 15px. Straight vertical up arrow with centered crisp pixel symmetry.
- Draw exactly one warm brick-red downward pointing arrow, a thick short arrow stem with a centered three-step arrowhead below. No bounding badge or other symbol. A near-black umber outline, coral-red flat face, restrained pale red highlights. High legibility on ivory at 15px. Straight vertical down arrow with centered crisp pixel symmetry.
