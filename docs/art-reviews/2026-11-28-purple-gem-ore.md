# M10 紫宝石原矿独立审图（2026-11-28）

按[任务卡](../tasks/2026-11-28-purple-gem-ore.md)审阅 M10。对照[矿业历史审图](2026-11-17-mining.md)的 M01–M10 原料联络表、旧版 M10 的 96 像素图标和 320 像素场景。旧版原矿正面有一块清晰的青绿色晶体。本次审查了精确版本 `item-M10-v2` 及其四张导出成品。IM10 紫宝石坯在本轮仅涉及名称。

| 证据 | 结论 | 观察 |
| --- | --- | --- |
| [独立原画](../../assets/mining/raw/item-M10-v2.png) | 静态通过 | 1254×1254 透明 PNG。左上、左侧、正面和底部四处可见晶体均采用紫色、浅紫高光和深紫阴影。暖灰褐岩基分面可辨，保留原矿构图、阶梯外缘和离散亮暗。主体完整独立。 |
| [图标 PNG](../../assets/source/items/overrides/M10.png)与[发布 WebP](../../public/wiki/icons/M10.webp) | 静态通过 | 两者均为 96×96 且带 Alpha。实际打开原尺寸与浅底、深底最近邻双倍对照。晶体与岩体可辨，轮廓完整，无可见底色或杂边。新轮廓略大于旧图。Alpha ≥ 128 的范围为 x=7–88、y=10–85，图片四边 Alpha 均为 0。 |
| [场景 PNG](../../assets/mining/png/scene-M10.png)与[发布 WebP](../../public/art/scene-M10.webp) | 静态通过 | 两者均为 320×320。320 与 130 像素对照中，矿车载物呈紫色，保留旧站位、洞口、车轮与轨道。新旧场景 PNG 的 1,126 个变化像素全部位于 x=228–269、y=149–186 的货载区域。该区域外的解码像素一致。 |
| 真实游戏运行 | 未验证 | 仅审静态图片并读取资源映射。仓库实际渲染、矿车运动与货载淡入淡出未观察。 |
| 用户认可 | 待确认 | 本报告记录独立静态审阅。 |

[生成提示](../../assets/mining/prompts-item-M10-v2.md)记录旧 M10 图标作为本轮编辑参考。[素材登记](../../assets/mining/registration.json)记录裁切区域、交付格式与静态场景货载图标，源图及四张交付图的实测 SHA-256 均与登记相符。[矿洞素材映射](../../src/content/mining-visuals.json)和[画布资源入口](../../src/view/canvas-ui.js)指向同一 `wiki/icons/M10.webp` 用于物品图和矿车货载，静态场景路径为 `art/scene-M10.webp`。本轮静态素材无退回项。

证据图仅本地保存。路径、精确版本、尺寸和 SHA-256 见[证据清单](2026-11-28-purple-gem-ore.json)。证据目录为 `assets/mining/reviews/purple-gem-ore-2026-11-28/`。三张合成图各列从左到右均为旧版 PNG、新版 PNG、新版 WebP。图标两行分别为 96 与 192 像素，场景两行为 320 与 130 像素。

## 本地证据重建

从仓库根目录执行以下合成脚本，使用项目已有 `sharp`。脚本直接读取发布素材和历史版本，写入证据目录。若重建图 SHA-256 与清单不同，以新图重新审阅。

```js
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const review = require('./docs/art-reviews/2026-11-28-purple-gem-ore.json');

async function compose() {
  fs.mkdirSync(review.evidenceDirectory, { recursive: true });
  for (const [target, source] of Object.entries(review.baseline.sources)) {
    fs.writeFileSync(target, execFileSync('git', ['show', review.baseline.commit + ':' + source]));
  }
  for (const recipe of review.compositions) {
    const layers = [];
    for (const [column, source] of recipe.columns.entries()) {
      for (const row of recipe.rows) {
        const input = await sharp(source)
          .resize(row.size, row.size, { fit: 'contain', background: '#0000', kernel: 'nearest' })
          .png()
          .toBuffer();
        layers.push({ input, left: column * recipe.columnWidth + row.offsetX, top: row.top });
      }
    }
    await sharp({ create: { width: recipe.width, height: recipe.height, channels: 3, background: recipe.background } })
      .composite(layers)
      .png()
      .toFile(review.evidenceDirectory + '/' + recipe.name);
  }
}

compose().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
```
