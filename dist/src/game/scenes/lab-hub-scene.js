import { LABS, THEME } from '../theme.js';
import { GENERATED_ATLAS, addAtlasArt, atlasHas, setAtlasArt } from '../systems/generated-art.js';

const LAB_ICONS = ['skill_dash', 'skill_quick', 'skill_impact', 'skill_sigils', 'skill_breaker', 'skill_heal'];
const ALTAR_POSITIONS = [
  [150, 416], [314, 500], [468, 368], [812, 368], [966, 500], [1130, 416],
];

export class LabHubScene extends Phaser.Scene {
  constructor() { super('LabHub'); }

  create() {
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0x171c40);
    this.createWorldBackdrop();
    this.createBranding();
    this.createCenterPortal();
    this.createSelectionRibbon();

    this.nodes = LABS.map((lab, index) => this.createAltar(lab, index, ...ALTAR_POSITIONS[index]));
    this.keys = this.input.keyboard.addKeys({
      lab1: Phaser.Input.Keyboard.KeyCodes.ONE, lab2: Phaser.Input.Keyboard.KeyCodes.TWO,
      lab3: Phaser.Input.Keyboard.KeyCodes.THREE, lab4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      lab5: Phaser.Input.Keyboard.KeyCodes.FIVE, lab6: Phaser.Input.Keyboard.KeyCodes.SIX,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT, right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      confirm: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });

    this.selectLab(1, false);
  }

  createWorldBackdrop() {
    const { width, height } = this.scale;
    if (this.textures.exists('bg-sky')) this.add.image(width / 2, height / 2, 'bg-sky').setDisplaySize(width, height).setDepth(-40);
    if (this.textures.exists('bg-far')) this.add.image(width / 2, height / 2, 'bg-far').setDisplaySize(width * 1.08, height).setDepth(-38).setAlpha(0.78);
    if (this.textures.exists('bg-mid')) this.add.image(width / 2, height / 2, 'bg-mid').setDisplaySize(width * 1.08, height).setDepth(-34).setAlpha(0.72);

    const atmosphere = this.add.graphics().setDepth(-30);
    atmosphere.fillStyle(0x0a0d1e, 0.16).fillRect(0, 0, width, 94);
    atmosphere.fillStyle(0x745cff, 0.035).fillEllipse(width / 2, 520, 790, 180);
    atmosphere.fillStyle(0xffce8e, 0.025).fillEllipse(width * 0.76, 430, 470, 130);

    addAtlasArt(this, 75, 650, 'ruin_pillar', { height: 270, alpha: 0.7 })?.setDepth(-8);
    addAtlasArt(this, width - 70, 650, 'ruin_pillar', { height: 250, alpha: 0.58, flipX: true })?.setDepth(-8);
    addAtlasArt(this, 220, 652, 'foliage_cluster', { width: 250, alpha: 0.9 })?.setDepth(-6);
    addAtlasArt(this, width - 220, 652, 'foliage_cluster', { width: 250, alpha: 0.9, flipX: true })?.setDepth(-6);
    addAtlasArt(this, 330, 648, 'arcane_lantern', { height: 148, alpha: 0.8 })?.setDepth(-5);
    addAtlasArt(this, width - 330, 648, 'arcane_lantern', { height: 148, alpha: 0.8, flipX: true })?.setDepth(-5);

    const groundBody = this.add.rectangle(width / 2, 677, width, 86, 0x11182a, 0.96).setDepth(-4);
    for (let index = 0; index < 4; index += 1) {
      addAtlasArt(this, index * 380 + 160, 641, 'platform_arcane', {
        width: 500, originY: 0.18, alpha: index % 2 ? 0.9 : 0.98, flipX: index % 2 === 1,
      })?.setDepth(-3).setTint(index % 2 ? 0xc5d3d6 : 0xffffff);
    }
    this.add.rectangle(width / 2, 637, width, 3, 0xb1df97, 0.76).setDepth(-2);

    for (let i = 0; i < 26; i += 1) {
      const mote = this.add.image(Phaser.Math.Between(35, width - 35), Phaser.Math.Between(100, 610), i % 5 ? 'fx-dot' : 'fx-spark')
        .setTint(i % 2 ? THEME.violet : THEME.cyan).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.1, 0.24)).setAlpha(Phaser.Math.FloatBetween(0.04, 0.14)).setDepth(-1);
      this.tweens.add({ targets: mote, y: mote.y - Phaser.Math.Between(28, 82), x: mote.x + Phaser.Math.Between(-14, 14), alpha: 0.01,
        duration: Phaser.Math.Between(2600, 5200), yoyo: true, repeat: -1, delay: i * 61, ease: 'Sine.easeInOut' });
    }

    void groundBody;
  }

  createBranding() {
    const { width } = this.scale;
    this.add.text(34, 24, 'NOSTORYX', {
      fontFamily: 'Trebuchet MS, system-ui', fontSize: '19px', fontStyle: '700', color: '#fff2d8', stroke: '#17162b', strokeThickness: 4,
    }).setDepth(50);
    this.add.text(34, 48, 'DEVELOPER SANCTUM', { fontFamily: 'monospace', fontSize: '8px', color: '#d8c6ff' }).setDepth(50);

    this.add.text(width / 2, 39, 'THE CHAMBERS OF MAKING', {
      fontFamily: 'Trebuchet MS', fontSize: '27px', fontStyle: '700', color: '#fff4dd', stroke: '#241b36', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(50);
    this.add.text(width / 2, 73, 'Choose one isolated system and enter through the central gate.', {
      fontFamily: 'Trebuchet MS', fontSize: '10px', color: '#d7cfdf', stroke: '#17162b', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.add.text(width - 32, 31, '1–6 DIRECT   ← → SELECT   ENTER OPEN', {
      fontFamily: 'monospace', fontSize: '8px', color: '#c9c1d6', stroke: '#111421', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(50).setAlpha(0.8);
  }

  createCenterPortal() {
    const { width } = this.scale;
    const x = width / 2;
    this.portalArch = addAtlasArt(this, x, 650, 'portal_arch', { height: 430, alpha: 0.98 })?.setDepth(12);
    this.portalSigil = addAtlasArt(this, x, 410, 'portal_sigil', { height: 198, alpha: 0.74, originY: 0.5 })
      ?.setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    this.portalIcon = atlasHas(this, LAB_ICONS[1])
      ? this.add.image(x, 410, GENERATED_ATLAS, LAB_ICONS[1]).setDisplaySize(102, 102).setDepth(15)
      : null;
    this.hero = addAtlasArt(this, x, 646, 'hero_idle', { height: 130, alpha: 0.96 })?.setDepth(18);

    if (this.portalSigil) {
      this.tweens.add({ targets: this.portalSigil, angle: 360, duration: 13000, repeat: -1, ease: 'Linear' });
      this.tweens.add({ targets: this.portalSigil, alpha: { from: 0.56, to: 0.88 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (this.hero) this.tweens.add({ targets: this.hero, y: 643, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  createSelectionRibbon() {
    const { width } = this.scale;
    const container = this.add.container(width / 2, 112).setDepth(54);
    const bg = this.add.graphics();
    bg.fillStyle(0x0b0d1b, 0.84).fillRoundedRect(-260, 0, 520, 66, 12);
    bg.lineStyle(1, 0x776a91, 0.78).strokeRoundedRect(-260, 0, 520, 66, 12);
    bg.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(-252, 8, 504, 50, 8);
    this.selectionAccent = this.add.graphics();
    this.selectionTitle = this.add.text(-222, 12, '', { fontFamily: 'Trebuchet MS', fontSize: '16px', fontStyle: '700', color: '#fff1d9' });
    this.selectionBody = this.add.text(-222, 37, '', { fontFamily: 'monospace', fontSize: '8px', color: '#cbc5d3' });
    this.selectionEnter = this.add.text(222, 26, 'ENTER  OPEN', { fontFamily: 'monospace', fontSize: '8px', color: '#d8c7ff' }).setOrigin(1, 0.5);
    container.add([bg, this.selectionAccent, this.selectionTitle, this.selectionBody, this.selectionEnter]);
  }

  createAltar(lab, index, x, y) {
    const container = this.add.container(x, y).setDepth(30);
    const aura = this.add.graphics();
    aura.fillStyle(lab.accent, 0.08).fillEllipse(0, 22, 112, 70);
    aura.lineStyle(2, lab.accent, 0.48).strokeCircle(0, 0, 39);
    aura.lineStyle(1, 0xffe3b0, 0.34).strokeCircle(0, 0, 32);

    const pedestal = atlasHas(this, 'platform_arcane')
      ? this.add.image(0, 57, GENERATED_ATLAS, 'platform_arcane').setDisplaySize(126, 54)
      : this.add.rectangle(0, 57, 112, 22, 0x26334a, 1);
    pedestal.setAlpha(0.9);

    const iconFrame = LAB_ICONS[index];
    const icon = atlasHas(this, iconFrame)
      ? this.add.image(0, 0, GENERATED_ATLAS, iconFrame).setDisplaySize(62, 62)
      : this.add.text(0, 0, lab.glyph, { fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#fff' }).setOrigin(0.5);
    const number = this.add.text(-40, -39, lab.number, { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#fff4d8', stroke: '#161528', strokeThickness: 4 });
    const label = this.add.text(0, 78, lab.title.replace(' Lab', '').toUpperCase(), {
      fontFamily: 'Trebuchet MS', fontSize: '9px', fontStyle: '700', color: '#f5edf8', stroke: '#101322', strokeThickness: 4,
    }).setOrigin(0.5);
    const hit = this.add.circle(0, 10, 54, 0xffffff, 0.0001).setInteractive({ useHandCursor: true });
    container.add([aura, pedestal, icon, number, label, hit]);

    const applyState = (selected, hover = false) => {
      const emphasis = selected ? 1.14 : hover ? 1.08 : 1;
      this.tweens.killTweensOf(container);
      this.tweens.add({ targets: container, scale: emphasis, duration: 120, ease: 'Back.easeOut' });
      aura.clear();
      aura.fillStyle(lab.accent, selected ? 0.24 : hover ? 0.16 : 0.08).fillEllipse(0, 22, selected ? 128 : 112, selected ? 82 : 70);
      aura.lineStyle(selected ? 3 : 2, lab.accent, selected ? 0.98 : hover ? 0.8 : 0.48).strokeCircle(0, 0, selected ? 43 : 39);
      aura.lineStyle(1, 0xffe3b0, selected ? 0.78 : 0.34).strokeCircle(0, 0, 32);
      icon.setAlpha(selected ? 1 : 0.82);
    };

    hit.on('pointerover', () => { this.selectLab(index, true); applyState(index === this.selectedIndex, true); });
    hit.on('pointerout', () => applyState(index === this.selectedIndex, false));
    hit.on('pointerdown', () => this.enterLab(lab));
    this.tweens.add({ targets: icon, y: index % 2 ? -4 : 4, duration: 1450 + index * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return { container, lab, aura, icon, applyState };
  }

  selectLab(index, animate = true) {
    const normalized = Phaser.Math.Wrap(index, 0, LABS.length);
    const lab = LABS[normalized];
    if (!lab) return;
    this.selectedIndex = normalized;

    this.selectionAccent?.clear().fillStyle(lab.accent, 0.95).fillRoundedRect(-260, 10, 4, 46, 2);
    this.selectionTitle?.setText(`${lab.number} · ${lab.title}`);
    this.selectionBody?.setText(lab.subtitle.replaceAll(' · ', '  •  '));
    this.selectionEnter?.setColor(Phaser.Display.Color.IntegerToColor(lab.accent).rgba);

    this.nodes?.forEach((node, nodeIndex) => node.applyState(nodeIndex === normalized));
    this.portalSigil?.setTint(lab.accent);
    if (this.portalIcon && atlasHas(this, LAB_ICONS[normalized])) setAtlasArt(this.portalIcon, LAB_ICONS[normalized], { width: 102, originY: 0.5 });

    if (animate && this.portalSigil) {
      this.tweens.killTweensOf(this.portalIcon);
      this.portalIcon?.setScale(this.portalIcon.scaleX * 0.72);
      this.tweens.add({ targets: this.portalIcon, scaleX: this.portalIcon.scaleX / 0.72, scaleY: this.portalIcon.scaleY / 0.72, duration: 170, ease: 'Back.easeOut' });
      this.tweens.add({ targets: this.portalSigil, scaleX: this.portalSigil.scaleX * 1.08, scaleY: this.portalSigil.scaleY * 1.08, duration: 110, yoyo: true });
    }
  }

  enterLab(lab) {
    const url = new URL(window.location.href);
    url.searchParams.set('lab', lab.query);
    history.replaceState(null, '', url);
    this.cameras.main.flash(150, 224, 210, 255, false);
    this.portalSigil?.setAlpha(1);
    this.time.delayedCall(95, () => this.scene.start(lab.key));
  }

  update() {
    if (!this.keys) return;
    for (let i = 1; i <= LABS.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[`lab${i}`])) this.enterLab(LABS[i - 1]);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.left)) this.selectLab(this.selectedIndex - 1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.right)) this.selectLab(this.selectedIndex + 1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.confirm)) this.enterLab(LABS[this.selectedIndex]);
  }
}
