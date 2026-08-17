import { BaseLabScene } from './base-lab-scene.js';
import { THEME } from '../theme.js';
import { GENERATED_ATLAS, addAtlasArt, atlasHas } from '../systems/generated-art.js';

const SKILLS = Object.freeze([
  { key: 'J', name: 'Quick Slash', frame: 'skill_quick', accent: 0x65dcff },
  { key: 'K', name: 'Breaker', frame: 'skill_breaker', accent: 0xffbd68 },
  { key: 'L', name: 'Arc Surge', frame: 'skill_arc', accent: 0xb991ff },
  { key: '1', name: 'Dash', frame: 'skill_dash', accent: 0x6ee8e0 },
  { key: '2', name: 'Ward', frame: 'skill_sigils', accent: 0xd892ff },
  { key: '3', name: 'Heal', frame: 'skill_heal', accent: 0x6de5a4 },
]);

const INVENTORY_ITEMS = Object.freeze([
  { name: 'Iron Trailblade', frame: 'skill_breaker', count: 1, rarity: 0xffc36e },
  { name: 'Ember Tonic', frame: 'skill_heal', count: 3, rarity: 0x6de5a4 },
  { name: 'Ether Spore', frame: 'vfx_orb', count: 2, rarity: 0x9f8cff },
  { name: 'Arcane Sigil', frame: 'skill_sigils', count: 1, rarity: 0xd892ff },
  { name: 'Trail Ration', frame: 'skill_impact', count: 2, rarity: 0xe9c26c },
  { name: 'Empty Slot', frame: null, count: 0, rarity: 0x4f5262 },
]);

export class UiLabScene extends BaseLabScene {
  constructor() { super('UiLab'); }

  create() {
    this.createLabChrome('UI / HUD Lab', 'Player-facing information hierarchy inspired by action MMORPGs.', 0xff7fb4);
    this.createGround(650);

    this.actor = atlasHas(this, 'hero_idle')
      ? addAtlasArt(this, 385, 628, 'hero_idle', { height: 152 })?.setDepth(20)
      : this.add.image(385, 560, 'player').setScale(1.15).setDepth(20);
    this.enemy = atlasHas(this, 'slime_idle')
      ? addAtlasArt(this, 870, 626, 'slime_idle', { height: 84 })?.setDepth(20)
      : this.add.image(870, 570, 'slime').setScale(1.4).setDepth(20);

    this.hp = 84;
    this.mp = 61;
    this.xp = 47;
    this.inventoryOpen = false;
    this.questComplete = false;
    this.level = 10;

    this.keys = this.input.keyboard.addKeys({
      damage: Phaser.Input.Keyboard.KeyCodes.Q,
      mana: Phaser.Input.Keyboard.KeyCodes.W,
      level: Phaser.Input.Keyboard.KeyCodes.E,
      inventory: Phaser.Input.Keyboard.KeyCodes.TAB,
      quest: Phaser.Input.Keyboard.KeyCodes.T,
    });

    this.createPlayerHud();
    this.createSkillBar();
    this.createQuestTracker();
    this.createInventoryOverlay();
    this.createDeveloperOverlay();
    this.renderHud();

    this.vfx.shockwave(this.actor.x, this.actor.y - 62, { color: 0xff7fb4, scale: 0.62, duration: 520 });
  }

  createPlayerHud() {
    const x = 24;
    const y = 72;
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 3);
    const frame = this.add.graphics();
    frame.fillStyle(0x0c0d1a, 0.91).fillRoundedRect(34, 0, 326, 82, 10);
    frame.lineStyle(2, 0x766b91, 0.88).strokeRoundedRect(34, 0, 326, 82, 10);
    frame.lineStyle(1, 0xd4b6ff, 0.26).strokeRoundedRect(40, 6, 314, 70, 7);
    frame.fillStyle(0x1d1a33, 1).fillCircle(42, 41, 39);
    frame.lineStyle(4, 0xc59cff, 0.9).strokeCircle(42, 41, 36);
    frame.fillStyle(0xff7fb4, 0.82).fillTriangle(4, 7, 28, 7, 4, 31);

    let portrait;
    if (atlasHas(this, 'hero_idle')) {
      portrait = this.add.image(42, 78, GENERATED_ATLAS, 'hero_idle').setOrigin(0.5, 1).setDisplaySize(66, 86);
    } else {
      portrait = this.add.image(42, 42, 'player').setDisplaySize(62, 76);
    }

    const name = this.add.text(89, 8, 'TRAIL WARDEN', {
      fontFamily: 'Trebuchet MS', fontSize: '13px', fontStyle: '700', color: '#fff1e5',
    });
    this.levelText = this.add.text(336, 9, '', { fontFamily: 'monospace', fontSize: '9px', color: '#ffc0dc' }).setOrigin(1, 0);

    this.vitalGraphics = this.add.graphics();
    this.vitalText = this.add.text(90, 61, '', { fontFamily: 'monospace', fontSize: '8px', color: '#e6dfe6' });
    container.add([frame, portrait, name, this.levelText, this.vitalGraphics, this.vitalText]);
    this.playerHud = container;
  }

  createSkillBar() {
    const centerX = this.scale.width / 2;
    const y = this.scale.height - 55;
    const container = this.add.container(centerX, y).setScrollFactor(0).setDepth(this.uiDepth + 4);
    const rail = this.add.graphics();
    rail.fillStyle(0x090a16, 0.93).fillRoundedRect(-286, -43, 572, 86, 14);
    rail.lineStyle(2, 0x706487, 0.88).strokeRoundedRect(-286, -43, 572, 86, 14);
    rail.lineStyle(1, 0xf0d8ff, 0.15).strokeRoundedRect(-278, -35, 556, 70, 10);
    rail.fillStyle(0xff7fb4, 0.86).fillTriangle(-286, -43, -252, -43, -286, -9);
    rail.fillStyle(0x7cdfff, 0.65).fillTriangle(286, 43, 252, 43, 286, 9);

    const children = [rail];
    this.skillSlots = SKILLS.map((skill, index) => {
      const x = -238 + index * 95;
      const slot = this.add.container(x, 0);
      const frame = this.add.graphics();
      frame.fillStyle(0x151426, 0.98).fillRoundedRect(-35, -35, 70, 70, 9);
      frame.lineStyle(2, 0x8f7e9f, 0.9).strokeRoundedRect(-35, -35, 70, 70, 9);
      frame.lineStyle(1, skill.accent, 0.85).strokeRoundedRect(-29, -29, 58, 58, 7);
      const icon = atlasHas(this, skill.frame)
        ? this.add.image(0, 0, GENERATED_ATLAS, skill.frame).setDisplaySize(56, 56)
        : this.add.rectangle(0, 0, 54, 54, 0x35284e, 1);
      const key = this.add.text(-30, -31, skill.key, {
        fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#fff7e8', stroke: '#100f1c', strokeThickness: 4,
      });
      const name = this.add.text(0, 42, skill.name.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '6px', color: Phaser.Display.Color.IntegerToColor(skill.accent).rgba,
      }).setOrigin(0.5, 0);
      slot.add([frame, icon, key, name]);
      children.push(slot);
      return { slot, frame, icon, skill };
    });

    container.add(children);
    this.skillBar = container;
  }

  createQuestTracker() {
    const x = this.scale.width - 330;
    const y = 78;
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 3);
    const bg = this.add.graphics();
    bg.fillStyle(0x11101d, 0.86).fillRoundedRect(0, 0, 302, 134, 10);
    bg.lineStyle(1, 0x77678c, 0.74).strokeRoundedRect(0, 0, 302, 134, 10);
    bg.lineStyle(1, 0xffb3d3, 0.28).strokeRoundedRect(7, 7, 288, 120, 7);
    bg.fillStyle(0xff7fb4, 0.9).fillRect(0, 20, 3, 94);
    const chapter = this.add.text(18, 13, 'FIELD QUEST', { fontFamily: 'monospace', fontSize: '8px', color: '#ffafd0' });
    this.questTitle = this.add.text(18, 31, 'Unstable Growth', { fontFamily: 'Trebuchet MS', fontSize: '13px', fontStyle: '700', color: '#fff0e5' });
    this.questText = this.add.text(18, 59, '', { fontFamily: 'monospace', fontSize: '9px', color: '#c5bdc9', lineSpacing: 7 });
    const hint = this.add.text(282, 112, 'T  UPDATE', { fontFamily: 'monospace', fontSize: '7px', color: '#9c91a4' }).setOrigin(1, 0);
    container.add([bg, chapter, this.questTitle, this.questText, hint]);
    this.questTracker = container;
    this.renderQuest();
  }

  createInventoryOverlay() {
    const { width, height } = this.scale;
    const container = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(this.uiDepth + 40).setVisible(false);
    const dimmer = this.add.rectangle(0, 0, width, height, 0x070714, 0.76);
    const bg = this.add.graphics();
    bg.fillStyle(0x11101f, 0.985).fillRoundedRect(-330, -238, 660, 476, 16);
    bg.lineStyle(3, 0x856ea1, 0.92).strokeRoundedRect(-330, -238, 660, 476, 16);
    bg.lineStyle(1, 0xffb2d4, 0.44).strokeRoundedRect(-318, -226, 636, 452, 12);
    bg.fillStyle(0xff7fb4, 0.9).fillTriangle(-330, -238, -278, -238, -330, -186);
    bg.fillStyle(0x7ddfff, 0.62).fillTriangle(330, 238, 278, 238, 330, 186);

    const title = this.add.text(-292, -198, 'TRAIL PACK', { fontFamily: 'Trebuchet MS', fontSize: '22px', fontStyle: '700', color: '#fff1e5' });
    const subtitle = this.add.text(-292, -167, 'Equipment and expedition supplies', { fontFamily: 'monospace', fontSize: '8px', color: '#aaa0ad' });
    const close = this.add.text(292, -196, 'TAB  CLOSE', { fontFamily: 'monospace', fontSize: '8px', color: '#ffb0d1' }).setOrigin(1, 0);

    const cells = [];
    INVENTORY_ITEMS.forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = -286 + col * 200;
      const y = -112 + row * 154;
      const cell = this.add.container(x, y);
      const frame = this.add.graphics();
      frame.fillStyle(0x181626, 1).fillRoundedRect(0, 0, 176, 126, 10);
      frame.lineStyle(2, item.rarity, item.frame ? 0.8 : 0.25).strokeRoundedRect(0, 0, 176, 126, 10);
      frame.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(7, 7, 162, 112, 7);
      const icon = item.frame && atlasHas(this, item.frame)
        ? this.add.image(50, 53, GENERATED_ATLAS, item.frame).setDisplaySize(78, 78)
        : this.add.rectangle(50, 53, 72, 72, 0x242231, 0.9);
      const name = this.add.text(96, 25, item.name, {
        fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: item.frame ? '#f2e9e2' : '#686571', wordWrap: { width: 68 },
      });
      const count = this.add.text(154, 97, item.count ? `×${item.count}` : '—', {
        fontFamily: 'Trebuchet MS', fontSize: '13px', fontStyle: '700', color: item.frame ? Phaser.Display.Color.IntegerToColor(item.rarity).rgba : '#5b5965',
      }).setOrigin(1, 0);
      cell.add([frame, icon, name, count]);
      cells.push(cell);
    });

    container.add([dimmer, bg, title, subtitle, close, ...cells]);
    this.inventory = container;
  }

  createDeveloperOverlay() {
    const container = this.add.container(18, 176).setScrollFactor(0).setDepth(this.uiDepth + 60).setVisible(false);
    const panel = this.add.graphics();
    panel.fillStyle(0x0c0d18, 0.96).fillRoundedRect(0, 0, 296, 174, 8);
    panel.lineStyle(1, 0xff7fb4, 0.65).strokeRoundedRect(0, 0, 296, 174, 8);
    const title = this.add.text(16, 13, 'HUD STATE INJECTOR / F2', { fontFamily: 'monospace', fontSize: '10px', color: '#ffabd0' });
    this.hudDebug = this.add.text(16, 39, 'ready', { fontFamily: 'monospace', fontSize: '10px', color: '#ded5dd', lineSpacing: 5 });
    const help = this.add.text(16, 142, 'Q damage · W mana · E level · TAB pack · T quest', { fontFamily: 'monospace', fontSize: '8px', color: '#9b929e' });
    container.add([panel, title, this.hudDebug, help]);
    this.devOverlay = container;
  }

  renderHud() {
    const graphics = this.vitalGraphics;
    graphics.clear();
    graphics.fillStyle(0x321520, 1).fillRoundedRect(90, 31, 245, 13, 5);
    graphics.fillStyle(this.hp < 30 ? 0xff475c : 0xe95e78, 1).fillRoundedRect(93, 34, 239 * this.hp / 100, 7, 3);
    graphics.fillStyle(0x15243a, 1).fillRoundedRect(90, 48, 210, 10, 4);
    graphics.fillStyle(0x58baf5, 1).fillRoundedRect(93, 51, 204 * this.mp / 100, 4, 2);
    graphics.fillStyle(0x302b1c, 1).fillRoundedRect(90, 64, 190, 5, 2);
    graphics.fillStyle(0xf1ce67, 1).fillRoundedRect(92, 66, 186 * this.xp / 100, 1.5, 1);

    this.levelText.setText(`LV. ${this.level}`);
    this.vitalText.setText(`HP ${String(this.hp).padStart(3)} / 100     MP ${String(this.mp).padStart(3)} / 100     XP ${this.xp}%`);
    this.hudDebug?.setText([
      `hp              ${this.hp}%`,
      `mp              ${this.mp}%`,
      `xp              ${this.xp}%`,
      `low hp state    ${this.hp < 30 ? 'ACTIVE' : 'CLEAR'}`,
      `inventory       ${this.inventoryOpen ? 'OPEN' : 'CLOSED'}`,
      `quest           ${this.questComplete ? 'COMPLETE' : 'ACTIVE'}`,
    ]);
  }

  renderQuest() {
    this.questText?.setText(this.questComplete
      ? '✓  Defeat Moss Slimes      8 / 8\n✓  Collect Ether Spores     4 / 4\n◆  Return to the Lab Warden'
      : '◆  Defeat Moss Slimes      3 / 8\n◆  Collect Ether Spores     2 / 4\n◇  Return to the Lab Warden');
    this.questTitle?.setColor(this.questComplete ? '#b9ffc9' : '#fff0e5');
  }

  damagePulse() {
    this.hp = this.hp <= 14 ? 100 : this.hp - 14;
    const label = this.add.text(this.enemy.x, this.enemy.y - 86, this.hp === 100 ? 'RESET' : '-14', {
      fontFamily: 'Trebuchet MS', fontSize: '28px', fontStyle: '700', color: '#ff6479', stroke: '#21101a', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(90).setScale(0.7);
    this.tweens.add({ targets: label, y: label.y - 56, alpha: 0, scale: 1.1, duration: 560, ease: 'Back.easeOut', onComplete: () => label.destroy() });
    this.vfx.radialImpact(this.enemy.x, this.enemy.y - 48, { color: 0xff667a, power: 0.7 });
    this.cameras.main.shake(70, 0.0025);
    if (this.hp < 30) this.vfx.screenFlash({ color: 0xff334d, alpha: 0.06, duration: 140 });
    this.renderHud();
  }

  levelUp() {
    this.level += 1;
    this.xp = 0;
    this.vfx.castSigil(this.actor.x, this.actor.y - 72, { color: 0xffb8dd, scale: 1.05, duration: 650 });
    this.vfx.shockwave(this.actor.x, this.actor.y - 55, { color: 0xffb8dd, scale: 1.8, duration: 600 });
    this.vfx.burst(this.actor.x, this.actor.y - 60, { color: 0xff89bc, count: 24, speed: 260, scale: 1 });
    const banner = this.add.text(this.scale.width / 2, 260, 'LEVEL UP', {
      fontFamily: 'Trebuchet MS', fontSize: '46px', fontStyle: '700', color: '#ffd1e5', stroke: '#351525', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 70).setScale(0.65).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut', yoyo: true, hold: 650, onComplete: () => banner.destroy() });
    this.renderHud();
  }

  update() {
    if (!this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.damage)) this.damagePulse();
    if (Phaser.Input.Keyboard.JustDown(this.keys.mana)) {
      this.mp = this.mp <= 15 ? 100 : this.mp - 15;
      this.renderHud();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.level)) this.levelUp();
    if (Phaser.Input.Keyboard.JustDown(this.keys.inventory)) {
      this.inventoryOpen = !this.inventoryOpen;
      this.inventory.setVisible(this.inventoryOpen);
      this.renderHud();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.quest)) {
      this.questComplete = !this.questComplete;
      this.renderQuest();
      this.toast(this.questComplete ? 'Quest objectives completed' : 'Quest state reset', { accent: 0xff7fb4 });
      this.renderHud();
    }
  }
}
