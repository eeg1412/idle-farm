// Pure geometry shared by the Pixi opening overlay and static CG reviews.
export const LOADING_ART_VERSION = 'solo-scenes-v1';
export const LOADING_LAYOUT_VERSION = 'solo-cover-centered-v1';
export const LOADING_SCENE_BOUNDS = Object.freeze({ x: 0, y: 0, width: 1024, height: 1536 });
// Composition candidate, not measured face evidence. Per-image reviewed bounds
// belong in loading-scenes.json and are consumed by this same geometry.
export const LOADING_FACE_BOUNDS = Object.freeze({ x: 358.4, y: 460.8, width: 307.2, height: 307.2 });
export const LOADING_LOGO_INK = Object.freeze({ x: 0, y: 85, width: 1024, height: 220 });

export function loadingLayout(viewport, { scene: art, failed = false, problem = false, labelHeight = 20, labelWidth } = {}) {
  const { x = 0, y = 0, width, height } = viewport;
  const insetTop = Math.max(0, viewport.inset?.top ?? 0);
  const insetBottom = Math.max(0, viewport.inset?.bottom ?? 0);
  const usableHeight = height - insetTop - insetBottom;
  const sourceWidth = art?.width ?? LOADING_SCENE_BOUNDS.width;
  const sourceHeight = art?.height ?? LOADING_SCENE_BOUNDS.height;
  const sceneScale = Math.max(width / sourceWidth, height / sourceHeight);
  const scene = { x: x + (width - sourceWidth * sceneScale) / 2,
    y: y + (height - sourceHeight * sceneScale) / 2,
    width: sourceWidth * sceneScale, height: sourceHeight * sceneScale, scale: sceneScale };
  const faceSource = art?.faceBounds ?? LOADING_FACE_BOUNDS;
  const face = { x: scene.x + faceSource.x * sceneScale, y: scene.y + faceSource.y * sceneScale,
    width: faceSource.width * sceneScale, height: faceSource.height * sceneScale };
  const crop = { x: (x - scene.x) / sceneScale, y: (y - scene.y) / sceneScale,
    width: width / sceneScale, height: height / sceneScale };
  const spacious = Math.max(0, Math.min(1, (usableHeight - 568) / 276));
  const inkTop = y + insetTop + Math.max(20, usableHeight * 0.04);
  const desiredLogoWidth = width * (0.84 + 0.04 * spacious);
  const logoWidth = Math.min(desiredLogoWidth, Math.max(1, face.y - inkTop - 12) * 1024 / LOADING_LOGO_INK.height);
  const logoScale = logoWidth / 1024;
  // Transparent logo margins may overlap open space; actual ink clears the face.
  const logo = { x: x + (width - logoWidth) / 2,
    y: inkTop - LOADING_LOGO_INK.y * logoScale, width: logoWidth, height: logoWidth * 400 / 1024 };
  const logoInk = { x: logo.x, y: inkTop, width: logoWidth, height: LOADING_LOGO_INK.height * logoScale };
  const bottom = y + height - insetBottom - Math.max(16, usableHeight * 0.025);
  const stackedControls = problem && width < 304;
  const controlsY = bottom - (stackedControls ? 84 : 38);
  const captionBottom = failed ? controlsY - 2 : bottom;
  const label = { x: x + width / 2, y: captionBottom - labelHeight - 3, width: width * 0.9,
    fontSize: Math.max(11, Math.min(17, width * 0.039)) };
  const bar = { x: x + width * 0.13, y: label.y - 18, width: width * 0.74, height: 11 };
  const captionWidth = Math.min(width * 0.96, (labelWidth ?? label.width) + 24);
  const caption = { x: label.x - captionWidth / 2, y: label.y - 3, width: captionWidth, height: labelHeight + 6 };
  const retry = { x: x + width / 2 - (problem && !stackedControls ? 138 : 65), y: controlsY, width: 130, height: 38 };
  const problemBox = { x: x + width / 2 + (stackedControls ? 0 : 74),
    y: controlsY + (stackedControls ? 67 : 19), width: 140, height: 34 };
  return { scene, face, crop, logo, logoInk, bar, label, caption, retry, problem: problemBox };
}
