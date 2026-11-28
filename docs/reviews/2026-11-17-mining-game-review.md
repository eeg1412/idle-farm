# 矿业经营与存档独立源码审阅

> 术语更名（2026-11-28）：文中建筑「加工」现称「料坊」，「精制」现称「工房」；加工位、精制位现称料坊位、工房位；「工坊」现分别指料坊或工房。

审阅者：MIN-REVIEW economy_reviewer；因其上层只读约束，报告由PM按最终交付文本落盘。只追踪源码，不执行测试、检查、模拟、预览或编译。

## 结论与证据

未确认本轮新增的可复现研发环、BigInt精度损失、重复扣发、跨周回数据丢失或旧档拒读。此结论不是运行验收。

- `src/platform/world-save.js` 的recordStats、amounts和facilityRecords：仅缺失boughtM/M数组时补0/[]，显式null拒绝；稀疏科技表的缺失矿业项为0级。旧库存、在制数量/时间/投入、品质种子/抽数、权益和任务回执沿用白名单。
- `src/game/world.js` 的startFacility、upgradeFacility：新批保存yieldBase和facilityYieldBasis，升级用原快照更新当批数量且不改start/end；工位升级不改既有投入/产出，取消按batch.inputs退款。
- world事件调度同刻先deposit全部完工再唤醒等待工位，M进入原调度和权益入口；`src/main.js` projectWorld通用复制全部设施组。
- main私有草稿先结算任务再同事务写档，objectives按回执去重；失败操作不伪造矿业经营统计。
- farmSaleOffer/sellFarm报价重核包含mineCount，交接清空矿洞/库存/在制，保留历史统计/科技/品质/随机序号/权益/回执。
- quality沿用统一100普通点抽取池与持久种子/序号；advancement矿业加工只用一次对应科技，精制按真实来源叠加并封顶2.5倍，不改变既有来源表现。
- objectives.completedLegacy保留旧已领科技全满与品质任务，不因扩表重发。
- 矿洞会话首次/换矿创建，clear删除；旧活动矿批按batch.start/end回填，投影推进只替换会话对象，不修改共享对象内部字段。

## 测试源与未验范围

已完整阅读`tests/mining-game.test.js`。主要接入已有回归源；该文件未直接覆盖七项矿业各自预算、缺指定品项的高阶拒绝、矿业实际市场成交与失败保存后的奖励回滚。前两项另已由目录所有者同步到`tests/time-price-runtime.test.js`，但所有测试均未运行，不能据此声称通过。

firstMixedProduct只统计PD/PT，与正式式样当前范围一致，不列为缺陷。实际经营、读写和在线/离线等价、浏览器触控与连续动画仍未验收。独立静态图与关键帧审阅另见[矿业美术报告](../art-reviews/2026-11-17-mining.md)。
