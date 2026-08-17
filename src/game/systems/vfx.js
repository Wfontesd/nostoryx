function randomBetween(min, max) { return min + Math.random() * (max - min); }

export class VfxDirector {
  constructor(scene) { this.scene = scene; }

  burst(x, y, { color = 0xffffff, count = 14, speed = 190, texture = 'fx-dot', scale = 1, gravity = 0 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.22, 0.22);
      const distance = randomBetween(speed * 0.35, speed);
      const particle = this.scene.add.image(x, y, i % 4 === 0 ? 'fx-spark' : texture)
        .setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(randomBetween(0.28, 0.9) * scale).setDepth(90).setAlpha(randomBetween(0.62, 1));
      this.scene.tweens.add({ targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + gravity,
        alpha: 0, scale: 0.04, angle: randomBetween(-95, 95),
        duration: randomBetween(240, 520), ease: 'Cubic.easeOut', onComplete: () => particle.destroy() });
    }
  }

  radialImpact(x, y, { color = 0xffffff, power = 1 } = {}) {
    if (this.scene.textures.exists('fx-impact')) {
      const sprite = this.scene.add.image(x, y, 'fx-impact').setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(92).setScale(0.2 * power).setAlpha(0.94);
      this.scene.tweens.add({ targets: sprite, scale: 1.02 * power, alpha: 0,
        angle: randomBetween(-12, 12), duration: 185 + power * 40, ease: 'Cubic.easeOut', onComplete: () => sprite.destroy() });
    }

    const g = this.scene.add.graphics().setDepth(87).setBlendMode(Phaser.BlendModes.ADD);
    const rays = 14;
    for (let i = 0; i < rays; i += 1) {
      const a = (Math.PI * 2 * i) / rays + randomBetween(-0.08, 0.08);
      const inner = randomBetween(12, 22) * power;
      const outer = randomBetween(44, 96) * power;
      g.lineStyle(randomBetween(1, 3.5) * power, color, randomBetween(0.4, 0.9));
      g.lineBetween(x + Math.cos(a) * inner, y + Math.sin(a) * inner, x + Math.cos(a) * outer, y + Math.sin(a) * outer);
    }
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 145 + power * 45, onComplete: () => g.destroy() });
  }

  slash(x, y, facing = 1, { color = 0xb9e8ff, heavy = false } = {}) {
    const layers = heavy ? [1.42, 1.12] : [1.02];
    layers.forEach((baseScale, index) => {
      const slash = this.scene.add.image(x + facing * (70 + index * 9), y - 9 - index * 4, 'fx-slash')
        .setTint(color).setFlipX(facing < 0).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(baseScale).setDepth(77 + index).setAlpha(index ? 0.38 : 0.96).setAngle(index ? facing * -7 : 0);
      this.scene.tweens.add({ targets: slash, alpha: 0, scaleX: slash.scaleX * 1.22, scaleY: slash.scaleY * 1.16,
        x: slash.x + facing * 18, duration: heavy ? 225 : 145, ease: 'Cubic.easeOut', onComplete: () => slash.destroy() });
    });
    this.burst(x + facing * 108, y - 3, { color, count: heavy ? 15 : 8, speed: heavy ? 195 : 128, scale: heavy ? 0.84 : 0.58 });
  }

  shockwave(x, y, { color = 0xa995ff, scale = 1.7, duration = 420 } = {}) {
    for (let i = 0; i < 2; i += 1) {
      const ring = this.scene.add.image(x, y, 'fx-ring').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(72 + i).setScale(0.12 + i * 0.05).setAlpha(0.78 - i * 0.18);
      this.scene.tweens.add({ targets: ring, scale: scale * (1 + i * 0.23), alpha: 0,
        duration: duration + i * 90, delay: i * 34, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
  }

  castSigil(x, y, { color = 0xb991ff, scale = 0.8, duration = 360 } = {}) {
    const rune = this.scene.add.image(x, y, 'fx-rune').setTint(color).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(68).setScale(0.22).setAlpha(0);
    this.scene.tweens.add({ targets: rune, scale, alpha: 0.82, angle: 36, duration: duration * 0.44, ease: 'Back.easeOut',
      yoyo: true, hold: duration * 0.15, onComplete: () => rune.destroy() });
  }

  afterImage(sprite, { color = 0xb991ff, alpha = 0.28, drift = 22, duration = 210 } = {}) {
    const ghost = this.scene.add.image(sprite.x, sprite.y, sprite.texture.key).setTint(color).setAlpha(alpha)
      .setFlipX(sprite.flipX).setScale(sprite.scaleX, sprite.scaleY).setAngle(sprite.angle).setDepth(Math.max(1, sprite.depth - 1));
    this.scene.tweens.add({ targets: ghost, alpha: 0, x: ghost.x + (sprite.flipX ? drift : -drift),
      scaleX: ghost.scaleX * 1.04, duration, ease: 'Quad.easeOut', onComplete: () => ghost.destroy() });
  }

  groundDust(x, y, { color = 0xd8c8aa } = {}) {
    const g = this.scene.add.graphics().setDepth(15);
    g.fillStyle(color, 0.22).fillEllipse(x, y, 76, 16);
    this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.45, scaleY: 0.7, duration: 260, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  screenFlash({ color = 0xffffff, alpha = 0.18, duration = 90 } = {}) {
    const { width, height } = this.scene.scale;
    const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, color, alpha).setScrollFactor(0).setDepth(990);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration, onComplete: () => flash.destroy() });
  }

  lightning(x1, y1, x2, y2, { color = 0x9ee8ff } = {}) {
    for (let bolt = 0; bolt < 3; bolt += 1) {
      const graphics = this.scene.add.graphics().setDepth(82 + bolt).setBlendMode(Phaser.BlendModes.ADD);
      const points = [{ x: x1, y: y1 }];
      const segments = 9;
      for (let i = 1; i < segments; i += 1) {
        const t = i / segments;
        points.push({ x: Phaser.Math.Linear(x1, x2, t) + randomBetween(-18, 18), y: Phaser.Math.Linear(y1, y2, t) + randomBetween(-22, 22) });
      }
      points.push({ x: x2, y: y2 });
      const draw = (width, alpha) => {
        graphics.lineStyle(width, color, alpha).beginPath().moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
        graphics.strokePath();
      };
      draw(12, 0.08); draw(5, 0.4); draw(1.5, 0.96);
      this.scene.tweens.add({ targets: graphics, alpha: 0, duration: 118 + bolt * 34, delay: bolt * 18, onComplete: () => graphics.destroy() });
    }
    this.radialImpact(x2, y2, { color, power: 1.12 });
    this.burst(x2, y2, { color, count: 22, speed: 240, scale: 0.78 });
  }

  heal(x, y) {
    this.castSigil(x, y + 14, { color: 0x72ffc0, scale: 0.66, duration: 520 });
    this.shockwave(x, y, { color: 0x72ffc0, scale: 1.35, duration: 560 });
    for (let i = 0; i < 12; i += 1) {
      const mote = this.scene.add.image(x + randomBetween(-48, 48), y + randomBetween(8, 42), i % 3 ? 'fx-dot' : 'fx-spark')
        .setTint(0x72ffc0).setBlendMode(Phaser.BlendModes.ADD).setDepth(74).setScale(randomBetween(0.35, 0.82));
      this.scene.tweens.add({ targets: mote, y: mote.y - randomBetween(85, 150), x: mote.x + randomBetween(-18, 18),
        alpha: 0, scale: 0.08, duration: randomBetween(620, 980), delay: i * 28, ease: 'Sine.easeOut', onComplete: () => mote.destroy() });
    }
  }
}
