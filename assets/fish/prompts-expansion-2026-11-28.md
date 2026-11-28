# F11–F30 鱼类三期 idle 原画

内置 `image_gen` 每个 ID 独立生成透明 PNG。首版以现役 `assets/fish/raw/F01-idle-v1.png` 为像素画风与三期网格参考，具体物种按本轮式样绘制。每张原稿前三行依次为鱼苗、成长、成熟，每行前四格是独立 idle。布局登记绝对原图裁切与同一鳃后躯干锚点，逐阶段共用画布与比例。活鱼选择图取成熟第一帧，同 ID 设施画面按现役共用海／河鱼塘、成熟鱼和水色层导出。

F11–F20 使用河水鱼塘，F21–F30 使用海水鱼塘。体型是养殖展示分组，参考成熟个体的相对体量、狭长轮廓和现有海河构图。小型为 F15、F18、F20、F25，中型为 F14、F19、F21、F23、F24，其余为大型。F22 在增大原画格距后使用每期统一裁切比例，保留细带成熟轮廓。草鱼与鳙鱼的主要形态参照 FAO 品种资料。[草鱼](https://www.fao.org/fishery/docs/CDrom/aquaculture/I1129m/file/en/en_grasscarp.htm) [鳙鱼](https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_bigheadcarp.htm)

## F11

`raw/F11-idle-v1.png`

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-895de893-6687-4f5a-8b3d-a21863364c41.png`

```text
Use case: stylized-concept. Asset: F11 grass carp (Ctenopharyngodon idella) living fish 12-frame pixel-art alpha sprite sheet. Input is only a reference for the farm game pixel palette, bitmap outlines, 3-stage framing and true sprite transparency. Draw a new long grass carp rather than the round crucian carp in the reference: slender cylindrical gray olive and wheat-brown body, large dark-edged scales, broad blunt head, pale belly, no barbels, firm dark forked tail. Square image, invisible 5x5 equal units. ONLY rows 1 to 3 and columns 1 to 4 are occupied, remaining cells true transparency. Row 1 four independently drawn fry, length 45% of a cell, row 2 four growing fish, length 62%, row 3 four distinctly mature specimens, length 76%. Keep anatomically fixed gills, body and eye position within each four-frame row, swimming in-place by gentle tail and fin movement. Each fish centered in its cell. All face right in near overhead three-quarter view, showing back and near flank. Each head, fin, and tail entirely separate from neighboring cells, no stray pixels. Pixel art closest to the input with deliberately crisp staircase contour and 3–5 discrete values. No guides or letters, shadows, background, water, or scenery.
```

## F12–F30 首版

各调用的提示词由以下公用前缀与表中对应的物种描述直接拼接。

```text
Use case stylized-concept. A new living fish 12-frame pixel-art alpha sprite sheet for a Japanese idle farm. Input only for game pixel palette, bitmap contours, 3-stage framing and true transparency. All face RIGHT, same near-overhead three-quarter view with back and near flank visible. True transparent square with an invisible exact 5×5 equal-cell grid; only rows 1–3 and columns 1–4 are occupied. Row 1 four independently drawn juveniles (45% cell length), row 2 four growing fish (62%), row 3 four adults (76%), progression in markings, anatomy and detail. Within each row keep the head, gill and rigid body anatomically identical and stationary, vary only fins and tail gently. Center every whole fish in its cell with clearly generous transparent margins between complete specimens. Style matches game pixel-art reference with deliberate stair-stepped contour and grouped stepped color values. No labels, guides, foreground, shadows, water or background. FISH IDENTITY: 
```

| ID | 物种描述 | 原始输出 |
| --- | --- | --- |
| F12 | bighead carp (Hypophthalmichthys nobilis), a large broad blunt head with eyes below mouth line, silver gray body irregularly spotted dark, gently forked gray tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-43e3278c-2eab-4454-9551-cc0b36050c87.png` |
| F13 | black carp (Mylopharyngodon piceus), long heavy charcoal blue cylindrical body, large dark edged scales and dark blackish fins, small pointed head with no barbels | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-a979fef6-7241-4cf0-b077-6a78adabf596.png` |
| F14 | Chinese bream (Parabramis pekinensis), strongly deep laterally compressed silvery rhombus body, angular high olive-gray back, small forward mouth, long lower anal fin, red-gray forked tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-815d4c76-156b-4b79-a936-4037035af603.png` |
| F15 | yellowhead catfish (Tachysurus fulvidraco), small yellow-gold belly and dark olive-brown dorsal body, distinctly smooth scaleless skin, chin and mouth whiskers, pronounced single dorsal spine, small adipose fin | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-e4809745-2512-4a8c-956a-7abcdc4b3095.png` |
| F16 | Chinese walking freshwater catfish (Silurus asotus), elongated blue charcoal dark smooth body, broad flat face and large mouth with long lateral whiskers, short dorsal fin and very long belly anal fin, broad rounded tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-e1fd85c9-8d0c-45fe-8812-9b7bca76ae04.png` |
| F17 | northern snakehead (Channa argus), long brown olive cylindrical body with dark diagonal saddle blotches, horizontally flattened pointed snake-like head and eye, long contiguous dorsal fin shallow throughout and round tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-ece0b32b-7e95-4165-b8ff-98ab1271b9ec.png` |
| F18 | oriental weather loach (Misgurnus anguillicaudatus), slender small golden-brown speckled fish with tiny blunt mouth ringed by short barbels, mottled spots and rounded translucent reddish tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-469a6b1c-81d1-4a15-8fad-1b994c65b6fc.png` |
| F19 | Asian swamp eel (Monopterus albus), long tapered serpentine golden yellow-brown body, dark olive back and tiny eye, NO paired fins, narrowed pointed tail and shallow flowing S curve | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-f2b528a3-78bd-4df6-a5b5-695a2733a8e7.png` |
| F20 | freshwater puffer (Takifugu obscurus), swimming in naturally compact plump uninflated form, olive-brown dappled yellow back, cream belly, large high-set eye, compact paddle fins, short narrow tail base with rounded tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-0e94e7da-48d9-41f3-b1f7-7bf57bb088ef.png` |
| F21 | silver pomfret (Pampus argenteus), rounded tall diamond-shaped and very compressed pale silver body with metallic blue-gray back, tiny small mouth, pointed sweeping dorsal and anal fins and long forked tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-cc7690b3-7522-4b20-a242-2da292a46f83.png` |
| F22 | largehead hairtail or cutlassfish (Trichiurus lepturus), long narrow silver metallic ribbon body terminating in thin whipping thread tail, long fin ridge on the top edge, large brown eye and pointed prominent jaw, no forked tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-173afd5a-5286-40db-83df-8fe09e87588b.png` |
| F23 | large yellow croaker (Larimichthys crocea), elongated golden fish with a bronze upper flank, yellow ventral side and fins, sharply divided dorsal fins, small pointed head with large eye and tapering gently pointed tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-58d4322b-98b5-4a44-b8bd-8b7840e521c9.png` |
| F24 | chub mackerel (Scomber japonicus), torpedo-shaped blue-green back with dark oblique wavy zebra stripes across upper flank, silvery pale underside, crescent forked tail and tiny finlets | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-80d0590d-a7b4-4826-a830-0dadafed32b3.png` |
| F25 | Pacific saury (Cololabis saira), long very slender silver blue fish with beaklike elongated pointed lower jaw, small fins set very far back, forked tail and tiny finlets | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-f82c8745-7881-4c8c-8a0a-796fb20c5dc7.png` |
| F26 | Japanese Spanish mackerel (Scomberomorus niphonius), long tapered blue gray body, lines of distinct dark oval spots along its silver flank, long sharp jaw, narrow peduncle and deeply forked tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-e4ac67e6-f721-4f75-bfe2-773ed0081bdc.png` |
| F27 | Pacific cod (Gadus macrocephalus), stout mottled olive-brown fish with three genuinely distinct small dorsal fins, two anal fins, cream lateral line, distinctive single small chin barbel, square lightly rounded tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-fb5de9b2-401a-4f9a-b73c-44e032057ca0.png` |
| F28 | orange-spotted grouper (Epinephelus coioides), stout robust light olive brown body, orange-brown spotted markings and subtle diagonal barred patches, large jaw, continuous spiny dorsal fin, broad rounded tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-a9c66200-5c22-4bb8-8148-a3575c09fb4a.png` |
| F29 | Japanese monkfish (Lophius litulon), very broad flattened mottled rust-olive head, enormous wide jaw with small points, broad fan pectoral fins, body sharply tapering to compact tail, one short textured lure coming from forehead, no light glow | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-484e3fae-eebd-46b0-b10f-0b81ab17ba44.png` |
| F30 | Pacific bluefin tuna (Thunnus orientalis), massive compact muscular torpedo-shaped fish with dark navy metallic back and silver-blue flank, narrow peduncle with yellow finlets and huge blue-black crescent tail | `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-59ebabde-1469-4e7e-aae4-033b94ccd012.png` |

首版持久原稿按 `raw/<ID>-idle-v1.png` 存放。

## 修订

| ID | 退回依据 | 采用版本 |
| --- | --- | --- |
| F13 | v1 高背短体轮廓过于接近鲫鱼 | v2 |
| F20 | v1 高背、腹鳍和鲤科体态与河鲀不符 | v2 |
| F22 | v1 带状躯干过短，背鳍集中成高三角；v2 成熟期第一帧吻端和第二帧尾尖横向交错 | v3 |
| F23 | v1 短高背，缺少大黄鱼身形与长短两段背鳍 | v2 |
| F24 | v1 短高背，背鳍过大，缺少清晰双背鳍与小离鳍 | v2 |

### F13 v2

原稿 `raw/F13-idle-v2.png`，参考 `raw/F11-idle-v1.png`。

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-24c26caf-ffaa-43af-b482-a94474335a65.png`

```text
Create an original living fish game sprite sheet with true transparency. Input style only: classic clean pixel clusters and discrete warm outline shading. Colors and silhouette must follow species below. Square invisible exactly 5x5 grid and ONLY the first 4 columns of the first 3 rows are filled; 13 other cells are completely transparent. Rows 1, 2, 3 depict anatomically distinct juvenile, growing and mature fish respectively; four independent idle poses each. Each complete fish faces RIGHT and sits near exact equal-cell center with ample alpha padding between cells. No graphics besides the 12 fish. Across each row the eyes, gill and whole torso are fixed and only fins and tail vary subtly. Rear is left. 3/4 near-overhead angle as seen swimming in a farm pond. Black carp (Mylopharyngodon piceus). Crucial: long substantial powerful cylindrical body. Keep adult body depth no greater than 23 percent of fork length, low nearly flat back, thick sturdy tail peduncle, pointed smooth head, smaller dark eye, dark graphite black-blue and large individual dark-rimmed scales. No short round or high-backed carp. The overall outline must be long and sleek like the given reference geometry, now different from the olive grass carp through the pointed head, thicker peduncle and unmistakable deep blue-black palette.
```

### F20 v2

原稿 `raw/F20-idle-v2.png`，参考 `raw/F11-idle-v1.png`。

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-7a42e73b-0904-4798-ac17-dfc4f9253ce3.png`

```text
Create an original living fish game sprite sheet with true transparency. Input style only: classic clean pixel clusters and discrete warm outline shading. Colors and silhouette must follow species below. Square invisible exactly 5x5 grid and ONLY the first 4 columns of the first 3 rows are filled; 13 other cells are completely transparent. Rows 1, 2, 3 depict anatomically distinct juvenile, growing and mature fish respectively; four independent idle poses each. Each complete fish faces RIGHT and sits near exact equal-cell center with ample alpha padding between cells. No graphics besides the 12 fish. Across each row the eyes, gill and whole torso are fixed and only fins and tail vary subtly. Rear is left. 3/4 near-overhead angle as seen swimming in a farm pond. Takifugu obscurus pufferfish. Crucial: natural uninflated puffer, round convex off-white underside, cheeks and forebody expanded, tiny blunt beaked snout, dark high-set round eye, mottled dark olive and yellow back, no scales. Short fan-shaped tail on thin stem, and very tiny rounded swimming paddles placed near rear on dorsal and underside. Single tiny visible pectoral paddle. NO spiny dorsal peak, no large pelvic fins, no sharp forked tail, no carp shape. The puffer silhouette deliberately departs from reference carp.
```

### F22 v2

原稿 `raw/F22-idle-v2.png`，参考 `raw/F22-idle-v1.png`、`../../public/wiki/icons/F22.webp`。

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-03dc0482-36a7-43a4-98c5-1d6d96debc59.png`

```text
Image 1 gives grid layout and discrete game pixel color clusters. Image 2 gives the long exact fish silhouette only. Create a new true-alpha square 5×5 invisible grid with only 4 columns in first 3 rows occupied, 12 individual right-facing swimming fish, always complete with separation. Row 1 juveniles, row 2 growing, row 3 adults, each four stationary head and belly poses while only thin flowing tail and low dorsal fin vary. The species is largehead hairtail Trichiurus lepturus. IMPORTANT geometry: a flattened narrow sword-like SILVER RIBBON continuously tapering from the small pointed fanged head at right to a completely integrated almost hairlike tail at left. The depth is no greater than one eighth of total length (adult using about 80% cell width, never shorten the tail). There is NO distinct paddle, fork or lobe at the tail tip, no skinny stalk connected to an ordinary chunky fish trunk. The dorsal fin is a low continuous pale fringe from right behind the head along almost the full ribbon. Never use a steep triangle or chunky belly. A tiny gentle S curve is fine. Different juvenile proportions from adult. True classic pixel shading like image 1, no labels or backdrop.
```

### F22 v3

原稿 `raw/F22-idle-v3.png`，参考 `raw/F22-idle-v2.png`。

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-d1e4e677-932f-4121-a9d6-c525b903388a.png`

```text
Edit the entire transparent twelve-fish sprite sheet in the input, preserving the twelve genuine hairtails, their different tail bends and the silvery pixel-made ribbon body. The only correction is grid gutter size: all four fish in each of the first three rows must be materially smaller with much more completely transparent space between them. The invisible 5x5 grid has exact cell centers at 10%, 30%, 50%, 70%, 90% of the width/height. The four sprites in each of rows 1, 2, 3 are centered 10%, 30%, 50%, 70% of total image width. At largest, EACH adult sprite incl entire delicate tail tip occupies no more than 14% of total image width (70% cell width), thus 6% of total width remains empty between neighboring adult sprites. Growing fish no more than 12% full width, juveniles no more than 9% full image width, keeping original visibly different 3 stages. Do not shorten the ribbon by trimming the tail; draw/compress the entire sprite to a smaller area. Preserve right-facing fish with extremely slender profile, the long thin dorsal fringe and the hairlike curved taper off to the left. Keep all other cells entirely transparent. True transparent PNG, no outlines or grid labels.
```

### F23 v2

原稿 `raw/F23-idle-v2.png`，参考 `raw/F13-idle-v2.png`、`../../public/wiki/icons/F23.webp`。

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-05c66db1-816e-42a7-8ffc-3185fe752d11.png`

```text
Original pixel game fish sprites on a transparent square. Reference Image 1 is ONLY for pixel outline color clusters, game size, grid and slender powerful proportions. Image 2 is species identity only, render living fish in the posture from Image 1. Large yellow croaker, Larimichthys crocea. It must have a long near-cylindrical dark bronze-to-yellow fish outline, maximum solid body depth 24% of total length, not a round high-backed bream, perch or carp. Small angular head, relatively elongated pointed taper behind the fins. Deep golden belly and warm yellow flanks, bronzed back. Two contiguous parts of the dorsal fin separated by a visible deep notch: short front spiny section and long low ray section. Tail distinctly pointed to a soft central tip, not fan or deeply forked. Real croaker identity. Invisible 5×5 equal cells with four frames in the first four columns of the first three rows ONLY. Set every fish center on its cell with all body complete and separated from neighboring cells. Fry row 1 width 45% of a cell, growing row 2 width 60%, mature row 3 width 76%. Four individually drawn swimming-in-place idle for each row, fixed rigid body and head with subtle tail and fin articulation, RIGHT facing in same 3/4 near-overhead viewing angle. Retain crisp old-school 16-bit farm pixel style with grouped discrete shading. Transparent alpha everywhere outside the fish, no marks, letters, water, reflections or scenery.
```

### F24 v2

原稿 `raw/F24-idle-v2.png`，参考 `raw/F25-idle-v1.png`、`../../public/wiki/icons/F24.webp`。

原始输出 `C:\Users\eeg14\.codex\generated_images\01a22119-7d9a-7443-bce3-748e79747816\exec-7dc0f94a-e254-4845-8909-0198166c85df.png`

```text
Original pixel game fish sprites on a transparent square. Reference Image 1 is ONLY for pixel outline color clusters, game size, grid and slender powerful proportions. Image 2 is species identity only, render living fish in the posture from Image 1. Chub mackerel, Scomber japonicus. True slim flexible torpedo, body depth at most 23% of fork length, pointed head and smaller eye; near-black wavy short stripes on blue-green dorsal surface, sharply fading toward clean silver-white belly. Two low dorsal fins with broad visible gap, and several small distinct isolated terminal finlets just before fork. Thin peduncle with a narrow deep forked crescent tail. No big triangle dorsal crest, no tall carp body, no beak (unlike reference fish). Invisible 5×5 equal cells with four frames in the first four columns of the first three rows ONLY. Set every fish center on its cell with all body complete and separated from neighboring cells. Fry row 1 width 45% of a cell, growing row 2 width 60%, mature row 3 width 76%. Four individually drawn swimming-in-place idle for each row, fixed rigid body and head with subtle tail and fin articulation, RIGHT facing in same 3/4 near-overhead viewing angle. Retain crisp old-school 16-bit farm pixel style with grouped discrete shading. Transparent alpha everywhere outside the fish, no marks, letters, water, reflections or scenery.
```

