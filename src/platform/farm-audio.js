const scores = {
  farm: [60, 64, 67, 72, 69, 67, 64, 62, 60, 65, 69, 72, 74, 72, 69, 67],
  workshop: [55, 62, 65, 67, 62, 65, 70, 67, 57, 64, 67, 69, 64, 67, 72, 69],
};
const effects = {
  success: [60, 67], sell: [74, 77, 81],
  research: [60, 64, 67, 72], prestige: [55, 60, 64, 67, 72],
};
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

export function createFarmAudio() {
  let audio;
  let volume = { music: 0, sound: 0 };
  let track = 'farm';
  let cursor = 0;
  let timer;
  let visible = !document.hidden;
  let musicBus;
  let effectsBus;
  let lastTyping = -Infinity;
  let typingPulse;
  let rainAmount = 0;
  let rainBuffer;
  let rainVoice;

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

  function note(value, start, duration, bus, type, level, attack = 0.035) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = hz(value);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    return oscillator;
  }

  function applyVolume() {
    if (!audio) return;
    musicBus.gain.setTargetAtTime(volume.music / 100 * (visible ? 1 : 0), audio.currentTime, 0.03);
    effectsBus.gain.setTargetAtTime(volume.sound / 100 * (visible ? 1 : 0), audio.currentTime, 0.03);
  }

  function musicBeat() {
    if (!visible || audio.state !== 'running' || !volume.music) return;
    const score = scores[track];
    const i = cursor++ % score.length;
    const now = audio.currentTime + 0.02;
    note(score[i], now, 0.78, musicBus, 'triangle', 0.035);
    if (i % 4 === 0) note(score[i] - 12, now, 1.5, musicBus, 'sine', 0.025);
  }

  return {
    configure(settings) { volume = { music: settings.music, sound: settings.sound }; applyVolume(); syncRain(); },
    setVisible(next) { visible = next; applyVolume(); syncRain(); },
    setRain(amount) {
      rainAmount = Number.isFinite(amount) ? Math.round(Math.max(0, Math.min(1, amount)) * 100) / 100 : 0;
      syncRain();
    },
    setTrack(next) { if (track !== next) { track = next; cursor = 0; } },
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
          applyVolume();
        } catch { return; }
      }
      await audio.resume().catch(() => {});
      syncRain();
      timer ??= setInterval(musicBeat, 560);
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
