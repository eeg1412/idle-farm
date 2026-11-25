import { Container, Sprite, Texture } from 'pixi.js';
import {
  estateCloudFrames, estateCloudVariantCount, estateCloudVisibleBounds,
  estateAnimalCloudFrames, estateAnimalCloudVariantCount, estateAnimalCloudVisibleBounds, estateAnimalCloudAssetUrl,
} from './estate-clouds.js';

const transitionMs = 8000;
const paintEveryMs = 1000 / 30;
const interval = () => (10 + Math.random() * 20) * 60000;
const fraction = (value) => value - Math.floor(value);
const shadowCount = () => 3 + Math.floor(Math.random() * 8);
const shadowRoundMs = () => 145000 + Math.random() * 55000;
const shadowBandCount = 10;
const allShadowBands = (1 << shadowBandCount) - 1;
const shadowBandGap = 0.001;
// The map is round(2.36*W) tall. Reserving against 2.1*W also covers
// rounding at any meaningful game width (W>=2), without moving lanes on resize.
const shadowSafeAspect = 2.1;

function bitCount(mask) {
  let count = 0;
  for (; mask; mask &= mask - 1) count += 1;
  return count;
}

function bandCoverageCost(mask) {
  let previous = -1;
  let cost = 0;
  for (let band = 0; band < shadowBandCount; band += 1) {
    if (!(mask & 1 << band)) continue;
    if (previous < 0) cost += 2 * (band + 0.5) ** 2;
    else cost += (band - previous) ** 2;
    previous = band;
  }
  return cost + 2 * (shadowBandCount - previous - 0.5) ** 2;
}

// This tiny subset search runs only at initialisation/count changes. Penalise
// large empty gaps, then uniformly sample near-best candidates rather than
// always taking the first lanes. Required bands keep existing clouds still.
function selectShadowBands(allowed, required, count) {
  let best = Infinity;
  for (let mask = 1; mask <= allShadowBands; mask += 1) {
    if ((mask & allowed) !== mask || (mask & required) !== required || bitCount(mask) !== count) continue;
    best = Math.min(best, bandCoverageCost(mask));
  }
  let selected = 0;
  let candidates = 0;
  for (let mask = 1; mask <= allShadowBands; mask += 1) {
    if ((mask & allowed) !== mask || (mask & required) !== required || bitCount(mask) !== count
      || bandCoverageCost(mask) > best + 1.25) continue;
    candidates += 1;
    if (Math.random() < 1 / candidates) selected = mask;
  }
  return selected;
}

function changeShadowCount(stream, nextCount) {
  if (nextCount === stream.targetCount) return;
  let active = 0;
  for (let index = 0; index < stream.clouds.length; index += 1) {
    if (stream.clouds[index]) active |= 1 << index;
  }
  const growing = nextCount >= stream.count;
  stream.desiredBands = selectShadowBands(growing ? allShadowBands : active, growing ? active : 0, nextCount);
  stream.targetCount = nextCount;
}

function cloudBounds(shape) {
  return shape < estateCloudVariantCount ? estateCloudVisibleBounds[shape]
    : estateAnimalCloudVisibleBounds[shape - estateCloudVariantCount];
}

function sampleShadow(startedAt, viewportWidth, initial, ordinaryReady, animalReady, band) {
  const ordinaryCount = ordinaryReady ? estateCloudVariantCount : 0;
  const available = ordinaryCount + (animalReady ? estateAnimalCloudVariantCount : 0);
  const pick = Math.floor(Math.random() * available);
  const shape = ordinaryReady ? pick : pick + estateCloudVariantCount;
  const bounds = cloudBounds(shape);
  const width = 0.6 + Math.random() * 0.26;
  // Every complete frame stays in its own disjoint vertical band. Reserve
  // more than the actual half-height, then jitter only inside that safe lane.
  const reservedHalfHeight = width * 0.24 / (2 * shadowSafeAspect);
  const laneTop = band / shadowBandCount + shadowBandGap / 2 + reservedHalfHeight;
  const laneBottom = (band + 1) / shadowBandCount - shadowBandGap / 2 - reservedHalfHeight;
  // Put the actual visible leading edge one logical pixel inside the map.
  // The entire transparent frame margin remains outside and causes no wait.
  const x = initial ? Math.random() : 1 / viewportWidth - width * ((bounds.left + bounds.width) / 256 - 0.5);
  return {
    shape, width, x, startedAt,
    y: laneTop + Math.random() * (laneBottom - laneTop),
    speed: 1.9 / shadowRoundMs(),
  };
}

function createShadowStream(time) {
  const targetCount = shadowCount();
  return {
    targetCount, desiredBands: selectShadowBands(allShadowBands, 0, targetCount),
    count: 0, clouds: Array(shadowBandCount).fill(undefined), followers: Array(shadowBandCount).fill(undefined),
    nextCountAt: time + shadowRoundMs(), fadeAt: time, initialized: false,
  };
}

// Visible horizontal extent of a silhouette, as map-width fractions, at `time`.
function visibleEdges(cloud, time) {
  const bounds = cloudBounds(cloud.shape);
  const x = cloud.x + (time - cloud.startedAt) * cloud.speed;
  return { trailing: x + cloud.width * (bounds.left / 256 - 0.5),
    leading: x + cloud.width * ((bounds.left + bounds.width) / 256 - 0.5) };
}

function exitTime(cloud) {
  return cloud.startedAt + (1 - visibleEdges(cloud, cloud.startedAt).trailing) / cloud.speed;
}

// Minimum horizontal spacing between a silhouette and the one following it in its band.
const followerGap = 0.04;

// The next silhouette of a band enters at the left edge as soon as the current one starts
// leaving on the right. Entry waits longer only when a faster follower would otherwise
// close within `followerGap` before the current one has fully left.
function sampleFollower(cloud, time, viewportWidth, ordinaryReady, animalReady, band) {
  const follower = sampleShadow(0, viewportWidth, false, ordinaryReady, animalReady, band);
  const exitedAt = exitTime(cloud);
  const leaving = cloud.startedAt + (1 - visibleEdges(cloud, cloud.startedAt).leading) / cloud.speed;
  const travel = 1 - followerGap - 1 / viewportWidth;
  follower.startedAt = Math.max(time, leaving, exitedAt - travel / follower.speed, exitedAt - travel / cloud.speed);
  return follower;
}

function advanceShadowStream(stream, time, viewportWidth, ordinaryReady, animalReady) {
  if (!stream || viewportWidth <= 0 || (!ordinaryReady && !animalReady)) return;
  const initial = !stream.initialized;
  if (initial) stream.fadeAt = time;
  for (let index = 0; index < stream.clouds.length; index += 1) {
    const wanted = Boolean(stream.desiredBands & 1 << index);
    let cloud = stream.clouds[index];
    let follower = stream.followers[index];
    if (!cloud && wanted) {
      cloud = sampleShadow(time, viewportWidth, initial, ordinaryReady, animalReady, index);
      stream.count += 1;
    }
    while (cloud) {
      // A band leaving the count keeps silhouettes already on screen but admits no new one.
      if (!wanted && follower && follower.startedAt > time) follower = undefined;
      if (wanted && !follower) follower = sampleFollower(cloud, time, viewportWidth, ordinaryReady, animalReady, index);
      if (time < exitTime(cloud)) break;
      // Each slot advances at its own exit; other silhouettes continue without a batch barrier.
      cloud = follower;
      follower = undefined;
      if (!cloud) stream.count -= 1;
    }
    stream.clouds[index] = cloud;
    stream.followers[index] = follower;
  }
  stream.initialized = true;
}

// A view-owned session: neither the world nor saved/game random sequences are
// involved. The application clock continues on other pages; motion does not.
export function createEstateWeatherSession() {
  let started = false;
  let lastNow;
  let elapsed = 0;
  let motionMs = 0;
  let rain = 0;
  let fromRain = 0;
  let targetRain = 0;
  let changeAt = 0;
  let nextChange = Infinity;
  let shadowStream;
  let sunnyLock = false;
  return {
    start(now) {
      if (started) return;
      started = true;
      lastNow = now;
      rain = targetRain = fromRain = sunnyLock || Math.random() < 0.8 ? 0 : 1;
      nextChange = sunnyLock ? Infinity : interval();
      shadowStream = createShadowStream(motionMs);
    },
    // The new-estate introduction keeps the sky clear without sampling. The
    // next independent sample follows the ordinary interval from release time.
    setSunnyLock(locked) {
      const next = Boolean(locked);
      if (next === sunnyLock) return;
      sunnyLock = next;
      if (next) {
        if (targetRain !== 0 && shadowStream) shadowStream.fadeAt = motionMs;
        rain = targetRain = fromRain = 0;
        nextChange = Infinity;
      } else if (started) {
        nextChange = elapsed + interval();
      }
    },
    pause() { lastNow = undefined; },
    update(now, foreground, mapActive) {
      if (!started || !foreground) { lastNow = undefined; return; }
      const delta = lastNow === undefined ? 0 : Math.max(0, now - lastNow);
      lastNow = now;
      elapsed += delta;
      if (mapActive) motionMs += delta;
      while (!sunnyLock && elapsed >= nextChange) {
        const nextRain = Math.random() < 0.8 ? 0 : 1;
        const scheduledAt = nextChange;
        nextChange += interval();
        // Every interval samples independently. Repeating the current weather
        // preserves its transition and existing cloud stream.
        if (nextRain === targetRain) continue;
        fromRain = targetRain;
        targetRain = nextRain;
        changeAt = scheduledAt;
        if (targetRain === 0) shadowStream.fadeAt = motionMs;
      }
      const progress = Math.min(1, Math.max(0, (elapsed - changeAt) / transitionMs));
      const eased = progress * progress * (3 - 2 * progress);
      rain = fromRain + (targetRain - fromRain) * eased;
      if (mapActive && targetRain === 0 && shadowStream && motionMs >= shadowStream.nextCountAt) {
        changeShadowCount(shadowStream, shadowCount());
        shadowStream.nextCountAt = motionMs + shadowRoundMs();
      }
    },
    get rain() { return rain; },
    get motionMs() { return motionMs; },
    advanceShadows(viewportWidth, ordinaryReady, animalReady) {
      advanceShadowStream(shadowStream, motionMs, viewportWidth, ordinaryReady, animalReady);
    },
    get shadowBatch() { return shadowStream; },
  };
}

// Twenty pooled cloud silhouettes (two per band) on the ground and 72 shared white-texture rain
// streaks. Only their transforms/alpha change; these holders survive equal-size
// rebuilds and their source textures remain owned by the pinned Assets cache.
export function mountEstateWeather(groundParent, foregroundParent, {
  width, height, session, getCloudTexture, loadAnimalImage, markDirty,
}) {
  const ground = new Container({ label: 'estate-cloud-shadows' });
  const front = new Container({ label: 'estate-rain' });
  front.visible = false;
  for (const layer of [ground, front]) {
    layer.eventMode = 'none';
    layer.interactiveChildren = false;
  }
  groundParent.addChild(ground);
  foregroundParent.addChild(front);
  // Two per band: the current silhouette and the follower that enters while it leaves.
  const shadows = Array.from({ length: shadowBandCount * 2 }, (_, index) => {
    const sprite = ground.addChild(new Sprite({ label: `estate-cloud-shadow-${index}`, roundPixels: true }));
    sprite.anchor.set(0.5);
    sprite.tint = 0x213e4c;
    sprite.eventMode = 'none';
    sprite.visible = false;
    return sprite;
  });
  const shade = front.addChild(new Sprite({ texture: Texture.WHITE, label: 'estate-rain-shade' }));
  shade.tint = 0x172b43;
  shade.width = width;
  shade.height = height;
  shade.alpha = 0;
  shade.eventMode = 'none';
  const streaks = front.addChild(new Container({ label: 'estate-rain-streaks' }));
  streaks.eventMode = 'none';
  streaks.interactiveChildren = false;
  const rain = Array.from({ length: 72 }, (_, index) => {
    const sprite = streaks.addChild(new Sprite({ texture: Texture.WHITE, label: `estate-rain-${index}` }));
    sprite.anchor.set(0.5);
    sprite.tint = 0xddebf2;
    sprite.rotation = 0.32;
    sprite.width = Math.max(0.7, width / 450);
    sprite.height = (8 + index % 4 * 3) * width / 390;
    sprite.eventMode = 'none';
    return sprite;
  });
  let viewportTop = 0;
  let viewportHeight = 0;
  let lastPaint = -Infinity;
  let cloudFrames;
  let animalFrames;
  let animalRequested = false;
  let disposed = false;
  function release() { disposed = true; cloudFrames = undefined; animalFrames = undefined; }
  ground.once('destroyed', release);
  front.once('destroyed', release);
  const weather = {
    matches(nextWidth, nextHeight, nextSession) {
      return !disposed && width === nextWidth && height === nextHeight && session === nextSession;
    },
    park() {
      ground.removeFromParent();
      front.removeFromParent();
      return weather;
    },
    attach(nextGround, nextFront) {
      nextGround.addChild(ground);
      nextFront.addChild(front);
      lastPaint = -Infinity;
      return weather;
    },
    destroy() {
      if (!ground.destroyed) ground.destroy({ children: true });
      if (!front.destroyed) front.destroy({ children: true });
      release();
    },
    pause() { lastPaint = -Infinity; },
    setViewport(scroll, visibleHeight) {
      const top = Math.max(0, Math.min(height, scroll));
      const visible = Math.max(0, Math.min(visibleHeight, height - top));
      if (viewportTop !== top) {
        viewportTop = top;
        // Counter the map's scroll immediately without resampling any streaks
        // or bypassing the animation's 30fps limit during drag/coast ticks.
        streaks.y = top;
        markDirty();
      }
      if (viewportHeight !== visible) {
        viewportHeight = visible;
        lastPaint = -Infinity;
      }
    },
    update(now, active) {
      if (disposed) return false;
      if (!active || viewportHeight <= 0) return false;
      if (now - lastPaint < paintEveryMs) return false;
      lastPaint = now;
      const amount = session.rain;
      const time = session.motionMs;
      cloudFrames ??= estateCloudFrames(getCloudTexture());
      ground.alpha = (1 - amount) * 0.13;
      ground.visible = ground.alpha > 0;
      if (ground.visible) session.advanceShadows(width, Boolean(cloudFrames), Boolean(animalFrames));
      const stream = session.shadowBatch;
      const initialFade = stream ? Math.min(1, Math.max(0, (time - stream.fadeAt) / 2000)) : 0;
      for (let index = 0; index < shadows.length; index += 1) {
        const sprite = shadows[index];
        const band = index >> 1;
        const cloud = index & 1 ? stream?.followers[band] : stream?.clouds[band];
        const frames = cloud?.shape < estateCloudVariantCount ? cloudFrames : animalFrames;
        const variant = cloud?.shape < estateCloudVariantCount ? cloud?.shape : cloud?.shape - estateCloudVariantCount;
        const x = cloud ? cloud.x + Math.max(0, time - cloud.startedAt) * cloud.speed : 0;
        sprite.visible = Boolean(frames && ground.visible && cloud && time >= cloud.startedAt);
        if (!sprite.visible) continue;
        sprite.texture = frames[variant];
        sprite.alpha = initialFade;
        sprite.width = width * cloud.width;
        sprite.height = sprite.width * 0.24;
        sprite.position.set(x * width, height * cloud.y);
      }
      shade.alpha = amount * 0.3;
      front.visible = amount > 0;
      if (front.visible) {
        for (let index = 0; index < rain.length; index += 1) {
          const sprite = rain[index];
          const fall = time * (0.00064 + index % 5 * 0.000035);
          sprite.position.set((fraction(index * 0.61803398875 - fall * 0.24) * 1.16 - 0.08) * width,
            -24 + fraction(index * 0.41421356237 + fall) * (viewportHeight + 48));
          sprite.alpha = amount * (0.22 + index % 4 * 0.055);
        }
      }
      markDirty();
      return true;
    },
  };
  // The animal atlas remains optional pinned decoration. A late or failed
  // request never creates a separate foreground animal or fallback silhouette.
  if (!animalRequested && typeof loadAnimalImage === 'function') {
    animalRequested = true;
    Promise.resolve().then(() => loadAnimalImage(estateAnimalCloudAssetUrl())).then((atlas) => {
      if (disposed || ground.destroyed) return;
      animalFrames = estateAnimalCloudFrames(atlas);
      if (animalFrames) { lastPaint = -Infinity; markDirty(); }
    }).catch(() => {});
  }
  return weather;
}
