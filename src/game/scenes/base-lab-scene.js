import { LABS, THEME } from '../theme.js';
import { VfxDirector } from '../systems/vfx.js';
import { session } from '../systems/session.js';

export class BaseLabScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.labKey = key;
    this.debugVisible = true;
    this.helpVisible = false;
    this.uiDepth = 500;
  }

  createLabChrome(title, subtitle, accent = THEME.violet) {
    this.accent = accent;
    this.vfx = new VfxDirector(this);
    this.cameras.main.setBackgroundColor(THEME.bg);
    this.createBackdrop(accent);
    this.createTopBar(title, subtitle, accent);
    this.createGlobalHelp();
    this.createGlobalKeys();
    this.events.on('shutdown', () => this.events.off('update', this.commonUpdate, this));
    this.events.on('update', this.commonUpdate, this);
    this.setupJuiceEvents();
  }

  createBackdrop(accent) {
    const { width, height } = this.scale;
    const g = this.add.graphics().setScrollFactor(0).setDepth(-100);
    g.fillStyle(THEME.bg, 1).fillRect(0, 0, width, height);
    g.fillStyle(0x0b1019, 1).fillRect(0, 76, width, height - 76);

    for (let i = 0; i < 22; i += 1) {
      const x = (i * 97 + 41) % width;
      const y = 118 + ((i * 73) % Math.max(1, height - 180));
      g.fillStyle(accent, i % 4 === 0 ? 0.09 : 0.035).fillCircle(x, y, i % 4 === 0 ? 3 : 1.5);
    }

    g.lineStyle(1, 0x1a2433, 0.34);
    for (let x = 0; x < width; x += 64) g.lineBetween(x, 76, x, height);
    for (let y = 76; y < height; y += 64) g.lineBetween(0, y, width, y);

    const horizon = this.add.graphics().setScrollFactor(0).setDepth(-90);
    horizon.fillStyle(accent, 0.025).fillTriangle(0, height, width * 0.45, 112, width * 0.7, height);
    horizon.fillStyle(0x2c3950, 0.14).fillTriangle(width * 0.2, height, width * 0.62, 165, width, height);
  }

  createTopBar(title, subtitle, accent) {
    const { width } = this.scale;
    const bar = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth);
    bar.fillStyle(0x080c13, 0.98).fillRect(0, 0, width, 76);
    bar.lineStyle(1, 0x263247, 0.8).lineBetween(0, 75, width, 75);
    bar.fillStyle(accent, 1).fillRect(0, 74, 168, 2);

    this.add.text(22, 16, 'NOSTORYX', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: '700', color: '#f5f7ff', letterSpacing: 2,
    }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(22, 39, 'DEV LABS / INTERNAL', {
      fontFamily: 'monospace', fontSize: '10px', color: '#76839b', letterSpacing: 1,
    }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.add.text(202, 14, title, {
      fontFamily: 'system-ui, sans-serif', fontSize: '19px', fontStyle: '700', color: '#f5f7ff',
    }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(202, 41, subtitle, {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#8b98ad',
    }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.add.text(width - 22, 19, 'ESC  LAB SELECT    R  RESET    H  HELP', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8b98ad', align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(width - 22, 41, '1–6  SWITCH LAB', {
      fontFamily: 'monospace', fontSize: '9px', color: Phaser.Display.Color.IntegerToColor(accent).rgba,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 1);
  }

  createGlobalKeys() {
    this.globalKeys = this.input.keyboard.addKeys({
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      help: Phaser.Input.Keyboard.KeyCodes.H,
      lab1: Phaser.Input.Keyboard.KeyCodes.ONE,
      lab2: Phaser.Input.Keyboard.KeyCodes.TWO,
      lab3: Phaser.Input.Keyboard.KeyCodes.THREE,
      lab4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      lab5: Phaser.Input.Keyboard.KeyCodes.FIVE,
      lab6: Phaser.Input.Keyboard.KeyCodes.SIX,
    });
  }

  commonUpdate() {
    if (!this.globalKeys) return;
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.escape)) this.scene.start('LabHub');
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.reset)) this.scene.restart();
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.help)) this.toggleHelp();
    for (let i = 1; i <= LABS.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.globalKeys[`lab${i}`])) {
        const lab = LABS[i - 1];
        if (lab.key !== this.sys.settings.key) this.scene.start(lab.key);
      }
    }
  }

  setupJuiceEvents() {
    this.events.on('player-jump', (x, y) => this.vfx.burst(x, y + 24, { color: 0x9edfff, count: 5, speed: 70, scale: 0.45 }));
    this.events.on('player-land', (x, y) => this.vfx.burst(x, y + 28, { color: 0x7b8799, count: 6, speed: 65, scale: 0.38 }));
    this.events.on('player-dash', (x, y, facing) => {
      for (let i = 0; i < 4; i += 1) {
        const ghost = this.add.image(x - facing * i * 10, y, 'player')
          .setTint(this.accent)
          .setAlpha(0.2 - i * 0.03)
          .setFlipX(facing < 0)
          .setDepth(18);
        this.tweens.add({ targets: ghost, alpha: 0, x: ghost.x - facing * 48, duration: 190 + i * 35, onComplete: () => ghost.destroy() });
      }
    });
  }

  createGlobalHelp() {
    const { width, height } = this.scale;
    const container = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(this.uiDepth + 20).setVisible(false);
    const panel = this.add.graphics();
    panel.fillStyle(0x06090f, 0.97).fillRoundedRect(-265, -175, 530, 350, 12);
    panel.lineStyle(1, this.accent ?? THEME.violet, 0.75).strokeRoundedRect(-265, -175, 530, 350, 12);
    const title = this.add.text(-228, -138, 'DEV LAB SHORTCUTS', { fontFamily: 'system-ui', fontSize: '18px', fontStyle: '700', color: '#f4f6ff' });
    const body = this.add.text(-228, -92,
      'A / D or ← / →     Move\nW / SPACE or ↑       Jump\nSHIFT                 Dash\n\n1 … 6                 Switch isolated lab\nR                     Restart current lab\nESC                   Return to Lab Select\nH                     Toggle this panel\n\nEach lab adds its own test controls in the lower-left debug card.',
      { fontFamily: 'monospace', fontSize: '13px', color: '#aab5c8', lineSpacing: 8 },
    );
    const close = this.add.text(0, 133, 'H  CLOSE', { fontFamily: 'monospace', fontSize: '11px', color: '#c7b7ff' }).setOrigin(0.5);
    container.add([panel, title, body, close]);
    this.helpPanel = container;
  }

  toggleHelp() {
    this.helpVisible = !this.helpVisible;
    this.helpPanel?.setVisible(this.helpVisible);
  }

  makePanel(x, y, width, height, { accent = this.accent, alpha = 0.92, depth = this.uiDepth } = {}) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(depth);
    g.fillStyle(0x0c121b, alpha).fillRoundedRect(x, y, width, height, 9);
    g.lineStyle(1, 0x314057, 0.85).strokeRoundedRect(x, y, width, height, 9);
    g.fillStyle(accent, 0.9).fillRoundedRect(x, y, 3, height, 2);
    return g;
  }

  makeDebugText(x, y, text, { size = 11, color = '#aab5c8', depth = this.uiDepth + 1 } = {}) {
    return this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: `${size}px`, color, lineSpacing: 5,
    }).setScrollFactor(0).setDepth(depth);
  }

  makeButton(x, y, width, label, onClick, { accent = this.accent, enabled = true } = {}) {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 3);
    const bg = this.add.graphics();
    const draw = (hover = false) => {
      bg.clear();
      bg.fillStyle(hover ? accent : 0x121b28, hover ? 0.28 : 0.96).fillRoundedRect(0, 0, width, 34, 7);
      bg.lineStyle(1, accent, enabled ? (hover ? 0.9 : 0.48) : 0.18).strokeRoundedRect(0, 0, width, 34, 7);
    };
    draw(false);
    const hit = this.add.rectangle(width / 2, 17, width, 34, 0xffffff, 0.0001).setInteractive({ useHandCursor: enabled });
    const text = this.add.text(width / 2, 17, label, { fontFamily: 'monospace', fontSize: '11px', color: enabled ? '#e6ebf5' : '#596578' }).setOrigin(0.5);
    if (enabled) {
      hit.on('pointerover', () => draw(true));
      hit.on('pointerout', () => draw(false));
      hit.on('pointerdown', () => { draw(true); onClick(); });
    }
    container.add([bg, hit, text]);
    return container;
  }

  createPlayer(x, y) {
    const player = this.physics.add.sprite(x, y, 'player').setDepth(20).setCollideWorldBounds(true);
    player.body.setSize(31, 56).setOffset(7, 5);
    player.setMaxVelocity(900, 1100);
    return player;
  }

  createGround(y, { x = 0, width = this.scale.width, thickness = 50 } = {}) {
    const ground = this.add.rectangle(x + width / 2, y + thickness / 2, width, thickness, 0x151e2b).setDepth(4);
    this.physics.add.existing(ground, true);
    const edge = this.add.rectangle(x + width / 2, y + 2, width, 4, this.accent, 0.26).setDepth(5);
    return ground;
  }

  createPlatform(x, y, width = 128) {
    const platform = this.physics.add.staticImage(x, y, 'platform').setDepth(8);
    platform.setScale(width / 128, 1).refreshBody();
    return platform;
  }

  toast(message, { color = '#dfe6f5', accent = this.accent } = {}) {
    const { width } = this.scale;
    const y = 94;
    const box = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 30);
    box.fillStyle(0x080c13, 0.94).fillRoundedRect(width - 338, y, 316, 42, 8);
    box.lineStyle(1, accent, 0.5).strokeRoundedRect(width - 338, y, 316, 42, 8);
    const text = this.add.text(width - 322, y + 13, message, { fontFamily: 'monospace', fontSize: '10px', color }).setScrollFactor(0).setDepth(this.uiDepth + 31);
    this.tweens.add({ targets: [box, text], alpha: 0, y: '-=10', duration: 260, delay: 1400, onComplete: () => { box.destroy(); text.destroy(); } });
  }

  toggleHitboxes() {
    const next = !session.flags.showHitboxes;
    session.patchFlags({ showHitboxes: next });
    if (next && !this.physics.world.debugGraphic && typeof this.physics.world.createDebugGraphic === 'function') this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = next;
    this.physics.world.debugGraphic?.setVisible(next);
    this.toast(`Hitboxes ${next ? 'ON' : 'OFF'}`);
  }
}
