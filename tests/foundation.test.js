import test from 'node:test';
import assert from 'node:assert/strict';
import { viewportLayout } from '../src/platform/layout.js';

test('portrait fills and landscape centers an upright area', () => {
  const insets = { left: 20, right: 20, top: 24, bottom: 12 };
  const portrait = viewportLayout(390, 844, insets);
  assert.deepEqual([portrait.width, portrait.height], [390, 844]);
  const landscape = viewportLayout(844, 390, insets);
  assert.equal(landscape.x, (844 - landscape.width) / 2);
  assert.equal(landscape.width, Math.floor(landscape.height * 390 / 844));
});
