# Cloudflare Pages 发布

`npm run publish:cloudflare` 使用 Wrangler 将已构建的 `dist/` 直接上传到 Cloudflare Pages，入口位于根目录 `package.json`：

```sh
npx wrangler pages deploy ./dist --project-name idle-farm
```

该入口参考 `D:/myProject/pangya/pangya-web/package.json` 的 `publish:cloudflare`，同样只发布现有产物，不自动运行构建或测试。参考项目的 `docs/development/publishing.md` 也明确记载这一行为。本项目的账号、项目和域名独立配置，既有 [Sites 发布](sites.md)仍可使用。

## 首次配置

1. 使用自己的 Cloudflare 账号准备一个 Pages Direct Upload 项目，名称为 `idle-farm`。若已有项目使用其他名称，将根目录 `package.json` 这条指令中的 `--project-name idle-farm` 改为实际项目名。这里的默认名称不表示远端项目已经创建或名称一定可用。
2. 在创建 Pages 项目时设置生产分支，后续发布使用该项目的分支配置。具体步骤见 [Cloudflare Direct Upload 官方说明](https://developers.cloudflare.com/pages/get-started/direct-upload/)。
3. 在本机通过 `npx wrangler login` 登录自己的账号；无人值守环境可改用下面的环境变量认证。

仓库沿用参考项目的 `npx wrangler` 方式，不新增 Wrangler 依赖或修改锁文件。本机尚无可用 Wrangler 时，`npx` 可能提示下载，执行发布时需要网络。仓库未固定 Wrangler 版本。

## 环境变量认证

在终端或 CI 的秘密配置中设置以下变量，由 Wrangler 使用：

| 变量 | 内容 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | 目标 Pages 项目所属账号 ID |
| `CLOUDFLARE_API_TOKEN` | 对目标账号拥有 `Account → Cloudflare Pages → Edit` 权限的 API Token |

变量名称及权限见 [Cloudflare 的 CI 上传说明](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)和 [Wrangler 环境变量](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)。凭据仅用于发布工具，不使用 `VITE_` 前缀，不写入源码或 `public/`。

## 发布

在项目根目录、依赖已安装且账号和项目配置完成后运行：

```sh
npm run build
npm run publish:cloudflare
```

`build` 沿用现有 Vite 构建及离线缓存生成流程（`vite build && node scripts/build-offline.mjs`）；素材检查需另行运行 `npm run art:check`。发布始终使用磁盘上当前的 `dist/`；修改源码后需要先重新构建，避免上传旧产物。

可以通过 npm 追加 Wrangler 参数。例如显式指定分支（将 `main` 换成该 Pages 项目实际的生产分支）：

```sh
npm run publish:cloudflare -- --branch main
```

分支参数也可用于预览部署，详见 [Wrangler Pages 命令](https://developers.cloudflare.com/workers/wrangler/commands/pages/#pages-deploy)。是否进入生产环境以远端项目的生产分支为准；此指令不绑定自定义域名。

玩家存档仍保存在访问站点的浏览器 IndexedDB 中；更换域名或使用预览地址会使用另一份浏览器存档空间。

本次仅制作发布入口与说明，未执行登录、创建远端项目、上传或部署，也未运行构建、测试、预览及其他运行验证。
