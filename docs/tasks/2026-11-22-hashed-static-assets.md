# 静态资源内容哈希与 Service Worker 版本化

PM：主代理。状态：**已实装**（HA-1～4），PM 最终 `npm run build` 成功；未运行测试、未做浏览器或线上验证。推送授权：无。本卡开工后另行确认测试与运行验证授权。

## 背景与根因

玩家反馈 Safari PWA「点了更新还要更新」。线上实测：`/sw.js` 被 Cloudflare 边缘缓存约 7 天（`cf-cache-status: HIT`、`age: 599918`），源站对 `sw.js` 返回 `cache-control: public, max-age=31536000`；同一时刻边缘版 `idle-farm-bd0abd50…` 与源站版 `idle-farm-ba3da7da…` 不同，首页 `no-store` 已是新版。不同边缘节点或缓存时刻给出不同 `sw.js`，更新检查在新旧版本间来回，形成反复提示。`public/` 1,356 个文件按原名发布，同名覆盖的图片（物品图标、作物单株等）同样会被长期缓存为旧图；现有手写版本号（`estate-map.js` `assetVersions`、`canvas-ui.js` `managerPortraitVersion`、`loading-screen.js` `sceneVersions`、`build-offline.mjs` `estateAssetVersions`）只覆盖少数资源。

## 用户决定

- 采用方案 B：构建时给 `public/` 发布资源的**文件名**加内容哈希，运行时按清单取真实文件名。
- `sw.js` 注册地址加 `?v=<本次构建缓存名>`。
- 带哈希资源加载失败时，立即检查一次更新，复用现有更新提示请玩家刷新。

## 设计要求

1. **清单**：构建前扫描 `public/`，按内容 sha256 前 8 位生成「源路径 → 发布路径」清单（`name-<hash>.ext`）；清单随 JS 打包。开发模式不使用清单，返回原路径。
2. **固定名文件**：`index.html`、`sw.js`、`manifest.webmanifest`、`favicon.ico`、`icons/`（PWA 与网页图标）及 `index.html`／`manifest.webmanifest` 直接引用的文件保持原名，不入清单。
3. **网址函数**：运行时全部 `public/` 资源网址经同一函数生成；删除上列手写版本号与 `?game=1` 标记，改由清单识别游戏图片。构建时以目录数据（物品、作物、牲畜、鱼类、矿业、管理员、加载场景、地图建筑等）推导全部可拼出的路径并逐一核对清单，缺项即构建失败；运行时不得退回无哈希原路径。
4. **构建**：`build-offline.mjs` 按清单重命名 `dist` 中的文件；缓存名由 SW 源码与全部发布文件（不含 `index.html`）的内容计算；计算后把缓存名写入 `dist/index.html`，供注册 `sw.js?v=` 使用。同一 `v` 永远只对应同一内容。
5. **Service Worker**：预缓存与「优先读缓存」的游戏图片判断改用清单中的发布路径；激活时清理旧缓存沿用现状。
6. **加载失败**：带哈希资源（图片、按需 JS 块）加载失败时，调用更新模块立即检查一次（绕过 60 秒前台间隔，同一时刻只发起一次，并合并短时间内的多次失败）；发现新版本时走现有更新提示。未发现新版本（离线、资源真缺失）时不弹更新提示，保持现有加载失败表现；动画区域不新增回退图。
7. **缓存头**：新增 `public/_headers`——`/sw.js` 与 `/manifest.webmanifest` `no-cache`；首页 `no-store` 保持；带哈希资源 `public, max-age=31536000, immutable`；固定名图标短缓存。用户需在 Cloudflare 后台核对 wikimoe.com 域名上的缓存规则，确保不缓存 HTML、不覆盖 `_headers`。
8. **首次上线**：每位玩家会收到一次更新提示并重新下载全部图片；之后只下载变动文件。

## 分工（开工时下发）

| 卡 | 目标 | 独占成果物 | 依赖 |
| --- | --- | --- | --- |
| HA-1 | 清单生成、固定名规则、构建核对与 dist 重命名、缓存名写入首页 | 新建清单生成脚本、`scripts/build-offline.mjs`、`package.json` 构建脚本 | 无 |
| HA-2 | 网址函数接入全部运行时引用，删除手写版本号与 `?game=1` | `src/view/*` 中资源网址相关段、新建网址模块 | HA-1 清单格式 |
| HA-3 | SW 注册 `?v=`、SW 预缓存与图片识别改用清单、加载失败触发更新检查 | `src/main.js` 注册段、`src/platform/pwa-update.js`、`src/platform/site-service-worker.js`、`canvas-ui.js` 加载失败段 | HA-1、HA-2 |
| HA-4 | `_headers`、文档（`docs/assets.md`、`docs/performance.md`、`docs/sites.md`、`docs/development.md`）、素材检查脚本按清单核对 | `public/_headers`、上列文档、`scripts/check-*.mjs` 中路径核对段 | HA-1～HA-3 |

PM 独占：本文件、`docs/feedback-checklist.md`、最终编译、部署前与用户核对 Cloudflare 规则。

## 待确认

- 是否在本卡内同时把 `art:check` 纳入构建前检查（需用户授权运行）。
- 部署后验证方式：需用户授权以真实地址检查 `sw.js?v=` 响应头、首页引用与一次完整更新流程。
