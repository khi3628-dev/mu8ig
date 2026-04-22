import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const games = await prisma.game.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      nameKo: true,
      kind: true,
      pickCount: true,
      poolSize: true,
      digitCount: true,
      minStakeSen: true,
      drawSchedule: true,
    },
  });
  return NextResponse.json({ games });
}
