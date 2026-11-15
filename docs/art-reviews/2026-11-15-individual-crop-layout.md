# 单株精灵、田垄对齐与田面覆盖

本报告对应用户再次否定旧两列方案、并明确要求“一棵树或一棵苗是一张图，逐个摆放”后的 `individual-v4` 交付。旧两列整田前景的完成结论不适用于本版。

## 实际读取证据

- PM 打开真实背景 `assets/plot/wheat/ground.png` 和发布 `ground.webp`，对照用户桂花截图的土垄与空田范围。
- PM 打开 `assets/plot/reviews/individual-v4/C08-mature-320.png`、`C08-roots.png`、`C08-mature-130x138.png`，以及 C05 苹果、C07 茶树的成熟320合成图：根点贴合原土垄，完整透视列族覆盖田面，原先右侧大片空土不再保留成窄树林带；成熟树冠覆盖洒水器，茶树的远排不再被筛空。正常垄沟和田边土带仍可见，不把自然行距误记为漏种。
- PM 打开发布 `public/art/plot/plants/C08/mature.webp` 和 `seedling.webp`，分别只有一棵完整树和一棵苗，没有多株或田地烘焙。
- PM 直接读取 Node producer：每 ID／阶段独立读取已有单株源PNG、裁出透明主体、导出一张WebP，登记源bounds、锚点、baseScale；`exportReview` 的带背景合成只写 `assets/plot/reviews/individual-v4/`。
- PM 直接读取 `mountIndividualPlants`：遍历 roots，每根创建独立 Container 和 Sprite，根容器固定位置；阶段只改该株 texture／pivot／scale。按根y分前后容器，在洒水器／喷水两侧排序。loader 为 C02–C68 请求四张单株，不消费上述全景合成；C01保留原认可整幅例外。

## 范围和限制

生产转换已实际交付67种×4期的268张独立WebP及trim PNG，元数据覆盖68ID；根位是原9垄与从背景边界推导的列射线交点，中型也取消了前排最小y筛空。小型保留原47根位。生产转换成功不代表测试或视觉检查通过。

上述C08／C05／C07的静态摆位和C08单株身份已有直接图像证据；不是67种逐张手机效果的全量通过，也不是用户认可或真实循环通过。其余品种、实际喷水遮挡、阶段切换、缩放命中、性能及动态体验仍未运行验收。本轮不运行测试、检查、预览、语法／运行验证或编译。
