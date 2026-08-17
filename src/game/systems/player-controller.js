export class PlayerController {
  constructor(scene, player, { speed = 280, jumpSpeed = 630, dashSpeed = 720 } = {}) {
    this.scene = scene;
    this.player = player;
    this.speed = speed;
    this.jumpSpeed = jumpSpeed;
    this.dashSpeed = dashSpeed;
    this.facing = 1;
    this.coyoteUntil = 0;
    this.jumpBufferedUntil = 0;
    this.dashReadyAt = 0;
    this.isDashingUntil = 0;
    this.lastGrounded = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      jumpAlt: Phaser.Input.Keyboard.KeyCodes.W,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });
  }

  update(time) {
    const body = this.player.body;
    if (!body) return;

    const grounded = body.blocked.down || body.touching.down;
    if (grounded) this.coyoteUntil = time + 110;
    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) || Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.jumpBufferedUntil = time + 130;
    }

    if (time < this.isDashingUntil) {
      body.setVelocityY(0);
      body.setVelocityX(this.facing * this.dashSpeed);
      return;
    }

    const left = this.keys.left.isDown || this.cursors.left.isDown;
    const right = this.keys.right.isDown || this.cursors.right.isDown;
    const axis = (right ? 1 : 0) - (left ? 1 : 0);
    if (axis !== 0) {
      this.facing = axis;
      this.player.setFlipX(axis < 0);
    }
    body.setVelocityX(axis * this.speed);

    if (this.jumpBufferedUntil >= time && this.coyoteUntil >= time) {
      body.setVelocityY(-this.jumpSpeed);
      this.jumpBufferedUntil = 0;
      this.coyoteUntil = 0;
      this.scene.events.emit('player-jump', this.player.x, this.player.y);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) && time >= this.dashReadyAt) {
      this.isDashingUntil = time + 145;
      this.dashReadyAt = time + 650;
      this.scene.events.emit('player-dash', this.player.x, this.player.y, this.facing);
    }

    if (!this.lastGrounded && grounded) this.scene.events.emit('player-land', this.player.x, this.player.y);
    this.lastGrounded = grounded;
  }

  snapshot(time) {
    const body = this.player.body;
    return {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      vx: Math.round(body?.velocity.x ?? 0),
      vy: Math.round(body?.velocity.y ?? 0),
      grounded: Boolean(body?.blocked.down || body?.touching.down),
      facing: this.facing,
      dashReady: Math.max(0, this.dashReadyAt - time),
    };
  }
}
