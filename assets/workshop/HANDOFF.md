# 工坊正俯视分层素材历史交接

**本页为已取消v2方案历史。最终用户要求和当前交付见 [HANDOFF-portless-v5.md](HANDOFF-portless-v5.md)：完整无突出接口长条机身、无护栏滚动带面。旧横机、旋转稿、9口稿、rail/port都不属于最终运行资源。**

本轮素材所有者：`/root/workshop_topdown_art`。交付范围为 `assets/workshop/`、`public/art/workshop/`、`src/content/workshop-visuals.json`。源图由内置 `image_gen` 共六次调用生成；相机为90°正交俯视。机器、背景没有程序绘图替代或相机变形。

## 图层与来源

- 背景：`raw/background-v1.png` → `png/background-v1.png` → `public/art/workshop/background-v1.webp`，320×320整幅。
- 机器：`processing-machine-v1` 圆磨盘加工机、`refining-machine-v1` 铜矩形压制精制机，独立透明PNG/WebP；两侧真实空料口和机壳遮挡点已逐项登记。
- 护栏：`raw/conveyor-rails-v2.png` 以内置绘图工具编辑 `raw/conveyor-components-v1.png` 真正去除带面，分离成H/V/转角/T/cross/口套六个中空透明部件。v1的固定带面原稿仅保留溯源，不是运行资源。
- 带面：`raw/belt-surface-v2.png` 为独立新绘黑灰纹理；裁取原稿 `(89,100,78,156)` 的一个真实规则重复节距，最近邻导出32×64 PNG/WebP；逻辑尺寸8×16、X周期8。旋转90°仅用于正交带面和护栏部件，不旋转机器伪装视角。
- 物料／成品不在本轮原画中；静态图和运行接口均复用 `public/wiki/icons/<ID>.webp`。

`prompts-v1.md`、`prompts-v2.md` 为实际提示词。`registration-v2.json` 保留生成文件、工作区原稿、真实裁切、导出尺寸和来源。`export-v2.mjs` 只裁切、透明补边、最近邻缩放、PNG和WebP转换（质量70、Alpha100），不擦绘原图。

## 运行接口

`src/content/workshop-visuals.json` 是唯一纹理／口位登记：320×320逻辑画面，带宽16，左侧9个输入口Y=32、64、96、128、160、192、224、256、288，汇集列X=112。各机器输入／遮挡终点／输出／遮挡起点分别消费自身 `input`、`inputCover`、`output`、`outputCover`。

每个护栏部件的 `size` 是原生像素，`logicalSize` 为等比逻辑尺度，`center` 和 `ports` 为真实原生锚点。`flowRegions` 是互不重叠的原生像素裁切区域，方向分区只裁切单独滚动带面；其上叠固定护栏，螺丝与框架不能随纹理移动。护栏中心Alpha像素读取见 `reviews/alpha-center-v2.json`，全部PNG/WebP为0。

## 静态证据

`reviews/workshop-layered-v2-320.png` 和 `reviews/workshop-layered-v2-130.png` 是2×2正常底拼图：上排I01面粉单输入C01的加工机，下排PT44的全部9材料精制机；左相位0、右相位4，护栏和物品位置固定、带面纹理改变。每格分别保存 `processing-I01-single-phase{0,4}-{320,130}.png` 和 `refining-PT44-nine-phase{0,4}-{320,130}.png`。另外有独立透明传送带合成层 `*-conveyor-phase{0,4}.png`。

PT44实际材料为IF10、IL07、I84、I34、I24、IF08、IL03、I83、I74，静态证据未省略任一路输入。合成读取最终WebP；`compose-review-v2.mjs` 仅组合图片与不可见纹理裁切mask，不启动或模拟游戏。

图片资源静态审阅、真实Pixi运行、用户认可分别记录；本交接不表示真实运行已验证。未运行测试、资源门禁、浏览器预览、语法／运行时检查、编译或推送。
