import type { GameKind, Selection, FourDSelection } from "./types";

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function countPermutations(s: string): number {
  const counts = new Map<string, number>();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  let r = factorial(s.length);
  for (const v of counts.values()) r = Math.floor(r / factorial(v));
  return r;
}

/**
 * Number of tickets a single slip line expands to. Stake × multiplier = totalCost.
 *
 * - 4D BIG/SMALL: 1
 * - 4D IBOX: unique permutations of the digits (e.g. "1234" → 24, "1122" → 6)
 * - 4D ROLL: 10 (one position is `R`, filled with 0..9)
 * - 4D SYSTEM: 10 (single rolled position, same expansion semantics here)
 * - 4D JACKPOT STRAIGHT: 1, SYSTEM_ROLL: 10
 * - FIVE_D / SIX_D / PICK_N_OF_M: 1
 */
export function computeMultiplier(
  kind: GameKind,
  betType: string,
  selection: Selection,
): number {
  if (kind === "FOUR_D") {
    if (betType === "IBOX") {
      const { digits } = selection as FourDSelection;
      return Math.max(1, countPermutations(digits));
    }
    if (betType === "ROLL" || betType === "SYSTEM") return 10;
    return 1;
  }
  if (kind === "FOUR_D_JACKPOT") {
    if (betType === "SYSTEM_ROLL") return 10;
    return 1;
  }
  // 5D / 6D / PICK_N_OF_M
  void selection;
  return 1;
}

export function computeTotalCostSen(
  stakeSen: number,
  multiplier: number,
): number {
  return Math.max(0, stakeSen) * Math.max(1, multiplier);
}
