# 设置齿轮圆弧连线修正

## 任务卡 GEAR-LINE

- 所有者：canvas_shell；唯一实现文件 `src/view/canvas-ui.js` 的齿轮分支。
- 用户证据：本轮截图中，设置按钮的浅色线条延伸到画布最左侧；重新打开反馈 3。
- 输入提供方／输出使用方：PM 提供截图与实际源码证据；现有 `drawImage(settings-gear)` → `topBar` 消费修复，不改接口。
- 最少读取：`drawPixelIcon` 齿轮分支；必要时读取已安装 PixiJS 的 `GraphicsContext._initNextPathLocation`、`GraphicsContext.moveTo/arc`、`ShapePath.arc`。
- 源证据：高光使用 `arc().stroke()`，未明确起点；PixiJS 会延续当前路径，高光因此可能带上通向圆弧起点的额外连线。
- 方法：计算高光圆弧起始角对应的坐标，显式 `moveTo` 到该点，再绘制圆弧并描边。
- 完成条件：实际调用路径采用独立起笔的圆弧；齿轮轮廓、颜色、36px 按钮、48px 命中与其他代码保留。源码交付与真实画布复验分别记录。
- 所有权：实现者不是独自在代码库工作，禁止撤销此前修改；共享源码只有该所有者修改，PM 独占本任务文档及反馈记录；无资源生成。
- 相关规范：`farm-task-dispatch` 单一输出使用一张卡和一个所有者；`farm-canvas` 保持 PixiJS 单画布。用户未授权测试、冒烟、预览、语法／运行检查或编译，本轮均不执行；推送授权无。
- 汇报：接手后说明最小修改，交付精确源码、实际接入和未验证限制，不以报告代替真实运行证据。

## 本轮交付

已在齿轮高光前计算圆弧半径和起始角，使用 `moveTo(cx + cos(start) × radius, cy + sin(start) × radius)` 后再绘圆弧。PM 已直接阅读最终源码；尺寸、颜色和命中未改。未运行测试、预览或编译，修复后真实画布仍待复验。
