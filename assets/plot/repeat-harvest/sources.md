# 连续采收成年植株：来源与提示词

本次新增原画使用内置 `image_gen` 精准编辑已有 `mature.png`。下表的透明网格、裁格、PNG/WebP 转换及静态对照使用项目现有 sharp，只是素材准备与交接，不是绘画来源，也不供运行加载器作为整田图片使用。原稿、退回稿与修订稿均保留。

采收分类与逐项审核见 [crop-harvest.json](../../../src/content/crop-harvest.json) 及[本轮素材审阅](../../../docs/art-reviews/2026-11-15-repeat-harvest-crops.md)。本索引记录真实来源；审核状态以该清单为准。

## 两批透明编辑原稿

| 批次 | 已认可成熟单株输入与登记 | 内置 image_gen 编辑原稿 | 实际提示词 | 用途 |
| --- | --- | --- | --- | --- |
| v1-01 | [mature-source-v1-01.png](mature-source-v1-01.png) · [逐格 ID、源图、根脚和 scale](mature-source-v1-01.json) | [bare-generated-v1-01.png](bare-generated-v1-01.png) | [完整提示词](bare-generated-v1-01-prompt.txt) | 25 格各一株，只去采收物；C05/C56/C61 后经定向 v2 修订，其余本批来源保留 |
| v1-02 | [mature-source-v1-02.png](mature-source-v1-02.png) · [逐格登记](mature-source-v1-02.json) | [bare-generated-v1-02.png](bare-generated-v1-02.png) | [完整提示词](bare-generated-v1-02-prompt.txt) | 仅第一行 C23/C35/C36/C47/C64 是编辑目标；其余 20 格是未采用的成熟对照。C36 后经 v2 修订 |

每个原稿另保留 `*-normalized.png`。`crop-layout.json.repeatBare[ID].editedSheet` 指真实 image_gen 原稿，`normalizedSheet` 指归一后的裁格空间，`cell` 坐标属于后者；两者尺寸关系记录在 `normalization`，不把原稿尺寸写成统一网格尺寸。

## 四项定向修订

四张输入均直接裁自对应的真实成熟输入格，不使用失败 bare 反复放大或把幼苗改成年株。

| ID | 原成熟单株输入 / 登记 | 当前精确 image_gen 修订原稿 | 实际提示词 | 修订内容 |
| --- | --- | --- | --- | --- |
| C05 苹果 | [PNG](mature-source-v2-C05.png) · [登记](mature-source-v2-C05.json) | [bare-generated-v2-C05.png](bare-generated-v2-C05.png) | [提示词](bare-generated-v2-C05-prompt.txt) | 仅去苹果，锁住原不规则叶冠、外轮廓和树干，修正 v1 扩冠 |
| C36 南瓜 | [PNG](mature-source-v2-C36.png) · [登记](mature-source-v2-C36.json) | [bare-generated-v2-C36.png](bare-generated-v2-C36.png) | [提示词](bare-generated-v2-C36-prompt.txt) | 仅去中央瓜、补其遮挡内区，保留外叶、细藤、卷须与原根架 |
| C56 酒花 | [PNG](mature-source-v2-C56.png) · [登记](mature-source-v2-C56.json) | [bare-generated-v2-C56.png](bare-generated-v2-C56.png) | [提示词](bare-generated-v2-C56-prompt.txt) | 清除全部鳞片状花球，保留原成年藤体与叶片 |
| C61 蓝靛草 | [PNG](mature-source-v2-C61.png) · [登记](mature-source-v2-C61.json) | [bare-generated-v2-C61.png](bare-generated-v2-C61.png) | [提示词](bare-generated-v2-C61-prompt.txt) | 保留原高茎、多枝框架和下中部叶序，修正 v1 截短成矮丛 |

## 每个新增 bare 的当前来源

| 稳定 ID | 当前生成来源 | 输入格位置 |
| --- | --- | --- |
| C05 | v2-C05 | 独立单株 |
| C10 | v1-01 | 第 1 行第 2 格 |
| C11 | v1-01 | 第 1 行第 3 格 |
| C23 | v1-02 | 第 1 行第 1 格 |
| C24 | v1-01 | 第 1 行第 4 格 |
| C25 | v1-01 | 第 1 行第 5 格 |
| C26 | v1-01 | 第 2 行第 1 格 |
| C27 | v1-01 | 第 2 行第 2 格 |
| C29 | v1-01 | 第 2 行第 3 格 |
| C32 | v1-01 | 第 2 行第 4 格 |
| C35 | v1-02 | 第 1 行第 2 格 |
| C36 | v2-C36 | 独立单株 |
| C39 | v1-01 | 第 2 行第 5 格 |
| C40 | v1-01 | 第 3 行第 1 格 |
| C42 | v1-01 | 第 3 行第 2 格 |
| C43 | v1-01 | 第 3 行第 3 格 |
| C44 | v1-01 | 第 3 行第 4 格 |
| C45 | v1-01 | 第 3 行第 5 格 |
| C47 | v1-02 | 第 1 行第 4 格 |
| C48 | v1-01 | 第 4 行第 1 格 |
| C50 | v1-01 | 第 4 行第 2 格 |
| C51 | v1-01 | 第 4 行第 3 格 |
| C55 | v1-01 | 第 4 行第 4 格 |
| C56 | v2-C56 | 独立单株 |
| C59 | v1-01 | 第 5 行第 1 格 |
| C61 | v2-C61 | 独立单株 |
| C63 | v1-01 | 第 5 行第 3 格 |
| C64 | v1-02 | 第 1 行第 5 格 |
| C67 | v1-01 | 第 5 行第 4 格 |
| C68 | v1-01 | 第 5 行第 5 格 |

16 项复用经实际源图审阅的成年 `growing.png`：C03、C06、C07、C08、C09、C12、C28、C30、C31、C33、C34、C46、C49、C53、C62、C65。复用依据保留在每项 `review.decision`；它们不来自本次 image_gen，也不使用初轮幼苗的较小显示比例。

## 独立成品、尺度与交接

- 新增源图为 `assets/plot/crops/<ID>/bare.png`；转换后的独立 PNG 为 `assets/plot/plants/<ID>/bare.png`；单株 WebP 为 `public/art/plot/plants/<ID>/bare.webp`。每文件一株。成熟及其它原四期没有重画。
- 新图 `repeatBare.baseScale = stages[3].baseScale × registration.scaleToMature`，其中 `scaleToMature` 是输入成熟原图进入编辑格时已登记比例的倒数。裁切时只登记一次实际根脚并保留 `expectedRoot`，不在运行时按 bbox 重居中或放大裸株。
- 复用成年原图保持成熟原图的像素尺度，`scaleToMature=1`。各根位实际 bare 显示比例为 `min(mature.baseScale × root.scale, root.maxHeight / mature.height) × scaleToMature`，连远排限高也继承成熟身体包络，不独立用 bare 的透明边界限高。
- `node scripts/export-crop-animation.mjs --draft-bare --review-repeat=<IDs>` 只生成待审成品和 `draft-visuals.json`，不激活运行 metadata、不代替审核。审核批准后正常生产入口才将 `harvestMode` 与 `repeatBare` 写入 `src/content/crop-visuals.json`；`needsArtwork` 不会仅因源文件存在而通过。
- 同根同尺度透明对照、带真实背景的 320 图与 130×138 图位于 `assets/plot/reviews/repeat-v1/`。这些是素材拼接交接图；运行仍为每根位独立 Sprite，保留植株型有独立成年 bare 基底和成熟状态层。

本轮只执行源图生成、正常生产转换及静态素材审阅。没有运行测试、检查、浏览器预览或编译。
