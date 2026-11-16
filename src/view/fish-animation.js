import { Container, Graphics, GraphicsContext, Sprite } from 'pixi.js';
import fishVisuals from '../content/fish-visuals.json' with { type: 'json' };
import habitatVisuals from '../content/fish-habitats.json' with { type: 'json' };
import { fishRegistration, fishSizeLayouts } from './fish-layout.js';

export const fishFrameSize = 320;
export const fishIdleFrames = 4;
export const minFishAnimationMs = 9000;
export const fishSpecies = fishVisuals;
export const fishHabitats = habitatVisuals;

const idleFrameMs = 300;
const transitionMs = 300;
const waterFrameMs = 1000 / 30;
const rippleCycleMs = 3600;
const ripplePositions = [[0.32, 0.25], [0.65, 0.38], [0.43, 0.55], [0.75, 0.65], [0.27, 0.79]];

function smoothstep(progress) {
  const bounded = Math.max(0, Math.min(1, progress));
  return bounded * bounded * (3 - 2 * bounded);
}

function waterBounds(polygon) {
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

function rippleArc(target, x, y, radiusX, radiusY, start, end, color, alpha) {
  // Every short arc starts its own path. Never connect it to an earlier shape.
  target.moveTo(x + Math.cos(start) * radiusX, y + Math.sin(start) * radiusY);
  const segments = 12;
  for (let step = 1; step <= segments; step += 1) {
    const angle = start + (end - start) * step / segments;
    target.lineTo(x + Math.cos(angle) * radiusX, y + Math.sin(angle) * radiusY);
  }
  target.stroke({ color, alpha, width: 0.85, cap: 'round', join: 'round' });
}

// Ripple geometry depends on the 3600 ms progress cycle, which is exactly 108
// steps of the 30 fps water clock. Each ripple's shape is baked once per step
// into a shared GraphicsContext; only the slow sideways drift (period 2π·4800 ms,
// never aligned with the cycle) stays live as the Graphics' x offset.
const rippleCycleFrames = Math.round(rippleCycleMs / waterFrameMs);
const emptyRippleContext = new GraphicsContext();
// Keyed by water bounds and colour. Contexts are shared by every pond with the
// same habitat and live for the module lifetime (habitats × 5 × 108 at most);
// a pond's destroy never touches them.
const rippleContextCache = new Map();

function rippleSlots(bounds, color) {
  const key = [bounds.left, bounds.top, bounds.width, bounds.height, color].join(',');
  let slots = rippleContextCache.get(key);
  if (!slots) {
    slots = ripplePositions.map(() => new Array(rippleCycleFrames));
    rippleContextCache.set(key, slots);
  }
  return slots;
}

function rippleContext(slots, bounds, color, index, slot) {
  let context = slots[index][slot];
  if (context) return context;
  const [across, down] = ripplePositions[index];
  const slotMs = slot * waterFrameMs;
  const progress = ((slotMs + index * rippleCycleMs / ripplePositions.length) % rippleCycleMs) / rippleCycleMs;
  const depth = 0.68 + down * 0.38;
  const radiusX = (8 + 25 * progress) * depth;
  const radiusY = radiusX * 0.24;
  const x = bounds.left + across * bounds.width;
  const y = bounds.top + down * bounds.height + progress * 3;
  const alpha = Math.sin(progress * Math.PI) * 0.26;
  context = new GraphicsContext();
  rippleArc(context, x, y, radiusX, radiusY, Math.PI * 0.12, Math.PI * 0.86, color, alpha);
  rippleArc(context, x, y, radiusX, radiusY, Math.PI * 1.1, Math.PI * 1.78, color, alpha * 0.72);
  slots[index][slot] = context;
  return context;
}

function showRipples(rippleGraphics, slots, bounds, color, waterFrame, now) {
  const slot = waterFrame % rippleCycleFrames;
  for (const [index, graphics] of rippleGraphics.entries()) {
    const context = rippleContext(slots, bounds, color, index, slot);
    if (graphics.context !== context) graphics.context = context;
    graphics.x = Math.sin(now / 4800 + index) * 3;
  }
}

export function sampleFishAnimation({
  batch, animationStart = batch.start, clock, now = clock,
}) {
  const species = fishSpecies[batch.id];
  const duration = Math.max(batch.end - batch.start, minFishAnimationMs);
  const elapsed = Math.max(0, clock - animationStart);
  const phase = elapsed % duration;

  return {
    stage: Math.floor(phase * species.stages / duration),
    idleFrame: Math.floor(Math.max(0, now) / idleFrameMs) % fishIdleFrames,
    // The mature fish finishes fading before the next cycle's fry fades in.
    // Only one stage is present, so the two silhouettes never overlap.
    alpha: smoothstep(phase / transitionMs) * smoothstep((duration - phase) / transitionMs),
  };
}

export function mountFishAnimation(
  parent, textures, { x, y, width, height }, batch, animationStart = batch.start,
) {
  const species = fishSpecies[batch.id];
  const layout = fishSizeLayouts[species.size];
  const habitat = fishHabitats[species.habitat];
  const polygon = habitat.water.polygon.flat();
  const bounds = waterBounds(habitat.water.polygon);
  const container = new Container();
  container.label = 'fish-animation';
  container.eventMode = 'none';
  container.position.set(x, y);
  const clip = new Graphics().roundRect(0, 0, width, height, 10).fill(0xffffff);
  const scene = new Container();
  const factor = Math.max(width, height) / fishFrameSize;
  scene.eventMode = 'none';
  scene.scale.set(factor);
  scene.position.set((width - fishFrameSize * factor) / 2, (height - fishFrameSize * factor) / 2);
  container.addChild(scene, clip);
  scene.mask = clip;

  for (const texture of [textures.pond, ...textures.stages.flat()]) {
    texture.source.scaleMode = 'nearest';
  }
  const pond = new Sprite({ texture: textures.pond, roundPixels: true });
  pond.label = 'fish-pond';
  pond.eventMode = 'none';
  scene.addChild(pond);

  // Layer 1 is the stationary background. The remaining three layers share
  // the registered open-water mask, so fish, tint and ripples cannot cover land.
  const surface = new Container();
  surface.label = 'fish-water-surface';
  surface.eventMode = 'none';
  const waterMask = new Graphics().poly(polygon).fill(0xffffff);
  waterMask.label = 'fish-water-mask';
  waterMask.eventMode = 'none';
  scene.addChild(surface, waterMask);
  surface.mask = waterMask;

  // Layer 2: the fish. Only these sprites participate in the harvest fade.
  const fishLayer = new Container();
  fishLayer.label = 'fish-layer';
  fishLayer.eventMode = 'none';
  surface.addChild(fishLayer);

  const fish = layout.placements.map((placement, index) => {
    const sprite = new Sprite({ texture: textures.stages[0][0], roundPixels: true });
    sprite.label = 'fish-animal-' + index;
    sprite.eventMode = 'none';
    const scale = layout.scale * placement.depth;
    sprite.scale.set(scale);
    sprite.position.set(
      placement.x - fishRegistration.x * scale,
      placement.y - fishRegistration.y * scale,
    );
    sprite.alpha = 0;
    fishLayer.addChild(sprite);
    return sprite;
  });

  // Layer 3: a translucent water body above the fish, using asset metadata.
  const tint = new Graphics().poly(polygon).fill({ color: habitat.water.color, alpha: habitat.water.alpha });
  tint.label = 'fish-water-color';
  tint.eventMode = 'none';
  surface.addChild(tint);

  // Layer 4: fine animated wave highlights, independent of the fish lifecycle.
  const waves = new Container();
  waves.label = 'fish-water-waves';
  waves.eventMode = 'none';
  surface.addChild(waves);
  const rippleColor = species.habitat === 'sea' ? 0xd0edf5 : 0xd0e9df;
  const ripples = rippleSlots(bounds, rippleColor);
  // One Graphics per ripple, drawn in the original order. Constructed from a
  // shared context, so none of them owns a context that destroy could free.
  const rippleGraphics = ripplePositions.map((_, index) => {
    const graphics = new Graphics(emptyRippleContext);
    graphics.label = 'fish-water-wave-' + index;
    graphics.eventMode = 'none';
    waves.addChild(graphics);
    return graphics;
  });
  let lastWaterFrame;
  parent.addChild(container);

  return {
    container,
    update({ clock, now }) {
      const sample = sampleFishAnimation({ batch, animationStart, clock, now });
      const texture = textures.stages[sample.stage][sample.idleFrame];
      for (const sprite of fish) {
        if (sprite.texture !== texture) sprite.texture = texture;
        sprite.alpha = sample.alpha;
      }
      const waterNow = Math.max(0, now ?? clock);
      const waterFrame = Math.floor(waterNow / waterFrameMs);
      if (waterFrame !== lastWaterFrame) {
        showRipples(rippleGraphics, ripples, bounds, rippleColor, waterFrame, waterNow);
        lastWaterFrame = waterFrame;
      }
    },
    destroy() {
      if (container.destroyed) return;
      surface.mask = null;
      scene.mask = null;
      // Shared ripple contexts stay alive for other ponds. A falsy option on a
      // Graphics built from a shared context frees only the Graphics itself.
      for (const graphics of rippleGraphics) graphics.destroy();
      clip.destroy();
      container.destroy({ children: true });
    },
  };
}
