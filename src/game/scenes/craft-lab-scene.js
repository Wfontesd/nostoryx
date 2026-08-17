import { BaseLabScene } from './base-lab-scene.js';
import { RECIPES, canCraft, craft, dismantle, grantLabResources } from '../systems/crafting-model.js';
import { session } from '../systems/session.js';
import { THEME } from '../theme.js';

export class CraftLabScene extends BaseLabScene {
  constructor() { super('CraftLab'); }

  create() {
    this.createLabChrome('Crafting Lab', 'Exercise recipes, inventory mutations and future server-authoritative validation.', 0xe6bd67);
    this.selectedIndex = 0;
    this.logs = [];

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      craft: Phaser.Input.Keyboard.KeyCodes.ENTER,
      dismantle: Phaser.Input.Keyboard.KeyCodes.D,
      grant: Phaser.Input.Keyboard.KeyCodes.G,
      resetInventory: Phaser.Input.Keyboard.KeyCodes.Z,
    });

    this.makePanel(22, 104, 328, 500, { accent: 0xe6bd67 });
    this.add.text(42, 124, 'RECIPES', { fontFamily: 'monospace', fontSize: '11px', color: '#f0cf86' }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.recipeRows = RECIPES.map((recipe, index) => {
      const y = 162 + index * 92;
      const container = this.add.container(42, y).setScrollFactor(0).setDepth(this.uiDepth + 2);
      const bg = this.add.graphics();
      const hit = this.add.rectangle(140, 34, 280, 68, 0xffffff, 0.0001).setInteractive({ useHandCursor: true });
      const title = this.add.text(18, 11, `${recipe.category.toUpperCase()}  /  ${recipe.name}`, { fontFamily: 'system-ui', fontSize: '12px', fontStyle: '700', color: '#f2f4f8' });
      const req = this.add.text(18, 38, Object.entries(recipe.ingredients).map(([k, v]) => `${k}×${v}`).join('   '), { fontFamily: 'monospace', fontSize: '10px', color: '#8d99ab' });
      hit.on('pointerdown', () => { this.selectedIndex = index; this.renderCraftUi(); });
      container.add([bg, hit, title, req]);
      return { container, bg, recipe };
    });

    this.makeButton(42, 476, 132, 'ENTER  CRAFT', () => this.craftSelected(), { accent: 0xe6bd67 });
    this.makeButton(190, 476, 132, 'D  SALVAGE', () => this.dismantleSelected(), { accent: 0xb99054 });
    this.makeButton(42, 522, 280, 'G  GRANT TEST RESOURCES', () => this.grantResources(), { accent: THEME.green });

    this.makePanel(370, 104, 480, 500, { accent: 0xa8844c, alpha: 0.93 });
    this.add.text(392, 124, 'WORKBENCH', { fontFamily: 'monospace', fontSize: '11px', color: '#f2cb80' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.workbenchTitle = this.add.text(392, 162, '', { fontFamily: 'system-ui', fontSize: '24px', fontStyle: '800', color: '#f3f5f8' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.workbenchCategory = this.add.text(392, 198, '', { fontFamily: 'monospace', fontSize: '10px', color: '#c6a76e' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.workbenchFlavor = this.add.text(392, 232, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#aab4c3', wordWrap: { width: 410 }, lineSpacing: 5 }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.workbenchIngredients = this.add.text(392, 318, '', { fontFamily: 'monospace', fontSize: '12px', color: '#d7dfeb', lineSpacing: 9 }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.validationText = this.add.text(392, 494, '', { fontFamily: 'monospace', fontSize: '10px', color: '#8fe0ab', lineSpacing: 4 }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.makePanel(870, 104, 388, 500, { accent: 0x5a6473, alpha: 0.9 });
    this.add.text(892, 124, 'INVENTORY / VALIDATION LOG', { fontFamily: 'monospace', fontSize: '11px', color: '#b9c1ce' }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.inventoryText = this.add.text(892, 162, '', { fontFamily: 'monospace', fontSize: '11px', color: '#dbe1ea', lineSpacing: 6 }).setScrollFactor(0).setDepth(this.uiDepth + 1);
    this.logText = this.add.text(892, 360, '', { fontFamily: 'monospace', fontSize: '9px', color: '#8592a4', lineSpacing: 4, wordWrap: { width: 336 } }).setScrollFactor(0).setDepth(this.uiDepth + 1);

    this.pushLog('lab ready · client inventory loaded');
    this.pushLog('authority mock active · no backend yet');
    this.renderCraftUi();
  }

  pushLog(message) {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift(`[${stamp}] ${message}`);
    this.logs = this.logs.slice(0, 8);
    this.logText?.setText(this.logs.join('\n'));
  }

  craftSelected() {
    const recipe = RECIPES[this.selectedIndex];
    this.pushLog(`request craft:${recipe.id}`);
    const result = craft(session.inventory, recipe);
    if (!result.ok) {
      this.pushLog(`reject ${result.reason}`);
      this.toast('Craft rejected · missing resources', { accent: THEME.red, color: '#ff9aa3' });
    } else {
      session.inventory = result.inventory;
      this.pushLog('accept → inventory transaction committed');
      this.vfx.shockwave(610, 430, { color: 0xf0c778, scale: 1.2, duration: 380 });
      this.vfx.burst(610, 430, { color: 0xf0c778, count: 16, speed: 170, scale: 0.8 });
      this.toast(`${recipe.name} crafted`, { accent: 0xe6bd67 });
    }
    this.renderCraftUi();
  }

  dismantleSelected() {
    const recipe = RECIPES[this.selectedIndex];
    this.pushLog(`request salvage:${recipe.id}`);
    const result = dismantle(session.inventory, recipe);
    if (!result.ok) {
      this.pushLog(`reject ${result.reason}`);
      this.toast('Nothing to salvage', { accent: THEME.red, color: '#ff9aa3' });
    } else {
      session.inventory = result.inventory;
      this.pushLog('accept → salvage yield applied');
      this.vfx.burst(610, 430, { color: 0x9fc0d2, count: 11, speed: 120, scale: 0.7 });
    }
    this.renderCraftUi();
  }

  grantResources() {
    session.inventory = grantLabResources(session.inventory);
    this.pushLog('dev grant → resource fixture replenished');
    this.toast('Test resource fixture granted', { accent: THEME.green });
    this.renderCraftUi();
  }

  renderCraftUi() {
    const recipe = RECIPES[this.selectedIndex];
    const inventory = session.inventory;

    this.recipeRows.forEach((row, index) => {
      const selected = index === this.selectedIndex;
      row.bg.clear();
      row.bg.fillStyle(selected ? 0x44361f : 0x111924, selected ? 0.88 : 0.78).fillRoundedRect(0, 0, 280, 68, 8);
      row.bg.lineStyle(1, selected ? 0xe6bd67 : 0x334052, selected ? 0.9 : 0.45).strokeRoundedRect(0, 0, 280, 68, 8);
    });

    this.workbenchTitle.setText(recipe.name);
    this.workbenchCategory.setText(`${recipe.category.toUpperCase()} · OUTPUT 1`);
    this.workbenchFlavor.setText(recipe.flavor);
    this.workbenchIngredients.setText(Object.entries(recipe.ingredients).map(([item, needed]) => {
      const owned = inventory[item] ?? 0;
      return `${owned >= needed ? '✓' : '×'}  ${item.toUpperCase().padEnd(12)}  ${String(owned).padStart(2)} / ${needed}`;
    }));
    this.validationText.setText(canCraft(inventory, recipe)
      ? 'VALIDATION  READY\nall recipe preconditions currently pass'
      : 'VALIDATION  BLOCKED\nserver would reject this transaction');
    this.validationText.setColor(canCraft(inventory, recipe) ? '#91e8ae' : '#ff9b8e');

    const keys = ['iron', 'wood', 'herb', 'crystal', 'mushroom', 'iron_blade', 'ember_tonic', 'trail_stew'];
    this.inventoryText.setText(keys.map((key) => `${key.toUpperCase().padEnd(16)} ${String(inventory[key] ?? 0).padStart(3)}`).join('\n'));
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
