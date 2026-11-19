# 七项 UI 与分层开屏

基线 Sites v63 `56f80b7`。PM `/root` 管理需求、本文、反馈清单、相关 UI 规格、整合与最终生产构建发布。下列代理均新建干净上下文 `fork_turns: none`；按成果物分工，文件所有权互斥，不共享编辑。无关任务不得塞入旧线程。交付须报告接手、阶段、阻塞与结束所有权；扩大读写范围先报 PM。

## 用户要求与完成条件

1. 玩家可见「精制配方」统一为「商品配方」，不改加工/精制设施命名或数据类别。
2. 品质、经营改良存在可操作项时，当前页管理员提供具体操作指导，沿用真实报价判断。
3. 研究三页签切换替换当前历史记录，浏览器返回仍回来源大地图；保留其他页面与弹窗的逐层返回。
4. 批量升级成功保留弹窗，刷新金币、成本和可用状态，允许再次点击，异步提交期间避免重复扣费。
5. 点击管理员立绘立即换对白；有其他有效帮助先换帮助，否则下一句日常；300ms 防抖。所有岗位横幅、管理列表与资料角色均可触发。新送礼仍即时感谢；手动点击可直接跳过当前对白。
6. 资料切换角色后，背景横幅的气泡继续显示新角色文字，无需关闭资料；不在资料内恢复已删除的气泡区。
7. 单 Pixi 画布增加背景→管理员群像→LOGO→进度条开屏。首张完整开屏展示至少1000ms；开屏加载与当前页面资源加载并行，二者全部完成才以300ms淡出。进度按真实任务，不做假百分比。不因加载失败假装完成，失败需有可重试入口。保留原产线无回退规则。

## 共用规约与权限

必读 AGENTS.md、docs/development.md 无人值守实装、docs/performance.md 对应部分；调度遵守 .agents/skills/farm-task-dispatch/SKILL.md。单画布，所有 UI 与命中在 Pixi，经济 BigInt/事务/存档不变；不改数值，不新增动画回退。文本/图形不逐帧重建，有界资源、离屏管理和脏标记沿用。
本次没有测试、冒烟、预览、语法、运行时检查或试编译授权；不得执行。普通读写、图像生成/转换、图片静态审阅允许。只有全部代码、资料与资源完成后由 PM 最终构建。用户明确要求发布原 Sites，授权该发布流程的源码同步，不向 GitHub 推送。

## 任务卡与冻结交接

| 代理 | 目标与独占成果物 | 最少输入、接口与依赖 |
| --- | --- | --- |
| dialogue_ui | #2、#5 数据与队列；`src/view/manager-page.js`、`manager-help.js`、`manager-speech.js` | 读这三文件、research-page.js 的 researchReadyTabs/页签与 quality.js/advancement.js 报价、canvas-ui.js conversationFor/managerBanner/managerReply 调用；改两条帮助文案的精制配方。`renderManager` 继续现有 message/greeting，并增加 `messages`（全部有效帮助，优先级递减，介绍/回礼也作为候选）与 `nextGreeting(currentText)`（hello 数组下一句，避免重复）；目录头像使用现有 `feature` onClick，通过新增 `ui.advanceManagerSpeech(role, gender, {messages,nextGreeting,inCard})`；队列增加 `select(line)` 清临时回复并立即换基础句。需即时向 canvas_flow 交接口。无 canvas 修改权。|
| canvas_flow | #3、#5交互、#6及#7加载闭环；`src/view/canvas-ui.js`、`src/view/navigation.js`、`src/main.js`、新 `src/view/loading-screen.js`、必要新专用加载模块 | 读导航/画布、main/entry、estate-map 的资源加载及 docs/performance.md。独占共享画布与启动；依赖 dialogue_ui 上述新增接口、art_layers 固定资源 URL。所有可见首屏资源包括地图建筑/动作层、管理员场景/头像、列表图标、设施四期/机台/鱼/矿洞纹理须纳入真实加载任务，当前页在遮罩后照常绘制/加载。异步纹理回流新任务需等稳定，不只空的 loadingImages。研究页签历史可在导航写入层识别同研究无弹窗页签切换使用 replace，弹窗不能扁平化。资料情况下背景横幅可打字，仅当前可见说话者运行；头像点击需避开按钮和收礼区。素材由 art_layers 交付：`public/art/loading/{background,managers,logo}.webp`。|
| batch_and_terms | #1与#4；`src/view/production-pages.js`、`src/game/objectives.js` | 读前者 submit/batchUpgrade/dialogButtons、world.js 批量报价动作及 main.js 保存提交接口；仅改目标文案/批量弹窗，单个升级及其他提交关闭行为不动。报价随最新状态刷新，成功不关闭，失败保持输入，pending锁保护跨刷新；不改经营数值。manager-help 两条文案由 dialogue_ui 负责。|
| art_layers | #7三层新绘素材；`assets/source/art/loading/`、`public/art/loading/`、`scripts/export-loading-art.mjs` | 读 docs/assets.md、docs/Pixel-Characters-Complete-Pack/角色设定与性格.md 及现有微笑原图、背景、截图风格；内置 imagegen 真实绘制独立背景、透明群像、透明中文 LOGO。源图/提示词/引用/导出清单持久保存。背景竖屏 768×1366，群像透明约1024×1024（11岗位各一名，女男交错，各角色以现有原画为参考，完整半身/三分之二身，多排自然群像），logo透明宽1024×约400，准确「放置庄园」，无副标题。WebP质量70/最近邻缩放，保持 Alpha。小屏构图 logo 顶部15–28%，群像中下35–78%，条下部85%；背景无人物/文字/进度条，群像无背景/文字，logo无人物/背景。可生成联系表作为输入参考（不替代新绘），必须先打开输入原图/联系表。PM另指派独立审阅，不准自称用户验收通过。|

相关专门规约：新绘由 imagegen 内置工具完成，farm-art-review 独立开图核对原稿与成品（角色身份、像素风、透明边缘、准确中文、手机可辨性）。只审静态资源，不冒称实际运行。图像生成后返图并复制进项目。提示词、来源与导出命令由素材所有者保存。

## 下游顺序

各所有者同时开始；dialogue_ui 先确认接口供 canvas_flow；art_layers 交付路径与尺寸后独立静态审阅，问题退回原所有者；PM核对实际路径、更新规格和反馈，接齐后最终构建及原 Sites 发布。当前未验证项为全部运行体验、浏览器后退、连续升级、点击防抖与加载淡出时序。

## 独立审阅任务卡

- `loading_art_review`：新干净上下文；只拥有 `docs/art-reviews/2026-11-19-loading-screen.md` 与 `assets/source/art/loading/review/`，待 art_layers 明确冻结后读取准确版本原图/引用/WebP，按 farm-art-review 的 checklist 实际看图和320/390静态合成；不改素材/实现。退回给原所有者后按同目标复查，区分静态通过和运行未验收。
- `ui_source_review`：新干净上下文；只读本轮差异与其必要依赖，输出 `docs/reviews/2026-11-19-ui-loading-source-review.md`。先读本文和性能规约，待 canvas_flow/dialogue_ui 冻结接口与文件后，人工源码审阅真实路径：启动加载闭环/失败重试/后台可见1秒及淡出300ms、输入阻断、页签history与弹窗parent、管理员候选轮换和失效更新/300ms防抖/角色切换资料期间显示、批量保存报价和锁。只读源文件或diff；不得执行代码、测试、脚本检查、语法检查、浏览器/游戏或编译。缺陷附具体调用和行证据，交PM及文件所有者，不自行改实现。完成后结束报告所有权。

两个审阅者与实现所有者分别负责独立成果物，无文件共享写入。最小交接为本文、冻结状态、精确文件版本和待审来源，不继承无关任务历史。

## 实装与素材交接

- `dialogue_ui` 已冻结并结束三文件所有权；有效帮助包括全部当前缺料、空设施/工位、可升级设施/工位、仓库涨价与当前研究页签可操作项。教程仍仅取原有可见前置链，不提前展开后续任务。资料与目录传递 `managerInCard`。
- `batch_and_terms` 已冻结并结束两文件所有权；批量升级独立闭包锁保护提交，成功留窗/失败留输入，使用 action 原成功反馈，不叠加第二条飘字。
- `art_layers` 已冻结三层原稿/成品，结束所有权。独立素材报告见 `docs/art-reviews/2026-11-19-loading-screen.md`；PM另打开参考联系表、三张WebP和320/390静态合成，核对角色、中文、透明叠层与间距。只代表静态素材，不冒称运行通过。
- `canvas_flow` 首次冻结后独立源码审阅发现失败重试清理了仍pending图集的风险，已单点退回原所有者；最终闭环以独立源码报告为准。

## 行为与性能边界

本次有意改变的是导航历史、手动对白、留窗升级和开屏显示。经营动作、BigInt报价、库存/品质/科技算法、存档格式和提交成功时机均沿原路径。品质与经营改良使用与原红点同源的实际报价，仅增加文字指导；缺料等候选在页面状态重绘时求取，不增加逐帧经营扫描。新开屏图层只创建一次，逐帧仅更新进度宽度/淡出alpha及已存在文字；三张固定纹理不建立无界缓存。开屏结束后恢复原图片等待路径，不添加新的普通按需加载超时。开屏后台不积累展示和淡出可见时间；单画布、产线无回退与可见区资源加载规则保留。

本轮未运行任何测试、冒烟、浏览器预览、语法或运行时检查；全部交付完成后仅 PM 做发布所需最终生产构建。

## 最终源码冻结

`canvas_flow` 已修复并冻结全部五文件，结束所有权。独立源码报告 `docs/reviews/2026-11-19-ui-loading-source-review.md` 的 SR-01/02/03 均已闭环：重试先收敛pending再仅清失败快照；deadline仅包资源等待，成功后才写本地纹理缓存，保留真实unload等待链；开屏完成先同步可见性再重绘，恢复弹窗下动画卸载。审阅者已交付并结束报告所有权。

`dialogue_ui` 最后仅压缩帮助文字，避免品质费用/次数及重复指令挤满气泡；真实报价、候选、接口和优先级不变，已再次冻结结束所有权。PM已逐项阅读最终字符串与调用路径。全部代码、文档、原画、导出及独立审阅齐备，接下来由PM执行唯一最终生产构建。运行验收仍未授权，未执行。

最终生产构建：PM通过Sites build helper执行 `npm run build`，退出码0；Vite处理812模块并生成离线资源脚本。仅有现有大分块体积提示。未运行其他测试/检查/预览。原Sites源码同步与发布继续由本轮完成。
