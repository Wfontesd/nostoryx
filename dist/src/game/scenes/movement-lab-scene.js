import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { THEME } from '../theme.js';

export class MovementLabScene extends BaseLabScene {
  constructor() { super('MovementLab'); }

  create() {
    this.createLabChrome('Movement Lab', 'Tune locomotion in isolation before any production map exists.', THEME.cyan);
    this.physics.world.setBounds(0, 54, this.scale.width, this.scale.height - 54);

    this.ground = this.createGround(652);
    const placements = [
      [360, 566, 178], [570, 492, 142], [758, 414, 124], [936, 500, 182], [1096, 368, 138],
    ];
    this.platforms = placements.map(([x, y, width]) => this.createPlatform(x, y, width));

    this.player = this.createPlayer(135, 590);
    this.controller = new PlayerController(this, this.player, { speed: 292, jumpSpeed: 640, dashSpeed: 760 });
    this.physics.add.collider(this.player, this.ground);
    for (const platform of this.platforms) this.physics.add.collider(this.player, platform);

    this.finish = this.add.image(1110, 302, 'target').setTint(THEME.cyan).setAlpha(0.58).setDepth(9);
    this.tweens.add({ targets: this.finish, rotation: Math.PI * 2, duration: 5000, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: this.finish, scale: { from: 0.92, to: 1.08 }, alpha: { from: 0.42, to: 0.72 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.createObjectiveHud();
    this.createDeveloperTelemetry();

    this.checkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.hitboxKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.lastTelemetry = 0;
    this.finishReached = false;
  }

  createObjectiveHud() {
    const x = this.scale.width - 276;
    const y = 72;
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(this.uiDepth + 3);
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1320, 0.82).fillRoundedRect(0, 0, 250, 52, 9);
    bg.lineStyle(1, 0x6f9eb5, 0.56).strokeRoundedRect(0, 0, 250, 52, 9);
    bg.fillStyle(THEME.cyan, 0.9).fillRect(0, 10, 3, 32);
    const title = this.add.text(15, 8, 'TRAVERSAL TRIAL', { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#eafaff' });
    const body = this.add.text(15, 27, 'Reach the suspended rune', { fontFamily: 'Trebuchet MS', fontSize: '9px', color: '#b8cad4' });
    const keys = this.add.text(235, 18, 'A/D · SPACE · SHIFT', { fontFamily: 'monospace', fontSize: '7px', color: '#8ce7ff' }).setOrigin(1, 0);
    container.add([bg, title, body, keys]);
    this.objectiveTitle = title;
    this.objectiveBody = body;
  }

  createDeveloperTelemetry() {
    const container = this.add.container(18, 110).setScrollFactor(0).setDepth(this.uiDepth + 12).setVisible(false);

    const telemetryPanel = this.add.graphics();
    telemetryPanel.fillStyle(0x0b111b, 0.96).fillRoundedRect(0, 0, 302, 192, 8);
    telemetryPanel.lineStyle(1, THEME.cyan, 0.68).strokeRoundedRect(0, 0, 302, 192, 8);
    const telemetryTitle = this.add.text(16, 13, 'LOCOMOTION TELEMETRY / F2', { fontFamily: 'monospace', fontSize: '10px', color: '#8ce7ff' });
    this.telemetry = this.add.text(16, 39, 'booting…', { fontFamily: 'monospace', fontSize: '10px', color: '#d8e5ed', lineSpacing: 5 });
    const telemetryHint = this.add.text(16, 161, 'B hitboxes · T checkpoint', { fontFamily: 'monospace', fontSize: '9px', color: '#91a0ad' });

    const intentPanel = this.add.graphics();
    intentPanel.fillStyle(0x0b111b, 0.94).fillRoundedRect(320, 0, 248, 142, 8);
    intentPanel.lineStyle(1, 0x68798b, 0.64).strokeRoundedRect(320, 0, 248, 142, 8);
    const intentTitle = this.add.text(336, 13, 'FIXED TUNING VALUES', { fontFamily: 'monospace', fontSize: '9px', color: '#aab8c5' });
    const intentBody = this.add.text(336, 38, 'coyote time       110 ms\njump buffer       130 ms\ndash lock         145 ms\ndash cooldown     650 ms', {
      fontFamily: 'monospace', fontSize: '9px', color: '#cfdae3', lineSpacing: 6,
    });

    container.add([telemetryPanel, telemetryTitle, this.telemetry, telemetryHint, intentPanel, intentTitle, intentBody]);
    this.devOverlay = container;
  }

  update(time) {
    this.controller?.update(time);
    if (!this.player) return;

    if (this.player.y > this.scale.height + 20) this.player.setPosition(135, 590).setVelocity(0, 0);
    if (!this.finishReached && Phaser.Math.Distance.Between(this.player.x, this.player.y, 1110, 302) < 62) {
      this.finishReached = true;
      this.vfx.castSigil(1110, 302, { color: THEME.cyan, scale: 0.9, duration: 520 });
      this.vfx.shockwave(1110, 302, { color: THEME.cyan, scale: 1.8 });
      this.vfx.radialImpact(1110, 302, { color: THEME.cyan, power: 0.85 });
      this.objectiveTitle?.setText('TRIAL COMPLETE');
      this.objectiveBody?.setText('Movement path validated');
      this.toast('Course marker reached · movement loop valid', { accent: THEME.cyan });
      this.time.delayedCall(1400, () => {
        this.finishReached = false;
        this.objectiveTitle?.setText('TRAVERSAL TRIAL');
        this.objectiveBody?.setText('Reach the suspended rune');
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.hitboxKey)) this.toggleHitboxes();
    if (Phaser.Input.Keyboard.JustDown(this.checkKey)) {
      this.player.setPosition(735, 350).setVelocity(0, 0);
      this.toast('Teleported to platform checkpoint', { accent: THEME.cyan });
    }

    if (time - this.lastTelemetry > 80) {
      const snapshot = this.controller.snapshot(time);
      this.telemetry?.setText([
        `position       ${String(snapshot.x).padStart(4)} / ${String(snapshot.y).padStart(4)}`,
        `velocity       ${String(snapshot.vx).padStart(4)} / ${String(snapshot.vy).padStart(4)}`,
        `grounded       ${snapshot.grounded ? 'YES' : 'NO'}`,
        `facing         ${snapshot.facing > 0 ? 'RIGHT' : 'LEFT'}`,
        `dash cd        ${Math.ceil(snapshot.dashReady)} ms`,
        `hitboxes       ${this.physics.world.drawDebug ? 'ON' : 'OFF'}`,
      ]);
      this.lastTelemetry = time;
    }
  }
}
