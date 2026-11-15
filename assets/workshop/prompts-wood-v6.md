# 木质工坊原画 wood-v6

三张原画均由内置 `image_gen` 独立调用真正绘制，2026-11-16保存；不是旧金属图滤色、程序绘图或CLI产物。机器以旧v5为几何／相机参考、棚舍为木材像素风参考。带面无参考图，新绘可循环木板纹理。

## Processing machine
实际输入：`assets/workshop/raw/processing-machine-portless-v5.png`（只几何相机）、`public/art/livestock/barn.webp`（只木色像素风）。透明背景：true。
```text
Use case: stylized-concept
Asset type: ONE genuinely new transparent PIXEL-ART wooden processing machine sprite for a farming workshop game.
Input images: Image1 is the previous metal machine for ONLY the exact tall narrow overall silhouette and 90-degree top-down camera; its metal construction MUST be fully replaced by a new hand-built WOODEN machine design, not recolored metal. Image2 is the existing farming-game barn for ONLY its warm timber palette and real pixel-cluster art style, NEVER its perspective camera.
Primary request: draw a long slim vertical closed WOODEN PROCESSING / MILLING APPARATUS from exactly 90 degrees straight above, orthographic PLAN VIEW. Approximate body width:height ratio 1:4.4. Complete tall rectangular cabinet with straight uninterrupted left and right edges. The entire structure is visibly crafted from honey oak and dark walnut beams, timber boards, round wooden pegs and wooden joinery. On the TOP are THREE distinct round WOODEN MILLING WHEELS stacked vertically, built from broad warm wood segments with visible wood grain and simple chunky wooden hubs. Their shapes are true circles, never perspective ellipses. Wooden braces and short internal wooden linkages connect the mechanisms. All mechanisms and joinery stay INSIDE the single rectangular cabinet outline. The wood is the main construction material everywhere, clearly natural timber rather than metal painted brown.
Style: rich handmade farming-game PIXEL ART; actual visible square pixel clusters, crisp stepped contours and discrete warm wood shading, roughly 3-4 value groups. Fine enough to identify timber grain and mechanical parts, broad enough to remain readable when the machine body is about 30 pixels wide. Warm amber/honey highlights, medium brown boards, dark walnut structure; no industrial sage-gray metal or copper hardware.
Camera/composition: exact 90-degree straight-down orthographic camera, only upward-facing surfaces, NO front or side walls, no isometric, no 3/4 view. Long axis vertical. One complete narrow machine centered with transparent breathing room. Preserve the tall slender geometry of Image1 without reusing its metal mechanisms. Full silhouette visible, no cropping.
Constraints: plain complete straight closed side edges. NO protruding input/output mouth, NO slots or openings along the sides, NO holes or connector frames, NO conveyor surface, NO products/materials/food, NO floor, NO background, NO shadow, NO person, NO text/labels/arrows/watermark. NO metallic plates, gray millstones, copper pipes or industrial control panels. This must be newly drawn wood construction, not a color filter.
```

## Refining machine
实际输入：`assets/workshop/raw/refining-machine-portless-v5.png`（只几何相机）、`public/art/livestock/barn.webp`（只木色像素风）。透明背景：true。
```text
Use case: stylized-concept
Asset type: ONE genuinely new transparent PIXEL-ART wooden refining machine sprite for a farming workshop game.
Input images: Image1 is the previous metal refining machine for ONLY its tall narrow closed silhouette and 90-degree top-down camera; completely replace its industrial construction with NEW WOODEN craftsmanship, do not tint the metal parts brown. Image2 is the existing barn for ONLY warm timber palette and pixel-cluster style, not its perspective.
Primary request: a long slim vertical closed WOODEN REFINING / PRESS APPARATUS from exactly 90 degrees straight above, orthographic PLAN VIEW. Approximate overall body width:height 1:4.4. One continuous tall rectangular cabinet, complete straight uninterrupted left and right edges. It is made of warm light oak plank panels in a dark walnut timber frame with wooden pegs, visible grain, mortise joints and wooden braces. On its TOP, THREE large RECTANGULAR WOODEN PRESS ASSEMBLIES are stacked vertically. Each consists of a darker rectangular timber press frame surrounding a clearly lighter group of parallel wooden press slats and broad wooden crossbars. Chunky square wooden screw heads / block-shaped hubs and short internal wooden linkages complete the wood mechanism. These three clear RECTANGULAR press groups distinguish the refining machine from a milling machine with round wooden wheels. All components stay INSIDE the closed rectangular silhouette.
Style: detailed handcrafted farming-game PIXEL ART, real square pixel clusters and stepped crisp outlines, discrete 3-4-value wood shading. Warm natural honey/oak/brown with darker walnut frame and pale golden pressing slats. The entire body and main mechanism must plainly be WOOD, not gray metal, copper heat exchangers or brown-painted metal. Readable at approximately 30px body width while keeping timber grain and joinery detail.
Camera/composition: strict 90-degree straight-down orthographic overhead, only upward-facing surfaces, no side/front wall, no isometric or tilted perspective. Long axis vertical, full single narrow sprite centered with transparent breathing room, no cropping. Keep the original long slender scale/proportions, redraw the internal mechanism as new wood construction.
Constraints: complete plain straight closed side edges with NO protruding input or output port, NO side holes, slots, sockets or connector frames. No conveyors, no floor or background, no baked shadow, no materials/products/food, no people, no labels/text/arrows/watermark. No round milling discs. No industrial metal control plates, copper pipes, steel ribs or metal machinery parts.
```

## Wooden tread surface
实际输入：无。透明背景：false。
```text
Use case: stylized-concept
Asset type: independent opaque seamless WOODEN CONVEYOR TREAD SURFACE TEXTURE for a farming workshop game; no frame or device.
Primary request: paint an edge-to-edge square texture made ONLY of closely packed vertical WOODEN PLANKS. The planks run vertically, separated by thin straight dark brown vertical joints, and the surface will scroll horizontally to the RIGHT at runtime. Exactly TWELVE evenly spaced equal-width repeating plank periods across the whole square. Each period has one honey-oak wooden plank with broad subtle vertical grain pixel streaks, compact warm pixel highlights on one side and a thin dark wood seam. Calm regular repeating rhythm. Natural timber clearly visible, matching a warm rural farming game. The pattern should seamlessly tile left-to-right and top-to-bottom. All periods have identical widths, no lighting gradient or perspective.
Style: handcrafted PIXEL ART with deliberate coarse square pixel clusters, discrete amber/honey brown/light oak shades and dark brown seams, crisp straight plank joints. Avoid photoreal fine wood photography or vector flat stripes. Wood grain must be simple and readable when one plank period is displayed at 32 logical pixels.
Camera/composition: perfectly flat orthographic 90-degree straight-down texture, fills ENTIRE image edge to edge, fully opaque, no transparent space. All planks are parallel to image vertical edges. Selectable equal repeating periods for a real source crop; no perimeter objects.
Constraints: WOOD PLANK TREAD ONLY. No side rails, borders, edge frame, end cap, machine, mouth/coupler, bolts or nails, arrows, stripes painted as direction marks, text/labels, products/materials, floor scene, shadow, UI, watermark. No metal, rubber or black-gray industrial belt. Do not draw a whole conveyor or a fixed endpoint. Just the repeating wooden moving surface.
```

