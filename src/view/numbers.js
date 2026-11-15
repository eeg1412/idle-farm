const shortSuffixes = ['', 'K', 'M', 'B', 'T'];

function suffixFor(group) {
  if (group < shortSuffixes.length) return shortSuffixes[group];
  let index = group + 22;
  let suffix = '';
  while (index > 0) {
    index -= 1;
    suffix = String.fromCharCode(65 + index % 26) + suffix;
    index = Math.floor(index / 26);
  }
  return suffix;
}

export function compact(amount, decimalPlaces = 2) {
  const value = BigInt(amount);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const digits = absolute.toString();
  if (absolute < 10000n) return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const group = Math.floor((digits.length - 1) / 3);
  const headLength = digits.length - group * 3;
  const fraction = digits.slice(headLength, headLength + decimalPlaces).replace(/0+$/, '');
  return sign + digits.slice(0, headLength) + (fraction ? '.' + fraction : '') + suffixFor(group);
}
