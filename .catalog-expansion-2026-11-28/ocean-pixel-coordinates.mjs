import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
const folder = '.catalog-expansion-2026-11-28/fish-coordinate-evidence';
for (const requested of process.argv.slice(2)) {
  const [id, version = '1'] = requested.split('v');
  const source = `assets/fish/raw/${id}-idle-v${version}.png`;
  const { width, height, placements } = JSON.parse(await readFile(path.join(folder, `${id}-spans.json`)));
  if (requested === 'F22v3') placements.unshift({y:[153,174],x:[[100,197],[336,440],[567,678],[822,923]]});
  const { data } = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for (const [stage, {x, y}] of placements.slice(0, 3).entries()) {
    const stack = [];
    const yStart = Math.floor((y[0] + y[1]) / 2 - 33);
    const rowStatistics = [];
    for (const [frame, [left, right]] of x.slice(0, 4).entries()) {
      const leftFence = frame === 0 ? 0 : Math.floor((left + x[frame - 1][1]) / 2);
      const rightFence = frame === 3 ? Math.min(width, right + 60) : Math.floor((right + x[frame + 1][0]) / 2);
      const ranges = [1, 16, 32, 64, 128].map(alpha => {
        const extent = [width, height, -1, -1];
        for (let py = y[0] - 31; py <= y[1] + 25; py++) for (let px = leftFence; px < rightFence; px++) {
          if (data[(py * width + px) * 4 + 3] < alpha) continue;
          extent[0] = Math.min(extent[0], px);
          extent[1] = Math.min(extent[1], py);
          extent[2] = Math.max(extent[2], px);
          extent[3] = Math.max(extent[3], py);
        }
        return extent;
      });
      rowStatistics.push(ranges);
      const xStart = right - 87;
      const raster = await sharp(source).extract({left:xStart,top:yStart,width:96,height:70}).flatten({background:'#eeeee6'}).resize(288,210,{kernel:'nearest'}).png().toBuffer();
      const grid = [];
      for (let px = Math.ceil(xStart/5)*5; px < xStart+96; px += 5) {
        const offset = (px-xStart)*3;
        grid.push(`<path d="M${offset} 0v210"/><text x="${offset+1}" y="${px%10 ? 20 : 10}">${px}</text>`);
      }
      for (let py = Math.ceil(yStart/5)*5; py < yStart+70; py += 5) {
        const offset = (py-yStart)*3;
        grid.push(`<path d="M0 ${offset}h288"/><text x="0" y="${offset-1}">${py}</text>`);
      }
      const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="288" height="210"><style>path{stroke:#ef66dd;stroke-opacity:.35;}text{font-family:monospace;font-size:10px;fill:#350a45;stroke:white;stroke-width:2;paint-order:stroke}</style>${grid.join('')}</svg>`);
      stack.push({input:await sharp(raster).composite([{input:svg}]).png().toBuffer(),left:frame*289,top:0});
    }
    console.log(id, stage, JSON.stringify(rowStatistics));
    await sharp({create:{width:1155,height:210,channels:3,background:'#5e525c'}}).composite(stack).png().toFile(path.join(folder,`${id}-ocean-gills-${stage}.png`));
  }
}
