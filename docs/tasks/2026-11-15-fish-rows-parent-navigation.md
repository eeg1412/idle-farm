# 大型作物补排、新档空田、鱼池动画与明确上级返回

输入为用户本轮 1–5 项反馈；4、5 在执行中追加。旧的作物和弹窗交付不能关闭新反馈。PM 维护规范、任务接口和持久反馈，具体实现由以下互斥文件所有者完成。完整任务卡已逐项下发。

## 最新追加覆盖旧方案

- 用户截图否定了后文历史9排×2列版本：树林偏窄，未贴背景铺满。用户进一步明确每棵树／苗必须是独立图片、运行逐棵摆放。任务重开为 C-INDIVIDUAL：C02–C68 每期一个独立单株 WebP、每根一个 Sprite，四期共用根位；仅 C01 保留先前已认可整幅例外。静态全景合成只用于素材摆位交接，不能当运行前景。
- 新作物接口：C01 仍 `{shared,stages,frontStages}`；其余 `{shared,plants:[4textures],visual}`。`crop-visuals.json` 每ID登记 `mode,size,roots` 与阶段 `path,width,height,anchorX,anchorY,baseScale`；根位还登记 `row,column,maxHeight`。阶段发布路径为 `art/plot/plants/<ID>/<phase>.webp`，无 public 前缀或 query，loader 加 v4。四期真实源为已有单株 PNG，不能多株烘焙。
- 田面列族从真实 furrows 边界推导消失点，列可在田面边界自然进入／退出，逐排与真实折线求交以覆盖两端。medium 同样取消 minRootY／跨排筛空，small 可保留原47根位；不是固定每排两棵。实际字段与摆位待源资源交齐后补记。
- 鱼池追加 F-HABITAT：每鱼显式 `habitat: river|sea`，两套新背景；四层为背景、鱼、水色半透明遮罩、程序动态水波。新背景和 `fish-habitats.json` 由 F-ART 独占导出，`fish-animation.js` 消费实际 water polygon/color/alpha；水色／波纹只在水域，背景不淡变。旧单一 pond 文件保留历史，不再活跃加载。
- 海／河分类按养殖展示场景：river F01/F02/F04/F05/F07/F10，sea F03/F06/F08/F09。洄游或广盐物种不能写成绝对生态分布判断；依据见扩展水产业说明。
- 所有旧的“已交付”记录只对应当时版本，最新追加未收口前不视为本轮已满足。

| 任务 | 用户项 | 所有者与独占输出 | 完成条件／交接 |
| --- | --- | --- | --- |
| C-ROWS | 1 | crop_scale：两条作物导出器、crop-layout.json、大型作物 PNG／WebP | 大型在全部 9 条真实田垄种植，透视列连续对齐；四期同根位，保留前后层与 C01 原稿；交公共 loader v3 |
| START-EMPTY | 2 | economy_upgrade：world.js | 新建与清档重开为两块一级空田，无活动批；旧档与周回规则保持。PM 同步首播种说明 |
| F-ART | 3 | fish_assets：assets/fish、public/art/fish、fish-visuals.json、透明选鱼图、鱼静态回退、export-fish-animation.mjs | 内置 image_gen 生成全目录鱼种三期各四张独立 idle 原画，交真实转换链、来源、PNG／WebP及用途，交 QA 审图 |
| F-RUNTIME | 3 | fish_runtime：fish-animation.js、fish-layout.js | 固定鱼塘、3／2／1只、三期 idle、成熟淡出后鱼苗淡入；提供冻结挂载接口与纯布局数据 |
| F-SKILL | 3 | fish_skill：farm-fish 技能目录与 AGENTS.md 入口 | 技能按真实资源链交付，区分用户明确行为与本轮时序数值，供后续新增／改画使用 |
| CANVAS-FISH-UP | 3、4、5 | canvas_shell：canvas-ui.js、navigation.js | 实际按需加载／卸载鱼动画、独立鱼批相位、单一关闭图标、App 返回使用进入时父上下文，浏览器历史另行处理 |
| PROD-FISH-CLOSE | 3、4 | production_ui：production-pages.js、research-page.js | 活鱼选择图、卡片 fishAnimation 参数进入真实路径；清掉纯关闭／返回尾按钮 |
| MANAGEMENT-UP | 2、4、5 | management_ui：management-pages.js | 首播种说明；图鉴列表与物品层级保存完整父快照，恢复筛选、用途展开和滚动；移除重复关闭 |
| F-RESOURCE-GATE | 3、5 | economy_upgrade：check-facility-art.mjs、package.json，main.js 仅出售成功后的会话重置 | 鱼类交付要求进入正式资源门但不运行；新增生产转换命令；周回成功作废旧排队动作和上级引用 |
| F-ART-REVIEW | 3 | fish_art_review：本轮独立鱼类静态审阅报告 | 对照原稿、认可参考与实际成品审阅，不合格退回素材所有者，不以帧数／字段代替视觉证据 |

所有者不得撤销此前他人改动。共享图像生成只有 F-ART 一个所有者；共享画布与路由只有 CANVAS-FISH-UP 一个所有者。C-ROWS 本轮不再拥有资源门脚本。

## 已冻结接口和行为

- 作物仍为同 ID 640×640 前后图集，loader 同升 v3；大型两列与每排原 furrows 折线求交，不再由跨排贪心距离删整排。
- 新档仅 `newWorld` 创建空田；`sellFarm` 明确保留既有周回小麦。用户未要求修改已有存档或周回播种，不将新档要求扩大为取消当前作物。
- 鱼塘复用 `assets/source/art/scene-empty-pond.png`，发布 320×320；每鱼 1280×960 图集，三行阶段、四列 idle、每格 320×320；运行注册点 `(160,210)`。
- `fish-visuals.json` 为每 ID `{stages:3,size}`；体型 small 为 F01，medium 为 F02/F03/F04/F05/F08，large 为 F06/F07/F09/F10。分类是游戏构图选择，不作为真实生物长度事实。
- `fish-animation.js` 输出 `fishFrameSize/fishIdleFrames/minFishAnimationMs/fishSpecies/sampleFishAnimation/mountFishAnimation`；挂载纹理 `{pond,stages}`，生产卡参数 `fishAnimation:{batch,index}`。公共 loader 保留短实际批次的展示相位，不伪造经营事件。
- 本轮采用 9 秒保底、三期均分、4 帧每帧 300ms、成熟末 300ms smoothstep 淡出、下周期前 300ms 鱼苗淡入。用户明确要求有保底但未指定该数值，因此记录为实现选择。鱼塘不随鱼体淡变。
- 原画每帧可人工登记同一鳃后躯干解剖点的原图绝对 `sourceAnchor`，映射到固定场景注册点；同阶段共用画布和尺度。禁止逐帧 bbox 居中、缩放或用注册抵消原画躯干形体变化。QA 看真实分镜，字段本身不构成稳定证据。
- 弹窗只保留标题关闭图标，删除纯关闭／返回尾按钮；取消／确认、说明完成及离线收获确认等业务动作保留。
- App 返回优先当前弹窗的显式父级，再本页物品层级，再进入页面时标记的父上下文；不得简单调用浏览器 back。父上下文含来源页面、页签、物品、弹窗、筛选、滚动、研究视口及父链；底栏根页面跳转清来源链。浏览器前后进仍独立保留会话上下文。
- 无来源直链明确兜底：图鉴／出售牧场到经营，设置／任务到牧场。跨入口进入主页面时提供实际可点返回入口；导入、清除及成功周回重置父链。

## 权限和未验证边界

本轮用户未授权任何测试、检查、预览、语法／运行验证、试编译或最终编译，全部不运行；此前最终构建已被自动审批以缺明确授权拒绝，不重试或绕过。普通文档和源码读写、内置原画生成、生产资源转换、静态图片审阅属于交付工作。无提交、推送或发布授权。原图、成品、源码接入和实际运行分别记录，真实画布与循环体验仍待授权验收。

## 本轮实际交付

### 最新方案已交齐

- C-INDIVIDUAL最终Node生产转换完成，268张独立单株WebP、268张trim PNG及完整68-ID元数据已落盘；runtime每根位一个Container／Sprite，C01原整幅例外未重导。PM已读 `mountIndividualPlants`、loader与producer，并看 C08／C05／C07带背景摆位、C08根位／130图和真实发布单株。完整记录见[逐株静态记录](../art-reviews/2026-11-15-individual-crop-layout.md)。下面旧9排×2列版本仅为历史交付，已被用户否定，不再活跃。
- 海河追加已交齐两张新背景、对应水域多边形／水色、全鱼habitat及10张回退。`--habitats-only`只重背景／metadata／回退，原鱼帧和选择保持。runtime四层已实际消费，程序短弧波纹独立起笔、30fps、限定水域；PM已读实际源码及真实JSON、查看320／130总览，独立QA已审两新原稿和全部最新静态回退，无退回项。
- 技能和AGENTS已按逐株／海河四层的真实字段与入口更新，资源门按新单株与active河海登记收口；未执行门禁。普通生产转换成功与静态审阅范围不扩大为真实运行通过。
- 最新所有模块、图片和资料已交齐。本轮仍未运行测试、检查、预览、语法／运行验证、编译或推送；不重试此前被拒的最终构建。

### 先前阶段交付（保留历史）

- C-ROWS 已执行仅大型生产转换，22 种大型前后层重新交付；PM 看过 C05 两层静态图并读取求交算法。缓存 v3 进入公共 loader。
- START-EMPTY 已进入 `newWorld`，`sellFarm` 仍显式 C01；说明与式样、待授权用例已同步。
- F-ART 已用内置 image_gen 生成全部十张新原稿并执行正式资源转换，最终生产转换退出0。原稿、提示词、登记、120帧、PNG／WebP、选择、回退、共享塘与静态审阅资料已齐；没有以转换成功当作检查通过。
- F-SKILL 已按真实 layout/atlas/exporter 补齐字段和持久回退链。常规设施导出对登记鱼优先读取持久回退 PNG，重压后同步该 ID 的来源／发布哈希，避免恢复旧鱼或留下过期登记。
- F-RUNTIME、PROD-FISH-CLOSE、CANVAS-FISH-UP 已接入实际卡片、图集加载、独立批相位和生命周期；PM 读取了相应执行链。
- 显式父上下文、图鉴完整父快照、一次性外部研发来源、底栏根跳转、无来源兜底和重置 epoch 已交付，主流程出售成功提交后作废旧命令与返回来源链。PM 已读真实源码，未运行导航用例。
- F-RESOURCE-GATE 已写入全鱼资源契约并按实际字段对齐，未运行；C/L既有门保留。
- F-ART-REVIEW 已实际打开全部原稿、固定分镜、发布图集／选择图／回退及32px／130px总览，静态范围通过，无具体返工项。F08透明查看红边疑点在正常背景复查未形成同样可见缺陷。真实循环及使用未验收，报告不代替用户认可。
- 本轮不运行任何测试、检查、预览或编译，不提交、推送或发布。持久反馈记录每项真实接入及未验证状态。
