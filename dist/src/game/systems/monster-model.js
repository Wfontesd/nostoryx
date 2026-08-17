export const MONSTER_TYPES = Object.freeze({
  slime: Object.freeze({ id: 'slime', label: 'Moss Slime', hp: 60, speed: 78, aggroRange: 300, attackRange: 58, color: 0x86d66b }),
  wisp: Object.freeze({ id: 'wisp', label: 'Arc Wisp', hp: 42, speed: 106, aggroRange: 390, attackRange: 110, color: 0xa995ff }),
  brute: Object.freeze({ id: 'brute', label: 'Stone Brute', hp: 145, speed: 54, aggroRange: 265, attackRange: 82, color: 0xd9985e }),
});

export function decideMonsterState({ distance, hpRatio, aggroRange, attackRange, stunned = false }) {
  if (stunned) return 'stunned';
  if (hpRatio <= 0) return 'dead';
  if (hpRatio <= 0.2 && distance > attackRange * 1.25) return 'retreat';
  if (distance <= attackRange) return 'attack';
  if (distance <= aggroRange) return 'chase';
  return 'idle';
}

export function movementForState({ state, monsterX, playerX, speed }) {
  const direction = Math.sign(playerX - monsterX) || 1;
  if (state === 'chase') return direction * speed;
  if (state === 'retreat') return -direction * speed * 0.72;
  return 0;
}
