# 2026-11-15 连续采收作物资源审阅

任务 C-HARVEST-AUDIT。输入为目录全部 68 个 C ID、现有 growing/mature 独立单株和实际发布资源。此表记录游戏的视觉采收策略与资源适用性；不将现实农艺中根部再生、轮作或药用部位差异擅自扩大为本轮玩法。

## 已执行的静态审阅

- 实际逐格打开六张源图 growing/mature 联系图，以及六张从 public 实际单株生成的同组联系图，范围 C01–C68。每对图片用同一缩放系数、保留原相对尺寸，仅 trim 透明边和排版，不把小苗归一成成年大小。
- 联系图位于 `assets/plot/reviews/repeat-harvest/`，分组为 C01-C12、C13-C24、C25-C36、C37-C48、C49-C60、C61-C68；源图后缀 `-growing-mature.png`，发布图后缀 `-public.png`。这些仅为静态审阅联系图，不是新原画、正式采后资源或运行纹理。
- 另直接打开 C09、C46、C49、C65 的 growing/mature 原稿，及 C23、C33、C34、C35、C36、C53、C62、C64 的 growing 原稿，细看成年木质基干、果实／花苞、枝冠与幼苗差异。
- C01 保留已认可整幅小麦例外：使用 wheat-2/3 原图及 public 的 C01-front 四期图集对应格，不虚构 C01 独立单株。

## 分类与可复用结果

显式登记已交付 `src/content/crop-harvest.json`：22 项 `wholePlant`、46 项 `retainedPlant`。其中 16 项现有 growing 可作为成年采后／待结果基底，30 项须补成年 bare 原画。没有用文件存在或单株数量替代审图。

整株／整季主体采收的 22 项保持原四期重种表现：

`C01`、`C02`、`C04`、`C13`、`C14`、`C15`、`C16`、`C17`、`C18`、`C19`、`C20`、`C21`、`C22`、`C37`、`C38`、`C41`、`C52`、`C54`、`C57`、`C58`、`C60`、`C66`。

其中艾草按本轮地上茎叶收割、苎麻／亚麻／黄麻按纤维茎、茜草按染料根、谷豆按整季主体采收处理。荞麦等旧成熟图带花，不据花色把谷物误判为摘花。叶片型持续采收对象另列 retainedPlant。

现有成年基底可复用的 16 项：

`C03`、`C06`、`C07`、`C08`、`C09`、`C12`、`C28`、`C30`、`C31`、`C33`、`C34`、`C46`、`C49`、`C53`、`C62`、`C65`。

需要补画成年采后资源的 30 项：

`C05`、`C10`、`C11`、`C23`、`C24`、`C25`、`C26`、`C27`、`C29`、`C32`、`C35`、`C36`、`C39`、`C40`、`C42`、`C43`、`C44`、`C45`、`C47`、`C48`、`C50`、`C51`、`C55`、`C56`、`C59`、`C61`、`C63`、`C64`、`C67`、`C68`。

## 逐 ID 保株资源决定

| ID | 决定 | 实际图像依据 |
| --- | --- | --- |
| C03 | reuseGrowing | 已有 growing 是完整多叶草莓冠丛，非两叶幼苗；无果，可作成株待结果基底，须沿成年根位和固定尺度使用。 |
| C06 | reuseGrowing | 已有 growing 具木质化多分枝及完整蓝莓叶冠，无果；同根保留枝干作为成年灌木基底，不使用 seedling。 |
| C07 | reuseGrowing | 已有 growing 具木质分枝和可辨完整茶丛，叶密度低于 mature，可表示采叶后的成株；不放大小苗。 |
| C08 | reuseGrowing | 已有 growing 具完整桂花木质分枝和成株叶冠，无花，可保留基干进入开花状态。 |
| C09 | reuseGrowing | 直接开图确认 growing 为完整木质可可树及垂叶冠，非小苗，未挂果；可用作成年无荚基底。 |
| C12 | reuseGrowing | 已有 growing 具完整木质栗树分叉及成形叶冠，无栗球；可作成树无果阶段。 |
| C28 | reuseGrowing | 已有 growing 具完整木质树干、多枝及金柑叶形，无可见果；可作保留枝干的成株。 |
| C30 | reuseGrowing | 已有 growing 具完整木质分叉和大叶冠，无果；可作成年香柚待结果基底。 |
| C31 | reuseGrowing | 已有 growing 的木质树干和多簇枇杷长叶构成完整成株，无果；保留成年根位使用。 |
| C33 | reuseGrowing | 直接开图确认 growing 已开紫花并有完整分枝大叶，是可结茄的成株而非小苗；允许无果时保留花。 |
| C34 | reuseGrowing | 直接开图确认 growing 已有花序和完整番茄枝叶，是成株无果状态；不以 seedling 替代。 |
| C46 | reuseGrowing | 直接开图确认 growing 有完整木质芒果分叉和浓密长叶冠，无果，足作成年基底；不得独立 fit 放大到比成熟树更大。 |
| C49 | reuseGrowing | 直接开图确认 growing 有完整木质主干、分枝和成形坚果树冠，无坚果，可作成年基底。 |
| C53 | reuseGrowing | 直接开图确认 growing 有完整基生叶丛及花蕾，非小苗；可作采开放花后的待开花成株，花蕾不等同已采收开放花。 |
| C62 | reuseGrowing | 直接开图确认 growing 是完整分枝羽状叶植株，无开放花，可保留成株进入开花。 |
| C65 | reuseGrowing | 直接开图确认 growing 是成年薰衣草基生叶丛和木质基部，成熟新增的是花穗；采花后回到基丛合理。 |
| C05 | needsArtwork | growing 的稀疏树冠和细分枝与成年苹果树不同，需要保留 mature 树干树冠去果，不能放大稀疏小树。 |
| C10 | needsArtwork | growing 是较小细藤，缺成熟藤蔓和叶量；需成年无荚完整香草藤。 |
| C11 | needsArtwork | growing 树冠明显更疏、枝干较细；需以成熟樱桃树树体去果补画。 |
| C23 | needsArtwork | growing 冠层与成熟树体仍不完全对应，且绿色圆形部位难确认为纯叶；不能作为已摘净成年梨树，需补无果图。 |
| C24 | needsArtwork | growing 是稀疏细干幼树，缺成年白桃树分枝冠幅；需保留成熟树体去果。 |
| C25 | needsArtwork | growing 是稀疏细枝，缺成年蜜柑树冠；不能放大为成树。 |
| C26 | needsArtwork | growing 细长分叉与成熟柿树厚干叶冠不同；需成年无果图。 |
| C27 | needsArtwork | growing 稀疏细枝与成熟青梅树冠不同；需成年无果图。 |
| C29 | needsArtwork | growing 是绿色细茎，成熟已有木质枝干和更大叶冠；需成年无果无花果树体。 |
| C32 | needsArtwork | growing 叶量及枝干形态弱于成熟花梨树；需成熟同树体无果图。 |
| C35 | needsArtwork | 直接开图确认 growing 为少叶小苗，不能替代成熟青椒枝叶，需成年去椒图。 |
| C36 | needsArtwork | 直接开图确认 growing 只有两叶小藤，不能作成年南瓜藤，需保留成熟藤叶去瓜图。 |
| C39 | needsArtwork | growing 只有少量紫苏叶，缺成年多分枝；需采叶后仍保持成年根茎分枝的资源。 |
| C40 | needsArtwork | growing 是少枝小株，缺成年山椒多分枝叶冠；需成年去果图。 |
| C42 | needsArtwork | growing 是较小菠萝叶丛，成熟叶丛及果梗更大；需成年去果叶盘，不能放大小叶丛。 |
| C43 | needsArtwork | growing 是少叶细干香蕉苗，不能作成年香蕉主干；需成熟同主干去蕉串。 |
| C44 | needsArtwork | growing 是少叶青柠苗，缺成年树冠；需成熟同树体去果。 |
| C45 | needsArtwork | growing 是幼小椰苗，不能作成年厚干椰树；需成熟同树体去椰果。 |
| C47 | needsArtwork | growing 虽开花但藤体和枝叶显著小于成熟百香果藤；需成年无果藤体，不用细藤放大。 |
| C48 | needsArtwork | growing 为较少枝带花苞株，成熟枝冠及茎干更大；需成年火龙果去果株。 |
| C50 | needsArtwork | growing 是单一小叶丛，成熟为分蘖大丛；需采叶后成年根冠资源。 |
| C51 | needsArtwork | growing 带未成熟绿色棉蕾且枝冠较小；需成年棉株摘棉后枝叶，不能用带幼蕾小株顶替。 |
| C55 | needsArtwork | growing 是较细绿色藤，成熟具木质主干和大叶冠；需成年葡萄藤去果。 |
| C56 | needsArtwork | growing 少叶细藤与成熟多枝浓叶不同；需成年酒花藤去花球。 |
| C59 | needsArtwork | growing 是明显幼小剑麻叶盘；需成年采外叶后保留中部叶盘，不能放大小株。 |
| C61 | needsArtwork | growing 少分枝，成熟已有更多高枝；需采叶后保留成年枝架，不回幼株。 |
| C63 | needsArtwork | growing 为单干少叶薄荷苗，成熟多茎茂密；需成年采叶后保留枝茎。 |
| C64 | needsArtwork | growing 是少叶幼基丛，成熟基丛与花梗结构更丰富；需成熟同叶丛去花图。 |
| C67 | needsArtwork | growing 是细干稀疏梨苗，不能作成熟酿酒梨无果树；需同成年树体。 |
| C68 | needsArtwork | growing 是少枝桑苗，不能作成年桑树叶冠；需成熟同树体去果。 |

## 下游契约与完成边界

- 每项字段为 `{mode, harvestedPart, repeatBare:{status,sourcePath,reusePhase}, review:{growingSource,matureSource,decision}}`。wholePlant 为 `notApplicable`；可复用项为 `reuseGrowing` 并指向现有 growing.png；补画项为 `needsArtwork` 并预留 `assets/plot/crops/<ID>/bare.png`。
- `needsArtwork` 不代表文件已交付或可发布。素材所有者提供精确源稿和成品，经实际复查后才由审阅所有者改为 `approvedArtwork`；导出器不能因裸图文件存在自行批准。
- `reuseGrowing` 的含义是原图本身具成年基干／叶丛或已开花的成株形态。不得复用 seedling，也不得重新 fit 放大小树来冒充成年。重复轮使用同一根位及固定成熟身体尺度；不能因去果透明边改变，令采后树干反而变大。
- 复用项有独立原稿的枝叶细节差别，未宣称与 mature 逐像素同树冠。运行时保留基干、果花差异层、根位与透视的实际切换仍由 C-REPEAT 交付并另行记录，不能由本审阅表宣布无闪变。
- 30 项补画应保持对应 mature 的成年根脚、主干／根冠、主要分枝与冠幅，去掉本项采收物，叶采收对象保留成年枝架或中部叶盘；禁止拿稀疏幼苗放大或伪造原画。

## 补画首批精确源稿静态复审（crop_retained_review）

2026-11-15 接手 manifest 与本报告。首批 25 项已打开实际成熟输入 `assets/plot/repeat-harvest/mature-source-v1-01.png`、对应来源／格位登记 `mature-source-v1-01.json`、生成原稿 `bare-generated-v1-01.png`、其提示词及整张最近邻还原到输入格尺寸的 `bare-generated-v1-01-normalized.png`。原稿 5×5 每格只有一株，未使用幼苗放大替换成年株。

已逐格看正常灰底源稿对照：`assets/plot/reviews/repeat-harvest/bare-source-v1-01-row1-normal.png` 至 `row5-normal.png`。每格保持源输入的 320×320 空间和统一整张缩放，仅排成成熟／采后两栏；没有逐株 fit。查看器黑底上的绿黄亮点在正常 Alpha 合成时不显示，不据低 Alpha RGB 误显退稿。

| 源稿行 | ID | 源稿层结论与剩余项 |
| --- | --- | --- |
| 1 | C05、C10、C11、C24、C25 | 成年主干／藤体和冠幅保持，果实／香草荚与花已去除；源稿条件通过，固定根脚成品与实际小尺寸待审。 |
| 2 | C26、C27、C29、C32、C39 | 果实已去除；C39 采去上部紫苏叶尖，保留下部叶与成年分枝；源稿条件通过，固定根脚成品与实际小尺寸待审。 |
| 3 | C40、C42、C43、C44、C45 | 山椒果、菠萝果与果冠、香蕉、青柠、椰果已去除，成年根冠／主干仍在；源稿条件通过，固定根脚成品与实际小尺寸待审。 |
| 4 | C48、C50、C51、C55、C56 | 火龙果、棉、葡萄、酒花已去除；C50 保留成丛基部与中央叶，采部分外叶；源稿条件通过，固定根脚成品与实际小尺寸待审。 |
| 5 | C59、C61、C63、C67、C68 | C59 保留中央成年叶盘，C63 保留多茎与下部叶，梨／桑果已去除；C61 去花穗与上梢后仍保留成年下部多分枝，最终同尺度配对须重点复查其枝架及根脚；全部仍待最终成品。 |

逐项证据写在 `review.retainedStaticReview`，状态为 `awaitingExportEvidence`。此时没有将任何 `needsArtwork` 改为 `approvedArtwork`。其余 C23、C35、C36、C47、C64 的第二批原稿，以及全部 46 项最终 bare／mature 同根同尺度 PNG／WebP 和 130×138 静态小尺寸证据待素材所有者交付。

## 最终成品首轮静态复审

已实际打开第二批 `bare-generated-v1-02.png`、对应成熟输入／来源 JSON、提示词及正常灰底 `bare-source-v1-02-row1-normal.png`，覆盖 C23、C35、C36、C47、C64。C64 去花后保留三支成年高花梗；C36 虽是成年藤体，最终配对暴露外形偏移，按下表退回。

随后逐项打开全部 46 项裸株 PNG、发布 WebP 与成熟 WebP 的联系页 `assets/plot/reviews/repeat-harvest/final-artifacts-v1-page1.png` 至 `page8.png`。每行三栏分别为实际 PNG、实际 WebP、成熟 WebP；仅用成熟源像素尺度比与各自已登记根脚配对，不逐株 fit。另逐项打开成熟限高包络修正后重新生成的 `final-actual-size-v1-all.png`，每项为实际 130×138 的裸／熟静态场景。生产入口的配对图按源 PNG→发布 WebP 链消费，普通读取登记确认裸株限高取成熟 `height`，避免低 Alpha 外围扩大纹理后错误改变身体尺度；数值本身未代替看图。

静态首轮判定：26 项补画成品通过，`repeatBare.status` 改为 `approvedArtwork`；16 项复用成品通过本轮静态适用性，保留 `reuseGrowing` 并登记 `approvedReuse`；4 项补画退回，仍为 `needsArtwork`。逐 ID 精确来源、PNG／WebP、配对、实际小尺寸与结论已记录在 `review.retainedStaticReview`。

通过的补画项：C10、C11、C23、C24、C25、C26、C27、C29、C32、C35、C39、C40、C42、C43、C44、C45、C47、C48、C50、C51、C55、C59、C63、C64、C67、C68。果／荚／棉／花采净，成年基干／根冠与主要形体仍在；叶采收对象保留成年分枝、中央叶盘或下部叶。正常灰底未见实际底色、可见污染或有效轮廓截断。黑底绿黄亮点属于低 Alpha RGB 误显。

复用 16 项全部通过静态适用性；它们是已有独立 growing 原稿，枝叶密度、叶序与 mature 存在可见差别，C12、C28、C30、C31 等尤其较疏。它们保持成年基干与原像素尺度，不是小苗放大；本结论没有宣称逐像素同冠或实际过渡无闪变。C33／C34 的采收物是果实，允许留花；C53 的采收物是开放花，允许留花蕾。

PM 交接的实际运行结构为成年 `bare` 底层常驻，再叠加整株 `mature` 纹理显隐；没有独立抽出的果／花差分纹理。因此本报告不使用“精准差分层”或“只显隐果花”描述该实现，也不把静态通过推断为叠加无外圈、叶冠完全不变或动态通过。16 项独立复用原稿尤其保留这项限制。

## 退回单 C-REPEAT-01 至 C-REPEAT-04

共同任务／用途为本轮 retainedPlant 成年采后裸株。判定为不合格退回；接手所有者 `crop_scale`，已同步 PM。精确版本为 `bare-generated-v1-01`（C05、C56、C61）和 `bare-generated-v1-02`（C36）。认可参考为各自原 `assets/plot/crops/<ID>/mature.png` 与冻结输入格登记；失败条件为本轮只改变采收部位、保留成熟成年主干／枝架／冠幅及根脚。原稿、逐格 PNG 快照与提示词保留在 `assets/plot/repeat-harvest/`。

| 退回单 | ID／采收物 | 实际可见失败证据 | 重绘要求 |
| --- | --- | --- | --- |
| C-REPEAT-01 | C05／果实 | `C05-artifacts-v1-zoom2.png`：同成熟尺度同根位，裸冠更宽、下沿更多外侧叶片；常驻裸株叠成熟可能留下外轮廓。 | 从精确原成熟苹果树去果，仅补果实遮挡内部；保留原外侧叶、冠幅、主干和根脚，不用 bbox 缩放掩盖。 |
| C-REPEAT-02 | C36／果实 | `C36-artifacts-v1-zoom2.png`：左／上叶团外扩，卷须、叶、藤关系重排；原画实际根脚相对输入从 x160 变为 x171。 | 从原成熟藤去中央瓜，只补被瓜遮挡处，保留原外侧叶、卷须及成年藤架。 |
| C-REPEAT-03 | C56／花球 | `C56-artifacts-v1-zoom2.png`：上右叶下仍有悬垂鳞片状花球轮廓，无法作为清楚采净花球的状态。 | 精准去净该花球，其余成年叶／藤／根脚保持，不用滤镜或脚本擦画。 |
| C-REPEAT-04 | C61／叶片 | `C61-artifacts-v1-zoom2.png`：上部成年高枝大段消失，重新组织为矮宽枝丛；保留下部成年基部不足以满足保留成熟枝架。 | 从原成熟多茎架采嫩叶、去花穗，保留原高茎框架和下部叶序，不缩成低灌丛。 |

上表放大证据均位于 `assets/plot/reviews/repeat-harvest/`，使用最近邻 2×。修订须保留旧稿并交新版本、精确编辑输入／提示词、新 PNG／WebP、同根同成熟尺度配对和 130×138 静态图后逐项复查；尚未根据所有者报告或文件存在关单。

## 四项 v2 定向修订复查与最终静态结论

2026-11-15 已实际逐项打开四项 `assets/plot/repeat-harvest/bare-generated-v2-<ID>.png` 精确原稿、对应 `-prompt.txt`、从原 mature 单株构成的 `mature-source-v2-<ID>.png/.json` 编辑输入及 `-normalized.png`。规范化为整张固定 320×320 来源空间，不按裸株有效轮廓独立 fit；source-space 注册和成熟源尺度沿 `draft-visuals.json` 登记。

已逐项打开以下正常 Alpha 合成证据，全部位于 `assets/plot/reviews/repeat-harvest/`：`revision-v2-source-pairs.png`（成熟编辑输入／生成源稿）、`revision-v2-artifacts.png`（精确裸 PNG／裸 WebP／成熟 WebP）、`revision-v2-artifacts-zoom2.png`（最近邻 2×）、`revision-v2-actual-size.png`（四项各自的 130×138 裸／熟静态场景）。对应 runtime 素材仍为 `assets/plot/plants/<ID>/bare.png` 和 `public/art/plot/plants/<ID>/bare.webp`；旧原稿、首轮成品联系图与退回证据均保留。

| 退回单 | ID | v2 实际图像复查结论 |
| --- | --- | --- |
| C-REPEAT-01 | C05 | 通过。无苹果；不规则上冠、原外侧叶轮廓与下沿恢复，成年主干／根脚保留，未采用首版更宽的圆密冠。 |
| C-REPEAT-02 | C36 | 通过。只去中央瓜，原外侧大叶、上叶团和卷须保留；内侧为细藤／空隙，成年蔓体未改成新叶丛。 |
| C-REPEAT-03 | C56 | 通过。三处成熟花球及上右可疑鳞片挂物已全去净，四片主要成年叶与弯曲藤体可辨，透明孔洞正常。 |
| C-REPEAT-04 | C61 | 通过。去花／少量嫩叶后保留原高中央茎、右斜高茎和下部多茎架，不再是首版矮宽灌丛。 |

四项最终 PNG／WebP 的轮廓完整、无可见底色或有效部位裁断；正常合成未出现黑底查看器的绿黄低 Alpha RGB 误显。根位与成熟源尺度配对完成本轮静态适用性复查，不能据此宣布运行切换无闪变。

最终静态状态：30 项补画均为 `approvedArtwork`，16 项复用保留 `reuseGrowing` 且 `review.retainedStaticReview.status` 为 `approvedReuse`；22 项整株采收分类未改。四张退回单以 v2 静态证据关单，逐 ID `resolvedRejections` 保留旧版本和失败证据，未变的 42 项没有重复重审。此结论只覆盖本轮来源／成品及静态尺寸，不代替用户认可与真实运行动画验收。

## 未验收与权限

本轮已完成现有素材逐项分类，以及 46 项裸株来源／PNG／WebP／固定尺度与实际小尺寸静态复审；四项退回已按 v2 关单。连续采收实际运行、常驻成年 bare 底层叠加整株 mature 纹理显隐的叶冠效果、真实循环与闪变、存档保留首轮相位、离线与切换均未验收。没有运行测试、资源检查、浏览器预览、语法／运行验证、试编译、构建或推送。联系图生成仅为获准的普通静态素材转换。

