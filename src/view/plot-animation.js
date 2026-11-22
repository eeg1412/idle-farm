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
// There is no display floor: every crop animation follows the real batch duration.
const plotStageCount = 4;
// Short-batch tiers: each shown stage needs at least `stageMinMs`, plus one
// spare second. Full: N stages; first/last: stages 0 and N-1; else last only.
const stageMinMs = 1000;
const tierSpareMs = 1000;

function shownStages(duration, count) {
  if (duration >= count * stageMinMs + tierSpareMs) return Array.from({ length: count }, (_, index) => index);
  if (count > 1 && duration >= 2 * stageMinMs + tierSpareMs) return [0, count - 1];
  return [count - 1];
}

function stageAt(shown, phase, duration) {
  return shown[Math.min(shown.length - 1, Math.floor(phase * shown.length / duration))];
}
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

function smoothstep(progress) {
  const bounded = Math.max(0, Math.min(1, progress));
  return bounded * bounded * (3 - 2 * bounded);
}

// The phase always follows the real batch (`batch.start`/`batch.end`, or the
// persistent first-planting window).
export function samplePlotAnimation({ batch, clock, plantingSession, harvestMode }) {
  const duration = Math.max(1, batch.end - batch.start);
  const last = plotStageCount - 1;
  if (harvestMode === 'retainedPlant') {
    const firstDuration = Math.max(1, plantingSession.duration);
    const firstElapsed = Math.max(0, clock - plantingSession.start);
    if (firstElapsed >= firstDuration) {
      // Repeats have two states, bare adult then fruit/flower. Below 3 s only
      // the mature state stays, without a per-batch fade.
      if (shownStages(duration, 2).length === 1) {
        return { stage: last, wholeAlpha: 1, matureAlpha: 1, bareVisible: true, repeated: true };
      }
      const phase = Math.max(0, clock - batch.start) % duration;
      const appears = smoothstep((phase - duration / 2) / harvestFadeMs);
      const disappears = smoothstep((phase - (duration - harvestGapMs - harvestFadeMs)) / harvestFadeMs);
      return { stage: last, wholeAlpha: 1, matureAlpha: appears * (1 - disappears), bareVisible: true, repeated: true };
    }
    const shown = shownStages(firstDuration, plotStageCount);
    const stage = stageAt(shown, firstElapsed, firstDuration);
    if (shown.length === 1) return { stage, wholeAlpha: 1, matureAlpha: 1, bareVisible: true, repeated: false };
    const remaining = firstDuration - firstElapsed;
    const harvestAlpha = 1 - smoothstep(1 - (remaining - harvestGapMs) / harvestFadeMs);
    return { stage, wholeAlpha: 1, matureAlpha: stage === last ? harvestAlpha : 1, bareVisible: stage === last, repeated: false };
  }
  const shown = shownStages(duration, plotStageCount);
  const phase = Math.max(0, clock - batch.start) % duration;
  const stage = stageAt(shown, phase, duration);
  // Last-only batches keep the mature crop opaque; fading it every batch would flash.
  if (shown.length === 1) return { stage, wholeAlpha: 1, matureAlpha: 1, bareVisible: false, repeated: false };
  const remaining = duration - phase;
  return {
    stage, wholeAlpha: stage === last ? 1 - smoothstep(1 - (remaining - harvestGapMs) / harvestFadeMs) : 1,
    matureAlpha: 1, bareVisible: false, repeated: false,
  };
}

function mountIndividualPlants(parent, textures, { x, y, width, height }, batch, plantingSession) {
  const { shared, plants, visual, bare } = textures;
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
    sprite.eventMode = 'none';
    sprite.position.set(left, top);
    scene.addChild(sprite);
    return sprite;
  };
  addSprite(shared.get('sky'));
  addSprite(shared.get('ground'));
  const backPlants = new Container();
  backPlants.label = 'crop-back-plants';
  backPlants.eventMode = 'none';
  scene.addChild(backPlants);
  addSprite(shared.get('sprinkler-base'), sprinklerX, sprinklerY);
  const head = addSprite(shared.get(directions[0].key), sprinklerX, sprinklerY);
  const water = new Container();
  water.visible = false;
  water.eventMode = 'none';
  scene.addChild(water);
  const frontPlants = new Container();
  frontPlants.label = 'crop-front-plants';
  frontPlants.eventMode = 'none';
  scene.addChild(frontPlants);

  for (const texture of plants) texture.source.scaleMode = 'nearest';
  if (bare) bare.source.scaleMode = 'nearest';
  // Each root owns its own sprite; only the four single-plant textures are
  // shared. No repeated plants or field placement are baked into a texture.
  const instances = [...visual.roots].sort((left, right) => left.y - right.y || left.x - right.x)
    .map((point) => {
      const group = new Container();
      group.label = 'crop-root-' + point.row + '-' + point.column;
      group.eventMode = 'none';
      group.position.set(point.x, point.y);
      const shadow = new Graphics();
      shadow.eventMode = 'none';
      const plant = new Sprite({ texture: plants[0], roundPixels: true });
      plant.label = 'crop-plant';
      plant.eventMode = 'none';
      let barePlant;
      if (visual.harvestMode === 'retainedPlant') {
        const stage = visual.repeatBare;
        const matureStage = visual.stages[3];
        const matureScale = Math.min(matureStage.baseScale * point.scale, point.maxHeight / matureStage.height);
        // Even the far-row height cap is shared with the mature body. Fitting a
        // bare silhouette separately here would change its size after picking.
        const scale = matureScale * stage.registration.scaleToMature;
        barePlant = new Sprite({ texture: bare, roundPixels: true });
        barePlant.label = 'crop-retained-body';
        barePlant.eventMode = 'none';
        barePlant.pivot.set(stage.anchorX, stage.anchorY);
        barePlant.scale.set(scale);
        barePlant.visible = false;
        group.addChild(shadow, barePlant, plant);
      } else group.addChild(shadow, plant);
      (point.y >= footY ? frontPlants : backPlants).addChild(group);
      return { point, plant, barePlant, shadow };
    });
  let growthStage;
  const applyStage = (index) => {
    if (growthStage === index) return;
    const stage = visual.stages[index];
    for (const { point, plant, shadow } of instances) {
      // Anchors are measured once during source export, never per frame. A
      // stage changes texture, size and pivot; the root container stays put.
      const scale = Math.min(stage.baseScale * point.scale, point.maxHeight / stage.height);
      plant.texture = plants[index];
      plant.pivot.set(stage.anchorX, stage.anchorY);
      plant.scale.set(scale);
      const radius = Math.min(14, Math.max(2, Math.floor(stage.width * scale / 5)));
      shadow.clear().ellipse(0, 0.5, radius, 1.5).fill({ color: 0x3a1d0c, alpha: (45 + index * 14) / 255 });
    }
    growthStage = index;
  };
  applyStage(samplePlotAnimation({
    batch, clock: batch.start, plantingSession, harvestMode: visual.harvestMode,
  }).stage);
  parent.addChild(container);
  const particles = [];
  let lastSprayFrame;

  return {
    container,
    update({ clock, now }) {
      const sample = samplePlotAnimation({ batch, clock, plantingSession, harvestMode: visual.harvestMode });
      applyStage(sample.stage);
      for (const { plant, barePlant } of instances) {
        plant.alpha = sample.matureAlpha;
        if (barePlant) barePlant.visible = sample.bareVisible;
      }
      // Whole-plant crops fade the planted layer. Retained crops keep a fully
      // opaque adult body below the fruit/flower state at every harvest edge.
      backPlants.alpha = sample.wholeAlpha;
      frontPlants.alpha = sample.wholeAlpha;
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

export function mountPlotAnimation(parent, textures, { x, y, width, height }, batch, plantingSession) {
  if (textures.visual?.mode === 'individual') {
    return mountIndividualPlants(parent, textures, { x, y, width, height }, batch, plantingSession);
  }
  const { shared, stages, frontStages } = textures;
  const duration = Math.max(1, batch.end - batch.start);
  const shown = shownStages(duration, stages.length);
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
      const elapsed = Math.max(0, clock - batch.start);
      const elapsedInCycle = elapsed % duration;
      const growthIndex = stageAt(shown, elapsedInCycle, duration);
      const growthTexture = stages[growthIndex];
      if (crop.texture !== growthTexture) crop.texture = growthTexture;
      const foregroundTexture = frontStages[growthIndex];
      if (foreground.texture !== foregroundTexture) foreground.texture = foregroundTexture;

      let cropAlpha = 1;
      // Last-only batches keep the mature crop opaque instead of fading every batch.
      if (shown.length > 1 && growthIndex === stages.length - 1) {
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
