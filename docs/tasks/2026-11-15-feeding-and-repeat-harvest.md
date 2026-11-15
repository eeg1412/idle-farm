# 图鉴数量、进食 idle 与连续采收

用户本轮要求：PT19 图鉴「配方材料」右侧数量不得换行；全部牲畜 idle 改为吃饲料；作物显式分整株采收和保留植株采收，后者首次换种走种子至成熟，第二轮起仅从无果／无花到有果／有花，先审已有素材再决定补画。

PM 负责本卡、反馈清单、接口调度、实际调用链阅读与整合。所有人均非独占仓库，不得撤销他人修改。用户未授权测试、冒烟、预览、语法／运行时检查、试编译或推送；仅普通读写、素材生成／转换与静态审图。不得自行运行最终构建。

| 任务 | 所有者／可写 | 精确输入与输出／交接 |
| --- | --- | --- |
| CAT-NOWRAP | canvas_shell：canvas-ui.js、management-pages.js | 输入截图和 management-pages.js 的「配方材料」heading aside；输出单行数量栏，按文字真实宽度／受限自适应避免挤换行，不能靠固定一行高度裁字。保留单画布。canvas-ui.js 共享修改仅此所有者。 |
| C-HARVEST-AUDIT | fish_art_review：新 docs/art-reviews/2026-11-15-repeat-harvest-crops.md、src/content/crop-harvest.json、素材交接审图文件 | 审目录全部 C ID 和真实单株 growing/mature，显式 wholePlant/retainedPlant、采收部分、可用的无采收部位成熟植株资源／需补画。不得把小苗缩放成成年无果树，不凭路径存在判定。冻结 manifest 后交 crop_scale。 |
| C-REPEAT | crop_scale：plot-animation.js、crop exporter Node/Python、crop-visuals.json、crop-layout.json、assets/plot 下新增源图及派生图、public/art/plot/plants | 输入审图 manifest；输出首轮四期、连续轮无果／花到成熟，保留树体不全株淡出，逐株位置与透视不变。缺成年无果素材时用内置 image_gen 精准补画独立单株，保留来源。先确定接口，后生产转换。不得使用整田图。 |
| C-SESSION | economy_upgrade：world.js、platform 世界存档与验证的必要文件 | 输入换种／批次生产路径；输出持久首次种植展示起点与首轮时长，换种重置、同品种连续生产保留、读档／离线不回种子；不改产量、经济、任务统计、档版本或已有物品 ID。先交最小字段提案。 |
| L-FEED-ART | fish_assets：assets/livestock 全部、public/art/livestock、livestock choice icons 与同 ID source/scene、livestock-visuals.json、export-livestock-animation.mjs | 输入现有已认可 pixel-v4 风格与真实布局；输出全部10类20阶段80帧的真实吃饲料动作原画／图集，固定脚点和躯干，头颈低头啄食／咀嚼，饲料或食槽分层登记；不可用整动物旋转或缩放假装。保留原 canonical 产物图，不改经济。独占此轮所有 image_gen 畜牧资产生成。 |
| L-FEED-RUNTIME | livestock_scale：livestock-animation.js、livestock-layout.js | 阅读现有尺寸／阴影／产品规则，先与素材所有者冻结 feed 接口，消费真实进食帧及每只独立饲料，维持3/2/1和透视、固定脚印及成熟肉品位置，9秒保底和产物淡变不改。 |
| AUDIO-NO-HARVEST | production_ui：src/main.js、src/platform/farm-audio.js | 用户追加不要收获音效。移除全局自动生产／收成的 harvest/finish 触发及无用音型，保留主动操作音和背景音乐，不改生产结算；确认跨页播放的可见性条件。 |
| TEXT-100 / GRAPHIC-ARROWS | canvas_shell：相关view页面与公共canvas；production_ui：main.js设置动作；economy_upgrade：world/save | 用户追加设置不显示文字大小、固定100%；所有可见方向／返回按钮用程序图标，返回无「返回」文字。view固定scale=1、删控件、保留图标命中与内部语义；main不再接受文字缩放动作；旧档textScale兼容归一1。方向图形遍历所有实际页面调用，不改代码比较符号。 |
| IMPORT-NO-RESPONSE | production_ui：save-transfer.js/main.js；canvas_shell：management-pages.js/canvas-ui.js | 用户导出后导入无反应；逐段读取文件选择→读取→严格同版／环境校验→摘要确认→原子替换。可证实旧null／取消分支静默，长内容错误可能在视口外；补读取状态、取消／失败／成功反馈和同步用户手势中的文件API调用，保留单画布、禁止DOM文件input。未获浏览器验证，不假称复现确切设备根因。 |
| SALE-RESET-STATIONS | economy_upgrade：world.js；canvas_shell：management-pages.js；PM：常规规格 | 用户明确出售牧场后工位不保留。重置加工／精制各1初始空闲工位、order0/1，清配方／优先级／在制，不退在制投入、不制造事件；研发／品质／科技／历史任务等其他保留规则不扩大改动。报价快照仍跟踪受影响数量防旧确认，预览／说明不再说保留工位。 |
| LIVE-COUNTDOWN | production_ui：main.js、production-pages.js调用迁移；canvas_shell：canvas-ui.js实现 | 用户短批次倒计时/进度条会停住，1后下一轮从4开始。源码发现数字仅1Hz快照、bar逐帧但1000ms封顶、保存pending跳过采样、旧batch bar满格后移出更新集。冻结API：ui.countdown(label,{type:'facility'\|'station',kind,index},{format:remainingTime,...rowOptions})与ui.batchProgress(batch,{type,kind,index})；timing为{anchor,epoch}。同一连续展示clock，数字变更才改Text、bar按稳定设施/工位key解析最新display批次；主显示在最近batch.end边界及时投影，普通保存不阻只读展示，不每帧clone/rebuild。import/clear/sell重置展示时钟，真实生产/事务/产量/周期不改。源级实现，不授权计时实验或预览。 |

最少资料：各所有者只读上述输入、相关 skill 的 delivery、docs/development.md 对应动画节。素材按 farm-art-review 交精确源稿和发布 WebP、实际小尺寸与固定注册分镜；静态结论与运行体验分开。技能／规范同步由 fish_skill 独占 crops/livestock skill 目录，PM 写常规文档。资源门如需新字段，由 economy_upgrade 单独接手 scripts/check-facility-art.mjs，不与其他人交叉编辑。

审阅输入已交齐后所有权交接：`crop_retained_review`接手`crop-harvest.json`和本轮作物审图报告，仅负责30个新采后图及16个复用图的最终固定尺度／单株PNG/WebP／小尺寸静态复审，合格后对应ID改approvedArtwork；不改或生成原画。`fish_art_review`停止修改这两个作物文件，独占本轮`docs/art-reviews/2026-11-15-livestock-feeding.md`并负责新进食素材审阅。补画失败退回原所有者crop_scale／fish_assets，不以程序修画。新素材未审齐和真实运行未验证的边界保留。

本卡源码／资源交付已齐，PM已读取实际路径并记录于feedback-checklist；后续选择/饲料被用户重开，最终V7／v6-r3交付和50级科技分别由后续任务卡跟踪。图鉴单行不能以旧header结论代替本次源码，所有真实画布/计时/经济验收仍未运行。未测试、预览、编译或发布。
