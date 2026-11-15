// Display groups only: these counts never change the economic batch yield.
export const livestockSizeById = {
  L01: 'small', // 蛋鸡
  L02: 'large', // 奶用水牛
  L03: 'small', // 麻鸭
  L04: 'large', // 奶山羊
  L05: 'medium', // 产蛋鹅
  L06: 'large', // 黑猪
  L07: 'small', // 肉兔
  L08: 'large', // 肉用绵羊
  L09: 'medium', // 番鸭
  L10: 'large', // 肉用黄牛
};

// All placements use the atlas' fixed anatomical registration (138, 270).
// Feet farther down the barn floor get a larger perspective scale. Entries
// are ordered back to front so a nearer animal can cover the farther group.
const layouts = {
  small: {
    animalScale: 0.48,
    productSize: 33,
    placements: [
      { x: 152, y: 218, depth: 0.82 },
      { x: 82, y: 268, depth: 1 },
      { x: 225, y: 284, depth: 1.08 },
    ],
  },
  medium: {
    animalScale: 0.66,
    productSize: 48,
    placements: [
      { x: 103, y: 239, depth: 0.86 },
      { x: 212, y: 279, depth: 1.05 },
    ],
  },
  large: {
    animalScale: 1,
    productSize: 72,
    placements: [{ x: 160, y: 272, depth: 1 }],
  },
};

export function livestockLayout(id) {
  return layouts[livestockSizeById[id]];
}
