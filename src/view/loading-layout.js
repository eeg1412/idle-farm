// Pure geometry shared by the Pixi opening overlay and static art reviews.
// Bounds describe the exported 22-person image's visible alpha, not a clipping mask.
export const LOADING_ART_VERSION = 'all22-v2-redraw-linear';
export const LOADING_LAYOUT_VERSION = 'bottom-progress-v1';
export const LOADING_MANAGER_BOUNDS = { x: 24, y: 116, width: 976, height: 1141 };

export function loadingLayout(viewport, { failed = false, problem = false, labelHeight = 20, labelWidth } = {}) {
  const { x = 0, y = 0, width, height } = viewport;
  const insetTop = Math.max(0, viewport.inset?.top ?? 0);
  const insetBottom = Math.max(0, viewport.inset?.bottom ?? 0);
  const usableHeight = height - insetTop - insetBottom;
  const spacious = Math.max(0, Math.min(1, (usableHeight - 568) / 276));
  const logoWidth = width * (failed ? 0.76 + 0.12 * spacious : 0.84 + 0.04 * spacious);
  const logoHeight = logoWidth * 400 / 1024;
  const logoScale = logoWidth / 1024;
  // Position the real title ink (y85..305), letting its transparent canvas overlap free space.
  const logo = { x: x + (width - logoWidth) / 2,
    y: y + insetTop + Math.max(20, usableHeight * 0.04) - 85 * logoScale, width: logoWidth, height: logoHeight };
  const bottom = y + height - insetBottom - Math.max(16, usableHeight * 0.025);
  const stackedControls = problem && width < 304;
  const controlsY = bottom - (stackedControls ? 84 : 38);
  const captionBottom = failed ? controlsY - 10 : bottom;
  const label = { x: x + width / 2, y: captionBottom - labelHeight - 5, width: width * 0.9,
    fontSize: Math.max(11, Math.min(17, width * 0.039)) };
  const bar = { x: x + width * 0.13, y: label.y - 24, width: width * 0.74, height: 11 };
  const captionWidth = Math.min(width * 0.96, (labelWidth ?? label.width) + 24);
  const caption = { x: label.x - captionWidth / 2, y: label.y - 5, width: captionWidth, height: labelHeight + 10 };
  const retry = { x: x + width / 2 - (problem && !stackedControls ? 138 : 65), y: controlsY, width: 130, height: 38 };
  const problemBox = { x: x + width / 2 + (stackedControls ? 0 : 74),
    y: controlsY + (stackedControls ? 67 : 19), width: 140, height: 34 };
  const groupTop = logo.y + 305 * logoScale + 12;
  const groupBottom = bar.y - 18;
  const availableHeight = Math.max(1, groupBottom - groupTop);
  const managerScale = Math.min(width * 0.96 / LOADING_MANAGER_BOUNDS.width,
    availableHeight / LOADING_MANAGER_BOUNDS.height);
  const visibleTop = groupTop + (availableHeight - LOADING_MANAGER_BOUNDS.height * managerScale) / 2;
  const managers = { x: x + width / 2 - (LOADING_MANAGER_BOUNDS.x + LOADING_MANAGER_BOUNDS.width / 2) * managerScale,
    y: visibleTop - LOADING_MANAGER_BOUNDS.y * managerScale,
    width: 1024 * managerScale, height: 1344 * managerScale, scale: managerScale };
  return { logo, managers, bar, label, caption, retry, problem: problemBox };
}
