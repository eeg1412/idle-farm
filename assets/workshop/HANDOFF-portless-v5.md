# 最终交接：无突出接口长条机身、无边传送带

最新用户要求是居中的纵向长条机器，两侧平直、没有凸出的进料口或出料口；等比放大机身到上下超出动画区域并裁切。左右各一片满高度无边带面；材料从最左侧画面之外以随机高度成组滚入，允许重叠、同时多个，不能在带面内部随机X后闪现。右中央成品保持不透明直接滚出右边缘。两侧图标继续增大，背景不再请求或绘制。机器内不绘入材料或产品。牧场与工坊动画禁止回退图标；具体接入见 `docs/tasks/2026-11-15-workshop-random-area-no-fallback.md`。

## 已完成图片

- `raw/processing-machine-long-v4.png` 为内置image_gen新绘长条加工机；`raw/refining-machine-long-v4.png` 为内置image_gen基于该新布局绘制的精制机，分别使用三圆磨盘／三铜色矩形模块。
- `raw/processing-machine-portless-v5.png`、`raw/refining-machine-portless-v5.png` 再由内置image_gen真正编辑，移除全部凸接口、孔和连接框，保留完整直边柜身；没有程序擦绘或拉伸原画。
- 实际长条绘制提示词在 `prompts-long-v4.md`，无口编辑提示词在 `prompts-portless-v5.md`，每张输入图均明确登记。
- 对应无口PNG在 `png/`，最终WebP在 `public/art/workshop/`，文件名均为 `processing-machine-portless-v5`／`refining-machine-portless-v5`。PNG尺寸140×620／148×628，统一最近邻等比裁切，WebP质量70、Alpha100。
- 滚动带面复用真正独立绘制的 `belt-surface-v2`。`background-v1` 已按最新要求停用。所有旧背景、护栏、口套、转角、汇流与十字图只保留历史，不进入最终纹理请求或可见画面。

## 精确接口

最终元数据已按PM与集成者明确时点复制到 `src/content/workshop-visuals.json` 激活；旁备为 `workshop-visuals-portless-v5-candidate.json`，来源与裁切在 `registration-portless-v5.json`，可重复转换入口为 `export-portless-v5.mjs`。该转换入口默认只生成候选；运行激活与匹配helper接入由PM协调。

以下288高度、多条带和固定左中点均为历史布局参数，不能据此恢复运行布局；最新运行参数以活跃JSON和同源helper为准。原画来源、真实裁切边界和原图分辨率保持不变，各部位仅登记真实完整机壳边界和内部遮挡坐标，不存在烘焙口位或固定9孔。

动态连接Y由纯布局函数按配方输入数居中生成，中心距等于实际带宽，相邻带无间隙。当前进料偏好宽48、图标48，按bodyHeight/n限制：两材料宽48、Y136／184，9材料宽32、Y32..288。出料宽56、产品图标56；带面延伸到0／320，图标中心另留半尺寸防裁切，两侧外露等长。cover按大图标尺寸深入机壳，消除独立抖动露缝，表面纹理纵向铺满每条带面。参数已同步active／candidate和持久export脚本；不改原稿或PNG/WebP。图标仍复用canonical `public/wiki/icons/<ID>.webp`。

上一轮先改为左右各一片满高带面、原料固定从左中[0,160]按打乱顺序进入，材料／产品64／72；本轮用户再次否定固定中点，改为从左侧之外以随机高度滚入、可以同时多个。内部随机X造成闪现已重新打开并修订。tread真实逻辑宽／相位周期32、速度0.04保留，方形动画块铺满高度。新版layout与frame、active／candidate和producer／未执行compositor同步；原稿与PNG/WebP不需改画。

暂停／待料时进料图标全部隐藏，恢复运转再显示；该可见性不改变库存或配方用料。最终静态compositor源码已同步逐区域宽度／高度与带面相位，但按用户选择未执行。

## 审阅与未执行项

PM和独立审阅者已打开v5真实原稿，确认正俯视、封闭直边、无接口突出，原料／产品未烘焙在画内。最终PNG/WebP可直接进行普通图片审阅；真实Pixi运行和用户认可仍独立记录。

最终同源静态图生成器是 `compose-portless-v5.mjs`，导入 `src/view/workshop-layout.js` 的 `workshopSceneLayout`／`workshopMotionFrame`，以候选JSON和最终WebP生成1/9材料、两相位、等待、130px/320px证据。但该命令曾被自动审批拒绝，理由是未取得用户明确预览／运行检查授权，因此在该阻碍解决前未执行、未生成v5同源拼图。旧v2横机拼图不能替代最终证据。

PM随后向用户明确询问仅生成上述静态PNG的授权，用户回复「保持不运行」。因此该步骤按用户选择不执行，不再请求、代跑或换工具绕过；最终同源拼图没有生成，130px用途／双相位组合及真实运行保持未验收。代码和真实PNG/WebP接入已完成，不能把未验收写成通过。

没有执行测试、资源门禁、浏览器或游戏预览、语法检查、编译、推送。旧导出 `export-v2.mjs` 已改为仅写历史元数据，防止误激活取消方案。
