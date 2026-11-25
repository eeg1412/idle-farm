import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { createManagerSpeechQueue } from './manager-speech.js';

// Shared by the new-estate introduction and the task page's explanations: a manager rises
// from the canvas's bottom center and types fixed lines in a bubble above the head.
const riseMs = 400;
// The same typing pace and typing-sound rhythm as manager banners (manager-speech.js).
const glyphIntervalMs = 45;
const bounceMs = 900;

const quotedTerms = (text) => [...new Set(Array.from(text.matchAll(/「([^」]+)」/g), (match) => match[1]))];
const easeOut = (value) => 1 - (1 - value) ** 3;
const easeIn = (value) => value ** 3;

// Time-based state, kept outside display objects so page rebuilds keep the telling's progress.
// `lines` holds strings (「」 terms in red) or { text, emphasis } entries with their own red terms.
export function createOnboardingSpeech({ role = 'tasks', gender, lines }) {
  const texts = (lines ?? []).map((line) => (typeof line === 'string' ? { text: line } : line))
    .filter((line) => typeof line?.text === 'string' && line.text);
  // The banner queue supplies glyph segmentation and the 「」 red emphasis ranges.
  const queue = createManagerSpeechQueue(role, gender);
  let index = 0;
  let phase = texts.length ? 'enter' : 'gone';
  let phaseMs = 0;
  let lastTick;
  let line;
  let shown = 0;
  let typedMs = 0;
  let lineChanged = false;
  let revealPending = false;

  function load() {
    const { text, emphasis } = texts[index];
    queue.select({ text, expression: 'smile', emphasis: Array.isArray(emphasis) ? emphasis : quotedTerms(text) });
    line = queue.line;
    shown = 0;
    typedMs = 0;
    lineChanged = true;
  }
  if (texts.length) load();

  return {
    role, gender,
    get phase() { return phase; },
    get line() { return line; },
    get shown() { return shown; },
    get finished() { return phase === 'gone'; },
    // 0 = below the canvas, 1 = fully risen.
    get figure() {
      const progress = Math.min(1, phaseMs / riseMs);
      if (phase === 'enter') return easeOut(progress);
      if (phase === 'leave') return 1 - easeIn(progress);
      return phase === 'gone' ? 0 : 1;
    },
    // Typing: complete the sentence. Complete: the next sentence, or leave after the last.
    tap() {
      if (phase !== 'speak') return false;
      if (shown < line.glyphs.length) {
        shown = line.glyphs.length;
        typedMs = shown * glyphIntervalMs;
        revealPending = true;
      } else if (index + 1 < texts.length) {
        index += 1;
        load();
      } else {
        phase = 'leave';
        phaseMs = 0;
        lastTick = undefined;
      }
      return true;
    },
    pause() { lastTick = undefined; },
    update(now) {
      const elapsed = lastTick === undefined ? 0 : Math.max(0, now - lastTick);
      lastTick = now;
      const result = { motion: false, lineChanged: false, reveal: false, audible: false, finished: false };
      if (phase === 'enter' || phase === 'leave') {
        phaseMs += elapsed;
        result.motion = true;
        if (phaseMs >= riseMs) {
          if (phase === 'enter') {
            phase = 'speak';
            phaseMs = 0;
            lineChanged = true;
          } else {
            phase = 'gone';
            result.finished = true;
            return result;
          }
        }
      }
      if (phase !== 'speak') return result;
      if (lineChanged) {
        lineChanged = false;
        revealPending = false;
        result.lineChanged = true;
        return result;
      }
      if (shown < line.glyphs.length) {
        typedMs += elapsed;
        const next = Math.min(line.glyphs.length, Math.floor(typedMs / glyphIntervalMs));
        if (next !== shown) {
          result.audible = line.glyphs.slice(shown, next).some(({ text, order }) => order % 3 === 0 && /\S/u.test(text));
          shown = next;
          result.reveal = true;
        }
      }
      if (revealPending) {
        revealPending = false;
        result.reveal = true;
      }
      return result;
    },
  };
}

function bubblePath(g, x, y, width, height, tailX) {
  const right = x + width;
  const bottom = y + height;
  const radius = Math.min(10, height / 4);
  const halfBase = 7;
  return g.moveTo(x + radius, y).lineTo(right - radius, y).quadraticCurveTo(right, y, right, y + radius)
    .lineTo(right, bottom - radius).quadraticCurveTo(right, bottom, right - radius, bottom)
    .lineTo(tailX + halfBase, bottom).lineTo(tailX + 2, bottom + 11).lineTo(tailX - halfBase, bottom)
    .lineTo(x + radius, bottom).quadraticCurveTo(x, bottom, x, bottom - radius)
    .lineTo(x, y + radius).quadraticCurveTo(x, y, x + radius, y).closePath();
}

function arrowShape(g, fill, stroke) {
  // Points down with its tip at the origin.
  return g.poly([0, 0, -13, -15, -5, -15, -5, -32, 5, -32, 5, -15, 13, -15])
    .fill(fill).stroke({ color: stroke, width: 2, join: 'round' });
}

// One full-canvas layer that owns every tap while shown (single-canvas hit testing).
// `session` draws the rising manager; `spotlight` ({ left, top, right, bottom } in this
// layer's coordinates) leaves that area undimmed and points a bouncing arrow at it.
export function mountOnboardingOverlay(parent, {
  width, height, insetTop = 0, insetLeft = 0, insetRight = 0, session, spotlight, dim = 0,
  art, requestPortrait, caption, colors, onTap, markDirty,
}) {
  const layer = parent.addChild(new Container({ label: 'onboarding-overlay' }));
  layer.eventMode = 'static';
  layer.cursor = 'pointer';
  layer.hitArea = new Rectangle(0, 0, width, height);
  layer.on('pointertap', (event) => onTap?.(layer.toLocal(event.global), event));

  let hole;
  if (dim > 0 || spotlight) {
    const shade = layer.addChild(new Graphics());
    shade.eventMode = 'none';
    shade.rect(0, 0, width, height).fill({ color: colors.dim, alpha: dim });
    if (spotlight) {
      const pad = 10;
      hole = {
        x: spotlight.left - pad, y: spotlight.top - pad,
        width: spotlight.right - spotlight.left + pad * 2, height: spotlight.bottom - spotlight.top + pad * 2,
      };
      shade.roundRect(hole.x, hole.y, hole.width, hole.height, 16).cut();
      const ring = layer.addChild(new Graphics().roundRect(hole.x, hole.y, hole.width, hole.height, 16)
        .stroke({ color: colors.ring, width: 3 }));
      ring.eventMode = 'none';
    }
  }

  let arrow;
  let arrowBase;
  let arrowDirection = 1;
  if (hole) {
    arrow = layer.addChild(arrowShape(new Graphics(), colors.arrow, colors.arrowStroke));
    arrow.eventMode = 'none';
    const above = hole.y - 6 - 32 - 8 >= insetTop;
    arrowDirection = above ? 1 : -1;
    arrow.rotation = above ? 0 : Math.PI;
    arrowBase = { x: hole.x + hole.width / 2, y: above ? hole.y - 6 : hole.y + hole.height + 6 };
    arrow.position.set(arrowBase.x, arrowBase.y);
  }

  let figure;
  let figureTravel = 0;
  let bubble;
  let words;
  let reveal = () => false;
  let bubbleArea;
  if (session && !session.finished) {
    figure = layer.addChild(new Container({ label: 'onboarding-manager' }));
    figure.eventMode = 'none';
    figure.interactiveChildren = false;
    const inkSpan = Math.min(width * 0.62, 300);
    const scale = inkSpan / Math.max(1, art.inkRight - art.inkLeft);
    const portraitHeight = art.height * scale;
    // The portrait keeps the source facing and rises at the bottom center: the middle of its
    // ink (inkLeft–inkRight) lines up with the center of the content width between the insets.
    const contentCenter = (insetLeft + width - insetRight) / 2;
    const portraitX = contentCenter - (art.inkLeft + art.inkRight) / 2 * scale;
    const faceX = portraitX + art.faceX * scale;
    // The half-length portrait's lower edge stays below the canvas's bottom edge.
    const portraitTop = height + Math.round(portraitHeight * 0.08) - portraitHeight;
    const portrait = figure.addChild(new Sprite({ texture: Texture.EMPTY, roundPixels: true, label: 'onboarding-portrait' }));
    portrait.eventMode = 'none';
    portrait.visible = false;
    requestPortrait?.((texture) => {
      if (!texture || texture.destroyed || portrait.destroyed) return;
      const factor = art.height * scale / texture.height;
      portrait.texture = texture;
      portrait.scale.set(factor);
      portrait.position.set(portraitX, portraitTop);
      portrait.visible = true;
      markDirty();
    });
    const size = width < 350 ? 15 : 17;
    const lineHeight = Math.ceil(size * 1.36);
    const marginLeft = Math.max(16, insetLeft + 12);
    const marginRight = Math.max(16, insetRight + 12);
    const bubbleWidth = Math.max(80, Math.min(width - marginLeft - marginRight, 420));
    // Centered in the content area between the margins, above the head.
    const bubbleX = marginLeft + (width - marginLeft - marginRight - bubbleWidth) / 2;
    const bubbleHeight = lineHeight * 4 + 20;
    const bubbleY = Math.max(insetTop + 8, portraitTop - 12 - bubbleHeight);
    const tailX = Math.max(bubbleX + 24, Math.min(bubbleX + bubbleWidth - 24, faceX));
    bubble = figure.addChild(bubblePath(new Graphics(), bubbleX, bubbleY, bubbleWidth, bubbleHeight, tailX)
      .fill(colors.card).stroke({ color: colors.border, width: 1.25 }));
    bubble.eventMode = 'none';
    words = figure.addChild(new Container({ label: 'onboarding-dialogue' }));
    words.eventMode = 'none';
    bubbleArea = { x: bubbleX + 10, y: bubbleY + 6, width: bubbleWidth - 20, height: bubbleHeight - 12, size };
    figureTravel = height - bubbleY + 12;
  }

  function startLine() {
    if (!words || words.destroyed) return;
    const { x, y, width: w, height: h, size } = bubbleArea;
    reveal = caption(words, session.line, x, y, w, h, size, 4);
    reveal(session.shown);
  }

  function placeFigure() {
    if (!figure) return;
    // Moving up from below, the bubble stays hidden until the manager has risen.
    figure.y = (1 - session.figure) * figureTravel;
    const speaking = session.phase === 'speak';
    bubble.visible = speaking;
    words.visible = speaking;
  }
  if (figure) {
    placeFigure();
    if (session.phase === 'speak') startLine();
  }

  return {
    layer,
    // Returns { audible, finished } for the session, or undefined when nothing happened.
    update(now) {
      if (layer.destroyed) return undefined;
      let dirty = false;
      let result;
      if (arrow) {
        const bounce = 0.5 - 0.5 * Math.cos(Math.PI * 2 * (now % bounceMs) / bounceMs);
        arrow.y = arrowBase.y - arrowDirection * 7 * bounce;
        dirty = true;
      }
      if (figure) {
        result = session.update(now);
        if (result.lineChanged) startLine();
        else if (result.reveal && reveal(session.shown)) dirty = true;
        if (result.motion || result.lineChanged || result.finished) {
          placeFigure();
          dirty = true;
        }
      }
      if (dirty) markDirty();
      return result;
    },
    pause() { session?.pause(); },
  };
}
