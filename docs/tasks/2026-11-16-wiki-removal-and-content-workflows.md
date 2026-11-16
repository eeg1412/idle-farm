# 删除配方 Wiki 与新增品项工作流任务卡

- 日期：2026-11-16。PM：主代理，独占本任务卡、`docs/feedback-checklist.md`、`AGENTS.md`、`docs/economy-guidelines.md`。
- 用户原话：“wiki现在没用了，可以完全删除了。这个wiki是早期开发查看物品的。现在已经用不到了。你需要制作一套 新作物 新畜牧 新鱼类 新中间产物 新商品 各自的 workflow。图片生成已经有相关的skill了，会让支持的模型自行生产。”
- 允许：阅读与实现。禁止：测试、冒烟、预览、试编译、语法或运行时检查、生成器以外的脚本。最终编译由 PM 执行。无提交、推送授权。
- PM 决定：删除 Wiki 页面、模板、构建脚本与构建入口；`public/wiki/icons/<ID>.webp` 是游戏运行时的物品图标（525 个），**保留原路径不动**，只是名字带 wiki 的历史遗留。

## 冻结决定（新增品项）

- 新品项在所属类别末尾追加下一个编号；已有 ID、顺序、配方投入、研发前置与耗材种类不变；同步 `scripts/catalog-rules.mjs` 的 `kindCounts`。
- 原料：代际秒 g 可插在已有品种之间（作物 12–300，畜牧与鱼 ≤300），单价与研发由 v4 公式生成；同 g 同价。畜牧生产秒 = 4g；鱼生产秒为 ≤14,400 的正整数，每批 1 件；作物每批 2 件。
- 配方：投入只用已有或同批新增的品项；周期上限 I 600 秒、P 1,800 秒；每批产出 1 件；价格由生成器按类别 m、ω 计算。
- 美术由现有 skill 交付（farm-crops、farm-livestock、farm-fish、farm-art-review）；图片由支持的模型按这些 skill 自行生成。

## 任务

| 任务 / agent | 唯一目标 | 唯一成果物与所有权 | 依赖 | 上下文 |
| --- | --- | --- | --- | --- |
| CAT-01 / wiki_removal | 删除 Wiki 页面与构建链，保留图标 | `wiki/`、`public/wiki/index.html`、`scripts/build-wiki.mjs`、`package.json`、`scripts/build-offline.mjs`、`src/platform/site-service-worker.js`、`README.md`、`docs/architecture.md`、`docs/assets.md`、`docs/development.md`、涉及 Wiki 页面的 `tests/*` | 无 | 新建干净上下文 |
| CAT-02 / content_workflows | 调查五类新增品项的全部接入点，编写五套工作流；列出生成器等阻碍 | `.agents/skills/farm-content/`（SKILL.md 与 references/） | 无 | 新建干净上下文 |
| CAT-03 / catalog_unlock | 放开生成器对目录扩充的阻碍 | 待 CAT-02 报告后指派 | CAT-02 | 待定 |

## 进展

- 任务卡建立；CAT-01、CAT-02 已指派。
- CAT-01 已交付：删除 `public/wiki/index.html`、`wiki/index.template.html`（目录随之消失）、`scripts/build-wiki.mjs`；`package.json` 去掉 `wiki:build`，`build` 为 `vite build && node scripts/build-offline.mjs`；build-offline 预缓存过滤去掉 wiki 页面条件（清单不变）；service worker 无需改；offline-navigation 测试去掉 wiki 导航 URL；README、architecture、assets、development 去掉 Wiki 页面说明并注明图标目录名为历史名称。图标 525 个与全部引用保留；游戏内无 Wiki 入口。追加所有权：`docs/verification.md`、`docs/cloudflare.md`、`docs/game-design.md` 909 行。PM 已改 `AGENTS.md` Wiki 条（改为图标目录说明）与准则 E-25 豁免（删“画布外的配方 Wiki”）。
- CAT-01 追加已交付：verification.md 去掉 Wiki 构建与翻页检查，保留“预缓存无 PNG/WebP、游戏内图标按需加载”；cloudflare.md 改为实际构建链并注明素材检查需另行运行；game-design.md 909 行去掉 Wiki。`feedback-checklist.md` 中的 Wiki 记录属历史，保留。CAT-01 所有权交回 PM，任务结束。
- CAT-02 已交付：`.agents/skills/farm-content/SKILL.md`（入口、冻结规则、g 选取、研发前置声明、分工与检查表）及 `references/new-crop|new-livestock|new-fish|new-intermediate|new-product.md`。阻碍 B1–B5：preserveStructure 计数相等、summarize 读快照价、PL/PF/PD/PT 等级随 kindCounts 漂移、图标导出写死 525、场景导出写死清单；另 `generate-game-data.mjs:163` 对新配方比对 1.14 表价。运行时代码全部读数据，无需改。所有权交回 PM（待 CAT-03 后续作）。
- PM 裁定：在类别末尾追加且已有品项逐字节不变时不递增 `balanceVersion`，只在 07 记录新增 ID（已写入准则 E-29）。`AGENTS.md` 加 farm-content 工作流入口。
- CAT-03 / catalog_unlock 已指派（新建干净上下文）：B1–B5 与 163 行；所有权 `scripts/long-term-balance.mjs`、`generate-game-data.mjs`、`catalog-rules.mjs`、`export-item-icons.py`、`export-facility-scenes.py`、`docs/expansion/08-crop-uses.md` 等级表格式、`game-data.json`（仅经生成器）；须重新生成并确认 game-data 无变化。
- CAT-03 已交付：B1 preserveStructure 去计数相等、新 ID 须编号高于快照且有研发节点；B2 汇总新增 `added`；B3 PL/PF/PD/PT 冻结原长度，追加等级读 08 显式表（P/PL/PF 1…28、PD 2…29、PT 3…30）；B4 图标导出追加 ID 走 overrides；B5 场景导出按 game-data 补 `scene-<ID>.png`；新 ID 可在 05/02 售价列写 `—`，不比对 1.14 表价。运行生成器一次，`game-data.json` 无变化。Python 导出器未运行。所有权交回 PM。CAT-02 续作更新工作流。
- CAT-02 续作已交付：去掉全部阻碍说明；新行售价写 `—`；新 ID 必须有 06 研发行（金币与数量列写占位 10/1，由生成器覆盖）；追加商品等级表；图标走 overrides、先生成再导出；场景源图 `scene-<ID>.png`；旧品项不得用新品项作投入；追加不递增版本号；每套工作流含更新各处数量文字一步。所有权交回 PM。
- PM 最终 `npm run build` 退出码 0；`dist/wiki/` 只剩 icons。未运行测试、导出器或检查。任务结束；未提交、未推送。
