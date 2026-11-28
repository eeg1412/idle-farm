# M10 紫宝石原矿重绘

使用内置 `image_gen`，生成 [item-M10-v2.png](raw/item-M10-v2.png)。编辑参考是旧版 96×96 M10 图标。其 SHA-256 为 `449b752b49631ba20e0f2f2c6362e5ebd51983a8d4758a8f88bc51409d0752ac`，可从[旧图集](raw/items-A-v1.png)的第 10 格重新导出。该格的左上角为 (1003, 251)，宽高各 251 像素。

## 生成提示词

```text
Use case: precise-object-edit. Create the revised M10 amethyst-bearing raw ore bitmap sprite from the reference image, which is the exact edit target. Repaint only the turquoise/teal crystal on the rock into the same amethyst purple family as the other crystals. Every crystal face, shadow and glint is purple, lavender or deep violet, with no teal, cyan, green, blue, red, or amber crystals. Keep the chunky dark charcoal and muted brown stone matrix, angular crystal facets, object silhouette, compact three-quarter view, crystal placement and pixel-art style as close to the reference as possible. Preserve the existing amethyst crystals. The object is one isolated transparent game inventory sprite, centered on genuine alpha with ample clear padding, the entire ore visible, sharp deliberately clustered pixel art that reads at 96×96. No ground, detached particles, sparkles, outer drop shadow, frame, labels or text.
```

使用 `node scripts/export-mining-art.mjs --m10-only` 从独立原画导出正方形 96×96 图标和原矿场景，并更新素材登记与图标底边。
