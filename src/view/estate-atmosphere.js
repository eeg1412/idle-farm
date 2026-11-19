import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import {
  estateBirdCount, estateBirdPassAt, estateBirdPose, estateBirdRoute,
} from './estate-atmosphere-layout.js';

export const estateAtmosphereAssetUrl = (name) => new URL(
  `./art/estate/atmosphere/${name}.webp?game=1&v=1`, document.baseURI,
).href;

// The fixed bird URL uses the existing pinned animation/Assets cache. This instance
// owns only its sprites and four Texture views, never their shared source.
export function mountEstateAtmosphere(parent, { width, height, loadImage, markDirty }) {
  const layer = parent.addChild(new Container({ label: 'estate-atmosphere' }));
  layer.eventMode = 'none';
  layer.interactiveChildren = false;
  const birds = Array.from({ length: estateBirdCount }, (_, index) => {
    const sprite = layer.addChild(new Sprite({ label: `estate-bird-${index}`, roundPixels: true }));
    sprite.eventMode = 'none';
    sprite.anchor.set(0.5);
    sprite.visible = false;
    return sprite;
  });
  const birdPoses = birds.map(() => ({}));
  let disposed = false;
  let requested = false;
  let birdTexture;
  let frames;
  let viewportTop = 0;
  let viewportHeight = 0;
  const flightRoute = {};
  const routeSamples = Array(5).fill(0);
  let flightPass = -1;
  let elapsed = 0;
  let lastNow;
  let lastPaint = -Infinity;

  function request() {
    if (requested) return;
    requested = true;
    // Failure is optional decoration: do not register atlas preparation or
    // revive the already completed opening task registry.
    Promise.resolve(loadImage(estateAtmosphereAssetUrl('birds'))).then((texture) => {
      if (!disposed && !layer.destroyed && texture?.width === 512 && texture.height === 128) {
        birdTexture = texture;
      }
    }).catch(() => {});
  }

  function release() {
    if (disposed) return;
    disposed = true;
    // The holder destroys sprites. Texture.destroy(false) releases only these
    // four subframes; loadAnimationImage/Assets retains the common source.
    for (const texture of frames ?? []) texture.destroy(false);
    frames = undefined;
    birdTexture = undefined;
  }
  // The holder, rather than its current map parent, owns this lifetime. It can
  // be parked across an equivalent map rebuild before the old parent dies.
  layer.once('destroyed', release);

  const atmosphere = {
    matches(nextWidth, nextHeight) { return !disposed && width === nextWidth && height === nextHeight; },
    pause() { lastNow = undefined; },
    park() {
      lastNow = undefined;
      layer.removeFromParent();
      return atmosphere;
    },
    attach(nextParent) {
      nextParent.addChild(layer);
      lastNow = undefined;
      return atmosphere;
    },
    destroy() {
      if (!layer.destroyed) layer.destroy({ children: true });
      else release();
    },
    setViewport(scroll, visibleHeight) {
      const top = Math.max(0, Math.min(height, scroll));
      const visible = Math.max(0, Math.min(visibleHeight, height - top));
      if (viewportTop !== top || viewportHeight !== visible) lastPaint = -Infinity;
      viewportTop = top;
      viewportHeight = visible;
    },
    update(now, active) {
      if (disposed || layer.destroyed) return false;
      if (!active || viewportHeight <= 0) {
        lastNow = undefined;
        return false;
      }
      request();
      // Reset on every inactive tick. Also cap an unobserved browser suspension
      // so restoration never fast-forwards a flock across the map.
      if (lastNow !== undefined) elapsed += Math.max(0, Math.min(80, now - lastNow));
      lastNow = now;
      if (elapsed - lastPaint < 1000 / 30) return false;
      lastPaint = elapsed;
      let changed = false;
      if (birdTexture && !birdTexture.destroyed && !frames) {
        frames = Array.from({ length: 4 }, (_, index) => new Texture({
          source: birdTexture.source, frame: new Rectangle(index * 128, 0, 128, 128),
        }));
      }
      if (frames) {
        // Pin a pass to the map location where it started. Scrolling moves the
        // world beneath the shared viewport mask instead of dragging the birds.
        const pass = estateBirdPassAt(elapsed);
        if (pass >= 0 && pass !== flightPass) {
          flightPass = pass;
          // Display-only randomness is sampled once, never during this pass's
          // motion, and is independent of game seeds and saved state.
          for (let index = 0; index < routeSamples.length; index += 1) routeSamples[index] = Math.random();
          estateBirdRoute(width, viewportTop, viewportHeight, routeSamples, flightRoute);
        }
        for (let index = 0; index < birds.length; index += 1) {
          const bird = birds[index];
          if (pass < 0) continue;
          const pose = estateBirdPose(elapsed, index, width, flightRoute, birdPoses[index]);
          if (bird.visible !== pose.visible) changed = true;
          bird.visible = pose.visible;
          if (!pose.visible) continue;
          bird.texture = frames[pose.frame];
          bird.position.set(pose.x, pose.y);
          bird.width = pose.size;
          bird.height = pose.size;
          bird.scale.x = Math.abs(bird.scale.x) * pose.direction;
          bird.alpha = pose.alpha;
          changed = true;
        }
      }
      if (changed) markDirty();
      return changed;
    },
  };
  return atmosphere;
}
