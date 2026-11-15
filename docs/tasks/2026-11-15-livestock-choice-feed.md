# 牲畜展示图与复合饲料图层

用户追加9/10：选择牲畜的例图不能全是低头进食；全部牲畜动画新增共用复合饲料图片层，解决像吃地板。前次V5进食图已静态审阅，不关闭本轮反馈。

**最新用户纠正优先**：用户明确否定复用旧V4抬头图，指出与当前动画形体不统一。全部10项选择图必须以各ID当前V5实际成年／成熟动画帧为输入，调用内置image_gen重新生成普通抬头站立图。旧V4复用交付撤销为历史，不得以其静态可辨或“已认可旧风格”代替本轮。下面原复用计划只保留原因记录，当前owner已转为V7逐种新绘和逐ID对照。饲料v6-r3静态通过独立保留，不反复改未变的feed/80进食帧。

## 上下文与所有权

- 新建干净上下文 `livestock_feed_art`，只接本轮畜牧选择/饲料资产，不继承旧鱼类或作物任务。拥有assets/livestock、public/art/livestock、livestock choice图、src/content/livestock-visuals.json、scripts/export-livestock-animation.mjs，必要L资源门段；旧所有者fish_assets任务已结束。
- 新建干净上下文 `livestock_feed_runtime`，仅处理复合饲料图片从loader到运行实例的直接消费链，拥有livestock-animation.js/livestock-layout.js和canvas-ui.js的畜牧资源loader／对应图像缓存版本段，不改素材。原畜牧／画布所有者任务均已结束，明确转交；刚完成的统一倒计时和导入修复必须保留，其他画布逻辑不扩改。
- 新建干净上下文 `livestock_feed_review`，仅审本轮抬头选择图/饲料PNG/WebP/真实手机尺寸静态，报告另写docs/art-reviews/2026-11-15-livestock-choice-feed.md。
- PM负责接口冻结、共同文件交接、普通源码/图片整合和持久反馈。共享资产/生成命令只由素材所有者运行。任何人均非独占仓库，不撤销他人变更。

## 最少输入与成果

- 已有V4来源与旧选择图仅保留历史。当前V5 feeding atlas和嘴/脚登记保留，各ID实际adult/mature第0/3帧作新绘输入；全部10张新的普通站立选择图以choice-registration-v7.json登记当前参考帧、原画/提示词及导出来源。不能再裁V4，不把动画换回站立，也不能下次导出又变低头。
- 新共用复合饲料由内置image_gen生成透明像素饲料堆（混合颗粒/谷物，匹配棚舍和动物风格），保留源/提示词；不要极细粒以致130px卡看不清。运行每只动物一份，口部前独立图片和轻影，同一3/2/1站位透视。程序小粒料不再作为唯一可见饲料。
- 冻结新feed资源path/texture/可见内容bounds/锚点/尺寸和loader接口后再并行。仓库canonical产物、动物80进食帧、阴影和9秒时序不扩大改动。
- 选择图独立来源进入正式producer/layout/atlas溯源，static fallback按共用feed图片同步。资源门只补真实新契约，不凭文件数量替代审图。
- 验证授权无：禁止测试、检查、预览、语法/运行/计时验证、编译/推送。普通素材生成、转换、静态审图允许；不执行游戏或发布。

最终交付：选择V7全部10项已用当前V5各ID0/3帧输入imagegen新绘并正式导出；主producer消费V7，choices-only不会改动80帧/feed/回退，V4复用移到拒绝历史。共用饲料v6-r3经两次退回后以统一helper放大/嘴前偏移并同步每只Sprite/轻影及10fallback；QA已完成新选择源/96/32和20期四帧130/fallback静态复查，PM另直接看当前帧→新源全对照、32成品、feed及最终130图并读真实source链。报告在docs/art-reviews/2026-11-15-livestock-choice-feed.md，真实Pixi/网格/循环/加载生命周期与用户认可仍未验收。未运行测试、检查、预览、编译或发布。
