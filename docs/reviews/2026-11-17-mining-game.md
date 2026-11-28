# 矿业经营层交付

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

任务：MIN-GAME / `mining_game`，干净上下文，成果物由该代理单一所有。实现已写入，未运行测试、模拟、预览、语法检查或构建；最终编译由 PM 执行。本记录是源代码阅读与实现说明，不是运行验收结论。

## 实际文件与接口

- `src/game/world.js`：`facilityTypes.M` 采用与 L/F 相同购买、升级公式、40 座上限及零免费初始设施。`startingFacilities()` 同时覆盖首次建档与周回重置；`stats.boughtM` 仅成功购置增加。原有购买、单个/批量安排、单个/批量升级、取消、产量预报接口直接接受 kind `M`。工坊以 kind 首字符分派，`IM` 继续占 I、`PM` 继续占 P，无额外工位。
- `src/game/advancement.js`：7 项矿业科技均为 50 级，预算依次为 125000/125000/420000/125000/100000/230000/230000 高级点。前置分别为 M01，高阶 `miningCycle` 另要求 miningYield 20 与 M05，`miningRefining` 另要求 miningProcessing 20 与 PM01。总定义 33 项、1474 级、5798060 点。
- M/IM 研发材料采用一次 miningResearch；PM 采用一次 recipeDiscount，沿用 L/IL 与 PL 的现有手册语义，不叠加跨来源折扣。M 周期改良、IM 加工提速分别对应水产效果；精制根据目录的真实 `sources` 应用行业专精，叠加明确封顶 25000 基点。
- `src/game/objectives.js`：5 项矿业支线 `miningIntro/buildMine/collectMining/miningUpgrade/firstMiningProcessing`，长期项 `miningTop`（M10 解锁）、`miningProduct`（PM14 完工）。基准金币与水产或现有末端商品对齐；目录相关两项上限由 CONTENT 生成。全部设施长期任务纳入 M。高级点奖励保持 40152 不变，低于新科技总费用 2%（115961.2 点）。
- `src/platform/world-save.js`：PM 已批准该实际存档模块所有权。M 设施接受快照、等级、起止时刻及产量一致性校验；库存、品质、保留量、统计、离线摘要继续按运行目录 ID 白名单读取，无额外矿业存储。
- `tests/mining-game.test.js`：编写 10 个必要回归用例，覆盖购买上限、旧档缺省与回执、设施快照升级、共享工位扣料退款、同刻供料、离线等价、科技费用/前置/封顶、研发手册与品质连抽、存档与交换封套、周回和任务。未运行，不能作为通过证据。

## 旧档与事务源阅读证据

1. 旧 M 缺省：`src/platform/world-save.js` 的 `amounts()` 在缺失 `facilities.M` 时补空数组，显式 null 保留给校验拒绝；`recordStats()` 缺失 `boughtM` 补十进制 0 后转换为 BigInt。矿业科技仍沿用 `techLevel(world,key) => world.tech[key] ?? 0` 的既有稀疏存储方式，缺失即 0 级，不改写已有科技。
2. 原批保留：`amounts()` 不重算原设施批次。`validateFacilityLists()` 以其保存的 yieldBase、facilityYieldBasis 与已存等级校验数量；工坊投入由 `stationBatches()` 十进制转换恢复。目录追加不回写旧批目录量。M 新批复用 `startFacility()`；升级复用 `facilitySnapshotOutput()`，只改变在制数量，不重新计时。
3. 回执保留：`taskRewardIds()` 复制白名单合法的原领取 ID。`objectives.js` 的 `progress()` 保留 `completedLegacy` 对已领取 `techLevel1200` 及品质任务的完成显示。全满目标仍为 `BigInt(techTotalLevels)`，新增未领需 1474 级；旧已领不撤销、不再发。
4. 新任务原子领取：`src/main.js` 的 `commit()` 先 `settleTaskRewards(draft)` 再 `writeWorldSave(db,draft)`；`world-save.js` 的 `writeWorldSave()` 在现有 IndexedDB 事务中共同保存金币、高级点、stats 和 taskRewards。未新增领取入口或从读档发奖路径。
5. 品质无需分池修改：`src/game/quality.js` 的 `drawQuality()` 从 `world.unlocked` 复制并排序生成抽取名单；`research()` 成功追加 ID。新 40 品随研发进入同一池，品质默认 1，每抽 100 普通点、种子与持久抽数机制均未改。
6. 投影与离线：`src/main.js` 的 `projectWorld()` 调用通用 `copySlots(source.facilities)`，后者遍历 Object.entries，已覆盖 M。`src/platform/offline-worker.js` 仍复制完整世界并走 `settleOfflineWorld()`。矿业仅进入既有事件调度、deposit 与账本结算路径，无动画发物品。
7. 周回报价：`farmSaleOffer()` 新增 `mineCount`，`sellFarm()` 报价重核加入该字段，旧确认期间发生矿洞购买会拒绝过期报价。重置清空 M、库存和在制批，保留累计 boughtM、研发、品质、科技、随机序号、权益和任务回执。

## 性能等价与依赖

没有改变主循环、离线事件排序、同刻先入库后扣料、增量唤醒算法或 5 秒存档间隔。M 接入已存在的设施枚举，旧 C/L/F 与工位的相对顺序保持；新 M 设施在其后登记。`advanceWorld()` 未增加新的可变字段，原投影复制足够；无新增热路径全世界深拷贝。存档复用当前白名单、事务及标记缓存路径。

下游需 CONTENT 交齐 40 品 `kind`、真实 `sources`、研发与 `miningTop/miningProduct` 金币 cap，VIEW 交齐矿洞入口和对应来源筛选；交付时上述跨模块最终结果由 PM 汇合。本经营层没有新增任何静态或图标回退。

现行 AGENTS/经济准则/01 的旧 26 项、1124 级、4443060 点与本轮明确需求的 33 项、1474 级、5798060 点冲突，本轮采用任务卡新要求；全仓说明由 PM/CONTENT 对应所有者同步。任务数由 66 增至 73（16 入门、19 产业支线、38 长期），旧任务 ID 不变。测试授权未答前保持未运行，不推送。
