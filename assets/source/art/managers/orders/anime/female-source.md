# 订单管理员茜梨

茜梨将蓝签蜡封包护在臂弯里，另一只手拉紧绳结。微笑时她向旁边瞥了一眼，抿起嘴角；高兴时红着脸睁大眼睛。生气时她扬声制止扯动货签的人，失落时垂下眼睛，嘴角轻撇。四种表情共用同一站姿、服装和手持物位置。

## 绘图输入

茜梨的基础全身图由内置 image_gen 绘制。输入下列四张项目现用图，对照眼形、虹膜分色、发束、高光、下颌轮廓、像素边线与服装色块。

| 用途 | 输入路径 |
| --- | --- |
| 任务女管理员全身 | `docs/Pixel-Characters-Complete-Pack/立绘/01_任务管理/任务管理_女_微笑.png` |
| 任务女管理员胸像 | `public/art/managers/portraits/tasks/female-smile.webp` |
| 仓库女管理员全身 | `docs/Pixel-Characters-Complete-Pack/立绘/09_仓库管理/仓库管理_女_微笑.png` |
| 仓库女管理员胸像 | `public/art/managers/portraits/warehouse/female-smile.webp` |

基础稿要求铜红环辫、琥珀眼、雀斑、米白衬衣、绿工装裤、砖红围腰及系带工作靴。肩、胯与双脚朝画面右前，头轻偏，侧眼、抬眉和抿嘴表现逞强，同时指尖细心整理蓝签的绳结。基础稿 `female-smile.png` 通过全身姿态及画风审阅后，以此图和两张正式全身风格参考分别绘制 `female-happy.png`、`female-angry.png`、`female-sad.png`。

## 胸像转换

四张全身原画均为 1024×1536 RGBA。取上方 566 行，按四表情非零 Alpha 共同横向范围外扩至偶数列，得到原图横区间 [24, 1010)。使用 sharp 最近邻缩至 493×283，上方添加 6 像素透明区，导出 493×289 WebP，质量 88、Alpha 质量 100、effort 6。原图脸部中心 x 为 537，胸像中为 256.5。以 Alpha ≥ 8 统计四张成品的可见横区间为 [141, 397)。发布路径为 `public/art/managers/portraits/orders/female-{smile,happy,angry,sad}.webp`。
