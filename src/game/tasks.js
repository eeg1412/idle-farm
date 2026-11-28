export const guide = [
  ['第一次收成', '田地', (s) => s.stats.wheat > 0n],
  ['磨出面粉', '料坊工房', (s) => s.stats.flour > 0n],
  ['研发乡村面包', '研究', (s) => s.unlocked.includes('P01')],
  ['烤出乡村面包', '料坊工房', (s) => s.stats.bread > 0n],
  ['第一次出货', '仓库', (s) => s.stats.sold > 0n],
  ['扩建田地', '田地', (s) => s.stats.plots >= 1],
];

export const longTerm = [
  ['农地扩建', '田地', (s) => [s.stats.plots, 10]],
  ['经营收入', '仓库', (s) => [s.stats.revenue, 100000n]],
  ['工房配方集', '研究', (s) => [s.unlocked.filter((id) => id.startsWith('P')).length, 25]],
  ['品质进阶', '研究', (s) => [Object.values(s.quality).filter((level) => level >= 5).length, 10]],
  ['经营交接', '田地', (s) => [s.completedRuns, 1]],
  ['南岛珍果千层', '料坊工房', (s) => [Number(s.everMadeIslandMilleCrepe), 1]],
  ['完整图鉴', '研究', (s) => [s.unlocked.length, 300]],
];

export const inGuide = (state) => !state.guideSkipped && guide.some(([, , done]) => !done(state));
