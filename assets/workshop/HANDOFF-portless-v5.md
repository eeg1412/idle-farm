# 最终交接：无突出接口长条机身、无边传送带

最终用户要求是居中的纵向长条机器，两侧平直、没有凸出的进料口或出料口；多条原料水平带直接接左侧机身，右中央产品带与左侧外露长度相同；传送带没有护栏或边框。机器内不绘入材料或产品。

## 已完成图片

- `raw/processing-machine-long-v4.png` 为内置image_gen新绘长条加工机；`raw/refining-machine-long-v4.png` 为内置image_gen基于该新布局绘制的精制机，分别使用三圆磨盘／三铜色矩形模块。
- `raw/processing-machine-portless-v5.png`、`raw/refining-machine-portless-v5.png` 再由内置image_gen真正编辑，移除全部凸接口、孔和连接框，保留完整直边柜身；没有程序擦绘或拉伸原画。
- 实际长条绘制提示词在 `prompts-long-v4.md`，无口编辑提示词在 `prompts-portless-v5.md`，每张输入图均明确登记。
- 对应无口PNG在 `png/`，最终WebP在 `public/art/workshop/`，文件名均为 `processing-machine-portless-v5`／`refining-machine-portless-v5`。PNG尺寸140×620／148×628，统一最近邻等比裁切，WebP质量70、Alpha100。
- 背景复用 `background-v1`，滚动带面复用真正独立绘制的 `belt-surface-v2`。所有旧护栏、口套、转角、汇流与十字图只保留历史，不进入最终纹理请求或可见画面。

## 精确接口

最终元数据已按PM与集成者明确时点复制到 `src/content/workshop-visuals.json` 激活；旁备为 `workshop-visuals-portless-v5-candidate.json`，来源与裁切在 `registration-portless-v5.json`，可重复转换入口为 `export-portless-v5.mjs`。该转换入口默认只生成候选；运行激活与匹配helper接入由PM协调。

机身真实可见高度均为288，Y范围16..304。加工机真实宽64.285714，左右边127.857143／192.142857；精制机宽66.212219，左右边126.893891／193.106109，均关于X=160对称。28px材料遮挡中心位于左边内20px，30px产品出现起点位于右边内20px。各部位仅登记真实完整机壳边界和内部遮挡坐标，不存在烘焙口位或固定9孔。

动态连接Y由纯布局函数按配方输入数居中生成，中心距等于实际带宽，相邻带无间隙。当前进料偏好宽48、图标48，按bodyHeight/n限制：两材料宽48、Y136／184，9材料宽32、Y32..288。出料宽56、产品图标56；带面延伸到0／320，图标中心另留半尺寸防裁切，两侧外露等长。cover按大图标尺寸深入机壳，消除独立抖动露缝，表面纹理纵向铺满每条带面。参数已同步active／candidate和持久export脚本；不改原稿或PNG/WebP。图标仍复用canonical `public/wiki/icons/<ID>.webp`。

上述多带参数已被最新要求取代：现在左右各一片满高带面，原料从左中[0,160]按稳定打乱顺序逐个进入，右中央出料。材料／产品图标64／72，分侧mask遮挡；首次从本展示会话0时点发料、首材入机后出料，暂停隐藏并冻结。tread真实逻辑宽／相位周期32、速度0.04，保留源码证实右行的正位移；方形动画块铺满高度。详情以docs/tasks/2026-11-15-workshop-full-height-stream.md为准；原稿与PNG/WebP均未改。

暂停／待料时进料图标全部隐藏，恢复运转再显示；该可见性不改变库存或配方用料。最终静态compositor源码已同步逐区域宽度／高度与带面相位，但按用户选择未执行。

## 审阅与未执行项

PM和独立审阅者已打开v5真实原稿，确认正俯视、封闭直边、无接口突出，原料／产品未烘焙在画内。最终PNG/WebP可直接进行普通图片审阅；真实Pixi运行和用户认可仍独立记录。

最终同源静态图生成器是 `compose-portless-v5.mjs`，导入 `src/view/workshop-layout.js` 的 `workshopSceneLayout`／`workshopMotionFrame`，以候选JSON和最终WebP生成1/9材料、两相位、等待、130px/320px证据。但该命令曾被自动审批拒绝，理由是未取得用户明确预览／运行检查授权，因此在该阻碍解决前未执行、未生成v5同源拼图。旧v2横机拼图不能替代最终证据。

PM随后向用户明确询问仅生成上述静态PNG的授权，用户回复「保持不运行」。因此该步骤按用户选择不执行，不再请求、代跑或换工具绕过；最终同源拼图没有生成，130px用途／双相位组合及真实运行保持未验收。代码和真实PNG/WebP接入已完成，不能把未验收写成通过。

没有执行测试、资源门禁、浏览器或游戏预览、语法检查、编译、推送。旧导出 `export-v2.mjs` 已改为仅写历史元数据，防止误激活取消方案。
