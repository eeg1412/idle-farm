# 独立草树与大地图摆放审阅 · 2026-11-19

结论：六件源图、六件最终WebP及八株地图摆放在本轮**静态图像与只读源码范围通过**，无退回项。未验证游戏运行、GPU渲染、真实滚动或动画体验；本结论不代表用户认可。审阅所有权已结束，后续修改对应文件须复查。

## 实际查看与判断

已亲开现用认可底图 `public/art/estate/background.webp`、经营建筑 `operations.webp`；历史群像目录的旧繁花建筑叠图未作为本轮风格基准。已亲开本轮原生1536×1024透明图集、六件独立PNG正常奶油底联系图、六件最终WebP最近邻放大及320/390地图宽时的实际尺寸联系图。

三草分别为宽短草、细长直立草、低矮弧叶簇；三树的圆冠、白色疏冠枝干、分层针叶轮廓清楚。黄绿/灰绿、离散明暗和阶梯轮廓与现用底图及建筑相容。主体、枝叶、根脚完整，无邻格、花朵、地台、人物、文字或实际可见底色。黑底查看器中的黄绿大晕为低Alpha RGB误显；正常奶油底和草地色合成未见可见矩形或晕边，不据误显退稿。

实际使用尺寸：390px地图宽时，草分别22×11.17、21.02×23、20×9.84px，树分别63.75×64、59.77×68、51.75×64px；320px宽时按320/390等比缩放。短草保留低簇/弧叶轮廓，莎草仍显直立；三树树冠及白桦干在较窄尺寸仍能分辨。最终透明根脚在草地上自然落地。

按最终纯layout和真实纹理静态叠加原建筑、中立动件、门牌与文字，再叠最终阳光和鸟，实际查看：

- `full-map.png`：816×1926全图。
- `phone-320-scroll-{0,187}.png`：320×568上下滚动窗口。
- `phone-390-scroll-{0,76}.png`：390×844上下滚动窗口。
- `flight-contact.png`：390宽、4900/5500/6200ms三个鸟姿分镜，含最终阳光。
- `six-source-png-cream.png`、`foliage-export-and-actual-size.png`及两张原图正常底色合成。

证据均在 `assets/source/art/map-foliage-review/`。地图共3树+5草，形成分散边缘点缀，中央草坪与道路保持大块留白，没有重新铺满花边。东侧橡树、松树及西侧白桦不压住建筑入口；鱼池南莎草落在干地，矿区边草未盖矿岩或轨道；主支路与十处门牌文字清楚。阳光与鸟位于植物和建筑之上，未与新增植物形成不自然的层序冲突。鸟飞过屋顶、视口边界自然裁切属于本轮预期，不作缺陷。

## 像素、来源与只读接入

已读真实prompt、generation、裁切登记与导出脚本。原生图集和PNG保留，成品树最长边256、草最长边128；WebP70/Alpha100，nearest等比fit-inside导出。六件真实Alpha均0–254，有全透明像素；按实际导出参数从源PNG读取并缩放，最终WebP的Alpha逐像素差均0。源与成品SHA-256均与登记一致。轻微透明源特性未被清理或脚本补画。

已亲读最终 `estate-map.js`、`estate-foliage-layout.js` 及原 `canvas-ui.js` 加载/销毁调用链：层序为背景→植物→原建筑→气氛/鸟→门牌→控件。八个静态Sprite、六个固定URL经 `loadAnimationImage` 加入原有pinned/Assets缓存；视口与原有预载边距决定首次请求和显隐，晚到闭包检查Sprite/层已销毁，父树负责销毁Sprite，不销毁共享纹理源。未新增ticker、随机、碰撞、UI或存档字段；纹理到达且可见时标脏。

`sites`完整几何与动画定义块对HEAD字节相同，SHA-256为 `2e328afd71445fd20e5b59e231bb81deb3a0edc704cd2d40a762d2f1e9e81819`。现用底图、十建筑、十动件及门牌共22个文件与HEAD字节相同；本轮新增接线未修改原建筑几何、门牌/动件/命中路径。逐文件及像素记录见 `evidence.json` 与 `targeted-source-pixel-readings.json`。

## 精确候选

| 文件 | SHA-256 |
| --- | --- |
| `src/view/estate-map.js` | `3fa14660dc1f4d4b962cf911f2cc433a1597d347309e480ae8dbea64a5cb1dea` |
| `src/view/estate-foliage-layout.js` | `ddd56e0662bd19deede47f550b9d8ee1318966b6f3d3a69e271d164ebb2a5cad` |
| `src/view/estate-atmosphere.js` | `d57cf98797a645734c0434fa940df6bf3365f625cac6dffc1ec2369643c03ac3` |
| `src/view/estate-atmosphere-layout.js` | `554d269cb082e279dedc0ab59e2b5fd70241f80e3afa888927fe77380f8017c6` |
| `public/art/estate/foliage/registration.json` | `9931f81ebc90f7d7ba9753fb44654d1594b1749e8ef1569518977b10b65cf3d3` |
| 原生图集 `foliage-atlas-original.png` | `d1e8bac8a4e24c7cc506493b9605ef6017be250911bb8a80f19c1bd11e03ae05` |
| `grass-meadow.webp` | `96bbfbd5f71e5875d4aaf22125e3cbd69cc74a42aebeab1528317ea3b8f64830` |
| `grass-sedge.webp` | `987ea600f4f95da6db7bbea4b0c9d78931b866a7251258cb560e0aaeacb9248c` |
| `grass-fescue.webp` | `cc3f344cf7df939da26442d467ea6683b19131fb97ca27d24e29e004d5f40b35` |
| `tree-oak.webp` | `af13a10d7af14809b00138b57b5762db9581fdb5b43a02bacaa5497949e26b9f` |
| `tree-birch.webp` | `b01e8bd5db238812a304fbe3f8752beb07747a0c475f86a0171c85890c893694` |
| `tree-pine.webp` | `012473926f49f42f96f9a962435e2e28d4b3b327ccac7fd68a4f2a13d7d567e0` |

限制：仅图片合成、像素/元数据读取与源码阅读；未运行游戏/Pixi/浏览器、测试、语法或运行时检查、构建或push。静态合成使用整数图像栅格、Pango替代系统字体及中立建筑动件，属于最终资源和布局的静态审美证据，不能替代真实运行验收。
