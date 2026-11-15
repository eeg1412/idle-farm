# 饲料重设计、工坊动画、清空产线与任务金币

## 输入与授权

用户本轮五项：删除「存档类型／开发存档」文案；当前综合饲料仍不明显，重新设计；加工／精制采用多条进料传送带→中间抖动机器→出料产品动画；牧场／工坊产线右上角厚重图形叉号清空并回到未安排状态；所有任务完成奖励金币，难度越高奖励越多。

允许普通源码阅读、实现、素材生成／转换及静态图片审阅。未授权测试、冒烟、预览、语法／运行时检查、资源门禁或编译；不执行发布或推送。新工坊动画是本次用户明确提出的额外行为。

## 分派与互斥所有权

| 代理目标 | 上下文选择 | 独占成果物 | 交接 |
| --- | --- | --- | --- |
| /root/save_copy：仅移除存档类型展示文案 | 新建 none，与其他工作无关 | management-pages.js 中存档区域、相关设置说明 | 先完成并释放文件，再给奖励界面所有者 |
| livestock_feed_art：重新设计饲料 | 复用：直接重开同一饲料成果物的用户否定 | 饲料原稿、producer、登记、回退、livestock-layout.js、相关饲料规范 | 不改动物／选择图，不写 canvas-ui.js；缓存变更交画布所有者 |
| livestock_feed_review：复审新饲料 | 复用：同一饲料目标及退回闭环 | 本轮新审图报告 | 对新原图、成品与130px图块辨识度负责，不称实机通过 |
| /root/workshop_motion：加工精制动画 | 新建 none | 新 workshop-animation.js、canvas-ui.js | 冻结 feature 的 workshopAnimation 参数给产线 UI 所有者 |
| /root/production_clear：清空产线 | 新建 none | production-pages.js、world.js、main.js 的清空动作 | 完成先释放 world.js/main.js，再由奖励所有者接入；为工坊卡片转交动画参数 |
| /root/task_coin_rewards：任务金币 | 新建 none | objectives.js、platform/world-save.js、任务规格；依赖交接后管理页任务段与 world.js/main.js | 奖励只发一次，BigInt，同事务，跨周回保留，旧档可证实完成项补发一次 |
| /root/goat_pixel_cleanup：奶山羊左侧杂像素 | 新建 none，与饲料设计分开 | 本轮山羊诊断／修订报告；饲料生产结束后明确转交受影响登记／导出和山羊产物 | 先只读定位邻格残像，不并发改共享 producer／回退，不改变解剖脚位与进食动作 |

每位实现者都不是独自在代码库工作；不得撤销或覆盖他人修改。共享文件明确转交，不同时写。PM 管理接口、读取真实执行链、维护反馈和最终整合。

## 实现决策

- 清空保留设施等级／工位本体与购买序号；作物 planting 会话清除。工坊按照现有换配方规则退还已登记投入；旧批无 inputs 不虚构退款。界面直接清空，不另开冗余确认框。
- 工坊仅当前批次运行时传送／抖动；待料停止。图标复用实际配方材料及 canonical 产品。动画与真实扣料、入库、任务统计分离；页面卸载销毁场景与回调。
- 奖励采用逐任务明确金币表，按入门、产业入门、扩建／收藏、高阶商品／全图鉴分档；实现者先提交具体表与补发／事务接入方案给 PM。奖励不计售货收入或生产总值，不能反向完成收入目标。

## 状态

当前：六项源码与素材全部交付。工坊已完成最终无突出进出口长条机身、无边传送带、水平直连且左右等长，旧程序／横版／汇流／带口／护栏方案不作为最终交付；详见[俯视分层素材重做](2026-11-15-workshop-topdown-art.md)。饲料／山羊静态复审已完成；工坊原稿与PNG/WebP造型范围条件通过，最终同源拼图曾被自动审批拒绝，用户明确回复「保持不运行」，不执行、不生成。真实运行、资源检查和编译均未执行，不把源码接入写成行为验收通过。

用户追加第6项奶山羊左侧杂像素，单独干净上下文定位后修复。save-copy已交付并释放management-pages.js给task-coin-rewards；production-clear已完成并释放world.js/main.js给task-coin-rewards，继续独占production-pages.js。workshopAnimation冻结为{kind:'I'|'P',index,id}，公共card.cornerAction为{onClick,label}，均由workshop-motion实现公共接口、production-clear消费。

production-clear已交付并结束production-pages.js所有权，PM读过动作与UI：空卡不显示叉；工坊退款只取实际inputs，清空后priority=false；delete planting符合现行存档契约。工坊参数已接生产卡。奖励表由PM确认，旧档完成项首次成功提交补发；首次经营交接在基础60之外另奖2000，预览须明确显示。

task_coin_rewards完成并释放主动作／存档／管理页文件；PM读取实际commit→write、导入replace、离线／初始化、领取校验和售货收入差额，未执行运行验收。livestock_feed_art完成V8并释放共享资产给goat_pixel_cleanup；后者仅L04窄生产完成并全部放权，PM实际打开原稿隔离、前后四帧、发布WebP及130px合成／回退，未用新哈希伪造旧选择图输入。workshop_motion再次接手同目标视觉修订，workshop_topdown_art与workshop_topdown_review分别新建干净上下文，具体接口与新成果见重做卡。

用户进一步否定产线清空的大关闭按钮：只用小号无底框图形X，取消为它独占的44px空白顶栏，标题／等级局部避让，不缩小动画。属于production_clear原控件目标的直接修订。workshop_motion明确本轮尚未写canvas-ui.js并结束该文件所有权，PM转交production_clear修改cornerAction，完成后须明确释放再归workshop_motion接新素材loader；world/main和清空经济行为不再改。

小叉修订交付：约17px厚图形叉、30×30透明命中、无底框；去独立44px空白，只首标题／aside按corner高度让位，feature透传该局部区域且不改变artWidth/artHeight。PM已读实际代码，production_clear完成并明确放权，canvas-ui.js已归还workshop_motion继续工坊分层素材接入。
