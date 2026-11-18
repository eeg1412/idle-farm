# 庄园 v44 反馈独立审图

2026-11-18 对照 [v44 反馈](../tasks/2026-11-18-estate-map.md#v44-反馈)、用户上传的 `image(4).png`、`image(5).png`、`image(6).png`，以及此前认可的[像素画概念参考](../../assets/estate/concept-reference.webp)。v44 对照代码为 `c664fa1`。上传图中，精制、研发和经营建筑占据成片砂石，经营厅贴近南端出场路径，任务板在下段。该基线用于判断道路净空、路旁地块和任务板可见位置。

## 原稿与发布图

查看了 PNG 原稿、WebP 成品的正常底色合成和 WebP 最近邻边缘放大。田地与动件原稿以草绿底显示，经营厅原稿以道路沙色显示。原稿最外圈仅有最高 Alpha 为 1 的杂点，正常底色下无可见边框。四张发布图最外一圈 Alpha 均为零。

| 对象 | 原稿与发布图 | 素材判定 |
| --- | --- | --- |
| 田地稻草人 | [双动件原稿](../../assets/estate/props-scarecrow-telescope.png)左侧；[field-motion.webp](../../public/art/estate/field-motion.webp)，126 × 166 RGBA | 原稿／导出通过。草帽、布衫、张开的两臂和木桩完整，帽檐和断续稻草边缘无可见底色。 |
| 田地场景 | [field-without-scarecrow.png](../../assets/estate/field-without-scarecrow.png)，1624 × 969 RGBA；[field.webp](../../public/art/estate/field.webp)，536 × 320 RGBA | 原稿／导出通过。固定稻草人已从场景移除，右前侧保留可落脚的裸土。花树、农舍、作物行和围栏可辨。 |
| 研发望远镜 | 同份 1774 × 887 RGBA 原稿右侧；[research-motion.webp](../../public/art/estate/research-motion.webp)，122 × 166 RGBA | 原稿／导出通过。黄铜镜筒、蓝绿镜片和三脚架完整，脚间保留透明空隙。 |
| 经营厅 | [operations-manor.png](../../assets/estate/operations-manor.png)，1624 × 969 RGBA；[operations.webp](../../public/art/estate/operations.webp)，536 × 320 RGBA | 原稿／导出通过。木梁、石拱门和瓦顶呈离散像素轮廓；石阶两边紧贴一圈绿化，右侧留出旗杆。 |

生成编号、提示词与导出过程见[素材登记](../../assets/estate/README.md)。

## 地图组合

以发布 WebP 和 [地图参数](../../src/view/estate-map.js)生成 320 × 838、438 × 1148 静态组合，与对应宽度的裸底图逐段对照。组合使用最近邻缩放，牌面以 Noto Sans CJK 近似设备字体。检查北段岔路、鱼池弯道、矿洞支路、工坊前转弯、广场西缘和南端出场路。

### 退回记录 ESTATE-FEEDBACK-01

首版布局文件 SHA-256 为 `89b748b78abd9a3793424bafe3177503362c2b71c9a8165572031d84776e9c23`。438 px 组合的矿洞木牌左端截住约 y=471–479 的支路，路面从牌左边消失，无法连读到岩壁入口。鱼池木牌右尖碰到主路边缘，精制木牌落在砂石边缘。退回地图布局所有者调整牌位和相邻场景。

复查通过。矿洞木牌缩窄并右移，支路从主路可追到岩壁下，木牌左侧能看见完整路宽。鱼池牌向左移出弯道；精制主体上移到绿地，牌贴建筑底缘，仍临砂石边缘，广场通行面保持开放。左右为裸底和最终版、中间为首版的三联图位于工作区 `estate-feedback-review-scratch/final-detail-{mine,fish,forge}-{320,438}.png`。

### 最终静态判定

| 审阅项 | 结论与图像证据 |
| --- | --- |
| 道路与落地 | 两种宽度通过。任务板及畜棚在上段分岔两侧留地，田地在鱼池弯道西侧。加工贴溪，矿洞靠岩壁，精制、研发、仓库分别落在工坊和广场周边绿地。南段经营厅位于出口弯道西侧草地。主路、北段岔路、矿洞支路和广场西缘通行面连续可辨。 |
| 上段任务板与木牌 | 两种宽度通过。任务板位于地图全高约 15% 处，`任务 · 第一次收成` 静态样例出现在公告栏上方。十块木牌文字可辨，静态矩形计算显示木牌之间及入口热点之间均无重叠，任务引导的整块提示列入任务热点。 |
| 新素材的摆放 | 两种宽度通过。稻草人可辨草帽和横臂，木桩落进田内裸土；望远镜的镜筒朝右上方，架脚落在研发楼门阶右侧；红旗与经营厅预留旗杆衔接。320 px 五相位静态分镜中仍能在各自场景辨认这些动件。 |

最终整图与五相位分镜见工作区 `estate-feedback-map-review/final-320.png`、`final-438.png` 和 `final-motion.png`。真实画布上的点击、滚动、资源加载和动画连续性待运行确认，画面待用户认可。本次独立审图期间未运行游戏、测试、构建或浏览器。

## 证据版本

| 文件 | SHA-256 |
| --- | --- |
| `assets/estate/props-scarecrow-telescope.png` | `7ea268adda079a663d538b6e868e7071457a1c042fb1a6a27e995694df766b3d` |
| `assets/estate/field-without-scarecrow.png` | `5cd746797489b02c4e0c21d2b3caebd1105e4a16d21b68008eb26e36a81f6abc` |
| `assets/estate/operations-manor.png` | `ea562eaa118780f55a8edc98d9825d2b25d2c12ae56bab64e0238a2b82b4d02d` |
| `public/art/estate/background.webp` | `675af80857a5d4b837d8d253d7bf8cd35d72cbcd666e094614c262c90e3f0d09` |
| `public/art/estate/field.webp` | `fb734f59a0c224910e46e86cd32ff3d701370a819166fee2c895a558200e2874` |
| `public/art/estate/field-motion.webp` | `d7cff292e5a8d132554a32998afd54b4709af10ad3dccf4313d691438f2d41d7` |
| `public/art/estate/research-motion.webp` | `229e88f4eb93a5e18c478587d6aa392f4c7b7a3bb672854538f68051347c66ce` |
| `public/art/estate/operations.webp` | `8459396c8bb08bb971209a1203ea6a1a7d7918b90ab84017598439e924d15e22` |
| `src/view/estate-map.js` | `f34f21bc8efc0b6cd264676df5fc51104d786b3a90a418421804b0adf99a4fef` |
