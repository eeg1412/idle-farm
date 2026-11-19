# 输入与来源记录

| 文件 | 作用 | SHA-256 |
| --- | --- | --- |
| `public/art/estate/background.webp` | space/layout reference; actually opened before generation | `9617f1e38b735fedb48b5894d38648bdc364e2171c45af6d8128894782c33eb8` |
| `public/art/estate/operations.webp` | pixel materials, light, camera only; actually opened before generation | `8459396c8bb08bb971209a1203ea6a1a7d7918b90ab84017598439e924d15e22` |
| `src/view/estate-map.js` | read-only fixed geometry; not an imagegen input | `8361bbeb1c4c89b6cdc9a737f06637af2ee4ca2f4c8c4abcd3cdb81ce3ebc9b8` |
| `assets/estate/README.md` | read-only current background history/dimensions; not an imagegen input | `fd3174ba4db116a5e87ceab83643a329f5ddd7987ed093f88fb169746ff6604d` |

## 实际开图结论

已实际开现用地图、经营建筑与最终原始稿。新稿816×1926，原始比例2.3603，未缩放、拉伸、滤色或程序绘画。草地已改为大色块，连续花带、零碎花点、密集草纹与碎石圈已去除；道路可辨，右侧局部海湾与左侧矿区岩地仍保留。最终无建筑、人物或文字。固定建筑叠图与入口/海湾细节交独立审图确认；本文不宣称运行通过或用户认可。

`raw-output.png`与`background-draft.png`均为内置生成原文件的逐字节复制。实际完整提示在`prompt.txt`，调用输入只有现用底图与经营建筑两张。
