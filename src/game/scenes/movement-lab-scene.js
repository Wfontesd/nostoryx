import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { THEME } from '../theme.js';

export class MovementLabScene extends BaseLabScene {
  constructor() { super('MovementLab'); }

  create() {
    this.createLabChrome('Movement Lab', 'Tune locomotion in isolation before any production map exists.', THEME.cyan);
    this.physics.world.setBounds(0, 76, this.scale.width, this.scale.height - 76);

    this.ground = this.createGround(652);
    this.platforms = this.physics.add.staticGroup();
    const placements = [
      [390, 565, 170], [590, 495, 132], [760, 424, 116], [925, 507, 170], [1082, 382, 124],
    ];
    for (const [x, y, width] of placements) {
      const p = this.platforms.create(x, y, 'platform').setDepth(8).setScale(width / 128, 1).refreshBody();
      p.setTint(0xa8cce0);
    }

    this.player = this.createPlayer(135, 590);
    this.controller = new PlayerController(this, this.player, { speed: 292, jumpSpeed: 640, dashSpeed: 760 });
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);

    const finish = this.add.image(1110, 326, 'target').setTint(THEME.cyan).setAlpha(0.7).setDepth(9);
    this.tweens.add({ targets: finish, rotation: Math.PI * 2, duration: 5000, repeat: -1, ease: 'Linear' });

    this.makePanel(22, 104, 298, 174, { accent: THEME.cyan });
    this.add.text(40, 122, 'LOCOMOTION TELEMETRY', { fontFamily: 'monospace', fontSize: '11px', color: '#8ce7ff' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.telemetry = this.makeDebugText(40, 150, 'booting…');
    this.add.text(40, 236, 'A/D move   SPACE jump   SHIFT dash', { fontFamily: 'monospace', fontSize: '10px', color: '#6f7d91' }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.makePanel(this.scale.width - 300, 104, 278, 116, { accent: 0x4e6075, alpha: 0.82 });
    this.add.text(this.scale.width - 282, 122, 'TEST INTENT', { fontFamily: 'monospace', fontSize: '10px', color: '#9aa8bc' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(this.scale.width - 282, 148, '• coyote time: 110 ms\n• jump buffer: 130 ms\n• dash lock: 145 ms\n• dash cooldown: 650 ms', { fontFamily: 'monospace', fontSize: '10px', color: '#c5cfdd', lineSpacing: 4 }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.checkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.hitboxKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.lastTelemetry = 0;
    this.finishReached = false;
  }

  update(time) {
    this.controller?.update(time);
    if (!this.player) return;

    if (this.player.y > this.scale.height + 20) this.player.setPosition(135, 590).setVelocity(0, 0);
    if (!this.finishReached && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1110, 326) < 62) {
      this.finishReached = true;
      this.vfx.shockwave(1110, 326, { color: THEME.cyan, scale: 1.8 });
      this.toast('Course marker reached · movement loop valid', { accent: THEME.cyan });
      this.time.delayedCall(1200, () => { this.finishReached = false; });
    }

    if (Phaser.Input.Keyboard.JustDown(this.hitboxKey)) this.toggleHitboxes();
    if (Phaser.Input.Keyboard.JustDown(this.checkKey)) {
      this.player.setPosition(735, 360).setVelocity(0, 0);
      this.toast('Teleported to platform checkpoint', { accent: THEME.cyan });
    }

    if (time - this.lastTelemetry > 80) {
      const s = this.controller.snapshot(time);
      this.telemetry?.setText([
        `position       ${String(s.x).padStart(4)} / ${String(s.y).padStart(4)}`,
        `velocity       ${String(s.vx).padStart(4)} / ${String(s.vy).padStart(4)}`,
        `grounded       ${s.grounded ? 'YES' : 'NO'}`,
        `facing         ${s.facing > 0 ? 'RIGHT' : 'LEFT'}`,
        `dash cd        ${Math.ceil(s.dashReady)} ms`,
        `B hitboxes     ${this.physics.world.drawDebug ? 'ON' : 'OFF'}   T checkpoint`,
      ]);
      this.lastTelemetry = time;
    }
  }
}
