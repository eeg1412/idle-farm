# 农业科技补齐、动画短批次规则、鱼塘更名与文档修正

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

PM：主代理。反馈项见[反馈清单 2026-11-22（二）](../feedback-checklist.md)。本次授权：普通阅读与实现。未授权测试、模拟、冒烟、预览、试编译、语法或运行时检查；用户明确选择「长线模拟不运行，只标记失效」。子代理不编译，最终编译由 PM 执行。推送授权：无。

## 用户原话与已确认选择

1. 01-operations.md:18 矿洞基础周期仍写 2,805–2,913 秒（v11），v12 起为 755–3,210 秒 → 修正。
2. 科技满级模拟过期（第 537 日、24 项、468 万点；现 35 项、582 万点；溢价销售上线后市场收益未重测）→ 修正。用户选择：不运行模拟，只把旧结论标为失效。
3. 农业缺加工提速、精制专精、周期改良 → 给农业加上，与其他行业统一。用户选择：补 4 项完全对齐。
4. 鱼池统一改名为鱼塘。
5. 农业、畜牧、水产动画：原为按产物时长加速、设保底。改为：时间够第一帧和最后一帧 + 1 秒则保持 2 帧制度，不够只播放最后一帧。用户选择「三档」：够完整阶段 → 完整播放；只够首末两阶段 + 1 秒 → 只播首、末两阶段；不够 → 只显示最后阶段。矿业动画时间不足最低播放时间时，只显示矿车把矿物运到目的地的那一帧。

## 分工与依赖

| 卡 | 代理 | 目标 | 独占成果物 | 上下文 | 顺序 |
| --- | --- | --- | --- | --- | --- |
| AG-1 | agri_tech | 农业 4 项科技、配方笔记范围、总数文档、模拟失效标记、矿洞周期修正 | 见 AG-1 | 新建 | 并行 |
| AN-1 | short_batch_animation | 四行业短批次动画规则 | 见 AN-1 | 新建 | 并行 |
| PD-1 | pond_rename | 鱼池 → 鱼塘 | 见 PD-1 | 新建 | AG-1、AN-1 交付并结束所有权后 |

PM 独占：本文件、`docs/feedback-checklist.md`、`AGENTS.md`、`.agents/skills/*` 中与科技总数、动画保底、鱼池相关的句子，以及最终编译。

## AG-1 农业科技补齐

新增 4 项（插在农业组 `cropYield` 之后），费用和前置对齐水产：

| key | 名称 | 预算 B／满级 | 效果 | 前置 |
| --- | --- | --- | --- | --- |
| `cropResearch` | 农业研发手册 | 25／125,000 | 作物 C 与农业加工 I 研发材料每级 −1%，满级 −50% | 无 |
| `cropProcessing` | 农业加工提速 | 25／100,000 | `I` 类配方速率每级 +50 基点 | 无 |
| `cropCycle` | 作物周期改良 | 50／230,000 | 作物 `C` 设施速率每级 +100 基点，满级 +50% | `cropYield` 20 级 + 已解锁 C05 |
| `cropRefining` | 农业精制专精 | 25／230,000 | 来源含「农业」的商品精制每级 +50 基点 | `cropProcessing` 20 级 + 已解锁 P01 |

- `researchKeys` 增加 `C`、`I` → `cropResearch`；`recipeDiscount`（配方笔记）只覆盖其余商品配方，界面效果文案同步。
- `rate()`：`C` 改为 `10000 + 100×cropCycle`；`I` 改为 `base + 50×cropProcessing`；精制按真实 `sources` 叠加 `cropRefining`，与其他行业同法，总上限保持 25,000 基点。
- 合计：39 项、1,694 级、6,508,060 高级点。`techLevel1200` 阈值沿用定义动态推导；`m=5` 时全满奖励按现行公式为 `floor2sig(1250×1694×5)=10,000,000` 金币。
- 旧档缺新 key 按 0 级。不改 schema、账本版本、目录或经济版本（目录数值不变）。
- 文档：`docs/expansion/01-operations.md`（第 18 行矿洞周期改为 755–3,210 秒；§1.3 表格、合计、前置说明；§1.5 全满任务）、`docs/economy-guidelines.md` E-17／E-18、`docs/game-design.md` 科技段与 §8.3 数值、`docs/expansion/07-balance-validation.md`（§7.6 写明：最近一次长线模拟为第 537 日点满 24 项、468 万点，现已失效，现行 39 项、650.8 万点尚无模拟结论，溢价销售上线后的市场收益也未重测）、`docs/verification.md`、`docs/ui/pages/research.md`、`docs/ui/pages/tasks.md` 全满一句。
- 测试源只同步数字与定义断言，不运行。

## AN-1 短批次动画

设 `T` 为该批实际展示时长（科技后真实批次时长），`N` 为该对象的阶段数，阶段最短 `m=1000ms`：

| 档 | 条件 | 展示 |
| --- | --- | --- |
| 完整 | `T ≥ N×m + 1000` | 按真实 `T` 播放全部阶段（不再放慢到保底） |
| 首末 | `2m + 1000 ≤ T < N×m + 1000` | 只播第一阶段和最后阶段 |
| 末帧 | `T < 2m + 1000` | 只显示最后阶段 |

- 移除农业 5 秒、畜牧／水产 9 秒的展示保底，动画跟随真实批次时长；已有淡入淡出、收获表现在可用时长内保留。保留植株、附属产品类等原本只有两个状态的，以其两个状态作为首末阶段。
- 用户确认：肉用牲畜只显示最后阶段时显示成熟动物本身，不显示肉品。
- 矿业：保留 5.3 秒最低展示时长的定义。真实时长不足 5.3 秒时，只显示矿车载矿到达目的地那一帧，不播进出洞。
- 文件：`src/view/plot-animation.js`、`livestock-animation.js`、`livestock-layout.js`、`fish-animation.js`、`fish-layout.js`、`mining-animation.js`、`mining-layout.js`；文档 `docs/development.md` 动画各节、`docs/assets.md` 动画时序句、`docs/architecture.md`、`docs/expansion/02-livestock-fish.md`、`docs/expansion/09-mining.md`、`docs/ui/pages/fields.md` 中的保底句。
- 不改经营结算、库存、任务统计；不加 timer／RAF。

## SIM-1 满级测时工具

用户原话：满级模拟本身是游戏初期做的测试用工具，现在希望改造成能得出满级需要多久的工具，而不是一定要多少天点满的工具；需要修改工具和相关文档。

- 现状：`scripts/lib/time-cost-scenarios.mjs` 的 `checkScenarios` 写死旧科技总量 4,443,060 点和 1,124 级，观察期 1,825 日，未在期内点满就以 `status(fullTech, '五年观察期未购满科技…')` 判失败；由 `scripts/check-time-cost-balance.mjs`（`npm run balance:check`）调用。
- 目标：改为测量工具。科技总量、级数从 `techDefinitions`／`techTotalLevels` 动态推导；不再以天数期限判失败；输出各回访策略下首科技、各高阶科技首级、普通点倍率满级、科技全满（及图鉴、品质任务）的实测或外推所需天数与依据；观察期内未点满时使用现有稳态解析外推给出预计天数，标明「外推」。账本守恒、不可负等正确性断言保留。
- 阶段一（立即）：只改 `scripts/lib/time-cost-scenarios.mjs`、`scripts/check-time-cost-balance.mjs`、`package.json` 的 `scripts`（可新增单独入口）。
- 阶段二（AG-1 交付并释放后，同一代理续做）：`docs/expansion/07-balance-validation.md` §7.5／§7.6、`docs/verification.md`、`docs/economy-guidelines.md` 中关于长线模拟期限与通过条件的句子。
- 用户未授权运行该工具，交付为未运行状态。

## PD-1 鱼塘更名

AG-1、AN-1 交付后开始。把面向玩家的「鱼池」统一改为「鱼塘」，并同步代码中作为页签、目的地、映射键使用的同名字符串，路由 slug `fish` 不变。范围：`src/**`、`README.md`、现行规格文档。历史记录目录 `docs/reviews/`、`docs/tasks/`、`docs/art-reviews/` 与反馈清单的旧条目保留原文。如有持久化数据含该字符串，先报告 PM。
