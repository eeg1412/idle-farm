"""Normalize and export independent interface sprites from their source sheets."""
import argparse
import runpy
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/ui-icons"
OUTPUT = ROOT / "public/ui-icons"
NAVIGATION_TILES = {0: "nav-ranch", 15: "nav-management"}
SHEETS = {
    "interface": """
        nav-fields nav-workshop nav-warehouse nav-research nav-catalog
        facility-field facility-empty-field facility-hen facility-empty-barn facility-fish
        facility-empty-pond facility-mill facility-kitchen coin clock
        task-barn task-fish task-process task-product sale-retain
        sale-reset tech-water tech-farm tech-livestock tech-workshop
    """.split(),
    "facilities": """
        facility-buffalo facility-mallard facility-goat facility-goose facility-pig
        facility-rabbit facility-sheep facility-muscovy facility-cattle facility-carp
        facility-sea-bass facility-trout facility-mandarin-fish facility-salmon facility-eel
        facility-sea-bream facility-turbot facility-sturgeon settings-sound settings-music
        settings-display settings-guide operation-switch operation-upgrade operation-sell
    """.split(),
    "plots-early": [f"plot-C{number:02}" for number in range(2, 27)],
    "plots-late": [f"plot-C{number:02}" for number in range(27, 51)] + ["plot-generic"],
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet", choices=[*SHEETS, "portraits", "navigation"])
    args = parser.parse_args()
    atlas = runpy.run_path(str(ROOT / "scripts/export-item-icons.py"))
    normalized = SOURCE / (args.sheet + ".png")
    raw = SOURCE / "raw" / normalized.name
    if args.sheet == "portraits":
        source = atlas["read_sheet"](raw)
        # The first portrait is clear of the second cell at the adjusted divider.
        cell = source.crop((0, 0, round(source.width * 0.21), round(source.height * 0.21)))
        bounds = atlas["foreground_mask"](cell).getbbox()
        if not bounds or min(bounds[0], bounds[1], cell.width - bounds[2], cell.height - bounds[3]) < 4:
            raise ValueError("portrait requires an isolated sprite with a transparent border")
        portrait = cell.crop(bounds)
        portrait.putalpha(portrait.getchannel("A").point(atlas["ALPHA_CLEANUP"]))
        portrait.thumbnail((136, 136), Image.Resampling.NEAREST)
        preview = Image.new("RGBA", (144, 144))
        preview.paste(portrait, ((144 - portrait.width) // 2, (144 - portrait.height) // 2))
        preview.save(normalized)
        icons = {"portrait-warehouse": preview}
    elif args.sheet == "navigation":
        atlas["normalize_sheet"](raw).save(normalized)
        names = [NAVIGATION_TILES.get(index, f"variant-{index + 1:02d}") for index in range(25)]
        variants = atlas["crop_sheet"](normalized, names)
        icons = {name: variants[name] for name in NAVIGATION_TILES.values()}
        satchel = icons["nav-management"]
        sprite = satchel.crop(satchel.getchannel("A").getbbox())
        sprite.thumbnail((74, 74), Image.Resampling.NEAREST)
        balanced = Image.new("RGBA", satchel.size)
        balanced.paste(sprite, ((balanced.width - sprite.width) // 2, (balanced.height - sprite.height) // 2))
        icons["nav-management"] = balanced
    else:
        atlas["normalize_sheet"](raw).save(normalized)
        icons = atlas["crop_sheet"](normalized, SHEETS[args.sheet])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, sprite in icons.items():
        sprite.save(OUTPUT / (name + ".webp"), format="WEBP", quality=70, alpha_quality=100, method=6)


if __name__ == "__main__":
    main()
