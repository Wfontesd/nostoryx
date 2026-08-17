import { BaseLabScene } from './base-lab-scene.js';
import { THEME } from '../theme.js';

export class VfxLabScene extends BaseLabScene {
  constructor() { super('VfxLab'); }

  create() {
    this.createLabChrome('VFX Lab', 'Compose readable gameplay effects from reusable primitives and timing layers.', THEME.violet);
    this.createGround(650);

    this.actor = this.add.image(410, 556, 'player').setScale(1.25).setDepth(20);
    this.target = this.add.image(840, 555, 'brute').setScale(1.15).setDepth(20);
    this.targetMarker = this.add.image(840, 555, 'target').setTint(THEME.violet).setAlpha(0.32).setDepth(12);
    this.tweens.add({ targets: this.targetMarker, rotation: Math.PI * 2, duration: 6000, repeat: -1, ease: 'Linear' });

    this.labKeys = this.input.keyboard.addKeys({
      slash: Phaser.Input.Keyboard.KeyCodes.Q,
      burst: Phaser.Input.Keyboard.KeyCodes.W,
      lightning: Phaser.Input.Keyboard.KeyCodes.E,
      meteor: Phaser.Input.Keyboard.KeyCodes.T,
      heal: Phaser.Input.Keyboard.KeyCodes.Y,
      auto: Phaser.Input.Keyboard.KeyCodes.A,
      less: Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET,
      more: Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET,
    });
    this.intensity = 1;
    this.autoShowcase = false;
    this.lastAutoAt = 0;
    this.autoIndex = 0;

    this.makePanel(22, 104, 326, 218, { accent: THEME.violet });
    this.add.text(40, 122, 'VFX COMPOSITOR', { fontFamily: 'monospace', fontSize: '11px', color: '#c7b3ff' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.vfxDebug = this.makeDebugText(40, 150, 'ready');
    this.add.text(40, 266, 'Q slash  W burst  E lightning\nT meteor  Y heal   A autoplay   [ ] intensity', { fontFamily: 'monospace', fontSize: '10px', color: '#78859a', lineSpacing: 4 }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.makePanel(this.scale.width - 348, 104, 326, 202, { accent: 0x674f9e, alpha: 0.88 });
    this.add.text(this.scale.width - 328, 122, 'QUALITY BAR — NOT JUST PARTICLES', { fontFamily: 'monospace', fontSize: '10px', color: '#c8b5ff' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(this.scale.width - 328, 150,
      '01  anticipation / readable origin\n02  primary silhouette or trail\n03  impact flash / burst\n04  target reaction\n05  camera response when justified\n06  short-lived aftermath\n\nThese primitives are placeholders. Final skills\nwill plug authored sprites / shaders into the same cues.',
      { fontFamily: 'monospace', fontSize: '10px', color: '#c2cad7', lineSpacing: 4 },
    ).setScrollFactor(0).setDepth(this.uiDepth + 1);

    const buttons = [
      ['Q  SLASH', () => this.playSlash(), 390],
      ['W  BURST', () => this.playBurst(), 504],
      ['E  BOLT', () => this.playLightning(), 618],
      ['T  METEOR', () => this.playMeteor(), 732],
      ['Y  HEAL', () => this.playHeal(), 846],
    ];
    for (const [label, action, x] of buttons) this.makeButton(x, 112, 102, label, action, { accent: THEME.violet });
  }

  impactTarget(color, strength = 1) {
    this.target.setTint(0xffffff);
    this.time.delayedCall(72, () => this.target?.clearTint());
    this.cameras.main.shake(70 + 35 * strength, 0.0025 + 0.002 * strength);
    this.vfx.burst(this.target.x, this.target.y - 5, { color, count: Math.round(12 * this.intensity), speed: 150 + 70 * strength, scale: 0.75 + 0.2 * this.intensity });
    this.vfx.shockwave(this.target.x, this.target.y - 4, { color, scale: 0.9 + 0.35 * strength, duration: 300 });
    this.tweens.add({ targets: this.target, x: this.target.x + 12 * strength, duration: 55, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  playSlash() {
    this.vfx.slash(this.actor.x, this.actor.y, 1, { color: 0xa8e9ff, heavy: false });
    this.time.delayedCall(70, () => this.impactTarget(0xa8e9ff, 0.65));
  }

  playBurst() {
    this.vfx.shockwave(this.actor.x + 65, this.actor.y, { color: 0xff7f4f, scale: 1.2, duration: 280 });
    this.vfx.burst(this.actor.x + 105, this.actor.y, { color: 0xffa14c, count: Math.round(20 * this.intensity), speed: 250, scale: 1.05 });
    this.time.delayedCall(110, () => this.impactTarget(0xff9f54, 1));
  }

  playLightning() {
    this.vfx.lightning(this.actor.x + 18, this.actor.y - 28, this.target.x - 18, this.target.y - 16, { color: 0xa6ecff });
    this.time.delayedCall(55, () => this.impactTarget(0xa6ecff, 0.9));
  }

  playMeteor() {
    const meteor = this.add.image(this.target.x - 145, 180, 'fx-dot')
      .setTint(0xffa347)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.2 * this.intensity)
      .setDepth(75);
    for (let i = 0; i < 6; i += 1) {
      const trail = this.add.image(meteor.x - i * 14, meteor.y - i * 18, 'fx-dot').setTint(i % 2 ? 0xff6a3d : 0xffc25b).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6 - i * 0.17).setAlpha(0.45).setDepth(70);
      this.tweens.add({ targets: trail, alpha: 0, y: trail.y - 38, duration: 360 + i * 45, onComplete: () => trail.destroy() });
    }
    this.tweens.add({
      targets: meteor,
      x: this.target.x,
      y: this.target.y - 16,
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        meteor.destroy();
        this.vfx.burst(this.target.x, this.target.y, { color: 0xff8a45, count: Math.round(26 * this.intensity), speed: 310, scale: 1.15 });
        this.vfx.shockwave(this.target.x, this.target.y, { color: 0xffc36b, scale: 1.8, duration: 450 });
        this.impactTarget(0xff9f54, 1.5);
      },
    });
  }

  playHeal() {
    this.vfx.heal(this.actor.x, this.actor.y);
    this.actor.setTint(0x9affcf);
    this.time.delayedCall(260, () => this.actor?.clearTint());
  }

  update(time) {
    if (!this.labKeys) return;
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.slash)) this.playSlash();
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.burst)) this.playBurst();
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.lightning)) this.playLightning();
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.meteor)) this.playMeteor();
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.heal)) this.playHeal();
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.auto)) { this.autoShowcase = !this.autoShowcase; this.toast(`VFX autoplay ${this.autoShowcase ? 'ON' : 'OFF'}`, { accent: THEME.violet }); }
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.less)) this.intensity = Math.max(0.5, Number((this.intensity - 0.25).toFixed(2)));
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.more)) this.intensity = Math.min(2, Number((this.intensity + 0.25).toFixed(2)));

    if (this.autoShowcase && time - this.lastAutoAt > 1450) {
      const playlist = [() => this.playSlash(), () => this.playBurst(), () => this.playLightning(), () => this.playMeteor(), () => this.playHeal()];
      playlist[this.autoIndex % playlist.length]();
      this.autoIndex += 1;
      this.lastAutoAt = time;
    }

    this.vfxDebug?.setText([
      `renderer        ${this.game.renderer?.type === Phaser.WEBGL ? 'WEBGL' : 'AUTO'}`,
      `intensity       ${this.intensity.toFixed(2)}x`,
      `autoplay        ${this.autoShowcase ? 'ON' : 'OFF'}`,
      `target          ${Math.round(this.target.x)} / ${Math.round(this.target.y)}`,
      `blend mode      ADD`,
      `camera shake    ENABLED`,
      `reusable cues   slash / burst / ring / bolt / heal`,
    ]);
  }
}
