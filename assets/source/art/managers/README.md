# 管理员横幅素材

| 路径 | 来源与发布规格 |
| --- | --- |
| `backgrounds/<职位>.png` | 各职位新绘的独立像素场景，导出 960×320 WebP |
| `actions.png` | 新绘透明图标表，左上为资料，右上为送礼，左下为切换形象，右下为领取回礼。单个图标导出 64×64 WebP |
| `docs/Pixel-Characters-Complete-Pack/立绘/` | 原有 22 套人物的 88 张表情原画。按人物固定胸口高度和四种表情的透明边界，导出 461–512×289 WebP。尺寸和面部锚点写入 `src/content/manager-portraits.json` |

运行 `python3 scripts/export-manager-art.py` 重新导出至 `public/art/managers/`。生成新背景时使用约 3∶1 的满幅原画，中心偏左安排场所特征，右半边降低反差给对白留空间。画面使用清晰像素边缘、暖色自然光和田园材质，保留每个场所自己的色调。原画中只绘制环境。

| 职位 | 画面要素 |
| --- | --- |
| `tasks` | 庄园小径、空白纸签、木制布告栏 |
| `estate` | 庄园宅邸、庭院与树篱 |
| `livestock` | 畜棚、草垛、围栏与羊 |
| `field` | 麦垄、菜地、稻草人与农舍 |
| `mine` | 岩壁、木梁矿口、矿轨与提灯 |
| `fish` | 渔塘、近海岸线、木码头 |
| `processing` | 木齿轮磨坊、磨石与谷物袋 |
| `refining` | 铜管、熔炉、模具与金属锭 |
| `warehouse` | 仓木、货架、箱子与仓门 |
| `research` | 书架、手稿、标本瓶与放大镜 |
| `merchant` | 路边条纹棚、货车、布卷与铜秤 |
