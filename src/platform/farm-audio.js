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
    configure(settings) { volume = { music: settings.music, sound: settings.sound }; applyVolume(); },
    setVisible(next) { visible = next; applyVolume(); },
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
