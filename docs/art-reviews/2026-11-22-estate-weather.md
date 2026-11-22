# 首页天气素材独立审图

2026-11-22，EW-REVIEW。当前普通10形与右向动物4形共同作为晴天阴影，使用同一3–10片池。源／PNG／WebP静态形态结论保留，十四形真实阴影尺度与最终不重叠的3／10片分散端点已合成并直接实开。独立白色动物前景已被用户否定、由统一阴影取代；全部入口云散已被用户取消。未验证真实游戏运行、连续漂移、点击、性能、音色或用户最终认可。

## 当前结论

| 对象／用途 | 结论 | 实际看图依据 |
| --- | --- | --- |
| 普通云形0–9源／PNG／WebP | 通过，仅源／成品静态层级 | 精确版本已分别实开；十种完整轮廓可区分，像素阶梯、白／浅灰分组与地图参考一致。正常草地合成及局部6倍图未见外部碎纹、蓝青点或底色污染。黑底查看器的低Alpha白碎纹未被单独视为失败。 |
| 动物云r2源／PNG／WebP | 通过，仅源／成品静态层级 | 逐格确认兔双耳、猫卷尾、鲸叉尾、龟圆顶／短足完整，四形均右头左尾，无运行镜像。它们为云团轮廓，不是活体资产。正常底色未见外部白雾或蓝边。 |
| 统一十四形真实阴影尺度 | 通过，仅静态辨识 | 320／390两种地图宽度，逐形查看widthRatio 0.60和0.86、height=width×0.24、tint 0x213e4c、Alpha 0.13。320宽纹理跨度192–275.2px，高46.08–66.048px；390宽为234–335.4px，高56.16–80.496px。普通十形主要分组可区分，动物四形仍能以耳、卷尾、叉尾及圆顶／短足辨认，阴影右头保留。没有白色动物前景或外部矩形雾／杂边。 |
| 统一3／10片分散端点 | 通过，仅最终静态样本 | 两种地图宽度已实开普通／动物混合3片和10片图，使用最终互斥随机高度带公式。云影分散且没有互相叠压，轮廓／深色／透明度一致。3片从覆盖代价近优候选中固定采样高度带，10片各占一带；shape为范围内手选混合用例，其他值为固定hash样本，不是运行随机序列，不能证明真实运行分布、补云时序或所有设备采样。 |
| 单片连续接续及右向 | 仅源码事实，运行未验证 | 当前weather/clouds只读路径显示同一10 Sprite池选shape0–13，各片正速度右移；按各形Alpha128 bounds确定退出和下一片入场，替补不等整批、无独立40–70秒动物等待。初始／真转晴整体2秒渐显，替补不重新渐显。静态图片不作为真实连续体验通过证据。 |

用户要求云影覆盖建筑和建筑名字，HUD、菜单和Dialog保持其上。本文地景合成只用于辨形／Alpha，不能作为建筑和名字叠层的浏览器验收；实际接入与层级由PM按源码核对。当前无待重画的源／导出失败项，当前运行及用户认可仍未验证。

## 精确素材与来源

| 角色 | 当前文件 | SHA256 |
| --- | --- | --- |
| 认可画风参考 | `public/art/estate/background.webp` | `e7c2ce1e9f4d71ab7ad5c6b2928012f227c22c7a0978bd805062915508cda803` |
| 普通十云原画 1983×793 | `assets/source/art/estate-weather/shapes-v2/cloud-shapes-v2-r3.png` | `3bf7aab4fe66a896557352e8be263f8c2dda1cc9a4a49db5df62bf0cac669cef` |
| 普通十云 PNG | `assets/source/art/estate-weather/shapes-v2/cloud-shapes-v2.png` | `7112b326a3a8d566240264b1d067184e6270f611346a9c1680b8a5a7fec8dca7` |
| 普通十云 WebP 1280×256／45958B | `public/art/estate/atmosphere/cloud-shapes-v2.webp` | `e4c171adee2e94d863ae6bdb305b05f0e829f68eb5efe4bb80577a1c6e84aeab` |
| 右向动物云 r2 原画 1774×887 | `assets/source/art/estate-weather/animals-v1/animal-clouds-r2.png` | `ecfcf8e36d51b3566f44bcdceda6e797620d7e6826118210f4ad7855fa10a2d3` |
| 右向动物云 PNG | `assets/source/art/estate-weather/animals-v1/animal-clouds-v1.png` | `83a0e8f78486eeaf10e786368f4f9052953e6b2810a7d85e537f9fa3f60c285b` |
| 右向动物云 WebP 512×256／20558B | `public/art/estate/atmosphere/animal-clouds-v1.webp` | `c04b46b05ffa24a1cdb000e2ae745747d3a9bfda366c7e8129e3792e2dbb4929` |

参考地图已实开，`docs/assets.md`登记其为认可地图。两atlas的字节与本轮源形态审图版本一致。已阅读shapes-v2和animals-v1的生成、提示词、layout、conversion及导出脚本；普通10形为5×2，动物4形为2×2，均row-major、每格256×128，nearest等比inside 244×116后透明居中，WebP70／Alpha100。动物r2由内置image_gen局部编辑右向，不是程序镜像；原稿及r1来源保留。

当前只读`src/view/estate-clouds.js`与`src/view/estate-weather.js`，不import或执行。shape0–9读取普通atlas，10兔／11猫／12鲸／13龟读取右向动物atlas。每片x(t)=x0+(motionMs−startedAt)×speed，speed=1.9/(145000+55000u)>0；正常初始x0=u，之后替补x0=1/W−widthRatio×((bounds.left+bounds.width)/256−0.5)，实际右缘从左边内1px出现；exitX=1−widthRatio×(bounds.left/256−0.5)，实际左缘到地图右界即逐槽补下一片并保留时间余量。上述为源码读取记录，未运行验证。动物不再使用独立白色前景模块。

不重叠的源码边界：每槽固定高度带b/10至(b+1)/10，w为该片widthRatio，r=0.24w/(2×2.1)，y在[b/10+0.0005+r,(b+1)/10−0.0005−r]内随机。实际frame半高为0.12wW，地图H=round(2.36W)，rH大于实际半高，完整frame留在各自互斥带内。不同x、正速度、形状和同槽替补不会跨带；数量变更从覆盖代价近优候选随机选desiredBands，保留现存片位置，减少等该片自然出界。这是对当前源码结构及不等式的说明，不是运行验证。

## 证据与复现

证据图仅本地保存；全部路径、逐项SHA256、输入与源码读取哈希、current／superseded状态见同名JSON。当前证据重生成命令：`node scripts/review-estate-weather.mjs`；无参数只生成十四形阴影和3／10片静态证据，不生成已取消入口或白色动物前景。脚本保留显式`--historical`历史复现分支，本轮未执行；不能把其存在当作当前入口或前景授权。

本轮最终生成8张当前证据：两尺寸×最小／最大跨度的十四形单体图，及两尺寸×3／10片互斥高度带分散图。四张旧随机y混合图因出现重叠改为superseded，不作为当前通过。十四形图按row-major排列，0–9普通，10兔、11猫、12鲸、13龟，最后两格空；每格为原地图实际像素裁片，没有放大。计数图为初始2秒渐显结束时的静态用例，池中片数包括视口外或边缘裁切部分。合成地图只是审阅底层，不是素材背景；不含建筑、名字、HUD、Dialog、菜单、飞鸟、暖阳、加工烟或音频，不是运行截图。Sharp取整／采样与PixiJS可有像素差异。

## 历史与未验证边界

- 全部入口版本v1／v2／v4均用户否定／取消，证据标superseded／user_rejected_cancelled；旧动图及哈希保留。巨大12云、双bank方案未生成正式证据，64小云阶段也未作最终审图。
- 旧白色动物前景widthRatio 0.22–0.36、Alpha 0.28–0.38及其actual图全部superseded，不能作为当前动物云用法通过。旧普通专用整批云影图及统一池旧随机y重叠图亦superseded；当前为普通和动物统一逐片、互斥高度带阴影流。
- 动物r1兔／猫／鲸左向已由r2取代，history-r1保留旧PNG／WebP／metadata。旧public单云已删除取代，原发布字节留`shapes-v2/clouds-v1-export.webp`，SHA256 `6ca64e4695a2efe4d6eb54f38bfecb6c1771e4624c249bf98c6866db7a9a45aa`。
- 游戏运行、逐片接续、随机数量调整、晴雨切换、建筑名字遮挡、点击与滚动、帧率／内存、雨声音色与舒适度、用户最终认可均未验证。未执行测试、冒烟、游戏预览、试听、语法／运行时检查、art:check、编译或推送。本轮未生成动图，未修改源图、发布图集或运行代码。

本报告、同名JSON及`scripts/review-estate-weather.mjs`完成交回PM，EW-REVIEW结束三文件所有权。

## 当前本地证据清单

证据图仅本地保存；最终新证据为四张unified-shadow-14单体图及四张unified-dispersed-count分散图。

| 本地路径 | SHA256 |
| --- | --- |
| `assets/source/art/estate-weather/reviews/sourceV2-grass.png` | `6a99a41a7584830395589eaf4efd88325edcef8f933d3ec9436e693128c59551` |
| `assets/source/art/estate-weather/reviews/pngV2-grass.png` | `8fbff589d1555096043f7f8da53c72a8e8d322f71948353d58c470a2ac80c07d` |
| `assets/source/art/estate-weather/reviews/webpV2-grass.png` | `69dd4cbf90c00fad115efe2f603ffbce111224d6cda89ac14fb3f51e929b9b7f` |
| `assets/source/art/estate-weather/reviews/animalSourceR2-grass.png` | `3c54d4ffa57d6cc3c2e3d313e46ba900a2fdd32d0da009617386abd05eb64565` |
| `assets/source/art/estate-weather/reviews/animalPngR2-grass.png` | `f86e9579210ccdb047268cbf99d260de4cf6a3ce6ffebeca136783edb959282c` |
| `assets/source/art/estate-weather/reviews/animalWebpR2-grass.png` | `30658aedd53b0ecef3cf1ef8afb6f6fe060436f94056ead3e2ce3b62bd5b61f4` |
| `assets/source/art/estate-weather/reviews/v2-atlas-edge-6x.png` | `b5702001a95c16c0edcc5d3c54a0549abf5aa2d7d1089a1c7f6d9f68b3376f28` |
| `assets/source/art/estate-weather/reviews/animal-r2-edge-6x.png` | `f807bd7b019c808aa31b694ffcda16401f76ef320922e719ff1450d158275940` |
| `assets/source/art/estate-weather/reviews/unified-shadow-14-320-60.png` | `a7e9feffe5552bdccc3101f931fcb7459b86175df631def102c0763bb4056558` |
| `assets/source/art/estate-weather/reviews/unified-shadow-14-320-86.png` | `1f601e733f04f9cdc38d45a5395c3beefb0536d2ecb770766e6ea7f73f4fac3f` |
| `assets/source/art/estate-weather/reviews/unified-shadow-14-390-60.png` | `273eb38e64d67aa98266addb95e145ec6e4645b33d4077bd2e4aa20b0f5c4086` |
| `assets/source/art/estate-weather/reviews/unified-shadow-14-390-86.png` | `cbc9ea853d2e8da9583d52c6b5f8e978dc223a138b74694032a76e10430f10cb` |
| `assets/source/art/estate-weather/reviews/unified-dispersed-count3-320x693.png` | `d241f87452ae143190c088bc18e956b5aa96af6045ea3925c81fce32e3e5df0c` |
| `assets/source/art/estate-weather/reviews/unified-dispersed-count10-320x693.png` | `abbc060218d1082f3cf5b716a6cca78042aec444e57ac1b169adacfd37b8179f` |
| `assets/source/art/estate-weather/reviews/unified-dispersed-count3-390x844.png` | `6d085f940180bdcb8c42c15ffe90318c46baca1d32d3899c2079de97bcb4d3c3` |
| `assets/source/art/estate-weather/reviews/unified-dispersed-count10-390x844.png` | `bfb8d283c4d6171344b55530e7e4416c72006f8ab468279bf941eae8bd03931f` |
