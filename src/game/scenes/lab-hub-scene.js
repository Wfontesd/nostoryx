import { LABS, THEME } from '../theme.js';
import { GENERATED_ATLAS, addAtlasArt, atlasHas } from '../systems/generated-art.js';

const LAB_ICONS = ['skill_dash', 'skill_quick', 'skill_impact', 'skill_sigils', 'skill_breaker', 'skill_heal'];
const NODE_POSITIONS = [
  [205, 255], [415, 165], [635, 132], [865, 165], [1075, 255], [640, 555],
];

export class LabHubScene extends Phaser.Scene {
  constructor() { super('LabHub'); }

  create() {
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x171c40);
    this.createWorldBackdrop();

    this.add.text(42, 28, 'NOSTORYX', {
      fontFamily: 'Trebuchet MS, system-ui', fontSize: '19px', fontStyle: '700', color: '#fff2d8', stroke: '#17162b', strokeThickness: 4,
    }).setDepth(30);
    this.add.text(42, 52, 'DEVELOPER SANCTUM', { fontFamily: 'monospace', fontSize: '9px', color: '#d8c6ff' }).setDepth(30);

    this.add.text(width / 2, 80, 'CHOOSE A TEST CHAMBER', {
      fontFamily: 'Trebuchet MS', fontSize: '30px', fontStyle: '700', color: '#fff4dd', stroke: '#241b36', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(30);
    this.add.text(width / 2, 116, 'Each rune opens an isolated gameplay system. The world stays disposable; the systems do not.', {
      fontFamily: 'Trebuchet MS', fontSize: '11px', color: '#d7cfdf', stroke: '#17162b', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.nodes = LABS.map((lab, index) => this.createRuneNode(lab, index, ...NODE_POSITIONS[index]));
    this.createCenterPortal();
    this.createSelectionPlate();

    this.add.text(width / 2, height - 26, '1–6  OPEN DIRECTLY     ·     HOVER A RUNE FOR DETAILS', {
      fontFamily: 'monospace', fontSize: '9px', color: '#d0c7dd', stroke: '#111421', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30).setAlpha(0.78);

    this.keys = this.input.keyboard.addKeys({
      lab1: Phaser.Input.Keyboard.KeyCodes.ONE, lab2: Phaser.Input.Keyboard.KeyCodes.TWO,
      lab3: Phaser.Input.Keyboard.KeyCodes.THREE, lab4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      lab5: Phaser.Input.Keyboard.KeyCodes.FIVE, lab6: Phaser.Input.Keyboard.KeyCodes.SIX,
    });
    this.selectLab(1, false);
  }

  createWorldBackdrop() {
    const { width, height } = this.scale;
    if (this.textures.exists('bg-sky')) this.add.image(width / 2, height / 2, 'bg-sky').setDisplaySize(width, height).setDepth(-30);
    if (this.textures.exists('bg-far')) this.add.image(width / 2, height / 2, 'bg-far').setDisplaySize(width * 1.05, height).setDepth(-29).setAlpha(0.65);

    addAtlasArt(this, width * 0.83, 435, 'floating_castle', { height: 300, alpha: 0.48, originY: 0.5 })?.setDepth(-24);
    addAtlasArt(this, 120, 650, 'ruin_pillar', { height: 280, alpha: 0.88 })?.setDepth(-5);
    addAtlasArt(this, width - 90, 655, 'foliage_cluster', { height: 190, alpha: 0.96 })?.setDepth(-4);
    addAtlasArt(this, 255, 650, 'arcane_lantern', { height: 175, alpha: 0.95 })?.setDepth(-3);
    addAtlasArt(this, width - 275, 650, 'arcane_lantern', { height: 175, alpha: 0.95, flipX: true })?.setDepth(-3);

    const ground = this.add.graphics().setDepth(-10);
    ground.fillStyle(0x111629, 0.92).fillRect(0, 608, width, 112);
    ground.fillStyle(0x38506a, 0.75).fillRect(0, 608, width, 4);
    ground.fillStyle(0x79a477, 0.45).fillRect(0, 604, width, 5);

    for (let i = 0; i < 28; i += 1) {
      const mote = this.add.image(Phaser.Math.Between(40, width - 40), Phaser.Math.Between(120, 600), 'fx-dot')
        .setTint(i % 2 ? THEME.violet : THEME.cyan).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.12, 0.32)).setAlpha(Phaser.Math.FloatBetween(0.05, 0.18)).setDepth(-7);
      this.tweens.add({ targets: mote, y: mote.y - Phaser.Math.Between(30, 90), alpha: 0.01, duration: Phaser.Math.Between(2500, 5200), yoyo: true, repeat: -1, delay: i * 71 });
    }
  }

  createCenterPortal() {
    const { width } = this.scale;
    const portalX = width / 2;
    const portalY = 385;
    this.portalArch = addAtlasArt(this, portalX, 610, 'portal_arch', { height: 410, alpha: 0.9 })?.setDepth(8);
    this.portalSigil = addAtlasArt(this, portalX, portalY, 'portal_sigil', { height: 190, alpha: 0.66, originY: 0.5 })?.setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    if (this.portalSigil) {
      this.tweens.add({ targets: this.portalSigil, angle: 360, duration: 13000, repeat: -1, ease: 'Linear' });
      this.tweens.add({ targets: this.portalSigil, alpha: 0.92, scaleX: this.portalSigil.scaleX * 1.08, scaleY: this.portalSigil.scaleY * 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  createRuneNode(lab, index, x, y) {
    const c = this.add.container(x, y).setDepth(20);
    const glow = this.add.graphics();
    glow.fillStyle(lab.accent, 0.1).fillCircle(0, 0, 50);
    glow.lineStyle(2, lab.accent, 0.55).strokeCircle(0, 0, 43);
    glow.lineStyle(1, 0xffe5af, 0.42).strokeCircle(0, 0, 37);

    const iconFrame = LAB_ICONS[index];
    const icon = atlasHas(this, iconFrame)
      ? this.add.image(0, 0, GENERATED_ATLAS, iconFrame).setDisplaySize(64, 64)
      : this.add.text(0, 0, lab.glyph, { fontFamily: 'Trebuchet MS', fontSize: '30px', color: '#fff' }).setOrigin(0.5);
    const key = this.add.text(-37, -42, lab.number, { fontFamily: 'Trebuchet MS', fontSize: '12px', fontStyle: '700', color: '#fff4d8', stroke: '#161528', strokeThickness: 4 });
    const label = this.add.text(0, 55, lab.title.replace(' Lab', '').toUpperCase(), {
      fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#f5edf8', stroke: '#101322', strokeThickness: 4,
    }).setOrigin(0.5);
    const hit = this.add.circle(0, 0, 48, 0xffffff, 0.0001).setInteractive({ useHandCursor: true });
    c.add([glow, icon, key, label, hit]);

    const setHover = (hover) => {
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scale: hover ? 1.12 : 1, duration: 120, ease: 'Back.easeOut' });
      glow.clear();
      glow.fillStyle(lab.accent, hover ? 0.23 : 0.1).fillCircle(0, 0, hover ? 56 : 50);
      glow.lineStyle(hover ? 3 : 2, lab.accent, hover ? 0.95 : 0.55).strokeCircle(0, 0, 43);
      glow.lineStyle(1, 0xffe5af, hover ? 0.82 : 0.42).strokeCircle(0, 0, 37);
    };
    hit.on('pointerover', () => { setHover(true); this.selectLab(index, true); });
    hit.on('pointerout', () => setHover(false));
    hit.on('pointerdown', () => this.enterLab(lab));

    this.tweens.add({ targets: c, y: y + (index % 2 ? -5 : 5), duration: 1600 + index * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return { container: c, lab, glow };
  }

  createSelectionPlate() {
    const x = 42;
    const y = 480;
    const g = this.add.graphics().setDepth(25);
    g.fillStyle(0x0c1020, 0.82).fillRoundedRect(x, y, 350, 108, 10);
    g.lineStyle(1, 0x7c7095, 0.8).strokeRoundedRect(x, y, 350, 108, 10);
    this.selectionAccent = this.add.graphics().setDepth(26);
    this.selectionTitle = this.add.text(x + 20, y + 17, '', { fontFamily: 'Trebuchet MS', fontSize: '17px', fontStyle: '700', color: '#fff1d9' }).setDepth(27);
    this.selectionBody = this.add.text(x + 20, y + 46, '', { fontFamily: 'Trebuchet MS', fontSize: '10px', color: '#cbc5d3', wordWrap: { width: 305 }, lineSpacing: 4 }).setDepth(27);
    this.selectionEnter = this.add.text(x + 330, y + 83, 'CLICK / NUMBER →', { fontFamily: 'monospace', fontSize: '9px', color: '#d8c7ff' }).setOrigin(1, 0.5).setDepth(27);
  }

  selectLab(index, animate = true) {
    const lab = LABS[index];
    if (!lab) return;
    this.selectedIndex = index;
    this.selectionAccent?.clear().fillStyle(lab.accent, 0.95).fillRect(42, 480, 4, 108);
    this.selectionTitle?.setText(`${lab.number} · ${lab.title}`);
    this.selectionBody?.setText(lab.subtitle.replaceAll(' · ', '  •  '));
    this.selectionEnter?.setColor(Phaser.Display.Color.IntegerToColor(lab.accent).rgba);
    if (animate && this.portalSigil) {
      this.portalSigil.setTint(lab.accent);
      this.tweens.add({ targets: this.portalSigil, scaleX: this.portalSigil.scaleX * 1.12, scaleY: this.portalSigil.scaleY * 1.12, duration: 110, yoyo: true });
    }
  }

  enterLab(lab) {
    const url = new URL(window.location.href);
    url.searchParams.set('lab', lab.query);
    history.replaceState(null, '', url);
    this.cameras.main.flash(140, 224, 210, 255, false);
    this.time.delayedCall(90, () => this.scene.start(lab.key));
  }

  update() {
    if (!this.keys) return;
    for (let i = 1; i <= LABS.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[`lab${i}`])) this.enterLab(LABS[i - 1]);
    }
  }
}
