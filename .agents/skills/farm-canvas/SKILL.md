---
name: farm-canvas
description: 修改田地、工坊、仓库、研究、任务面板或画布布局时使用，验证 PixiJS 单画布与方向切换。
---

1. 先读式样书第 8 节及 `docs/verification.md`。界面放在 `src/view`，经营修改通过动作入口提交。
2. 用 PixiJS 绘制场景与控件，在竖屏重新排版。横屏裁切并测试黑边。切换视口时保留当前页面、弹窗和输入。
3. 运行 `npm run check` 和 `npm run build`。用浏览器验证受影响的触控与键盘路径，记录实际尺寸及结果。
