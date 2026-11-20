# 地图、矿洞按钮与精制形象

**后续纠错：v82精制人物与男CG被用户判定不合格，本文末的对应人物冻结/通过结论不再有效。** 原男仅改头部视线却被转成纯正面躯干，男女共用托盘动作也被否决；新来源及验收见[姿态纠正卡](2026-11-20-refining-pose-correction.md)。无关的矿洞按钮、飞鸟、研究楼与精制背景不受影响。

本轮保留已有 PWA 更新功能、图标、经营与对白行为；只实现以下反馈。未获测试/预览许可，不运行测试、冒烟、语法检查、试编译或运行预览。全部交付后 PM 最终生产编译并发布原 Sites。

|反馈|入口和条件|允许变化|保留相邻行为|完成证据|
|---|---|---|---|---|
|1|矿洞升级、增加槽位，普通/紧凑/详情/批量|删除按钮圆点，报价允许时黄色可点，否则淡色禁用|价格、限额、升级弹窗连点和其它设施|限定 diff 与报价路径|
|2|开屏完成后首次可见大地图|鸟纹理就绪后立即启动第一群，不被下载耗时错过；后续随机|离屏/隐藏/弹窗暂停，不改存档和 RNG|加载与时钟源码路径|
|3|大地图鸟跨过建筑名字|鸟层位于名字、提示和建筑上方，不抢输入|HUD、导航、点击命中|挂载顺序|
|4|研究建筑|原生重绘含大烧杯，液体冒泡|建筑位置、地图其它建筑、名字和玩法|源图/运行资源/实际尺寸静态审图|
|5|精制页男女管理员|重绘农矿兼用背景与男女四表情，保持外貌衣着，改手持物，男看玩家|表情规则、角色性格、对白交互|原图/透明成品/静态组合审图|
|追加|精制男管理员描述及男性开屏CG|描述、CG与新手持物/农矿精制场景一致|外貌衣着和性格、其它角色及开屏选择/计时|对应短描述和CG审图|
|追加澄清|立绘源与页面裁切|男女各四表情必须原生完整全身源，更新对应canonical PNG，再裁页面胸像|原全套衣装、下装鞋靴、页面原有脸部尺度；不可只交半身原稿|全身源→8 canonical PNG→8 runtime WebP可追溯链与独立实开审图|

## 所有权与交接

全部新建干净上下文（fork_turns:none），目标均为本轮独立成果物。PM拥有本卡、反馈记录、发布及最终编译；生成证据/临时合成放仓库外 `/workspace/scratch/a46f8d1a2380/map-refining-review/`，不提交大型图板。

|owner|目标/独占路径|交接|
|---|---|---|
|mine_buttons|`src/view/production-pages.js`|矿洞所有按钮报价路径与diff|
|map_runtime|`src/view/estate-map.js`, `estate-atmosphere.js`, `estate-atmosphere-layout.js`, `canvas-ui.js`, `loading-screen.js`仅精制男CG版本, 新研究动画模块, `scripts/build-offline.mjs`|接研究元数据，负责精制肖像/CG缓存版本局部更新|
|research_art|`public/art/estate/research{,-motion}.webp`, `src/content/estate-research-visuals.json`, `assets/source/art/research-v2/`|536×320建筑；四帧独立透明泡泡图集；元数据包含实际位置、帧尺寸、时长、footprint|
|refining_art|`public/art/managers/portraits/refining/`, `public/art/managers/backgrounds/refining.webp`, `src/content/manager-portraits.json` 仅refining, `assets/source/art/refining-v3/`, `docs/Pixel-Characters-Complete-Pack/立绘/08_精制管理/`仅本男女四表情PNG|背景+男女全身四表情及对应胸像；共享canvas源码改动交map_runtime|
|refining_cg|`public/art/loading/scenes/refining-male.webp`, `assets/source/art/refining-male-cg-v2/`, `src/view/manager-dialogue.js` 仅精制男bio, 人物设定md仅精制男女手持物描述, `src/content/loading-scenes.json`仅refining-male来源/真实脸框|CG和短描述；角色外貌服装保留；CG版本交map_runtime|
|art_review|`docs/art-reviews/2026-11-20-map-refining.md`|实际看源图/成品及尺寸静态合成，按项退回；不运行游戏|

文件所有权只授权表内行为。扩大范围前先向 PM 报告。研究图集接口由 research_art 与 map_runtime 先约定，其他文件不交叉写。运行体验未验证须明确记录，静态审图不冒充运行验收。

实际代理映射：mine_buttons→`/root/mine_buttons_v2`（已交付、释放）；map_runtime→`/root/map_runtime_v2`；research_art→`/root/research_art_v2`；refining_art→`/root/refining_art_v3`（已释放 manager-page.js，背景版本由 canvas 所有者接入）；refining_cg→`/root/refining_cg_v2`（已交付、释放）；art_review→`/root/map_refining_art_review`。均为本轮新建上下文。

冻结研究接口：base 为 assetName/canvas/footprint；bubbles 为 assetName/frameSize/frameCount=4/frameSeconds=0.16/position/animationBBox。图集横排四格，position 为536×320建筑坐标系内动画帧左上，animationBBox 为四帧像素并集的建筑坐标。具体数值按新图实测。

后续所有权交接：refining_cg 交付释放后，`角色设定与性格.md` 转交 refining_art_v3，限精制男女外观/胸前托盘/男性正视及开头一条完整全身原图→页面裁切说明。最终8张完整PNG放 `docs/Pixel-Characters-Complete-Pack/立绘/08_精制管理/`，不能只存生成源目录。

实现路径已冻结：矿洞入口统一消费既有真实报价；鸟在可选 pinned 加载入口提前取图，图集未就绪时不累计首飞时间，开屏完成且地图 active 后首飞；地图子层次为背景→建筑→名字/控制→鸟，全局 HUD/菜单/弹窗仍更高。研究动画仅更新独立泡泡帧，同尺度 holder 复用，暂停时不累计不可见时间，销毁只释放自身 Texture 视图。经济数值、存档、真实 RNG、其它建筑与原 PWA 更新流程不变。

交付冻结：研究楼/背景/CG与精制男女完整全身四表情、8张canonical PNG及对应8张页面WebP全部完成，RF-01已由原生全身新源与紧裁修复并独立静态复审通过。全身PNG保存于用户指定立绘目录，角色设定文档同步；页面裁切链记录于export-manifest.json。源码差异已按行为边界阅读；没有运行测试、预览或游戏验证。最终生产编译与原Sites发布由PM接续，发布结果以Sites版本记录为准。
