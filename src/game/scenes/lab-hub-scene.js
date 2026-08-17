import { LABS, THEME } from '../theme.js';

export class LabHubScene extends Phaser.Scene {
  constructor() { super('LabHub'); }

  create() {
    history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(THEME.bg);

    const bg = this.add.graphics().setDepth(-20);
    bg.fillStyle(0x06090f, 1).fillRect(0, 0, width, height);
    bg.fillStyle(0x0b1019, 1).fillRect(0, 0, width, height);
    bg.fillStyle(0x201633, 0.14).fillTriangle(0, height, width * 0.48, 0, width * 0.72, height);
    bg.lineStyle(1, 0x273145, 0.22);
    for (let x = -height; x < width; x += 82) bg.lineBetween(x, height, x + height, 0);

    this.motes = [];
    for (let i = 0; i < 28; i += 1) {
      const mote = this.add.image(Phaser.Math.Between(20, width - 20), Phaser.Math.Between(20, height - 20), 'fx-dot')
        .setTint(i % 3 === 0 ? THEME.cyan : THEME.violet)
        .setScale(Phaser.Math.FloatBetween(0.12, 0.34))
        .setAlpha(Phaser.Math.FloatBetween(0.08, 0.25))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-10);
      this.motes.push(mote);
      this.tweens.add({ targets: mote, y: mote.y - Phaser.Math.Between(60, 150), alpha: 0.02, duration: Phaser.Math.Between(2500, 6000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 47 });
    }

    const mark = this.add.graphics();
    mark.lineStyle(2, THEME.violet, 0.75);
    mark.beginPath().moveTo(58, 32).lineTo(78, 52).lineTo(58, 72).lineTo(38, 52).closePath().strokePath();
    mark.lineStyle(1, THEME.cyan, 0.6);
    mark.beginPath().moveTo(58, 41).lineTo(69, 52).lineTo(58, 63).lineTo(47, 52).closePath().strokePath();

    this.add.text(92, 29, 'NOSTORYX', { fontFamily: 'system-ui', fontSize: '21px', fontStyle: '900', color: '#f4f6ff', letterSpacing: 2 });
    this.add.text(92, 56, 'DEVELOPER ENVIRONMENT', { fontFamily: 'monospace', fontSize: '9px', color: '#77849a', letterSpacing: 1 });
    this.add.text(width - 28, 35, 'v0.1.0-lab  ·  PHASER 4.2.1  ·  WEBGL', { fontFamily: 'monospace', fontSize: '9px', color: '#77849a' }).setOrigin(1, 0);

    this.add.text(58, 119, 'ISOLATED TEST ROOMS', { fontFamily: 'system-ui', fontSize: '34px', fontStyle: '900', color: '#f5f7ff' });
    this.add.text(60, 164, 'Build one system. Break it safely. Tune it without the rest of the MMO getting in the way.', { fontFamily: 'system-ui', fontSize: '13px', color: '#8e9aae' });

    this.add.text(60, 207, 'SELECT A LAB', { fontFamily: 'monospace', fontSize: '10px', color: '#a997dd', letterSpacing: 2 });

    this.cards = [];
    LABS.forEach((lab, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 58 + col * 398;
      const y = 238 + row * 178;
      this.cards.push(this.createCard(x, y, 362, 148, lab));
    });

    const footerY = height - 72;
    const footer = this.add.graphics();
    footer.fillStyle(0x070a10, 0.94).fillRect(0, footerY, width, 72);
    footer.lineStyle(1, 0x273248, 0.6).lineBetween(0, footerY, width, footerY);
    footer.fillStyle(THEME.violet, 0.8).fillRect(58, footerY, 128, 2);
    this.add.text(60, footerY + 20, 'KEYS  1–6 open a lab instantly', { fontFamily: 'monospace', fontSize: '10px', color: '#aeb8c8' });
    this.add.text(60, footerY + 39, 'These scenes are developer-only fixtures; production maps and MMO networking stay separate.', { fontFamily: 'system-ui', fontSize: '10px', color: '#667389' });
    this.add.text(width - 58, footerY + 30, 'LAB BUILD', { fontFamily: 'monospace', fontSize: '10px', color: '#bba8ff' }).setOrigin(1, 0.5);

    this.keys = this.input.keyboard.addKeys({
      lab1: Phaser.Input.Keyboard.KeyCodes.ONE,
      lab2: Phaser.Input.Keyboard.KeyCodes.TWO,
      lab3: Phaser.Input.Keyboard.KeyCodes.THREE,
      lab4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      lab5: Phaser.Input.Keyboard.KeyCodes.FIVE,
      lab6: Phaser.Input.Keyboard.KeyCodes.SIX,
    });
  }

  createCard(x, y, width, height, lab) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const accent = this.add.graphics();
    const hit = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.0001).setInteractive({ useHandCursor: true });
    const glyph = this.add.text(30, 26, lab.glyph, { fontFamily: 'system-ui', fontSize: '27px', fontStyle: '700', color: Phaser.Display.Color.IntegerToColor(lab.accent).rgba });
    const number = this.add.text(width - 26, 20, lab.number.padStart(2, '0'), { fontFamily: 'monospace', fontSize: '11px', color: '#59667b' }).setOrigin(1, 0);
    const title = this.add.text(30, 68, lab.title, { fontFamily: 'system-ui', fontSize: '16px', fontStyle: '800', color: '#f2f4fa' });
    const subtitle = this.add.text(30, 98, lab.subtitle, { fontFamily: 'monospace', fontSize: '9px', color: '#7f8b9f' });
    const enter = this.add.text(width - 30, 119, 'ENTER  →', { fontFamily: 'monospace', fontSize: '9px', color: Phaser.Display.Color.IntegerToColor(lab.accent).rgba }).setOrigin(1, 0.5).setAlpha(0.55);

    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x151c29 : 0x0d131d, hover ? 0.98 : 0.91).fillRoundedRect(0, 0, width, height, 10);
      bg.lineStyle(1, hover ? lab.accent : 0x303b4d, hover ? 0.78 : 0.62).strokeRoundedRect(0, 0, width, height, 10);
      bg.lineStyle(1, 0x1c2634, 0.8).lineBetween(30, 58, width - 30, 58);
      accent.clear();
      accent.fillStyle(lab.accent, hover ? 1 : 0.66).fillRect(0, 20, 3, height - 40);
      accent.fillStyle(lab.accent, hover ? 0.16 : 0.06).fillTriangle(width - 90, 0, width, 0, width, 90);
      enter.setAlpha(hover ? 1 : 0.55);
    };
    draw(false);

    hit.on('pointerover', () => { draw(true); this.tweens.add({ targets: container, x: x + 4, duration: 90 }); });
    hit.on('pointerout', () => { draw(false); this.tweens.add({ targets: container, x, duration: 90 }); });
    hit.on('pointerdown', () => this.enterLab(lab));

    container.add([bg, accent, hit, glyph, number, title, subtitle, enter]);
    return container;
  }

  enterLab(lab) {
    const url = new URL(window.location.href);
    url.searchParams.set('lab', lab.query);
    history.replaceState(null, '', url);
    this.scene.start(lab.key);
  }

  update() {
    if (!this.keys) return;
    for (let i = 1; i <= LABS.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[`lab${i}`])) this.enterLab(LABS[i - 1]);
    }
  }
}
