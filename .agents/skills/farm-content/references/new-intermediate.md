# 新中间产物（I / IL / IF）工作流

共通规则、研发声明、图标、分工见 [SKILL.md](../SKILL.md)。只有物品图标一项美术；规格见 `docs/assets.md`「物品图标」，验收用 [farm-art-review](../../farm-art-review/SKILL.md)。

## 0. 输入决定（目录所有者，冻结后下发）

| 项 | 规则 |
| --- | --- |
| 类别 | `I` 农业／`IL` 畜牧／`IF` 水产 |
| ID | 该类别最大编号 +1（现为 I128、IL11、IF11） |
| 名称 | 不与已有物品重名；粉、浆、切料、冻坯、面团或敞口备料容器 |
| 投入 | 只用**同一行业**的原料或更早编号的同类中间产物：I ← C、I；IL ← L、IL；IF ← F、IF。可用同批新增项 |
| 基础周期下界秒 s | 1–43,200 整秒，参照同期品项及 [工时公式](../../../../docs/expansion/07-balance-validation.md) |
| 研发前置／耗材 | 前置 = 全部投入（可加一个同线前序项）；耗材种类通常 = 投入 |

投入组合不要与已有配方完全相同。已有品项不得改用本项作投入。

05 填周期下界 s。生成器用供料、直接上游周期与同窗要求解最短实际周期，最长 43,200 秒。

## 1. 式样（目录所有者）

1. `docs/expansion/05-catalog.md`「## 中间产物」表，在该类别末行后追加（I127／IL10／IF10 之后）：
   `| <ID> | <名称> | <s> | <N×ID + N×ID> |`
2. 说明表：IL → `02-livestock-fish.md`「## 畜牧中间产物」，IF →「## 水产中间产物」（`| ID | 名称 | 输入 |`）；农业用途的 I 同步 `08-crop-uses.md` 用途说明。
3. `docs/expansion/06-research.md`「## 加工配方」同类末行后追加：
   `| <ID> | <名称> | <投入ID、…> | <耗材ID、…> |`
4. `kindCounts` 对应类别 +1；计数文字（README、08 第 8 行、07 §7.1/§7.5 与新增 ID 记录、01）。

## 2. 生成（需授权）

`npm run content:generate`。核对：`sources` 为单一行业，两项价格下限符合 E-06，实际周期与吞吐符合 E-31，研发 costs 种类与 06 一致，且最终报价符合 E-12、E-14。

## 3. 图标（物品图标所有者，唯一；在第 2 步之后导出）

- imagegen 按透明网格绘制（同批多件可同网格，遵守 `docs/assets.md` 占格与透明带规则），原稿与提示词存 `assets/source/items/raw/`、`prompts.md`。
- 单件裁成 96×96 透明 `assets/source/items/overrides/<ID>.png`，登记 `overrides.json`；运行图标导出器产出 `public/wiki/icons/<ID>.webp`。不改 08 图标格序。
- 工坊产线动画加载投入与产物图，缺图时区域保持空（禁止回退），图标未交付前不发布该配方。

## 4. 审图（farm-art-review）

按「物品」用途在 96px 与放大视图审：形态正确、无包装、与名称一致、透明边缘干净。

## 5. 视图接入（可选）

农业用途 I 在 `src/view/research-page.js` 的 `cropUseRanges` 追加 `['I', <n>, <n>]`。其余按 `game-data.json` 自动覆盖。

## 完成清单

- [ ] 05 周期与配方、06 前置及耗材 ID；02／03／04／08 按品类同步；更新计数。
- [ ] kindCounts；计数文字与 07 记录；生成器写出 `game-data.json`。
- [ ] 通过[跨品类周期差校验](../../../../docs/expansion/07-balance-validation.md#新增品项周期差)，按 07 §7.3 核对 E-06、E-31，按 07 §7.4 核对 E-12、E-14。
- [ ] 图标源图、overrides 登记、`public/wiki/icons/<ID>.webp`；审图结论。
- [ ] 用途筛选（如需）；差异说明。
