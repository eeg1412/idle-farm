---
name: farm-content
description: 新增或修改《放置农场》的作物、牲畜、鱼类、中间产物、商品，或调整配方、研发前置、目录式样时使用。给出五类新增品项的端到端工作流（式样→生成→美术→审图→接入），并检查材料来源、研发依赖和所有权。
---

# 目录内容与新增品项

路径均以仓库根目录为准。先读 `AGENTS.md`；改数值前读 `docs/economy-guidelines.md`（至少 E-04–E-06、E-12–E-14、E-25、E-26、E-28–E-31）。冲突时以 `AGENTS.md` 和正式式样为准，并在差异说明中列出。

## 选择工作流

| 要新增的品项 | 类别 ID | 工作流 | 美术 skill |
| --- | --- | --- | --- |
| 作物 | `C` | [new-crop.md](references/new-crop.md) | farm-crops → farm-art-review |
| 牲畜（含其仓库产物） | `L` | [new-livestock.md](references/new-livestock.md) | farm-livestock → farm-art-review |
| 鱼类（渔获与鱼同名） | `F` | [new-fish.md](references/new-fish.md) | farm-fish → farm-art-review |
| 中间产物 | `I` 农业／`IL` 畜牧／`IF` 水产 | [new-intermediate.md](references/new-intermediate.md) | 物品图标（`docs/assets.md`）→ farm-art-review |
| 商品 | `P`／`PL`／`PF`／`PD`／`PT`／`PM` | [new-product.md](references/new-product.md) | 零售包装物品图标（`docs/assets.md`）→ farm-art-review |

一次新增多类（如新鱼 + 鱼汁 + 鱼汁商品）时按依赖顺序串联：原料 → 中间产物 → 商品。式样与生成只开一次，由同一个目录所有者一次写完全部行再生成。

已有 ID 的生产投入、来源、等级、研发前置和耗材 ID 以固定 1.14 结构快照校验。新增配方会累加投入 U 并可能改变已发布品项的批量、含料工时、售价与研发金币。记录受影响范围和再生成后的验证结果。

## 冻结规则（五个工作流共用）

1. **编号**。取同类下一个 ID（如 C69、L11、F11、I128、IL11、IF11、P181）。既有 ID 保持原序，快照内配方不能改用新增品项。同步 `scripts/catalog-rules.mjs` 的 `kindCounts`。
2. **生成**。写式样、计数和商品等级后运行 `npm run content:generate`，产出 `src/content/game-data.json` 与 `src/content/task-coin-caps.json`。运行目录与奖金上限由生成器填写，然后交接美术导出。
3. **基础周期**。所有品项填 `s`（1–43,200 整秒）。原料实际周期等于 s，按 (1+s/3) 金/秒估算同期位置。配方用 s 作下界，生成器按供料、直接上游周期和同窗要求解最小整秒。43,200 秒仍不满足的品项须调整输入方案。五类新增品项均须通过[跨品类周期差校验](../../../docs/expansion/07-balance-validation.md#新增品项周期差)。
4. **批量和价格**。全目录先累计消耗，再统一计算 `Q=1+isqrt(floor(U/2))`、含料工时和售价。预先看新增配方是否跨过 `2k²` 用量档，跨档后检查上游批量、直接与间接下游及研究和任务上限。
5. **研发**。每个新 ID 在 06 有一行。其前置包含全部配方投入与耗材 ID。金币及各材料数量由生成器定价，材料现值至多占 40%，依赖项完整报价至少覆盖工坊前置完整报价。
6. **美术**。沿用各品类工作流。动画资源按项目要求齐全后再发布，禁止在经营动画区域新增回退行为。物品图标仍使用 `public/wiki/icons/<ID>.webp`。
7. **版本**。PM 按 E-29 判断发布数值变更，07 记录新 ID 与受影响范围。
8. **验证授权**。生成和导出按任务卡授权执行。测试、预览、`npm run art:check` 和试编译按用户授权；最终编译由 PM 执行。提交和推送分别遵守本任务的明确授权。

## 式样行的写法

- 05 物品表用 `| ID | 名称 | 基础周期下界秒 | 每批投入 |`，投入为 `N×ID + N×ID` 或原料的 `—`。每项追加在对应类别末尾。
- L/F 在 02 养殖表加 `| ID | 对象 | 产物 |`，产物名称与 05 一致。02 的专用加工、03、04、08 为说明表，按需要同步。
- 06 研发表用 `| ID | 名称 | 前置研发或初始品项 | 耗材 ID |`，名称与 05 一致，多 ID 用 `、` 分隔，空列填 `—`。依赖整体须可从 C01、I01 解锁。
- 08 的商品等级表在各类连续追加，沿用品类允许的等级档。08 的图标格序与首发 `docs/game-design.md` §4/§5.2 历史表保持原样。
- 更新扩展 README、01、07、08 的相关计数，07 记录新增 ID 与实际派生变化。PM 或其文件所有者同步经济准则、素材文档等引用计数。

## 声明研发前置与耗材种类

作物可用较短周期作物加同阶段工坊品，牲畜和鱼可用较短周期的同类品项加 I01，加工与精制至少列各直接生产投入（例如 PT50 还要求 PT49）。优先选择较短周期且可在本节点前明确获得的耗材，长期产能不足一件时保底并输出诊断。最终金币和材料按 [07 §7.4](../../../docs/expansion/07-balance-validation.md#74-研发生成规则) 统一计算。

## 物品图标与设施场景（新 ID 通用）

- 物品图标：96×96 透明 `assets/source/items/overrides/<ID>.png`，在 `assets/source/items/overrides.json` 登记；不改 08「图标格序」。先生成 `game-data.json`，再运行图标导出器（它从 game-data 找追加 ID），产出 `public/wiki/icons/<ID>.webp`。
- 设施场景（C/L/F）：提供 `assets/source/art/scene-<ID>.png`，不改 `SHEETS`；缺失时完整导出会报错。产出 `public/art/scene-<ID>.webp`（320×320）。

## 多代理分工（farm-task-dispatch）

| 所有者 | 独占文件 | 成果物 |
| --- | --- | --- |
| 目录所有者（一名） | `docs/expansion/02/03/04/05/06/07/08`、`README.md`、`01` 计数文字、`scripts/catalog-rules.mjs`；授权后运行生成器写 `src/content/game-data.json` 与 `src/content/task-coin-caps.json` | 式样行、计数文字、kindCounts、生成结果 |
| 素材所有者（每类一名） | 对应美术 skill 的 `assets/…`、`public/art/…`、`public/ui-icons/…`、视觉登记 JSON；`assets/source/items/overrides*` 与 `public/wiki/icons/` 只设一名图标所有者 | 原图、成品、登记 |
| 审图者 | `docs/art-reviews/<日期>-<主题>.md` | farm-art-review 结论 |
| 视图所有者（按需） | `src/view/research-page.js` 等 | 用途筛选、图标映射 |
| PM | `AGENTS.md`、`docs/economy-guidelines.md`、`docs/feedback-checklist.md`、任务卡 | 整合、最终编译、`npm run art:check` |

顺序：目录所有者冻结 ID／名称／基础周期／配方并生成 → 素材所有者开工（图标与动画可并行，导出在生成后）→ 审图 → 视图接入 → PM 最终编译。

## 通用完成清单

- [ ] 05 追加基础周期与生产投入，06 追加前置与耗材 ID，L/F 同步 02 对象。
- [ ] `kindCounts`、等级、说明表、计数及 07 新增 ID 记录。
- [ ] 生成并检查目录和任务上限。复算用量跨档后的批量、实际周期、含料工时、售价及研发报价。
- [ ] 核对 12 小时门禁、收益排序、同窗、加工增值与研发材料上限。
- [ ] 物品图标、适用的场景与动画、独立审图和未验事项齐备。
