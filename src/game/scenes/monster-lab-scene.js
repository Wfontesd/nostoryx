import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { MONSTER_TYPES, decideMonsterState, movementForState } from '../systems/monster-model.js';
import { session } from '../systems/session.js';
import { THEME } from '../theme.js';

export class MonsterLabScene extends BaseLabScene {
  constructor() { super('MonsterLab'); }

  create() {
    this.createLabChrome('Monster Lab', 'Spawn archetypes and inspect their AI states without quest or world noise.', THEME.green);
    this.physics.world.setBounds(0, 76, this.scale.width, this.scale.height - 76);
    this.ground = this.createGround(650);

    this.player = this.createPlayer(240, 590);
    this.controller = new PlayerController(this, this.player, { speed: 280, jumpSpeed: 620, dashSpeed: 710 });
    this.physics.add.collider(this.player, this.ground);
    this.playerHp = 100;
    this.monsters = [];

    this.labKeys = this.input.keyboard.addKeys({
      slime: Phaser.Input.Keyboard.KeyCodes.Q,
      wisp: Phaser.Input.Keyboard.KeyCodes.W,
      brute: Phaser.Input.Keyboard.KeyCodes.E,
      clear: Phaser.Input.Keyboard.KeyCodes.X,
      god: Phaser.Input.Keyboard.KeyCodes.G,
      aggression: Phaser.Input.Keyboard.KeyCodes.C,
    });
    this.aiEnabled = true;

    this.makePanel(22, 104, 326, 226, { accent: THEME.green });
    this.add.text(40, 122, 'SPAWNER / AI TELEMETRY', { fontFamily: 'monospace', fontSize: '11px', color: '#88e2aa' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.monsterDebug = this.makeDebugText(40, 150, 'ready');
    this.add.text(40, 276, 'Q slime   W wisp   E brute   X clear\nC AI on/off   G god mode', { fontFamily: 'monospace', fontSize: '10px', color: '#718096', lineSpacing: 4 }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.makePanel(this.scale.width - 330, 104, 308, 166, { accent: 0x477d58, alpha: 0.86 });
    this.add.text(this.scale.width - 310, 122, 'ARCHETYPE INTENT', { fontFamily: 'monospace', fontSize: '10px', color: '#9ee3b5' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.add.text(this.scale.width - 310, 150,
      'SLIME   short aggro / basic chase\nWISP    faster / long awareness\nBRUTE   slow / high HP / heavy range\n\nEvery monster exposes its current AI state\ndirectly over the entity for tuning.',
      { fontFamily: 'monospace', fontSize: '10px', color: '#c3cdd9', lineSpacing: 4 },
    ).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.spawnMonster('slime', 780);
    this.spawnMonster('wisp', 930);
    this.spawnMonster('brute', 1090);
  }

  spawnMonster(typeId, x = Phaser.Math.Between(650, 1120)) {
    const config = MONSTER_TYPES[typeId];
    if (!config) return;
    const texture = typeId;
    const y = typeId === 'wisp' ? Phaser.Math.Between(410, 520) : 570;
    const sprite = this.physics.add.sprite(x, y, texture).setDepth(20).setCollideWorldBounds(true);
    if (typeId === 'wisp') {
      sprite.body.setAllowGravity(false);
      sprite.body.setSize(38, 42).setOffset(5, 5);
    } else {
      sprite.body.setSize(typeId === 'brute' ? 55 : 45, typeId === 'brute' ? 72 : 36);
      this.physics.add.collider(sprite, this.ground);
    }
    sprite.setData({
      typeId,
      hp: config.hp,
      maxHp: config.hp,
      state: 'idle',
      nextAttackAt: 0,
      spawnX: x,
    });
    const stateLabel = this.add.text(x, y - 58, 'IDLE', { fontFamily: 'monospace', fontSize: '9px', color: '#aab6c7', backgroundColor: '#080c13aa', padding: { x: 5, y: 3 } }).setOrigin(0.5).setDepth(35);
    sprite.setData('stateLabel', stateLabel);
    this.monsters.push(sprite);
    this.vfx.shockwave(x, y, { color: config.color, scale: 0.8, duration: 300 });
    return sprite;
  }

  clearMonsters() {
    for (const monster of this.monsters) {
      monster.getData('stateLabel')?.destroy();
      monster.destroy();
    }
    this.monsters = [];
    this.toast('Monster sandbox cleared', { accent: THEME.green });
  }

  updateMonster(monster, time) {
    if (!monster.active) return;
    const config = MONSTER_TYPES[monster.getData('typeId')];
    const distance = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);
    const hpRatio = monster.getData('hp') / monster.getData('maxHp');
    const state = this.aiEnabled
      ? decideMonsterState({ distance, hpRatio, aggroRange: config.aggroRange, attackRange: config.attackRange })
      : 'idle';
    monster.setData('state', state);

    const vx = movementForState({ state, monsterX: monster.x, playerX: this.player.x, speed: config.speed });
    monster.setVelocityX(vx);
    monster.setFlipX(vx < 0);
    if (monster.getData('typeId') === 'wisp') {
      monster.setVelocityY(Math.sin((time + monster.x) / 410) * 24);
    }

    const stateLabel = monster.getData('stateLabel');
    stateLabel?.setPosition(monster.x, monster.y - (monster.getData('typeId') === 'brute' ? 64 : 50));
    stateLabel?.setText(`${config.label.toUpperCase()} · ${state.toUpperCase()}`);
    stateLabel?.setColor(state === 'attack' ? '#ffbb7a' : state === 'chase' ? '#8fe5aa' : '#9ba8ba');

    if (state === 'attack' && time >= monster.getData('nextAttackAt')) {
      monster.setData('nextAttackAt', time + 1050);
      this.vfx.slash(monster.x, monster.y, Math.sign(this.player.x - monster.x) || 1, { color: config.color, heavy: monster.getData('typeId') === 'brute' });
      if (!session.flags.godMode) this.playerHp = Math.max(0, this.playerHp - (monster.getData('typeId') === 'brute' ? 18 : 8));
      this.player.setTint(THEME.red);
      this.time.delayedCall(90, () => this.player?.clearTint());
      this.cameras.main.shake(65, 0.003);
    }
  }

  update(time) {
    this.controller?.update(time);
    if (!this.labKeys) return;

    if (Phaser.Input.Keyboard.JustDown(this.labKeys.slime)) this.spawnMonster('slime');
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.wisp)) this.spawnMonster('wisp');
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.brute)) this.spawnMonster('brute');
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.clear)) this.clearMonsters();
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.aggression)) { this.aiEnabled = !this.aiEnabled; this.toast(`AI simulation ${this.aiEnabled ? 'ON' : 'OFF'}`, { accent: THEME.green }); }
    if (Phaser.Input.Keyboard.JustDown(this.labKeys.god)) {
      session.patchFlags({ godMode: !session.flags.godMode });
      this.toast(`God mode ${session.flags.godMode ? 'ON' : 'OFF'}`, { accent: THEME.green });
      if (session.flags.godMode) this.playerHp = 100;
    }

    for (const monster of this.monsters) this.updateMonster(monster, time);
    this.monsters = this.monsters.filter((monster) => monster.active);

    const counts = { idle: 0, chase: 0, attack: 0, retreat: 0 };
    for (const monster of this.monsters) counts[monster.getData('state')] = (counts[monster.getData('state')] ?? 0) + 1;
    this.monsterDebug?.setText([
      `entities        ${String(this.monsters.length).padStart(2)}`,
      `AI simulation   ${this.aiEnabled ? 'ON' : 'OFF'}`,
      `idle            ${counts.idle ?? 0}`,
      `chase           ${counts.chase ?? 0}`,
      `attack          ${counts.attack ?? 0}`,
      `retreat         ${counts.retreat ?? 0}`,
      `player hp       ${String(this.playerHp).padStart(3)} / 100`,
      `god mode        ${session.flags.godMode ? 'ON' : 'OFF'}`,
    ]);
  }
}
