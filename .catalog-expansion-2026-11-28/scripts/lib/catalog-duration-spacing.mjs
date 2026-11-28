const maxConflictGapMs = 10_000;

// Fixed limits for the 525 IDs in the catalogue when this rule was introduced.
const originalKindMaxRanks = Object.freeze({
  C: 68, L: 10, F: 10, I: 127, IL: 10, IF: 10, P: 180, PL: 20, PF: 20, PD: 20, PT: 50,
});
const originalIds = new Set(Object.entries(originalKindMaxRanks).flatMap(([kind, maxRank]) =>
  Array.from({ length: maxRank }, (_, index) => kind + String(index + 1).padStart(2, '0'))));

export function assertCatalogDurationSpacing(items) {
  const byDuration = Object.entries(items).sort(([, first], [, second]) => first.durationMs - second.durationMs);
  for (const [index, [id, item]] of byDuration.entries()) {
    if (originalIds.has(id)) continue;
    // The closest items above and below this duration bound the gap to the whole catalogue.
    for (const neighbor of [byDuration[index - 1], byDuration[index + 1]]) {
      if (!neighbor) continue;
      const [otherId, other] = neighbor;
      const gapMs = Math.abs(item.durationMs - other.durationMs);
      if (gapMs <= maxConflictGapMs) {
        throw new Error(
          `新增品项基础周期冲突：${id} ${item.name} ${item.durationMs / 1000} 秒，` +
          `${otherId} ${other.name} ${other.durationMs / 1000} 秒，绝对差 ${gapMs / 1000} 秒。` +
          `请调整 docs/expansion/05-catalog.md 中新增品项的基础周期下界或配方，` +
          `使生成的基础周期与其他品项均相差超过 ${maxConflictGapMs / 1000} 秒。`,
        );
      }
    }
  }
}
