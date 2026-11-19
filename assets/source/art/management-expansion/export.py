"""Export the three generated operations-page navigation icons."""

import json
from pathlib import Path

from PIL import Image


SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[3]
OUTPUT = ROOT / 'public' / 'ui-icons'
IDS = ('manager-directory', 'statistics', 'sale-history')


with Image.open(SOURCE / 'icons.png') as original:
    entries = []
    for index, icon_id in enumerate(IDS):
        cell_box = (original.width * index // 3, 0, original.width * (index + 1) // 3, original.height)
        cell = original.crop(cell_box)
        # The generator leaves near-transparent canvas specks below alpha 8.
        alpha = cell.getchannel('A').point(lambda value: 0 if value < 8 else value)
        cell.putalpha(alpha)
        bounds = alpha.getbbox()
        if bounds is None:
            raise ValueError(f'Empty icon cell: {icon_id}')
        sprite = cell.crop(bounds)
        sprite.thumbnail((82, 82), Image.Resampling.NEAREST)
        frame = Image.new('RGBA', (96, 96))
        frame.alpha_composite(sprite, ((96 - sprite.width) // 2, (96 - sprite.height) // 2))
        OUTPUT.mkdir(parents=True, exist_ok=True)
        frame.save(OUTPUT / f'{icon_id}.webp', 'WEBP', lossless=True, method=6)
        entries.append({'id': icon_id, 'cell': cell_box, 'bounds_in_cell': bounds,
                        'sprite_size': sprite.size, 'frame_size': frame.size})

(SOURCE / 'manifest.json').write_text(json.dumps({'source': 'icons.png', 'icons': entries}, indent=2) + '\n')
