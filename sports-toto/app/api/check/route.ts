import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { matchPick, type PrizeTierData } from "@/lib/games/matching";
import { selectionSchemaForGame } from "@/lib/games/validators";
import { findGameBySlug } from "@/lib/games/registry";
import type { MatchRule } from "@/lib/games/types";

const bodySchema = z.object({
  gameSlug: z.string(),
  drawId: z.string().optional(), // omit = latest SETTLED draw
  betType: z.string().optional(),
  selection: z.unknown(),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { gameSlug, drawId, betType, selection } = parsed.data;

  const gameDef = findGameBySlug(gameSlug);
  if (!gameDef) {
    return NextResponse.json({ error: "unknown_game" }, { status: 404 });
  }

  const selectionParsed = selectionSchemaForGame(gameDef).safeParse(selection);
  if (!selectionParsed.success) {
    return NextResponse.json(
      { error: "invalid_selection", issues: selectionParsed.error.flatten() },
      { status: 400 },
    );
  }

  const game = await prisma.game.findUnique({
    where: { slug: gameSlug },
    include: { prizeTiers: { orderBy: { rank: "asc" } } },
  });
  if (!game) {
    return NextResponse.json({ error: "unknown_game" }, { status: 404 });
  }

  const draw = drawId
    ? await prisma.draw.findUnique({ where: { id: drawId } })
    : await prisma.draw.findFirst({
        where: { gameId: game.id, status: "SETTLED" },
        orderBy: { scheduledAt: "desc" },
      });
  if (!draw) {
    return NextResponse.json({ error: "no_draw" }, { status: 404 });
  }
  if (draw.status !== "SETTLED" || !draw.results) {
    return NextResponse.json(
      { error: "draw_not_settled" },
      { status: 400 },
    );
  }

  const tiers: PrizeTierData[] = game.prizeTiers.map((t) => ({
    rank: t.rank,
    label: t.label,
    payoutSen: t.payoutSen,
    matchRule: JSON.parse(t.matchRule) as MatchRule,
  }));

  const result = JSON.parse(draw.results) as unknown;
  const effectiveBetType = betType ?? defaultBetTypeFor(game.kind);

  const matched = matchPick(
    game.kind as Parameters<typeof matchPick>[0],
    effectiveBetType,
    selectionParsed.data as Parameters<typeof matchPick>[2],
    result,
    tiers,
  );

  return NextResponse.json({
    draw: {
      id: draw.id,
      drawNumber: draw.drawNumber,
      scheduledAt: draw.scheduledAt,
      results: result,
    },
    betType: effectiveBetType,
    matched,
  });
}

function defaultBetTypeFor(kind: string): string {
  switch (kind) {
    case "FOUR_D":
      return "BIG";
    default:
      return "STRAIGHT";
  }
}
