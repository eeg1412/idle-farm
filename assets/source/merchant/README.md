# 行脚商图像源稿

两张 2172 × 724 的 PNG 均由内置图像生成工具生成。参考图仅用于统一现有像素画风。

| 源稿 | 风格参考 | 导出 |
| --- | --- | --- |
| `banner.png` | `public/art/warehouse.webp` | `public/art/merchant.webp`（960 × 320，等比缩放，WebP 质量 86） |
| `icons.png` | `assets/source/ui-icons/tech-market-manipulation.png` | 依次导出 `public/ui-icons/merchant.webp`、`public/ui-icons/tech-merchant-restock.webp`、`public/ui-icons/tech-merchant-bargaining.webp` |
| `waiting-banner.png`（1942 × 809） | `public/art/merchant.webp` | `public/art/merchant-waiting.webp`（960 × 400，居中等比裁切，最近邻，WebP 质量 86） |

图标按横向三等分切开，以 alpha ≥ 32 确定前景边界，向外保留 2 像素并清理 alpha < 12 的像素。用最近邻将主体缩至 82 × 82 以内，居中放进透明的 96 × 96 画布。WebP 质量为 70，alpha 质量为 100。

## 横幅提示词

Generate an original full-bleed, landscape game environment banner in a digitally hand-pixelled Japanese countryside farm RPG style. Use the attached warehouse banner ONLY as a strong style/lighting/era reference, not as content. Picture a traveling merchant pausing on a quiet farm road at a portable, open wooden stall with a faded red linen awning, full wicker produce baskets, jars, and a small wood wheel cart. One friendly solitary traveler in a straw hat and teal vest stands behind the produce, their face small within the scale of this landscape. Rich autumn greens, late-summer golden rice in the foreground, a winding dirt lane, trees and lower blue-green mountains in the distance. High-detail authentic fine 16-bit pixel clusters, crisp square pixels, vibrant earthy color, clear bright daylight, no smoothed vector edges. Compose as an ultra-wide 3:1 panorama, with both the merchant and entire awning grouped in the central horizontal area at y=40–60% and generous extra scenic breathing room to all sides. If the output is taller, the middle horizontal third must still show the person and entire awning after cropping to 3:1. Building must read as a small pop-up stall, not a fixed building. No type, numbers, frames, lettering, or watermark.

## 图标提示词

Create one horizontal sprite sheet of exactly THREE separately isolated pixel-art game inventory icons with true transparent alpha. Attached compass image is a style reference for the crisp chunky 32×32-era hand-pixelled shading, stepped silhouette, deep near-brown outlines, golden highlights and turquoise accents. Do not copy compass content. Three same-scale isolated icons left to right centered at 1/6, 1/2, 5/6 across a wide 3:1 canvas: (1) a honey-brown traveling backpack with a rolled teal bedroll, buckles and one outside pocket, a readable chunky bag silhouette, (2) a compact wooden shipping handcart with two dark wheels, tan crates and a small turquoise waypoint pennant attached to the cart, (3) a symmetrical brass merchant balance scale with bowls and clearly visible gold coins on one tray and a small teal gem on the other. Each icon stays completely inside its third and has copious empty transparent gutter all around, with at least 10% spare horizontal inside each individual cell. All shapes are wholly distinct and separated, square-ish and readable at 24px, in clean pixel clusters. No semi-opaque backdrop, ground shadows, bubbles, lettering, labels, decorative frames, border, dividing lines, extraneous sprites or badge geometry. Opaque dark brown pixel outline and empty alpha background.

## 未开摊横幅提示词

Create one new bitmap background banner for a cozy farming game, a time-of-day and occupancy variant of the attached existing game merchant banner. Precise scene edit: the same viewpoint and same recognizable rural clearing, same orange tree framing from the upper left, layered lush green valley and blue mountains, stream at left, dirt path coming from right, rice stalks in foreground, and the same simple stall structure and red canvas roof centered. The traveling merchant has NOT ARRIVED: the stall is closed with the front red canvas flap tied down, empty ground in front, no seller or shoppers, no cart, no laid-out produce or display crates. Preserve cohesive Japanese 32-bit pixel-art scenery, deliberate crisp pixel clusters and stair-stepped edges, rich stylized rural saturation, warm late morning sunlight, clean silhouettes. Convey a quiet vacant market stall without making the place look abandoned or dilapidated. Crop the composition to an ultra-wide horizontal game banner approximately 2.4:1 if allowed (if platform output is taller, keep the stall roof and booth interior within the central 55% of image height for center cropping), booth at center and clearly identifiable when displayed at 320 pixels wide. No UI, no frame, no signs, no glyphs or text of any kind, no watermark.
