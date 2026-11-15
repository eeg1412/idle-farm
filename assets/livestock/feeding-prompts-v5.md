# V5 全牲畜进食原画与生产登记

本轮由内置 `image_gen` 新绘6张透明源稿，覆盖目录10种、20阶段、每期4帧。原V4全部来源保留，切换前登记保存在 `layout-v4-before-feeding.json`、`atlas-v4-before-feeding.json`。源坐标与嘴点的人工登记在 `feeding-registration-v5.json`，由正式畜牧导出器读取；同阶段始终共用sourceCanvas/stageScale和固定解剖脚点，不按逐帧bbox缩放/居中，不旋转旧动物替代进食。

独立饲料由运行时程序层消费 `feeding` 数组，小型grain、hay、greens保持在动物原图之外。低头嘴/喙与脚底同高时，`supportXRange` 排除前方头部，仅首帧真实脚区生成grounding；不挪动物迁就阴影。

最终人工注册以站立中心的 x 与前方支撑脚趾／蹄底的 y 为准。L01 从初稿足掌上缘 y221 改到实际前趾底 y226，其他少数阶段按源稿前蹄底修正 2px；同阶段四帧共用此解剖定义、画布和尺度。黑猪与羊的宽源窗口增加显式 `cellRects` 隔离邻格鼻尖，不移动当前动物或按 bbox 补偿。

`feedingSource.mouthBounds` 是 320 场景中靠脚线的紧凑低嘴／喙区域，`sourceMouthBounds` 是首帧原图对应区域，均随共享注册可追溯；只用于对明确新进食姿态的静态审阅与资源门限定，不能作为整列、整片前地面或真实烘焙投影的豁免。正常分镜叠红框，抬高的整张脸不要求进入低嘴框。130px 四帧静态合成证据为 `reviews/feeding-v5/feeding-130-four-frames.png`，不等于运行循环。

正式资源转换：`node scripts/export-livestock-animation.mjs --refresh-scenes`。该命令只进行源图转换、登记和派生图合成，不是测试、浏览器或编译。静态QA与真实循环验收分别记录。

常规 `scripts/export-facility-scenes.py` 对 `layout.animation == 'feeding'` 且已登记的牲畜优先读取 `assets/source/art/scene-<ID>.png`，不再用历史设施表覆盖。它消费实际 `atlas.species[ID].facilityScene`（兼容已有 `facilitySceneAsset`）来源字段，只有该记录已有的 source/published 哈希才在重新压缩后同步；不会虚构本轮尚未登记的哈希或从发布 WebP 反向取源。未运行该 Python 导出链。

## accessories

原稿：`assets/livestock/raw/pixel-v5-feeding-accessories.png`

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-f4483240-0690-4aef-8999-b6f5e3714169.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际提示词：

```text
Use case: stylized-concept. Asset type: independently drawn FEEDING idle sprite sheet for a pixel-art Japanese farm game. Square transparent PNG, invisible exact 5x5 equal cells, NO drawn grid or labels. Only first FOUR columns contain animals, fifth column blank. No background, no ground, no baked shadow, no feed, no straw, no grain, no dish or trough in the animal cells. Food will be a separate program layer. All animals face RIGHT in a slightly elevated three-quarter farm-game view. They stand with their feet firmly planted, body and torso fixed. Heads and necks are LOWERED toward the bare floor at the front-right of their stance. Every four-frame row depicts real eating: frame1 reaches nose/beak down to food point, frame2 nibbles/pecks with tiny jaw/beak opening, frame3 chews and draws head back a little, frame4 swallows and returns. ONLY head/neck/jaw move: same torso position/size, same feet/hooves/claws planted in the same relative cell coordinates, no whole-animal rotation, no squashing or translation, no walking. Each cell has complete animal with all feet, ears/horns/tail and clear 10% transparent margin. Feet sole line at about 86% of each cell height, stance center at about 45% of cell width; nose/beak feeding point at about 82% of cell width and 88% cell height. Keep the body/head anatomy and species details clear. Style: medium-detail authentic pixel sprite, organized visible pixel clusters, staircase contours, discrete 3–5 shading steps, warm dark outline, readable eyes and grouped feather/wool/fur forms. Match the medium-detail black-pig farm pixel sprite style: NOT photorealistic, not rendered 3D, no soft lighting or gradients, no tiny realistic fur; also not simplistic featureless blocks. Genuinely transparent alpha. All FIVE rows are occupied, four independent feeding frames per row: ROW1 adult brown laying HEN with red comb and golden clawed feet, head bent down PECKING; ROW2 adult dark slate milk WATER BUFFALO, curved side horns, cloven hooves, lowered neck and muzzle gently CHEWING; ROW3 adult brown female MALLARD DUCK with tan-brown feather groups and golden-orange webbed feet, beak pecking low; ROW4 adult cream milk GOAT with short swept horns, small beard and cloven hooves, long head bent down eating; ROW5 adult white laying GOOSE with long curved low neck, orange beak/webbed feet, beak grazing low. Each row has only its one correct species repeated in four real feeding poses. All animals are adults. No product eggs, milk or meat.
```

## pig

原稿：`assets/livestock/raw/pixel-v5-feeding-pig.png`

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-b8bab8ad-17f1-4fa1-b13e-c3296f491090.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际提示词：

```text
Use case: stylized-concept. Asset type: independently drawn FEEDING idle sprite sheet for a pixel-art Japanese farm game. Square transparent PNG, invisible exact 5x5 equal cells, NO drawn grid or labels. Only first FOUR columns contain animals, fifth column blank. No background, no ground, no baked shadow, no feed, no straw, no grain, no dish or trough in the animal cells. Food will be a separate program layer. All animals face RIGHT in a slightly elevated three-quarter farm-game view. They stand with their feet firmly planted, body and torso fixed. Heads and necks are LOWERED toward the bare floor at the front-right of their stance. Every four-frame row depicts real eating: frame1 reaches nose/beak down to food point, frame2 nibbles/pecks with tiny jaw/beak opening, frame3 chews and draws head back a little, frame4 swallows and returns. ONLY head/neck/jaw move: same torso position/size, same feet/hooves/claws planted in the same relative cell coordinates, no whole-animal rotation, no squashing or translation, no walking. Each cell has complete animal with all feet, ears/horns/tail and clear 10% transparent margin. Feet sole line at about 86% of each cell height, stance center at about 45% of cell width; nose/beak feeding point at about 82% of cell width and 88% cell height. Keep the body/head anatomy and species details clear. Style: medium-detail authentic pixel sprite, organized visible pixel clusters, staircase contours, discrete 3–5 shading steps, warm dark outline, readable eyes and grouped feather/wool/fur forms. Match the medium-detail black-pig farm pixel sprite style: NOT photorealistic, not rendered 3D, no soft lighting or gradients, no tiny realistic fur; also not simplistic featureless blocks. Genuinely transparent alpha. Only first THREE rows and first FOUR columns are occupied; last two rows entirely blank transparent. One species only: black pig. ROW1 four real feeding frames of young piglet with a small round body, short snout and relatively large ears, roughly 50% cell width. ROW2 four real feeding frames of a growing black pig with longer stocky torso and moderately sized ears, roughly 65% cell width. ROW3 four real feeding frames of full-grown stocky black pig with thick charcoal body, pink low snout, little curled tail and dark cloven hooves, roughly 78% cell width. These are three independently drawn age stages, NOT the same adult resized. Feet stay on the SAME relative sole line in every cell, body size/shape constant within a row, and only eating head/neck/jaw changes. No meat, no blood, no food baked into the image.
```

## rabbit

原稿：`assets/livestock/raw/pixel-v5-feeding-rabbit.png`

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-ebb245ac-965a-4b47-a206-1efd3fceb2fb.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际提示词：

```text
Use case: stylized-concept. Asset type: independently drawn FEEDING idle sprite sheet for a pixel-art Japanese farm game. Square transparent PNG, invisible exact 5x5 equal cells, NO drawn grid or labels. Only first FOUR columns contain animals, fifth column blank. No background, no ground, no baked shadow, no feed, no straw, no grain, no dish or trough in the animal cells. Food will be a separate program layer. All animals face RIGHT in a slightly elevated three-quarter farm-game view. They stand with their feet firmly planted, body and torso fixed. Heads and necks are LOWERED toward the bare floor at the front-right of their stance. Every four-frame row depicts real eating: frame1 reaches nose/beak down to food point, frame2 nibbles/pecks with tiny jaw/beak opening, frame3 chews and draws head back a little, frame4 swallows and returns. ONLY head/neck/jaw move: same torso position/size, same feet/hooves/claws planted in the same relative cell coordinates, no whole-animal rotation, no squashing or translation, no walking. Each cell has complete animal with all feet, ears/horns/tail and clear 10% transparent margin. Feet sole line at about 86% of each cell height, stance center at about 45% of cell width; nose/beak feeding point at about 82% of cell width and 88% cell height. Keep the body/head anatomy and species details clear. Style: medium-detail authentic pixel sprite, organized visible pixel clusters, staircase contours, discrete 3–5 shading steps, warm dark outline, readable eyes and grouped feather/wool/fur forms. Match the medium-detail black-pig farm pixel sprite style: NOT photorealistic, not rendered 3D, no soft lighting or gradients, no tiny realistic fur; also not simplistic featureless blocks. Genuinely transparent alpha. Only first THREE rows and first FOUR columns are occupied; last two rows entirely blank transparent. One species only: meat rabbit. ROW1 four real feeding frames of small grey-brown baby rabbit, short round body and relatively big upright ears, roughly 50% cell width. ROW2 four real feeding frames of a growing grey-brown rabbit with elongated body and tall ears, roughly 65% cell width. ROW3 four real feeding frames of full-grown grey-brown rabbit with long upright ears, thick hindquarters and small paws, roughly 78% cell width. These are three independently drawn age stages, NOT the same adult resized. Feet stay on the SAME relative sole line in every cell, body size/shape constant within a row, and only eating head/neck/jaw changes. No meat, no blood, no food baked into the image.
```

## sheep

原稿：`assets/livestock/raw/pixel-v5-feeding-sheep.png`

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-a0e6eeae-66ac-49bf-a609-52b8d306f41f.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际提示词：

```text
Use case: stylized-concept. Asset type: independently drawn FEEDING idle sprite sheet for a pixel-art Japanese farm game. Square transparent PNG, invisible exact 5x5 equal cells, NO drawn grid or labels. Only first FOUR columns contain animals, fifth column blank. No background, no ground, no baked shadow, no feed, no straw, no grain, no dish or trough in the animal cells. Food will be a separate program layer. All animals face RIGHT in a slightly elevated three-quarter farm-game view. They stand with their feet firmly planted, body and torso fixed. Heads and necks are LOWERED toward the bare floor at the front-right of their stance. Every four-frame row depicts real eating: frame1 reaches nose/beak down to food point, frame2 nibbles/pecks with tiny jaw/beak opening, frame3 chews and draws head back a little, frame4 swallows and returns. ONLY head/neck/jaw move: same torso position/size, same feet/hooves/claws planted in the same relative cell coordinates, no whole-animal rotation, no squashing or translation, no walking. Each cell has complete animal with all feet, ears/horns/tail and clear 10% transparent margin. Feet sole line at about 86% of each cell height, stance center at about 45% of cell width; nose/beak feeding point at about 82% of cell width and 88% cell height. Keep the body/head anatomy and species details clear. Style: medium-detail authentic pixel sprite, organized visible pixel clusters, staircase contours, discrete 3–5 shading steps, warm dark outline, readable eyes and grouped feather/wool/fur forms. Match the medium-detail black-pig farm pixel sprite style: NOT photorealistic, not rendered 3D, no soft lighting or gradients, no tiny realistic fur; also not simplistic featureless blocks. Genuinely transparent alpha. Only first THREE rows and first FOUR columns are occupied; last two rows entirely blank transparent. One species only: meat sheep. ROW1 four real feeding frames of small cream lamb with short fluffy wool clusters, thin planted legs and small ears, roughly 50% cell width. ROW2 four real feeding frames of a growing sheep with more grouped cream wool and thicker body, roughly 65% cell width. ROW3 four real feeding frames of full-grown cream wool sheep with large distinct wool clusters, beige lowered face and dark cloven hooves, roughly 78% cell width. These are three independently drawn age stages, NOT the same adult resized. Feet stay on the SAME relative sole line in every cell, body size/shape constant within a row, and only eating head/neck/jaw changes. No meat, no blood, no food baked into the image.
```

## muscovy

原稿：`assets/livestock/raw/pixel-v5-feeding-muscovy.png`

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-d17620a3-f223-461c-b6a6-cfd1bf259091.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际提示词：

```text
Use case: stylized-concept. Asset type: independently drawn FEEDING idle sprite sheet for a pixel-art Japanese farm game. Square transparent PNG, invisible exact 5x5 equal cells, NO drawn grid or labels. Only first FOUR columns contain animals, fifth column blank. No background, no ground, no baked shadow, no feed, no straw, no grain, no dish or trough in the animal cells. Food will be a separate program layer. All animals face RIGHT in a slightly elevated three-quarter farm-game view. They stand with their feet firmly planted, body and torso fixed. Heads and necks are LOWERED toward the bare floor at the front-right of their stance. Every four-frame row depicts real eating: frame1 reaches nose/beak down to food point, frame2 nibbles/pecks with tiny jaw/beak opening, frame3 chews and draws head back a little, frame4 swallows and returns. ONLY head/neck/jaw move: same torso position/size, same feet/hooves/claws planted in the same relative cell coordinates, no whole-animal rotation, no squashing or translation, no walking. Each cell has complete animal with all feet, ears/horns/tail and clear 10% transparent margin. Feet sole line at about 86% of each cell height, stance center at about 45% of cell width; nose/beak feeding point at about 82% of cell width and 88% cell height. Keep the body/head anatomy and species details clear. Style: medium-detail authentic pixel sprite, organized visible pixel clusters, staircase contours, discrete 3–5 shading steps, warm dark outline, readable eyes and grouped feather/wool/fur forms. Match the medium-detail black-pig farm pixel sprite style: NOT photorealistic, not rendered 3D, no soft lighting or gradients, no tiny realistic fur; also not simplistic featureless blocks. Genuinely transparent alpha. Only first THREE rows and first FOUR columns are occupied; last two rows entirely blank transparent. One species only: muscovy duck. ROW1 four real feeding frames of small yellow-brown duckling, short beak, tiny wings and orange webbed feet, roughly 50% cell width. ROW2 four real feeding frames of a growing black-and-white Muscovy duck, partial red facial caruncles and orange webbed feet, roughly 65% cell width. ROW3 four real feeding frames of full-grown black-and-white Muscovy duck with clear red facial caruncles around eye/beak and golden-orange webbed feet, roughly 78% cell width. These are three independently drawn age stages, NOT the same adult resized. Feet stay on the SAME relative sole line in every cell, body size/shape constant within a row, and only eating head/neck/jaw changes. No meat, no blood, no food baked into the image.
```

## cattle

原稿：`assets/livestock/raw/pixel-v5-feeding-cattle.png`

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-ea33e353-42e3-477a-b097-5341dc982acb.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际提示词：

```text
Use case: stylized-concept. Asset type: independently drawn FEEDING idle sprite sheet for a pixel-art Japanese farm game. Square transparent PNG, invisible exact 5x5 equal cells, NO drawn grid or labels. Only first FOUR columns contain animals, fifth column blank. No background, no ground, no baked shadow, no feed, no straw, no grain, no dish or trough in the animal cells. Food will be a separate program layer. All animals face RIGHT in a slightly elevated three-quarter farm-game view. They stand with their feet firmly planted, body and torso fixed. Heads and necks are LOWERED toward the bare floor at the front-right of their stance. Every four-frame row depicts real eating: frame1 reaches nose/beak down to food point, frame2 nibbles/pecks with tiny jaw/beak opening, frame3 chews and draws head back a little, frame4 swallows and returns. ONLY head/neck/jaw move: same torso position/size, same feet/hooves/claws planted in the same relative cell coordinates, no whole-animal rotation, no squashing or translation, no walking. Each cell has complete animal with all feet, ears/horns/tail and clear 10% transparent margin. Feet sole line at about 86% of each cell height, stance center at about 45% of cell width; nose/beak feeding point at about 82% of cell width and 88% cell height. Keep the body/head anatomy and species details clear. Style: medium-detail authentic pixel sprite, organized visible pixel clusters, staircase contours, discrete 3–5 shading steps, warm dark outline, readable eyes and grouped feather/wool/fur forms. Match the medium-detail black-pig farm pixel sprite style: NOT photorealistic, not rendered 3D, no soft lighting or gradients, no tiny realistic fur; also not simplistic featureless blocks. Genuinely transparent alpha. Only first THREE rows and first FOUR columns are occupied; last two rows entirely blank transparent. One species only: yellow beef cattle. ROW1 four real feeding frames of small tan calf, short body, no big horns, slim planted legs, roughly 50% cell width. ROW2 four real feeding frames of a growing golden-tan bovine with longer body and small horn buds, roughly 65% cell width. ROW3 four real feeding frames of full-grown golden-tan beef bovine with broad muscular torso, short horns, darker hooves and pale lowered muzzle, roughly 78% cell width. These are three independently drawn age stages, NOT the same adult resized. Feet stay on the SAME relative sole line in every cell, body size/shape constant within a row, and only eating head/neck/jaw changes. No meat, no blood, no food baked into the image.
```

## cattle 透明背景修订 r2

活跃来源：`raw/pixel-v5-feeding-cattle-r2.png`，初稿保留。初稿大片浅色背景疑点不通过脚本抹除，使用内置image_gen针对透明背景修订；动物姿态与格位要求保留。

Generated images are saved to C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2 as C:\Users\eeg14\.codex\generated_images\01a1deb8-6050-73f2-ba68-7ef2efe5a6d2\exec-813b1af7-35d5-43b3-aefd-93dbf2b1cb5a.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

实际编辑提示词：

```text
Edit this cattle feeding pixel sprite sheet ONLY to remove the entire pale white/grey fog matte and any background around and between the animals. Produce GENUINELY transparent alpha in every non-animal pixel, including gaps between legs/horns and every grid margin. Keep every one of the 12 cattle feeding drawings, all exact placements, anatomy, colors, pixel-cluster style, age stages and four-frame poses intact. Do not crop or cut tails/hooves/horns, add feed, paint shadows, add a checkerboard or fill the background. Preserve a clean opaque pixel-art animal silhouette with true transparent exterior. The result should have no haze at all on a cream or barn background.
```

