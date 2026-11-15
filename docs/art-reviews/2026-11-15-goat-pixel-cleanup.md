# L04 奶山羊左侧邻格残像修复与静态复查

- 日期：2026-11-15。
- 用户反馈：奶山羊动画左侧混入不该有的像素。
- 范围：L04 成年进食四帧、PNG／WebP 图集、裁切登记和同 ID 静态设施回退；保留原画动作、物种身份、解剖脚点、嘴点与共享尺度。
- 文件所有者：诊断阶段仅拥有本报告；原饲料负责人结束共享所有权、PM 明确交接后，`/root/goat_pixel_cleanup` 接手 L04 裁切生产链、登记与回退。V8 饲料及其共享位置规则保持当前交接版本。
- 方法：按 `farm-livestock` 与 `farm-art-review` 静态查看当前精确源稿、四帧、PNG／WebP 图集及回退，并针对读取 Alpha 和源坐标；未执行测试、资源检查、游戏运行、预览、语法检查、编译或推送。

## 修复前证据与结论

目录中 `src/content/game-data.json` 将 L04 对应为奶山羊，产出为山羊乳。当前动物使用 `assets/livestock/raw/pixel-v5-feeding-accessories.png`（1254×1254），并通过 `assets/livestock/feeding-registration-v5.json` 登记成年四帧。原稿保留，未重画。

实际打开以下精确文件：

- `assets/livestock/raw/pixel-v5-feeding-accessories.png`。
- `assets/livestock/animals/L04/adult-{0,1,2,3}.png`。
- `assets/livestock/atlases/L04.png`。
- `public/art/livestock/animals/L04.webp`。
- `assets/livestock/alignment/L04-adult.png`。
- `assets/livestock/reviews/feeding-v5/accessories-goat-tail.png`（已有尾／后脚局部证据）。
- `assets/source/art/scene-L04.png` 和 `public/art/scene-L04.webp`。

修复前成品结论：**不合格退回（裁切邻格污染）**。成年第 1、2、3 帧左侧均有独立浅色像素条；不是黑底查看器显示低 Alpha RGB 的误显，PNG 实际存在 Alpha≥128 的不透明像素，发布 WebP 同样保留。第 0 帧无此左侧孤立组件。

| 帧号 | 主体 bounds（左、上、右开、下开） | 多余组件 bounds | 多余像素数 |
| --- | --- | --- | --- |
| 0 | `[70,144,237,277]` | 无 | 0 |
| 1 | `[71,144,237,273]` | `[63,244,64,249]` | 5 |
| 2 | `[71,144,237,270]` | `[63,233,64,237]` | 4 |
| 3 | `[72,144,237,270]` | `[63,217,64,221]` | 4 |

上述组件数来自当前逐帧 PNG 的四邻接 Alpha≥128 读取，只用于说明污染坐标，不构成游戏或循环验收。

## 根因与最小修复

L04 四个源脚锚是 `[109,973]`、`[362,973]`、`[616,973]`、`[870,973]`，共用 canvas 为 `[-108,-192,251,218]`。因此四个实际源窗分别从 x=1、254、508、762 开始，均从 y=781 开始。当前 L04 没有 `cellRects`，生产器直接提取整个共用窗口。

上一格山羊的右耳末端分别到 x=254、509、762，进入下一帧左缘。三个被带入区域依次位于原图 y=935..941、919..924、897..901；经过现有缩放后成为上述 x=63 的孤立浅色条。原稿动物本身是隔离的，实际透明间隙足够；不需 imagegen 补画或删除原画像素。

生产器 `scripts/export-livestock-animation.mjs` 已支持 `feeding-registration-v5.json` 阶段的 `cellRects`，先与 `sourceCanvas` 相交，再按原相对位置填回透明画布。可以登记四个真实隔离区，例如：

```json
[
  { "left": 0, "top": 781, "width": 260, "height": 218 },
  { "left": 260, "top": 781, "width": 255, "height": 218 },
  { "left": 515, "top": 781, "width": 255, "height": 218 },
  { "left": 770, "top": 781, "width": 255, "height": 218 }
]
```

分界 x=260、515、770 都落在真实透明间隙中，隔离相邻山羊而不删当前格主体。若仅清除用户指出的左侧污染，保留原 canvas、`stageScale=174/251`、`fixedGround=[138,270]`、四个 sourceAnchor、嘴点和 scenePlacement，只补 cellRects 即可；应由取得共享所有权的素材负责人重导四帧和同一发布图集。

## 同时发现的现有耳尖裁切

原共用 canvas 的右界也裁掉每帧自己右耳的少量源像素。按 Alpha≥200（生产器当前阈值）在上述真实隔离区读取：

| 帧号 | 当前格完整原画 bounds | 超出现有 canvas 的有效源像素 |
| --- | --- | --- |
| 0 | `[11,791,255,983]` | 24 |
| 1 | `[266,791,510,977]` | 39 |
| 2 | `[520,791,763,973]` | 30 |
| 3 | `[775,791,1018,973]` | 37 |

原画相对脚锚的最大右开界为 +148，现有 canvas 右开界为 +143。完整保留耳尖需共用 canvas 宽度至少 258（右开界 +150，留 2px 余量）并仍使用真实 cellRects。若把宽度改为 258 却沿用当前 `maxWidth=174` 的尺度推导，会缩小动物；应显式保留原 `174/251` 的共享缩放并复查整段固定脚点、嘴点和躯干站位。此项是完整轮廓修复的依赖，不应通过删除耳尖或缩小动物来规避。

## 已按所有权交接更新的文件

1. 持久输入：`assets/livestock/feeding-registration-v5.json` 的 L04 成年阶段（真实 cellRects；如恢复耳尖则同步共用 canvas／共享尺度契约）。
2. 持久生产器：仅在需要显式保持既有共享尺度时修改 `scripts/export-livestock-animation.mjs`；已有隔离路径可直接复用。
3. 派生资源：L04 四张 `assets/livestock/animals/L04/adult-*.png`、`assets/livestock/atlases/L04.png`、`public/art/livestock/animals/L04.webp`、`assets/livestock/alignment/L04-adult.png`，以及受影响的 accessories 规范网格／静态证据。
4. 派生登记：`assets/livestock/layout.json`、`assets/livestock/atlas.json`；只有视觉数据确有变化时同步 `src/content/livestock-visuals.json`，不得覆盖其他负责人刚完成的 feed 更新。
5. 同 ID 回退：由同一生产链更新 `assets/source/art/scene-L04.png`、`public/art/scene-L04.webp` 及设施登记中的真实来源／哈希；目前回退使用第 0 帧，没有第 1..3 帧左侧污染，但完整轮廓修复后仍须同步。

选择图成品、仓库山羊乳图、经济数据、生产／任务统计、其他物种原画与动物帧均未由本次窄生产重导。V7 选择图登记中的旧输入哈希保留为当时真实 imagegen 输入证据，未伪写为本次裁切后的新哈希。

## r1 实际修复

PM 确认完整耳尖和邻格污染属于同一裁切缺陷，已一并修复。此次是保留原稿的裁切／归一转换，**没有重新绘图，没有 imagegen 新调用，没有补画或改动源 PNG**。

- `feeding-registration-v5.json` 的 L04 共用 canvas 宽 258，真实 cellRects 按上述透明间隙登记；`scale=174/251`，`samplingCanvas=[251,218]`，修订名 `l04-cell-isolation-r1`。
- 生产器增加可选显式有限正数 sourceScale。L04 输出仍使用原 `stageScale=0.6932270916334662`、原 sourceAnchor、`fixedGround=[138,270]`、嘴点和 supportXRange。四帧 scenePlacement 左上仍为 `[63,137]`，高度仍为 151，只将包含耳尖的输出宽扩到 179。
- 为避免直接 258→179 的最近邻整数舍入使主体采样微变，将透明画布补到原采样宽 251 的整数倍 502，按原 251→174 的映射缩到 348，再裁取前 179。保留原 producer 的 nearest／cover 策略，未通过位移、缩小或逐帧 bbox 调整主体。
- `grounding={x:140,y:269.5,radiusX:58,radiusY:10}`、支撑脚区和 mouth 登记保持原值。
- 生产命令为 `node scripts/export-livestock-animation.mjs --species=L04 --refresh-scenes`。该窄路径保留已有选择图、V8 feed、其他物种及 barn，只重导 L04 资源，更新对应登记及 accessories 规范网格内 L04 行；普通完整生产仍消费同一持久修复输入。

针对归档第 0／3 帧进行静态像素读取：原主体不透明像素的 RGB／Alpha 变化均为 0；右侧分别恢复 12／18 个输出耳尖像素，第 3 帧左侧 4 个邻格像素被移除。第 1／2／3 帧原孤立 x=63 像素列均不再存在。此处数字只说明局部转换，视觉结论仍依据实际开图。

## V7 真实输入归档

重导前逐字节保留真实旧 `adult-0.png` 和 `adult-3.png` 于 `assets/livestock/choice-input-archive/v7/L04/`。`choice-registration-v7.json` 与 atlas 选择图 referenceFrames 现在指向该持久快照，保留原 sha256／inputHash，并明确 `archiveOf`、`originalInputPath`、归档日期和原因。`choice-prompts-v7.md` 原调用路径历史不变，只追加归档说明。

`scripts/check-facility-art.mjs` 的路径约束仅增加严格归档分支：快照必须位于 `assets/livestock/choice-input-archive/v7/<ID>/<adult-or-mature>-<0-or-3>.png`，archiveOf／originalInputPath 都必须精确等于当时规范路径，inputHash 必须等于原 sha256，随后继续读取快照逐文件严格比对真实哈希。未运行该检查；未放行任意路径，也未声称新进食帧参与了旧选择图生成。

## 静态复查证据

持久证据根目录：`assets/livestock/reviews/goat-pixel-cleanup-r1/`，由同名 `.mjs` 仅做静态图片合成：

| 文件 | 用途与来源 |
| --- | --- |
| `four-frames-before-after.png` | 上排修复前、下排修复后，正常底色；前 0／3 是真实原输入归档，前 1／2 是未改原稿按旧裁切与旧缩放重建，未冒充已有旧文件 |
| `four-frames-before-after-nearest4x.png` | 四帧相同裁切窗口，最近邻 4 倍查看左侧污染消失及完整耳尖 |
| `source-cells-normal.png`、`source-cells-nearest4x.png` | 原稿经当前既有 Alpha≥200 规则的真实隔离格，保留全动物与耳尖，正常底和放大 |
| `published-webp-normal.png` | 实际正式发布 WebP 的四格，正常底查看完整轮廓和透明边缘 |
| `before-after-130.png` | 修复前／正式发布 WebP 四帧的 130px 设施静态合成 |
| `published-four-frames-130.png` | 当前正式 WebP 四帧、当前 V8 饲料、实际共享 livestockFeedLayout 的 130px 静态用途证据 |
| `fallback-130.png` | 实际同 ID 回退 WebP 缩为 130px |
| `provenance.json` | 真实原稿、前后帧来源、sourceIsolation、stageScale 和正式资源哈希 |

实际重新打开正常底前后图、最近邻放大图、原稿隔离格、发布 WebP 正常底、正式四帧 130 图及正式回退。静态可见第 1／2／3 帧左侧孤立条已消失；各帧右耳尖都能与隔离原稿对应，主体、腿蹄、尾、角、脸型与原进食姿态保持，未把相邻山羊部位带入；130 图及回退保持同一山羊来源。

正式 PNG 图集 SHA256：`342851af04341b095952937c95f6183e8d5827e657bd9125e0369427bd9d8468`；发布 WebP 图集 SHA256：`864fea04049f74feae7dbaed2bb6c0d3873837230e56b2e8b34c175b29ff00f9`。回退 PNG SHA256：`b2b8d5371e91d43e6caf596c67b60920321e3221972372ccbc849757b981640e`；回退 WebP SHA256：`52b7d4dbf841e277fa214fad55d6d3c64fd8966e01790513442c6c6208a75e35`。哈希用于精确版本追溯，不充当视觉通过依据。

## 最终状态

- 源图、PNG、WebP、正常底放大和 130px 静态用途：**本次邻格残像与完整耳尖裁切修复静态通过**。
- 同 ID 回退：已同步原稿与正式 WebP并静态开图复查；完整设施表现仅限静态证据。
- 真实游戏运行、贴图缓存替换及四帧循环：未验证，交 PM／画布负责人按授权整合；不能凭静态图宣布真实循环无抖。
- 测试、资源门禁、预览、语法检查、编译、推送：本子任务均未执行。
- 用户认可：未获得；内部静态复查不代替用户认可。
