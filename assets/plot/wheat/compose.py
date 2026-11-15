from json import loads
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


SOURCES = Path(__file__).resolve().parent
PROJECT = SOURCES.parents[2]
PUBLISHED = PROJECT / "public/art/plot"
SIZE = 320

# From back to front, each ridge uses a fixed horizontal spacing. The
# sprinkler foot occupies the middle planting spot on the seventh ridge.
FURROWS = loads((SOURCES.parent / "furrows.json").read_text())

# The treeline is traced on the 320 px original. Preserve the original RGB
# around the cut so the WebP encoder has the same colors on both sides.
HORIZON = (
    (0, 31), (8, 28), (14, 25), (20, 25), (27, 19), (32, 22),
    (40, 23), (47, 24), (54, 20), (58, 22), (65, 22), (72, 23),
    (81, 19), (90, 17), (95, 18), (103, 23), (110, 26), (116, 29),
    (122, 24), (131, 21), (136, 15), (144, 11), (152, 10),
    (160, 6), (171, 8), (179, 9), (181, 3), (186, 0), (319, 0),
)

# Use the upright row of the source grid for all four growth stages.
SPRITE_COLUMNS = ((83, 204), (293, 552), (561, 897), (898, 1240))
SPRITE_ROW = (4, 380)


def write_layer(name, image):
    image.save(SOURCES / f"{name}.png", optimize=True)


def split_background():
    source = PROJECT / "assets/source/art/scene-empty-field.png"
    landscape = Image.open(source).convert("RGB").resize((SIZE, SIZE), Image.Resampling.LANCZOS)

    # In the invisible area behind the ground, keep just the nearby sky color.
    # Keeping four additional original pixels along the horizon hides any
    # differences between independently encoded WebP layers at their boundary.
    ground_mask = Image.new("L", (SIZE, SIZE))
    ImageDraw.Draw(ground_mask).polygon((*HORIZON, (319, 319), (0, 319)), fill=255)
    ground = landscape.copy()
    ground.putalpha(ground_mask)

    sky = landscape.copy()
    for x in range(SIZE):
        horizon = next(y for y in range(SIZE) if ground_mask.getpixel((x, y)))
        margin = max(12, horizon + 5)
        sky_color = landscape.getpixel((x, max(0, horizon - 5)))
        ImageDraw.Draw(sky).line((x, margin, x, SIZE - 1), fill=sky_color)

    write_layer("sky", sky)
    write_layer("ground", ground)
    sky.save(PUBLISHED / "sky.webp", quality=70, method=6, exact=True)
    ground.save(PUBLISHED / "ground.webp", quality=70, method=6, exact=True)


def load_sprites():
    sheet = Image.open(SOURCES / "wheat-sprites.png").convert("RGBA")
    # Remove a faint matte left in pixels outside the drawn silhouettes.
    clean_alpha = [round(max(0, alpha - 12) * 255 / 243) for alpha in range(256)]
    stages = []
    top, bottom = SPRITE_ROW
    for left, right in SPRITE_COLUMNS:
        sprite = sheet.crop((left, top, right, bottom))
        sprite.putalpha(sprite.getchannel("A").point(clean_alpha))
        stages.append(sprite.crop(sprite.getchannel("A").getbbox()))
    return stages


def draw_wheat(source, stage):
    layer = Image.new("RGBA", (SIZE, SIZE))
    shadow = Image.new("RGBA", (SIZE, SIZE))
    shadow_draw = ImageDraw.Draw(shadow)
    plants = []
    for root_x, root_y in sorted((root for row in FURROWS for root in row), key=lambda root: root[1]):
        depth = (root_y - 65) / 225
        if stage == 0:
            width = round(6.5 + depth * 4.2)
            height = round(width * source.height / source.width)
        else:
            height = round((0, 11, 22, 37)[stage] + depth * (0, 13, 28, 35)[stage])
            width = round(height * source.width / source.height * (0, 0.86, 0.79, 1.02)[stage])

        sprite = source.resize((width, height), Image.Resampling.LANCZOS)
        sprite = ImageEnhance.Brightness(sprite).enhance(0.89 + 0.13 * depth)
        if stage == 0:
            anchor_x, anchor_y = width // 2, height // 2
        else:
            # Center the stem on the planted root.
            stem = sprite.getchannel("A").crop((0, height - 2, width, height))
            stem_box = stem.point(lambda alpha: 255 if alpha > 100 else 0).getbbox()
            anchor_x = (stem_box[0] + stem_box[2]) // 2 if stem_box else width // 2
            anchor_y = height - 1

        plants.append((sprite, (root_x - anchor_x, root_y - anchor_y)))
        spread = (2, 2, 3, 5)[stage] * (0.65 + depth * 0.6)
        shadow_draw.ellipse(
            (root_x - spread, root_y - 1, root_x + spread + 1, root_y + 1 + depth * 2),
            fill=(61, 28, 11, (56, 66, 79, 100)[stage]),
        )

    layer.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(0.7)))
    for sprite, position in plants:
        layer.alpha_composite(sprite, position)
    return layer


if __name__ == "__main__":
    PUBLISHED.mkdir(parents=True, exist_ok=True)
    split_background()
    for stage, sprite in enumerate(load_sprites()):
        write_layer(f"wheat-{stage}", draw_wheat(sprite, stage))
