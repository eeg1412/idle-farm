import { Container, Graphics, Sprite } from 'pixi.js';
import livestockVisuals from '../content/livestock-visuals.json' with { type: 'json' };
import { livestockLayout } from './livestock-layout.js';

export const livestockFrameSize = 320;
export const livestockIdleFrames = 4;
export const minLivestockAnimationMs = 9000;
export const livestockSpecies = livestockVisuals;

const idleFrameMs = 300;
const harvestLeadMs = 3000;
const transitionMs = 300;
const animalRoot = { x: 138, y: 270 };

function smoothstep(progress) {
  const bounded = Math.max(0, Math.min(1, progress));
  return bounded * bounded * (3 - 2 * bounded);
}

export function sampleLivestockAnimation({
  batch, animationStart = batch.start, clock, now = clock, previousHarvestAt,
}) {
  const species = livestockSpecies[batch.id];
  const duration = Math.max(batch.end - batch.start, minLivestockAnimationMs);
  const elapsed = Math.max(0, clock - animationStart);
  const cycle = Math.floor(elapsed / duration);
  const phase = elapsed % duration;
  const harvestProgress = phase - (duration - harvestLeadMs);
  const productAppeared = smoothstep(harvestProgress / transitionMs);
  const predictedHarvestAt = cycle > 0 ? animationStart + cycle * duration : -Infinity;
  const lastHarvestAt = Math.max(previousHarvestAt ?? -Infinity, predictedHarvestAt);
  const sinceHarvest = clock - lastHarvestAt;
  let productAlpha = productAppeared;
  if (sinceHarvest >= 0 && sinceHarvest < transitionMs) {
    productAlpha = 1 - smoothstep(sinceHarvest / transitionMs);
  }

  return {
    stage: Math.floor(phase * species.stages / duration),
    idleFrame: Math.floor(Math.max(0, now) / idleFrameMs) % livestockIdleFrames,
    animalAlpha: species.slaughter ? 1 - productAppeared : 1,
    productAlpha,
  };
}

export function mountLivestockAnimation(
  parent, textures, { x, y, width, height }, batch, animationStart = batch.start, previousHarvestAt,
) {
  const species = livestockSpecies[batch.id];
  const container = new Container();
  container.label = 'livestock-animation';
  container.eventMode = 'none';
  container.position.set(x, y);
  const clip = new Graphics().roundRect(0, 0, width, height, 10).fill(0xffffff);
  const scene = new Container();
  const factor = Math.max(width, height) / livestockFrameSize;
  scene.scale.set(factor);
  scene.position.set((width - livestockFrameSize * factor) / 2, (height - livestockFrameSize * factor) / 2);
  container.addChild(scene, clip);
  scene.mask = clip;

  for (const texture of [textures.barn, ...textures.stages.flat(), textures.product]) {
    texture.source.scaleMode = 'nearest';
  }
  const addSprite = (parent, texture, label) => {
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.label = label;
    sprite.eventMode = 'none';
    parent.addChild(sprite);
    return sprite;
  };
  addSprite(scene, textures.barn, 'livestock-barn');
  const layout = livestockLayout(batch.id);
  const bounds = species.product.bounds;
  const matureGrounding = species.grounding[species.stages - 1];
  const animals = layout.placements.map((placement, index) => {
    const group = new Container();
    group.label = 'livestock-group-' + index;
    group.eventMode = 'none';
    scene.addChild(group);
    const animalScale = layout.animalScale * placement.depth;
    const left = placement.x - animalRoot.x * animalScale;
    const top = placement.y - animalRoot.y * animalScale;
    const shadow = new Graphics();
    shadow.label = 'livestock-shadow';
    shadow.eventMode = 'none';
    group.addChild(shadow);
    const animal = addSprite(group, textures.stages[0][0], 'livestock-animal');
    animal.scale.set(animalScale);
    animal.position.set(left, top);

    const productScale = layout.productSize * placement.depth / Math.max(bounds.width, bounds.height);
    const productWidth = bounds.width * productScale;
    const productHeight = bounds.height * productScale;
    const productGround = {
      // Meat is centered on each animal's registered stance, rather than the
      // asymmetric hoof span. A single large animal and its meat use x=160.
      x: species.slaughter ? placement.x : Math.min(
        livestockFrameSize - 16 - productWidth / 2,
        left + (matureGrounding.x + matureGrounding.radiusX) * animalScale +
          8 * placement.depth + productWidth / 2,
      ),
      y: top + matureGrounding.y * animalScale + (species.slaughter ? 0 : 3 * placement.depth),
    };
    const productShadow = new Graphics();
    productShadow.label = 'livestock-product-shadow';
    productShadow.eventMode = 'none';
    // Let the lower body overlap its own ground shadow, keeping the ellipse
    // centered under the visible product instead of below its transparent pad.
    productShadow.ellipse(productGround.x, productGround.y - productHeight * 0.035,
      productWidth * 0.41, Math.max(2, Math.min(6, productWidth * 0.085)))
      .fill({ color: 0x2b2118, alpha: 0.36 });
    productShadow.alpha = 0;
    group.addChildAt(productShadow, 1);
    const product = addSprite(group, textures.product, 'livestock-product');
    product.scale.set(productScale);
    product.position.set(
      productGround.x - (bounds.x + bounds.width / 2) * productScale,
      productGround.y - (bounds.y + bounds.height) * productScale,
    );
    product.alpha = 0;
    return { animal, shadow, product, productShadow, animalScale, left, top };
  });

  let shadowStage;
  const updateShadow = (stage) => {
    if (shadowStage === stage) return;
    const grounding = species.grounding[stage];
    for (const { shadow, animalScale, left, top } of animals) {
      shadow.clear()
        .ellipse(left + grounding.x * animalScale, top + grounding.y * animalScale,
          grounding.radiusX * animalScale, grounding.radiusY * animalScale)
        .fill({ color: 0x2b2118, alpha: 0.45 });
    }
    shadowStage = stage;
  };
  updateShadow(0);
  parent.addChild(container);

  return {
    container,
    update({ clock, now }) {
      const sample = sampleLivestockAnimation({ batch, animationStart, clock, now, previousHarvestAt });
      const texture = textures.stages[sample.stage][sample.idleFrame];
      updateShadow(sample.stage);
      for (const { animal, shadow, product, productShadow } of animals) {
        if (animal.texture !== texture) animal.texture = texture;
        animal.alpha = sample.animalAlpha;
        shadow.alpha = sample.animalAlpha;
        product.alpha = sample.productAlpha;
        productShadow.alpha = sample.productAlpha;
      }
    },
    destroy() {
      if (container.destroyed) return;
      scene.mask = null;
      clip.destroy();
      container.destroy({ children: true });
    },
  };
}
