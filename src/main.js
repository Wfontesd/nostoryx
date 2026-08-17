import { BootScene } from './game/scenes/boot-scene.js';
import { LabHubScene } from './game/scenes/lab-hub-scene.js';
import { MovementLabScene } from './game/scenes/movement-lab-scene.js';
import { CombatLabScene } from './game/scenes/combat-lab-scene.js';
import { MonsterLabScene } from './game/scenes/monster-lab-scene.js';
import { VfxLabScene } from './game/scenes/vfx-lab-scene.js';
import { CraftLabScene } from './game/scenes/craft-lab-scene.js';
import { UiLabScene } from './game/scenes/ui-lab-scene.js';

if (!globalThis.Phaser) {
  throw new Error('Phaser 4.2.1 failed to load. Check the pinned CDN script in index.html.');
}

window.addEventListener('keydown', (event) => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
}, { passive: false });

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 1280,
  height: 720,
  backgroundColor: '#070a10',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1700 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
  scene: [
    BootScene,
    LabHubScene,
    MovementLabScene,
    CombatLabScene,
    MonsterLabScene,
    VfxLabScene,
    CraftLabScene,
    UiLabScene,
  ],
};

const game = new Phaser.Game(config);
globalThis.__NOSTORYX_DEV_GAME__ = game;
