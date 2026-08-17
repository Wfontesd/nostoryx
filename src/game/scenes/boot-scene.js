import { THEME } from '../theme.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const svg = (key, path, width, height) => this.load.svg(key, `public/art/${path}`, { width, height });

    // Existing vector art remains as a lightweight fallback if generated art fails to load.
    svg('bg-sky', 'backgrounds/lab-sky.svg', 1400, 760);
    svg('bg-far', 'backgrounds/lab-far.svg', 1500, 760);
    svg('bg-mid', 'backgrounds/lab-mid.svg', 1500, 760);
    svg('bg-front', 'backgrounds/lab-front.svg', 1500, 220);
    svg('player', 'hero/hero-idle.svg', 96, 112);
    svg('player-run-a', 'hero/hero-run-a.svg', 96, 112);
    svg('player-run-b', 'hero/hero-run-b.svg', 96, 112);
    svg('player-jump', 'hero/hero-jump.svg', 96, 112);
    svg('player-light', 'hero/hero-light.svg', 126, 112);
    svg('player-heavy', 'hero/hero-heavy.svg', 126, 126);
    svg('player-skill', 'hero/hero-skill.svg', 132, 122);
    svg('brute', 'enemies/training-brute.svg', 116, 126);
    svg('slime', 'enemies/rune-slime.svg', 76, 62);
    svg('wisp', 'enemies/rune-wisp.svg', 74, 82);
    svg('skill-light', 'ui/skill-quick-slash.svg', 72, 72);
    svg('skill-heavy', 'ui/skill-breaker.svg', 72, 72);
    svg('skill-arc', 'ui/skill-arc-surge.svg', 72, 72);
    svg('fx-slash', 'vfx/slash.svg', 220, 160);
    svg('fx-impact', 'vfx/impact.svg', 180, 180);
  }

  create() {
    this.initialize().catch((error) => {
      console.warn('[NOSTORYX] Generated atlas unavailable; using vector fallbacks.', error);
      this.finishBoot();
    });
  }

  async initialize() {
    await this.loadGeneratedAtlas();
    this.finishBoot();
  }

  finishBoot() {
    this.createFallbackTextures();
    document.querySelector('#boot-status')?.classList.add('hidden');

    const requested = new URLSearchParams(window.location.search).get('lab');
    const map = {
      movement: 'MovementLab', combat: 'CombatLab', monsters: 'MonsterLab',
      vfx: 'VfxLab', craft: 'CraftLab', ui: 'UiLab',
    };
    this.scene.start(map[requested] ?? 'LabHub');
  }

  async loadGeneratedAtlas() {
    const root = new URL('public/generated/', window.location.href);
    const [metadataResponse, ...partResponses] = await Promise.all([
      fetch(new URL('nostoryx-generated-atlas.json', root), { cache: 'no-store' }),
      ...Array.from({ length: 15 }, (_, index) => fetch(new URL(`atlas.b64.${String(index).padStart(2, '0')}`, root), { cache: 'force-cache' })),
    ]);

    if (!metadataResponse.ok || partResponses.some((response) => !response.ok)) {
      throw new Error('Generated art atlas files could not be loaded.');
    }

    const [metadata, ...parts] = await Promise.all([
      metadataResponse.json(),
      ...partResponses.map((response) => response.text()),
    ]);
    const base64 = parts.join('').replace(/\s+/g, '');
    if (!base64.startsWith('iVBOR')) throw new Error('Generated art atlas payload is not a PNG.');

    const image = new Image();
    image.decoding = 'async';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Generated art atlas PNG could not be decoded.'));
      image.src = `data:image/png;base64,${base64}`;
    });

    if (this.textures.exists('generated-atlas')) this.textures.remove('generated-atlas');
    const texture = this.textures.addImage('generated-atlas', image);
    if (!texture || !metadata?.frames) throw new Error('Generated atlas texture could not be registered.');

    for (const [name, frame] of Object.entries(metadata.frames)) {
      if (!frame || frame.w <= 0 || frame.h <= 0) continue;
      if (!texture.has(name)) texture.add(name, 0, frame.x, frame.y, frame.w, frame.h);
    }
  }

  texture(key, width, height, draw) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    draw(g, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  createFallbackTextures() {
    this.texture('player', 72, 92, (g) => {
      g.fillStyle(0x302a5b, 1).fillTriangle(12, 37, 36, 5, 62, 37);
      g.fillStyle(0x080c19, 1).fillRoundedRect(24, 29, 24, 18, 8);
      g.fillStyle(0x725be0, 1).fillRoundedRect(20, 43, 34, 34, 8);
      g.fillStyle(0x171c35, 1).fillRect(23, 75, 11, 15).fillRect(42, 75, 11, 15);
    });
    this.texture('brute', 90, 108, (g) => {
      g.fillStyle(0x49353a, 1).fillRoundedRect(12, 30, 66, 65, 15);
      g.fillStyle(0xff9d54, 1).fillCircle(45, 68, 10);
    });
    this.texture('slime', 70, 54, (g) => g.fillStyle(0x59c77b, 1).fillEllipse(35, 34, 58, 34));
    this.texture('wisp', 64, 74, (g) => g.fillStyle(0xa58cff, 0.9).fillCircle(32, 28, 20));
    this.texture('platform', 128, 28, (g) => {
      g.fillStyle(0x1a2638, 1).fillRect(0, 7, 128, 21);
      g.fillStyle(0x5d9c69, 1).fillRect(0, 2, 128, 8);
      g.fillStyle(0xa4db91, 1).fillRect(0, 0, 128, 3);
    });
    this.texture('fx-dot', 20, 20, (g) => {
      g.fillStyle(0xffffff, 0.08).fillCircle(10, 10, 10);
      g.fillStyle(0xffffff, 0.35).fillCircle(10, 10, 6);
      g.fillStyle(0xffffff, 1).fillCircle(10, 10, 2);
    });
    this.texture('fx-spark', 34, 34, (g) => {
      g.fillStyle(0xffffff, 0.12).fillCircle(17, 17, 16);
      g.fillStyle(0xffffff, 0.98).fillTriangle(17, 0, 21, 14, 17, 17)
        .fillTriangle(34, 17, 20, 21, 17, 17).fillTriangle(17, 34, 13, 20, 17, 17)
        .fillTriangle(0, 17, 14, 13, 17, 17);
    });
    this.texture('fx-ring', 128, 128, (g) => {
      g.lineStyle(12, 0xffffff, 0.08).strokeCircle(64, 64, 48);
      g.lineStyle(4, 0xffffff, 0.58).strokeCircle(64, 64, 48);
      g.lineStyle(1.5, 0xffffff, 1).strokeCircle(64, 64, 48);
    });
    this.texture('fx-rune', 150, 150, (g) => {
      g.lineStyle(2, 0xffffff, 0.78).strokeCircle(75, 75, 57).strokeCircle(75, 75, 42);
      g.lineStyle(2, 0xffffff, 0.52).strokeTriangle(75, 19, 124, 104, 26, 104);
      g.lineStyle(1, 0xffffff, 0.75).lineBetween(25, 75, 125, 75).lineBetween(75, 25, 75, 125);
    });
    this.texture('fx-slash', 180, 132, (g) => {
      g.lineStyle(24, 0xffffff, 0.08).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
      g.lineStyle(6, 0xffffff, 0.88).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
      g.lineStyle(2, 0xffffff, 1).beginPath().arc(54, 87, 72, -1.12, 0.52).strokePath();
    });
    this.texture('fx-impact', 120, 120, (g) => {
      g.fillStyle(0xffffff, 0.75).fillCircle(60, 60, 16);
      for (let i = 0; i < 8; i += 1) {
        const a = (Math.PI * 2 * i) / 8;
        g.lineStyle(4, 0xffffff, 0.8).lineBetween(60 + Math.cos(a) * 18, 60 + Math.sin(a) * 18, 60 + Math.cos(a) * 55, 60 + Math.sin(a) * 55);
      }
    });
    this.texture('target', 64, 64, (g) => {
      g.lineStyle(2, THEME.red, 0.75).strokeCircle(32, 32, 24);
      g.lineStyle(1, THEME.red, 0.35).strokeCircle(32, 32, 14);
    });
    this.texture('skill-light', 72, 72, (g) => { g.fillStyle(0x1b2940, 1).fillRect(0, 0, 72, 72); g.lineStyle(6, 0x8fd3ff, 1).beginPath().arc(22, 49, 34, -1.1, 0.5).strokePath(); });
    this.texture('skill-heavy', 72, 72, (g) => { g.fillStyle(0x3a2619, 1).fillRect(0, 0, 72, 72); g.fillStyle(0xffb45f, 1).fillTriangle(15, 58, 40, 12, 51, 22); });
    this.texture('skill-arc', 72, 72, (g) => { g.fillStyle(0x251d45, 1).fillRect(0, 0, 72, 72); g.lineStyle(5, 0xb991ff, 1).strokeCircle(36, 36, 22); });
  }
}
