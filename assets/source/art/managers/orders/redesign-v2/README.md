# 订单管理员 v2 人物与 v3 开屏原画记录

本轮 OR-ART 交付由 order_art 单独生成与转换，原画均使用内置 image_gen；没有使用 CLI 或程序绘画。机器来源清单为 [source-manifest.json](source-manifest.json)，包含六张最终源图、发布成品、原始生成文件、SHA256、完整提示词路径、裁切与面部登记。

## 新男性形象与动作

奥林为暖深棕微卷短发、蜂蜜褐眼的修长青年。赭金短外套配深棕滚边与黄铜扣，内穿靛蓝马甲及乳白立领衬衫，领前系短乳白围巾；靛蓝长裤与红棕系带短靴。棕色斜肩皮带穿过胸前，靛蓝订单夹以黄铜绳结扣合拢。

全身立绘肩胸、胯膝与双脚朝画面右前；头回转、双眼看玩家。一手把竖式订单夹贴稳身侧，另一手在胸肩前抬起放松的掌心，示意来人慢慢说。四表情保留同一身体姿态。先交微笑全身，经独立审图允许扩展后才生成其余表情。

## 最终源图与完整提示词

- [男性微笑](male-smile.png) · [完整提示词](male-smile.prompt.txt)
- [男性高兴](male-happy.png) · [完整提示词](male-happy.prompt.txt)
- [男性生气](male-angry.png) · [完整提示词](male-angry.prompt.txt)
- [男性失落](male-sad.png) · [完整提示词](male-sad.prompt.txt)
- 当前女性 CG：`assets/source/art/loading/solo/orders/redesign-v2/female-scene-v3.png`，完整提示词为同目录 `female-scene-v3.prompt.txt`。
- 当前男性 CG：`assets/source/art/loading/solo/orders/redesign-v2/male-scene-v3.png`，完整提示词为同目录 `male-scene-v3.prompt.txt`。

当前 v3 女性 CG 是订单中心门前起风：茜梨一手压帽，另一手抓回被吹起的蓝色货签，脸红抬眉、强作镇定，邮差包贴身。当前 v3 男性 CG 是雨将至的乡间出发前：奥林在有篷小货车前捏住防雨布角，另一手拉紧系在木栓上的绳子，回头回应画外来人。两图均从身份图重新生成，没有输入被否定的室内柜台/书架场景。

## 参考与修订链

历史 v2 女性最初 CG 仅以 `assets/source/art/managers/orders/anime/female-smile.png` 锁定身份，`public/art/loading/scenes/warehouse-male.webp` 仅作非订单像素画风参考。第一版在长屏中心裁切时截断按包角的手部，退回编号 OR-V2-01；历史文件名为 `female-scene-rejected-v1.png` 与 `female-scene-rejected-v1.prompt.txt`。历史 v2 修订把双手和绳结移回中心安全区，未修改运行布局。随后用户明确否定男女两张室内 CG 并要求重新构思场景。

用户在 2026-11-22 要求清除废案后，上述首版与 `female-scene.png`、`male-scene.png` 及各自提示词均已从项目删除。机器清单 `rejectedScenes`、`rejectedRevision` 和 `cleanup` 保留原路径、SHA256、退回原因与生成来源文字，并将已删本地文件标为 `deleted:true`、`available:false`；旧 output hash 是当时发布字节的历史记录。废案源与对应旧证据无法从已删文件重新生成。外部 `.codex/generated_images` 未清理，其路径仅作生成来源文字，不承诺可用性。

男性底稿从零生成，未向绘图工具输入旧男性设计。男性扩展表情只输入本轮已审底稿。历史 v2 男 CG 以新底稿锁身份，warehouse 男 CG 仅作非订单画风参考。先前允许查看的非订单任务男全身只用于理解项目画风，没有作为男性生成输入。

当前 v3 女性 CG 唯一输入为原 `female-smile.png`，男性 CG 唯一输入为本轮 `redesign-v2/male-smile.png`；两次均调用内置 image_gen 从新场景生成，不使用任何拒稿 CG 输入。当前两图的原始生成路径、完整提示词、源与成品哈希和 faceBounds 在 `source-manifest.json` 的 `scenes` 中登记。

## 转换与边界

导出入口为 `scripts/export-order-redesign-v2.mjs`，使用项目已有 sharp。本次 CG-only 返修执行 `node scripts/export-order-redesign-v2.mjs --scenes-only`，只写两张 CG 与来源清单，四男性胸像及 anchors 未重写；脚本默认只转换 CG，全量人物转换须显式传 `--all`。男性源图裁切 [95,0,929,472]，nearest 等比到约 0.6 倍的 500×283，上补 6px 透明区，成品 500×289；不把全身缩进胸像。两 CG 直接 WebP90 编码，尺寸 1024×1536，无重采样。女性立绘和四张胸像未修改；anchors.json 只替换 male 字段。运行读取的内容清单与代码由 integration 所有者接入。

源图、发布图与游戏运行分别验收。order_art 只执行普通资源生成/转换与看图，没有运行测试、冒烟、预览、试编译、语法或运行时检查；最终编译由 PM 执行。实际游戏运行体验未验证。独立审图记录由 order_art_review 维护，用户认可单列。

## 2026-11-22 废案清理

用户授权清除废案后，单一所有者 order_art 删除 26 个明确废案文件，共 32,406,211 字节（约 30.9 MiB），并移除 3 个空旧目录。逐项绝对路径均先 Resolve-Path 确认为本仓库内指定目标，使用 PowerShell Remove-Item -LiteralPath 单文件删除，没有递归清理。

现用男女原稿、男性四表情与完整提示词、v3 两 CG 与完整提示词、背景和锚点全部保留。未修改 src、public、dist 或外部生成目录。专用导出改为从清单保留拒稿元数据，不再读取已删废案；独审证据脚本移除旧 female-source/female-current 模式，只从当前人物、v3 源图与现用公开图重生成。完整删除清单、原路径、SHA256 和字节数见 source-manifest.json 的 cleanup。

本次未运行转换、审图再生成、测试、检查、预览、编译或语法/运行时验证；只做文件读取、属性/哈希读取、删除与记录更新。清理不构成用户认可当前画面。
