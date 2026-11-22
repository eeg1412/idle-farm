# 订单中心运行画面验收（RV-1）

2026-11-22。按[订单审计修正任务卡](../tasks/2026-11-22-order-audit-fixes.md)「RV-1 范围」补[订单中心素材审阅](2026-11-22-order-center.md)「运行验收状态」中的未验证项。证据图仅本地保存。

## 环境与方法

- 用户授权本次为采集运行证据启动 `npm run dev`（实际以 `npx vite --port 5199 --strictPort --host 127.0.0.1` 启动，`mode` 为 `development`）并用浏览器截图。未运行测试、`art:check`、构建或其他检查脚本。
- 浏览器为本机 Chrome 157 无头模式（`--headless=new`），经 Chrome DevTools Protocol 设定视口（`mobile: true`，deviceScaleFactor 1）、派发鼠标事件并截图。视口为 320×693、390×844、414×896。
- 存档为开发数据库 `idle-farm-v7-development` 的全新档。在 `/#/settings` 连点标题「设置」11 下发放全部解锁与 1T 金币；此后经现有界面购地、增设工位、播种与选配方，靠真实生产入库生成订单，未改存档、未调时钟。
- 订单来源：首件乡村面包完工生成首单（乡村面包 ×11，未接受）；焦糖饼干、草莓挞入库后候选达 3 种，替换为草莓挞 ×11（固定报酬 1.33M），接受后等待真实生产补足至 12 件，得到可交付锁定单，再实际交付。
- 本轮采集期间工作区另有天气任务的未提交改动。约 21:58 起 Vite 报 `src/view/estate-weather.js` 引用不存在的 `./estate-animal-clouds.js`，页面暂时无法加载，该模块补齐后恢复，开发存档保留；送礼后又出现一次整页热重载。证据反映采集时刻的工作区，非固定提交版本。

## 逐项结论

| # | 验收项 | 结论 | 证据与说明 |
| --- | --- | --- | --- |
| 1 | 大地图订单中心位置与周边 | 通过 | 三档宽度一致：建筑在主路右侧、田地下方、鱼塘上方；矿洞在左下方，不与订单中心相邻遮挡。建筑与田地门牌水平不重叠（390 宽约 5 CSS px 间隔），门牌与鱼塘建筑间留草地。订单中心门牌压在主路岔口，与鱼塘、精制、行脚商等门牌压路方式相同，不遮挡建筑。`map320a/map390a/map414a`、放大局部 `area320/area390/area414`。 |
| 2 | 吊牌动件至少两帧差异 | 通过 | 390 宽相隔约 400ms 连拍 4 帧 `f1`–`f4`；吊牌局部（28×20 CSS px）相邻帧差异像素 116／147／122，放大图 `sign390tight` 中封蜡信封与挂链左右摆动可辨。较大局部 `sign390` 另含雨丝差异，不作为动件依据。 |
| 3 | 点击建筑与门牌进入订单页 | 通过 | 320／390／414 三档分别点建筑主体与门牌，`location.hash` 均变为 `#/orders`（`hit_building390`、`hit_plaque390`、`hit_plaque414`）。相邻命中保持：390 宽点鱼塘→`#/farm?tab=fish`、田地→`#/farm?tab=fields`、矿洞→`#/farm?tab=mining`。 |
| 4 | 门牌、菜单圆点；订单页标题无圆点 | 通过（附观察项 O-1） | 有可交付锁定单时：地图门牌右上角亮红点，三档均可见（`map_dot320/390/414`，放大 `plaque_dot320/390/414`）；菜单「订单中心」格子右上角红点（`menu_dot390`、`menu_dot_zoom390`），代码与回礼共用同一 `drawIndicator` 调用；订单页标题旁无圆点（`title_nodot390`）。交付后订单清空。未接受与待备货阶段门牌无圆点（`map390a`）。回礼与订单同时亮起的合并画面未采集（回礼条件未达成）。 |
| 5 | 管理员男女切换、收礼、情境帮助 | 通过（收礼仅采集茜梨） | 切换：点切换钮后奥林↔茜梨立绘与台词随之更换（`hit_building390`→`switch1`→`male_ready`→`female_empty`）。情境帮助男女各一句均出现：未接受（奥林 `hit_building390`）、待备货（奥林 `detail_accepted`、茜梨 `switch1`）、可交付（茜梨 `orders_ready`、奥林 `male_ready`）、暂无订单（奥林 `after_deliver`、茜梨 `female_empty`）。收礼：交付 1.33M 订单款后送礼额度仍为 0（`gift_dialog`、`gift_dialog2`），与现行「普通仓库实际销售额」口径一致；Vite 恢复加载后在仓库出售小麦，额度变为 44.38K（`gift_dialog3`），向茜梨送草莓挞 ×1（`gift_item`），确认后弹窗关闭，感谢台词「礼物我拿好了。你笑什么……好吧，我也有点开心。」立即开始逐字演出（约 250ms 时已显示前 9 字，`gift_received_a`；1.15s 完整，`gift_received_b`）。约 3.6s 时页面因工作区其他改动触发 Vite 整页重载进入开屏（`gift_received_c`），与订单功能无关。奥林收礼未采集。 |
| 6 | 配方选择「订单商品／订单原料」 | 通过 | 锁定草莓挞单后：精制选择窗草莓挞标「订单商品」（`recipe_tags_refine390`）；加工选择窗面粉、糖浆、草莓果酱标「订单原料」（`recipe_tags_proc390`）；作物选择窗小麦、甘蔗、草莓标「订单原料」（`recipe_tags_field390`）。其他品项无标记。 |
| 7 | 订单详情与生产链 | 通过（附观察项 O-2） | 详情左图右文标题（图标在左，名称与状态标签在右，`detail_unaccepted390`）。生产链无工具栏与图例，单一棕色连线，节点下方「需 N」标签（需 11／12／6／2），区域延伸到底部按钮栏上沿，按钮不遮挡。鼠标拖动可上下左右平移（`detail_drag1`、`detail_drag2`）。点糖浆节点打开物品详情，显示「本单需要 6 件」与上下游生产链（`item_detail_syrup`）。放弃确认弹窗标题「放弃订单」、正文「放弃「草莓挞」×11？」、按钮「取消」「放弃」（`abandon_confirm`）；取消后回到订单详情且订单保留（`abandon_cancel`）。替换成功浮字「已替换」（`replace_float_a`）；交付成功浮字「已交付 +1.33M 金币」（`deliver_float_a`）。仅采集 390 宽；320／414 宽详情未采集（交付后暂无订单，下一单需 30 分钟有效经营时间，且页面随后无法加载）。确认后放弃并关闭详情未执行，以免销毁唯一锁定单。 |

## 观察项（不构成本轮不通过，交 PM 判断）

- **O-1 门牌圆点贴字。** 320 宽时门牌圆点白色描边与「心」字右侧笔画相贴、几乎无间隙，圆点右缘略出木牌边（`plaque_dot320_zoom`）；390／414 宽留有间隙。位置符合「右上角、与其他建筑提醒同位置同样式」，即 `estate-map.js` 以 `signWidth / 2 - 7, signTop + 7` 绘制。
- **O-2 确认弹窗期间详情隐藏。** 在详情中点「放弃」后，确认弹窗下方显示的是订单列表而非详情（`abandon_confirm`）；取消后详情恢复。任务卡未规定确认弹窗期间详情是否保持可见。
- 替换浮字起始帧与「替换」按钮文字重叠约 150ms 后上浮（`replace_float_a` → `replace_float_b`），属通用浮字样式。

## 未能复现 / 未采集

- 奥林收礼（第 5 项只采集茜梨收礼）。
- 320／414 宽的订单详情、生产链、确认弹窗、浮字与选择弹窗（第 6、7 项仅 390 宽）。
- 回礼与订单同时提醒的合并圆点画面。
- 确认放弃成功后关闭确认与详情。
- 横屏留黑与运行中横竖屏切换（不在本卡验收项）。

## 证据图清单

证据图仅本地保存，位于 `assets/workshop/reviews/order-center-runtime/`（由 `.gitignore` 的 `assets/workshop/reviews/**/*.png` 忽略）。截图由 CDP `Page.captureScreenshot` 生成；放大局部由 sharp 最近邻放大裁切。新环境需按上文方法重新采集并以新图重审，运行画面不保证与下列 sha256 一致。

| 文件 | sha256 |
| --- | --- |
| abandon_cancel.png | 1395d024bedd1f954d337ab0395c610bbeb74db7515de855e8cabc3de3e24b72 |
| abandon_confirm.png | bc2a7b966671d00d63c8566e73c387b70b2d3c7fc95b21e13c5e13fd35530982 |
| after_deliver.png | e7c2bf7fc71f8103d0216ba0614840d5b42ec188842db3bd978cf16523447f79 |
| area320.png | 21a82861128cae94163174cd2c2de867df9c5cbbafd79ebae167e616b338acd7 |
| area390.png | d30522c453fcd1223eb023c40add3cf8eacdabefa1150a50a4990a1947c9a92c |
| area414.png | 88c8ea73110b7b2043eb6e331c20acc51ae8bef4bde81f72b0971561ca81a01e |
| before_deliver.png | 4df91d1e74781acff59c8a7453d08681e0c5c98ce99e0864c02ee7185acad10d |
| deliver_float_a.png | 85e65c7846bb87383cf6b7a0f80fced1740313cf5aff69d9174df112e3f89188 |
| deliver_float_b.png | 00c04fb18ca1587634d12dfbdfdde5ebd6000fb92aed5e8a0a5919bdfbf1a362 |
| detail_accepted.png | 1395d024bedd1f954d337ab0395c610bbeb74db7515de855e8cabc3de3e24b72 |
| detail_drag1.png | 73b2662dc5488881a65c31f78118feb6c4a7031859bd849a32a48ed9f999a351 |
| detail_drag2.png | 5322c26b1e98379c1fc73c0ee93d89ae2916ff05419b65b51e64551f9b7fa031 |
| detail_unaccepted390.png | e5a7d5ddbd4935ca963c6f5a9289b0ebc04f613d791dbfa66933fa2fe7af4296 |
| f1.png | b3ed92c3cd475c58acc77b9a9d8114861b78d48ae07bb54d5c97166fadf6c62d |
| f2.png | 2dc6c3dcc6f06f70f9332f82dde67343ff66e6226ba47aef1c360613894109df |
| f3.png | e6011147fadc52fde772670b155bbd13ca21626e147d2f836ca48ae64bdf8cfb |
| f4.png | a03cc2f93fc3dce4de66f971113b1a70637ec2f7a18881d8c84cf0f4bbae85e0 |
| female_empty.png | dd9d6e0466f5ee55f22625122ba7cfa97ba834d9aa54969aac55f05125f9fe4b |
| gift_dialog.png | 70fe79cab1e23736efacca9c232377d709ded39a7a8aa8705dac5b8661601ea7 |
| gift_dialog2.png | 62c8e80b37409ed1a7641e8f201128b25598e0e0be56598d78443235663ac430 |
| gift_dialog3.png | 9f64fc83a53a538ce0d10d691b7b8ffdfb641a6467ca27211eadee1659ab5864 |
| gift_item.png | ae2f73325aeddae09e1c64111dc68404edd0abcbd53117c554887b7741c0516e |
| gift_received_a.png | d2a3d6c58b882d8ab141887bfb7df62baca62b3e5097a4450952e3d2d915792a |
| gift_received_b.png | b64472c26a0afef40198c358a6ce65d958b371ef5b3d9dd181fe8b9f936cf604 |
| gift_received_c.png | 39a5ec21072e64bc3d8cacd2df8c07a768ac92554b897b11cf5ef01178e19d66 |
| hit_building390.png | 4da7dff3faaee9aa7c538cdaa42b3cc4ad0ce7442603a88970e7cf2524173fd1 |
| hit_plaque390.png | a2980d98527270965dbb0df287c81283aab39d8a5b2f45c616d59e078c0d718d |
| hit_plaque414.png | b5ceabd7f017ce2edf700b74bc8a1d0052b468b957856a10e5407328c1208926 |
| item_detail_syrup.png | ee633a6aa50b02de386472de7e8b3c180a462920f379df607ef4285b22416133 |
| male_ready.png | c7c2f3be8f0dc1fc31307764c7809a0d83031748811d5c3e5c7074c38ad4c989 |
| map320a.png | f96d01f242acd56313b29e410f0286600ee6dd4ac05885fb07b9678e334e605a |
| map320b.png | 01d15caf36453bd6d3c7e23a0c0030979fdb437a67843aa4b84da93aeeb0cce0 |
| map390a.png | 706de603050f75848af1717d79fe4d689a456bdef2808ef6d7e7a1f78bc98b34 |
| map390b.png | 46bb0423554088182f2d48618fdb9c17e3569f550cb607a862d2e2962bc9989d |
| map414a.png | 8c52f19a35d04fc077a019a96dfaa9a9075db34e1c5151a19610f4efcef06394 |
| map414b.png | 029963cec1c998989d0e0ca7b1d67a3d5c5b2e3290941f63e0f87318712fd74d |
| map_dot320.png | a5d12673ec2f3e7b6645b2158b5db8292b052618a2270921de4ec7e75bd528f0 |
| map_dot390.png | 25285481c8451865ee2c6df4aaa7e7369946f42703a79aef5cadeb8048f44112 |
| map_dot414.png | e53b4f747f43c7522a5a33db1c0930dd6268ddffe901d8a8326e1676b9f2dbc8 |
| menu_dot390.png | 43d8cbde1e47058d2fc8c6092e8e5d966dee2d66ace044832da84dc553329796 |
| menu_dot_zoom390.png | 7fb2bd56197d559872afc0ee374c92f669114726211ad0e6c0fbcee47f704490 |
| orders_before_replace.png | a42a7b1b66d341463c4a4d202db8463670acf7447c00d0e9ae32b3138a5b6b25 |
| orders_check.png | f09b451704c21112330e60fc8717b67a0931ddea02282f6b53c3be8894d46258 |
| orders_ready.png | b606ea8075f3a38658955eb3f509f560ace474b4657840545af20a44af82befd |
| plaque_dot320.png | 8ebe60aad86c4490c69e8458db867301532b2c126e10746f4bd3655e4a00b2ef |
| plaque_dot320_zoom.png | dedfebec9dc40fca9f1cd060671aa6b549a181c0a605f2ec44889e1cf0a96eae |
| plaque_dot390.png | b26fe646bcd81fd3d2028612c8b169d65911bd43440f9e7f1661406481ab430d |
| plaque_dot414.png | a94ead8a38b6faf8db327e30b0ed1d0b9fb110d5a02cad708b1db30d78dacf2b |
| recipe_tags_field390.png | af957277b4563cbf42a1bfbe40fe10da84a487bf824a3916b0f1f9bf6db334db |
| recipe_tags_proc390.png | b7c7fa954dae2d82078851299a3a28a42c90a7a5e1ad6ce23065efdbab8b6473 |
| recipe_tags_refine390.png | eb858b25c889a05af47b3116c4415bd9caac104e83e0bea291d0029161bbdafe |
| replace_float_a.png | a221db6723fc62d25d6fd524636b9d158d76d9a344dabcf125cf3e76bca8e7ba |
| replace_float_b.png | 3b5b1e51a3c5fd16bd17fbead0cda86576870187c5e5c154e30ea508182419a2 |
| sign390.png | fab200992b98d6f4a6c23d77d34353bd36ca4e18a3e148d54a8cb4a4e8697614 |
| sign390tight.png | 8cf8a42db49893dbc8302b6e014a1cbfb0e53ca6d05bf75b4d9e87627cace8d9 |
| switch1.png | 619d07331a471ef6cd150894126137b5cc6d3f6b1e4961893a26be43f034af6d |
| title_nodot390.png | a0c91faf2bec39f173c6fa451a02c04fdb04122425a5348fe678f96d65ab83de |

本报告为内部运行验收，不构成用户认可。
