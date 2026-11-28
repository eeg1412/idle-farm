# 空仓与工坊齿轮素材复核

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

## 生成与导出

| 素材 | 原稿 | 游戏资源 |
| --- | --- | --- |
| 透明空仓图标 | [1312×1199 RGBA 原稿](../../assets/source/ui-icons/warehouse-empty-v1.png) | [160×160 WebP](../../public/ui-icons/warehouse-empty-v1.webp) |
| 木机齿轮 | [1254×1254 RGBA 原稿](../../assets/workshop/raw/gear-v1.png) | [96×96 PNG](../../assets/workshop/png/gear-v1.png) · [96×96 WebP](../../public/art/workshop/gear-v1.webp) |

两张原稿均由内置绘图生成。空仓原稿按 Alpha 外框裁切，最近邻等比缩至 146×130，再放到 160×160 的透明画布中央。齿轮按轴孔中心取 `(0, 4, 1254, 1258)` 的方形区域，透明延展到源图下缘以外，最近邻缩为 92×92，再放入 96×96 透明画布中央。WebP 质量 70，保留透明通道。

## 静态复核

- 空仓原稿和 WebP 已直接查看。在 120×120 显示尺寸下，可辨认两组空货架、开门和地板，建筑外保留透明。成品无可见轮廓残边。
- 齿轮原稿、PNG、WebP 与现有木机参考已直接查看。齿轮外轮廓与辐条完整，中央轴孔对准 `(0.5, 0.5)` 锚点。导出 PNG 和 WebP 的透明度一致。14 像素时轮齿轮廓可辨，16–18 像素时轴孔更清楚。
- 工坊画布只在可见区域加载齿轮纹理，双烟源沿用已有烟囱及烟团资源和展示时钟。实际叠置、旋转、烟雾表现和空仓按钮布局待画布验收。

## 实际绘图提示

### 空仓图标

Use case: illustration-story. Asset type: single isolated transparent empty-warehouse icon for a Japanese-inspired pixel-art farm game, drawn to stay instantly legible at 112×112 CSS pixels. Draw one self-contained small timber warehouse icon with a broad open doorway, two clearly empty chunky wooden shelf bays visible inside and a little bare plank floor. A compact simple silhouette from a direct front view with slight top-down readability, warm honey-brown wood, cream door trim, subtle moss-green accents, warm dark interior and light shelving. The building itself may have a simple tile roof and short base, within one compact square composition. Accurate handcrafted classic SNES-style pixel art, bold stepped chunky outlines, deliberate pixel clusters. Large centered subject with clear fully transparent margin on all four sides, and truly transparent outside the object's silhouette. No stock, boxes, vegetables, sacks, tools, animals, people, lettering, signage, interface, shadow outside the object, floor or terrain outside the icon, landscape, scene background, decorative frame, checkerboard, or watermark.

### 工坊齿轮

Use case: illustration-story. Asset type: single isolated pixel-art cog sprite, workshop game overlay at approximately 20 logical pixels and animated with continuous rotation. Draw exactly one large round honey-brass and bronze wooden-machine cog with a clearly readable crisp chunky outline, twelve evenly spaced squared gear teeth, central small dark round axle bore, and four equally spaced broad bronze spokes. Face directly overhead at 90 degrees, pure orthographic, with all tooth tips centered on the same circle and true rotation center in the very exact center of its outer silhouette. A modest dark amber rim and soft gold upper lip matching a warm timber-and-brass Japanese farm workshop. Strong contrast with orange-brown timber, tightly controlled retro pixel clusters and tightly square chunky teeth. Keep all teeth intact with a clean transparent margin; center the circular object in a square. Real transparent background and transparent gaps between spokes where suitable. No ground or shadows outside the object, no pedestal, extra objects, words, watermark, perspective, isometric tilt, smooth 3D, floor, checkerboard or opaque background.
