import { Container, Sprite } from 'pixi.js';
import visuals from '../content/estate-merchant-visuals.json' with { type: 'json' };

export function estateMerchantAsset(unlocked) {
  return unlocked ? 'merchant' : visuals.closed.assetName;
}

// Every estate asset name this cart can request (build-time manifest check).
export const estateMerchantAssetNames = () => [estateMerchantAsset(true), estateMerchantAsset(false),
  ...visuals.pennant.assetNames, visuals.lantern.assetName];

export function estateMerchantMotionBounds() {
  const boxes = [visuals.pennant.animationBBox, visuals.lantern.animationBBox];
  return [Math.min(...boxes.map((box) => box[0])), Math.min(...boxes.map((box) => box[1])),
    Math.max(...boxes.map((box) => box[2])), Math.max(...boxes.map((box) => box[3]))];
}

// Only the registered cloth and lamp move; the cart keeps its source registration.
// Textures belong to the map's shared cache and die with neither this mount nor its sprites.
export function mountEstateMerchant(art, { unit, unlocked, applyImage, markDirty }) {
  if (!unlocked) return undefined;
  const holder = art.addChild(new Container({ label: 'estate-merchant-parts' }));
  holder.visible = false;
  holder.eventMode = 'none';
  function part(name, layout) {
    const sprite = holder.addChild(new Sprite({ label: `estate-merchant-${name}`, roundPixels: true }));
    sprite.anchor.set(...layout.pivot);
    sprite.position.set((layout.attach[0] - 268) * unit, (layout.attach[1] - 160) * unit);
    sprite.scale.set(unit * layout.displaySize[0] / layout.canvas[0]);
    sprite.eventMode = 'none';
    sprite.visible = false;
    return sprite;
  }
  const pennant = part('pennant', visuals.pennant);
  const lantern = part('lantern', visuals.lantern);
  const frames = [];
  let requested = false;
  let frame = -1;
  return {
    setBaseReady() {
      if (!art.destroyed) holder.visible = true;
    },
    loadArt() {
      if (requested) return;
      requested = true;
      visuals.pennant.assetNames.forEach((name, index) => {
        applyImage(name, (texture) => {
          if (!texture || art.destroyed) return;
          frames[index] = texture;
          if (index === 0 && frame < 0) {
            pennant.texture = texture;
            pennant.visible = true;
            frame = 0;
          }
          markDirty();
        });
      });
      applyImage(visuals.lantern.assetName, (texture) => {
        if (!texture || art.destroyed) return;
        lantern.texture = texture;
        lantern.visible = true;
        markDirty();
      });
    },
    update(time) {
      if (!art.visible || !holder.visible) return false;
      let changed = false;
      const nextFrame = Math.floor(time / visuals.pennant.frameSeconds) % visuals.pennant.assetNames.length;
      if (frames[nextFrame] && frame !== nextFrame) {
        pennant.texture = frames[nextFrame];
        pennant.visible = true;
        frame = nextFrame;
        changed = true;
      }
      if (lantern.visible) {
        const angle = visuals.lantern.angle * Math.sin(Math.PI * 2 * time / visuals.lantern.periodSeconds);
        if (lantern.rotation !== angle) {
          lantern.rotation = angle;
          changed = true;
        }
      }
      return changed;
    },
  };
}
