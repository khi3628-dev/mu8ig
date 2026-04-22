import { PrismaClient } from "@prisma/client";
import { GAMES } from "../lib/games/registry";
import type {
  FourDResult,
  FiveDResult,
  SixDResult,
  PickNofMResult,
  FourDJackpotResult,
} from "../lib/games/types";

const prisma = new PrismaClient();

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function randDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function randPick(poolSize: number, count: number): number[] {
  const pool = Array.from({ length: poolSize }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

function mockResultFor(
  kind: string,
  pickCount: number | null,
  poolSize: number | null,
  digitCount: number | null,
):
  | FourDResult
  | FiveDResult
  | SixDResult
  | PickNofMResult
  | FourDJackpotResult {
  if (kind === "FOUR_D") {
    return {
      first: randDigits(4),
      second: randDigits(4),
      third: randDigits(4),
      special: Array.from({ length: 10 }, () => randDigits(4)),
      consolation: Array.from({ length: 10 }, () => randDigits(4)),
    };
  }
  if (kind === "FOUR_D_JACKPOT") {
    return {
      jackpot1: [randDigits(4), randDigits(4)],
      jackpot2Pool: Array.from({ length: 8 }, () => [
        randDigits(4),
        randDigits(4),
      ]) as [string, string][],
    };
  }
  if (kind === "FIVE_D") {
    return {
      first: randDigits(5),
      second: randDigits(5),
      third: randDigits(5),
      fourth: randDigits(4),
      fifth: randDigits(3),
      sixth: randDigits(2),
    };
  }
  if (kind === "SIX_D") {
    return {
      first: randDigits(6),
      second: randDigits(5),
      third: randDigits(4),
      fourth: randDigits(3),
      fifth: randDigits(2),
      sixth: randDigits(1),
    };
  }
  const size = poolSize ?? 55;
  const count = pickCount ?? 6;
  const main = randPick(size, count);
  let bonus = Math.floor(Math.random() * size) + 1;
  while (main.includes(bonus)) bonus = Math.floor(Math.random() * size) + 1;
  void digitCount;
  return { main, bonus };
}

async function main() {
  console.log("[seed] Upserting games + prize tiers (idempotent)...");
  for (const g of GAMES) {
    const game = await prisma.game.upsert({
      where: { slug: g.slug },
      create: {
        slug: g.slug,
        name: g.name,
        nameKo: g.nameKo,
        kind: g.kind,
        pickCount: g.pickCount,
        poolSize: g.poolSize,
        digitCount: g.digitCount,
        minStakeSen: g.minStakeSen,
        drawSchedule: g.drawSchedule,
        active: true,
      },
      update: {
        name: g.name,
        nameKo: g.nameKo,
        kind: g.kind,
        pickCount: g.pickCount,
        poolSize: g.poolSize,
        digitCount: g.digitCount,
        minStakeSen: g.minStakeSen,
        drawSchedule: g.drawSchedule,
        active: true,
      },
    });

    // Replace prize tiers wholesale so registry changes propagate.
    await prisma.prizeTier.deleteMany({ where: { gameId: game.id } });
    await prisma.prizeTier.createMany({
      data: g.prizeTiers.map((t) => ({
        gameId: game.id,
        rank: t.rank,
        label: t.label,
        payoutSen: t.payoutSen,
        matchRule: JSON.stringify(t.matchRule),
        odds: t.odds ?? null,
      })),
    });

    console.log(`  ✓ ${g.slug} (${g.prizeTiers.length} tiers)`);
  }

  // Seed sample draws only on first run (when no draws exist).
  const drawCount = await prisma.draw.count();
  if (drawCount > 0) {
    console.log(
      `[seed] Skipping sample draws — ${drawCount} already exist.`,
    );
    await prisma.$disconnect();
    return;
  }

  console.log("[seed] Inserting sample draws...");
  const now = Date.now();
  const games = await prisma.game.findMany();
  let drawSeq = 1000;

  for (const game of games) {
    for (let i = 5; i >= 1; i--) {
      const scheduledAt = new Date(now - i * 3 * 24 * 60 * 60 * 1000);
      const closesAt = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
      const result = mockResultFor(
        game.kind,
        game.pickCount,
        game.poolSize,
        game.digitCount,
      );
      await prisma.draw.create({
        data: {
          gameId: game.id,
          drawNumber: `${pad(drawSeq++, 4)}/25`,
          scheduledAt,
          closesAt,
          status: "SETTLED",
          results: JSON.stringify(result),
          settledAt: scheduledAt,
          settledBy: "system-seed",
        },
      });
    }
    const scheduledAt = new Date(now + 2 * 24 * 60 * 60 * 1000);
    const closesAt = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
    await prisma.draw.create({
      data: {
        gameId: game.id,
        drawNumber: `${pad(drawSeq++, 4)}/25`,
        scheduledAt,
        closesAt,
        status: "OPEN",
      },
    });
  }

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
