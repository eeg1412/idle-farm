# Sites 发布

目标为未来公开的静态 Sites 项目。当前准备了源码和构建配置，供创建真实 Site 后接入。

1. 在 Sites 创建站点后，将返回的 `project_id` 写入 `.openai/hosting.json`。保留 `static.directory` 为 `dist`。
2. 在同一源码版本运行 `npm ci`、`npm run check`、`npm run build`。`npm run build` 依次生成资源清单、运行 Vite、处理离线发布，规则见[性能规约 §6](performance.md#6-构建与发布scriptsbuild-offlinemjs)。确认以下产物存在：`dist/index.html` 含 `<meta name="idle-farm-build">`；`dist/sw.js`；`dist/_headers`；`dist/art/`、`dist/ui-icons/`、`dist/wiki/icons/` 中的图片为 `name-<8位哈希>.webp` 发布名。
3. 使用 Sites 的源码流程提交并打包同一版本。通过真实地址检验首屏、存档、横竖屏和断网重开。
4. 在 Sites 中将访问范围设为公开，部署验证过的版本。使用未登录浏览器访问公开 URL 验证。
 
## 缓存头与部署依赖

`public/_headers` 按 Cloudflare Pages 语法设置缓存头，随构建复制为 `dist/_headers`，不入资源清单、不进入 Service Worker 预缓存：

| 路径 | Cache-Control |
| --- | --- |
| `/`、`/index.html` | `no-store` |
| `/sw.js`、`/manifest.webmanifest` | `no-cache` |
| `/assets/*`、`/art/*`、`/ui-icons/*`、`/wiki/icons/*` | `public, max-age=31536000, immutable` |
| `/icons/*`、`/favicon.ico` | `public, max-age=3600` |

`/assets/*` 为 Vite 带哈希的 JS／CSS；`/art/*`、`/ui-icons/*`、`/wiki/icons/*` 下发布的文件均带内容哈希，内容变化即换名，所以可长期缓存。`/icons/*` 与 `/favicon.ico` 为固定名，只短缓存。

`/sw.js` 必须不被 CDN 长期缓存。已打开的旧页面通过 `registration.update()` 请求的是 `sw.js?v=<旧缓存名>`；源站对任意 `?v=` 都返回当前 `sw.js`，只有该地址不被边缘缓存时旧页面才能发现新版。若域名缓存规则按一年缓存该地址，旧页面在刷新前无法发现更新；新加载的页面注册新的 `?v=`，不受影响。

部署前，部署者须在 Cloudflare 后台核对正式域名的缓存规则：规则不覆盖 `_headers`，不缓存 HTML，不缓存 `sw.js`（含带 `?v=` 的请求）。首次上线带哈希文件名的版本时，每位玩家会收到一次更新提示并重新下载已访问的图片；之后只下载内容变化的文件。

待确认：
- 正式域名当前的 Cloudflare 缓存规则是否覆盖 `_headers`、是否缓存 `sw.js` 与 HTML（需部署者在后台核对）。
- 发布目标若不是 Cloudflare Pages，`_headers` 是否生效（需确认实际托管平台的缓存头配置方式）。
- 上线后以真实地址检查 `sw.js?v=` 的响应头、首页 meta 与一次完整更新流程（未验证，需用户授权）。

前端资源随构建分发。玩家经营记录留在访问该站点的浏览器 IndexedDB 中。站点域名变化会使用另一份浏览器存档空间。

官方参考：[创建 Site](https://learn.chatgpt.com/docs/sites/creating-a-site)、[发布和分享](https://learn.chatgpt.com/docs/sites/publishing-and-sharing)。
