import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { ATTACKS, isTargetInAttackArc, nextCombo, resolveDamage } from '../systems/combat-model.js';
import { THEME } from '../theme.js';
import { GENERATED_ATLAS, MONSTER_ART, addAtlasArt, atlasHas, setAtlasArt } from '../systems/generated-art.js';

const SKILL_FRAMES = Object.freeze({ light: 'skill_quick', heavy: 'skill_breaker', skill: 'skill_arc' });

export class CombatLabScene extends BaseLabScene {
  constructor() { super('CombatLab'); }

  create() {
    this.createLabChrome('Combat Lab', 'Action readability, illustrated VFX and impact timing.', THEME.amber);
    this.physics.world.setBounds(0, 54, this.scale.width, this.scale.height - 54);
    this.ground = this.createGround(650);

    this.player = this.createPlayer(310, 590);
    this.controller = new PlayerController(this, this.player, { speed: 285, jumpSpeed: 625, dashSpeed: 720 });
    this.physics.add.collider(this.player, this.ground);

    this.attackKeys = this.input.keyboard.addKeys({
      light: Phaser.Input.Keyboard.KeyCodes.J,
      heavy: Phaser.Input.Keyboard.KeyCodes.K,
      skill: Phaser.Input.Keyboard.KeyCodes.L,
      respawn: Phaser.Input.Keyboard.KeyCodes.P,
      hitboxes: Phaser.Input.Keyboard.KeyCodes.B,
    });
    this.cooldowns = new Map();
    this.combo = 0;
    this.lastHitAt = -Infinity;
    this.attacking = false;

    this.spawnDummy();
    this.createPlayerHud();
    this.createTargetHud();
    this.createDevTelemetry();
    this.createCombatPrompts();

    this.comboText = this.add.text(this.scale.width - 118, 190, '', {
      fontFamily: 'Trebuchet MS', fontSize: '42px', fontStyle: '700', color: '#fff2cc', stroke: '#3b1830', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 8).setAlpha(0).setAngle(-4);
  }

  createCombatPrompts() {
    const hint = this.add.text(this.scale.width / 2, this.scale.height - 105, 'J  QUICK SLASH      K  BREAKER      L  ARC SURGE', {
      fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff0d5', stroke: '#151323', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 6).setAlpha(0.82);
    this.tweens.add({ targets: hint, alpha: 0.28, duration: 500, delay: 4200 });
  }

  createPlayerHud() {
    const { height } = this.scale;
    const x = 22;
    const y = height - 88;
    const frame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 4);
    frame.fillStyle(0x0f1020, 0.92).fillRoundedRect(x + 40, y + 7, 276, 62, 8);
    frame.lineStyle(2, 0x6f658c, 0.86).strokeRoundedRect(x + 40, y + 7, 276, 62, 8);
    frame.fillStyle(0x28233f, 1).fillCircle(x + 40, y + 38, 37);
    frame.lineStyle(4, 0xc5a8ff, 0.85).strokeCircle(x + 40, y + 38, 34);
    frame.fillStyle(0x4b3b86, 1).fillTriangle(x + 22, y + 48, x + 58, y + 48, x + 40, y + 12);
    frame.fillStyle(0x111426, 1).fillRoundedRect(x + 29, y + 30, 22, 26, 7);
    frame.fillStyle(0x351a2a, 1).fillRect(x + 80, y + 18, 218, 13);
    frame.fillStyle(0xd84e62, 1).fillRect(x + 82, y + 20, 214, 9);
    frame.fillStyle(0x192842, 1).fillRect(x + 80, y + 39, 184, 9);
    frame.fillStyle(0x4aaee6, 1).fillRect(x + 82, y + 41, 180, 5);
    frame.fillStyle(0x493f28, 1).fillRect(x + 80, y + 55, 146, 6);
    frame.fillStyle(0xe5c862, 1).fillRect(x + 82, y + 57, 108, 2);
    this.add.text(x + 80, y + 1, 'LAB ADVENTURER   Lv. 12', { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff3dc' })
      .setScrollFactor(0).setDepth(this.uiDepth + 5);
  }

  createSkillSlot(x, y, attack, keyLabel) {
    const frameName = SKILL_FRAMES[attack.id];
    const c = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 5);
    const frame = this.add.graphics();
    frame.fillStyle(0x11101d, 0.97).fillRoundedRect(-33, -33, 66, 66, 8);
    frame.lineStyle(3, 0xa28555, 0.94).strokeRoundedRect(-33, -33, 66, 66, 8);
    frame.lineStyle(1, attack.accent, 0.8).strokeRoundedRect(-28, -28, 56, 56, 6);
    const icon = atlasHas(this, frameName)
      ? this.add.image(0, 0, GENERATED_ATLAS, frameName).setDisplaySize(52, 52)
      : this.add.image(0, 0, attack.id === 'light' ? 'skill-light' : attack.id === 'heavy' ? 'skill-heavy' : 'skill-arc').setDisplaySize(52, 52);
    const veil = this.add.graphics();
    const key = this.add.text(-28, -28, keyLabel, { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#fff6df', stroke: '#151323', strokeThickness: 4 });
    c.add([frame, icon, veil, key]);
    return { c, veil, accent: attack.accent };
  }

  createSkillHud() {
    if (this.skillSlots) return;
    const { width, height } = this.scale;
    const y = height - 53;
    this.skillSlots = {
      light: this.createSkillSlot(width / 2 - 76, y, ATTACKS.light, 'J'),
      heavy: this.createSkillSlot(width / 2, y, ATTACKS.heavy, 'K'),
      skill: this.createSkillSlot(width / 2 + 76, y, ATTACKS.skill, 'L'),
    };
  }

  createTargetHud() {
    const { width } = this.scale;
    this.targetFrame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 4);
    this.targetLabel = this.add.text(width / 2, 78, 'TRAINING BRUTE  ·  Lv. 12', {
      fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff1dc', stroke: '#19131d', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 5);
    this.createSkillHud();
    this.updateTargetHud();
  }

  updateTargetHud() {
    if (!this.targetFrame || this.dummyHp == null || this.dummyMaxHp == null) return;
    const { width } = this.scale;
    const x = width / 2 - 210;
    const y = 95;
    const ratio = Math.max(0, this.dummyHp / this.dummyMaxHp);
    this.targetFrame.clear();
    this.targetFrame.fillStyle(0x171321, 0.92).fillRoundedRect(x, y, 420, 20, 6);
    this.targetFrame.lineStyle(2, 0x776a8c, 0.9).strokeRoundedRect(x, y, 420, 20, 6);
    this.targetFrame.fillStyle(0x7f263e, 1).fillRect(x + 4, y + 4, 412, 12);
    this.targetFrame.fillStyle(0xf05b63, 1).fillRect(x + 4, y + 4, 412 * ratio, 12);
    this.targetFrame.fillStyle(0xffcb72, 0.75).fillRect(x + 4, y + 4, 412 * ratio, 2);
    this.targetLabel?.setText(`TRAINING BRUTE  ·  Lv. 12        ${this.dummyHp} / ${this.dummyMaxHp}`);
  }

  createDevTelemetry() {
    const c = this.add.container(18, 126).setScrollFactor(0).setDepth(this.uiDepth + 12).setVisible(false);
    const panel = this.add.graphics();
    panel.fillStyle(0x11111f, 0.94).fillRect(0, 0, 300, 185);
    panel.lineStyle(1, THEME.amber, 0.65).strokeRect(0, 0, 300, 185);
    const title = this.add.text(16, 13, 'COMBAT TELEMETRY / F2', { fontFamily: 'monospace', fontSize: '10px', color: '#ffc985' });
    this.combatDebug = this.add.text(16, 38, 'ready', { fontFamily: 'monospace', fontSize: '10px', color: '#d8d2dd', lineSpacing: 5 });
    const hints = this.add.text(16, 142, 'B hitboxes  ·  P reset target', { fontFamily: 'monospace', fontSize: '9px', color: '#a9a2b2' });
    c.add([panel, title, this.combatDebug, hints]);
    this.devOverlay = c;
  }

  spawnDummy() {
    this.dummyArt?.destroy();
    this.dummy?.destroy();
    const generated = atlasHas(this, MONSTER_ART.brute.idle.frame);
    this.dummy = this.physics.add.sprite(835, 581, 'brute').setDepth(20).setCollideWorldBounds(true).setVisible(!generated);
    this.dummy.body.setSize(62, 78).setOffset(11, 12);
    this.dummy.setDragX(1050);
    this.physics.add.collider(this.dummy, this.ground);
    if (generated) {
      this.dummyArt = addAtlasArt(this, this.dummy.x, this.dummy.y + 49, MONSTER_ART.brute.idle.frame, { height: MONSTER_ART.brute.idle.height });
      this.dummyArt?.setDepth(20);
    }
    this.dummyMaxHp = 240;
    this.dummyHp = this.dummyMaxHp;
    this.dummyArmor = 8;
    this.updateTargetHud();
  }

  setDummyPose(pose, duration = 100) {
    if (!this.dummyArt) return;
    const cfg = MONSTER_ART.brute[pose] ?? MONSTER_ART.brute.idle;
    setAtlasArt(this.dummyArt, cfg.frame, { height: cfg.height, flipX: false });
    if (duration > 0 && pose !== 'down') this.time.delayedCall(duration, () => {
      if (this.dummyArt?.active && this.dummyHp > 0) setAtlasArt(this.dummyArt, MONSTER_ART.brute.idle.frame, { height: MONSTER_ART.brute.idle.height });
    });
  }

  syncDummyArt() {
    if (!this.dummyArt || !this.dummy?.active) return;
    this.dummyArt.setPosition(this.dummy.x, this.dummy.y + 49);
  }

  canUse(attack, time) { return time >= (this.cooldowns.get(attack.id) ?? 0); }

  performAttack(attack, time) {
    if (!this.canUse(attack, time) || !this.dummy?.active || this.dummyHp <= 0 || this.attacking) return;
    this.cooldowns.set(attack.id, time + attack.cooldownMs);
    const facing = this.controller.facing;
    const isHeavy = attack.id === 'heavy';
    const isSkill = attack.id === 'skill';
    const windup = isSkill ? 170 : isHeavy ? 105 : 48;
    const action = isSkill ? 'skill' : isHeavy ? 'heavy' : 'light';

    this.attacking = true;
    this.playPlayerAction(action, time, windup + 150);
    const art = this.heroArt();
    if (art) {
      this.vfx.afterImage(art, { color: attack.accent, alpha: isSkill ? 0.27 : 0.16, drift: facing * -22, duration: 180 });
      art.setAngle(facing * (isHeavy ? -3 : -1));
    }
    if (isSkill) this.vfx.castSigil(this.player.x, this.player.y + 28, { color: attack.accent, scale: 1.05, duration: 420 });

    this.time.delayedCall(windup, () => this.resolveAttackHit(attack, facing, time));
  }

  resolveAttackHit(attack, facing, time) {
    const isHeavy = attack.id === 'heavy';
    const isSkill = attack.id === 'skill';
    const lunge = isSkill ? 52 : isHeavy ? 38 : 24;
    this.player.x += facing * lunge;
    this.syncHeroArt();

    this.vfx.slash(this.player.x, this.player.y - 6, facing, { color: attack.accent, heavy: isHeavy || isSkill });
    if (isSkill) {
      this.vfx.shockwave(this.player.x + facing * 105, this.player.y - 4, { color: attack.accent, scale: 1.45, duration: 390 });
      this.vfx.lightning(this.player.x + facing * 35, this.player.y - 42, this.player.x + facing * 205, this.player.y - 10, { color: 0xccefff });
    }

    const hit = isTargetInAttackArc({ attackerX: this.player.x, targetX: this.dummy.x, facing, range: attack.range, verticalDelta: this.dummy.y - this.player.y });
    if (!hit) {
      this.toast(`${attack.label} · WHIFF`, { accent: attack.accent, color: '#ddd5e6' });
      this.time.delayedCall(90, () => { this.attacking = false; this.setHeroState('idle'); });
      return;
    }

    const damage = resolveDamage({ attack, attackerPower: 1, targetArmor: this.dummyArmor });
    this.dummyHp = Math.max(0, this.dummyHp - damage);
    this.dummy.setVelocityX(facing * attack.knockback).setVelocityY(isHeavy ? -120 : -55);
    this.setDummyPose(this.dummyHp === 0 ? 'down' : 'hit', this.dummyHp === 0 ? 0 : (isSkill ? 170 : 110));

    this.hitStop(isSkill ? 62 : isHeavy ? 45 : 29);
    this.vfx.screenFlash({ color: attack.accent, alpha: isSkill ? 0.11 : 0.045, duration: isSkill ? 115 : 70 });
    this.vfx.radialImpact(this.dummy.x, this.dummy.y - 18, { color: attack.accent, power: isSkill ? 1.45 : isHeavy ? 1.12 : 0.78 });
    this.vfx.burst(this.dummy.x, this.dummy.y - 10, { color: attack.accent, count: isSkill ? 26 : isHeavy ? 18 : 11, speed: isSkill ? 290 : isHeavy ? 220 : 155, scale: isSkill ? 1 : 0.7 });
    this.cameras.main.shake(isSkill ? 135 : isHeavy ? 100 : 55, isSkill ? 0.008 : isHeavy ? 0.005 : 0.0025);
    this.cameraPunch(isSkill ? 1.028 : 1.012, isSkill ? 150 : 95);

    this.combo = nextCombo(this.combo, time - this.lastHitAt);
    this.lastHitAt = time;
    this.showDamageNumber(this.dummy.x, this.dummy.y - 75, damage, attack.accent, isSkill || isHeavy);
    this.showCombo();
    this.updateTargetHud();

    if (this.dummyHp === 0) {
      this.toast('TARGET BROKEN · P TO RESPAWN', { accent: THEME.red });
      this.vfx.shockwave(this.dummy.x, this.dummy.y - 8, { color: THEME.red, scale: 1.8, duration: 500 });
    }

    this.time.delayedCall(isSkill ? 140 : 95, () => { this.attacking = false; this.setHeroState('idle'); });
  }

  hitStop(ms) {
    this.physics.world.pause();
    const previousTweenScale = this.tweens.timeScale;
    this.tweens.timeScale = 0.08;
    window.setTimeout(() => {
      if (this.sys.isActive()) { this.physics.world.resume(); this.tweens.timeScale = previousTweenScale; }
    }, ms);
  }

  cameraPunch(zoom, duration) {
    const camera = this.cameras.main;
    this.tweens.killTweensOf(camera);
    this.tweens.add({ targets: camera, zoom, duration: duration * 0.35, ease: 'Cubic.easeOut', yoyo: true });
  }

  showCombo() {
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setText(`${this.combo}\nHIT${this.combo === 1 ? '' : 'S'}`).setAlpha(1).setScale(1.3).setY(190);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 110, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.comboText, alpha: 0, y: 178, duration: 260, delay: 720, ease: 'Quad.easeIn' });
  }

  showDamageNumber(x, y, damage, color, strong = false) {
    const textColor = Phaser.Display.Color.IntegerToColor(color).rgba;
    const label = this.add.text(x, y, `${strong ? 'CRITICAL\n' : ''}${damage}`, {
      align: 'center', fontFamily: 'Trebuchet MS', fontSize: strong ? '29px' : '24px', fontStyle: '700', color: textColor,
      stroke: '#301729', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(95).setScale(0.6).setAngle(Phaser.Math.Between(-5, 5));
    this.tweens.add({ targets: label, y: y - 62, alpha: 0, scale: strong ? 1.25 : 1.05, duration: 590, ease: 'Back.easeOut', onComplete: () => label.destroy() });
  }

  updateSkillCooldown(slot, attack, time) {
    const remaining = Math.max(0, (this.cooldowns.get(attack.id) ?? 0) - time);
    const ratio = remaining / attack.cooldownMs;
    slot.veil.clear();
    if (ratio > 0) slot.veil.fillStyle(0x090912, 0.72).fillRoundedRect(-26, -26, 52, 52 * ratio, 4);
    return remaining;
  }

  update(time) {
    this.controller?.update(time);
    if (!this.attackKeys) return;
    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.light)) this.performAttack(ATTACKS.light, time);
    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.heavy)) this.performAttack(ATTACKS.heavy, time);
    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.skill)) this.performAttack(ATTACKS.skill, time);
    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.respawn)) { this.spawnDummy(); this.toast('Training target reset', { accent: THEME.amber }); }
    if (Phaser.Input.Keyboard.JustDown(this.attackKeys.hitboxes)) this.toggleHitboxes();

    this.syncDummyArt();
    if (time - this.lastHitAt > 900) this.combo = 0;
    this.updateTargetHud();
    const quick = this.updateSkillCooldown(this.skillSlots.light, ATTACKS.light, time);
    const heavy = this.updateSkillCooldown(this.skillSlots.heavy, ATTACKS.heavy, time);
    const skill = this.updateSkillCooldown(this.skillSlots.skill, ATTACKS.skill, time);
    const distance = this.dummy?.active ? Math.round(Math.abs(this.dummy.x - this.player.x)) : 0;
    this.combatDebug?.setText([
      `target hp       ${String(this.dummyHp).padStart(3)} / ${this.dummyMaxHp}`,
      `distance        ${String(distance).padStart(3)} px`,
      `facing          ${this.controller.facing > 0 ? 'RIGHT' : 'LEFT'}`,
      `combo           ${this.combo}`,
      `J quick         ${Math.ceil(quick)} ms`,
      `K breaker       ${Math.ceil(heavy)} ms`,
      `L arc surge     ${Math.ceil(skill)} ms`,
    ]);
  }
}
