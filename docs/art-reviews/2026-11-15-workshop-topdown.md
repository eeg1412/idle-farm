# 工坊严格俯视分层素材审阅

- 审阅日期：2026-11-15。
- 任务依据：`docs/tasks/2026-11-15-workshop-topdown-art.md`；使用 `farm-art-review`。
- 本轮修正：用户否定程序图形流水线，要求使用内置绘图生成工坊素材、严格正俯视，并首先拆分背景、传送带、机器三层。旧程序图形交付不构成本轮通过。
- 审阅范围：原稿、透明 PNG／WebP 成品、实际 130px 静态合成及相关资产来源/字段只读；不测试、不预览、不运行、不编译、不推送。
- 所有权：本报告由 `/root/workshop_topdown_review` 维护；资源归 `/root/workshop_topdown_art`，消费实现归 `/root/workshop_motion`。

## 冻结条件

1. 背景、皮带及加工/精制机器使用统一 90° 正交顶视；拒绝 45° 等距、三分之四及可见站立正面的机器。
2. 以用户最新原话“机器不要有进料口和出料口突出的地方！另外传送带也不需要边。”为最终修正：居中纵向长条机身两边平直，没有凸出的进/出料口、固定9口开孔或口框。机器用内置绘图编辑/重绘，不以程序抹画或拉伸旧横机替代。
3. 传送带仅使用独立绘图的可平铺surface，无护栏、边框或port套。每项实际进料水平直接接机身边缘，不汇合、不绕路、不保留中间无用空地；右中央水平出料，左右进出带等长，机身居中。
4. 独立背景为俯视地面，线路区域干净。实际消费顺序为背景 → 传送带surface及canonical物品 → 机器；材料进入机身遮挡后消失，产品在右侧显现。机身边缘/cover、裁切、等比尺度可追溯；原稿不烘焙材料、产品或固定配方产线。
5. 带面须实际滚动，不能只让物料动，也不能滚整张背景/机器图。至少2相位静态证据核对带面位移、背景与机身不随带面平移及平铺接缝。机器可有独立工作抖动；静态图不证明真实循环。
6. 按真实最多9项材料与1项材料分别查看130px静态用途，审材料辨识、水平直连、遮挡、比例及左右等长；不能因多材料而省略输入。最终静态稿必须消费最终helper的布局/路径，不用另一套手排代替。
7. 已有像素资源只提供色块/质感参考，不继承旧相机角度。新机器没有已获用户认可的俯视原图；按项目离散色块、阶梯轮廓、暖乡野绿灰配色及本轮严格俯视要求判定，不把既有场景当成新机器的用户认可。

此前横版机器、旋转后下入上出、汇流转弯、固定九口、带护栏等方案均已被用户后续修正取代。下文历史审阅仅保留当时实际看过的版本与结论，不作本次最终通过。

## 实开参考

- `public/art/scene-C01.webp`：已实际打开；PM提供的认可来源为“用户既有认可的C01整幅前景例外”。参考其离散明暗色块、像素阶梯、植物/木材暖色质感；原图存在透视地面，只取风格，不取相机。
- `public/art/livestock/barn.webp`：已实际打开；PM提供的现有项目风格参考，未称其为用户认可的新机器。参考木材暖色与离散高光；不继承室内侧视透视。

## 证据与状态

| 项目 | 精确证据 | 状态 | 剩余项 |
| --- | --- | --- | --- |
| 原画与生成来源 | `assets/workshop/raw/*-v1.png` 四张；`assets/workshop/prompts-v1.md` | 源图相机/对象项条件通过 | 最终导出与实际尺寸仍待复查 |
| 背景层 | 原稿与 `assets/workshop/png/background-v1.png`、`public/art/workshop/background-v1.webp` | 静态源图/成品通过 | 不代表真实画布通过 |
| 无边框传送带层 | v2独立surface已实开；rail/port相关图为历史停用项 | surface源图/PNG/WebP方向条件通过；最终组合用途未验证 | 用户明确保持不运行，不执行同源双相位出图 |
| 加工/精制机器层 | v5两原稿/提示词、`assets/workshop/png/{processing,refining}-machine-portless-v5.png`、`public/art/workshop/`同名WebP均实开 | v5源图/导出相机、无突出接口、身份与等比来源条件通过；最终用途未验证 | 最终同源正常底130px合成与遮挡证据未生成 |
| 130px 静态用途 | 既有 `workshop-layered-v2-*`为旧横版/汇流/护栏布局；v5同源1/9双相位130/320图未生成 | 最终用途未验证／证据不足 | 用户已明确选择“保持不运行”；不是等待用户答复，也不能用旧图替代 |
| 实际消费路径 | 已复读最终active v5配置、`workshop-layout.js`、`workshop-animation.js`及`canvas-ui.js`工坊相关路径 | 最终源码分层/bitmap/无边直连条件通过；实际运行未验证 | 按用户选择不执行helper或真实画布/滚动 |
| 真实画布与动画体验 | 未运行 | 未验证 | 用户未授权运行/预览；不得由静态图推断通过 |
| 用户认可 | 未取得 | 未取得 | 内部审阅不替代用户认可 |

## 退回与复查

### v1 原稿实开记录

- 四张原稿和精确提示词已实际打开/读取。背景是轴对齐木地板，没有设备、物料或透视侧墙；加工机是圆磨盘顶盖，精制机是矩形铜色压制顶盖与两圆阀，左右端口同轴。两者差异清楚，未见被否定的45°等距或站立正面机。皮带sheet实际可见独立横、竖、W-S转角、N-S-W汇流、四向交叉与横向口套，没有固定配方产线或烘焙物料。
- 原稿采用暖木色、灰绿金属、铜色与阶梯轮廓，符合本次项目风格参考方向。仅此项条件通过不代表发布成品、130px用途或运行通过。
- 静态尺寸/像素读取使用 `System.Drawing.Bitmap`。两台机器角点 Alpha=0；背景角点 Alpha=255。皮带sheet的 `(0,0)`、`(768,0)`、`(10,10)`、`(384,512)` Alpha均为0，RGB分别包含非零绿灰。黑底查看器可见的大范围绿雾不能单独证明实际残边；已要求所有者提供木底正常Alpha合成，再审最终边缘。未以此误显退回，也未据几个采样点声称全图Alpha通过。
- `/root/workshop_motion` 提议 `workshopSceneLayout(id,kind)` 输出同源bitmap placement及正交材料/产品路径；暂定320stage及9行，机器口位待成品登记。当前仅收到接口说明，尚未把其当作实际消费或130px通过证据。

### v2 滚动带拆分原稿实开记录

- 已实际打开 `assets/workshop/raw/conveyor-rails-v2.png`（1536×1024）、`assets/workshop/raw/belt-surface-v2.png`（1254×1254）、`assets/workshop/reviews/conveyor-rails-source-normal-v2.png` 并读取 `assets/workshop/prompts-v2.md`。来源记录为内置绘图以v1为真实输入编辑去除橡胶带面、带面另行独立绘图；原稿保留，没有以脚本擦绘替代。
- 正常浅底显示6件仅保留护栏/螺丝，H/V两栏、L/T/cross连接通道与端口中心透底，未见固定黑色treads。`(256,256)`、`(756,256)`、`(1310,256)`、`(310,760)`、`(768,768)`、`(1280,768)` 六处通道Alpha均为0。正常合成无大范围绿色雾边，证实原黑底绿雾不能按实际底色退回。
- 带面原稿仅绘竖向橡胶肋条、无边框/螺丝，适合横向移动的拆分方向。整幅左/右边缘像素不同，因此不凭提示词“seamless”判定无缝；需复核所有者最终选取的真实repeat裁切、节距和2相位合成。源图拆分/中空条件通过，最终平铺与使用仍待复查。

### v2 PNG/WebP与metadata静态合成实开记录

- 已逐一打开 `assets/workshop/png/` 和 `public/art/workshop/` 中的10组PNG/WebP：`background-v1`、`processing-machine-v1`、`refining-machine-v1`、`belt-straight-v2`、`belt-vertical-v2`、`belt-corner-v2`、`belt-junction-v2`、`belt-cross-v2`、`belt-port-v2`、`belt-surface-v2`。背景320²；加工机432×162，精制机452×188；护栏按登记原生尺寸独立导出。正常木底合成无可见大范围雾边/底色，机器轮廓完整、左右口可辨，加工圆顶与精制矩形铜顶在130px仍有区别。
- 已读取 `assets/workshop/registration-v2.json` 与 `src/content/workshop-visuals.json`。每项原稿、crop、PNG、WebP、logicalSize及sourcePorts可追溯；surface实际取原稿 `(89,100,78,156)` 转32×64，逻辑8×16、周期8。像素读取显示该选取周期由灰色带面进入窄高光、黑色肋缝，再接下一周期灰面；不是把整幅原稿直接滚动。
- 已实际打开 `assets/workshop/reviews/workshop-layered-v2-{320,130}.png` 和 `processing-I01-single-conveyor-phase{0,4}.png`、`refining-PT44-nine-conveyor-phase{0,4}.png`。单材料麦穗/面粉可辨；9行入口均可见独立图标与带，汇流到机器左口，产品从右口另出，未因多材料省略入口。130px中九种图标仍各占独立行，机器/物料没有挤成一团。
- 已直接读取 `src/content/game-data.json` 的两个记录：I01输入C01；PT44输入按记录顺序为IF10/IL07/I84/I34/I24/IF08/IL03/I83/I74。静态生成器复用对应 `public/wiki/icons/<ID>.webp`，不是占位球或原稿烘焙物料。
- 两相位确有带面差异：单材料conveyor静态图 `(62,160)` 的RGB由0相位95/95/95变为4相位51/51/51；护栏 `(60,153)` 两相位均为Alpha253、RGB130/141/119，`(68,153)` 均为Alpha252、RGB120/133/106。实际图中螺丝/护栏位置固定；`compose-review-v2.mjs` 把同一rails阵列在相位循环外构建，循环内仅带面extract偏移。此处只证明静态两相位拆分，不证明游戏滚动正确。
- 当前 `assets/workshop/compose-review-v2.mjs` 使用最终WebP和metadata自行拼布局，尚非最终runtime helper：其 `collectorDirection` 参数未参与带面方向，因此不能用该批图证明上下集料实际方向。所有者已确认并正在改为 `workshopSceneLayout`/`workshopMotionFrame` 同源定位重出，完成前该项保持待复查。
- 静态读取 `src/view/workshop-animation.js` 可见background→conveyor(movingSurface→fixedRails→canonicalItems)→machine，设备/护栏/带面均使用真实bitmap；Graphics只作不可见polygon mask，带面TilingSprite有按方向tileRotation及tilePosition更新。实际资源加载接通、Pixi遮罩行为、待料停止、销毁及真实动画体验仍未执行，本报告不替代PM的执行路径整合。

### 历史直连长条机 v4 首稿（最新无突出接口要求已取代）

- 已实际打开 `assets/workshop/raw/processing-machine-long-v4.png`（所有者交付1219×1290）。图中从上至下可清点左侧恰9独立水平空口，右侧中央1出口，3圆磨盘沿纵向布置，保持90°顶视；没有烘焙物料、产品或文字。该源图相机、对象与口数条件通过。
- 所有者提供真实可见bounds约x389至829、y29至1261，即440×1232。PM前述64×288为建议几何，不能用非等比压缩让新图迁就；已向art/PM明确等比按288高则全宽约103，最终须基于真实比例及左右外口定位满足等长，不能按建议宽度伪造口位。
- 用户后续要求取消突出进/出口及带边，v4固定9口稿已不符合当前目标，不能接入作为最终；art正在以内置绘图编辑为v5-portless。旧横版/旋转版/v4来源和静态结论仅保留为历史。

### 最终无突出接口长条机 v5 原稿

- 已实际打开 `assets/workshop/raw/processing-machine-portless-v5.png`、`assets/workshop/raw/refining-machine-portless-v5.png` 并读取 `assets/workshop/prompts-portless-v5.md`。来源为内置绘图对各long-v4原稿做精确编辑，不是程序擦绘、旋转或拉伸旧横机。
- 画面实际显示左右两侧为平直封闭长边，无旧九口/出料框、凸出连接件或固定开孔；加工三圆磨盘与精制三铜色矩形压制模块明确不同，90°正交顶视及现有像素材质保留，未烘焙物料/产品。源图相机、无接口和对象身份条件通过。
- 最终PNG/WebP正常底边缘、等比bodyEdges/cover及无边水平带同源helper1/9材料双相位130px尚待复查；源图通过不代表当前整批或运行通过。

### v5 PNG/WebP与登记复查

- 已实际打开两类v5 PNG及同名WebP：加工140×620，精制148×628。机身完整，纵向两长边平直，无外伸口框、固定洞口或烘焙传送带；圆磨盘/铜矩形模块的区别在导出中保留。当前透明查看器未见明确造型退回项；最终正常背景合成/130px用途仍须另证。
- 已读取 `assets/workshop/workshop-visuals-portless-v5-candidate.json` 与 `assets/workshop/registration-portless-v5.json`。加工原稿crop `(468,24,280,1240)`→140×620，精制crop `(460,16,296,1256)`→148×628，均为等比最近邻转换，没有强行压入建议64×288；sourceRotationDegrees均为0。
- 加工bodyEdges左右127.857142857/192.142857143，精制126.893890675/193.106109325，均以160为中心；两者body top/bottom为16/304。登记的可见body高288、宽约64.286/66.212，PNG透明留白体积另算，尺寸链可追溯。cover登记在真实机身内部，是否能完全遮挡最大图标仍待同源静态/运行证据。
- candidate仅保留background、两类machine、独立tread与动态布局参数，不含rail/port/corner/junction/cross；登记明确旧横版、旋转v3、多口v4及护栏等历史停用。当前状态仍为candidate，最终实际配置/消费源码需与最终helper一并复读。

### 最终active v5消费源码复读

- motion交接后已复读 `src/content/workshop-visuals.json`，active.version=5且路径指向已实开的portless-v5 WebP；最终 `src/view/workshop-layout.js` 仅请求background/machine/tread三项位图，没有rail/port资源请求和汇流/转弯分支。
- `workshopSceneLayout` 全量枚举当前真实 `data.items[id].inputs`，每材料各有独立水平surface与path，n=1在y160居中；n=9从bodyTop+16到bodyBottom−16等距，即y32至288、间距32。不省略材料，不合流或绕路。输入surface延至机身内部cover，输出由内部cover水平接到右端；body左右关于160对称、两端20/300，源码几何可见带长对应相等。
- `occlusionCover` 在左右可见body edge内20逻辑像素，当前图标28/30逻辑像素，按中心移动时有内遮挡余量；是否在真实Pixi合成中自然消失/显现仍待实际图像/运行，不能由几何直接宣布视觉通过。
- 最终 `workshop-animation.js` 三主Container为background→conveyor(movingSurface+canonicalItems)→machine，无fixedRails或rail Sprite；Graphics仅polygon mask。带面TilingSprite只更新tilePosition，背景位置不随该位移改变，机身只使用独立工作抖动。
- 已只读 `canvas-ui.js` 的工坊实际路径：加载真实slots相关canonical icons与三位图、完成加载后只重绘仍可见配方、可见区挂载、离开可见区destroy，并保存每设施展示phaseState；待料时不推进phaseState.clock。此为源码路径证据，未执行helper、Pixi、游戏或任何检查。

### 权限与最终用途缺证据

- 素材所有者告知：执行v5同源helper静态compositor已被自动审批拒绝，理由为本任务未授权preview/runtime check。最终1/9材料、130/320及双相位静态图尚未生成。本审阅未重试或绕过该被拒动作；未用旧横版图替代。
- 用户随后已明确回复“保持不运行”。按该选择不执行合成脚本、不换工具/代跑、不重新询问许可；最终1/9材料双相位130/320拼图不生成。该状态来自用户明确选择，不是用户未响应。
- 已完成不受影响的普通原稿/PNG/WebP查看与最终active源码/登记静态读取。v5源图和导出素材条件通过；v5实际130px组合用途、最终helper遮挡及双相位组合未验证。真实运行、预览、测试、语法/运行时检查、资源门禁、试编译和最终编译均未执行；未推送。

当前v5原稿、PNG/WebP、等比来源及最终active消费源码已按可用证据复查，没有发现明确需退回造型/静态源码项。最终1/9材料双相位130/320正常合成按用户选择未生成，因此完整组合的材产品可辨性、自然遮挡、带面平铺/移动和背景/机身稳定均未验证，不能以旧横版/旋转版/v4或源图通过替代。真实游戏运行与动画循环体验仍未验证；内部审阅不代替用户认可。

本轮按已授权范围审阅结束，报告所有权已交还PM；后续不自行执行补图、检查或其他验证。
