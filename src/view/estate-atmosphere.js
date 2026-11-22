import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import {
  estateBirdCount, estateBirdPassAt, estateBirdPose, estateBirdRoute,
} from './estate-atmosphere-layout.js';

// Session-wide visible flight clock. A map instance may be destroyed when a
// non-map page is built and recreated on return or rotation; the clock and the
// highest pass ever started survive that, so only the first post-opening map
// guarantees pass zero and later passes follow passEveryMs. Only active,
// texture-ready map ticks advance it; it is never persisted.
const estateBirdSession = { elapsed: 0, startedPass: -1, advancedAt: undefined };

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
  // A recreated instance never replays a pass already started by an earlier
  // instance; if that pass is still in its window, this instance stays hidden
  // until the next timer pass.
  const minPass = estateBirdSession.startedPass + 1;
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
        markDirty();
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
      if (birdTexture && !birdTexture.destroyed && !frames) {
        frames = Array.from({ length: 4 }, (_, index) => new Texture({
          source: birdTexture.source, frame: new Rectangle(index * 128, 0, 128, 128),
        }));
      }
      // Download and atlas preparation do not consume visible flight time. The
      // first ready, active post-opening map tick of the session therefore
      // starts pass zero even after a slow request.
      if (!frames) {
        lastNow = undefined;
        return false;
      }
      // Reset on every inactive tick. Also cap an unobserved browser suspension
      // so restoration never fast-forwards a flock across the map.
      // The shared clock advances at most once per frame timestamp.
      if (lastNow !== undefined && estateBirdSession.advancedAt !== now) {
        estateBirdSession.elapsed += Math.max(0, Math.min(80, now - lastNow));
      }
      estateBirdSession.advancedAt = now;
      lastNow = now;
      const elapsed = estateBirdSession.elapsed;
      if (elapsed - lastPaint < 1000 / 30) return false;
      lastPaint = elapsed;
      let changed = false;
      if (frames) {
        // Pin a pass to the map location where it started. Scrolling moves the
        // world beneath the shared viewport mask instead of dragging the birds.
        const pass = estateBirdPassAt(elapsed);
        if (pass >= minPass && pass !== flightPass) {
          flightPass = pass;
          if (pass > estateBirdSession.startedPass) estateBirdSession.startedPass = pass;
          // Display-only randomness is sampled once, never during this pass's
          // motion, and is independent of game seeds and saved state.
          for (let index = 0; index < routeSamples.length; index += 1) routeSamples[index] = Math.random();
          estateBirdRoute(width, viewportTop, viewportHeight, routeSamples, flightRoute);
          // Put the leading bird at the visible edge immediately on the first
          // pass; later passes retain their full off-map entry routes.
          if (pass === 0) flightRoute.startX = width * (flightRoute.direction > 0 ? -0.02 : 1.02);
        }
        for (let index = 0; index < birds.length; index += 1) {
          const bird = birds[index];
          if (pass < minPass) {
            // Skipped remainder of a pass that began before this instance.
            if (bird.visible) changed = true;
            bird.visible = false;
            continue;
          }
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
  // The game supplies an optional pinned loader, so a mounted map can fetch the
  // atlas during the opening without changing its task/completion registry.
  request();
  return atmosphere;
}
