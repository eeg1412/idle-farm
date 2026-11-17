import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCatalogDurationSpacing } from '../scripts/lib/catalog-duration-spacing.mjs';

const item = (name, seconds) => ({ name, durationMs: seconds * 1000 });

test('two original items may have identical generated durations', () => {
  assert.doesNotThrow(() => assertCatalogDurationSpacing({
    C68: item('既有作物', 42),
    PT50: item('既有商品', 42),
  }));
});

test('a new item must be separated from shorter and longer original items across categories', () => {
  const existing = item('既有鱼类', 50);
  for (const seconds of [42, 58]) {
    assert.throws(() => assertCatalogDurationSpacing({
      F10: existing,
      C69: item('新增作物', seconds),
    }), {
      message: new RegExp(`C69 新增作物 ${seconds} 秒，F10 既有鱼类 50 秒，绝对差 8 秒`),
    });
  }
});

test('two new items conflict at 10 seconds and pass at 11 seconds', () => {
  const first = item('新增中间产物', 50);
  assert.throws(() => assertCatalogDurationSpacing({
    I128: first,
    PL21: item('新增商品', 60),
  }), { message: /I128 新增中间产物 50 秒，PL21 新增商品 60 秒，绝对差 10 秒/ });
  assert.doesNotThrow(() => assertCatalogDurationSpacing({
    I128: first,
    PL21: item('新增商品', 61),
  }));
});

test('the first appended ID in each category stays subject to the fixed original cutoff', () => {
  const boundaries = [
    ['C68', 'C69'], ['L10', 'L11'], ['F10', 'F11'], ['I127', 'I128'],
    ['IL10', 'IL11'], ['IF10', 'IF11'], ['P180', 'P181'], ['PL20', 'PL21'],
    ['PF20', 'PF21'], ['PD20', 'PD21'], ['PT50', 'PT51'],
  ];
  const original = item('既有品项', 50);
  const appended = item('追加品项', 50);
  for (const [lastOriginal, firstAppended] of boundaries) {
    assert.doesNotThrow(() => assertCatalogDurationSpacing({ C01: original, [lastOriginal]: original }));
    assert.throws(() => assertCatalogDurationSpacing({
      [lastOriginal]: original,
      [firstAppended]: appended,
    }), { message: new RegExp(`${firstAppended} 追加品项 50 秒，${lastOriginal} 既有品项 50 秒，绝对差 0 秒`) });
  }
});
