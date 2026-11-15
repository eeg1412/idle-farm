# 子代理上下文规约

用户明确要求：毫不相干的任务不要重复分配给同一个子代理，保证上下文整洁。

- 负责人：新建 `delegation_rules`，使用 `fork_turns:none`，只交付本规约，不接前面的UI、存档、素材或计时任务。
- 输入：用户上述原话；AGENTS.md子代理要求；farm-task-dispatch技能与任务卡；docs/development.md「无人值守实装」。
- 可写：AGENTS.md的子代理工作流段、.agents/skills/farm-task-dispatch/SKILL.md、其references/task-card.md、docs/development.md的无人值守实装段。其余模块/图片/数据/反馈清单均不改。
- 所有权交接：AGENTS前所有者fish_skill已完成本轮动画条款；PM不再同时修改此文件和development无人值守段。你不是独自在代码库，不得撤销现有内容。
- 输出：跨会话可发现的明确规则。复用仅限同一目标、连续交付物或直接依赖链；相同文件、同种工具、空闲或熟悉项目不单独构成任务相关性。无关任务应新建干净上下文并只传本卡必需输入；槽位紧张时排队/释放旧任务，不以节省代理数串入无关工作。记录agent↔objective↔artifact所有权，转交共享文件必须明确结束旧所有权再开始新所有者。
- 任务卡新增上下文相关性、复用理由／新上下文选择、最小交接字段，不为每个微步骤机械新建代理。
- 权限：仅普通文档读写。无测试、检查、skill验证、预览、编译、Git推送授权。需读skill-creator时只遵相关文字工作流，不运行验证器。
- 交付：具体修改文件、规约措辞与未运行项；PM读取实际段落后整合。
