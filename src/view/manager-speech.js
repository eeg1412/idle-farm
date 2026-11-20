const glyphIntervalMs = 45;
const readTimeMs = 3000;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
const openingMarks = '（【《「『';
const closingMarks = '，。！？；、：…）】》」』,.!?';

function speechGlyphs(text, emphasis) {
  const ranges = [];
  for (const term of emphasis) {
    if (!term) continue;
    for (let start = text.indexOf(term); start !== -1; start = text.indexOf(term, start + term.length)) {
      ranges.push([start, start + term.length]);
    }
  }
  let offset = 0;
  const segments = segmenter?.segment(text) ?? Array.from(text, (segment) => {
    const index = offset;
    offset += segment.length;
    return { segment, index };
  });
  return Array.from(segments, ({ segment, index }, order) => ({
    text: segment, order,
    red: ranges.some(([start, end]) => index >= start && index < end),
  }));
}

export function createManagerSpeechQueue(role, gender) {
  let base;
  let reply;
  let active;
  let lastTick;
  let changed = false;

  function lineKey({ text, expression = 'smile', emphasis = [] }) {
    return JSON.stringify([text, expression, emphasis]);
  }

  function entry({ text, expression = 'smile', emphasis = [], priority }, defaultPriority) {
    return {
      key: lineKey({ text, expression, emphasis }),
      line: { text, expression, emphasis, priority: priority ?? defaultPriority, glyphs: speechGlyphs(text, emphasis) },
      shown: 0, typedMs: 0, holdMs: 0,
    };
  }

  function activate(next) {
    if (active === next) return;
    // A sentence reached through another line starts a fresh telling. Pausing or
    // rebuilding its mount never changes the active entry, so it keeps progress.
    if (next) {
      next.shown = 0;
      next.typedMs = 0;
      next.holdMs = 0;
    }
    active = next;
    lastTick = undefined;
    changed = true;
  }

  function chooseActive() {
    activate(reply && (!base || reply.line.priority >= base.line.priority) ? reply : base);
  }

  function enqueue(line) {
    reply = entry(line, 3);
    chooseActive();
  }

  function offer(line) {
    if (line && lineKey(line) === base?.key) {
      // Priority can change without restarting the same sentence.
      base.line.priority = line.priority ?? 0;
      chooseActive();
      return;
    }
    base = line ? entry(line, 0) : undefined;
    chooseActive();
  }

  function select(line) {
    reply = undefined;
    base = line ? entry(line, 0) : undefined;
    activate(base);
  }

  return {
    role, gender, offer, enqueue, select,
    get line() { return active?.line; },
    get replying() { return Boolean(reply); },
    get shown() { return active?.shown ?? 0; },
    pause() { lastTick = undefined; },
    update(now, visible) {
      if (!visible) {
        lastTick = undefined;
        return;
      }
      const elapsed = lastTick === undefined ? 0 : Math.max(0, now - lastTick);
      lastTick = now;
      if (changed) {
        changed = false;
        return { changed: true, audible: false };
      }
      if (!active) return;
      if (active.shown === active.line.glyphs.length) {
        active.holdMs = Math.min(readTimeMs, active.holdMs + elapsed);
        if (active.holdMs < readTimeMs || active !== reply) return;
        reply = undefined;
        chooseActive();
        // The restored sentence starts measuring visible time at this tick.
        lastTick = now;
        changed = false;
        return { changed: true, audible: false };
      }
      active.typedMs += elapsed;
      const next = Math.min(active.line.glyphs.length, Math.floor(active.typedMs / glyphIntervalMs));
      if (active.shown === next) return;
      const audible = active.line.glyphs.slice(active.shown, next)
        .some(({ text, order }) => order % 3 === 0 && /\S/u.test(text));
      active.shown = next;
      return { changed: false, audible };
    },
  };
}

function groupForLineBreak(glyphs) {
  const tokens = [];
  let beginning = [];
  for (const glyph of glyphs) {
    if (openingMarks.includes(glyph.text)) beginning.push(glyph);
    else if (tokens.length && closingMarks.includes(glyph.text)) tokens.at(-1).push(glyph);
    else {
      tokens.push([...beginning, glyph]);
      beginning = [];
    }
  }
  if (beginning.length) tokens.push(beginning);
  return tokens;
}

export function fitManagerSpeech(glyphs, width, height, preferredSize, measure) {
  const tokens = groupForLineBreak(glyphs);
  for (let size = preferredSize; size >= 7; size -= 1) {
    const lines = [[]];
    let text = '';
    for (const token of tokens) {
      const next = token.map((glyph) => glyph.text).join('');
      if (text && measure(text + next, size).width > width) {
        const first = next.trimStart() ? token : [];
        lines.push([...first]);
        text = first.length ? next : '';
      } else {
        lines.at(-1).push(...token);
        text += next;
      }
    }
    const lineText = lines.map((line) => line.map((glyph) => glyph.text).join('').trimEnd());
    if (size === 7 || (lines.length <= 3 && measure(lineText.join('\n'), size).height <= height)) {
      return { lines, lineText, size };
    }
  }
}
