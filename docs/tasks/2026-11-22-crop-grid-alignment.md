# 中、大型作物树阵对齐田地并铺满边缘

PM：主代理。CG-1 实现（crop_grid_fix，新建上下文，使用 farm-crops 技能）→ CG-2 独立审图（crop_grid_review，新建上下文，使用 farm-art-review 技能）。资源生成与转换属于交付工作；未授权测试、预览、`art:check`、提交或推送；最终编译由 PM 执行。

## 用户原话
- 先不改代码，你能看出来田地的动画大型果树类的排列有些歪吗？
- 而且前面的 AI 可能为了不让果树被裁切，边缘不愿意放果树。一起都修了吧。

## PM 已确认的问题（以 C05 根位叠在 `public/art/plot/ground.webp` 上核对）
1. 列方向偏差：列线约 45°（如 c6 由 (65,245) 到 (245,69)），田地真实横向（左上草地／田地分界线）约 17°，树阵呈剪切的菱形。来源：`assets/plot/furrows.json` 手标九排点的最左点连线 (221,67)→(24,230)，被 `crop-layout.json` 的 `columnProjection.sourceBoundaryColumns` 当作列边界。
2. 排距跳变：沿同一列排距 25、30、34、34 后跳到 52、52、62、64；排直接取不等距的手标田垄。
3. 覆盖不足：只占中间斜带，左上、右下大片空地；边缘为避免裁切不放树。

## 修正要求
| 项 | 要求 | 保留 |
| --- | --- | --- |
| 列 | 列族按底图田地真实边缘（左右两条田地侧边）推导透视，与田地横向一致 | 根位固定、四期共用；近大远小 |
| 排 | 沿真实田垄方向，排距随透视平滑递增，不出现跳变；排仍贴合可见田垄 | 每排根脚落在田面上 |
| 覆盖 | 中、大型作物铺满可见可种田面直到画面左右与近端边缘；边缘植株允许被画框裁切 | 远端树冠不被画面上缘截断（现行规则）；不越过田地进入草地／栅栏 |
| 范围 | 全部 `crop-layout.json` 中 medium／large 作物；small 与 C01 小麦例外不变 | 素材原画不重画 |

- 重新生成：`scripts/export-crop-animation.mjs`／`scripts/compile-crop-visuals.mjs` 产出的 `src/content/crop-visuals.json`、`crop-visuals.runtime.json` 根位与尺度；`scripts/check-facility-art.mjs` 中与旧列投影绑定的校验同步为新几何（只改断言，不运行）。
- 性能：报告每类作物新旧根数，遵守 `docs/performance.md`（逐根 Sprite、共享纹理）。
- 证据：本地生成各 size 代表作物的 320 与 130 静态叠图供审，证据图不提交（`assets/plot/reviews/` 已被忽略）。
- 文档：`docs/development.md`「作物成长动画」第 2 条、`.agents/skills/farm-crops/` 相关句子、`docs/assets.md` 相关句子。
