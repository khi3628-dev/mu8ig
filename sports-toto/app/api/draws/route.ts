import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gameSlug = searchParams.get("gameSlug");
  const status = searchParams.get("status");
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
