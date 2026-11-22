import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { mountEstateAtmosphere } from './estate-atmosphere.js';
import { mountEstateWeather } from './estate-weather.js';
import { estateMerchantAsset, estateMerchantMotionBounds, mountEstateMerchant } from './estate-merchant.js';
import {
  estateResearchAsset, estateResearchFootprint, estateResearchMotionBounds, mountEstateResearch,
} from './estate-research.js';

// Keep the revised asset URLs in sync with the offline precache.
const assetVersions = { background: 7, fish: 2, field: 2, 'field-motion': 2, research: 2, 'research-motion': 3, operations: 2 };
export const estateAssetUrl = (name) => new URL(`./art/estate/${name}.webp?game=1&v=${assetVersions[name] ?? 1}`, document.baseURI).href;
export const estateMapAspect = 2.36;
const buildingArtWidth = 536;
const buildingArtHeight = 320;
const signWidthRatio = 0.224;
const turn = Math.PI * 2;
// Both chimneys use the same default plume dimensions in map-width units;
// layout-editor scale overrides still scale each building's plume with it.
// Three staggered puffs keep smoke visible across each wrap.
const chimneySmokeStyle = {
  size: 88, pivot: [0.28, 0.93], rise: 20, drift: 12,
  period: 4.4, puffCount: 3, peakAlpha: 0.62,
};

function cycle(time, period) {
  return (time % period) / period;
}

// Centers use map-width units on both axes. Footprints are source pixel bounds
// at half opacity, so transparent padding does not change scale.
// Props use position and longest side in the same 536 × 320 source space.
// A sign anchor can follow a facade axis or a distinct part of the footprint.
const sites = [
  { id: 'operations', label: '经营', center: [0.7621, 0.3134], footprint: [9, 27, 527, 311],
    widthRatio: 0.38, prop: [329, 194, 65], pivot: [0.5, 0.09], signAnchorX: 250,
    animate(sprite, time, unit, scale) {
      const phase = turn * cycle(time, 2.7);
      sprite.scale.x = scale * (0.87 + 0.13 * Math.cos(phase));
      sprite.rotation = 0.055 * Math.sin(phase);
    } },
  { id: 'tasks', label: '任务', center: [0.2131, 0.3063], footprint: [78, 31, 457, 310],
    widthRatio: 0.2, prop: [389, 122, 94], pivot: [0.52, 0.07],
    animate(sprite, time) {
      sprite.rotation = 0.09 * Math.sin(turn * cycle(time, 3.4));
      sprite.alpha = 0.94 + 0.06 * Math.sin(turn * cycle(time, 1.8));
    } },

  { id: 'livestock', label: '畜牧', center: [0.1947, 0.6626], footprint: [33, 21, 503, 309],
    widthRatio: 0.37, prop: [226, 264, 113], pivot: [0.5, 0.96],
    animate(sprite, time, unit, scale) {
      sprite.scale.y = scale * (1 + 0.078 * Math.sin(turn * cycle(time, 2.8)));
    } },
  { id: 'field', label: '田地', center: [0.7484, 0.7758], footprint: [39, 18, 497, 310],
    widthRatio: 0.408, prop: [398, 221, 89], pivot: [0.513, 0.982],
    animate(sprite, time) {
      sprite.rotation = 0.12 * Math.sin(turn * cycle(time, 3.5));
    } },

  { id: 'fish', label: '鱼塘', center: [0.6584, 1.2769], footprint: [11, 126, 528, 309],
    // Center the plaque on the inland pond; the offshore cages share its entry.
    widthRatio: 0.504, prop: [147, 245, 64], signAnchorX: 164,
    // Give the mine the narrow decorative fringe shared by their hit boxes.
    hitInsetLeft: 20,
    animate(sprite, time, unit, scale, x, y) {
      const phase = cycle(time, 8.4);
      const angle = turn * phase;
      sprite.position.set(x + 28 * unit * Math.cos(angle), y + 12 * unit * Math.sin(angle));
      sprite.scale.x = phase < 0.5 ? scale : -scale;
      sprite.alpha = 0.8;
    } },
  { id: 'mine', label: '矿洞', center: [0.2262, 1.385], footprint: [27, 37, 508, 309],
    widthRatio: 0.38, prop: [328, 263, 132], pivot: [0.5, 0.93],
    animate(sprite, time, unit, scale, x, y) {
      const angle = turn * cycle(time, 7.5);
      sprite.position.set(x + 51 * unit * Math.sin(angle), y + 14 * unit * Math.sin(angle));
    } },

  { id: 'processing', label: '加工', center: [0.6515, 1.6266], footprint: [32, 24, 504, 309],
    widthRatio: 0.37, prop: [348, 223, 152], smoke: { origin: [330, 32], phaseOffset: 0 },
    animate(sprite, time) {
      sprite.rotation = turn * cycle(time, 8);
    } },
  { id: 'refining', label: '精制', center: [0.2226, 1.7611], footprint: [28, 30, 506, 309],
    widthRatio: 0.34, smoke: { origin: [403, 37], phaseOffset: 1.1 } },

  { id: 'research', label: '研发', center: [0.2596, 2.1034], footprint: estateResearchFootprint,
    widthRatio: 0.344, signAnchorX: 228 },
  { id: 'warehouse', label: '仓库', center: [0.7205, 1.94], footprint: [30, 21, 506, 309],
    widthRatio: 0.37, prop: [484, 118, 106], pivot: [0.51, 0.08],
    animate(sprite, time, unit, scale) {
      const lift = (1 + Math.cos(turn * cycle(time, 6.7))) / 2;
      sprite.scale.y = scale * (0.72 + 0.28 * lift);
    } },
  // Append the travelling cart so the existing motion phases keep their indices.
  { id: 'merchant', label: '行脚商', center: [0.4923, 0.504], footprint: [54, 15, 497, 307],
    widthRatio: 0.198 },
  { id: 'orders', label: '订单中心', center: [0.5017, 0.9955], footprint: [34, 27, 502, 308],
    widthRatio: 0.258, prop: [199, 79, 92], pivot: [0.5, 4 / 84],
    animate(sprite, time) {
      sprite.rotation = 0.095 * Math.sin(turn * cycle(time, 3.8));
    } },
];

export function getEstateLayout() {
  return sites.map(({ id, label, center, widthRatio }) => ({ id, label, center: [...center], widthRatio }));
}

function emptySprite(label, anchor = [0.5, 0.5]) {
  const sprite = new Sprite({ label, roundPixels: true });
  sprite.anchor.set(...anchor);
  sprite.eventMode = 'none';
  sprite.visible = false;
  return sprite;
}

function fitSprite(sprite, texture, width, height) {
  const scale = Math.min(width / texture.width, height / texture.height);
  sprite.texture = texture;
  sprite.scale.set(scale);
  sprite.visible = true;
  return scale;
}

function taskGuide(parent, name, width, height, buildingTop, signBottom, hudBottom, focused) {
  const span = Math.min(176, Math.round(width * 0.43));
  const margin = 4;
  const center = Math.max(margin + span / 2, Math.min(width - margin - span / 2, parent.x));
  const below = buildingTop - 3 - height < hudBottom;
  const top = below ? signBottom + 3 : buildingTop - 3 - height;
  const guide = parent.addChild(new Container({ label: 'estate-guide-task' }));
  guide.position.set(center - parent.x, top - parent.y);
  const fill = 0xfff1c6;
  const border = focused ? 0x297b34 : 0x76502a;
  const frame = new Graphics().roundRect(-span / 2, 0, span, height, 6)
    .fill(fill).stroke({ color: border, width: focused ? 2 : 1 });
  const arrowX = parent.x - center;
  const arrowBase = below ? 0 : height;
  const arrowTip = below ? -3 : height + 3;
  frame.moveTo(arrowX - 5, arrowBase).lineTo(arrowX, arrowTip).lineTo(arrowX + 5, arrowBase)
    .fill(fill).stroke({ color: border, width: focused ? 2 : 1 });
  guide.addChild(frame);
  const caption = guide.addChild(new Text({
    text: `任务 · ${name}`,
    style: {
      fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: Math.max(13, Math.min(17, Math.round(width * 0.04))), fontWeight: '800', fill: 0x412918,
    },
  }));
  caption.anchor.set(0.5);
  caption.y = height / 2;
  const fit = Math.min(1, (span - 12) / caption.width);
  caption.scale.set(fit);
  return { left: center - span / 2, right: center + span / 2, top, bottom: top + height };
}

export function mountEstateMap(parent, {
  width, insetTop, onOpen, bind, markDirty, getImage, loadImage, loadAtmosphereImage = loadImage,
  researchReady, ordersReady, returnGiftSites, guideTaskName, focusedIndex, layoutOverrides, retainedAtmosphere, retainedResearch,
  weatherSession, getWeatherCloud, retainedWeather,
  merchantUnlocked = true,
}) {
  const height = Math.round(width * estateMapAspect);
  const preload = width * 0.22;
  const signWidth = Math.round(width * signWidthRatio);
  const signHeight = signWidth * 110 / 516;
  const signGap = Math.max(2, Math.round(width * 0.009));
  const smokeUnit = width * 0.37 / 472;
  let researchMotion;
  const labelSize = Math.max(13, Math.min(23, Math.round(signHeight * 0.76)));
  const guideHeight = Math.max(26, Math.round(width * 0.068));
  // The coin display ends 48px below the top safe inset.
  const hudBottom = insetTop === undefined ? 0 : insetTop + 50;
  function applyImage(name, mount) {
    const url = estateAssetUrl(name);
    const cached = getImage?.(url);
    // A rebuild can render before a resolved promise's continuation runs.
    if (cached) mount(cached);
    else loadImage(url).then(mount);
  }
  const backgroundLayer = parent.addChild(new Container({ label: 'estate-background-layer' }));
  const buildingLayer = parent.addChild(new Container({ label: 'estate-building-layer' }));
  const signLayer = parent.addChild(new Container({ label: 'estate-sign-layer' }));
  const controlLayer = parent.addChild(new Container({ label: 'estate-control-layer' }));
  const weatherShadowLayer = parent.addChild(new Container({ label: 'estate-weather-shadow-layer' }));
  weatherShadowLayer.eventMode = 'none';
  weatherShadowLayer.interactiveChildren = false;
  // Read-only birds cover the map's buildings, nameplates, and task guides.
  // The map viewport still clips them; global HUD/navigation/modals are siblings
  // mounted later by canvas-ui and remain above this entire map.
  let atmosphere;
  if (retainedAtmosphere?.matches(width, height)) atmosphere = retainedAtmosphere.attach(parent);
  else {
    retainedAtmosphere?.destroy();
    atmosphere = mountEstateAtmosphere(parent, { width, height, loadImage: loadAtmosphereImage, markDirty });
  }
  for (const layer of [backgroundLayer, buildingLayer, signLayer]) layer.eventMode = 'none';
  const background = backgroundLayer.addChild(emptySprite('estate-landscape', [0, 0]));
  applyImage('background', (texture) => {
    if (!texture || parent.destroyed) return;
    background.texture = texture;
    background.width = width;
    background.height = height;
    background.visible = true;
    markDirty();
  });

  // Cloud shadows cover buildings/plaques and remain below birds. Rain covers the map's
  // existing atmosphere but stays inside its scrolling mask, below global UI.
  let weather;
  if (weatherSession) {
    if (retainedWeather?.matches(width, height, weatherSession)) {
      weather = retainedWeather.attach(weatherShadowLayer, parent);
    } else {
      retainedWeather?.destroy();
      weather = mountEstateWeather(weatherShadowLayer, parent, {
        width, height, session: weatherSession, getCloudTexture: getWeatherCloud,
        loadAnimalImage: loadAtmosphereImage, markDirty,
      });
    }
  } else retainedWeather?.destroy();

  const entries = sites.map((site, index) => {
    const override = layoutOverrides?.[site.id];
    const [centerX, centerY] = override?.center ?? site.center;
    const widthRatio = override?.widthRatio ?? site.widthRatio;
    const {
      id, label, footprint: [artLeft, artTop, artRight, artBottom], prop, pivot,
      signAnchorX = (artLeft + artRight) / 2, hitInsetLeft = 0,
    } = site;
    const unit = width * widthRatio / (artRight - artLeft);
    const effectiveSmokeUnit = smokeUnit * widthRatio / site.widthRatio;
    const x = Math.round(width * centerX);
    const y = Math.round(width * centerY);
    const buildingSize = buildingArtWidth * unit;
    const buildingHeight = buildingArtHeight * unit;
    const signTop = (artBottom - buildingArtHeight / 2) * unit + signGap;
    const buildingTop = y + (artTop - buildingArtHeight / 2) * unit;
    const buildingLeft = x - buildingSize / 2 + (artLeft + hitInsetLeft) * unit;
    const buildingRight = x - buildingSize / 2 + artRight * unit;
    const signBottom = y + signTop + signHeight;
    const art = new Container({ label: `estate-scene-${id}` });
    art.position.set(x, y);
    art.visible = false;
    buildingLayer.addChild(art);
    const plaque = new Container({ label: `estate-nameplate-${id}` });
    const plaqueX = Math.round(x - buildingSize / 2 + signAnchorX * unit);
    plaque.position.set(plaqueX, y);
    plaque.visible = false;
    signLayer.addChild(plaque);

    const building = art.addChild(emptySprite(`estate-building-${id}`));
    const merchantMotion = id === 'merchant'
      ? mountEstateMerchant(art, { unit, unlocked: merchantUnlocked, applyImage, markDirty }) : undefined;
    if (id === 'research') {
      if (retainedResearch?.matches(unit)) researchMotion = retainedResearch.attach(art);
      else {
        retainedResearch?.destroy();
        researchMotion = mountEstateResearch(art, { unit, applyImage, markDirty });
      }
    }
    const researchAnimation = id === 'research' ? researchMotion : undefined;
    const motion = prop && site.animate ? art.addChild(emptySprite(`estate-motion-${id}`, pivot)) : undefined;
    const [propX, propY, motionSize] = prop ?? [buildingArtWidth / 2, buildingArtHeight / 2, 0];
    const motionX = (propX - buildingArtWidth / 2) * unit;
    const motionY = (propY - buildingArtHeight / 2) * unit;
    motion?.position.set(motionX, motionY);
    const chimney = site.smoke;
    const chimneySmoke = chimney ? Array.from({ length: chimneySmokeStyle.puffCount }, (_, part) =>
      art.addChild(emptySprite(`estate-${id}-smoke-${part}`, chimneySmokeStyle.pivot))) : [];
    const smokeX = chimney ? (chimney.origin[0] - buildingArtWidth / 2) * unit : 0;
    const smokeY = chimney ? (chimney.origin[1] - buildingArtHeight / 2) * unit : 0;
    const sign = plaque.addChild(emptySprite(`estate-sign-${id}`));
    sign.y = signTop + signHeight / 2;
    const text = new Text({
      text: label,
      style: {
        fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: labelSize, fontWeight: '800', fill: 0x412918,
        stroke: { color: 0xffedc1, width: 1.5 },
      },
    });
    text.anchor.set(0.5);
    text.y = sign.y;
    plaque.addChild(text);

    if (id === 'orders') text.scale.set(Math.min(1, Math.max(1, signWidth - 10) / Math.max(1, text.width)));

    if (returnGiftSites?.has(id) || (id === 'research' && researchReady) || (id === 'orders' && ordersReady)) {
      const marker = new Graphics().circle(signWidth / 2 - 7, signTop + 7, 5)
        .fill(0xd85b37).stroke({ color: 0xfff1cf, width: 1.5 });
      plaque.addChild(marker);
    }

    const focus = new Graphics().roundRect(-signWidth / 2 - 2, signTop - 2, signWidth + 4, signHeight + 4, 5)
      .stroke({ color: 0xfff0a9, width: 2 });
    focus.visible = index === focusedIndex;
    plaque.addChild(focus);

    const guide = id === 'tasks' && guideTaskName
      ? taskGuide(plaque, guideTaskName, width, guideHeight, buildingTop, signBottom, hudBottom, focus.visible) : undefined;
    const top = Math.min(buildingTop, guide?.top ?? buildingTop);
    const bottom = Math.max(signBottom, guide?.bottom ?? signBottom);
    const left = Math.min(buildingLeft, plaqueX - signWidth / 2, guide?.left ?? buildingLeft);
    const right = Math.max(buildingRight, plaqueX + signWidth / 2, guide?.right ?? buildingRight);
    // Keep the part of the task board under the read-only coin display from opening a page.
    const hitTop = id === 'tasks' ? Math.min(y + signTop, Math.max(top, hudBottom)) : top;

    // The same canvas control covers the objective, building and nameplate, including
    // keyboard focus and the shared suppression of taps after a drag.
    const hotspot = new Container({ label: `estate-entry-${id}` });
    controlLayer.addChild(hotspot);
    bind(hotspot, left, hitTop, right - left, bottom - hitTop, () => onOpen(id));
    hotspot.on('pointerover', () => { sign.tint = 0xffe2b8; markDirty(); });
    hotspot.on('pointerout', () => { sign.tint = 0xffffff; markDirty(); });

    applyImage('sign', (texture) => {
      if (!texture || art.destroyed) return;
      fitSprite(sign, texture, signWidth, signHeight);
      text.style.stroke = undefined;
      markDirty();
    });

    let artRequested = false;
    let motionScale;
    let smokeScale;
    function update(time, now) {
      if (researchAnimation) return building.visible && researchAnimation.update(now);
      if (merchantMotion) return building.visible && merchantMotion.update(time);
      if (!building.visible) return false;
      let animated = false;
      if (motion && motionScale) {
        motion.visible = true;
        site.animate(motion, time + index * 0.73, unit, motionScale, motionX, motionY);
        animated = true;
      }
      if (smokeScale) {
        for (let part = 0; part < chimneySmoke.length; part += 1) {
          const sprite = chimneySmoke[part];
          const phase = cycle(time + chimney.phaseOffset + part * chimneySmokeStyle.period / chimneySmokeStyle.puffCount,
            chimneySmokeStyle.period);
          sprite.visible = true;
          sprite.position.set(smokeX + phase * chimneySmokeStyle.drift * effectiveSmokeUnit,
            smokeY - phase * chimneySmokeStyle.rise * effectiveSmokeUnit);
          sprite.scale.set(smokeScale * (0.53 + phase * 0.47));
          sprite.alpha = chimneySmokeStyle.peakAlpha * Math.sin(Math.PI * phase);
        }
        animated = true;
      }
      return animated;
    }
    function loadArt() {
      if (artRequested) return;
      artRequested = true;
      applyImage(id === 'merchant' ? estateMerchantAsset(merchantUnlocked) : id === 'research' ? estateResearchAsset : id, (texture) => {
        if (!texture || art.destroyed) return;
        fitSprite(building, texture, buildingSize, buildingHeight);
        merchantMotion?.setBaseReady();
        researchAnimation?.setBaseReady();
        markDirty();
      });
      merchantMotion?.loadArt();
      researchAnimation?.loadArt();
      if (motion) applyImage(`${id}-motion`, (texture) => {
        if (!texture || art.destroyed) return;
        const size = motionSize * unit;
        motionScale = fitSprite(motion, texture, size, size);
        motion.visible = false;
        if (art.visible) {
          const now = performance.now();
          update(now / 1000, now);
        }
        markDirty();
      });
      if (chimneySmoke.length) applyImage('refining-motion', (texture) => {
        if (!texture || art.destroyed) return;
        const size = chimneySmokeStyle.size * effectiveSmokeUnit;
        for (const sprite of chimneySmoke) {
          smokeScale = fitSprite(sprite, texture, size, size);
          sprite.visible = false;
        }
        if (art.visible) {
          const now = performance.now();
          update(now / 1000, now);
        }
        markDirty();
      });
    }

    const motionBounds = researchAnimation ? estateResearchMotionBounds : merchantMotion ? estateMerchantMotionBounds() : undefined;
    const animatedTop = motionBounds ? Math.min(top, y + (motionBounds[1] - buildingArtHeight / 2) * unit)
      : chimneySmoke.length ? Math.min(top, y + smokeY - (chimneySmokeStyle.size + chimneySmokeStyle.rise) * effectiveSmokeUnit) : top;
    const animatedBottom = motionBounds ? Math.max(bottom, y + (motionBounds[3] - buildingArtHeight / 2) * unit) : bottom;
    return { art, plaque, top: animatedTop, bottom: animatedBottom, loadArt, update, pause: () => researchAnimation?.pause() };
  });

  let visibleEntries = [];
  return {
    height,
    parkAtmosphere() { return atmosphere.park(); },
    parkResearch() { return researchMotion?.park(); },
    parkWeather() { return weather?.park(); },
    pauseAnimations() { atmosphere.pause(); researchMotion?.pause(); weather?.pause(); },
    setViewport(scroll, viewportHeight) {
      atmosphere.setViewport(scroll, viewportHeight);
      weather?.setViewport(scroll, viewportHeight);
      const viewportEnd = scroll + viewportHeight;
      visibleEntries = [];
      for (const entry of entries) {
        entry.art.visible = entry.bottom > scroll && entry.top < viewportEnd;
        entry.plaque.visible = entry.art.visible;
        if (entry.art.visible) visibleEntries.push(entry);
        else entry.pause();
        if (entry.bottom > scroll - preload && entry.top < viewportEnd + preload) entry.loadArt();
      }
    },
    update(now, atmosphereActive = false, buildingsActive = true) {
      let animated = atmosphere.update(now, atmosphereActive);
      if (weather?.update(now, atmosphereActive)) animated = true;
      const time = now / 1000;
      if (buildingsActive) {
        for (const entry of visibleEntries) if (entry.update(time, now)) animated = true;
      } else researchMotion?.pause();
      return animated;
    },
  };
}
