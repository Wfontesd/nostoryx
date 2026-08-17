import { THEME } from '../theme.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.createTextures();
    document.querySelector('#boot-status')?.classList.add('hidden');

    const requested = new URLSearchParams(window.location.search).get('lab');
    const map = {
      movement: 'MovementLab', combat: 'CombatLab', monsters: 'MonsterLab',
      vfx: 'VfxLab', craft: 'CraftLab', ui: 'UiLab',
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
    this.texture('player', 64, 80, (g) => {
      g.fillStyle(0x111426, 0.30).fillEllipse(32, 74, 45, 9);
      g.fillStyle(0x27233e, 1).fillRoundedRect(17, 25, 31, 39, 10);
      g.fillStyle(0x4f3f8f, 1).fillTriangle(13, 28, 51, 28, 32, 5);
      g.fillStyle(0x725be0, 1).fillRoundedRect(19, 35, 27, 16, 5);
      g.fillStyle(0xc3a8ff, 0.95).fillRect(20, 51, 25, 5);
      g.fillStyle(0x1a1731, 1).fillRoundedRect(18, 61, 11, 14, 4).fillRoundedRect(36, 61, 11, 14, 4);
      g.fillStyle(0x9fe8ff, 0.85).fillTriangle(11, 34, 19, 31, 13, 59);
      g.lineStyle(2, 0xe4d7ff, 0.65).strokeRoundedRect(17, 25, 31, 39, 10);
      g.lineStyle(2, 0x9179ff, 0.8).lineBetween(48, 39, 60, 28).lineBetween(48, 41, 61, 30);
    });

    this.texture('slime', 62, 48, (g) => {
      g.fillStyle(0x10231d, 0.28).fillEllipse(31, 42, 52, 8);
      g.fillStyle(0x24523c, 1).fillEllipse(31, 29, 54, 34);
      g.fillStyle(0x71db91, 1).fillEllipse(31, 24, 49, 33);
      g.fillStyle(0xc4ffd0, 0.42).fillEllipse(22, 17, 14, 8);
      g.fillStyle(0x3d8d5a, 0.8).fillTriangle(8, 31, 18, 14, 22, 34);
      g.lineStyle(2, 0x183425, 0.9).strokeEllipse(31, 28, 54, 34);
    });

    this.texture('wisp', 56, 66, (g) => {
      g.fillStyle(0x7c5ce0, 0.14).fillCircle(28, 25, 26);
      g.fillStyle(0x9b79ff, 0.28).fillCircle(28, 25, 20);
      g.fillStyle(0xc8b6ff, 0.92).fillCircle(28, 24, 11);
      g.fillStyle(0xffffff, 0.8).fillCircle(24, 20, 3);
      g.fillStyle(0x8c6bf0, 0.8).fillTriangle(17, 38, 39, 38, 28, 64);
      g.lineStyle(2, 0xd9ceff, 0.65).strokeCircle(28, 24, 14);
    });

    this.texture('brute', 84, 96, (g) => {
      g.fillStyle(0x17131e, 0.3).fillEllipse(42, 89, 66, 10);
      g.fillStyle(0x46352f, 1).fillRoundedRect(14, 27, 56, 55, 15);
      g.fillStyle(0x9f7157, 1).fillRoundedRect(20, 18, 44, 31, 12);
      g.fillStyle(0xd49a6c, 0.9).fillRect(20, 52, 44, 11);
      g.fillStyle(0x36252d, 1).fillTriangle(16, 30, 24, 7, 34, 27).fillTriangle(50, 27, 61, 7, 68, 30);
      g.fillStyle(0x64483c, 1).fillRoundedRect(7, 45, 13, 30, 6).fillRoundedRect(64, 45, 13, 30, 6);
      g.lineStyle(3, 0xe0a66f, 0.62).strokeRoundedRect(14, 27, 56, 55, 15);
      g.lineStyle(2, 0x5a3f37, 0.8).lineBetween(23, 37, 61, 37);
    });

    this.texture('platform', 128, 28, (g) => {
      g.fillStyle(0x17233a, 1).fillRect(0, 7, 128, 21);
      g.fillStyle(0x33405b, 1).fillRect(0, 10, 128, 5);
      g.fillStyle(0x67a36f, 1).fillRect(0, 2, 128, 8);
      g.fillStyle(0x91cc84, 1).fillRect(0, 0, 128, 4);
      for (let x = 6; x < 128; x += 22) g.fillStyle(0x222f48, 0.9).fillRect(x, 17, 12, 2);
    });

    this.texture('fx-dot', 20, 20, (g) => {
      g.fillStyle(0xffffff, 0.08).fillCircle(10, 10, 10);
      g.fillStyle(0xffffff, 0.32).fillCircle(10, 10, 6);
      g.fillStyle(0xffffff, 1).fillCircle(10, 10, 2);
    });
    this.texture('fx-spark', 34, 34, (g) => {
      g.fillStyle(0xffffff, 0.08).fillCircle(17, 17, 16);
      g.fillStyle(0xffffff, 0.95).fillTriangle(17, 0, 21, 14, 17, 17).fillTriangle(34, 17, 20, 21, 17, 17)
        .fillTriangle(17, 34, 13, 20, 17, 17).fillTriangle(0, 17, 14, 13, 17, 17);
      g.fillStyle(0xffffff, 1).fillCircle(17, 17, 3);
    });
    this.texture('fx-ring', 128, 128, (g) => {
      g.lineStyle(12, 0xffffff, 0.08).strokeCircle(64, 64, 48);
      g.lineStyle(5, 0xffffff, 0.34).strokeCircle(64, 64, 48);
      g.lineStyle(2, 0xffffff, 0.96).strokeCircle(64, 64, 48);
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8;
        g.fillStyle(0xffffff, 0.8).fillCircle(64 + Math.cos(a) * 49, 64 + Math.sin(a) * 49, 2);
      }
    });
    this.texture('fx-rune', 150, 150, (g) => {
      g.lineStyle(2, 0xffffff, 0.74).strokeCircle(75, 75, 57).strokeCircle(75, 75, 42);
      g.lineStyle(2, 0xffffff, 0.5).strokeTriangle(75, 19, 124, 104, 26, 104);
      g.lineStyle(1, 0xffffff, 0.7).lineBetween(25, 75, 125, 75).lineBetween(75, 25, 75, 125);
    });
    this.texture('fx-slash', 180, 132, (g) => {
      g.lineStyle(28, 0xffffff, 0.07).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
      g.lineStyle(14, 0xffffff, 0.16).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
      g.lineStyle(6, 0xffffff, 0.86).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
      g.lineStyle(2, 0xffffff, 1).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
    });

    this.texture('skill-light', 56, 56, (g) => {
      g.fillStyle(0x1b2940, 1).fillRect(0, 0, 56, 56);
      g.lineStyle(5, 0x8fd3ff, 0.9).beginPath().arc(17, 39, 28, -1.15, 0.45).strokePath();
      g.fillStyle(0xd9f5ff, 1).fillTriangle(37, 12, 48, 18, 24, 39);
    });
    this.texture('skill-heavy', 56, 56, (g) => {
      g.fillStyle(0x3a2619, 1).fillRect(0, 0, 56, 56);
      g.fillStyle(0xffb45f, 0.95).fillTriangle(10, 43, 31, 9, 37, 17).fillTriangle(18, 47, 40, 14, 47, 22);
      g.fillStyle(0xffefca, 0.9).fillCircle(17, 39, 5);
    });
    this.texture('skill-arc', 56, 56, (g) => {
      g.fillStyle(0x251d45, 1).fillRect(0, 0, 56, 56);
      g.lineStyle(4, 0xb991ff, 0.95).strokeCircle(28, 29, 17);
      g.lineStyle(3, 0xe7ddff, 0.9).beginPath().moveTo(14, 39).lineTo(24, 27).lineTo(19, 23).lineTo(39, 13).lineTo(30, 29).lineTo(36, 32).lineTo(22, 45).strokePath();
    });

    this.texture('target', 64, 64, (g) => {
      g.lineStyle(2, THEME.red, 0.75).strokeCircle(32, 32, 24);
      g.lineStyle(1, THEME.red, 0.35).strokeCircle(32, 32, 14);
      g.lineBetween(32, 2, 32, 18).lineBetween(32, 46, 32, 62).lineBetween(2, 32, 18, 32).lineBetween(46, 32, 62, 32);
    });
  }
}
