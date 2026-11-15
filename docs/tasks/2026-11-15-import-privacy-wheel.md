# 隐私窗口导入提示与被动滚轮报错

两项独立输出各用新上下文，不重复交给旧UI/计时代理。原文件所有者均已结束：main/导入链、畜牧loader/运行分别交齐。所有人不撤销他人代码；禁止测试、预览、语法/运行检查、编译、发布和推送，仅普通读写。

## IMPORT-PRIVACY-MESSAGE

- 负责人：新 `save_import_privacy`，fork_turns:none。仅平台导入结果与提示目标。
- 可写：src/platform/save-transfer.js、src/view/management-pages.js的导入流程文字/结果处理段；不动main、canvas、存档交易/版本校验或其他管理页面。
- 输入：用户Chrome选择文件后提示“已取消文件”，随后明确自己在浏览器隐私模式中，认为文件选择受限。现showOpenFilePicker AbortError/无handle返回null，receive把null直接描述已取消。
- 输出：不把所有无文件结果断定为用户取消；明确可能取消或隐私/权限限制，并指向已有拖入JSON/粘贴导入。保留单画布、严格同版本/环境、读取成功摘要确认及离线汇总不盖导入。不能猜测或指纹检测隐私模式，也不能断言所有Chrome隐私窗口必然不可选文件。
- 必读：AGENTS、docs/game-design.md第10.1明确禁止可见/隐藏界面/HTML表单或隐藏输入框；本次不放宽，禁止DOM file input。只改兼容提示，不重新发明选择器或恢复错误的focus后超时取消猜测。
- 未验证：用户设备浏览器行为仍无我方运行证据，使用用户反馈描述而非宣称已复现。

## PASSIVE-WHEEL

- 负责人：新 `canvas_wheel_fix`，fork_turns:none。仅画布滚轮监听目标。
- 可写：src/view/canvas-ui.js的滚轮监听段、必要清理注册；只读research-tree.js的既有同类桥接和本地Pixi EventSystem源码，不改其他运行模块。
- 精确输入：用户console `canvas-ui.js:2178 Unable to preventDefault inside passive event listener invocation.` 当前root.on('wheel')约2182调用event.preventDefault，而Pixi原生wheel监听为passive；research-tree约530已有单独native passive:false桥接。
- 输出：实际取消默认行为移到显式passive:false原生监听，仅对游戏实际处理/滚动区域内的同一个native event阻止；不在被动Pixi回调继续preventDefault。保持布局坐标、缩放、scrollTarget/研究缩放/方向/点击与统一计时，无全局滥拦，监听只注册一次并清理。
- 源级证据后实施，不用“仅加cancelable判断”掩盖passive错误，不改库依赖、不运行验证。

交付：隐私/权限空结果已不再断言取消，保留拖入/粘贴，同版校验和摘要流程不变；后续导入失败红色已用现有text color API完成。滚轮根处理取消默认已移独立passive:false监听，仅同nativeEvent，root销毁解绑，研究树未变。PM已读实际段落；未执行浏览器/运行/测试/编译/发布验证。
