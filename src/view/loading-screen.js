import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import { loadingLayout } from './loading-layout.js';
import loadingScenes from '../content/loading-scenes.json' with { type: 'json' };
import { managerIds, managerDefaultGenders } from '../game/managers.js';
import { assetUrl } from './asset-url.js';

const fontFamily = 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';
const openingLogoPath = 'art/loading/logo.webp';
// Every opening image the overlay can request (build-time manifest check).
export const openingAssetPaths = () => [openingLogoPath, ...loadingScenes.scenes.map((scene) => scene.path)];

// A single Pixi overlay shares the game's canvas; it never pauses page construction.
export function createLoadingScreen(app, { tasks, load, markDirty, retry, retryStartup, onComplete }) {
  const layer = app.stage.addChild(new Container({ label: 'opening-screen' }));
  layer.eventMode = 'static';
  const shade = layer.addChild(new Graphics());
  const art = ['scene', 'logo'].map((name) => {
    const sprite = layer.addChild(new Sprite({ label: 'opening-' + name, roundPixels: true }));
    sprite.visible = false;
    sprite.eventMode = 'none';
    return sprite;
  });
  const mask = layer.addChild(new Graphics());
  for (const sprite of art) sprite.mask = mask;
  const track = layer.addChild(new Graphics());
  const fill = layer.addChild(new Graphics());
  const captionSurface = layer.addChild(new Graphics());
  const label = layer.addChild(new Text({ text: '正在准备庄园', style: {
    fontFamily, fontSize: 15, wordWrap: true, breakWords: true, fontWeight: '700', fill: 0xfff4d6, align: 'center',
  } }));
  const retryButton = layer.addChild(new Container({ label: '重试加载' }));
  const retrySurface = retryButton.addChild(new Graphics());
  const retryLabel = retryButton.addChild(new Text({ text: '重试加载', style: {
    fontFamily, fontSize: 16, fontWeight: '800', fill: 0x243d27,
  } }));
  const problemButton = layer.addChild(new Container({ label: '查看存档问题' }));
  const problemSurface = problemButton.addChild(new Graphics());
  const problemLabel = problemButton.addChild(new Text({ text: '查看存档问题', style: {
    fontFamily, fontSize: 14, fill: 0xfff4d6,
  } }));
  let viewport;
  let selectedScene;
  let shownMs = 0;
  let lastTick;
  let wasVisible = !document.hidden;
  const resetVisibleTime = () => {
    lastTick = undefined; wasVisible = !document.hidden; fadeAt = undefined; stableFrames = 0;
  };
  document.addEventListener('visibilitychange', resetVisibleTime);
  let firstCompleteRendered = false;
  let fadeAt;
  let lastVersion = -1;
  let stableFrames = 0;
  let done = false;
  let revealedProblem = false;
  let startupProblem;
  let pageReady = false;
  let lastPixels = -1;
  let lastCaption;
  let lastFailure;
  let retrying = false;
  const stop = (event) => event.stopPropagation();
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointertap', 'wheel']) layer.on(type, stop);
  retryButton.eventMode = 'static';
  retryButton.cursor = 'pointer';
  const retryFailed = () => {
    if (retrying || (!tasks.snapshot().failed.length && !startupProblem)) return;
    retrying = true;
    revealedProblem = false;
    fadeAt = undefined;
    Promise.resolve(retry()).then(() => {
      if (startupProblem) return retryStartup?.();
    }).catch(() => {}).finally(() => { retrying = false; markDirty(); });
  };
  retryButton.on('pointertap', retryFailed);
  problemButton.eventMode = 'static';
  problemButton.cursor = 'pointer';
  problemButton.on('pointertap', () => { revealedProblem = true; layer.visible = false; markDirty(); });
  retryButton.visible = false;
  problemButton.visible = false;

  function arrange() {
    if (!viewport) return;
    const { x, y, width, height } = viewport;
    shade.clear().rect(0, 0, app.screen.width, app.screen.height).fill(0x000000)
      .rect(x, y, width, height).fill(0x172b20);
    layer.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    mask.clear().rect(x, y, width, height).fill(0xffffff);
    const hasFailure = tasks.snapshot().failed.length > 0 || Boolean(startupProblem);
    let geometry = loadingLayout(viewport, { scene: selectedScene, failed: hasFailure, problem: Boolean(startupProblem) });
    label.style.wordWrapWidth = geometry.label.width;
    label.style.fontSize = geometry.label.fontSize;
    label.anchor.set(0.5, 0);
    geometry = loadingLayout(viewport, { scene: selectedScene, failed: hasFailure, problem: Boolean(startupProblem), labelHeight: label.height, labelWidth: label.width });
    for (const [index, sprite] of art.entries()) {
      if (!sprite.visible) continue;
      const texture = sprite.texture;
      const box = index === 0 ? geometry.scene : geometry.logo;
      sprite.scale.set(box.width / texture.width);
      sprite.position.set(box.x, box.y);
    }
    const { width: barWidth, x: barX, y: barY } = geometry.bar;
    track.clear().roundRect(barX - 3, barY - 3, barWidth + 6, 17, 8).fill(0x263f29)
      .stroke({ color: 0xf6dfa2, width: 2 });
    // Keep the fill geometry local so changing its x scale cannot shift its anchor.
    fill.clear().roundRect(0, 0, barWidth, 11, 5).fill(0xeacb64);
    fill.position.set(barX, barY);
    const state = tasks.snapshot();
    fill.scale.x = (state.done + (pageReady ? 1 : 0)) / (state.total + 1);
    captionSurface.clear().roundRect(geometry.caption.x, geometry.caption.y,
      geometry.caption.width, geometry.caption.height, 7).fill(0x203b2a);
    label.position.set(geometry.label.x, geometry.label.y);
    retryButton.position.set(geometry.retry.x, geometry.retry.y);
    retrySurface.clear().roundRect(0, 0, 130, 38, 9).fill(0xf6dfa2);
    retryButton.hitArea = new Rectangle(0, 0, 130, 38);
    retryLabel.anchor.set(0.5);
    retryLabel.position.set(65, 19);
    problemLabel.anchor.set(0.5);
    problemSurface.clear().roundRect(-70, -17, 140, 34, 8).fill(0x203b2a);
    problemButton.position.set(geometry.problem.x, geometry.problem.y);
    problemButton.hitArea = new Rectangle(-70, -17, 140, 34);
    lastPixels = -1;
    markDirty();
  }
  function loadArt() {
    art.forEach((sprite, index) => {
      if (sprite.visible) return;
      if (index === 0 && !selectedScene) return;
      const scene = index === 0 ? selectedScene : undefined;
      const url = assetUrl(scene ? scene.path : openingLogoPath);
      load(url, scene?.role === 'orders' ? 'nearest' : 'linear').then((texture) => {
        if (!texture || texture.destroyed || done || sprite.destroyed) return;
        sprite.texture = texture;
        sprite.visible = true;
        arrange();
      });
    });
  }
  loadArt();
  return {
    get blocking() { return !done && !revealedProblem; },
    get complete() { return done; },
    setWorld(world) {
      // Called only after restoration/new-save creation has resolved. Lock the one
      // startup draw, including its selected gender, across resource retries.
      if (selectedScene || done || !world) return;
      const role = managerIds[Math.floor(Math.random() * managerIds.length)];
      const savedGender = world.managers?.roles?.[role]?.gender;
      const gender = savedGender === 'female' || savedGender === 'male' ? savedGender : managerDefaultGenders[role];
      selectedScene = loadingScenes.scenes.find((scene) => scene.role === role && scene.gender === gender);
      loadArt();
      arrange();
    },
    resize(next) { viewport = next; if (!done) arrange(); },
    retryArt: loadArt,
    retryFailed,
    pageState(ready, problem) {
      pageReady = ready;
      startupProblem = problem;
      if (!problem && revealedProblem) { revealedProblem = false; layer.visible = true; markDirty(); }
    },
    afterRender() {
      if (!done && !firstCompleteRendered && layer.visible && art.every((sprite) => sprite.visible)) {
        firstCompleteRendered = true; shownMs = 0; lastTick = undefined;
      }
    },
    update(now, settled) {
      if (done) return;
      const visible = !document.hidden;
      const elapsed = lastTick === undefined || !wasVisible || !visible ? 0 : Math.max(0, now - lastTick);
      lastTick = now;
      wasVisible = visible;
      if (firstCompleteRendered && layer.visible && visible) shownMs += elapsed;
      const state = tasks.snapshot();
      const failed = state.failed.length > 0 || Boolean(startupProblem);
      const total = state.total + 1;
      const completed = state.done + (pageReady ? 1 : 0);
      const width = viewport ? viewport.width * 0.74 : 0;
      const pixels = Math.floor(width * completed / total);
      if (pixels !== lastPixels) { fill.scale.x = width ? pixels / width : 0; lastPixels = pixels; markDirty(); }
      const caption = startupProblem?.title ?? (failed ? '部分资源未能载入，请重试' : `正在加载 ${completed} / ${total}`);
      if (caption !== lastCaption) { label.text = caption; lastCaption = caption; arrange(); markDirty(); }
      const failureKey = failed + ":" + Boolean(startupProblem);
      if (failureKey !== lastFailure) {
        retryButton.visible = failed;
        problemButton.visible = Boolean(startupProblem);
        lastFailure = failureKey;
        arrange();
        markDirty();
      }
      // Promise continuations may request another redraw or discover dependent textures.
      // Require two quiet rendered frames; an arrival during fading cancels that fade.
      const ready = pageReady && !state.pending && !failed && settled && firstCompleteRendered;
      if (ready && lastVersion === tasks.version) stableFrames += 1;
      else { stableFrames = 0; fadeAt = undefined; }
      lastVersion = tasks.version;
      if (!ready || stableFrames < 2 || shownMs < 1000 || document.hidden) {
        if (layer.alpha !== 1) { layer.alpha = 1; markDirty(); }
        return;
      }
      fadeAt ??= now;
      layer.alpha = Math.max(0, 1 - (now - fadeAt) / 300);
      markDirty();
      if (layer.alpha > 0) return;
      done = true;
      tasks.finish();
      document.removeEventListener('visibilitychange', resetVisibleTime);
      layer.destroy({ children: true });
      onComplete?.();
    },
  };
}
