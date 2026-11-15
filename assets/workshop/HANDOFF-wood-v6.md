# 木质工坊 wood-v6 素材交接

本轮是前版独立工坊素材的直接风格重绘，素材所有者为 `/root/workshop_topdown_art`。用户要求木头风格机器和传送带，且继续“保持不运行”。PM阅读成品和实际接口后明确转交唯一config所有权，已将wood-v6候选完整复制到活跃 `src/content/workshop-visuals.json`；随后仅只读确认落盘内容。布局／渲染／生产代码未改动。旧v5金属机与rubber带面保留历史，已不在活跃素材配置中。

## 原画与来源

三张均为内置 `image_gen` 的真实独立绘图调用，不是滤色旧金属图、程序绘图或CLI替代。

| 对象 | 原稿 | PNG | 发布WebP |
| --- | --- | --- | --- |
| 木质加工机 | `assets/workshop/raw/processing-machine-wood-v6.png` | `assets/workshop/png/processing-machine-wood-v6.png` | `public/art/workshop/processing-machine-wood-v6.webp` |
| 木质精制机 | `assets/workshop/raw/refining-machine-wood-v6.png` | `assets/workshop/png/refining-machine-wood-v6.png` | `public/art/workshop/refining-machine-wood-v6.webp` |
| 无边木板带面 | `assets/workshop/raw/belt-surface-wood-v6.png` | `assets/workshop/png/belt-surface-wood-v6.png` | `public/art/workshop/belt-surface-wood-v6.webp` |

完整实际提示词、输入图角色与透明参数在 `assets/workshop/prompts-wood-v6.md`。机器实际输入为各自旧v5原稿（只参考几何／相机）与 `public/art/livestock/barn.webp`（只参考木色像素风）；带面无输入图。默认生成位置、工作区路径、裁切与统一尺度在 `assets/workshop/registration-wood-v6.json`。

加工机以三木质圆盘／木榫和支撑区分，精制机以三木质矩形压制组区分。两者均为90°正俯视、纵向长条、封闭直边、透明背景，不含突出侧口、孔、材料、产品、带面或地面。带面只有竖木板缝与木纹，为独立不透明纹理，无护栏／边框／箭头／端点。

## 几何与节距

机器原稿均为1219×1290。加工机实际sourceBounds为 `left450/right768/top20/bottom1271`，精制机为 `left459/right760/top16/bottom1271`，right/bottom是排他边界。加工裁切 `(444,14,330,1264)` 最近邻等比1/2导出165×632；精制裁切 `(452,10,316,1268)` 导出158×634。

两机均按真实机身原高等比映射到400逻辑高，中心X160、top=-40、bottom=360。加工真实宽101.678657，左右边109.160671／210.839329；精制宽95.936255，左右边112.031873／207.968127。未为旧宽强拉伸。placement包含源裁切透明余量，cover按当前88/96图标半宽加2同步登记，运行保留已有图标mask与stage裁切。

木板原稿1254×1254，实际相邻竖缝位于列308..320及412..424，中心314／418，节距104原像素。裁取真实单周期 `(314,256,104,52)`，原尺寸导出104×52 PNG/WebP，不拼造纹理或擦绘接缝；统一逻辑缩放32/104，对应32×16、period32、右行、speed0.04。

## 候选与转换

已激活配置：`src/content/workshop-visuals.json`，来源为完整候选 `assets/workshop/workshop-visuals-wood-v6-candidate.json`。其余既有参数保留：stage320²、输入88／输出96、spacing96、每组最多3件、surfaceUnderlap3、无背景层序。随机Y、左外X=-44生成、右行、产品alpha1与无回退行为由现有代码继续消费，本素材任务不修改。

可持续转换入口：`assets/workshop/export-wood-v6.mjs`。仅使用sharp做真实原画裁切、最近邻统一缩放与WebP70／Alpha100，保留机器生成Alpha；默认仍只写本轮PNG/WebP／候选／来源，不擅自写活跃 `src/content/workshop-visuals.json`。本次激活是PM协调下的独立复制步骤，不改变producer默认行为。

## 证据与限制

素材所有者和PM已直接打开三原稿；独立审阅者已回报源图木质主体、正俯视、无侧口、加工／精制区别、无边独立带面条件通过。素材所有者已直接打开三最终WebP，精确PNG／WebP／登记已交独立复核。普通单图查看不表示实际130px组合或真实动画体验通过。

没有执行测试、游戏／浏览器预览、静态合成拼图、语法／运行检查、资源门、编译或推送。没有执行任何旧compositor。纹理平铺接缝的组合观感和真实滚动体验保持未验收；不以seamless提示词、来源或文件存在代替这些证据。

