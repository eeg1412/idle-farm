# LT：长期经济报告核实与修正

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

## 重新开始：LT-2026-11-v2（2026-11-15）

用户在暂停讨论后重新要求分析并修正。以下 v2 任务替代本文件旧 v1 任务与接口；合同、蓝图、分批研发、价值继承、分币经济均已撤回。没有测试、冒烟、模拟、预览、试编译、语法／运行时检查、推送或部署授权；允许静态阅读、实现与一次正式内容生成。

所有者采用同一目标连续成果物复用原代理；每位代理重新读取当前 v2 报告，只改所有权文件，不覆盖其他工作。

| agent | v2 目标与输入 | 独占成果物与交接 |
| --- | --- | --- |
| catalog_balance | 报告3.1/3.2/4，原基准与生成器；保持523研究原值 | scripts/long-term-balance.mjs、generate-game-data.mjs、validate-expansion-spec.py、balance-baseline-v114.json、game-data.json；规格完成后唯一正式生成所有者 |
| tech_balance | 报告5.2/6.2/6.3，现有advancement | src/game/advancement.js；科技价格、整金币品质、离线；原50前置与作用范围 |
| economy_runtime | 报告5.1/6.1/8，现有world | src/game/world.js、新增纯prestige-ledger.js；跨轮整金币账、仅原出售入口领取、平滑费；交接账字段给存档 |
| balance_saves | 报告8、旧存档实际读写 | src/platform/world-save.js及必要save-transfer.js；一次迁移、十进制账字段，旧玩法状态保留 |
| contracts_tasks | 报告7，原objectives | src/game/objectives.js；仅24奖励金额，不改条件，不新增玩法 |
| balance_ui | 报告5/6/8/9，原Pixi页面 | src/view/management-pages.js、production-pages.js、research-page.js及docs/ui/pages对应文档；原报价与实际品质差额，不新增入口 |
| balance_specs | 报告4/5/6/8，正式经济规格 | docs/expansion/01-operations.md、06-research.md、07-balance-validation.md、README.md，docs/balance.md、game-design.md、development.md，根README.md、AGENTS.md；移除旧v1改动，先交正式数据规格 |
| PM | 当前报告、上述交付、主动作与原子保存 | 本任务卡、docs/feedback-checklist.md、报告事实勘误；静态审阅实际接入与遗留限制 |

冻结账接口：prestigeLedgerVersion='LT-2026-11-v2'；lifetimeProductionValue、prestigeCredit、pendingLegacyResearchPoints为BigInt；legacyResearchPointsSettled为boolean。纯ledger模块集中版本、整平方根、旧奖励冻结／迁移与账初始化；无DOM、真实时钟或存储依赖。迁移保留旧等级、解锁与已领任务，旧未花RP只×25一次；T从0，不重复记旧产值。保存所有者与world所有者直接协调模块导出，主代理审阅原出售事务。

状态：v2源码、规格、数据和原页面说明已交付，PM已读取实际运行消费路径与差异。所有子任务文件所有权已结束并交还PM。唯一一次正式内容生成完成，未运行任何验证或编译；经营效果待验收。

交付摘要：471物品改价54不变，523研究直接复制原字段；24科技费用、整金币品质、8/24/36h与平滑设施费已接入；24任务只改金额。纯prestige-ledger→world真实完工/原sellFarm→world-save→main await保存的实际路径已静态审阅，旧RP×25与冻结奖励有版本/领取标记。格式version=1.14另设balanceVersion=LT-v2，保留旧导入包路径。报告第11节记录结论、交付与未验证限制。intro原sold>0前提已补充。

E1的唯一正式生成说明：525/437/523；471变54同；12个样例与报告一致；研究金币348567051、原件数变化节点0涨0降523同；基础加工31146.954722h、精制3.544167h。未执行第二次生成或独立比较。E2/E3/E4/E5/E6/DOC均交付后，PM静态检索运行路径未见v1的合同/蓝图/分批研究/FIFO价值组等字段。只读集成审核balance_actions无需改main；其通用false动作草稿提交是原结构，本次sellFarm比较失败前无状态写入。

DOC扩展所有权：02-livestock-fish、03-single-sector-products、04-mixed-products、05-catalog、08-crop-uses各仅加顶部v2旧价覆盖说明，原表明细未改；其余文件按上表。没有编写或执行新测试；原有测试未运行，不以源码静态阅读当作测试结果。

PM最终静态审阅发现并修正schema1兼容差异：历史state.js评估每级20%，而schema2每级2%。E4复用同一旧档迁移连续成果物，短暂重新取得world-save所有权，schema1先按旧farmSaleOffer真实reward舍零，再×25冻结；readRecord二次helper因已有标记不重复换算。首轮交接曾因多行替换未匹配只落导入，PM读实际源发现缺口、退回所有者用精确patch补齐，再读converted→migratePrestigeLedger→legacyFarmSaleOffer(old).reward×25实物。报告8.1/11.1及经营式样已补充区别。原等级仍不乘10，schema2迁移不改。该补丁未运行验证；E4所有权再次交回PM。

以下为已撤回v1的历史任务记录，禁止据其恢复新增玩法或旧接口。

用户请求：核对 `docs/reviews/2026-11-15-long-term-balance-report.md` 是否属实，并修正属实的问题。

## 范围与权限

先区分现状证据、新设计与未验证节奏目标。报告并非运行验收，不能把静态工时当新档实际完成天数。已向用户询问新增合同等玩法是否一并落地；等待范围答复期间继续只读核查。没有测试、冒烟、模拟、预览、试编译、语法／运行时检查、推送或部署授权。

## 任务卡与所有权

所有任务使用 `fork_turns: none` 新干净上下文，后继仅限同一核实／修正目标的连续成果物。子代理不是独自在代码库工作，不得覆盖已有改动。主代理管理本卡、反馈清单及整合；共享文件只有一个所有者，转交须先结束旧所有权。

| 卡 / agent | 精确输入 → 输出 | 独占文件 / 状态 |
| --- | --- | --- |
| LT-E1 / catalog_balance | 报告3.1、3.2、4及生成器、原目录 → 定价与全链研发证据，后续确定性生成 | scripts/generate-game-data.mjs、src/content/game-data.json、拟新增固定旧基准及纯生成模块；核查中 |
| LT-E2 / tech_balance | 报告3.3、5、6.2、6.3及advancement → 科技／品质／离线证据与单位接口 | src/game/advancement.js；核查中 |
| LT-E3 / economy_runtime | 报告4.6、5.1、6.1、6.2、8及world/main事务 → 经济／RP／库存／研究接入 | src/game/world.js及拟新增纯经济模块；核查中 |
| LT-E5 / contracts_tasks | 报告3.3、6.4、7及objectives、sellFarm、commit → 任务现状及合同边界 | src/game/objectives.js及拟新增合同／蓝图模块；核查中 |
| LT-DOC / balance_specs | 报告与正式经济式样 → 事实／方案／目标分类及先行式样修正 | 报告、docs/expansion经济规格及docs/balance.md；核查中，不改反馈清单 |

最少读取和规则摘录已随各任务卡下发。纯经营模块不得依赖 PixiJS、DOM、IndexedDB 或真实时钟，数量 BigInt、存档十进制字符串、任务只随成功动作事务结算、保持现有 ID 与旧档。内容先式样后生成；生成命令仅由 LT-E1 所有者运行。

## 已确认源证据

- PD13 现价882717、直接材料27049、自身560秒；旧定价式样／Python生成工具明确有同档绝对价地板。当前JS生成器只解析式样，不应误称其直接执行地板算法。
- RP按每轮log2结算并清零，拆短轮有优势；当前永久科技共11160 RP，普通首级1点，高级4点，各项首级收益不等。
- 小麦品质4价6、品质10价12，面粉品质1价10、耗2小麦，直接增值分别-2/-14；现行式样原本允许负增值，这一现象属实，价值继承属于新方案。
- 当前离线2小时起、满级12小时；报告8/24/36小时是新设计。
- 任务已经发钱：commit内settleTaskRewards后writeWorldSave；空重启可一次领newFarm2000，首空轮2060，后续60，不能称无限领。
- L/F首建600，intro/build各300、build门槛1，可能同一购买触发全额返还。
- 现无报告所述9合同、蓝图、毕业后批量；这些是新增玩法。

## 待交付与限制

等待范围答复和各owner最终静态审阅结论；尚未修改游戏运行规则，未运行验证。精确全集统计和实际完成时间均不以子代理报告替代验证。
