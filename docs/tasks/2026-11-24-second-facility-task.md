# 2026-11-24 产业支线「建造第二座」

PM：主代理。允许验证：无（用户未授权测试、预览、试编译）。推送授权：无。全部交齐后 PM 执行最终编译。

## 用户原要求

首座鱼塘同时完成「建造第一座鱼塘」和「建造鱼塘」（条件都写「累计购买至少1座鱼塘」），一次弹出 11.25 万。用户采纳 PM 方案：第二条改为建第 2 座，并排在「入库」之后；畜牧、水产、矿业三条支线一起改。

## 变更

| 支线 | ID | 名称 | 新条件 | 新序 |
|---|---|---|---|---|
| 畜牧 | buildLivestock | 建造第二座养殖场 | `stats.boughtL` ≥2 | livestockIntro → collectLivestock → **buildLivestock** → livestockUpgrade → firstLivestockProcessing |
| 水产 | buildFish | 建造第二座鱼塘 | `stats.boughtF` ≥2 | fishIntro → collectFish → **buildFish** → fishUpgrade → firstFishProcessing |
| 矿业 | buildMine | 建造第二座矿洞 | `stats.boughtM` ≥2 | miningIntro → collectMining → **buildMine** → miningUpgrade → firstMiningProcessing |

- 条件文案沿用 `累计购买至少 {目标} 座…`，目标值显示为 2。
- ID、奖励金额（17,500／22,500／22,500）、时空胶囊奖励、去向标签不变。第二座购置费 `600m×5`＝15,000，低于奖励，奖励无需调整（经济准则 E-23 中这三项不受生成上限约束）。
- 存档：ID 不变，不迁移。已领取的回执保持完成；只买 1 座且未领取的旧档，改为需要第 2 座。
- 管理员帮助：三项 `build*` 在已有该类设施时改用「再建一座」的购买文案（新键 `buyMore`），尚无设施时沿用现有 `buy`。

## 任务卡

| 任务 | 目标 | 可编辑文件 | 上下文 |
|---|---|---|---|
| TASK-DEF | 三项 `build*` 的名称、目标值 2、在 `introductionBranches` 中移到对应 `collect*` 之后；同步 `tests/mining-game.test.js` 中依赖「买1座即完成 buildMine」的断言（不运行） | `src/game/objectives.js`、`tests/mining-game.test.js` | 新建干净上下文 |
| HELP-COPY | `purchaseStep` 在 L／F／M 已有设施时用 `buyMore`；在 `manager-help-copy.js` 为 tasks、livestock、fish、mine 各两种声线新增 `buyMore`，按现有声线人设写「再建一座」的引导 | `src/view/manager-help.js`、`src/view/manager-help-copy.js` | 新建干净上下文 |

文档（`docs/game-design.md` 支线表、`docs/expansion/01-operations.md`）由 PM 维护。

## 必须保留

- `livestockIntro`／`fishIntro`／`miningIntro` 条件与奖励。
- 其他任务定义、奖励、顺序与回执逻辑。
- 现有 `buy`／`funds` 文案与田地、工位购买引导。
