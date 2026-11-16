---
name: farm-content
description: 新增或修改《放置农场》的作物、牲畜、鱼类、中间产物、商品，或调整配方、研发前置、目录式样时使用。给出五类新增品项的端到端工作流（式样→生成→美术→审图→接入），并检查材料来源、研发依赖和所有权。
---

# 目录内容与新增品项

路径均以仓库根目录为准。先读 `AGENTS.md`；改数值前读 `docs/economy-guidelines.md`（至少 E-04、E-06、E-12～E-14、E-25、E-26、E-28、E-29）。冲突时以 `AGENTS.md` 和正式式样为准，并在差异说明中列出。

## 选择工作流

| 要新增的品项 | 类别 ID | 工作流 | 美术 skill |
| --- | --- | --- | --- |
| 作物 | `C` | [new-crop.md](references/new-crop.md) | farm-crops → farm-art-review |
| 牲畜（含其仓库产物） | `L` | [new-livestock.md](references/new-livestock.md) | farm-livestock → farm-art-review |
| 鱼类（渔获与鱼同名） | `F` | [new-fish.md](references/new-fish.md) | farm-fish → farm-art-review |
| 中间产物 | `I` 农业／`IL` 畜牧／`IF` 水产 | [new-intermediate.md](references/new-intermediate.md) | 物品图标（`docs/assets.md`）→ farm-art-review |
| 商品 | `P`／`PL`／`PF`／`PD`／`PT` | [new-product.md](references/new-product.md) | 物品图标（`docs/assets.md`）→ farm-art-review |

一次新增多类（如新鱼 + 鱼汁 + 鱼汁商品）时按依赖顺序串联：原料 → 中间产物 → 商品。式样与生成只开一次，由同一个目录所有者一次写完全部行再生成。

只改已有品项不属于新增：已有 ID 的生产输入／数量、代际秒、配方周期与产量、来源、等级、研发前置和耗材种类均冻结（E-26），需用户逐项授权；价格与研发数量只能改 07 公式或锚点后重新生成，不手调单项。

生成管线接受只追加的新增：快照内品项保持逐字节不变，新 ID 按下列规则追加即可生成。

## 冻结规则（五个工作流共用）

1. **只追加**：新 ID 在所属类别末尾取下一个编号（如 C69、L11、F11、I128、IL11、IF11、P181、PL21、PF21、PD21、PT51）。不改、不重用、不重排已有 ID；已有配方投入、研发前置与耗材种类不变，**快照内已有品项永不以新增品项为配方投入**。同步 `scripts/catalog-rules.mjs` 的 `kindCounts`。
2. **先式样后数据**（E-28）：①写 `docs/expansion/` 式样行 → ②改 `kindCounts` → ③由生成器写 `src/content/game-data.json` → ④美术导出与视图接入。禁止手改 `game-data.json`；运行价格、研发金币与材料数量只来自生成器。
3. **原料**：代际秒 g（05「基础秒数」＝02「耗时」）可插在已有品种之间：作物 12–300、畜牧与鱼 ≤300，正整数。作物生产秒 t=g、每批 2 件；畜牧 t=4g，每批件数沿用表列（现有 1–4）；鱼 t 为 ≤14,400 的正整数、每批 1 件。同 g 同价。
4. **配方**：投入只用已有或同批新增的品项；周期 I/IL/IF ≤600 秒、P 类 ≤1,800 秒，正整数；每批产出 1 件。价格由生成器按类别 m、ω 计算（必然 ≥1.2V，E-06）。
5. **研发**：**每个新 ID 必须在 06 有一行**，缺行生成器拒绝；前置包含全部耗材与配方投入；金币与数量由 07 §7.4 按代际值 e 生成（见「声明研发」）。7.8 覆盖表只保留 P01。
6. **美术**由现有 skill 交付，图片由支持的模型按 skill 自行生成；本 skill 不重复美术细则。牧场／工坊动画区域禁止新增回退（AGENTS.md）：动画资源未齐时该品项不进发布构建。
7. **配方 Wiki 已删除**：不写 Wiki 步骤。`public/wiki/icons/<ID>.webp` 是运行时物品图标路径（历史名称），新品项照常交付到这里。
8. **版本**（E-29，PM 决定）：只追加且已有值逐字节不变时不递增 `balanceVersion`；在 07 记录新增 ID。
9. **验证授权**：未获用户明确授权不跑测试、预览、`--check`、`npm run art:check`、`npm run check` 或试编译。运行 `npm run content:generate` 与美术导出须任务卡授权；全部交齐后只由 PM 执行最终编译（含 `npm run art:check`）。不提交、不推送，除非用户针对当前操作明确指示。

## 式样行的写法

- `docs/expansion/05-catalog.md` 是生成器读取的物品总表，6 列：`| ID | 名称 | 基础秒数 | 每批产出 | 基准单价 | 每批投入 |`。新 ID 的「基准单价」写 `—`（无 1.14 旧价）；投入写 `N×ID + N×ID`，原料写 `—`。行追加在对应类别表最后一行之后。
- L/F 另有 02 养殖表 7 列，与 05 同行逐字一致（名称＝产物、耗时、产量、售价 `—`）。
- `docs/expansion/06-research.md` 5 列：`| ID | 名称 | 前置研发或初始品项 | 金币 | 所需实物 |`。名称与 05 相同；金币与实物数量填正整数占位（建议金币 `10`、每种 `1`），生成器会覆盖；**实物种类**才是有效输入。
- 02 的 IL/IF 表、03、04、08 的说明表不被生成器读取，但须同步。
- 不在 `docs/game-design.md` §4 追加（1.14 旧 300 项，`compile-content.mjs` 断言数量）。
- **计数文字（目录所有者必做步骤）**：`docs/expansion/README.md` 总数与分类计数、`08-crop-uses.md` 第 8 行「总目录增加至 525 项…523 项需研发」、`07-balance-validation.md` §7.1／§7.5 的「525/437/523」及新增 ID 记录、`01-operations.md` 品质段「525项」。`docs/economy-guidelines.md`、`docs/assets.md` 的计数交 PM／其所有者。

## 选 g：让原料落在目标时期

原料代际值 `u = σ×5×g²×(g+127) / 20,016,000`，σ：C=1000、L=1050、F=1150（07 §7.2）。u 即研发的 e；生成价 `price = ceilDiv(σ×5×g²×(g+127)×t, 20,016,000×out)`。

| 作物 g | 12 | 16 | 30 | 52 | 65 | 100 | 120 | 150 | 166 | 180 | 200 | 250 | 300 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| u（C） | 5.0 | 9.1 | 35 | 121 | ≈200 | 567 | 888 | 1,557 | ≈2,000 | 2,485 | 3,267 | 5,886 | 9,600 |

L 乘 1.05、F 乘 1.15。7.7 锚点把时期分为：e 5–9 入门（材料时限 300 秒）、9–200 早期（作物 g≈16–65）、200–2,000 中期（g≈65–166，时限升到 1,200 秒）、2,000–9,600 后期（g≈166–300，时限 14,400 秒）。

在 05 原料表找插入位置的前后邻居，取二者 g 之间的值；同 g 即同价同研发价（E-04 允许并列）。畜牧与鱼的 g 上限 300 等于 L10／F10，只能插入或并列。生产秒 t 只决定一批多久，不改每秒收益。

配方 e = φ × 上游最高原料 u（φ：I 类 1.1、P/PL/PF 1.25、PD 1.5、PT 2.0）。选投入就是选时期；周期只影响价格中的工时项。

## 声明研发前置与耗材种类

新节点的 `requires` 与耗材**种类**直接取自 06 行，数量由生成器算。

1. `前置 ⊇ 耗材种类 ∪ 配方投入`；不含自身；整体须能从 `C01、I01` 逐步解锁。
2. 沿用惯例：作物＝一个更低 g 的作物 + 一个同时期 I/P（如 `C68：C06、I105`）；牲畜＝上一档牲畜 + `I01`；鱼＝上一档鱼 + `I01`；配方＝全部投入（可加一个同线前序项，如 PT50 要求 PT49）。
3. **防倒挂与封顶**（E-12）：前置项的 e 不得高于新节点；前置中的**已有配方**若 e 更高，生成器会把它的研发总价封顶到新节点，**改变已有项数值**（违反逐字节不变）。只选 e ≤ 新节点 e 的配方作前置。
4. 耗材 1–2 种（配方通常＝投入种类），优先生产周期短、早于本节点的品项。

## 物品图标与设施场景（新 ID 通用）

- 物品图标：96×96 透明 `assets/source/items/overrides/<ID>.png`，在 `assets/source/items/overrides.json` 登记；不改 08「图标格序」。先生成 `game-data.json`，再运行图标导出器（它从 game-data 找追加 ID），产出 `public/wiki/icons/<ID>.webp`。
- 设施场景（C/L/F）：提供 `assets/source/art/scene-<ID>.png`，不改 `SHEETS`；缺失时完整导出会报错。产出 `public/art/scene-<ID>.webp`（320×320）。

## 多代理分工（farm-task-dispatch）

| 所有者 | 独占文件 | 成果物 |
| --- | --- | --- |
| 目录所有者（一名） | `docs/expansion/02/03/04/05/06/07/08`、`README.md`、`01` 计数文字、`scripts/catalog-rules.mjs`；授权后运行生成器写 `src/content/game-data.json` | 式样行、计数文字、kindCounts、生成结果 |
| 素材所有者（每类一名） | 对应美术 skill 的 `assets/…`、`public/art/…`、`public/ui-icons/…`、视觉登记 JSON；`assets/source/items/overrides*` 与 `public/wiki/icons/` 只设一名图标所有者 | 原图、成品、登记 |
| 审图者 | `docs/art-reviews/<日期>-<主题>.md` | farm-art-review 结论 |
| 视图所有者（按需） | `src/view/research-page.js` 等 | 用途筛选、图标映射 |
| PM | `AGENTS.md`、`docs/economy-guidelines.md`、`docs/feedback-checklist.md`、任务卡 | 整合、最终编译、`npm run art:check` |

顺序：目录所有者冻结 ID／名称／g／配方并生成 → 素材所有者开工（图标与动画可并行，导出在生成后）→ 审图 → 视图接入 → PM 最终编译。

## 通用完成清单

- [ ] 05（及 L/F 的 02 养殖表）新增行，价格列 `—`；06 每个新 ID 一行，前置覆盖耗材与投入，前置 e 不高于本项。
- [ ] `kindCounts`；新增商品等级登记在 08；说明表、计数文字、07 新增 ID 记录。
- [ ] `game-data.json` 只由生成器写出；快照内品项逐字节不变，摘要 `cappedNodes` 未新增已有 ID。
- [ ] 物品图标 overrides 源图与登记、`public/wiki/icons/<ID>.webp`；C/L/F 另交场景源图与美术 skill 资源。
- [ ] farm-art-review 结论（源图、成品分开）；缺证据记待复查。
- [ ] 差异说明：与准则冲突、未运行的验证。
