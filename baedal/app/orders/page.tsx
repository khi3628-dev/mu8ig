import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatWon } from "@/lib/won";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orderStatus";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: "desc" },
    include: {
      restaurant: { select: { id: true, name: true, imageUrl: true } },
      items: { select: { name: true, quantity: true } },
    },
  });

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-(--border)">
        <Link href="/" aria-label="뒤로">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold">주문 내역</h1>
      </div>
      {orders.length === 0 ? (
        <p className="p-6 text-center text-(--muted-foreground)">
          아직 주문 내역이 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-(--border)">
          {orders.map((o) => {
            const status = o.status as OrderStatus;
            const firstItem = o.items[0];
            const more = o.items.length - 1;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex gap-3 p-4 hover:bg-(--muted)"
                >
                  <div className="w-16 h-16 rounded-lg bg-(--muted) overflow-hidden shrink-0">
                    {o.restaurant.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.restaurant.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-(--brand)/10 text-(--brand) font-medium">
                        {ORDER_STATUS_LABEL[status] ?? status}
                      </span>
                      <span className="text-xs text-(--muted-foreground)">
                        {o.placedAt.toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">{o.restaurant.name}</h3>
                    <p className="text-sm text-(--muted-foreground) truncate">
                      {firstItem?.name}
                      {firstItem && firstItem.quantity > 1
                        ? ` x${firstItem.quantity}`
                        : ""}
                      {more > 0 ? ` 외 ${more}개` : ""}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatWon(o.totalWon)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
