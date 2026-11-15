# BUILD-L06-20261115：畜牧脚线门禁构建失败

- 输入／需求：用户本次 `npm run build` 日志；`art:check` 在 `assets/livestock/animals/L06/mature-2.png` 抛出“畜牧脚线下疑似烘焙地面投影”，调用位于 `scripts/check-facility-art.mjs:126/516`。
- 目标：以当前源图、导出帧和脚嘴登记查明原因，修复实际生产链；保留脚区和全幅烘焙投影检测，不用扩大豁免掩盖真实投影。
- 上下文选择：新建干净上下文 `fork_turns: none`，仅发送本次日志、检测摘要、必要文件与权限；无旧代理复用。
- agent↔objective↔artifact：`l06_shadow_fix` 负责定位与实现，独占检测脚本、畜牧布局／feeding 登记、相关注册／导出脚本及确有必要的生成文件；PM 负责整合、反馈、任务卡和本轮审阅记录。
- 最少输入：`scripts/check-facility-art.mjs` 的脚线与局部嘴映射逻辑；`assets/livestock/layout.json`、`feeding-registration-v5.json` 中 L06；L06 成熟四帧及其真实来源；相关生成器；`farm-livestock` 的源图／脚位／低嘴规定。
- 冻结接口：动物根脚点及 `supportXRange` 不因低嘴调整；嘴区必须紧凑、可追溯到原稿，不接触脚区；PNG／图集 WebP／manifest 的更新必须来自持久登记与常规导出链。
- 所有权：共享畜牧文件和生成命令只有 `l06_shadow_fix` 一个实现所有者；PM 只读上述实现并修改本卡、`docs/feedback-checklist.md` 和 `docs/art-reviews/2026-11-15-l06-build-shadow.md`。不得撤销已有工作区改动；需要额外范围先报 PM。
- 顺序：定位图像与坐标 → 持久来源修复 → 必要资源转换 → PM 阅读实际变更并审图 → 更新交付状态。
- 原图确有缺陷时：先报告，不通过脚本涂改动物或放松检测；按素材退回流程决定修订。
- 允许验证：无。用户提供失败日志不作为新测试、门禁、预览或构建授权；普通源图查看及相关像素／尺寸读取、资源生成转换允许。本轮不运行 `art:check`、测试、语法检查或编译。最终编译仅可由 PM 在全部交付齐备且获授权后执行。
- 推送授权：无。
- 交付：真实成熟前蹄底为源y818，四帧anchor统一改819、canvas.top改−208，保留源窗与尺度；检测器未改。生产登记与逐阶段anchorMethod、L06 PNG／图集／分镜／归一源网格／回退、运行feeding／grounding均通过既有专项导出同步。旧V7输入0／3已快照归档、保留真实哈希与来源，选择成品未改。
- 实际执行：只运行资源转换 `node scripts/export-livestock-animation.mjs --species=L06 --refresh-scenes`；没有测试、门禁、语法检查、预览或构建。
- 当前阶段：`l06_shadow_fix` 已交付并结束实现所有权；PM已读源→导出→运行消费链并重开新成熟四帧分镜、发布图集及回退，脚点局部静态复查通过。详见[审阅记录](../art-reviews/2026-11-15-l06-build-shadow.md)。构建是否通过与真实循环／肉品落点仍未验证，不以静态复查关闭运行边界。
