# 采用认可图与大地图阳光/飞鸟

用户已明确认可两张审核图（含原建筑静态叠图）：“可以就用这些图吧。另外大地图可以叠加一些效果，比如阳光光效，比如快速飞过的鸟”。本轮直接采用已认可图，不再重绘它们；加入柔和光效与少量快速飞鸟，保持清爽地图、建筑/门牌/动件/比例坐标原样，完成后发布原Sites。主main基线45b53ce；Sites源HEAD cabe2c8a…，原公开站v68，项目`appgprj_6af6f5cdb9c881918454442c453d2d2d`。已完成本轮Sites打开与身份/访问范围确认，保留前轮未提交审核稿和任务记录。

## 已认可输入

- 底图 `assets/source/art/proposals/2026-11-19-map-ensemble/map/background-draft.png`，816×1926，SHA256 b24a5b48c3dff14620123755547d3675df5a087f175de2ac746959606c1c2a6f。独审按原建筑固定几何叠图相容，用户认可。
- 群像 `assets/source/art/proposals/2026-11-19-map-ensemble/ensemble/managers-draft.png`，1024×1536 RGBA，SHA256 02bb75f5c4daf3af3bd1a2416979d66509d8dd0df71d2b031152aff67601ea9b。22张脸，近景庄园男女为核心，其余斜向穿插，允许身体遮挡和画面边缘裁切，不要求留缝/全身/鞋脚。原始alpha0处的隐藏RGB渐变不是不透明背景，不要误清通道。

## 所有权与依赖

PM `/root`拥有本文、反馈清单、docs/assets.md及必要规范、审核稿顶层README的认可状态，负责亲读实际调用路径/关键图、统一最终生产构建、原Sites发布。以下全部新干净上下文，以当前明确目标最少资料交接；前轮素材作者/独审已结束文件所有权。

### `approved_loading_integration`

独占`src/view/loading-layout.js`、`src/view/loading-screen.js`、`scripts/export-loading-art.mjs`、`assets/source/art/loading/`（不改旧review目录/认可稿）、`public/art/loading/managers.webp`。将认可PNG作为当前原稿，保留旧版/提示/来源历史，不重绘；等比nearest导出WebP70/Alpha100，建议直接保留1024×1536原艺术画布，无旧1344高固定padding，记录实际尺寸/Alpha边界与新版本key并保留game=1。背景/LOGO原字节不变；运行已开屏局部linear保持。

布局必须兑现认可的近景大小：不再用旧“全身完整放进标题与进度之间”的contain把所有人缩小。以手机窗口设计，允许身体/衣摆在屏幕边界裁切，但22张脸清楚；已认可图自身下缘是画面裁切，不能在屏幕中间暴露一条悬空切口。优先让人物层自然延伸到视口底边/底部进度区之后；标题/进度/失败按钮可合理压缩空隙或调整几何，不能盖脸。不要简单套用旧96%上限或全部边界都必须露出的约束。短屏失败/存档入口和安全区要实际静态审阅；必要最小屏布局调整同一所有者完成，不改1秒完整显示、300ms淡出、任务/重试状态机或文字/音效/存档。先给PM/独审几何策略后直接实装，最后冻结全部尺寸/hash。

### `estate_atmosphere_art`

独占新`assets/source/art/estate-atmosphere/`、`public/art/estate/atmosphere/`、`scripts/export-estate-atmosphere.mjs`。使用内置imagegen生成两项透明原生素材，实际开参考现有地图/建筑画风：柔和暖阳斜向光束纹理、四帧真实振翅小鸟（可源2×2格，最后格式转换为横排4帧）。不生成完整场景或改认可底图，不程序画光/鸟、不复制旋转单鸟冒充拍翅。小鸟偏远景暖棕/灰白，小尺寸仍是鸟，不是符号V；飞行朝右/右下，四帧躯干锚点统一，翅膀真上/中/下/回收变化。无文字/地面/黑底/独立阴影。

冻结接口：`public/art/estate/atmosphere/sunlight.webp` 512×1024 RGBA；`birds.webp` 512×128 RGBA，4个128×128横排帧，身体统一中心/比例，留安全像素；WebP70/Alpha100，鸟等比nearest、阳光可等比线性格式转换保留柔光。原始源/实际prompt/引用/裁切锚点/生成和导出记录保留。文件名/规格需变化先交实现者协调。尽快生成并把具体源/成品交`approved_art_atmosphere_review`和实现者。

### `estate_atmosphere_integration`

独占`src/view/estate-map.js`、新`src/view/estate-atmosphere.js`（必要纯几何文件）、`src/view/canvas-ui.js`仅地图可见性/时钟接线、`scripts/build-offline.mjs`仅背景版本/资源相关、`public/art/estate/background.webp`、`assets/estate/`仅认可底图当前来源/必要导出记录。认可底图保持原比例/尺寸转WebP，沿现用地图背景quality90，背景URL版本6→新版本并同步离线清单；建筑/动件/门牌资源/几何不改。

气氛效果复用现有map.update/ticker，纯显示、不接经济/存档/设置，不新增全局timer/RAF。光效柔和低透明缓慢变化，不闪烁、不把地图洗白；鸟首次进入地图几秒后快速掠过，之后间隔出现，建议固定1–3只池、2–3秒一趟、十几秒空闲，不持续满屏飞。鸟用真实四帧振翅+平移；允许小编队错开，不遮挡门牌文字/操作。效果在建筑之上、门牌/控制之下，eventMode none，不新增hitArea，不占点击。维护地图滚动视口和现有mask，光/鸟出屏自然裁切。

新装饰纹理属于固定有限共享动画缓存，只在地图可见/开屏已完成时启动加载与推进，装饰失败不把已完成开屏重新卡住，不替代底图/建筑；复用既有loadAnimationImage/Assets缓存，不自写第二套无限缓存。开屏遮住、弹窗、后台、离开地图暂停，不因恢复补跑很久，返回/滚动/重建不叠加多套鸟；源图晚到后parent已销毁不挂载，Texture切片只释放自身不销毁共享source。逐帧只改少量Sprite属性/帧，使用已有markDirty，不能整页redraw/每帧new Text/Graphics.clear/随机对象队列。

先读performance与已有estateMap生命周期/visibleEntries/setViewport，向PM给简短实际接口策略；依上述固定资产名可并行实现，等资产到后静态核对尺寸/来源。可导出纯pose函数供静态图像分镜审阅，不执行游戏。交接实际加载/视口/暂停/销毁/版本链及等价范围。

### `approved_art_atmosphere_review`

新干净独审，独占`assets/source/art/approved-atmosphere-review/`和`docs/art-reviews/2026-11-19-approved-art-atmosphere.md`。读取本卡及farm-art-review规约，已认可源不能自行改。依最终导出/hash做静态审阅：群像在320×568/640、390×844、414×896正常/失败/存档问题及390安全区，22脸、近景大小、源下缘仅在屏幕边界裁切/被合理UI覆盖无悬空硬线、底部bar控件/标题不遮脸；不要因用户允许的出画身体或无间隙退回。地图按原建筑静态叠新底图，鸟四帧真实振翅/形体/脚点（飞鸟无地线）、24–36px静态缩图可辨，阳光真透明/低alpha无矩形边；用最终纯几何做几帧静态叠图判效果对比和门牌不洗白。

对加载/可见性/暂停/销毁/缓存和只改Sprite增量路径做只读源码复核，具体问题退原所有者；不能用静态图片声称实际飞行动画/浏览器运行通过。记录精确hash/实际开图/限制，报告简短，先交问题/结论再补必要记录，不为主观小细节重绘已认可图。

## 权限与交付

普通读写、内置生成/格式转换、静态素材合成/像素读取/源码阅读允许。用户未授权测试、语法/运行检查、游戏/Pixi/浏览器预览、冒烟或试编译；各子代理不运行这些，也不push。全部模块/资料/资源和独审完成冻结后，仅PM最终生产构建，沿原公开Sites源码同步保存/发布，不推GitHub。声明采样/光鸟引起预期画面变化，但玩法/数值/存档/建筑输出等价。持续短报接手/接口/生成/交审/阻塞/交付并结束文件所有权；新用户输入若中断由PM followup恢复。

## 冻结交付

四名所有者均已结束文件所有权。群像1024×1536原稿与认可稿字节一致，采用满宽/底边延伸布局；原loading-screen、背景、LOGO不变。底图816×1926 WebP90、版本v7接入；原生暖阳512×1024与真实四帧鸟512×128接入。鸟按统一身体锚点裁帧，未程序画鸟或旋转单帧冒充振翅。

PM亲读最终loading与map/atmosphere/canvas/offline实际路径，实际开正常390、短屏存档问题320、四翼姿实际尺度及最终地图分镜。独审[最终报告](../art-reviews/2026-11-19-approved-art-atmosphere.md)的15开屏状态、鸟缩图、8地图分镜/最大阳光对照和只读源码通过，鸟初稿偏小已闭环；保留资产与site几何对照吻合。精确hash与34静态证据登记在`assets/source/art/approved-atmosphere-review/final-evidence.json`。

仅静态图像与源码审阅，不声称GPU、真实飞行、点击或游戏体验通过。全部实现、资料、资源和报告冻结，接下来仅PM最终生产构建及原公开Sites发布；不推GitHub。

PM最终生产构建由Sites build-site helper执行`npm run build`（Vite生产构建及离线产物），退出码0，815模块完成；构建后未改运行输入，仅追加交付记录。进入同一原站的源码同步、产物保存与发布。
