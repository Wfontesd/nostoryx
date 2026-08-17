import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { ATTACKS, isTargetInAttackArc, nextCombo, resolveDamage } from '../systems/combat-model.js';
import { THEME } from '../theme.js';

export class CombatLabScene extends BaseLabScene {
  constructor() { super('CombatLab'); }

  create() {
    this.createLabChrome('Combat Lab', 'Reference target: Elsword impact density + Soul’s Remnant / MapleStory readability.', THEME.amber);
    this.physics.world.setBounds(0, 54, this.scale.width, this.scale.height - 54);
    this.ground = this.createGround(650);

    this.player = this.createPlayer(310, 590);
    this.controller = new PlayerController(this, this.player, { speed: 285, jumpSpeed: 625, dashSpeed: 720 });
    this.physics.add.collider(this.player, this.ground);
    this.spawnDummy();

    this.attackKeys = this.input.keyboard.addKeys({
      light: Phaser.Input.Keyboard.KeyCodes.J, heavy: Phaser.Input.Keyboard.KeyCodes.K,
      skill: Phaser.Input.Keyboard.KeyCodes.L, respawn: Phaser.Input.Keyboard.KeyCodes.P,
      hitboxes: Phaser.Input.Keyboard.KeyCodes.B,
    });
    this.cooldowns = new Map();
    this.combo = 0;
    this.lastHitAt = -Infinity;
    this.attacking = false;

    this.createPlayerHud();
    this.createTargetHud();
    this.createDevTelemetry();
    this.createCombatPrompts();

    this.comboText = this.add.text(this.scale.width - 118, 190, '', {
      fontFamily: 'Trebuchet MS', fontSize: '42px', fontStyle: '700', color: '#fff2cc', stroke: '#3b1830', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 8).setAlpha(0).setAngle(-4);

    this.events.on('player-dash', () => {
      this.player.setTint(0xd8eeff);
      this.time.delayedCall(95, () => this.player?.clearTint());
    });
  }

  createCombatPrompts() {
    const y = this.scale.height - 104;
    this.add.text(this.scale.width / 2, y, 'J  QUICK SLASH      K  BREAKER      L  ARC SURGE', {
      fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff0d5', stroke: '#151323', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 6);
  }

  createPlayerHud() {
    const { height } = this.scale;
    const x = 24;
    const y = height - 90;
    const frame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 4);
    frame.fillStyle(0x17162a, 0.94).fillRect(x + 42, y + 6, 282, 64);
    frame.lineStyle(2, 0x716889, 0.9).strokeRect(x + 42, y + 6, 282, 64);
    frame.fillStyle(0x28233f, 1).fillCircle(x + 42, y + 38, 38);
    frame.lineStyle(4, 0xc5a8ff, 0.85).strokeCircle(x + 42, y + 38, 35);
    frame.fillStyle(0x4b3b86, 1).fillTriangle(x + 24, y + 48, x + 60, y + 48, x + 42, y + 12);
    frame.fillStyle(0x111426, 1).fillRoundedRect(x + 31, y + 31, 22, 25, 7);

    frame.fillStyle(0x351a2a, 1).fillRect(x + 82, y + 18, 224, 13);
    frame.fillStyle(0xd84e62, 1).fillRect(x + 84, y + 20, 220, 9);
    frame.fillStyle(0x192842, 1).fillRect(x + 82, y + 39, 190, 9);
    frame.fillStyle(0x4aaee6, 1).fillRect(x + 84, y + 41, 186, 5);
    frame.fillStyle(0x493f28, 1).fillRect(x + 82, y + 55, 150, 6);
    frame.fillStyle(0xe5c862, 1).fillRect(x + 84, y + 57, 110, 2);

    this.add.text(x + 82, y + 1, 'LAB ADVENTURER   Lv. 12', { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff3dc' })
      .setScrollFactor(0).setDepth(this.uiDepth + 5);
    this.add.text(x + 288, y + 17, '240 / 240', { fontFamily: 'monospace', fontSize: '8px', color: '#fff4f0' }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 5);
  }

  createSkillSlot(x, y, texture, keyLabel, accent) {
    const c = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 5);
    const frame = this.add.graphics();
    frame.fillStyle(0x171426, 0.97).fillRect(-32, -32, 64, 64);
    frame.lineStyle(3, 0x75698c, 0.9).strokeRect(-32, -32, 64, 64);
    frame.lineStyle(1, accent, 0.9).strokeRect(-27, -27, 54, 54);
    const icon = this.add.image(0, 0, texture).setDisplaySize(50, 50);
    const key = this.add.text(-27, -27, keyLabel, { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#fff6df', stroke: '#151323', strokeThickness: 4 });
    const veil = this.add.graphics();
    c.add([frame, icon, veil, key]);
    return { c, veil, accent };
  }

  createSkillHud() {
    if (this.skillSlots) return;
    const { width, height } = this.scale;
    const y = height - 54;
    this.skillSlots = {
      light: this.createSkillSlot(width / 2 - 76, y, 'skill-light', 'J', ATTACKS.light.accent),
      heavy: this.createSkillSlot(width / 2, y, 'skill-heavy', 'K', ATTACKS.heavy.accent),
      skill: this.createSkillSlot(width / 2 + 76, y, 'skill-arc', 'L', ATTACKS.skill.accent),
    };
  }

  createTargetHud() {
    const { width } = this.scale;
    this.targetFrame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 4);
    this.targetLabel = this.add.text(width / 2, 78, 'TRAINING BRUTE  ·  Lv. 12', { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff1dc' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 5);
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
    this.targetFrame.fillStyle(0x1a1628, 0.92).fillRect(x, y, 420, 20);
    this.targetFrame.lineStyle(2, 0x776a8c, 0.9).strokeRect(x, y, 420, 20);
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
    this.dummy?.destroy();
    this.dummy = this.physics.add.sprite(835, 581, 'brute').setDepth(20).setCollideWorldBounds(true);
    this.dummy.body.setSize(62, 78).setOffset(11, 12);
    this.dummy.setDragX(1050);
    this.physics.add.collider(this.dummy, this.ground);
    this.dummyMaxHp = 240;
    this.dummyHp = this.dummyMaxHp;
    this.dummyArmor = 8;
    this.dummy.setScale(1.05);
    this.updateTargetHud();
  }

  canUse(attack, time) { return time >= (this.cooldowns.get(attack.id) ?? 0); }

  performAttack(attack, time) {
    if (!this.canUse(attack, time) || !this.dummy?.active || this.dummyHp <= 0) return;
    this.cooldowns.set(attack.id, time + attack.cooldownMs);
    const facing = this.controller.facing;
    const isHeavy = attack.id === 'heavy';
    const isSkill = attack.id === 'skill';
    const windup = isSkill ? 150 : isHeavy ? 90 : 35;

    this.attacking = true;
    this.player.setFlipX(facing < 0);
    this.vfx.afterImage(this.player, { color: attack.accent, alpha: isSkill ? 0.34 : 0.2, drift: facing * -22, duration: 180 });
    if (isSkill) this.vfx.castSigil(this.player.x, this.player.y + 24, { color: attack.accent, scale: 0.78, duration: 360 });

    this.tweens.add({ targets: this.player, scaleX: isHeavy ? 0.92 : 0.96, scaleY: isHeavy ? 1.10 : 1.04,
      angle: facing * (isHeavy ? -5 : -2), duration: windup, ease: 'Sine.easeOut',
      onComplete: () => this.resolveAttackHit(attack, facing, time) });
  }

  resolveAttackHit(attack, facing, time) {
    const isHeavy = attack.id === 'heavy';
    const isSkill = attack.id === 'skill';
    const lunge = isSkill ? 50 : isHeavy ? 34 : 22;
    this.player.x += facing * lunge;
    this.player.setScale(1.06, 0.94).setAngle(facing * (isHeavy ? 9 : 5));
    this.time.delayedCall(90, () => { if (this.player) this.player.setScale(1).setAngle(0); this.attacking = false; });

    this.vfx.slash(this.player.x, this.player.y - 6, facing, { color: attack.accent, heavy: isHeavy || isSkill });
    if (isSkill) {
      this.vfx.shockwave(this.player.x + facing * 98, this.player.y - 2, { color: attack.accent, scale: 1.55, duration: 380 });
      this.vfx.lightning(this.player.x + facing * 32, this.player.y - 38, this.player.x + facing * 196, this.player.y - 10, { color: 0xccefff });
    }

    const hit = isTargetInAttackArc({ attackerX: this.player.x, targetX: this.dummy.x, facing, range: attack.range, verticalDelta: this.dummy.y - this.player.y });
    if (!hit) { this.toast(`${attack.label} · WHIFF`, { accent: attack.accent, color: '#ddd5e6' }); return; }

    const damage = resolveDamage({ attack, attackerPower: 1, targetArmor: this.dummyArmor });
    this.dummyHp = Math.max(0, this.dummyHp - damage);
    this.dummy.setVelocityX(facing * attack.knockback).setVelocityY(isHeavy ? -120 : -55);
    this.dummy.setTint(0xffffff).setScale(1.08, 0.92);
    this.time.delayedCall(isSkill ? 120 : 78, () => this.dummy?.clearTint().setScale(1.05));

    this.hitStop(isSkill ? 58 : isHeavy ? 43 : 28);
    this.vfx.screenFlash({ color: attack.accent, alpha: isSkill ? 0.13 : 0.055, duration: isSkill ? 115 : 70 });
    this.vfx.radialImpact(this.dummy.x, this.dummy.y - 12, { color: attack.accent, power: isSkill ? 1.45 : isHeavy ? 1.15 : 0.8 });
    this.vfx.burst(this.dummy.x, this.dummy.y - 7, { color: attack.accent, count: isSkill ? 28 : isHeavy ? 19 : 12, speed: isSkill ? 290 : isHeavy ? 220 : 155, scale: isSkill ? 1 : 0.7 });
    this.cameras.main.shake(isSkill ? 135 : isHeavy ? 100 : 55, isSkill ? 0.008 : isHeavy ? 0.005 : 0.0025);
    this.cameraPunch(isSkill ? 1.028 : 1.012, isSkill ? 150 : 95);

    this.combo = nextCombo(this.combo, time - this.lastHitAt);
    this.lastHitAt = time;
    this.showDamageNumber(this.dummy.x, this.dummy.y - 65, damage, attack.accent, isSkill || isHeavy);
    this.showCombo();
    this.updateTargetHud();

    if (this.dummyHp === 0) {
      this.toast('TARGET BROKEN · P TO RESPAWN', { accent: THEME.red });
      this.vfx.shockwave(this.dummy.x, this.dummy.y - 8, { color: THEME.red, scale: 1.8, duration: 500 });
      this.tweens.add({ targets: this.dummy, alpha: 0.12, angle: 8 * facing, y: this.dummy.y + 18, duration: 240 });
    }
  }

  hitStop(ms) {
    this.physics.world.pause();
    const previousTweenScale = this.tweens.timeScale;
    this.tweens.timeScale = 0.08;
    window.setTimeout(() => { if (this.sys.isActive()) { this.physics.world.resume(); this.tweens.timeScale = previousTweenScale; } }, ms);
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
    if (ratio > 0) slot.veil.fillStyle(0x090912, 0.72).fillRect(-25, -25, 50, 50 * ratio);
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
