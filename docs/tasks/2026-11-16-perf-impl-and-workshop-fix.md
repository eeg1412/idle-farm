# 性能第一批实施 + 工坊升级修复任务卡

- 日期：2026-11-16。PM：主代理，独占本任务卡与 `docs/feedback-checklist.md`。
- 用户目标：①实施性能报告（[PERF 报告](../reviews/2026-11-16-performance-review.md)）的优化（用户以“追加一个任务并行执行”回应实施询问）；②并行修复：点击精制升级卡死出错；工坊按钮样式统一——升级按钮统一放在右侧，只有升级是黄色（gold），其他按钮用第二按钮样式（plain）。
- 允许：阅读与实现。禁止：测试、冒烟、预览、试编译、语法或运行时检查、运行任何脚本（含 `node -e`）。最终编译由 PM 执行。无推送授权。
- 不变约束：经济数值、BigInt、存档格式与事务、任务统计时机不变；动画区禁止回退；单画布命中测试。

| 任务 / agent | 唯一目标 | 唯一成果物与所有权 | 上下文 |
| --- | --- | --- | --- |
| PERF-03 / perf_render_impl | 报告 R1、R2、L1、L5（main.js 部分）、R3、R4 | `src/main.js`、`src/view/canvas-ui.js` | 新建干净上下文；只传报告与本卡 |
| PERF-04 / perf_logic_impl | 报告 L2a、L3 | `src/game/world.js`、`src/game/prestige-ledger.js`、`src/game/advancement.js`、`src/view/research-page.js` | 新建干净上下文 |
| BUG-01 / workshop_fix | 精制升级卡死修复与工坊按钮样式统一 | `src/view/production-pages.js` | 新建干净上下文；与 v3_ui 已结束的上下文无存活关系 |

延后：L4（涉及 production-pages.js，BUG-01 完成后再排）、L2b、R5–R7 及报告 §2 待决项。

## 进展

- 三项任务已指派。
- PERF-04 已交付：L2a `productionContributionBatch`（prestige-ledger.js:79-103），advanceWorld 内累计、`finally` 中一次计 credit，迁移仍在首次入库时；L3 `researchOffer(world,id,unlocked?)` 与研究页一次建 Set。等价论证：开方差望远镜求和精确；includes 与 Set.has 同为 SameValueZero。所有权交回 PM。
- BUG-01 已交付，PM 核实根因：空工位升级对话框 `compact(quote.currentOutput)`，currentOutput 为 null，`BigInt(null)` 抛错（numbers.js:16）；canvas-ui.js `redraw()` 置 `building=true` 后无 finally，异常使后续重绘全部提前返回 → 画布卡死。精制位开局常为空，所以先暴露。修复：production-pages.js 仅在有产出时显示产出行；工位卡与详情按钮统一为 plain + 右侧 gold 升级。PM 已把 redraw try/finally 加固转交 PERF-03（canvas-ui.js 所有者），并让 BUG-01 续作把工坊“增设”“查看研发条件”改为 plain。
- BUG-01 续作已交付：工坊页“增设”按钮改 plain；`sourceSummary` 新增 `{ buttonTone }`，工坊传 plain，田地/畜牧/鱼池仍 gold。对话框确认按钮不变。所有权交回 PM。
- PERF-03 已交付：R1 结构签名（布局/状态/提交世界/计时 epoch/除 clockMs、wallAnchorMs 外的深比较）才 redraw；L1 `projectWorld()` 投影复制；L5 去掉第二次深拷贝、引导状态按提交世界缓存；R3 反馈气泡一次构建；R4 进度条按设备像素量化；redraw `try/finally` 复位 building（不吞异常）。R2 未做键控转挂。PM 核对：PERF-04 的 L2a 只写顶层账本标量，在投影复制范围内。
- PM 最终 `npm run build` 退出码 0。任务结束。未运行测试、预览或画布验收；未提交、未推送。延后：L4、L2b、R5–R7、报告 §2 待决项；“每次提交（含 5 秒自动保存）仍整页重建”可作后续优化。
