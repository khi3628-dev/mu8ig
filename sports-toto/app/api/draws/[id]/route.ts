import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const draw = await prisma.draw.findUnique({
    where: { id },
    include: {
      game: {
        select: { slug: true, name: true, nameKo: true, kind: true },
      },
    },
  });
  if (!draw) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ draw });
}
