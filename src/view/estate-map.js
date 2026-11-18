import { Container, Graphics, Sprite, Text } from 'pixi.js';

// Keep the revised asset URLs in sync with the offline precache.
const assetVersions = { background: 6, fish: 2, field: 2, 'field-motion': 2, 'research-motion': 2, operations: 2 };
export const estateAssetUrl = (name) => new URL(`./art/estate/${name}.webp?game=1&v=${assetVersions[name] ?? 1}`, document.baseURI).href;
export const estateMapAspect = 2.36;
const buildingArtWidth = 536;
const buildingArtHeight = 320;
const signWidthRatio = 0.224;
const turn = Math.PI * 2;

function cycle(time, period) {
  return (time % period) / period;
}

// Centers use map-width units on both axes. Footprints are source pixel bounds
// at half opacity, so transparent padding does not change scale.
// Props use position and longest side in the same 536 × 320 source space.
// A sign anchor can follow a facade axis or a distinct part of the footprint.
const sites = [
  { id: 'operations', label: '经营', center: [0.7357, 0.3163], footprint: [9, 27, 527, 311],
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
  { id: 'field', label: '田地', center: [0.6731, 0.8245], footprint: [39, 18, 497, 310],
    widthRatio: 0.51, prop: [398, 221, 89], pivot: [0.513, 0.982],
    animate(sprite, time) {
      sprite.rotation = 0.12 * Math.sin(turn * cycle(time, 3.5));
    } },

  { id: 'fish', label: '鱼池', center: [0.6584, 1.2769], footprint: [11, 126, 528, 309],
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
  { id: 'mine', label: '矿洞', center: [0.235, 1.385], footprint: [27, 37, 508, 309],
    widthRatio: 0.38, prop: [328, 263, 132], pivot: [0.5, 0.93],
    animate(sprite, time, unit, scale, x, y) {
      const angle = turn * cycle(time, 7.5);
      sprite.position.set(x + 51 * unit * Math.sin(angle), y + 14 * unit * Math.sin(angle));
    } },

  { id: 'processing', label: '加工', center: [0.6515, 1.6266], footprint: [32, 24, 504, 309],
    widthRatio: 0.37, prop: [348, 223, 152],
    animate(sprite, time) {
      sprite.rotation = turn * cycle(time, 8);
    } },
  { id: 'refining', label: '精制', center: [0.2226, 1.7611], footprint: [28, 30, 506, 309],
    widthRatio: 0.34, prop: [403, 37, 122], pivot: [0.28, 0.93],
    animate(sprite, time, unit, scale, x, y) {
      const phase = cycle(time, 4.4);
      sprite.position.set(x + phase * 17 * unit, y - phase * 26 * unit);
      sprite.scale.set(scale * (0.53 + phase * 0.47));
      sprite.alpha = 0.82 * Math.sin(Math.PI * phase);
    } },

  { id: 'research', label: '研发', center: [0.2596, 2.1034], footprint: [29, 12, 507, 309],
    widthRatio: 0.344, prop: [455, 305, 127], pivot: [0.42, 0.982], signAnchorX: 228,
    animate(sprite, time) {
      sprite.rotation = 0.05 * Math.sin(turn * cycle(time, 5.6));
    } },
  { id: 'warehouse', label: '仓库', center: [0.7469, 2.0221], footprint: [30, 21, 506, 309],
    widthRatio: 0.37, prop: [484, 118, 106], pivot: [0.51, 0.08],
    animate(sprite, time, unit, scale) {
      const lift = (1 + Math.cos(turn * cycle(time, 6.7))) / 2;
      sprite.scale.y = scale * (0.72 + 0.28 * lift);
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
  width, insetTop, onOpen, bind, markDirty, getImage, loadImage, researchReady, guideTaskName, focusedIndex, layoutOverrides,
}) {
  const height = Math.round(width * estateMapAspect);
  const preload = width * 0.22;
  const signWidth = Math.round(width * signWidthRatio);
  const signHeight = signWidth * 110 / 516;
  const signGap = Math.max(2, Math.round(width * 0.009));
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

  const entries = sites.map((site, index) => {
    const override = layoutOverrides?.[site.id];
    const [centerX, centerY] = override?.center ?? site.center;
    const widthRatio = override?.widthRatio ?? site.widthRatio;
    const {
      id, label, footprint: [artLeft, artTop, artRight, artBottom], prop, pivot,
      signAnchorX = (artLeft + artRight) / 2, hitInsetLeft = 0,
    } = site;
    const unit = width * widthRatio / (artRight - artLeft);
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
    const motion = art.addChild(emptySprite(`estate-motion-${id}`, pivot));
    const [propX, propY, motionSize] = prop;
    const motionX = (propX - buildingArtWidth / 2) * unit;
    const motionY = (propY - buildingArtHeight / 2) * unit;
    motion.position.set(motionX, motionY);
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

    if (id === 'research' && researchReady) {
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
    function update(time) {
      if (!building.visible || !motionScale) return false;
      motion.visible = true;
      site.animate(motion, time + index * 0.73, unit, motionScale, motionX, motionY);
      return true;
    }
    function loadArt() {
      if (artRequested) return;
      artRequested = true;
      applyImage(id, (texture) => {
        if (!texture || art.destroyed) return;
        fitSprite(building, texture, buildingSize, buildingHeight);
        markDirty();
      });
      applyImage(`${id}-motion`, (texture) => {
        if (!texture || art.destroyed) return;
        const size = motionSize * unit;
        motionScale = fitSprite(motion, texture, size, size);
        motion.visible = false;
        if (art.visible) update(performance.now() / 1000);
        markDirty();
      });
    }

    const animatedTop = id === 'refining' ? Math.min(top, y + motionY - (motionSize + 26) * unit) : top;
    return { art, plaque, top: animatedTop, bottom, loadArt, update };
  });

  let visibleEntries = [];
  return {
    height,
    setViewport(scroll, viewportHeight) {
      const viewportEnd = scroll + viewportHeight;
      visibleEntries = [];
      for (const entry of entries) {
        entry.art.visible = entry.bottom > scroll && entry.top < viewportEnd;
        entry.plaque.visible = entry.art.visible;
        if (entry.art.visible) visibleEntries.push(entry);
        if (entry.bottom > scroll - preload && entry.top < viewportEnd + preload) entry.loadArt();
      }
    },
    update(now) {
      let animated = false;
      const time = now / 1000;
      for (const entry of visibleEntries) if (entry.update(time)) animated = true;
      return animated;
    },
  };
}
