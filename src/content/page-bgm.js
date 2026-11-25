// Original page music. Beat/duration use quarter-note beats; attack uses seconds.
// These helpers expand authored bars once at module load, without clocks or randomness.
const harmony = {
  C: [48, 52, 55, 60], C6: [48, 52, 55, 57], Cmaj7: [48, 52, 55, 59],
  D: [50, 54, 57, 62], D6: [50, 54, 57, 59], D7: [50, 54, 57, 60],
  Dm: [50, 53, 57, 62], Dm7: [50, 53, 57, 60],
  Eb: [51, 55, 58, 63], Em: [52, 55, 59, 64], Em7: [52, 55, 59, 62],
  E7: [52, 56, 59, 62], F: [53, 57, 60, 65], Fmaj7: [53, 57, 60, 64],
  Fm: [53, 56, 60, 65], Fs: [54, 58, 61, 66], Fsm: [54, 57, 61, 66],
  G: [55, 59, 62, 67], G6: [55, 59, 62, 64], G7: [55, 59, 62, 65],
  Gm: [55, 58, 62, 67], Ab: [56, 60, 63, 68],
  A: [57, 61, 64, 69], A7: [57, 61, 64, 67], Am: [57, 60, 64, 69],
  Am7: [57, 60, 64, 67], Bb: [58, 62, 65, 70],
  Bm: [59, 62, 66, 71], B7: [59, 63, 66, 69], Cm: [48, 51, 55, 60],
};

const rhythms = {
  quarters: [1, 1, 1, 1], walk: [0.5, 0.5, 1, 1, 1],
  skip: [0.75, 0.25, 1, 1, 1], answer: [1.5, 0.5, 2],
  halves: [2, 2], settle: [1, 1, 2],
  ripple: [0.5, 0.5, 0.5, 0.5, 1, 1],
  sway: [1.5, 0.5, 1, 1], sync: [0.5, 1, 0.5, 1, 1],
  held: [4], waltz: [1, 1, 1], lift: [0.5, 0.5, 1, 1],
  lull: [1, 2], breath: [1.5, 1.5], wholeWaltz: [3],
};

function melodyNotes(bars, beatsPerBar, gate) {
  return bars.flatMap(([rhythm, ...pitches], bar) => {
    let offset = 0;
    return rhythms[rhythm].flatMap((duration, index) => {
      const beat = bar * beatsPerBar + offset;
      offset += duration;
      return pitches[index] === null ? [] : [[beat, pitches[index], duration * gate]];
    });
  });
}

function accompanimentNotes(chords, pattern, beatsPerBar, octave = 0) {
  return chords.flatMap((chord, bar) => pattern.map(([beat, tone, duration]) => [
    bar * beatsPerBar + beat, harmony[chord][tone] + octave, duration,
  ]));
}

function compose({
  title, bpm, beatsPerBar = 4, chords, melody, accompaniment, bass,
  lead = 'triangle', leadLevel = 0.025, leadAttack = 0.028, gate = 0.86,
  backing = 'sine', backingLevel = 0.010, backingAttack = 0.025,
  bassLevel = 0.014, bassAttack = 0.045,
}) {
  const bars = chords.split(' ');
  return {
    title, bpm, beatsPerBar, loopBeats: bars.length * beatsPerBar,
    voices: [
      { type: lead, level: leadLevel, attack: leadAttack, notes: melodyNotes(melody, beatsPerBar, gate) },
      { type: backing, level: backingLevel, attack: backingAttack,
        notes: accompanimentNotes(bars, accompaniment, beatsPerBar) },
      { type: 'sine', level: bassLevel, attack: bassAttack,
        notes: accompanimentNotes(bars, bass, beatsPerBar, -12) },
    ],
  };
}

export const pageTracks = {
  field: compose({
    title: '晨畦小径', bpm: 88,
    chords: 'C Am F G Em Am Dm G C C6 F Dm Em Am G C',
    melody: [
      ['walk', 64, 67, 69, 72, 71], ['skip', 69, 67, 64, 62, 64],
      ['walk', 65, 69, 72, 74, 72], ['answer', 71, 69, 67],
      ['ripple', 67, 64, 67, 71, 74, 71], ['walk', 72, 71, 69, 67, 64],
      ['sway', 65, 64, 62, 65], ['answer', 67, 71, 74],
      ['skip', 76, 74, 72, 67, 64], ['walk', 67, 69, 72, 76, 74],
      ['settle', 72, 69, 65], ['walk', 69, 65, 62, 64, 65],
      ['ripple', 67, 71, 74, 71, 67, 64], ['sway', 69, 67, 64, 60],
      ['walk', 62, 65, 67, 71, 62], ['settle', 64, 62, 60],
    ],
    accompaniment: [[0, 0, 0.36], [0.5, 1, 0.36], [1, 2, 0.36], [1.5, 1, 0.36], [2, 3, 0.36], [2.5, 2, 0.36], [3, 1, 0.36], [3.5, 2, 0.36]],
    bass: [[0, 0, 1.6], [2, 2, 1.6]], backing: 'triangle', backingLevel: 0.007,
  }),
  livestock: compose({
    title: '牧场摇篮', bpm: 68, beatsPerBar: 3,
    chords: 'F Bb F C Dm Gm C F Bb F Gm C Dm Bb C F',
    melody: [
      ['lull', 69, 72], ['waltz', 70, 69, 65], ['breath', 69, 67], ['lull', 64, 67],
      ['lift', 65, 67, 69, 74], ['lull', 74, 70], ['waltz', 72, 71, 67], ['wholeWaltz', 69],
      ['lift', 70, 72, 74, 77], ['waltz', 76, 72, 69], ['breath', 70, 67], ['lull', 67, 64],
      ['waltz', 65, 69, 74], ['lift', 74, 72, 70, 65], ['lull', 67, 64], ['wholeWaltz', 65],
    ],
    accompaniment: [[1, 1, 0.7], [1, 2, 0.7], [2, 1, 0.7], [2, 3, 0.7]],
    bass: [[0, 0, 2.4]], lead: 'sine', leadLevel: 0.027, leadAttack: 0.065,
    backing: 'triangle', backingLevel: 0.005, bassLevel: 0.012,
  }),
  fish: compose({
    title: '水面书信', bpm: 70,
    chords: 'Dm G Dm C F Em Dm A7 Dm G F C G Dm A7 Dm',
    melody: [
      ['halves', 69, 74], ['sway', 76, 74, 71, 69], ['settle', 72, 69, 65], ['halves', 64, 67],
      ['answer', 69, 72, 76], ['sway', 74, 71, 67, 64], ['halves', 65, 69], ['answer', 73, 71, 69],
      ['ripple', 74, 76, 77, 76, 74, 72], ['halves', 71, 74], ['sway', 76, 72, 69, 65], ['settle', 67, 64, 60],
      ['halves', 62, 67], ['answer', 69, 65, 62], ['sway', 64, 67, 73, 69], ['settle', 65, 64, 62],
    ],
    accompaniment: [[0, 1, 1.2], [1, 2, 1.2], [2, 3, 1.2], [3, 2, 0.85]],
    bass: [[0, 0, 3.6]], lead: 'sine', leadLevel: 0.024, leadAttack: 0.08,
    backingLevel: 0.008, backingAttack: 0.09, bassLevel: 0.012, gate: 0.96,
  }),
  mine: compose({
    title: '石灯回声', bpm: 64,
    chords: 'Em Cmaj7 Am B7 Em G Am B7 Cmaj7 D G Em Am Cmaj7 B7 Em',
    melody: [
      ['settle', 64, null, 71], ['halves', 67, 64], ['answer', 69, 64, 60], ['settle', 63, 66, 71],
      ['halves', 76, 71], ['settle', 74, 71, 67], ['answer', 69, null, 64], ['halves', 66, 63],
      ['sway', 67, 71, 72, 76], ['settle', 74, 69, 66], ['halves', 67, 62], ['answer', 64, 67, 71],
      ['settle', 72, 69, 64], ['halves', 67, 64], ['settle', 66, 63, 59], ['answer', 64, null, 64],
    ],
    accompaniment: [[0.5, 2, 1.7], [2.5, 1, 1.2]],
    bass: [[0, 0, 3.5]], leadLevel: 0.020, leadAttack: 0.07,
    backingLevel: 0.011, backingAttack: 0.11, bassLevel: 0.016, bassAttack: 0.09,
  }),
  processing: compose({
    title: '齿轮与木勺', bpm: 96,
    chords: 'G Em C D Bm Em Am D G D C G Em Am D G',
    melody: [
      ['sync', 67, 71, 74, 71, 69], ['sync', 67, 64, 67, 71, 74],
      ['walk', 72, 67, 64, 67, 72], ['skip', 74, 72, 69, 66, 62],
      ['sync', 66, 71, 74, 78, 74], ['settle', 76, 71, 67],
      ['walk', 69, 72, 76, 74, 72], ['answer', 69, 66, 62],
      ['sync', 79, 74, 71, 74, 79], ['sync', 78, 74, 69, 66, 69],
      ['skip', 76, 74, 72, 67, 64], ['walk', 71, 74, 79, 74, 71],
      ['sync', 67, 71, 76, 74, 71], ['sync', 72, 69, 64, 69, 72],
      ['walk', 74, 72, 69, 66, 62], ['settle', 67, 71, 67],
    ],
    accompaniment: [[0.5, 1, 0.22], [1.5, 2, 0.22], [2.25, 1, 0.22], [3, 3, 0.22], [3.5, 2, 0.22]],
    bass: [[0, 0, 0.7], [1.75, 2, 0.5], [3, 0, 0.6]],
    leadLevel: 0.022, leadAttack: 0.012, backing: 'square', backingLevel: 0.004,
    backingAttack: 0.012, bassLevel: 0.013, gate: 0.7,
  }),
  refining: compose({
    title: '玻璃糖光', bpm: 92,
    chords: 'D Bm G A Fsm Bm Em A D G Em A Fsm G A D',
    melody: [
      ['ripple', 78, 76, 74, 73, 74, 81], ['walk', 78, 74, 71, 74, 78],
      ['skip', 79, 78, 74, 71, 67], ['answer', 73, 76, 81],
      ['ripple', 78, 76, 73, 69, 73, 78], ['sway', 78, 76, 74, 71],
      ['walk', 76, 79, 78, 76, 71], ['settle', 73, 71, 69],
      ['skip', 81, 78, 74, 76, 78], ['ripple', 79, 78, 74, 71, 74, 79],
      ['sway', 83, 81, 79, 76], ['walk', 81, 79, 76, 73, 69],
      ['ripple', 78, 76, 73, 69, 66, 69], ['settle', 71, 74, 79],
      ['answer', 76, 73, 69], ['settle', 74, 73, 74],
    ],
    accompaniment: [[0, 1, 0.25], [0.75, 2, 0.25], [1.5, 3, 0.25], [2.5, 2, 0.25], [3.25, 1, 0.25]],
    bass: [[0, 0, 1.45], [2.5, 2, 1.1]], lead: 'sine', leadLevel: 0.024,
    leadAttack: 0.012, backing: 'triangle', backingLevel: 0.007, bassLevel: 0.012,
  }),
  warehouse: compose({
    title: '木箱排成行', bpm: 80,
    chords: 'Bb Gm Eb F Dm Gm Cm F Bb Dm Eb Cm Gm Eb F Bb',
    melody: [
      ['quarters', 70, 65, 62, 65], ['settle', 67, 70, 74],
      ['quarters', 75, 70, 67, 63], ['halves', 65, 69],
      ['quarters', 74, 69, 65, 62], ['settle', 67, 69, 70],
      ['quarters', 72, 67, 63, 60], ['answer', 65, 67, 69],
      ['walk', 70, 72, 74, 77, 74], ['quarters', 74, 72, 69, 65],
      ['settle', 67, 70, 75], ['quarters', 72, 70, 67, 63],
      ['quarters', 62, 67, 70, 74], ['settle', 75, 70, 67],
      ['quarters', 69, 67, 65, 60], ['halves', 62, 70],
    ],
    accompaniment: [[0, 1, 0.65], [1, 2, 0.65], [2, 1, 0.65], [3, 3, 0.65]],
    bass: [[0, 0, 1.7], [2, 0, 1.7]], leadLevel: 0.023, backingLevel: 0.009,
    bassLevel: 0.013,
  }),
  orders: compose({
    title: '沿着邮路', bpm: 90,
    chords: 'A G D A Fsm G Bm E7 A D G E7 Fsm Bm E7 A',
    melody: [
      ['walk', 69, 73, 76, 73, 71], ['sway', 74, 71, 67, 69],
      ['sync', 66, 69, 74, 76, 74], ['answer', 73, 71, 69],
      ['walk', 66, 69, 73, 78, 76], ['walk', 74, 71, 67, 71, 74],
      ['sway', 78, 76, 74, 71], ['settle', 68, 71, 76],
      ['sync', 81, 76, 73, 76, 81], ['walk', 78, 76, 74, 69, 66],
      ['sway', 67, 71, 74, 79], ['answer', 80, 76, 71],
      ['walk', 78, 76, 73, 69, 66], ['sync', 71, 74, 78, 76, 74],
      ['sway', 76, 74, 71, 68], ['settle', 69, 73, 69],
    ],
    accompaniment: [[0, 0, 0.4], [0.5, 2, 0.4], [1.5, 1, 0.4], [2, 3, 0.4], [3, 2, 0.4], [3.5, 1, 0.4]],
    bass: [[0, 0, 1.3], [1.5, 2, 0.7], [3, 0, 0.7]],
    leadLevel: 0.024, backing: 'triangle', backingLevel: 0.007,
  }),
  merchant: compose({
    title: '风铃行商', bpm: 94,
    chords: 'G C D G Em A7 D D7 G B7 Em C Am D7 G G6',
    melody: [
      ['skip', 71, 74, 79, 78, 74], ['skip', 76, 74, 72, 67, 64],
      ['sync', 69, 74, 78, 76, 74], ['answer', 71, 69, 67],
      ['skip', 67, 71, 76, 74, 71], ['walk', 73, 76, 79, 76, 73],
      ['quarters', 74, 78, 81, 78], ['answer', 76, 72, 69],
      ['skip', 79, 78, 74, 71, 67], ['sync', 75, 78, 81, 78, 75],
      ['walk', 76, 74, 71, 67, 64], ['skip', 72, 74, 76, 72, 67],
      ['quarters', 69, 72, 76, 72], ['walk', 74, 72, 69, 66, 62],
      ['skip', 67, 69, 71, 74, 71], ['settle', 69, 71, 67],
    ],
    accompaniment: [[0.75, 1, 0.3], [1.75, 2, 0.3], [2.75, 3, 0.3], [3.5, 2, 0.3]],
    bass: [[0, 0, 0.8], [2, 2, 0.8]], leadLevel: 0.024, leadAttack: 0.02,
    backing: 'square', backingLevel: 0.004, backingAttack: 0.015, gate: 0.78,
  }),
  research: compose({
    title: '窗边的问号', bpm: 84,
    chords: 'Fmaj7 G Em Am Fmaj7 G C G Dm Em Fmaj7 G Am Dm G Cmaj7',
    melody: [
      ['sync', 72, 76, 71, 76, 77], ['settle', 78, 74, 71],
      ['walk', 76, 71, 67, 71, 74], ['answer', 76, 72, 69],
      ['ripple', 77, 76, 72, 71, 69, 72], ['sync', 74, 78, 79, 74, 71],
      ['halves', 76, 72], ['settle', 74, null, 71],
      ['walk', 77, 76, 74, 69, 65], ['sync', 67, 71, 76, 74, 71],
      ['ripple', 72, 76, 77, 78, 77, 76], ['answer', 74, 71, 67],
      ['sway', 69, 72, 76, 79], ['settle', 77, 74, 69],
      ['sync', 71, 74, 79, 77, 74], ['halves', 76, 71],
    ],
    accompaniment: [[0, 2, 0.4], [1.25, 1, 0.4], [2, 3, 0.4], [3.25, 2, 0.4]],
    bass: [[0, 0, 2.4], [3, 2, 0.7]], lead: 'sine', leadLevel: 0.025,
    leadAttack: 0.02, backing: 'triangle', backingLevel: 0.008, bassLevel: 0.012,
  }),
  management: compose({
    title: '午后账簿', bpm: 74,
    chords: 'Eb Cm Ab Bb Gm Cm Fm Bb Eb Gm Ab Fm Cm Ab Bb Eb',
    melody: [
      ['sway', 67, 70, 75, 74], ['halves', 72, 67], ['settle', 68, 72, 75], ['answer', 74, 72, 70],
      ['sway', 70, 74, 77, 74], ['settle', 75, 72, 67], ['halves', 68, 65], ['sway', 65, 69, 70, 74],
      ['answer', 79, 77, 75], ['settle', 77, 74, 70], ['sway', 72, 75, 80, 79], ['halves', 77, 72],
      ['settle', 75, 72, 67], ['sway', 68, 72, 75, 72], ['answer', 74, 70, 65], ['halves', 67, 63],
    ],
    accompaniment: [[0, 1, 1.5], [0, 2, 1.5], [2, 2, 1.5], [2, 3, 1.5]],
    bass: [[0, 0, 3.3]], leadLevel: 0.024, leadAttack: 0.05,
    backingLevel: 0.005, backingAttack: 0.07, bassLevel: 0.012, gate: 0.92,
  }),
  characters: compose({
    title: '围炉相谈', bpm: 66, beatsPerBar: 3,
    chords: 'A D A E7 Fsm Bm E7 A D A Bm E7 Fsm D E7 A',
    melody: [
      ['breath', 73, 76], ['lull', 78, 74], ['waltz', 76, 73, 69], ['breath', 71, 68],
      ['lift', 69, 71, 73, 78], ['waltz', 78, 74, 71], ['lull', 76, 71], ['wholeWaltz', 73],
      ['waltz', 74, 78, 81], ['lift', 80, 78, 76, 73], ['breath', 74, 71], ['lull', 71, 68],
      ['waltz', 69, 73, 78], ['breath', 78, 74], ['lift', 76, 74, 71, 68], ['wholeWaltz', 69],
    ],
    accompaniment: [[0, 1, 0.9], [1, 2, 0.9], [2, 3, 0.9]],
    bass: [[0, 0, 2.6]], lead: 'sine', leadLevel: 0.027, leadAttack: 0.075,
    backingLevel: 0.008, backingAttack: 0.06, bassLevel: 0.011, gate: 0.96,
  }),
  statistics: compose({
    title: '方格纸上的晴天', bpm: 78,
    chords: 'C Em F G Am Em Dm G C F Em Am Dm F G C6',
    melody: [
      ['halves', 72, 67], ['settle', 71, 67, 64], ['halves', 69, 72], ['settle', 71, 69, 67],
      ['halves', 69, 76], ['settle', 74, 71, 67], ['halves', 65, 69], ['settle', 67, 71, 74],
      ['halves', 76, 72], ['settle', 77, 76, 72], ['halves', 74, 71], ['settle', 72, 69, 64],
      ['halves', 65, 62], ['settle', 65, 69, 72], ['halves', 71, 67], ['held', 64],
    ],
    accompaniment: [[1, 1, 0.85], [3, 2, 0.85]],
    bass: [[0, 0, 1.4], [2, 2, 1.4]], lead: 'sine', leadLevel: 0.022,
    leadAttack: 0.055, backingLevel: 0.008, bassLevel: 0.010,
  }),
  saleHistory: compose({
    title: '旧门牌的夕照', bpm: 64, beatsPerBar: 3,
    chords: 'Dm Bb F C Gm Dm A7 Dm Bb F Gm A7 Dm Bb A7 Dm',
    melody: [
      ['breath', 74, 69], ['lull', 70, 65], ['waltz', 69, 72, 77], ['breath', 76, 72],
      ['lift', 74, 72, 70, 67], ['lull', 69, 65], ['waltz', 64, 67, 73], ['wholeWaltz', 74],
      ['breath', 77, 74], ['waltz', 76, 72, 69], ['lull', 70, 74], ['lift', 73, 71, 69, 67],
      ['breath', 65, 69], ['lull', 70, 65], ['waltz', 64, 67, 73], ['wholeWaltz', 62],
    ],
    accompaniment: [[0, 1, 1.35], [1.5, 2, 1.35]],
    bass: [[0, 0, 2.7]], leadLevel: 0.022, leadAttack: 0.07,
    backingLevel: 0.008, backingAttack: 0.07, bassLevel: 0.011, gate: 0.96,
  }),
  catalog: compose({
    title: '翻开四季', bpm: 86,
    chords: 'G C D Em G Am C D G Em C G Am C D G6',
    melody: [
      ['walk', 74, 76, 79, 81, 79], ['settle', 76, 72, 67],
      ['ripple', 69, 74, 76, 78, 81, 78], ['answer', 79, 76, 71],
      ['walk', 74, 79, 83, 81, 79], ['sway', 81, 79, 76, 72],
      ['settle', 76, 79, 72], ['answer', 74, 69, 66],
      ['ripple', 67, 69, 71, 74, 79, 76], ['walk', 76, 79, 83, 79, 76],
      ['sway', 79, 76, 72, 67], ['settle', 71, 74, 79],
      ['walk', 81, 79, 76, 72, 69], ['sway', 72, 76, 79, 76],
      ['ripple', 78, 76, 74, 69, 66, 62], ['settle', 67, 71, 67],
    ],
    accompaniment: [[0, 1, 0.45], [0.5, 3, 0.45], [1.5, 2, 0.45], [2.5, 1, 0.45], [3, 3, 0.45]],
    bass: [[0, 0, 1.8], [2.5, 2, 1.15]], lead: 'sine', leadLevel: 0.025,
    leadAttack: 0.025, backing: 'triangle', backingLevel: 0.007, bassLevel: 0.012,
  }),
  tasks: compose({
    title: '明日的路标', bpm: 92,
    chords: 'D C G D Bm C Em A D G C A Bm Em A D6',
    melody: [
      ['quarters', 74, 69, 74, 78], ['walk', 79, 76, 72, 74, 76],
      ['quarters', 79, 74, 71, 67], ['answer', 69, 74, 78],
      ['skip', 78, 76, 74, 71, 66], ['quarters', 67, 72, 76, 79],
      ['walk', 83, 81, 79, 76, 71], ['settle', 73, 76, 81],
      ['quarters', 81, 78, 74, 69], ['walk', 71, 74, 79, 81, 79],
      ['skip', 76, 74, 72, 67, 64], ['answer', 69, 73, 76],
      ['quarters', 78, 74, 71, 66], ['walk', 67, 71, 76, 74, 71],
      ['skip', 73, 76, 81, 76, 73], ['settle', 74, 78, 74],
    ],
    accompaniment: [[0.5, 1, 0.4], [1, 2, 0.4], [2.5, 1, 0.4], [3, 3, 0.4]],
    bass: [[0, 0, 0.85], [1.5, 2, 0.85], [3, 0, 0.7]],
    leadLevel: 0.024, backing: 'triangle', backingLevel: 0.008,
    bassLevel: 0.013, gate: 0.82,
  }),
  farmSale: compose({
    title: '新芽在门外', bpm: 68,
    chords: 'F C Dm Bb Gm C F A7 Dm Bb F C Gm Bb C Fmaj7',
    melody: [
      ['halves', 72, 69], ['answer', 67, 64, 60], ['sway', 65, 69, 74, 72], ['halves', 70, 65],
      ['settle', 67, 70, 74], ['answer', 72, 71, 67], ['halves', 69, 72], ['sway', 73, 76, 79, 76],
      ['answer', 77, 76, 74], ['sway', 74, 72, 70, 65], ['settle', 69, 72, 77], ['halves', 76, 72],
      ['sway', 74, 72, 70, 67], ['settle', 70, 74, 77], ['answer', 76, 72, 67], ['halves', 69, 65],
    ],
    accompaniment: [[0, 1, 1.8], [1.5, 2, 1.8], [3, 3, 0.85]],
    bass: [[0, 0, 3.5]], lead: 'sine', leadLevel: 0.026, leadAttack: 0.075,
    backing: 'triangle', backingLevel: 0.007, backingAttack: 0.06,
    bassLevel: 0.011, gate: 0.96,
  }),
  settings: compose({
    title: '灯下留白', bpm: 60, beatsPerBar: 3,
    chords: 'C6 Fmaj7 Em7 Am7 Dm7 G7 C6 G7 C6 Em7 Fmaj7 Am7 Dm7 Fmaj7 G7 C6',
    melody: [
      ['wholeWaltz', 76], ['lull', null, 72], ['breath', 71, 67], ['wholeWaltz', 69],
      ['lull', 65, 69], ['breath', 71, 67], ['wholeWaltz', 64], ['lull', null, 62],
      ['breath', 64, 69], ['wholeWaltz', 71], ['lull', 72, 76], ['breath', 74, 72],
      ['wholeWaltz', 69], ['lull', 65, 64], ['breath', 62, 67], ['wholeWaltz', 64],
    ],
    accompaniment: [[1, 2, 1.8]], bass: [[0, 0, 2.7]],
    lead: 'sine', leadLevel: 0.020, leadAttack: 0.10, backingLevel: 0.007,
    backingAttack: 0.10, bassLevel: 0.009, bassAttack: 0.08, gate: 0.92,
  }),
};

export const pageTrackIds = {
  庄园: 'farm', 田地: 'field', 畜牧: 'livestock', 鱼塘: 'fish', 矿洞: 'mine',
  加工: 'processing', 精制: 'refining', 仓库: 'warehouse', 订单中心: 'orders',
  行脚商: 'merchant', 研究: 'research', 经营: 'management', 角色管理: 'characters',
  统计: 'statistics', 出售庄园历史: 'saleHistory', 图鉴: 'catalog', 任务: 'tasks',
  出售庄园: 'farmSale', 设置: 'settings',
};

export function trackForPage(page) {
  return pageTrackIds[page] ?? 'farm';
}
