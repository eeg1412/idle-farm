# Codex 项目配置

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 项目级约束、任务入口、验证命令 |
| `.agents/skills/*/SKILL.md` | 仓库内可发现的任务指派、配方研发、画布、作物与畜牧资源工作流 |
| `.codex/config.toml` | 受信任项目的本地配置，继承使用者的模型和审批设置 |
| `.codex/agents/*.toml` | 配方及经济、画布及交互两个可选审查角色 |
| `.codex/rules/project.rules` | 本地命令的沙箱外审批规则，受项目可信状态和执行环境约束 |

技能随仓库交付。自定义角色由拥有多代理能力的 Codex 在需要时调用。托管工作区遵循其本身的审批和沙箱策略。

- 项目任务指派、拆分与交接：使用 [farm-task-dispatch](../.agents/skills/farm-task-dispatch/SKILL.md) 与[任务卡](../.agents/skills/farm-task-dispatch/references/task-card.md)。主代理作为项目经理维护需求、输入摘要、互斥所有权与接口依赖，提供每个任务的最少资料和相关规约摘录，具体实现交给文件所有者子代理；子代理只交付指定输出，避免全体重复了解项目。只有一个不可再分的输出时，仍使用一张任务卡和单一所有者，不为凑数强拆。项目经理负责实际接入、汇总和最终编译，具体约束见[无人值守实装](development.md#无人值守实装)。
- 新增或改画作物、田地动画：使用 [farm-crops](../.agents/skills/farm-crops/SKILL.md)，按清单交付物品图标、独立场景、四期单株和图集，并保留 C01 小麦例外。
- 新增或改画牲畜、养殖选择图、畜牧动画：使用 [farm-livestock](../.agents/skills/farm-livestock/SKILL.md)，分别交付活牲畜选择图、仓库产出图和动画产品，覆盖完整阶段、图集与同 ID 回退。
- 生成素材是否合格：使用 [farm-art-review](../.agents/skills/farm-art-review/SKILL.md)，按任务规格与已认可参考审阅图片，不合格按退回单交素材所有者重画，并保留修订复查与缺证据项。

仓库技能位于 `.agents/skills/`，通过各自 `SKILL.md` 的名称和描述参与正常发现；任务指派模板为 `farm-task-dispatch/references/task-card.md`，作物及畜牧的详细资源清单在对应 `references/delivery.md`。不额外添加 UI YAML 或显式调用限制。创建技能不授予运行验证脚本的权限，项目禁止未授权的测试、冒烟、预览、试编译、语法或运行时检查等验证；全部资源、资料与模块完成后仅由项目经理执行最终构建。

AI 必须遵守 `AGENTS.md` 与[开发规范](development.md#github-推送授权)中的推送约束：只有用户针对当前推送明确下达指示时才能向 GitHub 或其他远端推送，过去任务的许可不延续。命令规则中的提示是额外拦截，不能代替授权；`git -c ... push`、其他工具和脚本同样受此约束。

开发专用的设置标题连点入口及正式构建排除规则见[开发测试模式](development.md#开发测试模式)。该入口的实现不授权 AI 运行测试、预览或推送。

官方参考：[AGENTS.md](https://developers.openai.com/codex/guides/agents-md)、[Skills](https://developers.openai.com/codex/skills)、[Subagents](https://developers.openai.com/codex/multi-agent)、[Rules](https://developers.openai.com/codex/rules)、[Config basics](https://developers.openai.com/codex/config-basic)。
