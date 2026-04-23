import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, Clock } from "lucide-react";
import { MenuItemRow } from "@/components/restaurant/MenuItemRow";
import { StickyCartBar } from "@/components/cart/StickyCartBar";
import { formatWon } from "@/lib/won";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      menuGroups: {
        orderBy: { sort: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { sort: "asc" },
            include: {
              options: { orderBy: { sort: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!r) notFound();

  const restaurantForCart = {
    id: r.id,
    name: r.name,
    minOrderWon: r.minOrderWon,
    deliveryFeeWon: r.deliveryFeeWon,
  };

  return (
    <div className="pb-32">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-(--border) sticky top-14 bg-(--background) z-10">
        <Link href="/" aria-label="뒤로">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold truncate">{r.name}</h1>
      </div>

      {r.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.imageUrl}
          alt={r.name}
          className="w-full h-48 object-cover"
        />
      ) : null}

      <div className="p-4 border-b border-(--border)">
        <h2 className="text-xl font-bold">{r.name}</h2>
        {r.description ? (
          <p className="text-sm text-(--muted-foreground) mt-0.5">
            {r.description}
          </p>
        ) : null}
        <div className="flex items-center gap-3 mt-2 text-sm">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-(--accent) text-(--accent)" />
            <span className="font-medium">{r.ratingAvg.toFixed(1)}</span>
            <span className="text-(--muted-foreground)">
              ({r.reviewCount.toLocaleString("ko-KR")})
            </span>
          </span>
          <span className="flex items-center gap-1 text-(--muted-foreground)">
            <Clock className="w-4 h-4" />
            {r.deliveryMinutesMin}~{r.deliveryMinutesMax}분
          </span>
        </div>
        <div className="mt-2 text-sm text-(--muted-foreground)">
          최소주문 {formatWon(r.minOrderWon)} · 배달비 {formatWon(r.deliveryFeeWon)}
        </div>
      </div>

      {r.menuGroups.map((g) => (
        <section key={g.id} className="px-2 pt-4">
          <h3 className="px-2 text-base font-bold mb-1">{g.name}</h3>
          <ul className="divide-y divide-(--border)">
            {g.items.map((it) => (
              <li key={it.id}>
                <MenuItemRow
                  item={{
                    id: it.id,
                    name: it.name,
                    description: it.description,
                    priceWon: it.priceWon,
                    imageUrl: it.imageUrl,
                    isPopular: it.isPopular,
                    options: it.options,
                  }}
                  restaurant={restaurantForCart}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <StickyCartBar restaurantId={r.id} />
    </div>
  );
}
