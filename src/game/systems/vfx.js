import { GENERATED_ATLAS, atlasHas } from './generated-art.js';

function randomBetween(min, max) { return min + Math.random() * (max - min); }

export class VfxDirector {
  constructor(scene) { this.scene = scene; }

  illustrated(frame, x, y, {
    height = 220,
    alpha = 0.96,
    depth = 86,
    angle = 0,
    flipX = false,
    blend = true,
    duration = 260,
    scaleFrom = 0.72,
    scaleTo = 1.08,
    dx = 0,
    dy = 0,
    ease = 'Cubic.easeOut',
  } = {}) {
    if (!atlasHas(this.scene, frame)) return null;
    const image = this.scene.add.image(x, y, GENERATED_ATLAS, frame)
      .setOrigin(0.5).setDepth(depth).setAlpha(alpha).setAngle(angle).setFlipX(flipX);
    if (blend) image.setBlendMode(Phaser.BlendModes.ADD);
    const base = height / Math.max(1, image.frame.height);
    image.setScale(base * scaleFrom);
    this.scene.tweens.add({
      targets: image,
      x: x + dx,
      y: y + dy,
      scale: base * scaleTo,
      alpha: 0,
      duration,
      ease,
      onComplete: () => image.destroy(),
    });
    return image;
  }

  burst(x, y, { color = 0xffffff, count = 14, speed = 190, texture = 'fx-dot', scale = 1, gravity = 0 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.22, 0.22);
      const distance = randomBetween(speed * 0.35, speed);
      const particle = this.scene.add.image(x, y, i % 4 === 0 ? 'fx-spark' : texture)
        .setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(randomBetween(0.32, 0.95) * scale).setDepth(90).setAlpha(randomBetween(0.65, 1));
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + gravity,
        alpha: 0,
        scale: 0.05,
        angle: randomBetween(-80, 80),
        duration: randomBetween(240, 520),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  radialImpact(x, y, { color = 0xffffff, power = 1 } = {}) {
    this.illustrated('vfx_impact', x, y, { height: 185 * power, duration: 230, scaleFrom: 0.62, scaleTo: 1.12 });
    const g = this.scene.add.graphics().setDepth(87).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 16; i += 1) {
      const a = (Math.PI * 2 * i) / 16 + randomBetween(-0.1, 0.1);
      const inner = randomBetween(8, 18) * power;
      const outer = randomBetween(42, 92) * power;
      g.lineStyle(randomBetween(1, 4) * power, color, randomBetween(0.45, 1));
      g.lineBetween(x + Math.cos(a) * inner, y + Math.sin(a) * inner, x + Math.cos(a) * outer, y + Math.sin(a) * outer);
    }
    const core = this.scene.add.image(x, y, 'fx-spark').setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(91).setScale(0.6 * power);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 130 + power * 50, onComplete: () => g.destroy() });
    this.scene.tweens.add({ targets: core, scale: 2.2 * power, alpha: 0, duration: 180, ease: 'Cubic.easeOut', onComplete: () => core.destroy() });
  }

  slash(x, y, facing = 1, { color = 0xb9e8ff, heavy = false } = {}) {
    const generated = atlasHas(this.scene, heavy ? 'vfx_heavy_arc' : 'vfx_crescent');
    if (generated) {
      this.illustrated(heavy ? 'vfx_heavy_arc' : 'vfx_crescent', x + facing * (heavy ? 82 : 72), y - 20, {
        height: heavy ? 230 : 185,
        duration: heavy ? 260 : 185,
        flipX: facing < 0,
        dx: facing * (heavy ? 26 : 18),
        angle: facing * (heavy ? -4 : 0),
        scaleFrom: 0.62,
        scaleTo: 1.05,
      });
    } else {
      const slash = this.scene.add.image(x + facing * 66, y - 5, 'fx-slash')
        .setTint(color).setFlipX(facing < 0).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(heavy ? 1.48 : 1.08).setDepth(76).setAlpha(0.96);
      this.scene.tweens.add({ targets: slash, alpha: 0, x: slash.x + facing * 16, scaleX: slash.scaleX * 1.24,
        scaleY: slash.scaleY * 1.18, duration: heavy ? 235 : 155, ease: 'Cubic.easeOut', onComplete: () => slash.destroy() });
    }
    this.burst(x + facing * 105, y - 2, { color, count: heavy ? 16 : 8, speed: heavy ? 195 : 125, scale: heavy ? 0.9 : 0.62 });
  }

  shockwave(x, y, { color = 0xa995ff, scale = 1.7, duration = 420 } = {}) {
    if (atlasHas(this.scene, 'vfx_ring')) {
      this.illustrated('vfx_ring', x, y, { height: 160 * scale, duration, scaleFrom: 0.22, scaleTo: 0.95, alpha: 0.8 });
    }
    for (let i = 0; i < 2; i += 1) {
      const ring = this.scene.add.image(x, y, 'fx-ring').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(72 + i).setScale(0.12 + i * 0.05).setAlpha(0.75 - i * 0.2);
      this.scene.tweens.add({ targets: ring, scale: scale * (1 + i * 0.24), alpha: 0,
        duration: duration + i * 100, delay: i * 35, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
  }

  castSigil(x, y, { color = 0xb991ff, scale = 0.8, duration = 360 } = {}) {
    if (atlasHas(this.scene, 'vfx_sigil')) {
      this.illustrated('vfx_sigil', x, y, { height: 190 * scale, duration: duration + 80, alpha: 0.86, angle: -8, scaleFrom: 0.25, scaleTo: 0.86 });
    }
    const rune = this.scene.add.image(x, y, 'fx-rune').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(68).setScale(0.25).setAlpha(0);
    this.scene.tweens.add({ targets: rune, scale, alpha: 0.78, angle: 32, duration: duration * 0.45, ease: 'Back.easeOut',
      yoyo: true, hold: duration * 0.15, onComplete: () => rune.destroy() });
  }

  afterImage(sprite, { color = 0xb991ff, alpha = 0.28, drift = 22, duration = 210 } = {}) {
    if (!sprite?.active) return;
    const ghost = this.scene.add.image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setTint(color).setAlpha(alpha).setOrigin(sprite.originX, sprite.originY)
      .setFlipX(sprite.flipX).setScale(sprite.scaleX, sprite.scaleY).setAngle(sprite.angle)
      .setDepth(Math.max(1, sprite.depth - 1));
    this.scene.tweens.add({ targets: ghost, alpha: 0, x: ghost.x + (sprite.flipX ? drift : -drift), scaleX: ghost.scaleX * 1.04,
      duration, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
  }

  screenFlash({ color = 0xffffff, alpha = 0.18, duration = 90 } = {}) {
    const { width, height } = this.scene.scale;
    const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, color, alpha).setScrollFactor(0).setDepth(990);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration, onComplete: () => flash.destroy() });
  }

  lightning(x1, y1, x2, y2, { color = 0x9ee8ff } = {}) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    if (atlasHas(this.scene, 'vfx_lightning')) {
      const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
      const angle = Phaser.Math.RadToDeg(Math.atan2(y2 - y1, x2 - x1));
      const fx = this.scene.add.image(cx, cy, GENERATED_ATLAS, 'vfx_lightning').setOrigin(0.5).setDepth(82)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9).setAngle(angle);
      fx.setScale(distance / Math.max(1, fx.frame.width), 0.55);
      this.scene.tweens.add({ targets: fx, alpha: 0, scaleY: 0.12, duration: 190, onComplete: () => fx.destroy() });
    }
    for (let bolt = 0; bolt < 2; bolt += 1) {
      const graphics = this.scene.add.graphics().setDepth(84 + bolt).setBlendMode(Phaser.BlendModes.ADD);
      const points = [{ x: x1, y: y1 }];
      for (let i = 1; i < 9; i += 1) {
        const t = i / 9;
        points.push({ x: Phaser.Math.Linear(x1, x2, t) + randomBetween(-18, 18), y: Phaser.Math.Linear(y1, y2, t) + randomBetween(-22, 22) });
      }
      points.push({ x: x2, y: y2 });
      const draw = (width, alpha) => {
        graphics.lineStyle(width, color, alpha).beginPath().moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
        graphics.strokePath();
      };
      draw(9, 0.1); draw(3.2, 0.62); draw(1.2, 1);
      this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 120 + bolt * 35, delay: bolt * 18, onComplete: () => graphics.destroy() });
    }
    this.radialImpact(x2, y2, { color, power: 1.08 });
  }

  groundDust(x, y, { color = 0xd7c6a7 } = {}) {
    if (atlasHas(this.scene, 'vfx_dust')) {
      this.illustrated('vfx_dust', x, y - 10, { height: 105, alpha: 0.55, blend: false, duration: 360, scaleFrom: 0.72, scaleTo: 1.08 });
    }
    this.burst(x, y, { color, count: 7, speed: 72, scale: 0.28, gravity: 14 });
  }

  dashTrail(x, y, facing = 1) {
    if (atlasHas(this.scene, 'vfx_dash')) {
      this.illustrated('vfx_dash', x - facing * 42, y, { height: 94, alpha: 0.5, flipX: facing < 0, duration: 210, dx: -facing * 50, scaleFrom: 0.8, scaleTo: 1.08 });
    }
    this.burst(x, y, { color: 0x89dfff, count: 8, speed: 100, scale: 0.35 });
  }

  heal(x, y) {
    this.castSigil(x, y + 14, { color: 0x72ffc0, scale: 0.66, duration: 520 });
    this.shockwave(x, y, { color: 0x72ffc0, scale: 1.35, duration: 560 });
    for (let i = 0; i < 12; i += 1) {
      const mote = this.scene.add.image(x + randomBetween(-48, 48), y + randomBetween(8, 42), i % 3 ? 'fx-dot' : 'fx-spark')
        .setTint(0x72ffc0).setBlendMode(Phaser.BlendModes.ADD).setDepth(74).setScale(randomBetween(0.35, 0.82));
      this.scene.tweens.add({ targets: mote, y: mote.y - randomBetween(85, 150), x: mote.x + randomBetween(-18, 18), alpha: 0, scale: 0.08,
        duration: randomBetween(620, 980), delay: i * 28, ease: 'Sine.easeOut', onComplete: () => mote.destroy() });
    }
  }
}
