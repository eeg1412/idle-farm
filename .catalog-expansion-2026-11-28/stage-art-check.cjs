const fs = require('fs')
const target = 'scripts/check-facility-art.mjs'
const staged = '.catalog-expansion-2026-11-28/' + target
let source = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n')
function replace(before, after) {
  const index = source.indexOf(before)
  if (index < 0) throw new Error('Source mapping missing: ' + before)
  if (source.indexOf(before, index + before.length) !== -1) throw new Error('Ambiguous source mapping: ' + before)
  source = source.slice(0, index) + after + source.slice(index + before.length)
}
replace("let livestockFrameCount = 0;", `const specialFeedKinds = { L13: 'nectar', L29: 'mulberry' };
sameIDs(livestock.filter((id) => Object.hasOwn(specialFeedKinds, id)),
  Object.keys(compoundFeed.species ?? {}), '畜牧专用饲料登记');

let livestockFrameCount = 0;`)
replace(`  if (JSON.stringify(livestockVisuals[id].feedTexture) !== JSON.stringify(compoundTexture)) {
    throw new Error(\`畜牧运行必须消费同一共用复合饲料图片契约：\${id}\`);
  }`, `  const specialFeed = compoundFeed.species?.[id];
  const expectedFeedTexture = specialFeed?.texture ?? compoundTexture;
  const allowedFeedKinds = specialFeed ? [specialFeedKinds[id]] : ['grain', 'hay', 'greens'];
  if (specialFeed) {
    const { texture, source, png, sourceSize, sourceRectangle, promptFile } = specialFeed;
    const region = { x: sourceRectangle?.left, y: sourceRectangle?.top,
      width: sourceRectangle?.width, height: sourceRectangle?.height };
    if (specialFeed.kind !== specialFeedKinds[id] || specialFeed.generatedWith !== 'built-in image_gen' ||
        typeof source !== 'string' || typeof png !== 'string' || typeof promptFile !== 'string' ||
        sourceSize?.length !== 2 || !sourceSize.every(Number.isInteger) ||
        !validRegion(region, ...sourceSize) ||
        texture?.path !== './art/livestock/feed-' + id + '.webp' ||
        JSON.stringify(texture.size) !== '[128,64]' || !validRegion(texture.bounds, 128, 64) ||
        ![texture.anchor, texture.mouthAnchor].every((point) =>
          Array.isArray(point) && point.length === 2 && containsPoint(texture.bounds, ...point)) ||
        !Number.isFinite(texture.sceneWidth) || texture.sceneWidth <= 0) {
      throw new Error(\`畜牧专用饲料来源、范围或锚点无效：\${id}\`);
    }
    const original = await imageFile('assets/livestock/' + source, ...sourceSize, true);
    await imageFile('assets/livestock/' + png, ...texture.size, true);
    const published = await imageFile('public/' + texture.path.slice(2), ...texture.size, true);
    await readFile(locate(promptFile));
    const feedAsset = record.feedAsset;
    if (specialFeed.sourceSha256 !== digest(original) || feedAsset?.source !== source ||
        feedAsset.png !== png || feedAsset.sourceSha256 !== specialFeed.sourceSha256 ||
        feedAsset.sha256 !== digest(published) ||
        JSON.stringify(feedAsset.sourceRectangle) !== JSON.stringify(sourceRectangle)) {
      throw new Error(\`畜牧专用饲料的原稿与发布图登记不一致：\${id}\`);
    }
  }
  if (JSON.stringify(livestockVisuals[id].feedTexture) !== JSON.stringify(expectedFeedTexture)) {
    throw new Error(\`畜牧运行饲料与生产登记不一致：\${id}\`);
  }`)
replace("!['grain', 'hay', 'greens'].includes(feedDefinition.kind)", "!allowedFeedKinds.includes(feedDefinition.kind)")
replace("!['grain', 'hay', 'greens'].includes(entry.kind)", "!allowedFeedKinds.includes(entry.kind)")
replace("JSON.stringify(feedingFallback.feedTexture) !== JSON.stringify(compoundTexture)", "JSON.stringify(feedingFallback.feedTexture) !== JSON.stringify(expectedFeedTexture)")
replace('畜牧回退必须复用当前独立复合饲料与持久场景来源', '畜牧详情场景必须复用已登记的饲料及原图')
replace("console.log('已覆盖矿业全目录物品、9界面图标、10选择场景和矿洞/矿车/洞口分层来源；视觉与真实矿车循环另行审阅。');", "console.log(\`已覆盖矿业全目录物品、9界面图标、\${mining.length} 张选择场景和矿洞/矿车/洞口分层来源。\`);")
fs.writeFileSync(staged, source)