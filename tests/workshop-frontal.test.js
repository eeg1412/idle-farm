import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import itemBottoms from '../src/content/workshop-item-bottoms.json' with { type: 'json' };
import { advanceWorld, arrangeStation, catalog, clearStation, newWorld } from '../src/game/world.js';
import {
  syncWorkshopMotion, workshopIconIds, workshopInputEvent, workshopMotionFrame, workshopSceneLayout,
  workshopTextureSources,
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

test('real recipe icons arrive side by side on the same belt baseline from wholly outside the left', () => {
  const id = 'P150';
  const layout = workshopSceneLayout(id, 'P');
  const stream = layout.inputStream;
  const actualInputs = Object.keys(catalog.items[id].inputs);
  assert.deepEqual(workshopIconIds(id), [...actualInputs, id]);
  const events = Array.from({ length: 40 }, (_, serial) => workshopInputEvent(stream, serial));
  assert.deepEqual(new Set(events.slice(0, actualInputs.length).map(([first]) => first.id)), new Set(actualInputs));
  for (const [serial, event] of events.entries()) {
    assert.deepEqual(workshopInputEvent(stream, serial), event);
    assert.ok(event.length >= 2 && event.length <= 3);
    for (const [index, packet] of event.entries()) {
      assert.ok(actualInputs.includes(packet.id));
      assert.ok(packet.origin[0] <= -stream.size / 2);
      assert.equal(packet.origin[1], stream.contactY);
      if (index > 0) {
        const deltaX = event[index - 1].origin[0] - packet.origin[0];
        assert.equal(deltaX, stream.packetSpacing);
        assert.ok(deltaX > 0 && deltaX < stream.size);
      }
    }
  }
  const first = workshopMotionFrame(layout, 0).inputs[0];
  const later = workshopMotionFrame(layout, 300).inputs[0];
  assert.equal(first.id, later.id);
  assert.equal(first.position[1], later.position[1]);
  assert.ok(first.position[0] < later.position[0]);
  assert.ok(layout.itemMasks.input.width < layout.itemMasks.output.x);

  const flour = workshopSceneLayout('I01', 'I').inputStream;
  const singleMaterialGroup = workshopInputEvent(flour, 0);
  assert.ok(singleMaterialGroup.length >= 2);
  assert.ok(singleMaterialGroup.every(({ id: material }) => material === 'C01'));
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
  const { end } = station.batch;
  const motion = { id: 'I01' };
  const layout = workshopSceneLayout('I01', 'I');
  function tick(clock) {
    const running = syncWorkshopMotion(motion, station, clock);
    const outputElapsed = motion.outputStart === undefined ? undefined : clock - motion.outputStart;
    return workshopMotionFrame(layout, motion.clock, { running, outputElapsed });
  }
  const running = tick(1100);
  assert.ok(running.inputs.some(({ visible }) => visible));
  assert.ok(running.smoke.some((particle) => particle?.alpha > 0));
  assert.equal(running.output.visible, false);
  const expiredSnapshot = tick(end);
  assert.equal(expiredSnapshot.output.visible, false);
  assert.equal(motion.outputStart, undefined);

  advanceWorld(world, end);
  assert.ok(world.stats.produced.I01 > 0n);
  assert.equal(station.batch, null);
  const emerging = tick(end);
  assert.equal(emerging.output.position[0] + layout.output.size / 2, layout.itemMasks.output.x);
  const leaving = tick(end + (layout.stage.width - layout.output.startX + 5) / layout.surfaceSpeed);
  assert.ok(leaving.output.position[0] > layout.stage.width);
  assert.equal(leaving.output.visible, true);
  assert.equal(leaving.output.alpha, 1);
  const finished = tick(end + (layout.output.endX - layout.output.startX + 1) / layout.surfaceSpeed);
  assert.equal(finished.output.visible, false);
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
  assert.equal(motion.outputStart, undefined);

  advanceWorld(world, end + 80);
  assert.equal(station.batch.start, end);
  assert.ok(syncWorkshopMotion(motion, station, world.clockMs));
  assert.equal(motion.clock, end + 80);
  assert.equal(motion.outputStart, end);
  assert.ok(syncWorkshopMotion(motion, station, world.clockMs));
  assert.equal(motion.clock, end + 80);

  const freshMotion = { id: 'I01' };
  assert.ok(syncWorkshopMotion(freshMotion, station, world.clockMs));
  assert.ok(clearStation(world, 'I', 0));
  assert.equal(syncWorkshopMotion(freshMotion, station, end + 20_000), false);
  assert.equal(freshMotion.outputStart, undefined);
});
