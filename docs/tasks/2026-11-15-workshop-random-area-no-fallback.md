# 动画禁用回退、随机区域进料与满幅机身

用户再次纠正上一轮交付：材料要在左侧随机位置出现，不是一条线；允许重叠、同时多个。随后明确指出「入料不是从最左侧进来的，变成闪现进来了」，因此入口必须在画面最左侧之外，随机的是进入高度和成组数量，不能在带面内部随机X后直接显示。成品不得淡出，直接滚到最右侧。图标再放大，中央机器放大到上下裁切，移除背景。牧场、工坊动画不允许回退图标，后续也不能擅自新增回退。

## 任务卡 A：animation-no-fallback

- 负责人：新建干净上下文 `/root/animation_no_fallback`，独立清除动画回退输出，与旧导入／科技／饲料任务无关。
- 输入：用户原话；`canvas-ui.js` 的 feature／load／unmount／observe 分支；`production-pages.js` 设施与工位卡。
- 所有权：仅 `src/view/canvas-ui.js`、`src/view/production-pages.js`。旧所有者已结束所有权；本轮由该代理独占，PM负责文档。
- 输出：已安排牧场和工坊动画块不创建、请求、绘制或恢复回退图片。加载中、失败、无活动批次或视觉登记缺失时保留区域，不能落入静态／程序图标分支。不制造批次或提示。空设施初始选择图与非动画图保留。
- 接口：工坊 `workshopTextureSources(kind)` 由任务B保持签名，移除背景源后现有loader自动消费；不相互改文件。
- 规约：单Pixi画布，保留命中与可见性销毁；异步加载不复活旧页面；不得覆盖其他修改。
- 完成条件：PM阅读卡片声明→feature→loader／mount／unmount实际链；源码接入与运行确认分开记录。

## 任务卡 B：workshop-random-area-overflow

- 负责人：复用 `/root/workshop_motion`，同一工坊动画的直接修订、连续成果物，不附加无关工作。
- 输入：用户原话；当前layout、renderer、visuals、候选参数、producer及未执行compositor。无需全仓扫描。
- 所有权：`src/view/workshop-layout.js`、`src/view/workshop-animation.js`、`src/content/workshop-visuals.json`，以及 `assets/workshop/` 下的 `workshop-visuals-portless-v5-candidate.json`、`export-portless-v5.mjs`、`compose-portless-v5.mjs`。上轮所有权已结束，本轮重新授予；不得改任务A的文件。
- 输出：入口X固定为负半个图标宽度，从最左侧之外连续滚入，随机Y且稳定成组发料，允许重叠和同时多个（单材料配方也可多件）；完整覆盖实际材料，不按行、内部闪现或每帧改身份；固定有界Sprite池。右行成品alpha恒1，完全滚出右边缘；图标继续增大。机身等比放大、上下溢出裁切，左右满高带面贴身，不加载或绘制背景。
- 接口：保留 `workshopIconIds`、`workshopTextureSources`、mount签名。帧数据及producer／compositor源同步，禁止执行脚本。
- 完成条件：PM阅读layout→frame→Sprite→mask及实际loader，候选和持久producer不会恢复旧背景／单线；不把源码阅读作为运行观感通过。

## 本轮权限与阶段

两任务可以并行，PM只维护规范、反馈、任务卡及整合报告。无素材重画要求，既有真正绘图机身和带面复用。无测试、冒烟、预览、合成、语法或运行检查、编译及推送授权；用户「保持不运行」持续有效。不得换工具或代理绕过。

两任务已交付并结束文件所有权。PM已阅读已安排卡animationOnly→feature不绘图→挂载与卸载无fallback链，以及layout→frame→Sprite池→区域mask和纹理加载源。任务B第一版曾在左带内部生成随机X，用户指出闪现后已重新打开并完成修订：入口X=-44，Y44..276稳定随机，每事件1–3件，主包逐轮覆盖材料、附加包可重复；单材料配方也可同时多件，固定12个Sprite。材料／产品88／96，产品alpha恒1、中心滚到368后结束。机身真实高度400，top=-40/bottom=360，整体区域裁切；只请求machine/tread。active／candidate、producer与未执行compositor源同步。均未运行验收，不据源码保证真实观感；随后按用户要求进入独立的木质素材重绘任务。
