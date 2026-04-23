import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { ChevronLeft } from "lucide-react";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const restaurants = await prisma.restaurant.findMany({
    where: { categoryId: category.id },
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
  });

  return (
    <div className="pb-4">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-(--border)">
        <Link href="/" aria-label="뒤로">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold">{category.name}</h1>
        <span className="text-sm text-(--muted-foreground)">
          ({restaurants.length}곳)
        </span>
      </div>
      {restaurants.length === 0 ? (
        <p className="p-6 text-center text-(--muted-foreground)">
          아직 등록된 가게가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-(--border)">
          {restaurants.map((r) => (
            <li key={r.id}>
              <RestaurantCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
