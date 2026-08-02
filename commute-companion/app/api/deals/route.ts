import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const deals = await prisma.deal.findMany({
    where: { active: true, validTo: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ deals });
}
