export const RECIPES = Object.freeze([
  Object.freeze({
    id: 'iron_blade',
    name: 'Iron Trailblade',
    category: 'Forge',
    icon: '⚔',
    output: { item: 'iron_blade', quantity: 1 },
    ingredients: Object.freeze({ iron: 5, wood: 2 }),
    salvage: Object.freeze({ iron: 3, wood: 1 }),
    flavor: 'Reliable field weapon used by new trail wardens.',
  }),
  Object.freeze({
    id: 'ember_tonic',
    name: 'Ember Tonic',
    category: 'Alchemy',
    icon: '◆',
    output: { item: 'ember_tonic', quantity: 1 },
    ingredients: Object.freeze({ herb: 3, crystal: 1 }),
    salvage: Object.freeze({ herb: 1 }),
    flavor: 'Restores vigor and briefly hardens the body against stagger.',
  }),
  Object.freeze({
    id: 'trail_stew',
    name: 'Trail Stew',
    category: 'Cooking',
    icon: '◉',
    output: { item: 'trail_stew', quantity: 1 },
    ingredients: Object.freeze({ herb: 2, mushroom: 2 }),
    salvage: Object.freeze({ herb: 1 }),
    flavor: 'Simple camp food that raises regeneration for a short expedition.',
  }),
]);

export function canCraft(inventory, recipe, quantity = 1) {
  return Object.entries(recipe.ingredients).every(([item, needed]) => (inventory[item] ?? 0) >= needed * quantity);
}

export function craft(inventory, recipe, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: 'invalid_quantity', inventory };
  if (!canCraft(inventory, recipe, quantity)) return { ok: false, reason: 'missing_resources', inventory };

  const next = { ...inventory };
  for (const [item, needed] of Object.entries(recipe.ingredients)) next[item] = (next[item] ?? 0) - needed * quantity;
  next[recipe.output.item] = (next[recipe.output.item] ?? 0) + recipe.output.quantity * quantity;
  return { ok: true, reason: 'crafted', inventory: next };
}

export function dismantle(inventory, recipe, quantity = 1) {
  const owned = inventory[recipe.output.item] ?? 0;
  if (owned < quantity) return { ok: false, reason: 'missing_item', inventory };

  const next = { ...inventory, [recipe.output.item]: owned - quantity };
  for (const [item, amount] of Object.entries(recipe.salvage ?? {})) next[item] = (next[item] ?? 0) + amount * quantity;
  return { ok: true, reason: 'dismantled', inventory: next };
}

export function grantLabResources(inventory) {
  return {
    ...inventory,
    iron: (inventory.iron ?? 0) + 8,
    wood: (inventory.wood ?? 0) + 5,
    herb: (inventory.herb ?? 0) + 6,
    crystal: (inventory.crystal ?? 0) + 2,
    mushroom: (inventory.mushroom ?? 0) + 4,
  };
}
