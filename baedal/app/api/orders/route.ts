import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { estimatedArrival } from "@/lib/orderStatus";

const CartOptionSchema = z.object({
  groupName: z.string(),
  name: z.string(),
  extraPriceWon: z.number().int().nonnegative(),
});

const CartLineSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  unitPriceWon: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  options: z.array(CartOptionSchema),
});

const CreateOrderSchema = z.object({
  restaurantId: z.string(),
  addressId: z.string(),
  lines: z.array(CartLineSchema).min(1),
  paymentMethod: z.enum(["CARD", "CASH", "PAY"]),
  instructions: z.string().max(200).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    include: {
      restaurant: { select: { id: true, name: true, imageUrl: true } },
      items: true,
    },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: parsed.data.restaurantId },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "RESTAURANT_NOT_FOUND" }, { status: 404 });
  }

  const address = await prisma.address.findUnique({
    where: { id: parsed.data.addressId },
  });
  if (!address || address.userId !== userId) {
    return NextResponse.json({ error: "ADDRESS_NOT_FOUND" }, { status: 404 });
  }

  const subtotal = parsed.data.lines.reduce(
    (sum, l) => sum + l.unitPriceWon * l.quantity,
    0,
  );
  if (subtotal < restaurant.minOrderWon) {
    return NextResponse.json(
      { error: "BELOW_MIN_ORDER", minOrderWon: restaurant.minOrderWon },
      { status: 400 },
    );
  }

  const total = subtotal + restaurant.deliveryFeeWon;
  const now = new Date();

  const order = await prisma.order.create({
    data: {
      userId,
      restaurantId: restaurant.id,
      addressId: address.id,
      addressSnapshot: JSON.stringify({
        label: address.label,
        roadAddress: address.roadAddress,
        detail: address.detail,
        lat: address.lat,
        lng: address.lng,
      }),
      subtotalWon: subtotal,
      deliveryFeeWon: restaurant.deliveryFeeWon,
      totalWon: total,
      status: "PENDING",
      paymentMethod: parsed.data.paymentMethod,
      instructions: parsed.data.instructions,
      placedAt: now,
      estimatedArrivalAt: estimatedArrival(now),
      items: {
        create: parsed.data.lines.map((l) => ({
          menuItemId: l.menuItemId,
          name: l.name,
          unitPriceWon: l.unitPriceWon,
          quantity: l.quantity,
          optionsJson: JSON.stringify(l.options),
        })),
      },
    },
  });

  return NextResponse.json({ id: order.id });
}
