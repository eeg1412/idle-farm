import { Container, Graphics, Sprite } from 'pixi.js';
import { miningCargoRect, miningFrame, sampleMiningAnimation } from './mining-layout.js';

export function mountMiningAnimation(parent, textures, box, visuals, batch, session, readBatch) {
  const container = new Container();
  container.label = 'mining-animation';
  container.eventMode = 'none';
  container.position.set(box.x, box.y);
  const scene = new Container();
  const factor = Math.max(box.width, box.height) / visuals.sceneSize;
  scene.scale.set(factor);
  scene.position.set((box.width - visuals.sceneSize * factor) / 2, (box.height - visuals.sceneSize * factor) / 2);
  const clip = new Graphics().roundRect(0, 0, box.width, box.height, 10).fill(0xffffff);
  container.addChild(scene, clip);
  scene.mask = clip;
  const sprite = (texture, label) => {
    texture.source.scaleMode = 'nearest';
    const node = new Sprite({ texture, roundPixels: true });
    node.label = label;
    node.eventMode = 'none';
    scene.addChild(node);
    return node;
  };
  const background = sprite(textures.background, 'mining-background');
  background.width = visuals.sceneSize;
  background.height = visuals.sceneSize;
  const foreground = sprite(textures.foreground, 'mining-mouth-art');
  const rect = visuals.foreground.rect;
  foreground.position.set(rect.x, rect.y);
  foreground.width = rect.width;
  foreground.height = rect.height;
  const cart = sprite(textures.cart, 'mining-cart');
  const cargo = sprite(textures.icon, 'mining-canonical-cargo');
  parent.addChild(container);
  let previousPosition;
  let previousCargoAlpha;
  return {
    update({ clock }) {
      const activeBatch = readBatch?.() ?? batch;
      const sample = sampleMiningAnimation({ session, batch: activeBatch, clock });
      if (previousPosition === sample.position && previousCargoAlpha === sample.cargoAlpha) return false;
      previousPosition = sample.position;
      previousCargoAlpha = sample.cargoAlpha;
      const frame = miningFrame(visuals, sample);
      cart.position.set(frame.cart.x, frame.cart.y);
      cart.width = frame.cart.width;
      cart.height = frame.cart.height;
      cart.alpha = frame.cart.alpha;
      const icon = miningCargoRect(frame.cargo, textures.icon.width, textures.icon.height);
      cargo.position.set(icon.x, icon.y);
      cargo.width = icon.width;
      cargo.height = icon.height;
      cargo.alpha = icon.alpha;
      return true;
    },
    destroy() { container.destroy({ children: true }); },
  };
}
