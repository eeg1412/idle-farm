import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import visuals from '../content/workshop-visuals.json' with { type: 'json' };
import { workshopSceneLayout, workshopMotionFrame } from './workshop-layout.js';
export { workshopIconIds, workshopTextureSources } from './workshop-layout.js';

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

function itemSprite(parent, texture, size) {
  const sprite = new Sprite({ texture, roundPixels: true });
  sprite.eventMode = 'none';
  sprite.anchor.set(0.5);
  sprite.scale.set(size / Math.max(texture.width, texture.height));
  parent.addChild(sprite);
  return sprite;
}

function maskedItems(parent, label, bounds) {
  const items = layer(parent, label);
  const mask = new Graphics().rect(bounds.x, bounds.y, bounds.width, bounds.height).fill(0xffffff);
  mask.eventMode = 'none';
  parent.addChild(mask);
  items.mask = mask;
  return items;
}

// Only invisible masks use Graphics. The borderless moving belt surface and
// solid machine body use the separately generated bitmap assets.
export function mountWorkshopAnimation(parent, textures, box, reference, readStation, motion) {
  const { id, kind } = reference;
  const layout = workshopSceneLayout(id, kind);
  const scene = layer(parent, 'workshop-topdown');
  const fit = Math.min(box.width / layout.stage.width, box.height / layout.stage.height);
  scene.scale.set(fit);
  scene.position.set(box.x + (box.width - layout.stage.width * fit) / 2,
    box.y + (box.height - layout.stage.height * fit) / 2);
  const stageMask = new Graphics().rect(scene.x, scene.y,
    layout.stage.width * fit, layout.stage.height * fit).fill(0xffffff);
  stageMask.eventMode = 'none';
  parent.addChild(stageMask);
  scene.mask = stageMask;
  const conveyorLayer = layer(scene, 'workshop-conveyor-layer');
  const machineLayer = layer(scene, 'workshop-machine-layer');
  const smokeLayer = layer(scene, 'workshop-smoke-layer');
  const movingSurface = layer(conveyorLayer, 'workshop-moving-surfaces');
  const canonicalItems = layer(conveyorLayer, 'workshop-canonical-items');
  const inputItems = maskedItems(canonicalItems, 'workshop-input-packets', layout.itemMasks.input);
  const outputItems = maskedItems(canonicalItems, 'workshop-output-items', layout.itemMasks.output);
  const tread = visuals.conveyor.tread;
  const surfaces = layout.surfaceRegions.map((region) => {
    const { bounds } = region;
    const surface = new TilingSprite({
      texture: textures.get(textureKey('tread')), width: bounds.width, height: bounds.height,
      tileScale: { x: tread.logicalSize[0] / tread.size[0], y: bounds.height / tread.size[1] },
      tileRotation: 0,
    });
    surface.eventMode = 'none';
    surface.position.set(bounds.x, bounds.y);
    const mask = new Graphics().poly(region.polygon).fill(0xffffff);
    mask.eventMode = 'none';
    movingSurface.addChild(surface, mask);
    surface.mask = mask;
    return surface;
  });
  const stream = layout.inputStream;
  const inputs = Array.from({ length: stream.capacity }, () => {
    const material = stream.materials[0];
    const sprite = itemSprite(inputItems, textures.get(material), stream.size);
    sprite.visible = false;
    return { id: material, sprite };
  });
  const product = itemSprite(outputItems, textures.get(id), layout.output.size);
  product.visible = false;
  bitmap(machineLayer, textures.get(textureKey('machine')), layout.machine.placement);
  const gearLayer = layer(machineLayer, 'workshop-gear-layer');
  const gearTexture = textures.get(textureKey('gear'));
  const gears = layout.gear.mounts.map(({ position: [x, y], size }) => {
    const sprite = bitmap(gearLayer, gearTexture, { x, y, width: size, height: size });
    sprite.anchor.set(...layout.gear.anchor);
    return sprite;
  });
  const chimneyLayer = layer(machineLayer, 'workshop-chimney-layer');
  const chimneyTexture = textures.get(textureKey('chimney'));
  const [chimneyWidth, chimneyHeight] = layout.chimney.size;
  layout.chimney.mounts.forEach(({ position: [x, y] }) => {
    const sprite = bitmap(chimneyLayer, chimneyTexture, { x, y, width: chimneyWidth, height: chimneyHeight });
    sprite.anchor.set(...layout.chimney.anchor);
  });
  const smoke = Array.from({ length: layout.smoke.capacity }, () => {
    const sprite = itemSprite(smokeLayer, textures.get(textureKey('smoke:0')), layout.smoke.startSize);
    sprite.visible = false;
    return { sprite, textureIndex: 0 };
  });

  const phaseState = motion ?? {};
  if (phaseState.id !== id || phaseState.lastClock === undefined) {
    phaseState.id = id;
    phaseState.clock = 0;
    phaseState.started = false;
    phaseState.wasRunning = false;
  }
  let destroyed = false;
  function update({ clock }) {
    if (destroyed || scene.destroyed) return;
    const station = readStation();
    scene.visible = (station?.batch?.id ?? station?.recipe) === id;
    if (!scene.visible) return;
    const batch = station.batch;
    const running = batch?.id === id && batch.end > batch.start && clock >= batch.start && clock < batch.end;
    if (running) {
      if (phaseState.wasRunning) phaseState.clock += Math.max(0, clock - phaseState.lastClock);
      phaseState.started = true;
    }
    phaseState.lastClock = clock;
    phaseState.wasRunning = running;
    const frame = workshopMotionFrame(layout, phaseState.clock,
      { started: phaseState.started, running });
    surfaces.forEach((surface, index) => surface.tilePosition.set(...frame.surfaceOffsets[index]));
    inputs.forEach((packet, index) => {
      const { sprite } = packet;
      const item = frame.inputs[index];
      sprite.visible = item.visible;
      if (sprite.visible) {
        if (packet.id !== item.id) {
          const texture = textures.get(item.id);
          sprite.texture = texture;
          sprite.scale.set(stream.size / Math.max(texture.width, texture.height));
          packet.id = item.id;
        }
        sprite.position.set(...item.position);
      }
    });
    // Both item classes stay below the real machine bitmap. Its registered
    // opaque cover points hide intake sprites and reveal the output naturally.
    product.visible = frame.output.visible;
    if (product.visible) {
      product.position.set(...frame.output.position);
      product.alpha = 1;
    }
    machineLayer.position.set(...frame.machineOffset);
    gears.forEach((gear, index) => { gear.rotation = frame.gearAngles[index]; });
    smoke.forEach((puff, index) => {
      const particle = frame.smoke[index];
      const { sprite } = puff;
      sprite.visible = Boolean(particle);
      if (!particle) return;
      if (puff.textureIndex !== particle.textureIndex) {
        sprite.texture = textures.get(textureKey('smoke:' + particle.textureIndex));
        puff.textureIndex = particle.textureIndex;
      }
      sprite.position.set(...particle.position);
      sprite.scale.set(particle.size / Math.max(sprite.texture.width, sprite.texture.height));
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
    },
  };
}
