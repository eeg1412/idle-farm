# 料坊与工房术语统一

## 用户确认的需求

- 建筑「加工」改名「料坊」，「精制」改名「工房」。「工坊」不再作为玩家可见的词；凡指其中一座的文字写明具体建筑。

| 项目 | 料坊（原加工） | 工房（原精制） |
|---|---|---|
| 建筑和页面 | 料坊 | 工房 |
| 工位 | 料坊位 | 工房位 |
| 管理员 | 料坊管理员 | 工房管理员 |
| 动作 | 加工 | 制作 |

- 同时涉及两座：科技「工坊提速」→「料坊工房提速」，效果「料坊加工与工房制作速度加成」；出售庄园「工坊重置」→「料坊与工房重置」，内容「重置为料坊位、工房位各 1 个」；任务「工坊配方集」→「工房配方集」；行脚商条件「庄园、工坊加工共出产…」→「庄园、料坊、工房共出产…」，「庄园产物和工坊加工品」→「庄园、料坊与工房的产物」。
- 物品名（如「精制煤粉」）、作为普通动词的「加工」「制作」、内部 ID（路由 slug `workshop`/`processing`/`refining`、`I`/`P`、存档字段、科技 key、任务 ID）不改。
- 长期正文直接改为新术语；历史记录（旧任务卡、`docs/reviews/`、`docs/art-reviews/`、反馈清单旧条目）正文不动，文件开头加一行备注。老玩家不做提示。

## 冻结接口

- 代码内的中文页面名（`navigation.js` routes 的页签键、`ui.go(…, { tab })`、`pageForRoute` 返回值、`managerTaskGuide` 的 `page` 参数、管理员岗位页面映射等）由「加工」「精制」改为「料坊」「工房」。路由分组键「工坊」为内部键，保留；URL 不变。
- 历史文档备注原文：`> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。`

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| RN-1 界面与规则文案 | 子代理 terms-ui（新上下文） | `src/` 下除 RN-2 文件外所有含旧术语的文件（`game/advancement.js`、`game/objectives.js`、`game/tasks.js`、`main.js`、`platform/production-ambience-state.js`、`content/page-bgm.js`、`view/canvas-ui.js`、`view/estate-map.js`、`view/farm.js`、`view/management-pages.js`、`view/management-records.js`、`view/manager-page.js`、`view/merchant-page.js`、`view/navigation.js`、`view/order-page.js`、`view/production-pages.js`、`view/research-page.js`）；`src/content/game-data.json` 只在含玩家可见建筑名时改 | 页面名、标签、工位、科技、任务、按钮 |
| RN-2 台词与指导 | 子代理 terms-dialogue（新上下文） | `src/view/manager-dialogue.js`、`src/view/manager-help.js`、`src/view/manager-help-text.js`、`src/view/onboarding-text.js` | 管理员职称、台词、指导、新手讲解 |
| RN-3 长期文档 | 子代理 terms-docs（新上下文） | `AGENTS.md`、`README.md`、`docs/` 下长期正文（`game-design.md`、`ui.md`、`ui/`、`expansion/`、`economy-guidelines.md`、`development.md`、`architecture.md`、`performance.md`、`verification.md`、`assets.md`、`audio/`、`npc-personalities.md` 等） | 新术语正文 |
| RN-4 历史备注 | 子代理 terms-history（新上下文） | `docs/tasks/`（本卡除外）、`docs/reviews/`、`docs/art-reviews/`、`docs/feedback-checklist.md`、`docs/ui-references/` 等历史记录 | 文件开头备注；反馈清单新增本条记录 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- RN-1～RN-4 已完成。科技「X精制专精」定为「X制作专精」，代码与长期正文一致；「加工保留量」「X加工提速」为动作用法，保留。
- 测试文件（`tests/canvas-input-regressions.test.js`、`tests/manager-guidance.test.js`、`tests/view-pages-regressions.test.js`）仍按旧页面名、科技名、工位名断言，未修改。
- 未验证：未运行测试，画面未实看。
