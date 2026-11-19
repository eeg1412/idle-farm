# 新档男女搭配与22形象开屏

基线GitHub main b32224f与Sites v66代码树相同，Sites源码HEAD708e978。PM已读源码：newRelationship固定female，newWorld→newManagers，因此当前新档11岗全女性；world-save.managerRecord对缺managers的旧档也复用newManagers，需要与新档默认隔离。用户要求：以后新档采用现在11人开屏同一男女搭配；新的开屏同时展示11岗位的男女形象共22人。

## 冻结新档默认（以当前11人图为依据）

| id | 默认 | id | 默认 |
| --- | --- | --- | --- |
| tasks | female | estate | male |
| livestock | female | field | male |
| mine | female | fish | male |
| processing | female | refining | male |
| warehouse | female | research | male |
| merchant | female | — | — |

本表6女5男，仅新档。正常旧档继续读取已保存gender，旧档缺关系字段仍按历史全女性初始化；出售庄园/周回不重置已选形象。好感、额度、心愿、回礼、数值、存档schema不改。新的22人开屏顺序不得反过来改变本表。

## 所有权与上下文

PM `/root`拥有本文、反馈清单、docs/assets.md、管理员规格文档，负责调度、整合、最终编译与原Sites发布。各代理新干净上下文，按独立成果物分工，不继承旧的11人通过结论。

- `manager_newgame_defaults`：独占 `src/game/managers.js`、必要的 `src/platform/world-save.js`；只实现新档映射及旧档兼容隔离，导出显式只读按id默认表，不能用数组奇偶推断；最少读newManagers/newRelationship、world.newWorld和resetManagerRun、world-save.managerRecord及相关编解码。可读已有测试了解断言，不新写本次低影响测试、不运行任何验证。若需第三个文件，先报PM。交付新档/正常旧档/缺字段旧档/周回四条静态调用路径。
- `loading_all22`：独占 `assets/source/art/loading/`（不含review-all22）、`public/art/loading/managers.webp`、`scripts/export-loading-art.mjs`、`src/view/loading-layout.js` 及必要的loading-screen只资源/尺寸接线。内置imagegen新绘22人群像，以22张现有微笑全身原画为唯一身份依据；保留11人composition-v2到history/composition-v2。创建可识别角色id+gender参考登记/联系表及生成提示词/源图/导出记录。保持背景/中文LOGO原字节与底部进度区。完整外轮廓，无画内硬裁、渐隐/遮边。参考范围 `docs/Pixel-Characters-Complete-Pack/立绘/**/*微笑.png` 22张，角色设定仅辅助，原画优先。layout可更新固定原图尺寸/真实Alpha边界/scale上限以适配22人，纯loadingLayout返回字段不变，底部进度、safe inset、失败操作仍可见；不改计时/任务/重试/音效/存档或其他页面。发布仍managers.webp，URL game=1保留、v更新。WebP70/Alpha100/严格等比nearest，源图/提示词/实际引用保留。先向PM与审阅者冻结22人位置-id-gender映射；可用6/6/6/4四排自然群像让岗位男女邻近，但不要矩形网格或程序拼贴代画。所有22脸需独立可辨，不允许漏人、重复人或用默认11人静态复用冒充22。
- `loading_all22_review`：独占 `docs/art-reviews/2026-11-19-loading-all22.md`、`assets/source/art/loading/review-all22/`。按farm-art-review实际打开全部22个身份参考、新源图/WebP、正常底边缘与手机四尺寸正常/失败/存档问题合成，另390安全区/844横屏入口。逐个列22身份位置并数人，不能只相信prompt/文件尺寸；查漏重复、脸/手/道具瑕疵、轮廓、像素风、底部progress与可辨性。具体问题立即退作者，更新精确hash后复查。可复制旧静态合成工具至自己的目录，导入纯几何作静态图；不改素材实现。旧11人审阅不能作为本轮通过。若22人变小，要按实际手机图判断能否识别全部，必要时退回重排，不准只数够22即过。

## 共用规约、依赖、权限

先读AGENTS.md、docs/development.md无人值守实装、farm-task-dispatch所有权规约；素材作者读imagegen技能，审阅者读farm-art-review及checklist；画布相关遵守docs/performance.md。不共享写文件；新档默认与素材任务可并行，审阅等待源/布局精确冻结，缺陷由原作者改。持续汇报接手/阶段/阻塞/交付，最后明确结束所有权。

普通读写、图像生成/转换、静态开图/合成允许。未经用户明确授权禁止运行测试、语法/运行检查、浏览器/游戏预览、冒烟或试编译。全部代码/资料/素材/审阅完成后仅PM最终生产构建，延续发布原Sites；不推GitHub。新默认代码只改性别初始化，不涉及经济数值变更。PM亲读实际路径、亲开最终关键图，不能仅凭代理报告结案。

## 新档默认实现交接

`manager_newgame_defaults` 已冻结并结束managers.js/world-save.js所有权。PM读取实际diff与newWorld/sellFarm/managerRecord路径：managerDefaultGenders为显式冻结11项表；newManagers(day,{legacyAllFemale=false}={})的新档默认读取该表；正常旧档读取已有gender；缺managers旧档显式legacyAllFemale=true；sellFarm只经resetManagerRun展开保留现有role。仅性别初始化与历史迁移分流改动，schema/经济/好感/回礼不变；未执行运行验证。

## 22形象素材修订记录

首轮源图独审数齐22人，但加工女敞口齿轮箱被画成合书、仓库女印章被画成铃，退回单ALL22-01由素材所有者用imagegen定点修正。首轮源图、提示词和11人历史版分别保留，实际输入登记区分各轮，不把旧错误提示写成身份规格。

二轮候选源PNG SHA256 `bcc032630ff2abd1e5992125a89086358b182f9b8004ca6056fec444a0906a2a`，发布WebP SHA256 `6f0f61de5addac3c5de04aa08c712674ade274dfd4c4e661fc0da266803a3468`。PM已实际打开发布WebP，按后至前6/6/6/4数齐22脸，前排四人鞋脚完整；仍待独审最终源图与手机静态合成结论，不据此宣告通过。运行消费 `all22-v1`，保留`game=1`缓存参数，背景/LOGO未改。

二轮独审发现精炼女原画钳夹金块仍被画成单轴画笔，另开ALL22-02交原作者局部重绘；二轮不算最终通过。PM已亲开二轮390×844正常、320×568存档问题静态图，22张脸独立可见、鞋脚与底部进度/操作区未遮挡，暂未发现需改布局项；最终须按修订后精确WebP重新合成复查。

| 排 | 从左至右（F女、M男） |
| --- | --- |
| R1 | tasks F/M、estate F/M、livestock F/M |
| R2 | field F/M、mine F/M、fish F/M |
| R3 | processing F/M、refining F/M、warehouse F/M |
| R4 | research F/M、merchant F/M |

## 第三轮最终候选

素材所有者已按ALL22-02恢复精炼女双臂钳夹独立矩形金块，其余齿轮箱、印章、22身份和排位保持。源PNG SHA256 `e99a275db1fc05c9bdcd236d44897f985611e1df6c0f4941cfc7cce80af2d8bc`，发布WebP SHA256 `193d395c3abcbabbecfb1a535d823f535160312974d4340f760045706522a88b`；当前layout SHA256 `72de1ea255b482210a0715b0703443cfbd4eb6b7754afe48536d1d983b9bc3f2`，真实成品Alpha边界`{x:24,y:109,width:976,height:1148}`。

PM已实际打开该WebP与`review-all22/final/normal-390x844.png`、`problem-320x568.png`，复核22脸位置、钳口金块、完整前排鞋脚和底部进度/操作区；未见内部硬裁或遮挡。所有实现diff已读：只改新档性别默认、历史迁移分流及开屏人物版本/边界/最大宽度，背景/LOGO原字节不变，加载状态机与其他玩法未改。待独立最终报告与所有权冻结后执行最终生产构建。

## 独立审阅交付

`loading_all22_review`已完成并结束报告/证据目录所有权，第三轮精确hash与以上一致。PM已读取最终报告：22张原画独立逐个对照、第三轮源/WebP正常底色与局部、最终18张静态图分别实开，全部竖屏四尺寸三状态与安全区通过，ALL22-01/02闭环。横屏仅确认固定竖幅入口、完整轮廓和底部控件，不把极小群像细五官计入通过。未执行测试、语法/运行检查或游戏/浏览器预览。最终报告为`docs/art-reviews/2026-11-19-loading-all22.md`。

## 最终构建与发布交接

三位文件所有者均已明确结束所有权。PM在全部成果冻结后执行一次Sites `build-site.mjs`，实际运行`vite build && node scripts/build-offline.mjs`，退出码0；813模块转换，离线构建完成。仅有npm既有代理配置及Vite大chunk提示，无构建失败。此后仅补交付文档，不改构建输入；使用同一`dist`打包，继续原公开Sites项目`appgprj_6af6f5cdb9c881918454442c453d2d2d`，保持域名与访问范围，不向GitHub推送。
