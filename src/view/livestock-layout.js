// Display groups only: these counts never change the economic batch yield.
export const livestockSizeById = {
  L01: 'small', // 蛋鸡
  L02: 'large', // 奶用水牛
  L03: 'small', // 麻鸭
  L04: 'large', // 奶山羊
  L05: 'medium', // 产蛋鹅
  L06: 'large', // 黑猪
  L07: 'small', // 肉兔
  L08: 'large', // 小尾寒羊
  L09: 'medium', // 番鸭
  L10: 'large', // 肉用黄牛
  L11: 'small', // 鹌鹑
  L12: 'large', // 美利奴绵羊
  L13: 'small', // 中华蜜蜂
  L14: 'medium', // 火鸡
  L15: 'small', // 肉鸽
  L16: 'large', // 德州驴
  L17: 'large', // 牦牛
  L18: 'large', // 梅花鹿
  L19: 'large', // 蒙古马
  L20: 'large', // 鸵鸟
  L21: 'small', // 珍珠鸡
  L22: 'large', // 双峰驼
  L23: 'large', // 羊驼
  L24: 'medium', // 狮头鹅
  L25: 'large', // 黑山羊
  L26: 'small', // 泰和乌鸡
  L27: 'small', // 安哥拉兔
  L28: 'large', // 巴马香猪
  L29: 'small', // 家蚕
  L30: 'large', // 黑毛和牛
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
// Feed coordinates stay in the same fixed animal frame as mouth registration.
// Both the live scene and static fallback exporter consume this geometry.
export function livestockFeedLayout(feeding, texture, baseAnimalScale) {
  // Keep the redesigned cool-rim tray readable before depth perspective.
  // Animal size still controls mouth position; it must not shrink this floor.
  const visibleWidth = texture.mouthAnchor
    ? texture.sceneWidth / baseAnimalScale
    : Math.max(feeding.radiusX * 2, 52 / baseAnimalScale);
  const scale = visibleWidth / texture.bounds.width;
  const visibleHeight = texture.bounds.height * scale;
  const mouthDirection = Math.sign(feeding.x - 138) || 1;
  // The mouth meets the loaded rear of the tray; the front rim stays exposed.
  // Keep the registered mouth and animal feet fixed, and move feed + shadow.
  const groundX = texture.mouthAnchor
    ? feeding.x + (texture.anchor[0] - texture.mouthAnchor[0]) * scale
    : feeding.x + mouthDirection * visibleWidth * 0.2;
  const groundY = texture.mouthAnchor
    ? feeding.y - 3 + (texture.anchor[1] - texture.mouthAnchor[1]) * scale
    : feeding.y + visibleHeight * 0.55;
  return {
    x: groundX - texture.anchor[0] * scale,
    y: groundY - texture.anchor[1] * scale,
    width: texture.size[0] * scale,
    height: texture.size[1] * scale,
    scale,
    shadow: {
      x: groundX,
      y: groundY + feeding.radiusY * 0.1,
      radiusX: visibleWidth * 0.47,
      radiusY: Math.max(feeding.radiusY * 0.82, visibleWidth * 0.07),
      alpha: 0.2,
    },
  };
}
