import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      prizeTiers: { orderBy: { rank: "asc" } },
    },
  });
  if (!game) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ game });
}
