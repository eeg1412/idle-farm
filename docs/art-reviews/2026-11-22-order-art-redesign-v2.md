# 订单管理员第二轮独立重设计审图

审阅日期：2026-11-22。审阅者：`order_art_review`（OR-REVIEW）。原画与导出唯一所有者：`order_art`。本报告只审本轮原画、发布成品和静态使用构图；未验证游戏运行与真实交互体验，未取得当前用户认可。没有测试、预览、试编译或推送。

当前交付状态：男性四全身、四发布胸像与390px同屏静态通过；男女全新v3开屏源图、两个最终发布WebP及全部八张指定尺寸开屏静态构图通过。两张室内柜台v2 CG已被用户明确否定，撤回所有作为交付依据的通过结论，不能交付。当前v3未取得用户认可、未验证游戏运行。

## 范围与依据

女性茜梨只重画开屏，身份仅对照 `assets/source/art/managers/orders/anime/female-smile.png`，不改女性四表情。男性奥林的外貌、动作、全身四表情和开屏重新生成；姓名、可靠重承诺耐心的性格保留。男性身体右前、双眼回看玩家为本轮指定设定，分别审头、肩胸、胯膝和双脚。未打开任何旧订单男性原画或旧订单开屏作参考。

已读 `.agents/skills/farm-art-review/SKILL.md`、`references/checklist.md`、`references/rejection.md`，以及 `docs/assets.md` 管理员CG段落、`src/view/loading-layout.js`、`src/view/canvas-ui.js` 的横幅/feature/资料图装载/主页面与弹窗几何、`src/view/manager-page.js` 的实际消费参数。

实际打开的非订单同用途画风对照：

- `public/art/managers/portraits/warehouse/male-smile.webp`。
- `public/art/managers/portraits/tasks/female-smile.webp`。
- `public/art/loading/scenes/warehouse-male.webp`。
- `public/art/loading/scenes/tasks-female.webp`。

这些文件是现有项目风格对照，不将其存在等同于本轮用户认可。对照内容为细密发束、衣饰纹理与五官刻画、像素阶梯轮廓、离散明暗和场景材质层次。`docs/assets.md` 所链 `2026-11-20-solo-manager-loading.md` 当前缺失，列为历史来源缺口，不从该缺口推断认可。

## 男性基础微笑底稿

`assets/source/art/managers/orders/redesign-v2/male-smile.png`，SHA256 `c0ba1c149dda5ef565c5b82916e979e32333681262926f559c4a1ab7b63a5720`，1024×1536 PNG、RGBA。内置 image_gen 生成，完整提示词同目录 `male-smile.prompt.txt`。生成原始路径：`C:/Users/eeg14/.codex/generated_images/01a2030b-a5e9-74d3-b743-9a743111abce/exec-efe79e2d-7de3-4207-9b65-0245554771d8.png`。

源图基础姿态通过。实际打开全幅、正常米色合成和头部3倍最近邻图。双眼看玩家，肩胸右前、胯膝右前，双靴鞋尖朝画右；全身与双靴完整。胸前抬掌表示倾听，另一手把竖夹压在身侧，不是端盘展示动作。深棕短卷发、蜂蜜褐眼、赭金短外套/靛蓝马甲裤、短乳白围巾与订单夹身份完整。发束、衣折、靴与金属细节有细颗粒阶梯轮廓及离散明暗。黑底查看器的周围光晕在正常Alpha合成消失，没有将低Alpha RGB误显当成底色退回。

已直接通知PM与原画所有者可以保持基础姿态扩表情。源图结论不代替胸像裁切、同屏尺度、CG或运行验收。

已分别打开 `male-happy.png`、`male-angry.png`、`male-sad.png` 全身及其完整提示词。高兴眉眼舒展/开口笑；生气压眉闭口；失落眉心上提/小幅下垂嘴角；四张均双眼回看。发型、衣装、抬掌、竖夹、肩胸胯膝和双靴朝向保持，源图四表情通过。没有用提示词中的“approved”自证用户认可。

## 退回单 OR-V2-01

- 对象/用途：茜梨新开屏初稿，`assets/source/art/loading/solo/orders/redesign-v2/female-scene.png`，SHA256 `20b0e20e43a9a204cefe492b3cffb19f2080de75fd6492ced76990e3fb6575a8`。
- 来源：内置image_gen；提示词同目录 `female-scene.prompt.txt`；female-smile仅作身份，warehouse-male CG仅作非订单画风。
- 原图身份/画风/动作成立：铜红环辫、深绿帽、琥珀眼与衣饰匹配允许的女性身份参考；包裹由柜台承重，双手正在拉绳和按折角，抬眉侧视有性格。
- 不合格项：390×844、414×896与180×390中心cover中，按纸角右手的外侧轮廓被画面右界截断。源图中心裁切右界约866.9px，右手外轮廓到约888px。脸部和拉绳左手完整；320×568未截断核心工作手。
- 证据：专属本地 `reviews/female-source-390x844.png`、`female-source-414x896.png`、`female-source-180x390.png`，带真实Logo与共享几何的进度位置；证据图仅本地保存。精确hash见同名JSON。
- 影响：核心按折角手势在三个要求尺寸下不完整，不能以其他尺寸通过抵消。
- 重绘要求：只由原画所有者使用内置image_gen调整工作区域，把两手、绳结与折角移入源x≤815并留边距；保留正确身份、右前工作姿势、细像素、天窗顶部与底部安全区域。不得改布局或脚本修画。
- 已同步PM与原画所有者；要求保留拒稿版本与提示词，新版本完成后重新开源图、成品及四尺寸静态图复查。
- 复查：`female-scene-rejected-v1.png` 保留退回原稿，最终路径已换内置image_gen修订。新 `female-scene.png` SHA256 `45b9178ea21278ff0a52f2b1b197cfb6461eb53e2f8472e09f236c5376fbc235`，来源 `exec-1d09e65d-97ad-401d-a0a0-eac1c578d556.png`。实际重新打开源图与全部四尺寸 `reviews/female-current-*.png`，双手、绳结与折角完整留在画内，最长屏右手仍有边距；原有身份、像素材质、天窗/柜台和承重工作动作保留。
- 状态：源图与源静态构图范围通过，退回项在此范围关闭；发布WebP仍需独立复查。

## 男性新开屏源图

`assets/source/art/loading/solo/orders/redesign-v2/male-scene.png`，SHA256 `aec134b10e2a0ae68ce2006e61fbc99327549425e77c083df14c06b6db0ddb42`。已打开原图和同目录完整提示词。仅新男性smile作身份、warehouse男性CG作项目画风。新男性脸型、深棕短卷发、蜂蜜眼、赭金/靛蓝衣装与短乳白围巾一致；肩胸右前，头回玩家，两手在柜台支持的靛蓝夹册上扣带，没有端盘展示。雨后傍晚窗、灯、封套架与空椅形成完整工作场景。发束、衣折、木材与金属均有细像素层次。源图通过，发布图与四尺寸仍须独立看图。

## 静态证据与待交付

证据导出脚本：`docs/art-reviews/2026-11-22-order-art-redesign-v2-static.mjs`。只执行sharp图片读取/合成，不启动游戏。证据图目录：`assets/source/art/managers/orders/redesign-v2/reviews/`，证据图仅本地保存；报告和JSON入库。重新生成必须核对JSON中的来源hash，新版本不沿用旧结论。

## 男性四发布胸像与静态使用

四张 `public/art/managers/portraits/orders/male-{smile,happy,angry,sad}.webp` 已逐一打开。已读取 `scripts/export-order-redesign-v2.mjs` 和 `source-manifest.json`：源裁切为左95、上0、宽834、高472（清单 `[95,0,929,472]` 表示左右上下边界），最近邻等比舍入至500×283，上方补6透明像素，得到500×289；WebP质量88、Alpha质量100。不是把929当作裁切宽度。正常底色合成无底色/雾边。

已实际打开 `reviews/male-four-portraits.png`、`banner-390-comparison.png` 和 `cards-390-comparison.png`。四表情五官区别清楚，头发、肩臂和胸前倾听手完整保留，竖夹上半仍可见。390px横幅依据实际faceX与代码几何和warehouse/tasks同屏对照，面部尺度相配；资料/列表使用实际中心cover，脸、肩、抬掌与竖夹特征可辨。静态使用范围通过。PM亦报告亲开四表情与横幅对照并确认保留；这属于PM复核，不写成当前用户认可。

静态合成使用真实图片和代码几何、UI缩放1/零安全区；对白示例为“你好”，进度示例70%，文字字形与实际Pixi绘制没有运行比对。该边界不改变图片所示裁切范围，不将合成图称为游戏截图。

## 用户退回两CG与全新场景返修

用户明确反馈：“不行，男女订单中心管理员的开屏画面重新绘制，重新想一个场景”。两张室内柜台CG即使曾满足技术裁切和内部静态审阅，也已不可交付。本报告上文源图/静态通过仅保留为历史经过，均撤回作为最终交付依据。已打开的v2发布WebP也属于被否定版本，不继续其最终构图审阅。

返修仅重开男女CG，男性四立绘/四胸像保留。女性新场景为订单中心门前突风，一手压帽、另一手抓蓝货签；男性新场景为乡间出发前货车旁拉平/系稳防雨罩。两者不再使用室内柜台/书架场景，只用各自允许的身份立绘生成；不将被拒CG作输入。

女性 `assets/source/art/loading/solo/orders/redesign-v2/female-scene-v3.png`，SHA256 `4d43906b4a904ede55fcd7c78999a515dde91cdb6b9387d7e3be39e49e15614b`，已打开源与完整提示词，以及四个 `reviews/female-v3-{320x568,390x844,414x896,180x390}.png`。身份、细像素、门外阵风情境和手/帽/签连接成立；压帽手、抓签手和整张蓝签在四尺寸中完整，Logo与底进度不遮脸或核心手势。源图脸中心低于提示词坐标，但实际构图安全，不据提示词坐标制造失败。源图和源静态构图通过，发布成品待审。

男性 `assets/source/art/loading/solo/orders/redesign-v2/male-scene-v3.png`，SHA256 `04181df5044a0f3774a8c01cde9bce5d252d5b66b18e54b41acb176f707b5c1f`，已开源与完整提示词。新场景位于乡路篷货车旁，左手捏布角、右手拉绳，绳真实连到木栓，篷布张力及手臂连接成立；头回玩家与右前肩胸保留。身份和细像素风格符合对照，田野、雨云和货车形成新的室外事件，没有沿用被否定柜台场景。四个源静态图中两手、布角、绳与栓完整。

## 最终v3发布成品与八尺寸静态结论

已在scenes-only转出完成后重新逐一打开两张最终发布WebP，均为1024×1536、WebP质量90，无场景缩放。当前 `source-manifest.json` 把v3列入scenes、旧室内图列为 `rejectedScenes`、`consumed:false`，没有沿用旧public图结果结案。

| 当前发布图 | 源图SHA256 | 发布图SHA256 |
| --- | --- | --- |
| `orders-female.webp` | `4d43906b4a904ede55fcd7c78999a515dde91cdb6b9387d7e3be39e49e15614b` | `57bb0bbeab275b6c67890127d4da3cd96643aea1d6c5d6b8636f792dc6f7aecb` |
| `orders-male.webp` | `04181df5044a0f3774a8c01cde9bce5d252d5b66b18e54b41acb176f707b5c1f` | `da17c52bce33a61d4f7de7e12888fb24d96c41acc39e21d7369999790329ca5b` |

两图输入各自只有对应female-smile或本轮male-smile身份图，没有被否定CG。完整生成路径、原稿/提示词版本、裁切转换和所有当前源/发布图hash写入同名JSON，来源为所有者单一 `source-manifest.json`，并针对实际文件重新读取hash、格式、尺寸和Alpha。

接入后按真实 `loading-scenes.json` 与共享 `loadingLayout` 重新生成并逐张打开以下最终成品证据：

- `reviews/loading-female-320x568.png`、`loading-female-390x844.png`、`loading-female-414x896.png`、`loading-female-180x390.png`。
- `reviews/loading-male-320x568.png`、`loading-male-390x844.png`、`loading-male-414x896.png`、`loading-male-180x390.png`。

八图均通过静态构图范围：脸部、压帽/抓签双手与整张蓝签，或抓篷布/拉绳双手与木栓，均保留完整；顶部真实Logo与底部进度不遮核心表情/动作。180×390是横屏中的竖屏内容区域，证据不绘制外部黑边。运行faceBounds女为376,624,254,186，男为331,467,220,208；只读确认新source为v3、开屏缓存为 `orders-{gender}-redesign-v3`，男性胸像锚点仍500×289/faceX242.80575539568346、缓存版本5。没有为了容纳画面改布局。

证据重生成：`node docs/art-reviews/2026-11-22-order-art-redesign-v2-static.mjs`。该脚本只读取图片/几何并写专属本地证据目录。JSON区分实际打开的证据与仅生成未打开的附加尺寸，不以生成数量证明通过。证据图仅本地保存，所有路径、sha256、生成方式和输入版本均已记录。

当前无未复查的内部美术退回项。旧v2用户否定继续有效；v3完成内部静态复查，只能交PM进一步收口，不能写成用户已认可。未验证游戏运行、真实Pixi文本绘制与交互体验；未运行测试、预览、试编译、语法/运行检查或最终编译，最终编译归PM。审图文件所有权至此结束。

## 2026-11-22 废案源与旧证据清除状态

用户另行要求「清除废案文件」。order_art 作为本轮唯一清理所有者，已删除 26 个授权废案文件，共 32,406,211 字节（约 30.9 MiB），及 3 个空旧目录。包含旧 seal-clerk 男性原稿/CG、旧 female.png/提示词、被否定的两张室内 v2 CG 与首版退回源/提示词，以及 female-source/female-current 八张旧静态证据和两份旧本地证据清单。

上文及同名 JSON 中出现的废案原路径、SHA256、退回原因、生成来源和当时结论均保留为历史记录；这些废案源、提示词和旧证据当前已删除，available:false，不再表示本地存在，也不能从已删源重新生成。JSON sourceChain.record 与 sha256 是清理前审阅时的历史快照；同名 JSON 新增 cleanup 列表记录本次删除状态，当前来源清单另有可用性标记。证据生成脚本已移除旧 female-source/female-current 模式，只读取现用男性原稿、v3 两 CG 与现用公开资源。

当前女性 anime 四原稿、男性 redesign-v2 四原稿及完整提示词、v3 两 CG 原稿及完整提示词、最终 loading/female-v3/male-v3 证据与男性表情/横幅/资料证据全部保留。src、public、dist、锚点及外部生成目录未改。本次仅清理与记录修正，没有重跑审图再生成、测试、检查、预览、编译或语法/运行时验证；上文静态通过保持其既有版本范围，当前用户认可仍未取得。
