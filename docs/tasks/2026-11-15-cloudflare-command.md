# Cloudflare发布指令

用户要求参考 `D:/myProject/pangya/pangya-web` 项目，给当前农场项目制作 `publish:cloudflare` 指令。

- 新建干净上下文 `cloudflare_command`，该独立发布工具任务不复用UI/经济/素材代理；使用fork_turns:none，只传此卡。
- 所有权：当前项目package.json、必要package-lock.json、专用Cloudflare发布脚本/config、docs/cloudflare.md、README发布说明和必要gitignore条目。Sites发布已有指令保留；其他运行源码/素材/AGENTS/feedback不改。旧package脚本所有者已结束任务。
- 精确输入：参考项目只读package.json及其实际publish:cloudflare入口/关联配置/文档；必要读取适用AGENTS。当前README、package.json、docs/sites.md和dist静态输出。不得修改参考项目，不读取/输出.env或真实token。
- 方法：先读取真实参考实现，交PM采用的发布类型/命令/构建前置/凭据环境变量名，不复制参考项目账号、项目名、域名或token。若需确认Cloudflare CLI语法，仅查官方primary文档。实现明确可执行的npm脚本并补说明；依赖变更如必要需最小化且可追溯。
- 任务只授权制作指令，不授权执行远端发布、登陆、创建远端项目、上传/部署或git push。用户亦未授权验证，禁止测试、冒烟、预览、试编译、语法/运行检查或执行发布命令；普通读写和必要依赖锁文件生成可在先报告方案后按范围做。
- 完成交付：实际参考源路径、采用行为、当前文件/环境变量名与配置方法、未执行项。你不是独自在仓库，不撤销他人变更；范围缺口先报PM，不擅自扩大为实际发布。

交付：已按参考package.json同名命令制作Pages Direct Upload入口，当前project-name为idle-farm，上传现有dist而不自动构建。README和docs/cloudflare.md说明CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN及OAuth、首次项目配置和分支参数；gitignore增加.wrangler，未改依赖/lock。PM已读取参考实际命令与对应不重建说明、当前package/docs。未执行发布、认证、项目创建、构建、测试或其他验证，远端配置未探测。
