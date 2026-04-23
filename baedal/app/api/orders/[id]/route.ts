import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { computeLiveStatus, isTerminal, type OrderStatus } from "@/lib/orderStatus";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      restaurant: { select: { id: true, name: true, imageUrl: true } },
      items: true,
      review: true,
    },
  });
  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Live-compute status from placedAt unless already terminal.
  const currentStatus = order.status as OrderStatus;
  if (!isTerminal(currentStatus)) {
    const live = computeLiveStatus(order.placedAt);
    if (live !== currentStatus) {
      const updates: { status: OrderStatus; completedAt?: Date } = {
        status: live,
      };
      if (live === "DELIVERED") updates.completedAt = new Date();
      await prisma.order.update({
        where: { id: order.id },
        data: updates,
      });
      order.status = live;
      if (updates.completedAt) order.completedAt = updates.completedAt;
    }
  }

  return NextResponse.json(order);
}
