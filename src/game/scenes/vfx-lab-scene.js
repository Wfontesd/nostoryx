import { BaseLabScene } from './base-lab-scene.js';
import { THEME } from '../theme.js';
import { GENERATED_ATLAS, MONSTER_ART, addAtlasArt, atlasHas } from '../systems/generated-art.js';

export class VfxLabScene extends BaseLabScene {
  constructor() { super('VfxLab'); }

  create() {
    this.createLabChrome('VFX Lab', 'Authored sprites + procedural timing layers. Compare silhouette before particle count.', THEME.violet);
    this.createGround(650);

    this.actor = atlasHas(this, 'hero_idle')
      ? addAtlasArt(this, 400, 626, 'hero_idle', { height: 150 })?.setDepth(20)
      : this.add.image(400, 556, 'player').setScale(1.25).setDepth(20);
    this.target = atlasHas(this, MONSTER_ART.brute.idle.frame)
      ? addAtlasArt(this, 860, 630, MONSTER_ART.brute.idle.frame, { height: 175 })?.setDepth(20)
      : this.add.image(860, 555, 'brute').setScale(1.15).setDepth(20);
    this.targetMarker = this.add.image(860, 552, 'target').setTint(THEME.violet).setAlpha(0.24).setDepth(12);
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

    this.createDevOverlay();
    const hint = this.add.text(this.scale.width / 2, this.scale.height - 34, 'Q SLASH   W IMPACT   E BOLT   T METEOR   Y HEAL   A AUTOPLAY   [ ] INTENSITY', {
      fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#f3edff', stroke: '#111323', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(this.uiDepth + 5).setAlpha(0.78);
    this.tweens.add({ targets: hint, alpha: 0.25, duration: 500, delay: 4800 });
  }

  createDevOverlay() {
    const c = this.add.container(18, 110).setScrollFactor(0).setDepth(this.uiDepth + 12).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x0c0b1a, 0.95).fillRoundedRect(0, 0, 310, 210, 8);
    bg.lineStyle(1, THEME.violet, 0.65).strokeRoundedRect(0, 0, 310, 210, 8);
    const title = this.add.text(16, 13, 'VFX COMPOSITOR / F2', { fontFamily: 'monospace', fontSize: '10px', color: '#ceb9ff' });
    this.vfxDebug = this.add.text(16, 38, 'ready', { fontFamily: 'monospace', fontSize: '10px', color: '#d9d2e3', lineSpacing: 5 });
    const body = this.add.text(16, 154, 'Primary sprite → impact → reaction → aftermath', { fontFamily: 'monospace', fontSize: '8px', color: '#9991a6' });
    c.add([bg, title, this.vfxDebug, body]);
    this.devOverlay = c;
  }

  impactTarget(color, strength = 1) {
    this.target.setTint?.(0xffffff);
    this.time.delayedCall(72, () => this.target?.clearTint?.());
    this.cameras.main.shake(70 + 35 * strength, 0.0025 + 0.002 * strength);
    this.vfx.radialImpact(this.target.x, this.target.y - 70, { color, power: 0.9 + strength * 0.35 });
    this.vfx.burst(this.target.x, this.target.y - 70, { color, count: Math.round(12 * this.intensity), speed: 150 + 70 * strength, scale: 0.75 + 0.2 * this.intensity });
    this.vfx.shockwave(this.target.x, this.target.y - 65, { color, scale: 0.9 + 0.35 * strength, duration: 300 });
    this.tweens.add({ targets: this.target, x: this.target.x + 12 * strength, duration: 55, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  playSlash() {
    this.vfx.slash(this.actor.x, this.actor.y - 70, 1, { color: 0xa8e9ff, heavy: false });
    this.time.delayedCall(70, () => this.impactTarget(0xa8e9ff, 0.65));
  }

  playBurst() {
    this.vfx.slash(this.actor.x, this.actor.y - 70, 1, { color: 0xffd26e, heavy: true });
    this.time.delayedCall(110, () => this.impactTarget(0xffb45b, 1.1));
  }

  playLightning() {
    this.vfx.castSigil(this.actor.x + 40, this.actor.y - 110, { color: 0xb991ff, scale: 0.92, duration: 300 });
    this.time.delayedCall(80, () => {
      this.vfx.lightning(this.actor.x + 35, this.actor.y - 90, this.target.x - 24, this.target.y - 75, { color: 0xa6ecff });
      this.impactTarget(0xa6ecff, 0.9);
    });
  }

  playMeteor() {
    if (atlasHas(this, 'vfx_orb')) {
      const meteor = this.add.image(this.target.x - 160, 165, GENERATED_ATLAS, 'vfx_orb').setDepth(76).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.92);
      meteor.setScale(115 / meteor.frame.height);
      this.tweens.add({ targets: meteor, x: this.target.x, y: this.target.y - 65, angle: 160, duration: 420, ease: 'Cubic.easeIn', onComplete: () => {
        meteor.destroy();
        this.impactTarget(0xffa35d, 1.55);
      } });
    } else {
      this.impactTarget(0xffa35d, 1.55);
    }
  }

  playHeal() {
    this.vfx.heal(this.actor.x, this.actor.y - 70);
    this.actor.setTint?.(0x9affcf);
    this.time.delayedCall(260, () => this.actor?.clearTint?.());
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
      `generated art   ${atlasHas(this, 'vfx_crescent') ? 'LOADED' : 'FALLBACK'}`,
      `blend mode      ADD`,
      `camera shake    ENABLED`,
    ]);
  }
}
