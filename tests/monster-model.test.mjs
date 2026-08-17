import test from 'node:test';
import assert from 'node:assert/strict';
import { decideMonsterState, movementForState } from '../src/game/systems/monster-model.js';

test('monster states are deterministic from observable inputs', () => {
  const base = { hpRatio: 1, aggroRange: 300, attackRange: 60 };
  assert.equal(decideMonsterState({ ...base, distance: 500 }), 'idle');
  assert.equal(decideMonsterState({ ...base, distance: 180 }), 'chase');
  assert.equal(decideMonsterState({ ...base, distance: 40 }), 'attack');
  assert.equal(decideMonsterState({ ...base, distance: 140, hpRatio: 0.15 }), 'retreat');
  assert.equal(decideMonsterState({ ...base, distance: 40, stunned: true }), 'stunned');
});

test('movement follows or retreats from player depending on state', () => {
  assert.equal(movementForState({ state: 'chase', monsterX: 100, playerX: 200, speed: 80 }), 80);
  assert.equal(movementForState({ state: 'chase', monsterX: 200, playerX: 100, speed: 80 }), -80);
  assert.equal(movementForState({ state: 'retreat', monsterX: 100, playerX: 200, speed: 100 }), -72);
  assert.equal(movementForState({ state: 'idle', monsterX: 100, playerX: 200, speed: 80 }), 0);
});
