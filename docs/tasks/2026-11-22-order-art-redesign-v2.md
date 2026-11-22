# 订单管理员重新构思与接入 v2

## 目标与反馈

用户要求女性开屏不参考旧开屏，按茜梨现有描述重新构思；男性不参考旧设计，形象、动作与开屏从零重做。奥林姓名、重承诺及耐心倾听的性格保留，外貌、服装、动作允许全部改；茜梨现有立绘、身份及傲娇性格保留，只换开屏 CG。旧稿及旧内部通过不构成本轮通过证据。

用户后续明确退回本轮两张室内柜台 CG：「不行，男女订单中心管理员的开屏画面重新绘制，重新想一个场景」。因此重新开放两 CG，当前 v2 CG 不交付、不编译；新男性四全身、四胸像、人物描述及 portrait 版本 5 保留。此修订仍属同一目标和直接依赖链，延续三域所有权。

用户随后明确补充「男性订单管理员别忘了改描述」。实际运行资料的 `orders.male.bio` 仍描述旧黄铜压机，因此 PM 扩大 OR-INT 所有权至 `src/view/manager-dialogue.js` 的这一条 bio，以及同一人物 hello 中旧压机／压纹两句、thanks 首句压柄，共三条道具衔接对白。用户要求是同步男性描述；三条对白的最少必要道具同步属于 PM 对新画面一致性的解释，不授权重写其他对白、顺序或机制。

输入提供方为 PM 和素材所有者，接入输出交 PM，独立审图输出由 PM 汇总。完成条件分为新原画交付、成品及元数据接入、独立静态审图、实际运行验收；各阶段分别记录，缺证据不算通过。

## 上下文与任务所有权

本轮为新目标，素材域和接入域分别新建干净上下文（`fork_turns: "none"`），仅传本任务必需资料。后续修订属于同一目标及直接依赖链，复用对应所有者。

| agent | objective | artifact | 所有权状态 |
| --- | --- | --- | --- |
| `order_art` | 从零设计奥林四表情及男女独立新 CG；保留茜梨立绘身份 | `assets/source/art/managers/orders/redesign-v2/`、`assets/source/art/loading/solo/orders/redesign-v2/`、男性四张公开胸像、两张公开 CG、`assets/source/art/managers/orders/anchors.json` 的 male 字段、`scripts/export-order-redesign-v2.mjs` | 男性肖像与 v3 两 CG 已交付，所有权已结束 |
| `order_art_integration`（OR-INT） | 接入元数据、订单资源版本、男性运行简介与最终来源说明 | `src/content/manager-portraits.json` 的 orders.male、`src/content/loading-scenes.json` 的两条 orders、`src/view/loading-screen.js` 的两条 orders 版本、`src/view/canvas-ui.js` 的 `managerPortraitVersion` 仅 orders 版本分支、`src/view/manager-dialogue.js` 的 orders.male.bio 及指定三条旧道具对白、订单相关文档及本卡 | 最终引用、运行描述与文档已接入并冻结，所有权结束，交 PM 最终编译 |
| `order_art_review` | 对照本轮要求审新源图、公开成品及实际布局证据 | `docs/art-reviews/2026-11-22-order-art-redesign-v2.md` 及同名 `.json` 证据清单，证据图仅本地保存 | 男性肖像与 v3 两 CG 源／成品／静态使用通过；游戏运行未验证，当前用户认可未取得 |
| PM | 需求追踪、实际调用路径整合、最终编译及用户同步 | 本卡、持久反馈、最终交付说明 | 集成负责 |

共享文件按字段互斥编辑，不覆盖其他人的未提交改动。没有所有权转交。PM 已将 `canvas-ui.js` 的 `managerPortraitVersion` 仅 orders 版本分支交 OR-INT；函数保持现有 role 参数，orders 整体升至 5，女性原图及成品字节保持不变，附带影响仅为订单女性立绘请求 URL 刷新一次缓存版本。`manager-speech.js` 不改。无槽位接续事项。

独审发现本轮证据目录尚无忽略规则后，PM 追加授权 OR-INT 修改 `.gitignore`，仅加入 `assets/source/art/managers/orders/redesign-v2/reviews/` 下 PNG／WebP／JPG／JPEG 图片忽略规则；同目录可复现脚本及 JSON、MD 等文字记录保留提交，未扩大全局忽略范围。

PM 追加授权同步男性性格段中单句动作衔接：旧「听完对方最后一句才压下封印」改为新订单夹动作的直接表达；童年经历、重承诺、耐心、表情和收礼反应保留。

本机 Python 为无法启动的 WindowsApps 别名，PM 已批准素材导出入口从拟定 `.py` 改为 `scripts/export-order-redesign-v2.mjs`，使用已有 Node／sharp，仅裁切、转换和登记来源，不新增验证。源图与稳定公开路径接口不变。

## 精确输入与资料

- `docs/assets.md`「管理员场景 CG 开屏」：资源位置、按需加载、源图与成品独立登记。
- `docs/npc-personalities.md`「奥林」「茜梨」：姓名、性格、身份及关系机制；男性首段外貌动作待新定稿替换。
- `src/content/manager-portraits.json`：订单男性胸像的 width、height、faceX、inkLeft、inkRight。
- `src/content/loading-scenes.json`：orders-male 与 orders-female 的稳定 ID、公开路径、source、尺寸及 faceBounds。
- `src/view/canvas-ui.js`：实际横幅、资料及列表的胸像路径和缓存版本；`src/view/loading-screen.js` 与 `src/view/loading-layout.js`：开屏抽取、请求和几何。
- `src/view/manager-dialogue.js` 的 orders.male 与 `src/view/manager-page.js` 的 `managerInfo`：运行人物简介的实际数据和消费路径。
- `scripts/export-manager-art.py`：通用导出将 `orders/anchors.json` 合并进运行元数据；不承担新订单资产转换。
- `.agents/skills/farm-task-dispatch/SKILL.md`：精确边界、单一共享所有者、上下文及交接要求。素材验收按 `farm-art-review`，不得以文件存在代替审图。

已交接新男性正向外貌与工作动作、male 锚点、两 CG 的 source/尺寸/faceBounds；真实提示词、生成来源及导出参数位于 `assets/source/art/managers/orders/redesign-v2/source-manifest.json`，来源说明见同目录 `README.md`。独立审图结论分阶段记录。

## 行为边界

用户原要求见上；PM 对实现范围的解释为：稳定 ID 和公开文件路径继续服务既有调用路径，只替换本轮明确授权的资源及元数据。

| 触发入口 | 适用条件 | 只允许改变 | 必须保留的相邻行为 | 交付证据 |
| --- | --- | --- | --- | --- |
| 订单男性横幅、列表、资料及表情切换 | 当前形象为 orders.male | 新男性资源、锚点、缓存版本及正向外貌动作描述 | 对白、资料、送礼、好感、切换、关系与存档；茜梨四表情资源 | 原画与四成品交接、精确字段 diff、实际 URL 调用链 |
| 启动抽到订单男女 CG | 所选岗位及性别匹配订单项 | 两张新 CG、各自 source/faceBounds/version | 随机抽取、按需加载、原 Logo、订单 nearest 采样、1 秒完整显示与 300ms 淡出、错误重试、单画布布局 | 两个 source 到公开路径的对应、运行 manifest 与版本引用 |
| 读取角色或资源文档 | 本轮订单人物及来源段落 | 最终新男性外貌动作、两新 CG 来源与本次反馈状态 | 人物性格、关系及经营机制；其他岗位正文 | 来源与任务记录；旧被否定参考仅作历史任务状态 |
| 打开订单男性资料、抽取其原有对白 | 当前形象为 orders.male | bio 改为新外貌、耐心和检查防雨罩；指定 hello 两句、thanks 一句替换旧压机道具 | 其余对白文本、各数组顺序／数量、性格、表情、好感及触发机制 | `managerInfo` 读取 character.bio 的静态调用链与四行文本 diff |

OR-INT 接手时已复述本表。文件所有权不授权修改其他行为；必要扩大范围先报 PM。

## 接口与依赖顺序

稳定公开路径为 `public/art/managers/portraits/orders/male-{smile,happy,angry,sad}.webp` 以及 `public/art/loading/scenes/orders-{male,female}.webp`。素材所有者独占生成与转换，交接 male 锚点及 CG 原图实测资料后，OR-INT 才落最终共享字段。独审对新源与成品逐项复核，PM 读取实际 diff 后汇总。

只读源码已确认：`managerPortraits` 由 `canvas-ui.js` 导入；男性锚点供横幅布局消费，列表及资料经 `mountManagerPortrait` 共用公开胸像。`managerPortraitVersion` 供图标/资料、列表与横幅三条 URL 路径消费。开屏 `setWorld` 锁定岗位及性别，`loadArt` 请求 manifest 的 path 并取单图版本，`arrange` 将对应 faceBounds 交共享 `loadingLayout`。本轮不改这些控制逻辑。

运行资料由 `manager-page.js` 的 `managerInfo` 按岗位与已选性别取得 `character`，通过 `copy.text(character.bio, silent)` 显示 `manager-dialogue.js` 的 bio。男性 bio 已改为新棕发、赭金短外套、耐心合拢订单夹与出发前检查防雨罩，指定三句只同步新道具；角色设定文档和实际资料均已接入。

## 当前状态与验证边界

- 已完成：四张男性全身原图、四胸像与 v3 两 CG 的源图／公开成品交接；男性锚点、CG source／faceBounds／缓存版本、运行 bio 与指定三句对白、人物及来源文档均已接入。PM 已阅读字段、运行资料消费路径和代码范围。
- 男性运行字段：orders.male 为 500×289，faceX `242.80575539568346`，inkLeft `81`、inkRight `350`，订单胸像版本 5。
- 退回历史：两张 v2 室内 CG 的源图静态审阅曾通过，随后用户明确否定场景，旧通过已撤回作为交付依据；旧源和旧参数仅留来源清单的 rejectedScenes，不再被运行 manifest 消费。
- v3 已交接并接入：`female-scene-v3.png`、`male-scene-v3.png` 均为 1024×1536，女 faceBounds `{x:376,y:624,width:254,height:186}`，男 `{x:331,y:467,width:220,height:208}`；缓存版本为 `orders-female-redesign-v3` 和 `orders-male-redesign-v3`。正文按成图写室外突风压帽抓蓝签、乡路篷车系稳防雨罩。旧 v2 来源仅保留于退回历史，不再被运行 manifest 消费。
- 男性四全身／四胸像及同屏静态、v3 两新源／两公开 WebP／消费最终运行元数据的八张四尺寸静态均已独审通过。PM 已亲开两张最终 390×844 成品静态，确认脸、手、蓝签、绳栓及 Logo／进度完整。审图报告与证据清单记录各层级；该结论不构成当前用户认可。
- 本任务交付已冻结，所有权结束；最终编译由 PM 在全部成果收齐后执行，本卡未记录编译通过。
- 用户本次明确允许的测试、冒烟、预览、检查脚本、试编译、语法或运行时验证：无；本任务未执行。普通文件读写、素材生成与转换属于交付工作。
- 源图与成品、静态布局证据和实际运行分别记录；当前实际运行未验证，不能据静态结果关闭该项。
- 子代理不编译；全部模块、资料及资源完成后仅由 PM 执行最终编译。
- 本次推送授权：无，不推送。

最终编译：全部资源、接入和独审记录冻结后，由 PM 执行 `npm run build`，退出码 0。Vite 主包为 878.60 kB，触发 500 kB 体积提示；构建完成。未运行测试、预览或游戏运行验证，未推送。

## OR-CLEAN：用户授权清除废案

用户新指示为「清除废案文件」。本项是同一目标的源资料清理直接依赖链，复用 order_art 上下文；一个不可再分输出由单一所有者完成，不另起图像生成、不拆多个清理代理。

| agent | objective | artifact | 所有权状态 |
| --- | --- | --- | --- |
| order_art | 删除 PM 指定订单废案，修正当前导出/证据生成入口及历史可用性记录 | 指定旧源和旧证据；orders 两 README、source-manifest.json；export-order-redesign-v2.mjs；本轮审图 md/json/静态脚本、两份历史审图说明、本卡及反馈顶部 | 已完成并结束 |

边界为「读取订单原画/导出/审图入口→仅指定旧方案文件→允许删除已列名废案和修正依赖/记录→必须保留现用女性四原稿、男性四原稿及提示词、两 v3 源及提示词、背景、锚点、全部 src/public/dist 和最终证据→以精确删除路径/原哈希/字节数及实际文件写入记录交付」。用户已授权本轮删除，无二次确认；未授权测试、检查、预览、语法/运行时验证、试编译或 push。

执行前对 26 个文件及 3 个空目录逐项 Resolve-Path，确认最终绝对路径均在 D:\myProject\idle-farm\tianjian-workshop 内且匹配 PM 列名。使用 PowerShell Remove-Item -LiteralPath 逐个删文件，再删空目录；未递归删除，未跨 shell 转交。

实际清理结果：26 个文件，32,406,211 字节（约 30.9 MiB），3 个空目录。分组为 managers/orders/seal-clerk 的 7 文件、loading/solo/orders/seal-clerk 的 1 文件、旧 female.png/提示词 2 文件、redesign-v2 旧两 CG/首版退回及提示词 6 文件、female-source/female-current 的 8 证据图及 2 旧清单。每个精确路径、SHA256、字节数及 deleted:true/available:false 记入 source-manifest.json.cleanup；拒稿原因/原路径/哈希保留文字历史。

现用源图/完整提示词/锚点与公开字节未修改，src/public/dist 和外部 .codex/generated_images 未触碰。导出不再 describe 已删拒稿源，保留清单内纯文字历史；独审再生成只保留当前源/公开图模式。当前 README 改指 redesign-v2，历史审图追加删除可用性说明。

本项未运行转换、审图再生成、测试、检查、预览、语法/运行时验证或编译，未推送。普通文件读写、属性/哈希读取与本次删除是交付操作，不据清理宣布用户认可新画面。唯一所有者现结束所有权，交 PM 阅读实际改动收口。

PM 收口时发现 18 个已删除废案此前仍在 Git 暂存区，仅对清理清单中对应路径执行 `git add -u -- <路径>` 同步删除；其他暂存项未改，未提交或推送。
