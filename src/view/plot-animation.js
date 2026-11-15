import { Container, Graphics, GraphicsContext, Sprite } from 'pixi.js';

export const plotFrameSize = 320;
const sprinklerX = 128;
const sprinklerY = 140;
const axisX = sprinklerX + 32;
const axisY = sprinklerY + 26;
const footX = sprinklerX + 32;
const footY = sprinklerY + 51;

// Nozzle offsets are measured from the shared head axis in the 64 × 64 textures.
const directions = [
  { key: 'sprinkler-ne', nozzle: [14, -11], reachX: 89, reachY: -28 },
  { key: 'sprinkler-se', nozzle: [13, 8], reachX: 91, reachY: 45 },
  { key: 'sprinkler-sw', nozzle: [-13, 8], reachX: -91, reachY: 45 },
  { key: 'sprinkler-nw', nozzle: [-14, -11], reachX: -89, reachY: -28 },
];
const harvestFadeMs = 300;
const harvestGapMs = 30;
export const minPlotAnimationMs = 5000;
export const plotSharedTextureKeys = [
  'sky', 'ground', 'sprinkler-base', ...directions.map(({ key }) => key),
];

const gravity = 1000;
const emissionMs = 90;
const splashMs = 180;
const sprayFrameMs = 1000 / 30;
const spraySpread = [
  { reach: 0.88, skew: -0.04, flightMs: 520 },
  { reach: 1.04, skew: 0.02, flightMs: 580 },
  { reach: 0.76, skew: 0.05, flightMs: 480 },
  { reach: 0.97, skew: -0.03, flightMs: 560 },
  { reach: 0.83, skew: 0.01, flightMs: 500 },
];
const cycleMs = directions.length * spraySpread.length * emissionMs;
const particleCount = Math.ceil((Math.max(...spraySpread.map(({ flightMs }) => flightMs)) + splashMs) / emissionMs);
const waterOutline = 0x376477;
const waterFill = 0x88cfe3;
const waterHighlight = 0xd3eff3;

const trajectories = directions.flatMap(({ nozzle, reachX, reachY }) => {
  const [nozzleX, nozzleY] = nozzle;
  const startX = axisX + nozzleX;
  const startY = axisY + nozzleY;
  return spraySpread.map(({ reach, skew, flightMs }) => {
    const landX = footX + reachX * reach - reachY * skew;
    const landY = footY + reachY * reach + reachX * skew * 0.55;
    const seconds = flightMs / 1000;
    return {
      startX, startY, landX, landY, flightMs,
      velocityX: (landX - startX) / seconds,
      velocityY: (landY - startY) / seconds - gravity * seconds / 2,
    };
  });
});

const dropShape = new GraphicsContext()
  .poly([-4, 0, -2.3, -1.4, 0, -1.9, 2, -1.6, 2.9, 0, 2, 1.6, 0, 1.9, -2.3, 1.4])
  .fill(waterFill).stroke({ color: waterOutline, width: 1.2 })
  .moveTo(-1.3, -0.6).lineTo(0.9, -0.8).stroke({ color: waterHighlight, width: 0.8 });
const splashShape = new GraphicsContext()
  .ellipse(0, 0, 4.8, 1.35).fill(waterFill).stroke({ color: waterOutline, width: 1 })
  .poly([-2.7, -1, -6, -2.2, -5, -3.7, -3.4, -2.9]).fill(waterFill)
  .stroke({ color: waterOutline, width: 0.9 })
  .poly([2.1, -1, 3.5, -3.7, 5.4, -4.1, 5.3, -2.6]).fill(waterHighlight)
  .stroke({ color: waterOutline, width: 0.9 });

function makeParticle(layer) {
  const drop = new Graphics(dropShape);
  const splash = new Graphics(splashShape);
  layer.addChild(drop, splash);
  return { drop, splash };
}

function drawWater(layer, particles, time) {
  const latest = Math.floor(time / emissionMs);
  for (let offset = 0; offset < particleCount; offset += 1) {
    // Each droplet keeps the direction the head faced at its emission time.
    const emission = latest - offset;
    const arc = trajectories[emission % trajectories.length];
    const age = time - emission * emissionMs;
    const inFlight = age < arc.flightMs;
    const splashing = !inFlight && age < arc.flightMs + splashMs;
    if (!particles[offset] && (inFlight || splashing)) particles[offset] = makeParticle(layer);
    const particle = particles[offset];
    if (!particle) continue;
    const { drop, splash } = particle;
    drop.visible = inFlight;
    splash.visible = splashing;
    if (inFlight) {
      const seconds = age / 1000;
      const velocityY = arc.velocityY + gravity * seconds;
      drop.position.set(arc.startX + arc.velocityX * seconds,
        arc.startY + (arc.velocityY + velocityY) * seconds / 2);
      drop.rotation = Math.atan2(velocityY, arc.velocityX);
    } else if (splashing) {
      const progress = (age - arc.flightMs) / splashMs;
      splash.position.set(arc.landX, arc.landY);
      splash.scale.set(0.72 + 0.48 * progress, 0.8 + 0.3 * Math.sin(Math.PI * progress));
      splash.alpha = 1 - progress;
    }
  }
}

export function mountPlotAnimation(parent, textures, { x, y, width, height }, batch, animationStart = batch.start) {
  const { shared, stages, frontStages } = textures;
  const duration = Math.max(batch.end - batch.start, minPlotAnimationMs);
  const container = new Container();
  container.label = 'plot-animation';
  container.eventMode = 'none';
  container.position.set(x, y);
  const clip = new Graphics().roundRect(0, 0, width, height, 10).fill(0xffffff);
  const scene = new Container();
  const factor = Math.max(width, height) / plotFrameSize;
  scene.scale.set(factor);
  scene.position.set((width - plotFrameSize * factor) / 2, (height - plotFrameSize * factor) / 2);
  container.addChild(scene, clip);
  scene.mask = clip;

  const addSprite = (texture, left = 0, top = 0) => {
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.position.set(left, top);
    scene.addChild(sprite);
    return sprite;
  };
  addSprite(shared.get('sky'));
  addSprite(shared.get('ground'));
  const crop = addSprite(stages[0]);
  crop.visible = batch.id !== 'C01';
  addSprite(shared.get('sprinkler-base'), sprinklerX, sprinklerY);
  const head = addSprite(shared.get(directions[0].key), sprinklerX, sprinklerY);
  const water = new Container();
  water.visible = false;
  scene.addChild(water);
  // Whole plants rooted in front of the sprinkler cover both its hardware and
  // the spray. Their crowns stay intact instead of being cut at a screen row.
  const foreground = addSprite(frontStages[0]);
  parent.addChild(container);

  const particles = [];
  let lastSprayFrame;

  return {
    container,
    update({ clock, now }) {
      const elapsed = Math.max(0, clock - animationStart);
      const elapsedInCycle = elapsed % duration;
      const growthIndex = Math.floor(elapsedInCycle * stages.length / duration);
      const growthTexture = stages[growthIndex];
      if (crop.texture !== growthTexture) crop.texture = growthTexture;
      const foregroundTexture = frontStages[growthIndex];
      if (foreground.texture !== foregroundTexture) foreground.texture = foregroundTexture;

      let cropAlpha = 1;
      if (growthIndex === stages.length - 1) {
        const remaining = duration - elapsedInCycle;
        const progress = Math.max(0, Math.min(1, 1 - (remaining - harvestGapMs) / harvestFadeMs));
        cropAlpha = 1 - progress * progress * (3 - 2 * progress);
      }
      crop.alpha = cropAlpha;
      foreground.alpha = cropAlpha;

      const frame = Math.floor(now / sprayFrameMs);
      if (frame === lastSprayFrame) return;
      lastSprayFrame = frame;
      water.visible = true;
      const time = now % cycleMs + cycleMs;
      const direction = directions[Math.floor(time / (emissionMs * spraySpread.length)) % directions.length];
      const headTexture = shared.get(direction.key);
      if (head.texture !== headTexture) head.texture = headTexture;
      drawWater(water, particles, time);
    },
    destroy() {
      if (container.destroyed) return;
      scene.mask = null;
      clip.destroy();
      container.destroy({ children: true });
    },
  };
}
