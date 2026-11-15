// Scene registration shared by every stage and idle frame in the fish atlases.
export const fishRegistration = { x: 160, y: 210 };

// Display groups only: their counts never change the economic batch yield.
// Placements stay on the central open water of the shared pond, far to near.
export const fishSizeLayouts = {
  small: {
    scale: 0.40,
    placements: [
      { x: 160, y: 166, depth: 0.82 },
      { x: 112, y: 204, depth: 1 },
      { x: 180, y: 231, depth: 1.08 },
    ],
  },
  medium: {
    scale: 0.58,
    placements: [
      { x: 125, y: 188, depth: 0.88 },
      { x: 171, y: 225, depth: 1.05 },
    ],
  },
  large: {
    scale: 0.78,
    placements: [{ x: 160, y: 201, depth: 1 }],
  },
};
