# L08 R9：以用户原始老羊为实际色温参考

R8整体被用户退回：“颜色还是不对！参考原来的色温！重画”。此前PM设定的米灰/米白hex色卡不再用于R9。原图只决定色温、阴影/轮廓和像素画风，不授权恢复巨大圆鼓包、碎点纹理或短腿圆羊体型。

## 冻结原始参考

- 精确项目路径：`assets/livestock/raw/l08-small-tailed-han-v1/style-reference-mature-0.png`。
- SHA256：`df80461b06f9c6a79831a3c2b3cb6c87f43f27739b7c1f2d7800f7c73c0cc550`。
- 实际320×320 RGBA，原样保留。绘图前已实际view_image查看，R9每一项新绘调用均将此精确PNG作为真实reference输入，不仅文字提及。
- 色温按原图实际暖奶油/浅金亮面、暖赭棕/暖棕阴影、棕轮廓；不再自行另列hex，不对原图或新稿进行程序修色、去点、平滑。

## R9成年基础新绘

`adult-r9.png`，实际1254×1254 RGBA。唯一实际imagegen输入为上述冻结原始参考。内置image_gen，2026-11-23。真实生成来源：`C:/Users/eeg14/.codex/generated_images/01a203a8-7c32-73d2-9369-c59b15ffde68/exec-dec6518d-c4dc-4a4f-95a2-b4a704e22019.png`。

真实prompt逐字如下，明确PIXEL ART/像素风；原图只色温/画风，新羊继续小尾寒羊长脸、垂耳、短扇尾、自然公羊角和长健壮腿。

Use case: stylized-concept / identity-preserve. Create a NEW adult male Small-tailed Han sheep (小尾寒羊) game sprite in PIXEL ART / 像素风. The PROVIDED ORIGINAL SHEEP PNG is the REQUIRED and ONLY COLOR-TEMPERATURE / PIXEL-STYLE reference. Match its actual warm cream and pale sunlit golden-cream wool lights, warm ochre/tawny-brown shadows and warm brown outline. Do not neutralize, cool, desaturate or replace its palette. Do not invent a new gray-beige or gray-white palette. The final cream sheep should visibly belong to the SAME warm farm-art palette as the provided original, without becoming brown or strongly yellow/gold-dyed.
The reference is ONLY for its COLOR TEMPERATURE and pixel-art language. Do NOT copy its big rounded wool lumps, coarse cauliflower clumps or short-legged round body. Draw a clean CONTINUOUS fleece coat with broad clear warm cream main areas, a FEW connected warm-brown form shadows under neck, belly and leg joins, and natural minimally irregular outer wool edge. NO balls/lumps/tumor bumps/armor plates, no dots, small C curls, speckles, dashes, stipple, grain, hatching, mottling or patchy colored areas. No cool gray shadows, gray-brown monochrome or over-whitened/desaturated surface.
Breed shape: long sheep face with subtly convex nose bridge, medium drooping ears, short broad fat fan-shaped tail, natural male ram spiral horns, fairly long healthy sturdy legs and dark hooves. Body, face/neck and legs form a coordinated warm cream family under one lighting; do NOT bleach face/legs separately or add white socks or bicolor marking. Natural muted pink ear interior, tan horns, warm dark brown hooves/eyes/nose. Neutral normal head-up standing, facing RIGHT, slightly elevated3/4 farm camera. Entire horns/ears/tail/four planted feet complete. Not a goat or short-legged wool ball.
EXPLICIT PIXEL ART: crisp deliberate stair-step silhouette, warm brown pixel outline, restrained fixed separated color steps matching ORIGINAL reference. Clean coherent pixel planes, readable at96px. No photoreal fur, soft focus, airbrush gradients, smooth3D, glows or noisy dithering.
One complete animal centered large on square genuine RGBA alpha0 transparent canvas with margin. No ground/floor shadow, barn/scenery, grass, feed/trough, props, text, labels, grid or color swatches.

## R9三期四帧双参考新绘

`feeding-r9.png`，实际1402×1122 RGBA；工具没有按请求返回正方形，原稿原样保留，不程序变形。新源SHA256=`7e03b68e214cf9a1e9b1c4468538b6615455522bc6dffca4c58c31c9be975c5e`。真实生成来源：`C:/Users/eeg14/.codex/generated_images/01a203a8-7c32-73d2-9369-c59b15ffde68/exec-e3f8d44c-78a8-41ba-96f0-830961de8e16.png`。

实际reference输入顺序：1.`assets/livestock/raw/l08-small-tailed-han-v1/adult-r9.png`用于新身份/比例/连续毛层；2.上述冻结`style-reference-mature-0.png`用于原始色温/暖棕阴影/棕轮廓。没有用R8或任何旧hex方案。

Use case: identity-preserve / stylized-concept. NEW 12-frame Small-tailed Han ram feeding sheet in PIXEL ART / 像素风.
INPUT1 = approved NEW R9 ADULT: use this exact breed identity, natural body/leg proportions, long face, drooping ears, short broad fan tail, ram spiral horns, clean continuous fleece and pixel drawing style.
INPUT2 = FROZEN ORIGINAL OLD SHEEP: REQUIRED COLOR-TEMPERATURE reference for ALL12 drawings. Match its actual warm cream / pale golden-cream lights, warm ochre/tawny-brown shadows and warm brown outlines. Retain the R9 adult's warm reference-matched palette; do not drift cool, gray/desaturated, over-white or brown-dyed. Do not invent numeric palettes. The old sheep is ONLY color/outline style reference, not its round wool lumps/short legs or anatomy.
All stages and all frames share ONE identical warm farm palette and same lighting. Body/head/face/neck/legs form a coordinated warm cream family, no artificially bleached face, socks or bicolor zones. Natural muted pink ear interiors, tan horns, deep warm-brown hooves/eyes/nose. Coat clean coherent cream areas with FEW connected warm-brown whole-form shadows under neck/belly/leg joins. NO big round clumps, cauliflower/tumor bumps, scalloped armor plates, tiny dots/C curls/speckles/hatching/stipple/grain or patchy discoloration.
Explicit PIXEL ART: clear deliberate stair-step silhouette and warm brown pixel outline, restrained separated fixed tone steps matching frozen original; match R9 adult pixel scale. No soft focus, photoreal fibers, airbrush gradients,3D realism, glows or noisy dithering.
Square genuine RGBA alpha0 transparent 5columns x5rows sheet. Exactly12 sheep in columns1–4 rows1–3 only; fifth column, bottom2 rows, gutters empty transparent. Complete horns/ears/tail/four feet with clear gaps; no clipping, labels, grid, ground/floor shadow, food/trough, scene or props.
Rows = SAME MALE at3 newly drawn ages: row1 young lamb horn buds and juvenile form; row2 growing ram small curls and developing sturdy body; row3 mature adult matching INPUT1 with natural spiral horns. Preserve long face, medium drooping ears, short broad fat fan tail and fairly long healthy sturdy limbs, not original short-legged round sheep.
Columns = four truly DRAWN low-head feeding/chewing frames. All face RIGHT at same slightly elevated3/4 camera. Each row body/back/flank/tail and four planted hooves FIXED locally; only natural neck/head/jaw changes.0 closed mouth low;1 gently opened jaw with tiny neck reach;2 closed chew and jaw shift;3 slight lip opening while returning toward0. Keep muzzle ahead of front hooves near ground in all4, no high head lift. No whole-animal translation/rotation/scaling to fake eating.
Temperature fidelity is required against INPUT2 itself, not merely consistency among new images. Do not restore old wool bumps or texture while matching its warm colors.

### 新原图真实坐标登记

| 阶段 | 四帧同一解剖蹄位x | 蹄底像素y/下边界anchor y | 共享相对canvas | 首帧实际mouth |
| --- | --- | --- | --- | --- |
| young |155/437/720/1003|213 /214|[-120,-158,250,176]|[235,209]|
| growing |153/436/720/1001|437 /438|[-128,-175,268,192]|[238,433]|
| mature |151/433/716/998|686 /687|[-145,-198,294,216]|[246,670]|

同阶段四帧一个共享canvas/尺度，按新图真实前景前蹄下边界登记，不按bbox重居中，不旋转/缩放整动物。真实主体间透明间隔的隔离切点为x294/576/858；完整保留开放嘴尖、角耳尾与脚。正常转换不修改RGB或程序处理纹理/色差。


## R9选择三参考新绘：真实成熟0/3 + 冻结原始老图

`choice-r9.png`实际1254×1254 RGBA，源SHA256=`c5cd370fe7122d4cda3dc84a9759959ae86415f822852ae1da81b569b0f5bd1c`。实际内容裁切窗口`{left:208,top:341,width:758,height:721}`，正常输出96×96透明PNG/WebP，未程序修色或去点。真实生成来源：`C:/Users/eeg14/.codex/generated_images/01a203a8-7c32-73d2-9369-c59b15ffde68/exec-236d051a-48d4-4dbb-850c-91589bd4988a.png`。

实际imagegen reference输入顺序如下，均真正提供给绘图工具：

1. `assets/livestock/animals/L08/mature-0.png`，SHA256=`770329b519e1d7d24cc1221d2cd66ce125d8e96d6a3a2879b67bac73d3c9642a`，本次新成熟身份；精确快照`choice-inputs-r9/mature-0.png`。
2. `assets/livestock/animals/L08/mature-3.png`，SHA256=`785d36f53298b38dda409c1989d9b0007f7e727acdee00d05f9de90e3c9fa0cd`，本次新成熟身份；精确快照`choice-inputs-r9/mature-3.png`。
3. `assets/livestock/raw/l08-small-tailed-han-v1/style-reference-mature-0.png`，SHA256=`df80461b06f9c6a79831a3c2b3cb6c87f43f27739b7c1f2d7800f7c73c0cc550`，冻结老原图的真实色温/暖棕阴影/棕轮廓参考。

choice-registration-v7的L08保存identity referenceFrames和colorReference及路径/hash，不把第三参考伪写为动画帧。抬头图是新绘，不裁低头帧、旋转整只、复用旧图或代码调色。实际prompt逐字如下：

Use case: identity-preserve / stylized-concept. NEW normal HEAD-UP standing PIXEL ART / 像素风 portrait of the current mature Small-tailed Han ram.
INPUT1 and INPUT2 = actual CURRENT R9 mature feeding frames0 and3: REQUIRED identity/body/face/horn/ear/tail/leg proportions, clean continuous coat and current pixel scale. Make a NEW drawn normal relaxed head-up pose facing RIGHT, same slight elevated3/4 camera; whole animal with horns/ears/tail/four planted feet complete. Do not crop/rotate/transform a feeding sprite.
INPUT3 = FROZEN ORIGINAL OLD SHEEP: REQUIRED actual COLOR-TEMPERATURE / SHADOW / OUTLINE reference. Match its warm cream / pale golden-cream highlights, warm ochre/tawny-brown form shadows and warm brown pixel outlines; keep the current R9 mature frame palette. Do not drift to cool gray, neutral gray-beige, desaturated gray-white, over-white or strongly brown/yellow-dyed sheep. No invented hex palette. Color must be faithful to INPUT3 itself, not merely match another new image. Input3 is ONLY palette/pixel-outline style, NOT its old round wool lumps/short-legged anatomy.
Body, head/face/neck and legs have a coordinated warm cream family in one lighting, no bleached face, socks or two-color zones. Natural muted pink ear interior, tan ram horns and dark warm-brown hooves/eyes/nose. Retain current R9 long face, drooping ears, short broad fan tail, natural ram spiral horns and fairly long sturdy limbs.
Clean continuous warm-cream coat with a few connected warm-brown whole-form shadows under neck/belly/leg joins. NO huge round wool clumps, cauliflower/tumor bumps, scalloped armor, dots, C curls, flecks, stipple, grain, hatching, cloudy mottling or discolored patches. Do not add texture while matching warm original palette.
Explicit hand-drawn PIXEL ART: clear deliberate stair-step silhouette, warm brown outline and restrained separated tone steps matching originals, same pixel scale as R9 frames. No photoreal fibers, soft focus, airbrush/continuous gradients,3D realism, glow or dithering.
One complete centered large ram on square genuine RGBA alpha0 transparent background with margins. No ground/floor shadow, scene, barn, grass, feed/trough, props, product, text, grid or swatches.


## 验收边界

原始老图与新成年已在同一中性灰底并排查看，证据图`assets/livestock/reviews/l08-small-tailed-han-v1/r9-original-adult-neutral-600.png`仅本地保存。比较仅按实际Alpha主体裁切、最近邻统一显示尺寸与中性底合成，未改变原始RGB。PM已查看后继续12帧；用户最终认可及游戏动态体验未验证。未执行测试/check/art:check/预览/语法运行检查/编译/推送。

