# 新鱼类（F）工作流

共通规则、研发声明、图标与场景、分工见 [SKILL.md](../SKILL.md)。美术细则只看 [farm-fish](../../farm-fish/SKILL.md) 及其 [交付清单](../../farm-fish/references/delivery.md)。鱼种与仓库渔获同名。

## 0. 输入决定（目录所有者，冻结后下发）

| 项 | 取值 |
| --- | --- |
| ID | 当前最大 F 编号 +1（现为 F11） |
| 鱼种名 | 不与已有物品重名；对象与产物同名 |
| 基础周期下界秒 s | 1–43,200 整秒，参照同期品项及 [工时公式](../../../../docs/expansion/07-balance-validation.md) |
| 展示 | `habitat`：`river`／`sea`；`size`：`small`(3)/`medium`(2)/`large`(1) |
| 研发前置／耗材 | 上一档（基础周期更短）鱼 + `I01`，耗材种类同前置 |

## 1. 式样（目录所有者）

1. `docs/expansion/02-livestock-fish.md`「## 水产业」对象表，F10 后追加 `| F11 | <鱼种> | <鱼种> |`。
2. 同页「### 鱼池背景分类」把 F11 加到 `river` 或 `sea` 行。
3. `docs/expansion/05-catalog.md`「## 原料」表在 F10 后追加 `| F11 | <鱼种> | <s> | — |`，产物名与 02 一致。
4. `docs/expansion/06-research.md` 在 F10 后追加 `| F11 | <鱼种> | <上一档F>、I01 | <上一档F>、I01 |`。
5. 计数文字：02 首段「10 种鱼」、README、08 第 8 行总数、07 §7.1/§7.5 与新增 ID 记录、01。`kindCounts.F` +1。

## 2. 生成（需授权）

`npm run content:generate`。核对原料周期等于 s，批量与 U 档相符，研发前置及耗材种类与 06 一致。记录对已有产线和任务上限的影响。

## 3. 美术（水产素材所有者，按 farm-fish；在第 2 步之后导出）

- 渔获物品图：`assets/source/items/overrides/F11.png` + `overrides.json` → `public/wiki/icons/F11.webp`。
- 透明活鱼选择图 `assets/fish/icons/F11.png` → `public/ui-icons/fish-F11.webp`。
- 静态回退：`assets/source/art/scene-F11.png`（按 habitat 合成）→ `public/art/scene-F11.webp`。
- 三期 idle：`assets/fish/raw/` 原稿、`assets/fish/layout.json`（`species.F11` 显式 `habitat`、`size`、锚点）、`assets/fish/atlas.json`、`public/art/fish/animals/F11.webp`（1280×960）。
- `npm run art:fish` 写出 `src/content/fish-visuals.json` 的 F11；`fish-habitats.json` 复用现有 river/sea。

## 4. 审图（farm-art-review）

渔获图、选择图、回退、三期四帧源图与成品分别下结论；动画未通过不进发布构建。

## 5. 视图接入

无需改代码：选择、场景、动画、仓库、图鉴、研究页按 `kind: 'F'` 与 `fish-visuals.json` 自动覆盖。任务 `fishTop`（F10）不改。

## 6. PM 收尾

核对 `fish-visuals.json` 与 `assets/fish/layout.json` 一一对应；最终编译与 `npm run art:check`。

## 完成清单

- [ ] 05 周期与配方、06 前置及耗材 ID；02／03／04／08 按品类同步；更新计数。
- [ ] 生成器写出目录及动态任务上限，运行周期和基础批量符合 07。
- [ ] 渔获图 overrides、选择图、场景源图、三期 idle、layout/atlas/fish-visuals。
- [ ] 审图结论；差异说明。
