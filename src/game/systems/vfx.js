function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export class VfxDirector {
  constructor(scene) {
    this.scene = scene;
  }

  burst(x, y, { color = 0xffffff, count = 14, speed = 190, texture = 'fx-dot', scale = 1 } = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + randomBetween(-0.16, 0.16);
      const distance = randomBetween(speed * 0.38, speed);
      const particle = this.scene.add.image(x, y, texture)
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(randomBetween(0.45, 1.15) * scale)
        .setDepth(80);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.08,
        duration: randomBetween(260, 540),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  slash(x, y, facing = 1, { color = 0xb9e8ff, heavy = false } = {}) {
    const slash = this.scene.add.image(x + facing * 54, y - 2, 'fx-slash')
      .setTint(color)
      .setFlipX(facing < 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(heavy ? 1.34 : 1)
      .setDepth(70)
      .setAlpha(0.94);

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: slash.scaleX * 1.2,
      scaleY: slash.scaleY * 1.2,
      duration: heavy ? 210 : 150,
      ease: 'Cubic.easeOut',
      onComplete: () => slash.destroy(),
    });

    this.burst(x + facing * 88, y, { color, count: heavy ? 12 : 7, speed: heavy ? 160 : 110, scale: 0.75 });
  }

  shockwave(x, y, { color = 0xa995ff, scale = 1.7, duration = 420 } = {}) {
    const ring = this.scene.add.image(x, y, 'fx-ring')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(65)
      .setScale(0.18)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: ring,
      scale,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  lightning(x1, y1, x2, y2, { color = 0x9ee8ff } = {}) {
    const graphics = this.scene.add.graphics().setDepth(75).setBlendMode(Phaser.BlendModes.ADD);
    const points = [{ x: x1, y: y1 }];
    const segments = 8;
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      points.push({
        x: Phaser.Math.Linear(x1, x2, t) + randomBetween(-16, 16),
        y: Phaser.Math.Linear(y1, y2, t) + randomBetween(-24, 24),
      });
    }
    points.push({ x: x2, y: y2 });

    const draw = (width, alpha) => {
      graphics.lineStyle(width, color, alpha);
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.strokePath();
    };
    draw(9, 0.16);
    draw(4, 0.65);
    draw(1.5, 1);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 170,
      onComplete: () => graphics.destroy(),
    });
    this.burst(x2, y2, { color, count: 16, speed: 210, scale: 0.82 });
  }

  heal(x, y) {
    this.shockwave(x, y, { color: 0x72ffc0, scale: 1.3, duration: 560 });
    for (let i = 0; i < 10; i += 1) {
      const mote = this.scene.add.image(x + randomBetween(-46, 46), y + randomBetween(5, 38), 'fx-dot')
        .setTint(0x72ffc0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(74)
        .setScale(randomBetween(0.45, 0.9));
      this.scene.tweens.add({
        targets: mote,
        y: mote.y - randomBetween(70, 130),
        alpha: 0,
        scale: 0.1,
        duration: randomBetween(600, 900),
        delay: i * 35,
        ease: 'Sine.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
  }
}
