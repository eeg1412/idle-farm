import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import visuals from '../content/estate-research-visuals.json' with { type: 'json' };

export const estateResearchAsset = visuals.base.assetName;
export const estateResearchFootprint = visuals.base.footprint;
export const estateResearchMotionBounds = visuals.bubbles.animationBBox;
// Every estate asset name this building can request (build-time manifest check).
export const estateResearchAssetNames = () => [visuals.base.assetName, visuals.bubbles.assetName];

// The base building and its large beaker stay fixed. Only the independently
// painted transparent bubble frames change, in the same building coordinates.
// The map's pinned animation cache owns the atlas source; this holder owns its
// four subtextures and can be parked across an equivalent map rebuild.
export function mountEstateResearch(art, { unit, applyImage, markDirty }) {
  const { bubbles, base } = visuals;
  const [frameWidth, frameHeight] = bubbles.frameSize;
  const holder = art.addChild(new Container({ label: 'estate-research-bubbles' }));
  holder.eventMode = 'none';
  holder.interactiveChildren = false;
  holder.visible = false;
  holder.position.set((bubbles.position[0] - base.canvas[0] / 2) * unit,
    (bubbles.position[1] - base.canvas[1] / 2) * unit);
  const sprite = holder.addChild(new Sprite({ label: 'estate-research-bubble-frame', roundPixels: true }));
  sprite.eventMode = 'none';
  sprite.scale.set(unit);
  let disposed = false;
  let requested = false;
  let baseReady = false;
  let frames;
  let frame = 0;
  let elapsed = 0;
  let lastNow;

  function release() {
    if (disposed) return;
    disposed = true;
    for (const texture of frames ?? []) texture.destroy(false);
    frames = undefined;
  }
  holder.once('destroyed', release);

  const animation = {
    // All other mount inputs come from this fixed, bundled visual registration.
    matches(nextUnit) { return !disposed && unit === nextUnit; },
    pause() { lastNow = undefined; },
    park() {
      lastNow = undefined;
      holder.removeFromParent();
      return animation;
    },
    attach(nextArt) {
      nextArt.addChild(holder);
      baseReady = false;
      holder.visible = false;
      lastNow = undefined;
      return animation;
    },
    destroy() {
      if (!holder.destroyed) holder.destroy({ children: true });
      else release();
    },
    setBaseReady() {
      if (disposed) return;
      baseReady = true;
      holder.visible = Boolean(frames);
      markDirty();
    },
    loadArt() {
      if (requested || disposed) return;
      requested = true;
      applyImage(bubbles.assetName, (texture) => {
        if (disposed || holder.destroyed) return;
        if (!texture || texture.destroyed || texture.width !== frameWidth * bubbles.frameCount || texture.height !== frameHeight) {
          requested = false;
          return;
        }
        frames = Array.from({ length: bubbles.frameCount }, (_, index) => new Texture({
          source: texture.source,
          frame: new Rectangle(index * frameWidth, 0, frameWidth, frameHeight),
        }));
        sprite.texture = frames[frame];
        holder.visible = baseReady;
        markDirty();
      });
    },
    update(now) {
      if (disposed || !baseReady || !frames) {
        lastNow = undefined;
        return false;
      }
      if (lastNow !== undefined) elapsed += Math.max(0, Math.min(80, now - lastNow));
      lastNow = now;
      const next = Math.floor(elapsed / (bubbles.frameSeconds * 1000)) % frames.length;
      if (next === frame) return false;
      frame = next;
      sprite.texture = frames[frame];
      markDirty();
      return true;
    },
  };
  return animation;
}
