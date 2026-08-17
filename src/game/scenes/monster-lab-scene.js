import { BaseLabScene } from './base-lab-scene.js';
import { PlayerController } from '../systems/player-controller.js';
import { MONSTER_TYPES, decideMonsterState, movementForState } from '../systems/monster-model.js';
import { session } from '../systems/session.js';
import { THEME } from '../theme.js';
import { MONSTER_ART, addAtlasArt, atlasHas, setAtlasArt } from '../systems/generated-art.js';

export class MonsterLabScene extends BaseLabScene {
  constructor() { super('MonsterLab'); }

  create() {
    this.createLabChrome('Monster Lab', 'Readable archetypes, AI state changes and attack telegraphs.', THEME.green);
    this.physics.world.setBounds(0, 54, this.scale.width, this.scale.height - 54);
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

    this.createDevOverlay();
    this.createPlayerVitals();
    const hint = this.add.text(this.scale.width / 2, this.scale.height - 34, 'Q  SLIME     W  WISP     E  BRUTE     C  AI     G  GOD     X  CLEAR', {
      fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#ecf9ed', stroke: '#101520', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 5).setAlpha(0.78);
    this.tweens.add({ targets: hint, alpha: 0.28, duration: 500, delay: 4500 });

    this.spawnMonster('slime', 760);
    this.spawnMonster('wisp', 920);
    this.spawnMonster('brute', 1090);
  }

  createDevOverlay() {
    const c = this.add.container(18, 116).setScrollFactor(0).setDepth(this.uiDepth + 12).setVisible(false);
    const panel = this.add.graphics();
    panel.fillStyle(0x0d1515, 0.94).fillRoundedRect(0, 0, 308, 212, 8);
    panel.lineStyle(1, THEME.green, 0.65).strokeRoundedRect(0, 0, 308, 212, 8);
    const title = this.add.text(16, 13, 'AI TELEMETRY / F2', { fontFamily: 'monospace', fontSize: '10px', color: '#9ee3b5' });
    this.monsterDebug = this.add.text(16, 38, 'ready', { fontFamily: 'monospace', fontSize: '10px', color: '#d8e3da', lineSpacing: 5 });
    const help = this.add.text(16, 164, 'Q/W/E spawn · X clear · C AI · G god', { fontFamily: 'monospace', fontSize: '9px', color: '#9baaa0' });
    c.add([panel, title, this.monsterDebug, help]);
    this.devOverlay = c;
  }

  createPlayerVitals() {
    const x = 26;
    const y = 74;
    this.vitalFrame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 4);
    this.vitalFrame.fillStyle(0x111520, 0.88).fillRoundedRect(x, y, 232, 42, 8);
    this.vitalFrame.lineStyle(1, 0x647365, 0.9).strokeRoundedRect(x, y, 232, 42, 8);
    this.vitalFrame.fillStyle(0x351a25, 1).fillRoundedRect(x + 14, y + 20, 196, 10, 4);
    this.playerHpBar = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 5);
    this.add.text(x + 14, y + 5, 'ADVENTURER', { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#eaf6ed' }).setScrollFactor(0).setDepth(this.uiDepth + 5);
    this.playerHpText = this.add.text(x + 210, y + 5, '', { fontFamily: 'monospace', fontSize: '9px', color: '#f4d8d8' }).setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 5);
    this.renderPlayerVitals();
  }

  renderPlayerVitals() {
    const ratio = Math.max(0, this.playerHp / 100);
    this.playerHpBar?.clear().fillStyle(0xe25764, 1).fillRoundedRect(40, 96, 192 * ratio, 6, 3);
    this.playerHpText?.setText(`${this.playerHp}/100${session.flags.godMode ? ' · GOD' : ''}`);
  }

  monsterPose(typeId, state) {
    if (state === 'attack') return 'attack';
    if (state === 'chase' || state === 'retreat') return 'move';
    return 'idle';
  }

  spawnMonster(typeId, x = Phaser.Math.Between(650, 1120)) {
    const config = MONSTER_TYPES[typeId];
    if (!config) return;
    const y = typeId === 'wisp' ? Phaser.Math.Between(410, 520) : 570;
    const generated = atlasHas(this, MONSTER_ART[typeId]?.idle?.frame);
    const sprite = this.physics.add.sprite(x, y, typeId).setDepth(20).setCollideWorldBounds(true).setVisible(!generated);
    if (typeId === 'wisp') {
      sprite.body.setAllowGravity(false);
      sprite.body.setSize(38, 42).setOffset(5, 5);
    } else {
      sprite.body.setSize(typeId === 'brute' ? 55 : 45, typeId === 'brute' ? 72 : 36);
      this.physics.add.collider(sprite, this.ground);
    }

    let art = null;
    if (generated) {
      const artCfg = MONSTER_ART[typeId].idle;
      art = addAtlasArt(this, x, y + (typeId === 'brute' ? 48 : typeId === 'slime' ? 20 : 0), artCfg.frame, { height: artCfg.height });
      art?.setDepth(20);
    }

    sprite.setData({ typeId, hp: config.hp, maxHp: config.hp, state: 'idle', nextAttackAt: 0, spawnX: x, art, artPose: 'idle' });
    const stateLabel = this.add.text(x, y - (typeId === 'brute' ? 92 : 62), '', {
      fontFamily: 'Trebuchet MS', fontSize: '9px', fontStyle: '700', color: '#dce8df', backgroundColor: '#0b1118bb', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(35).setAlpha(0.74);
    sprite.setData('stateLabel', stateLabel);
    this.monsters.push(sprite);
    this.vfx.shockwave(x, y, { color: config.color, scale: 0.72, duration: 280 });
    return sprite;
  }

  setMonsterArt(monster, pose, hold = 0) {
    const art = monster.getData('art');
    if (!art) return;
    const typeId = monster.getData('typeId');
    const cfg = MONSTER_ART[typeId]?.[pose] ?? MONSTER_ART[typeId]?.idle;
    if (!cfg) return;
    if (monster.getData('artPose') !== pose) {
      setAtlasArt(art, cfg.frame, { height: cfg.height, flipX: monster.flipX });
      monster.setData('artPose', pose);
    }
    art.setFlipX(monster.flipX);
    if (hold > 0) monster.setData('artLockUntil', this.time.now + hold);
  }

  syncMonsterArt(monster) {
    const art = monster.getData('art');
    if (!art) return;
    const typeId = monster.getData('typeId');
    const baseY = typeId === 'brute' ? 48 : typeId === 'slime' ? 20 : 0;
    art.setPosition(monster.x, monster.y + baseY).setFlipX(monster.flipX);
  }

  clearMonsters() {
    for (const monster of this.monsters) {
      monster.getData('stateLabel')?.destroy();
      monster.getData('art')?.destroy();
      monster.destroy();
    }
    this.monsters = [];
    this.toast('Monster sandbox cleared', { accent: THEME.green });
  }

  updateMonster(monster, time) {
    if (!monster.active) return;
    const typeId = monster.getData('typeId');
    const config = MONSTER_TYPES[typeId];
    const distance = Phaser.Math.Distance.Between(monster.x, monster.y, this.player.x, this.player.y);
    const hpRatio = monster.getData('hp') / monster.getData('maxHp');
    const state = this.aiEnabled
      ? decideMonsterState({ distance, hpRatio, aggroRange: config.aggroRange, attackRange: config.attackRange })
      : 'idle';
    monster.setData('state', state);

    const vx = movementForState({ state, monsterX: monster.x, playerX: this.player.x, speed: config.speed });
    monster.setVelocityX(vx);
    monster.setFlipX(vx < 0 || (vx === 0 && this.player.x < monster.x));
    if (typeId === 'wisp') monster.setVelocityY(Math.sin((time + monster.x) / 410) * 24);

    if (time >= Number(monster.getData('artLockUntil') ?? 0)) this.setMonsterArt(monster, this.monsterPose(typeId, state));
    this.syncMonsterArt(monster);

    const stateLabel = monster.getData('stateLabel');
    stateLabel?.setPosition(monster.x, monster.y - (typeId === 'brute' ? 92 : 62));
    stateLabel?.setText(`${config.label.toUpperCase()} · ${state.toUpperCase()}`);
    stateLabel?.setColor(state === 'attack' ? '#ffd09a' : state === 'chase' ? '#a4efbb' : '#c6d2c9');

    if (state === 'attack' && time >= monster.getData('nextAttackAt')) {
      monster.setData('nextAttackAt', time + 1050);
      this.setMonsterArt(monster, 'attack', typeId === 'brute' ? 350 : 220);
      const facing = Math.sign(this.player.x - monster.x) || 1;
      this.time.delayedCall(typeId === 'brute' ? 210 : 120, () => {
        if (!monster.active) return;
        this.vfx.slash(monster.x, monster.y, facing, { color: config.color, heavy: typeId === 'brute' });
        if (!session.flags.godMode) this.playerHp = Math.max(0, this.playerHp - (typeId === 'brute' ? 18 : 8));
        const playerArt = this.heroArt();
        playerArt?.setTint(THEME.red);
        this.time.delayedCall(90, () => playerArt?.clearTint());
        this.cameras.main.shake(65, 0.003);
        this.renderPlayerVitals();
      });
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
      this.renderPlayerVitals();
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
