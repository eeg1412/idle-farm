const fs = require('node:fs/promises');
const path = require('node:path');
const staging = '.catalog-expansion-2026-11-28';
const policies = {};
const ids = ['C69','C70','C71','C72','C73'];
(async () => {
 await fs.mkdir(path.join(staging,'assets/plot'),{recursive:true});
 const layout = (await fs.readFile('assets/plot/crop-layout.json','utf8'))
  .replace('        67,\n        68\n', '        67,\n        68,\n        69,\n        70,\n        71,\n        72,\n        73\n')
  .replace('    "C68": "large"','    "C68": "large",\n'+ids.map(id=>'    "'+id+'": "large"').join(',\n'));
 await fs.writeFile(path.join(staging,'assets/plot/crop-layout.json'),layout);
 for (const id of ids) {
  policies[id] = {
   mode:'wholePlant',
   harvestedPart:'树干（原木）',
   repeatBare:{status:'notApplicable',sourcePath:null,reusePhase:null},
   review:{
    growingSource:`assets/plot/crops/${id}/growing.png`,
    matureSource:`assets/plot/crops/${id}/mature.png`,
    decision:'原木来自成熟树干，采伐使用整株收获。四期各有独立原画，成熟阶段为站立的整树。'
   }
  };
 }
 let harvest = await fs.readFile('src/content/crop-harvest.json','utf8');
 harvest = harvest.trimEnd().slice(0,-2) + ',\n' + JSON.stringify(policies,null,2).slice(2);
 await fs.writeFile(path.join(staging,'src/content/crop-harvest.json'),harvest+'\n');
 await fs.copyFile('src/content/crop-visuals.json',path.join(staging,'src/content/crop-visuals.json'));
 const exporter = (await fs.readFile('scripts/export-crop-animation.mjs','utf8'))
  .replace("from './compile-crop-visuals.mjs'", "from '../scripts/compile-crop-visuals.mjs'")
  .replace("path.join(art, 'crop-layout.json')", `path.join(root, '${staging}/assets/plot/crop-layout.json')`)
  .replaceAll("path.join(root, 'src/content/", `path.join(root, '${staging}/src/content/`)
  .replace('{ from: metadataPath }', `{ from: metadataPath, to: path.join(root, '${staging}/src/content/crop-visuals.runtime.json') }`);
 await fs.writeFile(path.join(staging,'export-crops.mjs'),exporter);
})();
