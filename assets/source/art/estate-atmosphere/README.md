# 庄园阳光与飞鸟原生素材

本轮为已认可地图新增独立透明装饰层。两项均由内置 `image_gen.imagegen` 原生绘制，未修改认可底图、建筑或群像。原稿、实际完整输入及提示词保留于本目录。

## 来源

- `sunlight-native.png`：887×1774 RGBA，暖白淡金斜向柔光，透明背景，无完整场景/太阳圆盘。
- `birds-native.png`：1254×1254 RGBA，原生2×2四个独立翼姿；向右飞的同一暖灰棕小鸟，上举/中位下拍/下拍/回收。没有复制、旋转或缩放一张鸟假装动画。
- `generation.json`：记录实际工具参数、完整提示词、生成输出位置与引用角色。
- `sunlight-prompt.txt`、`birds-prompt.txt`：实际提交提示词原文。
- 画风参考已实际开图：认可地图与原建筑静态叠图 `assets/source/art/proposals/2026-11-19-map-ensemble/review/draft-map-buildings-static.png`；现用建筑 `public/art/estate/operations.webp`。仅参考画风与配色。

## 固定运行接口

| 成品 | 规格 | 转换 |
| --- | --- | --- |
| `public/art/estate/atmosphere/sunlight.webp` | 512×1024 RGBA | 原生全幅等比linear，WebP70/Alpha100 |
| `public/art/estate/atmosphere/birds.webp` | 512×128 RGBA，四个128方帧 | 原生四图等大576方裁帧，共同躯干锚点，nearest缩至128，横排，WebP70/Alpha100 |

鸟裁帧原点为(45,72)、(651,72)、(45,676)、(651,676)，均576×576；源解剖躯干锚点(333,360)、(939,360)、(333,964)、(939,964)映射至各成品帧(64,64)。保留四张 `birds-frame-*.png` 以追溯裁切。转换只裁切、平移对齐、等比采样与编码，不添加鸟/光像素、不改色、不画蒙版、不旋转整鸟。

`registration.json` 冻结源/成品SHA256、尺寸、alpha统计、各帧alpha1/alpha64边界和裁切锚点。原生低alpha边缘及隐含RGB保留；未清理通道。鸟alpha64可见宽75–91/128，整帧41–46屏幕像素时可见鸟体约24–33像素。阳光保留柔软原生alpha，运行低透明叠加由实现者设置。

## 重导出与审核范围

在仓库根目录执行 `node scripts/export-estate-atmosphere.mjs` 可从保留原生PNG重复完成上述格式转换，并重写精确导出登记。本轮已执行该图像转换；只读取图像元数据/像素并开源和成品静态审阅。未执行测试、游戏/浏览器预览、语法/运行检查、试编译或push。独立素材与静态效果验收由 `approved_art_atmosphere_review` 记录；本目录不宣称实际运行通过。
