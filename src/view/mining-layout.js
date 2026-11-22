// Pure display geometry and clock shared by Pixi and the offline keyframe compositor.
// This module never reads or mutates the economic world.
// Minimum real batch time for the full trip (2 s entry/exit, 300 ms unload, 1 s stay).
// Shorter batches show only the arrival frame; the batch is never stretched.
export const minMiningAnimationMs = 5300;
export const miningTravelMs = 2000;
export const miningUnloadMs = 300;
export const miningDwellMs = 1000;

export function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function sampleMiningAnimation({ session, batch, clock }) {
  const startedAt = session?.startedAt ?? batch.start;
  const duration = batch.end - batch.start;
  const elapsed = Math.max(0, clock - startedAt);
  const batchElapsed = Math.max(0, clock - batch.start);
  // Below the minimum display time the cart is not driven at all: it stays at
  // the unloading station with its cargo, the frame of arrival. No entry,
  // travel or unload fade plays, so consecutive short batches never flash.
  if (duration < minMiningAnimationMs) {
    return { duration, elapsed, phase: batchElapsed, first: false, position: 1, cargoAlpha: 1, stage: 'arrived' };
  }
  // Batches of at least 5.3 s track the live saved economic window, including future speed changes.
  const first = batch.start === startedAt && batchElapsed < duration;
  const phase = batchElapsed % duration;
  let position = 0; // 0: inside the mine, 1: unloading station.
  let cargoAlpha = 0;
  let stage = 'inside';
  if (first && phase < miningTravelMs) {
    position = 1 - smoothstep(phase / miningTravelMs);
    stage = 'first-entry';
  } else if (!first && phase < miningUnloadMs + miningDwellMs) {
    position = 1;
    cargoAlpha = 1 - smoothstep(phase / miningUnloadMs);
    stage = phase < miningUnloadMs ? 'unload' : 'station';
  } else if (!first && phase < miningUnloadMs + miningDwellMs + miningTravelMs) {
    position = 1 - smoothstep((phase - miningUnloadMs - miningDwellMs) / miningTravelMs);
    stage = 'return';
  } else if (phase >= duration - miningTravelMs) {
    position = smoothstep((phase - duration + miningTravelMs) / miningTravelMs);
    cargoAlpha = 1;
    stage = 'outbound';
  }
  return { duration, elapsed, phase, first, position, cargoAlpha, stage };
}

export function miningFrame(visuals, sample) {
  const { inside, station } = visuals.track;
  const { left, right } = visuals.opening;
  const t = sample.position;
  const scale = (inside.scale ?? 1) + ((station.scale ?? 1) - (inside.scale ?? 1)) * t;
  const anchorX = inside.x + (station.x - inside.x) * t;
  const anchorY = inside.y + (station.y - inside.y) * t;
  const cartX = anchorX - visuals.cart.anchorX * scale;
  const leadingEdgeX = cartX + visuals.cart.visibleLeftX * scale;
  const cartAlpha = smoothstep((leadingEdgeX - left) / (right - left));
  const cart = {
    x: cartX,
    y: anchorY - visuals.cart.anchorY * scale,
    width: visuals.cart.width * scale, height: visuals.cart.height * scale, alpha: cartAlpha,
  };
  const box = visuals.cart.cargo;
  const cargo = { x: cart.x + (box.x - box.width * (box.anchorX ?? 0)) * scale,
    y: cart.y + (box.y - box.height * (box.anchorY ?? 0)) * scale,
    width: box.width * scale, height: box.height * scale, alpha: sample.cargoAlpha * cartAlpha };
  return { cart, cargo, foreground: visuals.foreground.rect, scale };
}

// Fit the complete canonical icon, preserving its original transparent padding.
export function miningCargoRect(box, width, height) {
  const scale = Math.min(box.width / width, box.height / height);
  return { x: box.x + (box.width - width * scale) / 2, y: box.y + (box.height - height * scale) / 2,
    width: width * scale, height: height * scale, alpha: box.alpha };
}
