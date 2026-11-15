# 按作物 ID 交付

入口为 `scripts/export-crop-animation.mjs`、`assets/plot/crop-layout.json`、`src/content/crop-visuals.json`、`src/view/plot-animation.js` 和公共画布加载器。当前目录有 68 种作物，覆盖范围按 `catalog.items` 的 `kind: C` 推导，不能固定为已有数量。C02–C68 使用四期独立单株文件和逐根 Sprite；C01 保留已认可整幅前景例外。

## 每项资源

新增品项先更新扩展式样和 `scripts/catalog-rules.mjs` 的 `kindCounts`，再生成运行目录；`scripts/generate-game-data.mjs` 会限制编号范围并要求全量连续 ID。同步大小、株型、根位及单株 metadata 的实际登记，不要只新增图片却遗漏内容或运行入口。

| 交付 | 路径与规格 |
| --- | --- |
| 物品图标 | `public/wiki/icons/<ID>.webp`，96×96 透明，WebP 质量 70、Alpha 质量 100；保留 `assets/source/items/` 的原图、透明 5×5 表和提示词 |
| 同 ID 独立设施场景 | `public/art/scene-<ID>.webp`，320×320，质量 70；原图位于 `assets/source/art/` 或其 `facility-sheets/`，场景必须是该作物长在地块中 |
| 品种原画及裁切依据 | `assets/plot/crop-atlases/<批次>/`，保留透明 5×5 PNG、提示词、品种顺序及实际裁切登记；已有批次使用 `cuts.json`、`crop-map.json`、`crops.json` 或 `crops.tsv` 等实际文件，不为统一名称丢弃旧记录 |
| 四期单株（C02 起） | `assets/plot/crops/<ID>/sown.png`、`seedling.png`、`growing.png`、`mature.png`；独立透明 PNG |
| 裁切后四期单株（C02 起） | `assets/plot/plants/<ID>/<phase>.png`，保留实际导出纹理内容与原图 bounds 的对应；不含其他根位或多株 |
| 早期素材留存 | `assets/plot/early-atlases/` 下实际批次 PNG；保留早期来源，已有有效四期单株可直接复用，不为改布局重画 |
| 发布四期单株（C02 起） | `public/art/plot/plants/<ID>/sown.webp`、`seedling.webp`、`growing.webp`、`mature.webp`；每文件一株／一个播种主体，透明 WebP，质量 70；不能在文件里烘焙一排或整田多株 |
| 运行布植登记 | `src/content/crop-visuals.json`，逐 ID 登记 mode、size、planting、roots 及每期路径、根脚 anchor、baseScale 和源图 bounds |
| C01 例外图集 | `public/art/plot/crops/C01.webp` 与 `C01-front.webp`，640×640 透明四期整幅前景；已有源图和图集保持，不套用 C02 起的单株要求 |
| 静态布植交接图 | `assets/plot/reviews/individual-v4/<ID>-roots.png`、`<ID>-planting.json`、`<ID>-<phase>-320.png`、`<ID>-<phase>-130x138.png` 及四期接触表；由生产入口的 `--review` 选择交付样本，仅供素材交接，不能作为 C02 起的运行前景 |

`C01` 是已有例外：`assets/plot/wheat/wheat-0.png` 至 `wheat-3.png` 为四张 320×320 已认可整幅透明前景，原画为 `wheat-sprites.png`，提示词为 `wheat-sprites-prompt.txt`，原合成依据在同目录 `compose.py`。`crop-visuals.json` 为 `{mode: 'fieldAtlas', size: 'small'}`，仍加载既有 canonical 与 front 两张 v3 图集，运行隐藏 back 副本、只绘完整前景；本轮不重导或改原麦，不强制迁移到普通单株目录。

旧 `crop-frames/<ID>.png` 以及 C02 起的 `public/art/plot/crops/<ID>.webp`、`<ID>-front.webp` 可保留历史来源或静态素材用途，但不再作为 C02 起的必交运行资源，也不能被加载器当作真实单株的替代品。`scripts/export-crop-animation.py` 现在只用 Python 标准库转发同一 Node 入口，不再生成另一套整田运行资源。只有新增或真正改画源图才调用 imagegen，复用已有单株及转换不要求再生成原画。

## 单株 metadata 与运行方式

C02 起的每个条目为 `{mode: 'individual', size, planting, roots, stages}`：

- `roots` 每根记录 `{x, y, scale, maxHeight, row, column}`，使用 320×320 场景空间。四期共用这些固定根位，row／column 对应真实田垄和统一透视列，不随阶段重新抽样。
- `stages` 按 `sown/seedling/growing/mature` 排列，每期记录 `{phase, path, width, height, anchorX, anchorY, baseScale, source: {path, bounds}}`。`path` 是 public 相对路径 `art/plot/plants/<ID>/<phase>.webp`；`source.path` 指向 `assets/plot/crops/<ID>/<phase>.png`，`bounds` 是该源图一次导出时的 trim 区域。
- `anchorX/anchorY` 使用 trim 后单株纹理内的根脚像素，种子使用中心；导出时登记一次，运行不逐帧测 bbox 或重居中。
- 每根的独立容器定位在 root.x/y，内部各建一个 Sprite，pivot 使用该期 anchor；纹理可以由全田同阶段 Sprite 共享。阶段切换只换纹理、登记的 pivot 和尺度，不改根容器位置。
- 当前尺度消费为 `min(root.scale × stage.baseScale, root.maxHeight / stage.height)`，使近大远小并保留可见高度；不能为满足大小类别把远排整行删除，也不能用一张已合成整田图冒充多个 Sprite。
- 前后层按固定根位深度分组，当前分界 y=191；每株保持完整，前排 Sprite 在洒水器／水花之后绘制。静态交接合成图不参与这条运行路径。加载器对 individual 条目只请求 metadata 中的四张单株路径，未知模式不退回 C02 起的旧图集。

## 共用场景与根位

| 内容 | 实际来源或发布位置 |
| --- | --- |
| 田垄来源与运行根位 | `assets/plot/furrows.json`、`assets/plot/crop-layout.json` 和生成的 `crop-visuals.json` |
| 天空、田地原图 | `assets/plot/wheat/sky.png`、`ground.png` |
| 喷头原画、网格、提示词 | `assets/plot/sprinkler/sprinkler-raw.png`、`sprinkler-sheet.png`、`sprinkler-prompt.txt` |
| 发布共用层 | `public/art/plot/sky.webp`、`ground.webp`、`sprinkler-base.webp`、`sprinkler-ne.webp`、`sprinkler-se.webp`、`sprinkler-sw.webp`、`sprinkler-nw.webp` |

每条可种田垄都应布植，列沿统一透视网格对齐，并覆盖实际 ground 的完整可种范围，只给必要边缘和洒水器空间；不能仅用两列窄条或不贴底图的规则表格交付。交接必须包含根位、列与真实 ground 叠图，不能只凭根数、九排或公式宣布铺满。四期用同一根位。图层顺序是天空、田地、后排单株 Sprite、洒水器底座、同轴喷头、水滴与落地飞溅、前排单株 Sprite。共用层可复用，但不能省略来源与完整性核对。

## 导出与集成边界

- 当前资源转换入口是 `node scripts/export-crop-animation.mjs`，保留已有原画、裁切记录、四期真实单株、布植 metadata 和静态交接资料；可用 `--size` 或 `--ids` 限定本次范围，`--review` 生成指定品种静态交接资料。Python 兼容入口转发相同参数；不要为使用旧工具而重新发布 C02 起的整田图集。
- 显示周期 `max(实际生长周期,5000ms)`，四期均分；仅作物层在成熟末尾淡出 300ms、留空 30ms。换种立刻显示新作物，短实际批次保持展示相位。
- 在 130×138 逻辑像素卡片上关注成熟期可识别度、品种形态、遮挡和切帧根位稳定性；未获运行验收授权时把这些列为未验收项。
- 仅可见活跃卡挂载；同种每期单株共享纹理，按需请求，隐藏网页／弹窗／换页／滚出后卸载所有植株实例。减弱动态已删除；资源失败回退 `scene-<ID>`，不能回到已淘汰整田动画。WebP 排除在启动预缓存之外，原图不进 `dist/`。
- 内容与研究条件由式样生成。金额和数量继续使用 BigInt，存档用十进制字符串；展示逻辑不改变批次、库存、收入或成功经营事件。

资源门需按目录覆盖物品图标、静态回退、C02 起四期独立单株、mode／根位／锚点／尺度与真实来源，以及 C01 例外图集；不能把 67 种旧整田图集存在当作交付证明。大型作物漏排、对齐和铺满反馈再次报告时撤销旧完成结论，分别记录原画、静态叠图与真实运行的证据。检查、测试和浏览器验收遵守用户授权；最终编译只由 PM 在交付齐备且取得适用授权后执行。
