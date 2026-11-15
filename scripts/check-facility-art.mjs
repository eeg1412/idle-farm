import { readFile, stat } from 'node:fs/promises';
import catalog from '../src/content/game-data.json' with { type: 'json' };

const rawKinds = new Set(['C', 'L', 'F']);
const ids = Object.entries(catalog.items).filter(([, item]) => rawKinds.has(item.kind)).map(([id]) => id);
const results = await Promise.all(ids.map(async (id) => {
  try {
    const file = await stat(new URL(`../public/art/scene-${id}.webp`, import.meta.url));
    return file.isFile() && file.size > 0 ? null : id;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return id;
  }
}));
const missing = results.filter(Boolean);
if (missing.length) throw new Error(`缺少设施场景图：${missing.map((id) => `scene-${id}.webp`).join('、')}`);
console.log(`已检查 ${ids.length} 个独立设施场景图。`);

const crops = ids.filter((id) => catalog.items[id].kind === 'C');
const invalid = (await Promise.all(crops.map(async (id) => {
  try {
    const atlas = await readFile(new URL(`../public/art/plot/crops/${id}.webp`, import.meta.url));
    const extendedWebP = atlas.length >= 30 && atlas.toString('ascii', 0, 4) === 'RIFF' &&
      atlas.toString('ascii', 8, 16) === 'WEBPVP8X';
    const valid = extendedWebP && (atlas[20] & 0x10) !== 0 &&
      atlas.readUIntLE(24, 3) === 639 && atlas.readUIntLE(27, 3) === 639;
    return valid ? null : id;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return id;
  }
}))).filter(Boolean);
if (invalid.length) throw new Error(`缺少或无法读取 640×640 透明成长图集：${invalid.join('、')}`);
console.log(`已检查 ${crops.length} 张作物图集，共 ${crops.length * 4} 个成长阶段。`);
