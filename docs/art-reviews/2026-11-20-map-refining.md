# 地图与精制素材审阅

## 纠错与撤销（2026-11-20，用户否决v82人物）

**撤销本报告对精制男女托盘立绘、对应页面肖像、男性CG及其姿态一致性描述的通过结论；下文相关“通过”和“RF-01修复闭环”仅保留为错误审阅历史，不再具有验收效力。研发楼／泡泡与精制背景的独立静态结论不在此次撤销范围。**

- 证据：原体态基准为`assets/source/art/refining-v3/{female,male}-fullbody-original-reference.png`；被否决版本为同目录`{female,male}-fullbody-sheet-final.png`及其canonical／页面裁切，男CG为`assets/source/art/refining-male-cg-v2/original.png`。旧新全身、横幅与CG均曾实开，但我没有逐项对照原肩线、胸腹、骨盆和双脚方向。原男斜侧站姿被重排为正面躯干，两人又共用胸前双手端托盘的展示动作；CG沿用了正面展示产品构图。完整鞋脚、原衣装和看向玩家不足以证明这些变化符合用户边界。
- 真实遗漏：我把“眼睛平视玩家／头部局部调整”曲解为可以把整个人转正；审查集中于头脸尺度、透明边缘、全身完整和四帧稳定，漏掉身体方向与角色工作动作。又将男女动作趋同及CG的同类摆拍误判为一致性通过。文件已打开、哈希可追溯及局部技术合格不能替代这项需求审查。这是我的重大漏审；PM当时未锁定躯干约束且复核未纠正，也不能减轻本次审阅责任。
- 新门槛归档：按`docs/tasks/2026-11-20-refining-pose-correction.md`，分别对照原肩线、胸腹、骨盆与脚朝向；头部微转／降下巴和平视须保持原斜侧躯干站姿。女采用不对称检视油样瓶、以原擦拭布稳住矿晶样瓶的细致动作；男采用一手稳定玻璃滤壶、另一手调整侧阀的熟练操作，CG侧身面向工作台、回头回应玩家。禁止托盘、对称正面展示及两人套同姿势。完整全身、原衣装、四表情、canonical→页面裁切链与原头脸尺度仍各自必审。
- 本次仅纠正旧报告，不批准任何新稿。后续判定归新独立审阅者`refining_review_v4`；不得沿用本报告已撤销的人物／CG通过结论。此次未生成图片，未修改其他文件，未运行测试、预览或构建。

---

2026-11-20；对应 `docs/tasks/2026-11-20-map-refining.md`。独审只写本报告；图片证据和精确SHA-256清单在仓库外 `/workspace/scratch/a46f8d1a2380/map-refining-review/`。

| 项目／精确版本 | 源图与发布素材 | 实际尺寸静态组合 | 结论 |
| --- | --- | --- | --- |
| 研发楼base v2、泡泡motion v3 | `research-v2/research-generated.png`（1624×969，`20ad68b1…15cd`）、`research-bubbles-generated.png`（2172×724，`ee6caa1c…5dfb`）及两个最终WebP均实开 | 320／390／414px地图，四帧及正常底3倍边缘均实开 | **通过本轮静态素材用途** |
| 精制背景v3 | `refining-v3/background.png`（2170×725，`10b1f751…59c7`）与960×320最终WebP实开 | 320／390／414px横幅静态图 | **通过本轮静态素材用途** |
| 精制男女四表情v3 fullbody final | 两张全身原生sheet、8份canonical PNG、全部8张最终透明WebP已查看；完整hash见final清单 | 320／390／414px真实managerBanner公式；旧新390px并排、四帧正常底及完整全身联系图 | **通过本轮静态素材用途；RF-01修复闭环** |
| 精制男CG v2与bio | `refining-male-cg-v2/original.png`（1024×1536，`9186b8a8…2205`）及最终WebP（`f8567ded…e085`）实开；bio首句一致 | 320×568、390×844安全区、414×896与真实横屏居中180×390面板 | **通过本轮静态素材用途** |

## 参考与已核实内容

身份依据是替换前`docs/Pixel-Characters-Complete-Pack/立绘/08_精制管理/`的8份全身canonical（已冻结至仓外`references/canonical-old-*`，带原SHA清单），另并排查看替换前精制肖像／背景／男CG。精制女的淡紫短发、护目镜、白紫金边衣和黑手套，男的黑高束发、酒红金边外衣、系带内衫、皮围裙和酒红手套在新图保留；男视线转向玩家。新托盘上的矿晶罐、植物油瓶与清洁农矿精制室内容一致。最终两性四表情分别可辨；同位身体、手与托盘在实际横幅未见明显姿势跳变，正常底未见可见底色或杂边。源码中男bio首句为“常戴着手套核验托盘里的矿晶与植物精油。”，性格句保留。

研发楼对照原研发、加工、精制建筑，保留石墙、青瓦、门口书架和草花基座；右前大玻璃烧杯及青绿液体在实际小图仍可辨。`estate-research-visuals.json`的footprint为`[29,12,507,309]`；泡泡图集176×44，4格44×44，position`[364,188]`，每帧0.16秒。按`unit=mapWidth×0.344/478`合成，四帧泡泡均落在杯内；液体固定，泡泡上移／消散，楼体和杯子固定。`research-beaker-actual-390-3x.png`放大实际390px地图采样结果；不能据静态分镜宣布真实循环体验通过。

来源链已核实：研发楼原稿仅以alpha≥128读出crop`[59,17,1560,941]`，未阈值化实际alpha，LANCZOS缩到478×297置于536×320的`[29,12]`。泡泡每格源crop`[543i,90,543(i+1),633]`，转44×44横排，未补画／变色。正常橄榄底边缘图没有透明查看器出现的红黄横线；不以该误显退回。最终base/motion SHA分别`8f0c05d8…413b`／`b8c815dc…eb90f`。

CG按`src/main.js`→`viewportLayout`→`loadingLayout`真实几何链合成，新faceBounds`(354,340,264,252)`包围脸部。三种竖屏及844×390外屏所产生的居中180×390面板均露脸完整，logo和底部进度不遮脸。对应`cg-{320x568,390x844-safe,414x896}.png`、`cg-landscape-true-844x390.png`与`cg-layout-measurements.json`。直接把844×390传给loadingLayout的早期合成不符合真实消费输入，已排除，不能据此报告横屏裁脸。静态图中的进度文字为占位，采用当前`loadingLayout`默认20px字幕高度定位进度；真实运行会按系统字体量得字幕高度再次排版，该字体测量未运行验证。logo与场景几何直接来自当前公式。

## 退回单 RF-01

- 对象：精制男女四表情v3首交；女源`9ff88ad9…6ae0`、男源`6841d818…08c`，首交导出映射现保存在`refining-v3/initial-rejected-export-manifest.json`。
- 证据：`female-banner-old-new-390.png`、`male-banner-old-new-390.png`（左旧右新），以及`{female,male}-portrait-old-new-2x.png`。新增腰部构图在相同289px画布与既有banner缩放下使头脸明显缩小；男尤为显著。此项影响实际横幅的人脸／表情存在感，不是仅看原图的审美偏好。
- 已满足部分：身份、衣装、正视、新手持物、表情区分和首交帧间姿势。保持原canvas与全局UI几何。
- 最新用户澄清：最终必须保留男女完整全身四表情原稿，页面肖像来自全身裁切。需要对应`docs/Pixel-Characters-Complete-Pack/立绘/08_精制管理/`内8份canonical PNG和运行裁切链；只交紧胸像不能结案。
- 修订：交`refining_art_v3`以全身姿态把托盘抬至胸前，完整保留原下装、裙摆／长外衣、裤腿与鞋靴；从该全身源紧裁出页面肖像，使同一真实banner的人脸恢复旧版量级。全四帧同位、手托盘及全身脚部完整，审阅者不修画。
- 最终复查：**修复通过并闭环**。`refining-v3/female-fullbody-sheet-final.png`（1024×1536，`c8351ea4…8d8c`）和`male-fullbody-sheet-final.png`（1024×1536，`d63fb209…2b45`）为真正原生全身四格，不是历史`*-sheet-final.png`紧胸像。8canonical均为512×768原生格；女固定x平移`[-38,26,-38,26]`、男`[-6,37,-6,37]`，只登记生成格偏移。女从canonical裁`[0,0,512,275]`、男裁`[0,0,512,280]`后等比导出289px高；画布仍为481／491宽，元数据faceX为249／250.4。最终manifest SHA`3fee4a7d…f4f4`，全链hash见仓外`reviewed-versions-final.json`。
- 已实际打开新完整源、`canonical-final-{female,male}-four-normal.png`、8张运行WebP与`{female,male}-runtime-contact.png`；原女长外衣、围裙／腰包／工具、荷叶裙、长袜和系带靴，男长酒红衣、皮围裙／腰工具／白布、深裤和高靴保留，所有帧鞋脚完整。横幅`{female,male}-banner-{320,390,414}.png`及`refining-{female,male}-RF01-old-new-390.png`证明同一缩放规则下头脸恢复旧版量级，双手／托盘与两罐可辨，不改全局UI几何。
- 头顶疑点专门复查：全8帧源格前4行最大alpha≤7，canonical前4行alpha均为0；高alpha发环／发髻首次在女y6–7、男y6–7出现。正常底3倍`canonical-{female,male}-smile-headtop-3x.png`显示完整弧线，未见有效轮廓被格顶截断；不是补空白掩盖截切。对应`source-final-top4-alpha.json`和`canonical-final-headtop-alpha.json`。

## 证据边界

只执行源码／资料读取、图片格式／像素／尺寸读取和静态转换；未运行测试、检查、游戏、浏览器预览或构建。报告不是用户认可，也未验证游戏运行、加载时序或真实循环体验。
