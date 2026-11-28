# 工坊俯视分层素材最终交付

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

## 最终用户要求

- 机器与传送带为90度正俯视，真正使用内置image_gen绘制素材。
- 纵向长条机器居中，两侧平直；不带凸出进出料口，不烘焙固定9口。
- 每种材料各走一条水平直带贴入机身，不汇流、不绕行、不留中间空隙；右中央成品带与左侧进料带等长。
- 传送带不要护栏、边框、螺丝和套口，只滚动独立带面。
- 背景层→传送带层（带面及canonical材料／产品）→机器层；机身独立抖动，待料停止。

## 所有权与交接

- /root/workshop_topdown_art：新建none，独占assets/workshop/、public/art/workshop/及src/content/workshop-visuals.json；真正生成／编辑、转换、登记与提示词已交齐并放权。
- /root/workshop_motion：同一动画目标直接修订，独占workshop-animation.js、纯workshop-layout.js与canvas-ui.js。按最终v5资源有序激活，删所有旧分支后已全部放权。
- /root/workshop_topdown_review：新建none，独占docs/art-reviews/2026-11-15-workshop-topdown.md；实际打开原稿、PNG/WebP并只读最终源码，报告已交齐并放权。
- canvas-ui.js中途明确转交production_clear完成小叉修订，放权后再归workshop_motion；约17px无框图形X、30px透明命中与headingClearance保留。
- PM整合实际加载→挂载→展示时钟→状态清理／销毁执行链；源码与图片条件审阅不作为真实运行通过。

## 最终成果

- active：src/content/workshop-visuals.json，version5；仅背景、两类无口机身、独立tread和动态布局参数。
- 原稿：assets/workshop/raw/processing-machine-long-v4.png、refining-machine-long-v4.png为真正新画长条设计；processing-machine-portless-v5.png、refining-machine-portless-v5.png由内置image_gen进一步编辑去除突出配件。
- 提示词：assets/workshop/prompts-long-v4.md、prompts-portless-v5.md；来源／转换登记registration-portless-v5.json，可重复导出export-portless-v5.mjs。
- 发布：public/art/workshop/processing-machine-portless-v5.webp、refining-machine-portless-v5.webp、background-v1.webp、belt-surface-v2.webp；对应PNG及原稿均保留。
- 加工真实body宽64.285714，精制66.212219，高288，中心x160、top16／bottom304；均为等比转换，非拉伸／旋转旧横机。
- 运行只请求background／machine／tread与实际canonical物品；全部真实inputs从中心向外紧贴排布，按数量适配粗带／大图标，单材料居中、9材料y32..288。带面左右端0／320、图标中心另留半尺寸，bodyEdges关于160对称，故外露带长对应相等；出料独立加粗。最新参数与暂停隐藏详见2026-11-15-workshop-centered-inputs.md。
- 带面TilingSprite按连续展示时钟循环偏移，每条物料独立loop；surface深入机身内20像素cover，避免机身独立抖动时露缝。Graphics仅不可见mask，旧collector／固定口／rails均不运行。
- 可见卡才挂载，滚出、弹窗、切页、后台及重置卸载；异步纹理完成不持有旧节点。展示状态跨重绘／续批稳定，换配方／清空／重置清理。
- 本轮其他五项及山羊修复见主任务卡2026-11-15-feed-workshop-clear-task-rewards.md。

## 方案历史

旧程序设备被用户否定；横版机器、旋转机器、collector绕行、固定九口与护栏方案均被后续明确修正取代，只保留原稿、提示词与历史审阅，不作为最终资源或用途通过。最终portless-v5才是实际消费版本。

## 授权与验收边界

普通素材生成／转换、原图／PNG／WebP查看和源码读取已经完成。原画、成品造型及源码链条件通过，用户认可和真实运行仍未取得。

最终静态脚本assets/workshop/compose-portless-v5.mjs调用与运行相同的纯layout／motion函数，原计划生成1／9材料、等待、双相位、130／320px拼图。自动审批以AGENTS未授权预览／运行检查为由拒绝该操作。PM明确询问后用户回复「保持不运行」，因此脚本不执行、最终拼图未生成，组合用途不算通过；不代跑、不换工具、不重复申请。

未运行测试、资源门禁、语法／运行时检查、浏览器／游戏预览、试编译或最终编译；未推送／发布。
