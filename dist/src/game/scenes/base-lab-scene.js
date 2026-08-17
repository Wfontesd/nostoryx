import { LABS, THEME } from '../theme.js';
import { VfxDirector } from '../systems/vfx.js';
import { session } from '../systems/session.js';
import { HERO_ART, addAtlasArt, atlasHas, setAtlasArt } from '../systems/generated-art.js';

export class BaseLabScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.labKey = key;
    this.debugVisible = false;
    this.helpVisible = false;
    this.uiDepth = 500;
    this.parallaxLayers = [];
  }

  createLabChrome(title, subtitle, accent = THEME.violet) {
    this.accent = accent;
    this.vfx = new VfxDirector(this);
    this.cameras.main.setBackgroundColor(0x161b3c);
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
    const addLayer = (key, depth, factor, displayWidth = width * 1.12, displayHeight = height) => {
      if (!this.textures.exists(key)) return null;
      const layer = this.add.image(width / 2, height / 2, key)
        .setDisplaySize(displayWidth, displayHeight).setScrollFactor(0).setDepth(depth);
      this.parallaxLayers.push({ layer, factor, baseX: width / 2 });
      return layer;
    };

    addLayer('bg-sky', -120, 0.015, width * 1.16, height);
    addLayer('bg-far', -112, 0.035, width * 1.18, height);
    addLayer('bg-mid', -104, 0.065, width * 1.2, height);

    if (atlasHas(this, 'floating_castle')) {
      const castle = addAtlasArt(this, width * 0.82, height * 0.49, 'floating_castle', { height: 270, alpha: 0.28, originY: 0.5 });
      castle?.setDepth(-102).setScrollFactor(0);
      if (castle) this.parallaxLayers.push({ layer: castle, factor: 0.05, baseX: width * 0.82 });
    }

    const haze = this.add.graphics().setScrollFactor(0).setDepth(-98);
    haze.fillStyle(accent, 0.035).fillEllipse(width * 0.28, height - 155, width * 0.55, 120);
    haze.fillStyle(0xffd9ad, 0.035).fillEllipse(width * 0.78, height - 180, width * 0.5, 110);

    if (this.textures.exists('bg-front')) {
      const front = this.add.image(width / 2, height - 70, 'bg-front')
        .setDisplaySize(width * 1.12, 165).setScrollFactor(0).setDepth(2).setAlpha(0.93);
      this.parallaxLayers.push({ layer: front, factor: 0.1, baseX: width / 2 });
    }

    if (atlasHas(this, 'ruin_pillar')) addAtlasArt(this, 78, height - 80, 'ruin_pillar', { height: 240, alpha: 0.46 })?.setDepth(1);
    if (atlasHas(this, 'foliage_cluster')) addAtlasArt(this, width - 130, height - 65, 'foliage_cluster', { height: 150, alpha: 0.72 })?.setDepth(3);

    for (let i = 0; i < 18; i += 1) {
      const mote = this.add.image((i * 149 + 31) % width, 90 + ((i * 89) % Math.max(1, height - 230)), i % 5 === 0 ? 'fx-spark' : 'fx-dot')
        .setTint(i % 3 === 0 ? accent : 0xffdfac).setAlpha(i % 5 === 0 ? 0.11 : 0.075)
        .setScale(i % 5 === 0 ? 0.22 : 0.16).setScrollFactor(0).setDepth(-91);
      this.tweens.add({ targets: mote, y: mote.y - 20 - (i % 4) * 6, x: mote.x + ((i % 2) ? 9 : -9),
        alpha: { from: mote.alpha, to: 0.015 }, duration: 2600 + i * 90, yoyo: true, repeat: -1,
        delay: i * 100, ease: 'Sine.easeInOut' });
    }
  }

  createTopBar(title, subtitle, accent) {
    const { width } = this.scale;
    const tag = this.add.container(14, 13).setScrollFactor(0).setDepth(this.uiDepth);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0b18, 0.74).fillRoundedRect(0, 0, 250, 40, 7);
    bg.lineStyle(1, 0xffffff, 0.11).strokeRoundedRect(0, 0, 250, 40, 7);
    bg.fillStyle(accent, 0.95).fillRect(0, 0, 4, 40);
    const name = this.add.text(14, 6, title.toUpperCase(), { fontFamily: 'Trebuchet MS, system-ui', fontSize: '13px', fontStyle: '700', color: '#fff4df' });
    const sub = this.add.text(14, 23, subtitle, { fontFamily: 'Trebuchet MS, system-ui', fontSize: '8px', color: '#c6c2d5' }).setCrop(0, 0, 220, 12);
    tag.add([bg, name, sub]);

    this.add.text(width - 14, 17, 'F2 DEBUG   H HELP   ESC LABS', {
      fontFamily: 'Trebuchet MS, system-ui', fontSize: '9px', fontStyle: '700', color: '#efe8f2',
      stroke: '#111323', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth).setAlpha(0.78);
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

  commonUpdate(time) {
    if (this.globalKeys) {
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
    this.updatePlayerPresentation(time ?? 0);
    this.updateParallax();
  }

  updateParallax() {
    if (!this.parallaxLayers.length) return;
    const width = this.scale.width;
    const focusX = this.player?.x ?? width / 2;
    const offset = focusX - width / 2;
    for (const { layer, factor, baseX } of this.parallaxLayers) if (layer?.active) layer.x = baseX - offset * factor;
  }

  heroArt() { return this.player?.getData('generatedArt') ?? null; }

  setHeroState(state, time = 0, duration = 0) {
    const p = this.player;
    const art = this.heroArt();
    const cfg = HERO_ART[state] ?? HERO_ART.idle;
    if (p && duration > 0) p.setData('visualLockUntil', time + duration);
    if (!art) {
      const fallback = { idle: 'player', runA: 'player-run-a', runB: 'player-run-b', jump: 'player-jump', light: 'player-light', heavy: 'player-heavy', skill: 'player-skill', dash: 'player-run-b' }[state] ?? 'player';
      if (p && this.textures.exists(fallback)) p.setTexture(fallback).setVisible(true);
      return;
    }
    setAtlasArt(art, cfg.frame, { height: cfg.height, flipX: (this.controller?.facing ?? 1) < 0 });
    art.setData('heroState', state);
    this.syncHeroArt();
  }

  playPlayerAction(action, time, duration = 180) {
    this.setHeroState(action, time, duration);
    this.player?.setData('visualAction', action);
  }

  syncHeroArt() {
    const p = this.player;
    const art = this.heroArt();
    if (!p || !art) return;
    const state = art.getData('heroState') ?? 'idle';
    const cfg = HERO_ART[state] ?? HERO_ART.idle;
    const facing = this.controller?.facing ?? 1;
    art.setPosition(p.x + cfg.ox * facing, p.y + 48 + cfg.oy).setFlipX(facing < 0);
  }

  updatePlayerPresentation(time) {
    const p = this.player;
    if (!p?.body) return;
    const art = this.heroArt();
    const lockUntil = Number(p.getData('visualLockUntil') ?? 0);
    if (lockUntil > time) { this.syncHeroArt(); return; }

    const grounded = Boolean(p.body.blocked.down || p.body.touching.down);
    const vx = p.body.velocity.x;
    const vy = p.body.velocity.y;
    let state = 'idle';
    if (!grounded && Math.abs(vy) > 20) state = 'jump';
    else if (Math.abs(vx) > 35) state = Math.floor(time / 105) % 2 ? 'runA' : 'runB';
    if (art?.getData('heroState') !== state) this.setHeroState(state);
    else this.syncHeroArt();
  }

  toggleDeveloperOverlay() {
    this.debugVisible = !this.debugVisible;
    this.devOverlay?.setVisible(this.debugVisible);
    this.toast(this.debugVisible ? 'Developer overlay enabled' : 'Developer overlay hidden', { accent: this.accent });
  }

  setupJuiceEvents() {
    this.events.on('player-jump', (x, y) => this.vfx.burst(x, y + 34, { color: 0xe5f4ff, count: 7, speed: 72, scale: 0.34, gravity: 18 }));
    this.events.on('player-land', (x, y) => {
      this.vfx.groundDust(x, y + 42, { color: 0xd7c6a7 });
      this.vfx.burst(x, y + 38, { color: 0xe1d2b7, count: 7, speed: 70, scale: 0.3, gravity: 25 });
      const art = this.heroArt();
      if (art && atlasHas(this, HERO_ART.land.frame)) {
        this.setHeroState('land', this.time.now, 95);
      }
    });
    this.events.on('player-dash', (x, y) => {
      this.setHeroState('dash', this.time.now, 150);
      const art = this.heroArt() ?? this.player;
      if (art) {
        this.vfx.afterImage(art, { color: this.accent, alpha: 0.3, drift: 34, duration: 210 });
        this.time.delayedCall(42, () => art.active && this.vfx.afterImage(art, { color: 0x86ecff, alpha: 0.18, drift: 26, duration: 190 }));
      }
      this.vfx.dashTrail(x, y + 12, (this.controller?.facing ?? 1));
    });
  }

  createGlobalHelp() {
    const { width, height } = this.scale;
    const container = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(this.uiDepth + 80).setVisible(false);
    const shadow = this.add.graphics().fillStyle(0x060713, 0.76).fillRect(-width / 2, -height / 2, width, height);
    const panel = this.add.graphics();
    panel.fillStyle(0x17172b, 0.985).fillRoundedRect(-276, -174, 552, 348, 10);
    panel.lineStyle(2, 0x8275a0, 0.9).strokeRoundedRect(-276, -174, 552, 348, 10);
    panel.lineStyle(1, this.accent ?? THEME.violet, 0.7).strokeRoundedRect(-266, -164, 532, 328, 7);
    const title = this.add.text(0, -137, 'DEVELOPER LAB CONTROLS', { fontFamily: 'Trebuchet MS', fontSize: '19px', fontStyle: '700', color: '#fff2dc' }).setOrigin(0.5);
    const body = this.add.text(-215, -91,
      'MOVE                  A / D  or  ← / →\nJUMP                  W / SPACE / ↑\nDASH                  SHIFT\n\nSWITCH LAB            1 … 6\nRESET                  R\nDEBUG OVERLAY          F2\nRETURN TO LAB SELECT   ESC\nHELP                   H\n\nPlayer-facing presentation is the default.\nTelemetry stays hidden until F2.',
      { fontFamily: 'monospace', fontSize: '12px', color: '#d8d2e0', lineSpacing: 7 });
    container.add([shadow, panel, title, body]);
    this.helpPanel = container;
  }

  toggleHelp() { this.helpVisible = !this.helpVisible; this.helpPanel?.setVisible(this.helpVisible); }

  makePanel(x, y, width, height, { accent = this.accent, alpha = 0.92, depth = this.uiDepth } = {}) {
    const g = this.add.graphics().setScrollFactor(0).setDepth(depth);
    g.fillStyle(0x121326, alpha).fillRoundedRect(x, y, width, height, 8);
    g.lineStyle(1, 0x716a88, 0.8).strokeRoundedRect(x, y, width, height, 8);
    g.lineStyle(1, accent, 0.45).strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 5);
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
      bg.fillStyle(hover ? 0x292541 : 0x19182d, 0.98).fillRoundedRect(0, 0, width, 34, 6);
      bg.lineStyle(2, hover ? accent : 0x655e7d, enabled ? 0.9 : 0.25).strokeRoundedRect(0, 0, width, 34, 6);
    };
    draw(false);
    const hit = this.add.rectangle(width / 2, 17, width, 34, 0xffffff, 0.0001).setInteractive({ useHandCursor: enabled });
    const text = this.add.text(width / 2, 17, label, { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: enabled ? '#fff2dd' : '#6c6879' }).setOrigin(0.5);
    if (enabled) { hit.on('pointerover', () => draw(true)); hit.on('pointerout', () => draw(false)); hit.on('pointerdown', () => onClick()); }
    container.add([bg, hit, text]);
    return container;
  }

  createPlayer(x, y) {
    const generated = atlasHas(this, HERO_ART.idle.frame);
    const player = this.physics.add.sprite(x, y, 'player').setDepth(20).setCollideWorldBounds(true).setScale(0.9).setVisible(!generated);
    player.body.setSize(42, 74).setOffset(27, 27);
    player.setMaxVelocity(900, 1100);
    player.setData('visualLockUntil', 0);
    if (generated) {
      const art = addAtlasArt(this, x, y + 48, HERO_ART.idle.frame, { height: HERO_ART.idle.height });
      art?.setDepth(20).setData('heroState', 'idle');
      player.setData('generatedArt', art);
    }
    return player;
  }

  createGround(y, { x = 0, width = this.scale.width, thickness = 50 } = {}) {
    const ground = this.add.rectangle(x + width / 2, y + thickness / 2, width, thickness, 0x172033).setDepth(4);
    this.physics.add.existing(ground, true);
    this.add.rectangle(x + width / 2, y + 5, width, 10, 0x568866).setDepth(5);
    this.add.rectangle(x + width / 2, y + 1, width, 3, 0xb2df96).setDepth(6);
    return ground;
  }

  createPlatform(x, y, width = 128) {
    const platform = this.physics.add.staticImage(x, y, 'platform').setDepth(8);
    platform.setScale(width / 128, 1).refreshBody();
    return platform;
  }

  toast(message, { color = '#fff1df', accent = this.accent } = {}) {
    const { width } = this.scale;
    const y = 62;
    const box = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 50);
    box.fillStyle(0x111225, 0.93).fillRoundedRect(width - 334, y, 314, 38, 7);
    box.lineStyle(1, accent, 0.6).strokeRoundedRect(width - 334, y, 314, 38, 7);
    const text = this.add.text(width - 316, y + 12, message, { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color }).setScrollFactor(0).setDepth(this.uiDepth + 51);
    this.tweens.add({ targets: [box, text], alpha: 0, y: '-=8', duration: 260, delay: 1250, onComplete: () => { box.destroy(); text.destroy(); } });
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
