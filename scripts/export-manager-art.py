#!/usr/bin/env python3
"""Crop the supplied manager art and export the game's WebP assets."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / 'docs' / 'Pixel-Characters-Complete-Pack' / '立绘'
SOURCE = ROOT / 'assets' / 'source' / 'art' / 'managers'
PUBLIC = ROOT / 'public' / 'art' / 'managers'
ROLES = (
    ('tasks', '任务管理', 490, 494),
    ('estate', '庄园管理', 466, 481),
    ('livestock', '畜牧管理', 468, 481),
    ('field', '农田管理', 548, 490),
    ('mine', '矿洞管理', 485, 486),
    ('fish', '渔场管理', 483, 476),
    ('processing', '加工管理', 466, 474),
    ('refining', '精制管理', 453, 449),
    ('warehouse', '仓库管理', 464, 466),
    ('research', '研发管理', 456, 474),
    ('merchant', '行脚商', 468, 477),
)
EXPRESSIONS = (('smile', '微笑'), ('happy', '高兴'), ('angry', '生气'), ('sad', '不高兴'))


def save_webp(image, relative_path, **options):
    path = PUBLIC / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'WEBP', method=6, **options)


def export_portraits():
    anchors = {}
    for number, (role, name, female_center, male_center) in enumerate(ROLES, 1):
        directory = CHARACTERS / f'{number:02}_{name}'
        genders = (('female', '女', female_center), ('male', '男', male_center))
        anchors[role] = {}
        for gender, character_gender, center in genders:
            busts = []
            for expression, character_expression in EXPRESSIONS:
                path = directory / f'{name}_{character_gender}_{character_expression}.png'
                with Image.open(path) as original:
                    if original.mode != 'RGBA' or original.size != (1024, 1536):
                        raise ValueError(f'Unexpected portrait frame: {path}')
                    busts.append((expression, original.crop((0, 0, original.width, 566))))
            # Trim only transparent outer columns shared by all four expressions.
            bounds = [bust.getchannel('A').getbbox() for _, bust in busts]
            left = min(box[0] for box in bounds) // 2 * 2
            right = (max(box[2] for box in bounds) + 1) // 2 * 2
            width = (right - left) // 2
            visible = []
            for expression, bust in busts:
                bust = bust.crop((left, 0, right, 566)).resize((width, 283), Image.Resampling.NEAREST)
                visible.append(bust.getchannel('A').point([0] * 8 + [255] * 248).getbbox())
                frame = Image.new('RGBA', (width, 289))
                frame.paste(bust, (0, 6))
                save_webp(frame, f'portraits/{role}/{gender}-{expression}.webp', quality=88, alpha_quality=100)
            anchors[role][gender] = {
                'width': width, 'height': 289, 'faceX': (center - left) / 2,
                'inkLeft': min(box[0] for box in visible), 'inkRight': max(box[2] for box in visible),
            }
    # The order desk portraits are exported from their own full-body originals.
    anchors['orders'] = json.loads((SOURCE / 'orders' / 'anchors.json').read_text(encoding='utf-8'))
    (ROOT / 'src' / 'content' / 'manager-portraits.json').write_text(
        json.dumps(anchors, indent=2) + '\n', encoding='utf-8')


def export_icons():
    ids = ('info', 'gift', 'switch', 'receive')
    with Image.open(SOURCE / 'actions.png') as original:
        if original.mode != 'RGBA':
            raise ValueError('The manager actions sheet needs transparency')
        half_width, half_height = original.width // 2, original.height // 2
        for index, action in enumerate(ids):
            col, row = index % 2, index // 2
            icon = original.crop((col * half_width, row * half_height, (col + 1) * half_width, (row + 1) * half_height))
            bounds = icon.getchannel('A').point(lambda alpha: 255 if alpha >= 28 else 0).getbbox()
            if bounds is None or 0 in bounds or bounds[2] >= icon.width or bounds[3] >= icon.height:
                raise ValueError(f'Manager icon {action} is empty or touches its sheet cell')
            icon = icon.crop(bounds)
            icon.thumbnail((57, 57), Image.Resampling.NEAREST)
            frame = Image.new('RGBA', (64, 64))
            frame.paste(icon, ((64 - icon.width) // 2, (64 - icon.height) // 2))
            save_webp(frame, f'icons/{action}.webp', lossless=True)


def export_backgrounds():
    for role, *_ in ROLES:
        with Image.open(SOURCE / 'backgrounds' / f'{role}.png') as original:
            # Keep all of each panorama. The canvas uses a cover fit for its aspect ratio.
            width = 960
            height = round(original.height * width / original.width)
            scene = original.convert('RGB').resize((width, height), Image.Resampling.LANCZOS)
            save_webp(scene, f'backgrounds/{role}.webp', quality=85)


if __name__ == '__main__':
    export_portraits()
    export_icons()
    export_backgrounds()
