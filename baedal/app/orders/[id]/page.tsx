import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { OrderDetailClient } from "./OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      restaurant: { select: { id: true, name: true, imageUrl: true } },
      items: true,
      review: true,
    },
  });
  if (!order || order.userId !== user.id) notFound();

  const addressSnapshot = JSON.parse(order.addressSnapshot) as {
    label: string;
    roadAddress: string;
    detail: string | null;
  };

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-(--border)">
        <Link href="/orders" aria-label="뒤로">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold">주문 상세</h1>
      </div>
      <OrderDetailClient
        orderId={order.id}
        initial={{
          status: order.status,
          placedAt: order.placedAt.toISOString(),
          estimatedArrivalAt: order.estimatedArrivalAt.toISOString(),
          completedAt: order.completedAt?.toISOString() ?? null,
        }}
        restaurant={{
          id: order.restaurant.id,
          name: order.restaurant.name,
          imageUrl: order.restaurant.imageUrl,
        }}
        items={order.items.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          unitPriceWon: it.unitPriceWon,
          options: JSON.parse(it.optionsJson) as Array<{
            groupName: string;
            name: string;
          }>,
        }))}
        totals={{
          subtotalWon: order.subtotalWon,
          deliveryFeeWon: order.deliveryFeeWon,
          totalWon: order.totalWon,
        }}
        address={addressSnapshot}
        paymentMethod={order.paymentMethod}
        hasReview={!!order.review}
      />
    </div>
  );
}
