# 牲畜像素风格过程稿

工具：内置 `image_gen`，全新绘制，不使用旧拟真原图作为风格参考，不使用 CLI/API fallback。

## pixel-v4 黑猪单独风格稿（用户已确认）

原图：`raw/pixel-v4-black-pig-style.png`。

此中等细节方向已由用户确认，并授权重画所有牲畜。正式六张源图、完整提示词、实际裁切/脚点/共同画布与透明度参数见 [raw/pixel-prompts.md](raw/pixel-prompts.md)。提示词中的80像素与色阶是风格描述，不是测量结果或硬性调色限制。

```text
Use case: stylized-concept. Asset type: ONE transparent BLACK PIG style sample for a classic 16-bit farming game. Draw only ONE full-body ADULT BLACK DOMESTIC PIG, standing relaxed and facing RIGHT in a gentle three-quarter side view. Transparent alpha background with generous empty margin. No other animal, no grid, no text, no product, no barn, no ground or cast shadow. This is medium-detail pixel art: design the pig as an authentic native sprite roughly 80 pixels wide by 60 pixels high, then show it enlarged cleanly with nearest-neighbor. The pixel scale should be consistent and visible along stepped contours, with a thin one-native-pixel dark outline, yet there is enough resolution for carefully shaped anatomy and character. Aim for polished 16-bit farm-game sprite detail, between a realistic animal painting and a coarse simplified 32px icon. The pig has a broad charcoal-black barrel body, a substantial shoulder and rounded haunch, short sturdy legs with readable cloven hoof shapes, a broad pink snout with two nostrils, two shaped triangular ears with muted dusty-pink inner ears, one visible expressive eye with ivory eye white, dark pupil and a tiny light highlight, and a small curled tail. Make it recognizably a BLACK pig, not brown, with a calm appealing expression and natural domestic-pig proportions, not a toy or plush. Use 3–5 crisp DISCRETE gray shade steps per major form, thoughtful small pixel clusters around the cheeks, shoulder, belly and haunch, and a few grouped bristle accents along the back silhouette. The snout and ears have discrete pink color steps. Fine features are readable at sprite resolution. No individually rendered fur strands, no skin pore texture, no photograph, no continuous gradients, no airbrush, no soft glow, no smooth 3D rendering, no fuzzy anti-aliased edges. Avoid enormous square block shapes that reduce the face and legs to a handful of pixels; retain moderate pixel-level detail. Mild upper-left illumination expressed ONLY through distinct flat pixel-color planes. Entire pig including all four feet, ears, snout and curled tail completely visible. Keep the large image clean and transparent around the sprite.
```

## pixel-v3 过程稿（用户已否定，不得作为正式替换）

原图：`raw/pixel-v3-accessories.png`。5×5 网格，前四列为蛋鸡、奶用水牛、麻鸭、奶山羊、产蛋鹅各四帧，末列为产品。用户认为此方向过于简略、矫枉过正，停止后续批量生成。

此稿仅保留溯源，不在 `layout.json` 中登记为活跃来源，不用于正式导出。此方向曾计划 5/2/4 像素、24 色转换，但已停止并撤销导出器试改；不是 pixel-v4 的既定参数。

