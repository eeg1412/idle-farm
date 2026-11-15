# 工坊机器与履带木质重绘

用户原话：「全部完成后：履带和机器，总觉得用机器风格怪怪的。重新绘制木头风格的机器和传送带。」前置无回退、边缘随机进料、出料不淡出、放大裁切机身代码已交付并由PM读实际执行链；未运行验证。现在开始素材重绘，不改变这些行为。

## 素材输出任务卡

- 负责人：复用 `/root/workshop_topdown_art`，本次是该代理上一版独立工坊机器与带面原画的直接风格重绘，连续成果物相关；不追加无关任务。
- 输入：用户木头风格要求；当前 `workshop-visuals.json`；原机器v5原稿、PNG／WebP及来源；`workshop-layout.js` 的消费格式。内置imagegen／farm-art-review规范和本卡相关权限。
- 最少阅读：上述文件、`.agents/skills/farm-art-review/SKILL.md`、系统imagegen技能和必要提示词reference。先view_image看实际本地参考，不能只读提示词。
- 所有权：仅新增 `assets/workshop/raw/*wood-v6*`、`assets/workshop/png/*wood-v6*`、`assets/workshop/prompts-wood-v6.md`、`registration-wood-v6.json`、`export-wood-v6.mjs`、`HANDOFF-wood-v6.md`、`workshop-visuals-wood-v6-candidate.json`，及 `public/art/workshop/*wood-v6*.webp`。活跃 `src/content/workshop-visuals.json` 在源图／成品交付并经PM阅读后再转交激活。禁止改其他代理代码或旧源素材。
- 做法：使用内置image_gen真正重画加工机、精制机与木板履带三个独立素材；不能滤色旧金属图、程序绘图、CLI替代或整线烘焙。机器仍严格正俯视、纵向长条、完整不突口的直边柜身，不含材料、产品、传送带、地面或阴影。木材为主体，足以区分两工位；不能重新引入金属工业机风格。
- 带面：独立可平铺的木板纹理，竖向木板缝、横向右行；不带护栏／边框／突出接口／箭头／图标／阴影，不能把固定端点画进滚动纹理。机器透明，带面不透明；保留原稿、真正生成位置、输入图和精确提示词、裁切／统一尺度来源。
- 接口冻结：stage320²，机身可见高度400，中心X160/top-40/bottom360，按真原稿等比计算width和bodyEdges／placement／cover；图标88／96、原随机组／入口X=-44／右行／alpha1／无背景／无回退保持。机器整体由已有stage mask裁切，带面logicalWidth与period均32，speed.04；纹理尺寸登记真实值，不要求拉伸旧机器适配。最终只需要machine和tread两类纹理源。
- 成果物：三张真实原稿、对应持久PNG及WebP70／Alpha100、候选JSON、登记／提示词／只做转换的可持续producer与交接。原v5及rubber纹理保留历史，不覆盖不伪写来源。
- 权限：允许绘图工具生成、普通源图/PNG/WebP读取、常规裁切转换与素材生产；禁止测试、预览、静态拼图、语法/运行检查、资源门、编译及推送。用户「保持不运行」仍有效，不能执行旧compositor。生成本身不是运行验收。
- 共享所有权：上轮workshop_motion已结束6文件所有权。PM维护全部规范／反馈／任务卡，独立审阅者仅写新报告。你不是独自在代码库工作，不得覆盖别人的修改。

## 后续审阅与整合

待原画与成品齐备后，再由PM指派独立素材审阅，逐项打开精确source／PNG／WebP，记录木质风格、正俯视、无口、无边、独立分层、透明轮廓和滚动纹理来源。只看直接图片，不运行拼图或程序验证；实际130px组合及真实动画观感缺授权时保持未验收。PM阅读candidate→实际loader／renderer接口并协调激活；不能以素材存在或代理报告结案。

当前：三张内置image_gen原稿、三组PNG／WebP及候选、登记／提示词／producer／HANDOFF已交付。PM已实际打开三原稿与三最终WebP，并阅读candidate→producer→registration及既有loader／renderer消费链；独立 `/root/workshop_topdown_review` 同时直接看完全部三组PNG／WebP，报告文件所有权为 `docs/art-reviews/2026-11-16-workshop-wood.md`。源图／成品条件通过，无具体退回项；130px组合／真实运行／用户认可未验。

PM将活跃 `src/content/workshop-visuals.json` 唯一所有权转给素材所有者后，已完成候选原样激活，所有资源与config所有权均交回PM。PM实际阅读最终active version6／三wood路径／层序与参数，独立审图报告已交付并放权。公开图为 `public/art/workshop/{processing-machine,refining-machine,belt-surface}-wood-v6.webp`。机器真实body宽101.678657／95.936255、400高，保持等比；带面104×52，source裁314,256,104,52，逻辑32×16／period32。输入／输出分别由x0..160和160..320的mask限侧，cover不必按input<output排序；这只是源路径说明，不算真实遮挡验收。未执行任何测试、预览、静态合成、语法或运行检查、资源门、编译或推送；没有额外待答授权问题。
