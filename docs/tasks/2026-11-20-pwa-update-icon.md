# 游戏内PWA更新提示与新绘图标

用户当前授权：加入检测新版本、游戏自定义UI提示更新功能；重绘安装图标，完成发布原Sites。不包含此前只读排查的启动卡死修复，不加入自动无确认强刷，不改管理员/玩法数值/存档格式。当前GitHub main=e728089，源码与原Sites v80运行代码相同，仅缺3个历史导出脚本。GitHub不push，本地main实现；Sites独立worktree源helper打开原appgprj_6af6f5cdb9c881918454442c453d2d2d，保持原公开域名。PM负责同步同运行源码、最终唯一build及发布。

## 行为边界

| 入口 | 条件 | 允许改变 | 必须保留 | 证据 |
|---|---|---|---|---|
| 启动/回前台/长会话检查 | 生产环境且SW支持 | 检测就绪更新，安全时用现有Pixi弹窗提示 | 首次安装不误报，不阻断启动/离线游戏，不打断业务弹窗，无浏览器原生confirm | 源码调用链独审 |
| 更新提示→更新游戏 | 新版已准备好，玩家同意 | 串行真实保存成功后接管新版并仅重载一次 | 保存失败/版本已失效不重载，不清存档缓存；5秒保存频率与经济规则原样 | 协调器→saveQueue→commit→controllerchange/reload源码 |
| 稍后/关闭提示 | 用户选择暂不更新 | 本次会话同一更新不反复打扰，新版本仍可再提示 | 不自动强刷，不丢当前业务弹窗 | pending/dismiss去重源读 |
| 系统安装图标 | app manifest/Apple/favicon | 内置绘图真新绘，版本化路径替换所有图标 | manifest id/start_url/scope/name不改，单画布游戏UI，源图身份为庄园像素主题 | 源/小图/遮罩审图 |

## 所有权

新建干净上下文，互斥文件，不继承无关任务。PM独占本卡、docs/ui.md、docs/assets.md及feedback(只短记录)，Sites/git/依赖与最终构建。审图合成/截图放workspace外部临时pwa-review-temporary，不提交重复证据或大图板。
- pwa_update_flow：src/main.js、src/platform/site-service-worker.js、新src/platform/pwa-update.js、src/view/canvas-ui.js(仅更新提示)。这是一个不可拆耦合输出，只此owner修改。源输入main的saveForeground/commit/saveQueue、SW现有install/activate/cache和canvas Dialog生命周期。不要改loading/Worker/IDB超时等此前诊断项。
- pwa_icon_art：assets/source/art/pwa-icon-v2/original.png与prompt.txt(普通图标必要原源)，以及maskable-original.png与maskable.prompt.txt(经PM追加的独立遮罩安全版本源)、public/icons新v2文件、public/favicon.ico、public/manifest.webmanifest、index.html、新scripts/export-pwa-icons-v2.mjs。画一张1024方图，再导32/48/180/192/512/独立maskable512；必须真绘图不能旧建筑裁切缩小。版本化icon src并更新HTML；manifest id等不改。旧不用六PNG可删除，源原图必要追溯保留；无重复审图证据入repo。
- pwa_update_review：只读更新最终源差异与接口；独占docs/reviews/2026-11-20-pwa-update.md短报告，不测试/试运行。
- pwa_icon_review：只读旧图参照/新源/六成品及maskable，独占docs/art-reviews/2026-11-20-pwa-icon-v2.md短报告，静态图板只写外部临时目录。看32/48辨识度、512构图与中心安全圆，不能用文件/hash替视觉；实际安装图标刷新受浏览器/系统策略限制，不能承诺立刻换图。

## 更新实现约束

不再安装完成即无条件skipWaiting。就绪更新等待玩家确认；首次安装自然激活；message按协议请求激活，activate现有claim/缓存清理保持适用语义。协调器接入waiting/updatefound/statechange与controllerchange；首装不重载、接受后监听先于消息，不重复reload；处理其它标签接管/worker失效，不把正常离线/更新检查失败显示成阻断错误。检查启动、visibility回前台及适度长会话节流，不每帧查；同检查去重。可直接register(...,{updateViaCache:'none'})以检查SW脚本，不清除IndexedDB或广泛重置缓存。

提示延迟到开屏完成且world非busy、没有业务弹窗/菜单/提交时显示，避免覆盖原弹窗父链。短文案，通用游戏Dialog，按钮‘稍后’、‘更新游戏’，失败时简短行内反馈。不要向UI写解释SW机制的长文；保存/接管进行中防连点、防关闭导致重复提交，不改普通Dialog/对白规则。先读真实现有API，再决定最小新增调用。保存必须基于真实saveQueue事务结果，不能把吞错误的undefined当成功；现有saveForeground如需补布尔返回，只作不改变原调用表现的最小更改。存档未ready/保存冲突/失败则保留进度不reload。

## 绘图约束

符合现有精细日式像素庄园画风，图标为独立易辨识徽记，非一整幅小场景。建议暖金麦穗环抱橙红屋顶/亮窗庄园门楼，深绿底，主体大且轮廓清楚，少元素，无字、无水印。1024完整不透明方图供系统裁切，不烘焙外部黑角；关键房屋/麦穗留maskable中央安全圆，不靠边。内置image_gen每幅独立，不能脚本画房屋/用旧operations裁切；只做规格转换/缩放及必要背景延展。maskable与Apple不透明，小尺寸重新看而非仅验尺寸。新路径如manor-v2-192.png/manor-v2-512.png/manor-v2-maskable-512.png，favicon.ico可HTML加v2查询避免旧缓存。原manifest id已固定idle-manor，不能改造成新app。

## 权限与交付

未授权测试/冒烟/预览/语法或运行时检查，不安装浏览器，不试build。图片生成、图像导出/实际查看和普通源读是交付；全部owner/简短记录冻结后仅PM最终生产构建。不增加大审图文件到项目。不推GitHub；仅当前发布授权支持Sites源码helper提交保存部署。报告源代码确认和未实机验证限制，不冒称全部浏览器更新/系统icon已验证。

图标阶段：内置绘图真实原源实际1254×1254，保留原字节并据实记录，不为了名义1024覆盖原图。普通6规格完成，小32/48可辨；初maskable程序扩底出现方块纹理接缝，PM明确退回不用程序柔化修画，新增独立maskable原生绘图编辑源/提示词，保持同主体身份、原生背景延展，导出仅缩放。临时图板仍不入repo。

PM亲读首版更新四文件发现跨标签激活已观察候选后UI误失效，已仅重授pwa-update.js给同owner定向修正，独审原报告对应补审。其它文件与新图均已冻；此修改仍属更新提示，不改普通导航/存档/游戏。

## 最终冻结

四个owner全部冻结释放。PM亲读更新四文件完整diff和新协调器(含跨标签定点修)，及两份最终短审阅报告；真实IDB事务→成功bool→监听先安装→显式消息→目标controller→单reload链确认，当前普通存档5秒间隔/经济/开屏未改。新原生普通及maskable源均实际1254方，6规格/ICO及引用已齐；32/48识别和安全圆通过，初maskable接缝已图工具原生扩展闭环。PM亲看新源和最终maskable512；大图板全部在repo外临时目录，未增重复审图图集。

只做源码/素材静态审阅，未测试/预览/模块模拟/语法检查/实机安装或SW升级。首部署旧页面不能追溯显示新UI，需先加载本次客户端；操作系统安装图标仍可能要求确认刷新，不能保证游戏强制改桌面。全部输入冻结后PM唯一生产build，再把同精确运行输入/输出同步已打开的原Sites工作树提交部署，不推GitHub。

最终生产构建退出0：820模块、Vite9.84秒及离线worker生成完成，仅原大chunk提示。构建后只补本条交付记录，未改运行输入。当前main实现本地提交保留；将精确main源码(原Sites身份文件保留)及同构建dist同步原Sites工作树，用官方helper打包保存部署。
