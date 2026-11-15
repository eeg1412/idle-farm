from concurrent.futures import ThreadPoolExecutor
from json import loads
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets/plot"
PUBLIC = ROOT / "public/art/plot/crops"
SIZE = 320
TILE = 28
EARLY = ("sown", "seedling")
PHASES = (*EARLY, "growing", "mature")
ROOTS = sorted(
    (root for row in loads((ART / "furrows.json").read_text()) for root in row),
    key=lambda root: root[1],
)

# Height and width caps preserve the original spacing and the view of the sprinkler.
FAMILIES = (
    ("blade", 65, 37, (160, 105, 43), (2, 4, 13, 14, 15, 17, 38, 50, 59, 66)),
    ("orchard", 59, 43, (118, 71, 44),
     (5, 6, 8, 9, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 40, 43, 44, 45, 46, 49, 67, 68)),
    ("vine", 48, 43, (137, 91, 54), (3, 10, 18, 19, 20, 34, 36, 47, 48, 55, 56)),
    ("broad", 44, 43, (138, 92, 58), (21, 22, 33, 35, 37, 42)),
    ("herb", 52, 39, (143, 87, 47), (7, 16, 39, 41, 51, 52, 53, 54, 57, 58, 60, 61, 62, 63, 64, 65)),
)
PROFILES = {
    f"C{number:02}": (form, height, width, seed_color)
    for form, height, width, seed_color, numbers in FAMILIES
    for number in numbers
}


def load_rgba(file):
    with Image.open(file) as image:
        if image.mode != "RGBA" or not image.getchannel("A").getbbox():
            raise ValueError(f"Expected nonempty RGBA artwork: {file}")
        return image.copy()


def shift(color, change):
    return tuple(min(255, max(0, value + change)) for value in color)


def leaf_color(source):
    sample = source.copy()
    sample.thumbnail((48, 48))
    greens = [
        (r, g, b) for r, g, b, a in sample.getdata()
        if a > 200 and g > r * 1.1 and g > b * 1.16 and 48 < g < 220
    ]
    if not greens:
        return (75, 128, 43)
    return tuple(round(median(channel)) for channel in zip(*greens))


def early_art(crop, growing):
    form, _, _, seed_color = PROFILES[crop]
    number = int(crop[1:])
    seeds = Image.new("RGBA", (TILE, TILE))
    sprout = Image.new("RGBA", (TILE, TILE))
    draw = ImageDraw.Draw(seeds)
    seed_color = shift(seed_color, (number % 7 - 3) * 5)
    outline = shift(seed_color, -55)
    highlight = shift(seed_color, 45)
    if form == "blade":
        draw.polygon([(5, 17), (8, 12), (17, 9), (21, 11), (18, 16), (9, 19)], fill=outline)
        draw.polygon([(8, 16), (11, 12), (18, 11), (16, 15), (10, 17)], fill=seed_color)
        draw.line([(11, 13), (17, 11)], fill=highlight, width=2)
    elif form == "orchard":
        draw.polygon([(6, 12), (10, 7), (16, 6), (21, 11), (20, 17), (15, 22), (9, 20)], fill=outline)
        draw.polygon([(8, 12), (11, 9), (17, 8), (19, 12), (17, 17), (13, 19), (9, 17)], fill=seed_color)
        draw.line([(10, 12), (14, 10)], fill=highlight, width=2)
    else:
        for x, y in ((10, 11), (18, 17)):
            draw.ellipse((x - 4, y - 3, x + 4, y + 3), fill=outline)
            draw.ellipse((x - 3, y - 2, x + 3, y + 1), fill=seed_color)
            draw.point((x - 1, y - 1), fill=highlight)

    green = leaf_color(growing)
    dark = shift(green, -41)
    light = shift(green, 35)
    draw = ImageDraw.Draw(sprout)
    tip = 10 if form == "blade" else 13
    draw.line([(14, 24), (14, 18), (13, tip)], fill=dark, width=3)
    draw.line([(14, 24), (14, 18), (13, tip + 1)], fill=light)
    if form == "blade":
        leaves = (
            [(14, 21), (10, 15), (5, 11), (3, 8), (9, 10), (13, 14)],
            [(13, 18), (13, 11), (14, 4), (17, 2), (17, 8), (15, 14)],
            [(14, 20), (18, 13), (23, 9), (25, 9), (23, 14), (19, 17)],
        )
    elif form == "orchard":
        leaves = (
            [(14, 18), (10, 16), (5, 14), (2, 10), (4, 7), (8, 7), (13, 11)],
            [(14, 18), (14, 12), (18, 8), (23, 7), (26, 9), (24, 13), (20, 16)],
        )
    else:
        reach = 2 if form in ("vine", "broad") else 0
        leaves = (
            [(14, 19), (9, 17), (4 - reach, 14), (3 - reach, 10), (8, 9), (13, 13)],
            [(14, 19), (15, 14), (20, 10), (25 + reach, 9), (25, 15), (20, 17)],
            [(13, 15), (10, 10), (12, 6), (15, 5), (17, 10), (15, 14)],
        )
    for points in leaves:
        draw.polygon(points, fill=green, outline=dark)
        mid = points[len(points) // 2]
        draw.line([points[0], mid], fill=light)
    return seeds, sprout


def export_early_sheets(crops):
    originals = ART / "early-atlases"
    originals.mkdir(parents=True, exist_ok=True)
    for start in range(0, len(crops), 12):
        batch = crops[start:start + 12]
        cell_size = TILE + 12
        sheet = Image.new("RGBA", (5 * cell_size, 5 * cell_size))
        cells = []
        for offset, crop in enumerate(batch):
            folder = ART / "crops" / crop
            for stage, sprite in enumerate(early_art(crop, load_rgba(folder / "growing.png"))):
                index = offset * 2 + stage
                x = (index % 5) * cell_size + 6
                y = (index // 5) * cell_size + 6
                sheet.alpha_composite(sprite, (x, y))
                cells.append((folder / (EARLY[stage] + ".png"), (x, y, x + TILE, y + TILE)))
        sheet.save(originals / f"{batch[0]}-{batch[-1]}.png", optimize=True)
        for target, rectangle in cells:
            sheet.crop(rectangle).save(target, optimize=True)


def stamp_stage(source, crop, stage):
    alpha = source.getchannel("A")
    source = source.crop(alpha.getbbox())
    width, height = source.size
    alpha = source.getchannel("A")
    root_zone = alpha.crop((0, max(0, height - max(2, height // 24)), width, height))
    stem = root_zone.point(lambda value: 255 if value >= 150 else 0).getbbox()
    stem_x = ((stem[0] + stem[2]) / 2) if stem else width / 2
    _, mature_height, mature_width, _ = PROFILES[crop]
    cap_height = (8, 18, mature_height * 0.71, mature_height)[stage]
    cap_width = (11, 18, mature_width * 0.78, mature_width)[stage]
    layer = Image.new("RGBA", (SIZE, SIZE))
    shadows = Image.new("RGBA", (SIZE, SIZE))
    ink = ImageDraw.Draw(shadows)
    placements = []
    for x, y in ROOTS:
        depth_scale = 0.72 + (y - 65) * (0.38 / 225)
        scale = min(cap_height / height, cap_width / width) * depth_scale
        w, h = max(2, round(width * scale)), max(2, round(height * scale))
        plant = source.resize((w, h), Image.Resampling.LANCZOS)
        left = x - round((width / 2 if stage == 0 else stem_x) * w / width)
        top = y - (h // 2 if stage == 0 else h - 1)
        radius = min(8, max(2, w // 5))
        ink.ellipse((x - radius, y - 1, x + radius, y + 2), fill=(58, 29, 12, 45 + stage * 14))
        placements.append((plant, (left, top)))
    layer.alpha_composite(shadows.filter(ImageFilter.GaussianBlur(0.55)))
    for plant, offset in placements:
        layer.alpha_composite(plant, offset)
    return layer


def export_atlas(crop):
    atlas = Image.new("RGBA", (SIZE * 2, SIZE * 2))
    for stage, phase in enumerate(PHASES):
        if crop == "C01":
            frame = load_rgba(ART / "wheat" / f"wheat-{stage}.png")
            if frame.size != (SIZE, SIZE):
                raise ValueError(f"Invalid wheat frame size: {frame.size}")
        else:
            frame = stamp_stage(load_rgba(ART / "crops" / crop / f"{phase}.png"), crop, stage)
        atlas.alpha_composite(frame, ((stage % 2) * SIZE, (stage // 2) * SIZE))
    atlas.save(ART / "crop-frames" / f"{crop}.png", optimize=True)
    atlas.save(PUBLIC / f"{crop}.webp", quality=70, method=5, exact=True)


def main():
    catalog = loads((ROOT / "src/content/game-data.json").read_text())
    crops = sorted(key for key, item in catalog["items"].items() if item["kind"] == "C")
    if set(crops) != ({"C01"} | PROFILES.keys()):
        uncovered = set(crops) - ({"C01"} | PROFILES.keys())
        extra = PROFILES.keys() - set(crops)
        raise ValueError(f"Crop animation profiles missing {sorted(uncovered)}, extra {sorted(extra)}")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (ART / "crop-frames").mkdir(parents=True, exist_ok=True)
    export_early_sheets([crop for crop in crops if crop != "C01"])
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(export_atlas, crops))
    print(f"Exported {len(crops)} crop atlases, {len(crops) * 4} growth stages.")


if __name__ == "__main__":
    main()
