import { LABS, THEME } from '../theme.js';
import { VfxDirector } from '../systems/vfx.js';
import { session } from '../systems/session.js';

export class BaseLabScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.labKey = key;
    this.debugVisible = false;
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
    const bands = [0x20294b, 0x2d3560, 0x414271, 0x5a4b7a, 0x76597d];
    const playTop = 54;
    const bandH = (height - playTop) / bands.length;
    bands.forEach((color, i) => g.fillStyle(color, 1).fillRect(0, playTop + i * bandH, width, bandH + 1));
    g.fillStyle(0xffd49a, 0.72).fillCircle(width * 0.78, 145, 42);
    g.fillStyle(0xffecbf, 0.18).fillCircle(width * 0.78, 145, 66);

    const far = this.add.graphics().setScrollFactor(0).setDepth(-95);
    far.fillStyle(0x343452, 0.72).fillTriangle(-100, height - 128, width * 0.28, 180, width * 0.56, height - 128)
      .fillTriangle(width * 0.25, height - 128, width * 0.58, 225, width * 0.91, height - 128)
      .fillTriangle(width * 0.58, height - 128, width * 0.86, 200, width + 120, height - 128);
    far.fillStyle(0x20263b, 0.82);
    for (let x = -20; x < width + 60; x += 72) {
      const h = 72 + ((x * 17) % 54);
      far.fillTriangle(x, height - 102, x + 34, height - 102 - h, x + 68, height - 102);
    }

    const ruins = this.add.graphics().setScrollFactor(0).setDepth(-91);
    ruins.fillStyle(0x27243b, 0.72).fillRect(66, height - 240, 28, 138).fillRect(100, height - 196, 22, 94);
    ruins.fillStyle(0x27243b, 0.72).fillRect(width - 132, height - 218, 26, 116).fillRect(width - 100, height - 250, 30, 148);
    ruins.lineStyle(5, 0x3d3552, 0.65).strokeCircle(94, height - 198, 52).strokeCircle(width - 101, height - 222, 48);

    const mist = this.add.graphics().setScrollFactor(0).setDepth(-88);
    mist.fillStyle(accent, 0.045).fillEllipse(width * 0.32, height - 125, width * 0.7, 120)
      .fillEllipse(width * 0.78, height - 105, width * 0.55, 92);

    for (let i = 0; i < 24; i += 1) {
      const mote = this.add.image((i * 137 + 57) % width, 100 + ((i * 83) % Math.max(1, height - 220)), 'fx-dot')
        .setTint(i % 3 === 0 ? accent : 0xffe9b0).setAlpha(i % 3 === 0 ? 0.18 : 0.10)
        .setScale(i % 4 === 0 ? 0.45 : 0.25).setScrollFactor(0).setDepth(-84);
      this.tweens.add({ targets: mote, y: mote.y - 18 - (i % 4) * 5, alpha: { from: mote.alpha, to: 0.02 }, duration: 2200 + i * 75,
        yoyo: true, repeat: -1, delay: i * 90, ease: 'Sine.easeInOut' });
    }
  }

  createTopBar(title, subtitle, accent) {
    const { width } = this.scale;
    const bar = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth);
    bar.fillStyle(0x111326, 0.78).fillRect(0, 0, width, 54);
    bar.fillStyle(0x080914, 0.26).fillRect(0, 45, width, 9);
    bar.lineStyle(1, 0xded1ff, 0.16).lineBetween(0, 53, width, 53);
    bar.fillStyle(accent, 0.95).fillTriangle(16, 54, 104, 54, 16, 49);

    this.add.text(20, 11, title.toUpperCase(), { fontFamily: 'Trebuchet MS, system-ui', fontSize: '16px', fontStyle: '700', color: '#fff7e8' })
      .setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(20, 32, subtitle, { fontFamily: 'Trebuchet MS, system-ui', fontSize: '10px', color: '#d0c8dc' })
      .setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(width - 18, 13, 'DEV LAB  ·  F2 DEBUG  ·  H HELP  ·  ESC LABS', {
      fontFamily: 'Trebuchet MS, system-ui', fontSize: '10px', color: '#e2d8f0', align: 'right',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(width - 18, 31, '1  MOVEMENT   2  COMBAT   3  MOBS   4  VFX   5  CRAFT   6  UI', {
      fontFamily: 'monospace', fontSize: '8px', color: Phaser.Display.Color.IntegerToColor(accent).rgba,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 1);
  }

  createGlobalKeys() {
    this.globalKeys = this.input.keyboard.addKeys({
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      help: Phaser.Input.Keyboard.KeyCodes.H,
      debug: Phaser.Input.Keyboard.KeyCodes.F2,
      lab1: Phaser.Input.Keyboard.KeyCodes.ONE, lab2: Phaser.Input.Keyboard.KeyCodes.TWO,
      lab3: Phaser.Input.Keyboard.KeyCodes.THREE, lab4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      lab5: Phaser.Input.Keyboard.KeyCodes.FIVE, lab6: Phaser.Input.Keyboard.KeyCodes.SIX,
    });
  }

  commonUpdate() {
    if (!this.globalKeys) return;
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.escape)) this.scene.start('LabHub');
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.reset)) this.scene.restart();
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.help)) this.toggleHelp();
    if (Phaser.Input.Keyboard.JustDown(this.globalKeys.debug)) this.toggleDeveloperOverlay();
    for (let i = 1; i <= LABS.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.globalKeys[`lab${i}`])) {
        const lab = LABS[i - 1];
        if (lab.key !== this.sys.settings.key) this.scene.start(lab.key);
      }
    }
  }

  toggleDeveloperOverlay() {
    this.debugVisible = !this.debugVisible;
    this.devOverlay?.setVisible(this.debugVisible);
    this.toast(this.debugVisible ? 'Developer overlay enabled' : 'Developer overlay hidden', { accent: this.accent });
  }

  setupJuiceEvents() {
    this.events.on('player-jump', (x, y) => this.vfx.burst(x, y + 27, { color: 0xd9efff, count: 6, speed: 70, scale: 0.36, gravity: 12 }));
    this.events.on('player-land', (x, y) => this.vfx.burst(x, y + 30, { color: 0xdfd3c0, count: 8, speed: 80, scale: 0.36, gravity: 24 }));
    this.events.on('player-dash', (x, y) => {
      if (this.player) this.vfx.afterImage(this.player, { color: this.accent, alpha: 0.34, drift: 34, duration: 220 });
      this.vfx.burst(x, y + 24, { color: this.accent, count: 7, speed: 95, scale: 0.4 });
    });
  }

  createGlobalHelp() {
    const { width, height } = this.scale;
    const container = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(this.uiDepth + 80).setVisible(false);
    const shadow = this.add.graphics().fillStyle(0x070711, 0.72).fillRect(-width / 2, -height / 2, width, height);
    const panel = this.add.graphics();
    panel.fillStyle(0x18172a, 0.98).fillRect(-280, -180, 560, 360);
    panel.lineStyle(3, 0x776b9d, 0.8).strokeRect(-280, -180, 560, 360);
    panel.lineStyle(1, this.accent ?? THEME.violet, 0.9).strokeRect(-268, -168, 536, 336);
    const title = this.add.text(0, -140, 'DEVELOPER LAB CONTROLS', { fontFamily: 'Trebuchet MS', fontSize: '20px', fontStyle: '700', color: '#fff4db' }).setOrigin(0.5);
    const body = this.add.text(-220, -94,
      'MOVE                  A / D  or  ← / →\nJUMP                  W / SPACE / ↑\nDASH                  SHIFT\n\nSWITCH LAB            1 … 6\nRESET                  R\nDEBUG OVERLAY          F2\nRETURN TO LAB SELECT   ESC\nHELP                   H\n\nThe default view intentionally mirrors a player-facing game screen.\nDeveloper telemetry stays hidden until F2.',
      { fontFamily: 'monospace', fontSize: '12px', color: '#d9d1df', lineSpacing: 7 });
    container.add([shadow, panel, title, body]);
    this.helpPanel = container;
  }

  toggleHelp() { this.helpVisible = !this.helpVisible; this.helpPanel?.setVisible(this.helpVisible); }

  makePanel(x, y, width, height, { accent = this.accent, alpha = 0.92, depth = this.uiDepth } = {}) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(depth);
    g.fillStyle(0x171729, alpha).fillRect(x, y, width, height);
    g.fillStyle(0x080914, 0.25).fillRect(x + 6, y + 6, width, height);
    g.lineStyle(2, 0x6f678d, 0.72).strokeRect(x, y, width, height);
    g.lineStyle(1, accent, 0.55).strokeRect(x + 5, y + 5, width - 10, height - 10);
    g.fillStyle(accent, 0.95).fillTriangle(x, y, x + 36, y, x, y + 36);
    return g;
  }

  makeDebugText(x, y, text, { size = 11, color = '#ded7e5', depth = this.uiDepth + 1 } = {}) {
    return this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: `${size}px`, color, lineSpacing: 5 }).setScrollFactor(0).setDepth(depth);
  }

  makeButton(x, y, width, label, onClick, { accent = this.accent, enabled = true } = {}) {
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 3);
    const bg = this.add.graphics();
    const draw = (hover = false) => {
      bg.clear();
      bg.fillStyle(hover ? 0x292541 : 0x19182d, 0.98).fillRect(0, 0, width, 34);
      bg.lineStyle(2, hover ? accent : 0x655e7d, enabled ? 0.9 : 0.25).strokeRect(0, 0, width, 34);
      bg.fillStyle(accent, hover ? 0.9 : 0.48).fillTriangle(0, 0, 16, 0, 0, 16);
    };
    draw(false);
    const hit = this.add.rectangle(width / 2, 17, width, 34, 0xffffff, 0.0001).setInteractive({ useHandCursor: enabled });
    const text = this.add.text(width / 2, 17, label, { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: enabled ? '#fff2dd' : '#6c6879' }).setOrigin(0.5);
    if (enabled) { hit.on('pointerover', () => draw(true)); hit.on('pointerout', () => draw(false)); hit.on('pointerdown', () => { draw(true); onClick(); }); }
    container.add([bg, hit, text]);
    return container;
  }

  createPlayer(x, y) {
    const player = this.physics.add.sprite(x, y, 'player').setDepth(20).setCollideWorldBounds(true);
    player.body.setSize(35, 64).setOffset(14, 9);
    player.setMaxVelocity(900, 1100);
    return player;
  }

  createGround(y, { x = 0, width = this.scale.width, thickness = 50 } = {}) {
    const ground = this.add.rectangle(x + width / 2, y + thickness / 2, width, thickness, 0x1d2639).setDepth(4);
    this.physics.add.existing(ground, true);
    this.add.rectangle(x + width / 2, y + 5, width, 10, 0x5b8a67).setDepth(5);
    this.add.rectangle(x + width / 2, y + 1, width, 3, 0xa6d28a).setDepth(6);
    const stones = this.add.graphics().setDepth(5);
    for (let sx = x + 18; sx < x + width; sx += 46) stones.fillStyle(0x34415a, 0.7).fillRect(sx, y + 18 + ((sx / 46) % 2) * 9, 26, 3);
    return ground;
  }

  createPlatform(x, y, width = 128) {
    const platform = this.physics.add.staticImage(x, y, 'platform').setDepth(8);
    platform.setScale(width / 128, 1).refreshBody();
    return platform;
  }

  toast(message, { color = '#fff1df', accent = this.accent } = {}) {
    const { width } = this.scale;
    const y = 70;
    const box = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 50);
    box.fillStyle(0x161526, 0.94).fillRect(width - 338, y, 314, 39);
    box.lineStyle(1, 0x766b91, 0.8).strokeRect(width - 338, y, 314, 39);
    box.fillStyle(accent, 0.9).fillTriangle(width - 338, y, width - 314, y, width - 338, y + 24);
    const text = this.add.text(width - 318, y + 12, message, { fontFamily: 'Trebuchet MS', fontSize: '10px', color }).setScrollFactor(0).setDepth(this.uiDepth + 51);
    this.tweens.add({ targets: [box, text], alpha: 0, y: '-=8', duration: 220, delay: 1300, onComplete: () => { box.destroy(); text.destroy(); } });
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
