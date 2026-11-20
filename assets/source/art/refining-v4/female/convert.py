"""Only image format/crop conversion; no character painting or anatomy edits."""
from pathlib import Path
from PIL import Image
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
CANONICAL = ROOT / 'docs/Pixel-Characters-Complete-Pack/立绘/08_精制管理'
RUNTIME = ROOT / 'public/art/managers/portraits/refining'
EXPRESSIONS = {'smile': '微笑', 'happy': '高兴', 'angry': '生气', 'sad': '不高兴'}
CROP = (0, 0, 1024, 550)
RESIZED = (538, 289)
PASTE_LEFT = -21
FACE_BOX = (452, 146, 583, 292)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def clean_alpha(im):
    im = im.convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 0 if a <= 8 else a))
    return im

def bbox(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()

manifest = {
    'revision': 'v4 independent female fullbody native expression edits',
    'tool': 'built-in image_gen',
    'originalAppearanceReference': 'assets/source/art/refining-v3/female-fullbody-original-reference.png',
    'basePoseReview': 'PM and independent reviewer approved smile source before expression edits',
    'finalStaticReview': 'PM approved complete fullbody sources, four runtime expressions, and independent 390px UI static composition; image/static-use approval only',
    'canonicalSize': [1024, 1536],
    'canonicalConversion': 'Native single fullbody image, alpha<=8 set to zero; no scale, pose repair, face composite, or drawing',
    'runtimeCropFromCanonical': list(CROP),
    'runtimeResize': list(RESIZED),
    'runtimeScaleXY': [RESIZED[0] / 1024, RESIZED[1] / 550],
    'runtimePasteLeft': PASTE_LEFT,
    'runtimeCanvas': [481, 289],
    'runtimeEncoding': 'RGBA WebP lossless exact, method=6',
    'alphaNoiseFloor': 8,
    'faceReview': {
        'method': 'Approximate manual visible face skin contour including forehead/chin, excluding ear/hair; source tolerance about 4px and old runtime about 2px. Three-quarter face is narrower than rejected frontal v82.',
        'newCanonicalFaceBoxApprox': list(FACE_BOX),
        'oldV82RuntimeFaceBoxApprox': [212, 90, 289, 166],
        'newRuntimeFaceBoxApprox': [FACE_BOX[0] * RESIZED[0] / 1024 + PASTE_LEFT, FACE_BOX[1] * RESIZED[1] / 550, FACE_BOX[2] * RESIZED[0] / 1024 + PASTE_LEFT, FACE_BOX[3] * RESIZED[1] / 550],
        'faceHeightRatioNewToOldApprox': (FACE_BOX[3] - FACE_BOX[1]) * RESIZED[1] / 550 / 76,
        'faceWidthRatioNewToOldApprox': (FACE_BOX[2] - FACE_BOX[0]) * RESIZED[0] / 1024 / 77,
        'cropLimitation': 'Full oil vial and mineral sample jar remain readable; the lower cloth/hand extends below the 289px runtime frame. Full grip is retained in canonical.',
    },
    'expressions': {},
}
ink_boxes = []
for key, chinese in EXPRESSIONS.items():
    source = HERE / f'{key}-native.png'
    canonical = CANONICAL / f'精制管理_女_{chinese}.png'
    runtime = RUNTIME / f'female-{key}.webp'
    im = clean_alpha(Image.open(source))
    im.save(canonical)
    # The runtime is read from the actual delivered canonical, never from a separate bust.
    portrait = Image.open(canonical).convert('RGBA').crop(CROP).resize(RESIZED, Image.Resampling.LANCZOS)
    final = Image.new('RGBA', (481, 289))
    final.alpha_composite(portrait, (PASTE_LEFT, 0))
    final = clean_alpha(final)
    final.save(runtime, 'WEBP', lossless=True, exact=True, quality=100, method=6)
    exported = Image.open(runtime).convert('RGBA')
    ink = bbox(exported)
    ink_boxes.append(ink)
    manifest['expressions'][key] = {
        'source': str(source.relative_to(ROOT)),
        'sourceSize': list(Image.open(source).size),
        'sourceSha256': digest(source),
        'canonical': str(canonical.relative_to(ROOT)),
        'canonicalSha256': digest(canonical),
        'canonicalInk': list(bbox(im)),
        'runtime': str(runtime.relative_to(ROOT)),
        'runtimeSha256': digest(runtime),
        'runtimeInk': list(ink),
    }
manifest['metrics'] = {
    'width': 481,
    'height': 289,
    'faceX': round((FACE_BOX[0] + FACE_BOX[2]) / 2 * RESIZED[0] / 1024 + PASTE_LEFT, 1),
    'inkLeft': min(box[0] for box in ink_boxes),
    'inkRight': max(box[2] for box in ink_boxes),
}
(HERE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'metrics': manifest['metrics'], 'runtimeInk': ink_boxes, 'faceReview': manifest['faceReview']}, ensure_ascii=False))
