const fs = require('fs')
function edit(file, snippet, result) {
  const current = fs.readFileSync(file,'utf8')
  if (!current.includes(snippet)) throw Error(file + ': text not found')
  fs.writeFileSync(file,current.replace(snippet,result))
}
const task = 'docs/tasks/2026-11-28-content-expansion.md'
edit(task,'正式目录和视觉登记待完整素材及审图结论齐备后接入。','正式目录和各项视觉登记已统一接入。四类原料沿用农田、畜牧、鱼塘和矿洞的现有生产入口。')
fs.appendFileSync(task,`
## 最终交付

- 265 项透明物品图、5 种树木的 20 张四期单株、20 种牲畜的 152 张进食帧、20 种鱼的 240 张游动帧和 65 张同 ID 独立设施场景已接入。畜牧和鱼塘另有 40 张透明活体选择图。矿车复用同 ID 矿料图为货载。
- [独立审图](../art-reviews/2026-11-28-content-expansion.md)记录逐项结果。[证据清单](../art-reviews/2026-11-28-content-expansion.json)保留源、成品和本地证据的精确版本。
- 资源检查修正了旧 L08 R9 选择原稿的实际归档来源识别，以及 L29 第三帧低嘴的局部登记范围。两项按实际已有图像和哈希记录。随后 \`npm run art:check\` 完成，覆盖 163 个设施、30 种牲畜和 30 种鱼。
- 最终 \`npm run build\` 完成，产物位于 \`dist/\`。构建生成 1,779 项静态素材映射，Vite 主包为 1,086.53 kB，超出 500 kB 提示阈值。真实画布、触控、进食及游动循环、连续采伐和存档行为未进行游戏内验证。
`)
edit('docs/feedback-checklist.md',
  '立项时运行目录共 574 项。待完成：扩展目录生成、逐项素材和独立审图、实际入口整合、最终构建。树木专用展示待确认，按当前农田路径实装。',
  '现行目录共 839 项。原 574 个品项和 572 个研发节点记录一致。新增图标、场景、四期树木、畜牧进食与三期水产动画均已接入并通过[独立静态审图](art-reviews/2026-11-28-content-expansion.md)。资源检查和最终构建通过。树木按当前农田路径展示，实际游戏循环和存档行为未验证。')
edit('docs/expansion/07-balance-validation.md',
  '既有 574 项的用量 U 不受这些配方影响。最长单批',
  '既有 574 项的用量 U 不受这些配方影响。对照前后运行目录，既有 574 项的生产记录及 572 项的研发记录相同。最长单批')