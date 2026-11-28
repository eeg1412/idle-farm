# 复选按钮与「可研发」筛选

## 用户确认的需求

- 新增一种复选（checkbox）按钮：按钮内左侧画方框，选中时框内打勾，右侧为文字。
- 研究页节点图工具栏的「可研发」筛选按钮改用复选按钮：文字固定为「可研发」，点击打勾即启用可研发筛选，再点取消打勾恢复全部状态。现行「可研发 ↔ 全部状态」换文字的做法取消。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| CB-1 复选按钮 | 子代理 checkbox-button（新上下文） | `src/view/canvas-ui.js`（仅 `buttonAt` 新增复选选项及绘制）、`src/view/research-tree.js`（仅工具栏筛选按钮） | 复选按钮与接入 |
| CB-2 文档 | CB-1 交付后由 PM 指派 | `docs/ui.md` 或 `docs/ui/` 控件说明、`docs/ui/pages/research.md`、`docs/feedback-checklist.md` | 长期正文与反馈记录 |

PM 拥有本文件，负责读 diff 与最终编译。本次未授权测试、预览或运行时检查。

## 状态

- CB-1：已完成。`buttonAt` 新增可选 `checked` 复选样式；研究页两棵节点图工具栏筛选改用文字固定「可研发」的复选按钮。
- CB-2：已完成。同步[全局导航](../ui/navigation.md)复选按钮样式、[研究页](../ui/pages/research.md)筛选描述与[反馈清单](../feedback-checklist.md)。
- 未验证：未运行测试，画面未实看。
