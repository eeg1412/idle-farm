# 左右满高传送带与单点随机进料

## 最新要求

用户将逐材料多条带改为左右各一条满高度传送带；材料依次随机从最左同一个点出现并进入机器，右侧中央吐出成品；两侧图标继续放大；用户报告现有带面视觉像从右往左，需要修正为清楚的从左往右。

## 分派

- /root/workshop_motion：复用，同一工坊动画的直接修订。前轮所有权已结束，本轮重新独占workshop-layout.js、workshop-animation.js、active／candidate两份JSON、export-portless-v5.mjs、compose-portless-v5.mjs；如为满高画面需要，另独占production-pages.js仅工坊已安排卡artAspect。机器原画和公共canvas其余控件不改。
- /root/workshop_direction：新建none，只读本地Pixi TilingSprite与当前相位代码，给出可见滚动方向的源码证据及短周期条纹可能造成反向观感的解释，不编辑文件或执行任何代码。
- PM维护正式说明、持久反馈、核对实际接入。每位代理不是独自在代码库工作，不撤销别人改动。

## 实现边界

- 三主层保持背景→传送带及物品→机器，机器保持居中的真绘图无凸口长条，不增加边框／护栏。
- 带面只保留左右两片，高度铺满场景；场景边缘与机身相接，不按材料数拆带。
- 进料固定左侧中点，所有配方材料分组打乱后依次输送，覆盖完整材料集合；随机显示不由每帧Math.random产生，重绘／续批不能闪换身份或跳位置。
- 物料／成品图标比上一轮更大；扩大后使用机身遮挡和必要的单侧物品mask防止从另一边穿出，不改库存、配方投入或实际产出。
- 暂停／待料时无进料材料，带面冻结、机器停抖；可见性卸载、换配方／清档展示状态清理保持。
- 带面实际移动方向以本地渲染源码为证，不仅翻转物料；必要时调整过密周期以让右向移动可辨，不能忽略用户反向观感。
- 普通源码读取／实现允许；用户「保持不运行」持续有效，不运行静态合成、测试、预览、语法／运行检查、资源门禁、编译、推送。

状态：代码与参数已交付，PM已读实际接入，未运行验证；旧多带／按数量分宽的反馈结论不作为本轮通过依据。

## 只读方向证据

workshop_direction已完成并结束只读任务。本地Pixi TilingSprite将tilePosition写入tileTransform，shader与batch UV路径都对纹理矩阵求逆；当前采样满足u=(localX−tilePosition.x)/(scaleX×textureWidth)，正位移实际右行。不能凭用户观感直接翻转符号。

旧8逻辑像素周期在130px块内约3.25屏幕像素，周期160ms；帧间隔超过80ms才可能出现典型时间混叠反向，不据此断言本次根因。实现应将真实纹理间距及modulo周期一起扩大至32逻辑像素，保持正速度0.05，提升右行可辨性；真实运行未验证。证据位于node_modules/pixi.js/lib/scene/sprite-tiling的TilingSprite、shader/TilingSpriteShader、shader/tilingBit及utils/setUvs源码，由只读代理提供，未执行代码。

## 最终交付

采用正向位移，最终速度选择0.04（慢20%）、周期与真实采样宽度同为32，周期800ms；不将混叠推断写成已复现根因。左右仅两片满stage高度表面，机边3px underlap消除细缝，并不在机壳上下连接成一片。

inputStream固定[0,160]、图标64、spacing96，约3个Sprite组成小池复用canonical纹理；Fisher-Yates以recipeId+周期种子打乱，每组各材料一次。共享展示clock差值累积本会话运行时间，首次开工0开始，暂停隐藏并冻结，续批／重绘不重置；output图标72在首材抵达遮挡后才开始，由右中输出。大图标各侧mask止于机身中线，防止穿到另一边。机器与背景原稿不改。

workshop_motion已完成并明确释放7文件：workshop-layout.js、workshop-animation.js、production-pages.js（仅已安排工坊artAspect=1）、active／candidate JSON、export-portless-v5.mjs、compose-portless-v5.mjs。后两者仅编辑参数／同源packet及mask接口，未执行。PM已读取真实最终代码、参数与调用关系。用户不运行约束有效，实际画布／静态双相位用途仍未验收。
