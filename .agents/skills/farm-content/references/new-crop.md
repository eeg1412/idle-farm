# 新作物（C）工作流

共通规则、选 g、研发声明、图标与场景、分工见 [SKILL.md](../SKILL.md)。美术细则只看 [farm-crops](../../farm-crops/SKILL.md) 及其 [交付清单](../../farm-crops/references/delivery.md)。

## 0. 输入决定（目录所有者，写进任务卡后冻结）

| 项 | 取值 |
| --- | --- |
| ID | 当前最大 C 编号 +1（现为 C69） |
| 名称 | 不与已有物品重名 |
| g | 12–300 正整数，按 SKILL.md「选 g」定时期 |
| 产量 | 固定 `2`；生产秒 = g |
| 研发前置／耗材 | 一个更低 g 的作物 + 一个同时期 I/P，耗材种类同前置 |
| 体型 | `small`/`medium`/`large`（素材所有者登记 `crop-layout.json`） |
| 采收类型 | `wholePlant` 或 `retainedPlant` + 实际采收部分；以审图为准 |
| 农业用途（可选） | 纺织与染料／药草／酿造，或无 |

## 1. 式样（目录所有者）

1. `docs/expansion/05-catalog.md`「## 原料」表，在最后一个 C 行（当前 C68）之后、L01 之前插入：
   `| C69 | <名称> | <g> | 2 | — | — |`
2. `docs/expansion/06-research.md`「## 种子、牲畜与鱼类」表，在 C68 行之后插入：
   `| C69 | <名称> | <作物ID>、<I/P ID> | 10 | 1×<作物ID> + 1×<I/P ID> |`
   前置作物 g < 本作物 g；前置配方的 e 不高于本作物 u。
3. 属于农业用途时在 `08-crop-uses.md` 用途表补作物名；不改「图标格序」。
4. 计数文字：README、08 第 8 行总数、07 §7.1/§7.5 与新增 ID 记录、01「525项」。
5. `scripts/catalog-rules.mjs`：`kindCounts.C` +1。

## 2. 生成（目录所有者，需任务卡授权）

`npm run content:generate`，不加 `--check`。记录 C69 的 price 与 research；核对摘要 `priceOrderViolations` 为空、`cappedNodes` 未新增已有 ID。

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

- [ ] 05 行（价格 `—`）、06 行、kindCounts、计数文字与 07 记录；08 不改图标格序。
- [ ] 生成器写出 `game-data.json`：产量 2，durationMs = g×1000。
- [ ] 图标 overrides、场景源图、四期单株（+bare）、crop-layout/harvest/visuals/runtime 登记。
- [ ] 审图结论；用途筛选（如需）；差异说明。
