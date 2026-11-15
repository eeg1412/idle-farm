# 2026-11-15 牲畜抬头选择图与共用复合饲料审阅

任务：[牲畜展示图与复合饲料图层](../tasks/2026-11-15-livestock-choice-feed.md)。审阅者 `livestock_feed_review` 只审本轮选择图与饲料图片、离线审图合成；素材所有者 `livestock_feed_art` 负责原画、转换、登记，`livestock_feed_runtime` 负责实际加载和实例消费。

**当前结论：选择 V7 与饲料 v6-r3 的已审静态图片范围通过；CF-R01 关闭。** 用户最新明确要求“输入现在牲畜的动画帧图片，重新生成牲畜普通图，图标统一”。此前 V4 复用结论已重新打开并仅留历史；本次已逐 ID 实际对照当前 V5 的 0／3 帧、新 image_gen 原稿、96px PNG／WebP 和 32px 实际发布图，V7 的脸型、毛色、角耳、主要身体比例与当前动画身份对应，抬头且完整可辨。饲料未变部分不重复审阅。此为内部静态图片结论，不等于用户已接受整批；未验证游戏运行与真实循环体验。

## 本轮范围与依据

- 用户追加 9 及后续纠正：牲畜选择例图需抬头展示；用户已明确否定复用 V4，须将当前 V5 动画真实 adult／mature 帧作为内置 image_gen 输入，重新生成普通抬头图，统一脸型、毛色、角耳、比例与当前动画身份。独立新选择来源应持久登记，不能再次导出时恢复为低头进食首帧。
- 用户追加 10：全部牲畜动画使用共用复合饲料图片，解决像吃地板。每只动物各有一份，按既有 3／2／1 站位与透视放在嘴前；饲料和轻影独立，不烘焙进动物图。
- 本轮明确例外优先于旧技能中“无 feed 纹理”的历史约定。V5 的 80 张真实进食帧、物品图、动物／产品阴影与原时序保持；选择图以当前 V5 实际帧为输入重新绘制，已否定的 V4 复用不再作为活跃选择来源。
- 风格认可来源：用户对 [V4 黑猪样稿](../../assets/livestock/raw/pixel-v4-black-pig-style.png) 回复“就这个风格”；认可只针对方向，不代表本轮整批成品或运行已获用户认可。
- 选择用途按既有实际消费者为 32×32；资源本身为 96×96。动画本轮以 130px 离线审图卡合成核对饲料可见性；该合成不冒充真实手机画布。
- 本报告遵循 `farm-art-review` 及畜牧交付清单。只进行普通源图／成品查看、针对性像素／尺寸／来源读取及离线审图拼图；未执行测试、资源检查、预览、语法／运行验证、编译或推送。

## 历史 V4 复用参考（用户已否定此选择图方向）

以下全幅与成品确已看图，保留证据和当时内部判定；用户后续明确要求当前动画输入重画，本节不作为现行选择图通过依据。

| ID／对象 | V4 抬头来源 | 预期选择阶段 | 已见参考特征 |
| --- | --- | --- | --- |
| L01 蛋鸡 | `raw/pixel-v4-accessories.png` row 0 | adult | 头抬起，红冠、喙、分组羽毛与尾扇可辨 |
| L02 奶用水牛 | 同源 row 1 | adult | 抬头口鼻、弯角、耳、尾与乳房完整 |
| L03 麻鸭 | 同源 row 2 | adult | 头颈抬起，橙喙、褐羽与翼部蓝白色块可辨 |
| L04 奶山羊 | 同源 row 3 | adult | 长角、耳、胡须与尾完整，口鼻未贴地 |
| L05 产蛋鹅 | 同源 row 4 | adult | 长颈抬起，白羽、橙喙与脚可辨 |
| L06 黑猪 | `raw/pixel-v4-pig-r2.png` row 2 | mature | 粉鼻、竖耳、卷尾及蹄完整，口鼻抬起 |
| L07 肉兔 | `raw/pixel-v4-rabbit.png` row 2 | mature | 长耳、口鼻、尾与后腿体块完整 |
| L08 肉用绵羊 | `raw/pixel-v4-sheep.png` row 2 | mature | 抬头脸部、耳、分组羊毛与蹄完整 |
| L09 番鸭 | `raw/pixel-v4-muscovy.png` row 2 | mature | 抬头红脸、黑白羽、喙与尾完整 |
| L10 肉用黄牛 | `raw/pixel-v4-cattle.png` row 2 | mature | 抬头口鼻、角、耳与尾完整 |

已打开上表六张全幅原稿与黑猪认可参考。部分原稿在黑底查看器的极低 Alpha RGB 呈红黄色，不单凭误显判实际残边；本轮仍需看正常底合成与最终 PNG／WebP。V4 原稿是复用来源，不是本轮新画；选择裁切格和转换参数以本轮持久登记为准，不能从本表推定生产者已正确消费。

## 首轮成品静态复查（V4 选择结论已重开，feed 独立保留）

已实际查看以下本轮证据：

- [全部 96px PNG／WebP 正常底对照](../../assets/livestock/reviews/choice-feed/choices-png-webp-96.png)、[32px 实际尺寸](../../assets/livestock/reviews/choice-feed/selection-icons-32.png)和[4 倍最近邻](../../assets/livestock/reviews/choice-feed/selection-icons-32-enlarged.png)。L01–L10 全部抬头；鸡冠、牛角、鸭翼色块、山羊胡须／角、鹅长颈、黑猪粉鼻／卷尾、兔长耳、羊毛团、番鸭红脸和黄牛体色仍可区分。完整角、耳、尾、脚均保留，选择图无棚舍／饲料／烘焙地面影，也未使用低头动画首帧。**当时内部仅按抬头／辨识度判断通过；用户明确否定 V4 复用后此交付结论已重开，不能据此认定与当前动画统一或本轮选择图已合格。**
- 新原稿 [compound-feed-v6.png](../../assets/livestock/raw/compound-feed-v6.png) 及[浅底](../../assets/livestock/reviews/choice-feed/feed-source-0.png)、[深底正常合成](../../assets/livestock/reviews/choice-feed/feed-source-1.png)。混合玉米粒、浅色谷物、褐色颗粒、少量草叶形成有轮廓的低堆；色块、阶梯边和离散明暗与本轮像素动物相容，无动物、食槽、地面底片或烘焙椭圆影。正常合成未见白雾、实际霓虹残边或透明孔洞污染。**原稿本身静态范围通过，不要求因运行缩小问题重画原稿。**
- `assets/livestock/feed.png`、`public/art/livestock/feed.webp` 及[128×64 PNG／WebP 浅深底对照](../../assets/livestock/reviews/choice-feed/feed-png-webp-normal-backgrounds.png)。独立纹理的粮粒、堆形与透明边清楚，WebP 没有破坏其用途。**独立成品静态范围通过；该结论不延伸为 130px 场景可见性通过。**
- [首轮 130px 四帧合成留档](../../assets/livestock/reviews/choice-feed/r01-feeding-130-four-frames.png)，四帧顺序 0／1／2／3、每行 L01–L10 成熟动物，直接使用共享 `livestockFeedLayout` 与发布饲料纹理。L01、L03、L07 的三只小型动物嘴前，粮堆只剩少量金黄像素；L05／L09 两只布局也偏弱，部分大型动物的堆体被头部遮住。详见下述退回单，不能以原图清楚或每只已建 Sprite 判用户问题已解决。

历史复用选择来源为 [choice-registration-v6.json](../../assets/livestock/choice-registration-v6.json)，10 项均逐 ID 指向上表 V4 成年／成熟首格，记录 `sourceCell` 和精确 `rectangle`；原稿不修改，沿既有 Alpha 200 隔离、紧裁后最近邻缩至 88px 内再放入透明 96px。**该复用方案已被用户否定，现已由后述 V7 真实新原稿替换。** 历史提示词／复用说明在 [choice-feed-prompts-v6.md](../../assets/livestock/choice-feed-prompts-v6.md)；feed 新原稿的生成来源及实际转换登记在 [feed-registration-v6.json](../../assets/livestock/feed-registration-v6.json)。实际生产执行链由 PM 审阅，静态审图不代跑导出检查。

### 退回单 CHOICE-FEED-CF-R01

- 首轮判定：**不合格退回；现已按第三版实际图像证据关闭，见下节。** 失败对象为首轮 130px 实际尺寸的全局饲料布局／可见性，重点 L01 蛋鸡、L03 麻鸭、L07 肉兔，以及 L05／L09。
- 精确版本：[r01-feeding-130-four-frames.png](../../assets/livestock/reviews/choice-feed/r01-feeding-130-four-frames.png)，SHA-256 `04cc437e7b82f452880a3e7af9769c6fb5709c32c6ac576ca95dfc53e8582523`。另保留 [L01 最近邻整卡](../../assets/livestock/reviews/choice-feed/r01-L01-card-nearest4x.png)、[L03](../../assets/livestock/reviews/choice-feed/r01-L03-card-nearest4x.png)、[L07](../../assets/livestock/reviews/choice-feed/r01-L07-card-nearest4x.png)作为定位资料；放大图不代替 130px 的失败证据。
- 失败条件：用户要求复合饲料清楚可见、与地板分离且在每只动物嘴前；首轮小型动物嘴前只有约 6–8px 的黄色点，与金黄地板纹理难分，仍呈吃地板。独立原稿清楚，未发现必须重画的原稿形体／透明问题。
- 因果定位：首轮 helper 最小可见宽 38 是动物局部单位，随后再乘 small 的 `0.48` 和景深 `0.82／1／1.08`。在 130px 卡中最远宽约为 `38×0.48×0.82×130÷320 ≈ 6.1px`，最近约 8px。这个源码读取解释现象，不单凭数值判失败。
- 影响：共用图片虽已加载，但未达到本次新增的视觉目的；不能靠文件／字段存在或扩大审图图片宣布已解决。
- 所有者：已直接退回 `livestock_feed_runtime` 修实际共享 helper／定位；`livestock_feed_art` 同步生产回退与四帧合成。若修订后仍为原稿对比问题，再依新图证据退素材所有者用内置 image_gen 修订；审阅者不私改图或登记。
- 修复要求：保持每只独立图片／轻影、嘴前关系、3／2／1 与近大远小、透明动物原图、V5 全部真实进食帧、物品和原时序；让 130px 卡中的粮堆可辨认，避免被头部完全遮住。不能只改证据图。重交全 20 阶段的四帧离线合成（含肉用五种 young／growing）、更新后的同 ID 回退及真实共享消费代码后复查。

### CF-R01 第二版复查：继续退回

已实际打开并留档 [第二版成熟四帧](../../assets/livestock/reviews/choice-feed/r02-feeding-130-four-frames.png)与[全 20 阶段四帧](../../assets/livestock/reviews/choice-feed/r02-feeding-130-all-stages.png)，同时查看 [L01](../../assets/livestock/reviews/choice-feed/r02-L01-card-nearest4x.png)、[L02](../../assets/livestock/reviews/choice-feed/r02-L02-card-nearest4x.png)、[L07](../../assets/livestock/reviews/choice-feed/r02-L07-card-nearest4x.png)最近邻定位图。第二版 helper 引入基础动物尺度，最小可见场景宽 32 后再保留 depth，修复 small 基础尺度二次压缩；这里的 32 是实现选择，不是用户规格。

**第二版当时 CF-R01 继续打开。** 小型饲料确有扩大，但前三帧多数堆体仍在低头下被遮住；水牛首／二帧亦几乎看不到完整堆形。抬嘴后部分饲料能出现，说明不是纹理缺失，实际嘴与堆体的位置关系仍阻碍可见性。已再次直接退回运行所有者，要求明确嘴接触与堆底的位置、图片和独立轻影同移，并由素材所有者通过同一 helper 同步回退／全阶段合成；未要求凭此重画已清楚的原稿。

### CF-R01 第三版 v6-r3 复查与关闭

精确生产证据冻结在 [choice-feed-evidence/v6-r3](../../assets/livestock/choice-feed-evidence/v6-r3/feeding-130-all-stages.png)，本审阅另保留 [成熟四帧快照](../../assets/livestock/reviews/choice-feed/r03-feeding-130-four-frames.png)及[20 阶段四帧快照](../../assets/livestock/reviews/choice-feed/r03-feeding-130-all-stages.png)。已逐行查看全 20 阶段的 0／1／2／3 四帧，并将 [L01／L03／L07 小型原 130px](../../assets/livestock/reviews/choice-feed/r03-small-adult-130.png)、[L07 三期原 130px](../../assets/livestock/reviews/choice-feed/r03-rabbit-stages-130.png)、[L02／L04／L10 大型原 130px](../../assets/livestock/reviews/choice-feed/r03-large-adult-130.png)裁成紧凑条带，再看原尺寸；最近邻图只用于定位边缘，没有用放大后的清楚替代原尺寸判定。

第三版沿用同一饲料原稿／PNG／WebP，实际共享 helper 保留第二版最小场景宽与 depth，将堆底沿嘴的朝向前移可见宽的 0.2、下移可见高的 0.55；图片和轻影同移，原 mouth／脚点未改。这里的 32／0.2／0.55 是本轮实现选择，不是用户固定参数。原稿未因布局缺陷被无依据地重画。

| ID／阶段 | 已见第三版 130px 四帧图像证据 | 结论 |
| --- | --- | --- |
| L01 adult、L03 adult | 三只各有嘴前粮堆，暗色阶梯轮廓与地板分开，远处较小、近处较大；低头前三帧仍能见堆形 | 静态合成通过 |
| L02 adult、L04 adult | 低头宽嘴不再遮住大部分堆体，嘴前下方有清楚复合颗粒堆；没有把嘴或脚抬移来迁就饲料 | 静态合成通过 |
| L05 adult、L09 young／growing／mature | 每只各一堆，2 只布局与景深保留；低头／抬头四帧仍保持同一堆底 | 静态合成通过 |
| L06 young／growing／mature | 三期嘴前独立堆体可见，幼年未丢失饲料；成年抬嘴时粮堆留在相同地面位置 | 静态合成通过 |
| L07 young／growing／mature | 每期三只各有可见小堆，近远独立；幼年、成长并未沿用成年嘴点 | 静态合成通过 |
| L08 young／growing／mature、L10 young／growing／mature | 三期嘴前有可辨堆形，成年原先被宽头遮挡的问题已改善；没有整片地面底图或饲槽混入 | 静态合成通过 |

同次实际回退已审 [10 项来源 PNG 的 130px 联系图](../../assets/livestock/reviews/choice-feed/r03-fallback-source-130.png)及[10 项发布 WebP 的 130px 联系图](../../assets/livestock/reviews/choice-feed/r03-fallback-published-130.png)，并打开 `assets/source/art/scene-L02.png`／`public/art/scene-L02.webp`、`scene-L07` 对应的完整 320px PNG／WebP。每只都有同批复合饲料，透明动物层与饲料未混成选择图，棚舍、完整动物和 3／2／1 布局保留；发布 WebP 未把嘴前粮堆抹掉。回退为完整场景，允许合成地面和独立影，不把它误当应透明的动物资源。

**CF-R01 关闭：v6-r3 已见 130px 全阶段合成和同批静态回退中的饲料可见性通过。** 关闭只限静态图片，不证明 PixiJS 实时加载、300ms 连续循环、淡变、轻影动态图层或实际手机画布已通过；这些仍未运行验收。

## 冻结接口与待复查证据

纹理接口为 `visual.feedTexture = { path: './art/livestock/feed.webp', size: [128,64], bounds: {x:4,y:4,width:120,height:56}, anchor: [64,60] }`，加载为 `textures.feed`。最终 `livestockFeedLayout(feeding, feedTexture, baseAnimalScale)` 以 `max(2*radiusX,32/baseAnimalScale)` 保持最小场景可见宽，再应用原动物尺度与景深；堆底采用上节前移／下移，轻影同位并保持独立 Alpha 0.2。已只读实际 `livestock-layout.js`、最终 feed 注册和 atlas 的 `animalIcon`／`facilityScene`／feed 身份，记录 v6-r3 来源与回退哈希。实际 loader／实例执行链仍由 PM 整合审阅，接口齐全不证明运行画布视觉通过。

| 用途 | 当前状态 | 复查所需证据 |
| --- | --- | --- |
| 10 项抬头选择图 | V4 复用被否定；V7 新稿已审静态范围通过 | 当前 V5 真实 0／3 帧输入→新原稿→96px PNG／WebP→32px 发布图逐 ID 已实际看；真实选择网格和用户认可未验收 |
| 共用复合饲料原稿 | 已审静态范围通过 | 内置 image_gen 新原稿／提示词／正常底合成已实际看；不扩大为场景通过 |
| 128×64 饲料成品 | 已审独立成品范围通过 | PNG／WebP 正常合成已实际看，实际 130px 可见性另列 |
| 130px 每只独立饲料 | v6-r3 已审静态合成通过，CF-R01 关闭 | 全 20 阶段四帧已实际看；每只嘴前粮堆、3／2／1 和透视保留；动态仍未验收 |
| 同 ID 静态回退 | v6-r3 已审静态范围通过 | 10 项来源／发布 130px 联系图和 L02／L07 完整 PNG／WebP 已实际看；不冒充逐项运行验收 |
| 实际游戏运行 | 未验证 | 仅按用户明确授权另行验收；本轮静态证据不能证明循环、加载、选择网格或画布体验 |

## 选择图重新打开：当前 V5 输入基准

用户否定 V4 复用后，已实际打开当前 `assets/livestock/animals/<ID>/<adult 或 mature>-0.png` 与 `-3.png` 共 20 张透明动物 PNG 的[普通底身份联系图](../../assets/livestock/reviews/choice-feed/v7-current-v5-input-pairs.png)。这些是当前实际动画输入，联系图仅为审阅紧裁／等比缩放，不改源图、脚点或发布动物图集。不能只让新图抬头而继续沿 V4 的脸型／毛色／头身比例。

| ID | 当前实际输入阶段／帧 | 新普通图必须对照的当前身份特征 |
| --- | --- | --- |
| L01 | adult 0／3 | 棕色鸡羽、暖棕分组尾羽、红鸡冠／垂肉、金黄脚；不能继续使用 V4 白鸡 |
| L02 | adult 0／3 | 深灰黑水牛、宽厚躯干、弯角、宽口鼻与当前耳位／头身比例 |
| L03 | adult 0／3 | 当前褐羽与浅色颈脸纹、分组翼羽、橙喙脚；不从旧稿擅补蓝翼 |
| L04 | adult 0／3 | 奶白山羊、当前长体形、瘦长口鼻、后弯角、耳与胡须比例 |
| L05 | adult 0／3 | 白鹅、长颈、当前身体羽块与橙喙脚；抬头保留鹅的颈／身体关系 |
| L06 | mature 0／3 | 深灰黑猪、粉鼻、短竖耳、卷尾、当前长躯干与头部比例 |
| L07 | mature 0／3 | 灰褐兔、粉耳内侧、灰色背／侧体块与短尾；不能继续使用 V4 奶白兔 |
| L08 | mature 0／3 | 奶白毛团、浅褐脸／耳和蹄，保留当前成熟羊毛体积与脸比例 |
| L09 | mature 0／3 | 当前黑白羽块、红脸、深色喙与橙褐脚，保持番鸭身长与头部比例 |
| L10 | mature 0／3 | 金黄牛体色、当前角形／耳位、浅口鼻、厚躯干与成熟头身比例 |

### V7 新原稿与正式成品复查

全部 10 张真实新原稿已保存为 `assets/livestock/raw/choice-v7/<ID>.png`；L06／L10 为 1312×1199，其余为 1254×1254。已实际打开全部全幅原稿、[当前 V5→新原稿浅深正常底对照](../../assets/livestock/reviews/choice-feed/v7-current-to-new-source.png)及每个 `v7-<ID>-raw-normal.png` 的全幅深底合成。源图有组织的像素色块、阶梯轮廓和离散明暗，保留当前动画的毛／羽／羊毛分组；未见真实白雾、实际霓虹残边、地面底片或烘焙椭圆影，角耳尾脚完整。原稿正常底证据与黑底查看器的低 Alpha RGB 误显已分开判断。

[choice-registration-v7.json](../../assets/livestock/choice-registration-v7.json)逐 ID 登记真实当前 0／3 输入 PNG 路径／哈希、新原稿路径／哈希／尺寸和裁切框，`generatedWith: 'built-in image_gen'`；[choice-prompts-v7.md](../../assets/livestock/choice-prompts-v7.md)保留实际提示词。已读这两份来源记录，来源与上文实际开图对应；V4 批已归档为 `choice-v6-rejected/`，不再作为当前选择来源。

正式成品已实际查看[逐 ID 当前 0／3→新 PNG→发布 WebP96→发布 WebP32](../../assets/livestock/reviews/choice-feed/v7-current-animation-new-portrait-published.png)、[96px 总览](../../assets/livestock/reviews/choice-feed/v7-selection-icons.png)、[32px 实际尺寸](../../assets/livestock/reviews/choice-feed/v7-selection-icons-32.png)、[32px 最近邻放大](../../assets/livestock/reviews/choice-feed/v7-selection-icons-32-enlarged.png)和[全部 96px PNG／WebP 深底](../../assets/livestock/reviews/choice-feed/v7-png-webp-96-dark.png)。32px 图直接从正式 `public/ui-icons/livestock-<ID>.webp` 缩放，未拿 PNG 或高分辨率的清楚替代真实发布用途。成品源为 96×96 透明 PNG，隔离后紧裁并以最近邻 contain 到 88px 内，WebP 质量 70；该技术参数说明实际转换，不单凭数值判通过。

| ID | V7 对当前 V5 身份与 32px 用途的实际图像结论 | 判定 |
| --- | --- | --- |
| L01 | 当前棕鸡羽色、红冠／垂肉、金黄脚与尾羽分组保留，抬头可见喙和眼；不再是旧白鸡 | 已审静态范围通过 |
| L02 | 灰黑重体、弯角、宽口鼻、耳和尾对应当前水牛，头抬起且完整角形在 32px 仍可辨 | 已审静态范围通过 |
| L03 | 褐色斑羽、浅色脸纹与橙喙脚对应；已另开当前 320px 输入确认小蓝黑翼斑确有来源，非从旧 V4 擅补 | 已审静态范围通过 |
| L04 | 奶白长毛、瘦长口鼻、后弯角与胡须对应，保留当前长体形；未改成旧稿的大头幼态山羊 | 已审静态范围通过 |
| L05 | 白羽分组、长颈与橙喙脚对应；自然抬颈后仍为鹅，尾与蹼完整 | 已审静态范围通过 |
| L06 | 当前深灰黑躯干、粉鼻／耳内、卷尾与短腿保留；头抬起，未恢复旧稿脸型 | 已审静态范围通过 |
| L07 | 当前灰褐毛色、浅颊／胸腹、粉耳内、短尾与后腿体块保留，普通坐姿抬头；不再是旧奶白兔 | 已审静态范围通过 |
| L08 | 成熟奶白毛团、浅褐脸耳与蹄对应，抬头后仍有当前成熟体量；羊和山羊在 32px 可分 | 已审静态范围通过 |
| L09 | 当前黑白羽块、红脸、淡粉灰喙与赭脚对应，抬头且番鸭身份清楚 | 已审静态范围通过 |
| L10 | 当前金黄体色、离散蜜色高光、短浅角、浅口鼻和成熟躯干对应；与深灰水牛可分 | 已审静态范围通过 |

不同姿势自然改变颈部与总包围框，本次按实际脸型、毛色、角耳、身体结构和主要比例对照，没有以包围框相等代替身份统一。全部 10 项 PNG／WebP 完整角耳尾脚、浅深背景边缘及 32px 物种辨识度通过，无新增原稿或成品退回项。

已只读正式生产入口：`scripts/export-livestock-animation.mjs` 调用 [export-choices.mjs](../../assets/livestock/export-choices.mjs)，后者只消费 V7 登记的新原稿并写正式 PNG／WebP 和 atlas 的 `animalIcon` 来源；`--choices-only` 在选择导出后返回。最终 atlas 指向 V7，保留 `feedPresentationRevision: 'v6-r3'`。这是来源链源码审阅，不是执行／构建检查。饲料 v6-r3 未变部分的独立静态结论保持，不因选择图返工而重复审阅或撤销。

## 首轮精确版本

哈希仅用于限定实际看图版本，不证明视觉质量。

| 文件 | SHA-256 |
| --- | --- |
| `raw/compound-feed-v6.png` | `7038f463bf185c7613d5c07a20194a5c3e4fe1f2de9057de8a543a98a1b90847` |
| `feed.png` | `3b38c1f98423d5b28a9d6e0fff6bb73c1482dc77a39fd8a16777d5ce92b24f68` |
| `public/art/livestock/feed.webp` | `d00086ea497b3bde46ec9d75e00b5be818fc812144f7299e053a2a77d2e2de9e` |
| `choice-registration-v6.json` | `dbe686d886b104b7d8e4de2cefb0c743a5f33dc693335cbd3508adba5eef64f2` |
| `feed-registration-v6.json` | `4e95ca8ca104946a43822a10ddfdc1e85c8058b5e9ed647a0c875949df2bf4c6` |
| `reviews/choice-feed/choices-png-webp-96.png` | `c3cf27e4475b147fc9e8d671eceb14e2725289360ad3027d623b68b7f59a19bb` |
| `reviews/choice-feed/selection-icons-32.png` | `fdc266e6710dc65ec1e74f7b74f01e4d3ae02ac7a2273edebca27d49d5edf9e7` |
| `reviews/choice-feed/selection-icons-32-enlarged.png` | `7fd0073121735f2f65b46b238096b9f53a53e8ec7ab27b81e523af4ea097fcfc` |

## v6-r3 饲料通过时的冻结版本（选择 V7 最终版本另列）

本节为饲料关闭时的历史快照；当时饲料原稿、feed PNG／WebP 和 V6 choice 注册沿用首轮哈希，feed 注册新增 `presentationRevision: 'v6-r3'`。现行选择已改为下节 V7，不再消费 V6。下面限定该次实际看图与同批源登记的精确版本，不构成额外技术检查。

| 文件 | SHA-256 |
| --- | --- |
| `assets/livestock/atlas.json` | `1f92bbbe93c691ef0ec9fea3c80d2260df8e71a795c425c4cb873e8673fdc08f` |
| `assets/livestock/feed-registration-v6.json` | `40acd18575c2267d1f521fd7045578f1bfc6434fa215e4a5b2dc185cb9d84069` |
| `src/view/livestock-layout.js` | `83ccf4f58eaadfa819b6d04889285646ccf63f603e3705c06aea9e16966347cb` |
| `choice-feed-evidence/v6-r3/feeding-130-four-frames.png` | `cfb56ded92d8fd3e96d705cac5f7752a4c096cabd077ce5e8ce6aff497f5d1cd` |
| `choice-feed-evidence/v6-r3/feeding-130-all-stages.png` | `bf856907bab076310fb9b1cd43a9dd9e68d8075440c368daac774f77981f3350` |
| `reviews/choice-feed/r03-fallback-source-130.png` | `1c6c1711cb386f55276c5135eeff93f41fdd436c3cdf109eaf43293c82c83b62` |
| `reviews/choice-feed/r03-fallback-published-130.png` | `29bed54797af08c162d1af206da3b4de8c164575b36bbdb750dd129cf2b56e91` |

## V7 选择最终冻结版本

以下哈希为实际已看图的新原稿和正式交接版本，用于溯源，不作为画风／身份通过的替代证据。全部输入帧的逐 ID 路径和哈希保存在 V7 注册中。

| 新原稿 `raw/choice-v7/<ID>.png` | SHA-256 |
| --- | --- |
| L01 | `a60a293bf393676003c61a9f3aa18def4f4720f6c68e5920c27b76ea4099065c` |
| L02 | `feaf40f8b268e15bd9ecd045a4929ec8923538149387a980f7ec6af688989e21` |
| L03 | `e4d9a815c9fd2130ec1d5d8b8146ab14b147324a0731f6163f16f8aacb620f9c` |
| L04 | `5832f79a2ac4a0f7956523635b402417a93012f749e3e9a074c2dcbfd70e1f9d` |
| L05 | `552e278a2b75bdc4130630b14e814fda104f26a01fefca82eb2efa1246d43204` |
| L06 | `1cf03653f0cc0dc19f723589bf692d44704ddd89c59261f7a6c72a4c78a20cb1` |
| L07 | `0dc91056b56b9b03669fa702da3be6b4015706a8cbb5c2d0468b4eda88a8ea3b` |
| L08 | `d156eac24dae19c9b0bd8667396e1279c91c651adf9099e6bd37a7eb9a195fdf` |
| L09 | `edda01e6e5fc3f10c78fe5a0865ed0df43f0e479edb3d474e79e8a3500111807` |
| L10 | `a0cb8c2917702ebec697e504383e7c02be951f6879fd3553028c86d5feece46f` |

| V7 登记／证据 | SHA-256 |
| --- | --- |
| `choice-registration-v7.json` | `e753caa629567d40aac755d42d985825c2f3d9d41d45337c8cf81e123546a6bc` |
| `choice-prompts-v7.md` | `4c66c3ac6082d78fb00852fae4ee83b9469ca017b473b7b9fa2dffe5eb57afc7` |
| `atlas.json`（V7 选择／v6-r3 feed） | `b8199c48c8bcfbaf014134900b64adec141cd4cdc6b1436f43d00ac88a74bb9a` |
| `scripts/export-livestock-animation.mjs` | `6918fc847d81eb7d4985dd00f59e575318fd17598f7a4f1f69c8c24f27f737ef` |
| `reviews/choice-feed/v7-current-animation-new-portrait-published.png` | `11279e115dce78993608a4b405f1e249cc58c3291da60c0d349e2df97a1a8c6a` |
| `reviews/choice-feed/v7-selection-icons-32.png` | `8538e1e9d21c52e4d724b05ffefd7b65dea86c3da881cff21f02fe2929b71de7` |
| `reviews/choice-feed/v7-selection-icons-32-enlarged.png` | `8075e08f83d81249849410ffcce084a1a1a059ef266c26b231ed28e4701a2929` |
| `reviews/choice-feed/v7-png-webp-96-dark.png` | `6dc6e42aed1649456851404751bcdd7ca17fd7d1169fd2fd1afe48f82f57668b` |

未运行测试、资源门禁、预览、语法／运行检查或编译；无推送。游戏真实循环、加载／卸载、选择网格和实际画布体验仍未验收，用户尚未接受本轮成品。
