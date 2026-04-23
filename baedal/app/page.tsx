import { prisma } from "@/lib/db";
import { CategoryGrid } from "@/components/restaurant/CategoryGrid";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    prisma.category.findMany({ orderBy: { sort: "asc" } }),
    prisma.restaurant.findMany({
      orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
      take: 8,
    }),
  ]);

  return (
    <div className="pb-4">
      <section>
        <CategoryGrid items={categories} />
      </section>

      <section className="px-4 pt-4">
        <h2 className="text-lg font-bold mb-1">인기 맛집</h2>
        <p className="text-sm text-(--muted-foreground) mb-2">
          평점이 높은 가게를 모아봤어요.
        </p>
        <ul className="divide-y divide-(--border)">
          {featured.map((r) => (
            <li key={r.id}>
              <RestaurantCard r={r} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
