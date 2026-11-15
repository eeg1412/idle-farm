import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Real generated sprite-sheet crop/format conversion only. No drawing, erasing,
// compositor, layout/game import, preview, resource gate or test execution.
const base = 'assets/workshop';
const source = path.join(base, 'raw/chimney-smoke-v1.png');
const generated = 'C:/Users/eeg14/.codex/generated_images/01a1df5a-7dd5-78a0-a8fe-56db3bbc33ba/exec-14e93e2e-c496-41f7-a84d-b306603359d4.png';
const entries = [
  {
    key: 'chimney-v1', cell: [0, 0],
    visibleBounds: { left: 145, top: 145, right: 483, bottom: 489 },
    crop: { left: 115, top: 112, width: 400, height: 400 },
    anchor: [0.5, 0.5], logicalSize: [40, 40],
    sourceApertureCenter: [315, 312], targetApertureCenter: [48, 48],
    apertureMethod: 'direct source inspection; charcoal horizontal span x238..392 and vertical span y232..392 as exclusive pixel edges; centered crop maps opening to exact sprite center',
  },
  {
    key: 'smoke-1-v1', cell: [1, 0],
    visibleBounds: { left: 776, top: 128, right: 1087, bottom: 518 },
    crop: { left: 708, top: 99, width: 448, height: 448 },
    anchor: [0.5, 0.5],
  },
  {
    key: 'smoke-2-v1', cell: [0, 1],
    visibleBounds: { left: 80, top: 794, right: 538, bottom: 1104 },
    crop: { left: 53, top: 693, width: 512, height: 512 },
    anchor: [0.5, 0.5],
  },
  {
    key: 'smoke-3-v1', cell: [1, 1],
    visibleBounds: { left: 768, top: 695, right: 1095, bottom: 1176 },
    crop: { left: 660, top: 664, width: 544, height: 544 },
    anchor: [0.5, 0.5],
  },
];
await fs.mkdir(path.join(base, 'png'), { recursive: true });
await fs.mkdir('public/art/workshop', { recursive: true });
for (const entry of entries) {
  const pngPath = path.join(base, 'png', entry.key + '.png');
  const webpPath = path.join('public/art/workshop', entry.key + '.webp');
  const png = await sharp(source).extract(entry.crop).resize(96, 96, { kernel: 'nearest' }).png().toBuffer();
  await fs.writeFile(pngPath, png);
  await sharp(png).webp({ quality: 70, alphaQuality: 100, effort: 6 }).toFile(webpPath);
  entry.path = './art/workshop/' + entry.key + '.webp';
  entry.png = pngPath.replaceAll('\\', '/');
  entry.webp = webpPath.replaceAll('\\', '/');
  entry.size = [96, 96];
  entry.sourceToTargetScale = 96 / entry.crop.width;
  entry.conversion = 'independent square source crop; uniform nearest-neighbor resize; generated alpha preserved; WebP quality70 alpha100';
}
const effects = JSON.parse(await fs.readFile('src/content/workshop-effects.json', 'utf8'));
await fs.writeFile(path.join(base, 'registration-chimney-smoke-v1.json'), JSON.stringify({
  version: 1, date: '2026-11-16', generator: 'built-in image_gen; one real transparent 2x2 sprite sheet',
  source: source.replaceAll('\\', '/'), sourceSize: [1254, 1254], generated,
  prompt: 'assets/workshop/prompts-chimney-smoke-v1.md',
  inputImages: [
    { path: 'public/art/workshop/processing-machine-wood-v6.webp', role: 'actual current wood pixel style and top-down camera reference only' },
    { path: 'public/art/workshop/refining-machine-wood-v6.webp', role: 'actual current wood pixel style and top-down camera reference only' },
  ],
  entries, effects,
  alphaPolicy: 'preserve real generated transparency and translucent smoke wisps; runtime global maxAlpha0.35 is separate and is not baked into these textures',
  boundsMethod: 'direct ordinary source-image inspection and focused alpha>128 reading; visible bounds right/bottom exclusive',
  status: 'source and asset production evidence only; real layering/drift/opacity/130px experience remain unverified; no game or composition executed',
}, null, 2) + '\n');
console.log('Saved four independent 96x96 PNG/WebP generated sprites and exact opening/crop/source registration. Effects/config/code unchanged; no running or composition.');
