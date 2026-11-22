# 清理未加载的发布图片与审图证据不入库

PM：主代理。两张卡顺序执行（共享 `docs/assets.md`、`docs/development.md`）：CL-1 交付并释放后 EV-1 开始。均新建干净上下文。未授权测试、预览、提交或推送；最终编译由 PM 执行。

## CL-1 删除随站点发布但游戏不会加载的图片

用户原话：删除「可以删除：随站点一起发布、但游戏不会加载的图片」。

| 文件 | 依据 |
| --- | --- |
| `public/art/plot/crops/` 中 C02–C68 的 `<ID>.webp` 与 `<ID>-front.webp`（134 个） | 运行仅 C01 加载整田图集（`canvas-ui.js` loadPlotTextures）；`build-offline.mjs` 已在 dist 中剔除；文档写明旧整田图集仅为历史 |
| `public/art/workshop/` 下除 `front/` 以外的 17 个文件 | 现行工坊动画只读 `front/`（`workshop-visuals.json`） |
| `public/ui-icons/plot-C02`～`plot-C50`、`plot-generic`、`nav-fields`、`nav-ranch`、`nav-management` | 源码无引用 |
| `public/art/livestock/feed.webp` | 现行为 `feed-v8.webp` |

- 保留 C01 的 `C01.webp`、`C01-front.webp`（素材检查与运行都需要）。
- 同步：`scripts/export-ui-icons.py` 的生成清单去掉已删图标；必要时 `build-offline.mjs` 的整田剔除逻辑可保留（对已不存在的文件无影响）；`docs/assets.md`、`docs/development.md` 等现行文档中指向这些已删发布文件的句子改为“已从发布目录移除，源图仍在 assets/”。历史记录目录不改。
- `assets/` 源图一律不删。

## EV-1 审图证据图片只留本地，不进 GitHub

用户原话：项目里有让图片审查 AI 审查图片留下证据的设定。修改相关文档，每次 AI 审查可以生成证据图片，但是不要留在 GitHub 里。用户选择：已提交的证据图从仓库移除（`git rm --cached`），本地保留；不改写历史。

- 证据图：审图／导出脚本生成的合成图、分镜、关键帧、对照图等，位于 `assets/plot/reviews/`、`assets/livestock/reviews/`、`assets/livestock/*evidence*/`、`assets/fish/reviews/`、`assets/workshop/reviews/`、`assets/mining/reviews/`、`assets/mining/keyframes/`、`assets/source/art/*review*/` 等。只处理图片文件（png／webp／jpg）；同目录的 json／md／mjs 等文字记录与脚本继续入库。
- 不得误伤正式素材：源图、发布图、导出用 PNG、登记表引用的非证据图片一律保留入库；有疑问的文件列出交 PM。
- `.gitignore` 增加证据图规则；`git rm --cached` 移除已入库证据图（不 commit）。
- 文档：`.agents/skills/farm-art-review/`（SKILL 与 references）、作物／畜牧／鱼类技能中关于证据留存的句子、`docs/development.md`、`docs/assets.md` 相关句子改为：证据图在本地生成供审阅，不提交；`docs/art-reviews/` 报告与 json 证据清单照常提交，记录证据图本地路径与 sha256，并注明仅本地保存。AGENTS.md 由 PM 同步。

## CL-3 删除当前用不到的废弃配置与旧脚本（EV-1 释放文档后开始）

用户原话：`src/content/workshop-effects.json`、`assets/workshop/` 下的旧导出脚本、读取已删除 `feed.webp` 的旧审图脚本，如果当前用不到的话都删了。

| 文件 | 依据 |
| --- | --- |
| `src/content/workshop-effects.json` | 运行时无引用；现行效果参数在 `workshop-visuals.json` 的 `effects`；所指图片已删 |
| `assets/workshop/export-v2.mjs`、`export-portless-v5.mjs`、`export-wood-v6.mjs`、`export-chimney-smoke-v1.mjs` | 只写出已删除的旧发布图；现行 `public/art/workshop/front/` 不由这些脚本生成 |
| `assets/workshop/compose-portless-v5.mjs`、`compose-review-v2.mjs` | 旧 v2／v5 审图合成脚本，同类用不到 |
| `assets/livestock/reviews/choice-feed/make-review-contacts.mjs` | 旧审图脚本，读取已删除的 `feed.webp` |

- 原画、提示词、登记 json、`HANDOFF*.md` 历史记录保留。
- 同步 `docs/assets.md`（约 126、130–132 行）、`docs/development.md`（约 108 行）中把这些文件当作现行入口或配置的句子。复用 public_cleanup（CL-1／CL-2 的连续清理任务）。
