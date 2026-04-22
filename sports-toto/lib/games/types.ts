export const GAME_KINDS = [
  "FOUR_D",
  "FOUR_D_JACKPOT",
  "FIVE_D",
  "SIX_D",
  "PICK_N_OF_M",
] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export const DRAW_STATUSES = ["OPEN", "CLOSED", "SETTLED", "CANCELLED"] as const;
export type DrawStatus = (typeof DRAW_STATUSES)[number];

export const BET_STATUSES = ["PLACED", "WON", "LOST", "VOID"] as const;
export type BetStatus = (typeof BET_STATUSES)[number];

export const TX_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "BET_DEBIT",
  "BET_CREDIT_WIN",
  "REFUND",
  "ADJUSTMENT",
] as const;
export type TxType = (typeof TX_TYPES)[number];

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const KYC_STATUSES = ["NONE", "PENDING", "VERIFIED", "REJECTED"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

// Bet types allowed per game kind
export const BET_TYPES = {
  FOUR_D: ["BIG", "SMALL", "IBOX", "SYSTEM", "ROLL"] as const,
  FOUR_D_JACKPOT: ["STRAIGHT", "SYSTEM_ROLL"] as const,
  FIVE_D: ["STRAIGHT"] as const,
  SIX_D: ["STRAIGHT"] as const,
  PICK_N_OF_M: ["STRAIGHT"] as const,
} satisfies Record<GameKind, readonly string[]>;

export type BetTypeFor<K extends GameKind> = (typeof BET_TYPES)[K][number];
export type BetType = BetTypeFor<GameKind>;

// Selection shapes per game kind
export type FourDSelection = { digits: string };
export type FourDJackpotSelection = { digitsA: string; digitsB: string };
export type FiveDSelection = { digits: string };
export type SixDSelection = { digits: string };
export type PickNofMSelection = { numbers: number[] };

export type Selection =
  | FourDSelection
  | FourDJackpotSelection
  | FiveDSelection
  | SixDSelection
  | PickNofMSelection;

// Draw result shapes per game kind
export type FourDResult = {
  first: string;
  second: string;
  third: string;
  special: string[]; // length 10
  consolation: string[]; // length 10
};
export type FourDJackpotResult = {
  jackpot1: [string, string];
  jackpot2Pool: [string, string][];
};
export type FiveDResult = {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  sixth: string;
};
export type SixDResult = FiveDResult & { seventh?: string };
export type PickNofMResult = { main: number[]; bonus: number };

export type DrawResult =
  | FourDResult
  | FourDJackpotResult
  | FiveDResult
  | SixDResult
  | PickNofMResult;

// PrizeTier.matchRule JSON shapes (discriminated by game kind)
export type FourDMatchRule = {
  tier: "first" | "second" | "third" | "special" | "consolation";
  betType: "BIG" | "SMALL";
};
export type FourDJackpotMatchRule = {
  jackpot: 1 | 2;
  pairMatch: "both_exact" | "a_only" | "b_only" | "both_perm";
};
export type DigitMatchRule = {
  positions: "all" | "first_n" | "last_n";
  n?: number;
};
export type PickMatchRule = {
  mainMatches: number;
  bonusMatched?: boolean;
};

export type MatchRule =
  | FourDMatchRule
  | FourDJackpotMatchRule
  | DigitMatchRule
  | PickMatchRule;
