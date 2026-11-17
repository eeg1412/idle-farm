import { Container, Graphics, Rectangle, Sprite, Texture, TilingSprite } from 'pixi.js';
import itemBottoms from '../content/workshop-item-bottoms.json' with { type: 'json' };
import { syncWorkshopMotion, workshopSceneLayout, workshopMotionFrame } from './workshop-layout.js';
export { syncWorkshopMotion, workshopIconIds, workshopTextureSources } from './workshop-layout.js';

const textureKey = (key) => 'workshop:' + key;

function layer(parent, label) {
  const node = new Container();
  node.eventMode = 'none';
  node.label = label;
  parent.addChild(node);
  return node;
}

function bitmap(parent, texture, placement) {
  const sprite = new Sprite({ texture, roundPixels: true });
  sprite.eventMode = 'none';
  sprite.position.set(placement.x, placement.y);
  sprite.width = placement.width;
  sprite.height = placement.height;
  parent.addChild(sprite);
  return sprite;
}

function itemSprite(parent, texture, size, anchorY = 0.5) {
  const sprite = new Sprite({ texture, roundPixels: true });
  sprite.eventMode = 'none';
  sprite.anchor.set(0.5, anchorY);
  sprite.scale.set(size / Math.max(texture.width, texture.height));
  parent.addChild(sprite);
  return sprite;
}

const itemAnchorY = (id, texture) => (itemBottoms[id] ?? texture.height) / texture.height;

function maskedItems(parent, label, bounds) {
  const items = layer(parent, label);
  const mask = new Graphics().rect(bounds.x, bounds.y, bounds.width, bounds.height).fill(0xffffff);
  mask.eventMode = 'none';
  parent.addChild(mask);
  items.mask = mask;
  return items;
}

export function mountWorkshopAnimation(parent, textures, box, reference, readStation, motion) {
  const { id, kind } = reference;
  const layout = workshopSceneLayout(id, kind);
  const scene = layer(parent, 'workshop-front');
  scene.scale.set(box.width / layout.stage.width, box.height / layout.stage.height);
  scene.position.set(box.x, box.y);
  const stageMask = new Graphics().rect(box.x, box.y, box.width, box.height).fill(0xffffff);
  stageMask.eventMode = 'none';
  parent.addChild(stageMask);
  scene.mask = stageMask;

  const background = bitmap(scene, textures.get(textureKey('background')), {
    x: 0, y: 0, width: layout.stage.width, height: layout.stage.height,
  });
  background.label = 'workshop-background';

  const conveyorLayer = layer(scene, 'workshop-conveyor-layer');
  const baseTexture = textures.get(textureKey('base'));
  const treadTexture = new Texture({
    source: textures.get(textureKey('tread')).source,
    frame: new Rectangle(...layout.treadFrame),
  });
  const surfaces = layout.surfaceRegions.map(({ base, bounds }) => {
    bitmap(conveyorLayer, baseTexture, base);
    const surface = new TilingSprite({
      texture: treadTexture, width: bounds.width, height: bounds.height,
      tileScale: { x: layout.surfacePeriod / treadTexture.width, y: bounds.height / treadTexture.height },
    });
    surface.eventMode = 'none';
    surface.position.set(bounds.x, bounds.y);
    conveyorLayer.addChild(surface);
    return surface;
  });

  const items = layer(scene, 'workshop-canonical-items');
  const inputItems = maskedItems(items, 'workshop-input-packets', layout.itemMasks.input);
  const outputItems = maskedItems(items, 'workshop-output-items', layout.itemMasks.output);
  const stream = layout.inputStream;
  const inputs = Array.from({ length: stream.capacity }, () => {
    const material = stream.materials[0];
    const texture = textures.get(material);
    const sprite = itemSprite(inputItems, texture, stream.size, itemAnchorY(material, texture));
    sprite.visible = false;
    return { id: material, sprite };
  });
  const productTexture = textures.get(id);
  const product = itemSprite(outputItems, productTexture, layout.output.size, itemAnchorY(id, productTexture));
  product.visible = false;

  const machineLayer = layer(scene, 'workshop-machine-layer');
  const [chimneyX, chimneyY] = layout.chimney.position;
  const [chimneyWidth, chimneyHeight] = layout.chimney.logicalSize;
  const chimney = bitmap(machineLayer, textures.get(textureKey('chimney')), {
    x: chimneyX, y: chimneyY, width: chimneyWidth, height: chimneyHeight,
  });
  chimney.anchor.set(0.5, 1);
  bitmap(machineLayer, textures.get(textureKey('machine')), layout.machine.placement);
  const [gearX, gearY] = layout.gear.position;
  const gear = bitmap(machineLayer, textures.get(textureKey('gear')), {
    x: gearX, y: gearY, width: layout.gear.diameter, height: layout.gear.diameter,
  });
  gear.anchor.set(0.5);

  const smokeLayer = layer(scene, 'workshop-smoke-layer');
  const smokeTexture = textures.get(textureKey('smoke'));
  const smoke = Array.from({ length: layout.smoke.capacity }, () => {
    const sprite = itemSprite(smokeLayer, smokeTexture, layout.smoke.startSize);
    sprite.visible = false;
    return sprite;
  });

  const phase = motion ?? { id };
  if (phase.id !== id) {
    Object.assign(phase, { id, clock: 0, lastClock: undefined, batch: undefined, outputStart: undefined });
  }
  let destroyed = false;
  function update({ clock }) {
    if (destroyed || scene.destroyed) return;
    const station = readStation();
    scene.visible = (station?.batch?.id ?? station?.recipe) === id;
    if (!scene.visible) return;
    const running = syncWorkshopMotion(phase, station, clock);
    const outputElapsed = phase.outputStart === undefined ? undefined : clock - phase.outputStart;
    const frame = workshopMotionFrame(layout, phase.clock, { running, outputElapsed });
    surfaces.forEach((surface, index) => surface.tilePosition.set(...frame.surfaceOffsets[index]));
    inputs.forEach((packet, index) => {
      const { sprite } = packet;
      const item = frame.inputs[index];
      sprite.visible = Boolean(item?.visible);
      if (!sprite.visible) return;
      if (packet.id !== item.id) {
        const texture = textures.get(item.id);
        sprite.texture = texture;
        sprite.anchor.y = itemAnchorY(item.id, texture);
        sprite.scale.set(stream.size / Math.max(texture.width, texture.height));
        packet.id = item.id;
      }
      sprite.position.set(...item.position);
    });
    product.visible = frame.output.visible;
    if (product.visible) product.position.set(...frame.output.position);
    machineLayer.position.set(...frame.machineOffset);
    gear.rotation = frame.gearAngle;
    smoke.forEach((sprite, index) => {
      const particle = frame.smoke[index];
      sprite.visible = Boolean(particle?.alpha > 0);
      if (!sprite.visible) return;
      sprite.position.set(...particle.position);
      sprite.scale.set(particle.size / Math.max(smokeTexture.width, smokeTexture.height));
      sprite.alpha = particle.alpha;
    });
  }

  return {
    update,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scene.destroy({ children: true });
      stageMask.destroy();
      treadTexture.destroy();
    },
  };
}
