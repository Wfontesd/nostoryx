import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, canCraft, craft, dismantle, grantLabResources } from '../src/game/systems/crafting-model.js';

const blade = RECIPES[0];

test('crafting is transactional and does not mutate the input inventory', () => {
  const inventory = { iron: 5, wood: 2 };
  const result = craft(inventory, blade);
  assert.equal(result.ok, true);
  assert.deepEqual(inventory, { iron: 5, wood: 2 });
  assert.equal(result.inventory.iron, 0);
  assert.equal(result.inventory.wood, 0);
  assert.equal(result.inventory.iron_blade, 1);
});

test('crafting rejects missing resources without changing inventory', () => {
  const inventory = { iron: 4, wood: 2 };
  assert.equal(canCraft(inventory, blade), false);
  const result = craft(inventory, blade);
  assert.equal(result.ok, false);
  assert.equal(result.inventory, inventory);
});

test('salvage consumes output and returns configured materials', () => {
  const result = dismantle({ iron_blade: 1, iron: 0, wood: 0 }, blade);
  assert.equal(result.ok, true);
  assert.equal(result.inventory.iron_blade, 0);
  assert.equal(result.inventory.iron, 3);
  assert.equal(result.inventory.wood, 1);
});

test('lab grants are additive fixtures', () => {
  const next = grantLabResources({ iron: 1 });
  assert.equal(next.iron, 9);
  assert.equal(next.crystal, 2);
});
