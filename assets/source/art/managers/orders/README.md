# 订单管理员原画

| 素材 | 当前来源 |
| --- | --- |
| 茜梨四表情 | `anime/female-{smile,happy,angry,sad}.png`。原画输入、胸像裁切和面部位置见[茜梨原画说明](anime/female-source.md)。 |
| 奥林四表情 | `redesign-v2/male-{smile,happy,angry,sad}.png`，完整提示词与生成来源见[现用原画说明](redesign-v2/README.md)。 |
| 男女现用开屏 | `assets/source/art/loading/solo/orders/redesign-v2/{female,male}-scene-v3.png`，提示词同目录；[来源清单](redesign-v2/source-manifest.json)登记源图、成品与 faceBounds。 |
| 订单柜台背景 | `background.png`。木制分格信架、打包桌与已封包裹围住中央装车通道。 |

背景原画使用 sharp 缩至 960×320，以质量 85、effort 6 导出到 `public/art/managers/backgrounds/orders.webp`。男女胸像的面部横坐标与可见边界登记在 `anchors.json`。

2026-11-22，用户要求清除废案。旧 `seal-clerk/`、旧订单 CG 与对应旧证据已清除；[来源清单](redesign-v2/source-manifest.json)的 `cleanup` 保留原路径、SHA256、删除字节数和 `available:false`。历史路径不再表示文件仍在本地，也不再作为导出或审图再生成输入。现用原稿、完整提示词、背景、锚点及公开资源保留。
