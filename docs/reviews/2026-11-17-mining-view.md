# 矿业画布与矿车交付

## 范围与实际消费路径

- `src/view/production-pages.js`：牧场第四页签「矿洞」，复用设施列表、购买、开采／更换矿种、详情、升级、批量管理、清空、紧凑模式、选择网格与行情；新增 M 对应场景和空设施图。`navigation.js` 提供 `#/farm?tab=mining`，旧页签路由保留。
- `management-pages.js`：仓库、图鉴、行情筛选新增矿业，矿产原料分类与矿洞来源跳转，四行业复杂度标签、矿业任务图、出售牧场矿洞数量、导入摘要含矿洞提示。产出图表原来已按实际目录／设施计算，无需新分支。
- `research-page.js`：矿业来源筛选、经营改良矿业分组及七张独立科技图。`main.js` 仅增加购买成功文案；原投影复制按 Object.entries 遍历 M，无需更改。
- `canvas-ui.js`：可见矿洞才触发纹理加载，背景／车／前景共享且归动画固定缓存；矿物复用 canonical `wiki/icons/Mxx.webp`。加载完成仅请求当前仍可见矿种重绘，不持有旧卡节点。离屏／弹窗／切页／后台沿用原卸载路径，重绘按完整会话与尺寸签名停放复用。无图标／静态场景／程序占位回退。

矿洞横幅的 `mining` hero 键在 `drawImage` 特别映射至 `miningVisuals.background.path`，实际请求 `art/mining/background.webp`；没有请求不存在的 `art/mining.webp` 或 `hero-mining.webp`。
- `mining-animation.js` 仅创建 Pixi 容器及四层精灵，之后增量更新位置、尺寸和货物透明度。外层现有 ticker 标脏，无每秒整树重建。矿车和背景始终不淡出；洞口遮挡使用原画前景。

矿车洞内／空车停站且货载透明度不变时 update 返回 false，ticker 仅在至少一个动画返回非 false 时标脏。旧动画返回 undefined，沿用逐帧标脏行为；矿车位置与货载透明度相同则全部像素不变，跳过此标脏与属性写入等价，不改计时、产出或画面。

## 唯一时序与几何

`src/view/mining-layout.js` 是运行与合成器共用的纯函数：`sampleMiningAnimation`、`miningFrame`、`miningCargoRect`。素材几何直接消费 ART 独占的 `src/content/mining-visuals.json`：320 场景、96×64 矿车、轮脚锚点 (48,60)、轨道 (70,237)→(249,237)、货载框和锚点、全幅洞口前景。

首次空车 2 秒入洞；满载在展示完工前 2 秒出洞并到站；到站后货载 300ms smoothstep 淡出，停留 1 秒，空车再 2 秒入洞；展示最低 5300ms。短经济批次照常完成，显示会话不因经济续批重启。货物仅当前矿种，不产生经营事件或库存。

长批（真实时长≥5300ms）每帧只读当前经济批次 start/end：首批开头入洞，续批 start 是上批完工点，开头卸货／停留／返洞，end−2000ms 出洞并于 end 到站。矿业提速后的新批直接按新 end 对齐；设施升级保留当批起止，不重置相位。短批（真实时长<5300ms）才使用持久会话 startedAt 锚定独立 5300ms 展示。由长变短使用同一会话锚点，不产生新会话或经营事件。

## 会话与存档

PM 明确转交 `src/game/world.js` 与 `src/platform/world-save.js` 的矿车会话责任后，增加 `facility.mining={id,startedAt,durationMs}`。首次安排／换矿按真实首批 start/end 建立，续批／设施升级保留；清空和换矿删除旧会话，正常事务保存。矿车算法不写世界。

存档按白名单复制三个字段，校验矿种与 recipe 一致、起点非负整数且不晚于 world.clockMs、时长正整数且终点为安全整数。旧档无 M 仍默认为空数组；已有 M 活动批次但无 mining 时，用已存批次 start/end 恢复，避免按导入时刻重播。copySlots 共享会话引用安全：经营只赋新会话或删除 slot 字段，从不原地修改会话对象；投影续批不会改源世界。

## 真实关键帧交付

已获本轮明确授权执行 `node scripts/compose-mining-keyframes.mjs`，只消费相同运行纯函数和真实 ART WebP。输出 `assets/mining/keyframes/`：M01–M10，每品 14 帧，各 320px 和 130px，另有 `Mxx-contact-320.png`、`Mxx-contact-130.png` 联系表与 `keyframes.json` 的采样值／几何记录。9000ms 展示采样为 0、1000、2000、4500、7000、8000、9000、9150、9300、10300、11300、12300、17000、18000ms。

首轮已交独立 MIN-REVIEW 实际打开审图。关键帧只证明分镜，不能替代真实 Pixi 卡片体验；审图结论由独立所有者记录。

补充 `M01-fast-contact-{320,130}.png`：真实批次1000ms，展示5300ms，覆盖0/1000/2000/2650/3300/4300/5300/5450/5600/6600/7600/8600/9600/10600ms。`M01-speed-change-contact-{320,130}.png` 展示首批9000ms后新批6000ms、15000ms完工对齐，覆盖卸货、返洞、新末2秒与下次接缝。`keyframes.json` 记录全部采样的真实batch、图层几何和SHA256（背景／前景／矿车／各矿种图标／布局算法／元数据）。独立审图者已实际打开初版全部10矿种×14帧×2尺寸，初版静态层级未见退回缺陷；补图复查由其记录。

PM 转达独立 MIN-REVIEW 最终结论：10矿种、快速批次与提速后新批的320／130px同源关键帧静态通过，无未关闭项。真实 Pixi 运行体验仍未验证，不能以分镜通过替代。

## 授权与未验证

新增 `tests/mining-animation.test.js` 与 `tests/mining-view.test.js`，覆盖关键相位、短批次连续、真实几何及新旧路由。未运行测试、语法检查、浏览器、预览、试编译或编译；最终编译由 PM 负责。未执行 push。未编辑 ART 元数据／导出脚本／源图／公开素材。

现有单 canvas、纵向布局／横屏黑边、触控与键盘路径沿用原布局器；320／390／480 与横屏实际验收待独立用户授权。
