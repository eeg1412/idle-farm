# 十种云形状 v2 来源与提示词

内置 `image_gen.imagegen`，2026-11-22。三次调用均为全新透明网格生成，`transparent_background: true`，未传文件引用参数或会话图片参数。地图与已认可单云先由 `view_image` 实开作为人工画风参考，未改动。

发布接口：1280×256、5列2行、每格256×128，行优先0–9。`layout.json` 记录1983×793原生网格的十个独立矩形裁切；脚本逐朵nearest等比inside244×116后居中入格，真实Alpha与白灰层次保留，不镜像、不拉伸、不程序绘画或擦除。`conversion.json` 记录每格实际尺寸、Alpha1/128边距和源／成品SHA256。

## r1

源图：`assets/source/art/estate-weather/shapes-v2/rejected-r1.png`

状态：Rejected after direct viewing: diffuse sheet-wide cloudy backdrop instead of isolated sprites.

实际生成工具输出：`C:/Users/eeg14/.codex/generated_images/01a2033e-ab0e-7610-b57f-e8628c6e6be3/exec-593914ae-0c11-4ffa-83ac-0822fe74877b.png`

完整实际提示词：

```text
Use case: stylized-concept
Asset type: transparent PIXEL ART cloud sprite sheet for a farm game, exactly TEN different cloud sprites in a clean invisible 5-column by 2-row grid. A brand-new sheet, no background.
Canvas/composition: wide landscape canvas approximately 2560 by 1024 (5:2 ratio). Ten equal square cells, 5 across and 2 down. One complete horizontal cloud centered inside each cell; each cloud fills about 86 percent of its cell width and 40 to 60 percent height. Leave clear transparent gutters so no clouds touch each other or cell edges. No visible grid, dividers, frames, writing, labels or numerals.
Visual style: crisp handmade 2D pixel art like a cozy farm terrain, clearly visible square pixel clusters and staircase contours, flat discrete broad shading. White with two very light cool-gray shades only, subtle interior underside shading, no dark outline, no smooth painted gradients, no texture or realistic wisps. Keep the cloud bodies bright with ample solid white areas.
IMPORTANT: all TEN are independently designed naturally fluffy clouds with unmistakably DIFFERENT OUTLINES, not scaled or mirrored copies. Read in row-major order:
Top row left to right:
0 — wide low cloud with five small unequal rounded scallops along its top.
1 — one conspicuously tall central billowing dome and two tiny low side puffs, short base.
2 — TWO equally prominent rounded peaks with a visible valley between them, broad body.
3 — asymmetric cloud with a big high rounded billow on the LEFT and a long low horizontal tail to the RIGHT.
4 — very thin flat elongated cloud, only two gentle shallow mounds, not a gray bar.
Bottom row left to right:
5 — THREE distinct tall unequal rounded towers, middle tower tallest, joined into one broad cloud.
6 — compact nearly oval single large dome cloud with broad rounded shoulders and softly scalloped base.
7 — asymmetric high rounded billow on the RIGHT with TWO decreasing little puffs tapering to the LEFT; different construction from cloud 3.
8 — broad gently flattened upper cap over a puffy lower body, a natural smooth anvil-like cumulus silhouette without pointed ends.
9 — long chain of SEVEN small clustered round puffs, irregular wavy upper AND lower edge, low middle silhouette.
Each cell contains exactly one connected cloud. No detached crumbs, particles, wisps, colored fringes, shadow outside the cloud, sky, terrain, sun, rain or fog field. Entire outside background is genuine transparent alpha. Keep every cloud fully inside its own isolated cell.
```

## r2

源图：`assets/source/art/estate-weather/shapes-v2/rejected-r2.png`

状态：Not selected: visible perimeter residue in black-background direct view; retained without procedural cleanup.

实际生成工具输出：`C:/Users/eeg14/.codex/generated_images/01a2033e-ab0e-7610-b57f-e8628c6e6be3/exec-0a1c1e60-3fe0-4f4f-bc0a-0d8b0dac37d1.png`

完整实际提示词：

```text
Create a clean isolated transparent sprite sheet, exactly 5 columns and 2 rows, ten separate white pixel-art clouds. Wide 5:2 canvas. Every cell has exactly one complete solid cloud sprite surrounded by EMPTY TRANSPARENT SPACE. These are game sprites, NOT an illustration of clouds in a sky. No connected backdrop between the sprites.
Each cloud is made of crisp opaque square pixel blocks: white main mass, a few pale-gray blocks inside the bottom. Hard staircase outer contour with absolutely no glow, mist, blur, soft drop-shadow, gradient, particles or colored fringes. Nothing is drawn outside each cloud contour. Empty transparent gutters between all ten sprites. No text, numbering, grid lines or border.
Five clouds on upper row, left to right: (1) broad LOW five-lobed mound; (2) TALL single central dome with low tiny side puffs; (3) two high equal domes separated by a low valley; (4) large LEFT dome with low long rightward tail; (5) very thin long cloud with shallow rolling top.
Five clouds on lower row, left to right: (6) THREE unequal towers joined in one base; (7) compact single rounded dome, nearly oval; (8) high RIGHT dome with two small stepped puffs on left, not a copy of the left-dome cloud; (9) broad flattened cap and scalloped bulbous lower body; (10) chain of SEVEN small uneven round puffs with wavy bottom.
Every cloud has a unique hand-drawn silhouette. No mirrors or duplicates. White and PALE light gray only, no dark outline. Use 85 percent of each cell width, clouds fully contained with transparent margin. Genuine transparent alpha background.
```

## r3

源图：`assets/source/art/estate-weather/shapes-v2/cloud-shapes-v2-r3.png`

状态：Selected for export and independent review. Native low-alpha outer residue retained, not erased.

实际生成工具输出：`C:/Users/eeg14/.codex/generated_images/01a2033e-ab0e-7610-b57f-e8628c6e6be3/exec-99f219ef-6e09-4673-a5a4-72bfbe1ab766.png`

完整实际提示词：

```text
A game sprite sheet containing ten small 2D pixel-art white clouds on a genuine transparent background, arranged in five columns and two rows. Large clean EMPTY transparent space around every cloud. Ten separate isolated objects, each fully inside its own invisible square cell. Overall wide 5:2 canvas.
Simple solid-colored pixel sprites made of clearly visible square pixels. Limited palette: opaque warm-white body and light neutral-gray chunky shading inside the body. No outlines. Clean hard outer edges. Broad flat color areas without any texture. These are solid cutout shapes with exactly zero pixels outside their outlines. Not a landscape or atmospheric painting.
Make the ten cloud outlines visibly DIFFERENT: upper row low wide lumpy cloud; high single-dome cloud; equal double-dome cloud; asymmetric left-tall/right-low cloud; thin long flat cloud. Lower row triple-tower cloud; compact round cloud; right-tall cloud with stepped left puffs; broad flat-top cloud with scalloped bottom; low chain cloud with seven irregular puffs.
Natural fluffy cloud silhouettes, all ten unique drawings. No lettering, symbols, numbering, background, ground, grid, borders, glow, mist, scattered particles, anti-aliased blurry halos or cast shadows.
```

## 被替代的单云发布图

原 `public/art/estate/atmosphere/clouds-v1.webp` 的原字节保存在本目录 `clouds-v1-export.webp`，SHA256 `6ca64e4695a2efe4d6eb54f38bfecb6c1771e4624c249bf98c6866db7a9a45aa`；按本次明确替换指令从public移除，不删旧原画或拒稿。

独立审图、真实入口／云影消费与用户认可均另记；本记录不宣称动态验收通过。
