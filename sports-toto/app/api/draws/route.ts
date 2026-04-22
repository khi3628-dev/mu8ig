import { NextResponse } from "next/server";
import { DrawStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

function parseDrawStatus(raw: string | null): DrawStatus | undefined {
  if (!raw) return undefined;
  return (Object.values(DrawStatus) as string[]).includes(raw)
    ? (raw as DrawStatus)
    : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameSlug = searchParams.get("gameSlug");
  const status = parseDrawStatus(searchParams.get("status"));
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  const draws = await prisma.draw.findMany({
    where: {
      ...(gameSlug ? { game: { slug: gameSlug } } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    include: {
      game: {
        select: { slug: true, name: true, nameKo: true, kind: true },
      },
    },
  });

  return NextResponse.json({ draws });
}
