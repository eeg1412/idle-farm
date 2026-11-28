# 首页云散与天气

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

## 最终行为边界（优先于下方阶段记录）

| 用户要求 | 最终接入 | 状态与证据 |
| --- | --- | --- |
| 云散效果取消 | 用户明确“效果不好，去掉吧”，CODE删除本轮入口模块、全部stage／生命周期／帧回调及仅为入口新增的加载要求 | 旧v1／v2／v4证据仅历史，不能作当前交付；删除链待最终读码 |
| 晴天云影总数随机3–10、普通十形＋动物四形同为影子、持续补云、覆盖建筑与名称 | 固定10池共用tint与alpha，session保存独立影子流；各片右出左接、按真实轮廓对齐入场，无整批屏障或40–70秒等待；数量变更在边缘完成 | 最新流式接续交CODE；真实漂移／点击／性能未验证 |
| 初始及后续晴天80%／雨天20%、随机10–30分钟前台时间重抽、有过渡 | session跨页继续计时、后台暂停；同天气不重启过渡或影子批次，晴雨改变时8秒平滑渐变 | 最新概率交CODE接续；长时运行未验证 |
| 雨天变暗、雨粒子且点击可用 | 地图前景暗层+72雨丝，非交互，HUD／菜单／Dialog层级保留；滚动只移holder不重置30fps | 源码已读；触控／黑边／方向运行未验证 |
| 雨声及用户报告过响后的修正 | 既有effectsBus，gain0.006、180–1800Hz，增强time constant0.8秒；关闭／切页／后台淡出停止断开，默认音量0保留 | 源码已读；实际音色与舒适度未试听 |
| 动物云为阴影、向右漂时头朝右 | 四形兔猫鲸龟加入上述同一影子流，统一左→右；删除独立白色动物层及模块；atlas v2与离线缓存一致 | 源／发布图已审；最终阴影用法复审中 |

最终独立素材审阅报告、JSON和生成预览脚本由weather_art_review收尾。CODE仅接续canvas入口删除、删除本轮estate-entrance模块、地图影子holder层级；其余ART、SHADOW、AUDIO、ANIMAL文件所有权均已结束。source_review接续核对最后删除与层级。最终编译尚未执行，等待全部资料交齐后仅PM执行一次；无测试／试听／浏览器预览或推送授权。v4合成预览仅为用户已取消功能的历史记录。

最终追加天气概率：用户明确80%晴天、20%雨天；CODE仅接续 `estate-weather.js`，初始与每次到期独立重抽，不再强制晴雨交替。同天气不重启过渡、不重抽现有影子批次，自身漂完换批保留；每次仍向后排随机10–30分钟前台间隔。普通随机事件不使用经营种子，不修改world。其余文件所有权全部已交回，PM等待这一个实现与文档收尾后最终编译。

最终追加影子范围：用户明确“动物云也应该是影子”，并报告“离场后的补云逻辑有问题，等半天才会补云”。原白色独立动物前景与40–70秒等待／批间8秒空档撤回。CODE仅接续 `estate-weather.js`、`estate-clouds.js`、删除 `estate-animal-clouds.js`；四动物形加入同一3–10阴影流，每slot右出左接，实际可见bounds来自两atlas conversion的alpha128登记，新片从左边1逻辑像素内入画，不用固定-.45／1.45造成透明padding长等待；保留80／20与雨声。新增独立processing_smoke所有者只改map加工烟，任务卡见 `2026-11-22-processing-chimney.md`，两者不得交叉改文件。

最后追加不重叠要求：用户要求云影不要重叠、分散但保留随机性。CODE接续仅 `estate-weather.js`，以互斥高度区域约束完整Sprite投影矩形及间隔，保证不同速度和左侧补入全过程不重叠；活跃区域分散选择，区域内位置／形状／大小／速度／初始横向位置随机，补片不在场内跳y。不能只做初始拒绝采样后任由速度追尾，也不能为避碰恢复等待或整批屏障。source_review与ART静态端点复查最后布局。

## 需求与交付

用户要求：仅从加载画面进入首页时播放全屏云散；晴天地面云影缓慢漂移；雨天地图变暗并叠加雨粒子且按钮仍可点击。追加要求：天气每隔随机 10–30 分钟切换，切换具有过渡，关注性能；需要绘图时使用绘图技能。

追加反馈：入场白云排列太规整、体积太大；用户明确大小反馈仅指加载时白云。入场改为小／中云团随机错落，不放大云团掩盖布局问题。增加下雨音效。地表云影每批数量随机 3–10 片（用户随后将 1–3 纠正为 3–10，以最新值为准），位置和批次随机布局；不据白云大小反馈改地面影子尺度。

用户再追加 10 种不同云朵轮廓；新规格替代单云纹理接口。用户报告雨声过响并受惊，雨声重新打开反馈：最大雨声增益从 0.16 降至 0.006，滤波缩为 180–1800Hz，初启与增强采用至少 2 秒柔和渐入；实际舒适度未验证，不沿用旧实装结论。

最新入场要求：高密度、大量真实云朵覆盖；禁止白色底图（含此前补空的白雾底）；统一左右散开并给用户查看效果。该要求取代 R3 的 450ms 白雾及径向四散；R3 小中云尺度保留。可采用仅在 prepare／resize 时将真实透明云精灵烘焙为透明 RenderTexture，运动阶段只移动左右两半；所有不透明像素必须来自十种云原画，禁止用白底、纯色矩形或雾补覆盖。效果预览仅针对本次云散的合成分镜／动画，不扩大到游戏测试、试听或其他预览。

用户明确纠正“左右散开是每片云不规则的左右散开”。PM此前解释为两片云层整体平移属于误解，双半幅／双bank烘焙运动方案撤回，不作为最终交付。最终必须为每朵云独立水平向左或向右，分别采样方向、延迟、速度／行程，保持小中云、高密度真实覆盖、十形状、无白底、仅加载入场；不能再用整组平移、径向或上下运动替代。固定池与同源纹理批处理、30fps，逐帧只改必要属性，采样仅初始化／尺寸变化。

用户再追加晴天限定的“小动物 云”，已明确澄清为呈小动物轮廓的云朵，非活体动物。作为晴天地图前景的少量飘云，随雨势淡出；不混入加载入场云、不替代3–10片地面影子、不新增生产或音效。PM实现选择为四种轮廓（兔、猫、鲸、龟）、最多两朵；动物云是显示内容。

动物云最新朝向反馈：晴天向右漂移时所有头必须朝右。模块已限定统一左→右、无运行时镜像；ART R2让兔／猫／鲸改成右向，原本右向的龟保持。图集同路径更新、URL `?game=1&v=2`；ART追加独占 `scripts/build-offline.mjs` 的 `estateAssetVersions['atmosphere/animal-clouds-v1']=2` 一项，其他构建逻辑不改。先前随机双向运动及朝左三帧不作为最终交付。

PM：维护本任务卡、反馈清单及界面正文，阅读实际执行链与 diff。天气为显示状态，不改变经济、存档或生产时间。初始天气随机；每段天气随机持续 10–30 分钟，随后切换晴／雨；时长按应用前台时间累计，离开地图仍计时，后台暂停。该时间口径为本次实现选择。

## 所有权、上下文与接口

| 任务 / agent | 目标 | 独占成果物 | 上下文 / 状态 |
| --- | --- | --- | --- |
| EW-ART / weather_art | 内置绘图生成透明云团、转换及来源记录 | `assets/source/art/estate-weather/`、`public/art/estate/atmosphere/clouds-v1.webp`、`scripts/export-estate-weather.mjs` | 新建干净上下文；已交付并结束所有权 |
| EW-CODE / weather_code | 天气／入场动画及真实加载、地图接入 | `src/view/estate-weather.js`、`src/view/estate-entrance.js`、`src/view/canvas-ui.js`；必要时 `src/view/estate-map.js` | 新建干净上下文；四文件已交付并结束所有权 |
| EW-REVIEW / weather_art_review | 独立源图及发布图审阅 | `docs/art-reviews/2026-11-22-estate-weather.md` 及 json、`scripts/review-estate-weather.mjs`；本地证据图 | ART 已交付；新建干净上下文，已指派 |
| EW-SOURCE / weather_source_review | 只读复核触发、层级、前台时钟与性能路径 | 向 PM 交付问题清单，无代码所有权 | 新建干净上下文；只读复核中 |
| EW-SHADOW / weather_shadow | 地面云影每批随机 3–10 片与批次布局 | `src/view/estate-weather.js` | 新建干净上下文；原 CODE 已结束该文件所有权，待指派 |
| EW-AUDIO / weather_audio | 雨声与现有音量／后台机制接入 | `src/platform/farm-audio.js`、`src/view/canvas-ui.js` 的雨声调用 | 新建干净上下文；原 CODE 已结束 canvas 所有权，待指派 |

代码与美术可并行：冻结云图发布路径 `public/art/estate/atmosphere/clouds-v1.webp`，透明 512×256，单朵横向完整蓬松云团，白／淡冷灰、无阴影或背景，保留内边距；代码以 Sprite 重复使用整张纹理，云影使用 tint 与 alpha。ART 负责内置生成、保留原图、转换、提示词与实际参数记录；不能程序生成或修画云朵。原图尺寸由实际生成决定，发布图等比 contain，不拉伸。无需其他共享资产生成。

最少读取：CODE 读取 `canvas-ui.js` 的 openingScreen 创建／onComplete、estateArea、redraw、ticker、resize、visibilitychange，`estate-map.js` 的挂载及视口，`estate-atmosphere.js` 的复用方式；规范仅 `docs/performance.md`、`docs/ui/pages/estate.md`、`docs/ui/navigation.md` 及 farm-canvas。ART 读取 imagegen、docs/assets.md 图形采样与来源规则，实开 `public/art/estate/background.webp` 作为画风参考。REVIEW 输入由 PM 在交付后补充。

## 行为边界

| 入口 | 条件 | 允许改变 | 必须保留 | 证据 |
| --- | --- | --- | --- | --- |
| loading-screen 的 onComplete | 当时实际页面为大地图 | 一次云散，覆盖游戏区 | 加载素材／重试／失败状态、直达其他页、日后普通返回均不补播 | 实际 callback 与取消路径 diff |
| 大地图前台更新 | 晴天 | 云影漂移 | 建筑、路牌、鸟、任务提示、HUD、滚动 | 固定池与挂载路径 |
| 同上 | 雨天及天气过渡 | 地图变暗、雨粒子、晴雨平滑过渡 | 按钮与拖动／滚轮命中、菜单和 Dialog 层级 | eventMode none、interactiveChildren false、覆盖层位置 |
| 应用前台时钟 | 加载完成 | 10–30 分钟随机切换，渐变 | 不写 world、不改变经营随机数／存档、不按时钟整页重建 | session 与 ticker 路径 |
| 重绘／旋转／切页／后台 | 对应生命周期 | 保留天气时钟，复用或释放节点，暂停后台更新 | 单画布、横屏黑边、原页面和输入 | 生命周期 diff |

## 执行方法与完成条件

固定小池云团／云影／雨丝；共享纹理；不使用全屏滤镜、额外 ticker、每帧 Graphics clear 或新建节点。只改节点属性并标脏，30fps 上限足够；离开地图不更新粒子。加载后只触发一次云散，不跨页排队。代码所有者可自行设计两个私有模块接口；其他文件扩大范围先报 PM。天气需跨地图实例与 resize 保留，云散不能因结构重绘重新开始。天气层不命中；云散层也不新增交互阻挡。

层级补充（已发给 CODE）：云影位于地景之上、建筑层之下；雨天暗层覆盖地图建筑，雨丝位于地图前景；全局 HUD、菜单和 Dialog 保持在天气层之上。可在 `estate-map.js` 提供专用挂载容器，禁止改动建筑布局。

已有改动保留：`canvas-ui.js` 删除订单标题旁圆点的用户改动；`docs/feedback-checklist.md` 和 `docs/ui/pages/orders.md` 的既有修改。你不是独自在代码库工作，禁止覆盖或撤销他人的改动。共享文件无所有权转交；完成后明确交回 PM。

## 验证与汇报

用户当前明确验证授权：无。禁止测试、冒烟、预览、试编译、语法／运行时检查及同类验证；可普通读写、生成／转换资源、查看原画和成品与生成审图证据。全部交付后仅 PM 执行最终编译。推送授权：无。

接手复述行为边界及文件所有权；阶段报告具体路径、接口及剩余问题；交付报告实际执行链、参数、未验证项和结束所有权。PM 按 diff 核对后记录完成状态；构建与静态审图不代表真实动态验收。

## 阶段记录

- ART 已用内置 image_gen 生成并转换首稿；自审发现蓝青边缘杂点，保留来源并重画修订。发布接口不变，首稿不作最终审阅版本。
- CODE 已确认入口为 loading-screen.onComplete，weather session 独立于地图实例；云影／雨层按上述层级挂载，入场使用已完成加载的纹理，不晚到补播。待实际 diff 核对。
- PM 阅读实际链发现加载先淡出再开启云层会闪出地图，已退 CODE 修正衔接：加载淡出前静止准备云覆盖，onComplete 才开始云散；保留原加载时长与失败／重试状态。
- EW-CODE-R1：独立源码复核发现每次滚动重置 lastPaint 会绕过 30fps，原所有者接续修订为独立雨丝 holder 随视口平移，滚动不重置动画采样；已交回并经 PM 与独审读码确认。
- EW-CODE-R2：独审与 PM 实开 390×844 静态分镜，入口第一版 24 朵云形成六条规则横带，不能作为整片云层散开交付。原画／发布云图静态条件通过，失败为布局；原 CODE 所有者接续仅 `estate-entrance.js`，改为错落重叠的两侧云层，待独审重新合成复查。原稿不退 ART。
- R2 大云布局被用户“入场白云太大”的明确反馈取代，不作为交付；原 CODE 接续 R3，只拥有 `estate-entrance.js`，改为小／中型错落云团。原 `estate-weather.js` 与 `canvas-ui.js` 所有权已结束并分别交 SHADOW 与 AUDIO，三者互不改写。

## 追加任务的接口与边界

EW-SHADOW：只改 `estate-weather.js` 的云影数量、布局与批次，固定 10 个 Sprite 池，使用显示随机数，每批随机 3–10 片；分布与大小只在批次切换时采样，禁止每帧随机、建节点或影响经营随机序列。批次数据由已有 session 保存，重绘／旋转不重抽，下一次晴天及云影一轮漂移后可建立新批；现有慢速尺度保留。保留雨量、8秒过渡、前台时钟、30fps、雨丝滚动 holder 与图层／命中接口。最少读取本任务卡、`estate-weather.js`；若需 `estate-map.js` 或 canvas 调用，仅只读。完成后交回文件所有权。

EW-AUDIO：只读当前 `farm-audio.js`、`canvas-ui.js` ticker weatherSession 更新段与已有音频参数、`main.js` 解锁／setVisible 调用、`docs/ui/pages/settings.md` 音量段。使用既有 Web Audio Context／effectsBus，增加 `audio.setRain(amount)` 接口，amount 为 0..1，首页地图雨量驱动；切页归零，首页 Dialog／菜单期间仍可听见雨声。复用既有用户手势解锁与 sound 音量、后台静音，新档仍默认0。固定循环噪声 buffer 经滤波模拟雨声，无新增文件下载／定时器／每帧源创建；8秒天气过渡按雨量自然渐入渐出；关闭音效、切页与后台淡出并停止／断开源，不留下静音运行音源。每帧调用可存在，但仅量化后的音量或可见性变化时排程 AudioParam。禁止改音乐、对白、经营和设置存档。原 canvas 删除订单标题圆点的改动及并行订单开发改动保留。完成后交回两文件所有权；不做测试／试听／预览／检查或编译。

## 十种云形状的接续接口

- ART 复用 weather_art（同一云素材目标的直接扩展），独占 `assets/source/art/estate-weather/shapes-v2/`、`public/art/estate/atmosphere/cloud-shapes-v2.webp`、`scripts/export-estate-cloud-shapes.mjs`。用内置绘图绘制十种真实不同轮廓，单幅透明网格后裁切导出；源稿、提示词、裁切布局、成品可追溯。发布为 1280×256，5列2行、每格256×128，行优先0–9，格间透明独立，白／淡灰像素风；禁止仅缩放／镜像同一云凑十种。
- CODE 复用 weather_code（入口／天气的同目标连续接入），原 SHADOW 已结束 `estate-weather.js` 所有权，AUDIO 已结束 canvas 所有权。CODE 接回 `estate-entrance.js`、`estate-weather.js`、`canvas-ui.js`（只涉及新云图加载接口），独占新增 `estate-clouds.js`（如果需要）。沿用 R3 小中云64固定池与随机错落，把十种图形以共享纹理子帧消费；每次入场/云影批次采样 variant，重绘/旋转不重抽，保留 SHADOW 刚交付的3–10批次与 AUDIO 刚交付的setRain调用。整图 pinned 一次加载，十子帧共享 source，不逐帧创建 Texture、不由实例销毁共享帧。使用 URL `./art/estate/atmosphere/cloud-shapes-v2.webp?game=1&v=1`，保留旧源图与历史证据；旧单云不再进入新运行路径。
- REVIEW 继续 weather_art_review（同目标修订复查），等待十形状最终成品与接入后，按十个真实格逐一审源／成品和小中尺寸、随机错落入场、3／10云影边界；旧R1横带失败、R2巨大云被用户否定记录保留。报告、证据脚本及本地证据图原有所有权不变。
- AUDIO-R1 继续 weather_audio（用户重开同一雨声反馈），仅拥有 `farm-audio.js`，立即实施大幅降音与柔和渐入，不与 CODE 共享写同一文件。
- 原文档矩阵中的旧单云尺寸、6云影、24或12入口云为各阶段历史，不代表最终规格；最终以本节及后续实际交付记录为准。
- 新入口不再保留 450ms 白雾底和径向轨迹；CODE 将按最新要求实现高密度真实云覆盖、左右分开并交 REVIEW 复查效果。静态与合成动态预览分别标明，不能冒充浏览器实测。

## 晴天动物云的接续接口

- ART 复用 weather_art，同一云素材直接扩展；重新独占 `assets/source/art/estate-weather/animals-v1/`、`public/art/estate/atmosphere/animal-clouds-v1.webp`、`scripts/export-estate-animal-clouds.mjs`。内置绘图透明2×2网格四种明确动物轮廓，兔／猫／鲸／龟，主体仍是白／淡灰团云，非真实动物精灵；发布512×256、2列2行、每格256×128，rowmajor0–3。原画与提示词、实际裁切、PNG、WebP与来源全保留。十种普通云已交付并结束其所有权，不改十云。
- EW-ANIMAL / weather_animal：新建干净上下文，只拥有 `src/view/estate-animal-clouds.js`。导出 `mountEstateAnimalClouds(parent,{width,height,session,loadImage,markDirty})`，返回 `park/attach/destroy/pause/setViewport/update`；attach接parent，setViewport(scroll,height)，update(now,active)返回画面变化布尔值。最多2个Sprite固定池，使用session.rain控制晴天可见，随转雨淡出，不阻挡点击；纹理optional pinned loader由CODE传入，加载成功后仍需活跃实例才能挂，失败不回退。4个子帧共享一份source，创建一次，不能逐帧创建。批次/变体/路径随机只在换批采样；通过WeakMap按weather session保存状态，重绘/旋转不额外触发。地图离开/后台停动画，云沿地图viewport飘过，跨晴雨平滑，至少淡入淡出。不读写world、不新增ticker/定时器、每帧不建节点；读本卡、现有 `estate-atmosphere.js` 生命周期、`estate-weather.js` session getter即可。
- CODE 集成只在 `estate-weather.js` 添加独立晴天动物云holder与上述生命周期转发，并在 `estate-map.js` 传入 `loadAtmosphereImage`。追加授予 `estate-map.js` 该最小改动所有权（原无其他owner）；其他地图建筑/位置/交互均不改。CODE不修改EW-ANIMAL独占模块。AUDIO只拥有farm-audio.js且已交回，canvas云图接入归CODE独占。
- REVIEW 接续审动物云源／成品四格及实际小尺寸，记录晴天限定的源码门控与运行未验证；不得因为名称含动物套用畜牧生产素材交付。
