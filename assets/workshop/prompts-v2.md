# 工坊滚动带分层补画 v2

本轮追加要求：固定护栏与滚动带面必须分开。内置 `image_gen` 编辑输入 `assets/workshop/raw/conveyor-components-v1.png`，原图保留不覆盖；未使用脚本擦绘。移动带面另由内置 `image_gen` 独立生成。

## Rail-only overlay
```text
Use case: precise-object-edit
Asset type: fixed RAIL-ONLY transparent overlays, six modular conveyor components for a pixel-art farming game.
Input image 1 is the exact existing six-component conveyor sprite sheet and style/shape reference. Edit this image into a genuine transparent RAIL-ONLY SPRITE SHEET. Keep the 3 columns x 2 rows order, exact camera STRAIGHT DOWN 90 degree orthographic, the sage-green metal rails, bolt pixels, outside silhouettes and warm pixel-art style.
CHANGE ONLY THE INTERIOR: REMOVE EVERY black/gray rubber tread, every slat and every dark travel-surface fill from ALL SIX components. All of the space where materials would travel must become completely transparent alpha=0, including the central intersection of the T and PLUS cross. Preserve ONLY the solid green-gray OUTSIDE guardrails and their copper/steel bolts. The two horizontal rail strips in cell1 must be disconnected with totally transparent space between. Cell2 is two vertical rail strips with totally transparent space between. L corner guardrails remain only along outside boundaries of the L path. T guardrails remain only along outside boundaries of its connected N/S/W path, leaving the whole path clear. Plus cross guardrails remain only four outside corner shapes, with its entire four-way path and center fully transparent. Port collar has two independent horizontal rail strips with an entirely transparent open slot between them.
The result will be OVERLAID on an independently scrolling rubber texture at runtime, so do NOT leave any fixed dark treads or dark plate in the center. Do NOT replace removed treads with a checkerboard, a dark background, or painted transparency. Actual transparent holes. Wide genuinely transparent gutters. SIX independent complete rail components only. Do not add parts or text. No ground, no shadow or glow. Do not move or tilt the camera. No perspective or visible side walls. Crisp chunky pixel art.
```

## Independent belt surface
```text
Use case: stylized-concept
Asset type: seamless horizontally repeating RUBBER CONVEYOR BELT SURFACE TEXTURE, an independent moving layer for a pixel-art farming workshop game.
Primary request: draw ONLY a flat straight-down dark charcoal/black rubber conveyor tread texture filling the ENTIRE square image edge to edge. The texture is made of a perfectly regular repeating pattern of identical vertical transverse tread ribs, evenly spaced in the horizontal X direction, like clean short rubber planks passing from left to right. Exactly 16 equal repeated periods across the square. Each period: a narrow nearly-black vertical seam, a wider dark charcoal flat band, and a small cool medium-dark-gray highlight stripe on the same side. Broad simple pixel-art blocks, a restrained 3-tone palette. The ribs run vertically; travel direction is horizontal. The pattern must be exactly seamless LEFT TO RIGHT, with the same repetitive material at both canvas edges, no lighting change across the image. Detail is simple and should read when a single period is only 3 pixels wide on screen.
Composition/framing: camera 90 degrees straight down, orthographic, no perspective; perfectly parallel vertical ribs, all equal thickness, exact repeating pitch. Fully opaque texture with no transparent holes. No border, no outer space. Every pixel is the rubber material texture.
Constraints: RUBBER TREAD ONLY. Absolutely NO rails, NO bolts, NO metal side strips, NO end caps, NO frames, NO machine, NO objects or products, NO floor or background, NO arrows, NO labels or text, NO highlights that curve or turn, NO worn patches, NO random noise, NO gradient, NO cast shadow. This texture will scroll behind separate fixed rail-overlay sprites; do not draw fixed frame parts into it.
```

