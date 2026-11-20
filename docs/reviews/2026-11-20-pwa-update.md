# PWA 更新链只读复核 · 2026-11-20

结论：冻结后的四文件源码未发现阻断；本结论是静态调用链审查，不是运行验证。

范围：`src/main.js`、`src/platform/pwa-update.js`、`src/platform/site-service-worker.js`、`src/view/canvas-ui.js`，并定向阅读原 `save-queue.js` 与 `world-save.js` 事务结果。未改业务代码。

## 源码已证

- **先同意、再真实保存、后接管**：`main.js:684` 将更新保存加入原 `enqueueCurrent`；原 `save-queue.js:8` 透传任务结果，过期 world epoch 返回 undefined。`main.js:629–642` 仅在 `commit` 完成后返回 true，未 ready、busy 或失败返回 false；`main.js:186` 等待 `writeWorldSave`，原 `world-save.js:73,111–148` 在 IndexedDB `tx.oncomplete` 后才完成。协调器 `pwa-update.js:97–111` 只认 `=== true`，失败不发激活消息、不 reload。
- **无安装即强制接管**：SW `site-service-worker.js:9–30` 的 install 仅缓存，`skipWaiting` 仅由明确协议消息触发；`activate:32–39` 保留原缓存清理及 claim，未清 IndexedDB。协调器 `:19–24,133–148` 从已有 controller 加 waiting installed worker 发现候选，不从 active 凭空生成，初装自然 claim 无提示/直接 reload。
- **失效、替换、另标签与超时**：协调器 `:48–55` 优先新 waiting，另标签激活已观察候选后保留其 activating/activated 身份；`:24,35,98,105` 使该候选继续可接受，仍须真实保存。`:65–93` 先挂监听再检查/消息；若已是 controller，保存后直接成功并仅 reload 一次（`:109–111`）。redundant、候选被替换或 12 秒超时失败并卸载监听，无延迟 reload。未同意标签的全局 controllerchange 仅 refresh，不自动保存/重载。
- **提示不抢现有界面**：`main.js:685` 要求 world/前台/非 busy/无保存排队；`canvas-ui.js:1180–1183` 另要求开屏完成、无 modal/pending modal/菜单/提交/手势。`:1187–1218` 用等待状态、接受标记及关闭 guard 防连点，失败为短行内反馈；`:1574–1578` 仅对正在接受的更新框拦 history 绕过关闭。`:1137–1139,1211` 在框真正卸载后仅通知一次，并阻止历史恢复旧更新框。
- **业务提示和稍后**：`main.js:194,271,687–696` 在更新框存续期间延后商人换批/离线收获提示，关闭后恢复。协调器 `:26–56` 对已展示 worker 用 WeakSet 去重，另标签激活亦不清此标记，稍后或关闭不会同会话重复提示；新 worker 可再次提示。
- **后台检查不阻断游戏**：协调器 `:122–148` 在注册后、回前台、15 分钟定时检查，同检查去重且至少间隔 60 秒；注册/更新失败吞入可选更新路径。`main.js:646` 仍为原 5 秒保存；diff 未改经济、存档格式、普通 Dialog/对白规则。

## 审查修正与边界

history 绕过 onClose、正常业务提示覆盖更新框，已由 owner 以局部 guard/延后回调修正。PM 补充发现的“另标签先激活使旧页面提示永久失效”，已最小修改候选保留及接受校验；本报告完成该路径定向补审，未重扫其它冻结代码。

未运行测试、模块模拟、语法检查、浏览器预览、冒烟或构建；未声称任何浏览器实际更新时序已验证。首部署前已打开的旧客户端尚无本协调器，不能追溯显示新 UI；加载本次客户端后才具备该能力。最终生产构建和发布由 PM 执行。
