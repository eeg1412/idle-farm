export const kindCounts = { C: 68, L: 10, F: 10, I: 127, IL: 10, IF: 10, P: 180, PL: 20, PF: 20, PD: 20, PT: 50 };

// The first 150 agricultural products retain their original level bands.
const originalAgriculturalProducts = 150;

export function productLevels(cropUses) {
  const lines = cropUses.split(/\r?\n/);
  const header = lines.indexOf('| 商品 ID | 商品等级 |');
  if (header === -1 || lines[header + 1] !== '| --- | --- |') {
    throw new Error('缺少农业扩展商品等级表');
  }
  const explicitLevels = new Map();
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const row = /^\| (P\d+) \| (1|4|7|10|13|16|19|22|25|28) \|$/.exec(line);
    const rank = originalAgriculturalProducts + explicitLevels.size + 1;
    if (!row || row[1] !== `P${rank}` || rank > kindCounts.P) {
      throw new Error(`农业扩展商品等级无效：${line}`);
    }
    explicitLevels.set(rank, Number(row[2]));
  }
  if (explicitLevels.size !== kindCounts.P - originalAgriculturalProducts) {
    throw new Error('农业扩展商品等级表缺少商品');
  }

  return (kind, rank, sourceCount) => {
    if (kind === 'P' && rank > originalAgriculturalProducts) return explicitLevels.get(rank);
    const seriesLength = kind === 'P' ? originalAgriculturalProducts : kindCounts[kind];
    const tier = Math.ceil(rank * 10 / seriesLength);
    return 3 * (tier - 1) + sourceCount;
  };
}
