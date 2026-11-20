# 精制姿态纠正独立审图（2026-11-20）

v82 对应人物与男 CG 的旧通过结论无效。本报告只采用本轮实际打开的原图、新图和消费几何，不以文件存在或旧结论代替验收。

## 基准与首轮源姿态

已打开 `assets/source/art/refining-v3/male-fullbody-original-reference.png`、`female-fullbody-original-reference.png`，以及邻近角色 `docs/Pixel-Characters-Complete-Pack/立绘/07_加工管理/加工管理_男_微笑.png`、`10_研发管理/研发管理_女_微笑.png`。邻角仅作画风及身体姿势参照；精制原图为本次方向和身份基准。

|对象／精确版本|肩线与侧躯干|骨盆与脚|手臂、道具、身份|首轮结论|
|---|---|---|---|---|
|男 `assets/source/art/refining-v4/male/smile-pose-candidate.png`|对照原／新正常底并排，保留图左肩较高、宽袖与侧胸暴露，远侧收窄；没有变成左右镜像肩胸|原斜腰带／围裙、裤褶和两脚差异保留；图右靴外撇，未改成对称正面脚|只将头降下巴、微转目视玩家；下手承托小黄铜框玻璃滤壶，上手接触清楚可见的侧阀。酒红外衣、围裙、工具、发髻疤痕及鞋底完整|仅源图姿态通过；已发 PM 亲看。未覆盖四表情、透明成品和页面|
|女 `assets/source/art/refining-v4/female/smile-native.png`|正常浅底可见斜肩、窄远侧和斜腰围裙，保留原斜侧体态|保留交错承重腿、完整短裙／长衣／袜／靴，脚朝向不对称|上手指尖举小琥珀油瓶，下手以白紫布稳密封矿晶罐；动作与男不同，未并手端盘。护目镜、发饰与衣装保留；正常底未见光晕|仅源图姿态通过；已发 PM 亲看。未覆盖四表情、成品链|

首轮可视证据在仓外 `/workspace/scratch/a46f8d1a2380/refining-v4-review/male-v4-original-pose-candidate.png`、`female-smile-native-on-cream.png`。透明图须以正常合成和 Alpha 读取判断，不能把 A=0 的 RGB 误显当残边。

## 男女四表情与页面成品（本轮静态通过）

实际查看最终全身 canonical、runtime 正常底四表情分镜及原生脸区近图。男女均为微笑／高兴／生气／不高兴；眉眼嘴可区分，身体、手臂、器具位置和衣装稳定。男保持原非对称肩胸、斜腰／骨盆和两靴方向，女保持原斜肩、侧躯干、交错承重腿；两者发饰、围裙、工具袋及完整下装／鞋底保留。滤壶两手分工和女上油瓶／下布包矿晶罐完整握持关系均在全身图可见，没有托盘、多余手臂或浮工具。

|对象|精确最终源／canonical／runtime|真实导出链与冻结指标|
|---|---|---|
|男四表情|`assets/source/art/refining-v4/male/{smile,happy,angry,sad}-fullbody-native.png` → `docs/Pixel-Characters-Complete-Pack/立绘/08_精制管理/精制管理_男_{微笑,高兴,生气,不高兴}.png` → `public/art/managers/portraits/refining/male-{smile,happy,angry,sad}.webp`|每张原生／canonical 1024×1536；从已保存 canonical 裁 `[0,0,1024,620]` → 477×289 → x=7 合入 491×289；`faceX=242.4, inkLeft=115, inkRight=383`|
|女四表情|`assets/source/art/refining-v4/female/{smile,happy,angry,sad}-native.png` → 同 canonical 目录 `精制管理_女_{微笑,高兴,生气,不高兴}.png` → `public/art/managers/portraits/refining/female-{smile,happy,angry,sad}.webp`|每张原生／canonical 1024×1536；从已保存 canonical 裁 `[0,0,1024,550]` → 538×289 → x=-21 合入 481×289；`faceX=250.9, inkLeft=138, inkRight=370`|

来源为各自实际原始全身参考的一张微笑原生编辑，其余三张为该微笑的面部表情原生编辑；原提示词保存于各自 `prompts.md`，真实转换／指标分别在男 `export-manifest.json`、`metrics.json`、`face-comparison.json` 与女 `manifest.json`。没有以胸像、插值放大或脸身脚本拼接充当新全身源。

独立像素读取：男 canonical 与 native 的 RGB 未变化，透明处理为 A≤8 清零；女四张 canonical 与该处理后的各 native RGBA 完全相等。重现各自已登记的 canonical 裁切／缩放／合成及 A≤8 清零后，男四张 runtime Alpha 逐像素相等，女四张 runtime RGBA 逐像素相等（女为 lossless exact）。这些只证明资产链，视觉通过另依据实际正常底图。男顶行只有 4–11 个弱 Alpha 像素、没有 A≥64 像素；已看顶部 3× 正常合成，发弧完整、留白紧但未切断有效发梢。女发尖和鞋底亦均在画内。

脸尺度以实际可见脸肤区人工近似框复核，不能以 faceX 代替：男旧 75×68px、新 66×67px（口径含耳颊、不含颈，约 1–2px 容差）；女旧 77×76px、新约 68.8×76.7px（不含耳发，源框约 4px／旧页框约 2px 容差）。同一性别脸高保持原量级，宽度随回到原斜侧脸构型而收窄；旧图仅用于页面视觉尺度，不能作为身体姿态通过依据。

已静态读取 `managerBanner` 的实际页面宽度、定位与后绘气泡／尾部／按钮层序。320／390／414 屏宽对应横幅高 135／167／177；逐张实看三尺寸正常合成，男滤壶、可见侧阀与操作双手可读；女小油瓶、上手和矿晶罐主体可读，脸／上手未被气泡遮住。女较低的手与布在胸像底沿截断，完整握持关系保留于 canonical，不借全局 UI 调整遮盖缺陷。

仓外实际证据：`male-v4-canonical-four-expressions.png`、`male-v4-runtime-four-expressions.png`、`male-v4-old-new-{320,390,414}-ui.png`；`female-final-canonical-four-on-cream.png`、`female-final-runtime-four-on-cream.png`、`female-v4-all-four-{320,390,414}-ui-independent.png`；`refining-v4-native-face-comparison.png` 与各自像素／几何 JSON。静态标签文字为占位，未验证实际对白排字。

## 消费链

已静态读取 `src/main.js` 的 resize、`src/platform/layout.js` 的 viewportLayout、`src/view/loading-layout.js` 与 `loading-screen.js` 的 arrange。横屏先产生内嵌竖幅；例如 844×390、零 safe inset 得到 **180×390**，不能直接以 844×390 拉满 CG。最终 CG 须用新实际脸框和 logo／底部进度几何，在 320／390／414 竖屏及该横屏内嵌幅正常合成复查。

## 男 CG（本轮静态通过）

实看 `assets/source/art/refining-v4/male-cg/original.png` 与 `public/art/loading/scenes/refining-male.webp` 的正常静态合成。原生 1024×1536、无放大；实际提示词 `prompt.txt` 和来源／导出信息 `metrics.json` 同目录。图左近肩宽、远肩收窄，胸和围裙侧向右侧工作台，头单独回望玩家；一手稳定台边玻璃滤壶，另一手确实接触可见侧阀。黄铜框、玻璃接收筒、顶锥形滤杯和浅琥珀液清楚，无端盘展示、多余手臂或浮工具。身份发髻、疤痕、酒红工作衣与农矿精制环境保留。

实际裸露脸保守框 **(307,385,218,215)** 可冻结。按上述真实 viewport 及 loading 几何合成 runtime 和实际 logo，证据在仓外 `male-cg-v4-loading-contact.png`、`male-cg-v4-loading-{屏宽}x{屏高}.png`、`male-cg-v4-loading-geometry.json`：

|屏幕（零 safe inset）|实际内容幅|logo 墨迹下沿至脸框上沿|关键操作与进度|
|---|---|---|---|
|320×568|320×568|61.90px|双手／阀／滤壶可见；条在其下|
|390×844|390×844|104.06px|双手／阀／滤壶可见；条在其下|
|414×896|414×896|110.47px|双手／阀／滤壶可见；条在其下|
|844×390 横屏|180×390，居中|45.27px|窄幅裁切后工作关系仍可辨；条在其下|

此项通过源图和静态成品／构图；静态合成采用标签高度 20px 与模拟标签文字，未运行 Pixi 或核实实时文字测量、加载失败按钮及游戏体验。未改全局布局迁就图像。PM 已亲看源姿态；已通知整合者使用新 source／脸框。

## 最终冻结

男女人物和男 CG 的本轮源图／最终图片／静态适用性均通过，无未关闭图像退回项。PM 已亲看男女首张原／新姿态、最终四表情 runtime 与 390 横幅、男 CG，并确认本轮静态用途通过；此项不表述为用户已认可。

最终回读六文件源 diff：`canvas-ui.js` 只将精制 portrait 缓存 3→4；`loading-screen.js` 只将男 CG 缓存 v2→v3；`manager-portraits.json` 仅精制男女更新为上表实际指标；`loading-scenes.json` 仅男 CG 使用新 native source、1024×1536 和 `(307,385,218,215)`；`manager-dialogue.js` 仅男 bio 首句改为调节滤壶；角色设定 Markdown 仅精制男女两行外观／工作动作。未发现为适应图片而更改全局 UI／加载几何。消费键与本轮成品一致，指标均与实际导出来源相符。本审阅报告冻结并释放写入。

范围限制：仅图片、像素、源文本与静态合成审阅；未运行游戏、浏览器预览、测试、语法检查、冒烟、构建或 art:check。源图通过不代表运行体验或用户认可。
