const sceneKinds = new Set(['processing', 'refining', 'mine', 'field', 'livestock']);
const tau = Math.PI * 2;
const fadeSeconds = 0.04;
const sceneSeconds = { mine: 10 };
const maxCalls = 2;

function normalizedState(state) {
  if (!state || !sceneKinds.has(state.kind)) return null;
  // The two workshop pages share the exact original refining sound and key.
  const kind = state.kind === 'processing' ? 'refining' : state.kind;
  return { kind, key: `${kind}:` };
}
function noiseGenerator(key) {
  let seed = 2166136261;
  for (const letter of key) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
}

function softenEdges(samples, rate, seconds = 0.02) {
  const count = Math.min(Math.floor(rate * seconds), Math.floor(samples.length / 2));
  for (let index = 0; index < count; index += 1) {
    const gain = Math.sin(index / count * Math.PI / 2) ** 2;
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }
}

function limitPeak(samples, peak, allowBoost = true) {
  let maximum = 0;
  for (const sample of samples) maximum = Math.max(maximum, Math.abs(sample));
  if (!maximum || (!allowBoost && maximum <= peak)) return;
  const scale = peak / maximum;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= scale;
}

function fillRefining(samples, rate, random) {
  let lowNoise = 0;
  let lastNoise = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / rate;
    const white = random();
    lowNoise += (white - lowNoise) * 0.12;
    const highNoise = white - lastNoise;
    lastNoise = white;
    const stroke = t % 0.4;
    samples[index] = Math.sin(tau * 110 * t) * 0.09 + lowNoise * 0.14
      + (highNoise * 0.24 + Math.sin(tau * 1320 * t) * 0.08) * Math.exp(-stroke * 48)
      + lowNoise * Math.sin(tau * 2.5 * t) ** 4 * 0.24;
  }
  softenEdges(samples, rate);
  limitPeak(samples, 0.022);
}

function fillField(samples, rate, random) {
  const whiteNoise = new Float32Array(samples.length);
  for (let index = 0; index < whiteNoise.length; index += 1) whiteNoise[index] = random();
  const firstAlpha = 1 - Math.exp(-tau * 1400 / rate);
  const secondAlpha = 1 - Math.exp(-tau * 1800 / rate);
  const bassAlpha = 1 - Math.exp(-tau * 120 / rate);
  let first = 0;
  let second = 0;
  let bass = 0;
  // Warm up using exactly one complete copy of the periodic noise sequence.
  // The second pass continues those filter states; the loop has no zero window.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < samples.length; index += 1) {
      first += (whiteNoise[index] - first) * firstAlpha;
      second += (first - second) * secondAlpha;
      bass += (second - bass) * bassAlpha;
      if (!pass) continue;
      const t = index / rate;
      // Two and five full modulation cycles in the four-second buffer.
      const spray = 0.94 + 0.04 * Math.sin(tau * 0.5 * t) + 0.02 * Math.sin(tau * 1.25 * t);
      samples[index] = (second - bass * 0.7) * spray * 0.02;
    }
  }
  // Only reduce peaks; never amplify quiet water to the old common level.
  limitPeak(samples, 0.007, false);
}

function fillMine(samples, rate, random) {
  const workers = [
    { start: 0.08, interval: 1.41, level: 0.74, tone: 1.02, distance: 0.05 },
    { start: 0.34, interval: 1.89, level: 0.48, tone: 0.78, distance: 0.36 },
    { start: 0.92, interval: 2.23, level: 0.35, tone: 1.19, distance: 0.6 },
    { start: 1.17, interval: 1.64, level: 0.57, tone: 0.91, distance: 0.22 },
    { start: 0.57, interval: 2.67, level: 0.27, tone: 1.11, distance: 0.8 },
  ];
  const duration = samples.length / rate;
  function strike(start, level, tone, distance) {
    // Rock impacts, iron contact and short reflections are baked into one PCM.
    const reflections = [[0, 1], [0.047 + distance * 0.045, 0.13], [0.109 + distance * 0.055, 0.055]];
    for (let reflection = 0; reflection < reflections.length; reflection += 1) {
      const [delay, attenuation] = reflections[reflection];
      const origin = Math.floor((start + delay) * rate);
      let dullNoise = 0;
      for (let frame = 0; frame < Math.ceil(rate * 0.42); frame += 1) {
        const elapsed = frame / rate;
        const white = random();
        dullNoise += (white - dullNoise) * 0.12;
        const rock = (Math.sin(tau * 157 * tone * elapsed) * 0.52 + dullNoise * 0.9) * Math.exp(-elapsed * 28);
        const brightness = (1 - distance * 0.62) / (1 + reflection * 0.9);
        const iron = (Math.sin(tau * 1283 * tone * elapsed) * Math.exp(-elapsed * 48)
          + Math.sin(tau * 2137 * tone * elapsed) * Math.exp(-elapsed * 69) * 0.48
          + Math.sin(tau * 3271 * tone * elapsed) * Math.exp(-elapsed * 95) * 0.19
          + white * Math.exp(-elapsed * 150) * 0.25) * brightness;
        const attack = Math.min(1, elapsed * 1800);
        // Wrap the full impact and reflection tails across the loop boundary.
        samples[(origin + frame) % samples.length] += (rock + iron) * attack * level * attenuation;
      }
    }
  }
  for (const worker of workers) {
    let beat = 0;
    for (let time = worker.start; time < duration; beat += 1) {
      const tone = worker.tone * (1 + random() * 0.055);
      const level = worker.level * (0.82 + (random() + 1) * 0.14);
      strike(time, level, tone, worker.distance);
      if (beat % 4 === 2 && time + 0.18 < duration) strike(time + 0.18, level * 0.32, tone * 1.06, worker.distance);
      time += worker.interval * (1 + random() * 0.16);
    }
  }
  limitPeak(samples, 0.03);
}

// Source-filter voice: a harmonic glottal source (1/k roll-off) shaped by
// vowel formants, so the moo reads as a voiced call rather than
// low noisy pulses. Each call is normalised, then placed in the loop.
function renderCall(rate, random, call) {
  const frames = Math.ceil(call.duration * rate);
  const out = new Float32Array(frames);
  const nyquist = rate * 0.45;
  const jitter = 1 + random() * 0.03;
  // Harmonic weights change slowly, so refresh them every 32 frames; the
  // harmonics themselves use the sin(kθ) recurrence (one sin/cos per frame).
  const amps = new Float32Array(41);
  let harmonics = 0;
  let phase = 0;
  let lowNoise = 0;
  let lastNoise = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    const t = frame / rate;
    const p = t / call.duration;
    const vibrato = call.vibrato ? 1 + call.vibrato[1] * Math.sin(tau * call.vibrato[0] * t) : 1;
    const f0 = call.pitch(p) * call.scale * jitter * vibrato;
    phase = (phase + f0 / rate) % 1;
    if (frame % 32 === 0) {
      const formants = call.formants(p);
      harmonics = 0;
      for (let k = 1; k <= 40 && k * f0 < nyquist; k += 1) {
        let shape = 0;
        for (const [centre, width, level] of formants) {
          const offset = (k * f0 - centre) / width;
          shape += level / (1 + offset * offset);
        }
        amps[k] = shape / k;
        harmonics = k;
      }
    }
    const theta = tau * phase;
    const twoCos = 2 * Math.cos(theta);
    let previous = 0;
    let current = Math.sin(theta);
    let voiced = 0;
    for (let k = 1; k <= harmonics; k += 1) {
      voiced += current * amps[k];
      const next = twoCos * current - previous;
      previous = current;
      current = next;
    }
    const white = random();
    lowNoise += (white - lowNoise) * 0.35;
    const breath = (lowNoise - lastNoise) * (call.breath ?? 0) * (0.2 + Math.exp(-t * 40));
    lastNoise = lowNoise;
    const envelope = Math.max(0, Math.min(1, t / call.attack, (call.duration - t) / call.release));
    out[frame] = (voiced + breath) * envelope * envelope;
  }
  limitPeak(out, 1);
  return out;
}

const livestockCalls = {
  cow: {
    duration: 1.9, attack: 0.22, release: 0.6, vibrato: [5, 0.012], breath: 0.04,
    pitch: (p) => 105 + 22 * Math.sin(Math.PI * Math.min(1, p * 1.25)) - 12 * p,
    // Closed "mm" opening into "ooo".
    formants: (p) => {
      const open = Math.sin(Math.PI * Math.min(1, p * 1.4));
      return [[280 + 260 * open, 120, 1], [750 + 250 * open, 200, 0.45], [2400, 400, 0.05]];
    },
  },
};
const callLevels = { cow: 0.8 };
const clipPeak = 0.022;
const between = (low, high) => low + Math.random() * (high - low);

// One individual animal: its own pitch, body size (formant shift) and pace.
function individual(name, scale, size, stretch) {
  const base = livestockCalls[name];
  return { ...base, scale, duration: base.duration * stretch, attack: base.attack * stretch,
    release: base.release * stretch, formants: (p) => base.formants(p).map(([c, w, l]) => [c * size, w * size, l]) };
}

// Each species phrase is built fresh with random counts, gaps, pitch, size
// and pace, so no two renders repeat the same rhythm.
const livestockPhrases = {
  cow() {
    return [[0, individual('cow', between(0.8, 1.12), between(0.9, 1.1), between(0.7, 1.3)), 'cow']];
  },
};

function renderPhrase(rate, random, parts) {
  const calls = parts.map(([offset, call, name]) =>
    [Math.floor(offset * rate), renderCall(rate, random, call), callLevels[name]]);
  const samples = new Float32Array(Math.max(...calls.map(([origin, call]) => origin + call.length)));
  for (const [origin, call, level] of calls) {
    for (let frame = 0; frame < call.length; frame += 1) samples[origin + frame] += call[frame] * level;
  }
  limitPeak(samples, clipPeak * Math.max(...calls.map(([, , level]) => level)));
  return samples;
}

// Two cows with sparse random exponential gaps: an occasional moo, rarely
// answered by the other.
const livestockStreams = [
  { species: ['cow'], mean: 10, min: 4 },
  { species: ['cow'], mean: 14, min: 5 },
];
// When one animal calls, others of its kind often answer within a moment.
const answerChance = 0.15;
const variantsPerSpecies = 5;

function fillScene(samples, rate, kind, random) {
  if (kind === 'refining') fillRefining(samples, rate, random);
  else if (kind === 'field') fillField(samples, rate, random);
  else fillMine(samples, rate, random);
}

// Exactly one production scene plays at a time. Loop scenes use one looping
// source; livestock uses one gain chain fed by randomly timed call clips (at
// most two overlapping), independent of how many animals are kept. Rain,
// music and direct interaction sounds stay on their own paths.
export function createProductionSoundscape({ getContext, getBus, isEnabled }) {
  const buffers = new Map(); // The three fixed scene loops plus livestock clips.
  let desired = null;
  let voice;

  function bufferFor(context, state) {
    const rate = Math.min(context.sampleRate, 24000);
    const kind = state.kind;
    if (buffers.has(kind)) return buffers.get(kind);
    const buffer = context.createBuffer(1, Math.ceil(rate * (sceneSeconds[kind] ?? 4)), rate);
    const samples = buffer.getChannelData(0);
    const random = noiseGenerator(kind);
    fillScene(samples, rate, kind, random);
    buffers.set(kind, buffer);
    return buffer;
  }

  // Up to five variants per species, each rendered the first time it is
  // needed (at most one new render per scheduler tick), then reused.
  function livestockVariant(context, species, allowRender) {
    const pools = buffers.get('livestock') ?? {};
    buffers.set('livestock', pools);
    const pool = pools[species] ??= [];
    if (allowRender && pool.length < variantsPerSpecies) {
      const rate = Math.min(context.sampleRate, 24000);
      const samples = renderPhrase(rate, noiseGenerator('livestock:' + species + pool.length), livestockPhrases[species]());
      const buffer = context.createBuffer(1, samples.length, rate);
      buffer.getChannelData(0).set(samples);
      pool.push(buffer);
      return buffer;
    }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  const nextGap = (stream) => stream.min - Math.log(1 - Math.random()) * stream.mean;

  // Every call plays at the same level; no distance filtering.
  function playCall(current, buffer) {
    const context = getContext();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = between(0.9, 1.1);
    source.connect(current.gain);
    current.calls.add(source);
    source.onended = () => {
      source.disconnect();
      current.calls.delete(source);
    };
    source.start(context.currentTime + Math.random() * 0.08);
  }

  // One timer drives every stream; each stream fires when its own random
  // gap has elapsed.
  function scheduleCall(current) {
    if (voice !== current || current.stopping) return;
    const now = performance.now() / 1000;
    let rendered = false;
    current.streams ??= livestockStreams.map((stream) => ({ stream, due: now + Math.random() * nextGap(stream) }));
    for (const entry of current.streams) {
      if (now < entry.due) continue;
      entry.due = now + nextGap(entry.stream);
      if (current.calls.size >= maxCalls) continue;
      const species = entry.stream.species[Math.floor(Math.random() * entry.stream.species.length)];
      const buffer = livestockVariant(getContext(), species, !rendered);
      if (!buffer) continue;
      rendered ||= (buffers.get('livestock')[species].at(-1) === buffer);
      playCall(current, buffer);
      for (const other of current.streams) {
        if (other !== entry && other.stream.species.includes(species) && Math.random() < answerChance) {
          other.due = Math.min(other.due, now + between(0.1, 0.7));
        }
      }
    }
    current.timer = setTimeout(() => scheduleCall(current), 90);
  }

  function silenceCalls(current) {
    clearTimeout(current.timer);
    for (const source of current.calls) source.stop();
  }

  function releaseVoice(current) {
    for (const source of current.calls) {
      source.onended = null;
      source.disconnect();
    }
    current.calls.clear();
    current.gain.disconnect();
  }

  function stopVoice(fade) {
    if (!voice) return;
    const current = voice;
    const context = getContext();
    if (fade && current.stopping) return;
    current.stopping = true;
    if (fade && context.state === 'running') {
      const now = context.currentTime;
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setTargetAtTime(0, now, 0.008);
      if (current.source) {
        current.source.stop(now + fadeSeconds);
        return; // The ended handler starts only the latest desired scene.
      }
      clearTimeout(current.timer);
      current.timer = setTimeout(() => {
        silenceCalls(current);
        releaseVoice(current);
        if (voice !== current) return;
        voice = undefined;
        sync();
      }, fadeSeconds * 1000);
      return;
    }
    // Suspended contexts cannot deliver ended until resumed. Disconnect now,
    // so visibility/mute changes leave no live production path or pending work.
    if (current.source) {
      current.source.stop();
      current.source.disconnect();
      current.gain.disconnect();
    } else {
      silenceCalls(current);
      releaseVoice(current);
    }
    voice = undefined;
  }

  function sync() {
    const context = getContext();
    if (!desired || !context || !isEnabled()) {
      stopVoice(false);
      return;
    }
    if (voice) {
      if (voice.key !== desired.key || voice.stopping) stopVoice(true);
      return;
    }
    const state = desired;
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, context.currentTime, 0.012);
    gain.connect(getBus());
    if (state.kind === 'livestock') {
      const current = { gain, key: state.key, stopping: false, calls: new Set(), timer: undefined };
      voice = current;
      // First call comes after the page switch, never inside the tap itself.
      current.timer = setTimeout(() => scheduleCall(current), 300 + Math.random() * 900);
      return;
    }
    const source = context.createBufferSource();
    source.buffer = bufferFor(context, state);
    source.loop = true;
    source.connect(gain);
    const current = { source, gain, key: state.key, stopping: false };
    voice = current;
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (voice !== current) return;
      voice = undefined;
      sync();
    };
    source.start();
  }

  return {
    setState(state) {
      const next = normalizedState(state);
      if (next?.key === desired?.key) return;
      desired = next;
      sync();
    },
    sync,
  };
}
