# 新手任务指示链核对（OB-1）

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

[新手开场与任务讲解](2026-11-25-onboarding.md) · 任务卡 OB-1 · 只读核对，未运行游戏、未执行项目代码

## 范围与方法

- 对象：入门主线 17 项（`src/game/objectives.js` `mainGuide`）、产业支线 19 项（`introductionBranches`）。
- 指示链：任务卡「前往」按钮（`src/view/management-pages.js` `renderTasks` / `taskDestination` / `taskFocus`）＋ 管理员横幅（`src/view/manager-help.js` `managerTutorial` / `taskInstruction`，文案在 `src/view/manager-help-text.js`）。
- 数值来源：`src/content/game-data.json`（以 `node -e` 只读解析）、`src/game/world.js`、`src/game/orders.js`、`src/game/advancement.js`、`src/game/prestige-ledger.js`，`coinScale = 5`。
- 按钮名核对：对横幅文案中「」包住的按钮名在 `src/view/*.js` 中逐个 grep，全部存在（「增设加工位」「增设精制位」由 `production-pages.js:782,1052` 以 `'增设' + stationNames[kind]` 拼出）。
- 时间与件数推算基于下列假设，未做模拟，结论中凡依赖玩家操作节奏的数值均标注为推算。

### 开局数值

| 项 | 值 | 出处 |
| --- | --- | --- |
| 开局金币 | 3,000 | `world.js:18` `600n * coinScale` |
| 田地 | 2 块免费、未播种、1 级 | `world.js:66-68,345` |
| 工位 | 加工位、精制位各 1 个，无配方 | `world.js:345` |
| 初始解锁 | C01 小麦、I01 面粉 | `game-data.json` `initial` |
| 第 3 块田 | 3,000（之后每块 ×5） | `world.js:699-707` |
| 田地 1→2 级 | 1,500；1→10 级累计 460,500；9→10 级单步 139,500 | `world.js:56-59` `upgradeWeight`，基数 1,500 |
| 第 2 个加工位／精制位 | 3,750／4,750 | `world.js:729-737` |
| 加工位／精制位 1→2 级 | 3,750／4,750 | `world.js:81-83` |
| 养殖场／鱼塘／矿洞首座、第二座 | 3,000、15,000 | `world.js:22-26,699-707` |
| 上述设施 1→5 级 | 45,000 | `upgradeWeight(5)=30` × 1,500 |

| 品项 | 周期 | 每批 | 基价 | 研发金币 | 研发材料 |
| --- | ---: | ---: | ---: | ---: | --- |
| C01 小麦 | 12 秒 | 2 | 150 | 初始 | — |
| I01 面粉 | 14 秒 | 12（耗小麦 2） | 56 | 初始 | — |
| P01 乡村面包 | 31 秒 | 1（耗面粉 2） | 1,980 | 2,148 | 小麦 3、面粉 8 |
| C02 甘蔗 | 16 秒 | 2 | 253 | 942 | 小麦 1、面粉 2 |
| I02 糖浆 | 18 秒 | 8 | 138 | 2,057 | 甘蔗 2、面粉 6 |
| P02 焦糖饼干 | 64 秒 | 1 | 7,831 | 5,449 | 面粉 23、糖浆 9（前置 I02、P01） |
| L01 鸡蛋 | 30 秒 | 2 | 825 | 1,725 | 小麦 5 |
| F01 鲫鱼 | 42 秒 | 2 | 1,575 | 2,625 | 小麦 8 |
| M01 岩盐 | 755 秒 | 2 | 476,908 | 473,559 | 鸡蛋 50 |
| IL01 全蛋液 | 66 秒 | 8 | 1,361 | 8,745 | 鸡蛋 5 |
| IF01 鲫鱼鱼糜 | 93 秒 | 5 | 4,278 | 16,125 | 鲫鱼 4 |
| IM01 食用精盐 | 878 秒 | 2 | 1,197,006 | 1,831,216 | 岩盐 1 |

### 主线金币顺推（按任务表序，最少花费路径）

| 完成后 | 花费 | 奖励 | 余额（推算） |
| --- | ---: | ---: | ---: |
| 开局 | — | — | 3,000 |
| firstHarvest | 0 | 1,700 | 4,700 |
| firstFlour | 0 | 1,950 | 6,650 |
| breadRecipe | 2,148 | 2,300 | 6,802 |
| firstBread | 0 | 2,850 | 9,652 |
| firstOrder + firstSale（同一次交付） | 0 | 2,850 + 3,550 + 订单报酬 n × 9,900 | ≥ 25,952（n=1） |
| firstPlot | 3,000 | 4,350 | ≥ 27,302 |
| firstUpgrade | 1,500 | 5,500 | ≥ 31,302 |
| firstSeed | 942 | 8,500 | ≥ 38,860 |
| firstSwitch | 0 | 10,500 | ≥ 49,360 |
| reserveStock | 0 | 13,000 | ≥ 62,360 |
| addProcessor | 3,750 | 13,500 | ≥ 72,110 |
| addRefinery | 4,750 | 14,500 | ≥ 81,860 |
| stationUpgrade | 3,750 | 15,500 | ≥ 93,610 |
| recipeTrio | 最少 30,349（I02、P02、C03、I03、P03） | 10,000 | ≥ 73,261 |
| fieldLevel10 | 459,000（2→10 级） | 230,000 | 需另有约 386,000 收入 |
| codex20 | 最少路径 70,159（16 项最便宜研发） | 34,000 | — |

高额订单每件报酬 = `floor((1,980 × 500 + 50) / 100)` = 9,900（`orders.js:189-203`，首单倍率 5 倍、无衰减）。

结论：breadRecipe 时余额 6,650 ≥ 2,148，**开局金币不够研发的怀疑不成立**。主线 1–15 项金币全程充足；fieldLevel10 是主线中唯一花费超过当时余额的任务。

## 总表

| 任务 ID | 名称 | 结论 | 一句话原因 |
| --- | --- | --- | --- |
| firstHarvest | 第一次收成 | 通畅 | 免费田地播种小麦，12 秒入库，横幅与「前往田地」一致 |
| firstFlour | 磨出面粉 | 通畅 | 加工位选面粉，小麦到位后 14 秒入库 |
| breadRecipe | 研发乡村面包 | 卡点（轻） | 金币足够；小麦被加工位持续消耗，凑齐「小麦 3」需等待，横幅只说「材料够了点研发」，不说缺什么、等什么 |
| firstBread | 烤出乡村面包 | 通畅 | 精制位选乡村面包，31 秒入库 |
| firstOrder | 完成1件订单 | 卡点 | 首单件数 = ceil(V/3,960)，连续操作时推算 3–10 件（1.5–5 分钟）；首个面包前停留越久件数越多，离线 6 小时后可达数百件、数小时；等待中横幅无进度与下一步 |
| firstSale | 第一次出货 | 不符（设计内顺带完成） | 交付首单即计 `stats.sold`，与 firstOrder 同时完成，其横幅在正常流程中不会出现 |
| firstPlot | 扩建田地 | 不符（文案） | 任务页横幅用 `buy` 文案「要先有个生产的地方」，玩家已有 2 块田；`funds` 分支前缀「先去「田地」」与卡片「前往出货」不一致 |
| firstUpgrade | 田地升级 | 通畅 | 1,500 金币，批量管理→升级→确认升级 |
| firstSeed | 研发甘蔗 | 通畅 | 942 金币＋小麦 1、面粉 2，材料常备 |
| firstSwitch | 改种新作物 | 通畅 | 指向第 3 块空田「播种」或第 1 块田「换种」选甘蔗 |
| reserveStock | 设置保留量 | 通畅 | 仓库物品详情「加工保留量」→「保存」，按钮存在 |
| addProcessor | 添置加工位 | 不符（文案） | 同 firstPlot：任务页 `buy` 文案「要先有个生产的地方」与已有 1 个加工位矛盾 |
| addRefinery | 添置精制位 | 不符（文案） | 同上 |
| stationUpgrade | 升级工位 | 通畅 | 3,750 金币，加工／精制页均匹配 |
| recipeTrio | 扩充配方 | 卡点 | 第 2 种商品配方（焦糖饼干）先要研发非商品的糖浆并实际生产糖浆、甘蔗；横幅只说「挑没研发的，材料齐了点研发」，不点名下一项，也不提前置与备料 |
| fieldLevel10 | 田地十级 | 卡点 | 2→10 级共 459,000 金币，超出当时余额；`upgradeStep` 没有缺钱分支，横幅照旧说「批量管理…确认升级」，按钮只显示「金币还不够」 |
| codex20 | 图鉴收录 | 通畅 | 图鉴「查看研发」存在，最少路径 70,159 金币，余额可承担 |
| livestockIntro | 建造第一座养殖场 | 通畅 | 3,000 金币，「购买养殖场」→「确认购买」 |
| collectLivestock | 畜牧产物入库 | 断链（落点） | 新档无已解锁畜种；卡片「前往养殖场」，横幅却要去研究研发，研究页无此任务横幅，文案不点名「鸡蛋」 |
| buildLivestock | 建造第二座养殖场 | 通畅 | 15,000 金币 |
| livestockUpgrade | 养殖场升级 | 卡点（轻） | 45,000 金币；与 fieldLevel10 同样缺少缺钱分支 |
| firstLivestockProcessing | 加工畜牧原料 | 断链（落点） | 全蛋液未解锁；卡片「前往加工」，横幅要求去研究，不点名「全蛋液」，研究页无横幅 |
| fishIntro | 建造第一座鱼塘 | 通畅 | 3,000 金币 |
| collectFish | 鱼类入库 | 断链（落点） | 同 collectLivestock，不点名「鲫鱼」 |
| buildFish | 建造第二座鱼塘 | 通畅 | 15,000 金币 |
| fishUpgrade | 鱼塘升级 | 卡点（轻） | 同 livestockUpgrade |
| firstFishProcessing | 加工水产原料 | 断链（落点） | 同 firstLivestockProcessing，不点名「鲫鱼鱼糜」 |
| miningIntro | 建造第一座矿洞 | 通畅 | 3,000 金币 |
| collectMining | 矿产入库 | 断链（落点＋跨支线依赖） | 岩盐研发需 473,559 金币和鸡蛋 50，鸡蛋来自畜牧支线；横幅不点名岩盐、不提鸡蛋 |
| buildMine | 建造第二座矿洞 | 通畅 | 15,000 金币；横幅在 collectMining 完成前不会轮到 |
| miningUpgrade | 矿洞升级 | 卡点（轻） | 同 livestockUpgrade |
| firstMiningProcessing | 加工矿业原料 | 断链（落点） | 食用精盐研发 1,831,216 金币＋岩盐 1；横幅不点名，研究页无横幅 |
| firstMixedProduct | 制作复合商品 | 断链 | 「研发它的配方」未指明是哪一项；最近目标 PD01 袋装牛乳蛋香饼还需 IL01、IL02、L02 三项前置 |
| newFarm | 经营交接 | 通畅（附风险） | 门槛 T ≥ 2,600,000，横幅与卡片奖励行一致；主线未完成时出售会重置田地等级等当前状态 |
| firstTech | 永久科技 | 卡点（轻） | 高级研发点只来自出售庄园；卡片在 newFarm 前就可见并指向「经营改良」，此时 0 点无法完成，文案不说点数来源 |
| delegationTech | 代管时长 | 通畅 | 1 级 15 点；首次交接按门槛推算得 50 点 |
| （全部支线） | 任务页横幅 | 断链 | `managerTutorial` 在任务页只取主线当前项；主线完成后任务页横幅恒为空，支线在任务页从不讲解 |

## 问题详情与修改方案

方案均为提议，未实施。

### A. firstOrder 首单件数与等待（卡点）

**证据**

- 首单在第一个商品真实入库时生成，且只能是该商品：`world.js` `advanceWorld` 中 `recordOrderProduction(world, firstProduct, eventAt)` → `orders.js:292-296` `generateHighOrder(world, id)`。主线顺序决定首个商品是 P01。
- 件数 `count = max(1, min(ceil(V / 2U), ceil(peak × H / 100)))`（`orders.js:189-203`），U = 1,980，`2U = 3,960`；P01 一个 1 级精制位峰值 = 116.13 件/小时，H 取 8–24 → 容量上限 930–2,788 件。
- V（本轮完工总值）在首个面包入库时包含此前全部小麦（150）、面粉（56）与这 1 个面包（1,980）。
- 推算（连续操作）：只种 1 块田、照横幅最快操作，首个面包在开局后约 111 秒，V ≈ 小麦 18×150 + 面粉 60×56 + 1,980 = 8,040 → 3 件；两块田都种、操作较慢时 V 在 2–4 万 → 5–10 件。补齐 (n−1) 件需 (n−1)×31 秒，即 1–5 分钟。**"首单必然要数小时"的怀疑在连续游玩下不成立。**
- 条件成立的情形：firstFlour 之后、首个面包之前停留越久，V 越大。两块小麦＋1 个加工位时 V 增速推算为每小时约 35 万，相当于每停留 1 分钟首单多约 1.5 件（约 46 秒生产时间）。离线代管 6 小时（0 级上限）后 V 可达约 210 万 → 约 530 件，单精制位需约 4.6 小时；首单未接受跨日过期后，30 分钟内重新生成时 V 已更大，件数随之变大。
- 等待期间横幅：`orderStock`「单接好了，照件数备货，齐了再来。」（`manager-help-text.js:175`），不提剩余件数、所需时长，也不提增设精制位能加快。主线下一项 firstSale 与 firstOrder 同时完成，其后的 firstPlot、firstUpgrade 等在任务列表可见并可提前完成，但横幅不提示。

**修改方案**

1. 规则层（需用户确认，涉及 AGENTS.md 订单件数规定）：首单（`recordOrderProduction` 生成的那一张）件数单独取上限，例如以 `normalHours` 1–4 小时容量或固定小数值封顶。属于订单式样变更，未经用户同意不得实施。
2. 文案层（不改规则）：`manager-help.js` `taskInstruction` 的 `firstOrder` 分支在 `orderStock` 时传入 `{ have, need }`（库存与锁定单件数），`manager-help-text.js` `orderStock` 改为函数文案，写出「还差 N 件」；当剩余件数 × 周期超过 10 分钟时改用新分支 `orderSlow`，指向「增设精制位」或「先去田地扩建」（firstPlot 可提前完成）。

### B. orderWaiting「先忙别的」无下一步（卡点，触发面窄）

**证据**

- 分支条件：`world.orders.active` 为空且 `nextAttemptMs !== null`（`manager-help.js:89-91`）。主线 firstOrder 阶段只在两种情形出现：玩家「放弃」已接受订单（`orders.js:443`），或首单未接受、跨自然日过期（`orders.js:54-58`）。
- 下一次检查点不超过 30 分钟（`orders.js:6`）；当天高额额度用完后仍会生成普通订单（`generateOrder`），P01 一直是候选，因此不会永久无单。
- 订单中心本身显示「下一张订单在路上」及倒计时（`order-page.js:240`），但横幅文案「现在没单可接，先忙别的，有新单再来。」（`manager-help-text.js:173`）与订单页角色版「站这么久腿不酸吗，去坐会儿。」（`manager-help-text.js:245`）均无具体下一步。

**修改方案**：`taskInstruction` `firstOrder` 在 `orderWaiting` 时取 `world.orders.nextAttemptMs - world.clockMs` 换算分钟传入文案；文案写成「下一单 N 分钟后到，先去田地点「购地」」一类，指向下一项可提前完成的主线任务（firstPlot）。具体去向由 PM 定。

### C. firstSale 被首单交付顺带完成（不符，设计内）

**证据**：`deliverOrder` 执行 `world.stats.sold += count`（`orders.js:460`），firstSale 计数为 `stats.sold`（`objectives.js:201`）。`docs/game-design.md` §8.3「一次订单交付可同时达成「完成1件订单」和「第一次出货」」明确允许。因此 firstSale 的任务页横幅（`taskCopy.firstSale`）在按顺序游玩时不会显示；只有玩家在首单前用仓库出售才会先完成它。

**结论**：不构成断链。OB-2 的 firstSale 问号说明只能在该卡仍未完成时（即首单交付前）看到，正常流程中玩家看不到。无需修改；如要让玩家体验仓库出售，需把 firstSale 移到 firstOrder 之前，属于顺序变更，需用户确认。

### D. breadRecipe 材料等待（卡点，轻）

**证据**：P01 研发需小麦 3、面粉 8（`game-data.json` `research.P01`）。加工位每批 14 秒吃 2 小麦，单块田每 12 秒产 2 小麦；只种 1 块田时库存小麦在前 96 秒内反复归零，推算约 2–3 分钟后才稳定 ≥ 3。`taskHelpCopy breadRecipe` 是固定文案（`manager-help.js:96-97`，`manager-help-text.js:170,190,212,218`），只说「金币和材料够了点研发」。

**修改方案**：`taskInstruction` 的 `breadRecipe` 改为动态：调用 `researchOffer(world, 'P01')`，材料不足时用新分支 `researchMissing`，点名所缺品项（如「还差小麦」），并指出第 2 块田「播种」小麦可加快。firstSeed 可共用同一分支。

### E. 任务页 `buy` 文案前提错误（不符）

**证据**：`purchaseStep`（`manager-help.js:44-48`）对 C、I、P 恒用 `buy`；任务页角色的 `buy` 文案为「要先有个生产的地方」／「还没有生产位置」（`manager-help-text.js:7,18`）。firstPlot 时已有 2 块田、addProcessor／addRefinery 时已有 1 个工位，前提与事实相反。田地／加工／精制页各自角色的 `buy` 文案正确（`manager-help-text.js:30,112,135` 等）。

另：firstPlot 金币不足时，卡片改为「前往出货」指向仓库（`management-pages.js:715-718`），任务页横幅却由 `tutorialDestination` 前缀「先去「田地」」（`manager-help.js:145-148`），两者落点不同；且仓库页不匹配 firstPlot，没有横幅。按顺推余额此分支在正常流程中不触发（首单后余额 ≥ 25,952 > 3,000）。

**修改方案**：`purchaseStep` 对 C、I、P 在已有设施或工位时改用 `buyMore`，并在 `manager-help-text.js` 的 `productionCopy.tasks` 中让 `buyMore` 文案不限于养殖场／鱼塘／矿洞的措辞；`managerTutorial` 对 firstPlot 缺钱情形把 `destination` 取为「仓库」，与卡片一致。

### F. recipeTrio 不点名下一项、不提前置（卡点）

**证据**：已解锁商品只有 P01。下一种最近的商品配方是 P02 焦糖饼干，缺口 2 项（I02 糖浆、P02）；第三种最近为 P03 草莓挞，需 C03、I03、P02、P03。研发 P02 需要糖浆 9，糖浆须先研发 I02、田里种甘蔗、加工位改做糖浆；P03 需要实际做出 1 个焦糖饼干。横幅文案（`manager-help-text.js:180,200,214,220`）只说「挑没研发的，材料齐了点研发」。研究页详情有「研发前置」可点和「查看材料来源」（`research-page.js:186-215`），玩家能自行摸索，但横幅不给方向。

**修改方案**：`taskInstruction` 增加 `recipeTrio` 动态分支：在 `catalog.research` 中找出缺口最小的未解锁商品（同 `orders.js` `missingResearch` 的走法），取其第一个可研发的前置项点名；可研发但缺材料时点名材料和对应生产位置。`taskFocus.recipeTrio` 同步设为该前置项的 `recipeFocus(id)`。

### G. fieldLevel10 及各设施升级缺少缺钱分支（卡点）

**证据**：`upgradeStep`（`manager-help.js:69-78`）先找能负担的槽，找不到也只是换一个未达标的槽，最终总返回 `upgrade` 文案「点「批量管理」勾上它，「升级」，再「确认升级」」。fieldLevel10 需 459,000 金币（9→10 单步 139,500），stationUpgrade 前后余额推算在 7–9 万；批量管理的「升级」按钮此时禁用并提示「金币还不够」（`production-pages.js:345`）。livestockUpgrade／fishUpgrade／miningUpgrade（45,000）在支线刚出现时同样可能负担不起。`purchaseStep` 有 `funds` 分支，`upgradeStep` 没有。

**修改方案**：`upgradeStep` 在所有未达标槽的 1 级报价都不可负担时返回新分支 `upgradeFunds`（各角色文案仿照 `funds`：去仓库「出售」或交付订单攒钱）。`renderTasks` 的 `earnForLand` 逻辑可同样推广到升级类任务（显示「前往出货」），此为界面行为变更，需 PM 确认。

### H. 支线「产物入库／加工」任务的落点断链（断链）

**证据**

- collectLivestock／collectFish／collectMining：新档 `world.unlocked` 只有 C01、I01，`firstUnlocked` 找不到对应种类，返回 `collectLocked`（`manager-help.js:112-118`），文案要求去研究的「品种配方」研发，但不点名品种（`manager-help-text.js:182,202,251-256`）。
- firstLivestockProcessing／firstFishProcessing／firstMiningProcessing：同理返回 `processingLocked`（`manager-help.js:121-125`）。
- 卡片落点：`taskFocus` 只给加工类任务设 `source`（`management-pages.js:624-626`），collect 类无 focus，落点分别是养殖场、鱼塘、矿洞、加工页，不是研究页。
- 研究页横幅：`managerTutorial` 对非任务页只匹配 `task.tab ?? task.target`（`manager-help.js:35-38,142-143`），这些任务的目的地不是「研究」，玩家按横幅去研究页后看不到任何任务指导。
- 矿业额外依赖：M01 研发需鸡蛋 50（`research.M01`），且 473,559 金币；横幅不提鸡蛋来自畜牧，不提金币量级。IM01 需 1,831,216 金币。

**修改方案**

1. `management-pages.js` `taskDestination`：当对应种类无已解锁品项时，collect 类与 processing 类任务改为 `{ target: '研究', tab: '品种配方', id: <首个品项> }`（L01、F01、M01、IL01、IF01、IM01），卡片按钮随之显示「前往研究」。
2. `manager-help.js` `matchesPage`：上述任务在对应种类无已解锁品项时也匹配「研究」页。
3. `taskInstruction`：`collectLocked`、`processingLocked` 传入目标品项名（`catalog.items[id].name`），文案写出「研发「鸡蛋」」；对 M01 额外点出所缺材料「鸡蛋」。

### I. firstMixedProduct 不点名目标（断链）

**证据**：无已解锁复合商品时返回 `mixedLocked`（`manager-help.js:126-129`），文案「研发它的配方」（`manager-help-text.js:184,204,259-260`）中「它」无所指。全目录 574 项中玩家需自行找出 `sources.length >= 2` 的商品。在已解锁 C01、I01、P01、C02、L01、F01 时，最近目标为 PD01 袋装牛乳蛋香饼（缺 IL01、IL02、L02、PD01 四项，研发金币合计 89,451）。`taskFocus.firstMixedProduct` 只有 `source: '全部'`，落点为精制页。

**修改方案**：`taskInstruction` 按缺口最少（并列取研发金币最少）选出一个复合商品并点名，横幅给出其第一个可研发的前置；`taskDestination` 在未解锁任何复合商品时落到该项的 `recipeFocus(id)`。

### J. firstTech 卡片提前可见但不可完成（卡点，轻）

**证据**：高级研发点只由 `sellFarm` 的 `settlePrestigeLedger` 发放（`prestige-ledger.js:59-64`），主线与支线任务奖励均不含高级研发点（`objectives.js:94-103`）。支线在首次出货后全部显示，firstTech 卡片「前往研究」→「经营改良」，此时点数为 0。横幅按支线组只讲每组第一项未完成任务（`manager-help.js:26-28`），「经营」组在 newFarm 完成前只讲 newFarm，因此研究页不会出现 firstTech 横幅；但卡片可以点，玩家到「经营改良」看到全部不可负担，文案（`manager-help-text.js:187,207,215,221`）也不说点数来源。按门槛 T = 2,600,000 推算首次交接得 `floor(√(49×T) × 10,000 / 2,236,067)` = 50 点，足以完成 firstTech（最低 15–25 点）与 delegationTech（15 点）。

**修改方案**：firstTech、delegationTech 文案在 `world.researchPoints` 低于最低报价时用新分支，写明「高级研发点从「出售庄园」获得」；或 `taskDestination` 在 newFarm 未完成时把 firstTech 卡片落点设为「出售庄园」。

### K. 任务页横幅不讲支线（断链）

**证据**：`managerTutorial` 中 `const task = page === '任务' ? state.active : …`（`manager-help.js:142`）。`state.active` 为 `activeGuideTask`，主线 17 项全部完成后返回 `null`（`objectives.js:347-354`），任务页横幅随之为空；主线进行中任务页也只讲主线。支线横幅只在各自目的地页出现。

**修改方案**：`managerTutorial` 在 `page === '任务'` 且 `state.active` 为空时取 `state.branches[0]`；`tutorialDestination` 的目的地取该支线任务的 `tab ?? target`。

### L. newFarm 在主线进行中可见（风险，非断链）

**证据**：支线在首次出货后显示（`objectives.js:342`），此时主线常处于 firstPlot 之后。`sellFarm` 不检查门槛（`world.js:1033`），会把金币重置为 3,000 并清空订单、库存与工位、田地等当前状态；fieldLevel10、stationUpgrade 等按当前等级计数的未完成主线任务会回到起点（已领奖的任务保持完成，`objectives.js:318-331`）。newFarm 横幅只在门槛未达时劝玩家继续生产，门槛达到后不提醒主线进度会受影响。

**修改方案**：需用户决定是否处理。可选做法：`taskInstruction` 的 `newFarm` 在 `activeGuideTask(world)` 非空时追加一句「入门任务做完再交接」。

## 等待时长汇总（推算）

| 任务 | 等待 | 等待期间横幅 |
| --- | --- | --- |
| firstHarvest | 12 秒 | `running`「等倒计时走完」 |
| firstFlour | 14 秒（另需小麦到位） | `running`／`missing` |
| breadRecipe | 材料凑齐 0–3 分钟 | 固定文案，无缺料说明（D） |
| firstBread | 31 秒 | `running` |
| firstOrder | (n−1)×31 秒，连续操作 n 为 3–10 | `orderStock` 无件数与时长（A） |
| recipeTrio | 甘蔗 16 秒、糖浆 18 秒、焦糖饼干 64 秒等多段 | 固定文案（F） |
| fieldLevel10 | 攒 459,000 金币 | 无缺钱分支（G） |
| collectMining | 鸡蛋 50（单养殖场 12.5 分钟）＋ 473,559 金币 | 不点名（H） |
| firstMiningProcessing | 岩盐 755 秒／批，食用精盐 878 秒／批，1,831,216 金币 | 不点名（H） |
| newFarm | T 达到 2,600,000 | `newFarmGate` 文案与卡片门槛一致 |

## 文档差异

- `docs/tasks/2026-11-25-onboarding.md` 写「支线 18 项」「35 个任务 ID」；代码 `introductionBranches` 为 19 项（畜牧 5、水产 5、矿业 5、复合 1、经营 3），`docs/game-design.md` §8.3 与 `docs/ui/pages/tasks.md` 也写 19 项，合计应为 36 项。`src/view/onboarding-text.js` 已包含全部 19 个支线 ID。
- `docs/ui/pages/tasks.md` 写「首次出货……另发高级研发点」；`docs/game-design.md` §8.3 写「首出货只发金币」，代码 `taskResearchPointRewards`（`objectives.js:94-103`）不含 firstSale，另发 300 时空胶囊（`objectives.js:107`）。
- `docs/game-design.md` §8.3 入门表把 codex20 入口写作「研究 · 图鉴」，代码目的地为「图鉴」页（`objectives.js:17,214`）。

## 待确认

1. 首单件数的实际分布：需按真实玩家节奏或录像模拟 `advanceWorld` 得出首个面包入库时的 V；本报告只做手算推算，未验证。
2. 首单生成是否可能因 P01 容量记录为 0 而落空：`recordOrderProduction` 在 `advanceWorld` 内调用，P01 的 `orders.capacity` 依赖此前 `assignProductionBatch` → `recordOrderCapacity` 记录的实际产能。若玩家排面包时面粉供给为 0 且上游无产出，首单可能不生成并进入 30 分钟 `orderWaiting`。缺：`actualHourlyProduction` 在该边界的实际返回值，未验证。
3. 首次交接得 50 点高级研发点按「经营评估 0 级、倍率 10,000 基点、交接时 T 恰为门槛」推算，未验证。
4. A 方案 1（首单件数封顶）与 C、L 涉及订单式样和任务顺序，需用户确认后才能实施。
5. 画面未实看：「前往」后是否直接打开研发详情（`recipeFocus` 带 `id`）、批量管理弹窗中「勾上它」的具体交互，均以源码为据，未验证。
