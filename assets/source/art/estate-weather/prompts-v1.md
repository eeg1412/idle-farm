# 天气云团原画 v1

2026-11-22，内置 `image_gen.imagegen` 新绘；没有使用 CLI/API。`public/art/estate/background.webp` 已通过 `view_image` 实开，只用于视觉画风参考，不是编辑目标，也未作为文件输入传给最终生成工具。原背景不改动。

最终调用参数：`transparent_background: true`；未提供 `referenced_image_paths` 或 `num_last_images_to_include`。工具未提供可设置的尺寸参数，实际源尺寸记录在 `conversion-v1.json`。

最终实际提示词：

```text
Use case: stylized-concept
Create one clean game sprite: a single fluffy white cumulus cloud, wide horizontal silhouette, exactly one object centered in a landscape 2:1 image.
Genuine transparent background. Leave a wide transparent margin on all four sides. No scenery, no cast shadow, no sun or rain.
Handmade 2D pixel art: several rounded overlapping puffs, crisp square stepped edges, limited palette of opaque ivory-white and light neutral gray only. Uniform medium pixel size, large simple pixel clusters, flat discrete interior shading, no outlines and no texture.
The outer silhouette is clean solid pixel steps. The surrounding transparent area is perfectly empty. No particles, no speckles, no separate fragments, no thin colored edge, no blue or cyan, no feathering, no glow, no gradients, no noise, no dithering, no text. A simple clean production sprite for use over green farm terrain, not a scene.
```

原生生成文件由工具输出路径复制到 `clouds-v1.png`。仅通过 `scripts/export-estate-weather.mjs` 将整幅源图 nearest 等比 contain 到透明 512×256，WebP70/Alpha100；不裁掉原图边距，不拉伸，不程序绘画、擦除或补画云团。源与发布图的 Alpha128 主体范围及 Alpha1 全透明留边登记在 `conversion-v1.json`；测量只用于素材来源登记和审图。

首稿 `rejected-r1.png` 的直接图片审阅发现蓝青边缘杂点；基于首稿只修透明云缘的第二次绘图 `rejected-r2.png` 扩大了白／蓝碎边，亦拒绝。最终稿重新独立生成，没有从拒绝稿程序修画。三次调用的完整提示词、工具参数、实际输出路径与拒绝原因均在 `generation-v1.json`。

独立审图与运行体验状态由 PM 及审阅者单列；素材存在不代表运行验收。
