const fs = require('fs')
const file = 'docs/tasks/2026-11-28-content-expansion.md'
let doc = fs.readFileSync(file,'utf8')
doc = doc.replace('中华蜜蜂及家蚕的真实进食与现行共用饲料素材的适配待确认。','中华蜜蜂与家蚕分别使用花蜜和桑叶专用素材，其他畜牧沿用共用饲料。I129 和 I135 的投入以草案具体配方表为准，包含同产业前序中间产物。')
doc = doc.replace('| integration |', '| mine | 矿业矿料货载、同 ID 详情图、矿业来源与运行登记 | 图标批次 → 矿洞矿车和详情 |\n| integration |')
doc = doc.replace('| root |', '| fish_anchors／livestock_anchors | 各自分组的独立原画锚点和裁切坐标 | 原画 → 鱼类或畜牧素材所有者 |\n| retail_review | 130 件商品的独立包装审查证据 | 图标批次 → 主审报告 |\n| release_surface | 图鉴对象文案及发布规格计数 | 区分树种、养殖对象和仓库品项 |\n| root |')
doc = doc.replace('截至立项未授权测试、预览、试编译、资源检查或推送。','用户已授权全部素材审图及接入后运行 `npm run art:check` 和最终构建。测试、预览、试编译和推送无本次授权。')
doc += '\n## 生成与接入记录\n\n隔离目录已生成 839 项、676 条配方、837 项研发。对照现行 JSON，原有 574 项及其 572 个研发节点的记录相同。完整图鉴目标为 839，任务金币上限为 36,189,260,281 金，结算奖励为 36,000,000,000 金；400 项收集任务金币上限变为 106,470,125 金，结算仍为 100,000,000 金。C69–C73 的研发与播种界面使用树种，物品与配方使用原木品名。正式目录和视觉登记待完整素材及审图结论齐备后接入。\n'
fs.writeFileSync(file, doc)