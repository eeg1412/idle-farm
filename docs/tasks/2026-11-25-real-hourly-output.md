# 真实每小时产出（统计、订单显示与订单产能）

## 用户确认的需求

1. 仓库「每小时产出与支出」改为真实产出：按当前库存与上游供应计算，不再把待料工位按满负荷计入。缺口以标签显示：受原料限制的商品行标「缺料」，供应不足的原料行标「不足」。
2. 订单产能最高值改用同一真实产出算法，仍只升不降；老存档已记录的产能保留，不重算。
3. 订单中心所有订单（未接受与已接受、三种类型）显示该商品当前每小时净变化：正数绿色带 `+`，负数红色，零为默认色。没有生产时显示原因：「未研发」「未安排生产」「缺料」。
4. 记录产能最高值的时机：玩家操作后、读档与导入时（现有），以及每次时间推进结算处理过至少一次批次完工后。
5. 改完后修正订单相关测试期望并运行测试（用户已授权本次测试）。

## 冻结接口

`src/game/world.js` 新增导出：

```js
actualHourlyProduction(world) → Array<{
  id, produced, consumed, net,   // BigInt，百分之一件／小时，舍入同 forecastHourlyProduction
  arranged,                      // boolean：至少一个设施或工位安排了该物品为配方
  starved,                       // boolean：至少一个生产该物品的工位因原料受限，利用率 < 100%
  short,                         // boolean：该物品作为原料不视为有货，且有消耗工位分不到满速所需量
}>
```

- 原料「视为有货」：`availableToProduce(world, id)`（库存 − 加工保留量 − 行脚商预留）不少于该消耗工位一批的需求量，或该工位有进行中的批次（`batch.end > clockMs`）；有货时该工位对该原料按满速消耗。
- 不视为有货时，供应量为上游产线的真实产出，按 `orderedStations` 顺序（优先级降序、order 升序）贪心分配给消耗工位。
- 工位利用率取各原料分得量与满速需求之比的最小值；实际产出与各原料实际消耗都按利用率折算。因其他原料受限而未用完的分配量退回，留给后续工位，用迭代收敛，迭代次数设上限。
- 设施（田、牧场、鱼塘、矿洞）不需要原料，按满速计入。
- `forecastHourlyProduction` 保留原样（满负荷），运行时不再由统计弹窗和产能记录调用。
- `recordOrderCapacity(world)` 改用 `actualHourlyProduction`。

## 任务卡

| 任务 | 所有者 | 可编辑文件 | 成果 |
|---|---|---|---|
| RHO-1 游戏逻辑 | 子代理 logic | `src/game/world.js`、`tests/order-center.test.js`、新增 `tests/hourly-production.test.js` | 冻结接口实现；产能记录改用真实产出；`advanceWorld` 处理过批次完工后记录产能；测试期望修正与新增用例 |
| RHO-2 界面 | 子代理 view | `src/view/management-pages.js`、`src/view/order-page.js` | 统计弹窗改用真实产出并显示「缺料」「不足」标签；订单卡显示当前产能或原因 |
| RHO-3 文档 | 子代理 docs | `AGENTS.md`、`docs/economy-guidelines.md`、`docs/tasks/2026-11-22-order-center.md`、`docs/ui/pages/warehouse.md`、`docs/ui/pages/orders.md`、`docs/game-design.md`、`docs/feedback-checklist.md` | 「排产满负荷估算」改为真实产出；新显示规则；反馈记录 |

PM 拥有本文件，负责整合、读 diff、最终编译与运行已授权测试。

## 未验证

- 画面显示与实际耗时未实看、未计时。
