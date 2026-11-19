# 分层开屏原画

当前人物为内置 image_gen.imagegen 整幅新绘的22人自然群像，版本 `all22-v2-redraw-linear`。背景及准确中文「放置庄园」LOGO源图／WebP均保持原字节。来源、实际输入、逐轮提示与导出登记见 generation.json、references.json、export-manifest.json。

| 图层 | 当前原图 | 发布图 | 发布尺寸 |
| --- | --- | --- | --- |
| 庄园背景 | background.png，941×1672 RGB | public/art/loading/background.webp | 768×1366 |
| 22人群像 | managers.png，1145×1374 RGBA | public/art/loading/managers.webp | 1024×1344 |
| 中文标题 | logo.png，1983×793 RGBA | public/art/loading/logo.webp | 1024×400 |

## 身份与当前规格

唯一身份依据为 docs/Pixel-Characters-Complete-Pack/立绘/**/*微笑.png 的22张既有全身原画。路径、SHA-256、gender及位置见 references-all22.json 与 references.json。四张 manager-all22-reference-row1.png 至 row4.png 是有ID/gender标签的程序联系表，仅作身份参考；最终群像由内置绘图真实新绘，未拼贴联系表。

从后／上排到前／下排，每排左→右：

| 排 | 人数 | 身份 |
| --- | --- | --- |
| R1 | 6 | tasks女／男；estate女／男；livestock女／男 |
| R2 | 6 | field女／男；mine女／男；fish女／男 |
| R3 | 6 | processing女／男；refining女／男；warehouse女／男 |
| R4 | 4 | research女／男；merchant女／男 |

原画优于辅助文字设定。加工女为敞口木齿轮箱与机械工具；仓库女为包裹与手持数字印章；精制女为双臂金属钳夹独立矩形金块；行脚商女展示红宝石。新档默认6女5男岗位表独立固定在代码，不从开屏推断。

用户当前要求自然紧凑群像，允许人物靠近、正常重叠、深色服装和有归属的遮挡阴影；不要求人物之间留缝或内部透明孔。不以制造间隙或删衣物处理瑕疵。验收聚焦22个身份、自然完整群像与外轮廓／前排鞋脚、无用户报告的大块无归属黑底和适用手机可辨性。

## 本轮生成与历史

旧all22-v1的round1至round3原图、提示、引用与审阅证据均保留。round3曾通过静态审阅，但用户重新报告黑块后已重开，不沿用旧通过结论。独审在旧源PNG确认人物之间已有不透明近黑填充，不能靠linear或改alpha模式消除。

managers-all22-round4-unused-local.png 是用户改为整幅重绘时已在途的局部编辑输出，明确未采用。managers-all22-round5-redraw.png 仅以四张canonical身份联系表为输入整幅新绘，未输入旧群像；独审确认22身份、自然构图、三项道具与旧黑团消失，仅退回渔场男右前臂／手触右画布硬截。

managers-all22-round6-edge.png 只以新round5为编辑目标，由内置imagegen补完整右前臂／手与外缘余量；其原字节副本为当前managers.png。没有回用旧黑块图、程序加边掩盖截断、脚本涂色或Alpha阈值修画。managers-all22-round6-edge.prompt.txt 与当前managers.prompt.txt 保存实际提示。round5提示中的间隙措辞仅作真实历史记录，不是当前验收条件；没有为满足该措辞机械重画或改衣物。

历史11人素材仍在history/composition-v2/与history/v64/。

## 导出、采样与版式

仅执行素材转换 `node scripts/export-loading-art.mjs --only=managers`：nearest按单一比例缩放源图为976×1171，在1024×1344透明画布居中（左右24px，上86px、下87px），WebP质量70、Alpha质量100；不裁切或重绘，背景／LOGO发布图未重写。人物WebP为369862字节。

运行时仅开屏局部linear：loadOpeningImage登记背景／人物／LOGO三个专用URL，再沿原loadImage加载；其他游戏纹理保持nearest。人物URL为 `?game=1&v=all22-v2-redraw-linear`。不改全局Texture默认、alpha模式或LRU；导出nearest与运行时linear是不同阶段。

loadingLayout仅按新导出实际Alpha>0边界 `{x:24,y:116,width:976,height:1141}` 更新群像几何输入；最大可见宽度仍为视口96%。源图Alpha>0边界 `{x:0,y:35,width:1145,height:1339}`，Alpha>8边界 `{x:0,y:37,width:1140,height:1334}`；见redraw-alpha-measurements.json，阈值仅用于读数，未改通道。底部进度、失败重试／存档操作、safe inset、LOGO几何、至少1000ms完整显示与300ms淡出均保持原实现。

| 当前对象 | SHA-256 |
| --- | --- |
| managers.png／round6原稿 | 421847775fdec966417b836beea4682cad95f1056c90b90484c09bd2a9b5660b |
| public/art/loading/managers.webp | 7146f260276d09b88ebc791f2c84f12849ad5dcf5cfd98eebe218aad65aa4885 |
| src/view/loading-layout.js | 592ca16a547fa3b864f855da0e581096c5b407f83c00f9eed77115d93612587d |

## 最终静态审阅与限制

本轮独审已按上述新源／成品／布局hash通过：正常背景／棋盘、完整右手及其余外轮廓、22身份／道具／前排鞋脚、四手机尺寸普通／失败及390×844安全区静态图已实际打开。报告见 docs/art-reviews/2026-11-19-opening-black-filter.md，证据在review-black-filter/；旧all22-v1记录仅作历史。

作者仅执行资源生成、图片转换、像素读数与实际开图，未运行测试、游戏／浏览器预览、语法／运行检查或构建。静态合成不构成Pixi实际运行通过。人物资源及本轮加载／布局输入已冻结，opening_filter_fix所有权结束，后续仅由PM整合最终生产构建。
