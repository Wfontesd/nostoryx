export const ATTACKS = Object.freeze({
  light: Object.freeze({ id: 'light', label: 'Quick Slash', damage: 18, range: 112, cooldownMs: 280, knockback: 230, accent: 0x8fd3ff }),
  heavy: Object.freeze({ id: 'heavy', label: 'Breaker', damage: 34, range: 132, cooldownMs: 720, knockback: 430, accent: 0xffb35c }),
  skill: Object.freeze({ id: 'skill', label: 'Arc Surge', damage: 48, range: 188, cooldownMs: 1800, knockback: 520, accent: 0xb991ff }),
});

export function resolveDamage({ attack, attackerPower = 1, targetArmor = 0 }) {
  const raw = attack.damage * Math.max(0.25, attackerPower);
  const mitigation = Math.min(0.72, Math.max(0, targetArmor) / 100);
  return Math.max(1, Math.round(raw * (1 - mitigation)));
}

export function isTargetInAttackArc({ attackerX, targetX, facing, range, verticalDelta = 0, maxVerticalDelta = 90 }) {
  const horizontal = targetX - attackerX;
  const inFront = facing >= 0 ? horizontal >= -14 : horizontal <= 14;
  return inFront && Math.abs(horizontal) <= range && Math.abs(verticalDelta) <= maxVerticalDelta;
}

export function nextCombo(previousCombo, elapsedMs, resetMs = 900) {
  if (elapsedMs > resetMs) return 1;
  return Math.min(99, Math.max(0, previousCombo) + 1);
}
