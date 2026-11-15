# 2026-11-15 作物大小与前后图层静态审阅

任务：[动画体型与界面反馈](../tasks/2026-11-15-layout-scale-feedback.md)。使用 `farm-art-review` 的静态素材审阅流程，不运行游戏或浏览器。素材版本为本轮 Node 合成器生成的前后层，配置为 `assets/plot/crop-layout.json`；没有重画已认可原画。

## 已取得证据

- PM 实际打开 `assets/plot/crops/C05/mature.png`，对照本轮 `assets/plot/crop-frames/C05-front.png`：原苹果树的树干、树冠及果实身份保持，前排完整树形随根位透视放大，无按喷头高度截断植株。
- PM 实际打开 `assets/plot/crop-frames/C04-front.png`：种子、幼苗、成长、成熟四格可分别查看，中型玉米单株与株距增大，保留茎叶和果穗。
- PM 实际打开 `assets/plot/crop-frames/C01-front.png`：四期保持原有整幅小麦密度和形态；原始 `wheat-0.png` 至 `wheat-3.png` 未改动，没有虚构单株根位。
- 已读真实 Node 合成器、Python 共用配置、`loadPlotTextures` 与 `mountPlotAnimation` 消费链：同 ID 后排／前排分别读取 v2 图集，前排位于水花层之后，前后层同步切期与淡出；C01 隐藏后层副本只绘完整前景。

## 判定与限制

上述三种 PNG 的静态身份和分层方式已有图像证据。全 68 种 PNG／WebP 的实际手机尺寸与背景合成、树林疏密、各阶段遮挡和循环表现仍为待复查，不能由抽样 PNG、代码或资源门禁扩展为整批视觉通过。本轮未逐张打开全部 WebP，也未做运行预览。

牲畜仅修改运行时构图，没有重新生成原画；三只／两只／一只、肉品居中、独立影与真实循环体验均保持源码已接入、画布未验收。齿轮和关闭图标以 PixiJS Graphics 绘制，实际画布辨识度也未验收。静态设施回退保持原素材构图。
