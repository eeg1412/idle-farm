# 按作物 ID 交付

入口为 `scripts/export-crop-animation.py`、`src/view/plot-animation.js`、`assets/plot/furrows.json` 和 `scripts/check-facility-art.mjs`。当前目录有 68 种作物，覆盖范围按 `catalog.items` 的 `kind: C` 推导，不能固定为已有数量。

## 每项资源

新增品项先更新扩展式样和 `scripts/catalog-rules.mjs` 的 `kindCounts`，再生成运行目录；`scripts/generate-game-data.mjs` 会限制编号范围并要求全量连续 ID。另同步本清单下述 `PROFILES`，不要只新增图片却遗漏内容或动画合成入口。

| 交付 | 路径与规格 |
| --- | --- |
| 物品图标 | `public/wiki/icons/<ID>.webp`，96×96 透明，WebP 质量 70、Alpha 质量 100；保留 `assets/source/items/` 的原图、透明 5×5 表和提示词 |
| 同 ID 独立设施场景 | `public/art/scene-<ID>.webp`，320×320，质量 70；原图位于 `assets/source/art/` 或其 `facility-sheets/`，场景必须是该作物长在地块中 |
| 品种原画及裁切依据 | `assets/plot/crop-atlases/<批次>/`，保留透明 5×5 PNG、提示词、品种顺序及实际裁切登记；已有批次使用 `cuts.json`、`crop-map.json`、`crops.json` 或 `crops.tsv` 等实际文件，不为统一名称丢弃旧记录 |
| 四期单株（C02 起） | `assets/plot/crops/<ID>/sown.png`、`seedling.png`、`growing.png`、`mature.png`；独立透明 PNG |
| 早期素材留存 | `assets/plot/early-atlases/` 下实际批次 PNG；导出器按 `PROFILES` 生成并保留种子与幼苗，新增作物须登记株型和尺寸，避免漏项或下次导出覆盖未接入原图 |
| 四期合成 PNG | `assets/plot/crop-frames/<ID>.png`，640×640；四格分别为种子、幼苗、成长、成熟的 320×320 前景 |
| 发布成长图集 | `public/art/plot/crops/<ID>.webp`，640×640 透明、质量 70；左上种子、右上幼苗、左下成长、右下成熟 |

`C01` 是已有例外：从 `assets/plot/wheat/wheat-0.png` 至 `wheat-3.png` 读取四张 320×320 整幅透明前景，原画为 `wheat-sprites.png`，提示词为 `wheat-sprites-prompt.txt`，合成依据在同目录 `compose.py`。仍输出 `crop-frames/C01.png` 和 `public/art/plot/crops/C01.webp`；不要强制迁移到普通单株目录或重画确认过的小麦。

`export-crop-animation.py` 会检查目录作物与 `C01 + PROFILES` 一一对应。新增 ID 必须同步株型、早期形态及合成上限，不能只写一张 WebP 或只追加到运行支持名单。若调整早期素材生成方式，必须让导出器读取实际交付的原图。

## 共用场景与根位

| 内容 | 实际来源或发布位置 |
| --- | --- |
| 固定根位 | `assets/plot/furrows.json` |
| 天空、田地原图 | `assets/plot/wheat/sky.png`、`ground.png` |
| 喷头原画、网格、提示词 | `assets/plot/sprinkler/sprinkler-raw.png`、`sprinkler-sheet.png`、`sprinkler-prompt.txt` |
| 发布共用层 | `public/art/plot/sky.webp`、`ground.webp`、`sprinkler-base.webp`、`sprinkler-ne.webp`、`sprinkler-se.webp`、`sprinkler-sw.webp`、`sprinkler-nw.webp` |

每条可种田垄沿固定株距布到两端，只给边缘及中央洒水器留必要空隙；四期用同一根位。图层顺序是天空、田地、作物、洒水器底座、同轴喷头、水滴与落地飞溅。共用层可复用，但不能省略来源与完整性核对。

## 导出与集成边界

- 资源转换入口是 `python3 scripts/export-crop-animation.py`。保留原画、裁切记录、单株和合成 PNG，脚本不应以通用图替代应有的品种原画。
- 显示周期 `max(实际生长周期,5000ms)`，四期均分；仅作物层在成熟末尾淡出 300ms、留空 30ms。换种立刻显示新作物，短实际批次保持展示相位。
- 在 130×138 逻辑像素卡片上关注成熟期可识别度、品种形态、遮挡和切帧根位稳定性；未获运行验收授权时把这些列为未验收项。
- 仅可见活跃卡挂载；同种共享贴图，按需请求，隐藏网页／弹窗／换页／滚出后卸载。减弱动效直接切阶段、静止喷头并关闭水滴；资源失败回退 `scene-<ID>`。WebP 排除在启动预缓存之外，原图不进 `dist/`。
- 内容与研究条件由式样生成。金额和数量继续使用 BigInt，存档用十进制字符串；展示逻辑不改变批次、库存、收入或成功经营事件。

资源检查需覆盖目录全部作物的图标、回退场景和 640×640 透明四期图集。仅有静态图的新增作物不得进入发布构建。检查、测试和浏览器验收遵守用户授权；最终构建只由主管在资源与模块完成后执行。
