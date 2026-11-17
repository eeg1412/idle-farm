import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMiningAnimation, miningFrame, miningCargoRect } from '../src/view/mining-layout.js';

const batch = { id: 'M01', start: 100, end: 9100 };
const session = { id: 'M01', startedAt: 100, durationMs: 9000 };
const sample = (elapsed) => sampleMiningAnimation({ batch, session, clock: 100 + elapsed });

test('mine entry, unloading and empty return retain the cart and hide only cargo', () => {
  assert.equal(sample(0).position, 1);
  assert.equal(sample(1000).position, 0.5);
  assert.equal(sample(2000).position, 0);
  assert.equal(sample(8000).position, 0.5);
  assert.equal(sample(9000).position, 1);
  assert.equal(sample(9000).cargoAlpha, 1);
  assert.equal(sample(9150).cargoAlpha, 0.5);
  assert.equal(sample(9300).cargoAlpha, 0);
  assert.equal(sample(10300).position, 1);
  assert.equal(sample(11300).position, 0.5);
  assert.equal(sample(12300).position, 0);
  assert.equal(sample(18000).cargoAlpha, 1);
});

test('fast economic batches do not restart the independent 5.3 second display', () => {
  const shortSession = { ...session, durationMs: 200 };
  const a = sampleMiningAnimation({ session: shortSession, batch: { ...batch, end: 300 }, clock: 1750 });
  const b = sampleMiningAnimation({ session: shortSession, batch: { ...batch, start: 1700, end: 1900 }, clock: 1750 });
  assert.deepEqual(a, b);
  assert.equal(a.duration, 5300);
});

test('a faster next long batch keeps unloading then reaches its real saved end', () => {
  const next = { id: 'M01', start: 9100, end: 15100 };
  const at = (clock) => sampleMiningAnimation({ session, batch: next, clock });
  assert.equal(at(9250).cargoAlpha, 0.5);
  assert.equal(at(10400).position, 1);
  assert.equal(at(12400).position, 0);
  assert.equal(at(13100).position, 0);
  assert.equal(at(14100).position, 0.5);
  assert.equal(at(15100).position, 1);
});

test('geometry shares rail anchors and cargo registration without changing inputs', () => {
  const visuals = { cart: { width: 96, height: 64, anchorX: 48, anchorY: 60,
    cargo: { x: 48, y: 15, width: 58, height: 48, anchorX: 0.5, anchorY: 1 } },
    foreground: { rect: { x: 0, y: 0, width: 320, height: 320 } },
    track: { inside: { x: 70, y: 237 }, station: { x: 249, y: 237 } } };
  const before = structuredClone(visuals);
  const frame = miningFrame(visuals, sample(9000));
  assert.deepEqual(frame.cart, { x: 201, y: 177, width: 96, height: 64 });
  assert.equal(frame.cargo.x + frame.cargo.width / 2, 249);
  assert.equal(frame.cargo.y + frame.cargo.height, 192);
  const icon = miningCargoRect(frame.cargo, 512, 256);
  assert.equal(icon.width, 58);
  assert.equal(icon.height, 29);
  assert.deepEqual(visuals, before);
});
