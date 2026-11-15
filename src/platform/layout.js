export function viewportLayout(width, height, inset) {
  const safeWidth = Math.max(1, width - inset.left - inset.right);
  const safeHeight = Math.max(1, height - inset.top - inset.bottom);
  if (width < height) {
    return { x: 0, y: 0, width, height, scale: 1, inset };
  }
  const panelHeight = Math.min(safeHeight, Math.floor(safeWidth * 844 / 390));
  const panelWidth = Math.floor(panelHeight * 390 / 844);
  return {
    x: inset.left + (safeWidth - panelWidth) / 2,
    y: inset.top + (safeHeight - panelHeight) / 2,
    width: panelWidth, height: panelHeight, scale: panelWidth / 390,
    inset: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}
