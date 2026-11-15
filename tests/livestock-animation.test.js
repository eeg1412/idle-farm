import test from 'node:test';
import assert from 'node:assert/strict';
import { Container, Graphics, Texture, TextureSource } from 'pixi.js';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import {
  livestockFrameSize, livestockIdleFrames, livestockSpecies, minLivestockAnimationMs,
  mountLivestockAnimation, sampleLivestockAnimation,
} from '../src/view/livestock-animation.js';

const batch = (id, duration, start = 0) => ({ id, start, end: start + duration });
const sample = (value, clock, extra = {}) => sampleLivestockAnimation({ batch: value, clock, now: clock, ...extra });
const shadowBounds = (shadow) => {
  const { minX, minY, maxX, maxY } = shadow.getLocalBounds();
  return [minX, minY, maxX, maxY];
};
const expectedShadowBounds = ({ x, y, radiusX, radiusY }) =>
  [x - radiusX, y - radiusY, x + radiusX, y + radiusY];
const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message);
const visibleProductBounds = (product, id) => {
  const bounds = livestockSpecies[id].product.bounds;
  return {
    centerX: product.x + (bounds.x + bounds.width / 2) * product.scale.x,
    bottom: product.y + (bounds.y + bounds.height) * product.scale.y,
    width: bounds.width * product.scale.x,
    height: bounds.height * product.scale.y,
  };
};

function mountFixture(t, id = 'L06', options = {}) {
  const makeTexture = (size) => new Texture({ source: new TextureSource({ width: size, height: size }) });
  const textures = {
    barn: makeTexture(livestockFrameSize),
    stages: Array.from({ length: livestockSpecies[id].stages }, () =>
      Array.from({ length: livestockIdleFrames }, () => makeTexture(livestockFrameSize))),
    product: makeTexture(96),
  };
  const parent = new Container();
  const value = batch(id, 108_000, options.start ?? 0);
  const animation = mountLivestockAnimation(parent, textures, { x: 5, y: 7, width: 130, height: 138 }, value,
    options.animationStart ?? value.start, options.previousHarvestAt);
  const scene = animation.container.children[0];
  t.after(() => {
    animation.destroy();
    for (const texture of [textures.barn, ...textures.stages.flat(), textures.product]) texture.destroy(true);
    parent.destroy();
  });
  return {
    textures, parent, value, animation, scene,
    shadow: scene.children.find((child) => child.label === 'livestock-shadow'),
    productShadow: scene.children.find((child) => child.label === 'livestock-product-shadow'),
    animal: scene.children.find((child) => child.label === 'livestock-animal'),
    product: scene.children.find((child) => child.label === 'livestock-product'),
  };
}

test('every livestock species uses its approved adult or three-stage animation', () => {
  const ids = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'L');
  assert.deepEqual(Object.keys(livestockSpecies).sort(), ids.sort());
  assert.equal(minLivestockAnimationMs, 9000);
  for (const id of ids) {
    const { stages, slaughter, grounding, product } = livestockSpecies[id];
    assert.equal(typeof slaughter, 'boolean', id);
    assert.equal(stages, slaughter ? 3 : 1, id);
    assert.ok(Array.isArray(grounding), id);
    assert.equal(grounding.length, stages, id);
    for (const footprint of grounding) {
      assert.ok(Number.isFinite(footprint.x) && footprint.x >= 0 && footprint.x <= livestockFrameSize, id);
      assert.ok(Number.isFinite(footprint.y) && footprint.y >= 0 && footprint.y <= livestockFrameSize, id);
      assert.ok(Number.isFinite(footprint.radiusX) && footprint.radiusX > 0, id);
      assert.ok(Number.isFinite(footprint.radiusY) && footprint.radiusY > 0, id);
    }
    assert.equal(product.icon, id);
    const { x, y, width, height } = product.bounds;
    assert.ok(Number.isFinite(x) && x >= 0, id);
    assert.ok(Number.isFinite(y) && y >= 0, id);
    assert.ok(Number.isFinite(width) && width > 0 && x + width <= 96, id);
    assert.ok(Number.isFinite(height) && height > 0 && y + height <= 96, id);
    const duration = catalog.items[id].durationMs;
    const value = batch(id, duration);
    if (!slaughter) {
      for (const clock of [0, duration / 3, duration * 2 / 3, duration - 1]) {
        assert.equal(sample(value, clock).stage, 0, id);
        assert.equal(sample(value, clock).animalAlpha, 1, id);
      }
    } else {
      const firstTransition = Math.ceil(duration / 3);
      const secondTransition = Math.ceil(duration * 2 / 3);
      assert.equal(sample(value, firstTransition - 1).stage, 0, id);
      assert.equal(sample(value, firstTransition).stage, 1, id);
      assert.equal(sample(value, secondTransition).stage, 2, id);
    }
  }
});

test('the final three seconds reveal products while only the meat animal fades away', () => {
  for (const [id, { slaughter }] of Object.entries(livestockSpecies)) {
    const duration = catalog.items[id].durationMs;
    const value = batch(id, duration);
    assert.equal(sample(value, duration - 3001).productAlpha, 0);
    const halfway = sample(value, duration - 2850);
    assert.equal(halfway.productAlpha, 0.5);
    assert.equal(halfway.animalAlpha, slaughter ? 0.5 : 1);
    const ready = sample(value, duration - 2700);
    assert.equal(ready.productAlpha, 1);
    assert.equal(ready.animalAlpha, slaughter ? 0 : 1);
  }
});

test('predicted harvest boundaries and a replacement batch preserve the same product fade', () => {
  const oldBatch = batch('L06', 108_000);
  const newBatch = batch('L06', 108_000, oldBatch.end);
  assert.equal(sample(oldBatch, 0).productAlpha, 0);
  assert.equal(sample(newBatch, newBatch.start).productAlpha, 0);
  for (const age of [0, 150, 300]) {
    const predicted = sample(oldBatch, oldBatch.end + age);
    const replaced = sample(newBatch, newBatch.start + age, { previousHarvestAt: oldBatch.end });
    assert.equal(predicted.productAlpha, replaced.productAlpha);
    assert.equal(predicted.animalAlpha, 1);
  }
  assert.equal(sample(oldBatch, oldBatch.end).productAlpha, 1);
  assert.equal(sample(oldBatch, oldBatch.end + 150).productAlpha, 0.5);
  assert.equal(sample(oldBatch, oldBatch.end + 300).productAlpha, 0);
});

test('short real batches share a continuous minimum display cycle', () => {
  const realDuration = Math.floor(minLivestockAnimationMs / 5);
  const original = batch('L06', realDuration);
  const replacement = batch('L06', realDuration, realDuration * 2);
  const clock = realDuration * 2 + Math.floor(realDuration / 2);
  assert.deepEqual(sample(original, clock), sample(replacement, clock, { animationStart: original.start }));
  assert.equal(sample(original, minLivestockAnimationMs).stage, 0);
});

test('idle frames loop independently and reduced motion uses fixed poses with immediate transitions', () => {
  const value = batch('L06', 108_000);
  for (let frame = 0; frame < livestockIdleFrames; frame += 1) {
    assert.equal(sample(value, 1000, { now: frame * 300 }).idleFrame, frame);
  }
  assert.equal(sample(value, 1000, { now: livestockIdleFrames * 300 }).idleFrame, 0);
  assert.deepEqual(sample(value, 105_150, { reducedMotion: true }), {
    stage: 2, idleFrame: 0, animalAlpha: 0, productAlpha: 1,
  });
  assert.equal(sample(value, value.end + 150, { reducedMotion: true }).productAlpha, 0);
});

test('mounted animation layers a programmatic shadow beneath the fixed animal frames', (t) => {
  const { animation, scene, shadow, productShadow, animal, product, textures } = mountFixture(t);
  assert.equal(animation.container.label, 'livestock-animation');
  assert.equal(animation.container.eventMode, 'none');
  assert.equal(scene.scale.x, 138 / livestockFrameSize);
  assert.deepEqual(scene.children.map((child) => child.label), [
    'livestock-barn', 'livestock-shadow', 'livestock-product-shadow', 'livestock-animal', 'livestock-product',
  ]);
  assert.ok(shadow instanceof Graphics);
  assert.equal(shadow.eventMode, 'none');
  assert.equal(shadow.context.fillStyle.alpha, 0.45);
  assert.ok(productShadow instanceof Graphics);
  assert.equal(productShadow.eventMode, 'none');
  assert.equal(productShadow.context.fillStyle.alpha, 0.36);
  assert.equal(productShadow.alpha, 0);
  assert.deepEqual(shadowBounds(shadow), expectedShadowBounds(livestockSpecies.L06.grounding[0]));
  assert.deepEqual([animal.x, animal.y, animal.scale.x, animal.scale.y, animal.pivot.x, animal.pivot.y],
    [0, 0, 1, 1, 0, 0]);
  assert.equal(product.texture, textures.product);
  assert.equal(product.scale.x, product.scale.y);
  const visible = visibleProductBounds(product, 'L06');
  const matureGrounding = livestockSpecies.L06.grounding.at(-1);
  closeTo(Math.max(visible.width, visible.height), 72);
  closeTo(visible.centerX, matureGrounding.x);
  closeTo(visible.bottom, matureGrounding.y);
  for (const texture of [textures.barn, ...textures.stages.flat(), textures.product]) {
    assert.equal(texture.source.scaleMode, 'nearest');
  }
});

test('stage footprints stay fixed throughout every idle frame without moving the animal or scene', (t) => {
  const { animation, scene, shadow, productShadow, animal, product, textures } = mountFixture(t);
  const sceneTransform = [scene.x, scene.y, scene.scale.x, scene.scale.y];
  const productTransform = [product.x, product.y, product.scale.x, product.scale.y];
  const productGeometry = productShadow.context.instructions[0];
  for (let stage = 0; stage < livestockSpecies.L06.stages; stage += 1) {
    const clock = stage * 36_000;
    animation.update({ clock, now: 0, reducedMotion: false });
    const geometry = shadow.context.instructions[0];
    for (let frame = 0; frame < livestockIdleFrames; frame += 1) {
      animation.update({ clock, now: frame * 300, reducedMotion: false });
      assert.equal(animal.texture, textures.stages[stage][frame]);
      assert.equal(shadow.context.instructions[0], geometry);
      assert.equal(productShadow.context.instructions[0], productGeometry);
      assert.deepEqual([product.x, product.y, product.scale.x, product.scale.y], productTransform);
      assert.deepEqual(shadowBounds(shadow), expectedShadowBounds(livestockSpecies.L06.grounding[stage]));
      assert.deepEqual([shadow.x, shadow.y, shadow.scale.x, shadow.scale.y], [0, 0, 1, 1]);
      assert.deepEqual([animal.x, animal.y, animal.scale.x, animal.scale.y, animal.pivot.x, animal.pivot.y],
        [0, 0, 1, 1, 0, 0]);
      assert.deepEqual([scene.x, scene.y, scene.scale.x, scene.scale.y], sceneTransform);
    }
  }
});

test('shadow opacity follows the meat animal fade while attached-product animals remain grounded', (t) => {
  for (const id of ['L01', 'L06']) {
    const { animation, shadow, productShadow, animal, product } = mountFixture(t, id);
    const slaughter = livestockSpecies[id].slaughter;
    for (const [clock, fade] of [[105_000, 0], [105_150, 0.5], [105_300, 1], [108_150, 0]]) {
      animation.update({ clock, now: 600, reducedMotion: false });
      assert.equal(animal.alpha, slaughter ? 1 - fade : 1);
      assert.equal(shadow.alpha, animal.alpha);
      assert.equal(product.alpha, clock === 108_150 ? 0.5 : fade);
      assert.equal(productShadow.alpha, product.alpha);
    }
  }
});

test('reduced motion keeps the correct stage footprint with static poses and immediate fades', (t) => {
  for (const id of ['L01', 'L06']) {
    const { animation, shadow, productShadow, animal, product, textures } = mountFixture(t, id);
    const stage = livestockSpecies[id].stages - 1;
    animation.update({ clock: 105_150, now: 900, reducedMotion: true });
    assert.equal(animal.texture, textures.stages[stage][0]);
    assert.deepEqual(shadowBounds(shadow), expectedShadowBounds(livestockSpecies[id].grounding[stage]));
    assert.equal(shadow.alpha, livestockSpecies[id].slaughter ? 0 : 1);
    assert.equal(productShadow.alpha, 1);
    assert.equal(productShadow.alpha, product.alpha);
    const geometry = shadow.context.instructions[0];
    const productGeometry = productShadow.context.instructions[0];
    const productTransform = [product.x, product.y, product.scale.x, product.scale.y];
    animation.update({ clock: 105_150, now: 3_000, reducedMotion: true });
    assert.equal(animal.texture, textures.stages[stage][0]);
    assert.equal(shadow.context.instructions[0], geometry);
    assert.equal(productShadow.context.instructions[0], productGeometry);
    animation.update({ clock: 108_150, now: 3_000, reducedMotion: true });
    assert.equal(animal.texture, textures.stages[0][0]);
    assert.deepEqual(shadowBounds(shadow), expectedShadowBounds(livestockSpecies[id].grounding[0]));
    assert.equal(shadow.alpha, 1);
    assert.equal(productShadow.alpha, 0);
    assert.equal(productShadow.context.instructions[0], productGeometry);
    assert.deepEqual([product.x, product.y, product.scale.x, product.scale.y], productTransform);
  }
});

test('mounted animation swaps real frame textures and destroys graphics without shared textures', (t) => {
  const { animation, parent, textures, shadow, productShadow, animal, product } = mountFixture(t);

  animation.update({ clock: 36_000, now: 300, reducedMotion: false });
  assert.equal(animal.texture, textures.stages[1][1]);
  animation.update({ clock: 105_150, now: 600, reducedMotion: false });
  assert.equal(animal.texture, textures.stages[2][2]);
  assert.equal(animal.alpha, 0.5);
  assert.equal(product.alpha, 0.5);
  animation.update({ clock: 105_150, now: 900, reducedMotion: true });
  assert.equal(animal.texture, textures.stages[2][0]);

  animation.destroy();
  animation.destroy();
  assert.equal(parent.children.length, 0);
  assert.equal(animation.container.destroyed, true);
  assert.equal(shadow.destroyed, true);
  assert.equal(productShadow.destroyed, true);
  for (const texture of [textures.barn, ...textures.stages.flat(), textures.product]) {
    assert.equal(texture.destroyed, false);
  }
});

test('all canonical products sit on their own shallow ground shadows using visible content bounds', (t) => {
  for (const [id, species] of Object.entries(livestockSpecies)) {
    const { animation, product, productShadow } = mountFixture(t, id);
    animation.update({ clock: 105_300, now: 600, reducedMotion: false });
    const visible = visibleProductBounds(product, id);
    const matureGrounding = species.grounding.at(-1);
    const [left, top, right, bottom] = shadowBounds(productShadow);
    closeTo(Math.max(visible.width, visible.height), 72, id);
    closeTo(visible.bottom, matureGrounding.y, id);
    closeTo((left + right) / 2, visible.centerX, id);
    closeTo((top + bottom) / 2, visible.bottom, id);
    assert.ok(right > left && bottom > top && bottom - top <= 14 + 1e-9, id);
    assert.equal(productShadow.alpha, product.alpha, id);
    if (species.slaughter) closeTo(visible.centerX, matureGrounding.x, id);
    else {
      assert.ok(visible.centerX > matureGrounding.x, id);
      assert.ok(visible.centerX + visible.width / 2 <= livestockFrameSize - 16 + 1e-9, id);
    }
  }
});

test('meat products remain at mature feet through harvest and replacement batch fades', (t) => {
  for (const [id, species] of Object.entries(livestockSpecies)) {
    if (!species.slaughter) continue;
    const original = mountFixture(t, id);
    const replacement = mountFixture(t, id, { start: 108_000, previousHarvestAt: 108_000 });
    const matureGrounding = species.grounding.at(-1);
    const productGeometry = original.productShadow.context.instructions[0];
    for (const clock of [105_150, 107_999, 108_000, 108_150, 108_300]) {
      original.animation.update({ clock, now: clock, reducedMotion: false });
      const visible = visibleProductBounds(original.product, id);
      closeTo(visible.centerX, matureGrounding.x, id);
      closeTo(visible.bottom, matureGrounding.y, id);
      assert.equal(original.productShadow.context.instructions[0], productGeometry, id);
      if (clock >= 108_000) {
        replacement.animation.update({ clock, now: clock, reducedMotion: false });
        assert.deepEqual(visibleProductBounds(replacement.product, id), visible, id);
        assert.equal(replacement.product.alpha, original.product.alpha, id);
        assert.equal(replacement.productShadow.alpha, original.productShadow.alpha, id);
      }
    }
  }
});
