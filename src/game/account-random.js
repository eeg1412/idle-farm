const wordBits = 64n;
const wordMask = (1n << wordBits) - 1n;

function mix64(word) {
  word = ((word ^ (word >> 30n)) * 0xbf58476d1ce4e5b9n) & wordMask;
  word = ((word ^ (word >> 27n)) * 0x94d049bb133111ebn) & wordMask;
  return word ^ (word >> 31n);
}

export function accountRandom(seed, domain, sequence) {
  // Hash all 128 seed bits and the stream identity before generating SplitMix64 words.
  let state = 0xcbf29ce484222325n;
  const identity = seed + ':' + domain + ':' + sequence;
  for (let index = 0; index < identity.length; index += 1) {
    state = ((state ^ BigInt(identity.charCodeAt(index))) * 0x100000001b3n) & wordMask;
  }
  const next = () => {
    state = (state + 0x9e3779b97f4a7c15n) & wordMask;
    return mix64(state);
  };

  return (limit) => {
    if (limit === 1n) return 0n;
    const bits = BigInt((limit - 1n).toString(2).length);
    const mask = (1n << bits) - 1n;
    let sample;
    do {
      sample = next();
      for (let offset = wordBits; offset < bits; offset += wordBits) sample = (sample << wordBits) | next();
      sample &= mask;
    } while (sample >= limit);
    return sample;
  };
}
