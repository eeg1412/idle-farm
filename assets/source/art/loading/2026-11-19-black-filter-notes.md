# 开屏黑块与局部平滑采样实现记录

## 最终变更

独审在旧PNG确认不透明近黑填充，具体坐标及Alpha证据见 docs/art-reviews/2026-11-19-opening-black-filter.md。原画问题不能靠linear或改premultiply修好。用户要求整幅新绘，最终由内置imagegen仅以四张canonical身份联系表完整新绘，再补新稿右缘被截断的渔场男手／前臂。旧稿与在途未采用局部候选均保留，来源见README／generation／references／逐轮prompt。

当前规格允许自然紧凑靠近、正常重叠、深色服装与有归属阴影，不要求人物之间留缝或内部透明孔。没有为旧提示的间隙措辞机械改图或删衣物。

## 实际采样调用链

1. loading-screen.js的loadArt仅请求background／managers／logo三个开屏专用URL；人物带v=all22-v2-redraw-linear，避免旧人物离线缓存键。
2. createGameView注入loadOpeningImage，包装先登记到固定三项smoothImages集合，再调用既有loadImage。
3. loadImage保留textures／loadingImages／failedImages／unloadingImages与任务管理。首次成功加载在提交纹理前按URL登记设asset.source.scaleMode：开屏linear，其他nearest。缓存命中直接返回；失败重试保留登记，后续默认调用不会把开屏改回nearest。
4. 三个开屏路径独立于页面图标／场景／动画，当前代码没有其他开屏素材入口。它们无icon／scene的LRU分类，沿用固定三张的既有缓存归属，不增pin或无界缓存。
5. loadArt沿原路径设置Sprite、arrange并标脏。底部条、输入阻断、加载状态机／重试、至少1000ms完整显示与300ms淡出未改。

## 本地Pixi 8.23.0 API依据

- node_modules/pixi.js/package.json：本地8.23.0。
- lib/rendering/renderers/shared/texture/sources/TextureSource.js：scaleMode setter转交当前source的_style.scaleMode。
- lib/rendering/renderers/shared/texture/TextureStyle.js：scaleMode同时设置magFilter／minFilter／mipmapFilter。在交给Sprite、首次GPU使用前设置该source；未改TextureStyle／TextureSource默认。
- lib/assets/loader/parsers/textures/loadTextures.js：Assets.load解析WebP为ImageSource，默认优先Worker／createImageBitmap，回退图片元素；ImageSource默认premultiply-alpha-on-upload。
- lib/assets/loader/workers/WorkerManager.js与lib/_virtual/loadImageBitmap.worker.js：Worker接收URL及可选alphaMode；项目未给自定义alphaMode，沿默认createImageBitmap(blob)。
- lib/rendering/renderers/gl/texture/GlTextureSystem.js：按source.alphaMode决定UNPACK_PREMULTIPLY_ALPHA_WEBGL。本次未覆盖解码、alphaMode或混合模式；没有将源画问题推断为GPU故障。

## 等价范围与像素差异

像素有意变化：22人整幅新绘并补全右手，三层开屏非整数缩放由nearest改linear，群像布局按新导出真实Alpha>0边界{24,116,976,1141}更新。不能声称逐像素等价，也不能用Sharp静态合成声称Pixi实际运行通过。

11岗位男女各一次共22人，身份／三项关键道具／自然群像由独审核对。背景／LOGO源与成品原字节、发布画布尺寸、底部条及安全区规则、任务／输入／重试逻辑与时序均保留；其他游戏图仍nearest。导出沿既有nearest等比／WebP70／Alpha100，从未脚本重绘、抠黑、涂色或Alpha阈值掩盖。

## 精确冻结对象

| 对象 | SHA-256 |
| --- | --- |
| managers.png／managers-all22-round6-edge.png | 421847775fdec966417b836beea4682cad95f1056c90b90484c09bd2a9b5660b |
| public/art/loading/managers.webp | 7146f260276d09b88ebc791f2c84f12849ad5dcf5cfd98eebe218aad65aa4885 |
| src/view/loading-layout.js | 592ca16a547fa3b864f855da0e581096c5b407f83c00f9eed77115d93612587d |
| src/view/canvas-ui.js | 831e6fdf86a247c8c79f7be7b938f576f60384ee7825206a58284956ff3269d3 |
| src/view/loading-screen.js（未改） | 832f5ae71279df78a116b18f760e6b6d051e70322b9cccf2ffaf331cc6473e69 |
| background.png（未改） | c5aa4b4a18bfd64368402ace2b65b7fed0c92d7a6d13eed9d993d005bb02cc40 |
| public/art/loading/background.webp（未改） | 90fe80e13e4e55ea2e49f91fdc617c09546630838fea231f682b8a86e2718f93 |
| logo.png（未改） | e5fa9632ab770d6640af3d7c358a8151ad88bcdb7b37b52f6c7d9d2ec4220f20 |
| public/art/loading/logo.webp（未改） | feac002f24120b11b1071c2a9523b81e76aec511fb74cb3f944d49d35a60f488 |

旧all22-v1的hash与旧通过记录仅作历史，保留于generation.historicalFreezes及旧审阅，不替代本轮新图结论。

## 审阅与权限边界

新源／成品／布局独立静态审阅通过：实际查看正常背景／棋盘、右手外缘、22身份／道具／脚、四手机尺寸普通／失败与390×844安全区静态图。报告见 docs/art-reviews/2026-11-19-opening-black-filter.md。

作者仅普通读写、内置imagegen、图片转换、像素读数与实际开图；未运行测试、游戏／浏览器预览、语法／运行检查或试构建。静态图非Pixi运行证据。当前所有输入冻结，opening_filter_fix所有权结束；最终生产构建仅PM执行。
