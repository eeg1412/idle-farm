// Pure display geometry, also consumed by static art review. Time is visible-map
// time, never world/economy time. Callers can reuse `out` in the frame path.
export const estateAtmosphereTiming = Object.freeze({
  firstBirdMs: 0, passEveryMs: 19200, flightMs: 2450, birdDelayMs: 190, flapMs: 90,
});
export const estateBirdCount = 3;

export function estateBirdPassAt(time) {
  const { firstBirdMs, passEveryMs } = estateAtmosphereTiming;
  return time < firstBirdMs ? -1 : Math.floor((time - firstBirdMs) / passEveryMs);
}

// Pure route construction: runtime supplies five fresh display-only random
// samples once per pass. Static review can supply the exact same samples.
export function estateBirdRoute(width, viewportTop, viewportHeight, samples, out = {}) {
  const low = viewportTop + Math.min(viewportHeight * 0.16, width * 0.25);
  const high = Math.max(low, viewportTop + viewportHeight - Math.min(viewportHeight * 0.20, width * 0.35));
  out.direction = samples[2] < 0.5 ? 1 : -1;
  out.startX = width * (out.direction > 0 ? -0.10 : 1.10);
  out.endX = width * (out.direction > 0 ? 1.10 : -0.10);
  out.startY = low + (high - low) * samples[0];
  out.endY = Math.max(low, Math.min(high, out.startY + (samples[1] * 2 - 1) * width * 0.34));
  out.formationGap = width * (0.035 + samples[3] * 0.02);
  out.curve = width * (samples[4] * 2 - 1) * 0.028;
  return out;
}

export function estateBirdPose(time, index, width, route, out = {}) {
  const { firstBirdMs, passEveryMs, flightMs, birdDelayMs, flapMs } = estateAtmosphereTiming;
  const sinceFirst = time - firstBirdMs;
  const pass = Math.max(0, Math.floor(sinceFirst / passEveryMs));
  const local = sinceFirst - pass * passEveryMs - index * birdDelayMs;
  const progress = Math.max(0, Math.min(1, local / flightMs));
  out.visible = sinceFirst >= 0 && local >= 0 && local < flightMs;
  out.pass = sinceFirst < 0 ? -1 : pass;
  out.frame = Math.floor(Math.max(0, local) / flapMs + index) % 4;
  // The native bird occupies 75–91 of 128 pixels, so a 41–46px
  // frame gives an actual 24–33px bird on the supported phone widths.
  out.size = Math.max(42, Math.min(46, width * 0.115)) - index * 0.5;
  out.direction = route.direction;
  out.x = route.startX + (route.endX - route.startX) * progress;
  out.y = route.startY + (route.endY - route.startY) * progress +
    index * route.formationGap + Math.sin(progress * Math.PI) * route.curve;
  out.alpha = 0.82;
  return out;
}
