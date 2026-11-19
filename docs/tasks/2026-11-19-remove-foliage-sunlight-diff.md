# 撤除新增草树与阳光、交付main差分ZIP

用户要求移除新加草树和阳光，然后给基于main的差分文件ZIP。保留认可地图底图/群像、原建筑、原生四帧鸟及随机路线，不重画或恢复旧底图。当前Sites v70源码41b085dad888a694cf1c49c7b00652573ca0ec48；本轮已刷新GitHub origin/main，基线45b53cef26bff6397acb95be6e27eeaa1710a86f。仅fetch，不强制同步/覆盖工作文件，不推GitHub。

## 单一实现所有权

本次是撤除两类装饰的一个耦合输出，新建干净上下文`remove_map_decorations`，仅给本卡与必要源码。前轮各所有者已释放。独占src/view/estate-map.js、src/view/estate-atmosphere.js、src/view/estate-atmosphere-layout.js、删除src/view/estate-foliage-layout.js，删除public/art/estate/foliage/全部与public/art/estate/atmosphere/sunlight.webp；删除scripts/export-estate-foliage.mjs，修改scripts/export-estate-atmosphere.mjs使今后仅导出鸟，不会重新加入已撤掉的阳光。禁止改鸟像素、随机路线/时序/可见门禁/复用/销毁或原建筑sites/底图/存档；气氛层仅留鸟，仍建筑上/门牌下。彻底移除草树import/层/Sprite/可见条目/加载与阳光Sprite/纹理请求/pose/linear修改，不只设visible=false。原稿、生成记录及旧静态证据保留assets/source/art历史目录，不删除已生成原稿；不执行任何图片导出、测试/预览/语法或运行检查/构建/push。最少读本卡、AGENTS/performance相关片段与上述文件。完成后报告实际变更/删除路径、鸟不变范围、剩余限制并释放所有权。

PM `/root`独占本文、feedback-checklist和docs/assets.md；亲读最终diff并更新当前规约状态。全部实现资料冻结后仅PM最终生产构建、原公开Sites同步保存发布；之后对精确最新main与最终提交全tracked tree比较，ZIP根按原相对路径放新增/修改完整文件，附DIFF_INFO清单、删除列表及说明。包含二进制/原稿/文档，排除未追踪构建与依赖；不交整项目ZIP冒充差分。仅归档字节/路径/CRC/清单一致性读取不算游戏运行检查。ZIP生成后作为可下载文件交付。

## 冻结交付

实现者已结束所有权，PM亲读最终4文件diff及删除清单。草树运行布局/导出脚本/7项public文件删除；阳光发布纹理、节点、请求、pose与采样修改删除。气氛导出脚本只写鸟。原生鸟纹理、随机路线/时序/暂停/复用/销毁与建筑sites/认可底图未改，源码改动仅为撤除所需分支。原稿和历史证据保留。全部实现/资料冻结，未测试/预览/语法或运行检查；进入PM最终生产构建与精确提交差分打包。

PM最终生产构建退出码0（815模块，含离线产物）；构建后仅补交付记录，运行输入未改。原Sites同源保存/发布与main全tracked差分ZIP交付继续执行。
