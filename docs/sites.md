# Sites 发布

目标为未来公开的静态 Sites 项目。当前准备了源码和构建配置，供创建真实 Site 后接入。

1. 在 Sites 创建站点后，将返回的 `project_id` 写入 `.openai/hosting.json`。保留 `static.directory` 为 `dist`。
2. 在同一源码版本运行 `npm ci`、`npm run check`、`npm run build`。确认 `dist/index.html`、本地资源与 `dist/sw.js` 存在。
3. 使用 Sites 的源码流程提交并打包同一版本。通过真实地址检验首屏、存档、横竖屏和断网重开。
4. 在 Sites 中将访问范围设为公开，部署验证过的版本。使用未登录浏览器访问公开 URL 验证。
 
前端资源随构建分发。玩家经营记录留在访问该站点的浏览器 IndexedDB 中。站点域名变化会使用另一份浏览器存档空间。

官方参考：[创建 Site](https://learn.chatgpt.com/docs/sites/creating-a-site)、[发布和分享](https://learn.chatgpt.com/docs/sites/publishing-and-sharing)。
