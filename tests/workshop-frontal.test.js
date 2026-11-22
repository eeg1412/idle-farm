import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import itemBottoms from '../src/content/workshop-item-bottoms.json' with { type: 'json' };
import { advanceWorld, arrangeStation, catalog, clearStation, newWorld } from '../src/game/world.js';
import {
  syncWorkshopMotion, workshopConveyorPace, workshopDisplayCount, workshopIconIds, workshopInputSchedule,
  workshopMaterialMix, workshopMotionFrame, workshopSceneLayout, workshopTextureSources,
} from '../src/view/workshop-layout.js';

test('front workshop registers a background, distinct bodies and both conveyors through the frame edges', () => {
  const shared = {
    base: ['belt-base', 128, 32], tread: ['tread', 32, 12], gear: ['gear', 64, 64],
    chimney: ['chimney', 40, 52], smoke: ['smoke', 64, 64],
  };
  for (const [id, kind, name] of [['I01', 'I', 'processing'], ['P01', 'P', 'refining']]) {
    const sources = workshopTextureSources(kind);
    const assets = { background: ['background', 400, 144], machine: [name, 136, 108], ...shared };
    assert.deepEqual(sources.map(({ key, path, size }) => [key, path, size]),
      Object.entries(assets).map(([key, [path, width, height]]) =>
        ['workshop:' + key, './art/workshop/front/' + path + '.webp', [width, height]]));
    const layout = workshopSceneLayout(id, kind);
    const [left, right] = layout.surfaceRegions;
    assert.deepEqual(layout.stage, { width: 400, height: 144 });
    const y = kind === 'I' ? 32 : 34;
    assert.deepEqual(layout.machine.placement, { x: 132, y, width: 136, height: 108 });
    assert.deepEqual(layout.gear.position, [200, 98]);
    assert.ok(layout.chimney.mouth[1] < layout.machine.placement.y);
    for (const field of ['base', 'bounds']) {
      assert.equal(left[field].x, 0);
      assert.equal(right[field].x + right[field].width, layout.stage.width);
      assert.ok(left[field].width > layout.machine.placement.x);
      assert.ok(right[field].x < layout.machine.placement.x + layout.machine.placement.width);
    }
    assert.ok(left.bounds.y + left.bounds.height > left.base.y);
    assert.equal(left.bounds.width, layout.itemMasks.input.width);
    assert.equal(right.bounds.x, layout.itemMasks.output.x);
    assert.equal(layout.output.y, layout.inputStream.contactY);
    assert.ok(layout.output.y >= left.bounds.y && layout.output.y < left.bounds.y + left.bounds.height);
    const first = workshopMotionFrame(layout, 0);
    const later = workshopMotionFrame(layout, 100);
    assert.deepEqual(later.surfaceOffsets.map(([x], index) => x - first.surfaceOffsets[index][0])
      .map(Math.round), [6, 6]);
    assert.ok(later.gearAngle > first.gearAngle);
  }
  assert.deepEqual(workshopTextureSources('I', { stage: { width: 400, height: 144 } }), []);
});

test('conveyor pace spreads real counts over the batch down to the minimum spacing', () => {
  const layout = workshopSceneLayout('I01', 'I');
  const speed = layout.surfaceSpeed;
  assert.equal(layout.inputStream.gap, layout.inputStream.size + 7);
  assert.equal(layout.output.gap, layout.output.size * 0.5);
  const { coverX, spawnX, gap: inputGap } = layout.inputStream;
  const travel = (coverX - spawnX) / speed;
  assert.ok(Math.abs(travel - 3140.625) < 1e-6);
  const fewInputs = workshopInputSchedule(4, 60_000, speed, inputGap, travel);
  assert.equal(fewInputs.count, 4);
  assert.ok(Math.abs(fewInputs.interval - 875) < 1e-9);
  assert.equal(workshopInputSchedule(200, 60_000, speed, inputGap, travel).count, 65);
  assert.equal(workshopInputSchedule(4, 2_000, speed, inputGap, travel).count, 0);
  assert.deepEqual(workshopConveyorPace(2, 60_000, speed, layout.output.gap), { count: 2, interval: 30_000 });
  assert.deepEqual(workshopConveyorPace(40, 60_000, speed, layout.output.gap), { count: 40, interval: 1500 });
  assert.equal(workshopDisplayCount('9'.repeat(40)), 1_000_000_000);
  assert.equal(workshopDisplayCount(12n), 12);
  assert.equal(workshopDisplayCount('-3'), 0);
  assert.equal(layout.inputStream.capacity,
    Math.floor((layout.inputStream.coverX - layout.inputStream.spawnX) / layout.inputStream.gap) + 2);
  assert.equal(layout.output.capacity,
    Math.floor((layout.output.endX - layout.output.startX) / layout.output.gap) + 2);
});

test('real batch materials enter front-loaded from outside the left on one baseline without overlapping', () => {
  const id = 'P150';
  const layout = workshopSceneLayout(id, 'P');
  const stream = layout.inputStream;
  const speed = layout.surfaceSpeed;
  const actualInputs = Object.keys(catalog.items[id].inputs);
  assert.deepEqual(workshopIconIds(id), [...actualInputs, id]);
  assert.ok(stream.spawnX <= -stream.size / 2);
  assert.ok(layout.itemMasks.input.width < layout.itemMasks.output.x);

  const exact = [[actualInputs[0], 2], [actualInputs.at(-1), 3]];
  const mix = workshopMaterialMix(exact, id, 0, 5);
  const tally = {};
  for (let slot = 0; slot < 5; slot += 1) tally[mix(slot)] = (tally[mix(slot)] ?? 0) + 1;
  assert.deepEqual(tally, Object.fromEntries(actualInputs[0] === actualInputs.at(-1) ? [[actualInputs[0], 5]] : exact));
  const saturated = workshopMaterialMix(actualInputs.map((material) => [material, 1000]), id, 0, 68);
  assert.deepEqual(new Set(Array.from({ length: 68 }, (_, slot) => saturated(slot))), new Set(actualInputs));

  const travel = (stream.coverX - stream.spawnX) / speed;
  const sparse = { start: 0, end: 60_000, amount: 1, inputs: [[actualInputs[0], 4]] };
  const early = workshopMotionFrame(layout, 1000, { now: 1000, batch: sparse }).inputs;
  assert.equal(early.length, 2);
  assert.ok(early.some(({ position: [x] }) => Math.abs(x - (stream.spawnX + speed * 1000)) < 1e-9));
  const last = workshopMotionFrame(layout, 5765, { now: 5765, batch: sparse }).inputs;
  assert.ok(last.some(({ position: [x] }) => Math.abs(x - (stream.coverX - speed * (travel + 3 * 875 - 5765))) < 1e-6));
  assert.deepEqual(workshopMotionFrame(layout, 10_000, { now: 10_000, batch: sparse }).inputs, []);
  const short = { start: 0, end: 2_000, amount: 1, inputs: [[actualInputs[0], 4]] };
  assert.deepEqual(workshopMotionFrame(layout, 1000, { now: 1000, batch: short }).inputs, []);

  const dense = { start: 0, end: 60_000, amount: 1, inputs: actualInputs.map((material) => [material, 200]) };
  assert.deepEqual(workshopMotionFrame(layout, 59_500, { now: 59_500, batch: dense }).inputs, []);
  for (const now of [100, 30_000, 58_000]) {
    const items = workshopMotionFrame(layout, now, { now, batch: dense }).inputs;
    assert.deepEqual(workshopMotionFrame(layout, now, { now, batch: dense }).inputs, items);
    assert.ok(items.length > 0 && items.length <= stream.capacity);
    const xs = items.map(({ position: [x] }) => x).sort((a, b) => a - b);
    for (const [index, { id: material, position: [x, y] }] of items.entries()) {
      assert.ok(actualInputs.includes(material));
      assert.ok(x > stream.spawnX && x < stream.coverX);
      assert.equal(y, stream.contactY);
      if (index > 0) assert.ok(xs[index] - xs[index - 1] >= stream.gap - 1e-9);
    }
  }
  const before = workshopMotionFrame(layout, 30_000, { now: 30_000, batch: dense }).inputs;
  const after = workshopMotionFrame(layout, 30_100, { now: 30_100, batch: dense }).inputs;
  const lead = (items) => items.reduce((best, item) => item.position[0] > best.position[0] ? item : best);
  assert.equal(lead(before).id, lead(after).id);
  assert.ok(Math.abs(lead(after).position[0] - lead(before).position[0] - speed * 100) < 1e-9);
  assert.deepEqual(workshopMotionFrame(layout, 30_000, { running: false, now: 30_000, batch: dense }).inputs, []);

  const flour = workshopSceneLayout('I01', 'I');
  const flourBatch = { start: 0, end: 60_000, amount: 1, inputs: [['C01', 500]] };
  const flourItems = workshopMotionFrame(flour, 30_000, { now: 30_000, batch: flourBatch }).inputs;
  assert.ok(flourItems.length >= 2);
  assert.ok(flourItems.every(({ id: material }) => material === 'C01'));
});

test('settled products leave evenly over the batch length, each later one over half of the previous', () => {
  const layout = workshopSceneLayout('I01', 'I');
  const { startX, endX, gap, size, capacity } = layout.output;
  const speed = layout.surfaceSpeed;
  const sparse = [{ start: 0, duration: 60_000, amount: 2 }];
  const firstOut = workshopMotionFrame(layout, 0, { now: 1000, outputs: sparse }).outputs;
  assert.equal(firstOut.length, 1);
  assert.ok(Math.abs(firstOut[0].position[0] - (startX + speed * 1000)) < 1e-9);
  assert.deepEqual(workshopMotionFrame(layout, 0, { now: 10_000, outputs: sparse }).outputs, []);
  assert.equal(workshopMotionFrame(layout, 0, { now: 30_000, outputs: sparse }).outputs[0].position[0], startX);

  const dense = [{ start: 0, duration: 60_000, amount: 400 }];
  const items = workshopMotionFrame(layout, 0, { running: false, now: 10_000, outputs: dense }).outputs;
  assert.ok(items.length > 1 && items.length <= capacity);
  for (const [index, { position: [x], alpha }] of items.entries()) {
    assert.equal(alpha, 1);
    assert.ok(x >= startX && x < endX);
    // Older emissions come first (lower pool slot), so each later product is drawn on top.
    if (index > 0) {
      const delta = items[index - 1].position[0] - x;
      assert.ok(delta >= gap - 1e-9 && delta <= size / 2 + 1e-9);
    }
  }
  const handover = [{ start: 0, duration: 1000, amount: 400 }, { start: 600, duration: 1000, amount: 1 }];
  const handed = workshopMotionFrame(layout, 0, { now: 700, outputs: handover }).outputs;
  assert.ok(handed.every(({ position: [x] }, index) => index === 0 || handed[index - 1].position[0] - x >= gap - 1e-9));
});

test('conveyor item anchors follow the solid bottom of the canonical item files', async () => {
  assert.deepEqual(Object.keys(itemBottoms).sort(), Object.keys(catalog.items).sort());
  const icons = ['C01', 'I01', 'P01'];
  await Promise.all(icons.map(async (id) => {
    const filename = new URL(`../public/wiki/icons/${id}.webp`, import.meta.url);
    const { data, info } = await sharp(fileURLToPath(filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const width = info.width * info.channels;
    const bottom = itemBottoms[id] * width;
    const includesSolid = (row) => row.some((value, index) => index % info.channels === 3 && value >= 128);
    assert.ok(includesSolid(data.subarray(bottom - width, bottom)));
    assert.ok(!includesSolid(data.subarray(bottom)));
  }));
});

test('an actually completed final batch can exit on the right while the machine waits for supplies', () => {
  const world = newWorld();
  world.inventory.C01 = BigInt(catalog.items.I01.inputs.C01);
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const station = world.stations.I[0];
  const { start, end, amount, inputs } = station.batch;
  const motion = { id: 'I01' };
  const layout = workshopSceneLayout('I01', 'I');
  function tick(clock) {
    const running = syncWorkshopMotion(motion, station, clock);
    return workshopMotionFrame(layout, motion.clock,
      { running, now: clock, batch: motion.batch, outputs: motion.outputs });
  }
  const running = tick(start + 1000);
  assert.deepEqual(motion.batch.inputs, Object.entries(inputs).map(([material, count]) => [material, Number(count)]));
  assert.equal(motion.batch.amount, Number(amount));
  assert.ok(running.inputs.some(({ visible }) => visible));
  assert.ok(running.smoke.some((particle) => particle?.alpha > 0));
  assert.deepEqual(running.outputs, []);
  const expiredSnapshot = tick(end);
  assert.deepEqual(expiredSnapshot.outputs, []);
  assert.equal(motion.outputs, undefined);

  advanceWorld(world, end);
  assert.ok(world.stats.produced.I01 > 0n);
  assert.equal(station.batch, null);
  const emerging = tick(end);
  assert.deepEqual(motion.outputs, [{ start: end, duration: end - start, amount: Number(amount) }]);
  assert.equal(emerging.outputs[0].position[0] + layout.output.size / 2, layout.itemMasks.output.x);
  const leaving = tick(end + (layout.stage.width - layout.output.startX + 5) / layout.surfaceSpeed);
  assert.ok(leaving.outputs[0].position[0] > layout.stage.width);
  assert.equal(leaving.outputs[0].visible, true);
  assert.equal(leaving.outputs[0].alpha, 1);
  const finished = tick(end + (end - start) + (layout.output.endX - layout.output.startX + 1) / layout.surfaceSpeed);
  assert.deepEqual(finished.outputs, []);
  assert.deepEqual(finished.inputs, []);
  assert.deepEqual(finished.smoke, []);
  assert.deepEqual(finished.surfaceOffsets, emerging.surfaceOffsets);
  assert.deepEqual(finished.machineOffset, emerging.machineOffset);
  assert.equal(finished.gearAngle, emerging.gearAngle);
});

test('a same-time continuation preserves motion phase and a canceled recipe emits no product', () => {
  const world = newWorld();
  world.inventory.C01 = 2n * BigInt(catalog.items.I01.inputs.C01);
  assert.ok(arrangeStation(world, 'I', 0, 'I01'));
  const station = world.stations.I[0];
  const { end } = station.batch;
  const motion = { id: 'I01' };
  assert.ok(syncWorkshopMotion(motion, station, 1200));
  assert.equal(syncWorkshopMotion(motion, station, end + 80), false);
  assert.equal(motion.clock, end);
  assert.equal(motion.outputs, undefined);

  advanceWorld(world, end + 80);
  assert.equal(station.batch.start, end);
  assert.ok(syncWorkshopMotion(motion, station, world.clockMs));
  assert.equal(motion.clock, end + 80);
  assert.deepEqual(motion.outputs.map(({ start }) => start), [end]);
  assert.ok(syncWorkshopMotion(motion, station, world.clockMs));
  assert.equal(motion.clock, end + 80);

  const freshMotion = { id: 'I01' };
  assert.ok(syncWorkshopMotion(freshMotion, station, world.clockMs));
  assert.ok(clearStation(world, 'I', 0));
  assert.equal(syncWorkshopMotion(freshMotion, station, end + 20_000), false);
  assert.equal(freshMotion.outputs, undefined);
});
