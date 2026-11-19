# 经营管理新入口图标

| 稳定 ID | 画面 | 发布文件 |
| --- | --- | --- |
| `manager-directory` | 金边人物册与两个肖像 | `public/ui-icons/manager-directory.webp` |
| `statistics` | 木框柱形图和羽毛笔 | `public/ui-icons/statistics.webp` |
| `sale-history` | 庄园契据与时钟印章 | `public/ui-icons/sale-history.webp` |

原稿由内置图片生成工具绘制，源 PNG 为 `icons.png`。提示词见 `prompt.txt`。图集从左到右依照上述顺序。清除原稿中 Alpha 小于 8 的透明噪点，各格裁去透明外缘后按最近邻等比缩放至最多 82×82，居中放入 96×96 透明画布，导出无损 WebP。导出脚本为本目录 `export.py`。同目录 `manifest.json` 记录源图尺寸、裁切范围和运行图规格。

图标用于菜单与经营页面入口。源码和 PNG 原稿保留，运行时加载独立 WebP。
