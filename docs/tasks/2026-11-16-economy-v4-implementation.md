# 经济数值 LT-2026-11-v4 实施任务卡

- 日期：2026-11-16。PM：主代理，独占本任务卡、`docs/feedback-checklist.md` 与实施说明 `docs/reviews/2026-11-16-economy-balance-pass2.md`。
- 用户原话：“现在你根据 docs/reviews/2026-11-16-economy-balance-pass2.md 修正项目。”
- 依据：实施说明第 3 节为唯一取值表，第 4 节为逐项改动，第 7 节为顺序与所有权。游戏在内测，旧档不做数值换算，只需读入不报错。
- 允许：阅读与实现；ECO-09 运行 `node scripts/generate-game-data.mjs` 生成运行数据（交付工作）。禁止：测试、冒烟、预览、试编译、语法或运行时检查、模拟、`--check`、其他脚本。最终编译由 PM 执行。无提交、推送授权。
- 不变约束：玩法、界面控件、物品 ID、配方投入、研发前置与耗材种类不变；经济量 BigInt；`prestigeLedgerVersion` 不变。

## 冻结接口

- 式样表：05 物品表 6 列不变（C 产量全为 2，F 产量全为 1）；02 养殖表 7 列 `| ID | 对象 | 产物 | 耗时 | 产量 | 售价 | 生产秒 |`；07 §7.7 表头 `| e锚点 | 基准值B | 材料时限秒 |` 6 行；§7.8 只有 P01。
- `objectives.js`：新导出 `taskProductionGates`（ID→bigint）；`progress()` 返回值新增 `gate: bigint | null`、`gateMet: boolean`；删 `bulkSale`。
- `advancement.js`：`qualityOffer()` 每个报价新增 `researchPoints: bigint`，`affordable` 同时要求 RP 足够。
- `world.js`：工位倍数 `W(level)=1n+j+j*j/64n`（j=level−1）；`stationOutput`、`stationUpgradeOffer().output/currentOutput` 仍为 bigint。

## 任务

| 任务 / agent | 唯一目标 | 唯一成果物与所有权 | 依赖 | 上下文 |
| --- | --- | --- | --- | --- |
| ECO-08 / eco_spec_v4 | S1–S8 及第 6 节规约条文 | `AGENTS.md`、`docs/expansion/01`、`02`、`05`、`07`、`docs/game-design.md`、`docs/ui/pages/*.md` | 无；S5 样例表在 ECO-09 生成后由同一代理续作 | 新建干净上下文 |
| ECO-09 / eco_gen_v4 | G1–G11，生成 `game-data.json` | `scripts/generate-game-data.mjs`、`scripts/long-term-balance.mjs`、`src/content/game-data.json` | ECO-08 式样表 | 新建干净上下文 |
| ECO-10 / eco_world_v4 | P2、W1 | `src/game/world.js` | 无 | 新建干净上下文 |
| ECO-11 / eco_adv_v4 | A1、A2；只读核查 `development-tools.js` | `src/game/advancement.js` | 无 | 新建干净上下文 |
| ECO-12 / eco_obj_v4 | T1–T4；`codex20`、`recipeCollection` 在生成后按表复核 | `src/game/objectives.js` | 复核依赖 ECO-09 | 新建干净上下文 |
| ECO-13 / eco_ui_v4 | U1–U7 | `src/view/management-pages.js`、`src/view/research-page.js`、`src/view/production-pages.js` | 冻结接口 | 新建干净上下文 |
| ECO-14 / eco_wiki_v4 | Wiki 改用同版生成数据的周期、产量、单价，时长显示小时 | `scripts/build-wiki.mjs`、`wiki/index.template.html` | ECO-09 | 新建干净上下文 |
| ECO-15 / eco_tests_v4 | `tests/*` 随新数值与接口更新（只写不跑） | `tests/*.test.js` | ECO-09–13 | 新建干净上下文 |

## 进展

- 任务卡建立。先派 ECO-08、ECO-10、ECO-11、ECO-12、ECO-13；ECO-09 等 ECO-08 式样表交付；ECO-14、ECO-15 排队。
- ECO-11 已交付：`delegationMinutes` 改新式及描述；新增 `qualityResearchPoints`（Rc），报价新增 `researchPoints`，`affordable` 加 RP 条件，`pay` 同步扣 RP（与金币同一次修改）。`development-tools.js` 不依赖代管分钟与品质购买，无需改。PM 已读 diff 并手算 Rc(1000)=812,250。所有权交回 PM。
- ECO-10 已交付：L/F `buyBase` 600n、`upgradeA` 300n；新导出 `stationMultiplier(level)`，`stationOutput`、`stationRequirements`、`forecastHourlyProduction` 改用它（开批与升级报价经这些函数自动一致）。离线调度不变量不受影响（倍数只依赖等级）。PM 已读 diff。所有权交回 PM。发现 `production-pages.js:485-489`「直接机会增值」仍按等级线性计算，已追加给 ECO-13。
- ECO-12 已交付：§5.3 奖励与 `farmIncome` 阈值、`taskProductionGates`（5 项）、`progress()` 返回 `gate`/`gateMet`、`moreFields` 计数改为当前农田−2。T1 无需改：HEAD（52f7a71）已删 `bulkSale`，`world-save.js:19` 列为退役 ID，现为 68 项。PM 核对后追加：`moreFields` 改用独立条件文字“当前拥有至少 {目标} 块额外田地”（原共用“累计购买”）。
- ECO-13 已交付：U1–U7；新导出 `hoursLabel`（management-pages.js），三处时长格式在 ≥60 分钟时调用；「直接机会增值」改用 `stationMultiplier`。U4“出售段”放在「出售牧场」说明。价格与门槛文字经 `compact()`，不溢出。PM 已读 diff。所有权交回 PM。
- ECO-08 已交付 S1–S8 与第 6 节条文（另修 game-design 验收 A08/A31 与 `docs/ui/pages/research.md`，均属其所有文件）；07 §7.2–§7.4 样例表留“样例待生成后按 game-data.json 重填”。任务数：PM 按 objectives.js 计数为 17+14+36=67（HEAD 已删 `bulkSale`、`stationPriority`），式样写 67 正确；实施说明第 3、4.1、6 节同步改为 67（ECO-12 报告的 68 为误数）。ECO-08 待生成后续作样例表。
- ECO-09 已指派（式样表已就绪）。
- ECO-09 已交付：G1–G11；运行生成器一次写出 `game-data.json`（LT-2026-11-v4，525/437/523，无 `generationSeconds`，行结构不变）。研发金币合计 3.663×10¹⁸（目标 3.0–4.5×10¹⁸ 内）；C/L/F 单价无倒挂；G8 封顶 5 节点（P08、P11、I61、I74、I103）。抽样单价与实施说明 §5.1 一致，C35 为 223,625（实施说明原手算 223,622 有误，PM 已改）。PM 读 JSON 核对版本号与 F10。所有权交回 PM。
- ECO-12 续作：`codex20` 130,000（最便宜 18 节点 267,521 的 50%）、`recipeCollection` 22,000,000（最便宜 25 个 P 前缀节点 44,496,748 的 50%）。实施说明 §5.3、§9 已同步；式样同步追加给 ECO-08。
- ECO-08 续作（07 样例表与上述两项奖励）、ECO-14、ECO-15 已指派。
- ECO-14 已交付：build-wiki.mjs 的周期、产量、单价改取 `game-data.json`（缺项或非整秒即报错），式样只作结构与格式校验；模板时长 ≥1 小时显示“X 小时 Y 分钟”。`public/wiki/index.html` 由 PM 最终编译重新生成。所有权交回 PM。
- ECO-08 续作已交付：07 §7.2–§7.4 样例表按 `game-data.json` 填写，研发金币合计 3,663,041,087,990,666,776；`codex20`、`recipeCollection` 同步，主线合计 221,040、总金币约 2.39×10¹⁶（PM 手算差额核对一致）。05 表头实为“基础秒数”，未改冻结格式，§7.2 注明即“耗时”。该代理用 Python 只读 JSON 取数，未运行生成或检查。所有权交回 PM。
- ECO-15 已交付：4 个测试文件按新数值与接口更新（含 HEAD 时已过期的起始 600 金币、科技上限 50 等断言），新增工位倍数、牧渔购买价、代管分钟、品质 RP、产值门槛、`moreFields`、`hoursLabel` 测试；全部手算，未运行。PM 派工时把 W(9) 误写为 9，代理按公式更正为 10。代理另报：world-save-regressions「两次出售…保留引导完成」断言可能本就无法达成（与 v4 无关，未改）；foundation.test.js 针对旧 state/catalog，未改。所有权交回 PM。
- PM 最终 `npm run build` 退出码 0（含 wiki 重新生成；`public/wiki/index.html` 出现 14,400 秒鱼批次；打包产物含 F10 新单价 158973022）。未运行测试、检查、预览、模拟或画布验收。任务结束；未提交、未推送。
- 用户追问是否有数值平衡规则文档。PM 发现 `docs/economy-guidelines.md` 仍为 v3 草案口径，与 v4 冲突（E-05、E-08–E-10、E-12–E-14、E-19–E-23、§14），且实施说明第 6 节漏列、`AGENTS.md` 无入口。用户：“四项修改都做”。ECO-16 / eco_guide_v4（新建干净上下文）独占 `docs/economy-guidelines.md`；PM 负责 `AGENTS.md` 入口一行与实施说明第 6 节补行。
- PM 已在 `AGENTS.md` 研发条后加准则入口；实施说明第 6 节补准则一行，并把同节漏改的“68 项”改为 67。
- ECO-16 已交付准则 v4 版（E-01–E-30 去 v3 标记、§14 改为 v4 待校准与未核实、§15 检查表更新、删 §16）。报告三处不一致，PM 自行裁定（均不涉玩法）：①2 位有效数字四舍五入使 7 项奖励略超最低成本 50%（stationLevel10 达 52.1%）→ 改为向下取 2 位有效数字，PM 按精确最低成本手算：stationLevel10 110,000、qualityMaster 1.9×10¹⁰、stationLevel100 1.4×10¹⁰、facilityLevel50 92,000,000、facilityLevel200 3.8×10¹¹、quality50 3.0×10⁸、quality200 1.2×10¹²；②`clearFacility`、`clearStation` 为工具操作，豁免任务覆盖；③实施说明 §8 “主线 18 项”改为 17。ECO-12 已改 objectives.js（7 项）；实施说明 §5.3 与取整说明由 PM 改；式样追加给 ECO-08，准则追加给 ECO-16。测试未断言这 7 项奖励值。
- ECO-08 已同步 game-design §8.3 七项奖励及 01 §1.5、game-design 的取整措辞；总金币 23,901,906,281,513,040（约 2.39×10¹⁶，PM 核对差额 112,011,010,000），主线 221,040 不变。ECO-16 已写入三项裁定。PM 把准则 E-23 的“由所有者同步修正”改为“已同步”，并恢复 PM 用 sed 编辑过的文件的 CRLF（git diff 仅内容变化）。准则相关四项完成；ECO-08、ECO-12、ECO-16 所有权交回 PM。未运行测试或检查；未提交、未推送。
