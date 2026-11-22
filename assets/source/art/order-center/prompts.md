# 订单中心原画

以下三张 PNG 由内置 image_gen 生成，均使用透明背景。地图风格参考为 public/art/estate/tasks.webp 和 mine.webp，图标风格参考为 public/ui-icons/menu-merchant.webp 和 tech-merchant-bargaining.webp。参考图经查看后将特征写入提示词。

## building.png

生成文件 exec-de90cd62-8747-4597-98e6-bcccdd2239b7.png。

Use case: stylized-concept. Create a new small standalone map sprite for a warm painted pixel-art farm game. Cozy rural farm order dispatch office, modest single story timber-and-pale-plaster cottage, moss-teal pitched tiled roof, open wide service window facing the viewer at slight 3/4 (front and right wall visible), parcels and cream dispatch envelopes in two cubbies, a counter. Over window put a blank timber lintel, no painted signs, no text anywhere. One open counter ledge on front, clear of hanging objects. Short stone foundations with close sunlit blades of grass only. Match a warmly shaded illustrated pixel farm village: strong warm umber edges, compact architecture, cheerful afternoon upper-left light, thick deliberate pixel clusters and textured golden timber. Material textures can be seen, avoid bland flat shapes. Broad silhouette wider than tall, intended to read at 85px. Transparent background; all roof, ground and eaves fully in view with generous transparent margin on all sides. No people, camera vanishing lines shallow, no horizon, no decorative frame, no sign or text or arrows, no motion lines. No extended path or surrounding meadow.

## pendant.png

生成文件 exec-298f76c5-251e-4324-85b6-5592bafb37ec.png。

Use case: stylized-concept. Draw one compact rustic postal signal pendant for a farm map dispatch building. Isolated pixel art transparent sprite, seen straight on. Small dark brass screw eye ring at TOP CENTER then a short taut short chain, then a chunky rectangular cream enamel envelope-shaped plaque with very readable warm red wax seal, bold brown diagonal flap lines, and ochre beveled wood edges. A tiny ring and short chain make the pivot above the sign. Empty transparent surrounding. Wider plaque than high. Hero silhouette deep brown pixel edge, pixel clusters/emphatic flat highlights in cozy 16-bit style. No floor, text, shadows, glow, gradient or scenery. No supporting wall or bracket, simply the standalone hanging pendant including its suspension ring.

## icon-grid.png

生成文件 exec-ebb4bce2-d058-4b3b-bd0b-93433d3c67f3.png。按行优先依次为 menu-orders、tech-order-expansion、tech-order-negotiation、tech-order-premium。

Use case: stylized-concept. Single transparent 2x2 source art sprite grid; 4 separate compact inventory icons for a cozy warm-color pixel farm game. Square sheet, each cell one self-contained motif centred exactly on quadrant center, each icon at most 60% quadrant width/height; large TRUE TRANSPARENT gutters (not checkerboard), no grid lines. Big legible SNES-style hand-pixelled shapes, native 32x32 with jagged dark auburn outlines, bold blocks of cel shaded color, highlights from upper left. TOP LEFT: standing purple-brown wooden pigeonhole mail sorter, 3 visible slots and bright cream sealed letters, front three-quarter, compact recognizable building menu icon. TOP RIGHT: fan of three individually overlapping parchment order forms with three offset teal index tabs, a single dark line on each and small red wax seal on top sheet, solid stacked compact silhouette; represents more simultaneous orders. BOTTOM LEFT: two human hands with mustard sleeve and teal sleeve shaking each other around a cream order slip, simple unmistakable handshake, represents negotiation. BOTTOM RIGHT: large bright gold medal coin pinned to lower right corner of a single wine-red order docket with cream top edge, scalloped purple ribbon; represents order premium. Colors and silhouettes different between all four. No text, font, labels, decorative sparkles, vignette, ground, cast shadows, background or separators. Keep all 4 graphics isolated and complete inside their quadrants.

## 导出

从仓库根目录运行 node assets/source/art/order-center/export.mjs。建筑源图按 Alpha ≥12 包围框等比最近邻缩放，底图为 536×320，动件为 92×84；螺钉轴点为动件 [46,4]，固定在建筑 [199,79] 的立柱。四个小图在各自原格内按相同阈值裁切，最长边为 80，居中放置于 96×96 画布。地图 WebP 质量为 90，图标为 70，Alpha 质量均为 100。
