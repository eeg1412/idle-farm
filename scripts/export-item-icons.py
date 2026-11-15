"""Check 5×5 source atlases and export individual transparent WebP files."""
import argparse
import json
import re
from math import ceil
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/items"
OUTPUT = ROOT / "public/wiki/icons"
EXPANSION_CATALOG = ROOT / "docs/expansion/05-catalog.md"
CROP_SPEC = ROOT / "docs/expansion/08-crop-uses.md"
SIZE = 96
GRID_SIZE = 5
CELL_MARGIN_FRACTION = 0.04
NORMALIZED_SPRITE_FRACTION = 0.64
SEAM_SEARCH_FRACTION = 0.04
FOREGROUND = 32
ALPHA_CLEANUP = [0 if value < 12 else value for value in range(256)]


def atlas_groups():
    legacy_ids = list(json.loads((ROOT / "src/content/catalog.json").read_text())["items"])
    catalog_ids = re.findall(r"^\| ([A-Z]+[0-9]+) \|", EXPANSION_CATALOG.read_text(), re.MULTILINE)
    animal_ids = [item_id for item_id in catalog_ids
                  if re.fullmatch(r"(?:IL|IF|PL|PF|PD|PT|L|F)\d{2}", item_id)]
    crop_grid = CROP_SPEC.read_text().partition("## 图标格序")[2]
    crop_ids = re.findall(r"\b[A-Z]+\d+(?= \|)", crop_grid)
    ids = legacy_ids + animal_ids + crop_ids
    if (len(legacy_ids) != 300 or len(animal_ids) != 150 or len(crop_ids) != 75 or len(catalog_ids) != 525
            or len(set(ids)) != 525 or set(ids) != set(catalog_ids)):
        raise ValueError("expected 300 legacy IDs, 150 animal expansion IDs and 75 crop expansion IDs matching the catalogue")
    groups = {}
    for start in range(0, len(ids), GRID_SIZE ** 2):
        group = ids[start:start + GRID_SIZE ** 2]
        groups[f"{group[0]}-{group[-1]}"] = group
    return groups


def read_sheet(path):
    with Image.open(path) as source:
        if source.format != "PNG" or source.width != source.height or source.width < 500 or "A" not in source.getbands():
            raise ValueError("expected square PNG with an alpha channel")
        return source.convert("RGBA")


def foreground_mask(sheet):
    return sheet.getchannel("A").point([255 if value >= FOREGROUND else 0 for value in range(256)])


def sprite_bounds(mask):
    box = mask.getbbox()
    if (box is None or box[2] - box[0] < mask.width * 0.12 or box[3] - box[1] < mask.height * 0.12
            or mask.histogram()[255] < mask.width * mask.height * 0.035):
        return None
    return box


def crop_sheet(path, ids):
    if len(ids) != GRID_SIZE ** 2:
        raise ValueError(f"expected {GRID_SIZE ** 2} IDs per atlas")
    sheet = read_sheet(path)
    foreground = foreground_mask(sheet)
    edges = [round(sheet.width * i / GRID_SIZE) for i in range(GRID_SIZE + 1)]
    margin = ceil(sheet.width / GRID_SIZE * CELL_MARGIN_FRACTION)
    sprites = {}
    for index, item_id in enumerate(ids):
        row, col = divmod(index, GRID_SIZE)
        cell_edges = (edges[col], edges[row], edges[col + 1], edges[row + 1])
        cell = sheet.crop(cell_edges)
        solid = foreground.crop(cell_edges)
        box = sprite_bounds(solid)
        if box is None:
            raise ValueError(f"{item_id}: empty cell or insufficient foreground")
        padding = min(box[0], box[1], cell.width - box[2], cell.height - box[3])
        if padding < margin:
            raise ValueError(
                f"{item_id}: cell ({row + 1}, {col + 1}) has {padding}px clear border, needs {margin}px"
            )
        trim = (max(0, box[0] - 2), max(0, box[1] - 2),
                min(cell.width, box[2] + 2), min(cell.height, box[3] + 2))
        sprite = cell.crop(trim)
        sprite.putalpha(sprite.getchannel("A").point(ALPHA_CLEANUP))
        sprite.thumbnail((82, 82), Image.Resampling.NEAREST)
        icon = Image.new("RGBA", (SIZE, SIZE))
        icon.paste(sprite, ((SIZE - sprite.width) // 2, (SIZE - sprite.height) // 2))
        sprites[item_id] = icon
    return sprites


def clear_seams(projection):
    size = len(projection)
    radius = round(size * SEAM_SEARCH_FRACTION)
    cuts = [0]
    for step in range(1, GRID_SIZE):
        center = round(size * step / GRID_SIZE)
        candidates = [n for n in range(center - radius, center + radius + 1)
                      if not projection[n - 1] and not projection[n]]
        if not candidates:
            raise ValueError(f"separator {step}: no completely clear seam near its grid boundary")
        cuts.append(min(candidates, key=lambda n: abs(n - center)))
    return cuts + [size]


def separate_rows(mask):
    _, rows = mask.getprojection()
    y = clear_seams(rows)
    cells = {}
    for row in range(GRID_SIZE):
        stripe = mask.crop((0, y[row], mask.width, y[row + 1]))
        columns, _ = stripe.getprojection()
        try:
            x = clear_seams(columns)
        except ValueError as error:
            raise ValueError(f"row {row + 1}, {error}") from error
        for col in range(GRID_SIZE):
            cells[row, col] = (x[col], y[row], x[col + 1], y[row + 1])
    return cells


def separated_cells(mask):
    try:
        return separate_rows(mask)
    except ValueError as row_error:
        try:
            transposed = separate_rows(mask.transpose(Image.Transpose.TRANSPOSE))
        except ValueError as col_error:
            raise ValueError(f"cannot isolate 25 sprites without crossing foreground ({row_error}; {col_error})") from col_error
        return {(col, row): (top, left, bottom, right)
                for (row, col), (left, top, right, bottom) in transposed.items()}


def normalize_sheet(path):
    sheet = read_sheet(path)
    foreground = foreground_mask(sheet)
    bounds = foreground.getbbox()
    if not bounds:
        raise ValueError("empty source atlas")
    if bounds[0] == 0 or bounds[1] == 0 or bounds[2] == sheet.width or bounds[3] == sheet.height:
        raise ValueError("source foreground reaches the outer canvas edge")
    cells = separated_cells(foreground)
    edges = [round(sheet.width * i / GRID_SIZE) for i in range(GRID_SIZE + 1)]
    normalized = Image.new("RGBA", sheet.size)
    for (row, col), bounds in sorted(cells.items()):
        solid = foreground.crop(bounds)
        box = sprite_bounds(solid)
        if box is None:
            raise ValueError(f"cell ({row + 1}, {col + 1}): empty or insufficient foreground")
        left, top, right, bottom = bounds
        trim = (max(left, left + box[0] - 2), max(top, top + box[1] - 2),
                min(right, left + box[2] + 2), min(bottom, top + box[3] + 2))
        sprite = sheet.crop(trim)
        sprite.putalpha(sprite.getchannel("A").point(ALPHA_CLEANUP))
        width, height = edges[col + 1] - edges[col], edges[row + 1] - edges[row]
        sprite.thumbnail((int(width * NORMALIZED_SPRITE_FRACTION), int(height * NORMALIZED_SPRITE_FRACTION)),
                         Image.Resampling.NEAREST)
        normalized.paste(sprite, (edges[col] + (width - sprite.width) // 2,
                                  edges[row] + (height - sprite.height) // 2))
    return normalized


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--check", action="store_true", help="Validate sources and existing WebP files")
    modes.add_argument("--validate-source", action="store_true", help="Validate source PNGs without writing files")
    modes.add_argument("--normalize-to", type=Path, metavar="DIR",
                       help="Repack unmerged source sprites into fixed cells; preserve the original PNGs")
    parser.add_argument("--source-dir", type=Path, default=SOURCE, help="Directory containing the 5×5 PNGs")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT, help="Directory for the individual WebP files")
    parser.add_argument("--sheet", action="append", metavar="ID-ID", help="Process only the named source sheet; repeatable")
    args = parser.parse_args()
    if args.normalize_to and args.normalize_to.resolve() == args.source_dir.resolve():
        parser.error("--normalize-to must be separate from --source-dir")
    try:
        groups = atlas_groups()
    except (OSError, ValueError) as error:
        parser.error(str(error))
    selected = list(dict.fromkeys(args.sheet)) if args.sheet else list(groups)
    unknown = [name for name in selected if name not in groups]
    if unknown:
        parser.error("unknown source sheets: " + ", ".join(unknown))
    sprites = {}
    failures = []
    for name in selected:
        group = groups[name]
        path = args.source_dir / f"{name}.png"
        try:
            if args.normalize_to:
                normalized = normalize_sheet(path)
                args.normalize_to.mkdir(parents=True, exist_ok=True)
                path = args.normalize_to / path.name
                normalized.save(path, "PNG")
            sprites.update(crop_sheet(path, group))
            print(f"{path.name}: {len(group)} tiles with at least 4% clear border per side")
        except (OSError, ValueError) as error:
            failures.append(f"{path.name}: {error}")
    if failures:
        raise SystemExit("\n".join(failures))
    if args.validate_source or args.normalize_to:
        return

    if not args.check:
        args.output_dir.mkdir(parents=True, exist_ok=True)
    for item_id, icon in sprites.items():
        path = args.output_dir / f"{item_id}.webp"
        if not args.check:
            icon.save(path, "WEBP", quality=70, method=6, alpha_quality=100)
        with Image.open(path) as output:
            if output.format != "WEBP" or output.size != icon.size or "A" not in output.getbands():
                raise SystemExit(f"{path.name}: invalid WebP format, dimensions or alpha channel")
            if ImageChops.difference(output.getchannel("A"), icon.getchannel("A")).getbbox():
                raise SystemExit(f"{path.name}: changed transparency mask")
    if not args.sheet and {p.stem for p in args.output_dir.glob("*.webp")} != set(sprites):
        raise SystemExit("Exported icon IDs differ from the catalog")
    print(f"{len(sprites)} verified transparent WebP icons at {SIZE}×{SIZE}")


if __name__ == "__main__":
    main()
