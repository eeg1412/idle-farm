# 工坊独立烟囱与半透明漂浮烟雾

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

用户要求：「机器增加个烟冲图层，烟冲有冒烟图层，冒烟图层会飘动，半透明。」按烟囱理解，给当前两类木质工坊机身新增独立烟囱层及上层烟雾，保持现有正俯视、木质素材和进出料／裁切／无回退行为。

## A：素材与效果登记

- 所有者：复用 `/root/workshop_topdown_art`，是刚交付木质工坊素材的直接分层扩展，连续成果物；上轮所有权已结束，本轮仅授予下列新文件。
- 输入：本卡；当前两类wood-v6 PNG／WebP为风格及相机参考；imagegen与farm-art-review技能。
- 文件：新增 `assets/workshop/raw/chimney-smoke-v1.png`、`assets/workshop/png/chimney-v1.png`、`smoke-{1,2,3}-v1.png`，`public/art/workshop/`下同名WebP，`assets/workshop/{prompts,registration,export,HANDOFF}-chimney-smoke-v1`对应md/json/mjs/md，唯一新增 `src/content/workshop-effects.json`。
- 输出：一次内置image_gen透明2×2网格，独立正俯视短烟囱顶口与三团灰白烟雾，分格裁切。烟囱匹配木质农场，暖陶／石砌顶圈、暗色开口，只向上表面，不画侧口、整体机器、材料、背景或地面影；烟雾不烘焙烟囱，单独可半透明叠加。保留原稿、真实输入、提示词、裁切／尺度与纯转换producer。禁止程序绘图冒充原画。
- 冻结接口：`workshop-effects.json`为 `{version,chimney:{path,size:[96,96],logicalSize:[40,40],anchor:[0.5,0.5]},smoke:{textures:[{path,size:[96,96]}×3],intervalMs:600,lifetimeMs:3200,startSize:24,endSize:60,maxAlpha:0.35,rise:68,drift:18,sway:8},mounts:{processing:{position:[160,92],emitter:[160,92]},refining:{position:[160,92],emitter:[160,92]}}}`。路径为 `./art/workshop/chimney-v1.webp`及`smoke-{1,2,3}-v1.webp`；先写接口后绘图，让代码并行。锚点若真实图需变更先报告，不自行修改另一所有者代码。

## B：按需加载与动画接入

- 所有者：复用 `/root/workshop_motion`，同一工坊分层展示的直接扩展。仅拥有 `src/view/workshop-layout.js` 和 `src/view/workshop-animation.js`，不改A的登记、素材或现行木质config。
- 输入：本卡冻结JSON契约、现有layout／renderer／canvas的纹理源自动加载接口。新增烟囱／烟雾纹理源沿 `workshopTextureSources`消费，接口签名不变。
- 输出：绘制顺序传送带与物料→机身→烟囱→烟雾。烟囱跟机身抖动，烟雾独立上飘／横向漂移／轻摆，逐渐扩散并淡散，全程半透明。使用真实新烟团纹理，固定有界Sprite池与既有展示时钟，不新增计时器／DOM／经营事件。每团身份和轨迹稳定，不逐帧随机闪换；运行时冒烟，暂停／待料不冒烟。
- 保留：左外X=-44随机Y成组进料、产品alpha1滚出、图标88/96、机身400高上下裁切、无背景、无fallback、切页／弹窗／滚出／后台销毁，纹理异步不能复活页面。

## C：独立审阅与PM整合

原稿与成品齐备后交原工坊审图代理连续复查，仅拥有本次 `docs/art-reviews/2026-11-16-workshop-chimney-smoke.md`。逐件实际打开精确源图／PNG／WebP，查独立分层、相机、透明、烟团辨识及来源；具体问题退回素材所有者，不自行修画。PM读取实际源表→loader→layout／frame→Sprite与销毁链，维护反馈／规格和交接。所有者不是独自在代码库工作，不得撤销他人更改。

本次无测试、冒烟、预览、静态合成、语法／运行检查、资源门、编译或推送授权；用户「保持不运行」持续有效。只做普通文件与图片读取、实现和真实素材生成／转换。源图／成品审阅与130px用途、真实漂浮／透明／分层运行体验分别记录，不将未验内容记为通过。

素材与代码已交付并结束所有权。A用一次内置image_gen生成真实透明2×2原稿，4独立96² PNG／WebP、效果JSON、prompt／registration／producer／HANDOFF均落盘。顶口真实source315,312经裁切115,112,400²映射到48,48，与anchor0.5／mount160,92一致，未改原木质机身或程序补画。

B在4张公开纹理齐备后才落盘，避免先请求不存在资源被failedImages负缓存。PM已实开原稿及4最终WebP，并读effects→workshopTextureSources→既有all-loaded loader→layout／frame→machine／chimney／smoke Sprite和destroy链。烟囱40²跟机抖；6烟团固定池，600ms发射、3200ms寿命、24→60、alpha≤0.35，上升68／右漂18／轻摆8，固定序号／出生时刻偏移，离口后不跟机抖，暂停全部隐藏。左右木带、左外随机进料、成品alpha1滚出、400高裁切、无背景和无回退均保留。

独立审图已逐件直接打开4组PNG／WebP并读来源；源图与成品范围条件通过，无具体退回。WebP查看器灰块经RGBA读取确认为Alpha0透明RGB，未误当底色。报告为 `docs/art-reviews/2026-11-16-workshop-chimney-smoke.md`。没有执行测试、预览、静态合成／缩图、语法／运行检查、资源门、编译或推送；130px组合、实际漂浮／透明／遮挡及用户认可未验，不据源码或素材通过宣称运行通过。
