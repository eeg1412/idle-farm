# 2026-11-19 开屏黑块与采样独立审阅

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

状态：最终 round6 **源图／WebP／手机离线静态合成通过**；旧稿和round5缺陷均已闭环。仅为本轮独立美术审阅，不代表用户已认可，也不证明 Pixi／浏览器运行通过。

## 输入与实际查看

- 用户截图：`/workspace/scratch/a46f8d1a2380/upload/image(20261119-065656).png`，325×418，SHA256 `34fad3ffafed38d14e11ab4c03d667c2c8c32c7cc6a48aa2a62856538d605a98`。
- 旧源：`assets/source/art/loading/managers.png`，1145×1374，SHA256 `e99a275db1fc05c9bdcd236d44897f985611e1df6c0f4941cfc7cce80af2d8bc`。
- 旧发布图：`public/art/loading/managers.webp`，1024×1344，SHA256 `193d395c3abcbabbecfb1a535d823f535160312974d4340f760045706522a88b`。
- 已实际打开截图、精确PNG、PNG正常背景／奶油底／透明棋盘、中央局部与对应WebP正常背景；像素值直接读取原文件，压缩证据图仅用于定位，不能替代像素原值。
- 参考：当前岗位男女微笑原立绘，22人身份表 `assets/source/art/loading/references-all22.json` 与既有 `review-all22/references/`；新图完整身份对照须重新执行。

## 退回单 OPENING-BLACK-01

对象为22管理员整幅群像的原画暗缝；已同步 PM 与素材所有者 `opening_filter_fix`。正常背景、奶油底、棋盘底上均能看到同位置的大块近黑填充；相应像素 Alpha 252–253，接近不透明。黑色已存在于PNG，WebP保留。不是仅由透明图查看器黑底造成，亦无证据把主因归给 Pixi alpha；改变采样不能消除源图内部近黑块。

| 位置 | 源PNG坐标范围（左上至右下） | 用户截图近似范围 | 现象 |
| --- | --- | --- | --- |
| A | (499,552)–(613,717) | (141,169)–(174,218) | 矿业男女下身至精制男女之间，近黑连续片包围金锭／钳子；缺少清楚衣物归属 |
| B | (555,760)–(608,862) | (157,232)–(174,264) | 精制女右侧、精制男袖口和商人女帽间大块暗缝 |
| C | (747,640)–(810,714) | (214,194)–(233,218) | 精制男与仓库女肩颈附近黑片，与正常头发、衣物邻接 |
| D | (772,893)–(809,1011) | (221,272)–(233,308) | 商人女与商人男背包附近的近黑长缝 |

截图只用于视觉对应，其缩放／裁切参数未知，因此截图坐标标为近似；源坐标和像素读取精确。框内包含有效腿、手、衣物和道具，不是整框删除或整框透明的依据。正常深色矿工制服有可见衣片、金边和结构，不与无归属暗缝等同。下列低RGB／高Alpha读值仅证明旧画黑片来自原文件，不是以黑色色值或阴影本身判退的阈值。

| 精确源坐标 | PNG RGBA | 对应WebP邻近坐标 | WebP RGBA |
| --- | --- | --- | --- |
| (531,677) | (25,22,21,253) | (476,662) | (23,21,19,253) |
| (577,769) | (38,32,31,253) | (515,741) | (37,32,34,253) |
| (795,679) | (27,25,24,253) | (701,664) | (24,27,22,253) |
| (798,903) | (41,35,36,253) | (704,855) | (45,35,29,253) |
| 外部透明对照 (5,500) | (0,0,0,0) | (28,512) | (0,0,0,0) |

证据目录：`assets/source/art/loading/review-black-filter/`。`central-cream.png` 保留中央局部无损合成；`initial-source-marked.jpg` 与 `initial-screenshot-marked-3x.jpg` 定位A/B/C/D；`initial-source-background.jpg`、`initial-source-checker.jpg`、`initial-webp-background.jpg` 为低体积说明图；`point-readings.json` 与 `initial-pixels.json` 保存原文件读值。

修复要求：按用户最新指令由内置imagegen重绘完整22人群像，只以canonical男女身份参考绘制新构图，消除大块无归属黑底瑕疵，人物可自然紧凑靠近、重叠或遮挡；不要求人物间留缝，不要求内部透明孔。深色衣物、头发与有归属的自然阴影本身不作为失败条件。保持11岗位男女各一人、关键道具、完整外轮廓及前排腿脚；不得脚本阈值透明或涂色掩盖原画。旧A/B/C/D是旧稿诊断位置，不约束新图人物排位。接手所有者负责新生成来源、导出和版本key，交独审新hash后复查。

## 采样链静态阅读

读取当前 `loading-screen.js`、`loading-layout.js`、`canvas-ui.js` 的loadImage与本地安装Pixi纹理代码：PNG/WebP经 `Assets.load`，Pixi图像纹理默认 `premultiply-alpha-on-upload`；本轮未发现需要更改该模式的源证据。作者已将开屏URL归类linear、其他游戏纹理保持nearest，待最终实现冻结后按实际入口复核。

linear适用于缓解缩小后的硬阶梯；不能修复源画内部黑填充。任何Pillow／Sharp线性缩小对照只作为图像近似，不等同实际GPU／Pixi采样。未启动游戏、浏览器或测试，未运行语法／运行检查或构建。

## 新整幅复查

复查按最终PNG／WebP、生成来源、布局和实现hash进行，实际打开正常背景与棋盘，逐个对照22身份／道具／外轮廓及前排脚，并合成四尺寸普通／失败手机图。最终结果见下。

用户最新纠正已纳入：从未要求人物之间必须留缝；验收允许自然紧凑群像与真实重叠，不强求内部透明孔，不为造孔误删衣物。只判完整22身份、外轮廓／手机可辨及无大块无归属黑底瑕疵。


### 新整幅候选 round5

`managers-all22-round5-redraw.png`，SHA256 `7c200cd4a7cebdf035ebf08e6b6731145de4ee3279989ec5c7f7feaf5e4dca62`。已实际开原图、正常背景、奶油底、棋盘：22脸按6／6／6／4齐全，可逐一对应四张canonical联系表；旧中央无归属黑团消失，正常矿工深色衣物保留。齿轮零件盒、双臂钳夹独立金锭、仓库女编号章可辨，前排腿脚完整；左田地女头发／剪具未在x0发生有效轮廓硬截。

唯一明确退回项 `OPENING-BLACK-02`：渔场男右手／前臂在画布右缘x1144、y418–484真触边并被硬截。样本(1144,440)=(252,211,177,250)、(1144,460)=(249,192,163,252)，边界最高Alpha255。证据`candidate-right-edge.png`，不是透明查看假色。只需原画补齐该边缘；未提出额外人物间隙要求，未见其他明确新缺陷。已同步PM与素材所有者。


### 最终 round6：通过限定静态范围

已实际开最终源图、PNG／WebP正常背景及棋盘、右手2倍最近邻局部，以及320×568、320×640、390×844、414×896普通／失败共8张手机图、390×844上下安全区普通／失败2张图。

- 22脸按6／6／6／4齐全。逐行对应任务女男、庄园女男、畜牧女男；农田女男、矿洞女男、渔场女男；加工女男、精制女男、仓库女男；研发女男、行脚商女男。服装／发色／主要岗位道具与四张canonical联系表对应，三项重点道具保持可辨。
- 旧无归属黑团消失，正常深色工装保留，允许自然重叠。渔场男右手、前臂与篮子已完整补齐；源图右边界最高Alpha2，WebP四边Alpha均为0，结合正常合成未见有效外轮廓硬截。前排腿脚完整。
- 手机静态图能数清22张脸，群像、标题、底部进度文案及失败重试无相互压盖；短屏与安全区仍完整。关键图为 `final/normal-390x844.png`、`final/failed-320x568.png`、`final/right-hand-2x.png`。
- 已并排实际查看同尺寸nearest／linear图像近似，linear边缘阶梯过渡更柔和。Sharp triangle缩小不等同GPU／Pixi采样；未做运行体验验收。

| 最终冻结对象 | SHA256 |
| --- | --- |
| `assets/source/art/loading/managers.png` | `421847775fdec966417b836beea4682cad95f1056c90b90484c09bd2a9b5660b` |
| `public/art/loading/managers.webp` | `7146f260276d09b88ebc791f2c84f12849ad5dcf5cfd98eebe218aad65aa4885` |
| `src/view/loading-layout.js` | `592ca16a547fa3b864f855da0e581096c5b407f83c00f9eed77115d93612587d` |
| `src/view/loading-screen.js` | `832f5ae71279df78a116b18f760e6b6d051e70322b9cccf2ffaf331cc6473e69` |
| `src/view/canvas-ui.js` | `831e6fdf86a247c8c79f7be7b938f576f60384ee7825206a58284956ff3269d3` |

来源：`managers-all22-round5-redraw.prompt.txt`为四张canonical联系表输入的整幅重绘；`managers-all22-round6-edge.prompt.txt`为唯一右缘补全；实际登记见`generation.json`及`export-manifest.json`。现用版本key为`all22-v2-redraw-linear`，布局边界`{x:24,y:116,width:976,height:1141}`。静态合成数据与精确hash在`final/measurements.json`，源／导出读值在`final/source-export-readings.json`。

采样入口已按实际源码复核：`createLoadingScreen → loadOpeningImage → smoothImages → loadImage → source.scaleMode`，仅三张开屏URL为linear，其余仍nearest；未覆盖Pixi默认alpha模式。保留原加载／重试／输入和底部排版路径。未执行测试、浏览器／游戏预览、语法或运行检查、构建。

本轮审阅完成，报告和`review-black-filter/`证据冻结，**结束opening_black_visual文件所有权，交还PM**。
