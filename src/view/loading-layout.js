// Pure geometry shared by the Pixi opening overlay and static art reviews.
// The approved close-up deliberately crops clothing at its art-canvas edges.
export const LOADING_ART_VERSION = 'all22-v3-approved-closeup';
export const LOADING_LAYOUT_VERSION = 'closeup-bottom-bleed-v1';
export const LOADING_MANAGER_BOUNDS = { x: 0, y: 0, width: 1024, height: 1536 };

export function loadingLayout(viewport, { failed = false, problem = false, labelHeight = 20, labelWidth } = {}) {
  const { x = 0, y = 0, width, height } = viewport;
  const insetTop = Math.max(0, viewport.inset?.top ?? 0);
  const insetBottom = Math.max(0, viewport.inset?.bottom ?? 0);
  const usableHeight = height - insetTop - insetBottom;
  const spacious = Math.max(0, Math.min(1, (usableHeight - 568) / 276));
  const logoWidth = width * (0.84 + 0.04 * spacious);
  const logoHeight = logoWidth * 400 / 1024;
  const logoScale = logoWidth / 1024;
  // Position the real title ink (y85..305), letting its transparent canvas overlap free space.
  const logo = { x: x + (width - logoWidth) / 2,
    y: y + insetTop + Math.max(20, usableHeight * 0.04) - 85 * logoScale, width: logoWidth, height: logoHeight };
  const bottom = y + height - insetBottom - Math.max(16, usableHeight * 0.025);
  const stackedControls = problem && width < 304;
  const controlsY = bottom - (stackedControls ? 84 : 38);
  // Compact bottom UI leaves the lowest face clear even on a 320x568 failure.
  const captionBottom = failed ? controlsY - 2 : bottom;
  const label = { x: x + width / 2, y: captionBottom - labelHeight - 3, width: width * 0.9,
    fontSize: Math.max(11, Math.min(17, width * 0.039)) };
  const bar = { x: x + width * 0.13, y: label.y - 18, width: width * 0.74, height: 11 };
  const captionWidth = Math.min(width * 0.96, (labelWidth ?? label.width) + 24);
  const caption = { x: label.x - captionWidth / 2, y: label.y - 3, width: captionWidth, height: labelHeight + 6 };
  const retry = { x: x + width / 2 - (problem && !stackedControls ? 138 : 65), y: controlsY, width: 130, height: 38 };
  const problemBox = { x: x + width / 2 + (stackedControls ? 0 : 74),
    y: controlsY + (stackedControls ? 67 : 19), width: 140, height: 34 };
  // Full-width close-up, independent of loading/failure controls. A one-pixel
  // bleed keeps the source's deliberate lower crop outside the viewport mask.
  // Insets constrain UI, while the artwork continues behind the bottom inset.
  const managerScale = (width + 2) / 1024;
  const managerHeight = 1536 * managerScale;
  const managers = { x: x - 1, y: y + height + 1 - managerHeight,
    width: 1024 * managerScale, height: managerHeight, scale: managerScale };
  return { logo, managers, bar, label, caption, retry, problem: problemBox };
}
