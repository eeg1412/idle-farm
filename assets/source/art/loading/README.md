# 分层开屏原画

三层均由内置 `image_gen.imagegen` 分别新绘，非程序绘制。完整原始输出保留为 `background.png`、`managers.png`、`logo.png`；具体提示词在同名 `.prompt.txt`，工具输出来源见 `generation.json`。

| 图层 | 原图 | 发布图 | 发布尺寸 |
| --- | --- | --- | --- |
| 庄园背景 | `background.png`，941×1672 RGB | `public/art/loading/background.webp` | 768×1366 |
| 11岗位群像 v2 | `managers.png`，1102×1427 RGBA | `public/art/loading/managers.webp` | 1024×1344 |
| 中文标题 | `logo.png`，1983×793 RGBA | `public/art/loading/logo.webp` | 1024×400 |

群像按原微笑立绘身份重新构图，三排4／4／3，阅读顺序为任务女、庄园男、畜牧女、农田男、矿洞女、渔场男、加工女、精制男、仓库女、研发男、行脚商女。标志发型、服装与道具以 `references.json` 记录的原画为准。原稿中的行脚商展示红宝石，提示词遵循该原画；不是依据文字设定将其改为蓝宝石。

`manager-reference-contact-sheet.png` 仅由既有原画以程序合成的输入联系表，不是新绘成果。联系表与 `assets/source/art/fields.png` 在生成前已实际打开；前者用于角色身份，后者仅用于背景像素风和田园配色。群像无背景文字，标题无人物背景，背景无人无字无进度条。标题文字为「放置庄园」，无副标题。

本轮仅重导出群像：`node scripts/export-loading-art.mjs --only=managers`。背景和LOGO发布文件保留原字节，不改绘。脚本最近邻等比缩放并居中透明留边，群像有效缩放976×1264、额外左右24px／上下40px留边；质量70、Alpha质量100。尺寸、路径、SHA-256和实际字节数见 `export-manifest.json`。

2026-11-19 `composition-v2`：内置 imagegen 以旧群像作精确编辑目标、11人联系表作完整服装参考，扩绘前排仓库女、研发男、行脚商女至完整鞋脚。v64原稿、提示词、WebP和导出记录保留在 `history/v64/`，不能把旧半身硬切作为合格依据。实际输入与生成输出见 `generation.json.managerRevision`。

现行版式 `bottom-progress-v1` 由 `src/view/loading-layout.js` 的 `loadingLayout(viewport, {failed, problem, labelHeight, labelWidth})` 唯一计算。输出 logo/managers/bar/label/caption/retry/problem 的坐标与尺寸；像素参考空间等于游戏viewport。文字先设字号与换行宽，再传真实文字宽高计算第二次。

LOGO在顶部，按真实主体y85–305定位，利用其透明画布留白；群像居中；进度条与提示在底部安全区内。失败态重试与存档入口在提示下方同排，viewport窄于304px时改为上下居中，避免横屏黑边内的窄竖屏按钮越界。底部从 `viewport.inset.bottom` 加额外16px以上边距向上计算；标题同时纳入 `inset.top`。状态文字与存档入口保留实心深绿 `#203b2a` 底板。群像按Alpha>5的有效轮廓931×1205等比排入标题与进度区之间，最大113%屏宽，短屏及失败态按净空适度收放，人物/鞋脚与进度区不重叠。只有viewport矩形可裁外侧，无角色内部遮罩、渐隐或固定底裁。资源URL仍为 `?game=1&v=composition-v2`，未变更加载状态机或图片。

已做作者静态开图；交付后由独立审阅者核对角色身份、像素风、中文、Alpha及小屏合成。不将源图或WebP存在视为用户验收或实际运行通过；未执行测试、预览、检查器或构建。
