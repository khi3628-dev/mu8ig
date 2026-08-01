import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || !deal.active) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const user = await getCurrentUser().catch(() => null);
  await prisma.dealClick.create({
    data: { dealId: id, userId: user?.id ?? null },
  });

  return NextResponse.redirect(deal.affiliateUrl, { status: 302 });
}
