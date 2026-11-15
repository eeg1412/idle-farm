# 畜牧产物图标复用与接地修正

## 用户输入与完成条件

1. 动画产物直接使用已有 `public/wiki/icons/<ID>.webp`，不另画、不使用另一份产品图。
2. 动物阴影加深，按真实站立脚印调整大小与位置；不能移动动物帧来迁就影子。
3. 肉用产物显示在成熟牲畜落脚位置；收获淡出跨阶段边界时保持该位置，不跳到幼年脚点。
4. 全部畜牧产物有独立程序椭圆阴影，随产品显隐同步，不烘焙进图标。

用户中途追加：**仓库图中的牛奶改成奶桶**。仅 `L02` 撤销保留旧奶壶的限制，由同一资产所有者复用现有奶桶原素材，导出为 canonical `public/wiki/icons/L02.webp` 并登记源图／导出链。仓库和动画仍共用这一张，不另设动画专用奶桶。其余 ID 保留原有产出图，先更新 L02 后再生成其 bounds／来源记录。

原有 9 秒保底、三期均分、最后 3 秒转换、300ms smoothstep、4 帧 idle 及经济事件保持。用户反馈重新打开相应视觉项，旧编译／静态验收不关闭新问题。

## 冻结接口

- 运行登记每 ID 保留 `stages`、`slaughter`、`grounding`，新增 `product: { icon: ID, bounds: {x,y,width,height} }`。bounds 是原有 96px 图标可见 Alpha 的内容区域，用于将可见主体底边对齐地面，不把纹理透明边距当脚点。
- 动物源图注册点与 `fixedGround: [138,270]` 不变。阶段 `grounding: {x,y,radiusX,radiusY}` 改为最终帧站立脚印对应的场景几何，位置可以不等于注册原点；同阶段 idle 固定，不逐帧测量。
- 动画加载器直接以 `./wiki/icons/<ID>.webp?game=1` 加载产物，与仓库使用同 URL；接受 96px，而非旧独立产品的 128px。
- 肉品落点取成熟阶段 grounding 的 `(x,y)`，跨收获淡出保持；附属产物仍在牲畜附近、底边接地。产品可见主体最长边约 72px，按内容 bounds 定位。
- 动物阴影填充 Alpha 调整为 0.45，中心采用真实地面坐标，不保留旧 `y+3` 偏移；产品阴影 Alpha 0.36，半径按产品可见宽度，几何恒定，分别乘 `animalAlpha`／`productAlpha`。

## ASSET-CONTRACT：生产元数据与导出

- 所有者：`pixel_livestock_art`。你不是独自在仓库工作，保留其他修改。
- 输入：当前导出器、layout／atlas、已发布20阶段首帧、现有仓库图标及以上接口。只读相关规范，不重读经济和UI。
- 可改：`scripts/export-livestock-animation.mjs`、`scripts/check-facility-art.mjs`、`assets/livestock/layout.json`／生成登记和分镜总览、`src/content/livestock-visuals.json`、该导出器生成文件。
- 追加所有权：`public/wiki/icons/L02.webp`、L02 必要独立源 PNG 与来源登记；若必须修改公共物品导出脚本，先向 PM 交具体文件及最小方案，再扩展所有权。仅 L02 可覆盖原仓库图。
- L02 具体持久方案已由 PM 接收并冻结：`assets/source/items/overrides/L02.png` 为复用现有奶桶的规范 96px 源 PNG，`assets/source/items/overrides.json` 显式映射 ID；同一 owner 修改 `scripts/export-item-icons.py` 在旧图集正常导出后消费覆盖。旧 `L01-IL05.png` 奶壶格保留历史，其他 ID 不改。本轮无需执行全量物品导出来验证。
- 输出：实际消费的图标内容 bounds 与阶段脚印 grounding；停止把原画 productCell 作为动画产物来源，保留旧稿溯源；正式构建检查 canonical 图标身份、规格与生成登记，不再要求独立128产品。生成总览也应复用原产出图。
- 方法：生产导出时只按阶段首帧的真实支撑脚区域登记静态脚印，不按每帧 bbox 重新定位，不改变动物像素。读取图标内容 bounds 属于生成定位数据，禁止追加逐帧质量扫描或独立验证。
- 可执行正常 `npm run art:livestock` 资源转换；不测试、预览、试编译或运行检查，只有PM最终构建。

## RENDER：加载和程序地面层

- 所有者：`livestock_render_fix`。你不是独自在仓库工作，保留其他修改。
- 输入：`src/view/livestock-animation.js`，`canvas-ui.js` 中 `loadLivestockTextures()` 与对应测试源码，以上冻结接口。
- 可改：这两个运行文件和 `tests/livestock-animation.test.js`。不改素材、JSON、检查器、经济数据和文档。
- 输出：直接复用仓库图标；更深且贴脚的动物阴影；肉品放到成熟落脚点；所有产物独立椭圆阴影；按可见主体 bounds 处理透明边距，跨阶段收获淡出不跳位；生命周期和减弱动效保持。
- 仅更新必要测试源码，不运行测试／预览／检查／构建。接口不足先报PM。

## DOCS：技能与反馈

- 所有者：`pixel_style_contract`。你不是独自在仓库工作，保留其他修改。
- 输入：用户4项反馈、以上接口、相关畜牧文档和素材验收技能；不读全部项目。
- 可改：`AGENTS.md` 畜牧条目；牲畜 skill／delivery；素材验收 skill 的畜牧用途段；`docs/assets.md`、`docs/development.md` 畜牧段、`docs/ui/pages/fields.md`、`docs/feedback-checklist.md`。
- 输出：撤销“另画独立动画产品”的旧规定，动画与仓库共用原物品图；动物／产品阴影及肉品落点契约；反馈逐项重新打开并跟随真实交付。旧原稿可留作历史，不改历史验收报告为已验证新效果。
- 不生成图片、不改运行代码或导出数据、不运行任何验证；全部交齐后PM最终编译，禁止提交／推送。

## PM整合

PM 阅读实际路径、元数据和静态源图，整合三份交付后执行最终 `npm run build`。没有测试／浏览器预览授权，不把源代码、分镜或最终编译当作新视觉效果已获验收。

### 实际交付

- RENDER 已交付两个运行文件与回归测试源码。PM 已读 canonical 同 URL／96px 加载、bounds 内容底中心定位、固定成熟肉品落点、两个独立程序椭圆及对应 Alpha 路径；idle 更新未移动或缩放动物。
- ASSET 已交付 10 项 canonical product 登记和 20 阶段真实脚印。PM 已读实际导出器、layout／运行 JSON 与构建资源门；`fixedGround` 和动物原变换保留，阴影几何按首帧支撑脚登记。阶段显式写 `supportBandHeight` 与 `supportMaterial`，不依赖固定 ID 推断；历史 `productCell` 可选且未消费。
- L02 透明奶桶源和 canonical WebP 已交付；PM 实际看过新奶桶 PNG、canonical 产品总览及蛋鸡／水牛／成熟黑猪的脚印分镜，并读 `apply_icon_overrides()` 的常规导出覆盖路径。仅牛奶图标变更，其余仓库图继续复用。
- 规范、牲畜／素材验收技能与反馈已交齐。旧独立动画产品是历史资源，不再是新增牲畜的必交项或动画消费来源。
- 所有交付齐备后 PM 执行本轮最终 `npm run build`，退出码 0：通过 88 个设施、68 种作物完整四期、10 种牲畜 80 帧及 canonical 图标／bounds／脚印契约检查，完成 Wiki、Vite 和离线构建，输出 `dist/`。
- 未运行独立测试、浏览器预览或额外逐帧扫描；阴影实际深浅、真实循环接缝及画布视觉仍未验收。未提交、未推送 GitHub。
