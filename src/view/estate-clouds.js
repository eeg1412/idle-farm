import { Rectangle, Texture } from 'pixi.js';

export const estateCloudVariantCount = 10;
export const estateAnimalCloudVariantCount = 4;
export const estateCloudAssetUrl = () => new URL(
  './art/estate/atmosphere/cloud-shapes-v2.webp?game=1&v=1', document.baseURI,
).href;
export const estateAnimalCloudAssetUrl = () => new URL(
  './art/estate/atmosphere/animal-clouds-v1.webp?game=1&v=2', document.baseURI,
).href;

// Frame-local alpha>=128 bounds, copied from frames[].png.registration in:
// assets/source/art/estate-weather/shapes-v2/conversion.json (published WebP
// SHA256 e4c171adee2e94d863ae6bdb305b05f0e829f68eb5efe4bb80577a1c6e84aeab)
// and animals-v1/conversion.json (right-facing v2 WebP
// SHA256 c04b46b05ffa24a1cdb000e2ae745747d3a9bfda366c7e8129e3792e2dbb4929).
// Both exports use alphaQuality=100. Coordinates describe their 256x128 cells;
// transparent padding must not become invisible travel time at either edge.
export const estateCloudVisibleBounds = [
  { left: 22, top: 18, width: 215, height: 93 },
  { left: 62, top: 15, width: 133, height: 97 },
  { left: 35, top: 17, width: 186, height: 93 },
  { left: 52, top: 14, width: 149, height: 97 },
  { left: 20, top: 35, width: 219, height: 59 },
  { left: 53, top: 16, width: 152, height: 97 },
  { left: 73, top: 14, width: 113, height: 100 },
  { left: 51, top: 14, width: 151, height: 101 },
  { left: 32, top: 16, width: 190, height: 94 },
  { left: 21, top: 29, width: 218, height: 66 },
];
export const estateAnimalCloudVisibleBounds = [
  { left: 59, top: 9, width: 148, height: 111 },
  { left: 33, top: 11, width: 166, height: 108 },
  { left: 24, top: 10, width: 216, height: 108 },
  { left: 13, top: 11, width: 218, height: 104 },
];

// Pinned Assets owns both atlas sources. Individual weather instances never
// destroy either cache's shared frame views or their common source.
const frameCache = new WeakMap();
const animalFrameCache = new WeakMap();
export function estateCloudFrames(atlas) {
  if (!atlas || atlas.destroyed || atlas.width !== 1280 || atlas.height !== 256) return undefined;
  let frames = frameCache.get(atlas);
  if (!frames) {
    frames = Array.from({ length: estateCloudVariantCount }, (_, index) => new Texture({
      source: atlas.source,
      frame: new Rectangle(index % 5 * 256, Math.floor(index / 5) * 128, 256, 128),
    }));
    frameCache.set(atlas, frames);
  }
  return frames;
}

export function estateAnimalCloudFrames(atlas) {
  if (!atlas || atlas.destroyed || atlas.width !== 512 || atlas.height !== 256) return undefined;
  let frames = animalFrameCache.get(atlas);
  if (!frames) {
    frames = Array.from({ length: estateAnimalCloudVariantCount }, (_, index) => new Texture({
      source: atlas.source,
      frame: new Rectangle(index % 2 * 256, Math.floor(index / 2) * 128, 256, 128),
    }));
    animalFrameCache.set(atlas, frames);
  }
  return frames;
}
