import type {
  GameKind,
  Selection,
  FourDSelection,
  FourDJackpotSelection,
  FiveDSelection,
  SixDSelection,
  PickNofMSelection,
  FourDResult,
  FourDJackpotResult,
  FiveDResult,
  SixDResult,
  PickNofMResult,
  MatchRule,
  FourDMatchRule,
  FourDJackpotMatchRule,
  DigitMatchRule,
  PickMatchRule,
} from "./types";

export interface PrizeTierData {
  rank: number;
  label: string;
  payoutSen: number;
  matchRule: MatchRule;
}

export interface MatchedTier {
  rank: number;
  label: string;
  payoutSen: number;
}

// ---------- 4D ----------

function fourDCandidates(
  result: FourDResult,
  tier: FourDMatchRule["tier"],
): string[] {
  switch (tier) {
    case "first":
      return [result.first];
    case "second":
      return [result.second];
    case "third":
      return [result.third];
    case "special":
      return result.special;
    case "consolation":
      return result.consolation;
  }
}

function sortedDigits(s: string): string {
  return s.split("").sort().join("");
}

function digitsMatchAny(
  user: string,
  candidates: string[],
  iBox: boolean,
): boolean {
  if (iBox) {
    const key = sortedDigits(user);
    return candidates.some((c) => sortedDigits(c) === key);
  }
  return candidates.includes(user);
}

function matchFourD(
  betType: string,
  sel: FourDSelection,
  result: FourDResult,
  tiers: PrizeTierData[],
): MatchedTier | null {
  // IBOX pays out at the "BIG" tier set with permutation match.
  // SYSTEM and ROLL expand into multiple straight tickets at bet time;
  // for a single-ticket checker they behave like BIG.
  const effective =
    betType === "IBOX" || betType === "SYSTEM" || betType === "ROLL"
      ? "BIG"
      : betType;
  const iBox = betType === "IBOX";

  const ordered = tiers
    .filter((t) => (t.matchRule as FourDMatchRule).betType === effective)
    .sort((a, b) => a.rank - b.rank);

  for (const t of ordered) {
    const rule = t.matchRule as FourDMatchRule;
    const candidates = fourDCandidates(result, rule.tier);
    if (digitsMatchAny(sel.digits, candidates, iBox)) {
      return { rank: t.rank, label: t.label, payoutSen: t.payoutSen };
    }
  }
  return null;
}

// ---------- 4D Jackpot ----------

function matchFourDJackpot(
  sel: FourDJackpotSelection,
  result: FourDJackpotResult,
  tiers: PrizeTierData[],
): MatchedTier | null {
  const [j1A, j1B] = result.jackpot1;
  const j2 = result.jackpot2Pool;
  const { digitsA: a, digitsB: b } = sel;

  const ordered = [...tiers].sort((x, y) => x.rank - y.rank);
  for (const t of ordered) {
    const rule = t.matchRule as FourDJackpotMatchRule;
    let hit = false;
    if (rule.jackpot === 1) {
      if (rule.pairMatch === "both_exact") {
        hit = a === j1A && b === j1B;
      }
    } else {
      // jackpot 2: pool of pairs
      for (const [pa, pb] of j2) {
        if (rule.pairMatch === "both_exact" && a === pa && b === pb) hit = true;
        if (rule.pairMatch === "a_only" && a === pa && b !== pb) hit = true;
        if (rule.pairMatch === "b_only" && b === pb && a !== pa) hit = true;
        if (hit) break;
      }
    }
    if (hit) return { rank: t.rank, label: t.label, payoutSen: t.payoutSen };
  }
  return null;
}

// ---------- 5D / 6D ----------

function digitTierMatches(
  userDigits: string,
  resultDigits: string,
  rule: DigitMatchRule,
): boolean {
  if (rule.positions === "all") return userDigits === resultDigits;
  const n = rule.n ?? 0;
  if (n <= 0) return false;
  if (rule.positions === "first_n") {
    return userDigits.slice(0, n) === resultDigits.slice(0, n);
  }
  // last_n
  return userDigits.slice(-n) === resultDigits.slice(-n);
}

function matchFiveD(
  sel: FiveDSelection,
  result: FiveDResult,
  tiers: PrizeTierData[],
): MatchedTier | null {
  // 5D tier shape: 1st full 5, 2nd full 5, 3rd full 5, 4th last-4, 5th last-3, 6th last-2
  // Registry tiers ranks 1..3 have positions:"all" (against first/second/third),
  // rank 4 last_n:4, rank 5 last_n:3, rank 6 last_n:2.
  // The full result has multiple "winning numbers" per top tier, but our registry
  // uses a single matchRule per tier — we compare against the corresponding slot.
  const slotByRank: Record<number, string | undefined> = {
    1: result.first,
    2: result.second,
    3: result.third,
    4: result.first, // last-4 of 1st
    5: result.first, // last-3 of 1st
    6: result.first, // last-2 of 1st
  };

  const ordered = [...tiers].sort((a, b) => a.rank - b.rank);
  for (const t of ordered) {
    const rule = t.matchRule as DigitMatchRule;
    const slot = slotByRank[t.rank];
    if (!slot) continue;
    if (digitTierMatches(sel.digits, slot, rule)) {
      return { rank: t.rank, label: t.label, payoutSen: t.payoutSen };
    }
  }
  return null;
}

function matchSixD(
  sel: SixDSelection,
  result: SixDResult,
  tiers: PrizeTierData[],
): MatchedTier | null {
  // 6D tier shape: 1st exact 6; 2nd first-5 OR last-5; 3rd first-4 OR last-4; etc.
  const ordered = [...tiers].sort((a, b) => a.rank - b.rank);
  for (const t of ordered) {
    const rule = t.matchRule as DigitMatchRule;
    if (rule.positions === "all") {
      if (sel.digits === result.first) {
        return { rank: t.rank, label: t.label, payoutSen: t.payoutSen };
      }
    } else {
      const n = rule.n ?? 0;
      if (n > 0) {
        const firstN = sel.digits.slice(0, n) === result.first.slice(0, n);
        const lastN = sel.digits.slice(-n) === result.first.slice(-n);
        if (firstN || lastN) {
          return { rank: t.rank, label: t.label, payoutSen: t.payoutSen };
        }
      }
    }
  }
  return null;
}

// ---------- Pick N of M ----------

function matchPickNofM(
  sel: PickNofMSelection,
  result: PickNofMResult,
  tiers: PrizeTierData[],
): MatchedTier | null {
  const userSet = new Set(sel.numbers);
  const mainMatches = result.main.filter((n) => userSet.has(n)).length;
  const bonusMatched = userSet.has(result.bonus);

  const ordered = [...tiers].sort((a, b) => a.rank - b.rank);
  for (const t of ordered) {
    const rule = t.matchRule as PickMatchRule;
    if (mainMatches < rule.mainMatches) continue;
    if (rule.mainMatches !== 6 && mainMatches > rule.mainMatches) continue;
    // mainMatches === rule.mainMatches (or 6-exact)
    if (rule.bonusMatched === true && !bonusMatched) continue;
    if (rule.bonusMatched === undefined && mainMatches === rule.mainMatches) {
      // a "5 no bonus" tier should not also match "5 + bonus" — but we scan
      // in rank order (5+bonus comes first), so reaching this means no bonus
      // rule applied — accept.
    }
    return { rank: t.rank, label: t.label, payoutSen: t.payoutSen };
  }
  return null;
}

// ---------- Dispatcher ----------

export function matchPick(
  kind: GameKind,
  betType: string,
  selection: Selection,
  result: unknown,
  tiers: PrizeTierData[],
): MatchedTier | null {
  switch (kind) {
    case "FOUR_D":
      return matchFourD(
        betType,
        selection as FourDSelection,
        result as FourDResult,
        tiers,
      );
    case "FOUR_D_JACKPOT":
      return matchFourDJackpot(
        selection as FourDJackpotSelection,
        result as FourDJackpotResult,
        tiers,
      );
    case "FIVE_D":
      return matchFiveD(
        selection as FiveDSelection,
        result as FiveDResult,
        tiers,
      );
    case "SIX_D":
      return matchSixD(
        selection as SixDSelection,
        result as SixDResult,
        tiers,
      );
    case "PICK_N_OF_M":
      return matchPickNofM(
        selection as PickNofMSelection,
        result as PickNofMResult,
        tiers,
      );
  }
}

// Count matches for Pick-N-of-M (exposed for UI display).
export function countPickMatches(
  sel: PickNofMSelection,
  result: PickNofMResult,
): { main: number; bonus: boolean } {
  const userSet = new Set(sel.numbers);
  const main = result.main.filter((n) => userSet.has(n)).length;
  const bonus = userSet.has(result.bonus);
  return { main, bonus };
}
