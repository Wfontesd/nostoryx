import { BaseLabScene } from './base-lab-scene.js';
import { RECIPES, canCraft, craft, dismantle, grantLabResources } from '../systems/crafting-model.js';
import { session } from '../systems/session.js';
import { THEME } from '../theme.js';
import { GENERATED_ATLAS, addAtlasArt, atlasHas } from '../systems/generated-art.js';

const RECIPE_ART = Object.freeze({
  iron_blade: { frame: 'skill_breaker', accent: 0x70cfff },
  ember_tonic: { frame: 'skill_heal', accent: 0x72e2a4 },
  trail_stew: { frame: 'skill_impact', accent: 0xf4b861 },
});

const RESOURCE_COLORS = Object.freeze({
  iron: 0x89a8bd,
  wood: 0xc68a55,
  herb: 0x67d887,
  crystal: 0xb78cff,
  mushroom: 0xe195bb,
});

export class CraftLabScene extends BaseLabScene {
  constructor() { super('CraftLab'); }

  create() {
    this.createLabChrome('Arcane Workbench', 'Forge, alchemy and cooking presented as a player-facing crafting station.', 0xe6bd67);
    this.selectedIndex = 0;
    this.logs = [];
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      craft: Phaser.Input.Keyboard.KeyCodes.ENTER,
      dismantle: Phaser.Input.Keyboard.KeyCodes.D,
      grant: Phaser.Input.Keyboard.KeyCodes.G,
    });

    this.createForgeEnvironment();
    this.createRecipeBook();
    this.createWorkbench();
    this.createBackpack();
    this.createDeveloperOverlay();

    const hint = this.add.text(this.scale.width / 2, this.scale.height - 26, '↑ ↓  RECIPE      ENTER  CRAFT      D  SALVAGE      G  GRANT TEST MATERIALS', {
      fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#fff1cb', stroke: '#17101b', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(this.uiDepth + 8).setAlpha(0.82);
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 500, delay: 5200 });

    this.pushLog('lab ready · inventory loaded');
    this.pushLog('authority mock active · no backend yet');
    this.renderCraftUi();
  }

  createForgeEnvironment() {
    const altar = this.add.graphics().setDepth(3);
    altar.fillStyle(0x161422, 0.92).fillEllipse(640, 644, 520, 60);
    altar.fillStyle(0x2f2941, 1).fillRoundedRect(486, 566, 308, 82, 18);
    altar.lineStyle(3, 0xa7834e, 0.85).strokeRoundedRect(486, 566, 308, 82, 18);
    altar.lineStyle(1, 0xf5d28e, 0.42).strokeRoundedRect(498, 578, 284, 58, 12);
    altar.fillStyle(0xe7ba68, 0.78).fillCircle(640, 607, 11);

    if (atlasHas(this, 'arcane_lantern')) {
      addAtlasArt(this, 640, 617, 'arcane_lantern', { height: 174 })?.setDepth(5);
    }
    if (atlasHas(this, 'ruin_pillar')) {
      addAtlasArt(this, 462, 624, 'ruin_pillar', { height: 190 })?.setDepth(4);
      addAtlasArt(this, 818, 624, 'ruin_pillar', { height: 190, flipX: true })?.setDepth(4);
    }
    if (atlasHas(this, 'foliage_cluster')) {
      addAtlasArt(this, 350, 650, 'foliage_cluster', { height: 96 })?.setDepth(3);
      addAtlasArt(this, 930, 650, 'foliage_cluster', { height: 96, flipX: true })?.setDepth(3);
    }

    this.forgeSigil = atlasHas(this, 'vfx_sigil')
      ? this.add.image(640, 516, GENERATED_ATLAS, 'vfx_sigil').setDisplaySize(156, 156).setAlpha(0.28).setDepth(2).setBlendMode(Phaser.BlendModes.ADD)
      : this.add.image(640, 516, 'fx-rune').setScale(1.1).setAlpha(0.22).setDepth(2);
    this.tweens.add({ targets: this.forgeSigil, rotation: Math.PI * 2, duration: 11000, repeat: -1, ease: 'Linear' });
  }

  drawBookPanel(graphics, x, y, width, height, accent = 0xe6bd67) {
    graphics.fillStyle(0x15101b, 0.96).fillRoundedRect(x, y, width, height, 14);
    graphics.lineStyle(3, 0x9e7744, 0.9).strokeRoundedRect(x, y, width, height, 14);
    graphics.lineStyle(1, accent, 0.48).strokeRoundedRect(x + 10, y + 10, width - 20, height - 20, 9);
    graphics.fillStyle(0xf0c574, 0.82).fillTriangle(x, y, x + 34, y, x, y + 34);
    graphics.fillStyle(0xf0c574, 0.82).fillTriangle(x + width, y + height, x + width - 34, y + height, x + width, y + height - 34);
  }

  createRecipeBook() {
    const x = 24;
    const y = 90;
    const width = 340;
    const height = 520;
    const panel = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.drawBookPanel(panel, x, y, width, height);
    this.add.text(x + 28, y + 24, 'THE MAKER’S LEDGER', { fontFamily: 'Trebuchet MS', fontSize: '18px', fontStyle: '700', color: '#fff0ce' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.add.text(x + 29, y + 51, 'KNOWN RECIPES', { fontFamily: 'monospace', fontSize: '8px', color: '#c99e60' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);

    this.recipeRows = RECIPES.map((recipe, index) => {
      const rowY = y + 84 + index * 118;
      const container = this.add.container(x + 22, rowY).setScrollFactor(0).setDepth(this.uiDepth + 4);
      const background = this.add.graphics();
      const hit = this.add.rectangle(148, 48, 296, 96, 0xffffff, 0.0001).setInteractive({ useHandCursor: true });
      const art = RECIPE_ART[recipe.id];
      const icon = atlasHas(this, art.frame)
        ? this.add.image(47, 46, GENERATED_ATLAS, art.frame).setDisplaySize(72, 72)
        : this.add.rectangle(47, 46, 68, 68, 0x2b2330, 1);
      const category = this.add.text(92, 15, recipe.category.toUpperCase(), { fontFamily: 'monospace', fontSize: '7px', color: Phaser.Display.Color.IntegerToColor(art.accent).rgba });
      const title = this.add.text(92, 31, recipe.name, { fontFamily: 'Trebuchet MS', fontSize: '12px', fontStyle: '700', color: '#f5e9d3' });
      const requirements = this.add.text(92, 58, Object.entries(recipe.ingredients).map(([item, quantity]) => `${item} ×${quantity}`).join('   '), {
        fontFamily: 'monospace', fontSize: '8px', color: '#aa9c91', wordWrap: { width: 186 },
      });
      hit.on('pointerdown', () => { this.selectedIndex = index; this.renderCraftUi(); });
      container.add([background, hit, icon, category, title, requirements]);
      return { container, background, recipe, art };
    });

    this.makeButton(x + 32, y + 456, 132, 'ENTER  CRAFT', () => this.craftSelected(), { accent: 0xe6bd67 });
    this.makeButton(x + 176, y + 456, 132, 'D  SALVAGE', () => this.dismantleSelected(), { accent: 0xc48d55 });
  }

  createWorkbench() {
    const x = 390;
    const y = 90;
    const width = 500;
    const height = 402;
    const panel = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.drawBookPanel(panel, x, y, width, height, 0xc69cff);
    this.add.text(x + 30, y + 24, 'ACTIVE FORMULA', { fontFamily: 'monospace', fontSize: '8px', color: '#d3a7ff' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.workbenchTitle = this.add.text(x + 30, y + 45, '', { fontFamily: 'Trebuchet MS', fontSize: '24px', fontStyle: '700', color: '#fff0d5' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.workbenchCategory = this.add.text(x + 32, y + 82, '', { fontFamily: 'monospace', fontSize: '8px', color: '#caa36a' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.workbenchFlavor = this.add.text(x + 30, y + 108, '', { fontFamily: 'Trebuchet MS', fontSize: '11px', color: '#baaeb5', wordWrap: { width: 258 }, lineSpacing: 4 })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);

    const previewFrame = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 2);
    previewFrame.fillStyle(0x090815, 0.9).fillCircle(x + 385, y + 122, 84);
    previewFrame.lineStyle(3, 0xa9804b, 0.88).strokeCircle(x + 385, y + 122, 80);
    previewFrame.lineStyle(1, 0xc394ff, 0.55).strokeCircle(x + 385, y + 122, 68);
    this.previewArt = this.add.image(x + 385, y + 122, GENERATED_ATLAS, 'skill_breaker').setDisplaySize(130, 130).setScrollFactor(0).setDepth(this.uiDepth + 4);

    this.ingredientContainers = [];
    for (let index = 0; index < 4; index += 1) {
      const ingredientX = x + 32 + index * 108;
      const ingredientY = y + 234;
      const container = this.add.container(ingredientX, ingredientY).setScrollFactor(0).setDepth(this.uiDepth + 4);
      const frame = this.add.graphics();
      const orb = this.add.graphics();
      const label = this.add.text(42, 68, '', { fontFamily: 'monospace', fontSize: '7px', color: '#d8c9b7', align: 'center' }).setOrigin(0.5, 0);
      const count = this.add.text(42, 88, '', { fontFamily: 'monospace', fontSize: '8px', color: '#f4e4c0' }).setOrigin(0.5, 0);
      container.add([frame, orb, label, count]);
      this.ingredientContainers.push({ container, frame, orb, label, count });
    }

    this.validationText = this.add.text(x + 32, y + 355, '', { fontFamily: 'monospace', fontSize: '9px', color: '#8fe0ab' })
      .setScrollFactor(0).setDepth(this.uiDepth + 4);
    this.craftActionLabel = this.add.text(x + width - 30, y + 355, 'ENTER  FORGE', { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: '700', color: '#f5cb7c' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 4);
  }

  createBackpack() {
    const x = 916;
    const y = 90;
    const width = 340;
    const height = 520;
    const panel = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.drawBookPanel(panel, x, y, width, height, 0x79d9a0);
    this.add.text(x + 28, y + 24, 'FIELD SATCHEL', { fontFamily: 'Trebuchet MS', fontSize: '18px', fontStyle: '700', color: '#eff7df' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);
    this.add.text(x + 29, y + 51, 'MATERIAL RESERVES', { fontFamily: 'monospace', fontSize: '8px', color: '#85c99c' })
      .setScrollFactor(0).setDepth(this.uiDepth + 3);

    this.inventoryRows = [];
    const keys = ['iron', 'wood', 'herb', 'crystal', 'mushroom', 'iron_blade', 'ember_tonic', 'trail_stew'];
    keys.forEach((item, index) => {
      const rowY = y + 84 + index * 46;
      const orb = this.add.graphics().setScrollFactor(0).setDepth(this.uiDepth + 4);
      const label = this.add.text(x + 70, rowY + 5, item.replace('_', ' ').toUpperCase(), { fontFamily: 'Trebuchet MS', fontSize: '9px', fontStyle: '700', color: '#ded5c6' })
        .setScrollFactor(0).setDepth(this.uiDepth + 4);
      const value = this.add.text(x + width - 34, rowY + 4, '0', { fontFamily: 'monospace', fontSize: '11px', color: '#fff0c8' })
        .setOrigin(1, 0).setScrollFactor(0).setDepth(this.uiDepth + 4);
      this.inventoryRows.push({ item, orb, label, value, x: x + 45, y: rowY + 12 });
    });

    this.makeButton(x + 30, y + 456, width - 60, 'G  GRANT TEST MATERIALS', () => this.grantResources(), { accent: THEME.green });
  }

  createDeveloperOverlay() {
    const container = this.add.container(388, 506).setScrollFactor(0).setDepth(this.uiDepth + 20).setVisible(false);
    const panel = this.add.graphics();
    panel.fillStyle(0x080914, 0.96).fillRoundedRect(0, 0, 502, 130, 8);
    panel.lineStyle(1, 0xe6bd67, 0.6).strokeRoundedRect(0, 0, 502, 130, 8);
    const title = this.add.text(16, 12, 'SERVER-AUTHORITY MOCK / F2', { fontFamily: 'monospace', fontSize: '9px', color: '#f1ca7f' });
    this.logText = this.add.text(16, 35, '', { fontFamily: 'monospace', fontSize: '8px', color: '#9f98a2', lineSpacing: 3, wordWrap: { width: 468 } });
    container.add([panel, title, this.logText]);
    this.devOverlay = container;
  }

  pushLog(message) {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift(`[${stamp}] ${message}`);
    this.logs = this.logs.slice(0, 8);
    this.logText?.setText(this.logs.join('\n'));
  }

  animateForge(recipe, success = true) {
    const art = RECIPE_ART[recipe.id];
    if (success) {
      this.vfx.castSigil(640, 510, { color: art.accent, scale: 1.18, duration: 650 });
      this.vfx.shockwave(640, 546, { color: art.accent, scale: 1.8, duration: 520 });
      this.vfx.radialImpact(640, 540, { color: art.accent, power: 1.15 });
      this.vfx.burst(640, 535, { color: art.accent, count: 24, speed: 260, scale: 0.95 });
      this.cameras.main.shake(100, 0.004);
      this.tweens.add({ targets: this.previewArt, scaleX: 1.12, scaleY: 1.12, duration: 120, ease: 'Back.easeOut', yoyo: true });
    } else {
      this.vfx.burst(640, 535, { color: THEME.red, count: 9, speed: 95, scale: 0.5 });
    }
  }

  craftSelected() {
    const recipe = RECIPES[this.selectedIndex];
    this.pushLog(`request craft:${recipe.id}`);
    const result = craft(session.inventory, recipe);
    if (!result.ok) {
      this.pushLog(`reject ${result.reason}`);
      this.animateForge(recipe, false);
      this.toast('Missing materials', { accent: THEME.red, color: '#ffb1b8' });
    } else {
      session.inventory = result.inventory;
      this.pushLog('accept → inventory transaction committed');
      this.animateForge(recipe, true);
      this.toast(`${recipe.name} forged`, { accent: RECIPE_ART[recipe.id].accent });
    }
    this.renderCraftUi();
  }

  dismantleSelected() {
    const recipe = RECIPES[this.selectedIndex];
    this.pushLog(`request salvage:${recipe.id}`);
    const result = dismantle(session.inventory, recipe);
    if (!result.ok) {
      this.pushLog(`reject ${result.reason}`);
      this.toast('Nothing to salvage', { accent: THEME.red, color: '#ffb1b8' });
    } else {
      session.inventory = result.inventory;
      this.pushLog('accept → salvage yield applied');
      this.vfx.burst(640, 535, { color: 0xb7d7ea, count: 14, speed: 145, scale: 0.65 });
      this.toast(`${recipe.name} salvaged`, { accent: 0x9fc0d2 });
    }
    this.renderCraftUi();
  }

  grantResources() {
    session.inventory = grantLabResources(session.inventory);
    this.pushLog('dev grant → resource fixture replenished');
    this.vfx.heal(1068, 535);
    this.toast('Test materials granted', { accent: THEME.green });
    this.renderCraftUi();
  }

  renderCraftUi() {
    const recipe = RECIPES[this.selectedIndex];
    const inventory = session.inventory;
    const art = RECIPE_ART[recipe.id];

    this.recipeRows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      row.background.clear();
      row.background.fillStyle(selected ? 0x33263a : 0x18131d, selected ? 0.98 : 0.88).fillRoundedRect(0, 0, 296, 96, 10);
      row.background.lineStyle(selected ? 2 : 1, selected ? row.art.accent : 0x6f5948, selected ? 0.9 : 0.5).strokeRoundedRect(0, 0, 296, 96, 10);
      row.container.setX(46 + (selected ? 5 : 0));
    });

    this.workbenchTitle.setText(recipe.name);
    this.workbenchCategory.setText(`${recipe.category.toUpperCase()} · OUTPUT 1`);
    this.workbenchFlavor.setText(recipe.flavor);
    if (atlasHas(this, art.frame)) this.previewArt.setTexture(GENERATED_ATLAS, art.frame).setDisplaySize(130, 130);

    const ingredients = Object.entries(recipe.ingredients);
    this.ingredientContainers.forEach((slot, index) => {
      const entry = ingredients[index];
      slot.container.setVisible(Boolean(entry));
      if (!entry) return;
      const [item, needed] = entry;
      const owned = inventory[item] ?? 0;
      const available = owned >= needed;
      const color = RESOURCE_COLORS[item] ?? 0xc9b98e;
      slot.frame.clear();
      slot.frame.fillStyle(0x15111c, 0.96).fillRoundedRect(0, 0, 84, 106, 9);
      slot.frame.lineStyle(2, available ? color : THEME.red, available ? 0.8 : 0.72).strokeRoundedRect(0, 0, 84, 106, 9);
      slot.orb.clear();
      slot.orb.fillStyle(color, 0.18).fillCircle(42, 38, 27);
      slot.orb.lineStyle(3, color, 0.8).strokeCircle(42, 38, 22);
      slot.orb.fillStyle(color, 0.95).fillCircle(42, 38, 8);
      slot.label.setText(item.toUpperCase());
      slot.count.setText(`${owned} / ${needed}`).setColor(available ? '#eaf9e9' : '#ff9eaa');
    });

    const ready = canCraft(inventory, recipe);
    this.validationText.setText(ready ? '◆ FORMULA STABLE · READY TO FORGE' : '◇ FORMULA INCOMPLETE · MATERIALS MISSING');
    this.validationText.setColor(ready ? '#9ce8ad' : '#ff9eaa');
    this.craftActionLabel.setColor(ready ? '#f5cb7c' : '#7e6f68');

    this.inventoryRows.forEach((row) => {
      const quantity = inventory[row.item] ?? 0;
      const color = RESOURCE_COLORS[row.item] ?? RECIPE_ART[row.item]?.accent ?? 0xc8b07b;
      row.orb.clear();
      row.orb.fillStyle(color, 0.18).fillCircle(row.x, row.y, 14);
      row.orb.lineStyle(2, color, 0.72).strokeCircle(row.x, row.y, 11);
      row.orb.fillStyle(color, 0.95).fillCircle(row.x, row.y, 4);
      row.value.setText(String(quantity).padStart(2));
      row.label.setAlpha(quantity > 0 ? 1 : 0.46);
    });
    this.logText?.setText(this.logs.join('\n'));
  }

  update() {
    if (!this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.selectedIndex = (this.selectedIndex + RECIPES.length - 1) % RECIPES.length;
      this.renderCraftUi();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % RECIPES.length;
      this.renderCraftUi();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.craft)) this.craftSelected();
    if (Phaser.Input.Keyboard.JustDown(this.keys.dismantle)) this.dismantleSelected();
    if (Phaser.Input.Keyboard.JustDown(this.keys.grant)) this.grantResources();
  }
}
