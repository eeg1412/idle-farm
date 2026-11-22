import test from 'node:test';
import assert from 'node:assert/strict';
import { Container, Graphics, Texture, TextureSource } from 'pixi.js';
import catalog from '../src/content/game-data.json' with { type: 'json' };
import {
  livestockFrameSize, livestockIdleFrames, livestockSpecies,
  mountLivestockAnimation, sampleLivestockAnimation,
} from '../src/view/livestock-animation.js';
import { livestockLayout } from '../src/view/livestock-layout.js';

const batch = (id, duration, start = 0) => ({ id, start, end: start + duration });
const sample = (value, clock, extra = {}) => sampleLivestockAnimation({ batch: value, clock, now: clock, ...extra });
const shadowBounds = (shadow) => {
  const { minX, minY, maxX, maxY } = shadow.getLocalBounds();
  return [minX, minY, maxX, maxY];
};
const expectedShadowBounds = ({ x, y, radiusX, radiusY }, animal) => [
  animal.x + (x - radiusX) * animal.scale.x, animal.y + (y - radiusY) * animal.scale.y,
  animal.x + (x + radiusX) * animal.scale.x, animal.y + (y + radiusY) * animal.scale.y,
];
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
  const makeTexture = (width, height = width) => new Texture({ source: new TextureSource({ width, height }) });
  const textures = {
    barn: makeTexture(livestockFrameSize),
    stages: Array.from({ length: livestockSpecies[id].stages }, () =>
      Array.from({ length: livestockIdleFrames }, () => makeTexture(livestockFrameSize))),
    product: makeTexture(96),
    feed: makeTexture(...livestockSpecies[id].feedTexture.size),
  };
  const parent = new Container();
  const value = batch(id, 108_000, options.start ?? 0);
  const animation = mountLivestockAnimation(parent, textures, { x: 5, y: 7, width: 130, height: 138 }, value,
    options.previousHarvestAt);
  const scene = animation.container.children[0];
  const group = scene.children[1];
  t.after(() => {
    animation.destroy();
    for (const texture of [textures.barn, textures.feed, ...textures.stages.flat(), textures.product]) texture.destroy(true);
    parent.destroy();
  });
  return {
    textures, parent, value, animation, scene, group,
    shadow: group.children.find((child) => child.label === 'livestock-shadow'),
    productShadow: group.children.find((child) => child.label === 'livestock-product-shadow'),
    animal: group.children.find((child) => child.label === 'livestock-animal'),
    product: group.children.find((child) => child.label === 'livestock-product'),
  };
}

test('every livestock species uses its approved adult or three-stage animation', () => {
  const ids = Object.keys(catalog.items).filter((id) => catalog.items[id].kind === 'L');
  assert.deepEqual(Object.keys(livestockSpecies).sort(), ids.sort());
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

const meatId = Object.keys(livestockSpecies).find((id) => livestockSpecies[id].slaughter);
const attachedId = Object.keys(livestockSpecies).find((id) => !livestockSpecies[id].slaughter);

test('meat animals use full, first/last and last-only tiers of the real batch', () => {
  // N = 3: full at >= 4000 ms, first/last at 3000-3999 ms, last only below 3000 ms.
  const full = batch(meatId, 4000);
  assert.deepEqual([0, 1333, 1334, 2667, 3999].map((clock) => sample(full, clock).stage), [0, 0, 1, 2, 2]);

  const firstLast = batch(meatId, 3999);
  assert.deepEqual([0, 1999, 2000, 3998].map((clock) => sample(firstLast, clock).stage), [0, 0, 2, 2]);
  // The product arrives within the last shown stage, not three seconds early.
  assert.equal(sample(firstLast, 1999).productAlpha, 0);
  assert.equal(sample(firstLast, 2300).productAlpha, 1);
  assert.equal(sample(firstLast, 2300).animalAlpha, 0);

  const lastOnly = batch(meatId, 2999);
  for (const clock of [0, 1500, 2998, 2999 + 100]) {
    const value = sample(lastOnly, clock);
    assert.equal(value.stage, 2);
    assert.equal(value.animalAlpha, 1);
    assert.equal(value.productAlpha, 0);
  }
  // No harvest fade-out flashes on consecutive last-only batches.
  const next = batch(meatId, 2999, lastOnly.end);
  assert.equal(sample(next, next.start + 150, { previousHarvestAt: next.start }).productAlpha, 0);
});

test('attached-product animals alternate their two states from 3 s and otherwise keep the product', () => {
  const twoStates = batch(attachedId, 3000);
  for (const clock of [0, 1499]) {
    assert.equal(sample(twoStates, clock).productAlpha, 0);
    assert.equal(sample(twoStates, clock).stage, 0);
  }
  assert.equal(sample(twoStates, 1800).productAlpha, 1);
  assert.equal(sample(twoStates, 1800).animalAlpha, 1);

  const lastOnly = batch(attachedId, 2999);
  for (const clock of [0, 1500, 2998]) {
    assert.deepEqual(sample(lastOnly, clock, { now: 0 }), { stage: 0, idleFrame: 0, animalAlpha: 1, productAlpha: 1 });
  }
  const next = batch(attachedId, 2999, lastOnly.end);
  assert.equal(sample(next, next.start + 150, { previousHarvestAt: next.start }).productAlpha, 1);
});

test('short real batches start at their own start and are never stretched', () => {
  const original = batch(meatId, 4000);
  const replacement = batch(meatId, 4000, 6000);
  // A stale caller-supplied start is ignored; the replacement starts with stage 0.
  assert.deepEqual(sample(replacement, 6500, { animationStart: original.start }), sample(replacement, 6500));
  assert.equal(sample(replacement, 6500).stage, 0);
  assert.equal(sample(original, 6500).stage, 1);
  // No 9 s floor: the 4 s batch has finished its mature stage by 3999 ms.
  assert.equal(sample(original, 3999).stage, 2);
});

test('idle frames loop independently of production stage and harvest fades', () => {
  const value = batch('L06', 108_000);
  for (let frame = 0; frame < livestockIdleFrames; frame += 1) {
    assert.equal(sample(value, 1000, { now: frame * 300 }).idleFrame, frame);
  }
  assert.equal(sample(value, 1000, { now: livestockIdleFrames * 300 }).idleFrame, 0);
  assert.deepEqual(sample(value, 105_150, { now: 300 }), {
    stage: 2, idleFrame: 1, animalAlpha: 0.5, productAlpha: 0.5,
  });
  assert.deepEqual(sample(value, value.end + 150, { now: 600 }), {
    stage: 0, idleFrame: 2, animalAlpha: 1, productAlpha: 0.5,
  });
});

test('mounted animals start on different idle frames and keep staggered timing after remount', (t) => {
  const idleFrames = ({ scene, textures }) => scene.children.slice(1).map((group) => {
    const animal = group.children.find((child) => child.label === 'livestock-animal');
    return textures.stages[0].indexOf(animal.texture);
  });
  const timeline = [
    [0, [0, 1, 2]], [99, [0, 1, 2]], [100, [0, 1, 3]],
    [199, [0, 1, 3]], [200, [0, 2, 3]], [299, [0, 2, 3]],
    [300, [1, 2, 3]], [1_200, [0, 1, 2]],
  ];
  for (const [id, count] of [['L01', 3], ['L05', 2], ['L06', 1]]) {
    const fixture = mountFixture(t, id);
    assert.deepEqual(idleFrames(fixture), [0, 1, 2].slice(0, count), id);
    for (const [now, frames] of timeline) {
      fixture.animation.update({ clock: 1_000, now });
      assert.deepEqual(idleFrames(fixture), frames.slice(0, count), `${id} at ${now}ms`);
    }
    fixture.animation.update({ clock: 1_000, now: 1_400 });
    const beforeRemount = idleFrames(fixture);
    fixture.animation.destroy();

    const remounted = mountFixture(t, id);
    remounted.animation.update({ clock: 1_000, now: 1_400 });
    assert.deepEqual(idleFrames(remounted), beforeRemount, id);
  }
});

test('mounted animation layers a programmatic shadow beneath the fixed animal frames', (t) => {
  const { animation, scene, group, shadow, productShadow, animal, product, textures } = mountFixture(t);
  assert.equal(animation.container.label, 'livestock-animation');
  assert.equal(animation.container.eventMode, 'none');
  assert.equal(scene.scale.x, 138 / livestockFrameSize);
  assert.deepEqual(scene.children.map((child) => child.label), ['livestock-barn', 'livestock-group-0']);
  assert.deepEqual(group.children.map((child) => child.label), [
    'livestock-shadow', 'livestock-product-shadow', 'livestock-feed-shadow', 'livestock-feed',
    'livestock-animal', 'livestock-product',
  ]);
  assert.ok(shadow instanceof Graphics);
  assert.equal(shadow.eventMode, 'none');
  assert.equal(shadow.context.fillStyle.alpha, 0.45);
  assert.ok(productShadow instanceof Graphics);
  assert.equal(productShadow.eventMode, 'none');
  assert.equal(productShadow.context.fillStyle.alpha, 0.36);
  assert.equal(productShadow.alpha, 0);
  assert.deepEqual(shadowBounds(shadow), expectedShadowBounds(livestockSpecies.L06.grounding[0], animal));
  assert.deepEqual([animal.x, animal.y, animal.scale.x, animal.scale.y, animal.pivot.x, animal.pivot.y],
    [22, 2, 1, 1, 0, 0]);
  assert.equal(product.texture, textures.product);
  assert.equal(product.scale.x, product.scale.y);
  const visible = visibleProductBounds(product, 'L06');
  const matureGrounding = livestockSpecies.L06.grounding.at(-1);
  closeTo(Math.max(visible.width, visible.height), 72);
  closeTo(visible.centerX, 160);
  closeTo(visible.bottom, animal.y + matureGrounding.y);
  for (const texture of [textures.barn, textures.feed, ...textures.stages.flat(), textures.product]) {
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
    animation.update({ clock, now: 0 });
    const geometry = shadow.context.instructions[0];
    for (let frame = 0; frame < livestockIdleFrames; frame += 1) {
      animation.update({ clock, now: frame * 300 });
      assert.equal(animal.texture, textures.stages[stage][frame]);
      assert.equal(shadow.context.instructions[0], geometry);
      assert.equal(productShadow.context.instructions[0], productGeometry);
      assert.deepEqual([product.x, product.y, product.scale.x, product.scale.y], productTransform);
      assert.deepEqual(shadowBounds(shadow), expectedShadowBounds(livestockSpecies.L06.grounding[stage], animal));
      assert.deepEqual([shadow.x, shadow.y, shadow.scale.x, shadow.scale.y], [0, 0, 1, 1]);
      assert.deepEqual([animal.x, animal.y, animal.scale.x, animal.scale.y, animal.pivot.x, animal.pivot.y],
        [22, 2, 1, 1, 0, 0]);
      assert.deepEqual([scene.x, scene.y, scene.scale.x, scene.scale.y], sceneTransform);
    }
  }
});

test('shadow opacity follows the meat animal fade while attached-product animals remain grounded', (t) => {
  for (const id of ['L01', 'L06']) {
    const { animation, shadow, productShadow, animal, product } = mountFixture(t, id);
    const slaughter = livestockSpecies[id].slaughter;
    for (const [clock, fade] of [[105_000, 0], [105_150, 0.5], [105_300, 1], [108_150, 0]]) {
      animation.update({ clock, now: 600 });
      assert.equal(animal.alpha, slaughter ? 1 - fade : 1);
      assert.equal(shadow.alpha, animal.alpha);
      assert.equal(product.alpha, clock === 108_150 ? 0.5 : fade);
      assert.equal(productShadow.alpha, product.alpha);
    }
  }
});

test('the stage footprint changes at harvest while the product footprint stays fixed across idle frames', (t) => {
  for (const id of ['L01', 'L06']) {
    const { animation, shadow, productShadow, animal, product, textures } = mountFixture(t, id);
    const stage = livestockSpecies[id].stages - 1;
    animation.update({ clock: 105_150, now: 900 });
    assert.equal(animal.texture, textures.stages[stage][3]);
    shadowBounds(shadow).forEach((value, index) => closeTo(value,
      expectedShadowBounds(livestockSpecies[id].grounding[stage], animal)[index], id));
    assert.equal(shadow.alpha, livestockSpecies[id].slaughter ? 0.5 : 1);
    assert.equal(productShadow.alpha, 0.5);
    assert.equal(productShadow.alpha, product.alpha);
    const geometry = shadow.context.instructions[0];
    const productGeometry = productShadow.context.instructions[0];
    const productTransform = [product.x, product.y, product.scale.x, product.scale.y];
    animation.update({ clock: 105_150, now: 3_000 });
    assert.equal(animal.texture, textures.stages[stage][2]);
    assert.equal(shadow.context.instructions[0], geometry);
    assert.equal(productShadow.context.instructions[0], productGeometry);
    animation.update({ clock: 108_150, now: 3_000 });
    assert.equal(animal.texture, textures.stages[0][2]);
    shadowBounds(shadow).forEach((value, index) => closeTo(value,
      expectedShadowBounds(livestockSpecies[id].grounding[0], animal)[index], id));
    assert.equal(shadow.alpha, 1);
    assert.equal(productShadow.alpha, 0.5);
    assert.equal(productShadow.context.instructions[0], productGeometry);
    assert.deepEqual([product.x, product.y, product.scale.x, product.scale.y], productTransform);
  }
});

test('mounted animation swaps real frame textures and destroys graphics without shared textures', (t) => {
  const { animation, parent, textures, shadow, productShadow, animal, product } = mountFixture(t);

  animation.update({ clock: 36_000, now: 300 });
  assert.equal(animal.texture, textures.stages[1][1]);
  animation.update({ clock: 105_150, now: 600 });
  assert.equal(animal.texture, textures.stages[2][2]);
  assert.equal(animal.alpha, 0.5);
  assert.equal(product.alpha, 0.5);
  animation.update({ clock: 105_150, now: 1200 });
  assert.equal(animal.texture, textures.stages[2][0]);

  animation.destroy();
  animation.destroy();
  assert.equal(parent.children.length, 0);
  assert.equal(animation.container.destroyed, true);
  assert.equal(shadow.destroyed, true);
  assert.equal(productShadow.destroyed, true);
  for (const texture of [textures.barn, textures.feed, ...textures.stages.flat(), textures.product]) {
    assert.equal(texture.destroyed, false);
  }
});

test('all canonical products sit on their own shallow ground shadows using visible content bounds', (t) => {
  for (const [id, species] of Object.entries(livestockSpecies)) {
    const { animation, animal, product, productShadow, scene } = mountFixture(t, id);
    animation.update({ clock: 105_300, now: 600 });
    const visible = visibleProductBounds(product, id);
    const matureGrounding = species.grounding.at(-1);
    const [left, top, right, bottom] = shadowBounds(productShadow);
    const { productSize, placements } = livestockLayout(id);
    assert.equal(scene.children.length, 1 + placements.length, id);
    const { depth, x } = placements[0];
    closeTo(Math.max(visible.width, visible.height), productSize * depth, id);
    closeTo(visible.bottom, animal.y + matureGrounding.y * animal.scale.y + (species.slaughter ? 0 : 3 * depth), id);
    closeTo((left + right) / 2, visible.centerX, id);
    closeTo((top + bottom) / 2, visible.bottom - visible.height * 0.035, id);
    assert.ok(right > left && bottom > top && bottom - top <= 14 + 1e-9, id);
    assert.equal(productShadow.alpha, product.alpha, id);
    if (species.slaughter) closeTo(visible.centerX, x, id);
    else {
      const feed = species.feeding.at(-1);
      const stance = animal.x + matureGrounding.x * animal.scale.x;
      assert.equal(Math.sign(visible.centerX - stance), -(Math.sign(feed.x - 138) || 1), id);
      assert.ok(visible.centerX - visible.width / 2 >= 16 - 1e-9, id);
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
      original.animation.update({ clock, now: clock });
      const visible = visibleProductBounds(original.product, id);
      closeTo(visible.centerX, livestockLayout(id).placements[0].x, id);
      closeTo(visible.bottom, original.animal.y + matureGrounding.y * original.animal.scale.y, id);
      assert.equal(original.productShadow.context.instructions[0], productGeometry, id);
      if (clock >= 108_000) {
        replacement.animation.update({ clock, now: clock });
        assert.deepEqual(visibleProductBounds(replacement.product, id), visible, id);
        assert.equal(replacement.product.alpha, original.product.alpha, id);
        assert.equal(replacement.productShadow.alpha, original.productShadow.alpha, id);
      }
    }
  }
});
