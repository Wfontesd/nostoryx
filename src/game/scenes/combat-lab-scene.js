import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { ATTACKS, isTargetInAttackArc, nextCombo, resolveDamage } from '../systems/combat-model.js';
import { THEME } from '../theme.js';

export class CombatLabScene extends BaseLabScene {
  constructor() { super('CombatLab'); }

  create() {
    this.createLabChrome('Combat Lab', 'Validate attacks, responsiveness, hit feedback and readable combat states.', THEME.amber);
    this.physics.world.setBounds(0, 76, this.scale.width, this.scale.height - 76);
    this.ground = this.createGround(650);

    this.player = this.createPlayer(300, 590);
    this.controller = new PlayerController(this, this.player, { speed: 270, jumpSpeed: 620, dashSpeed: 700 });
    this.physics.add.collider(this.player, this.ground);

    this.spawnDummy();

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

    this.makePanel(22, 104, 318, 196, { accent: THEME.amber });
    this.add.text(40, 122, 'COMBAT TELEMETRY', { fontFamily: 'monospace', fontSize: '11px', color: '#ffc985' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.combatDebug = this.makeDebugText(40, 150, 'ready');

    this.makePanel(this.scale.width - 340, 104, 318, 178, { accent: 0x6c4e2b, alpha: 0.86 });
    this.add.text(this.scale.width - 320, 122, 'INPUT / FEEL CHECK', { fontFamily: 'monospace', fontSize: '10px', color: '#f3bd79' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(this.scale.width - 320, 150,
      'J  Quick Slash       18 dmg\nK  Breaker           34 dmg\nL  Arc Surge         48 dmg\n\nB  physics hitboxes\nP  respawn target\n\nExpected: anticipation → impact → reaction',
      { fontFamily: 'monospace', fontSize: '10px', color: '#c7cfda', lineSpacing: 4 },
    ).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.comboText = this.add.text(this.scale.width / 2, 145, '', {
      fontFamily: 'system-ui', fontSize: '36px', fontStyle: '800', color: '#ffd39b', stroke: '#15100b', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 5).setAlpha(0);

    this.events.on('player-dash', () => this.player.setTint(0xb9dfff));
    this.time.addEvent({ delay: 120, loop: true, callback: () => this.player?.clearTint() });
  }

  spawnDummy() {
    this.dummy?.destroy();
    this.dummy = this.physics.add.sprite(820, 575, 'brute').setDepth(20).setCollideWorldBounds(true);
    this.dummy.body.setSize(53, 72).setOffset(6, 3);
    this.dummy.setDragX(900);
    this.physics.add.collider(this.dummy, this.ground);
    this.dummyMaxHp = 240;
    this.dummyHp = this.dummyMaxHp;
    this.dummyArmor = 8;

    this.hpFrame?.destroy();
    this.hpBar?.destroy();
    this.hpLabel?.destroy();
    this.hpFrame = this.add.graphics().setDepth(30);
    this.hpBar = this.add.graphics().setDepth(31);
    this.hpLabel = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', color: '#d8dfeb' }).setOrigin(0.5).setDepth(32);
    this.updateDummyHud();
  }

  updateDummyHud() {
    if (!this.dummy?.active) return;
    const x = this.dummy.x - 58;
    const y = this.dummy.y - 72;
    this.hpFrame.clear().fillStyle(0x070a0f, 0.9).fillRoundedRect(x, y, 116, 9, 4).lineStyle(1, 0x4b5566, 0.7).strokeRoundedRect(x, y, 116, 9, 4);
    this.hpBar.clear().fillStyle(THEME.red, 1).fillRoundedRect(x + 2, y + 2, 112 * Math.max(0, this.dummyHp / this.dummyMaxHp), 5, 2);
    this.hpLabel.setPosition(this.dummy.x, y - 12).setText(`TRAINING BRUTE  ${this.dummyHp}/${this.dummyMaxHp}`);
  }

  canUse(attack, time) {
    return time >= (this.cooldowns.get(attack.id) ?? 0);
  }

  performAttack(attack, time) {
    if (!this.canUse(attack, time) || !this.dummy?.active || this.dummyHp <= 0) return;
    this.cooldowns.set(attack.id, time + attack.cooldownMs);
    const facing = this.controller.facing;
    const heavy = attack.id !== 'light';

    this.vfx.slash(this.player.x, this.player.y - 4, facing, { color: attack.accent, heavy });
    if (attack.id === 'skill') {
      this.vfx.shockwave(this.player.x + facing * 74, this.player.y, { color: attack.accent, scale: 1.25, duration: 330 });
      this.vfx.lightning(this.player.x + facing * 28, this.player.y - 32, this.player.x + facing * 175, this.player.y - 12, { color: 0xbbeeff });
    }

    const hit = isTargetInAttackArc({
      attackerX: this.player.x,
      targetX: this.dummy.x,
      facing,
      range: attack.range,
      verticalDelta: this.dummy.y - this.player.y,
    });

    if (!hit) {
      this.toast(`${attack.label}: whiff`, { accent: attack.accent, color: '#8f9aac' });
      return;
    }

    const damage = resolveDamage({ attack, attackerPower: 1, targetArmor: this.dummyArmor });
    this.dummyHp = Math.max(0, this.dummyHp - damage);
    this.dummy.setVelocityX(facing * attack.knockback).setVelocityY(attack.id === 'heavy' ? -95 : -45);
    this.dummy.setTint(0xffffff);
    this.time.delayedCall(85, () => this.dummy?.clearTint());
    this.cameras.main.shake(attack.id === 'skill' ? 120 : 70, attack.id === 'skill' ? 0.007 : 0.0035);
    this.vfx.burst(this.dummy.x, this.dummy.y - 6, { color: attack.accent, count: attack.id === 'skill' ? 20 : 11, speed: attack.id === 'skill' ? 250 : 155, scale: heavy ? 1 : 0.7 });

    this.combo = nextCombo(this.combo, time - this.lastHitAt);
    this.lastHitAt = time;
    this.showDamageNumber(this.dummy.x, this.dummy.y - 58, damage, attack.accent);
    this.comboText.setText(`${this.combo} HIT${this.combo === 1 ? '' : 'S'}`).setAlpha(1).setScale(attack.id === 'skill' ? 1.13 : 1);
    this.tweens.killTweensOf(this.comboText);
    this.tweens.add({ targets: this.comboText, alpha: 0, y: 138, duration: 260, delay: 650, onComplete: () => this.comboText.setY(145) });

    if (this.dummyHp === 0) {
      this.toast('Target defeated · P respawns instantly', { accent: THEME.red });
      this.tweens.add({ targets: this.dummy, alpha: 0.15, angle: 5 * facing, duration: 220 });
    }
  }

  showDamageNumber(x, y, damage, color) {
    const textColor = Phaser.Display.Color.IntegerToColor(color).rgba;
    const label = this.add.text(x, y, `${damage}`, {
      fontFamily: 'system-ui', fontSize: '26px', fontStyle: '800', color: textColor, stroke: '#090b10', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: label, y: y - 54, alpha: 0, scale: 1.15, duration: 520, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
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
    this.updateDummyHud();

    const remaining = (attack) => Math.max(0, (this.cooldowns.get(attack.id) ?? 0) - time);
    const distance = this.dummy?.active ? Math.round(Math.abs(this.dummy.x - this.player.x)) : 0;
    this.combatDebug?.setText([
      `target hp       ${String(this.dummyHp).padStart(3)} / ${this.dummyMaxHp}`,
      `distance        ${String(distance).padStart(3)} px`,
      `facing          ${this.controller.facing > 0 ? 'RIGHT' : 'LEFT'}`,
      `combo           ${this.combo}`,
      `J quick         ${Math.ceil(remaining(ATTACKS.light))} ms`,
      `K breaker       ${Math.ceil(remaining(ATTACKS.heavy))} ms`,
      `L arc surge     ${Math.ceil(remaining(ATTACKS.skill))} ms`,
      `hitboxes        ${this.physics.world.drawDebug ? 'ON' : 'OFF'}`,
    ]);
  }
}
