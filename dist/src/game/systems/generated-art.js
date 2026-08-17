export const GENERATED_ATLAS = 'generated-atlas';

export const HERO_ART = Object.freeze({
  idle: { frame: 'hero_idle', height: 126, ox: 0, oy: 0 },
  runA: { frame: 'hero_run_a', height: 124, ox: 2, oy: -1 },
  runB: { frame: 'hero_run_b', height: 124, ox: 5, oy: -1 },
  jump: { frame: 'hero_jump', height: 136, ox: 0, oy: -6 },
  land: { frame: 'hero_land', height: 128, ox: 5, oy: 2 },
  light: { frame: 'hero_light', height: 194, ox: 54, oy: -3 },
  heavy: { frame: 'hero_heavy', height: 215, ox: 44, oy: -9 },
  skill: { frame: 'hero_cast', height: 205, ox: 4, oy: -13 },
  dash: { frame: 'hero_dash', height: 162, ox: 54, oy: -3 },
});

export const MONSTER_ART = Object.freeze({
  slime: {
    idle: { frame: 'slime_idle', height: 66 },
    move: { frame: 'slime_jump', height: 76 },
    attack: { frame: 'slime_attack', height: 78 },
    hit: { frame: 'slime_hit', height: 68 },
  },
  wisp: {
    idle: { frame: 'wisp_idle', height: 86 },
    move: { frame: 'wisp_move', height: 88 },
    attack: { frame: 'wisp_cast', height: 102 },
    hit: { frame: 'wisp_hit', height: 86 },
  },
  brute: {
    idle: { frame: 'brute_idle', height: 144 },
    move: { frame: 'brute_walk', height: 144 },
    attack: { frame: 'brute_windup', height: 168 },
    slam: { frame: 'brute_slam', height: 190 },
    hit: { frame: 'brute_hit', height: 158 },
    down: { frame: 'brute_down', height: 145 },
  },
});

export function atlasHas(scene, frameName) {
  if (!scene?.textures?.exists(GENERATED_ATLAS)) return false;
  return scene.textures.get(GENERATED_ATLAS).has(frameName);
}

export function setAtlasArt(gameObject, frameName, {
  height,
  width,
  originX = 0.5,
  originY = 1,
  alpha = 1,
  flipX,
} = {}) {
  if (!gameObject?.scene || !atlasHas(gameObject.scene, frameName)) return gameObject;
  gameObject.setTexture(GENERATED_ATLAS, frameName).setOrigin(originX, originY).setAlpha(alpha);
  const frame = gameObject.frame;
  if (height) {
    const scale = height / Math.max(1, frame.height);
    gameObject.setScale(scale);
  } else if (width) {
    const scale = width / Math.max(1, frame.width);
    gameObject.setScale(scale);
  }
  if (typeof flipX === 'boolean') gameObject.setFlipX(flipX);
  return gameObject;
}

export function addAtlasArt(scene, x, y, frameName, options = {}) {
  if (!atlasHas(scene, frameName)) return null;
  const image = scene.add.image(x, y, GENERATED_ATLAS, frameName);
  setAtlasArt(image, frameName, options);
  return image;
}

export function addFramedIcon(scene, x, y, frameName, {
  size = 58,
  depth = 505,
  frameColor = 0xb79a64,
  glow = 0x825dff,
} = {}) {
  const c = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);
  const bg = scene.add.graphics();
  bg.fillStyle(0x0c0b19, 0.96).fillRoundedRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8, 9);
  bg.lineStyle(2, frameColor, 0.95).strokeRoundedRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8, 9);
  bg.lineStyle(1, glow, 0.5).strokeRoundedRect(-size / 2, -size / 2, size, size, 7);
  const icon = atlasHas(scene, frameName)
    ? scene.add.image(0, 0, GENERATED_ATLAS, frameName).setDisplaySize(size - 6, size - 6)
    : scene.add.rectangle(0, 0, size - 6, size - 6, 0x2a2347, 1);
  c.add([bg, icon]);
  return { container: c, icon, frame: bg };
}
