# 角色卡片回复时顶部气泡消失

## 任务与输入

- 用户原话：角色管理页面有别的角色弹出气泡时，顶部管理员气泡消失，要求修复。截图为顶部只剩背景与人物／按钮、列表卡片显示感谢。
- 任务 MC-1，文件所有者 `npc_bubble_coexist`，PM `/root`。新建干净上下文：这是双会话显隐问题，不因和旧字号任务使用相同文件而复用作者。
- agent↔objective↔artifact：该代理↔两处气泡同时可见↔`src/view/canvas-ui.js` 的 managerBanner 及卡片交接局部、`docs/ui.md` 的对应管理员规则。PM独占本任务卡和反馈清单。
- 你不是独自在代码库工作，不得覆盖或撤销他人改动；仅修改指定行为，需要扩展先报PM。
- 最少读取：本任务卡、canvas-ui.js 的 managerBanner／managerReply／pauseManagerSpeech／ticker 局部、docs/ui.md 管理员规则；manager-speech.js 的 pause／offer／update 仅用于核对进度。
- 已确认根因：managerBanner 在 `!receive && current === '角色管理' && local.managerReplyRole` 时计算 suppressed，隐藏 bubble／caption／命中并跳过顶部挂载。卡片普通回复接管 managerSpeech；顶部催领时卡片走 managerCardSpeech 独立路径，已有并存行为。

## 行为边界

| 触发入口 | 条件 | 允许改变 | 必须保留 | 交付证据 |
| --- | --- | --- | --- | --- |
| 列表成功送礼后的卡片感谢 | 角色管理页、普通顶部对白 | 卡片回复不再隐藏顶部气泡、文字及原有操作；顶部保持已显示内容 | 原播放次序／音效归属、顶部已选句和打字进度，卡片结束后顶部接续 | 截图、实际显隐和交接源码diff |
| 顶部有可领回礼时触发卡片感谢 | urgent 分支 | 保持现有并存 | 顶部催领优先、卡片独立逐字／停留、不抢顶部会话 | 现有分支与ticker未变 |
| 同岗位顶部与列表卡、跨岗位列表送礼 | 独立会话来源 | 保持两处内容／表情独立 | role:card 键、旧卡片释放、资料恢复、卡片不点击换句、顶部点击规则 | 现有conversationFor与release路径 |
| 滚动／后台／菜单／Dialog | 原有真实可见性和暂停门禁 | 保留 | 不因本次修复新增Dialog暂停，不越界显示离屏气泡；原字号高度修复、按钮位置不改 | 实际diff |

## 方法与完成

- 仅解除“有卡片回复就隐藏顶部”的显示联动；对失效 managerReplyRole 的清理须保留，不以删除整段而留下旧角色引用。
- 顶部 bubble、caption 与 hit 不再受卡片回复控制，顶部 mount 正常保留。整理不再使用的 suppressed／setSuppressed 节点跟踪，不引入永久为false的开关充当修复。
- 保留原普通卡片接管播放／卡片结束恢复顶部的流程。注意：原 suppressed 的 observe 会调用顶部 speech.pause()；去掉隐藏后，需要在卡片接管前明确暂停顶部的计时锚点，以保留已显示进度。否则恢复后的 elapsed 会包含整段卡片回复，造成文字瞬间跳完。不得通过重新offer不同句子或清空glyph进度解决。
- 顶部催领与 managerCardSpeech 现有独立更新路径不变；不额外创建音频实例或逐帧重建节点。显示改变有意修复，队列语义／时序与原相邻行为保留。
- docs/ui.md 用简短确定表述记录两处气泡同时可见、普通顶部保留进度及卡片结束后接续；不展开全局对白规范。
- 完成后报告实际文件、交接与显隐路径、未验证项并结束所有权；PM阅读真实diff，核对截图对应入口与相邻分支。
- 本轮验证授权：无。禁止测试、冒烟、预览、语法／运行时检查、试编译、最终编译，不执行farm-canvas的检查命令。普通读写和人工源文审阅允许。无推送授权。

## 交付

MC-1 已交付并结束两文件局部所有权，PM接管。实际diff移除 suppressed／setSuppressed 及仅为显隐服务的数组，顶部 mount 常驻，原失效卡片引用清理保留；普通卡片接管前调用现有 pause() 清除 lastTick，不清除 shown／typedMs；卡片结束使用原 restore／offer 路径恢复。顶部催领的独立 managerCardSpeech 分支及ticker未改，原字体／高度修复保留。PM已阅读完整diff和队列实现。未运行测试、预览、检查或编译，实际画布效果未验证，未推送。
