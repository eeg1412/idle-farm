# C69–C73 作物绘图来源

五行依次为 C69 杉树、C70 马尾松、C71 香樟、C72 桢楠和 C73 檀香树。第一至第四列依次为种子、幼苗、成长期和成熟期，第五列留白。成熟原木产量由经营批次结算，画面成熟期显示待采伐的整树。五种作物使用现有大型作物地块透视布局。

## 单株原画

使用内置 image_gen 的风格参考输入。参考为本项目已经使用的 `assets/plot/crops/C68/mature.png`、`assets/plot/crops/C68/growing.png` 和 `assets/plot/crops/C67/mature.png`。

`sheet-v1.png` 中 C69 成熟杉树树尖贴住画面上缘，保留作为修订溯源。`sheet-v2.png` 增加冠尖留白并交付四阶段。以 `cuts.json` 登记的原图坐标逐格裁切。将 Alpha 不高于 29 的半透明噪点归零，保留其余像素，无缩放。裁出单株至 `assets/plot/crops/<ID>/<phase>.png`，再由 `scripts/export-crop-animation.mjs` 输出配套单株 PNG 和 WebP，登记实际根脚和尺度。

### V1 提示词

Use case: style-transfer. Asset type: original farm-game transparent pixel art crop spritesheet, strictly 5 by 5 regular square grid, intended to be cropped into individual sprites. References 1–3 are approved style and viewpoint exemplars only; paint entirely new independent tree art. Pixel clusters and stepped edges at gameplay scale, earthy ochre trunk and crisp olive leaf clusters, 3/4 view matching the project, no ink outlines. Exactly 20 sprites, one per cell for the first four columns. The entire fifth column is transparent empty gutter. Every sprite is isolated in real transparent alpha with a wide clear margin, plant root centered horizontally and roughly 85% down each cell. No drawn grid, frames, labels or lettering, no ground, shadows, orthographic tiles, fruit, cuts, logs or stumps.

Fixed row order top to bottom: row 1 Chinese fir (Cunninghamia lanceolata), straight trunk and narrow cone of dense slightly drooping flattened needle tiers. Row 2 Masson pine (Pinus massoniana), spaced open branches holding tufts of long grouped needles, mature broadly irregular umbrella crown and visibly reddish rough trunk. Row 3 camphor tree (Cinnamomum camphora), broad round spreading crown of glossy small pointed leaves with pale spring highlights, stout gray-brown bifurcated trunk. Row 4 zhennan (Phoebe zhennan), high clean straight rising warm brown trunk and upright elongated crown, clusters of long tapered dark olive leaves. Row 5 Indian sandalwood (Santalum album), small spreading airy crown of opposite oblong light sage green leaves, gray-brown branching stem.

Fixed columns left to right in each row: (1) a centered pair of the specific tiny loose seeds with no soil; (2) complete tiny rooted seedling with 2–4 leafy shoots/needle whorls; (3) whole established sapling, slender trunk with the species silhouette beginning to form, visibly younger and smaller than mature; (4) whole fully mature tree, woody trunk and unmistakable species crown. (5) transparent empty. The adult starts from the same growth axis and consistent framing within its cell. The game harvests the whole woody tree so adult must be healthy, standing, uncut. No images outside the first four columns, no backdrop. This is a precision transparent asset sheet, perfectly regular 5x5 cropping layout.

### V2 提示词

Use case: style-transfer. Draw transparent pixel art production sprites, referencing the three sample game's image style for stepped foliage cluster shading, bark and ground perspective. Produce an equally spaced, perfectly square 5×5 transparent figure sheet, no text or drawn lines. Place all 20 complete sprites STRICTLY INSIDE the central 70% of their square cells, leaving 15% fully empty transparent padding on every side of every sprite, including the top edge. Sprites must never meet or overlap any neighboring cell. Root base centered horizontally below the cell center. Entire fifth column empty.

Rows in order: (1) Chinese fir, tall narrow conical dark green crown of dense drooping flattened needle tiers; (2) Masson pine, reddish trunk, irregular wide umbrella crown made of sparse spaced tufts of long needles; (3) Camphor tree, round spread crown of small pointed glossy leaves with pale spring yellow-green highlights, stout split gray trunk; (4) Zhennan, clean upright brown trunk and deep olive elongated oval high crown of layered clusters of long pointed leaves; (5) Indian sandalwood, open airy wide crown of pale sage oblong opposite leaves, gray-brown branching trunk.

Columns 1–4 of each row: a pair of the specific loose seeds, a tiny 2–4 leaf seedling, a young mid-size tree whose species silhouette is emerging, and a fully adult tree with the specific wood trunk and fully developed foliage. Seed and seedling MUCH smaller relative to mature tree. Row 2 Masson pine seed has wheat-brown membranous wing, row 3 camphor seed round brown, row 4 zhennan oval brown pointed seed, row 5 sandalwood globular tan seed. Adult must be whole, healthy and standing. No trunk cuts, fruit, pinecones, pots, shadows, ground, vignette, outline or diffuse painting. Square composition. Leave clear, generous alpha margins around ALL pixel edges. There must be top margin above the tallest fir in first row. Render intentional clusters and crisp shapes readable at 60 gameplay pixels.

## 同 ID 设施场景

以内置 image_gen 逐 ID 整幅生成，使用项目 `public/art/scene-C68.webp` 为风格参考。原画为 `assets/source/art/scene-<ID>.png`，场景 WebP 为 `public/art/scene-<ID>.webp`，按最近邻缩放至 320×320 再以质量 70 导出。场景资产用于独立设施场景交付。

### V1 提示词模板

Use case: style-transfer. Asset type: independently illustrated square farm facility selection scene, {ID}, designed for 320×320 pixel art and readable at 130px square. Reference 1 is the approved scene's orchard style and view only: match its colorful pixel clusters, stepped hard edges, low three-quarter camera, warmth and daylight, near foreground dirt rows, split rail fence and distant greens at the upper frame. Draw a new young plantation of {name} of the same species throughout. Main mature standing tree slightly left of center with base/root attached to tilled ground, trees along receding rows, enough room above main crown and visible brown row grooves below. This species has {features}. Distinguish the tree by silhouette, trunk and foliage across all scaled trees. Sunlit top-left crown clusters, shadowed underside, simple blue sky in top background. Use only minimal ordinary grass accents on near corners. Draw as a full original edge-to-edge square image, zero words, captions, borders, UI, logs, fruit, workers, equipment or crates. Crisp true pixel-art construction deliberately designed at tile-game scale, hand placed readable clumps rather than smooth vector art, photo or soft digital paint.

| ID | name | features |
| --- | --- | --- |
| C69 | Chinese fir (Cunninghamia lanceolata) | straight cinnamon-brown trunks, dense dark green narrow spires of visibly drooping layers of flattened needles with brighter olive tips |
| C70 | Masson pine (Pinus massoniana) | rough reddish trunks and spreading branches that bear separated fan-shaped tufts of long pine needles, broad irregular umbrella-like silhouettes and open negative space |
| C71 | camphor tree (Cinnamomum camphora) | massive gray-brown short divided trunk, broad round spreading dense crown of small glossy pointed oval leaves with pale lime growth at branch ends |
| C72 | zhennan (Phoebe zhennan) | clean upright slender golden-brown trunks supporting a high elongated deep olive oval crown layered with clusters of noticeably long narrow tapered leaves, subdued lighter veins |
| C73 | Indian sandalwood (Santalum album) | relatively short gray-brown branching trunks under a spreading airy crown of paired, sage-green smooth oblong leaves, foliage opening between well-separated branches |
