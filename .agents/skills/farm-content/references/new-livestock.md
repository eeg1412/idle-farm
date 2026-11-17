# 新牲畜（L）工作流

共通规则、研发声明、图标与场景、分工见 [SKILL.md](../SKILL.md)。美术细则只看 [farm-livestock](../../farm-livestock/SKILL.md) 及其 [交付清单](../../farm-livestock/references/delivery.md)。一个 L 品项 = 养殖对象（活体，`subject`）+ 仓库产物（蛋／奶／肉，`name`）。

## 0. 输入决定（目录所有者，冻结后下发）

| 项 | 取值 |
| --- | --- |
| ID | 当前最大 L 编号 +1（现为 L11） |
| 对象／产物 | 如「肉用山鸡」／「山鸡肉」；产物名不与已有物品重名 |
| 基础周期下界秒 s | 1–43,200 整秒，参照同期品项及 [工时公式](../../../../docs/expansion/07-balance-validation.md) |
| 肉用 | 是 → 三期、显式 `slaughter: true`；否 → 成年一期 |
| 研发前置／耗材 | 上一档（基础周期更短）牲畜 + `I01`，耗材种类同前置 |

## 1. 式样（目录所有者）

1. `docs/expansion/02-livestock-fish.md`「## 畜牧业」对象表，L10 后追加 `| L11 | <对象> | <产物> |`。
2. `docs/expansion/05-catalog.md`「## 原料」表在 L10 后追加 `| L11 | <产物> | <s> | — |`，产物名与 02 一致。
3. `docs/expansion/06-research.md` 在 L10 后追加 `| L11 | <产物> | <上一档L>、I01 | <上一档L>、I01 |`。
4. 计数文字：02 首段「10 种牲畜」、README、08 第 8 行总数、07 §7.1/§7.5 与新增 ID 记录、01。`kindCounts.L` +1。

## 2. 生成（需授权）

`npm run content:generate`。核对原料周期等于 s，批量与 U 档相符，研发前置及耗材种类与 06 一致。记录对已有产线和任务上限的影响。

## 3. 美术（畜牧素材所有者，按 farm-livestock；在第 2 步之后导出）

- 产物物品图：`assets/source/items/overrides/L11.png` + `overrides.json` → `public/wiki/icons/L11.webp`（仓库与动画共用）。
- 活体选择图 `assets/livestock/icons/L11.png` → `public/ui-icons/livestock-L11.webp`。
- 静态回退：`assets/source/art/scene-L11.png` → `public/art/scene-L11.webp`。
- 进食 idle：`assets/livestock/raw/` 原稿、`feeding-registration-v5.json`、`layout.json`（显式 `slaughter`、阶段、`feeding`、`supportXRange` 等）、逐帧 PNG、`public/art/livestock/animals/L11.webp`；共用饲料图与棚舍复用。
- `npm run art:livestock` 写出 `src/content/livestock-visuals.json` 的 L11 条目，不手写名单。

## 4. 审图（farm-art-review）

产物图、选择图、回退、各期四帧源图与成品、脚印／口部登记分别下结论；动画未通过不进发布构建。

## 5. 视图接入（视图所有者）

`src/view/research-page.js` 的 `livestockArt` 追加 `L11: 'livestock-L11'`，否则研究页显示产物图。其余按 `kind: 'L'` 自动覆盖；任务 `livestockTop`（L10）不改。

## 6. PM 收尾

核对 `livestock-visuals.json` 含 L11、图集高度＝阶段数×320；最终编译与 `npm run art:check`。

## 完成清单

- [ ] 05 周期与配方、06 前置及耗材 ID；02／03／04／08 按品类同步；更新计数。
- [ ] 生成器写出目录及动态任务上限，运行周期和基础批量符合 07。
- [ ] 产物图 overrides、选择图、场景源图、进食 idle、`livestock-visuals.json`。
- [ ] 审图结论；研究页图标映射；差异说明。
