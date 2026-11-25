import { pageTracks } from '../content/page-bgm.js';
import { createProductionSoundscape } from './production-soundscape.js';

const farmScore = [60, 64, 67, 72, 69, 67, 64, 62, 60, 65, 69, 72, 74, 72, 69, 67];
const musicLookahead = 0.12;
const musicTickMs = 25;
const musicFadeSeconds = 0.04;
// Page-to-page track change: the old score keeps playing and fades out while the new one fades in.
const musicCrossfadeSeconds = 1.5;
const musicGainMultiplier = 1.6;
const effects = {
  success: [60, 67], sell: [74, 77, 81],
  research: [60, 64, 67, 72], prestige: [55, 60, 64, 67, 72],
};
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

export function createFarmAudio() {
  let audio;
  let volume = { music: 0, sound: 0 };
  let track = 'farm';
  let musicSchedule;
  const fadingSchedules = new Set();
  let visible = !document.hidden;
  let musicBus;
  let effectsBus;
  let lastTyping = -Infinity;
  let typingPulse;
  let rainAmount = 0;
  let rainBuffer;
  let rainVoice;
  const productionAmbience = createProductionSoundscape({
    getContext: () => audio,
    getBus: () => effectsBus,
    isEnabled: () => audio?.state === 'running' && visible && volume.sound > 0,
  });

  function syncRain() {
    const active = audio?.state === 'running' && visible && volume.sound > 0 && rainAmount > 0;
    if (!active) {
      if (!rainVoice || rainVoice.stopping) return;
      rainVoice.stopping = true;
      const now = audio.currentTime;
      rainVoice.gain.gain.setTargetAtTime(0, now, 0.02);
      rainVoice.source.stop(now + 0.1);
      return;
    }
    // A stopped BufferSource cannot be restarted. Let its short fade finish
    // before replacing it, including rapid page/volume/visibility changes.
    if (rainVoice?.stopping) return;
    if (!rainVoice) {
      if (!rainBuffer) {
        rainBuffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
        const samples = rainBuffer.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
      }
      const source = audio.createBufferSource();
      const highpass = audio.createBiquadFilter();
      const lowpass = audio.createBiquadFilter();
      const gain = audio.createGain();
      source.buffer = rainBuffer;
      source.loop = true;
      highpass.type = 'highpass';
      highpass.frequency.value = 180;
      highpass.Q.value = 0.5;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1800;
      lowpass.Q.value = 0.5;
      gain.gain.value = 0;
      source.connect(highpass).connect(lowpass).connect(gain).connect(effectsBus);
      const voice = { source, highpass, lowpass, gain, level: -1, stopping: false };
      rainVoice = voice;
      source.onended = () => {
        source.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        gain.disconnect();
        if (rainVoice === voice) {
          rainVoice = undefined;
          syncRain();
        }
      };
      source.start();
    }
    if (rainVoice.level !== rainAmount) {
      const increasing = rainAmount > rainVoice.level;
      rainVoice.level = rainAmount;
      rainVoice.gain.gain.setTargetAtTime(rainAmount * 0.006, audio.currentTime, increasing ? 0.8 : 0.055);
    }
  }

  function note(value, start, duration, bus, type, level, attack = 0.035, schedule) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const rise = Math.min(attack, duration);
    oscillator.type = type;
    oscillator.frequency.value = hz(value);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + rise);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(bus);
    const voice = { oscillator, gain, start, duration, level, attack: rise, stopping: false };
    if (schedule) schedule.voices.add(voice);
    // Keep the onended property available for the dialogue pulse's own cleanup.
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
      if (!schedule) return;
      schedule.voices.delete(voice);
      if (schedule.retired && !schedule.voices.size) schedule.gain.disconnect();
    }, { once: true });
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    return oscillator;
  }

  function applyVolume() {
    if (!audio) return;
    musicBus.gain.setTargetAtTime(volume.music / 100 * musicGainMultiplier * (visible ? 1 : 0), audio.currentTime, 0.03);
    effectsBus.gain.setTargetAtTime(volume.sound / 100 * (visible ? 1 : 0), audio.currentTime, 0.03);
  }

  // Quickly silences one schedule: stops its tick, fades its voices in 40 ms and
  // releases its gain node once the last voice has ended.
  function haltSchedule(schedule) {
    clearTimeout(schedule.timer);
    schedule.timer = undefined;
    schedule.retired = true;
    fadingSchedules.delete(schedule);
    if (musicSchedule === schedule) musicSchedule = undefined;
    const now = audio.currentTime;
    for (const voice of schedule.voices) {
      if (voice.stopping) continue;
      voice.stopping = true;
      const { oscillator, gain, start, duration, level, attack } = voice;
      gain.gain.cancelScheduledValues(now);
      if (start >= now) {
        gain.gain.setValueAtTime(0, now);
        oscillator.stop(now);
        continue;
      }
      // Evaluate this note's original envelope before replacing its automation.
      // This also works where AudioParam.cancelAndHoldAtTime is unavailable.
      const elapsed = now - start;
      const current = elapsed < attack ? level * elapsed / attack
        : elapsed >= duration ? 0.0001
          : level * (0.0001 / level) ** ((elapsed - attack) / (duration - attack));
      gain.gain.setValueAtTime(current, now);
      gain.gain.linearRampToValueAtTime(0, now + musicFadeSeconds);
      oscillator.stop(Math.min(start + duration + 0.01, now + musicFadeSeconds));
    }
    if (!schedule.voices.size) schedule.gain.disconnect();
  }

  // Fast stop for music off, background and non-running audio: current and fading schedules.
  function stopMusic() {
    if (musicSchedule) haltSchedule(musicSchedule);
    musicSchedule = undefined;
    for (const schedule of [...fadingSchedules]) haltSchedule(schedule);
  }

  // Value of a schedule gain's linear ramp at a context time.
  function scheduleGainAt(schedule, time) {
    const { from, to, start, end } = schedule.ramp;
    if (time >= end) return to;
    if (time <= start) return from;
    return from + (to - from) * (time - start) / (end - start);
  }

  // Ramps linearly from the gain's current value to `to` over the crossfade time.
  function rampScheduleGain(schedule, to, now) {
    const from = scheduleGainAt(schedule, now);
    const end = now + musicCrossfadeSeconds;
    schedule.ramp = { from, to, start: now, end };
    schedule.gain.gain.cancelScheduledValues(now);
    schedule.gain.gain.setValueAtTime(from, now);
    schedule.gain.gain.linearRampToValueAtTime(to, end);
  }

  // The schedule keeps adding notes while its gain falls to 0, then is halted.
  function fadeOutSchedule(schedule) {
    rampScheduleGain(schedule, 0, audio.currentTime);
    schedule.fadeEnd = schedule.ramp.end;
    fadingSchedules.add(schedule);
  }

  function musicEnabled() {
    return audio?.state === 'running' && visible && volume.music > 0;
  }

  function scheduleMusic(schedule) {
    const fading = fadingSchedules.has(schedule);
    if (musicSchedule !== schedule && !fading) return;
    schedule.timer = undefined;
    if (!musicEnabled()) { stopMusic(); return; }
    const now = audio.currentTime;
    // A delayed foreground callback must not replay a backlog of missed notes.
    if (now - schedule.lastTime > 0.25) {
      if (fading) { haltSchedule(schedule); return; }
      stopMusic();
      syncMusic();
      return;
    }
    // The fade-out has reached 0: stop adding notes and release the schedule.
    if (fading && now >= schedule.fadeEnd) { haltSchedule(schedule); return; }
    schedule.lastTime = now;
    const horizon = fading ? Math.min(now + musicLookahead, schedule.fadeEnd) : now + musicLookahead;
    if (schedule.track === 'farm') {
      while (schedule.origin + schedule.cursor * 0.56 < horizon) {
        const cursor = schedule.cursor++;
        const start = schedule.origin + cursor * 0.56;
        if (start < now) continue;
        const i = cursor % farmScore.length;
        note(farmScore[i], start, 0.78, schedule.gain, 'triangle', 0.035, undefined, schedule);
        if (i % 4 === 0) note(farmScore[i] - 12, start, 1.5, schedule.gain, 'sine', 0.025, undefined, schedule);
      }
    } else {
      const score = pageTracks[schedule.track];
      const secondsPerBeat = 60 / score.bpm;
      score.voices.forEach((voice, index) => {
        if (!voice.notes.length) return;
        const position = schedule.positions[index];
        while (true) {
          const [beat, pitch, duration] = voice.notes[position.cursor];
          const start = schedule.origin + (position.loop * score.loopBeats + beat) * secondsPerBeat;
          if (start >= horizon) break;
          position.cursor += 1;
          if (position.cursor === voice.notes.length) {
            position.cursor = 0;
            position.loop += 1;
          }
          if (start < now) continue;
          note(pitch, start, duration * secondsPerBeat, schedule.gain, voice.type, voice.level, voice.attack, schedule);
        }
      });
    }
    schedule.timer = setTimeout(() => scheduleMusic(schedule), musicTickMs);
  }

  // fadeIn is true only when a track change replaces an audible schedule.
  function syncMusic(fadeIn = false) {
    if (!musicEnabled()) { stopMusic(); return; }
    if (musicSchedule) return;
    const now = audio.currentTime;
    // Each schedule owns a gain node: notes -> schedule gain -> musicBus.
    const gain = audio.createGain();
    gain.connect(musicBus);
    const level = fadeIn ? 0 : 1;
    gain.gain.setValueAtTime(level, now);
    musicSchedule = {
      track,
      gain,
      ramp: { from: level, to: level, start: now, end: now },
      voices: new Set(),
      timer: undefined,
      retired: false,
      fadeEnd: Infinity,
      // Preserve the farm tune's original first 560 ms interval and 20 ms lead.
      origin: now + (track === 'farm' ? 0.58 : 0.02),
      lastTime: now,
      cursor: 0,
      positions: track === 'farm' ? [] : pageTracks[track].voices.map(() => ({ cursor: 0, loop: 0 })),
    };
    if (fadeIn) rampScheduleGain(musicSchedule, 1, now);
    scheduleMusic(musicSchedule);
  }

  return {
    configure(settings) { volume = { music: settings.music, sound: settings.sound }; applyVolume(); syncRain(); syncMusic(); productionAmbience.sync(); },
    setVisible(next) { visible = next; applyVolume(); syncRain(); syncMusic(); productionAmbience.sync(); },
    setProductionAmbience(state) { productionAmbience.setState(state); },
    setRain(amount) {
      rainAmount = Number.isFinite(amount) ? Math.round(Math.max(0, Math.min(1, amount)) * 100) / 100 : 0;
      syncRain();
    },
    setTrack(next) {
      if (track === next || (next !== 'farm' && !Object.prototype.hasOwnProperty.call(pageTracks, next))) return;
      track = next;
      const previous = musicSchedule;
      // First playback or muted/background state: no crossfade.
      if (!previous || !musicEnabled()) { stopMusic(); syncMusic(); return; }
      musicSchedule = undefined;
      fadeOutSchedule(previous);
      syncMusic(true);
    },
    async unlock() {
      if (!audio) {
        const Context = window.AudioContext ?? window.webkitAudioContext;
        if (!Context) return;
        try {
          audio = new Context();
          musicBus = audio.createGain();
          effectsBus = audio.createGain();
          musicBus.connect(audio.destination);
          effectsBus.connect(audio.destination);
          audio.addEventListener('statechange', () => { syncMusic(); syncRain(); productionAmbience.sync(); });
          applyVolume();
        } catch { return; }
      }
      await audio.resume().catch(() => {});
      syncRain();
      syncMusic();
      productionAmbience.sync();
    },
    play(name) {
      if (audio?.state !== 'running' || !visible || !volume.sound || !effects[name]) return;
      const now = audio.currentTime + 0.015;
      effects[name].forEach((pitch, i) => note(pitch, now + i * 0.09, 0.29, effectsBus, 'triangle', 0.08));
    },
    typeDialogue() {
      if (audio?.state !== 'running' || !visible || !volume.sound) return;
      const now = audio.currentTime;
      if (now - lastTyping < 0.115) return;
      lastTyping = now;
      const pulse = note(79, now + 0.005, 0.045, effectsBus, 'square', 0.031, 0.004);
      typingPulse = pulse;
      pulse.onended = () => { if (typingPulse === pulse) typingPulse = undefined; };
    },
    stopDialogue() {
      if (!typingPulse) return;
      typingPulse.stop(audio.currentTime);
      typingPulse = undefined;
    },
  };
}
