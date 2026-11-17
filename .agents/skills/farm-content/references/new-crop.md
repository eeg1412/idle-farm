# 新作物（C）工作流

共通规则、研发声明、图标与场景、分工见 [SKILL.md](../SKILL.md)。美术细则只看 [farm-crops](../../farm-crops/SKILL.md) 及其 [交付清单](../../farm-crops/references/delivery.md)。

## 0. 输入决定（目录所有者，写进任务卡后冻结）

| 项 | 取值 |
| --- | --- |
| ID | 当前最大 C 编号 +1（现为 C69） |
| 名称 | 不与已有物品重名 |
| 基础周期下界秒 s | 1–43,200 整秒，参照同期品项及 [工时公式](../../../../docs/expansion/07-balance-validation.md) |
| 研发前置／耗材 | 一个基础周期更短的作物 + 一个同时期 I/P，耗材种类同前置 |
| 体型 | `small`/`medium`/`large`（素材所有者登记 `crop-layout.json`） |
| 采收类型 | `wholePlant` 或 `retainedPlant` + 实际采收部分；以审图为准 |
| 农业用途（可选） | 纺织与染料／药草／酿造，或无 |

## 1. 式样（目录所有者）

1. `docs/expansion/05-catalog.md`「## 原料」表，在最后一个 C 行（当前 C68）之后、L01 之前插入：
   `| C69 | <名称> | <s> | — |`
2. `docs/expansion/06-research.md`「## 种子、牲畜与鱼类」表，在 C68 行之后插入：
   `| C69 | <名称> | <作物ID>、<I/P ID> | <耗材ID>、<耗材ID> |`
3. 属于农业用途时在 `08-crop-uses.md` 用途表补作物名；不改「图标格序」。
4. 计数文字：README、08 第 8 行总数、07 §7.1/§7.5 与新增 ID 记录、01「525项」。
5. `scripts/catalog-rules.mjs`：`kindCounts.C` +1。

## 2. 生成（目录所有者，需任务卡授权）

`npm run content:generate`。核对原料周期等于 s，批量与 U 档相符，研发前置及耗材种类与 06 一致。记录对已有产线和任务上限的影响。

## 3. 美术（作物素材所有者，按 farm-crops；在第 2 步之后导出）

- 物品图标：`assets/source/items/overrides/C69.png` + `overrides.json` → 图标导出器 → `public/wiki/icons/C69.webp`。
- 设施场景：`assets/source/art/scene-C69.png`（作物长在地块中）→ `public/art/scene-C69.webp`。
- 四期独立单株 `assets/plot/crops/C69/{sown,seedling,growing,mature}.png` → `public/art/plot/plants/C69/<phase>.webp`；保留植株另交成年 bare。
- 登记（素材所有者独占）：`assets/plot/crop-layout.json` 的 `crops.C69`、`src/content/crop-harvest.json`、由 `scripts/export-crop-animation.mjs` 写出的 `crop-visuals.json` 与 `crop-visuals.runtime.json`（导出器按 game-data 的 `kind: C` 枚举）。
- 新源图才用 imagegen；复用已有单株不重画。

## 4. 审图（farm-art-review）

图标、场景、四期单株源图／成品、bare 配对分别下结论，写入 `docs/art-reviews/`。未通过项不激活，仅有静态图的作物不进发布构建。

## 5. 视图接入（可选）

有农业用途时在 `src/view/research-page.js` 的 `cropUseRanges` 对应用途追加 `['C', 69, 69]`。其余界面按 `game-data.json` 与 `crop-visuals.runtime.json` 自动覆盖。

## 6. PM 收尾

核对实际加载路径（`mode: 'individual'`、四张 webp 尺寸与登记一致）；最终编译与 `npm run art:check`。

## 完成清单

- [ ] 05 周期与配方、06 前置及耗材 ID；02／03／04／08 按品类同步；更新计数。
- [ ] 生成器写出目录及动态任务上限，运行周期和基础批量符合 07，并通过[跨品类周期差校验](../../../../docs/expansion/07-balance-validation.md#新增品项周期差)。
- [ ] 图标 overrides、场景源图、四期单株（+bare）、crop-layout/harvest/visuals/runtime 登记。
- [ ] 审图结论；用途筛选（如需）；差异说明。
