# Codex 项目配置

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 项目级约束、任务入口、验证命令 |
| `.agents/skills/*/SKILL.md` | 仓库内可发现的配方研发与画布工作流 |
| `.codex/config.toml` | 受信任项目的本地配置，继承使用者的模型和审批设置 |
| `.codex/agents/*.toml` | 配方及经济、画布及交互两个可选审查角色 |
| `.codex/rules/project.rules` | 本地命令的沙箱外审批规则，受项目可信状态和执行环境约束 |

技能随仓库交付。自定义角色由拥有多代理能力的 Codex 在需要时调用。托管工作区遵循其本身的审批和沙箱策略。

官方参考：[AGENTS.md](https://developers.openai.com/codex/guides/agents-md)、[Skills](https://developers.openai.com/codex/skills)、[Subagents](https://developers.openai.com/codex/multi-agent)、[Rules](https://developers.openai.com/codex/rules)、[Config basics](https://developers.openai.com/codex/config-basic)。
