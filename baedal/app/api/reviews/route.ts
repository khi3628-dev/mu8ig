import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

const ReviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const data = await req.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order || order.userId !== userId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "NOT_DELIVERED" }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existing) return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });

  const review = await prisma.review.create({
    data: {
      userId,
      restaurantId: order.restaurantId,
      orderId: order.id,
      rating: parsed.data.rating,
      body: parsed.data.body,
    },
  });

  // Recompute restaurant rating aggregate.
  const agg = await prisma.review.aggregate({
    where: { restaurantId: order.restaurantId },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.restaurant.update({
    where: { id: order.restaurantId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });

  return NextResponse.json(review);
}
