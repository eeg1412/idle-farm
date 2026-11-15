# 工坊无突出接口长条机 v5

最终用户修正：机器不要任何凸出的进出料口，传送带也不需要边。内置 `image_gen` 以本轮长条机器为目标，真正编辑去除全部接口框、孔、凹槽，保留完整直立机身；没有程序擦绘。旧九口稿仅保留历史，不再运行。

## Processing machine portless
Input: `assets/workshop/raw/processing-machine-long-v4.png`
```text
Use case: precise-object-edit
Asset type: PORTLESS long vertical top-down machine sprite for a pixel-art farming workshop.
Input is the newly drawn long processing machine. Make a precise edit: REMOVE ALL NINE protruding input slot frames along the LEFT and remove the ONE protruding output slot frame on the RIGHT. Remove the entire short mouth assemblies, their metal U-frames, dark holes and connector stubs. Where they touched the cabinet, draw a complete solid unbroken closed cabinet edge. The final silhouette must be ONE CLEAN TALL NARROW RECTANGLE with TWO STRAIGHT UNINTERRUPTED VERTICAL SIDE EDGES, no notches, no holes, no cavities, no connector sockets, no protrusions on either side. The removed external area must be genuinely transparent.
PRESERVE the main original cabinet at exactly its present size, same proportions, same position, and the THREE round gray milling chambers, small copper bolts, top/bottom copper pipes, sage-green metal top, crisp chunky pixel-art style, 90-degree straight-down orthographic camera. Do not stretch or rotate. Keep all of the existing central machine detail intact.
The machine is connected to separate borderless moving conveyor strips at runtime; NO connection ports should be painted into this machine at all. Both long side edges are simple straight gray-green metal outlines of the solid body.
Constraints: no left/right mouths, no input slots, no output holes, no projecting U-frames, no fixed row of openings, no conveyors, no rails, no food/products/materials, no labels/text/arrows, no floor/shadow/background. One complete portless narrow vertical machine on real transparency. Camera stays true overhead, no side/front wall or perspective.
```

## Refining machine portless
Input: `assets/workshop/raw/refining-machine-long-v4.png`
```text
Use case: precise-object-edit
Asset type: PORTLESS long vertical refining machine sprite for a pixel-art farming workshop.
Input is the newly drawn long refining machine with three copper rectangular press modules. Make a precise edit: REMOVE ALL NINE protruding input slot frames along the LEFT and remove the ONE protruding output slot frame on the RIGHT. Remove each entire mouth assembly including metal U-frame, dark hole, cavity and connector stub. Where each mouth attached, draw a complete solid unbroken closed cabinet edge. The final silhouette is ONE CLEAN TALL NARROW RECTANGLE with TWO STRAIGHT UNINTERRUPTED VERTICAL SIDE EDGES. No notches, no holes, no cavities, no sockets, no protrusions on either side. Removed outside areas are genuinely transparent.
PRESERVE the entire central cabinet at exactly its present size, same proportions and position, all THREE copper-orange RECTANGULAR refining press/cooling-rib modules, small pixel bolts, top and bottom copper pipes, sage-green metal top, crisp chunky pixel-art style and exact 90-degree straight-down orthographic camera. Do not stretch or rotate. Keep all central machine details intact.
This machine connects to separate borderless moving conveyor strips at runtime. Do NOT paint any intake or output feature into the machine itself. Both long sides are simply complete straight gray-green metal outlines of the solid main body.
Constraints: no left/right mouths, no inlet slots, no output holes, no projecting connectors, no fixed row of openings, no conveyor belts, no conveyor rails, no materials/products/food, no labels/text/arrows, no ground/shadow/background. One complete portless narrow vertical machine on true transparency. Camera remains overhead; no side/front wall or perspective.
```

