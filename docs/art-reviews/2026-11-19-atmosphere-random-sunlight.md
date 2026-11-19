# 随机飞鸟与阳光可见度返修独审 · 2026-11-19

结论：本轮静态图像与只读源码范围通过，无待退回项。阳光已清楚可辨，三条代表路线体现不同高度/斜率和左右两向；未验证真实动画或浏览器运行。

## 实际开图

使用最终纯pose与既有纹理新合成，未沿用上轮通过结论。实际查看320×568、390×844、414×896各地图顶部/底部滚动位置的阳光关闭、常态0.19、最大0.215、最小0.165四列对照。暖白光由当前视口左上斜向右下，左上/中部可见宽柔光束；最大值仍保留屋顶、草地和路径细节，无矩形边或整图洗白，门牌文字清楚。首屏与短屏下滚均成立。

实际查看390×844的A/B/C三组路线在4400/4900/5500/6200ms的联系图：A左→右且向下，B右→左且向上，C右→左近水平。身体尺度/朝向、真实四帧翼姿及地图上方覆盖正确；鸟穿过建筑轮廓时绘于建筑上。路线参数固定，不把示例静态图称为实际随机抽样或循环体验。

代表证据均在`assets/source/art/atmosphere-random-sunlight-review/`：

- `estate-390x844/sun-contact-scroll-0.png`：PM也实际打开的关/常态/最大/最小对照。
- `estate-320x568/sun-contact-scroll-187.png`：短屏滚动对照。
- `estate-414x896/sun-contact-scroll-0.png`：长屏覆盖与文字。
- `estate-390x844/route-{A,B,C}-contact-scroll-0.png`：三路线、两方向分镜。

保留6张阳光联系图、3张路线联系图、4张代表开关原图，共13张PNG；目录约11.62MiB。重复单图已移除，三手机完整纯pose/样本参数仍在各`poses.json`，用`individualImageRetained`标明保留情况。实际保留文件的精确hash清单见`final-evidence.json`；阳光像素差值仅为读图证据，见`sunlight-pixel-deltas.json`。

## 只读源码

最终`estate-atmosphere.js`只在pass改变时调用5次`Math.random()`，写入复用的routeSamples/flightRoute；每帧只读固定路线，未使用经济种子、世界数据或存档。随机起点覆盖视口上下安全边之间，终点纵移在±0.34地图宽范围内夹紧；编队间距0.035–0.055地图宽、弧0.028地图宽以内，方向按样本左右选择，Sprite横向镜像与路线方向一致。滚动只更新viewport，不修改本趟route，路线保持地图坐标。

亲读调用链，层级为背景→建筑→气氛→门牌→控件，证据摘录在`reviewed-layer-chain.txt`。本轮只改变两个光鸟模块；地图/画布接线、鸟/阳光纹理与全部既有地图资产的hash与接手基线相同。原3鸟固定池、4个Texture视图、可见累计时钟、隐藏/弹窗/开屏gate、visibility暂停、park/attach复用、晚到holder守卫、`destroy(false)`共享source保护继续保留。固定两个URL仍沿原pinned动画/Assets缓存；逐帧仅改Sprite属性并markDirty，无新增timer/RAF、逐帧随机、整页redraw或经济/存档修改。

| 最终候选文件 | SHA-256 |
| --- | --- |
| `src/view/estate-atmosphere.js` | `d57cf98797a645734c0434fa940df6bf3365f625cac6dffc1ec2369643c03ac3` |
| `src/view/estate-atmosphere-layout.js` | `554d269cb082e279dedc0ab59e2b5fd70241f80e3afa888927fe77380f8017c6` |

范围与限制：只执行静态图像合成、开图、像素与源码读取；没有游戏/Pixi/浏览器预览、测试、语法检查、运行检查或构建。图像采用Sharp/Pango、整数栅格及中立动件姿态，非GPU实际截图。后续新增植物层及其与最终光鸟的整图复核由对应所有者另交，不包含在本报告。当前独审所有权结束；上述两个候选后续改动触发对应复查。
