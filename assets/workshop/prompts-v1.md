# 工坊正俯视分层素材 v1

内置 `image_gen` 生成，原图于 2026-11-15 复制进项目；原素材未作程序绘图或相机透视变形。

## Background
```text
Use case: stylized-concept
Asset type: layered pixel-art farm workshop game background, only the bottom background layer, to export as 320x320 and display at 130x130.
Primary request: draw a clean cozy rural workshop FLOOR seen by a camera looking STRAIGHT DOWN at exactly 90 degrees, orthographic top-down plan view. Square canvas. Warm honey-brown wooden plank floor with a few muted gray-green square metal floor access plates and restrained slightly worn details. Chunky deliberate pixel clusters, stepped pixel edges, discrete shading, rich handcrafted game art like a warm country farming game. The entire central 90% is open unobstructed walkable floor for many independent conveyor belts and one machine to be overlaid later. Floor texture is calm and low contrast so machinery remains readable at tiny size. At the extreme top and bottom border only, a very thin wooden threshold and subtle green-gray trim can suggest the workshop boundary; do not draw side walls.
Composition/framing: strict straight-down orthographic camera, no horizon, no perspective, no vanishing point; wood planks parallel to canvas axes, no isometric diamonds. Every visible surface faces upward. Full square image, no outer frame.
Lighting/mood: warm rural daylight expressed only as compact pixel shading, no dramatic cast shadow.
Constraints: background only. NO machines, NO conveyors, NO materials or products, NO people, NO animals, NO labels, NO text, NO UI, NO watermark, NO schematic or vector linework. Do not draw a workshop facade. Do not draw a front-view interior. Do not use 3/4 or 45-degree view. Keep the central 90% completely clear.
```

## Processing machine
```text
Use case: stylized-concept
Asset type: one independent TRANSPARENT sprite for a layered rural factory game, expected display about 45 pixels wide inside a 130-pixel scene.
Primary request: draw ONE compact grain/food processing machine in pixel art, camera EXACTLY 90 DEGREES STRAIGHT DOWN, orthographic TOP VIEW. It is a low rectangular muted sage-green and dark gray metal cabinet with a clearly visible large round gray milling chamber on its TOP, a few chunky copper bolts and a compact rectangular control plate seen only from above. Horizontal left-to-right footprint. A dark open intake throat lies on the LEFT edge at vertical center, an open output throat on the RIGHT edge at exactly the same vertical center. The two throats are open empty black/charcoal rectangular slots surrounded by pale gray-green U-shaped metal rims, suitable for a conveyor belt underlay to terminate underneath the cabinet. The central machine lid covers the connecting conveyor. Full machine silhouette must fit entirely in frame with transparent space around it. Left and right ports are the same width, with straight unobstructed horizontal passage.
Style/medium: carefully drawn farming game PIXEL ART, visible chunky square pixel clusters and stepped crisp silhouettes, discrete 3-step material shading, sage green machinery with warm copper/brown accents, no gradients, readable at tiny size.
Composition/framing: strict 2D overhead PLAN VIEW, only upward-facing shapes visible. The machine top is a rectangle, its round chamber is a CIRCLE not an ellipse. NO visible front wall or side wall; NO perspective lines. One sprite centered on transparent background, no ground.
Constraints: empty intake and output. No grain, no food, no crates, no labels, no letters, no numerals, no workers, no products, no belts outside the two short machine port rims, no ground shadow, no background. Never 45-degree, isometric, three-quarter, frontal, or tilted view. No vector diagram, no schematic, no line art. Actual pixel-art asset, not a mockup.
```

## Refining machine
```text
Use case: stylized-concept
Asset type: one independent TRANSPARENT sprite for a layered rural factory game, expected display about 55 pixels wide inside a 130-pixel scene.
Primary request: draw ONE compact REFINING and finishing machine in pixel art. Camera EXACTLY 90 DEGREES STRAIGHT DOWN, orthographic TOP VIEW, completely flat overhead plan. Its low rectangular muted sage-green and dark gray metal cabinet has a large copper-orange RECTANGULAR PRESS BLOCK with dark segmented cooling ribs on the TOP, plus TWO SMALL ROUND bronze valve wheels at the upper and lower portion of the top. The rectangular copper press block makes this machine recognizably different from a milling machine with one large round chamber. A few large pixel bolts and one compact dark control plate. Horizontal left-to-right footprint, approximately 2.4 times as wide as tall including the two short ports. A dark empty intake throat lies on the LEFT edge at vertical center, an empty output throat on the RIGHT edge at exactly the same vertical center. Both throat openings are the same width, black/charcoal rectangles in pale gray-green U-shaped metal rims. They allow an independent conveyor underlay to terminate UNDER the closed machine cabinet. The full machine silhouette fits entirely in the frame with transparent breathing room. Ports aligned in one straight horizontal line.
Style/medium: handcrafted farming game PIXEL ART, visible chunky square pixel clusters, crisp stepped silhouettes, 3-step discrete metal shading, muted sage green machinery, warm copper highlights, very readable small shapes. Warm rural factory style.
Composition/framing: strict overhead PLAN VIEW. All shapes are upward-facing. Top cabinet perimeter is a rectangle aligned to canvas. The round valves are CIRCLES, never perspective ellipses. NO visible front wall or side wall, NO tilted perspective. One sprite centered on genuinely transparent background, no floor.
Constraints: no materials or products in ports. No text, no letters, no numbers, no labels, no workers, no food, no boxes, no belts except short empty machine throat rims, no drop shadow, no background. Absolutely no 45-degree/isometric/three-quarter/frontal/tilted view. No vector diagram or schematic. Actual pixel-art sprite.
```

## Conveyor components
```text
Use case: stylized-concept
Asset type: six modular TRANSPARENT pixel-art conveyor COMPONENTS for a top-down farm workshop game, not a complete scene or complete production line.
Primary request: draw a six-cell sprite sheet, THREE COLUMNS by TWO ROWS. Every cell contains EXACTLY ONE separate component centered with a wide transparent gutter. No part touches another cell. All six share one consistent miniature scale, dark charcoal ribbed rubber moving surface, thick muted sage-green gray metal side rails, a few copper/steel bolt pixels. Chunky clear pixel clusters and 3-tone crisp stepped shading, warm handcrafted rural farming game style. Camera EXACTLY 90 DEGREES STRAIGHT DOWN, orthographic TOP VIEW only: no side walls, no front face, no thickness perspective. All belt ends are OPEN with no metal end cap across the travel surface. Each terminal arm must be the same width so these independent modular parts can join seamlessly. Rail details only along the OUTSIDE of paths, never a divider blocking an intersection.
Cell order left to right, top to bottom:
1. A SHORT STRAIGHT HORIZONTAL conveyor segment, open WEST and EAST, rectangular overall footprint aspect 2:1.
2. A SHORT STRAIGHT VERTICAL conveyor segment, open NORTH and SOUTH, same belt width as cell1, overall footprint aspect 1:2.
3. A precise right-angle L CORNER, open WEST and SOUTH only. Square overall footprint. Each arm half as thick as the full square. Rounded-looking corners are made of stepped pixels, not perspective.
4. A T JUNCTION, open NORTH, SOUTH, WEST only, NO east arm. Square overall footprint, three arms each half the square width. One connected unobstructed dark travel surface at the middle.
5. A PLUS CROSS JUNCTION, open NORTH EAST SOUTH WEST. Square overall footprint, four arms each half the square width. One connected unobstructed dark travel surface at the center. No central obstacle.
6. A compact square machine PORT COLLAR, open WEST and EAST, a short horizontal black empty throat with two thick pale sage-gray rail strips above and below, visible top-down bolt heads; the opening has the same travel-surface width as other components. This is an independent connector collar, not a machine.
Composition: wide 3:2 sheet with an evenly spaced 3-by-2 regular grid; truly transparent background and transparent gutters. All sprites completely visible inside their own cells. No drawn grid lines.
Constraints: six isolated components only. NO machines, NO floor, NO materials, NO food, NO products, NO people, NO arrows, NO labels, NO letters, NO numbers, NO title, NO watermark, NO drop shadows. Do not connect the components together. No isometric/45-degree/three-quarter/tilted perspective. No schematic or vector diagram, actual pixel-art sprites.
```

