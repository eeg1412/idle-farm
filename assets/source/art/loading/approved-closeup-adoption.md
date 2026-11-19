# 已认可近景群像接入 · 2026-11-19

当前 `managers.png` 是用户认可的 `../proposals/2026-11-19-map-ensemble/ensemble/managers-draft.png` 原字节副本，1024×1536 RGBA；没有重绘、补画、去底或改 Alpha。实际初稿与定向补齐提示分别保留为 `managers.prompt.txt`、`managers-correction.prompt.txt`；完整绘图输入、两次生成和身份来源由 `generation.json`、`references.json` 指向认可稿记录。

导出命令 `node scripts/export-loading-art.mjs --only=managers` 只转换这一层。等比 nearest、原画布 1024×1536、不加 padding，WebP70/Alpha100，393748 字节；解码 Alpha 与 PNG 逐像素相同，范围0–254，109465个全透明像素。Alpha0隐藏RGB未作背景处理。开屏背景与 LOGO 原字节保持。

运行版本 `all22-v3-approved-closeup`，布局 `closeup-bottom-bleed-v1`。调用仍为 `loading-screen.js` → `loadingLayout()` → 既有 Sprite 缩放/位置及视口 mask。人物等比宽度为视口宽+2px，左右各出血1px，图层下缘固定在视口下边界后1px；UI安全区不把人物上移，原画裁身下缘不会悬空暴露。所有状态人物几何一致；失败/存档操作保持底部，进度条与文案间距压缩。22脸和短屏控件关系交独立静态合成复查。

URL保留 `?game=1&v=all22-v3-approved-closeup`，沿 `loadOpeningImage` → `smoothImages` → 既有 `loadImage`/Assets缓存/加载任务；开屏三层局部linear采样保留，未新增缓存或加载入口。`loading-screen.js` 原字节未改，完整显示1000ms、300ms淡出、失败重试和存档入口的状态机保持。

预期变化仅为认可近景画面、全宽底边裁切和底部几何。玩法、数值、存档、音效和经营事务不变；没有为了时间显示创建新Text/Graphics或整页重绘。旧活跃source/WebP/prompt/records/layout/screen/export脚本完整保留在 `history/all22-v2-redraw-linear/`，旧审核目录不变。

精确文件SHA256、Alpha像素读取和调用链见 `approved-closeup-adoption.json`。仅做普通读写、图片格式转换、图片像素读取及源码阅读；未测试、预览、运行游戏、执行语法/运行检查、构建或push。静态合成不等于实际Pixi运行或手机验收。

独审已实际打开15种静态合成并确认22脸、近景大小、短屏失败/存档控件和390安全区不盖脸；下缘在视口外1px。证据为 `assets/source/art/approved-atmosphere-review/loading/`。实现者亲开认可源、320×568存档问题图和普通状态联系表，所见与结论一致。代码/图像候选冻结，`approved_loading_integration` 全部本任务文件所有权结束并交PM；实际游戏/Pixi/时序验收仍未执行。
