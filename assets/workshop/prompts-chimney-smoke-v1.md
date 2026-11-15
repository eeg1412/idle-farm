# 工坊烟囱与烟团原画 chimney-smoke-v1

一次内置 `image_gen` 真正生成透明2×2网格，2026-11-16保存。不是程序绘图或CLI产物。

实际参考输入：`public/art/workshop/processing-machine-wood-v6.webp`、`public/art/workshop/refining-machine-wood-v6.webp`，只用于现有木质像素风及90°俯视相机，不是编辑整机。透明背景：true。

原稿：`assets/workshop/raw/chimney-smoke-v1.png`。
默认生成文件：`C:/Users/eeg14/.codex/generated_images/01a1df5a-7dd5-78a0-a8fe-56db3bbc33ba/exec-14e93e2e-c496-41f7-a84d-b306603359d4.png`。

## Actual prompt
```text
Use case: stylized-concept
Asset type: a TRANSPARENT 2-by-2 PIXEL-ART small sprite sheet for independent workshop chimney and smoke layers in a farming game.
Input images: the two existing WOODEN workshop machine images are STYLE / PALETTE and 90-degree overhead CAMERA references only. Do NOT redraw either machine. Draw only the four small isolated assets listed below.
Primary request: square sprite sheet, exactly TWO COLUMNS and TWO ROWS, one independently isolated complete sprite per equally sized cell, each centered, broad clear transparent gutters, no drawn grid and no labels.
CELL 1 upper-left: ONE short rustic CHIMNEY TOP RIM seen from EXACTLY 90 DEGREES STRAIGHT ABOVE, orthographic PLAN VIEW. A compact circular / slightly square rounded ring made of warm terracotta bricks and a few warm tan stone blocks. The upward-facing ring is thick and readable, with a dark charcoal empty CENTRAL OPENING exactly at the geometric center. Entire chimney outline is compact and symmetric around that opening, no pipe extending sideways. ONLY its top ring and opening are visible, no perspective outer side wall, no front wall, no long tube, no attached machine and no smoke baked onto it. Crisp chunky stepped pixel silhouette, warm earthy material shading, harmonious with the oak/walnut farm-machine references.
CELL 2 upper-right: one independent compact SOFT GRAY-WHITE SMOKE PUFF sprite, rounded clustered billows with a few curling wisps and genuinely transparent gaps and thin outer edges. No chimney. Pale warm gray shaded core, soft white edge highlights; delicate enough to render at max global opacity 0.35.
CELL 3 lower-left: one DIFFERENT independent GRAY-WHITE SMOKE PUFF, slightly broader / asymmetrically curled, multiple connected billow lobes, translucent wispy edges and some transparent interior gaps. No chimney or solid object.
CELL 4 lower-right: one THIRD independent GRAY-WHITE SMOKE PUFF, a taller curling airy cluster with a different silhouette, soft translucent light gray / white volume and transparent wisps. No chimney or solid object.
Style: farming-game pixel sprites, real compact square pixel clusters and stepped contours rather than realistic photos or vector icons. Smoke may use graduated alpha at the edges to remain airy, but keep a pixel-cluster smoke silhouette; do not paint smooth gray boxes. All smoke remains neutral gray-white, not orange, flame, steam text or comic bubbles. Consistent small-asset scale, each occupies at most 70% of its own cell so sprites are cleanly isolated for 96x96 export.
Transparency: genuinely transparent background and gutters for the whole sheet; smoke has a real alpha silhouette including semi-transparent wisps. The central chimney aperture is dark charcoal. Do not paint checkerboard, dark backdrop, floor, shadow, glow or opaque rectangular mats behind sprites.
Constraints: exactly one chimney rim plus three separated smoke-only sprites. No full machine, no production line, no conveyor, no products/materials, no flames, no people, no labels/text/arrows/watermark. No 3/4 or isometric chimney view. Do not merge smoke with chimney, and do not connect the four cells.
```

