# 2026-11-15 综合饲料重新设计审阅

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

任务：[饲料重设计、工坊动画、清空产线与任务金币](../tasks/2026-11-15-feed-workshop-clear-task-rewards.md)。本报告只负责饲料重新设计的源图、成品和 130px 静态辨识度；不审本任务卡的其他功能，不修改动物、选择图、经济规则或游戏资源。

**当前结论：新 V8-r1 源图、PNG／WebP、全 20 阶段四帧原 130px 合成与同批静态回退的已审图片范围通过；FEED-REDESIGN-R01 按新版本复查关闭。** 用户最新反馈为“畜牧的综合饲料太不明显了，重新设计”。旧 v6-r3 的内部通过已重新打开并保留为失败历史；本轮通过只限新版本实际看图范围，不等于用户已接受或游戏运行通过。

审阅者 `livestock_feed_review` 只拥有本报告及普通静态审图责任；素材／转换／注册／共享摆位由 `livestock_feed_art` 独占。遵循 `farm-art-review` 与本次任务卡：普通图片查看、针对性像素／尺寸读取及正常底拼图允许；未执行测试、资源检查、预览、语法／运行验证、编译或推送。**未验证游戏运行与真实循环体验。**

## 旧版退回单 FEED-REDESIGN-R01

首轮判定：**旧 v6-r3 在本次用途不合格退回；现由下述 V8-r1 新版本实际图片复查关闭。** 所有者 `livestock_feed_art` 已收到具体图像证据与返工要求，PM 已同步。未将历史 CF-R01 的关闭延续到本轮用户否定后，也未继续沿旧金黄堆图仅做扩大。

旧版本精确身份：`raw/compound-feed-v6.png`、`feed.png`、`public/art/livestock/feed.webp`，presentation `v6-r3`。源图 SHA-256 `7038f463bf185c7613d5c07a20194a5c3e4fe1f2de9057de8a543a98a1b90847`，发布 WebP `d00086ea497b3bde46ec9d75e00b5be818fc812144f7299e053a2a77d2e2de9e`；此处引用前次已实际读取、冻结的哈希，不执行额外检查。

本轮重新实际打开了旧版[小型成年原 130px 条带](../../assets/livestock/reviews/choice-feed/r03-small-adult-130.png)、[肉兔三期原 130px 条带](../../assets/livestock/reviews/choice-feed/r03-rabbit-stages-130.png)、[大型成年原 130px 条带](../../assets/livestock/reviews/choice-feed/r03-large-adult-130.png)以及[独立 PNG／WebP 正常底](../../assets/livestock/reviews/choice-feed/feed-png-webp-normal-backgrounds.png)。没有把放大图的清楚代替原尺寸判定。

| 失败因素 | 130px 图像中的具体证据 | 新设计需解决的结果 |
| --- | --- | --- |
| 与地板色相／明度混合 | 金黄／棕黄谷粒与棚舍满地金黄草屑相近，堆底的浅亮点看起来仍像地板碎纹 | 整堆形成明显宽块明暗差，不依赖找到薄暗边才识别 |
| 堆体过低扁 | 旧纹理内容为 120×56，最小可见宽经 130px 缩放和景深后约 11–14px；高度只剩约数 px，低嘴再挡掉上半部 | 可见食物主体有足够高度和面积，低头 0／1 帧也不是仅露出几粒亮边 |
| 原图细节没有转成场景辨识度 | 独立 128×64 图可读玉米／颗粒，进入实际卡片后细小粒群与地板高频草屑同化 | 减少碎粒噪点，使用少数清楚的大颗粒／料块和连续堆形 |
| 单纯放大不足 | 肉兔 young 的食物相对动物并不小，但在原 130px 中仍需要刻意寻找 | 同时重设计外轮廓、暗部与浅色内容块，不能只扩大旧图 |

旧图独立原稿透明和对象曾符合当时内部条件，但本次失败是整合用途不够明显；不能拿原稿可读、文件存在、已建 Sprite、共享 helper 或旧 CF-R01 关闭抵消用户反馈。

## 已交素材所有者的具体返工要求

已直接同步 `livestock_feed_art` 与 PM：新画真实复合饲料源图，保留原稿／实际提示词和转换来源；不脚本描补旧图冒充新画。使用更明确、较有高度的连续食物堆、较厚暗轮廓，深褐颗粒块与浅谷粒、少量绿料形成可读色块，避免大面积金黄细粒继续融进金黄地板。食物自身明暗可保留，地面椭圆轻影仍独立，不烘焙进源图；不加入动物、棚舍或地面底片。

130px 候选可从每只约 18–22px 可见宽、同时有明显高度开始调图；这只是本轮审图建议，**不是用户已确认的固定尺寸**。实际判定依据是原尺寸中无需刻意寻找便能看见嘴前的食物堆，低嘴帧也有明确主体，远近各只仍独立。保持既有 3／2／1 与近大远小；嘴部、动物脚点、动物／选择图、80 张进食帧和经营规则不改。图片与轻影若调整位置，应共享同一真实堆底，正式运行与静态回退消费同一登记／helper，不能单改证据图。

## V8-r1 新原稿与独立成品复查

实际打开新原稿 [compound-feed-v8.png](../../assets/livestock/raw/compound-feed-v8.png)（1900×828），以及保留整幅原始 Alpha 的[深底](../../assets/livestock/feed-evidence/v8-r1/raw-deep-normal.png)、[浅底正常合成](../../assets/livestock/feed-evidence/v8-r1/raw-light-normal.png)。它是内置 image_gen 真正新生成原稿，以当前 L01／L02 的 V5 实际动画帧为风格输入，未修改动物。精确输入／哈希、原稿身份、裁切及尺寸见 [feed-registration-v8.json](../../assets/livestock/feed-registration-v8.json)，实际提示词见 [feed-prompts-v8.md](../../assets/livestock/feed-prompts-v8.md)。已读这些来源记录，并与实际看图版本对应。

新构图使用连续深蓝灰低沿托盘，浅米白谷粒、褐色颗粒和可见绿料分成清楚的大块；少量淡黄玉米仍属于混合饲料，但不再用金黄作为整堆主色。低沿是本次重新设计的图像组成和实现选择，**不代表用户另行确认了固定容器样式，也不新增喂养、消耗或设施玩法**。托盘自身的暗下侧与边缘属于物体结构，没有另画地面椭圆、地板底片、动物或产品；运行轻影继续独立。

已看 `assets/livestock/feed-v8.png` 与 `public/art/livestock/feed-v8.webp` 两个实际 128×64 成品及[正常底](../../assets/livestock/feed-evidence/v8-r1/feed-normal.png)。冷暗轮廓连续，米白／褐／绿分区和复合粮身份清楚；源图正常合成与成品均未见真实白雾、地面底片、可见霓虹残边或裁断主体。源图与独立成品的像素组织、内容和透明边在本次已看范围通过，不能单独据此判场景可见性。

登记纹理为 `./art/livestock/feed-v8.webp`，尺寸 `[128,64]`，内容 bounds `{x:4,y:4,width:120,height:56}`、底 anchor `[64,60]`；裁切原稿 `{left:318,top:104,width:1264,height:631}` 后最近邻转换，原稿不改。版本新 URL 与持久注册进入正式来源链；这里记录实际生产参数，不把数字当用户确认的统一规格。

## 原 130px 全阶段／静态回退复查

已实际打开 [20 阶段×4 帧完整合成](../../assets/livestock/feed-evidence/v8-r1/feeding-130-all-stages.png)和[10 项成熟四帧](../../assets/livestock/feed-evidence/v8-r1/feeding-130-mature.png)，每张卡原尺寸 130×130，四帧为 0／1／2／3。完整合成使用实际发布动物图集切出的对应阶段帧、发布 V8 饲料纹理及正式共享 `livestockFeedLayout`，没有只在审图图上摆大饲料。重点复看低嘴 0／1 帧和小型幼年，结论如下：

| ID／阶段 | 原 130px 的实际可见结果 | 判定 |
| --- | --- | --- |
| L01 adult、L03 adult | 三只各有连续冷暗盘沿和浅色粮食面；低嘴帧仍有明显完整主体，与金黄草屑分开，远近大小保留 | 已审静态范围通过 |
| L02 adult、L04 adult | 宽头／低嘴没有遮去大半饲料，嘴前仍可见盘沿、浅色粮与绿料的主体，四帧保持堆底 | 已审静态范围通过 |
| L05 adult、L09 young／growing／mature | 每期两只各有独立可辨料盘，冷暗轮廓和内部浅／绿区分开；未混成同一份公共地面贴图 | 已审静态范围通过 |
| L06 young／growing／mature | 三期嘴前都有可见饲料，幼年不丢失；抬嘴帧独立料盘保持，不随头部漂移 | 已审静态范围通过 |
| L07 young／growing／mature | 三只的幼年、成长和成熟均可立即找到各自料盘；旧版“相对动物虽大仍像地板碎纹”的问题在新冷暗轮廓中得到改善 | 已审静态范围通过 |
| L08 young／growing／mature、L10 young／growing／mature | 三期低嘴和抬嘴均有可辨主体，料盘与动物／地板分层，未靠移动脚点或嘴点获得可见性 | 已审静态范围通过 |

同次静态回退已实际看[10 项发布 WebP 原 130px 联系图](../../assets/livestock/feed-evidence/v8-r1/fallback-published-130.png)，并逐一打开 `public/art/scene-L01.webp` 至 `scene-L10.webp` 的完整 320px 发布文件；另开 `assets/source/art/scene-L01.png`、`scene-L02.png`、`scene-L07.png` 的完整来源 PNG 与对应发布图对照。每只都有本批冷暗低沿混料，3／2／1 和透视保留，发布压缩未抹掉其主体；未见本次饲料在回退中漏用旧版或遗漏。

已只读正式 `export-feed.mjs`／生产入口及共享 `livestock-layout.js`：`--feed-only` 消费 V8 注册，按当前阶段 feeding 合成独立图片／轻影，并写同批回退、visuals、atlas 身份；运行与静态都调用同一 helper。最小场景可见宽从 32 改为 52 后再乘 depth，原 130px 的基线约 17–23px；图片和轻影沿共同堆底前／下移，mouth／脚点登记不变。这些数值是本轮实现选择，源码读取解释实际图像而不单凭数字判通过；实际 loader、GPU 和画布没有执行。

**FEED-REDESIGN-R01 关闭：新 V8-r1 已见图片范围的轮廓、明暗、遮挡和尺寸均明显改善，原 130px 中各只饲料可辨。** 关闭针对新版本的饲料静态视觉，不撤销用户对旧 v6-r3 的否定，不代替用户认可，也不关闭动物／选择图的其他反馈。

## 精确版本与最终状态

| 项目 | 当前状态 | 所需实际证据 |
| --- | --- | --- |
| 新源图／风格与来源 | V8-r1 已审图片范围通过 | 真正新原稿、实际提示词、输入与裁切登记、整幅浅深正常底已实际看 |
| PNG／发布 WebP | V8-r1 已审独立成品通过 | 正式 128×64 PNG／WebP、正常边缘、内容 bounds／anchor 与持久来源已看 |
| 原 130px 合成 | V8-r1 已审静态用途通过 | 全 20 阶段 ×4 帧和成熟总览已实际看；低嘴帧、小型及幼年可辨 |
| 同 ID 静态回退 | V8-r1 已审图片范围通过 | 10 项发布 WebP 原130联系图及全部320完整文件、L01／L02／L07来源PNG已实际看 |
| 实际游戏画布／循环 | 未验证 | 本轮没有运行授权；静态图片通过不能代替真实循环、遮挡、加载或手机画布体验 |
| 用户认可 | 未取得 | 内部源图或静态合成结论不写成用户已接受 |

下表哈希仅限定实际看图版本，不证明质量。素材所有者已声明 V8-r1 冻结，源图、成品、证据保留；没有以数量、哈希或源码代替上述视觉判断。

| 文件 | SHA-256 |
| --- | --- |
| `raw/compound-feed-v8.png` | `9f6cd35c9e82603714eb7692ac53bbfdbbbd9e625a6270f994cddbca2fd881b5` |
| `feed-v8.png` | `13ffcf6c0452baf72f0c2ae77dbc093926bf91483e9ea34ed4df7b61e6bdacae` |
| `public/art/livestock/feed-v8.webp` | `57ffa8a27d9c8c31d2c16e57e0a932449fdcfe7bb7223617ad562d5e4fc07e43` |
| `feed-registration-v8.json` | `7582bd9dfc7bf09288904d3992502dffa6ab25a48a1d68a9565e297271a5af8c` |
| `feed-prompts-v8.md` | `3cac6fedacf3d705bce6f9dd11eb274fbc24ceaa106f1aac80b398640e87fc31` |
| `src/view/livestock-layout.js` | `adb932d6ae4b2fea028d9e0e34ec1dd1ec4549700fcb1e28609b2a1885beec4a` |
| `feed-evidence/v8-r1/feeding-130-all-stages.png` | `0147b2da993ea9fbae9a4b6ec8ee792b9c1a2f0db8d4af638e79b9c06b3a1314` |
| `feed-evidence/v8-r1/feeding-130-mature.png` | `4c70ba166ac3afb909fc1a87ea651a1e4acddb775f8ec9dcd1ea533e2b0117ff` |
| `feed-evidence/v8-r1/fallback-published-130.png` | `7094cda17b0a085766cd569682e1319c979bebc42036a3ffb3b12af700ed082d` |
| `feed-evidence/v8-r1/raw-deep-normal.png` | `ff3cd332081fd53a4cf9396857df039b0f2d5d50cd73bad27a7258b7764386d4` |
| `feed-evidence/v8-r1/raw-light-normal.png` | `73b18a68f66bc94b7d9af49cb94cb2847a55ab62b30feb0fdb80815798b3375b` |

本轮只改本报告，未修改旧审图报告、动物、选择图或游戏资源。没有执行测试、检查、预览、语法／运行验证、编译、发布或推送；真实循环、动态遮挡／轻影、加载卸载和用户最终认可继续保持未验收。
