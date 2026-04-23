import { prisma } from "@/lib/db";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { Search } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let results: Awaited<ReturnType<typeof prisma.restaurant.findMany>> = [];
  if (query) {
    results = await prisma.restaurant.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          {
            menuGroups: {
              some: { items: { some: { name: { contains: query } } } },
            },
          },
        ],
      },
      orderBy: [{ ratingAvg: "desc" }],
    });
  }

  return (
    <div className="pb-4">
      <form className="p-4 border-b border-(--border)" action="/search">
        <label className="flex items-center gap-2 h-11 px-3 rounded-full bg-(--muted)">
          <Search className="w-4 h-4 text-(--muted-foreground)" />
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="가게명, 메뉴명 검색"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </label>
      </form>

      {!query ? (
        <p className="p-6 text-center text-(--muted-foreground) text-sm">
          검색어를 입력해 주세요.
        </p>
      ) : results.length === 0 ? (
        <p className="p-6 text-center text-(--muted-foreground) text-sm">
          &quot;{query}&quot;에 대한 검색 결과가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-(--border)">
          {results.map((r) => (
            <li key={r.id}>
              <RestaurantCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
