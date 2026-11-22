# PWA透明主体与橙色底图

用户要求重新设计PWA图标，绘图背景透明，由代码填充可更换的纯色，当前橙色。本任务与时空胶囊图标无关，新建干净上下文，不修改胶囊素材。

最终配色修订：用户要求将绿色屋顶改为红砖；PM一度将底部叶片也改金黄，用户明确“矫枉过正，下面的麦子叶子可以是绿色”。最终所有屋顶／门廊顶／烟囱帽砖红，麦穗金黄、底部叶片自然绿色，其余建筑结构与透明背景不变。R1绿屋顶与R2全暖金植物仅保留在history，不作为最终版本。

## 冻结接口与所有权

| 任务 / agent | 独占文件 | 输出 |
| --- | --- | --- |
| PWA-ART / pwa_transparent_art | `assets/source/art/pwa-icon-v3/foreground.png`、`prompt.txt`、`generation.json`及必要拒稿文件 | 内置绘图透明新原稿、真实提示词和来源 |
| PWA-CODE / pwa_orange_export | `scripts/export-pwa-icons-v3.mjs`、`assets/source/art/pwa-icon-v3/export-config.json`与`export-manifest.json`、`public/icons/manor-v3-*.png`、`public/favicon.ico`、`public/manifest.webmanifest`、`index.html`；替换后移除旧六张`public/icons/manor-v2-*.png` | 可配置纯色合成、六规格PNG/ICO、HTML/manifest接入 |
| PM / 独立审图 | 本卡、反馈清单、`docs/assets.md` PWA段、`docs/art-reviews/2026-11-22-pwa-icon-v3.md`及json、证据忽略规则 | 实看新原稿和导出小图／maskable，核对diff与未验证状态 |

ART只拥有明确文件，不拥有整个v3目录；CODE不能改绘图原稿和prompt。你不是独自在代码库工作，保留用户当前大量暂存及未暂存修改；尤其静态哈希资源清单、存档、胶囊和其它玩法不改。共享最终图标生成命令仅CODE执行，等待真实foreground.png交回后再运行一次资源导出。

## 设计输入与行为边界

最终设计：简洁醒目的庄园小屋徽记，砖红屋顶、奶油白墙和明亮窗户，配金黄麦穗／绿色叶片，像素阶梯与分组明暗，32／48px可认，无文字、场景、外框、地面影或烘焙背景。小屋造型为PM实现选择，砖红屋顶及底部绿色叶片按用户后续要求修订。

绘图用内置image_gen、transparent_background=true；不把旧建筑裁切当新画，不把纯色方块／圆盘画进原稿。可实开 `public/icons/manor-v2-512.png` 和既有PWA原图作风格参考，不编辑旧源。只需一张透明前景，maskable也消费同一前景。

| 触发／条件 | 允许改变 | 必须保留 | 证据 |
| --- | --- | --- | --- |
| PWA与网页图标资源 | 透明原稿，代码纯橙底，导32／48／180／192／512及maskable512，ICO含32／48 | manifest的id/name/start_url/scope/display；HTML body单canvas；现有主题色、启动页底色、SW更新及哈希规则 | 原图Alpha、导出小图与裁切，head／manifest及exporter diff |
| 更换图标底色 | `export-config.json`默认`backgroundColor: "#F28C28"`，改配置后重新导出 | 原稿始终透明，不为每种颜色重画，不渐变或用HTML/CSS当图标背景 | 程序composite纯色fill与source-over链 |

CODE可把主体按Alpha有效范围做等比居中，保留边缘；普通图主体大且适合小尺寸，maskable关键内容按项目既有中央80%直径安全圆排布。裁切安全可直接读有效像素半径确定缩放并留少量余量，不程序修改主体。正规PNG最终不透明，透明原稿保留。32/48需实际看辨识度，maskable圆形裁切需实际看完整性，不能只读尺寸。

## 最少读取与方法

- ART：imagegen技能、`docs/assets.md`现PWA段、旧512图；原稿及提示词交CODE和PM。
- CODE：`scripts/export-pwa-icons-v2.mjs`、`public/manifest.webmanifest`、`index.html`、`scripts/asset-manifest.mjs`固定URL段（只读）、本卡。
- PM：farm-art-review已读，实开参考／新源／32、48、192和maskable；源码核对导出Alpha处理与可配置纯色。正常图像合成证据允许，放 `assets/source/art/pwa-icon-v3/reviews/`，不提交图片，记录sha256与复现入口。
- 新路径`manor-v3-*`，HTML manifest/favicon引用版本升3；原manifest身份与主题色／启动底色不改。`icons/`和favicon已经是哈希发布豁免固定文件，不改`asset-manifest.mjs`或其他构建脚本。
- 新六图全部导出且head/manifest不再引用后，CODE仅移除被替换的六个v2 PNG；旧源与v2导出脚本保留。不要递归清理其他资产。

## 权限与完成条件

用户此前明确禁止测试和编译，本次未重新授权：不运行测试、游戏／浏览器预览、语法运行检查、安装验证或编译，不推送。正常内置绘图、裁切／格式转换／合成纯色背景／静态看图属于本次交付，可执行。最终只报告静态审阅和实际接入状态，不宣称已安装PWA立刻刷新图标。

接手复述边界和所有权，接口／资料缺口先报PM。交付按实际文件、生成来源、背景配置、转换链、接入diff和未验证事项汇报；明确结束文件所有权。

## 交付状态

ART与CODE均已结束全部文件所有权。R3透明原稿SHA256为`7b2c4ec169000842e34ae6128f07438c80640a756e88dd14983f0ff5ead61bbc`；六PNG／ICO及引用齐备，旧六v2发布PNG已精准移除、旧源保留。PM已直接完成源图、192、原生32／48、maskable安全圆静态审阅及导出代码／head／manifest diff核对。代码背景配置一处`#F28C28`，主体不被程序调色，maskable布局按有效alpha主体测量并保留边缘。报告及json已保存，本地证据图片已忽略；未运行测试／浏览器预览／安装验证／编译或推送。
