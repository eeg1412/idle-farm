# 按鱼种 ID 交付

实际接口入口为 `scripts/export-fish-animation.mjs`、`assets/fish/layout.json`、`src/content/fish-visuals.json`、`src/content/fish-habitats.json`、`src/view/fish-animation.js`；导出器和运行时共用 `src/view/fish-layout.js` 的 `fishRegistration/fishSizeLayouts`，公共加载与生命周期由 `src/view/canvas-ui.js` 接入。先读取当前任务涉及的实际实现，再改对应所有者文件。

## 目录、身份与分类

- 范围从 `catalog.items` 的 `kind: F` 推导；当前十种为 F01 鲫鱼、F02 鲤鱼、F03 花鲈、F04 虹鳟、F05 鳜鱼、F06 银鲑、F07 鳗鱼、F08 真鲷、F09 大菱鲆、F10 鲟鱼。目录扩展时同步式样、运行数据、视觉登记与全部用途，不能固定只支持这十个 ID。
- 每种鱼在 `layout.species` 显式登记来源、阶段、`size: small | medium | large` 和 `habitat: river | sea`；这是大小与海河分类的唯一源，导出运行数据每 ID 为 `{ stages: 3, size, habitat }`。不要按 ID 范围、名称、产品价格或阶段尺寸猜分类，也不要在另一脚本维护重复名单。
- `size` 决定展示只数和场景尺度：small 三只、medium 两只、large 一只；站位按水面景深从远到近绘制。该配置不改变每批经济产量或任务统计。
- 养殖对象与仓库渔获分开：新鱼种要交 canonical `public/wiki/icons/<ID>.webp`，现有仓库图默认复用；活鱼选择和动画使用新的活体原画。鱼塘无需另绘动画产品图或套用畜牧产品层。

## 必交资源与消费路径

| 成果物 | 路径与规格 | 用途 |
| --- | --- | --- |
| 透明独立原画 | `assets/fish/raw/` | 隔离 5×5 网格，保留每种三期各四张独立 idle 来源及被替换版本 |
| 提示词和修订来源 | `assets/fish/prompts.md` | 对应准确原图、物种、阶段、帧序及本次参考，不把旧稿写成新生成 |
| 布局与导出登记 | `assets/fish/layout.json`、`assets/fish/atlas.json` | 原图／源格、裁切区域、共享画布／尺度、固定身体锚点、输出与同 ID 用途对应 |
| 规范网格 | `assets/fish/normalized/<ID>.png` | 1600×1600 透明 5×5，已注册帧占前三行四列，作为来源与帧序交接 |
| 三期逐帧 PNG | `assets/fish/animals/<ID>/(fry\|growing\|mature)-0..3.png` | 每帧 320×320 透明场景坐标；阶段顺序鱼苗、成长、成熟 |
| PNG 图集 | `assets/fish/atlases/<ID>.png` | 1280×960，三行阶段、每行四帧、单格 320×320 |
| 发布图集 | `public/art/fish/animals/<ID>.webp` | 与 PNG 相同排布，质量 70，保留透明通道 |
| 透明活鱼选择图 | `assets/fish/icons/<ID>.png`、`public/ui-icons/fish-<ID>.webp` | 96×96，从成熟活鱼原画取得完整主体，不从带鱼塘场景缩小 |
| 仓库物品图 | `public/wiki/icons/<ID>.webp` | 96×96 canonical 渔获图；已有品项未经单项授权不重画 |
| 同 ID 静态回退 | `assets/source/art/scene-<ID>.png`、`public/art/scene-<ID>.webp` | 320×320，按该鱼 habitat 合成背景、成熟活鱼、水色层；不烘焙程序动态水波，改画后不能回退成旧鱼体 |
| 海河背景原稿 | `assets/fish/raw/river-pond-v2.png`、`sea-pond-v1.png` | 本轮活跃原稿；修订时保留旧版并同步登记实际来源 |
| 海河固定背景 | `assets/fish/ponds/river.png`、`sea.png`；`public/art/fish/river-pond.webp`、`sea-pond.webp` | 320×320，分别对应河鱼与海鱼；旧 `assets/fish/pond.png` 与 `public/art/fish/pond.webp` 仅保留历史 |
| 运行视觉登记 | `src/content/fish-visuals.json` | 每 ID `{ stages: 3, size, habitat }`，与目录和布局同源 |
| 运行水域登记 | `src/content/fish-habitats.json` | 每 habitat 为 `{ pond, water: {polygon, color, alpha} }`，水域坐标使用 320×320 场景空间 |
| 静态审阅资料 | `assets/fish/reviews/<ID>-stages.png`、`selection-32.png`、`habitats-320.png`、`fallback-habitats-130.png` | 正常底色阶段分镜、选择图、海河背景和按 habitat 合成回退接触表；旧 `fallback-130.png` 属历史，不能代替当前背景审阅；均为仅本地保存的证据图，不提交，由 `scripts/export-fish-animation.mjs` 重新生成 |

本轮当前目录共三十个阶段、一百二十张独立 idle 帧；这是十种鱼的交付数量，不是未来扩展上限。透明原稿的头、鳍、尾应完整且与邻格隔离；主体越过名义格时先看实际透明间距，再登记裁切，不能截掉有效部位凑规格。实际背景污染、粘连或缺失由绘图工具修订，转换脚本不补画鱼体。

`scripts/export-facility-scenes.py` 的常规导出也会对已登记的鱼种优先消费 `assets/source/art/scene-<ID>.png`，包括历史上有独立入口的 F01。同步鱼体回退时保持这条持久链，不能只覆盖 `public/` WebP 后又被旧图集导出覆盖。`fallback.sourceSha256` 对应持久 PNG 源文件，`fallback.sha256` 对应发布 WebP；常规导出重新压缩后同步更新两项记录，不能混淆来源和发布文件的哈希。

只改海河背景或水域配置时，生产导出器支持 `--habitats-only`：保留三期鱼体、独立帧和选择图，只重新导出海河背景、同 ID 回退及相关 metadata。该模式仍是生产资源转换，不是验证授权。

## 实际登记字段

- `layout.sources.ponds[river|sea]` 显式登记项目根目录相对的 `source/png/path` 和 `water`；原图与归一 PNG、发布 WebP 不混作同一用途。`sources.sheets` 每个源文件路径相对 `assets/fish/`，每种鱼用 `source` 引用来源键。旧 `sources.pond` 及 `atlas.pond` 为历史来源，后者标 `consumed: false`。
- `layout.species[ID].stages` 依次为 `fry/growing/mature`。每期 `cells`、`cellRects` 和 `sourceAnchors` 均按四帧顺序登记；`cellRects` 是原图绝对隔离范围，`sourceAnchors` 是原图绝对解剖坐标。每期共用 `sourceCanvas`、`stageScale` 和说明解剖定义的 `anchor`；`sourceCanvas.left/top` 是相对对应 `sourceAnchor` 的偏移。
- 导出时先将 `sourceAnchor + sourceCanvas.left/top` 定义的区域与真实 `cellRects` 相交隔离，放回同一共享画布，再按该期统一尺度注册到 `fishRegistration`。该过程不能用逐帧轮廓测量替代登记。
- `atlas.sources` 保留真实源图路径、尺寸、哈希及规范网格路径。`atlas.species[ID].stages[].frames[]` 记录 `source/cell/sourceAnchor/anchorMethod/fixedAnchor/path/sha256`；`fixedAnchor` 为 `[160,210]`。物种条目同时记录 habitat、图集、活鱼图标、回退来源／用途与对应哈希。
- `atlas.ponds[river|sea]` 为 `{source, sourceSha256, png, path, sha256, water}`；`water.polygon` 是登记水面的 `[x,y]` 点数组，`color` 是整数颜色，`alpha` 是水色层透明度。导出 `fish-habitats.json` 只保留运行需要的 pond 路径及 water 参数。
- 内容 bounds 只用于填充独立成熟选择图；不能把选择图的 Alpha bbox 裁切与居中方法回用到四帧动画注册。

## 固定身体锚点与画风

- 以任务卡最新认可参考统一像素色块、阶梯轮廓和离散明暗，同时保留物种可辨认的头型、身体、花纹与鳍尾；避免连续柔光、细碎拟真纹理及缺少特征的粗块。
- 每帧人工登记同一定义的鳃后躯干解剖点为 `sourceAnchor`，使用原始整张源图的绝对像素坐标，再注册到场景固定点 `(160,210)`。不同源格的绝对坐标可以不同；固定的是解剖定义与场景目标，不是强迫所有帧填同一组原图数字。登记保留源图、源格与锚点依据，不用逐帧 bbox 中心代替解剖点。
- 同阶段四张原画共享相对该锚点的 `sourceCanvas` 与尺度，允许鳍尾轻摆，不允许整个躯干随帧漂移或忽大忽小。原图中躯干形体或长度不一致必须修订原画，不能用逐帧注册、缩放或裁切补偿来掩盖。
- 三个阶段分别生成鱼苗、成长期和成熟期形态，不能仅把成熟图缩小得到前两期；idle 也不能用单图平移、缩放或滤镜伪造独立原画。
- 不逐帧测 bbox 来重居中或逐帧缩放到同一包围框。同阶段使用共同转换，真实不稳定原画应返工。
- 鱼体透明图不烘焙鱼塘、水花、地面阴影或文字。站位须落在所属 habitat 的真实水面内，避免把鳍尾放到岸上。静态回退、透明选择图与动画复用同一版本活鱼来源。

## 展示时序与实际经营

展示周期等于真实批次时长，无保底，短批次三档（每阶段至少 1 秒）：真实时长够全部阶段加 1 秒时完整播放，只够首末两阶段加 1 秒时只播首、末阶段，再不够只显示最后阶段（用户 2026-11-22 确认）；完整档三期均分；每期四帧、每帧 300ms。成熟期最后 300ms 用 smoothstep 淡出，下周期前 300ms 再用 smoothstep 淡入鱼苗。帧／淡变参数是本轮配置，后续按最新任务卡调整并记录；只显示最后阶段时不做淡变。

淡变只影响鱼体，所属海河固定背景、水色层与动态水波独立保持。新增养殖从鱼苗开始；成熟鱼先消失，下一期鱼苗再出现，不额外显示仓库产品或调用收成动作。真实短批次按原经济数据结算，每批从自身开批时刻起算，不跨真实收获延续相位；换养立即改新 ID 并重置该鱼视觉周期。

## 接入与交付证据

- 加载器按该鱼 habitat 加载对应固定背景和同种图集，切成三期各四张纹理；挂载接口接收 `{pond, stages}`，使用 nearest 并保留原设施卡命中，不能仍固定请求旧单一 pond。
- 图层顺序固定为背景 → 鱼 → 水色透明层 → 程序动态水波。鱼、水色和水波限制在对应 `water.polygon` 内，水波在鱼体淡出／淡入时保持独立动态；不能把水色或动态波纹烘焙进鱼体图集。
- 仅可见且活跃鱼塘创建实例；滚出、切页、后台与弹窗底板完全遮住时销毁，普通弹窗打开时背后可见的动画继续播放；回到视口按当前展示时刻采样。图集缺失／加载失败显示同 ID 静态回退。动画 WebP 不加入启动预缓存。
- 养殖选择器使用 `fish-<ID>` 活鱼图，保留详细／仅图标显示模式和实际生产周期；仓库继续用 canonical `<ID>` 物品图。
- 素材所有者交付源图、提示词、布局、三期独立帧、PNG／WebP、选择图、静态回退、海河背景及水域运行登记；公共挂载、资源门、技能资料各由任务卡指定的单一所有者整合，不能并发改同一共享文件。
- 验收按 `farm-art-review`：源图与连续分镜、成品及实际手机图块分别审；没有真实游戏循环证据时，只报告静态审图范围。文件存在、元数据完整、哈希、帧数或资源门通过都不能代替画风、无抖或选择器可辨识性的确认。

生产导出属于资源转换，可在任务授权内执行；测试、`npm run art:check`、浏览器预览、技能验证器、语法／运行检查和编译仍须遵守当前授权。没有验证授权时明确记录未运行，推送必须有本次明确指示。
