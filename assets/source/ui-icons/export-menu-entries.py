"""Crop the original menu artwork and export the fifteen independent menu icons."""
from pathlib import Path

from PIL import Image

SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parents[2] / "public/ui-icons"
SIZE = 96
SPRITE_SIZE = 88

# The generated columns are staggered. These cuts run through clear space.
ROWS = (
    ((0, 335), (0, 337, 637, 966, 1260, 1619),
     ("map", "field", "livestock", "fish", "mine")),
    ((335, 643), (0, 337, 615, 966, 1260, 1619),
     ("processing", "refining", "warehouse", "merchant", "research")),
    ((643, 971), (0, 332, 649, 957, 1280, 1619),
     ("operations", "catalog", "tasks", "farm-sale", "settings")),
)


def export():
    original = Image.open(SOURCE / "raw/menu-entries.png")
    contact_sheet = Image.new("RGBA", (5 * SIZE, 3 * SIZE))
    alpha_cleanup = [0 if value < 12 else value for value in range(256)]
    foreground = [255 if value >= 16 else 0 for value in range(256)]

    for row, ((top, bottom), columns, names) in enumerate(ROWS):
        for column, name in enumerate(names):
            cell = original.crop((columns[column], top, columns[column + 1], bottom))
            alpha = cell.getchannel("A")
            left, upper, right, lower = alpha.point(foreground).getbbox()
            art = cell.crop((left - 2, upper - 2, right + 2, lower + 2))
            art.putalpha(art.getchannel("A").point(alpha_cleanup))
            art.thumbnail((SPRITE_SIZE, SPRITE_SIZE), Image.Resampling.NEAREST)

            sprite = Image.new("RGBA", (SIZE, SIZE))
            sprite.paste(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
            contact_sheet.paste(sprite, (column * SIZE, row * SIZE))
            sprite.save(OUTPUT / ("menu-" + name + ".webp"), format="WEBP",
                        quality=70, alpha_quality=100, method=6)

    contact_sheet.save(SOURCE / "menu-entries.png")


if __name__ == "__main__":
    export()
