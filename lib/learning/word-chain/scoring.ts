/**
 * Word-chain scoring — pure and unit-tested.
 * Base: 10 per word.
 * Length bonus: max(0, length - 4) × 4.
 * Combo bonus: min(combo, 10) × 3.
 * Speed bonus: floor(secondsLeftFromLastAction / 3), capped at 5.
 */
export function computeScore(params: {
  length: number;
  combo: number;
  secondsLeftFromLastAction?: number;
}): number {
  const { length, combo, secondsLeftFromLastAction = 0 } = params;
  const base = 10;
  const lengthBonus = Math.max(0, length - 4) * 4;
  const comboBonus = Math.min(combo, 10) * 3;
  const speedBonus = Math.min(5, Math.floor(secondsLeftFromLastAction / 3));
  return base + lengthBonus + comboBonus + speedBonus;
}
