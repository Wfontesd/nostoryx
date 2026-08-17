import { BaseLabScene } from './base-lab-scene.js';
import { THEME } from '../theme.js';

export class UiLabScene extends BaseLabScene {
  constructor() { super('UiLab'); }

  create() {
    this.createLabChrome('UI / HUD Lab', 'Stress gameplay information density without falling back to generic web-app components.', 0xff7fb4);
    this.createGround(650);

    this.actor = this.add.image(410, 560, 'player').setScale(1.15).setDepth(20);
    this.enemy = this.add.image(870, 570, 'slime').setScale(1.4).setDepth(20);
    this.vfx.shockwave(410, 560, { color: 0xff7fb4, scale: 0.65, duration: 520 });

    this.hp = 84;
    this.mp = 61;
    this.xp = 47;
    this.warning = false;
    this.inventoryOpen = false;
    this.keys = this.input.keyboard.addKeys({
      damage: Phaser.Input.Keyboard.KeyCodes.Q,
      mana: Phaser.Input.Keyboard.KeyCodes.W,
      level: Phaser.Input.Keyboard.KeyCodes.E,
      inventory: Phaser.Input.Keyboard.KeyCodes.TAB,
      quest: Phaser.Input.Keyboard.KeyCodes.T,
    });

    this.createHud();
    this.createSkillBar();
    this.createQuestTracker();
    this.createInventoryOverlay();

    this.makePanel(22, 104, 306, 156, { accent: 0xff7fb4, alpha: 0.88 });
    this.add.text(40, 122, 'HUD STATE INJECTOR', { fontFamily: 'monospace', fontSize: '11px', color: '#ffabd0' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.hudDebug = this.makeDebugText(40, 150, 'ready');
    this.add.text(40, 218, 'Q damage  W mana  E level-up  TAB inventory  T quest', { fontFamily: 'monospace', fontSize: '9px', color: '#79869a' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.renderHud();
  }

  createHud() {
    this.hudFrame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 2);
    this.hudFrame.fillStyle(0x080c13, 0.93).fillRoundedRect(356, 92, 318, 84, 12);
    this.hudFrame.lineStyle(1, 0x536078, 0.75).strokeRoundedRect(356, 92, 318, 84, 12);
    this.hudFrame.fillStyle(0xff7fb4, 0.8).fillCircle(391, 134, 23);
    this.hudFrame.fillStyle(0x151b28, 1).fillCircle(391, 134, 18);
    this.hudFrame.lineStyle(2, 0xffb8d7, 0.55).strokeCircle(391, 134, 18);

    this.add.text(425, 105, 'TRAIL WARDEN', { fontFamily: 'system-ui', fontSize: '12px', fontStyle: '800', color: '#f4f6fc' }).setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.add.text(635, 106, 'LV. 10', { fontFamily: 'monospace', fontSize: '10px', color: '#ffacd0' }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.mpBar = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.vitalsText = this.add.text(426, 151, '', { fontFamily: 'monospace', fontSize: '9px', color: '#cbd4e1' }).setScrollFactor(0).setDepth(this.uiDepth + 4);
  }

  createSkillBar() {
    const centerX = this.scale.width / 2;
    const y = this.scale.height - 88;
    const frame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 2);
    frame.fillStyle(0x080c13, 0.94).fillRoundedRect(centerX - 270, y - 14, 540, 74, 14);
    frame.lineStyle(1, 0x4d5870, 0.8).strokeRoundedRect(centerX - 270, y - 14, 540, 74, 14);
    frame.fillStyle(0xff7fb4, 0.7).fillRect(centerX - 96, y - 14, 192, 2);

    const labels = ['J', 'K', 'L', '1', '2', '3'];
    const names = ['Slash', 'Break', 'Arc', 'Potion', 'Ward', 'Blink'];
    labels.forEach((key, index) => {
      const x = centerX - 214 + index * 82;
      frame.fillStyle(index < 3 ? 0x261b2a : 0x141b28, 1).fillRoundedRect(x, y, 62, 46, 8);
      frame.lineStyle(1, index < 3 ? 0xff7fb4 : 0x45526a, 0.75).strokeRoundedRect(x, y, 62, 46, 8);
      this.add.text(x + 8, y + 5, key, { fontFamily: 'monospace', fontSize: '9px', color: '#ffafd1' }).setScrollFactor(0).setDepth(this.uiDepth + 3);
      this.add.text(x + 31, y + 27, names[index], { fontFamily: 'system-ui', fontSize: '9px', color: '#e0e5ee' }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 3);
    });
  }

  createQuestTracker() {
    this.questFrame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 2);
    this.questFrame.fillStyle(0x090d14, 0.88).fillRoundedRect(this.scale.width - 322, 318, 294, 134, 10);
    this.questFrame.lineStyle(1, 0x424f65, 0.75).strokeRoundedRect(this.scale.width - 322, 318, 294, 134, 10);
    this.questFrame.fillStyle(0xff7fb4, 0.8).fillRect(this.scale.width - 322, 318, 3, 134);
    this.questTitle = this.add.text(this.scale.width - 300, 338, 'FIELD TEST / Unstable Growth', { fontFamily: 'system-ui', fontSize: '11px', fontStyle: '700', color: '#f0f3f8' }).setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.questText = this.add.text(this.scale.width - 300, 370, 'Defeat Moss Slimes     3 / 8\nCollect Ether Spores    2 / 4\nReturn to Lab Warden', { fontFamily: 'monospace', fontSize: '10px', color: '#9faabc', lineSpacing: 6 }).setScrollFactor(0).setDepth(this.uiDepth + 3);
  }

  createInventoryOverlay() {
    const { width, height } = this.scale;
    this.inventory = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(this.uiDepth + 20).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x070b11, 0.97).fillRoundedRect(-270, -215, 540, 430, 14);
    bg.lineStyle(1, 0xff7fb4, 0.72).strokeRoundedRect(-270, -215, 540, 430, 14);
    bg.fillStyle(0xff7fb4, 0.75).fillRect(-270, -215, 164, 3);
    const title = this.add.text(-238, -181, 'TRAIL PACK', { fontFamily: 'system-ui', fontSize: '18px', fontStyle: '800', color: '#f4f6fb' });
    const sub = this.add.text(-238, -151, 'TAB closes · developer composition mock', { fontFamily: 'monospace', fontSize: '9px', color: '#78859a' });
    const items = ['Iron Trailblade', 'Ember Tonic ×3', 'Ether Spore ×2', 'Old Key', 'Trail Stew ×1', 'Empty slot'];
    const cells = [];
    items.forEach((item, i) => {
      const cx = -232 + (i % 3) * 160;
      const cy = -96 + Math.floor(i / 3) * 112;
      const cell = this.add.graphics();
      cell.fillStyle(0x111923, 1).fillRoundedRect(cx, cy, 138, 88, 8);
      cell.lineStyle(1, i < 5 ? 0x56657c : 0x2b3443, 0.7).strokeRoundedRect(cx, cy, 138, 88, 8);
      const text = this.add.text(cx + 12, cy + 54, item, { fontFamily: 'system-ui', fontSize: '10px', color: i < 5 ? '#dce2eb' : '#586376', wordWrap: { width: 114 } });
      cells.push(cell, text);
    });
    this.inventory.add([bg, title, sub, ...cells]);
  }

  renderHud() {
    this.hpBar.clear().fillStyle(0x271119, 1).fillRoundedRect(426, 126, 205, 9, 4).fillStyle(this.hp < 30 ? THEME.red : 0xff6d87, 1).fillRoundedRect(428, 128, 201 * this.hp / 100, 5, 2);
    this.mpBar.clear().fillStyle(0x111d2b, 1).fillRoundedRect(426, 139, 205, 7, 3).fillStyle(0x65b8ff, 1).fillRoundedRect(428, 141, 201 * this.mp / 100, 3, 2);
    this.xpBar.clear().fillStyle(0x14101d, 1).fillRoundedRect(356, 171, 318, 3, 1).fillStyle(0xb68cff, 1).fillRect(356, 171, 318 * this.xp / 100, 3);
    this.vitalsText.setText(`HP ${String(this.hp).padStart(3)} / 100      MP ${String(this.mp).padStart(3)} / 100      XP ${this.xp}%`);
    this.hudDebug?.setText([
      `hp              ${this.hp}%`,
      `mp              ${this.mp}%`,
      `xp              ${this.xp}%`,
      `low hp state    ${this.hp < 30 ? 'ACTIVE' : 'CLEAR'}`,
      `inventory       ${this.inventoryOpen ? 'OPEN' : 'CLOSED'}`,
    ]);
  }

  damagePulse() {
    this.hp = this.hp <= 14 ? 100 : this.hp - 14;
    const damage = this.add.text(this.enemy.x, this.enemy.y - 56, this.hp === 100 ? 'RESET' : '-14', { fontFamily: 'system-ui', fontSize: '28px', fontStyle: '800', color: '#ff7585', stroke: '#07090d', strokeThickness: 6 }).setOrigin(0.5).setDepth(90);
    this.tweens.add({ targets: damage, y: damage.y - 50, alpha: 0, duration: 550, onComplete: () => damage.destroy() });
    this.cameras.main.shake(75, 0.003);
    this.renderHud();
  }

  levelUp() {
    this.xp = 0;
    this.vfx.shockwave(this.actor.x, this.actor.y, { color: 0xffb8dd, scale: 1.8, duration: 600 });
    this.vfx.burst(this.actor.x, this.actor.y, { color: 0xff89bc, count: 24, speed: 260, scale: 1 });
    const banner = this.add.text(this.scale.width / 2, 270, 'LEVEL UP', { fontFamily: 'system-ui', fontSize: '42px', fontStyle: '900', color: '#ffd1e5', stroke: '#29121f', strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 15).setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 220, yoyo: true, hold: 620, onComplete: () => banner.destroy() });
    this.renderHud();
  }

  update() {
    if (!this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.damage)) this.damagePulse();
    if (Phaser.Input.Keyboard.JustDown(this.keys.mana)) { this.mp = this.mp <= 15 ? 100 : this.mp - 15; this.renderHud(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.level)) this.levelUp();
    if (Phaser.Input.Keyboard.JustDown(this.keys.inventory)) { this.inventoryOpen = !this.inventoryOpen; this.inventory.setVisible(this.inventoryOpen); this.renderHud(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.quest)) {
      const current = this.questText.text.includes('3 / 8');
      this.questText.setText(current ? 'Defeat Moss Slimes     8 / 8  ✓\nCollect Ether Spores    4 / 4  ✓\nReturn to Lab Warden' : 'Defeat Moss Slimes     3 / 8\nCollect Ether Spores    2 / 4\nReturn to Lab Warden');
      this.toast('Quest tracker fixture toggled', { accent: 0xff7fb4 });
    }
  }
}
