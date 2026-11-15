"""Cut independently drawn facility scenes out of their source sheets."""

from argparse import ArgumentParser
from hashlib import sha256
from json import dumps, loads
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets/source/art"
OUTPUT = ROOT / "public/art"
SHEETS = {
    "crops-02-26": [f"C{i:02}" for i in range(2, 27)],
    "crops-27-50": [f"C{i:02}" for i in range(27, 51)],
    "livestock-fish": [f"L{i:02}" for i in range(2, 11)] + [f"F{i:02}" for i in range(2, 11)],
    "crops-51-59": [f"C{i:02}" for i in range(51, 60)],
    "crops-60-68": [f"C{i:02}" for i in range(60, 69)],
}
THREE_COLUMNS = {"crops-51-59", "crops-60-68"}
ORIGINALS = {"C01": "scene-wheat", "L01": "scene-hen", "F01": "scene-fish"}
FISH_LAYOUT = ROOT / "assets/fish/layout.json"
FISH_SCENES = loads(FISH_LAYOUT.read_text(encoding="utf-8")).get("species", {}) if FISH_LAYOUT.exists() else {}


def seams(image, horizontal=False, columns=5):
    pixels = image.load()
    length = image.height if horizontal else image.width
    breadth = image.width if horizontal else image.height
    def score(offset):
        total = 0
        for position in range(0, breadth, 2):
            r, g, b = pixels[position, offset] if horizontal else pixels[offset, position]
            total += r > 155 and b > 115 and g < 120 and r - g > 60 and b - g > 42
        return total
    positions = [0]
    for index in range(1, columns):
        expected = round(length * index / columns)
        reach = round(length * 0.025)
        peak = max(range(expected - reach, expected + reach + 1), key=lambda offset: (score(offset), -abs(offset - expected)))
        if score(peak) < breadth * 0.20:
            raise ValueError(f"Expected a magenta divider near {expected}, got {peak}")
        positions.append(peak)
    return [*positions, length]


def save(name, scene):
    # Fish animation exports own persistent fallback PNGs. Keep the regular
    # facility exporter from replacing those with its historical sheet cells.
    replacement = ART / f"scene-{name}.png"
    if name in FISH_SCENES and replacement.exists():
        with Image.open(replacement) as current:
            scene = current.convert("RGB")
    card = ImageOps.fit(scene, (320, 320), Image.Resampling.NEAREST)
    published = OUTPUT / f"scene-{name}.webp"
    card.save(published, quality=70, method=6)
    manifest_path = ROOT / "assets/fish/atlas.json"
    if name in FISH_SCENES and replacement.exists() and manifest_path.exists():
        manifest = loads(manifest_path.read_text(encoding="utf-8"))
        record = manifest.get("species", {}).get(name)
        if record and record.get("fallback", {}).get("source") == f"assets/source/art/scene-{name}.png":
            record["fallback"]["sourceSha256"] = sha256(replacement.read_bytes()).hexdigest()
            record["fallback"]["sha256"] = sha256(published.read_bytes()).hexdigest()
            manifest_path.write_text(dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--sheet", action="append", choices=SHEETS)
    options = parser.parse_args()
    for name in options.sheet or SHEETS:
        columns = 3 if name in THREE_COLUMNS else 5
        with Image.open(ART / "facility-sheets" / f"{name}.png") as source:
            atlas = source.convert("RGB")
        xs = seams(atlas, columns=columns)
        ys = seams(atlas, horizontal=True, columns=columns)
        inset = max(6, round(atlas.width * 0.008))
        for position, item in enumerate(SHEETS[name]):
            row, column = divmod(position, columns)
            save(item, atlas.crop((xs[column] + inset, ys[row] + inset,
                                   xs[column + 1] - inset, ys[row + 1] - inset)))
    if not options.sheet:
        for item, name in ORIGINALS.items():
            with Image.open(ART / f"{name}.png") as source:
                save(item, source.convert("RGB"))


if __name__ == "__main__":
    main()
