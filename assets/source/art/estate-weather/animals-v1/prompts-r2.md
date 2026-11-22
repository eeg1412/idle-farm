# 动物轮廓云朝右修订 r2

2026-11-22，内置 `image_gen.imagegen` 编辑 `animal-clouds-r1.png`，先经 `view_image` 实开原稿和旧WebP。兔0／猫1／鲸2在各格内转为头右尾左；龟3原本已头右、左短尾，本次保留右向，未整幅镜像或用程序flop。

完整实际调用参数与来源路径见 `generation-r2.json`。实际提示词：

```text
Use case: precise-object-edit
Edit the supplied transparent 2×2 pixel-art animal-CLOUD sheet. Keep exactly the same four cloud identities in exactly the same cells: top-left rabbit cloud, top-right cat cloud, bottom-left whale cloud, bottom-right turtle cloud. Keep the 2:1 landscape composition and transparent background.
The only intended change is direction:
- In the TOP LEFT cell, horizontally reverse the RABBIT CLOUD inside its own cell so its muzzle/face is on the RIGHT and its round tail is on the LEFT. Keep both long cloud ears whole and clearly separated.
- In the TOP RIGHT cell, horizontally reverse the CAT CLOUD inside its own cell so its cloud head with two short ears is on the RIGHT and its raised curling cloud tail is on the LEFT.
- In the BOTTOM LEFT cell, horizontally reverse the WHALE CLOUD inside its own cell so its big rounded cloud head is on the RIGHT and its forked cloud tail is on the LEFT.
- In the BOTTOM RIGHT cell, the TURTLE CLOUD ALREADY FACES RIGHT: keep it unchanged, with its long neck and rounded head on the RIGHT and short tail on the LEFT. DO NOT reverse the turtle.
DO NOT mirror the whole sheet, do not swap positions between cells, do not create new poses or new designs. Preserve each existing silhouette, internal white/pale cool-gray cloud shading, pixel clusters and proportions as closely as possible. These remain puffy cloud formations resembling animal silhouettes, with no eyes, mouth, fur, shell plates or realistic animal details. Keep the full cloud contours, especially the rabbit's two ear tips, inside their cells with a clear transparent margin on all sides. No additional objects, text, border, background or cast shadow.
```

新原稿 `animal-clouds-r2.png` 为1774×887。逐格实看：兔右侧圆吻、左侧圆尾与两根完整云耳；猫右侧双短耳头、左侧上卷尾；鲸右侧大圆头、左侧双瓣叉尾；龟右侧伸出的长头颈、左侧短尾。原生源图最高兔耳的主体轮廓位于画布内；导出矩形包含源图顶部，不二次截耳，成品透明留边以 `conversion.json` 为准。

原 `animal-clouds-r1.png`、`generation.json` 和 `prompts.md` 保留。原atlas原字节保存在 `history-r1/animal-clouds-v1.webp`，SHA256 `e07df3e65fb84a50a2d2a972c2b62493b2eec81b3373b8160f52052c2e998ff8`；旧PNG、裁切与转换登记亦在 `history-r1/`。

512×256、2×2、256×128每格和0兔1猫2鲸3龟接口不改；脚本仅裁切、nearest等比转换、透明居中与WebP70/Alpha100编码，不程序改变方向或Alpha。URL版本为2；`scripts/build-offline.mjs` 的 `estateAssetVersions['atmosphere/animal-clouds-v1']` 已补为2，未执行该构建脚本。十种普通云未改。未执行检查、编译或游戏预览，独立审图与动态另验。

