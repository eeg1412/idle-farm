import assert from 'node:assert/strict';
import test from 'node:test';
import { compact } from '../src/view/numbers.js';

test('economic values keep exact integer magnitude in abbreviated display', () => {
  const examples = [
    [0n, '0'], [9999n, '9,999'], [10000n, '10K'], [999999n, '999.99K'],
    [1000000n, '1M'], [100250000n, '100.25M'], [200250000000n, '200.25B'],
    [300350000000000n, '300.35T'], [-100250000n, '-100.25M'],
    [10n ** 15n, '1AA'], [10n ** 18n, '1AB'], [10n ** 120n + 9n, '1BJ'],
    [123n * 10n ** 118n, '1.23BJ'],
  ];
  for (const [value, display] of examples) assert.equal(compact(value), display);
});
