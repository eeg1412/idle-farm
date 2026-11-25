import { Container, Graphics, Sprite } from 'pixi.js';
import { miningCargoRect, miningFrame, sampleMiningAnimation } from './mining-layout.js';

// Random strike timeline built as the clock advances: a miner hits the same
// spot 3–10 times 0.62–0.9 s apart, pauses, then moves to a different
// spot. Each hit lands within ±2 px of the spot and throws sparks to a random side.
function strikeTimeline(originCount) {
  const between = (low, high) => low + Math.random() * (high - low);
  let strike = null;
  let nextTime = 180;
  let origin = -1;
  let hitsLeft = 0;
  return (elapsed) => {
    // Clock went back (new session or restart): start a fresh timeline.
    if (strike && elapsed < strike.time) {
      strike = null;
      nextTime = elapsed + 180;
      hitsLeft = 0;
    }
    // After a long jump, resume from now instead of replaying missed hits.
    if (elapsed - nextTime > 10_000) nextTime = elapsed;
    while (nextTime <= elapsed) {
      if (!hitsLeft) {
        origin = origin < 0 ? Math.floor(Math.random() * originCount)
          : (origin + 1 + Math.floor(Math.random() * (originCount - 1))) % originCount;
        hitsLeft = 3 + Math.floor(Math.random() * 8);
      }
      strike = { time: nextTime, origin, dx: Math.floor(between(-2, 3)), dy: Math.floor(between(-2, 3)),
        flip: Math.random() < 0.5 ? -1 : 1 };
      hitsLeft -= 1;
      nextTime += between(620, 900) + (hitsLeft ? 0 : between(500, 2700));
    }
    return strike;
  };
}

function mountMiningSparks(scene, geometry, epoch) {
  const layer = new Container();
  layer.label = 'mining-interior-sparks';
  layer.eventMode = 'none';
  const mask = new Graphics().poly(geometry.mask).fill(0xffffff);
  mask.label = 'mining-interior-spark-mask';
  mask.eventMode = 'none';
  scene.addChild(layer, mask);
  layer.mask = mask;
  const graphic = (label) => {
    const node = new Graphics();
    node.label = label;
    node.eventMode = 'none';
    node.visible = false;
    layer.addChild(node);
    return node;
  };
  const glow = graphic('mining-strike-glow')
    .rect(-7, -5, 14, 10).fill({ color: 0xf6a23b, alpha: 0.045 })
    .rect(-5, -3, 10, 6).fill({ color: 0xffbd55, alpha: 0.075 })
    .rect(-3, -2, 6, 4).fill({ color: 0xffdc88, alpha: 0.11 });
  const flash = graphic('mining-strike-core')
    .rect(-1, -1, 3, 3).fill(0xffedb2)
    .rect(0, 0, 1, 1).fill(0xfff9e0);
  const trajectories = [
    { vx: -0.052, vy: -0.065, delay: 0, life: 360 },
    { vx: 0.044, vy: -0.077, delay: 12, life: 410 },
    { vx: -0.024, vy: -0.089, delay: 26, life: 450 },
    { vx: 0.063, vy: -0.034, delay: 8, life: 300 },
    { vx: -0.058, vy: -0.021, delay: 35, life: 290 },
    { vx: 0.021, vy: -0.049, delay: 42, life: 380 },
  ];
  const particles = trajectories.map((trajectory, index) => {
    const node = new Container();
    node.label = `mining-spark-${index}`;
    node.eventMode = 'none';
    node.visible = false;
    const ember = new Graphics()
      .rect(-1, -1, 3, 2).fill(0xf5a13e);
    ember.eventMode = 'none';
    const hot = new Graphics()
      .rect(-1, -1, 2, 2).fill(0xfff1ba);
    hot.eventMode = 'none';
    node.addChild(ember, hot);
    layer.addChild(node);
    return { ...trajectory, node, hot };
  });
  const nextStrike = strikeTimeline(geometry.origins.length);
  const place = (node, visible, x = 0, y = 0, alpha = 0) => {
    if (!visible) {
      if (!node.visible) return false;
      node.visible = false;
      return true;
    }
    const px = Math.round(x);
    const py = Math.round(y);
    const changed = !node.visible || node.x !== px || node.y !== py || node.alpha !== alpha;
    node.visible = true;
    node.position.set(px, py);
    node.alpha = alpha;
    return changed;
  };
  return (clock, batch) => {
    const active = batch && batch.start <= clock && clock < batch.end;
    const elapsed = active ? Math.max(0, clock - epoch) : 0;
    const strike = active ? nextStrike(elapsed) : null;
    const age = strike ? elapsed - strike.time : Infinity;
    const emitting = active && age < 500;
    const base = strike ? geometry.origins[strike.origin] : geometry.origins[0];
    const origin = strike ? { x: base.x + strike.dx, y: base.y + strike.dy } : base;
    const flip = strike?.flip ?? 1;
    let changed = place(glow, emitting && age < 190, origin.x, origin.y, Math.max(0, 1 - age / 190));
    changed = place(flash, emitting && age < 65, origin.x, origin.y, Math.max(0, 1 - age / 65)) || changed;
    for (const particle of particles) {
      const t = age - particle.delay;
      const visible = emitting && t >= 0 && t < particle.life;
      if (!visible) {
        changed = place(particle.node, false) || changed;
        continue;
      }
      const x = origin.x + particle.vx * flip * t;
      const y = origin.y + particle.vy * t + 0.00022 * t * t;
      const alpha = Math.max(0, 1 - t / particle.life);
      changed = place(particle.node, true, x, y, alpha) || changed;
      const hotAlpha = Math.max(0, 1 - t / 155);
      if (particle.hot.alpha !== hotAlpha) {
        particle.hot.alpha = hotAlpha;
        changed = true;
      }
    }
    return changed;
  };
}

export function mountMiningAnimation(parent, textures, box, visuals, batch, session, readBatch) {
  const container = new Container();
  container.label = 'mining-animation';
  container.eventMode = 'none';
  container.position.set(box.x, box.y);
  const scene = new Container();
  const factor = Math.max(box.width, box.height) / visuals.sceneSize;
  scene.scale.set(factor);
  scene.position.set((box.width - visuals.sceneSize * factor) / 2, (box.height - visuals.sceneSize * factor) / 2);
  const clip = new Graphics().roundRect(0, 0, box.width, box.height, 10).fill(0xffffff);
  container.addChild(scene, clip);
  scene.mask = clip;
  const sprite = (texture, label) => {
    texture.source.scaleMode = 'nearest';
    const node = new Sprite({ texture, roundPixels: true });
    node.label = label;
    node.eventMode = 'none';
    scene.addChild(node);
    return node;
  };
  const background = sprite(textures.background, 'mining-background');
  background.width = visuals.sceneSize;
  background.height = visuals.sceneSize;
  const foreground = sprite(textures.foreground, 'mining-mouth-art');
  const rect = visuals.foreground.rect;
  foreground.position.set(rect.x, rect.y);
  foreground.width = rect.width;
  foreground.height = rect.height;
  const updateSparks = mountMiningSparks(scene, visuals.sparks, session?.startedAt ?? batch.start);
  const cart = sprite(textures.cart, 'mining-cart');
  const cargo = sprite(textures.icon, 'mining-canonical-cargo');
  parent.addChild(container);
  let previousPosition;
  let previousCargoAlpha;
  return {
    update({ clock }) {
      const currentBatch = readBatch ? readBatch() : batch;
      const activeBatch = currentBatch ?? batch;
      const sparksChanged = updateSparks(clock, currentBatch);
      const sample = sampleMiningAnimation({ session, batch: activeBatch, clock });
      if (previousPosition === sample.position && previousCargoAlpha === sample.cargoAlpha) return sparksChanged;
      previousPosition = sample.position;
      previousCargoAlpha = sample.cargoAlpha;
      const frame = miningFrame(visuals, sample);
      cart.position.set(frame.cart.x, frame.cart.y);
      cart.width = frame.cart.width;
      cart.height = frame.cart.height;
      cart.alpha = frame.cart.alpha;
      const icon = miningCargoRect(frame.cargo, textures.icon.width, textures.icon.height);
      cargo.position.set(icon.x, icon.y);
      cargo.width = icon.width;
      cargo.height = icon.height;
      cargo.alpha = icon.alpha;
      return true;
    },
    destroy() { container.destroy({ children: true }); },
  };
}
