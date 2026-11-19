import assert from 'node:assert/strict';
import test from 'node:test';
import { createManagerSpeechQueue, fitManagerSpeech } from '../src/view/manager-speech.js';

function queue() {
  return createManagerSpeechQueue('management', 'female');
}

test('offer immediately displays only the latest selected base line and can clear it', () => {
  const speech = queue();
  speech.offer({ text: '日常' });
  assert.equal(speech.line.priority, 0);
  assert.deepEqual(speech.update(0, true), { changed: true, audible: false });
  speech.update(45, true);
  speech.offer({ text: '升级设施', priority: 1 });
  assert.equal(speech.line.text, '升级设施');
  assert.equal(speech.line.priority, 1);
  assert.equal(speech.shown, 0);
  speech.offer({ text: '点击田地播种', priority: 2 });
  assert.equal(speech.line.text, '点击田地播种');
  assert.equal(speech.line.priority, 2);
  speech.offer({ text: '新的日常', priority: 0 });
  assert.equal(speech.line.text, '新的日常');
  speech.offer(null);
  assert.equal(speech.line, undefined);
  assert.equal(speech.shown, 0);
  assert.equal(speech.update(100, true).changed, true);
});

test('a retained help line never rotates back to an older daily line', () => {
  const speech = queue();
  speech.offer({ text: '日常' });
  speech.update(0, true);
  speech.offer({ text: '帮助', priority: 1 });
  speech.update(100, true);
  speech.update(190, true);
  speech.update(10000, true);
  speech.update(20000, true);
  assert.equal(speech.line.text, '帮助');
  assert.equal(speech.shown, 2);
});

test('thanks immediately interrupts a completed base line without its three second wait', () => {
  const speech = queue();
  speech.offer({ text: '帮助', priority: 1 });
  speech.update(0, true);
  speech.update(90, true);
  speech.enqueue({ text: '谢谢', expression: 'happy' });
  assert.equal(speech.line.text, '谢谢');
  assert.equal(speech.line.expression, 'happy');
  assert.equal(speech.line.priority, 3);
  assert.equal(speech.shown, 0);
  assert.deepEqual(speech.update(91, true), { changed: true, audible: false });
});

test('thanks finishes typing and remains visible for three full seconds before restoring the base', () => {
  const speech = queue();
  speech.offer({ text: '基础' });
  speech.update(0, true);
  speech.enqueue({ text: '谢谢' });
  speech.update(10, true);
  speech.update(100, true);
  assert.equal(speech.shown, 2);
  speech.update(3099, true);
  assert.equal(speech.line.text, '谢谢');
  assert.deepEqual(speech.update(3100, true), { changed: true, audible: false });
  assert.equal(speech.line.text, '基础');
});

test('the same base sentence retains both shown glyphs and fractional typing progress', () => {
  const speech = queue();
  speech.offer({ text: '点击田地播种', priority: 2 });
  speech.update(0, true);
  speech.update(67, true);
  assert.equal(speech.shown, 1);
  speech.enqueue({ text: '谢' });
  speech.update(100, true);
  speech.offer({ text: '点击田地播种', priority: 2 });
  speech.update(145, true);
  speech.update(3145, true);
  assert.equal(speech.line.text, '点击田地播种');
  assert.equal(speech.shown, 1);
  speech.update(3167, true);
  assert.equal(speech.shown, 1);
  speech.update(3168, true);
  assert.equal(speech.shown, 2);
});

test('base changes during thanks restore the latest valid guidance without replaying old help', () => {
  const speech = queue();
  speech.offer({ text: '升级旧设施', priority: 1 });
  speech.update(0, true);
  speech.update(90, true);
  speech.enqueue({ text: '谢' });
  speech.update(100, true);
  speech.offer({ text: '点击新田地', priority: 2 });
  assert.equal(speech.line.text, '谢');
  speech.update(145, true);
  speech.update(3145, true);
  assert.equal(speech.line.text, '点击新田地');
  assert.equal(speech.shown, 0);
});

test('clearing a base during thanks leaves no stale sentence after thanks', () => {
  const speech = queue();
  speech.offer({ text: '旧帮助', priority: 1 });
  speech.enqueue({ text: '谢' });
  speech.update(0, true);
  speech.offer(undefined);
  assert.equal(speech.line.text, '谢');
  speech.update(45, true);
  assert.equal(speech.update(3045, true).changed, true);
  assert.equal(speech.line, undefined);
});

test('consecutive thanks play the newest immediately and never resume an older thanks', () => {
  const speech = queue();
  speech.offer({ text: '帮助', priority: 1 });
  speech.enqueue({ text: '第一次感谢' });
  speech.update(0, true);
  speech.update(90, true);
  speech.enqueue({ text: '新谢' });
  assert.equal(speech.line.text, '新谢');
  assert.equal(speech.shown, 0);
  speech.update(100, true);
  speech.update(190, true);
  speech.update(3190, true);
  assert.equal(speech.line.text, '帮助');
  speech.update(10000, true);
  assert.equal(speech.line.text, '帮助');
});

test('hidden time and explicit pauses advance neither typing nor the thanks reading hold', () => {
  const speech = queue();
  speech.enqueue({ text: '谢谢' });
  speech.update(0, true);
  speech.update(45, true);
  speech.update(10000, false);
  speech.update(20000, true);
  assert.equal(speech.shown, 1);
  speech.pause();
  speech.update(30000, true);
  assert.equal(speech.shown, 1);
  speech.update(30045, true);
  assert.equal(speech.shown, 2);
  speech.update(31045, true);
  speech.update(40000, false);
  speech.update(50000, true);
  speech.pause();
  speech.update(60000, true);
  speech.update(61999, true);
  assert.equal(speech.line.text, '谢谢');
  speech.update(62000, true);
  assert.equal(speech.line, undefined);
});

test('offering an unchanged sentence or upgrading its priority preserves typing', () => {
  const speech = queue();
  speech.offer({ text: '点击田地' });
  speech.update(0, true);
  speech.update(60, true);
  speech.offer({ text: '点击田地', expression: 'smile', emphasis: [], priority: 2 });
  assert.equal(speech.shown, 1);
  assert.equal(speech.line.priority, 2);
  speech.update(90, true);
  assert.equal(speech.shown, 2);
});

test('graphemes, emphasis, typing sound cadence and punctuation wrapping remain intact', () => {
  const speech = queue();
  speech.offer({ text: '田地（播种），好！', emphasis: ['播种'] });
  speech.update(0, true);
  assert.equal(speech.update(45, true).audible, true);
  assert.equal(speech.update(90, true).audible, false);
  assert.deepEqual(speech.line.glyphs.filter((glyph) => glyph.red).map((glyph) => glyph.text), ['播', '种']);
  const fitted = fitManagerSpeech(speech.line.glyphs, 3, 100, 12, (text) => ({
    width: Array.from(text).length, height: text.split('\n').length,
  }));
  assert.ok(fitted.lineText.every((line) => !/^[，。！？；、：…）】》」』,.!?]/u.test(line)));
  assert.ok(fitted.lineText.every((line) => !/[（【《「『]$/u.test(line)));
  speech.offer({ text: '👩‍🌾种地' });
  assert.equal(speech.line.glyphs.length, 3);
});
