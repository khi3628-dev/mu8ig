import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mutateWallet } from "@/lib/wallet";
import { findGameBySlug } from "@/lib/games/registry";
import { selectionSchemaForGame } from "@/lib/games/validators";
import { computeMultiplier, computeTotalCostSen } from "@/lib/games/cost";
import { BET_TYPES, type GameKind } from "@/lib/games/types";

const lineSchema = z.object({
  gameSlug: z.string(),
  betType: z.string(),
  selection: z.unknown(),
  stakeSen: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(100),
});

const bodySchema = z.object({
  lines: z.array(lineSchema).min(1).max(20),
});

type Line = z.infer<typeof lineSchema>;

interface ResolvedLine {
  line: Line;
  gameId: string;
  gameKind: GameKind;
  drawId: string;
  multiplier: number;
  totalCostSen: number;
  selection: unknown;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Resolve each line: game, open draw, validate selection, compute cost.
  const resolved: ResolvedLine[] = [];
  for (const line of parsed.data.lines) {
    const def = findGameBySlug(line.gameSlug);
    if (!def) {
      return NextResponse.json(
        { error: "unknown_game", gameSlug: line.gameSlug },
        { status: 400 },
      );
    }
    const allowed = BET_TYPES[def.kind] as readonly string[];
    if (!allowed.includes(line.betType)) {
      return NextResponse.json(
        { error: "invalid_bet_type", gameSlug: line.gameSlug },
        { status: 400 },
      );
    }
    const selParsed = selectionSchemaForGame(def).safeParse(line.selection);
    if (!selParsed.success) {
      return NextResponse.json(
        {
          error: "invalid_selection",
          gameSlug: line.gameSlug,
          issues: selParsed.error.flatten(),
        },
        { status: 400 },
      );
    }
    if (line.stakeSen < def.minStakeSen) {
      return NextResponse.json(
        { error: "stake_below_minimum", gameSlug: line.gameSlug },
        { status: 400 },
      );
    }

    const game = await prisma.game.findUnique({
      where: { slug: line.gameSlug },
      select: { id: true, kind: true },
    });
    if (!game) {
      return NextResponse.json({ error: "unknown_game" }, { status: 400 });
    }

    const draw = await prisma.draw.findFirst({
      where: {
        gameId: game.id,
        status: "OPEN",
        closesAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      select: { id: true },
    });
    if (!draw) {
      return NextResponse.json(
        { error: "no_open_draw", gameSlug: line.gameSlug },
        { status: 400 },
      );
    }

    const multiplier = computeMultiplier(
      def.kind,
      line.betType,
      selParsed.data as Parameters<typeof computeMultiplier>[2],
    );
    const totalCostSen = computeTotalCostSen(line.stakeSen, multiplier);

    resolved.push({
      line,
      gameId: game.id,
      gameKind: def.kind,
      drawId: draw.id,
      multiplier,
      totalCostSen,
      selection: selParsed.data,
    });
  }

  const totalCostAll = resolved.reduce((acc, r) => acc + r.totalCostSen, 0);

  // Single transaction: check balance, debit, insert bets.
  // Idempotency: if any bet with the same idempotencyKey exists, we skip that
  // line (and don't debit again). Return the existing bet ids.
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find already-placed bets for these idempotency keys.
      const keys = resolved.map((r) => r.line.idempotencyKey);
      const existing = await tx.bet.findMany({
        where: { idempotencyKey: { in: keys }, userId: session.user.id },
        select: { id: true, idempotencyKey: true, totalCostSen: true },
      });
      const existingKeys = new Set(existing.map((e) => e.idempotencyKey));
      const newLines = resolved.filter(
        (r) => !existingKeys.has(r.line.idempotencyKey),
      );
      const netCost = newLines.reduce((a, r) => a + r.totalCostSen, 0);

      if (newLines.length === 0) {
        // All idempotent hits — return existing bet ids.
        const u = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { walletBalanceSen: true },
        });
        return {
          placedIds: existing.map((e) => e.id),
          idempotent: true,
          balanceSen: u?.walletBalanceSen ?? 0,
        };
      }

      // Debit wallet for new lines only.
      const { balanceAfterSen } = await mutateWallet(tx, {
        userId: session.user.id,
        type: "BET_DEBIT",
        amountSen: -netCost,
        referenceType: "bet_slip",
      });

      const placedIds: string[] = [];
      for (const r of newLines) {
        const bet = await tx.bet.create({
          data: {
            userId: session.user.id,
            drawId: r.drawId,
            gameId: r.gameId,
            selection: JSON.stringify(r.selection),
            betType: r.line.betType,
            stakeSen: r.line.stakeSen,
            multiplier: r.multiplier,
            totalCostSen: r.totalCostSen,
            status: "PLACED",
            idempotencyKey: r.line.idempotencyKey,
          },
          select: { id: true },
        });
        placedIds.push(bet.id);
      }

      // Include existing bets in the returned ids for transparency.
      return {
        placedIds: [...existing.map((e) => e.id), ...placedIds],
        idempotent: false,
        balanceSen: balanceAfterSen,
      };
    });

    return NextResponse.json({
      ok: true,
      placedIds: result.placedIds,
      idempotent: result.idempotent,
      balanceSen: result.balanceSen,
      totalCostSen: totalCostAll,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "insufficient_funds" }, { status: 402 });
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json({ error: "idempotency_conflict" }, { status: 409 });
    }
    console.error("[/api/bets]", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const bets = await prisma.bet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      game: { select: { slug: true, name: true, kind: true } },
      draw: {
        select: {
          drawNumber: true,
          scheduledAt: true,
          status: true,
          results: true,
        },
      },
    },
  });
  return NextResponse.json({ bets });
}
