import { THEME } from '../theme.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.createTextures();
    document.querySelector('#boot-status')?.classList.add('hidden');

    const requested = new URLSearchParams(window.location.search).get('lab');
    const map = {
      movement: 'MovementLab',
      combat: 'CombatLab',
      monsters: 'MonsterLab',
      vfx: 'VfxLab',
      craft: 'CraftLab',
      ui: 'UiLab',
    };
    this.scene.start(map[requested] ?? 'LabHub');
  }

  texture(key, width, height, draw) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    draw(g, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  createTextures() {
    this.texture('player', 46, 64, (g) => {
      g.fillStyle(0x121722, 1).fillRoundedRect(9, 13, 28, 42, 9);
      g.fillStyle(0x252e43, 1).fillTriangle(7, 26, 39, 26, 23, 4);
      g.fillStyle(0x775ee0, 1).fillRoundedRect(14, 30, 18, 12, 4);
      g.fillStyle(0xa992ff, 0.8).fillRect(19, 54, 4, 8).fillRect(28, 54, 4, 8);
      g.lineStyle(2, 0x9b7bff, 0.85).strokeRoundedRect(10, 14, 26, 40, 8);
    });

    this.texture('slime', 54, 42, (g) => {
      g.fillStyle(0x294a32, 1).fillEllipse(27, 25, 48, 31);
      g.fillStyle(0x77d98e, 1).fillEllipse(27, 20, 43, 29);
      g.fillStyle(0xa9f0b8, 0.35).fillEllipse(19, 15, 12, 7);
      g.lineStyle(2, 0x1a2c20, 1).strokeEllipse(27, 24, 48, 31);
    });

    this.texture('wisp', 48, 56, (g) => {
      g.fillStyle(0x6f56c8, 0.26).fillCircle(24, 23, 22);
      g.fillStyle(0xa995ff, 0.9).fillCircle(24, 22, 12);
      g.fillStyle(0xe5dcff, 0.85).fillCircle(20, 18, 4);
      g.fillStyle(0x7a60df, 0.75).fillTriangle(14, 34, 34, 34, 24, 54);
    });

    this.texture('brute', 66, 76, (g) => {
      g.fillStyle(0x3c3029, 1).fillRoundedRect(10, 16, 46, 51, 12);
      g.fillStyle(0x8f694d, 1).fillRoundedRect(15, 10, 36, 24, 9);
      g.fillStyle(0xd9985e, 0.7).fillRect(18, 42, 30, 9);
      g.lineStyle(3, 0xb6815a, 0.65).strokeRoundedRect(10, 16, 46, 51, 12);
    });

    this.texture('platform', 128, 24, (g) => {
      g.fillStyle(0x192331, 1).fillRoundedRect(0, 0, 128, 24, 6);
      g.fillStyle(0x314259, 1).fillRoundedRect(0, 0, 128, 7, 4);
      g.lineStyle(1, 0x52677f, 0.45).strokeRoundedRect(0, 0, 128, 24, 6);
    });

    this.texture('fx-dot', 16, 16, (g) => {
      g.fillStyle(0xffffff, 0.15).fillCircle(8, 8, 8);
      g.fillStyle(0xffffff, 0.75).fillCircle(8, 8, 4);
      g.fillStyle(0xffffff, 1).fillCircle(8, 8, 1.5);
    });

    this.texture('fx-ring', 96, 96, (g) => {
      g.lineStyle(7, 0xffffff, 0.12).strokeCircle(48, 48, 37);
      g.lineStyle(2, 0xffffff, 0.95).strokeCircle(48, 48, 37);
    });

    this.texture('fx-slash', 140, 108, (g) => {
      g.lineStyle(18, 0xffffff, 0.12).beginPath().arc(42, 70, 55, -1.05, 0.55).strokePath();
      g.lineStyle(7, 0xffffff, 0.74).beginPath().arc(42, 70, 55, -1.05, 0.55).strokePath();
      g.lineStyle(2, 0xffffff, 1).beginPath().arc(42, 70, 55, -1.05, 0.55).strokePath();
    });

    this.texture('target', 64, 64, (g) => {
      g.lineStyle(2, THEME.red, 0.75).strokeCircle(32, 32, 24);
      g.lineStyle(1, THEME.red, 0.35).strokeCircle(32, 32, 14);
      g.lineBetween(32, 2, 32, 18).lineBetween(32, 46, 32, 62).lineBetween(2, 32, 18, 32).lineBetween(46, 32, 62, 32);
    });
  }
}
