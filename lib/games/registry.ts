import type { GameKind, MatchRule } from "./types";

export type PrizeTierDef = {
  rank: number;
  label: string;
  payoutSen: number;
  matchRule: MatchRule;
  odds?: string;
};

export type GameDef = {
  slug: string;
  name: string;
  nameKo: string;
  kind: GameKind;
  pickCount?: number;
  poolSize?: number;
  digitCount?: number;
  minStakeSen: number;
  drawSchedule: string;
  tagline: string;
  prizeTiers: PrizeTierDef[];
};

// Payouts are illustrative examples for the simulation, not actual prize values.
const RM = (ringgit: number) => Math.round(ringgit * 100);

export const GAMES: GameDef[] = [
  {
    slug: "toto-4d",
    name: "Toto 4D",
    nameKo: "토토 4D",
    kind: "FOUR_D",
    digitCount: 4,
    minStakeSen: RM(1),
    drawSchedule: "Wed, Sat, Sun 19:00 MYT",
    tagline: "4자리 숫자를 맞춰보세요",
    prizeTiers: [
      { rank: 1, label: "1st Prize (Big)", payoutSen: RM(2500), matchRule: { tier: "first", betType: "BIG" } },
      { rank: 2, label: "2nd Prize (Big)", payoutSen: RM(1000), matchRule: { tier: "second", betType: "BIG" } },
      { rank: 3, label: "3rd Prize (Big)", payoutSen: RM(500), matchRule: { tier: "third", betType: "BIG" } },
      { rank: 4, label: "Special (Big)", payoutSen: RM(180), matchRule: { tier: "special", betType: "BIG" } },
      { rank: 5, label: "Consolation (Big)", payoutSen: RM(60), matchRule: { tier: "consolation", betType: "BIG" } },
      { rank: 10, label: "1st Prize (Small)", payoutSen: RM(3500), matchRule: { tier: "first", betType: "SMALL" } },
      { rank: 11, label: "2nd Prize (Small)", payoutSen: RM(2000), matchRule: { tier: "second", betType: "SMALL" } },
      { rank: 12, label: "3rd Prize (Small)", payoutSen: RM(1000), matchRule: { tier: "third", betType: "SMALL" } },
    ],
  },
  {
    slug: "toto-4d-jackpot",
    name: "Toto 4D Jackpot",
    nameKo: "토토 4D 잭팟",
    kind: "FOUR_D_JACKPOT",
    digitCount: 4,
    minStakeSen: RM(2),
    drawSchedule: "Wed, Sat, Sun 19:00 MYT",
    tagline: "두 쌍의 4D 번호로 잭팟에 도전",
    prizeTiers: [
      { rank: 1, label: "Jackpot 1", payoutSen: RM(2_000_000), matchRule: { jackpot: 1, pairMatch: "both_exact" } },
      { rank: 2, label: "Jackpot 2", payoutSen: RM(100_000), matchRule: { jackpot: 2, pairMatch: "both_exact" } },
      { rank: 3, label: "Consolation A", payoutSen: RM(168), matchRule: { jackpot: 2, pairMatch: "a_only" } },
      { rank: 4, label: "Consolation B", payoutSen: RM(168), matchRule: { jackpot: 2, pairMatch: "b_only" } },
    ],
  },
  {
    slug: "toto-5d",
    name: "Toto 5D",
    nameKo: "토토 5D",
    kind: "FIVE_D",
    digitCount: 5,
    minStakeSen: RM(1),
    drawSchedule: "Tue, Wed, Sat, Sun 19:00 MYT",
    tagline: "5자리 숫자 게임",
    prizeTiers: [
      { rank: 1, label: "1st Prize", payoutSen: RM(15_000), matchRule: { positions: "all" } },
      { rank: 2, label: "2nd Prize", payoutSen: RM(5_000), matchRule: { positions: "all" } },
      { rank: 3, label: "3rd Prize", payoutSen: RM(3_000), matchRule: { positions: "all" } },
      { rank: 4, label: "4th Prize (last 4)", payoutSen: RM(500), matchRule: { positions: "last_n", n: 4 } },
      { rank: 5, label: "5th Prize (last 3)", payoutSen: RM(50), matchRule: { positions: "last_n", n: 3 } },
      { rank: 6, label: "6th Prize (last 2)", payoutSen: RM(5), matchRule: { positions: "last_n", n: 2 } },
    ],
  },
  {
    slug: "toto-6d",
    name: "Toto 6D",
    nameKo: "토토 6D",
    kind: "SIX_D",
    digitCount: 6,
    minStakeSen: RM(2),
    drawSchedule: "Tue, Wed, Sat, Sun 19:00 MYT",
    tagline: "6자리 숫자 게임",
    prizeTiers: [
      { rank: 1, label: "1st Prize (all 6)", payoutSen: RM(100_000), matchRule: { positions: "all" } },
      { rank: 2, label: "2nd Prize (first 5 / last 5)", payoutSen: RM(3_000), matchRule: { positions: "first_n", n: 5 } },
      { rank: 3, label: "3rd Prize (first 4 / last 4)", payoutSen: RM(300), matchRule: { positions: "first_n", n: 4 } },
      { rank: 4, label: "4th Prize (first 3 / last 3)", payoutSen: RM(30), matchRule: { positions: "first_n", n: 3 } },
      { rank: 5, label: "5th Prize (first 2 / last 2)", payoutSen: RM(4), matchRule: { positions: "first_n", n: 2 } },
    ],
  },
  {
    slug: "power-toto-655",
    name: "Power Toto 6/55",
    nameKo: "파워 토토 6/55",
    kind: "PICK_N_OF_M",
    pickCount: 6,
    poolSize: 55,
    minStakeSen: RM(1),
    drawSchedule: "Wed, Sat, Sun 19:00 MYT",
    tagline: "1부터 55 중 6개 번호 선택",
    prizeTiers: [
      { rank: 1, label: "1st Prize (6)", payoutSen: RM(1_000_000), matchRule: { mainMatches: 6 } },
      { rank: 2, label: "2nd Prize (5 + bonus)", payoutSen: RM(5_000), matchRule: { mainMatches: 5, bonusMatched: true } },
      { rank: 3, label: "3rd Prize (5)", payoutSen: RM(500), matchRule: { mainMatches: 5 } },
      { rank: 4, label: "4th Prize (4)", payoutSen: RM(20), matchRule: { mainMatches: 4 } },
      { rank: 5, label: "5th Prize (3)", payoutSen: RM(5), matchRule: { mainMatches: 3 } },
    ],
  },
  {
    slug: "star-toto-650",
    name: "Star Toto 6/50",
    nameKo: "스타 토토 6/50",
    kind: "PICK_N_OF_M",
    pickCount: 6,
    poolSize: 50,
    minStakeSen: RM(1),
    drawSchedule: "Wed, Sat, Sun 19:00 MYT",
    tagline: "1부터 50 중 6개 번호 선택",
    prizeTiers: [
      { rank: 1, label: "1st Prize (6)", payoutSen: RM(800_000), matchRule: { mainMatches: 6 } },
      { rank: 2, label: "2nd Prize (5 + bonus)", payoutSen: RM(3_000), matchRule: { mainMatches: 5, bonusMatched: true } },
      { rank: 3, label: "3rd Prize (5)", payoutSen: RM(300), matchRule: { mainMatches: 5 } },
      { rank: 4, label: "4th Prize (4)", payoutSen: RM(15), matchRule: { mainMatches: 4 } },
      { rank: 5, label: "5th Prize (3)", payoutSen: RM(5), matchRule: { mainMatches: 3 } },
    ],
  },
  {
    slug: "supreme-toto-658",
    name: "Supreme Toto 6/58",
    nameKo: "슈프림 토토 6/58",
    kind: "PICK_N_OF_M",
    pickCount: 6,
    poolSize: 58,
    minStakeSen: RM(1),
    drawSchedule: "Mon, Wed, Sat 19:00 MYT",
    tagline: "1부터 58 중 6개 번호 선택",
    prizeTiers: [
      { rank: 1, label: "1st Prize (6)", payoutSen: RM(1_200_000), matchRule: { mainMatches: 6 } },
      { rank: 2, label: "2nd Prize (5 + bonus)", payoutSen: RM(8_000), matchRule: { mainMatches: 5, bonusMatched: true } },
      { rank: 3, label: "3rd Prize (5)", payoutSen: RM(800), matchRule: { mainMatches: 5 } },
      { rank: 4, label: "4th Prize (4)", payoutSen: RM(25), matchRule: { mainMatches: 4 } },
      { rank: 5, label: "5th Prize (3)", payoutSen: RM(5), matchRule: { mainMatches: 3 } },
    ],
  },
];

export function findGameBySlug(slug: string): GameDef | undefined {
  return GAMES.find((g) => g.slug === slug);
}
