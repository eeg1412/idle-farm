# 认可图接入与地图气氛独审 · 2026-11-19

结论：最终候选在本轮**静态图像与只读源码范围通过**，无未闭环缺陷。曾指出鸟整帧约32px时主体仅18–22px，已由实现者改为41–46px帧；最终主体约24–33px可辨。所有权结束，后续修改触发对应项复查。

## 已认可图与开屏

实际打开用户认可的底图816×1926与群像1024×1536 RGBA，再开最终WebP对应静态合成。群像当前PNG与认可稿字节相同；导出保持1024×1536，无旧padding，源/成品解码Alpha逐像素差异为0（0–254，109465个全透明像素），未清除隐藏RGB。底图成品保持816×1926、WebP90。

纯`loadingLayout`配合Sharp/Pango合成并实际查看15项：320×568、320×640、390×844、414×896各普通/失败/存档问题，以及390×844安全区top44/bottom34三状态。22脸清楚、近景大小成立；标题、bar、失败/存档按钮无盖脸。群像下缘延至视口外1px，无屏中悬空截线；允许的肩腿边界裁切未作退回条件。安全区内控件均可见。关键证据为`loading/problem-320x568.png`及`loading/{normal,failed,problem}-contact.png`；全部尺寸/标签栅格/纯几何见`loading/measurements.json`。背景、LOGO与`loading-screen.js`保持原字节，未改1秒完整显示、300ms淡出及重试状态机。

## 地图、鸟与暖阳

实际打开原生鸟2×2源、原生阳光、两项最终WebP、四帧正常底色与缩图。鸟为四个原生不同翼姿：上举、中位下拍、下拍、回收；头/躯干/尾部的姿态与尺度连续，未见断翼/分离肢体、邻格主体或整鸟旋转替代。裁切为四个等大576方格，再nearest缩至128方帧，躯干锚点一致。41–46px整帧对应alpha64主体宽约24–33px，最终手机缩图中鸟形可辨。证据`bird-runtime-size.png`；额外24/30/36px画布缩图为`bird-frames-and-canvas-sizes.png`，后者画布宽不等于主体宽。

阳光成品512×1024真RGBA，Alpha0–252、186948个全透明像素、无255全不透明像素。原生低Alpha杂像素未当作黑底退回；正常低透明合成无可见矩形边。按最终纯pose合成390×844、scroll0/76、4400/4900/5500/6200ms八张分镜，以及约40392ms最大阳光alpha0.052对照，地图仅轻微变暖，未洗白建筑或门牌。证据`estate/poses-scroll-{0,76}-contact.png`与`estate/max-sunlight-comparison.png`；完整pose见`estate/poses.json`。

固定site几何块与基线完全一致；24个既有资产对照仅预期底图改变，建筑、动件、门牌及开屏背景/LOGO均未改。最终成品按原几何叠图与认可地景相容；气氛层在建筑上、门牌/控件下，现有viewport mask保留。

## 只读接入链

已亲读最终`canvas-ui.js`、`estate-map.js`、`estate-atmosphere.js`、纯layout、loading tasks及offline脚本：仅地图存在、开屏`complete`且无hidden/modal/pendingModal/busy/navigationMenu时推进装饰；首次活跃才以原`loadAnimationImage`请求固定两个URL，沿Assets与pinned缓存。开屏结束后任务注册表已finish，装饰失败不会重新阻塞开屏。

3只固定Sprite/4个切片；90ms换翼、单只2450ms、190ms错开、首次4200ms、19200ms间隔。可见累计时钟在非活跃、park/attach及visibilitychange重置锚点，额外80ms上限避免补跑。等尺寸地图重建park/attach复用同一holder，离开/尺寸改变或未采纳时销毁；晚到闭包检查holder已销毁/disposed，不重新挂载。切片`destroy(false)`不销毁共享source。逐帧复用pose对象，仅改少量Sprite属性并markDirty，无新增timer/RAF、整页redraw、逐帧Text/Graphics重画。阳光专属source用linear、鸟nearest；底图URL v7与离线版本相符，新增`atmosphere/*?game=1&v=1`被同一路径派生覆盖。

精确文件SHA-256、独立Alpha读取、保留资产/几何对照见`assets/source/art/approved-atmosphere-review/final-evidence.json`。关键发布资源：

| 文件 | SHA-256 |
| --- | --- |
| 群像WebP | `8ecdcbbf99395c62612fb0f34b78c6896a75b329a0ea737caa6bc9f99d82d197` |
| 地图WebP | `e7c2ce1e9f4d71ab7ad5c6b2928012f227c22c7a0978bd805062915508cda803` |
| 鸟WebP | `f4cf20c207ba073445c2f0b935acbd90ffd57c8d2c78a04292cd00bd45e7e9e5` |
| 阳光WebP | `13ba3cb7ecdd0ca2a46bf6d0684ef40da8964e54580db70d4a5dc666d64dbc9b` |

限制：只执行图片合成、像素读取与源码阅读；未运行游戏/Pixi/浏览器、测试、语法检查、编译或push。静态图使用Sharp/Pango近似系统字体、整数图像栅格及中立动件姿态，不构成GPU渲染、真实飞行动画、实际点击或运行体验通过。光鸟及开屏近景属于预期画面变化，源码范围未见玩法/数值/存档改动。
