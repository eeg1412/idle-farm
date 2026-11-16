export const kindCounts = { C: 68, L: 10, F: 10, I: 127, IL: 10, IF: 10, P: 180, PL: 20, PF: 20, PD: 20, PT: 50 };

// Frozen original series lengths: ranks up to these keep the derived level
// bands 3·(⌈rank·10/length⌉−1)+sourceCount, so appending never shifts them.
const originalSeries = { P: 150, PL: 20, PF: 20, PD: 20, PT: 50 };
// Source counts per product kind (agriculture/livestock/fish 1, PD 2, PT 3).
const kindSources = { P: 1, PL: 1, PF: 1, PD: 2, PT: 3 };

// Appended products (rank above the frozen length) read their level from the
// explicit table in docs/expansion/08: rows are consecutive per kind, starting
// at length+1, and the level must be one of the ten band values
// 3·(t−1)+sourceCount (t = 1…10): P/PL/PF 1…28, PD 2…29, PT 3…30.
export function productLevels(cropUses) {
  const lines = cropUses.split(/\r?\n/);
  const header = lines.indexOf('| 商品 ID | 商品等级 |');
  if (header === -1 || lines[header + 1] !== '| --- | --- |') {
    throw new Error('缺少追加商品等级表');
  }
  const explicitLevels = new Map();
  const listed = Object.fromEntries(Object.keys(originalSeries).map((kind) => [kind, 0]));
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith('|')) break;
    const row = /^\| (PL|PF|PD|PT|P)(\d{2,3}) \| ([1-9]\d?) \|$/.exec(line);
    if (!row) throw new Error(`追加商品等级无效：${line}`);
    const [, kind, rankText, levelText] = row;
    const rank = Number(rankText);
    const band = Number(levelText) - kindSources[kind];
    const expected = originalSeries[kind] + listed[kind] + 1;
    if (rankText !== String(rank).padStart(2, '0') || rank !== expected || rank > kindCounts[kind]
      || band < 0 || band > 27 || band % 3 !== 0) {
      throw new Error(`追加商品等级无效：${line}`);
    }
    explicitLevels.set(`${kind}${rankText}`, Number(levelText));
    listed[kind] += 1;
  }
  for (const [kind, length] of Object.entries(originalSeries)) {
    if (kindCounts[kind] < length || listed[kind] !== kindCounts[kind] - length) {
      throw new Error(`追加商品等级表与${kind}类数量不一致`);
    }
  }

  return (kind, rank, sourceCount) => {
    const length = originalSeries[kind];
    if (rank > length) return explicitLevels.get(kind + String(rank).padStart(2, '0'));
    const tier = Math.ceil(rank * 10 / length);
    return 3 * (tier - 1) + sourceCount;
  };
}
