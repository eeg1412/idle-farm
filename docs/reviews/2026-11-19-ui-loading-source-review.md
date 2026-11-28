# 七项 UI 与分层开屏：独立源码审阅

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

审阅者：`ui_source_review`。日期：2026-11-19。基线：Sites v63 `56f80b7`；审阅对象为本次工作区差异与必要调用依赖。仅人工静态阅读源文件、diff 和路径清单；未执行代码、测试、脚本检查、语法检查、运行检查、预览或编译。静态结论不等同于运行验收或素材视觉验收。

结论：SR-01 及 PM 补充的 SR-02、SR-03 均已退回所有者修复、明确复冻并完成只读复核；最终冻结版未发现仍开放的本轮源码阻断。以下结论限定于列出的静态调用路径。

## 冻结交接

- `batch_and_terms`：`src/view/production-pages.js`、`src/game/objectives.js` 已冻结。
- `dialogue_ui`：`src/view/manager-page.js`、`src/view/manager-help.js`、`src/view/manager-speech.js` 已冻结，提供 `messages`、`nextGreeting(currentText)`、`speech.select(line)` 和资料来源 `managerInCard`。
- `canvas_flow`：已交接 `src/view/canvas-ui.js`、`src/view/navigation.js`、`src/main.js`、`src/view/loading-screen.js`、`src/view/loading-tasks.js`；发现下述重试问题后由所有者单点修复并明确重新冻结，已按实际落盘文件复核。

## 发现与处理

### SR-01：重试会遗失仍在加载的动画缓存（已修复，原为阻断）

触发：某首屏资源已失败而另一动画图集仍在加载时点击重试；普通加载期间按 Enter/Space 也可调用同一重试入口。

初审冻结版证据：当时 `canvas-ui.js:529-530` 的 `retryOpeningResources()` 删除所有 `!entry.textures` 的动画缓存，未区别失败与 pending；随后仅调用 `openingTasks.clearFailures()`。`loading-tasks.js` 对已有同 key 任务直接返回原 Promise，`clearFailures()` 仅移除 failed。以 `loadLivestockTextures()` 为例，新建 entry 后，准备任务的完成闭包仍只赋值到首次捕获的旧 entry。重试重绘创建的同 key 新 entry 因任务去重不会执行自己的闭包，持续没有 textures；原任务最终可以变为 done，开屏可在产线空白时退出。当时普通加载键盘也能调用重试，无失败条件保护。

已将触发路径、证据和修复建议同时发给 PM 与 `canvas_flow`。修复后复核：最终 `canvas-ui.js:531-562` 先等待 `openingTasks.settlePending()`，再取失败 key 快照；每个动画 entry 带 `loadingKey`，仅移除快照内且当前仍为 failed 的条目；成功与仍 pending 条目不移除。`loading-tasks.js:31-40` 等待依赖任务并按快照清失败，`loading-screen.js:57-64` 阻止无真实失败的重试。原 pending 完成闭包的目标 entry 保留，消除了本条证明的丢失路径。审阅者未修改实现；未运行重试体验。

### SR-02：deadline 超时后旧图片工作仍写本地缓存（已修复）

PM提出后按源码确认：`canvas-ui.js` 的 `loadImage()` 将整个 `fetchTexture` 放进 `loadWithDeadline`，但纹理校验、`textures.set` 和 `markDirty` 都在 fetchTexture 的 Assets.load 之后。`loading-tasks.js` 的 Promise.race 超时拒绝不会取消这段工作。因而 URL 已记 failed 后，原工作仍可能晚到写缓存；重试对 URL 的 Assets.unload 与晚到写入交错时，textures 中可能保留被卸载销毁的对象，之后 loadImage 的 truthy 缓存分支直接返回它。建议仅将等待图片包在 deadline 内，校验与本地缓存写入放在该 await 成功之后。已发送 PM 与所有者；未运行此场景。

最终复核：`canvas-ui.js:493-519` 的 requestTexture 只等待卸载链并返回 Assets.load；deadline 包该等待，校验、textures.set 与 markDirty 均在成功 await 后执行。超时请求本地 continuation 已拒绝，不再晚写 Map。`canvas-ui.js:538-550` 将真实 Assets.unload Promise 保留在 unloadingImages 至实际结束；5 秒短等超时也不移除，新请求会等待同一链。缓存入口与 `loading-screen.js:127` 也拒绝 destroyed 纹理。此修改消除了已证明的本地晚写和迟到卸载竞争路径；未宣称运行网络故障验收。

### SR-03：开屏结束未恢复弹窗下原动画卸载规则（已修复）

PM提出后按源码确认：observePlots 为并行首屏准备而允许 openingScreen.blocking 期间在 modal/pendingModal 存在时挂载动画。loading-screen.js 的淡出完成路径仅 finish、移除监听与销毁 overlay，没有请求重绘或同步可见性。因此初始离线汇总弹窗已打开时，activePlots 会在遮罩结束后继续驻留到下一次结构变化；ticker 的 !modal 条件只暂停更新，不能释放实例。建议完成时 requestRender，使 observePlots 恢复原有弹窗卸载条件。已发送 PM 与所有者；未运行此场景。

最终复核：`loading-screen.js:189-193` 先将 done 置 true，再调用 onComplete；`canvas-ui.js:567` 的回调先 syncPlotVisibility、再 requestRender。同步时 blocking 已为 false，observePlots 的既有 modal/pendingModal 卸载分支立即恢复；重绘随后同步正常结构。此修改闭合本条生命周期遗漏；未运行弹窗场景。

## 已核对的静态路径

| 范围 | 源码证据与结论 |
| --- | --- |
| 批量升级 | `production-pages.js:205-235` 的 steps/pending 属于同一次弹窗闭包；刷新重新从 `dlg.w` 取报价，不走会关闭弹窗的 submit。提交时传 expectedCost，pending 与全局 waiting 阻止重复提交；finally 仅在同一活动弹窗刷新。`world.js:504-534` 重新报价并在扣费前核对 cost；`main.js:179-185, 444-485` 保留克隆草稿、保存完成后换 world 的事务顺序。未见本轮新增扣费/关窗问题。 |
| 真实研究报价 | `manager-help.js:169-198` 品质调用 qualityDrawOffer，经营改良调用 techOffer 且要求 eligible/affordable；与 `research-page.js` 的 researchReadyTabs、按钮及报价数据同源。 |
| 候选与手动切换 | `manager-page.js:59-130, 423-447` 枚举有效上下文/升级/研究帮助，按优先级排序去重并传入横幅；目录 feature 与资料 feature 也接 advanceManagerSpeech。`canvas-ui.js` 按 role 防抖 300ms，优先另一个有效候选，否则 nextGreeting；speech.select 清临时回复并立即激活新基础句。 |
| 帮助失效 | 冻结版 advanceManagerSpeech 只在产生真正 daily 时更新 managerDailyLines；横幅 messages 集合变化会删手选 selection 并重新 offer 当前帮助或真实日常。inCard 不回取其他页面旧候选。 |
| 资料角色与可见对白 | `manager-page.js:147-196` 标记 managerRole/managerInCard，资料不新增气泡。`canvas-ui.js` 的 managerExpression、managerReply、managerBanner 各自按来源角色与性别取队列；只有匹配资料来源且可见的背景说话者继续计时。 |
| 研究历史 | `navigation.js:82-89` 只对双方无 modal/dialog 的研究页签切换 replace；保持 previous 与 position。`canvas-ui.js:1327` 同研究无弹窗页签跳转不覆盖 pageParent；弹窗 parentDialog/parentPage 的路径仍保留。 |
| 首屏资源入口 | 普通图片/管理员场景与头像/列表图标通过 drawImage 或 showPortrait→loadImage；大地图经 mountEstateMap 的 loadImage:loadAnimationImage，含背景/牌子/建筑/motion；设施通过 loadPlotTextures/loadLivestockTextures/loadFishTextures/loadMiningTextures/loadWorkshopTextures→prepareTextures，含四期、成年 bare、机台/带面/效果/物料、鱼池与矿洞。可见性加载、原动画空区规则继续沿用，未新增产线回退。 |
| 开屏资源命名 | `loading-screen.js:4, 11, 126` 消费 `art/loading/background.webp`、`managers.webp`、`logo.webp`；路径清单已见对应三份 `public/art/loading/` 文件。这里只核对命名，不评价图像内容。 |
| 真实进度与失败 | `loading-tasks.js` 按真实 Promise 记录 pending/done/failed；loadImage 拒绝无效纹理，prepareTextures 将资料/尺寸失败记为 failed；pageState 另计存档初始化工作。失败不计 done、阻止 ready，显示重试与存档问题入口。25 秒图片 deadline 仅在 openingTasks.active 时应用，开屏后的原按需加载语义保留。重试闭环见已修复的 SR-01。 |
| 最短展示与淡出 | `loading-screen.js:37-40, 146-157, 177-192` 在第一次完整 art 渲染后清计时，仅可见前台累计 shownMs；visibilitychange 清 lastTick/fadeAt/stableFrames；满足 1000ms、全部任务成功、当前页稳定后才 300ms 淡出。只改 alpha/scale；图形重画发生在布局或文案/失败状态变化，未按帧重建文字。 |
| 输入与单画布 | 开屏是同一 app.stage 的 Pixi overlay；hitAt、拖动、滚轮、键盘、粘贴/拖入均增加 blocking 判断，main 也阻止开屏时解锁音效；遮罩覆盖全 app.screen，图片裁剪到竖屏 viewport。失败布局将进度条和恢复控件上移以留在短屏内部。普通键盘重试已受真实失败 guard 保护。 |
| 玩家文案 | 本轮 objectives 与 manager-help 中四处玩家可见「精制配方」改为「商品配方」，保持精制设施及数据类别名；只读检索 `src` 未见剩余「精制配方」文本。 |

## 未验收范围

所有浏览器后退与逐层返回体验、连续升级与保存失败表现、300ms 防抖、资料期间背景气泡实际遮挡、资源失败/重试、后台恢复计时、手机构图与真实 300ms 淡出均未运行。素材内容由独立美术审阅负责。本报告不以命名存在、源码分支或所有者说明代替这些验收。
