import { BaseLabScene } from './base-lab-scene.js';
import { RECIPES, canCraft, craft, dismantle, grantLabResources } from '../systems/crafting-model.js';
import { session } from '../systems/session.js';
import { THEME } from '../theme.js';
import { GENERATED_ATLAS, addAtlasArt, atlasHas } from '../systems/generated-art.js';

const RECIPE_ART = Object.freeze({
  iron_blade: { frame: 'skill_breaker', accent: 0xf3bd70, label: 'FORGE' },
  ember_tonic: { frame: 'skill_heal', accent: 0x65e2a6, label: 'ALCHEMY' },
  trail_stew: { frame: 'skill_impact', accent: 0xc995ff, label: 'COOKING' },
});

const INVENTORY_KEYS = ['iron', 'wood', 'herb', 'crystal', 'mushroom', 'iron_blade', 'ember_tonic', 'trail_stew'];
const INVENTORY_GLYPHS = { iron: 'Fe', wood: 'W', herb: 'H', crystal: '◇', mushroom: 'M', iron_blade: '⚔', ember_tonic: '+', trail_stew: '✦' };

export class CraftLabScene extends BaseLabScene {
  constructor() { super('CraftLab'); }

  create() {
    this.createLabChrome('Crafting Lab', 'A player-facing workbench with server-style validation hidden behind F2.', 0xe6bd67);
    this.selectedIndex = 0;
    this.logs = [];

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      craft: Phaser.Input.Keyboard.KeyCodes.ENTER,
      dismantle: Phaser.Input.Keyboard.KeyCodes.D,
      grant: Phaser.Input.Keyboard.KeyCodes.G,
    });

    this.createWorkbenchWorld();
    this.createRecipeRail();
    this.createRecipeFocus();
    this.createInventoryGrid();
    this.createDeveloperLog();

    this.pushLog('workbench ready · inventory loaded');
    this.pushLog('authority mock active · deterministic transaction path');
    this.renderCraftUi();
  }

  createWorkbenchWorld() {
    const { width } = this.scale;
    addAtlasArt(this, width / 2 + 15, 655, 'platform_arcane', { width: 740, alpha: 0.78 })?.setDepth(3);
    addAtlasArt(this, width - 80, 640, 'portal_arch', { height: 330, alpha: 0.42 })?.setDepth(1);
    addAtlasArt(this, 415, 625, 'arcane_lantern', { height: 190, alpha: 0.9 })?.setDepth(6);
    addAtlasArt(this, 820, 625, 'arcane_lantern', { height: 190, alpha: 0.9, flipX: true })?.setDepth(6);

    this.forgeSigil = addAtlasArt(this, 620, 435, 'portal_sigil', { height: 165, alpha: 0.27, originY: 0.5 })?.setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
    if (this.forgeSigil) this.tweens.add({ targets: this.forgeSigil, angle: 360, duration: 10000, repeat: -1, ease: 'Linear' });

    this.add.text(620, 145, 'ARCANE WORKBENCH', {
      fontFamily: 'Trebuchet MS', fontSize: '25px', fontStyle: '700', color: '#fff0cd', stroke: '#21162a', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(this.uiDepth + 2);
    this.add.text(620, 178, 'Choose a recipe · validate ingredients · commit the transaction', {
      fontFamily: 'Trebuchet MS', fontSize: '10px', color: '#d8c9cf', stroke: '#171421', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(this.uiDepth + 2);
  }

  createRecipeRail() {
    this.add.text(38, 112, 'RECIPES', { fontFamily: 'Trebuchet MS', fontSize: '11px', fontStyle: '700', color: '#f6db9a', stroke: '#161421', strokeThickness: 3 }).setDepth(this.uiDepth + 2);
    this.recipeRows = RECIPES.map((recipe, index) => {
      const art = RECIPE_ART[recipe.id] ?? { frame: 'skill_sigils', accent: 0xe6bd67, label: recipe.category.toUpperCase() };
      const y = 160 + index * 126;
      const c = this.add.container(44, y).setDepth(this.uiDepth + 2);
      const bg = this.add.graphics();
      const icon = atlasHas(this, art.frame)
        ? this.add.image(40, 40, GENERATED_ATLAS, art.frame).setDisplaySize(68, 68)
        : this.add.rectangle(40, 40, 64, 64, 0x433456, 1);
      const category = this.add.text(83, 11, art.label, { fontFamily: 'monospace', fontSize: '8px', color: Phaser.Display.Color.IntegerToColor(art.accent).rgba });
      const title = this.add.text(83, 29, recipe.name, { fontFamily: 'Trebuchet MS', fontSize: '13px', fontStyle: '700', color: '#fff2df' });
      const req = this.add.text(83, 52, Object.entries(recipe.ingredients).map(([k, v]) => `${k}×${v}`).join(' · '), { fontFamily: 'monospace', fontSize: '8px', color: '#a8a1ad' });
      const hit = this.add.rectangle(142, 40, 284, 80, 0xffffff, 0.0001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this.drawRecipeRow(bg, art.accent, index === this.selectedIndex, true));
      hit.on('pointerout', () => this.drawRecipeRow(bg, art.accent, index === this.selectedIndex, false));
      hit.on('pointerdown', () => { this.selectedIndex = index; this.renderCraftUi(); });
      c.add([bg, icon, category, title, req, hit]);
      return { c, bg, art, recipe };
    });
  }

  drawRecipeRow(bg, accent, selected, hover) {
    bg.clear();
    bg.fillStyle(selected ? 0x2f2330 : 0x10121f, hover ? 0.97 : 0.88).fillRoundedRect(0, 0, 284, 80, 9);
    bg.lineStyle(selected ? 2 : 1, selected || hover ? accent : 0x5c5669, selected ? 0.95 : hover ? 0.72 : 0.48).strokeRoundedRect(0, 0, 284, 80, 9);
    if (selected) bg.fillStyle(accent, 0.88).fillRect(0, 12, 3, 56);
  }

  createRecipeFocus() {
    const x = 365;
    const y = 208;
    const w = 510;
    const h = 350;
    const bg = this.add.graphics().setDepth(this.uiDepth + 1);
    bg.fillStyle(0x0b0d19, 0.72).fillRoundedRect(x, y, w, h, 14);
    bg.lineStyle(1, 0x76698b, 0.62).strokeRoundedRect(x, y, w, h, 14);
    bg.lineStyle(1, 0xe6bd67, 0.22).strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 10);

    this.focusIcon = atlasHas(this, 'skill_breaker')
      ? this.add.image(620, 322, GENERATED_ATLAS, 'skill_breaker').setDisplaySize(142, 142).setDepth(this.uiDepth + 3)
      : this.add.rectangle(620, 322, 130, 130, 0x382c45).setDepth(this.uiDepth + 3);
    this.workbenchCategory = this.add.text(620, 220, '', { fontFamily: 'monospace', fontSize: '9px', color: '#eacb86' }).setOrigin(0.5).setDepth(this.uiDepth + 3);
    this.workbenchTitle = this.add.text(620, 248, '', { fontFamily: 'Trebuchet MS', fontSize: '22px', fontStyle: '700', color: '#fff3dc' }).setOrigin(0.5).setDepth(this.uiDepth + 3);
    this.workbenchFlavor = this.add.text(620, 409, '', { fontFamily: 'Trebuchet MS', fontSize: '10px', color: '#bcb4c4', align: 'center', wordWrap: { width: 390 }, lineSpacing: 4 }).setOrigin(0.5, 0).setDepth(this.uiDepth + 3);
    this.workbenchIngredients = this.add.text(470, 462, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e0dbe3', lineSpacing: 7 }).setDepth(this.uiDepth + 3);
    this.validationText = this.add.text(760, 462, '', { fontFamily: 'monospace', fontSize: '9px', align: 'right', lineSpacing: 5 }).setOrigin(1, 0).setDepth(this.uiDepth + 3);

    this.makeButton(473, 524, 142, 'ENTER  CRAFT', () => this.craftSelected(), { accent: 0xe6bd67 });
    this.makeButton(633, 524, 142, 'D  SALVAGE', () => this.dismantleSelected(), { accent: 0xa87f59 });
  }

  createInventoryGrid() {
    const x = 920;
    const y = 126;
    const panel = this.add.graphics().setDepth(this.uiDepth + 1);
    panel.fillStyle(0x0b0e1a, 0.78).fillRoundedRect(x, y, 328, 430, 12);
    panel.lineStyle(1, 0x676177, 0.7).strokeRoundedRect(x, y, 328, 430, 12);
    this.add.text(x + 20, y + 17, 'BACKPACK', { fontFamily: 'Trebuchet MS', fontSize: '12px', fontStyle: '700', color: '#f1e8dc' }).setDepth(this.uiDepth + 2);
    this.add.text(x + 304, y + 19, 'G  REFILL', { fontFamily: 'monospace', fontSize: '8px', color: '#8fe1ac' }).setOrigin(1, 0).setDepth(this.uiDepth + 2);

    this.inventorySlots = INVENTORY_KEYS.map((key, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const sx = x + 24 + col * 148;
      const sy = y + 58 + row * 82;
      const g = this.add.graphics().setDepth(this.uiDepth + 2);
      g.fillStyle(0x171624, 0.96).fillRoundedRect(sx, sy, 132, 68, 8);
      g.lineStyle(1, 0x625a70, 0.78).strokeRoundedRect(sx, sy, 132, 68, 8);
      const orb = this.add.graphics().setDepth(this.uiDepth + 3);
      const hue = key.includes('iron') ? 0xadb9c9 : key === 'wood' ? 0xb37d52 : key === 'herb' ? 0x67d795 : key === 'crystal' ? 0x89c8ff : key === 'mushroom' ? 0xd78adf : 0xe9c26c;
      orb.fillStyle(hue, 0.2).fillCircle(sx + 31, sy + 34, 22);
      orb.lineStyle(1, hue, 0.8).strokeCircle(sx + 31, sy + 34, 20);
      this.add.text(sx + 31, sy + 34, INVENTORY_GLYPHS[key] ?? '•', { fontFamily: 'Trebuchet MS', fontSize: '15px', fontStyle: '700', color: '#fff5e4' }).setOrigin(0.5).setDepth(this.uiDepth + 4);
      this.add.text(sx + 60, sy + 17, key.replace('_', ' ').toUpperCase(), { fontFamily: 'monospace', fontSize: '7px', color: '#aaa3b1' }).setDepth(this.uiDepth + 4);
      const amount = this.add.text(sx + 60, sy + 35, '0', { fontFamily: 'Trebuchet MS', fontSize: '17px', fontStyle: '700', color: '#fff2dc' }).setDepth(this.uiDepth + 4);
      return { key, amount };
    });

    this.makeButton(x + 24, y + 392, 280, 'G  GRANT TEST RESOURCES', () => this.grantResources(), { accent: THEME.green });
  }

  createDeveloperLog() {
    const c = this.add.container(25, 545).setScrollFactor(0).setDepth(this.uiDepth + 20).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x080b12, 0.96).fillRoundedRect(0, 0, 335, 145, 8);
    bg.lineStyle(1, 0xe6bd67, 0.6).strokeRoundedRect(0, 0, 335, 145, 8);
    const title = this.add.text(14, 12, 'TRANSACTION LOG / F2', { fontFamily: 'monospace', fontSize: '9px', color: '#f1d08b' });
    this.logText = this.add.text(14, 34, '', { fontFamily: 'monospace', fontSize: '8px', color: '#9ba3af', lineSpacing: 3, wordWrap: { width: 305 } });
    c.add([bg, title, this.logText]);
    this.devOverlay = c;
  }

  pushLog(message) {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift(`[${stamp}] ${message}`);
    this.logs = this.logs.slice(0, 7);
    this.logText?.setText(this.logs.join('\n'));
  }

  craftSelected() {
    const recipe = RECIPES[this.selectedIndex];
    this.pushLog(`request craft:${recipe.id}`);
    const result = craft(session.inventory, recipe);
    if (!result.ok) {
      this.pushLog(`reject ${result.reason}`);
      this.cameras.main.shake(70, 0.002);
      this.toast('Craft rejected · missing resources', { accent: THEME.red, color: '#ffb1b7' });
    } else {
      session.inventory = result.inventory;
      this.pushLog('accept → inventory transaction committed');
      this.playCraftSuccess(recipe);
    }
    this.renderCraftUi();
  }

  playCraftSuccess(recipe) {
    const art = RECIPE_ART[recipe.id] ?? RECIPE_ART.iron_blade;
    this.vfx.castSigil(620, 342, { color: art.accent, scale: 1.2, duration: 460 });
    this.vfx.radialImpact(620, 342, { color: art.accent, power: 1.05 });
    this.vfx.shockwave(620, 342, { color: art.accent, scale: 1.28, duration: 420 });
    this.cameras.main.flash(90, 255, 240, 200, false);
    this.tweens.add({ targets: this.focusIcon, scaleX: this.focusIcon.scaleX * 1.15, scaleY: this.focusIcon.scaleY * 1.15, angle: 4, duration: 120, yoyo: true, ease: 'Back.easeOut' });
    this.toast(`${recipe.name} crafted`, { accent: art.accent });
  }

  dismantleSelected() {
    const recipe = RECIPES[this.selectedIndex];
    this.pushLog(`request salvage:${recipe.id}`);
    const result = dismantle(session.inventory, recipe);
    if (!result.ok) {
      this.pushLog(`reject ${result.reason}`);
      this.toast('Nothing to salvage', { accent: THEME.red, color: '#ffb1b7' });
    } else {
      session.inventory = result.inventory;
      this.pushLog('accept → salvage yield applied');
      this.vfx.groundDust(620, 360, { color: 0xd9c39f });
      this.vfx.burst(620, 350, { color: 0xaad5eb, count: 12, speed: 130, scale: 0.7 });
    }
    this.renderCraftUi();
  }

  grantResources() {
    session.inventory = grantLabResources(session.inventory);
    this.pushLog('dev grant → resource fixture replenished');
    this.vfx.heal(1080, 520);
    this.toast('Test resources replenished', { accent: THEME.green });
    this.renderCraftUi();
  }

  renderCraftUi() {
    const recipe = RECIPES[this.selectedIndex];
    const inventory = session.inventory;
    const art = RECIPE_ART[recipe.id] ?? { frame: 'skill_sigils', accent: 0xe6bd67, label: recipe.category.toUpperCase() };

    this.recipeRows.forEach((row, index) => this.drawRecipeRow(row.bg, row.art.accent, index === this.selectedIndex, false));
    if (atlasHas(this, art.frame)) this.focusIcon.setTexture(GENERATED_ATLAS, art.frame).setDisplaySize(142, 142);
    this.workbenchTitle.setText(recipe.name);
    this.workbenchCategory.setText(`${art.label}  ·  OUTPUT ×1`).setColor(Phaser.Display.Color.IntegerToColor(art.accent).rgba);
    this.workbenchFlavor.setText(recipe.flavor);
    this.workbenchIngredients.setText(Object.entries(recipe.ingredients).map(([item, needed]) => {
      const owned = inventory[item] ?? 0;
      return `${owned >= needed ? '✓' : '×'}  ${item.toUpperCase().padEnd(12)}  ${String(owned).padStart(2)} / ${needed}`;
    }));
    const ready = canCraft(inventory, recipe);
    this.validationText.setText(ready ? 'READY\nALL CHECKS PASS' : 'BLOCKED\nMISSING INPUTS').setColor(ready ? '#9defb5' : '#ffaaa1');
    this.inventorySlots.forEach((slot) => slot.amount.setText(String(inventory[slot.key] ?? 0)));
    this.logText?.setText(this.logs.join('\n'));
  }

  update() {
    if (!this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) { this.selectedIndex = (this.selectedIndex + RECIPES.length - 1) % RECIPES.length; this.renderCraftUi(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) { this.selectedIndex = (this.selectedIndex + 1) % RECIPES.length; this.renderCraftUi(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.craft)) this.craftSelected();
    if (Phaser.Input.Keyboard.JustDown(this.keys.dismantle)) this.dismantleSelected();
    if (Phaser.Input.Keyboard.JustDown(this.keys.grant)) this.grantResources();
  }
}
