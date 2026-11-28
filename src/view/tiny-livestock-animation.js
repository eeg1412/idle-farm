import { Container, Graphics, Sprite } from 'pixi.js';
import { livestockFrameSize, livestockSpecies } from './livestock-animation.js';
import { livestockFeedLayout } from './livestock-layout.js';

const beeFrameMs = 100;
const silkwormFrameMs = 300;
const harvestMaxMs = 2000;
const animalRoot = { x: 138, y: 270 };

function addSprite(scene, texture, label) {
  texture.source.scaleMode = 'nearest';
  const sprite = new Sprite({ texture, roundPixels: true });
  sprite.label = label;
  sprite.eventMode = 'none';
  scene.addChild(sprite);
  return sprite;
}

function mountBeeMotion(scene, frames, visual) {
  const bees = visual.flights.map(({ size, ...flight }, index) => {
    const sprite = addSprite(scene, frames[0], 'tiny-livestock-bee');
    sprite.anchor.set(0.5);
    const scale = size / visual.atlas.frameSize;
    sprite.scale.set(scale);
    return { ...flight, sprite, scale, wingOffset: index, flightOffset: index / visual.flights.length };
  });
  return (now) => {
    for (const { x, y, radiusX, radiusY, periodMs, sprite, scale, wingOffset, flightOffset } of bees) {
      const phase = (now / periodMs + flightOffset) * Math.PI * 2;
      const across = Math.cos(phase);
      sprite.position.set(x + radiusX * Math.sin(phase), y + radiusY * across);
      sprite.scale.x = across < 0 ? -scale : scale;
      const frame = Math.floor(now / beeFrameMs + wingOffset) % frames.length;
      if (sprite.texture !== frames[frame]) sprite.texture = frames[frame];
    }
    return true;
  };
}

function mountSilkwormMotion(scene, frames, feed, visual, species) {
  const feeding = species.feeding[0];
  const feedLayout = livestockFeedLayout(feeding, species.feedTexture, 0.48);
  const stance = species.grounding[0];
  const worms = visual.placements.map(({ x, y, scale }, index) => {
    const left = x - animalRoot.x * scale;
    const top = y - animalRoot.y * scale;
    const shadow = new Graphics().ellipse(left + stance.x * scale, top + stance.y * scale,
      stance.radiusX * scale, stance.radiusY * scale).fill({ color: 0x2b2118, alpha: 0.22 });
    scene.addChild(shadow);
    const leaves = addSprite(scene, feed, 'tiny-livestock-mulberry');
    leaves.scale.set(feedLayout.scale * scale);
    leaves.position.set(left + feedLayout.x * scale, top + feedLayout.y * scale);
    const worm = addSprite(scene, frames[0], 'tiny-livestock-silkworm');
    worm.scale.set(scale);
    worm.position.set(left, top);
    return { worm, frameOffset: index * frames.length / visual.placements.length };
  });
  return (now) => {
    let changed = false;
    for (const { worm, frameOffset } of worms) {
      const frame = Math.floor(now / silkwormFrameMs + frameOffset) % frames.length;
      if (worm.texture === frames[frame]) continue;
      worm.texture = frames[frame];
      changed = true;
    }
    return changed;
  };
}

export function mountTinyLivestockAnimation(parent, textures, { x, y, width, height }, id, visual, readHarvest) {
  const species = livestockSpecies[id];
  const container = new Container();
  container.label = 'tiny-livestock-animation';
  container.eventMode = 'none';
  container.position.set(x, y);
  const clip = new Graphics().roundRect(0, 0, width, height, 10).fill(0xffffff);
  const scene = new Container();
  const factor = Math.max(width, height) / livestockFrameSize;
  scene.scale.set(factor);
  scene.position.set((width - livestockFrameSize * factor) / 2, (height - livestockFrameSize * factor) / 2);
  container.addChild(scene, clip);
  scene.mask = clip;

  addSprite(scene, textures.barn, 'tiny-livestock-facility');
  const frames = textures.stages[0];
  const updateMotion = visual.mode === 'flight'
    ? mountBeeMotion(scene, frames, visual)
    : mountSilkwormMotion(scene, frames, textures.feed, visual, species);

  const position = visual.product;
  const bounds = species.product.bounds;
  const productScale = position.size / Math.max(bounds.width, bounds.height);
  const productWidth = bounds.width * productScale;
  const shadow = new Graphics().ellipse(position.x, position.y - 2, productWidth * 0.4, 3)
    .fill({ color: 0x2b2118, alpha: 0.36 });
  const harvest = new Container();
  harvest.label = 'tiny-livestock-harvest';
  harvest.visible = false;
  scene.addChild(harvest);
  harvest.addChild(shadow);
  const product = addSprite(harvest, textures.product, 'tiny-livestock-product');
  product.scale.set(productScale);
  product.position.set(position.x - (bounds.x + bounds.width / 2) * productScale,
    position.y - (bounds.y + bounds.height) * productScale);

  parent.addChild(container);
  return {
    container,
    update({ now }) {
      const animated = updateMotion(now);
      const completion = readHarvest();
      const duration = completion ? Math.min(harvestMaxMs, completion.duration / 3) : 0;
      const elapsed = completion ? now - completion.at : Infinity;
      const visible = elapsed >= 0 && elapsed < duration;
      const alpha = visible ? Math.min(1, (1 - elapsed / duration) * 3) : 0;
      if (harvest.visible === visible && harvest.alpha === alpha) return animated;
      harvest.visible = visible;
      harvest.alpha = alpha;
      return true;
    },
    destroy() {
      if (container.destroyed) return;
      scene.mask = null;
      clip.destroy();
      container.destroy({ children: true });
    },
  };
}
