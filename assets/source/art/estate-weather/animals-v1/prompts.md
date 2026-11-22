# 晴天动物轮廓云 v1

2026-11-22，内置 `image_gen.imagegen` 生成单张2×2透明网格。四格为兔、猫、鲸、龟的团云轮廓，不是活体动物精灵。实际调用仅传 `prompt` 与 `transparent_background: true`，没有文件引用或会话图片输入参数；既有地图与普通云图仅通过 `view_image` 作人工视觉画风参考。

完整实际提示词：

```text
Use case: stylized-concept
Asset type: four ANIMAL-SHAPED CLOUD sprites for a pixel-art farm game, one transparent 2-column 2-row sprite sheet. New artwork. Overall wide 2:1 landscape canvas, each of the four invisible cells is twice as wide as tall. Exactly one full cloud in every cell, with generous empty transparent gutters and no cell lines or labels.
The subject is ALWAYS A WHITE PUFFY CLOUD. These are cloud formations that happen to have recognizable animal silhouettes, NOT animals painted white, animal characters, live creatures, balloons, sculptures or animal sprites. Entire bodies are irregular joined cumulus puffs; their internal details are only light-gray cloud shading. No eyes, mouth, nose, whiskers, fur, claws, shell plates, gills, blowholes, clothing or accessories.
Top left: RABBIT-shaped CLOUD, a side-view crouched rounded cloud body, two clearly separated long upright fluffy cloud ears, small rounded muzzle puff and little round tail puff.
Top right: CAT-shaped CLOUD, side-view cloud cat resting low, two clearly separated short triangular-ish puff ears, rounded cloud head, long rounded body, and a thick raised curling cloud tail. The outline must unmistakably differ from the rabbit.
Bottom left: WHALE-shaped CLOUD, broad long softly rounded body with big rounded head on the left, small lower fin-shaped cloud puff, and a clearly forked upturned tail made of two puffs on the right. No water or sea, it is a floating cloud.
Bottom right: TURTLE-shaped CLOUD, broad gently domed cloud mass, short neck and rounded head puff on the right, four short low foot puffs below the dome, a tiny cloudy tail on the left. No hard shell lines.
Style: clean handmade pixel art matching a cozy farm game; visible square pixel clusters and staircase contours, flat broad white and pale cool-gray color groups, slight interior underside shading, no dark outlines. Preserve a bright white cloud body. Readable simple silhouettes at small game sizes.
All four shapes fully inside their cells, as large as fits while preserving transparent padding. True transparent alpha background. No sky, ground, scene, cast shadow, glow, white background, mist field, particles, text, grid, borders or watermark. Do not draw ordinary clouds elsewhere in the sheet.
```

原生文件：`animal-clouds-r1.png`，1774×887。调用原路径与参数在 `generation.json`；手工矩形裁切在 `layout.json`。导出只裁切完整轮廓，nearest等比inside244×116后居中到256×128，合成512×256、2列2行row-major图集；PNG与逐格PNG保留。WebP质量70、Alpha质量100；没有修画、擦除、阈值化Alpha或镜像。实际源／输出SHA256、每格尺度与Alpha1/128范围见 `conversion.json`。

原稿边缘的低透明度碎纹按真实Alpha保留；是否影响正常底色及真实小尺寸由独立审图确认。素材交付不代表晴天限定代码、动画或用户认可已验证。未执行测试、检查、编译或游戏预览。

