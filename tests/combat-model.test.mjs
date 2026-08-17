import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACKS, isTargetInAttackArc, nextCombo, resolveDamage } from '../src/game/systems/combat-model.js';

test('damage applies bounded armor mitigation', () => {
  assert.equal(resolveDamage({ attack: ATTACKS.light, targetArmor: 0 }), 18);
  assert.equal(resolveDamage({ attack: ATTACKS.light, targetArmor: 50 }), 9);
  assert.ok(resolveDamage({ attack: ATTACKS.heavy, targetArmor: 999 }) >= 1);
});

test('attack arc respects facing, range and vertical tolerance', () => {
  assert.equal(isTargetInAttackArc({ attackerX: 100, targetX: 190, facing: 1, range: 100 }), true);
  assert.equal(isTargetInAttackArc({ attackerX: 100, targetX: 230, facing: 1, range: 100 }), false);
  assert.equal(isTargetInAttackArc({ attackerX: 100, targetX: 20, facing: 1, range: 100 }), false);
  assert.equal(isTargetInAttackArc({ attackerX: 100, targetX: 30, facing: -1, range: 100 }), true);
  assert.equal(isTargetInAttackArc({ attackerX: 100, targetX: 120, facing: 1, range: 100, verticalDelta: 120 }), false);
});

test('combo resets after the configured gap', () => {
  assert.equal(nextCombo(3, 200), 4);
  assert.equal(nextCombo(3, 901), 1);
});
