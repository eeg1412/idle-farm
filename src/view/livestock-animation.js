import { Container, Graphics, Sprite } from 'pixi.js';
import livestockVisuals from '../content/livestock-visuals.json' with { type: 'json' };

export const livestockFrameSize = 320;
export const livestockIdleFrames = 4;
export const minLivestockAnimationMs = 9000;
export const livestockSpecies = livestockVisuals;

const idleFrameMs = 300;
const harvestLeadMs = 3000;
const transitionMs = 300;
const productVisibleSize = 72;

function smoothstep(progress) {
  const bounded = Math.max(0, Math.min(1, progress));
  return bounded * bounded * (3 - 2 * bounded);
}

export function sampleLivestockAnimation({
  batch, animationStart = batch.start, clock, now = clock, reducedMotion = false, previousHarvestAt,
}) {
  const species = livestockSpecies[batch.id];
  const duration = Math.max(batch.end - batch.start, minLivestockAnimationMs);
  const elapsed = Math.max(0, clock - animationStart);
  const cycle = Math.floor(elapsed / duration);
  const phase = elapsed % duration;
  const harvestProgress = phase - (duration - harvestLeadMs);
  const productAppeared = reducedMotion ? Number(harvestProgress >= 0) : smoothstep(harvestProgress / transitionMs);
  const predictedHarvestAt = cycle > 0 ? animationStart + cycle * duration : -Infinity;
  const lastHarvestAt = Math.max(previousHarvestAt ?? -Infinity, predictedHarvestAt);
  const sinceHarvest = clock - lastHarvestAt;
  let productAlpha = productAppeared;
  if (sinceHarvest >= 0 && sinceHarvest < transitionMs) {
    productAlpha = reducedMotion ? 0 : 1 - smoothstep(sinceHarvest / transitionMs);
  }

  return {
    stage: Math.floor(phase * species.stages / duration),
    idleFrame: reducedMotion ? 0 : Math.floor(Math.max(0, now) / idleFrameMs) % livestockIdleFrames,
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
  const addSprite = (texture, label) => {
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.label = label;
    sprite.eventMode = 'none';
    scene.addChild(sprite);
    return sprite;
  };
  addSprite(textures.barn, 'livestock-barn');
  const shadow = new Graphics();
  shadow.label = 'livestock-shadow';
  shadow.eventMode = 'none';
  scene.addChild(shadow);
  let shadowStage;
  const updateShadow = (stage) => {
    if (shadowStage === stage) return;
    const grounding = species.grounding[stage];
    shadow.clear()
      .ellipse(grounding.x, grounding.y, grounding.radiusX, grounding.radiusY)
      .fill({ color: 0x2b2118, alpha: 0.45 });
    shadowStage = stage;
  };
  updateShadow(0);

  const bounds = species.product.bounds;
  const productScale = productVisibleSize / Math.max(bounds.width, bounds.height);
  const productWidth = bounds.width * productScale;
  const matureGrounding = species.grounding[species.stages - 1];
  // Pin products to the mature ground even while the next animal cycle begins.
  const productGround = {
    x: species.slaughter ? matureGrounding.x : Math.min(
      livestockFrameSize - 16 - productWidth / 2,
      matureGrounding.x + matureGrounding.radiusX + 12 + productWidth / 2,
    ),
    y: matureGrounding.y,
  };
  const productShadow = new Graphics();
  productShadow.label = 'livestock-product-shadow';
  productShadow.eventMode = 'none';
  productShadow.ellipse(productGround.x, productGround.y,
    productWidth * 0.44, Math.max(3, Math.min(7, productWidth * 0.1)))
    .fill({ color: 0x2b2118, alpha: 0.36 });
  productShadow.alpha = 0;
  scene.addChild(productShadow);

  // Animal frames already share the scene coordinates and fixed ground baseline.
  const animal = addSprite(textures.stages[0][0], 'livestock-animal');
  const product = addSprite(textures.product, 'livestock-product');
  product.scale.set(productScale);
  product.position.set(
    productGround.x - (bounds.x + bounds.width / 2) * productScale,
    productGround.y - (bounds.y + bounds.height) * productScale,
  );
  product.alpha = 0;
  parent.addChild(container);

  return {
    container,
    update({ clock, now, reducedMotion }) {
      const sample = sampleLivestockAnimation({ batch, animationStart, clock, now, reducedMotion, previousHarvestAt });
      const texture = textures.stages[sample.stage][sample.idleFrame];
      if (animal.texture !== texture) animal.texture = texture;
      updateShadow(sample.stage);
      animal.alpha = sample.animalAlpha;
      shadow.alpha = sample.animalAlpha;
      product.alpha = sample.productAlpha;
      productShadow.alpha = sample.productAlpha;
    },
    destroy() {
      if (container.destroyed) return;
      scene.mask = null;
      clip.destroy();
      container.destroy({ children: true });
    },
  };
}
