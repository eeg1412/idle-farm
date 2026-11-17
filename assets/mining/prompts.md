# Mining art generation — 2026-11-17

All five sources generated with built-in image_gen. Reference style visually inspected: assets/source/items/raw/I01-I25.png and P126-P150.png. Source files preserve original generated pixels and alpha. IDs/names are prompt identifiers, never drawn labels.

## Conversion and delivery notes

- Original generated files are in `raw/`; original generation dimensions vary and are registered rather than asserted as requested dimensions.
- Item A is a 5×5 transparent source. Item B has 15 objects in its first three rows; its actual row boundaries are 0/265/530/815, with the lower source area empty. Isolation follows actual alpha, not a nominal 5×5 crop that would cut packaging.
- Conversion uses original pixels only: isolated alpha bounds, two-pixel margin, nearest-neighbor size reduction, transparent 96×96 icons, WebP quality70/alpha100. No old materials were redrawn. Separate near-neighbor strips in IM07/IM14/PM06/PM13 were found in initial exported contact sheets and removed by corrected source isolation; original source sheets remain intact.
- Mine background is generated full-frame. Foreground selects unchanged pixels from the same background at the cave interior and near post; transparency elsewhere leaves rails and the exterior cart unobstructed. Cart is a separately generated transparent source, not drawn by code. Static `scene-M*` selection images composite these assets with the matching canonical item icon and do not authorize animation fallback.
- Frozen geometry: scene320; track inside(70,237), station(249,237); cart96×64, anchor(48,60). Cargo is an independent canonical item sprite fitted inside58×48, bottom-center anchored at cart-local(48,15). The view owns all animation timing and composition of moving keyframes.
- Interface icons: mining-tab, facility-empty-mine, mining-buy, mining-upgrade, mining-yield, mining-research, mining-processing, mining-cycle, mining-refining. All9 are new built-in image_gen source cells.
- `registration.json` retains source paths/hashes, actual cell/source bounds, PNG/WebP paths/hashes and product names. `src/content/mining-visuals.json` is the sole runtime geometry registration.
- This owner visually opened all five raw sources, all40 exported WebP icons via four 96px contact sheets, all9 exported UI icons via a 96px sheet, and background/cart/foreground/selection composites. Independent review and actual game animation evidence are separate; no tests, checks, preview or build were run by the asset owner.
- During editing a proposed patch did not match the local exporter text; the local valid implementation was preserved and continued. PM confirmed no other owner was editing this asset exporter. No concurrent write was established.

+## promptA

Create a production-ready item sprite atlas for a cozy pixel-art idle farming game. TRUE TRANSPARENT background. Exactly 5 columns by 5 rows, square 1536x1536 image. Each of the 25 cells contains ONE isolated centered complete item, occupies only ~64% cell width and height, with generous transparent gutters. Row-major order is mandatory. IDs and Chinese names below identify the subjects ONLY: do NOT draw labels, text, grid, checkerboard, backdrop or cast shadows. Pixel art with intentional crisp stepped contour, compact discrete color clusters, readable materials and subtle small highlights, three-quarter view, warm earthy RPG inventory style. References are established small food ingredient piles and packaged food icons, dark thin contour and limited discrete shades. Intermediate ingredients remain open utilitarian prep containers or plain material, NEVER gifts or ribbon packages. Raw ore chunks must be rocky irregular clusters, distinct from refined ingots. Preserve substantial readable detail at 96px export.

Row1: M01 岩盐: chunky rough white and pale pink HALITE ROCK SALT, visibly opaque cubic mineral crystals with rough stone base, NOT glass; M02 黏土: moist reddish brown irregular clay lump, thumb-pressed surface; M03 石英砂: low mound of pale cream quartz SAND grains, small scooped edge; M04 煤炭: black angular rough coal chunks with charcoal blue faces; M05 铁矿石: rough dark gray rocky iron ore cluster with rusty red ochre veins.
Row2: M06 铜矿石: rough brown rock cluster with turquoise malachite and rusty copper veins; M07 锡矿石: rough gray cassiterite stone cluster, dark brown and slate mineral faces; M08 银矿石: dark rough rocky cluster with bright silvery-white mineral veins, NOT ingot; M09 金矿石: dark rough brown stone with unmistakable yellow gold veins and small nuggets; M10 宝石原矿: rough rock cluster with several uncut purple and teal mineral crystals emerging, NOT finished jewelry.
Row3: IM01 食用精盐: white fine edible salt mound in a plain open shallow prep dish; IM02 陶坯: plain unfired matte beige clay bowl blank, visibly raw rough edge, no glaze/no packaging; IM03 玻璃坯: pale aqua thick glass cylindrical blank and small clear glass slab, no finished decorative bottle; IM04 精制煤粉: fine black coal powder in a plain open gray shallow prep bowl; IM05 熟铁锭: plain dark bluish iron trapezoid ingot, coarse matte metal.
Row4: IM06 铜锭: simple warm reddish copper trapezoid ingot; IM07 锡锭: simple muted pale gray tin trapezoid ingot; IM08 银锭: bright cold silver trapezoid ingot distinct crisp white shine; IM09 金锭: rich yellow gold trapezoid ingot; IM10 宝石坯: unmounted roughly cut faceted purple gemstone blank with a small unfinished facet, no jewelry.
Row5: IM11 金盏花浴盐基: open plain prep bowl with coarse white salt and obvious orange calendula petals, no lid/gift; IM12 黄麻煤饼: compressed dark coal briquette with tan jute fibers tied through its surface, plain intermediate no wrapping; IM13 盐腌鸭肉馅: open plain prep bowl of pink-red finely chopped duck meat filling with white salt flecks, no finished food packaging; IM14 陶盅羊汤坯: unfinished beige clay cooking cup containing uncooked lamb chunks and pale raw broth ingredients, open top, no garnish, no packaging; IM15 盐渍鲤鱼丁: plain open prep dish of small pale pink carp fish cubes with silver skin and coarse salt, no finished packaging.
Every row exactly 5 different items. No extra subjects. Transparent gaps clean; no item touches neighbors or canvas edge.


## promptB

Create a production-ready RPG inventory icon sprite atlas for the same cozy pixel-art idle farming game as these mineral materials. True TRANSPARENT background, square image, exact 5 columns by 5 rows. The first 15 cells (first 3 rows) contain the 15 distinct subjects specified below. LAST TWO ROWS MUST BE COMPLETELY EMPTY TRANSPARENT. One complete isolated centered icon per cell, only ~64% cell width/height, generous transparent gutters. Do NOT draw IDs/text/grid/checkerboard/shadows/background. Crisp pixel-art contour with visible stepped edges, discrete warm color clusters and three-quarter view, small illustrated material details readable after 96px export. Every finished product PM01–PM14 MUST HAVE recognizable retail packaging, a simple kraft paper sleeve, fitted open window presentation box or sealed labeled jar as appropriate; packaging reveals main product and distinguishes it. No readable text, use small pictograms. IM16 is an unwrapped intermediate in plain prep clay cup.

Row1 left-to-right:
IM16 陶盅鲫鱼糕坯: plain unfinished beige terracotta cup containing uncooked pale silver-skinned crucian carp fish paste, rough raw top, no retail packaging or decoration.
PM01 铸铁煤炉: small cast-iron charcoal cooking stove with round open ring top, black gray iron body and visible orange embers, seated in fitted kraft open-top retail carton with simple stove pictogram; main black stove clearly exposed.
PM02 锡衬铜水壶: round reddish copper kettle with pale tin lining visible at open tilted lid, curved spout and handle, fitted kraft paper belly sleeve and exposed copper body, no electric cord.
PM03 银镶宝石胸针: elegant silver brooch holding faceted purple teal gemstone, in an open deep-blue velvet-lined small jewelry box, actual brooch visible.
PM04 金饰玻璃摆件: translucent aqua glass bird ornament with delicate golden leaf trim, in a cream window display carton, clear glass bird silhouette visible.
Row2:
PM05 玻璃瓶食盐: clear glass bottle filled with WHITE fine edible salt, cork and simple kraft paper neck label with salt-cube pictogram, crisp transparent glass outline.
PM06 薰衣草金盏花浴盐罐: sealed clear glass jar filled with white salt, orange calendula petals and violet lavender sprigs, purple cloth cap and modest flower pictogram label; cosmetic bath salt not food.
PM07 艾香铜炉套装: copper incense burner with three small legs and pierced lid, small unlit green mugwort incense cones alongside, both fitted in an open kraft presentation box, visible copper and herbs; NO medicine/health symbols.
PM08 花草茶玻璃礼罐: closed clear glass tea gift jar containing loose dried green leaves, purple/yellow tiny flowers, simple paper band and green ribbon around lid, recognizable loose tea.
PM09 玻璃罐双肉午餐肉: sealed wide glass jar containing firm rectangular pink mixed duck/beef luncheon meat slices, metal lid and kraft label with two tiny meat pictograms, meat visible through clear front.
Row3:
PM10 陶盅浓香牛羊汤: warm brown glazed ceramic soup crock, lid slightly propped to reveal dark beef and pale lamb chunks with rich broth, fitted kraft retail collar with soup bowl pictogram, steam tiny pixels allowed.
PM11 铁罐兔肉松: cylindrical tin retail can with partly peeled metal lid revealing golden brown fluffy rabbit meat floss, cream paper label with simple rabbit silhouette, unmistakable fine shredded strands.
PM12 玻璃罐鳗鲤鱼酱: sealed squat glass retail jar with brass lid containing dark reddish-brown eel and carp fish sauce/chutney, visible tiny fish flakes, paper band with two fish pictogram.
PM13 陶盅双鱼冻糕: brown ceramic crock with clear lid tilted enough to show a set pale translucent fish aspic cake containing silver and salmon-colored two-fish pieces, fitted blue kraft sleeve with fish pictogram.
PM14 锡衬铜盘鲈鱼片: shallow reddish copper tray with visible silver tin inner lining, neatly arranged white sea-bass fillets with dark silver skin, clear retail cover and narrow paper band with fish pictogram, exposed white fish dominates.
Rows4 and5: 10 cells absolutely empty transparent. Keep 15 first subjects in exact order. No extra duplicate items, each isolated and no cropping.


## promptBackground

Draw a FULL FRAME square 320x320 composition (high resolution pixel-art source allowed) for a cozy mining idle farming game. Authentic intentional PIXEL ART: crisp stepped rock contours, discrete earthy color clusters, limited directional shading, detailed readable forms, no painterly gradients, no blurred realistic texture. Background fills frame, NO transparent background. NO text, numbers, people, carts, ore piles or UI.

Geometry precise in normalized 320px coordinates: a rocky mossy hillside occupies left half and upper portion, a dark timber-reinforced mine entrance extends from x22 to x125 and y116 to y242, black/deep navy interior occupies x30..112 y130..233. The mine opening has its near/right upright at x112..131 and y112..242, sturdy vertical timber and rock edge; this edge can later be cropped as a foreground occluder to hide a cart going in from the right. The dark entrance clearly wide enough for an 80px cart. Horizontal railroad extends from inside opening at x30,y238 to the RIGHT to x302,y238, and is entirely STRAIGHT AND HORIZONTAL, side elevation rather than diagonal isometric rails. Two parallel steel rails at y234 and y244 with dark small evenly spaced wooden ties. Keep rail height constant all across. Station stopping center x247,y235. No carts drawn. Open ochre gravel loading yard on right, enough space above track for cart body from y181 to235 and width82. Small wooden platform/signless loading posts on far right x295..313, do not obstruct station. Upper right contains distant green valley, pale warm sky, pine tree and mining lantern on post near cave; create cozy scenic atmosphere. Lower foreground earth pebbles sparse, MUST NOT cover rail line or loading area. Composition should read clearly on 130px square card, large cave and strong horizontal rail silhouette. Draw only this complete static background, no sprite sheet, no border.


## promptCart

Create a SINGLE isolated EMPTY MINING CART sprite on TRUE transparent background for a cozy pixel-art mining game. Authentic hand-crafted pixel-art contour, discrete muted iron gray/blue color clusters, small warm rusty bolts and wooden inner planks. The cart has a side elevation with a SLIGHT visible open top and right end (three-quarter near side), a broad trapezoid iron ore bin, FOUR wheels but only the TWO near wheels and tiny far wheels partially visible; wheel bottoms share one straight horizontal line. Strong simple readable silhouette at 40px wide. No diagonal floor/perspective rail, NO rails, no ground, no shadows, no ore or cargo, no text, no tools. Cart rim perfectly horizontal, wheel axles horizontal. One cart fills central 75% of the square canvas with ample alpha padding, complete wheel bottoms and bin no clipping. Open empty dark interior visible above front bin wall so a separate ore icon layer can sit naturally inside/above rim. Dimensions target sprite width88,height62 after crop; two near wheels centers about x20 and x68, y51, bottoms y60; bin rim at y8, bin floor y45. Crisp stepped pixel-art edges, metal surfaces detailed but not realistic or smooth gradients. Match warm earthy mine hillside style.


## promptUI

Create a transparent 3x3 sprite atlas, exactly nine cozy mining-game UI icons, one centered isolated icon per cell in exact row-major order. True TRANSPARENT background, generous transparent gutters, complete silhouettes occupy only 65% of each cell. Intentional crisp PIXEL ART, stepped contours, discrete earthy warm color clusters, dark outline, small readable details, no smooth gradients or realistic rendering. No text/letters/numbers/grid/background/cast shadow. Each icon legible at24px and48px display.
Row1 col1 mining-tab 矿洞页签: compact dark mine entrance framed by warm timber and a small diagonal steel pickaxe, gray stone upper arch, no cart.
Row1 col2 facility-empty-mine 空矿洞选择: larger compact timber-framed dark mine entrance with two short rails extending toward viewer and a tiny golden lantern; no pickaxe, no people, no cart.
Row1 col3 mining-buy 矿洞购置改良: compact mine entrance and a neat stack of three gold coins in front right, clearly mine acquisition.
Row2 col1 mining-upgrade 矿洞升级改良: compact gray pickaxe next to sturdy timber support with a single large upward amber arrow.
Row2 col2 mining-yield 矿产增产改良: three recognizable raw rock clusters with gold and silver veins in a small open ore cart bin, no rails; abundance visual.
Row2 col3 mining-research 矿业研发改良: open parchment notebook with purple raw gemstone specimen and small copper magnifying glass, research mineral.
Row3 col1 mining-processing 矿业加工提速改良: sturdy gray gear and a plain copper ingot in front with two compact cream speed streaks at left.
Row3 col2 mining-cycle 开采周期改良: chunky steel pickaxe and round brass stopwatch with dark hands, small gold mineral accent.
Row3 col3 mining-refining 精制专精改良: compact black charcoal crucible with bright orange molten metal glow and a polished silver ingot, refined craftsmanship.
No duplicate icons, no captions. Treat this as a sprite sheet production asset rather than a poster.
